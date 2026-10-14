import type { SnapMode } from '../../core/config/types';
import type { Editor } from '../../core/Editor';
import { icon, type IconName } from '../icons';
import { hiddenText, setIconButton } from './controls';
import { OlcadPanel, type DockPosition } from './OlcadPanel';

const MODES: { mode: SnapMode; label: string; title: string; icon: IconName }[] = [
  {
    mode: 'vertex',
    label: 'Points',
    title: 'Snap to existing vertices and points',
    icon: 'snapVertex',
  },
  {
    mode: 'midpoint',
    label: 'Midpoints',
    title: 'Snap to the middle of segments',
    icon: 'snapMidpoint',
  },
  {
    mode: 'perpendicular',
    label: 'Perpendicular',
    title: 'Snap onto a line at a right angle from the last vertex of the drawing',
    icon: 'snapPerpendicular',
  },
  {
    mode: 'tangent',
    label: 'Tangent',
    title:
      'Snap to the point where a line from the last vertex of the drawing touches a circle or curve',
    icon: 'snapTangent',
  },
];

/**
 * `<olcad-snap-settings>`: toolbox for snapping. One click on **Snap** turns it on or off, the
 * radius input sets the snap distance in pixels, the checkboxes choose the snap modes.
 * Bind with `element.editor = editor`.
 */
export class OlcadSnapSettings extends OlcadPanel {
  private boundEditor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];
  private readonly toggle: HTMLButtonElement = document.createElement('button');
  private readonly tolerance: HTMLInputElement = document.createElement('input');
  private readonly modeInputs = new Map<SnapMode, HTMLInputElement>();
  private controlsBuilt = false;

  protected override get defaultDock(): DockPosition {
    return 'top';
  }

  protected override get defaultHeading(): string {
    return 'Snap';
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
        editor.on('snappingchange', () => this.render()),
        editor.on('destroy', () => {
          this.editor = null;
        }),
      );
    }
    this.render();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.classList.add('olcad-snap-settings');
    if (!this.controlsBuilt) this.buildControls();
    this.render();
  }

  disconnectedCallback(): void {
    this.unbind();
  }

  private buildControls(): void {
    this.controlsBuilt = true;
    this.toggle.type = 'button';
    this.toggle.className = 'olcad-toolbar__button olcad-snap-settings__toggle';
    setIconButton(this.toggle, 'snap', 'Snap', 'Snap the cursor to nearby geometry');
    this.toggle.addEventListener('click', () => {
      const editor = this.boundEditor;
      if (editor) editor.snapping.setEnabled(!editor.snapping.isEnabled());
    });

    const id = `olcad-snap-${Math.random().toString(36).slice(2, 8)}`;
    const label = document.createElement('label');
    label.className = 'olcad-snap-settings__label';
    label.htmlFor = id;
    label.append(hiddenText('Radius'));
    this.tolerance.setAttribute('data-tooltip', 'Snap radius in pixels');
    this.tolerance.id = id;
    this.tolerance.type = 'number';
    this.tolerance.min = '1';
    this.tolerance.step = '1';
    this.tolerance.className = 'olcad-straightedge__input olcad-snap-settings__tolerance';
    this.tolerance.setAttribute('aria-label', 'Snap radius in pixels');
    const applyTolerance = () => {
      const value = Number(this.tolerance.value);
      if (this.boundEditor && Number.isFinite(value) && value > 0) {
        this.boundEditor.snapping.setTolerance(value);
      }
      this.render();
    };
    this.tolerance.addEventListener('change', applyTolerance);
    this.tolerance.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        applyTolerance();
        event.preventDefault();
      }
    });
    const unit = document.createElement('span');
    unit.className = 'olcad-snap-settings__unit';
    unit.textContent = 'px';

    const modes = document.createElement('span');
    modes.className = 'olcad-snap-settings__modes';
    modes.setAttribute('role', 'group');
    modes.setAttribute('aria-label', 'Snap modes');
    for (const { mode, label: text, title, icon: iconName } of MODES) {
      const wrapper = document.createElement('label');
      wrapper.className = 'olcad-snap-settings__mode olcad-icon-toggle';
      wrapper.dataset.mode = mode;
      wrapper.setAttribute('data-tooltip', title);
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.addEventListener('change', () => {
        const editor = this.boundEditor;
        if (!editor) return;
        const current = new Set(editor.snapping.getModes());
        if (input.checked) current.add(mode);
        else current.delete(mode);
        if (current.size === 0) {
          input.checked = true; // keep at least one mode
          return;
        }
        editor.snapping.setModes(MODES.map((m) => m.mode).filter((m) => current.has(m)));
      });
      this.modeInputs.set(mode, input);
      input.setAttribute('aria-label', text);
      wrapper.append(input, icon(iconName), hiddenText(text));
      modes.append(wrapper);
    }
    this.content.append(this.toggle, label, this.tolerance, unit, modes);
  }

  private render(): void {
    if (!this.controlsBuilt) return;
    const editor = this.boundEditor;
    const enabled = editor?.snapping.isEnabled() ?? false;
    this.toggle.disabled = !editor;
    this.toggle.setAttribute('aria-pressed', String(enabled));
    this.toggleAttribute('snapping', enabled);
    this.tolerance.disabled = !editor;
    if (editor && document.activeElement !== this.tolerance) {
      this.tolerance.value = String(editor.snapping.getTolerance());
    }
    const modes = new Set(editor?.snapping.getModes() ?? []);
    for (const [mode, input] of this.modeInputs) {
      input.disabled = !editor;
      input.checked = modes.has(mode);
      input.parentElement?.classList.toggle('olcad-icon-toggle--on', input.checked);
    }
  }

  private unbind(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
  }
}
