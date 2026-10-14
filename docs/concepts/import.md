# Import

**Status:** implemented (2026-10-14). Requested by the project owner on 2026-10-14: an import for the formats that can be read in the browser. Decided with the owner: the target is chosen per group in the dialog (new local layer by default, an existing layer that takes the objects, or skip), and a file is grouped by its own grouping first, then by geometry type.

## Purpose

Bringing data into the editor without the backend: a survey from a GPS device, a KML from Google Earth, a GML or GeoJSON from another system, or a file the [export](export.md) wrote earlier. It either keeps the data as working layers in the browser or feeds it into a server layer so it can be saved.

## Model

**Steps** (`<olcad-import-dialog>`)

1. The host opens the dialog (test page: File → Import…).
2. The user picks or drops a file. The core reads it into groups and the dialog lists them: name, geometry type, number of objects (and invalid ones), target.
3. Per group the user keeps **New local layer** (name editable), picks **Into {layer}** (only layers that take every object of the group are offered), or **Skip**.
4. Import inserts everything as one command; the dialog closes and reports the count.

**Reading**

- Formats: GeoJSON, TopoJSON, KML, GML 2 / 3 / 3.2, GPX — what OpenLayers reads in the browser. Detected by extension, else by content.
- CRS: from the file (GeoJSON `crs`, GML `srsName`), else EPSG:4326; a CRS that is not registered in the configuration ([projections](projections.md)) is refused with its code. Objects are read into the view projection; heights and measures are dropped (no Z editing).
- Groups: by the file's own grouping — the `layer` property of our GeoJSON export, TopoJSON objects, top-level KML folders, GML feature types — then by family (points, lines, polygons), since a layer has one geometry type. Single and multi parts of one family become the multi type.
- Attributes: names turned into identifiers (original kept as label), types inferred from the values (text values of KML and GML too).
- Geometry collections and objects without geometry are skipped; invalid geometries ([validation](validation.md)) are left out and counted, so one broken object does not block the file.

**Inserting**

- New local layer: created with the group's geometry type and inferred fields ([local layers](local-layers.md)); its objects stay out of the change set.
- Existing layer: needs insert permission and a fitting geometry type ([layers and editability](layers-and-editability.md)); objects get the layer's schema defaults overlaid with the file's values of the schema's fields ([attributes](attributes.md)); other attributes are dropped and reported. These objects are tracked in the [change set](change-tracking.md) and can be saved.
- All inserts run as one composite command ([editing](editing.md)): one undo step. Layers created by the import remain when it is undone, empty. If a target does not fit or validation rejects the command, nothing is imported and created layers are removed.
- Imported inserts carry `imported`, so the attribute popup does not open once per object.

## Related

- [Export](export.md): writes the files the import reads back; groups survive the round trip (GeoJSON `layer`, KML folders, GML feature types).
- [Local layers](local-layers.md): the default target; one local layer per group.
- [Layers and editability](layers-and-editability.md): an existing target must allow inserts and take the geometry type.
- [Editing](editing.md): one composite of inserts, one undo step.
- [Change tracking](change-tracking.md): imports into server layers are tracked; into local layers not.
- [Attributes](attributes.md): fields are inferred for new layers; into existing layers only schema fields are kept; no popup for imported objects.
- [Validation](validation.md): invalid geometries are filtered out before the command.
- [Projections](projections.md): the file's CRS must be registered; objects are read into the view projection.
- [UI shell](ui-shell.md): the import dialog, opened from the host's File menu.

## Surface

- `editor.import` (`read`, `targetsFor`, `apply`), event `import`, `featureinsert.imported`, `readImport`, `applyImport`, `IMPORT_FORMATS`, `ImportError` ([api.md](../api.md#import)).
- `<olcad-import-dialog>`, event `olcad-import` ([ui.md](../ui.md#olcad-import-dialog)).

## Open questions

- Mapping file attributes to differently named schema fields in the dialog (today only equal names are kept)?
- KMZ and zipped Shapefiles (need an unzip library and a decision record)?
- Merging several files at once, and importing very large files (progress, a cap)?
- Should the import select or zoom to the imported objects?

## Source

- `src/core/import/readImport.ts`
- `src/core/import/applyImport.ts`
- `src/ui/elements/OlcadImportDialog.ts`
