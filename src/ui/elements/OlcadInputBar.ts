import type { Editor, InputResult } from '../../core/Editor';
import { OlcadPanel, type DockPosition } from './OlcadPanel';

export type InputBarMessageKind = 'prompt' | 'info' | 'error';

/** Prompt shown for each tool. */
const PROMPTS: Record<string, string> = {
  draw: 'Click or type a point (x,y · @dx,dy · @d<a · d); Enter finishes, Escape cancels',
  select: 'Click a feature, Shift+click to add, Ctrl / Cmd+drag for a box',
  rectangle:
    'First corner, then the opposite corner (click or type); the sides follow the straightedge',
  circle:
    'Centre and radius, centre and a point on the circle, or three points on the circle (click or type)',
  ellipse:
    'Centre and axes, both ends of one axis and the other half-axis, or two corners of a box (click or type)',
  'regular-polygon':
    'Number of sides, then the centre and one vertex of the regular polygon (click or type)',
  curve: 'Start and end point, then adjust the handles at both ends; Enter inserts the curve',
  text: 'Insert point, then the text height and the text (command line)',
  parallel:
    'Pick a line or polygon, a start point beside it, then follow it with the crosshair and click',
  modify: 'Click an object, then a vertex to move it or a segment to insert one; Alt+click deletes',
  move: 'Select the objects to move, then a base point and a second point',
  rotate: 'Select the objects to rotate, then the centre and two points spanning the angle',
  offset: 'Select a line or polygon, type the offset distance, then click the side of the copy',
};
const NO_TOOL_PROMPT = 'Switch on edit mode and choose a tool';
const POINT_PLACEHOLDER = 'x,y · @dx,dy · @d<a · d';
const REQUEST_PLACEHOLDERS = {
  text: 'Type the text and press Enter',
  value: 'Type a value and press Enter',
} as const;

/**
 * `<olcad-input-bar>`: the command line. An output line shows the active tool's prompt (its own
 * `getPrompt` per step, else a default per tool), the
 * result of typed input, validation errors and other editor messages; the text input takes
 * numeric input (`editor.input`). Enter with an empty input finishes the drawing, Escape
 * cancels it. Bind with `element.editor = editor`.
 */
export class OlcadInputBar extends OlcadPanel {
  private boundEditor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];
  private readonly output: HTMLElement = document.createElement('output');
  private readonly input: HTMLInputElement = document.createElement('input');
  private controlsBuilt = false;
  /** What the active tool's step expects typed, as last applied. */
  private awaiting: 'text' | 'value' | null = null;

  protected override get defaultDock(): DockPosition {
    return 'bottom';
  }

  protected override get defaultHeading(): string {
    return 'Command line';
  }

  protected override get defaultCompact(): boolean {
    return true;
  }

  get editor(): Editor | null {
    return this.boundEditor;
  }

  set editor(editor: Editor | null) {
    this.unbind();
    this.boundEditor = editor;
    if (editor) {
      this.unsubscribe.push(
        editor.on('toolchange', () => this.showPrompt()),
        editor.on('toolprompt', () => this.showPrompt()),
        editor.on('editmodechange', () => this.showPrompt()),
        editor.on('input', (result) => this.showResult(result)),
        editor.on('validationerror', ({ message }) => this.show(message, 'error')),
        editor.on('projectionchange', ({ to }) => this.show(`Projection: ${to}`, 'info')),
        editor.on('unitschange', ({ length, setting }) =>
          this.show(`Length unit: ${length}${setting === 'auto' ? ' (from the CRS)' : ''}`, 'info'),
        ),
        editor.on('featureinsert', ({ layer }) => {
          const title = editor.layers.get(layer).title;
          this.show(`Inserted into ${title}`, 'info');
        }),
        editor.on('destroy', () => {
          this.editor = null;
        }),
      );
    }
    this.render();
    this.showPrompt();
  }

  /** The current output text. */
  get message(): string {
    return this.output.textContent ?? '';
  }

  /** Show a message in the output line. */
  show(text: string, kind: InputBarMessageKind = 'info'): void {
    this.output.textContent = text;
    this.output.dataset.kind = kind;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.classList.add('olcad-input-bar');
    if (!this.controlsBuilt) this.buildControls();
    this.render();
  }

  disconnectedCallback(): void {
    this.unbind();
  }

  private buildControls(): void {
    this.controlsBuilt = true;
    this.output.className = 'olcad-input-bar__output';
    this.output.setAttribute('role', 'status');
    this.output.setAttribute('aria-live', 'polite');
    this.input.type = 'text';
    this.input.className = 'olcad-input-bar__input';
    this.input.placeholder = POINT_PLACEHOLDER;
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    this.input.setAttribute('aria-label', 'Numeric input');
    this.input.addEventListener('keydown', (event) => {
      const editor = this.boundEditor;
      if (!editor) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        const text = this.input.value.trim();
        if (text.length === 0) {
          editor.tools.finish();
          return;
        }
        const result = editor.input(text);
        if (result.ok) this.input.value = '';
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.input.value = '';
        editor.tools.cancel();
      }
    });
    this.content.append(this.output, this.input);
  }

  private render(): void {
    if (!this.controlsBuilt) return;
    this.input.disabled = !this.boundEditor;
  }

  private showPrompt(): void {
    const editor = this.boundEditor;
    if (!editor) {
      this.show('', 'prompt');
      return;
    }
    // Only tools allowed in the current mode can be active (read-only ones also while viewing).
    const tool = editor.tools.getActive();
    // A multi-step tool publishes its own prompt (`Tool.getPrompt`); otherwise the default.
    const own = tool ? editor.tools.getPrompt() : null;
    this.show(own ?? (tool ? (PROMPTS[tool] ?? `Tool: ${tool}`) : NO_TOOL_PROMPT), 'prompt');
    this.applyInputRequest(tool ? (editor.tools.getInputRequest?.() ?? null) : null);
  }

  /**
   * A step that expects typing (`editor.tools.getInputRequest()`) focuses the input, selects
   * what is in it and highlights the bar; when such a step ends, the input gives the focus back
   * so the map's keyboard shortcuts work again. The focus is not taken while a modal dialog is
   * open or another text field outside the bar is being typed in.
   */
  private applyInputRequest(request: 'text' | 'value' | null): void {
    if (!this.controlsBuilt) return;
    const was = this.awaiting;
    this.awaiting = request;
    this.classList.toggle('olcad-input-bar--awaiting', request !== null);
    if (request) {
      this.dataset.input = request;
      this.input.placeholder = REQUEST_PLACEHOLDERS[request];
      const doc = this.ownerDocument;
      const active = doc.activeElement as HTMLElement | null;
      const typingElsewhere =
        active !== null &&
        active !== this.input &&
        !this.contains(active) &&
        (active.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName));
      if (!doc.querySelector('dialog[open]') && !typingElsewhere && !this.input.disabled) {
        this.input.focus({ preventScroll: true });
        this.input.select();
      }
      return;
    }
    delete this.dataset.input;
    this.input.placeholder = POINT_PLACEHOLDER;
    if (was && this.ownerDocument.activeElement === this.input) this.input.blur();
  }

  private showResult(result: InputResult): void {
    if (!result.ok) {
      this.show(result.error, 'error');
      return;
    }
    if ('kind' in result) {
      // Text taken by the tool (a name): its next prompt says what happened.
      this.showPrompt();
      return;
    }
    const editor = this.boundEditor;
    if ('length' in result) {
      const length = editor ? editor.units.formatLength(result.length) : `${result.length} m`;
      this.show(`${result.text} → ${length}`, 'info');
      return;
    }
    if (!('coordinate' in result)) {
      this.show(`${result.text} → ${result.value}`, 'info');
      return;
    }
    const decimals = editor?.map.getView().getProjection().getUnits() === 'degrees' ? 6 : 2;
    const [x, y] = result.coordinate;
    this.show(`${result.text} → ${x!.toFixed(decimals)}, ${y!.toFixed(decimals)}`, 'info');
  }

  private unbind(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
  }
}
