import { BaseTool, InputRequest, ToolContext, ToolOptions } from './Tool';
export type TemplateCopyStep = 'select' | 'base' | 'name';
/** Prompt shown by the input bar for each step; `{name}` is the suggested name. */
export declare const TEMPLATE_COPY_PROMPTS: Record<TemplateCopyStep | 'stored', string>;
/**
 * Copy objects into a named template (`editor.templates`): select them (skipped when something
 * is selected at activation; read-only objects are fine), pick the base point the copies will
 * be inserted at, then type a name or press Enter for the suggested one. The selection is then
 * cleared and the tool starts over.
 */
export declare class TemplateCopyTool extends BaseTool {
    readonly id = "template-copy";
    private step;
    private base;
    /** The name stored last, shown in front of the next prompt. */
    private stored;
    private selectInteractions;
    private pointer;
    private suspended;
    canActivate(): boolean;
    /** The name step expects the template name typed. */
    getInputRequest(): InputRequest;
    getPrompt(): string;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    /** Switching tools keeps the selection: no `cancel` here. */
    deactivate(): void;
    /** Enter: continue from the selection, or keep the suggested name. */
    finish(): void;
    /** Escape steps back: name → base → select (clearing the selection). */
    cancel(): void;
    removeLastPoint(): boolean;
    handleInput(coordinate: number[]): boolean;
    /** The template name, in the name step. */
    handleText(text: string): boolean;
    setSuspended(suspended: boolean): void;
    private takeBase;
    private store;
    private onSelectionChange;
    private applyActivity;
    private goTo;
}
