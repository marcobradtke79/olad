import { BaseTool, ToolContext, ToolOptions } from './Tool';
/** Prompt shown by the input bar; `{name}` is the template's name. */
export declare const TEMPLATE_INSERT_PROMPTS: {
    place: string;
    rejected: string;
};
/**
 * Insert copies of a template (`{ template: id }`): a dashed preview follows the pointer with
 * the template's base point at it; every click or typed point inserts one copy as one command
 * (each object into its source layer, else the active or draft layer) and selects it. The
 * attribute popup stays closed (the copies carry their attributes). Escape or Enter ends the
 * tool.
 */
export declare class TemplateInsertTool extends BaseTool {
    readonly id = "template-insert";
    private templateId;
    private last;
    private rejected;
    private pointer;
    private preview;
    private readonly previewSource;
    canActivate(ctx: ToolContext, options?: ToolOptions): boolean;
    getPrompt(): string | null;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    deactivate(): void;
    /** Escape ends the tool. */
    cancel(): void;
    /** Enter ends the tool too. */
    finish(): void;
    removeLastPoint(): boolean;
    handleInput(coordinate: number[]): boolean;
    /** The last insertion point, so `@dx,dy` places the next copy relative to it. */
    referencePoint(): number[] | null;
    private lookup;
    private template;
    private place;
    private onPointerMove;
}
