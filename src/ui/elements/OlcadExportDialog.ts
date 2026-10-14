import type { Editor } from '../../core/Editor';
import {
  EXPORT_FORMATS,
  type ExportFormat,
  type ExportResult,
} from '../../core/export/exportLayers';
import { downloadFile } from '../download';
import { projectionOptions } from './OlcadProjectionSelect';

/** Fired on the element after a file was exported; `detail` is the `ExportResult`. */
export const EXPORT_EVENT = 'olcad-export';

/**
 * `<olcad-export-dialog>`: a modal dialog that asks which layers to export, the format
 * (GeoJSON, KML, GML 3.2, GPX) and, for GeoJSON and GML, the CRS; Export writes one file with
 * `editor.exportLayers` and downloads it, then fires `olcad-export`. `open()` shows it, for
 * example from a host's File menu. Bind with `element.editor = editor`.
 */
export class OlcadExportDialog extends HTMLElement {
  private boundEditor: Editor | null = null;
  private offDestroy: (() => void) | null = null;
  private dialog: HTMLDialogElement | null = null;
  /** Format and CRS chosen last; kept between openings. */
  private format: ExportFormat = 'geojson';
  private projection = 'EPSG:4326';

  get editor(): Editor | null {
    return this.boundEditor;
  }

  set editor(editor: Editor | null) {
    this.offDestroy?.();
    this.offDestroy = null;
    this.boundEditor = editor;
    if (!editor) this.close();
    else this.offDestroy = editor.on('destroy', () => (this.editor = null));
  }

  get isOpen(): boolean {
    return this.dialog?.open ?? false;
  }

  connectedCallback(): void {
    this.classList.add('olcad-export-dialog');
  }

  /** Show the dialog with the current layers. */
  open(): void {
    const editor = this.boundEditor;
    if (!editor) return;
    if (!this.dialog) {
      this.dialog = document.createElement('dialog');
      this.dialog.className = 'olcad-export-dialog__dialog';
    }
    if (!this.dialog.isConnected) this.append(this.dialog);
    this.render(this.dialog, editor);
    if (!this.dialog.open) {
      if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
      else this.dialog.setAttribute('open', '');
    }
    this.dialog.querySelector<HTMLInputElement>('input[type="checkbox"]:checked, input')?.focus();
  }

  close(): void {
    const dialog = this.dialog;
    if (!dialog?.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  private render(dialog: HTMLDialogElement, editor: Editor): void {
    const form = document.createElement('form');
    form.className = 'olcad-export-dialog__form';
    form.noValidate = true;

    const heading = document.createElement('h2');
    heading.className = 'olcad-export-dialog__heading';
    heading.id = `olcad-export-dialog-${Math.random().toString(36).slice(2, 8)}`;
    heading.textContent = 'Export';
    dialog.setAttribute('aria-labelledby', heading.id);

    // Layers
    const layerSet = fieldset('Layers');
    const list = document.createElement('div');
    list.className = 'olcad-export-dialog__layers';
    const boxes: HTMLInputElement[] = [];
    for (const layer of editor.layers.list()) {
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.name = 'layer';
      box.value = layer.id;
      box.checked = layer.featureCount > 0;
      boxes.push(box);
      const label = document.createElement('label');
      label.className = 'olcad-export-dialog__layer';
      const count = document.createElement('span');
      count.className = 'olcad-export-dialog__count';
      count.textContent = String(layer.featureCount);
      label.append(box, ` ${layer.title}`, count);
      list.append(label);
    }
    const quick = document.createElement('div');
    quick.className = 'olcad-export-dialog__quick';
    const all = smallButton('All', 'all');
    const none = smallButton('None', 'none');
    quick.append(all, none);
    layerSet.append(quick, list);

    // Format and CRS
    const formatSet = fieldset('Format');
    const formats = document.createElement('div');
    formats.className = 'olcad-export-dialog__formats';
    const radios = EXPORT_FORMATS.map((info) => {
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'format';
      radio.value = info.id;
      radio.checked = info.id === this.format;
      const label = document.createElement('label');
      label.append(radio, ` ${info.label}`);
      formats.append(label);
      return radio;
    });
    const crs = document.createElement('select');
    crs.name = 'projection';
    crs.className = 'olcad-export-dialog__control';
    const options = [
      { code: 'EPSG:4326', label: 'EPSG:4326 (WGS 84)' },
      ...projectionOptions(editor),
    ];
    const seen = new Set<string>();
    for (const option of options) {
      if (seen.has(option.code)) continue;
      seen.add(option.code);
      crs.append(new Option(option.label, option.code));
    }
    crs.value = seen.has(this.projection) ? this.projection : 'EPSG:4326';
    const crsLabel = document.createElement('label');
    crsLabel.className = 'olcad-export-dialog__crs';
    crsLabel.append('Coordinate system ', crs);
    const note = document.createElement('p');
    note.className = 'olcad-export-dialog__note';
    formatSet.append(formats, crsLabel, note);

    const error = document.createElement('p');
    error.className = 'olcad-export-dialog__error';
    error.setAttribute('role', 'alert');
    error.hidden = true;

    const actions = document.createElement('div');
    actions.className = 'olcad-export-dialog__actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'olcad-toolbar__button';
    cancel.dataset.action = 'cancel';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => this.close());
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'olcad-toolbar__button olcad-export-dialog__export';
    submit.dataset.action = 'export';
    submit.textContent = 'Export';
    actions.append(cancel, submit);

    const sync = () => {
      const format = EXPORT_FORMATS.find((f) => f.id === this.format)!;
      crs.disabled = format.crs !== undefined;
      if (format.crs) crs.value = format.crs;
      else crs.value = this.projection;
      const notes: string[] = [];
      if (format.crs) notes.push(`${format.label} is always written in ${format.crs}.`);
      if (format.skips)
        notes.push(`${format.label} cannot hold ${format.skips}; they are skipped.`);
      note.textContent = notes.join(' ');
      note.hidden = notes.length === 0;
      submit.disabled = !boxes.some((b) => b.checked);
    };
    for (const radio of radios) {
      radio.addEventListener('change', () => {
        this.format = radio.value as ExportFormat;
        sync();
      });
    }
    crs.addEventListener('change', () => {
      this.projection = crs.value;
    });
    for (const box of boxes) box.addEventListener('change', sync);
    all.addEventListener('click', () => {
      for (const box of boxes) box.checked = true;
      sync();
    });
    none.addEventListener('click', () => {
      for (const box of boxes) box.checked = false;
      sync();
    });
    sync();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const ids = boxes.filter((b) => b.checked).map((b) => b.value);
      let result: ExportResult;
      try {
        result = editor.exportLayers(ids, {
          format: this.format,
          ...(crs.disabled ? {} : { projection: crs.value }),
        });
      } catch (e) {
        error.textContent = e instanceof Error ? e.message : String(e);
        error.hidden = false;
        return;
      }
      downloadFile(result.content, result.filename, result.mimeType, this.ownerDocument);
      this.close();
      this.dispatchEvent(
        new CustomEvent<ExportResult>(EXPORT_EVENT, { detail: result, bubbles: true }),
      );
    });

    form.append(heading, layerSet, formatSet, error, actions);
    dialog.replaceChildren(form);
  }
}

function fieldset(legendText: string): HTMLFieldSetElement {
  const set = document.createElement('fieldset');
  set.className = 'olcad-export-dialog__fieldset';
  const legend = document.createElement('legend');
  legend.textContent = legendText;
  set.append(legend);
  return set;
}

function smallButton(text: string, action: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'olcad-toolbar__button';
  button.dataset.action = action;
  button.textContent = text;
  return button;
}
