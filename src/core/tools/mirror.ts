import type { Coordinate } from 'ol/coordinate';
import { boundingExtent, extend, getCenter, getHeight, getWidth } from 'ol/extent';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import type Interaction from 'ol/interaction/Interaction';
import type VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { composite, insertFeature, updateGeometry, type Command } from '../changes/commands';
import { mirrorGeometry } from '../geometry/mirror';
import { templateTarget } from '../templates/insert';
import { copyProperties } from '../templates/TemplateStore';
import { defaultProperties, wrapForLayer } from './draw';
import { PointPickInteraction } from './pointer';
import { createPreviewLayer } from './preview';
import { createBoxSelectInteraction, createSelectInteraction } from './select';
import { BaseTool, type InputRequest, type ToolContext, type ToolOptions } from './Tool';

export type MirrorStep = 'select' | 'first' | 'second' | 'copy';

/** Prompt shown by the input bar for each step. */
export const MIRROR_PROMPTS: Record<MirrorStep, string> = {
  select:
    'Select the objects to mirror: click, Shift+click adds, Ctrl / Cmd+drag for a box; Enter continues',
  first: 'First point of the mirror line: click on the map or type x,y; Escape goes back',
  second:
    'Second point of the mirror line: click on the map, or type x,y · @dx,dy · @distance<angle; Escape goes back',
  copy: 'Create a copy? [y/N]: y keeps the originals, Enter mirrors them; Escape goes back',
};

/** Answers to the copy question (case-insensitive), English and German. */
const YES = new Set(['y', 'yes', 'j', 'ja']);
const NO = new Set(['n', 'no', 'nein']);

/**
 * CAD-style mirror: select the objects (skipped when a selection exists; read-only objects may
 * be selected), click or type the two points of the mirror line, then answer `Create a copy?
 * [y/N]`. Enter (or `n`, or a click) mirrors the objects the user may update in place, one
 * command; `y` inserts mirrored copies (one composite, each into its source layer, else the
 * active or draft layer) with the copied attributes, so the attribute popup opens for them.
 * A dashed preview shows the mirrored objects and the line. Afterwards the selection is cleared
 * and the tool asks for the next objects; Escape steps back.
 */
export class MirrorTool extends BaseTool {
  readonly id = 'mirror';
  private step: MirrorStep = 'select';
  private first: Coordinate | null = null;
  private second: Coordinate | null = null;
  /** Shown in front of the next prompt after an operation that skipped objects or failed. */
  private notice: string | null = null;
  private selectInteractions: Interaction[] = [];
  private pointer: PointPickInteraction | null = null;
  private preview: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly previewSource = new VectorSource<Feature>();
  private suspended = false;

  override canActivate(): boolean {
    return true;
  }

  /** The copy question expects y or n typed. */
  override getInputRequest(): InputRequest {
    return this.step === 'copy' ? 'text' : null;
  }

  override getPrompt(): string {
    const prompt = MIRROR_PROMPTS[this.step];
    return this.notice ? `${this.notice} ${prompt}` : prompt;
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
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
    this.notice = null;
    this.goTo(this.objects().length > 0 ? 'first' : 'select');
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
    this.selectInteractions = [];
    this.pointer = null;
    this.preview = null;
    this.step = 'select';
    this.first = null;
    this.second = null;
    this.notice = null;
  }

  /** Enter: continue from the selection, or answer "no" to the copy question. */
  override finish(): void {
    if (this.step === 'select' && this.objects().length > 0) this.goTo('first');
    else if (this.step === 'copy') this.apply(false);
  }

  /** Escape steps back: copy → second → first → select (clearing the selection). */
  override cancel(): void {
    if (this.step === 'copy') this.goTo('second');
    else if (this.step === 'second') this.goTo('first');
    else {
      this.ctx?.selection.clear();
      this.goTo('select');
    }
  }

  override removeLastPoint(): boolean {
    if (this.step === 'select') return false;
    this.cancel();
    return true;
  }

  override handleInput(coordinate: number[]): boolean {
    if (this.step !== 'first' && this.step !== 'second') return false;
    this.takePoint(coordinate);
    return true;
  }

  /** The answer to the copy question: y / yes / j / ja or n / no / nein. */
  override handleText(text: string): boolean {
    if (this.step !== 'copy') return false;
    const answer = text.trim().toLowerCase();
    if (YES.has(answer)) this.apply(true);
    else if (NO.has(answer)) this.apply(false);
    else return false;
    return true;
  }

  /** Relative input for the second point is measured from the first. */
  override referencePoint(): number[] | null {
    return this.step === 'second' ? this.first : null;
  }

  override setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    this.applyActivity();
  }

  /** The selected objects with a geometry. */
  private objects(): Feature[] {
    return (this.ctx?.selection.get() ?? []).filter((f) => f.getGeometry() !== undefined);
  }

  private takePoint(coordinate: number[]): void {
    if (this.step === 'first') {
      this.first = coordinate.slice();
      this.goTo('second');
    } else if (this.step === 'second' && this.first) {
      if (coordinate[0] === this.first[0] && coordinate[1] === this.first[1]) return;
      this.second = coordinate.slice();
      this.goTo('copy');
    } else if (this.step === 'copy') {
      // A click answers the question with the default: no copy.
      this.apply(false);
    }
  }

  private apply(copy: boolean): void {
    const { ctx, first, second } = this;
    if (!ctx || !first || !second) return;
    const objects = this.objects();
    const commands: Command[] = [];
    let skipped = 0;
    for (const feature of objects) {
      const mirrored = mirrorGeometry(feature.getGeometry()!, first, second);
      if (!copy) {
        if (ctx.canUpdate(feature)) commands.push(updateGeometry(feature, mirrored));
        else skipped++;
        continue;
      }
      const source = ctx.layers.layerOf(feature);
      const target = templateTarget(ctx, { layer: source ?? '', geometry: mirrored });
      if (!target) {
        skipped++;
        continue;
      }
      const idProperty = source ? ctx.layers.getConfig(source).idProperty : undefined;
      const duplicate = new Feature({
        ...defaultProperties(target.layer),
        ...copyProperties(feature, idProperty),
        geometry: wrapForLayer(mirrored, target.layer.geometryType),
      });
      commands.push(insertFeature(target.layerId, duplicate));
    }
    const skippedNotice =
      skipped === 0
        ? null
        : copy
          ? `${skipped} ${skipped === 1 ? 'object has' : 'objects have'} no layer to be copied into.`
          : `${skipped} ${skipped === 1 ? 'object' : 'objects'} could not be changed (read-only).`;
    if (commands.length === 0) {
      this.notice = skippedNotice;
      ctx.selection.clear();
      this.goTo('select');
      return;
    }
    const command = commands.length === 1 ? commands[0]! : composite(commands, 'mirror');
    if (!ctx.execute(command)) {
      this.notice = 'The mirrored objects are not valid.';
      ctx.promptChanged();
      return;
    }
    // Done: the objects are deselected and the next ones can be picked.
    this.notice = skippedNotice;
    ctx.selection.clear();
    this.goTo('select');
  }

  private onPointerMove(coordinate: number[]): void {
    if (this.step !== 'second') return;
    this.updatePreview(coordinate);
  }

  /** Mirrored ghosts and the mirror line, extended across the objects. */
  private updatePreview(second: Coordinate): void {
    const first = this.first;
    this.previewSource.clear(true);
    if (!first || (second[0] === first[0] && second[1] === first[1])) return;
    const objects = this.objects();
    const ghosts = objects.map(
      (feature) => new Feature(mirrorGeometry(feature.getGeometry()!, first, second)),
    );
    // The axis reaches across the objects and their mirror images.
    const extent = boundingExtent([first, second]);
    for (const feature of [...objects, ...ghosts])
      extend(extent, feature.getGeometry()!.getExtent());
    const reach = Math.hypot(getWidth(extent), getHeight(extent)) / 2 || 1;
    const center = getCenter(extent);
    const dx = second[0]! - first[0]!;
    const dy = second[1]! - first[1]!;
    const length = Math.hypot(dx, dy);
    const ux = dx / length;
    const uy = dy / length;
    // The point of the axis nearest the centre of everything, extended both ways.
    const t = (center[0]! - first[0]!) * ux + (center[1]! - first[1]!) * uy;
    const mid = [first[0]! + t * ux, first[1]! + t * uy];
    const span = Math.max(reach, Math.abs(t) + length);
    const axis = new LineString([
      [mid[0]! - span * ux, mid[1]! - span * uy],
      [mid[0]! + span * ux, mid[1]! + span * uy],
    ]);
    this.previewSource.addFeatures([...ghosts, new Feature(axis)]);
  }

  private onSelectionChange = (): void => {
    // Look after the batch: a `set` removes and adds.
    queueMicrotask(() => {
      if (this.ctx && this.step !== 'select' && this.objects().length === 0) this.goTo('select');
    });
  };

  private applyActivity(): void {
    for (const interaction of this.selectInteractions) {
      interaction.setActive(!this.suspended && this.step === 'select');
    }
    this.pointer?.setActive(!this.suspended && this.step !== 'select');
  }

  private goTo(step: MirrorStep): void {
    if (step !== 'select') this.notice = null;
    this.step = step;
    if (step === 'select' || step === 'first') this.first = null;
    if (step !== 'copy') this.second = null;
    if (step === 'copy' && this.second) this.updatePreview(this.second);
    else if (step !== 'second') this.previewSource.clear(true);
    this.applyActivity();
    this.ctx?.promptChanged();
  }
}
