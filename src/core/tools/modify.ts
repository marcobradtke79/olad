import type { Coordinate } from 'ol/coordinate';
import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import Point from 'ol/geom/Point';
import type Interaction from 'ol/interaction/Interaction';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { composite, updateGeometry, updateProperties, type Command } from '../changes/commands';
import type { ResolvedDimensionConfig } from '../config/types';
import { dimensionGrips, moveGrip, type DimensionGrip } from '../dimensions/grips';
import { referenceFor } from '../dimensions/references';
import { dimensionValues, type DimensionValues } from '../dimensions/values';
import { dimensionStyleFunction } from '../layers/dimension';
import {
  insertVertexAfter,
  listVertices,
  nearestEdge,
  nearestVertex,
  removeVertex,
  setVertex,
  type Vertex,
  type VertexPath,
} from '../geometry/vertices';
import { pickTolerance, PointPickInteraction } from './pointer';
import { createPreviewLayer, PREVIEW_VERTEX_PROPERTY } from './preview';
import { createSelectInteraction } from './select';
import { BaseTool, type ToolContext, type ToolOptions } from './Tool';

export type ModifyStep = 'select' | 'idle' | 'placing';

/** Prompt shown by the input bar for each step. */
export const MODIFY_PROMPTS: Record<ModifyStep, string> = {
  select: 'Select the object to edit: click it',
  idle: 'Click a vertex to move it or a segment to insert one; Alt+click removes a vertex; Enter finishes (a dimension: its grips move points, line and value)',
  placing:
    'New position: click on the map, or type x,y · @dx,dy · @distance<angle · distance; Escape drops the vertex',
};

/** The vertex being placed: where it was, and the geometry it is placed into. */
interface VertexPick {
  path: VertexPath;
  origin: Coordinate;
  /** The feature's geometry at pick time, with a new vertex already inserted for a segment pick. */
  working: Geometry;
}

function marker(coordinate: Coordinate, kind: 'hover' | 'picked'): Feature {
  const feature = new Feature(new Point(coordinate));
  feature.set(PREVIEW_VERTEX_PROPERTY, kind);
  return feature;
}

/**
 * Vertex editing with CAD grips, in three steps: select one object (skipped when exactly one
 * updatable object is selected), then click a vertex to pick it up (or a segment to pick up a
 * new vertex there), then click or type where it goes. Every placement is one `updateGeometry`
 * command, Alt+click removes a vertex, Escape drops a picked vertex, Enter ends the session and
 * clears the selection. Switching tools keeps the selection.
 */
export class ModifyTool extends BaseTool {
  readonly id = 'modify';
  private step: ModifyStep = 'select';
  private feature: Feature | null = null;
  private pick: VertexPick | null = null;
  private hovered: Vertex | null = null;
  /** A dimension's grip under the pointer, and the one being placed. */
  private hoveredGrip: DimensionGrip | null = null;
  private grip: DimensionGrip | null = null;
  /** The dimension being edited, drawn in its layer's style while a grip is placed. */
  private dimensionPreview: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly dimensionSource = new VectorSource<Feature>();
  private select: Interaction | null = null;
  private pointer: PointPickInteraction | null = null;
  private preview: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly previewSource = new VectorSource<Feature>();
  private suspended = false;

  override canActivate(): boolean {
    return true;
  }

  override getPrompt(): string {
    return MODIFY_PROMPTS[this.step];
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    ctx.selection.collection.on('add', this.onSelectionChange);
    ctx.selection.collection.on('remove', this.onSelectionChange);
    this.select = createSelectInteraction(ctx);
    this.pointer = new PointPickInteraction({
      click: (coordinate, raw, alt) => this.onClick(coordinate, raw, alt),
      move: (coordinate, raw) => this.onMove(coordinate, raw),
    });
    this.preview = createPreviewLayer(this.previewSource);
    ctx.map.addLayer(this.preview);
    this.interactions = [this.select, this.pointer];
    super.activate(ctx, options);
    this.feature = this.target();
    this.goTo(this.feature ? 'idle' : 'select');
  }

  /** Switching tools ends the session but keeps the selection: no `cancel` here. */
  override deactivate(): void {
    const ctx = this.ctx;
    if (ctx) {
      ctx.selection.collection.un('add', this.onSelectionChange);
      ctx.selection.collection.un('remove', this.onSelectionChange);
      if (this.preview) ctx.map.removeLayer(this.preview);
    }
    this.watchGeometry(null);
    this.previewSource.clear();
    this.removeInteractions();
    this.select = null;
    this.pointer = null;
    this.preview = null;
    this.feature = null;
    this.pick = null;
    this.hovered = null;
    this.step = 'select';
  }

  /** Enter ends the session: the object is deselected and the next one can be picked. */
  override finish(): void {
    if (this.step === 'select') return;
    this.feature = null;
    this.goTo('select');
    this.ctx?.selection.clear();
  }

  /** Escape drops a picked vertex, then ends the session, then clears the selection. */
  override cancel(): void {
    if (this.step === 'placing') {
      this.goTo('idle');
    } else if (this.step === 'idle') {
      this.finish();
    } else {
      this.ctx?.selection.clear();
    }
  }

  /** Backspace / Delete: drop the picked vertex, or remove the vertex under the pointer. */
  override removeLastPoint(): boolean {
    if (this.step === 'placing') {
      this.goTo('idle');
      return true;
    }
    if (this.step === 'idle' && this.hovered) {
      this.remove(this.hovered);
      return true;
    }
    return false;
  }

  /** A typed point places the picked vertex. */
  override handleInput(coordinate: number[]): boolean {
    if (this.step !== 'placing') return false;
    this.place(coordinate);
    return true;
  }

  /** While placing, relative input, the angle lock and the perpendicular snap work from where the vertex was. */
  override referencePoint(): number[] | null {
    if (this.step !== 'placing') return null;
    if (this.grip) return this.grip.at.slice();
    return this.pick ? this.pick.origin.slice() : null;
  }

  override setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    this.applyActivity();
  }

  /** The one object the session edits: exactly one selected feature that may be updated. */
  private target(): Feature | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const selected = ctx.selection.get();
    return selected.length === 1 && ctx.canUpdate(selected[0]!) ? selected[0]! : null;
  }

  private tolerance(): number {
    return this.ctx ? pickTolerance(this.ctx) : 0;
  }

  /** The edited object as a dimension: its layer's settings and values, or `null`. */
  private dimension(): { config: ResolvedDimensionConfig; values: DimensionValues } | null {
    const ctx = this.ctx;
    const feature = this.feature;
    if (!ctx || !feature) return null;
    const layer = ctx.layers.layerOf(feature);
    const config = layer === undefined ? undefined : ctx.layers.getConfig(layer).dimension;
    const values = config && dimensionValues(feature, config, ctx.getProjection());
    return config && values ? { config, values } : null;
  }

  /** The grip of the edited dimension nearest to the raw pointer, within the pick tolerance. */
  private gripAt(raw: Coordinate): DimensionGrip | null {
    const dimension = this.dimension();
    if (!dimension || !this.ctx || !this.feature) return null;
    let best: DimensionGrip | null = null;
    let bestDistance = this.tolerance();
    for (const grip of dimensionGrips(this.feature, dimension.values, this.ctx.getProjection())) {
      const distance = Math.hypot(grip.at[0]! - raw[0]!, grip.at[1]! - raw[1]!);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = grip;
      }
    }
    return best;
  }

  /** The dimension with `grip` moved to `coordinate`, and the command that does it. */
  private gripChange(coordinate: Coordinate): { preview: Feature; command: Command } | null {
    const ctx = this.ctx;
    const feature = this.feature;
    const dimension = this.dimension();
    const grip = this.grip;
    if (!ctx || !feature || !dimension || !grip) return null;
    const reference =
      grip.kind === 'point' ? referenceFor(ctx.getSnap?.() ?? null, coordinate) : null;
    const change = moveGrip(
      feature,
      dimension.values,
      grip,
      coordinate,
      ctx.getProjection(),
      reference,
    );
    if (!change) return null;
    const preview = feature.clone();
    if (change.geometry) preview.setGeometry(change.geometry);
    preview.setProperties(change.properties);
    const gis = change.geometry
      ? dimensionValues(preview, dimension.config, ctx.getProjection())?.gis
      : undefined;
    const properties = {
      ...change.properties,
      ...(gis === undefined || gis === null ? {} : { gisValue: Math.round(gis * 1e6) / 1e6 }),
    };
    const commands: Command[] = [
      ...(change.geometry ? [updateGeometry(feature, change.geometry)] : []),
      ...(Object.keys(properties).length ? [updateProperties(feature, properties)] : []),
    ];
    if (commands.length === 0) return null;
    return {
      preview,
      command: commands.length === 1 ? commands[0]! : composite(commands, 'move dimension grip'),
    };
  }

  private onClick(coordinate: Coordinate, raw: Coordinate, alt: boolean): void {
    if (this.step === 'placing') {
      this.place(coordinate);
      return;
    }
    const geometry = this.feature?.getGeometry();
    if (this.step !== 'idle' || !geometry) return;
    // A dimension is edited through its grips, not its vertices.
    if (this.dimension()) {
      const grip = this.gripAt(raw);
      if (!grip || alt) return;
      this.grip = grip;
      this.goTo('placing');
      this.updatePreview(coordinate);
      return;
    }
    const tolerance = this.tolerance();
    const vertex = nearestVertex(geometry, raw, tolerance);
    if (vertex) {
      if (alt) {
        this.remove(vertex);
      } else {
        this.pickUp(
          { path: vertex.path, origin: vertex.coordinate.slice(), working: geometry.clone() },
          coordinate,
        );
      }
      return;
    }
    if (alt) return;
    const edge = nearestEdge(geometry, raw, tolerance);
    if (edge) {
      const path = [...edge.path.slice(0, -1), edge.path[edge.path.length - 1]! + 1];
      this.pickUp(
        { path, origin: edge.foot, working: insertVertexAfter(geometry, edge.path, edge.foot) },
        coordinate,
      );
    }
  }

  private onMove(coordinate: Coordinate, raw: Coordinate): void {
    if (this.step === 'placing') {
      this.updatePreview(coordinate);
      return;
    }
    const geometry = this.feature?.getGeometry();
    if (this.step !== 'idle' || !geometry) return;
    const dimension = this.dimension();
    if (dimension && this.ctx && this.feature) {
      // All grips, the one under the pointer highlighted.
      this.hoveredGrip = this.gripAt(raw);
      this.previewSource.clear(true);
      this.previewSource.addFeatures(
        dimensionGrips(this.feature, dimension.values, this.ctx.getProjection()).map((grip) =>
          marker(
            grip.at,
            grip === this.hoveredGrip || sameGrip(grip, this.hoveredGrip) ? 'hover' : 'picked',
          ),
        ),
      );
      return;
    }
    this.hovered = nearestVertex(geometry, raw, this.tolerance());
    this.previewSource.clear(true);
    if (this.hovered) this.previewSource.addFeature(marker(this.hovered.coordinate, 'hover'));
  }

  private pickUp(pick: VertexPick, pointer: Coordinate): void {
    this.pick = pick;
    this.goTo('placing');
    this.updatePreview(pointer);
  }

  private place(coordinate: Coordinate): void {
    if (this.grip) {
      const change = this.gripChange(coordinate);
      this.goTo('idle');
      if (change) this.ctx?.execute(change.command);
      return;
    }
    const { pick, feature, ctx } = this;
    this.goTo('idle');
    if (!pick || !feature || !ctx) return;
    ctx.execute(updateGeometry(feature, setVertex(pick.working, pick.path, coordinate)));
  }

  private remove(vertex: Vertex): void {
    const geometry = this.feature?.getGeometry();
    if (!geometry || !this.feature || !this.ctx) return;
    // A single point has nothing to remove; too few vertices are rejected by validation.
    if (listVertices(geometry).length <= 1) return;
    this.hovered = null;
    this.previewSource.clear(true);
    this.ctx.execute(updateGeometry(this.feature, removeVertex(geometry, vertex.path)));
  }

  private updatePreview(coordinate: Coordinate): void {
    if (this.grip) {
      const change = this.gripChange(coordinate);
      this.previewSource.clear(true);
      this.previewSource.addFeature(marker(coordinate, 'picked'));
      this.showDimension(change?.preview ?? null);
      return;
    }
    if (!this.pick) return;
    this.previewSource.clear(true);
    this.previewSource.addFeatures([
      new Feature(setVertex(this.pick.working, this.pick.path, coordinate)),
      marker(coordinate, 'picked'),
    ]);
  }

  private onSelectionChange = (): void => {
    // The selection may change several times per batch; look after it.
    queueMicrotask(() => {
      if (!this.ctx) return;
      const target = this.target();
      if (target === this.feature) return;
      this.feature = target;
      this.goTo(target ? 'idle' : 'select');
    });
  };

  /** A geometry change from outside (undo, another command) while placing drops the pick. */
  private onGeometryChange = (): void => {
    if (this.step === 'placing') this.goTo('idle');
  };

  private watched: Feature | null = null;

  private watchGeometry(feature: Feature | null): void {
    if (this.watched === feature) return;
    this.watched?.un('change:geometry', this.onGeometryChange);
    this.watched = feature;
    feature?.on('change:geometry', this.onGeometryChange);
  }

  /** Draw `preview` in its dimension layer's style above the map (or remove the preview). */
  private showDimension(preview: Feature | null): void {
    const ctx = this.ctx;
    const dimension = this.dimension();
    if (!ctx) return;
    if (!preview || !dimension) {
      if (this.dimensionPreview) ctx.map.removeLayer(this.dimensionPreview);
      this.dimensionPreview = null;
      this.dimensionSource.clear(true);
      return;
    }
    if (!this.dimensionPreview) {
      this.dimensionPreview = new VectorLayer({
        source: this.dimensionSource,
        style: dimensionStyleFunction(
          dimension.config,
          {},
          () => ctx.getProjection(),
          ctx.getLocale(),
        ),
        zIndex: 1002,
      });
      ctx.map.addLayer(this.dimensionPreview);
    }
    this.dimensionSource.clear(true);
    this.dimensionSource.addFeature(preview);
  }

  private goTo(step: ModifyStep): void {
    this.step = step;
    if (step !== 'placing') {
      this.pick = null;
      this.grip = null;
      this.showDimension(null);
    }
    if (step !== 'idle') {
      this.hovered = null;
      this.hoveredGrip = null;
    }
    this.previewSource.clear(true);
    this.watchGeometry(step === 'placing' ? this.feature : null);
    this.applyActivity();
    this.ctx?.promptChanged();
  }

  private applyActivity(): void {
    this.select?.setActive(!this.suspended && this.step === 'select');
    this.pointer?.setActive(!this.suspended && this.step !== 'select');
  }
}

/** Whether two grips are the same part of a dimension. */
function sameGrip(a: DimensionGrip, b: DimensionGrip | null): boolean {
  return b !== null && a.kind === b.kind && a.index === b.index;
}

/** Clone the geometries of `features` before an interaction mutates them in place. */
export function snapshot(features: Feature[]): Map<Feature, Geometry | undefined> {
  return new Map(features.map((f) => [f, f.getGeometry()?.clone()] as const));
}

/**
 * After an interaction moved geometries directly (the move tool translates in place), put the
 * originals back and submit the new geometries as commands, so validation, undo and change
 * tracking see them.
 */
export function submitGeometryChanges(
  ctx: ToolContext,
  features: Feature[],
  before: Map<Feature, Geometry | undefined>,
): boolean {
  const commands: Command[] = [];
  for (const feature of features) {
    const after = feature.getGeometry()?.clone();
    const original = before.get(feature);
    if (!after) continue;
    feature.setGeometry(original?.clone());
    commands.push(updateGeometry(feature, after));
  }
  before.clear();
  if (commands.length === 0) return false;
  return ctx.execute(commands.length === 1 ? commands[0]! : composite(commands, 'modify'));
}
