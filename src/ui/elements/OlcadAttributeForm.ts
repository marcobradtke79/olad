import type Feature from 'ol/Feature';
import { layerFormFields } from '../../core/dimensions/form';
import { updateProperties } from '../../core/changes/commands';
import type { FieldConfig } from '../../core/config/types';
import type { Editor } from '../../core/Editor';

/**
 * `<olcad-attribute-form>`: a form generated from the layer schema for the single selected
 * feature. Apply submits the changed values as one `updateProperties` command; Reset re-reads
 * the feature. Read-only fields, layers without `update` and edit mode off disable the inputs.
 * With the `popup` attribute the form lives in a modal dialog that opens whenever a command
 * inserts a feature (`featureinsert`) into a layer that has attributes. Several inserts (a
 * mirrored or split group) are shown one after another ("1 of 3"): Save or Later moves on to
 * the next, Escape closes the dialog for all of them.
 * Bind with `element.editor = editor`.
 */
export class OlcadAttributeForm extends HTMLElement {
  private boundEditor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];
  private subject: Feature | null = null;
  private error: string | null = null;
  /** Popup mode: the inserted features still to show; the dialog shows the first. */
  private popupQueue: Feature[] = [];
  /** Popup mode: how many features the current batch had, for the "1 of 3" progress. */
  private popupTotal = 0;
  private dialog: HTMLDialogElement | null = null;

  get popup(): boolean {
    return this.hasAttribute('popup');
  }

  set popup(value: boolean) {
    this.toggleAttribute('popup', Boolean(value));
  }

  /**
   * `reveal`: a single selection outside edit mode, or a move of draft objects into a layer
   * (`draftmove`), opens the flyout panel the form sits in.
   */
  get reveal(): boolean {
    return this.hasAttribute('reveal');
  }

  set reveal(value: boolean) {
    this.toggleAttribute('reveal', Boolean(value));
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
        editor.on('selectionchange', ({ features }) => {
          this.error = null;
          this.render(true);
          if (this.reveal && !this.popup && features.length === 1 && !editor.isEditMode()) {
            this.revealPanel();
          }
        }),
        editor.on('change', rerender),
        editor.on('draftmove', () => {
          // The moved objects are selected: show their new layer's fields, ready to type.
          if (this.popup) return;
          this.render(true);
          if (this.reveal) this.revealPanel();
          if (!this.ownerDocument.querySelector('dialog[open]')) {
            this.querySelector<HTMLElement>(
              'input:not([disabled]), select:not([disabled])',
            )?.focus();
          }
        }),
        editor.on('featureinsert', ({ layer, feature, template, imported }) => {
          // Copies from a template and imported objects carry their attributes: no popup.
          if (!this.popup || template !== undefined || imported) return;
          // Nothing to capture on a layer without attributes (the draft layer): no dialog.
          // Dimension tools ask for the field value themselves.
          const config = editor.layers.getConfig(layer);
          if (config.dimension || (config.schema?.fields ?? []).length === 0) return;
          if (this.popupQueue.includes(feature)) return;
          this.popupQueue.push(feature);
          this.popupTotal++;
          if (this.popupQueue.length > 1) {
            this.render(true); // the progress changes; the form keeps showing the first
            return;
          }
          this.error = null;
          this.render(true);
        }),
        editor.on('layerchange', rerender),
        editor.on('editmodechange', rerender),
        editor.on('validationerror', ({ message, command }) => {
          if (command.type === 'updateProperties' && command.feature === this.subject) {
            this.error = message;
            this.render(true);
          }
        }),
        editor.on('destroy', () => {
          this.editor = null;
        }),
      );
    }
    this.render(true);
  }

  connectedCallback(): void {
    this.classList.add('olcad-attribute-form');
    this.render(true);
  }

  disconnectedCallback(): void {
    this.unbind();
  }

  private unbind(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
  }

  /** Open the enclosing `<olcad-panel flyout>`, if any. Never closes it. */
  private revealPanel(): void {
    const panel = this.closest('olcad-panel') as
      (HTMLElement & { isFlyout?: boolean; toggleFlyout?: (open?: boolean) => void }) | null;
    if (panel?.isFlyout && !panel.hasAttribute('open')) panel.toggleFlyout?.(true);
  }

  /**
   * The feature's layer and schema, or `null` when the selection is not exactly one feature.
   * In popup mode the subject is the feature the dialog was opened for.
   */
  private currentSubject(): { feature: Feature; layer: string } | null {
    const editor = this.boundEditor;
    if (!editor) return null;
    let feature: Feature | undefined;
    if (this.popup) {
      // Features removed meanwhile (undo, discard) are skipped.
      while (this.popupQueue.length > 0 && !editor.layers.layerOf(this.popupQueue[0]!)) {
        this.popupQueue.shift();
      }
      if (this.popupQueue.length === 0) this.popupTotal = 0;
      feature = this.popupQueue[0];
    } else {
      const selected = editor.selection.get();
      if (selected.length === 1) feature = selected[0];
    }
    if (!feature) return null;
    const layer = editor.layers.layerOf(feature);
    if (layer === undefined) {
      return null;
    }
    return { feature, layer };
  }

  /** Popup mode: done with the shown feature; show the next one or close the dialog. */
  closePopup(): void {
    this.popupQueue.shift();
    if (this.popupQueue.length === 0) this.popupTotal = 0;
    this.error = null;
    this.render(true);
  }

  /** Popup mode: close the dialog and forget every feature still waiting. */
  closeAll(): void {
    this.popupQueue = [];
    this.popupTotal = 0;
    this.error = null;
    this.render(true);
  }

  /**
   * Re-render. Unless `force` is set, a form the user is typing in is kept so an external
   * change (another user action, an undo) does not wipe the draft.
   */
  private render(force = false): void {
    const current = this.currentSubject();
    const sameSubject = current?.feature === this.subject;
    if (!force && sameSubject && this.contains(document.activeElement)) return;
    this.subject = current?.feature ?? null;
    const editor = this.boundEditor;
    if (this.popup) {
      // The dialog stays attached: removing an open <dialog> from the document closes it.
      const dialog = this.ensureDialog();
      dialog.replaceChildren();
      if (!editor || !current) {
        if (dialog.open) closeDialog(dialog);
        return;
      }
      this.renderInto(dialog, editor, current.feature, current.layer);
      if (!dialog.open) openDialog(dialog);
      // Re-rendering replaces the controls; keep the focus on the first input.
      if (!dialog.contains(document.activeElement)) {
        dialog.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled])')?.focus();
      }
      return;
    }
    this.replaceChildren();
    if (!editor || !current) {
      this.append(hint(editor ? 'Select one feature to edit its attributes.' : ''));
      return;
    }
    this.renderInto(this, editor, current.feature, current.layer);
  }

  private ensureDialog(): HTMLDialogElement {
    if (!this.dialog) {
      this.dialog = document.createElement('dialog');
      this.dialog.className = 'olcad-attribute-form__dialog';
      // Closed by the browser (Escape, light dismiss): forget every waiting feature without
      // re-rendering.
      this.dialog.addEventListener('close', () => {
        this.popupQueue = [];
        this.popupTotal = 0;
      });
    }
    if (!this.dialog.isConnected) this.append(this.dialog);
    return this.dialog;
  }

  private renderInto(target: HTMLElement, editor: Editor, feature: Feature, layer: string): void {
    const config = editor.layers.getConfig(layer);
    const info = editor.layers.get(layer);
    const title = document.createElement('div');
    title.className = 'olcad-attribute-form__title';
    title.textContent = `${info.title} #${String(feature.getId() ?? '?')}`;
    if (this.popup && this.popupTotal > 1) {
      const progress = document.createElement('span');
      progress.className = 'olcad-attribute-form__progress';
      progress.textContent = `${this.popupTotal - this.popupQueue.length + 1} of ${this.popupTotal}`;
      title.append(' ', progress);
    }
    target.append(title);
    if (layer === editor.layers.getDraft()) {
      target.append(
        hint('A draft object. Move it to a layer in the Layers panel to add its attributes.'),
      );
      return;
    }
    const fields = layerFormFields(config);
    if (fields.length === 0) {
      target.append(hint(`No attributes configured for ${info.title}.`));
      if (this.popup) target.append(this.laterButton('Close'));
      return;
    }
    const editable = editor.isEditMode() && editor.canEdit('update', feature);
    const form = document.createElement('form');
    form.className = 'olcad-attribute-form__form';
    form.noValidate = false;
    for (const field of fields) form.append(this.renderField(field, feature, editable));
    const actions = document.createElement('div');
    actions.className = 'olcad-attribute-form__actions';
    const apply = document.createElement('button');
    apply.type = 'submit';
    apply.className = 'olcad-toolbar__button olcad-attribute-form__apply';
    apply.textContent = this.popup ? 'Save' : 'Apply';
    apply.disabled = !editable;
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'olcad-toolbar__button olcad-attribute-form__reset';
    reset.textContent = 'Reset';
    reset.addEventListener('click', () => {
      this.error = null;
      this.render(true);
    });
    actions.append(apply, reset);
    if (this.popup) actions.append(this.laterButton('Later'));
    form.append(actions);
    if (!editable) {
      form.append(
        hint(
          editor.isEditMode()
            ? `${info.title} does not allow updates.`
            : 'Switch on edit mode to change attributes.',
        ),
      );
    }
    if (this.error) {
      const error = document.createElement('div');
      error.className = 'olcad-attribute-form__error';
      error.setAttribute('role', 'alert');
      error.textContent = this.error;
      form.append(error);
    }
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      this.apply(form, fields, feature);
    });
    target.append(form);
  }

  /** Popup mode: done with this feature (it keeps its attributes); shows the next or closes. */
  private laterButton(text: string): HTMLButtonElement {
    const later = document.createElement('button');
    later.type = 'button';
    later.className = 'olcad-toolbar__button olcad-attribute-form__later';
    later.textContent = text;
    later.addEventListener('click', () => this.closePopup());
    return later;
  }

  private renderField(field: FieldConfig, feature: Feature, editable: boolean): HTMLElement {
    const row = document.createElement('label');
    row.className = 'olcad-attribute-form__field';
    row.dataset.field = field.name;
    const text = document.createElement('span');
    text.className = 'olcad-attribute-form__label';
    text.textContent = (field.label ?? field.name) + (field.required ? ' *' : '');
    const control = createControl(field, feature.get(field.name));
    control.name = field.name;
    control.disabled = !editable || field.readOnly === true;
    if (field.required) control.required = true;
    row.append(text, control);
    return row;
  }

  private apply(form: HTMLFormElement, fields: FieldConfig[], feature: Feature): void {
    const editor = this.boundEditor;
    if (!editor) return;
    const changes: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.readOnly) continue;
      const control = form.elements.namedItem(field.name) as HTMLInputElement | HTMLSelectElement;
      const value = readControl(field, control);
      const before = feature.get(field.name) as unknown;
      // An unchecked box on a feature without the property is not a change.
      if (
        field.type === 'boolean' &&
        value === false &&
        (before === undefined || before === null)
      ) {
        continue;
      }
      if (!sameValue(before, value)) changes[field.name] = value;
    }
    this.error = null;
    const accepted =
      Object.keys(changes).length === 0 || editor.execute(updateProperties(feature, changes));
    if (accepted && this.popup) {
      this.closePopup();
      return;
    }
    this.render(true);
  }
}

/** jsdom has no dialog implementation; fall back to the `open` attribute there. */
function openDialog(dialog: HTMLDialogElement): void {
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeDialog(dialog: HTMLDialogElement): void {
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

function hint(text: string): HTMLElement {
  const el = document.createElement('p');
  el.className = 'olcad-attribute-form__hint';
  el.textContent = text;
  return el;
}

/** The input or select for a field, pre-filled with `value`. */
export function createControl(
  field: FieldConfig,
  value: unknown,
): HTMLInputElement | HTMLSelectElement {
  if (field.type === 'enum') {
    const select = document.createElement('select');
    select.className = 'olcad-attribute-form__control';
    if (!field.required) select.append(new Option('', ''));
    for (const option of field.values ?? [])
      select.append(new Option(String(option), String(option)));
    select.value = value === undefined || value === null ? '' : String(value);
    return select;
  }
  const input = document.createElement('input');
  input.className = 'olcad-attribute-form__control';
  switch (field.type) {
    case 'boolean':
      input.type = 'checkbox';
      input.checked = value === true;
      break;
    case 'number':
    case 'integer':
      input.type = 'number';
      input.step = field.type === 'integer' ? '1' : 'any';
      if (field.min !== undefined) input.min = String(field.min);
      if (field.max !== undefined) input.max = String(field.max);
      input.value = value === undefined || value === null ? '' : String(value);
      break;
    case 'date':
      input.type = 'date';
      input.value = typeof value === 'string' ? value.slice(0, 10) : '';
      break;
    default:
      input.type = 'text';
      if (field.pattern) input.pattern = field.pattern;
      input.value = value === undefined || value === null ? '' : String(value);
  }
  return input;
}

/** The typed value of a control; empty inputs yield `undefined` (the property is removed). */
export function readControl(
  field: FieldConfig,
  control: HTMLInputElement | HTMLSelectElement,
): unknown {
  if (field.type === 'boolean') return (control as HTMLInputElement).checked;
  const raw = control.value;
  if (raw === '') return undefined;
  if (field.type === 'number' || field.type === 'integer') return Number(raw);
  if (field.type === 'enum') {
    const match = (field.values ?? []).find((v) => String(v) === raw);
    return match ?? raw;
  }
  return raw;
}

function sameValue(a: unknown, b: unknown): boolean {
  const na = a === null || a === undefined;
  const nb = b === null || b === undefined;
  if (na || nb) return na && nb;
  return a === b;
}
