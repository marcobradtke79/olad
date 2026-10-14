import type { Editor } from '../../core/Editor';
import type { ImportResult, ImportTarget } from '../../core/import/applyImport';
import { IMPORT_FORMATS, type ImportPreview } from '../../core/import/readImport';

/** Fired on the element after an import; `detail` is the `ImportResult`. */
export const IMPORT_EVENT = 'olcad-import';

const ACCEPT = IMPORT_FORMATS.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(',');

const TYPE_LABELS: Record<string, string> = {
  Point: 'Points',
  MultiPoint: 'Multi-points',
  LineString: 'Lines',
  MultiLineString: 'Multi-lines',
  Polygon: 'Polygons',
  MultiPolygon: 'Multi-polygons',
};

/**
 * `<olcad-import-dialog>`: a modal dialog that reads a GeoJSON, TopoJSON, KML, GML or GPX file
 * (file input or drop), lists its groups (one geometry type each) and lets the user send each
 * to a new local layer, an existing layer that takes it, or nowhere; Import runs
 * `editor.import.apply` as one undo step and fires `olcad-import`. `open()` shows it, for
 * example from a host's File menu. Bind with `element.editor = editor`.
 */
export class OlcadImportDialog extends HTMLElement {
  private boundEditor: Editor | null = null;
  private offDestroy: (() => void) | null = null;
  private dialog: HTMLDialogElement | null = null;
  private preview: ImportPreview | null = null;
  private filename = '';
  private error = '';

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
    this.classList.add('olcad-import-dialog');
  }

  /** Show the dialog, empty, ready for a file. */
  open(): void {
    if (!this.boundEditor) return;
    this.preview = null;
    this.filename = '';
    this.error = '';
    if (!this.dialog) {
      this.dialog = document.createElement('dialog');
      this.dialog.className = 'olcad-import-dialog__dialog';
    }
    if (!this.dialog.isConnected) this.append(this.dialog);
    this.render();
    if (!this.dialog.open) {
      if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
      else this.dialog.setAttribute('open', '');
    }
  }

  close(): void {
    const dialog = this.dialog;
    if (!dialog?.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  /** Read a file (from the input or a drop) and show its groups. */
  async load(file: File): Promise<void> {
    this.loadText(await file.text(), file.name);
  }

  /** Show the groups of a file's text; errors are shown in the dialog. */
  loadText(text: string, filename: string): void {
    const editor = this.boundEditor;
    if (!editor) return;
    this.filename = filename;
    try {
      this.preview = editor.import.read(text, { filename });
      this.error = this.preview.groups.length === 0 ? 'The file holds no objects to import.' : '';
    } catch (e) {
      this.preview = null;
      this.error = e instanceof Error ? e.message : String(e);
    }
    this.render();
  }

  private render(): void {
    const dialog = this.dialog;
    const editor = this.boundEditor;
    if (!dialog || !editor) return;
    const form = document.createElement('form');
    form.className = 'olcad-import-dialog__form';
    form.noValidate = true;

    const heading = document.createElement('h2');
    heading.className = 'olcad-import-dialog__heading';
    heading.id = `olcad-import-dialog-${Math.random().toString(36).slice(2, 8)}`;
    heading.textContent = 'Import';
    dialog.setAttribute('aria-labelledby', heading.id);

    // File: input inside a drop zone.
    const drop = document.createElement('label');
    drop.className = 'olcad-import-dialog__drop';
    const input = document.createElement('input');
    input.type = 'file';
    input.name = 'file';
    input.accept = ACCEPT;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) void this.load(file);
    });
    const hint = document.createElement('span');
    hint.textContent = this.filename
      ? `File: ${this.filename}`
      : `Choose or drop a file: ${IMPORT_FORMATS.map((f) => f.label).join(', ')}`;
    drop.append(hint, input);
    drop.addEventListener('dragover', (event) => {
      event.preventDefault();
      drop.classList.add('olcad-import-dialog__drop--over');
    });
    drop.addEventListener('dragleave', () =>
      drop.classList.remove('olcad-import-dialog__drop--over'),
    );
    drop.addEventListener('drop', (event) => {
      event.preventDefault();
      drop.classList.remove('olcad-import-dialog__drop--over');
      const file = event.dataTransfer?.files[0];
      if (file) void this.load(file);
    });

    const error = document.createElement('p');
    error.className = 'olcad-import-dialog__error';
    error.setAttribute('role', 'alert');
    error.textContent = this.error;
    error.hidden = !this.error;

    form.append(heading, drop);

    const rows: { key: string; name: HTMLInputElement; target: HTMLSelectElement }[] = [];
    const preview = this.preview;
    if (preview && preview.groups.length > 0) {
      const format = IMPORT_FORMATS.find((f) => f.id === preview.format)!.label;
      const summary = document.createElement('p');
      summary.className = 'olcad-import-dialog__summary';
      const total = preview.groups.reduce((n, g) => n + g.features.length, 0);
      summary.textContent =
        `${format} in ${preview.dataProjection}: ${total} object${total === 1 ? '' : 's'}` +
        (preview.skipped ? `, ${preview.skipped} without usable geometry` : '');
      const table = document.createElement('table');
      table.className = 'olcad-import-dialog__groups';
      const head = table.createTHead().insertRow();
      for (const text of ['Layer name', 'Geometry', 'Objects', 'Import into']) {
        const th = document.createElement('th');
        th.textContent = text;
        head.append(th);
      }
      const body = table.createTBody();
      for (const group of preview.groups) {
        const row = body.insertRow();
        row.dataset.group = group.key;
        const name = document.createElement('input');
        name.className = 'olcad-import-dialog__control';
        name.value = group.name;
        name.setAttribute('aria-label', `Name of the new layer for ${group.name}`);
        const target = document.createElement('select');
        target.className = 'olcad-import-dialog__control';
        target.setAttribute('aria-label', `Target of ${group.name}`);
        target.append(new Option('New local layer', 'new'));
        for (const id of editor.import.targetsFor(group)) {
          target.append(new Option(`Into ${editor.layers.get(id).title}`, `layer:${id}`));
        }
        target.append(new Option('Skip', 'skip'));
        target.addEventListener('change', () => {
          name.disabled = target.value !== 'new';
          sync();
        });
        const count =
          `${group.features.length}` + (group.invalid ? ` (+${group.invalid} invalid)` : '');
        row.insertCell().append(name);
        row.insertCell().textContent = TYPE_LABELS[group.geometryType] ?? group.geometryType;
        row.insertCell().textContent = count;
        row.insertCell().append(target);
        rows.push({ key: group.key, name, target });
      }
      form.append(summary, table);
    }

    const actions = document.createElement('div');
    actions.className = 'olcad-import-dialog__actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'olcad-toolbar__button';
    cancel.dataset.action = 'cancel';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => this.close());
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'olcad-toolbar__button olcad-import-dialog__import';
    submit.dataset.action = 'import';
    submit.textContent = 'Import';
    actions.append(cancel, submit);
    const sync = () => {
      submit.disabled = !rows.some((r) => r.target.value !== 'skip');
    };
    sync();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!this.preview) return;
      const targets: Record<string, ImportTarget> = {};
      for (const { key, name, target } of rows) {
        targets[key] =
          target.value === 'new'
            ? { type: 'new', title: name.value }
            : target.value === 'skip'
              ? { type: 'skip' }
              : { type: 'layer', id: target.value.slice('layer:'.length) };
      }
      let result: ImportResult;
      try {
        result = editor.import.apply(this.preview, targets);
      } catch (e) {
        error.textContent = e instanceof Error ? e.message : String(e);
        error.hidden = false;
        return;
      }
      this.close();
      this.dispatchEvent(
        new CustomEvent<ImportResult>(IMPORT_EVENT, { detail: result, bubbles: true }),
      );
    });

    form.append(error, actions);
    dialog.replaceChildren(form);
  }
}
