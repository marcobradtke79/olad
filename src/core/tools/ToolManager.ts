import { lengthUnitInfo } from '../units';
import type { InputRequest, Tool, ToolContext, ToolOptions } from './Tool';

export interface ToolManagerEvents {
  onToolChange(id: string | null, options: ToolOptions): void;
}

/** Registry of tools; keeps exactly one active. */
export class ToolManager {
  private readonly tools = new Map<string, Tool>();
  private active: Tool | null = null;
  private activeOptions: ToolOptions = {};
  private suspended = false;
  private readonly ctx: ToolContext;
  private readonly events: ToolManagerEvents;

  constructor(ctx: ToolContext, events: ToolManagerEvents) {
    this.ctx = ctx;
    this.events = events;
  }

  register(tool: Tool): void {
    if (this.tools.has(tool.id)) throw new Error(`Tool "${tool.id}" is already registered`);
    this.tools.set(tool.id, tool);
  }

  list(): string[] {
    return [...this.tools.keys()];
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }

  getActive(): string | null {
    return this.active?.id ?? null;
  }

  /** Whether the tool (default: the active one) is read-only (`Tool.readOnly`). */
  isReadOnly(id: string | null = this.getActive()): boolean {
    return id !== null && this.tools.get(id)?.readOnly === true;
  }

  /** Whether the active tool has nothing in progress (`Tool.isIdle`); `false` with no tool. */
  isIdle(): boolean {
    return this.active?.isIdle?.() ?? false;
  }

  /** The options the active tool works with (`{}` when no tool is active). */
  getActiveOptions(): ToolOptions {
    return this.active?.getOptions?.() ?? { ...this.activeOptions };
  }

  /** The active tool's prompt, or `null`; `{unit}` becomes the default length unit's symbol. */
  getPrompt(): string | null {
    const prompt = this.active?.getPrompt?.() ?? null;
    return prompt?.replace(/\{unit\}/g, lengthUnitInfo(this.ctx.getLengthUnit()).symbol) ?? null;
  }

  /** What the active tool's step expects typed (`Tool.getInputRequest`), or `null`. */
  getInputRequest(): InputRequest {
    return this.active?.getInputRequest?.() ?? null;
  }

  canActivate(id: string, options: ToolOptions = {}): boolean {
    const tool = this.tools.get(id);
    return tool !== undefined && tool.canActivate(this.ctx, options);
  }

  /** Activate a tool (deactivating the current one). Returns `false` when `canActivate` is false. */
  activate(id: string, options: ToolOptions = {}): boolean {
    const tool = this.tools.get(id);
    if (!tool) throw new Error(`Unknown tool "${id}"`);
    if (!tool.canActivate(this.ctx, options)) return false;
    if (this.active) {
      this.active.deactivate();
      this.active = null;
    }
    tool.activate(this.ctx, options);
    if (this.suspended) tool.setSuspended(true);
    this.active = tool;
    this.activeOptions = { ...options };
    this.events.onToolChange(tool.id, this.getActiveOptions());
    return true;
  }

  deactivate(): void {
    if (!this.active) return;
    this.active.deactivate();
    this.active = null;
    this.activeOptions = {};
    this.events.onToolChange(null, {});
  }

  cancel(): void {
    this.active?.cancel();
  }

  finish(): void {
    this.active?.finish();
  }

  removeLastPoint(): boolean {
    return this.active?.removeLastPoint() ?? false;
  }

  handleInput(coordinate: number[]): boolean {
    return this.active?.handleInput(coordinate) ?? false;
  }

  /** Offer a typed plain number to the active tool's current step (`Tool.handleValue`). */
  handleValue(value: number): boolean {
    return this.active?.handleValue(value) ?? false;
  }

  /** Offer a typed length in metres to the active tool's current step (`Tool.handleLength`). */
  handleLength(metres: number): boolean {
    return this.active?.handleLength?.(metres) ?? false;
  }

  /** Offer typed text to the active tool's current step (`Tool.handleText`). */
  handleText(text: string): boolean {
    return this.active?.handleText?.(text) ?? false;
  }

  /** The active tool's reference point for perpendicular snapping. */
  referencePoint(): number[] | null {
    return this.active?.referencePoint() ?? null;
  }

  /** Pause the active tool's interactions (straightedge pick) without changing the tool. */
  suspend(on: boolean): void {
    this.suspended = on;
    this.active?.setSuspended(on);
  }
}
