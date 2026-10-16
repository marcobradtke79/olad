import type Feature from 'ol/Feature';
import Overlay from 'ol/Overlay';
import type { Editor, EditorEvents } from '../../core/Editor';
import { toAngleUnit, type DimensionValues } from '../../core/dimensions/values';
import { lengthUnitInfo } from '../../core/units';

type ValueClick = EditorEvents['dimensionvalueclick'];

/**
 * `<olcad-dimension-input>`: the inline value editor of dimensions. When a dimension's value is
 * clicked on the map (`dimensionvalueclick`), a small input box appears at the value, filled
 * with the field value in the layer's unit (empty, with the GIS value as placeholder, while
 * none is set). Enter hands the text to `editor.dimensions.input` (a number is the field value,
 * `station offset` for a station, `-` or an empty box clears it, `t <text>` sets a free text);
 * Escape, leaving the box, a selection or tool change close it. Bind with
 * `element.editor = editor`.
 */
export class OlcadDimensionInput extends HTMLElement {
  private boundEditor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];
  private overlay: Overlay | null = null;
  private overlayMap: Editor['map'] | null = null;
  private readonly box: HTMLDivElement = document.createElement('div');
  private readonly input: HTMLInputElement = document.createElement('input');
  private readonly unit: HTMLSpanElement = document.createElement('span');
  private feature: Feature | null = null;
  private closing = false;
  private built = false;

  get editor(): Editor | null {
    return this.boundEditor;
  }

  set editor(editor: Editor | null) {
    this.unbind();
    this.close();
    if (this.overlay && this.overlayMap) {
      this.overlayMap.removeOverlay(this.overlay);
      this.overlay = null;
      this.overlayMap = null;
    }
    this.boundEditor = editor;
    if (editor) {
      this.unsubscribe.push(
        editor.on('dimensionvalueclick', (detail) => this.open(detail)),
        editor.on('selectionchange', ({ features }) => {
          if (this.feature && !(features.length === 1 && features[0] === this.feature)) {
            this.close();
          }
        }),
        editor.on('toolchange', () => this.close()),
        editor.on('editmodechange', () => this.close()),
        editor.on('change', () => {
          // The dimension was deleted (undo of its insert, delete): nothing to edit.
          if (this.feature && !editor.dimensions.isDimension(this.feature)) this.close();
        }),
        editor.on('destroy', () => {
          this.editor = null;
        }),
      );
    }
  }

  /** The dimension being edited, or `null` while the box is closed. */
  get target(): Feature | null {
    return this.feature;
  }

  get isOpen(): boolean {
    return this.feature !== null;
  }

  connectedCallback(): void {
    this.classList.add('olcad-dimension-input');
    if (this.built) return;
    this.built = true;
    this.box.className = 'olcad-dimension-input__box';
    this.box.hidden = true;
    this.input.className = 'olcad-dimension-input__field';
    this.input.type = 'text';
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    this.input.setAttribute('aria-label', 'Field value of the dimension');
    this.unit.className = 'olcad-dimension-input__unit';
    this.box.append(this.input, this.unit);
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.submit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
      // Other keys stay in the box: the map's shortcuts ignore inputs anyway.
      event.stopPropagation();
    });
    this.input.addEventListener('input', () => this.setError(null));
    this.input.addEventListener('blur', () => this.close());
    // The box lives in the map's overlay container; keep a hook for styling by the host.
    this.append(this.box);
  }

  disconnectedCallback(): void {
    this.unbind();
  }

  /** Open the box at a clicked value. */
  open(detail: ValueClick): void {
    const editor = this.boundEditor;
    if (!editor || !this.built) return;
    const values = editor.dimensions.values(detail.feature);
    if (!values) return;
    this.feature = detail.feature;
    this.setError(null);
    this.input.value = this.prefill(editor, detail.feature, values);
    this.input.placeholder = detail.label.text.replace(/^⚠ /, '');
    this.unit.textContent = this.unitSymbol(editor, detail.feature, values);
    const overlay = this.ensureOverlay(editor);
    overlay.setPositioning(
      detail.label.align === 'left'
        ? 'center-left'
        : detail.label.align === 'right'
          ? 'center-right'
          : 'center-center',
    );
    overlay.setPosition(detail.label.at);
    this.box.hidden = false;
    this.input.focus();
    this.input.select();
  }

  /** Hand the typed text to the editor; the box closes when it was taken. */
  submit(): void {
    const editor = this.boundEditor;
    const feature = this.feature;
    if (!editor || !feature) return;
    const result = editor.dimensions.input(feature, this.input.value.trim() || '-');
    if (result.ok) this.close();
    else this.setError(result.error);
  }

  close(): void {
    if (this.closing) return;
    this.closing = true;
    this.feature = null;
    this.overlay?.setPosition(undefined);
    this.box.hidden = true;
    this.setError(null);
    if (this.box.ownerDocument.activeElement === this.input) this.input.blur();
    this.closing = false;
  }

  private ensureOverlay(editor: Editor): Overlay {
    if (!this.overlay) {
      // `stopEvent` (the default) keeps clicks and keys in the box from the map.
      this.overlay = new Overlay({ element: this.box, stopEvent: true, insertFirst: false });
      this.overlayMap = editor.map;
      editor.map.addOverlay(this.overlay);
    }
    return this.overlay;
  }

  /** The current field value as the user would type it, or the free text as `t <text>`. */
  private prefill(editor: Editor, feature: Feature, values: DimensionValues): string {
    const text = feature.get('text') as string | null | undefined;
    if (values.field === null) return text ? `t ${text}` : '';
    const round = (value: number, digits: number) =>
      String(Math.round(value * 10 ** digits) / 10 ** digits);
    if (values.unit === 'deg')
      return round(toAngleUnit(values.field, this.angleUnit(editor, feature)), 4);
    if (values.unit === '%' || values.type === 'level') return round(values.field, 3);
    const length = round(editor.units.fromMetres(values.field), 3);
    if (values.type === 'station' && values.second?.field !== null && values.second !== undefined) {
      return `${length} ${round(Math.abs(editor.units.fromMetres(values.second.field!)), 3)}`;
    }
    return length;
  }

  private unitSymbol(editor: Editor, feature: Feature, values: DimensionValues): string {
    if (values.unit === 'deg') return this.angleUnit(editor, feature) === 'gon' ? 'gon' : '°';
    if (values.unit === '%') return '%';
    if (values.type === 'level') return 'm';
    return lengthUnitInfo(editor.units.getLength()).symbol;
  }

  private angleUnit(editor: Editor, feature: Feature): 'deg' | 'gon' {
    const layer = editor.layers.layerOf(feature);
    return (layer && editor.layers.getConfig(layer).dimension?.angleUnit) || 'deg';
  }

  private setError(message: string | null): void {
    if (message) {
      this.box.dataset.error = message;
      this.input.setAttribute('aria-invalid', 'true');
      this.input.title = message;
    } else {
      delete this.box.dataset.error;
      this.input.removeAttribute('aria-invalid');
      this.input.title = '';
    }
  }

  private unbind(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
  }
}
