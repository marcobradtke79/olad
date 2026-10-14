# Templates

**Status:** implemented (2026-10-13). Requested by the project owner on 2026-10-13: copy a feature or a group with a base point, keep it under a name in a Templates panel and insert it from there. Decided with the owner: session lifetime with JSON export / import for the host, name asked in the command line, the offset tool's target rule, repeated inserts until Escape without the attribute popup.

## Purpose

CAD blocks for a map editor: a standard junction, a building with its trees, a group of lamps drawn once and placed many times. It is the planned **Copy** of the [construction tools](construction-tools.md), extended into a small library, so a copy can be placed again later and elsewhere, and a host can keep the library between sessions.

## Model

**Store** (`TemplateStore`, `editor.templates`)

- A template is a name, a base point and objects: each with its source layer id, a cloned geometry and deep-copied attributes (without the geometry and the layer's id property). Geometries and base point are in the view projection.
- Ids `tpl-1`, `tpl-2` ...; names default to the next free `Template <n>`.
- Session only: the core never touches storage ([decision](../../CLAUDE.md), core rule). `export()` gives plain JSON (GeoJSON geometries and base in EPSG:4326, `version: 1`), `import()` validates everything first (errors name the path) and gives colliding ids fresh ones. The test page persists to `localStorage` on every `templatechange`.
- [Projections](projections.md): `setProjection` transforms every stored geometry and base point with the features.

**Placing a copy** (`placed`, `templateInsertCommand`)

- Translated so the base point lands on the insertion point, then scaled by `unitsPerMetre(at) / unitsPerMetre(base)` ([measurement](measurement.md)): in Web Mercator a copy keeps its size in metres at another latitude; in projected CRS the ratio is 1.
- Target layer per object ([layers and editability](layers-and-editability.md)): the source layer when it exists, allows `insert` and takes the type (`drawType`, `Any` takes all), else the active layer, else the draft layer; objects without a target are skipped.
- One composite of `insertFeature` commands per copy ([editing](editing.md)): validated all or nothing, one undo step. Attributes are the copied ones over the target layer's schema defaults, geometries wrapped for multi-part layers.
- Each insert carries `template: id`; `featureinsert` passes it on and the popup [attribute](attributes.md) form stays closed for such copies.

**Tools**: [template copy tool](tool-template-copy.md) stores, [template insert tool](tool-template-insert.md) places.

**Panel** ([UI shell](ui-shell.md)): `<olcad-template-list>` lists the templates (name, object count, source layers) with Insert (starts the insert tool), Rename (inline) and Remove, plus a Copy to template button.

## Related

- [Template copy tool](tool-template-copy.md): creates templates from the selection.
- [Template insert tool](tool-template-insert.md): places copies at clicked or typed points.
- [Moving drafts](draft-move.md): copies placed into the draft layer keep their attributes when moved into a layer.
- [Construction tools](construction-tools.md): templates deliver the planned Copy.
- [Editing](editing.md): one composite of inserts per copy, flagged with the template id.
- [Attributes](attributes.md): copies keep their attributes; no popup for them.
- [Layers and editability](layers-and-editability.md): the source → active → draft target rule.
- [Projections](projections.md): the store is reprojected with the features.
- [Measurement](measurement.md): the scale ratio keeps metres across latitudes in Web Mercator.
- [UI shell](ui-shell.md): the Templates panel.
- [Mirror tool](tool-mirror.md): shares the target rule and `copyProperties` for its copies.

## Surface

- `editor.templates` (`list`, `get`, `create`, `rename`, `remove`, `suggestName`, `canInsert`, `insert`, `export`, `import`), event `templatechange`, `featureinsert.template`, exported `TemplateImportError` and the template types ([api.md](../api.md#editortemplates)).
- `<olcad-template-list>` ([ui.md](../ui.md#olcad-template-list)).

## Open questions

- Rotation and scaling while inserting (typed angle, straightedge alignment), as CAD block insertion offers?
- Should a template remember the target layer chosen at insert time, or offer a layer choice per insert?
- A shared, server-side template library (read-only templates offered by the host) next to the user's own?
- Nested templates (a template containing another) are not modelled; is that needed?

## Source

- `src/core/templates/TemplateStore.ts`
- `src/core/templates/insert.ts`
- `src/core/tools/templateCopy.ts`
- `src/core/tools/templateInsert.ts`
- `src/ui/elements/OlcadTemplateList.ts`
