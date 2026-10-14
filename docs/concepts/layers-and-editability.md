# Layers and editability

**Status:** implemented (2026-10-12). Per-layer and per-operation rules, the predicate, the active layer and the draft layer exist. Multi-part editing granularity is undecided.

## Purpose

In a CAD-style GIS editor every object belongs to exactly one object class: a layer with one geometry type, one attribute schema and one set of editing rights. The host decides per layer whether objects may be inserted, updated or deleted, and may refine that per feature with a predicate. Read-only layers still matter as drawing aids: they can be snapped to and selected for inspection. Two layers have a special role for tools: the **active layer** is where new objects go, and the **draft layer** catches sketches drawn while no layer is active.

## Model

**Object class**

- A layer = one geometry type (`Point`, `LineString`, `Polygon`, their `Multi*` forms, or `Any`), one schema, one editability, one `snappable` flag, one style. Features in memory are always in the view projection (see [projections](projections.md)).
- `editable` is `true`, `false` or `{ insert, update, delete, predicate }`; `predicate(feature, operation)` refines `update` and `delete` per feature.
- `snappable` is independent of editability: a read-only cadastre is the most common snap target.

**The pending-insert exception**

A feature inserted and not yet accepted may always be updated and deleted, whatever the layer's `update` / `delete` flags say, because its net change stays an insert or disappears (see [change tracking](change-tracking.md)). `editor.canEdit(operation, feature)` encodes this and is the single question tools, Delete and the attribute form ask.

**Active layer**

1. `layers.setActive(id | null)` names the insert target; `activelayerchange` follows.
2. The [draw tool](tool-draw.md) follows it: when the active layer changes while drawing, the tool re-activates for the new layer (keeping the geometry type when allowed), or deactivates when the new layer forbids inserts.
3. Removing the active layer resets it to `null` first.
4. The layer list's Edit button is the shortcut: edit mode on, layer active; no tool is started (2026-10-13; it replaced the Insert button, which also started drawing).

**Draft layer**

- Config `draft` (on by default) adds a local layer after the configured ones, with `geometryType: 'Any'`, fully editable and snappable. It is not part of `config.layers`; `layers.getDraft()` returns its id.
- While no layer is active, the draw tool targets it, and the type comes from the tool options (`Point` by default).
- Draft objects are validated, selectable, snappable, editable and undoable like any feature, but the editing pipeline runs them **untracked**: they never reach the change tracker, so they are absent from the change set, `hasChanges()` ignores them and `accept` / `discard` leave them in place. They are sketches, construction lines and scratch geometry.
- They have no schema, so no [attribute](attributes.md) popup opens for them.

**Runtime changes**

Layers, visibility, editability and snappability can change at runtime through `editor.layers`; every change emits `layerchange`. Removing a layer drops its tracked changes and clears the history (see [editing](editing.md)).

## Related

- [Text tool](tool-text.md): the `text` layer option makes point layers text layers; the draft layer is one.
- [Parallel tool](tool-parallel.md): needs a line-capable target layer; read-only objects can be references.
- [Draw tool](tool-draw.md): resolves its target layer and geometry type from the active layer, else the draft layer.
- [Moving drafts](draft-move.md): a draft object can be moved into a layer that allows inserts and takes its geometry type.
- [Editing](editing.md): `canEdit` is checked before every command; the draft layer is untracked.
- [Change tracking](change-tracking.md): the pending-insert exception follows from net-change collapse; draft objects are never exported.
- [Validation](validation.md): the `not-editable` and `geometry-type` rules come from the layer configuration.
- [Selection](selection.md): read-only features can be selected and inspected; Delete filters by `canEdit('delete')`.
- [Snapping](snapping.md): `snappable` layers, visible ones only, provide the candidates.
- [Attributes](attributes.md): the schema belongs to the layer; defaults apply on insert.
- [Projections](projections.md): the layer's data projection is kept with each original geometry for loss-free export.
- [UI shell](ui-shell.md): the layer list shows visibility, highlight, Edit and info buttons per layer (editability in the details); the toolbar shows the active layer.
- [Rectangle tool](tool-rectangle.md): needs a polygon-capable target layer; falls back to the draft layer.
- [Circle tool](tool-circle.md): needs a polygon-capable target layer; falls back to the draft layer.
- [Ellipse tool](tool-ellipse.md): needs a polygon-capable target layer; falls back to the draft layer.
- [Regular polygon tool](tool-regular-polygon.md): needs a polygon-capable target layer; falls back to the draft layer.
- [Curve tool](tool-curve.md): needs a line-capable target layer; falls back to the draft layer.
- [Offset tool](tool-offset.md): inserts into the source layer, else the active layer, else the draft layer, whichever allows inserts and takes the type; read-only sources are allowed.
- [Trim tool](tool-trim.md) and [Extend tool](tool-extend.md): boundaries may be read-only; changed lines need `update`, a split also `insert`.
- [Layer highlight](layer-highlight.md): per-layer highlight state next to visibility; the overlay follows visibility and is removed with the layer.
- [Templates](templates.md): copies go to the source layer, else the active layer, else the draft layer.
- [Template insert tool](tool-template-insert.md): applies the template target rule per object.
- [Mirror tool](tool-mirror.md): read-only objects only as copies; copies use the template target rule.
- [Table view](table-view.md): a Table button per layer row opens one layer's objects as rows; editability limits what the table may change.
- [Local layers](local-layers.md): layers the user creates in the client, fully editable, marked `local` and untracked.
- [Export](export.md): any layer can be exported, whatever its editability.
- [Import](import.md): an existing target must allow inserts and take the group's geometry type.
- [Layer styles](layer-styles.md): user styles and drawing order are per-layer view state; `list()` follows the order.

## Surface

- Config `layers[]` (`geometryType`, `editable`, `snappable`, `schema`, `idProperty`, `source`), `draft` ([configuration.md](../configuration.md)).
- `editor.layers` (`getActive`, `setActive`, `getDraft`, `canEdit`, `setEditable`, `setSnappable`, ...), `editor.canEdit`, events `layerchange`, `activelayerchange` ([api.md](../api.md)).
- `<olcad-layer-list>` ([ui.md](../ui.md)).

## Open questions

- Multi-part geometries: edited as a whole (today: one part per drawing is wrapped into the multi geometry, modify edits all parts) or per part? (CLAUDE.md section 14.)
- Should the draft layer offer a "promote to layer" action that re-inserts a draft object into the active layer with schema defaults?
- Should `setActive` be allowed to point at a layer that forbids inserts (today it is allowed; the draw tool then cannot activate)?

## Source

- `src/core/layers/LayerManager.ts`
- `src/core/layers/vector.ts`
- `src/core/tools/draw.ts` (`drawTarget`)
- `src/core/changes/Editing.ts` (`canEdit`, `isTracked`)
- `src/core/config/types.ts` (`LayerConfig`, `EditableConfig`, `DraftConfig`)
