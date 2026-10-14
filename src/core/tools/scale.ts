import type { Coordinate } from 'ol/coordinate';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import type Interaction from 'ol/interaction/Interaction';
import type VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { composite, updateGeometry, type Command } from '../changes/commands';
import { scaleFactor, scaleGeometry } from '../geometry/scale';
import { editableSelection } from './editableSelection';
import { PointPickInteraction } from './pointer';
import { createPreviewLayer } from './preview';
import { createBoxSelectInteraction, createSelectInteraction } from './select';
import { BaseTool, type InputRequest, type ToolContext, type ToolOptions } from './Tool';

export type ScaleStep = 'select' | 'base' | 'factor' | 'target';

/** Prompt shown by the input bar for each step. */
export const SCALE_PROMPTS: Record<ScaleStep, string> = {
  select:
    'Select the objects to scale: click, Shift+click adds, Ctrl / Cmd+drag for a box; Enter continues',
  base: 'Base point: click on the map or type x,y',
  factor:
    'Scale factor: type a factor (2 doubles, 0.5 halves), or click a reference point; Escape goes back',
  target:
    'Target point: click on the map, or type x,y · @dx,dy · @distance<angle · distance; Escape goes back',
};

const INVALID_FACTOR = 'The scale factor must be greater than 0.';

/**
 * CAD-style scale: select the objects (click, Shift+click, Ctrl / Cmd+box; Enter confirms;
 * skipped when a selection exists), pick the base point, then either type a factor or pick a
 * reference point and a target point; the factor is then the ratio of the distances base →
 * target and base → reference. Every selected feature that may be updated is scaled uniformly
 * around the base point, as one command. A dashed preview of the scaled objects and both legs
 * follows the pointer. Afterwards the objects are deselected and the tool asks for the next
 * ones; Escape steps back.
 */
export class ScaleTool extends BaseTool {
  readonly id = 'scale';
  private step: ScaleStep = 'select';
  private base: Coordinate | null = null;
  private reference: Coordinate | null = null;
  /** Shown in front of the prompt after a factor that could not be applied. */
  private notice: string | null = null;
  private editable: ReturnType<typeof editableSelection> | null = null;
  private selectInteractions: Interaction[] = [];
  private pointer: PointPickInteraction | null = null;
  private preview: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly previewSource = new VectorSource<Feature>();
  private suspended = false;

  override canActivate(): boolean {
    return true;
  }

  /** The factor step expects a factor typed (a click picks a reference point instead). */
  override getInputRequest(): InputRequest {
    return this.step === 'factor' ? 'value' : null;
  }

  override getPrompt(): string {
    const prompt = SCALE_PROMPTS[this.step];
    return this.notice ? `${this.notice} ${prompt}` : prompt;
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
    this.reference = null;
    this.notice = null;
    this.step = 'select';
  }

  /** Enter: a confirmed selection leads to the base point. */
  override finish(): void {
    if (this.step === 'select' && this.hasEditable()) this.goTo('base');
  }

  /** Escape steps back; in the base and selection steps it clears the selection. */
  override cancel(): void {
    if (this.step === 'target') {
      this.goTo('factor');
    } else if (this.step === 'factor') {
      this.goTo('base');
    } else if (this.step === 'base') {
      this.ctx?.selection.clear();
      this.goTo('select');
    } else {
      this.ctx?.selection.clear();
    }
  }

  /** Backspace drops the base or the reference point. */
  override removeLastPoint(): boolean {
    if (this.step !== 'factor' && this.step !== 'target') return false;
    this.cancel();
    return true;
  }

  /**
   * A plain number in the factor step is the factor. Every number is taken there, so it is never
   * read as a distance for the reference point; one that is not greater than 0 only shows a
   * notice.
   */
  override handleValue(value: number): boolean {
    if (this.step !== 'factor') return false;
    if (Number.isFinite(value) && value > 0) {
      this.applyScale(value);
    } else {
      this.notice = INVALID_FACTOR;
      this.ctx?.promptChanged();
    }
    return true;
  }

  /** A typed point is the base, the reference or the target point, depending on the step. */
  override handleInput(coordinate: number[]): boolean {
    if (this.step === 'select') return false;
    this.takePoint(coordinate);
    return true;
  }

  /** Relative input for the reference and target points is measured from the base point. */
  override referencePoint(): number[] | null {
    return this.step === 'factor' || this.step === 'target' ? this.base : null;
  }

  override setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    this.applyActivity();
  }

  private takePoint(coordinate: Coordinate): void {
    if (this.step === 'base') {
      this.base = coordinate;
      this.goTo('factor');
    } else if (this.step === 'factor' && this.base) {
      if (isSame(coordinate, this.base)) return; // no length to compare with
      this.reference = coordinate;
      this.goTo('target');
    } else if (this.step === 'target' && this.base && this.reference) {
      const factor = scaleFactor(this.base, this.reference, coordinate);
      if (factor === null || factor <= 0) {
        this.notice = INVALID_FACTOR;
        this.ctx?.promptChanged();
        return;
      }
      this.applyScale(factor);
    }
  }

  private applyScale(factor: number): void {
    const { ctx, base } = this;
    const features = this.editable?.collection.getArray().slice() ?? [];
    if (!ctx || !base || features.length === 0) {
      this.goTo('select');
      return;
    }
    const commands: Command[] = [];
    for (const feature of features) {
      const geometry = feature.getGeometry();
      if (geometry) commands.push(updateGeometry(feature, scaleGeometry(geometry, factor, base)));
    }
    if (commands.length > 0) {
      ctx.execute(commands.length === 1 ? commands[0]! : composite(commands, 'scale'));
    }
    // Done: the scaled objects are deselected and the next objects can be picked.
    ctx.selection.clear();
    this.goTo('select');
  }

  private onPointerMove(coordinate: Coordinate): void {
    const { base, reference } = this;
    if (!base || (this.step !== 'factor' && this.step !== 'target')) return;
    this.previewSource.clear(true);
    if (this.step === 'factor' || !reference) {
      this.previewSource.addFeature(new Feature(new LineString([base, coordinate])));
      return;
    }
    const factor = scaleFactor(base, reference, coordinate);
    const ghosts =
      factor === null || factor <= 0
        ? []
        : (this.editable?.collection.getArray() ?? []).flatMap((feature) => {
            const geometry = feature.getGeometry();
            return geometry ? [new Feature(scaleGeometry(geometry, factor, base))] : [];
          });
    this.previewSource.addFeatures([
      ...ghosts,
      new Feature(new LineString([base, reference])),
      new Feature(new LineString([base, coordinate])),
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

  private goTo(step: ScaleStep): void {
    this.step = step;
    this.notice = null;
    if (step === 'select' || step === 'base') this.base = null;
    if (step !== 'target') this.reference = null;
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

function isSame(a: Coordinate, b: Coordinate): boolean {
  return a[0] === b[0] && a[1] === b[1];
}
