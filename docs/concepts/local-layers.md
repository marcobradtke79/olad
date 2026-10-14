# Local layers

**Status:** implemented (2026-10-13). Requested by the project owner on 2026-10-13: users add their own layers in the client, choosing the geometry type and the attributes, kept with the browser's storage. Decided with the owner: never in the change set, IndexedDB as storage, and a local layer can be renamed, get new attributes and be deleted after creation.

## Purpose

Working layers the backend knows nothing about: a sketch of planned trees, notes from a site visit, a construction aid kept for next week. They behave like configured layers for every tool, but live only in this browser, so nothing is sent to the server and no server configuration is needed.

## Model

**Definition**

- A local layer has a title, one geometry type (Point, LineString, Polygon or a multi-part form; not `Any`) and a schema of fields with the same rules as a configured layer's [attributes](attributes.md). Field names are identifiers (letters, digits, underscores, not starting with a digit, not `geometry`).
- Created layers get the ids `local-1`, `local-2` ... and are added after the configured layers; they are fully editable (insert, update, delete) and snappable ([layers and editability](layers-and-editability.md)). `LayerInfo.local` marks them.

**Untracked**

- Like the draft layer, local layers are untracked: [editing](editing.md) runs every command through validation and the undo history, but the [change tracker](change-tracking.md) skips them, so their objects never appear in the change set, `accept` and `discard` leave them alone.
- Objects can be moved into server layers with [moving drafts](draft-move.md) only when they are in the draft layer; copying a local object into a server layer is planned (see open questions).

**Changing a layer**

- `rename` changes the title.
- `setFields` replaces the attributes; renamed fields move their values on every object, removed fields delete theirs. These property changes are not commands: they bypass the undo history (an undo of an earlier attribute edit can bring back an old value under the old name).
- The geometry type cannot change after creation.
- `remove` deletes the layer with its objects (the dialog asks for a second click).

**Storage**

- The core keeps local layers in memory and never touches storage (core rule). `export()` gives plain JSON (definition plus a GeoJSON FeatureCollection in EPSG:4326 per layer); `import()` validates everything first and restores them; objects get fresh ids (`loc-<n>`), so they never collide with the `tmp-<n>` ids of new inserts.
- The UI package's `persistLocalLayers` imports the stored JSON from IndexedDB at start and saves after every local layer change, command, undo and redo (debounced) and when the page is hidden. Any `{ load, save }` adapter can replace IndexedDB.
- [Projections](projections.md): local objects keep no originals in a data projection; a projection switch transforms them like draft objects.

**UI** ([UI shell](ui-shell.md))

1. Layers panel → New layer: the `<olcad-layer-editor>` dialog asks for the name, the geometry type and the attribute rows (name, type, label, required, enum values, default).
2. The new row (marked "local") works like every row: visibility, highlight, [table view](table-view.md), Edit, info.
3. Its Settings button opens the same dialog for name, attributes and delete.

## Related

- [Layers and editability](layers-and-editability.md): local layers are ordinary layers, fully editable, created at runtime and marked `local`.
- [Change tracking](change-tracking.md): local layers are untracked, like the draft layer.
- [Editing](editing.md): commands on local objects are validated and undoable but not tracked; `setFields` bypasses the history.
- [Attributes](attributes.md): the user defines the schema; the attribute form and its popup work as for configured layers.
- [Projections](projections.md): local objects are transformed on a projection switch without originals; storage is in EPSG:4326.
- [Moving drafts](draft-move.md): local layers take draft objects like any layer that allows inserts.
- [Table view](table-view.md): a local layer opens in the table like any layer.
- [UI shell](ui-shell.md): New layer and Settings buttons in the layer list, the layer dialog, the persistence helper.
- [Export](export.md): the way to take local layers out of the browser as GeoJSON, KML, GML or GPX.
- [Import](import.md): the default target of an import; one local layer per group of the file.
- [Layer styles](layer-styles.md): local layers are styled and ordered like any layer; their stored styles wait until they are loaded.

## Surface

- `editor.localLayers`, event `locallayerchange`, `layerchange` types `title` / `schema`, `LayerInfo.local`, `LOCAL_GEOMETRY_TYPES`, `LocalLayerImportError` ([api.md](../api.md#editorlocallayers)).
- `<olcad-layer-editor>`, the New layer and Settings buttons of `<olcad-layer-list>`, `persistLocalLayers`, `indexedDbStorage` ([ui.md](../ui.md#olcad-layer-editor)).

## Open questions

- Copy or move objects from a local layer into a server layer (like moving drafts), so a sketch can become real data?
- Export / import of one local layer as a file (GeoJSON download, upload), for exchange between browsers?
- Styles per local layer (colour picker in the dialog) instead of the default style?
- Text layers as local layers (`layers[].text`)?
- Should removing a field go through the undo history?

## Source

- `src/core/layers/local.ts`
- `src/core/layers/LayerManager.ts`
- `src/core/Editor.ts`
- `src/ui/elements/OlcadLayerEditor.ts`
- `src/ui/elements/OlcadLayerList.ts`
- `src/ui/localLayerStorage.ts`
