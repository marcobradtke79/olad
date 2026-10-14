# Attributes

**Status:** partial (2026-10-12). Schema per layer, defaults on insert, the generated form and the popup after an insert exist. Core validation of values (milestone 7) and translated labels (milestone 8) are planned.

## Purpose

An object class has attributes, and a CAD-style workflow captures them right after placing the object: click to place a hydrant, the dialog asks for its type and year. The schema is configuration, so the host describes fields once and gets validation and a form without writing UI. Changes to attributes are commands like any other, so they are undoable and part of the change set.

## Model

**Schema**

- `layers[].schema.fields[]`: `name`, `type` (`string`, `number`, `integer`, `boolean`, `enum`, `date`), `required`, `default`, `values` (enum), `min` / `max`, `pattern`, `readOnly`.
- One schema per layer; the draft layer has none.

**Defaults**

The [draw tool](tool-draw.md) applies every field's `default` before submitting the insert, so a new feature is complete enough to be valid.

**The form**

- Generated for the **single** selected feature from its layer's schema: one control per field, type-mapped, `required` and `readOnly` honoured, browser validation only (`reportValidity`).
- Apply converts values and submits **one** `updateProperties` with the changed fields only (empty input removes a property) through [editing](editing.md); a rejection shows inline. Reset re-reads the feature.
- The form follows the [selection](selection.md) and re-renders on `change` (undo / redo), except while the user is typing.
- Controls are disabled outside edit mode or when `canEdit('update')` is false, with a hint saying why.

**Popup after insert**

1. A command inserts a feature; the pipeline emits `change`, then `featureinsert { layer, feature, template? }` (template copies carry `template` and open no popup).
2. `<olcad-attribute-form popup>` opens a modal dialog for it when the layer has schema fields (never for the draft layer), first input focused.
3. Save applies and closes; Later closes and keeps the attributes; the dialog skips a feature that disappeared (undo).
4. Several inserts of one command (mirrored copies, a split line) are queued (2026-10-13): the dialog shows them one after another with the progress "1 of 3"; Save and Later move on, Escape closes for all.
5. The draw tool has selected the feature meanwhile, so a docked form shows it too.

**Inspect and reveal**

Outside edit mode a click selects for inspection; with the `reveal` attribute the form opens the flyout panel it sits in, so attributes appear without a tab click. A [draft move](draft-move.md) opens it too, on the moved objects (event `draftmove`, 2026-10-13).

**Planned**

- Core validation of values on insert and update ([validation](validation.md), milestone 7), so API users and the form get the same rules and codes.
- Translated field labels and messages (milestone 8); `title` per field is the likely shape.
- A read-only computed field (for example `area_m2`) filled by the editor from the geometry, as the configuration example in CLAUDE.md section 5 suggests.

## Related

- [Text tool](tool-text.md): the popup opens for a new text with its text fields filled in.
- [Validation](validation.md): attribute rules move into the core with milestone 7.
- [Selection](selection.md): the form edits the single selected feature; `reveal` reacts to an inspect selection.
- [Moving drafts](draft-move.md): a draft object gets a hint pointing to the Layers panel; after a move the form opens on the moved objects (`draftmove`).
- [Draw tool](tool-draw.md): applies schema defaults and selects the inserted feature so the form can capture values.
- [Editing](editing.md): Apply is one `updateProperties`; `featureinsert` opens the popup.
- [Layers and editability](layers-and-editability.md): the schema belongs to the layer; no popup for the draft layer.
- [UI shell](ui-shell.md): the form is a custom element bound with `element.editor`; popup and docked forms can coexist.
- [Rectangle tool](tool-rectangle.md): applies schema defaults; the popup opens after the insert.
- [Circle tool](tool-circle.md): applies schema defaults; the popup opens after the insert.
- [Regular polygon tool](tool-regular-polygon.md): applies schema defaults; the popup opens after the insert.
- [Offset tool](tool-offset.md): applies schema defaults to the copy; the popup opens after the insert.
- [Curve tool](tool-curve.md): applies schema defaults; the popup opens after the insert.
- [Trim tool](tool-trim.md): a split-off part is inserted with the original's attributes.
- [Templates](templates.md): copies keep their attributes; the popup stays closed for them.
- [Template insert tool](tool-template-insert.md): its copies open no popup.
- [Mirror tool](tool-mirror.md): its copies open the popup, one after another.
- [Table view](table-view.md): shows the schema fields of all objects of a layer as columns; the form edits the row selected there.
- [Local layers](local-layers.md): the user defines the schema in the layer dialog; the form works as for configured layers.
- [Import](import.md): inferred fields for new layers, schema fields only for existing ones; no popup for imported objects.

## Surface

- Config `layers[].schema` ([configuration.md](../configuration.md)).
- Event `featureinsert`, command `updateProperties` ([api.md](../api.md)).
- `<olcad-attribute-form>` with `popup` and `reveal` ([ui.md](../ui.md)).

## Open questions

- Should the popup be cancellable in a way that **removes** the feature (true cancel) instead of keeping it with defaults? CAD users expect Escape to abort the placement.
- Where do computed fields (area, length) get updated: on every geometry command in the core, or on export only?

## Source

- `src/ui/elements/OlcadAttributeForm.ts`
- `src/core/tools/draw.ts` (`defaultProperties`)
- `src/core/config/types.ts` (`SchemaConfig`, `FieldConfig`)
- `src/core/changes/Editing.ts` (`featureinsert` emission)
