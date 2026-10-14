import type { Editor } from '../../core/Editor';
import { hiddenText, setIconButton } from './controls';
import { OlcadPanel, type DockPosition } from './OlcadPanel';

/** Step presets offered as buttons, in degrees. */
export const ANGLE_PRESETS: readonly number[] = [90, 45];

/**
 * `<olcad-angle-lock>`: toolbox for the angle lock (`editor.constraints`). One click on
 * **Lock angle** turns it on or off; the preset buttons and the step input choose the angle
 * step. Directions are counted from the straightedge angle. Bind with `element.editor = editor`.
 */
export class OlcadAngleLock extends OlcadPanel {
  private boundEditor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];
  private readonly toggle: HTMLButtonElement = document.createElement('button');
  private readonly presets = new Map<number, HTMLButtonElement>();
  private readonly step: HTMLInputElement = document.createElement('input');
  private controlsBuilt = false;

  protected override get defaultDock(): DockPosition {
    return 'top';
  }

  protected override get defaultHeading(): string {
    return 'Angle';
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
        editor.on('constraintschange', () => this.render()),
        editor.on('destroy', () => {
          this.editor = null;
        }),
      );
    }
    this.render();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.classList.add('olcad-angle-lock');
    if (!this.controlsBuilt) this.buildControls();
    this.render();
  }

  disconnectedCallback(): void {
    this.unbind();
  }

  private buildControls(): void {
    this.controlsBuilt = true;
    this.toggle.type = 'button';
    this.toggle.className = 'olcad-toolbar__button olcad-angle-lock__toggle';
    setIconButton(
      this.toggle,
      'angleLock',
      'Lock angle',
      'Only draw in directions that are multiples of the step from the straightedge angle',
    );
    this.toggle.addEventListener('click', () => {
      const editor = this.boundEditor;
      if (editor) editor.constraints.setAngleLocked(!editor.constraints.isAngleLocked());
    });

    const presets = document.createElement('span');
    presets.className = 'olcad-angle-lock__presets';
    presets.setAttribute('role', 'group');
    presets.setAttribute('aria-label', 'Angle step presets');
    for (const preset of ANGLE_PRESETS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'olcad-toolbar__button olcad-angle-lock__preset';
      button.dataset.step = String(preset);
      button.textContent = `${preset}°`;
      button.setAttribute('aria-label', `Step of ${preset} degrees`);
      button.setAttribute('data-tooltip', `Angle step of ${preset} degrees`);
      button.addEventListener('click', () => this.boundEditor?.constraints.setAngleStep(preset));
      this.presets.set(preset, button);
      presets.append(button);
    }

    const id = `olcad-angle-${Math.random().toString(36).slice(2, 8)}`;
    const label = document.createElement('label');
    label.className = 'olcad-angle-lock__label';
    label.htmlFor = id;
    label.append(hiddenText('Step'));
    this.step.setAttribute('data-tooltip', 'Angle step in degrees');
    this.step.id = id;
    this.step.type = 'number';
    this.step.min = '0';
    this.step.max = '360';
    this.step.step = 'any';
    this.step.className = 'olcad-straightedge__input olcad-angle-lock__step';
    this.step.setAttribute('aria-label', 'Angle step in degrees');
    const applyStep = () => {
      const value = Number(this.step.value);
      if (this.boundEditor && Number.isFinite(value) && value > 0 && value <= 360) {
        this.boundEditor.constraints.setAngleStep(value);
      }
      this.render();
    };
    this.step.addEventListener('change', applyStep);
    this.step.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        applyStep();
        event.preventDefault();
      }
    });
    const unit = document.createElement('span');
    unit.className = 'olcad-angle-lock__unit';
    unit.textContent = '°';

    this.content.append(this.toggle, presets, label, this.step, unit);
  }

  private render(): void {
    if (!this.controlsBuilt) return;
    const editor = this.boundEditor;
    const locked = editor?.constraints.isAngleLocked() ?? false;
    const step = editor?.constraints.getAngleStep();
    this.toggle.disabled = !editor;
    this.toggle.setAttribute('aria-pressed', String(locked));
    this.toggleAttribute('locked', locked);
    for (const [preset, button] of this.presets) {
      button.disabled = !editor;
      button.setAttribute('aria-pressed', String(step === preset));
    }
    this.step.disabled = !editor;
    if (editor && document.activeElement !== this.step) this.step.value = String(step);
  }

  private unbind(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
  }
}
