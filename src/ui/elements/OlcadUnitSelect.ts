import type { Editor } from '../../core/Editor';
import { crsLengthUnit, LENGTH_UNITS, lengthUnitInfo, type LengthUnit } from '../../core/units';

/**
 * `<olcad-unit-select>`: a select for the default length unit (`editor.units.setLength`):
 * `Auto` (the view projection's unit, shown in brackets) or a fixed unit. Lengths typed without
 * a unit are in it; lengths and areas are shown in its system. Bind with `element.editor = editor`.
 */
export class OlcadUnitSelect extends HTMLElement {
  private boundEditor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];
  private readonly select: HTMLSelectElement = document.createElement('select');
  private built = false;

  get editor(): Editor | null {
    return this.boundEditor;
  }

  set editor(editor: Editor | null) {
    this.unbind();
    this.boundEditor = editor;
    if (editor) {
      this.unsubscribe.push(
        editor.on('unitschange', () => this.render()),
        editor.on('projectionchange', () => this.render()), // the unit "Auto" stands for
        editor.on('destroy', () => {
          this.editor = null;
        }),
      );
    }
    this.render();
  }

  connectedCallback(): void {
    this.classList.add('olcad-unit-select');
    if (!this.built) {
      this.built = true;
      this.select.className = 'olcad-unit-select__select';
      this.select.setAttribute('aria-label', 'Length unit');
      this.select.addEventListener('change', () => {
        this.boundEditor?.units.setLength(this.select.value as 'auto' | LengthUnit);
      });
      this.append(this.select);
    }
    this.render();
  }

  disconnectedCallback(): void {
    this.unbind();
  }

  private render(): void {
    if (!this.built) return;
    const editor = this.boundEditor;
    this.select.disabled = !editor;
    const auto = editor ? lengthUnitInfo(crsLengthUnit(editor.getProjection())).symbol : 'm';
    const options: [string, string][] = [
      ['auto', `Auto (${auto})`],
      ...LENGTH_UNITS.map((u): [string, string] => [u.id, `${u.label} (${u.symbol})`]),
    ];
    this.select.replaceChildren(...options.map(([value, text]) => new Option(text, value)));
    this.select.value = editor?.units.getLengthSetting() ?? 'auto';
  }

  private unbind(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
  }
}
