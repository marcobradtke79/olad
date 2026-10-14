import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import type Interaction from 'ol/interaction/Interaction';
import type VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { editableSelection } from './editableSelection';
import { snapshot, submitGeometryChanges } from './modify';
import { PointPickInteraction } from './pointer';
import { createPreviewLayer } from './preview';
import { createBoxSelectInteraction, createSelectInteraction } from './select';
import { BaseTool, type ToolContext, type ToolOptions } from './Tool';

export type MoveStep = 'select' | 'base' | 'target';

/** Prompt shown by the input bar for each step. */
export const MOVE_PROMPTS: Record<MoveStep, string> = {
  select:
    'Select the objects to move: click, Shift+click adds, Ctrl / Cmd+drag for a box; Enter continues',
  base: 'Base point: click on the map or type x,y',
  target:
    'Second point: click on the map, or type @dx,dy · @distance<angle · distance; Escape goes back',
};

export { PREVIEW_LAYER_PROPERTY } from './preview';

/** Translate the geometries of `features` in place by the vector (view-projection units). */
export function translateFeatures(features: Feature[], dx: number, dy: number): void {
  for (const feature of features) feature.getGeometry()?.translate(dx, dy);
}

/**
 * CAD-style move in three steps: select the objects (click, Shift+click, Ctrl / Cmd+box; Enter
 * continues; skipped when a selection exists), pick a base point (click or typed `x,y`,
 * snapped like any other point), then the second point (click, or typed `@dx,dy`,
 * `@distance<angle`, `distance` relative to the base point). The displacement is applied to
 * every selected feature that may be updated and submitted as one command. A dashed preview
 * follows the pointer in the last step. After a move the objects are deselected and the tool
 * asks for the next ones; Escape steps back (second point → base point → selection, clearing it).
 */
export class MoveTool extends BaseTool {
  readonly id = 'move';
  private step: MoveStep = 'select';
  private base: number[] | null = null;
  private editable: ReturnType<typeof editableSelection> | null = null;
  private selectInteractions: Interaction[] = [];
  private pointer: PointPickInteraction | null = null;
  private preview: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly previewSource = new VectorSource<Feature>();
  private suspended = false;

  override canActivate(): boolean {
    return true;
  }

  override getPrompt(): string {
    return MOVE_PROMPTS[this.step];
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    this.editable = editableSelection(ctx);
    ctx.selection.collection.on('add', this.onSelectionChange);
    ctx.selection.collection.on('remove', this.onSelectionChange);
    this.selectInteractions = [createSelectInteraction(ctx), createBoxSelectInteraction(ctx)];
    this.pointer = new PointPickInteraction({
      click: (coordinate) => this.takePoint(coordinate),
      move: (coordinate) => this.onPointerMove(coordinate),
    });
    this.preview = createPreviewLayer(this.previewSource);
    ctx.map.addLayer(this.preview);
    this.interactions = [...this.selectInteractions, this.pointer];
    super.activate(ctx, options);
    this.goTo(this.editable.collection.getLength() > 0 ? 'base' : 'select');
  }

  /** Switching tools keeps the selection: no `cancel` here. */
  override deactivate(): void {
    const ctx = this.ctx;
    if (ctx) {
      ctx.selection.collection.un('add', this.onSelectionChange);
      ctx.selection.collection.un('remove', this.onSelectionChange);
      if (this.preview) ctx.map.removeLayer(this.preview);
    }
    this.previewSource.clear();
    this.removeInteractions();
    this.editable?.dispose();
    this.editable = null;
    this.selectInteractions = [];
    this.pointer = null;
    this.preview = null;
    this.base = null;
    this.step = 'select';
  }

  /** Enter: a confirmed selection leads to the base point. */
  override finish(): void {
    if (this.step === 'select' && this.hasEditable()) this.goTo('base');
  }

  /** Escape steps back; in the selection step it clears the selection. */
  override cancel(): void {
    if (this.step === 'target') {
      this.goTo('base');
    } else if (this.step === 'base') {
      this.ctx?.selection.clear();
      this.goTo('select');
    } else {
      this.ctx?.selection.clear();
    }
  }

  /** Backspace drops the base point. */
  override removeLastPoint(): boolean {
    if (this.step !== 'target') return false;
    this.cancel();
    return true;
  }

  /** A typed point is the base point or the second point, depending on the step. */
  override handleInput(coordinate: number[]): boolean {
    if (this.step === 'select') return false;
    this.takePoint(coordinate);
    return true;
  }

  /** Relative input in the second-point step is measured from the base point. */
  override referencePoint(): number[] | null {
    return this.step === 'target' ? this.base : null;
  }

  override setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    this.applyActivity();
  }

  private takePoint(coordinate: number[]): void {
    if (this.step === 'base') {
      this.base = coordinate;
      this.goTo('target');
    } else if (this.step === 'target' && this.base) {
      this.applyMove(coordinate);
    }
  }

  private applyMove(target: number[]): void {
    const ctx = this.ctx;
    const base = this.base;
    const features = this.editable?.collection.getArray().slice() ?? [];
    if (!ctx || !base || features.length === 0) {
      this.goTo('select');
      return;
    }
    const before = snapshot(features);
    translateFeatures(features, target[0]! - base[0]!, target[1]! - base[1]!);
    submitGeometryChanges(ctx, features, before);
    // Done: the moved objects are deselected and the next objects can be picked.
    ctx.selection.clear();
    this.goTo('select');
  }

  private onPointerMove(coordinate: number[]): void {
    if (this.step !== 'target' || !this.base) return;
    const [dx, dy] = [coordinate[0]! - this.base[0]!, coordinate[1]! - this.base[1]!];
    this.previewSource.clear(true);
    const ghosts = (this.editable?.collection.getArray() ?? []).flatMap((feature) => {
      const geometry = feature.getGeometry()?.clone();
      if (!geometry) return [];
      geometry.translate(dx, dy);
      return [new Feature(geometry)];
    });
    this.previewSource.addFeatures([
      ...ghosts,
      new Feature(new LineString([this.base, coordinate])),
    ]);
  }

  private onSelectionChange = (): void => {
    // The editable collection is rebuilt per change; look after the batch.
    queueMicrotask(() => {
      if (this.ctx && this.step !== 'select' && !this.hasEditable()) this.goTo('select');
    });
  };

  private hasEditable(): boolean {
    return (this.editable?.collection.getLength() ?? 0) > 0;
  }

  private goTo(step: MoveStep): void {
    this.step = step;
    if (step !== 'target') {
      this.base = null;
      this.previewSource.clear(true);
    }
    this.applyActivity();
    this.ctx?.promptChanged();
  }

  private applyActivity(): void {
    const selecting = !this.suspended && this.step === 'select';
    for (const interaction of this.selectInteractions) interaction.setActive(selecting);
    this.pointer?.setActive(!this.suspended && this.step !== 'select');
  }
}
