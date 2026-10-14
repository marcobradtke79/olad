# Editing

**Status:** implemented (2026-10-12). Commands, validation before apply, undo / redo, events and the snapshot-and-submit pattern for tools exist. Attribute validation inside the pipeline arrives with milestone 7 (see [validation](validation.md)).

## Purpose

Every mutation of a feature goes through exactly one path: a **command** submitted to `editor.execute`. Tools never write to features on their own, and neither should hosts. The single path is what makes the rest possible: validation before anything changes, one undo step per user action, a change set that always reflects the current state, and events the UI and the host can trust. "Editing" here is that pipeline; what it tracks for the backend is [change tracking](change-tracking.md).

## Model

**Commands**

- Atomic: `insertFeature(layer, feature)`, `updateGeometry(feature, geometry)`, `updateProperties(feature, props)` (an `undefined` value removes a property), `deleteFeature(feature)`.
- `composite(commands, label?)` groups several into one validated, one-step-undoable unit (a move of three objects, a delete of a selection). Composites nest; `flatten` yields the atomic commands.
- Commands are plain data: a tool or host builds them with the factories and hands them over.

**`execute(command)`**

1. **Validate** every atomic command first, all or nothing: layer exists, operation allowed by the layer's editability and predicate (`canEdit`, with the pending-insert exception from [layers and editability](layers-and-editability.md)), updated and deleted features have an id, inserted and updated geometries match the layer type and are valid ([validation](validation.md)).
2. On failure: nothing changed, `validationerror { code, message, command, layer?, featureId? }`, return `false`.
3. **Apply** each atomic command; each produces an undo record (previous geometry / properties, or the inserted / removed feature). Inserts get a temporary id `tmp-N`.
4. Push one history entry, clear the redo stack, emit `historychange` then `change` (the full current change set).
5. Emit `featureinsert { layer, feature }` for every inserted feature (not on redo), the hook for the attribute popup.

**Undo / redo**

- One entry per `execute`; a composite is reverted in reverse order and reapplied in order.
- Both emit `historychange` and `change`. `accept`, `discard` and layer removal clear both stacks.

**Draft objects**

Commands on the draft layer run through validation, apply and history like any other, but are **untracked**: the change tracker never sees them, so they stay local.

**Tools and in-place mutation**

The preferred way is to build the new geometry from a copy and execute it, as the modify tool does: the feature changes only when the command is applied. When an OpenLayers interaction mutates geometries in place (the move tool translates them for its result), the tool follows one pattern: snapshot the geometries before, let the interaction mutate, then **restore** the originals and submit the new geometries as one `updateGeometry` (or a composite) through `execute`. The pipeline sees a proper before / after, validation can reject, and one action is one undo step (`snapshot` and `submitGeometryChanges` in the modify module are reusable).

**Events as the contract**

`change` after every command, undo, redo, accept and discard is the one event a host needs for a dirty flag or a live change-set view. `validationerror` is the one place rejected input surfaces. Selection and tool state are not part of the history.

## Related

- [Change tracking](change-tracking.md): consumes every applied command to derive the net change set; `accept` / `discard` live there.
- [Validation](validation.md): the first stage of `execute`; a rejection emits `validationerror`.
- [Moving drafts](draft-move.md): one composite of a delete in the draft layer and an insert into the target.
- [Layers and editability](layers-and-editability.md): `canEdit` and the layer's geometry type are checked; draft-layer commands are untracked.
- [Projections](projections.md): undo records hold view-projection geometries and are reprojected on a switch.
- [Selection](selection.md): Delete submits one command for the deletable selection; the selection is pruned after every `change`.
- [Tools framework](tools.md): tools receive `ctx.execute` and must not mutate features otherwise.
- [Draw tool](tool-draw.md): submits one `insertFeature` per drawing.
- [Modify tool](tool-modify.md): one command per placed or removed vertex, built from a copy without in-place mutation.
- [Move tool](tool-move.md): one `updateGeometry` or composite per move.
- [Rotate tool](tool-rotate.md): one `updateGeometry` or composite per rotation.
- [Construction tools](construction-tools.md): every planned tool ends in a command, usually a composite.
- [Attributes](attributes.md): the form submits one `updateProperties` with the changed values.
- [Rectangle tool](tool-rectangle.md): one `insertFeature` per rectangle.
- [Circle tool](tool-circle.md): one `insertFeature` per circle, with the linearized ring.
- [Regular polygon tool](tool-regular-polygon.md): one `insertFeature` per polygon.
- [Offset tool](tool-offset.md): one `insertFeature` per copy; a self-intersecting copy is rejected.
- [Curve tool](tool-curve.md): one `insertFeature` per curve, with the linearized line.
- [Trim tool](tool-trim.md): one `updateGeometry` per click, or a composite of update and insert when a line is split.
- [Extend tool](tool-extend.md): one `updateGeometry` per click.
- [Templates](templates.md): one composite of inserts per copy; inserts carry the template id.
- [Template insert tool](tool-template-insert.md): executes one composite per copy.
- [Mirror tool](tool-mirror.md): one composite of updates or of inserts per mirror.
- [Scale tool](tool-scale.md): one update or composite per scale.
- [Table view](table-view.md): refreshes after every command, undo and redo; later inline cell edits are `updateProperties` commands.
- [Local layers](local-layers.md): their commands are validated and undoable but untracked; attribute changes from `setFields` bypass the history.
- [Import](import.md): one composite of inserts per import, flagged `imported`.

## Surface

- `editor.execute`, `undo`, `redo`, `canUndo`, `canRedo`, `canEdit`, command factories, events `change`, `validationerror`, `historychange`, `featureinsert` ([api.md](../api.md), [change-set.md](../change-set.md#commands)).
- Undo / Redo buttons and shortcuts ([ui.md](../ui.md)).

## Open questions

- Should a host be able to veto or transform a command before apply (a `beforeexecute` hook, for example to assign ids or enforce business rules)? Not in v1 scope; note it when a host asks.
- History depth is unbounded. Decide a limit or leave it to the host.

## Source

- `src/core/changes/commands.ts`
- `src/core/changes/Editing.ts`
- `src/core/tools/modify.ts` (`snapshot`, `submitGeometryChanges`)
- `src/core/Editor.ts` (`execute`, `undo`, `redo`, event emission)
