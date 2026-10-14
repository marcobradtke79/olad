import type { Editor } from '../../core/Editor';
import { icon } from '../icons';
import { hiddenText, setIconButton } from './controls';
import { OlcadPanel, type DockPosition } from './OlcadPanel';

/**
 * `<olcad-straightedge>`: toolbox for the parallel straightedge (the rotated crosshair shown
 * in edit mode). A number input sets the x-axis angle in degrees, "Reset" returns to 0°, and
 * "Pick reference" starts a reference pick: the pick box turns yellow and the next click on
 * a geometry aligns the straightedge with the nearest segment. Escape cancels the pick.
 * Bind with `element.editor = editor`.
 */
export class OlcadStraightedge extends OlcadPanel {
  private boundEditor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];
  private readonly input: HTMLInputElement = document.createElement('input');
  private readonly resetButton: HTMLButtonElement = document.createElement('button');
  private readonly pickButton: HTMLButtonElement = document.createElement('button');
  private readonly hint: HTMLElement = document.createElement('span');
  private controlsBuilt = false;

  protected override get defaultDock(): DockPosition {
    return 'top';
  }

  protected override get defaultHeading(): string {
    return 'Straightedge';
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
      const rerender = () => this.render();
      this.unsubscribe.push(
        editor.on('straightedgechange', rerender),
        editor.on('straightedgepick', rerender),
        editor.on('editmodechange', rerender),
        editor.on('destroy', () => {
          this.editor = null;
        }),
      );
    }
    this.render();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.classList.add('olcad-straightedge');
    if (!this.controlsBuilt) this.buildControls();
    this.render();
  }

  disconnectedCallback(): void {
    this.unbind();
    document.removeEventListener('keydown', this.onKeyDown);
  }

  private buildControls(): void {
    this.controlsBuilt = true;
    const id = `olcad-straightedge-${Math.random().toString(36).slice(2, 8)}`;
    const label = document.createElement('label');
    label.className = 'olcad-straightedge__label';
    label.htmlFor = id;
    label.setAttribute('data-tooltip', 'Straightedge: angle of the X axis');
    label.append(icon('straightedge'), hiddenText('X axis angle'));
    this.input.id = id;
    this.input.type = 'number';
    this.input.step = 'any';
    this.input.min = '0';
    this.input.max = '360';
    this.input.className = 'olcad-straightedge__input';
    this.input.setAttribute('aria-label', 'X axis angle in degrees');
    this.input.addEventListener('change', () => this.applyInput());
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.applyInput();
        event.preventDefault();
      }
    });
    const unit = document.createElement('span');
    unit.className = 'olcad-straightedge__unit';
    unit.textContent = '°';

    this.resetButton.type = 'button';
    this.resetButton.className = 'olcad-toolbar__button olcad-straightedge__reset';
    setIconButton(this.resetButton, 'reset', 'Reset', 'Straightedge back to 0°');
    this.resetButton.addEventListener('click', () => this.boundEditor?.straightedge.setAngle(0));

    this.pickButton.type = 'button';
    this.pickButton.className = 'olcad-toolbar__button olcad-straightedge__pick';
    setIconButton(
      this.pickButton,
      'alignSegment',
      'Align to segment',
      'Click a line or polygon on the map to align the straightedge with it',
    );
    this.pickButton.addEventListener('click', () => {
      const editor = this.boundEditor;
      if (!editor) return;
      if (editor.straightedge.isPicking()) {
        editor.straightedge.cancelPick();
        return;
      }
      if (!editor.isEditMode()) editor.setEditMode(true); // the pick needs the crosshair
      editor.straightedge.pick();
    });
    this.hint.className = 'olcad-straightedge__hint';
    this.hint.setAttribute('aria-live', 'polite');
    this.hint.hidden = true;

    this.content.append(label, this.input, unit, this.resetButton, this.pickButton, this.hint);
  }

  private applyInput(): void {
    const value = Number(this.input.value);
    if (!this.boundEditor || this.input.value === '' || !Number.isFinite(value)) {
      this.render();
      return;
    }
    this.boundEditor.straightedge.setAngle(value);
    this.render(); // show the normalised value
  }

  private render(): void {
    if (!this.controlsBuilt) return;
    const editor = this.boundEditor;
    const picking = editor?.straightedge.isPicking() ?? false;
    this.input.disabled = !editor;
    this.resetButton.disabled = !editor;
    this.pickButton.disabled = !editor;
    this.pickButton.setAttribute('aria-pressed', String(picking));
    this.toggleAttribute('picking', picking);
    this.hint.hidden = !picking;
    this.hint.textContent = picking ? 'Click a line or polygon on the map (Esc cancels)' : '';
    if (editor && document.activeElement !== this.input) {
      this.input.value = formatAngle(editor.straightedge.getAngle());
    }
    if (picking) document.addEventListener('keydown', this.onKeyDown);
    else document.removeEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    const editor = this.boundEditor;
    if (editor?.straightedge.isPicking()) {
      editor.straightedge.cancelPick();
      event.preventDefault();
    }
  };

  private unbind(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
  }
}

function formatAngle(angle: number): string {
  return String(Math.round(angle * 100) / 100);
}
