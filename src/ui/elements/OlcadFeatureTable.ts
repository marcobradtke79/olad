import type Feature from 'ol/Feature';
import type { Geometry } from 'ol/geom';
import type LineString from 'ol/geom/LineString';
import type MultiLineString from 'ol/geom/MultiLineString';
import type MultiPolygon from 'ol/geom/MultiPolygon';
import type Polygon from 'ol/geom/Polygon';
import type { Editor } from '../../core/Editor';
import type { ChangeSet } from '../../core/changes/exportChangeSet';
import { measureArea, measureLength } from '../../core/measure/measurements';
import { setIconButton } from './controls';

/** One table column: header label, displayed text and the value it sorts by. */
interface Column {
  key: string;
  label: string;
  text(feature: Feature): string;
  sortValue(feature: Feature): string | number | null;
}

type RowState = 'inserted' | 'updated';

/** Tables per editor, so `<olcad-layer-list>` can open one; see `featureTablesOf`. */
const registry = new Map<Editor, Set<OlcadFeatureTable>>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** The `<olcad-feature-table>` elements bound to `editor`, in binding order. */
export function featureTablesOf(editor: Editor): OlcadFeatureTable[] {
  return [...(registry.get(editor) ?? [])];
}

/** Called when a table is bound, unbound, opened, switched or closed. Returns the unsubscriber. */
export function onFeatureTableChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}

/** Length (lines) or area (polygons) in metres / square metres, projection-aware. */
function geometrySize(
  geometry: Geometry | undefined,
  projection: string,
): { kind: 'length' | 'area'; value: number } | null {
  if (!geometry) return null;
  switch (geometry.getType()) {
    case 'LineString':
      return {
        kind: 'length',
        value: measureLength(projection, (geometry as LineString).getCoordinates()).total,
      };
    case 'MultiLineString':
      return {
        kind: 'length',
        value: (geometry as MultiLineString)
          .getCoordinates()
          .reduce((sum, line) => sum + measureLength(projection, line).total, 0),
      };
    case 'Polygon':
      return {
        kind: 'area',
        value: measureArea(projection, (geometry as Polygon).getCoordinates()).area,
      };
    case 'MultiPolygon':
      return {
        kind: 'area',
        value: (geometry as MultiPolygon)
          .getCoordinates()
          .reduce((sum, rings) => sum + measureArea(projection, rings).area, 0),
      };
    default:
      return null;
  }
}

/**
 * `<olcad-feature-table>`: the objects of one layer as table rows (id, schema fields, text and
 * height for text layers, geometry type with length or area). `show(layerId)` / the `layer`
 * attribute opens it, `close()` hides it together with its enclosing `<olcad-panel>`. A row
 * click selects the object (Ctrl / Cmd toggles, Shift selects a range), a double click zooms
 * to it, a map selection marks its rows; headers sort, the filter narrows the rows. Rows of
 * inserted and updated objects carry `data-state`. Read-only: attributes are edited in the
 * attribute form. Bind with `element.editor = editor`; `<olcad-layer-list>` opens it through
 * its Table buttons. Renders into light DOM.
 */
export class OlcadFeatureTable extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['layer'];
  }

  private boundEditor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];
  private changeSet: ChangeSet | null = null;
  private sort: { key: string; direction: 1 | -1 } | null = null;
  private filter = '';
  /** The row a Shift+click range starts from. */
  private anchor: Feature | null = null;
  /** Set while the table itself changes the selection, so it does not scroll. */
  private selecting = false;
  private built = false;
  private readonly title_ = document.createElement('span');
  private readonly count = document.createElement('span');
  private readonly filterInput = document.createElement('input');
  private readonly closeButton = document.createElement('button');
  private readonly body = document.createElement('div');

  /** Id of the layer shown, or `null` when closed. */
  get layer(): string | null {
    return this.getAttribute('layer');
  }

  set layer(id: string | null) {
    if (id) this.setAttribute('layer', id);
    else this.removeAttribute('layer');
  }

  get editor(): Editor | null {
    return this.boundEditor;
  }

  set editor(editor: Editor | null) {
    this.unbind();
    this.boundEditor = editor;
    if (editor) {
      if (!registry.has(editor)) registry.set(editor, new Set());
      registry.get(editor)!.add(this);
      this.changeSet = editor.changes.get();
      const rerender = () => this.render();
      this.unsubscribe.push(
        editor.on('change', (changeSet) => {
          this.changeSet = changeSet;
          this.render();
        }),
        editor.on('layerchange', rerender),
        editor.on('layerload', rerender),
        editor.on('projectionchange', rerender),
        editor.on('unitschange', rerender),
        editor.on('selectionchange', () => {
          this.render();
          if (!this.selecting) this.scrollToSelection();
        }),
        editor.on('destroy', () => {
          this.editor = null;
        }),
      );
    }
    this.render();
    notify();
  }

  /** Show the objects of `layerId`. */
  show(layerId: string): void {
    this.layer = layerId;
    const panel = this.closest('olcad-panel') as
      (HTMLElement & { isFlyout?: boolean; toggleFlyout?: (open?: boolean) => void }) | null;
    if (panel?.isFlyout && !panel.hasAttribute('open')) panel.toggleFlyout?.(true);
  }

  /** Hide the table and its panel. */
  close(): void {
    this.layer = null;
  }

  connectedCallback(): void {
    this.classList.add('olcad-feature-table');
    this.build();
    this.render();
  }

  disconnectedCallback(): void {
    this.unbind();
  }

  attributeChangedCallback(): void {
    this.filter = '';
    this.filterInput.value = '';
    this.sort = null;
    this.anchor = null;
    this.render();
    notify();
  }

  private unbind(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
    if (this.boundEditor) {
      registry.get(this.boundEditor)?.delete(this);
      if (registry.get(this.boundEditor)?.size === 0) registry.delete(this.boundEditor);
      notify();
    }
  }

  /** Header (title, count, filter, close) once; only the table body is rebuilt. */
  private build(): void {
    if (this.built) return;
    this.built = true;
    const header = document.createElement('div');
    header.className = 'olcad-feature-table__header';
    this.title_.className = 'olcad-feature-table__title';
    this.count.className = 'olcad-feature-table__count';
    this.filterInput.type = 'search';
    this.filterInput.className = 'olcad-feature-table__filter';
    this.filterInput.placeholder = 'Filter';
    this.filterInput.setAttribute('aria-label', 'Filter rows');
    this.filterInput.addEventListener('input', () => {
      this.filter = this.filterInput.value;
      this.render();
    });
    this.closeButton.type = 'button';
    this.closeButton.className = 'olcad-feature-table__close';
    this.closeButton.dataset.action = 'close';
    setIconButton(this.closeButton, 'close', 'Close table');
    this.closeButton.addEventListener('click', () => this.close());
    header.append(this.title_, this.count, this.filterInput, this.closeButton);
    this.body.className = 'olcad-feature-table__body';
    this.append(header, this.body);
  }

  private setHidden(hidden: boolean): void {
    const panel = this.closest<HTMLElement>('olcad-panel');
    // The table decides when its panel shows; the View menu and layout leave it alone.
    panel?.setAttribute('no-toggle', '');
    (panel ?? this).hidden = hidden;
  }

  private render(): void {
    if (!this.isConnected) return;
    this.build();
    const editor = this.boundEditor;
    const id = this.layer;
    const info = editor && id ? editor.layers.list().find((layer) => layer.id === id) : undefined;
    if (!editor || !id || !info) {
      this.body.replaceChildren();
      this.setHidden(true);
      if (editor && id && !info) this.close(); // the layer was removed
      return;
    }
    this.setHidden(false);

    const focused = this.ownerDocument.activeElement as HTMLElement | null;
    const focus =
      focused && this.body.contains(focused)
        ? { sort: focused.dataset.sort, row: focused.dataset.row }
        : null;

    const columns = this.columns(editor, id);
    const all = editor.layers.getFeatures(id);
    const rows = this.visibleRows(all, columns);
    const states = this.rowStates(id);
    const selected = new Set(editor.selection.get());

    this.title_.textContent = info.title;
    this.count.textContent =
      rows.length === all.length
        ? `${all.length} object${all.length === 1 ? '' : 's'}`
        : `${rows.length} of ${all.length}`;

    const table = document.createElement('table');
    table.className = 'olcad-feature-table__table';
    table.setAttribute('aria-label', `Objects of ${info.title}`);
    table.setAttribute('aria-multiselectable', 'true');
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const column of columns) {
      const th = document.createElement('th');
      th.scope = 'col';
      const sorted = this.sort?.key === column.key ? this.sort.direction : 0;
      th.setAttribute(
        'aria-sort',
        sorted === 1 ? 'ascending' : sorted === -1 ? 'descending' : 'none',
      );
      const sortButton = document.createElement('button');
      sortButton.type = 'button';
      sortButton.className = 'olcad-feature-table__sort';
      sortButton.dataset.sort = column.key;
      sortButton.textContent = column.label + (sorted === 1 ? ' ▲' : sorted === -1 ? ' ▼' : '');
      sortButton.addEventListener('click', () => this.cycleSort(column.key));
      th.append(sortButton);
      headRow.append(th);
    }
    head.append(headRow);

    const tbody = document.createElement('tbody');
    rows.forEach((feature, index) => {
      const tr = document.createElement('tr');
      tr.className = 'olcad-feature-table__row';
      tr.tabIndex = 0;
      tr.dataset.row = String(feature.getId() ?? `#${index}`);
      tr.setAttribute('aria-selected', String(selected.has(feature)));
      const state = states.get(String(feature.getId()));
      if (state) tr.dataset.state = state;
      for (const column of columns) {
        const td = document.createElement('td');
        td.textContent = column.text(feature);
        tr.append(td);
      }
      tr.addEventListener('click', (event) => this.select(feature, rows, event));
      tr.addEventListener('dblclick', () => this.zoomTo(feature));
      tr.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        event.stopPropagation(); // not the editor's Enter = finish
        if (event.shiftKey) this.zoomTo(feature);
        else this.select(feature, rows, event);
      });
      tbody.append(tr);
    });

    table.append(head, tbody);
    if (rows.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'olcad-feature-table__empty';
      empty.textContent =
        all.length === 0 ? 'No objects in this layer.' : 'No row matches the filter.';
      this.body.replaceChildren(table, empty);
    } else {
      this.body.replaceChildren(table);
    }
    if (focus) {
      const all = Array.from(this.body.querySelectorAll<HTMLElement>('[data-sort], [data-row]'));
      all
        .find((el) => (focus.sort ? el.dataset.sort === focus.sort : el.dataset.row === focus.row))
        ?.focus();
    }
  }

  private columns(editor: Editor, layerId: string): Column[] {
    const config = editor.layers.getConfig(layerId);
    const projection = editor.getProjection();
    const columns: Column[] = [
      {
        key: '#id',
        label: config.idProperty ?? 'Id',
        text: (f) => formatValue(f.getId()),
        sortValue: (f) => f.getId() ?? null,
      },
    ];
    const names = new Set<string>();
    for (const field of config.schema?.fields ?? []) {
      names.add(field.name);
      columns.push({
        key: field.name,
        label: field.label ?? field.name,
        text: (f) => formatValue(f.get(field.name)),
        sortValue: (f) => {
          const value = f.get(field.name) as unknown;
          if (value === undefined || value === null || value === '') return null;
          return typeof value === 'number' ? value : formatValue(value);
        },
      });
    }
    if (config.text) {
      const { property, heightProperty } = config.text;
      if (!names.has(property)) {
        columns.push({
          key: property,
          label: 'Text',
          text: (f) => formatValue(f.get(property)),
          sortValue: (f) => (f.get(property) as string | undefined) ?? null,
        });
      }
      if (!names.has(heightProperty)) {
        // Stored in metres; shown in the default length unit.
        columns.push({
          key: heightProperty,
          label: 'Height',
          text: (f) => {
            const height = f.get(heightProperty) as unknown;
            return typeof height === 'number'
              ? editor.units.formatLength(height)
              : formatValue(height);
          },
          sortValue: (f) => (f.get(heightProperty) as number | undefined) ?? null,
        });
      }
    }
    columns.push({
      key: '#geometry',
      label: 'Geometry',
      text: (f) => {
        const geometry = f.getGeometry();
        if (!geometry) return '';
        const size = geometrySize(geometry, projection);
        if (!size) return geometry.getType();
        const value =
          size.kind === 'length'
            ? editor.units.formatLength(size.value)
            : editor.units.formatArea(size.value);
        return `${geometry.getType()} · ${value}`;
      },
      sortValue: (f) => geometrySize(f.getGeometry(), projection)?.value ?? null,
    });
    return columns;
  }

  private visibleRows(features: Feature[], columns: Column[]): Feature[] {
    const needle = this.filter.trim().toLowerCase();
    let rows = needle
      ? features.filter((f) => columns.some((c) => c.text(f).toLowerCase().includes(needle)))
      : [...features];
    const sort = this.sort;
    const column = sort && columns.find((c) => c.key === sort.key);
    if (sort && column) {
      const keyed = rows.map((feature) => ({ feature, value: column.sortValue(feature) }));
      keyed.sort((a, b) => {
        // Empty values last in both directions.
        if (a.value === null) return b.value === null ? 0 : 1;
        if (b.value === null) return -1;
        const order =
          typeof a.value === 'number' && typeof b.value === 'number'
            ? a.value - b.value
            : String(a.value).localeCompare(String(b.value), undefined, { numeric: true });
        return order * sort.direction;
      });
      rows = keyed.map((k) => k.feature);
    }
    return rows;
  }

  /** Feature id → net change state of this layer's objects. */
  private rowStates(layerId: string): Map<string, RowState> {
    const states = new Map<string, RowState>();
    for (const change of this.changeSet?.changes ?? []) {
      if (change.layer !== layerId) continue;
      if (change.op === 'insert') states.set(String(change.tempId), 'inserted');
      else if (change.op === 'update') states.set(String(change.id), 'updated');
    }
    return states;
  }

  private cycleSort(key: string): void {
    const current = this.sort?.key === key ? this.sort.direction : 0;
    this.sort =
      current === 0 ? { key, direction: 1 } : current === 1 ? { key, direction: -1 } : null;
    this.render();
  }

  private select(feature: Feature, rows: Feature[], event: MouseEvent | KeyboardEvent): void {
    const editor = this.boundEditor;
    if (!editor) return;
    this.selecting = true;
    try {
      if (event.ctrlKey || event.metaKey) {
        if (editor.selection.get().includes(feature)) editor.selection.remove(feature);
        else editor.selection.add(feature);
        this.anchor = feature;
      } else if (event.shiftKey && this.anchor && rows.includes(this.anchor)) {
        const a = rows.indexOf(this.anchor);
        const b = rows.indexOf(feature);
        editor.selection.set(rows.slice(Math.min(a, b), Math.max(a, b) + 1));
      } else {
        editor.selection.set([feature]);
        this.anchor = feature;
      }
    } finally {
      this.selecting = false;
    }
  }

  private zoomTo(feature: Feature): void {
    const geometry = feature.getGeometry();
    const editor = this.boundEditor;
    if (!geometry || !editor) return;
    const view = editor.map.getView();
    view.fit(geometry.getExtent(), {
      padding: [48, 48, 48, 48],
      maxZoom: Math.max(view.getZoom() ?? 18, 18),
      duration: 250,
    });
  }

  private scrollToSelection(): void {
    const row = this.body.querySelector<HTMLElement>('tr[aria-selected="true"]');
    row?.scrollIntoView?.({ block: 'nearest' });
  }
}
