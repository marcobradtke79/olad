import type Feature from 'ol/Feature';
import type { Editor } from '../../core/Editor';
import type { LayerInfo } from '../../core/layers/LayerManager';
import { setIconButton } from './controls';
import { featureTablesOf, onFeatureTableChange } from './OlcadFeatureTable';
import { isLocalLayerPersisted, onLocalLayerPersistenceChange } from '../localLayerStorage';
import type { OlcadLayerEditor } from './OlcadLayerEditor';

/** What a row control does; with the layer id it identifies the control across re-renders. */
type RowAction = 'visible' | 'highlight' | 'table' | 'edit' | 'move-draft' | 'settings' | 'info';

/**
 * `<olcad-layer-list>`: basemaps as a radio group and one row per vector layer with its name
 * and icon buttons: visibility, highlight (`editor.layers.setHighlighted`), table (opens the layer
 * in the `<olcad-feature-table>` bound to the same editor, or closes it), edit (switches edit
 * mode on and makes the layer the active one; no tool is started), move (while draft objects
 * are selected, on the rows of the layers that take them: `editor.layers.moveDrafts`), settings
 * (local layers only: name, attributes, delete in `<olcad-layer-editor>`) and info (details
 * below the row). A New layer button above the layers creates a local layer
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
    const focus =
      focused && this.contains(focused) && focused.dataset.action
        ? {
            action: focused.dataset.action,
            layer: focused.closest<HTMLElement>('[data-layer-id]')?.dataset.layerId,
          }
        : null;
    // Everything but the layer dialog: removing an open <dialog> from the document closes it.
    for (const child of Array.from(this.children)) if (child !== this.layerEditor) child.remove();
    const editor = this.boundEditor;
    if (!editor) return;
    this.renderBasemaps(editor);
    this.renderLayers(editor);
    if (focus?.layer) {
      const row = Array.from(this.querySelectorAll<HTMLElement>('[data-layer-id]')).find(
        (el) => el.dataset.layerId === focus.layer,
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

  private renderLayers(editor: Editor): void {
    const layers = editor.layers.list();
    for (const id of this.expanded) {
      if (!layers.some((layer) => layer.id === id)) this.expanded.delete(id);
    }
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
    for (const layer of layers) group.append(this.renderLayer(editor, layer, drafts));
    this.append(group);
  }

  private renderLayer(editor: Editor, layer: LayerInfo, drafts: Feature[]): HTMLElement {
    const row = document.createElement('div');
    row.className = 'olcad-layer-list__layer';
    row.classList.toggle('olcad-layer-list__layer--active', layer.active);
    row.classList.toggle('olcad-layer-list__layer--hidden', !layer.visible);
    row.dataset.layerId = layer.id;

    const button = (action: RowAction, className: string): HTMLButtonElement => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `olcad-layer-list__${className}`;
      el.dataset.action = action;
      return el;
    };

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
    const detail = (key: string, label: string, value: string) => {
      const item = document.createElement('div');
      item.className = 'olcad-layer-list__detail';
      item.dataset.detail = key;
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      item.append(dt, dd);
      details.append(item);
    };
    detail('geometry', 'Geometry', layer.geometryType);
    detail('editable', 'Editing', ops.length ? ops.join(' ') : 'read-only');
    detail('features', 'Objects', String(layer.featureCount));
    detail('snappable', 'Snap target', layer.snappable ? 'yes' : 'no');
    detail('projection', 'Data projection', layer.dataProjection);
    detail('id', 'Id', layer.id);
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
