import Feature from 'ol/Feature';
import type VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { canInsertTemplate, templateInsertCommand, templateTarget } from '../templates/insert';
import type { Template } from '../templates/TemplateStore';
import { PointPickInteraction } from './pointer';
import { createPreviewLayer } from './preview';
import { BaseTool, type ToolContext, type ToolOptions } from './Tool';

/** Prompt shown by the input bar; `{name}` is the template's name. */
export const TEMPLATE_INSERT_PROMPTS = {
  place: 'Insert "{name}": click the insertion point or type x,y; Escape ends',
  rejected: 'The copy could not be inserted.',
};

/**
 * Insert copies of a template (`{ template: id }`): a dashed preview follows the pointer with
 * the template's base point at it; every click or typed point inserts one copy as one command
 * (each object into its source layer, else the active or draft layer) and selects it. The
 * attribute popup stays closed (the copies carry their attributes). Escape or Enter ends the
 * tool.
 */
export class TemplateInsertTool extends BaseTool {
  readonly id = 'template-insert';
  private templateId: string | null = null;
  private last: { point: number[]; projection: string } | null = null;
  private rejected = false;
  private pointer: PointPickInteraction | null = null;
  private preview: VectorLayer<VectorSource<Feature>> | null = null;
  private readonly previewSource = new VectorSource<Feature>();

  override canActivate(ctx: ToolContext, options?: ToolOptions): boolean {
    const template = this.lookup(ctx, options);
    return template !== undefined && canInsertTemplate(ctx, template);
  }

  override getPrompt(): string | null {
    const template = this.template();
    if (!template) return null;
    const prompt = TEMPLATE_INSERT_PROMPTS.place.replaceAll('{name}', template.name);
    return this.rejected ? `${TEMPLATE_INSERT_PROMPTS.rejected} ${prompt}` : prompt;
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    this.templateId = typeof options?.template === 'string' ? options.template : null;
    this.pointer = new PointPickInteraction({
      click: (coordinate) => this.place(coordinate),
      move: (coordinate) => this.onPointerMove(coordinate),
    });
    this.preview = createPreviewLayer(this.previewSource);
    ctx.map.addLayer(this.preview);
    this.interactions = [this.pointer];
    super.activate(ctx, options);
    this.last = null;
    this.rejected = false;
    ctx.promptChanged();
  }

  override deactivate(): void {
    if (this.ctx && this.preview) this.ctx.map.removeLayer(this.preview);
    this.previewSource.clear();
    this.removeInteractions();
    this.pointer = null;
    this.preview = null;
    this.templateId = null;
    this.last = null;
  }

  /** Escape ends the tool. */
  override cancel(): void {
    this.ctx?.done();
  }

  /** Enter ends the tool too. */
  override finish(): void {
    this.ctx?.done();
  }

  override removeLastPoint(): boolean {
    this.ctx?.done();
    return true;
  }

  override handleInput(coordinate: number[]): boolean {
    this.place(coordinate);
    return true;
  }

  /** The last insertion point, so `@dx,dy` places the next copy relative to it. */
  override referencePoint(): number[] | null {
    const ctx = this.ctx;
    // A projection switch makes a stored point meaningless.
    return this.last && ctx && this.last.projection === ctx.getProjection()
      ? this.last.point
      : null;
  }

  private lookup(ctx: ToolContext, options?: ToolOptions): Template | undefined {
    const id = options?.template;
    return typeof id === 'string' ? ctx.templates.get(id) : undefined;
  }

  private template(): Template | undefined {
    return this.ctx && this.templateId ? this.ctx.templates.get(this.templateId) : undefined;
  }

  private place(coordinate: number[]): void {
    const ctx = this.ctx;
    const template = this.template();
    if (!ctx || !template) return;
    const result = templateInsertCommand(ctx, ctx.templates, template, coordinate);
    const ok = result !== null && ctx.execute(result.command);
    if (ok) {
      ctx.selection.set(result.features);
      this.last = { point: coordinate.slice(), projection: ctx.getProjection() };
    }
    if (this.rejected !== !ok) {
      this.rejected = !ok;
      ctx.promptChanged();
    }
  }

  private onPointerMove(coordinate: number[]): void {
    const ctx = this.ctx;
    const template = this.template();
    this.previewSource.clear(true);
    if (!ctx || !template) return;
    const placed = ctx.templates.placed(template, coordinate, ctx.getProjection());
    placed.forEach((geometry, i) => {
      // Only the objects that will be inserted.
      if (templateTarget(ctx, template.features[i]!)) {
        this.previewSource.addFeature(new Feature(geometry));
      }
    });
  }
}
