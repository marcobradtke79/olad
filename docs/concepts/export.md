# Export

**Status:** implemented (2026-10-14). Requested by the project owner on 2026-10-14: File → Export… asks which layers to export and writes GeoJSON or an XML format created in the browser. Decided with the owner: one combined file for several layers, formats GeoJSON, KML, GML 3.2 and GPX.

## Purpose

Taking data out of the editor without the backend: hand a sketch to a colleague, open the parcels in a desktop GIS, put waypoints on a GPS device. It writes what the user sees, including unsaved edits and [local layers](local-layers.md), and is independent of saving.

## Model

**Steps** (`<olcad-export-dialog>`)

1. The host opens the dialog (test page: File → Export…).
2. The user ticks layers (those with objects are ticked first), picks a format and, for GeoJSON and GML, a coordinate system.
3. Export writes one file with `editor.exportLayers` and the browser downloads it; the dialog closes and reports the count.

**Rules**

- Every layer can be exported: configured (also read-only), draft and local; the features are copied, never changed.
- Several layers go into one file: GeoJSON marks each feature with its layer, KML gives each layer a Folder, GML 3.2 a feature type of its own, GPX mixes them (it has no layers).
- CRS: GeoJSON and GML in any registered [projection](projections.md) (default EPSG:4326, GML with latitude first as EPSG:4326 defines), KML and GPX always EPSG:4326. Coordinates are rounded to 7 decimals in degrees, 3 in metres.
- Format limits: GPX holds points and lines only (polygons and multi-points are skipped and counted); XML formats leave out attributes whose names are not element names and write object values as JSON text.
- Export is not a save: it never touches the [change set](change-tracking.md), and nothing is sent anywhere.
- The core produces the text (`editor.exportLayers`); the download is the UI's job, so a host can send the text elsewhere instead.

## Related

- [Layers and editability](layers-and-editability.md): any layer can be exported, whatever its editability.
- [Local layers](local-layers.md): the way to take local layers out of the browser.
- [Change tracking](change-tracking.md): export is independent of the change set; unsaved edits are included.
- [Projections](projections.md): GeoJSON and GML take any registered CRS; KML and GPX are EPSG:4326.
- [UI shell](ui-shell.md): the export dialog, opened from the host's File menu.
- [Table view](table-view.md): both show a layer's current objects; the table on screen, the export as a file.
- [Import](import.md): reads the exported files back; groups survive the round trip.

## Surface

- `editor.exportLayers`, `exportLayers`, `EXPORT_FORMATS` ([api.md](../api.md#export)).
- `<olcad-export-dialog>`, event `olcad-export`, `downloadFile` ([ui.md](../ui.md#olcad-export-dialog)).

## Open questions

- Export only the selected objects, or only those in the current view?
- A ZIP with one file per layer (needs a decision record for a zip writer)?
- Further formats: CSV with WKT geometry, DXF for CAD users?
- Export with the layer styles (KML styles)?

## Source

- `src/core/export/exportLayers.ts`
- `src/ui/elements/OlcadExportDialog.ts`
- `src/ui/download.ts`
