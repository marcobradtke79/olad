import type Feature from 'ol/Feature';
import type Interaction from 'ol/interaction/Interaction';
import type OlMap from 'ol/Map';
import type { Command } from '../changes/commands';
import type { LayerManager } from '../layers/LayerManager';
import type { MeasurementStore } from '../measure/MeasurementStore';
import type { Selection } from '../selection/Selection';
import type { TemplateStore } from '../templates/TemplateStore';
import type { Locale } from '../i18n';
import type { LengthUnit } from '../units';

/** What a tool step expects typed into the command line (`Tool.getInputRequest`). */
export type InputRequest = 'text' | 'value' | null;

/** The single-part types the draw tool can draw. */
export type DrawType = 'Point' | 'LineString' | 'Polygon';

/**
 * Options a tool is activated with (`editor.tools.activate(id, options)`). The draw tool reads
 * `type` on a layer that accepts any geometry, the circle tool its construction `method`, the
 * regular polygon tool its number of `sides`; custom tools may define their own keys.
 */
export interface ToolOptions {
  type?: DrawType;
  method?: string;
  sides?: number;
  [key: string]: unknown;
}

/** What a tool needs from the editor. Tools never modify features directly: they execute commands. */
export interface ToolContext {
  map: OlMap;
  layers: LayerManager;
  selection: Selection;
  execute(command: Command): boolean;
  /** The active layer, target of inserts. */
  getActiveLayer(): string | null;
  /** The draft layer, target of inserts while no layer is active (`null` when disabled). */
  getDraftLayer(): string | null;
  /** Hit-detection tolerance in pixels (half the pick box). */
  hitTolerance: number;
  /** Whether a feature may be updated (layer rule and predicate). */
  canUpdate(feature: Feature): boolean;
  /** The tool's prompt changed (`Tool.getPrompt`): the editor emits `toolprompt`. */
  promptChanged(): void;
  /** The straightedge angle in degrees (`cursor.angle`), the base direction for aligned shapes. */
  getStraightedgeAngle(): number;
  /** The view projection code; features and coordinates are in this projection. */
  getProjection(): string;
  /** Chord tolerance in metres for linearized arcs and circles (`curves.tolerance`). */
  getCurveTolerance(): number;
  /** The default length unit (`editor.units.getLength()`), for prompts. */
  getLengthUnit(): LengthUnit;
  /** The editor's locale (`config.locale`), for number formats such as dimension values. */
  getLocale(): Locale;
  /** A length in metres formatted in the default unit's system, for prompts. */
  formatLength(metres: number): string;
  /** The editor's template store (`editor.templates`). */
  templates: Pick<TemplateStore, 'get' | 'create' | 'suggestName' | 'placed'>;
  /** End the active tool (as `editor.tools.deactivate()`), for tools that finish themselves. */
  done(): void;
  /** The editor's measurements (`editor.measurements`) and the live measurement overlay. */
  measurements: Pick<MeasurementStore, 'add' | 'setLive'>;
}

/**
 * A tool wraps one or more OpenLayers interactions. Exactly one tool is active at a time.
 * `activate` adds the interactions to the map, `deactivate` removes them and drops any
 * in-progress state.
 */
export interface Tool {
  readonly id: string;
  /**
   * The tool changes no data (measuring): it may run while edit mode is off, and switching
   * edit mode off keeps it active.
   */
  readonly readOnly?: boolean;
  /** Whether the tool can be activated now (active layer, selection, editability). */
  canActivate(ctx: ToolContext, options?: ToolOptions): boolean;
  activate(ctx: ToolContext, options?: ToolOptions): void;
  deactivate(): void;
  /** The options in effect, resolved by the tool (for example the type the draw tool draws). */
  getOptions?(): ToolOptions;
  /** What the user should do next (shown by the input bar), or `null` for the UI's default. */
  getPrompt?(): string | null;
  /** Abort what is in progress, keep the tool active. */
  cancel(): void;
  /** Finish what is in progress (Enter), if the tool has a multi-step operation. */
  finish(): void;
  /**
   * Drop the last vertex of an in-progress drawing, step back, or remove the vertex under the
   * pointer (Backspace, Delete). Returns whether something was removed.
   */
  removeLastPoint(): boolean;
  /**
   * A point typed into the numeric input (view projection, already resolved by the editor).
   * Returns whether the tool used it.
   */
  handleInput(coordinate: number[]): boolean;
  /**
   * A plain number typed without a unit into the numeric input while the tool's current step
   * asks for a dimensionless value (a count, a factor) rather than a point or a length. Returns whether the tool used it; when it does not,
   * the editor resolves the number as a distance from the reference point instead.
   */
  handleValue(value: number): boolean;
  /**
   * A length typed into the numeric input, converted to metres (from its typed unit, else the
   * default unit), while the tool's current step asks for a length (a distance, a half-axis, a
   * text height). Offered after `handleValue` (which only sees numbers typed without a unit).
   * Returns whether the tool used it; when it does not, the editor resolves the length as a
   * distance from the reference point.
   */
  handleLength?(metres: number): boolean;
  /**
   * Text typed into the command line while the tool's current step asks for text (a name).
   * Offered before the text is parsed as a point or number. Returns whether the tool used it.
   */
  handleText?(text: string): boolean;
  /**
   * Whether the current step expects the user to type into the command line: `'text'` (a name,
   * a text, an answer) or `'value'` (a number); `null` for steps that take map clicks. The input
   * bar focuses and highlights itself while a step asks.
   */
  getInputRequest?(): InputRequest;
  /** Temporarily disable the interactions, for example during a straightedge reference pick. */
  setSuspended(suspended: boolean): void;
  /** Last fixed vertex of an operation in progress (perpendicular snapping), or `null`. */
  referencePoint(): number[] | null;
}

/** Shared behaviour: interaction bookkeeping and no-op defaults. */
export abstract class BaseTool implements Tool {
  abstract readonly id: string;
  readonly readOnly: boolean = false;
  protected ctx: ToolContext | null = null;
  protected interactions: Interaction[] = [];
  protected options: ToolOptions = {};

  canActivate(_ctx: ToolContext, _options?: ToolOptions): boolean {
    return true;
  }

  activate(ctx: ToolContext, options: ToolOptions = {}): void {
    this.ctx = ctx;
    this.options = { ...options };
    for (const interaction of this.interactions) ctx.map.addInteraction(interaction);
  }

  getOptions(): ToolOptions {
    return { ...this.options };
  }

  getPrompt(): string | null {
    return null;
  }

  deactivate(): void {
    this.cancel();
    this.removeInteractions();
  }

  /** Detach from the map without cancelling (tools whose `cancel` has side effects use this). */
  protected removeInteractions(): void {
    if (this.ctx) {
      for (const interaction of this.interactions) this.ctx.map.removeInteraction(interaction);
    }
    this.interactions = [];
    this.ctx = null;
  }

  cancel(): void {}

  finish(): void {}

  removeLastPoint(): boolean {
    return false;
  }

  handleInput(_coordinate: number[]): boolean {
    return false;
  }

  handleValue(_value: number): boolean {
    return false;
  }

  handleLength(_metres: number): boolean {
    return false;
  }

  getInputRequest(): InputRequest {
    return null;
  }

  handleText(_text: string): boolean {
    return false;
  }

  setSuspended(suspended: boolean): void {
    for (const interaction of this.interactions) interaction.setActive(!suspended);
  }

  referencePoint(): number[] | null {
    return null;
  }
}
