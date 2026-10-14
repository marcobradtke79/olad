import type Interaction from 'ol/interaction/Interaction';
import type { TemplateSource } from '../templates/TemplateStore';
import { PointPickInteraction } from './pointer';
import { createBoxSelectInteraction, createSelectInteraction } from './select';
import { BaseTool, type InputRequest, type ToolContext, type ToolOptions } from './Tool';

export type TemplateCopyStep = 'select' | 'base' | 'name';

/** Prompt shown by the input bar for each step; `{name}` is the suggested name. */
export const TEMPLATE_COPY_PROMPTS: Record<TemplateCopyStep | 'stored', string> = {
  select: 'Select the objects to copy (Shift+click adds, Ctrl+drag a box), then press Enter',
  base: 'Base point: click on the map or type x,y; Escape goes back',
  name: 'Template name <{name}>: type a name, Enter keeps it; Escape goes back',
  stored: 'Template "{name}" stored.',
};

/**
 * Copy objects into a named template (`editor.templates`): select them (skipped when something
 * is selected at activation; read-only objects are fine), pick the base point the copies will
 * be inserted at, then type a name or press Enter for the suggested one. The selection is then
 * cleared and the tool starts over.
 */
export class TemplateCopyTool extends BaseTool {
  readonly id = 'template-copy';
  private step: TemplateCopyStep = 'select';
  private base: number[] | null = null;
  /** The name stored last, shown in front of the next prompt. */
  private stored: string | null = null;
  private selectInteractions: Interaction[] = [];
  private pointer: PointPickInteraction | null = null;
  private suspended = false;

  override canActivate(): boolean {
    return true;
  }

  /** The name step expects the template name typed. */
  override getInputRequest(): InputRequest {
    return this.step === 'name' ? 'text' : null;
  }

  override getPrompt(): string {
    const ctx = this.ctx;
    let prompt = TEMPLATE_COPY_PROMPTS[this.step];
    if (this.step === 'name' && ctx) {
      prompt = prompt.replaceAll('{name}', ctx.templates.suggestName());
    }
    if (this.stored !== null && this.step === 'select') {
      return `${TEMPLATE_COPY_PROMPTS.stored.replaceAll('{name}', this.stored)} ${prompt}`;
    }
    return prompt;
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    ctx.selection.collection.on('add', this.onSelectionChange);
    ctx.selection.collection.on('remove', this.onSelectionChange);
    this.selectInteractions = [createSelectInteraction(ctx), createBoxSelectInteraction(ctx)];
    this.pointer = new PointPickInteraction({
      click: (coordinate) => this.takeBase(coordinate),
      move: () => {},
    });
    this.interactions = [...this.selectInteractions, this.pointer];
    super.activate(ctx, options);
    this.stored = null;
    this.goTo(ctx.selection.get().length > 0 ? 'base' : 'select');
  }

  /** Switching tools keeps the selection: no `cancel` here. */
  override deactivate(): void {
    const ctx = this.ctx;
    if (ctx) {
      ctx.selection.collection.un('add', this.onSelectionChange);
      ctx.selection.collection.un('remove', this.onSelectionChange);
    }
    this.removeInteractions();
    this.selectInteractions = [];
    this.pointer = null;
    this.step = 'select';
    this.base = null;
    this.stored = null;
  }

  /** Enter: continue from the selection, or keep the suggested name. */
  override finish(): void {
    if (this.step === 'select' && (this.ctx?.selection.get().length ?? 0) > 0) this.goTo('base');
    else if (this.step === 'name') this.store();
  }

  /** Escape steps back: name → base → select (clearing the selection). */
  override cancel(): void {
    if (this.step === 'name') this.goTo('base');
    else if (this.step === 'base') {
      this.ctx?.selection.clear();
      this.goTo('select');
    } else this.ctx?.selection.clear();
  }

  override removeLastPoint(): boolean {
    if (this.step === 'select') return false;
    this.cancel();
    return true;
  }

  override handleInput(coordinate: number[]): boolean {
    if (this.step !== 'base') return false;
    this.takeBase(coordinate);
    return true;
  }

  /** The template name, in the name step. */
  override handleText(text: string): boolean {
    if (this.step !== 'name') return false;
    const name = text.trim();
    if (!name) return false;
    this.store(name);
    return true;
  }

  override setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    this.applyActivity();
  }

  private takeBase(coordinate: number[]): void {
    if (this.step !== 'base') return;
    this.base = coordinate.slice();
    this.goTo('name');
  }

  private store(name?: string): void {
    const ctx = this.ctx;
    if (!ctx || !this.base) return;
    const sources: TemplateSource[] = [];
    for (const feature of ctx.selection.get()) {
      const layer = ctx.layers.layerOf(feature);
      if (!layer || !feature.getGeometry()) continue;
      sources.push({ feature, layer, idProperty: ctx.layers.getConfig(layer).idProperty });
    }
    if (sources.length === 0) {
      this.goTo('select');
      return;
    }
    const id = ctx.templates.create(sources, this.base, name);
    this.stored = ctx.templates.get(id)?.name ?? name ?? null;
    ctx.selection.clear();
    this.goTo('select');
  }

  private onSelectionChange = (): void => {
    // Look after the batch: a `set` removes and adds.
    queueMicrotask(() => {
      if (!this.ctx) return;
      if (this.step !== 'select' && this.ctx.selection.get().length === 0) this.goTo('select');
    });
  };

  private applyActivity(): void {
    for (const interaction of this.selectInteractions) {
      interaction.setActive(!this.suspended && this.step === 'select');
    }
    this.pointer?.setActive(!this.suspended && this.step === 'base');
  }

  private goTo(step: TemplateCopyStep): void {
    if (step !== 'select') this.stored = null;
    this.step = step;
    if (step !== 'name') this.base = null;
    this.applyActivity();
    this.ctx?.promptChanged();
  }
}
