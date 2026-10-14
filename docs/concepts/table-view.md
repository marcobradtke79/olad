# Table view

**Status:** partial (2026-10-13). Requested by the project owner on 2026-10-13: a button in the layer list opens a panel at the bottom, above the command line and the CRS bar, with one layer's objects as rows. The read-only table with selection sync, sorting, filter and change markers exists; inline cell editing is planned.

## Purpose

The attribute table of CAD and GIS programs: see all objects of one layer with their attributes at once, compare values, find an object by its values and get to it on the map. It complements the [attribute form](attributes.md), which shows only the single selected object, and it changes nothing by itself.

## Model

Implemented unless marked Planned.

**Opening and closing**

1. Each layer row of the layer list gets a Table icon button, next to visibility, highlight, Edit and info. It is offered for every layer, read-only layers and the draft layer included.
2. Pressing it opens the table panel for that layer; pressing the button of another layer switches the table to that layer. One layer at a time.
3. Pressing the button of the shown layer again, or the panel's close button, hides the panel. Removing the layer or destroying the editor empties and hides it.

**Placement**

- A new element `<olcad-feature-table>` inside `<olcad-panel name="table" dock="bottom">`. In the bottom zone it comes before the command line and the CRS panel, so it sits above them; the zone keeps the DOM order of its children.
- Hidden until opened: the element sets `hidden` on its panel while no layer is shown, and `no-toggle`, so the View menu's Show all / Hide all ([UI shell](ui-shell.md)) leave it alone. In the bottom zone the panel takes a row of its own. The table body scrolls up to `--olcad-table-height` and the header row stays visible. Planned: a drag handle for the height.
- Like every panel it can be moved, floated and persisted by the dock ([UI shell](ui-shell.md)).

**Columns**

- First the object id (`idProperty`); new objects show their temporary id and a marker.
- Then the layer's schema fields in schema order, headed by their labels, values formatted by field type (enum value, number, date, boolean).
- Text layers show the text and the text height.
- A geometry column shows the geometry type and the length (lines) or area (polygons), computed projection-aware through [measurement](measurement.md).

**Rows**

- The layer's loaded objects (`editor.layers.getFeatures`). The table refreshes after every command, undo and redo, after a reload or bbox load of the layer and after a projection switch. A bbox layer shows only the objects loaded for the current view.
- A state marker shows each object's net change from [change tracking](change-tracking.md): inserted, updated or unchanged; it disappears after `accept` or `discard`.

**Selection sync**

- A row click selects the object through the shared [selection](selection.md); Ctrl / Cmd+click toggles a row, Shift+click selects a range.
- Double-click (or Shift+Enter on a focused row) fits the map view to the object; Enter selects.
- A selection made on the map marks its rows and scrolls the first one into view; objects of other layers do not change the table.
- Works in and out of [edit mode](edit-mode.md), like the inspect selection.

**Sorting and filtering**

- A click on a column header sorts by it (ascending, descending, off).
- A filter field above the table narrows the rows to those containing the text in any shown column. Sorting and filtering are view state only; they never change the selection.

**Editing**

- The first version is read-only. Values are changed in the attribute form, which follows the row selected in the table.
- Delete acts on selected rows through the existing selection delete, so editability is enforced as everywhere else ([editing](editing.md)).
- Planned: inline cell editing, each edit one `updateProperties` command, only where the layer allows `update` and the field is not `readOnly`, validated by the attribute rules of milestone 7.

**Core and UI**

- A UI element only, built on the public API (selection, layers, changes, events), so a host can build its own table with the same calls. It adds no core state.
- The layer list finds the tables bound to its editor through a small UI-side registry (`featureTablesOf`, `onFeatureTableChange`); the first one is opened. Without a bound table the Table button is disabled.

## Related

- [Layers and editability](layers-and-editability.md): the table shows one layer; its row button sits in the layer list; editability decides what Delete and later inline edits may do.
- [Selection](selection.md): row clicks set the shared selection and map selections mark rows, in both directions.
- [Attributes](attributes.md): the columns come from the layer schema; the form edits the row selected in the table.
- [UI shell](ui-shell.md): a bottom-docked panel above the command line and the CRS bar, opened from the layer list.
- [Change tracking](change-tracking.md): the row marker shows the net change state of each object.
- [Editing](editing.md): the table refreshes after every command, undo and redo; later inline edits are commands.
- [Edit mode](edit-mode.md): the table and its selection work in and out of edit mode.
- [Measurement](measurement.md): the geometry column's length and area are projection-aware measurements.
- [Layer highlight](layer-highlight.md): both are per-layer views started from the layer list; a highlighted layer is a natural pair with its table.
- [Local layers](local-layers.md): a local layer opens in the table like any layer.
- [Export](export.md): both show a layer's current objects; the export writes them to a file.

## Surface

- Element `<olcad-feature-table>` (`layer`, `show`, `close`), `featureTablesOf`, `onFeatureTableChange`, the Table button of `<olcad-layer-list>` and `--olcad-table-height` ([ui.md](../ui.md#olcad-feature-table)).
- Existing API it uses: `editor.layers.getFeatures`, `editor.selection`, `editor.changes`, events `change`, `historychange`, `layerchange`, `selectionchange`, `projectionchange` ([api.md](../api.md)).

## Open questions

- Inline cell editing: when, and with which keyboard model (Enter edits, Escape cancels)?
- Columns for properties that are not in the schema: hide them, show them read-only, or make them configurable?
- One layer at a time, or a tab per opened layer?
- Large layers: virtual scrolling or a row cap? Ties to the cross-cutting large-data question in `CLAUDE.md`.
- bbox layers: only the loaded objects, or a host-supplied query for all objects of the layer?
- Fitting the view to a row is done on `editor.map` in the element; should it become a core helper (for example `editor.fit(features)`) so hosts without the UI get it too?
- Should the table follow the active layer automatically when Edit is pressed on another row?
- CSV export of the shown rows?

## Source

- `src/ui/elements/OlcadFeatureTable.ts`
- `src/ui/elements/OlcadLayerList.ts`
- `src/ui/theme.css`
