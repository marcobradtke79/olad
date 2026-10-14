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

export type RotateStep = 'select' | 'center' | 'start' | 'end';

/** Prompt shown by the input bar for each step. */
export const ROTATE_PROMPTS: Record<RotateStep, string> = {
  select:
    'Select the objects to rotate: click, Shift+click adds, Ctrl / Cmd+drag for a box; Enter continues',
  center: 'Centre of rotation: click on the map or type x,y',
  start:
    'First point of the angle: click on the map, or type x,y · @dx,dy · @distance<angle; Escape goes back',
  end: 'Second point of the angle: click on the map, or type x,y · @dx,dy · @distance<angle · distance; Escape goes back',
};

/** Angle in radians, counter-clockwise, from the ray centre → start to the ray centre → end. */
export function rotationAngle(center: number[], start: number[], end: number[]): number {
  return (
    Math.atan2(end[1]! - center[1]!, end[0]! - center[0]!) -
    Math.atan2(start[1]! - center[1]!, start[0]! - center[0]!)
  );
}

/** Rotate the geometries of `features` in place by `angle` radians around `anchor`. */
export function rotateFeatures(features: Feature[], angle: number, anchor: number[]): void {
  for (const feature of features) feature.getGeometry()?.rotate(angle, anchor);
}

/**
 * CAD-style rotate in four steps: select the objects (click, Shift+click, Ctrl / Cmd+box; Enter
 * confirms; skipped when a selection exists), pick the centre of rotation, then a first point
 * that fixes one leg of the angle, then a second point; the angle between the two legs around
 * the centre is applied to every selected feature that may be updated, as one command. A dashed
 * preview of the rotated objects and both legs follows the pointer. Afterwards the objects are
 * deselected and the tool asks for the next ones; Escape steps back.
 */
export class RotateTool extends BaseTool {
  readonly id = 'rotate';
  private step: RotateStep = 'select';
  private center: number[] | null = null;
  private start: number[] | null = null;
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
    return ROTATE_PROMPTS[this.step];
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
    this.goTo(this.editable.collection.getLength() > 0 ? 'center' : 'select');
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
    this.center = null;
    this.start = null;
    this.step = 'select';
  }

  /** Enter: a confirmed selection leads to the centre. */
  override finish(): void {
    if (this.step === 'select' && this.hasEditable()) this.goTo('center');
  }

  /** Escape steps back; in the centre and selection steps it clears the selection. */
  override cancel(): void {
    if (this.step === 'end') {
      this.goTo('start');
    } else if (this.step === 'start') {
      this.goTo('center');
    } else if (this.step === 'center') {
      this.ctx?.selection.clear();
      this.goTo('select');
    } else {
      this.ctx?.selection.clear();
    }
  }

  /** Backspace drops the last angle point. */
  override removeLastPoint(): boolean {
    if (this.step !== 'start' && this.step !== 'end') return false;
    this.cancel();
    return true;
  }

  /** A typed point is the centre, the first or the second point, depending on the step. */
  override handleInput(coordinate: number[]): boolean {
    if (this.step === 'select') return false;
    this.takePoint(coordinate);
    return true;
  }

  /** Relative input for the angle points is measured from the centre. */
  override referencePoint(): number[] | null {
    return this.step === 'start' || this.step === 'end' ? this.center : null;
  }

  override setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    this.applyActivity();
  }

  private takePoint(coordinate: number[]): void {
    if (this.step === 'center') {
      this.center = coordinate;
      this.goTo('start');
    } else if (this.step === 'start' && this.center) {
      if (isSame(coordinate, this.center)) return; // no direction yet
      this.start = coordinate;
      this.goTo('end');
    } else if (this.step === 'end' && this.center && this.start) {
      this.applyRotation(coordinate);
    }
  }

  private applyRotation(end: number[]): void {
    const { ctx, center, start } = this;
    const features = this.editable?.collection.getArray().slice() ?? [];
    if (!ctx || !center || !start || features.length === 0) {
      this.goTo('select');
      return;
    }
    const before = snapshot(features);
    rotateFeatures(features, rotationAngle(center, start, end), center);
    submitGeometryChanges(ctx, features, before);
    // Done: the rotated objects are deselected and the next objects can be picked.
    ctx.selection.clear();
    this.goTo('select');
  }

  private onPointerMove(coordinate: number[]): void {
    const { center, start } = this;
    if (!center || this.step === 'select' || this.step === 'center') return;
    this.previewSource.clear(true);
    if (this.step === 'start') {
      this.previewSource.addFeature(new Feature(new LineString([center, coordinate])));
      return;
    }
    if (!start) return;
    const angle = rotationAngle(center, start, coordinate);
    const ghosts = (this.editable?.collection.getArray() ?? []).flatMap((feature) => {
      const geometry = feature.getGeometry()?.clone();
      if (!geometry) return [];
      geometry.rotate(angle, center);
      return [new Feature(geometry)];
    });
    this.previewSource.addFeatures([
      ...ghosts,
      new Feature(new LineString([center, start])),
      new Feature(new LineString([center, coordinate])),
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

  private goTo(step: RotateStep): void {
    this.step = step;
    if (step === 'select' || step === 'center') this.center = null;
    if (step !== 'end') this.start = null;
    this.previewSource.clear(true);
    this.applyActivity();
    this.ctx?.promptChanged();
  }

  private applyActivity(): void {
    const selecting = !this.suspended && this.step === 'select';
    for (const interaction of this.selectInteractions) interaction.setActive(selecting);
    this.pointer?.setActive(!this.suspended && this.step !== 'select');
  }
}

function isSame(a: number[], b: number[]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}
