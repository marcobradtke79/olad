import type { Editor } from '../../core/Editor';
import type { DimensionPreset, FieldConfig, FieldType } from '../../core/config/types';
import { LOCAL_GEOMETRY_TYPES, type LocalGeometryType } from '../../core/layers/local';
import { setIconButton } from './controls';

const FIELD_TYPES: FieldType[] = ['string', 'number', 'integer', 'boolean', 'enum', 'date'];

const GEOMETRY_LABELS: Record<LocalGeometryType, string> = {
  Point: 'Point',
  LineString: 'Line',
  Polygon: 'Polygon',
  MultiPoint: 'Multi-point',
  MultiLineString: 'Multi-line',
  MultiPolygon: 'Multi-polygon',
};

/** The extra geometry choice that creates a dimension layer (line objects drawn as dimensions). */
const DIMENSION_CHOICE = 'dimension';
const PRESET_LABELS: Record<DimensionPreset, string> = {
  architecture: 'Architecture (DIN 1356-1)',
  surveying: 'Surveying',
  landscape: 'Landscape',
};

/**
 * `<olcad-layer-editor>`: a modal dialog that creates a local layer (`editor.localLayers`) or
 * edits one: name, geometry type (fixed once created) and attributes (name, type, label,
 * required, enum values, default). For an existing layer it also deletes it, after a second
 * click. `open()` starts a new layer, `open(layerId)` edits a local layer. `<olcad-layer-list>`
 * creates one for its New layer and Layer settings buttons. Bind with `element.editor = editor`.
 */
export class OlcadLayerEditor extends HTMLElement {
  private boundEditor: Editor | null = null;
  private offDestroy: (() => void) | null = null;
  private dialog: HTMLDialogElement | null = null;
  /** Id of the edited layer, `null` while creating one. */
  private layerId: string | null = null;
  private confirmingDelete = false;

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

  /** Whether the dialog is open. */
  get isOpen(): boolean {
    return this.dialog?.open ?? false;
  }

  connectedCallback(): void {
    this.classList.add('olcad-layer-editor');
  }

  /** Open the dialog for a new layer, or for the local layer `layerId`. */
  open(layerId: string | null = null): void {
    const editor = this.boundEditor;
    if (!editor) return;
    if (layerId !== null && !editor.localLayers.has(layerId)) {
      throw new Error(`Unknown local layer "${layerId}"`);
    }
    this.layerId = layerId;
    this.confirmingDelete = false;
    const dialog = this.ensureDialog();
    this.render(dialog, editor);
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    dialog.querySelector<HTMLInputElement>('[name="title"]')?.focus();
  }

  close(): void {
    const dialog = this.dialog;
    if (!dialog?.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  private ensureDialog(): HTMLDialogElement {
    if (!this.dialog) {
      this.dialog = document.createElement('dialog');
      this.dialog.className = 'olcad-layer-editor__dialog';
    }
    if (!this.dialog.isConnected) this.append(this.dialog);
    return this.dialog;
  }

  private render(dialog: HTMLDialogElement, editor: Editor): void {
    const existing = this.layerId ? editor.localLayers.get(this.layerId) : null;
    const form = document.createElement('form');
    form.className = 'olcad-layer-editor__form';
    form.noValidate = true;

    const heading = document.createElement('h2');
    heading.className = 'olcad-layer-editor__heading';
    heading.id = `olcad-layer-editor-${Math.random().toString(36).slice(2, 8)}`;
    heading.textContent = existing ? `Layer settings: ${existing.title}` : 'New layer';
    dialog.setAttribute('aria-labelledby', heading.id);

    const title = document.createElement('input');
    title.name = 'title';
    title.className = 'olcad-layer-editor__control';
    title.required = true;
    title.value = existing?.title ?? '';
    title.placeholder = 'Layer name';

    const geometry = document.createElement('select');
    geometry.name = 'geometryType';
    geometry.className = 'olcad-layer-editor__control';
    for (const type of LOCAL_GEOMETRY_TYPES) {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = GEOMETRY_LABELS[type];
      geometry.append(option);
    }
    const dimensionOption = document.createElement('option');
    dimensionOption.value = DIMENSION_CHOICE;
    dimensionOption.textContent = 'Dimensions';
    geometry.append(dimensionOption);
    geometry.value = existing?.dimension ? DIMENSION_CHOICE : (existing?.geometryType ?? 'Polygon');
    geometry.disabled = existing !== null;

    // The drawing standard of a dimension layer, shown only for the Dimensions choice.
    const preset = document.createElement('select');
    preset.name = 'preset';
    preset.className = 'olcad-layer-editor__control';
    for (const [value, text] of Object.entries(PRESET_LABELS)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      preset.append(option);
    }
    const existingPreset =
      existing?.dimension && typeof existing.dimension === 'object'
        ? existing.dimension.preset
        : undefined;
    preset.value = existingPreset ?? 'surveying';
    preset.disabled = existing !== null;
    const presetLabel = labelled('Standard', preset);
    const showPreset = () => {
      presetLabel.hidden = geometry.value !== DIMENSION_CHOICE;
    };
    geometry.addEventListener('change', showPreset);
    showPreset();

    const basics = document.createElement('div');
    basics.className = 'olcad-layer-editor__basics';
    basics.append(labelled('Name', title), labelled('Geometry', geometry), presetLabel);

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'olcad-layer-editor__fields';
    const legend = document.createElement('legend');
    legend.textContent = 'Attributes';
    const rows = document.createElement('div');
    rows.className = 'olcad-layer-editor__rows';
    const head = document.createElement('div');
    head.className = 'olcad-layer-editor__row olcad-layer-editor__row--head';
    head.setAttribute('aria-hidden', 'true');
    for (const text of ['Name', 'Type', 'Label', 'Required', 'Values (enum)', 'Default', ''])
      head.append(Object.assign(document.createElement('span'), { textContent: text }));
    rows.append(head);
    for (const field of existing?.fields ?? []) rows.append(fieldRow(field));
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'olcad-toolbar__button olcad-layer-editor__add';
    add.textContent = 'Add attribute';
    add.addEventListener('click', () => {
      const row = fieldRow(null);
      rows.append(row);
      row.querySelector<HTMLInputElement>('[data-part="name"]')?.focus();
    });
    fieldset.append(legend, rows, add);

    const error = document.createElement('p');
    error.className = 'olcad-layer-editor__error';
    error.setAttribute('role', 'alert');
    error.hidden = true;

    const actions = document.createElement('div');
    actions.className = 'olcad-layer-editor__actions';
    if (existing) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'olcad-toolbar__button olcad-layer-editor__delete';
      remove.dataset.action = 'delete';
      remove.textContent = 'Delete layer';
      remove.addEventListener('click', () => {
        if (!this.confirmingDelete) {
          this.confirmingDelete = true;
          remove.textContent = `Delete ${existing.featureCount} object${existing.featureCount === 1 ? '' : 's'} and the layer?`;
          remove.classList.add('olcad-layer-editor__delete--confirm');
          return;
        }
        editor.localLayers.remove(existing.id);
        this.close();
      });
      actions.append(remove);
    }
    const spacer = document.createElement('span');
    spacer.className = 'olcad-layer-editor__spacer';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'olcad-toolbar__button';
    cancel.dataset.action = 'cancel';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => this.close());
    const save = document.createElement('button');
    save.type = 'submit';
    save.className = 'olcad-toolbar__button olcad-layer-editor__save';
    save.dataset.action = 'save';
    save.textContent = existing ? 'Save' : 'Create layer';
    actions.append(spacer, cancel, save);

    form.append(heading, basics, fieldset, error, actions);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        const { fields, renamed } = readFields(rows);
        if (existing) {
          editor.localLayers.rename(existing.id, title.value);
          editor.localLayers.setFields(existing.id, fields, { renamed });
        } else {
          const dimension = geometry.value === DIMENSION_CHOICE;
          editor.localLayers.create({
            title: title.value,
            geometryType: dimension ? 'LineString' : (geometry.value as LocalGeometryType),
            fields,
            ...(dimension ? { dimension: { preset: preset.value as DimensionPreset } } : {}),
          });
        }
        this.close();
      } catch (e) {
        error.textContent = describe(e);
        error.hidden = false;
      }
    });
    dialog.replaceChildren(form);
  }
}

function labelled(text: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'olcad-layer-editor__label';
  const span = document.createElement('span');
  span.textContent = text;
  label.append(span, control);
  return label;
}

/** One attribute row; `data-original` keeps the stored name so a rename moves the values. */
function fieldRow(field: FieldConfig | null): HTMLElement {
  const row = document.createElement('div');
  row.className = 'olcad-layer-editor__row';
  if (field) row.dataset.original = field.name;
  const input = (part: string, label: string, value = '') => {
    const el = document.createElement('input');
    el.className = 'olcad-layer-editor__control';
    el.dataset.part = part;
    el.setAttribute('aria-label', label);
    el.value = value;
    return el;
  };
  const name = input('name', 'Attribute name', field?.name ?? '');
  const type = document.createElement('select');
  type.className = 'olcad-layer-editor__control';
  type.dataset.part = 'type';
  type.setAttribute('aria-label', 'Attribute type');
  for (const t of FIELD_TYPES) type.append(new Option(t, t));
  type.value = field?.type ?? 'string';
  const label = input('label', 'Attribute label', field?.label ?? '');
  const required = document.createElement('input');
  required.type = 'checkbox';
  required.className = 'olcad-layer-editor__control';
  required.dataset.part = 'required';
  required.setAttribute('aria-label', 'Required');
  required.checked = field?.required ?? false;
  const values = input('values', 'Enum values, comma-separated', (field?.values ?? []).join(', '));
  const def = input(
    'default',
    'Default value',
    field?.default === undefined || field.default === null ? '' : String(field.default),
  );
  const sync = () => {
    values.disabled = type.value !== 'enum';
    def.disabled = type.value === 'boolean';
  };
  type.addEventListener('change', sync);
  sync();
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'olcad-layer-editor__remove';
  remove.dataset.action = 'remove-field';
  setIconButton(remove, 'delete', 'Remove attribute');
  remove.addEventListener('click', () => row.remove());
  row.append(name, type, label, required, values, def, remove);
  return row;
}

/** The fields of the rows, plus old → new names of renamed stored fields. */
function readFields(rows: HTMLElement): {
  fields: FieldConfig[];
  renamed: Record<string, string>;
} {
  const fields: FieldConfig[] = [];
  const renamed: Record<string, string> = {};
  rows
    .querySelectorAll<HTMLElement>('.olcad-layer-editor__row:not(.olcad-layer-editor__row--head)')
    .forEach((row) => {
      const part = <T extends HTMLElement>(name: string) =>
        row.querySelector<T>(`[data-part="${name}"]`)!;
      const name = part<HTMLInputElement>('name').value.trim();
      const type = part<HTMLSelectElement>('type').value as FieldType;
      if (!name) {
        if (!row.dataset.original) return; // an untouched new row
      }
      const field: FieldConfig = { name, type };
      const label = part<HTMLInputElement>('label').value.trim();
      if (label) field.label = label;
      if (part<HTMLInputElement>('required').checked) field.required = true;
      if (type === 'enum') {
        field.values = part<HTMLInputElement>('values')
          .value.split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      }
      const raw = part<HTMLInputElement>('default').value.trim();
      if (raw && type !== 'boolean') {
        if (type === 'number' || type === 'integer') {
          const n = Number(raw);
          if (!Number.isFinite(n) || (type === 'integer' && !Number.isInteger(n))) {
            throw new Error(
              `Attribute "${name}": the default must be ${type === 'integer' ? 'an integer' : 'a number'}`,
            );
          }
          field.default = n;
        } else {
          field.default = raw;
        }
      }
      if (row.dataset.original && row.dataset.original !== name)
        renamed[row.dataset.original] = name;
      fields.push(field);
    });
  return { fields, renamed };
}

/** A readable message for a validation error (`ConfigError` names a path like `definition.fields[1].name`). */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const match = /^Invalid config at ([^:]+): (.*)$/.exec(error.message);
  if (!match) return error.message;
  const [, path, message] = match;
  const field = /fields\[(\d+)\]\.(\w+)/.exec(path!);
  if (field) return `Attribute ${Number(field[1]) + 1}, ${field[2]}: ${message}`;
  if (path!.endsWith('.title')) return `Name: ${message}`;
  return `${path}: ${message}`;
}
