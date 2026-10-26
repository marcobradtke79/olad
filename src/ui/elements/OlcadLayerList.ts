import type Feature from 'ol/Feature';
import type { Editor } from '../../core/Editor';
import type { LayerInfo } from '../../core/layers/LayerManager';
import type { OverlayInfo } from '../../core/layers/overlays';
import type { GroupInfo } from '../../core/layers/groups';
import { setIconButton } from './controls';
import { icon } from '../icons';
import { featureTablesOf, onFeatureTableChange } from './OlcadFeatureTable';
import { isLocalLayerPersisted, onLocalLayerPersistenceChange } from '../localLayerStorage';
import type { OlcadLayerEditor } from './OlcadLayerEditor';

/** What a row control does; with the layer id it identifies the control across re-renders. */
type RowAction =
  | 'visible'
  | 'highlight'
  | 'table'
  | 'edit'
  | 'move-draft'
  | 'settings'
  | 'info'
  | 'opacity'
  | 'zoom'
  | 'group-toggle'
  | 'group-visible';

/** The two sections of the list that show groups. */
type Section = 'overlays' | 'layers';

/**
 * `<olcad-layer-list>`: basemaps as a radio group, one row per raster overlay (visibility and
 * details with an opacity slider, the zoom range, the legend and a Zoom button;
 * `editor.overlays`) and one row per vector layer with its name and icon buttons: visibility,
 * highlight (`editor.layers.setHighlighted`), table (opens the layer in the
 * `<olcad-feature-table>` bound to the same editor, or closes it), edit (switches edit mode on
 * and makes the layer the active one; no tool is started), move (while draft objects are
 * selected, on the rows of the layers that take them: `editor.layers.moveDrafts`), settings
 * (local layers only: name, attributes, delete in `<olcad-layer-editor>`) and info (details
 * below the row, with a Zoom button that fits the view to the layer's extent). Members of a group
 * (`editor.groups`) are listed under a group row with a disclosure button and a visibility toggle
 * for all members (`aria-pressed="mixed"` while only some are visible), in both sections when the
 * group has layers and overlays; ungrouped rows follow. A New layer button above the layers creates a local layer
 * (`editor.localLayers`) in the same dialog. With the `reveal` attribute, selecting draft objects opens the
 * flyout panel the list sits in. Bind with `element.editor = editor`. Renders into light DOM
 * so the theme and host styles apply.
 */
export class OlcadLayerList extends HTMLElement {
  private boundEditor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];
  /** Layers whose details are open; kept across re-renders. */
  private readonly expanded = new Set<string>();
  /** The dialog for New layer and Layer settings, created on first use; survives re-renders. */
  private layerEditor: OlcadLayerEditor | null = null;
  /** The last error of each overlay (`overlayerror`), shown in its details until it is re-added. */
  private readonly overlayErrors = new Map<string, Error>();
  /** Set while an opacity slider applies its value, so the list is not rebuilt under the pointer. */
  private applying = false;
  /** Groups opened or closed by the user, per section (`overlays:id`, `layers:id`). */
  private readonly collapsed = new Map<string, boolean>();

  /** `reveal`: a selection holding draft objects opens the flyout panel the list sits in. */
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
        editor.on('basemapchange', rerender),
        editor.on('overlaychange', ({ id, type }) => {
          if (type === 'add' || type === 'remove') this.overlayErrors.delete(id);
          if (type === 'style' && this.applying) return;
          this.render();
        }),
        editor.on('overlayerror', ({ id, error }) => {
          this.overlayErrors.set(id, error);
          this.render();
        }),
        editor.on('layerchange', rerender), // add, remove, visible, editable, snappable, highlight
        editor.on('layerload', rerender),
        editor.on('change', rerender), // feature counts follow commands, undo, redo, discard
        editor.on('activelayerchange', rerender),
        editor.on('editmodechange', rerender),
        editor.on('locallayerchange', rerender),
        onFeatureTableChange(rerender), // a table was bound, opened, switched or closed
        onLocalLayerPersistenceChange(rerender), // local layers kept in storage or in memory
        editor.on('selectionchange', ({ features }) => {
          this.render(); // the move buttons follow the selected drafts
          if (this.reveal && features.some((f) => isDraft(editor, f))) this.revealPanel();
        }),
        editor.on('destroy', () => {
          this.editor = null;
        }),
      );
    }
    this.render();
  }

  connectedCallback(): void {
    this.classList.add('olcad-layer-list');
    this.render();
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

  private render(): void {
    // A rebuild would drop the focus: remember the focused row control and restore it.
    const focused = this.ownerDocument.activeElement as HTMLElement | null;
    const focusedRow = focused?.closest<HTMLElement>(ROW_SELECTOR);
    const focus =
      focused && this.contains(focused) && focused.dataset.action
        ? { action: focused.dataset.action, row: rowId(focusedRow) }
        : null;
    // Everything but the layer dialog: removing an open <dialog> from the document closes it.
    for (const child of Array.from(this.children)) if (child !== this.layerEditor) child.remove();
    const editor = this.boundEditor;
    if (!editor) return;
    const overlays = editor.overlays?.list() ?? [];
    const layers = editor.layers.list();
    const known = new Set([...overlays.map((o) => o.id), ...layers.map((l) => l.id)]);
    for (const id of this.expanded) if (!known.has(id)) this.expanded.delete(id);
    const groups = editor.groups?.list() ?? [];
    const visible = new Map<string, boolean>();
    for (const item of [...overlays, ...layers]) visible.set(item.id, item.visible);
    const grouping: Grouping = { groups, visible };
    this.renderBasemaps(editor);
    this.renderOverlays(editor, overlays, grouping);
    this.renderLayers(editor, layers, grouping);
    if (focus?.row) {
      const row = Array.from(this.querySelectorAll<HTMLElement>(ROW_SELECTOR)).find(
        (el) => rowId(el) === focus.row,
      );
      row?.querySelector<HTMLElement>(`[data-action="${focus.action}"]`)?.focus();
    }
  }

  private heading(text: string, suffix: string): HTMLElement {
    const heading = document.createElement('div');
    heading.className = 'olcad-layer-list__heading';
    heading.id = `${this.sectionId()}-${suffix}`;
    heading.textContent = text;
    return heading;
  }

  private renderBasemaps(editor: Editor): void {
    const basemaps = editor.basemaps.list();
    if (basemaps.length === 0) return;
    const heading = this.heading('Basemaps', 'basemaps');
    this.append(heading);
    const group = document.createElement('div');
    group.className = 'olcad-layer-list__group';
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-labelledby', heading.id);
    for (const basemap of basemaps) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'olcad-layer-list__item';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(basemap.active));
      button.dataset.basemapId = basemap.id;
      button.textContent = basemap.title;
      button.addEventListener('click', () => editor.basemaps.setActive(basemap.id));
      group.append(button);
    }
    this.append(group);
  }

  private renderOverlays(editor: Editor, overlays: OverlayInfo[], grouping: Grouping): void {
    if (overlays.length === 0) return;
    const heading = this.heading('Overlays', 'overlays');
    this.append(heading);
    const group = document.createElement('div');
    group.className = 'olcad-layer-list__group';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-labelledby', heading.id);
    this.renderMembers(editor, group, 'overlays', overlays, grouping, (overlay) =>
      this.renderOverlay(editor, overlay),
    );
    this.append(group);
  }

  private renderOverlay(editor: Editor, overlay: OverlayInfo): HTMLElement {
    const row = document.createElement('div');
    row.className = 'olcad-layer-list__layer olcad-layer-list__overlay';
    row.classList.toggle('olcad-layer-list__layer--hidden', !overlay.visible);
    const error = this.overlayErrors.get(overlay.id);
    row.classList.toggle('olcad-layer-list__layer--error', error !== undefined);
    row.dataset.overlayId = overlay.id;

    const visible = rowButton('visible', 'visible');
    setIconButton(
      visible,
      overlay.visible ? 'eye' : 'eyeOff',
      `Visible: ${overlay.title}`,
      overlay.visible ? 'Hide this overlay' : 'Show this overlay',
    );
    visible.setAttribute('aria-pressed', String(overlay.visible));
    visible.addEventListener('click', () =>
      editor.overlays.setVisible(overlay.id, !overlay.visible),
    );

    const title = document.createElement('span');
    title.className = 'olcad-layer-list__title';
    title.textContent = overlay.title;
    if (error) title.title = error.message;

    const open = this.expanded.has(overlay.id);
    const detailsId = `${this.sectionId()}-details-${overlay.id}`;
    const info = rowButton('info', 'info-toggle');
    setIconButton(
      info,
      'info',
      `Details of ${overlay.title}`,
      open ? 'Hide details' : 'Show details',
    );
    info.setAttribute('aria-expanded', String(open));
    info.setAttribute('aria-controls', detailsId);
    info.addEventListener('click', () => {
      if (this.expanded.has(overlay.id)) this.expanded.delete(overlay.id);
      else this.expanded.add(overlay.id);
      this.render();
    });

    const details = document.createElement('dl');
    details.className = 'olcad-layer-list__details';
    details.id = detailsId;
    details.hidden = !open;
    addDetail(details, 'type', 'Type', overlay.type);
    // Opacity: a slider applying live (`editor.overlays.setOpacity`) with its value beside it.
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.name = 'opacity';
    slider.className = 'olcad-layer-list__opacity';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.05';
    slider.value = String(overlay.opacity);
    slider.dataset.action = 'opacity';
    slider.setAttribute('aria-label', `Opacity of ${overlay.title}`);
    const output = document.createElement('output');
    output.textContent = percent(overlay.opacity);
    slider.addEventListener('input', () => {
      output.textContent = percent(Number(slider.value));
      this.applying = true;
      try {
        editor.overlays.setOpacity(overlay.id, Number(slider.value));
      } finally {
        this.applying = false;
      }
    });
    const opacity = document.createElement('span');
    opacity.className = 'olcad-layer-list__opacity-control';
    opacity.append(slider, output);
    addDetail(details, 'opacity', 'Opacity', opacity);
    addDetail(details, 'zoom', 'Zoom range', zoomRange(overlay.minZoom, overlay.maxZoom));
    const resolution = editor.map?.getView?.()?.getResolution?.();
    const legendUrl = editor.overlays.getLegendUrl(overlay.id, resolution) ?? overlay.legendUrl;
    if (legendUrl) addDetail(details, 'legend', 'Legend', legendImage(legendUrl, overlay.title));
    if (overlay.attribution) {
      addDetail(details, 'attribution', 'Attribution', plainText(overlay.attribution));
    }
    addDetail(details, 'id', 'Id', overlay.id);
    if (open) {
      addDetail(
        details,
        'extent',
        'Extent',
        zoomButton(overlay.title, editor.overlays.getExtent?.(overlay.id) ?? null, () =>
          editor.overlays.fit(overlay.id),
        ),
      );
    }
    if (error) addDetail(details, 'error', 'Error', error.message);

    row.append(visible, title, info, details);
    return row;
  }

  private renderLayers(editor: Editor, layers: LayerInfo[], grouping: Grouping): void {
    const heading = this.heading('Layers', 'layers');
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'olcad-layer-list__new';
    add.dataset.action = 'new-layer';
    setIconButton(add, 'addLayer', 'New layer', 'Create a local layer');
    add.addEventListener('click', () => this.openLayerEditor(editor, null));
    // The button sits beside the heading, not in it: the heading labels the group.
    const headingRow = document.createElement('div');
    headingRow.className = 'olcad-layer-list__heading-row';
    headingRow.append(heading, add);
    this.append(headingRow);
    if (layers.length === 0) return;
    const group = document.createElement('div');
    group.className = 'olcad-layer-list__group';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-labelledby', heading.id);
    const drafts = editor.selection.get().filter((f) => isDraft(editor, f));
    this.renderMembers(editor, group, 'layers', layers, grouping, (layer) =>
      this.renderLayer(editor, layer, drafts),
    );
    this.append(group);
  }

  /**
   * The rows of one section: each group with members here as a group row and its members (in
   * list order), then the ungrouped rows.
   */
  private renderMembers<T extends { id: string; group?: string }>(
    editor: Editor,
    container: HTMLElement,
    section: Section,
    items: T[],
    grouping: Grouping,
    row: (item: T) => HTMLElement,
  ): void {
    for (const info of grouping.groups) {
      const members = items.filter((item) => item.group === info.id);
      if (members.length === 0) continue;
      container.append(this.renderGroup(editor, section, info, grouping, members.map(row)));
    }
    for (const item of items) {
      if (item.group === undefined || !grouping.groups.some((g) => g.id === item.group)) {
        container.append(row(item));
      }
    }
  }

  private renderGroup(
    editor: Editor,
    section: Section,
    info: GroupInfo,
    grouping: Grouping,
    rows: HTMLElement[],
  ): HTMLElement {
    const key = `${section}:${info.id}`;
    const closed = this.collapsed.get(key) ?? info.collapsed;
    const membersId = `${this.sectionId()}-group-${section}-${info.id}`;
    const titleId = `${membersId}-title`;

    const wrapper = document.createElement('div');
    wrapper.className = 'olcad-layer-list__layer-group';
    wrapper.dataset.group = info.id;

    const head = document.createElement('div');
    head.className = 'olcad-layer-list__group-row';
    head.dataset.groupId = info.id;
    head.dataset.section = section;

    const toggle = rowButton('group-toggle', 'group-toggle');
    setIconButton(toggle, 'chevron', `Group ${info.title}`, closed ? 'Open group' : 'Close group');
    toggle.setAttribute('aria-expanded', String(!closed));
    toggle.setAttribute('aria-controls', membersId);
    toggle.addEventListener('click', () => {
      this.collapsed.set(key, !closed);
      this.render();
    });

    // Visible: all members (layers and overlays), none, or mixed.
    const ids = [...info.overlays, ...info.layers];
    const shown = ids.filter((id) => grouping.visible.get(id)).length;
    const state = shown === 0 ? 'false' : shown === ids.length ? 'true' : 'mixed';
    const visible = rowButton('group-visible', 'visible');
    setIconButton(
      visible,
      state === 'false' ? 'eyeOff' : 'eye',
      `Visible: ${info.title}`,
      state === 'true' ? 'Hide every layer of this group' : 'Show every layer of this group',
    );
    visible.setAttribute('aria-pressed', state);
    visible.addEventListener('click', () => editor.groups.setVisible(info.id, state !== 'true'));

    const title = document.createElement('span');
    title.className = 'olcad-layer-list__title olcad-layer-list__group-title';
    title.id = titleId;
    title.textContent = info.title;

    head.append(toggle, visible, title);

    const members = document.createElement('div');
    members.className = 'olcad-layer-list__group-members';
    members.id = membersId;
    members.setAttribute('role', 'group');
    members.setAttribute('aria-labelledby', titleId);
    members.hidden = closed;
    members.append(...rows);

    wrapper.append(head, members);
    return wrapper;
  }

  private renderLayer(editor: Editor, layer: LayerInfo, drafts: Feature[]): HTMLElement {
    const row = document.createElement('div');
    row.className = 'olcad-layer-list__layer';
    row.classList.toggle('olcad-layer-list__layer--active', layer.active);
    row.classList.toggle('olcad-layer-list__layer--hidden', !layer.visible);
    row.classList.toggle('olcad-layer-list__layer--loading', layer.loading);
    row.classList.toggle('olcad-layer-list__layer--error', layer.error !== null);
    row.dataset.layerId = layer.id;

    const button = rowButton;
    const visible = button('visible', 'visible');
    setIconButton(
      visible,
      layer.visible ? 'eye' : 'eyeOff',
      `Visible: ${layer.title}`,
      layer.visible ? 'Hide this layer' : 'Show this layer',
    );
    visible.setAttribute('aria-pressed', String(layer.visible));
    visible.addEventListener('click', () => editor.layers.setVisible(layer.id, !layer.visible));

    const title = document.createElement('span');
    title.className = 'olcad-layer-list__title';
    title.textContent = layer.title;

    // Load state after the name: a spinner while loading, a warning after a failed load.
    const status: HTMLElement[] = [];
    if (layer.loading) status.push(statusIcon('loading', 'spinner', 'Loading', 'Loading objects'));
    if (layer.error !== null) {
      status.push(statusIcon('error', 'warning', 'Load failed', layer.error));
    }

    const highlight = button('highlight', 'highlight');
    setIconButton(
      highlight,
      'highlight',
      `Highlight ${layer.title}`,
      layer.highlighted
        ? 'Stop highlighting the objects of this layer'
        : 'Highlight all objects of this layer',
    );
    highlight.setAttribute('aria-pressed', String(layer.highlighted));
    highlight.addEventListener('click', () =>
      editor.layers.setHighlighted(layer.id, !layer.highlighted),
    );

    // Table: opens the layer in the editor's feature table; pressed while it shows the layer.
    const tables = featureTablesOf(editor);
    const shown = tables.filter((t) => t.layer === layer.id);
    const table = button('table', 'table');
    setIconButton(
      table,
      'table',
      `Table of ${layer.title}`,
      tables.length === 0
        ? 'No table panel on this page'
        : shown.length > 0
          ? 'Hide the table'
          : 'Show the objects of this layer as a table',
    );
    table.setAttribute('aria-pressed', String(shown.length > 0));
    table.disabled = tables.length === 0;
    table.addEventListener('click', () => {
      if (shown.length > 0) for (const t of shown) t.close();
      else tables[0]?.show(layer.id);
    });

    // Edit: switches edit mode on and makes the layer the active one; no tool is started.
    // Pressed only while the layer is active in edit mode: with edit mode off, a press on the
    // active layer resumes editing it instead of clearing it.
    const ops = (['insert', 'update', 'delete'] as const).filter((op) => layer.editable[op]);
    const editing = layer.active && editor.isEditMode();
    const edit = button('edit', 'edit');
    setIconButton(
      edit,
      'edit',
      `Edit ${layer.title}`,
      ops.length === 0
        ? 'Read-only layer'
        : editing
          ? 'Stop editing this layer'
          : editor.isEditMode()
            ? 'Edit this layer'
            : 'Switch on edit mode and edit this layer',
    );
    edit.setAttribute('aria-pressed', String(editing));
    edit.disabled = ops.length === 0 && !layer.active;
    edit.addEventListener('click', () => {
      if (editing) {
        editor.layers.setActive(null);
        return;
      }
      if (!editor.isEditMode()) editor.setEditMode(true);
      if (!layer.active) editor.layers.setActive(layer.id);
    });

    const open = this.expanded.has(layer.id);
    const detailsId = `${this.sectionId()}-details-${layer.id}`;
    const info = button('info', 'info-toggle');
    setIconButton(
      info,
      'info',
      `Details of ${layer.title}`,
      open ? 'Hide details' : 'Show details',
    );
    info.setAttribute('aria-expanded', String(open));
    info.setAttribute('aria-controls', detailsId);
    info.addEventListener('click', () => {
      if (this.expanded.has(layer.id)) this.expanded.delete(layer.id);
      else this.expanded.add(layer.id);
      this.render();
    });

    const details = document.createElement('dl');
    details.className = 'olcad-layer-list__details';
    details.id = detailsId;
    details.hidden = !open;
    const detail = (key: string, label: string, value: string) =>
      addDetail(details, key, label, value);
    detail('geometry', 'Geometry', layer.geometryType);
    detail('editable', 'Editing', ops.length ? ops.join(' ') : 'read-only');
    detail('features', 'Objects', String(layer.featureCount));
    detail('snappable', 'Snap target', layer.snappable ? 'yes' : 'no');
    detail('projection', 'Data projection', layer.dataProjection);
    detail('id', 'Id', layer.id);
    if (layer.error !== null) detail('error', 'Last load', `failed: ${layer.error}`);
    if (layer.legendUrl)
      addDetail(details, 'legend', 'Legend', legendImage(layer.legendUrl, layer.title));
    if (open) {
      addDetail(
        details,
        'extent',
        'Extent',
        zoomButton(layer.title, editor.layers.getExtent?.(layer.id) ?? null, () =>
          editor.layers.fit(layer.id),
        ),
      );
    }
    const kept = isLocalLayerPersisted(editor);
    if (layer.local)
      detail('storage', 'Storage', kept ? 'this browser' : 'memory (lost on reload)');

    // Move: the selected draft objects this layer takes.
    const fitting = drafts.filter((f) => editor.layers.draftTargets(f).includes(layer.id));
    let move: HTMLButtonElement | null = null;
    if (fitting.length > 0) {
      move = button('move-draft', 'move-draft');
      setIconButton(
        move,
        'moveToLayer',
        fitting.length === 1
          ? `Move selected draft to ${layer.title}`
          : `Move ${fitting.length} selected drafts to ${layer.title}`,
        editor.isEditMode()
          ? fitting.length === 1
            ? 'Move the selected draft into this layer'
            : `Move the ${fitting.length} selected drafts into this layer`
          : 'Switch on edit mode to move drafts',
      );
      move.disabled = !editor.isEditMode();
      move.addEventListener('click', () => editor.layers.moveDrafts(fitting, layer.id));
    }

    let settings: HTMLButtonElement | null = null;
    if (layer.local) {
      row.classList.add('olcad-layer-list__layer--local');
      title.title = kept ? 'Local layer, kept in this browser' : 'Local layer, lost on reload';
      settings = button('settings', 'settings');
      setIconButton(
        settings,
        'settings',
        `Settings of ${layer.title}`,
        'Name, attributes or delete this local layer',
      );
      settings.addEventListener('click', () => this.openLayerEditor(editor, layer.id));
    }

    row.append(
      visible,
      title,
      ...status,
      highlight,
      table,
      edit,
      ...(move ? [move] : []),
      ...(settings ? [settings] : []),
      info,
      details,
    );
    return row;
  }

  private openLayerEditor(editor: Editor, layerId: string | null): void {
    if (!this.layerEditor) {
      this.layerEditor = document.createElement('olcad-layer-editor') as OlcadLayerEditor;
      this.prepend(this.layerEditor);
    }
    if (this.layerEditor.editor !== editor) this.layerEditor.editor = editor;
    this.layerEditor.open(layerId);
  }

  private sectionId(): string {
    if (!this.id) this.id = `olcad-layer-list-${Math.random().toString(36).slice(2, 8)}`;
    return this.id;
  }
}

function isDraft(editor: Editor, feature: Feature): boolean {
  const draft = editor.layers.getDraft();
  return draft !== null && editor.layers.layerOf(feature) === draft;
}

/** A non-interactive status icon in a row (loading, load failed) with its tooltip. */
function statusIcon(
  kind: 'loading' | 'error',
  name: 'spinner' | 'warning',
  label: string,
  description: string,
): HTMLElement {
  const el = document.createElement('span');
  el.className = `olcad-layer-list__${kind}`;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', label);
  el.dataset.tooltip = description;
  el.append(icon(name, document));
  return el;
}

/** A row's icon button; `action` plus the row id identify it across re-renders. */
function rowButton(action: RowAction, className: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `olcad-layer-list__${className}`;
  el.dataset.action = action;
  return el;
}

/** The groups and every layer's and overlay's visibility, for the group rows. */
interface Grouping {
  groups: GroupInfo[];
  visible: Map<string, boolean>;
}

/** Rows whose focused control is restored after a re-render. */
const ROW_SELECTOR = '[data-layer-id], [data-overlay-id], [data-group-id]';

/** The layer or overlay id of a row element, or `group:<section>:<id>` for a group row. */
function rowId(row: HTMLElement | null | undefined): string | undefined {
  if (row?.dataset.groupId !== undefined) {
    return `group:${row.dataset.section}:${row.dataset.groupId}`;
  }
  return row?.dataset.layerId ?? row?.dataset.overlayId;
}

/** One `dt` / `dd` pair of a details list; `value` is text or an element. */
function addDetail(details: HTMLDListElement, key: string, label: string, value: string | Node) {
  const item = document.createElement('div');
  item.className = 'olcad-layer-list__detail';
  item.dataset.detail = key;
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  if (typeof value === 'string') dd.textContent = value;
  else dd.append(value);
  item.append(dt, dd);
  details.append(item);
}

/**
 * The Zoom button of a details list: fits the view to the layer's data extent (configured, or
 * the loaded objects); disabled while no extent is known.
 */
function zoomButton(title: string, extent: unknown, fit: () => void): HTMLButtonElement {
  const button = rowButton('zoom', 'zoom');
  const known = extent !== null && extent !== undefined;
  setIconButton(
    button,
    'zoomToLayer',
    `Zoom to ${title}`,
    known ? 'Zoom the map to this layer' : 'No extent known yet: nothing loaded, none configured',
  );
  button.disabled = !known;
  button.addEventListener('click', fit);
  return button;
}

/** The legend image of a layer or overlay for its details. */
function legendImage(url: string, title: string): HTMLImageElement {
  const img = document.createElement('img');
  img.className = 'olcad-layer-list__legend';
  img.alt = `Legend of ${title}`;
  img.loading = 'lazy';
  img.src = url;
  return img;
}

function percent(value: number): string {
  return `${Math.round(value * 100)} %`;
}

/** `8 – 18`, `from 8`, `to 18` or `any`. */
function zoomRange(minZoom: number | undefined, maxZoom: number | undefined): string {
  if (minZoom !== undefined && maxZoom !== undefined) return `${minZoom} – ${maxZoom}`;
  if (minZoom !== undefined) return `from ${minZoom}`;
  if (maxZoom !== undefined) return `to ${maxZoom}`;
  return 'any';
}

/** The text of an attribution that may contain HTML (parsed inert, nothing loads or runs). */
function plainText(html: string): string {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() ?? '';
}
