import type { Editor } from '../../core/Editor';
import type { GeometryType } from '../../core/config/types';
import { styleSections, type LayerStyle, type StrokeDash } from '../../core/layers/style';
import { setIconButton } from './controls';

/**
 * `<olcad-layer-style-dialog>`: a modal dialog for the look of the layers. Left the overlays
 * and layers in their shared drawing order (top of the list = drawn on top), reordered by drag
 * and drop or the Up / Down buttons (`editor.layers.moveLayer`); right the style of the selected
 * layer — stroke, fill, points, label, text colours, opacity, zoom range; opacity and zoom range
 * only for an overlay — applied live with `editor.layers.setStyle`. Reset layer and Reset all return to the configured styles and
 * order. `open(layerId?)` shows it. Bind with `element.editor = editor`.
 */
export class OlcadLayerStyleDialog extends HTMLElement {
  private boundEditor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];
  private dialog: HTMLDialogElement | null = null;
  private selected: string | null = null;
  /** Set while the dialog itself applies a style, so the form is not rebuilt under the pointer. */
  private applying = false;
  private dragged: string | null = null;
  private readonly list = document.createElement('ol');
  private readonly form = document.createElement('form');
  private readonly error = document.createElement('p');

  get editor(): Editor | null {
    return this.boundEditor;
  }

  set editor(editor: Editor | null) {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
    this.boundEditor = editor;
    if (!editor) {
      this.close();
      return;
    }
    this.unsubscribe.push(
      editor.on('layerchange', ({ type }) => {
        if (!this.isOpen) return;
        if (type === 'style' && this.applying) return;
        this.render();
      }),
      editor.on('overlaychange', ({ type }) => {
        if (!this.isOpen) return;
        if (type === 'style' && this.applying) return;
        this.render();
      }),
      editor.on('destroy', () => {
        this.editor = null;
      }),
    );
  }

  get isOpen(): boolean {
    return this.dialog?.open ?? false;
  }

  connectedCallback(): void {
    this.classList.add('olcad-layer-style-dialog');
  }

  /** Show the dialog, with `layerId` (else the first layer on top) selected. */
  open(layerId?: string): void {
    const editor = this.boundEditor;
    if (!editor) return;
    if (!this.dialog) this.build();
    const ids = editor.layers.getOrder();
    this.selected = layerId && ids.includes(layerId) ? layerId : (ids[ids.length - 1] ?? null);
    if (!this.dialog!.isConnected) this.append(this.dialog!);
    this.render();
    if (!this.dialog!.open) {
      if (typeof this.dialog!.showModal === 'function') this.dialog!.showModal();
      else this.dialog!.setAttribute('open', '');
    }
  }

  close(): void {
    const dialog = this.dialog;
    if (!dialog?.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  private build(): void {
    const dialog = document.createElement('dialog');
    dialog.className = 'olcad-layer-style-dialog__dialog';
    const heading = document.createElement('h2');
    heading.className = 'olcad-layer-style-dialog__heading';
    heading.id = `olcad-layer-style-${Math.random().toString(36).slice(2, 8)}`;
    heading.textContent = 'Layer styles';
    dialog.setAttribute('aria-labelledby', heading.id);

    const hint = document.createElement('p');
    hint.className = 'olcad-layer-style-dialog__hint';
    hint.textContent =
      'Top of the list is drawn on top. Drag a layer or use the arrows to reorder.';
    this.list.className = 'olcad-layer-style-dialog__layers';
    this.list.setAttribute('aria-label', 'Layers in drawing order, top first');
    const side = document.createElement('div');
    side.className = 'olcad-layer-style-dialog__side';
    side.append(hint, this.list);

    this.form.className = 'olcad-layer-style-dialog__form';
    this.form.noValidate = true;
    this.form.addEventListener('submit', (event) => event.preventDefault());
    const body = document.createElement('div');
    body.className = 'olcad-layer-style-dialog__body';
    body.append(side, this.form);

    this.error.className = 'olcad-layer-style-dialog__error';
    this.error.setAttribute('role', 'alert');
    this.error.hidden = true;

    const actions = document.createElement('div');
    actions.className = 'olcad-layer-style-dialog__actions';
    const button = (text: string, action: string, onClick: () => void) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'olcad-toolbar__button';
      el.dataset.action = action;
      el.textContent = text;
      el.addEventListener('click', onClick);
      return el;
    };
    const spacer = document.createElement('span');
    spacer.className = 'olcad-layer-style-dialog__spacer';
    actions.append(
      button('Reset layer', 'reset-layer', () => {
        if (this.selected) this.boundEditor?.layers.resetStyle(this.selected);
      }),
      button('Reset all', 'reset-all', () => this.boundEditor?.layers.resetStyles()),
      spacer,
      button('Close', 'close', () => this.close()),
    );
    dialog.append(heading, body, this.error, actions);
    this.dialog = dialog;
  }

  private render(): void {
    this.renderList();
    this.renderForm();
  }

  private renderList(): void {
    const editor = this.boundEditor;
    if (!editor) return;
    const focused = this.ownerDocument.activeElement as HTMLElement | null;
    const focus =
      focused && this.list.contains(focused)
        ? {
            id: focused.closest<HTMLElement>('[data-layer-id]')?.dataset.layerId,
            action: focused.dataset.action,
          }
        : null;
    // Top of the list is drawn on top: the reverse of the shared drawing order.
    const layers = editor.layers
      .getOrder()
      .slice()
      .reverse()
      .map((id) => {
        const overlay = editor.overlays?.has(id) ? editor.overlays.get(id) : null;
        return { id, title: overlay ? overlay.title : editor.layers.get(id).title, overlay };
      });
    if (!layers.some((l) => l.id === this.selected)) this.selected = layers[0]?.id ?? null;
    this.list.replaceChildren(
      ...layers.map((layer, i) => {
        const item = document.createElement('li');
        item.className = 'olcad-layer-style-dialog__layer';
        item.dataset.layerId = layer.id;
        item.dataset.kind = layer.overlay ? 'overlay' : 'layer';
        item.draggable = true;
        item.setAttribute('aria-selected', String(layer.id === this.selected));
        const grip = document.createElement('span');
        grip.className = 'olcad-layer-style-dialog__grip';
        grip.setAttribute('aria-hidden', 'true');
        grip.textContent = '⠿';
        const name = document.createElement('button');
        name.type = 'button';
        name.className = 'olcad-layer-style-dialog__name';
        name.dataset.action = 'select';
        name.textContent = layer.title;
        if (editor.layers.isStyleCustomized(layer.id))
          name.classList.add('olcad-layer-style-dialog__name--custom');
        name.addEventListener('click', () => {
          this.selected = layer.id;
          this.render();
        });
        const up = document.createElement('button');
        up.type = 'button';
        up.dataset.action = 'up';
        setIconButton(up, 'arrowUp', `Move ${layer.title} up`, 'Draw above the layer before it');
        up.disabled = i === 0;
        up.addEventListener('click', () => this.move(layer.id, +1));
        const down = document.createElement('button');
        down.type = 'button';
        down.dataset.action = 'down';
        setIconButton(
          down,
          'arrowDown',
          `Move ${layer.title} down`,
          'Draw below the layer after it',
        );
        down.disabled = i === layers.length - 1;
        down.addEventListener('click', () => this.move(layer.id, -1));
        item.addEventListener('dragstart', (event) => {
          this.dragged = layer.id;
          event.dataTransfer?.setData('text/plain', layer.id);
          item.classList.add('olcad-layer-style-dialog__layer--dragging');
        });
        item.addEventListener('dragend', () => {
          this.dragged = null;
          item.classList.remove('olcad-layer-style-dialog__layer--dragging');
        });
        item.addEventListener('dragover', (event) => {
          if (this.dragged && this.dragged !== layer.id) event.preventDefault();
        });
        item.addEventListener('drop', (event) => {
          event.preventDefault();
          if (this.dragged) this.dropAbove(this.dragged, layer.id);
        });
        item.append(grip, name, up, down);
        return item;
      }),
    );
    if (focus?.id) {
      const item = Array.from(this.list.querySelectorAll<HTMLElement>('[data-layer-id]')).find(
        (el) => el.dataset.layerId === focus.id,
      );
      const target = item?.querySelector<HTMLButtonElement>(`[data-action="${focus.action}"]`);
      (target && !target.disabled
        ? target
        : item?.querySelector<HTMLElement>('[data-action="select"]')
      )?.focus();
    }
  }

  /** One step up (+1, drawn higher) or down (-1) in the drawing order. */
  private move(id: string, step: number): void {
    const editor = this.boundEditor;
    if (!editor) return;
    const ids = editor.layers.getOrder();
    editor.layers.moveLayer(id, ids.indexOf(id) + step);
  }

  /** Drop `id` onto `target` in the list: drawn right above it. */
  private dropAbove(id: string, target: string): void {
    const editor = this.boundEditor;
    if (!editor) return;
    const rest = editor.layers.getOrder().filter((other) => other !== id);
    editor.layers.moveLayer(id, rest.indexOf(target) + 1);
  }

  private renderForm(): void {
    const editor = this.boundEditor;
    const id = this.selected;
    this.error.hidden = true;
    if (!editor || !id) {
      this.form.replaceChildren();
      return;
    }
    if (editor.overlays?.has(id)) {
      // An overlay is drawn by its server: opacity and zoom range are all a user can change.
      const style = editor.layers.getStyle(id);
      const title = document.createElement('h3');
      title.className = 'olcad-layer-style-dialog__title';
      title.textContent = editor.overlays.get(id).title;
      const note = document.createElement('p');
      note.className = 'olcad-layer-style-dialog__note';
      note.textContent = 'Overlay: the server draws it. Opacity and zoom range can be changed.';
      const apply = () => this.apply(id);
      this.form.replaceChildren(
        title,
        note,
        section('Layer', [
          field('Opacity', rangeInput('opacity', style.opacity, apply)),
          field('From zoom', optionalNumberInput('min-zoom', style.minZoom, apply)),
          field('To zoom', optionalNumberInput('max-zoom', style.maxZoom, apply)),
        ]),
      );
      return;
    }
    const info = editor.layers.get(id);
    const config = editor.layers.getConfig(id);
    const style = editor.layers.getStyle(id);
    const sections = styleSections(info.geometryType as GeometryType);
    const parts: HTMLElement[] = [];

    const title = document.createElement('h3');
    title.className = 'olcad-layer-style-dialog__title';
    title.textContent = info.title;
    parts.push(title);
    if (editor.layers.hasExpressionStyle(id) && !editor.layers.isStyleCustomized(id)) {
      const note = document.createElement('p');
      note.className = 'olcad-layer-style-dialog__note';
      note.textContent =
        'This layer has a computed style; a change here replaces it with a simple style.';
      parts.push(note);
    }

    const apply = () => this.apply(id);
    if (sections.stroke && style.stroke) {
      parts.push(
        section('Line', [
          field('Colour', colorInput('stroke-color', style.stroke.color, apply)),
          field('Width', numberInput('stroke-width', style.stroke.width, 0, 50, 0.5, apply)),
          field(
            'Pattern',
            selectInput(
              'stroke-dash',
              style.stroke.dash,
              [
                ['solid', 'Solid'],
                ['dashed', 'Dashed'],
                ['dotted', 'Dotted'],
              ],
              apply,
            ),
          ),
        ]),
      );
    }
    if (sections.fill && style.fill) {
      parts.push(
        section('Fill', [
          field('Colour', colorInput('fill-color', style.fill.color, apply)),
          field('Opacity', rangeInput('fill-opacity', style.fill.opacity, apply)),
        ]),
      );
    }
    if (sections.point && style.point) {
      parts.push(
        section('Points', [
          field('Radius', numberInput('point-radius', style.point.radius, 0, 100, 0.5, apply)),
          field('Fill', colorInput('point-fill', style.point.fill, apply)),
          field('Outline', colorInput('point-stroke', style.point.strokeColor, apply)),
          field(
            'Outline width',
            numberInput('point-stroke-width', style.point.strokeWidth, 0, 50, 0.5, apply),
          ),
        ]),
      );
    }
    if (style.text) {
      parts.push(
        section('Texts', [
          field('Colour', colorInput('text-color', style.text.color, apply)),
          field('Halo', colorInput('text-halo', style.text.halo, apply)),
        ]),
      );
    }
    const label = style.label ?? null;
    const fields = config.schema?.fields.map((f) => f.name) ?? [];
    const labelField = fields.length
      ? selectInput(
          'label-field',
          label?.field ?? '',
          [['', 'None'], ...fields.map((f): [string, string] => [f, f])],
          apply,
        )
      : textInput('label-field', label?.field ?? '', 'Attribute name, empty for none', apply);
    parts.push(
      section('Label', [
        field('Attribute', labelField),
        field('Size', numberInput('label-size', label?.size ?? 12, 4, 96, 1, apply)),
        field('Colour', colorInput('label-color', label?.color ?? '#111827', apply)),
        field('Halo', colorInput('label-halo', label?.halo ?? '#ffffff', apply)),
      ]),
    );
    parts.push(
      section('Layer', [
        field('Opacity', rangeInput('opacity', style.opacity, apply)),
        field('From zoom', optionalNumberInput('min-zoom', style.minZoom, apply)),
        field('To zoom', optionalNumberInput('max-zoom', style.maxZoom, apply)),
      ]),
    );
    this.form.replaceChildren(...parts);
  }

  /** Read the form and apply it to layer `id`. */
  private apply(id: string): void {
    const editor = this.boundEditor;
    if (!editor) return;
    const value = (name: string) =>
      this.form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value;
    const number = (name: string) => Number(value(name));
    const current = editor.layers.getStyle(id);
    const style: LayerStyle = { opacity: number('opacity') };
    const overlay = editor.overlays?.has(id) ?? false;
    if (!overlay && value('stroke-color') !== undefined) {
      style.stroke = {
        color: value('stroke-color')!,
        width: number('stroke-width'),
        dash: value('stroke-dash') as StrokeDash,
      };
    }
    if (!overlay && value('fill-color') !== undefined) {
      style.fill = { color: value('fill-color')!, opacity: number('fill-opacity') };
    }
    if (!overlay && value('point-radius') !== undefined) {
      style.point = {
        radius: number('point-radius'),
        fill: value('point-fill')!,
        strokeColor: value('point-stroke')!,
        strokeWidth: number('point-stroke-width'),
      };
    }
    if (!overlay) {
      if (current.text) style.text = { color: value('text-color')!, halo: value('text-halo')! };
      const labelField = value('label-field')?.trim();
      style.label = labelField
        ? {
            field: labelField,
            size: number('label-size'),
            color: value('label-color')!,
            halo: value('label-halo')!,
          }
        : null;
    }
    const minZoom = value('min-zoom');
    const maxZoom = value('max-zoom');
    if (minZoom) style.minZoom = Number(minZoom);
    if (maxZoom) style.maxZoom = Number(maxZoom);
    this.applying = true;
    try {
      editor.layers.setStyle(id, style);
      this.error.hidden = true;
      this.renderList(); // the customized marker
    } catch (e) {
      this.error.textContent = e instanceof Error ? e.message : String(e);
      this.error.hidden = false;
    } finally {
      this.applying = false;
    }
  }
}

function section(legendText: string, children: HTMLElement[]): HTMLFieldSetElement {
  const set = document.createElement('fieldset');
  set.className = 'olcad-layer-style-dialog__section';
  const legend = document.createElement('legend');
  legend.textContent = legendText;
  set.append(legend, ...children);
  return set;
}

function field(text: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'olcad-layer-style-dialog__field';
  const span = document.createElement('span');
  span.textContent = text;
  label.append(span, control);
  return label;
}

function input(type: string, name: string, value: string, onChange: () => void): HTMLInputElement {
  const el = document.createElement('input');
  el.type = type;
  el.name = name;
  el.className = 'olcad-layer-style-dialog__control';
  el.value = value;
  el.addEventListener(type === 'text' || type === 'number' ? 'change' : 'input', onChange);
  return el;
}

function colorInput(name: string, value: string, onChange: () => void): HTMLInputElement {
  return input('color', name, value, onChange);
}

function numberInput(
  name: string,
  value: number,
  min: number,
  max: number,
  step: number,
  onChange: () => void,
): HTMLInputElement {
  const el = input('number', name, String(value), onChange);
  el.min = String(min);
  el.max = String(max);
  el.step = String(step);
  return el;
}

function optionalNumberInput(
  name: string,
  value: number | undefined,
  onChange: () => void,
): HTMLInputElement {
  const el = numberInput(name, 0, 0, 30, 1, onChange);
  el.value = value === undefined ? '' : String(value);
  el.placeholder = 'any';
  return el;
}

function rangeInput(name: string, value: number, onChange: () => void): HTMLInputElement {
  const el = input('range', name, String(value), onChange);
  el.min = '0';
  el.max = '1';
  el.step = '0.05';
  el.value = String(value);
  return el;
}

function textInput(
  name: string,
  value: string,
  placeholder: string,
  onChange: () => void,
): HTMLInputElement {
  const el = input('text', name, value, onChange);
  el.placeholder = placeholder;
  return el;
}

function selectInput(
  name: string,
  value: string,
  options: [string, string][],
  onChange: () => void,
): HTMLSelectElement {
  const el = document.createElement('select');
  el.name = name;
  el.className = 'olcad-layer-style-dialog__control';
  for (const [v, text] of options) el.append(new Option(text, v));
  el.value = value;
  el.addEventListener('change', onChange);
  return el;
}
