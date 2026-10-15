# Change set

Every edit goes through a command (`editor.execute`). The editor keeps an undo / redo history and a snapshot of each feature's original state at its first touch. The change set is derived by comparing the current state with those snapshots, so it always holds the **net** change per feature, no matter how many commands led there.

```ts
editor.changes.get(); // the current change set
editor.changes.hasChanges();
editor.on('change', (changeSet) => {}); // after every command, undo, redo, accept and discard
editor.changes.accept({ idMap: { 'tmp-1': 9001 } }); // after a successful save
editor.changes.discard(); // revert everything to the baseline
editor.undo();
editor.redo();
```

## Format

```json
{
  "version": 1,
  "crs": "EPSG:4326",
  "changes": [
    {
      "op": "insert",
      "layer": "parcels",
      "crs": "EPSG:4326",
      "tempId": "tmp-1",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [8.4, 49.0],
            [8.41, 49.0],
            [8.41, 49.01],
            [8.4, 49.0]
          ]
        ]
      },
      "properties": { "owner": "Doe" }
    },
    {
      "op": "update",
      "layer": "parcels",
      "crs": "EPSG:4326",
      "id": 4711,
      "geometry": { "type": "Polygon", "coordinates": [] },
      "properties": { "usage": "commercial" },
      "changed": ["geometry", "usage"]
    },
    { "op": "delete", "layer": "trees", "crs": "EPSG:25832", "id": 815 }
  ]
}
```

- `version` is `1`.
- Every change carries its own `crs`: the layer's data projection (configured `dataProjection`, else the projection detected when the layer was loaded, else `EPSG:4326`), or the value of `changes.crs` when the configuration forces one. The top-level `crs` is present only when all changes share one projection. Backends therefore get coordinates back the way they served them.
- `geometry` is GeoJSON in that `crs`. `changes.precision` limits the decimal places.
- `insert`: `tempId` identifies the new feature until the backend assigns an id (see accept). `properties` holds all properties.
- `update`: `properties` holds only changed properties (a removed property is `null`), `geometry` is present only when it changed, and `changed` lists `'geometry'` and the changed property names. With `changes.fullFeatures: true` the geometry and all properties are always included; `changed` still lists what actually changed.
- `delete`: `id` only.
- The set is plain data: `JSON.parse(JSON.stringify(set))` equals `set`.

### Dimension objects

Objects of a dimension layer ([`layers[].dimension`](configuration.md#layersdimension-object-form)) are ordinary features in the change set: the geometry is a `LineString` with the two measured points, and the properties hold the dimension data, so the backend stores them like any other attribute:

```json
{
  "op": "insert",
  "layer": "dimensions",
  "tempId": "tmp-3",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [8.4031, 49.0071],
      [8.4034, 49.0071]
    ]
  },
  "properties": { "dimType": "aligned", "offset": 2, "fieldValue": 21.47, "text": null }
}
```

Setting a field value later is an `update` with `changed: ["fieldValue"]`. The GIS value is computed from the geometry when the dimension is drawn and is not part of the change set unless a property `gisValue` is set.

## Collapse rules

| Sequence                             | Net result                        |
| ------------------------------------ | --------------------------------- |
| insert, then update(s)               | one `insert` with the final state |
| insert, then delete                  | nothing                           |
| update, then update                  | one `update`                      |
| update(s), then delete               | one `delete`                      |
| update(s) back to the original state | nothing                           |
| undo of every command                | nothing (the history stays)       |

## Commands

```ts
import { insertFeature, updateGeometry, updateProperties, deleteFeature, composite } from 'ol-cad';

editor.execute(insertFeature('parcels', feature)); // feature: ol/Feature in the view projection
editor.execute(updateGeometry(feature, newGeometry));
editor.execute(updateProperties(feature, { usage: 'commercial', note: undefined })); // undefined removes
editor.execute(deleteFeature(feature));
editor.execute(composite([deleteFeature(a), insertFeature('parcels', b)], 'replace'));
```

`execute` validates first: the layer must exist, the operation must be allowed by the layer's `editable` config (including the predicate; a feature inserted and not yet accepted may always be updated and deleted, because its net change stays an insert or disappears), updated and deleted features must have an id, and inserted or updated geometries must match the layer's geometry type and be valid (closed rings, minimum vertex counts, no zero-length segments, no self-intersecting rings). A rejected command changes nothing; `execute` returns `false` and the editor emits `validationerror` with a code and a message (see [api.md](api.md#validation)). A composite is validated as a whole and undone or redone as one step.

Copies inserted from a template (`editor.templates.insert`, the `template-insert` tool) are ordinary `insert` changes, one composite per copy; the change set does not record that they came from a template.

## Accept and discard

- `accept({ idMap })` after a successful save: inserted features get the ids from `idMap` (keys are `tempId`s; a missing entry keeps the temporary id), the current state becomes the new baseline (including the original-geometry store used for loss-free reprojection), and the history is cleared.
- `discard()` reverts every touched feature to the baseline: inserted features are removed, deleted ones come back, updated ones get their original geometry and properties. The history is cleared.

## Limitations

- Loaded features without an id can only be the target of inserts (new features always get a `tempId`). Set `idProperty` on the layer or make sure the format carries ids.
- Removing a layer (`editor.layers.remove`) drops its tracked changes and clears the whole history.
- **Local layers and the draft layer are not part of the change set.** Objects in the draft layer (config `draft`, where objects drawn without an active layer go) and in local layers (`editor.localLayers`, the layer list's New layer) stay in the client: they never appear in `get()`, `hasChanges()` ignores them and `accept` / `discard` leave them in place. Their edits still go through commands, so undo / redo work and `change` fires, but with a change set that does not contain them. A count of unsaved changes therefore stays at 0 while a user only draws into local layers.
- A projection switch keeps edits, snapshots and the history consistent; layers with `strategy: 'bbox'` reload after a switch and skip features deleted locally.

## Saving

The library ships no transport. The reference implementation is the test page (`test-server/public/index.html`): it `POST`s `editor.changes.get()` with `fetch`, calls `editor.changes.accept({ idMap })` on success and keeps the changes on failure so the user can retry.
