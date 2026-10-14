import type { Editor } from '../../core/Editor';
import { icon } from '../icons';
import { hiddenText, setIconButton } from './controls';
import { OlcadPanel, type DockPosition } from './OlcadPanel';

/** Short unit label for the view projection's units. */
export function unitLabel(units: string | undefined): string {
  switch (units) {
    case 'm':
      return 'm';
    case 'degrees':
      return '°';
    case 'ft':
      return 'ft';
    case 'us-ft':
      return 'ft (US)';
    default:
      return units ?? '';
  }
}

/**
 * `<olcad-grid-settings>`: toolbox for grid snap (`editor.grid`). One click on **Grid snap** turns
 * it on or off, the spacing input sets the grid distance in view-projection units, **Show** draws
 * the grid as dots. Bind with `element.editor = editor`.
 */
export class OlcadGridSettings extends OlcadPanel {
  private boundEditor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];
  private readonly toggle: HTMLButtonElement = document.createElement('button');
  private readonly spacing: HTMLInputElement = document.createElement('input');
  private readonly unit: HTMLSpanElement = document.createElement('span');
  private readonly show: HTMLInputElement = document.createElement('input');
  private controlsBuilt = false;

  protected override get defaultDock(): DockPosition {
    return 'top';
  }

  protected override get defaultHeading(): string {
    return 'Grid';
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
        editor.on('gridchange', () => this.render()),
        editor.on('projectionchange', () => this.render()),
        editor.on('destroy', () => {
          this.editor = null;
        }),
      );
    }
    this.render();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.classList.add('olcad-grid-settings');
    if (!this.controlsBuilt) this.buildControls();
    this.render();
  }

  disconnectedCallback(): void {
    this.unbind();
  }

  private buildControls(): void {
    this.controlsBuilt = true;
    this.toggle.type = 'button';
    this.toggle.className = 'olcad-toolbar__button olcad-grid-settings__toggle';
    setIconButton(this.toggle, 'grid', 'Grid snap', 'Snap the cursor to the nearest grid point');
    this.toggle.addEventListener('click', () => {
      const editor = this.boundEditor;
      if (editor) editor.grid.setEnabled(!editor.grid.isEnabled());
    });

    const id = `olcad-grid-${Math.random().toString(36).slice(2, 8)}`;
    const label = document.createElement('label');
    label.className = 'olcad-grid-settings__label';
    label.htmlFor = id;
    label.append(hiddenText('Spacing'));
    this.spacing.setAttribute('data-tooltip', 'Grid spacing in map units');
    this.spacing.id = id;
    this.spacing.type = 'number';
    this.spacing.min = '0';
    this.spacing.step = 'any';
    this.spacing.className = 'olcad-straightedge__input olcad-grid-settings__spacing';
    this.spacing.setAttribute('aria-label', 'Grid spacing in map units');
    const applySpacing = () => {
      const value = Number(this.spacing.value);
      if (this.boundEditor && Number.isFinite(value) && value > 0) {
        this.boundEditor.grid.setSpacing(value);
      }
      this.render();
    };
    this.spacing.addEventListener('change', applySpacing);
    this.spacing.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        applySpacing();
        event.preventDefault();
      }
    });
    this.unit.className = 'olcad-grid-settings__unit';
    this.unit.setAttribute('data-tooltip', 'Unit of the view projection');

    const showLabel = document.createElement('label');
    showLabel.className = 'olcad-grid-settings__show olcad-icon-toggle';
    showLabel.setAttribute('data-tooltip', 'Draw the grid as dots while edit mode is on');
    this.show.type = 'checkbox';
    this.show.setAttribute('aria-label', 'Show grid');
    this.show.addEventListener('change', () => {
      this.boundEditor?.grid.setVisible(this.show.checked);
    });
    showLabel.append(this.show, icon('eye'), hiddenText('Show'));

    this.content.append(this.toggle, label, this.spacing, this.unit, showLabel);
  }

  private render(): void {
    if (!this.controlsBuilt) return;
    const editor = this.boundEditor;
    const enabled = editor?.grid.isEnabled() ?? false;
    this.toggle.disabled = !editor;
    this.toggle.setAttribute('aria-pressed', String(enabled));
    this.toggleAttribute('grid', enabled);
    this.spacing.disabled = !editor;
    if (editor && document.activeElement !== this.spacing) {
      this.spacing.value = String(editor.grid.getSpacing());
    }
    this.unit.textContent = editor
      ? unitLabel(editor.map.getView().getProjection().getUnits())
      : '';
    this.show.disabled = !editor;
    this.show.checked = editor?.grid.isVisible() ?? false;
    this.show.parentElement?.classList.toggle('olcad-icon-toggle--on', this.show.checked);
  }

  private unbind(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
  }
}
