import type { Editor } from '../../core/Editor';
import {
  measurementExtent,
  type Measurement,
  type MeasurementKind,
} from '../../core/measure/MeasurementStore';
import { formatAngle } from '../../core/measure/measurements';
import type { IconName } from '../icons';
import { icon } from '../icons';
import { setIconButton } from './controls';

const KIND_ICONS: Record<MeasurementKind, IconName> = {
  distance: 'measureDistance',
  area: 'measureArea',
  angle: 'measureAngle',
};

/** The values of a measurement as a detail line ("2 segments", "perimeter 450.00 m", …). */
function details(editor: Editor, measurement: Measurement): string {
  const { values } = measurement;
  const { formatLength, formatArea } = editor.units;
  if (measurement.kind === 'distance') {
    const count = values.segments?.length ?? 0;
    return `${formatLength(values.length ?? 0)} · ${count} segment${count === 1 ? '' : 's'}`;
  }
  if (measurement.kind === 'area') {
    return `${formatArea(values.area ?? 0)} · perimeter ${formatLength(values.perimeter ?? 0)}`;
  }
  return `${formatAngle(values.angle ?? 0)} · reflex ${formatAngle(values.reflex ?? 0)}`;
}

/**
 * `<olcad-measure-results>`: the measurements of `editor.measurements`, one row each with its
 * kind, name, values and a remove button, plus the measurement in progress and a Clear all
 * button. A click on a row's name zooms the map to it. Bind with `element.editor = editor`.
 * Renders into light DOM.
 */
export class OlcadMeasureResults extends HTMLElement {
  private boundEditor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];

  get editor(): Editor | null {
    return this.boundEditor;
  }

  set editor(editor: Editor | null) {
    this.unbind();
    this.boundEditor = editor;
    if (editor) {
      const rerender = () => this.render();
      this.unsubscribe.push(
        editor.on('measurechange', rerender),
        editor.on('measure', rerender),
        editor.on('unitschange', rerender),
        editor.on('destroy', () => {
          this.editor = null;
        }),
      );
    }
    this.render();
  }

  connectedCallback(): void {
    this.classList.add('olcad-measure-results');
    this.render();
  }

  disconnectedCallback(): void {
    this.unbind();
  }

  private unbind(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
  }

  private render(): void {
    const focused = this.ownerDocument.activeElement as HTMLElement | null;
    const focus =
      focused && this.contains(focused) && focused.dataset.action
        ? {
            action: focused.dataset.action,
            id: focused.closest<HTMLElement>('[data-measurement-id]')?.dataset.measurementId,
          }
        : null;
    this.replaceChildren();
    const editor = this.boundEditor;
    if (!editor) return;
    const measurements = editor.measurements.list();
    const live = editor.measurements.getLive();

    const header = document.createElement('div');
    header.className = 'olcad-measure-results__header';
    const count = document.createElement('span');
    count.className = 'olcad-measure-results__count';
    count.textContent =
      measurements.length === 1 ? '1 measurement' : `${measurements.length} measurements`;
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'olcad-toolbar__button olcad-measure-results__clear';
    clear.dataset.action = 'clear';
    clear.textContent = 'Clear all';
    clear.disabled = measurements.length === 0;
    clear.addEventListener('click', () => editor.measurements.clear());
    header.append(count, clear);
    this.append(header);

    if (live && live.label) this.append(this.renderLive(live));
    if (measurements.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'olcad-measure-results__empty';
      empty.textContent = 'No measurements. Pick a measure tool and click on the map.';
      this.append(empty);
    } else {
      const list = document.createElement('ul');
      list.className = 'olcad-measure-results__list';
      for (const measurement of measurements) list.append(this.renderRow(editor, measurement));
      this.append(list);
    }
    if (focus) {
      const target = focus.id
        ? this.querySelector<HTMLElement>(
            `[data-measurement-id="${focus.id}"] [data-action="${focus.action}"]`,
          )
        : this.querySelector<HTMLElement>(`[data-action="${focus.action}"]`);
      target?.focus();
    }
  }

  private renderLive(live: Measurement): HTMLElement {
    const row = document.createElement('div');
    row.className = 'olcad-measure-results__live';
    row.setAttribute('role', 'status');
    row.append(icon(KIND_ICONS[live.kind]), `${live.name} (measuring): ${live.label}`);
    return row;
  }

  private renderRow(editor: Editor, measurement: Measurement): HTMLElement {
    const row = document.createElement('li');
    row.className = 'olcad-measure-results__item';
    row.dataset.measurementId = measurement.id;
    row.dataset.kind = measurement.kind;
    const show = document.createElement('button');
    show.type = 'button';
    show.className = 'olcad-measure-results__show';
    show.dataset.action = 'show';
    show.title = 'Zoom to this measurement';
    const name = document.createElement('span');
    name.className = 'olcad-measure-results__name';
    name.textContent = measurement.name;
    const value = document.createElement('span');
    value.className = 'olcad-measure-results__value';
    value.textContent = details(editor, measurement);
    const text = document.createElement('span');
    text.className = 'olcad-measure-results__text';
    text.append(name, value);
    show.append(icon(KIND_ICONS[measurement.kind]), text);
    show.addEventListener('click', () => {
      const view = editor.map.getView();
      view.fit(measurementExtent(measurement), {
        padding: [48, 48, 48, 48],
        maxZoom: view.getZoom() !== undefined ? Math.max(view.getZoom()!, 18) : 18,
        duration: 250,
      });
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'olcad-measure-results__remove';
    remove.dataset.action = 'remove';
    setIconButton(remove, 'delete', `Remove ${measurement.name}`, 'Remove this measurement');
    remove.addEventListener('click', () => editor.measurements.remove(measurement.id));
    row.append(show, remove);
    return row;
  }
}
