# Validation

**Status:** partial (2026-10-12). Geometry validity, editability and identity checks with translated messages exist. Attribute validation against the layer schema in the core is planned for milestone 7; today only the browser validates form input.

## Purpose

A rejected command changes nothing. Validation is the first stage of the [editing](editing.md) pipeline and the only one allowed to say no: it keeps invalid geometry, forbidden operations and (later) invalid attribute values out of the data and therefore out of the change set. It speaks in stable machine codes for the host and translated messages for people.

## Model

**When**

Before apply, over all atomic commands of a composite, all or nothing. The result is `validationerror { code, message, command, layer?, featureId? }` and `execute` returning `false`.

**Rules today**

| Code                   | Rule                                                                          |
| ---------------------- | ----------------------------------------------------------------------------- |
| `layer-unknown`        | Insert into a layer that does not exist.                                      |
| `feature-not-in-layer` | Update or delete of a feature no editor layer holds.                          |
| `feature-without-id`   | Loaded feature without an id cannot be updated or deleted (set `idProperty`). |
| `not-editable`         | Layer flags or predicate forbid the operation (pending inserts excepted).     |
| `geometry-type`        | Geometry type does not match the layer; `Any` accepts the six simple types.   |
| `empty-geometry`       | No geometry or no coordinates.                                                |
| `too-few-vertices`     | Line with fewer than 2, ring with fewer than 4 (closure included).            |
| `ring-not-closed`      | First and last ring vertex differ.                                            |
| `zero-length-segment`  | Two consecutive identical vertices.                                           |
| `self-intersection`    | Two non-adjacent ring segments intersect.                                     |

Geometry validity only: no topology between features (no shared-vertex rules, no gap or overlap checks), by decision (CLAUDE.md section 2).

**Messages**

- Lookup order per code: host override (`config.messages[code]`) → `config.locale` → `en` → the code itself; `{param}` placeholders are filled from the issue's params.
- `en` and `de` ship. The same mechanism serves the [numeric input](numeric-input.md) error codes (`input-*`).

**Planned (milestone 7): attribute validation**

- Against the layer schema on `insertFeature` and `updateProperties`: `type`, `required`, `enum` values, `min` / `max`, `pattern`, `readOnly` (a change to a read-only field is rejected).
- Codes in the same style (`field-required`, `field-type`, `field-enum`, `field-range`, `field-pattern`, `field-read-only`), with `field` in the params, so the [attribute form](attributes.md) can mark the offending control.
- Defaults are applied by the draw tool before validation, so a schema with a required field and a default stays insertable without a dialog.

## Related

- [Moving drafts](draft-move.md): the copy is validated against the target layer.
- [Editing](editing.md): validation is stage one of `execute`.
- [Change tracking](change-tracking.md): only validated state is exported.
- [Layers and editability](layers-and-editability.md): editability, geometry type and (later) schema come from the layer.
- [Attributes](attributes.md): the form relies on browser validation today and on core validation from milestone 7.
- [Modify tool](tool-modify.md): a rejected vertex edit snaps back to the pre-drag geometry.
- [Numeric input](numeric-input.md): its error codes use the same message lookup.
- [Circle tool](tool-circle.md): the linearized ring is validated like any polygon before the insert.
- [Ellipse tool](tool-ellipse.md): the linearized ring is validated like any polygon before the insert.
- [Regular polygon tool](tool-regular-polygon.md): the ring is validated like any polygon before the insert.
- [Offset tool](tool-offset.md): a self-intersecting copy is rejected; the tool keeps asking for the side.
- [Curve tool](tool-curve.md): the linearized line is validated like any line before the insert.
- [Trim tool](tool-trim.md) and [Extend tool](tool-extend.md): their results are validated; a rejected click keeps the boundary.
- [Template insert tool](tool-template-insert.md): a rejected copy changes nothing and shows a notice.
- [Mirror tool](tool-mirror.md): a rejected mirror keeps the copy question.
- [Import](import.md): invalid geometries of a file are filtered out and counted before the command.

## Surface

- Config `locale`, `messages` ([configuration.md](../configuration.md)).
- Event `validationerror`, exported `validateGeometry`, `MESSAGES`, `formatMessage` ([api.md](../api.md#validation)).
- `<olcad-input-bar>` and `<olcad-attribute-form>` show the messages ([ui.md](../ui.md)).

## Open questions

- Should a self-intersecting _line_ (not ring) be rejected? Today only rings are checked, which matches most GIS backends.
- Should validation be configurable per layer (for example allow unclosed rings for sketch layers), or stay fixed?

## Source

- `src/core/geometry/validity.ts`
- `src/core/geometry/intersect.ts`
- `src/core/changes/Editing.ts` (`validate`)
- `src/core/i18n.ts`
