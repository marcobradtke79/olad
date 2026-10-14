# Selection

**Status:** partial (2026-10-12). Click, Shift+click and box selection, the highlight overlay, pruning, inspect mode and Delete exist; lasso selection is planned (milestone 4 brief).

## Purpose

CAD tools work on a selection set: you pick objects first, then say what to do with them (move, edit vertices, delete, change attributes). ol-cad keeps one selection shared by every tool and by the attribute form, so switching tools never loses what was picked, and the host can read or set it through the API. The selection is a _view_ concept, not a mutation: selecting changes nothing in the data.

## Model

**Storage and highlight**

- One OpenLayers `Collection` of features, exposed as `editor.selection` (`get`, `set`, `add`, `remove`, `clear`).
- Selected features are drawn a second time on a dedicated highlight layer above all other layers (halo, stroke, translucent fill, vertex grips, ringed circle for points). The feature's own style is never touched, so a selected object keeps its look underneath and no style swap can leak into the data.
- `selectionchange` is emitted once per batch of changes (microtask), with the current features.

**Who selects**

- The [select tool](tool-select.md): click, Shift+click toggle, Ctrl / Cmd+drag box.
- The [move tool](tool-move.md) in its first step, reusing the same interactions.
- The [draw tool](tool-draw.md) selects each feature it inserts, so the attribute form can capture its values right away.
- Outside [edit mode](edit-mode.md), the inspect interaction (`selection.inspect`) selects on click so attributes can be viewed; nothing can be changed, and the selection survives switching edit mode on.
- The host, through the API.

**Who consumes**

- [Move](tool-move.md) acts on the **editable subset**: the selected features for which `canEdit('update')` holds; read-only features stay selected but untouched. [Modify](tool-modify.md) edits exactly one selected updatable object and clears the selection when the session ends with Enter.
- **Delete** is an action, not a tool: `editor.deleteSelection()` (Delete key, toolbar button) deletes the selected features whose layers allow it, as one command through [editing](editing.md); the others stay selected. Returns `false` when nothing could be deleted.
- The [attribute form](attributes.md) edits the single selected feature.

**Invariants**

- The selection survives tool switches and the edit-mode switch.
- Features that disappear (deleted, discarded, undone insert, layer removed) leave the selection by themselves: the editor prunes on every `change` and on layer removal.
- Selecting is not a command: it is not undoable and does not appear in the change set.
- Hit detection uses half the pick-box size as tolerance and only considers editor layers, never basemaps or the editor's own overlay layers.

**Planned**

- Lasso selection (free-hand polygon) beside the box.
- A selection filter by layer (select only in the active layer) is under consideration, see Open questions.

## Related

- [Text tool](tool-text.md): selects each text it inserts; texts are selected by clicking their letters.
- [Measure tools](tool-measure.md): inspect clicks pause while a measure tool runs outside edit mode.
- [Parallel tool](tool-parallel.md): takes its reference from the selection and selects each inserted line.
- [Select tool](tool-select.md): the primary way to build the selection in edit mode.
- [Draw tool](tool-draw.md): selects what it inserts.
- [Moving drafts](draft-move.md): a selected draft object offers the move; the copy is selected afterwards.
- [Modify tool](tool-modify.md): edits one selected updatable object; Enter deselects it, a tool change keeps it.
- [Move tool](tool-move.md): selects in its first step, moves the editable subset, deselects afterwards.
- [Rotate tool](tool-rotate.md): same: selects, rotates the editable subset around the centre, deselects.
- [Tools framework](tools.md): every tool receives the shared selection through its context.
- [Editing](editing.md): Delete submits one command for the deletable features; pruning follows every `change`.
- [Edit mode](edit-mode.md): inspect selection while off; the selection survives the switch.
- [Attributes](attributes.md): the form follows the single selected feature; `reveal` opens its panel on an inspect selection.
- [Layers and editability](layers-and-editability.md): read-only features are selectable; `canEdit` decides what the consumers may do.
- [UI shell](ui-shell.md): toolbar Delete button and keyboard Delete / Backspace; Escape clears when no tool is active.
- [Rectangle tool](tool-rectangle.md): selects the rectangle it inserts.
- [Circle tool](tool-circle.md): selects the circle it inserts.
- [Regular polygon tool](tool-regular-polygon.md): selects the polygon it inserts.
- [Offset tool](tool-offset.md): the single selected object is the source; the copy becomes the selection and the next source.
- [Curve tool](tool-curve.md): selects the curve it inserts.
- [Trim tool](tool-trim.md) and [Extend tool](tool-extend.md): the selection is the boundary and is cleared once a line has been changed.
- [Layer highlight](layer-highlight.md): a layer-wide highlight in another style, drawn below the selection overlay; it never changes the selection.
- [Template copy tool](tool-template-copy.md) and [template insert tool](tool-template-insert.md): the selection is copied into a template and cleared; inserted copies become the selection.
- [Mirror tool](tool-mirror.md): mirrors the selection and clears it.
- [Scale tool](tool-scale.md): scales the editable part of the selection and clears it.
- [Table view](table-view.md): row clicks set the selection and a map selection marks the table rows.
- [Layer styles](layer-styles.md): the selection overlay stays above all layers whatever their order and style.

## Surface

- Config `selection` (highlight colours, `vertexSize`, `inspect`) ([configuration.md](../configuration.md)).
- `editor.selection`, `editor.deleteSelection()`, `editor.canEdit`, event `selectionchange` ([api.md](../api.md)).
- `createHighlightStyle`, `HIGHLIGHT_LAYER_PROPERTY` (exported).

## Open questions

- Box selection ignores editability and picks from every visible editor layer. Should there be an option to restrict selection to the active layer, or to editable layers only?
- Should the inspect selection be limited to layers with a schema, since its purpose is viewing attributes?
- Lasso: reuse `ol/interaction/Draw` with `freehand` or write a small custom interaction?

## Source

- `src/core/selection/Selection.ts`
- `src/core/tools/editableSelection.ts`
- `src/core/tools/select.ts` (`createSelectInteraction`, `createBoxSelectInteraction`)
- `src/core/tools/layerFilter.ts`
- `src/core/Editor.ts` (`deleteSelection`, inspect interaction, pruning)
