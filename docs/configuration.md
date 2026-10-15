# Configuration

`createEditor(config)` takes one plain object. Everything is JSON-compatible except the escape hatches `target` (may be an element), `map` (an OpenLayers map), `proj4` (the proj4 library), `layers[].source.loader` and `layers[].editable.predicate` (functions).

The configuration is validated at startup. Any problem throws a `ConfigError` whose `path` names the option, for example `config.basemaps[1].url`. Unknown options are errors. The same checks run for `editor.layers.add` and `editor.basemaps.add`.

A test compares the tables below against the `EditorConfig` type. Every option must have a row whose first column is the option path in backticks.

## Root

| Path             | Type                     | Default        | Description                                                                                                                                                                            |
| ---------------- | ------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `target`         | `string \| HTMLElement`  | –              | Element or element id to create the map in. Exactly one of `target` and `map` is required.                                                                                             |
| `map`            | `ol/Map`                 | –              | Existing OpenLayers map to attach to. Exactly one of `target` and `map` is required. When attaching, basemap layers are inserted below the host's layers and vector layers above them. |
| `view`           | object                   | see below      | Initial view. When attaching to an existing map and `view` is omitted, the host's view is kept. When present, the host's view is replaced.                                             |
| `projections`    | array                    | `[]`           | proj4 definitions registered before anything else is built. Codes declared here may be used everywhere a projection is expected.                                                       |
| `proj4`          | proj4 library            | global `proj4` | The proj4 module, required when `projections` is not empty. In a bundler, `import proj4 from 'proj4'` and pass it. With a script tag, loading proj4 before the editor is enough.       |
| `basemaps`       | array                    | `[]`           | Background maps. The first one is shown unless another has `visible: true`.                                                                                                            |
| `layers`         | array                    | `[]`           | Vector layers. One layer is one object class with one geometry type and one schema.                                                                                                    |
| `editMode`       | `boolean`                | `false`        | Start in edit mode. Switchable at runtime with `editor.setEditMode`; see [api.md](api.md#edit-mode).                                                                                   |
| `cursor`         | object                   | see below      | The edit-mode cursor: a CAD crosshair spanning the map with a pick box at its centre.                                                                                                  |
| `changes`        | object                   | see below      | Change set export options, see [change-set.md](change-set.md).                                                                                                                         |
| `locale`         | `'en' \| 'de'`           | `'en'`         | Language of validation messages.                                                                                                                                                       |
| `messages`       | `Record<string, string>` | `{}`           | Overrides for validation messages by code, with `{param}` placeholders; see [api.md](api.md#validation).                                                                               |
| `selection`      | object                   | see below      | Highlight of selected features (halo, stroke, vertex grips) and click selection outside edit mode.                                                                                     |
| `layerHighlight` | object                   | see below      | Style of highlighted layers (`editor.layers.setHighlighted`): all objects of a layer drawn in a colour distinct from the selection.                                                    |
| `snapping`       | object                   | see below      | Snapping of the pointer to existing geometry, see [tools.md](tools.md#snapping).                                                                                                       |
| `grid`           | object                   | see below      | Grid snap: the pointer snaps to a grid aligned with the view projection, see [tools.md](tools.md#snapping).                                                                            |
| `curves`         | object                   | see below      | Linearization of arcs and circles (chord tolerance in metres), see [tools.md](tools.md#circle).                                                                                        |
| `units`          | object                   | see below      | Default length unit for typed input and displayed lengths and areas, see [`units`](#units).                                                                                            |
| `constraints`    | object                   | see below      | Drawing constraints (angle lock), see [tools.md](tools.md#angle-lock).                                                                                                                 |
| `draft`          | object                   | see below      | The draft layer: target of inserts while no layer is active, see [tools.md](tools.md#draw).                                                                                            |

```ts
createEditor({
  target: 'map',
  view: { center: [0, 0], zoom: 2 },
  basemaps: [{ id: 'osm', type: 'osm' }],
});
```

## `view`

| Path              | Type                               | Default            | Description                                                                                                                                                            |
| ----------------- | ---------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `view.projection` | `string`                           | `'EPSG:3857'`      | View projection code. `EPSG:3857` and `EPSG:4326` are built in; other codes must be declared in `projections`. Can be switched at runtime with `editor.setProjection`. |
| `view.center`     | `[number, number]`                 | `[0, 0]`           | Initial centre in view projection units.                                                                                                                               |
| `view.zoom`       | `number`                           | `2`                | Initial zoom level.                                                                                                                                                    |
| `view.minZoom`    | `number`                           | OpenLayers default | Lowest reachable zoom. Must not exceed `maxZoom`.                                                                                                                      |
| `view.maxZoom`    | `number`                           | OpenLayers default | Highest reachable zoom.                                                                                                                                                |
| `view.rotation`   | `number`                           | `0`                | Rotation in radians, clockwise.                                                                                                                                        |
| `view.extent`     | `[number, number, number, number]` | unconstrained      | Extent that constrains panning, in view projection units.                                                                                                              |

```ts
view: { projection: 'EPSG:3857', center: [935100, 6276400], zoom: 16, minZoom: 2, maxZoom: 22 }
```

## `cursor`

| Path                 | Type      | Default     | Description                                                                                                                                     |
| -------------------- | --------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `cursor.crosshair`   | `boolean` | `true`      | In edit mode, draw the crosshair overlay on the map and hide the native cursor there. `false` keeps the normal cursor.                          |
| `cursor.pickBoxSize` | `number`  | `8`         | Side length in CSS pixels of the square at the crosshair centre. Will also be the selection hit tolerance of the select tool. Must be positive. |
| `cursor.color`       | `string`  | `'#1f2933'` | CSS colour of the lines and the pick box. Changeable at runtime with `editor.straightedge.setColor`.                                            |
| `cursor.pickColor`   | `string`  | `'#facc15'` | Pick box colour while a straightedge reference pick is running.                                                                                 |
| `cursor.angle`       | `number`  | `0`         | Initial straightedge angle in degrees, counter-clockwise from the screen x-axis. Changed at runtime with `editor.straightedge.setAngle`.        |

```json
{ "crosshair": true, "pickBoxSize": 8, "color": "#1f2933", "pickColor": "#facc15", "angle": 0 }
```

## `changes`

| Path                   | Type      | Default                      | Description                                                                                                                       |
| ---------------------- | --------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `changes.crs`          | `string`  | each layer's data projection | Force one coordinate system for every exported change. Must be a registered projection code.                                      |
| `changes.precision`    | `number`  | full precision               | Decimal places for exported coordinates (non-negative integer).                                                                   |
| `changes.fullFeatures` | `boolean` | `false`                      | Export the complete geometry and all properties of updated features instead of the changed parts only. `changed` is still listed. |

```json
{ "precision": 7, "fullFeatures": false }
```

## `selection`

| Path                    | Type      | Default                      | Description                                                                                                                                          |
| ----------------------- | --------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `selection.strokeColor` | `string`  | `'#22d3ee'`                  | Stroke colour of the highlight (and of the vertex grips).                                                                                            |
| `selection.strokeWidth` | `number`  | `3`                          | Stroke width in pixels.                                                                                                                              |
| `selection.fillColor`   | `string`  | `'rgba(34, 211, 238, 0.15)'` | Fill colour of selected polygons and points.                                                                                                         |
| `selection.pointRadius` | `number`  | `8`                          | Radius in pixels of selected points.                                                                                                                 |
| `selection.haloColor`   | `string`  | `'rgba(255, 255, 255, 0.6)'` | Colour of the halo drawn under the stroke and around points, for contrast on any basemap.                                                            |
| `selection.haloWidth`   | `number`  | `3`                          | Halo width in pixels on each side of the stroke; `0` draws no halo.                                                                                  |
| `selection.vertexSize`  | `number`  | `6`                          | Side length in pixels of the square grips drawn on every vertex of selected lines and polygons; `0` draws none.                                      |
| `selection.inspect`     | `boolean` | `true`                       | Clicking a feature while edit mode is off selects it (Shift+click toggles, a click on empty map clears), so attributes can be viewed without a tool. |

The highlight is drawn on its own layer above every other layer; the selected feature keeps its own style underneath.

## `layerHighlight`

| Path                         | Type     | Default                     | Description                                           |
| ---------------------------- | -------- | --------------------------- | ----------------------------------------------------- |
| `layerHighlight.strokeColor` | `string` | `'#f59e0b'`                 | Stroke colour of every object of a highlighted layer. |
| `layerHighlight.strokeWidth` | `number` | `3`                         | Stroke width in pixels.                               |
| `layerHighlight.fillColor`   | `string` | `'rgba(245, 158, 11, 0.2)'` | Fill colour of highlighted polygons and points.       |
| `layerHighlight.pointRadius` | `number` | `7`                         | Radius in pixels of highlighted points.               |

`editor.layers.setHighlighted(id, true)` draws all objects of a layer on an overlay above the editor layers and below the selection highlight, so a selected object still shows in the selection colour. The overlay follows the layer's features and visibility; several layers may be highlighted at once. Hit testing ignores it.

```json
{ "layerHighlight": { "strokeColor": "#e879f9", "fillColor": "rgba(232, 121, 249, 0.15)" } }
```

```json
{
  "strokeColor": "#22d3ee",
  "strokeWidth": 3,
  "fillColor": "rgba(34, 211, 238, 0.15)",
  "pointRadius": 8,
  "haloColor": "rgba(255, 255, 255, 0.6)",
  "haloWidth": 3,
  "vertexSize": 6
}
```

## `snapping`

| Path                   | Type                                                         | Default                                   | Description                                                                                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `snapping.enabled`     | `boolean`                                                    | `true`                                    | Whether snapping is on. Toggle at runtime with `editor.snapping.setEnabled`.                                                                                                                                                                                 |
| `snapping.tolerancePx` | `number`                                                     | `12`                                      | Snap radius in CSS pixels. Must be positive.                                                                                                                                                                                                                 |
| `snapping.modes`       | `('vertex' \| 'midpoint' \| 'perpendicular' \| 'tangent')[]` | `['vertex', 'midpoint', 'perpendicular']` | Active snap modes: existing vertices, segment midpoints, the foot of the perpendicular from the last drawn vertex onto a segment, and the point where a line from the last drawn vertex touches a circle or curve (`tangent`, off by default). At least one. |

```json
{ "enabled": true, "tolerancePx": 12, "modes": ["vertex", "midpoint", "perpendicular"] }
```

## `grid`

Grid snap is independent of `snapping`: with it on, the pointer sits on the nearest grid intersection unless a geometry snap within the snap radius wins. Toolbox `<olcad-grid-settings>`, API `editor.grid`.

| Path           | Type               | Default  | Description                                                                                                                                           |
| -------------- | ------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grid.enabled` | `boolean`          | `false`  | Whether grid snap is on. Toggle at runtime with `editor.grid.setEnabled`.                                                                             |
| `grid.spacing` | `number`           | `10`     | Distance between grid lines in view-projection units: metres in EPSG:3857 and other projected systems, degrees in a geographic CRS. Must be positive. |
| `grid.origin`  | `[number, number]` | `[0, 0]` | A grid intersection, in view-projection units. The grid is aligned with the axes of the view projection.                                              |
| `grid.visible` | `boolean`          | `true`   | Draw the intersections as dots while edit mode is on. Dots are skipped automatically when they would be closer than 8 pixels.                         |

```json
{ "enabled": false, "spacing": 5, "origin": [0, 0], "visible": true }
```

## `curves`

Circles (and later arcs) are drawn with true circle math and stored as ordinary polygons: the ring is linearized so that no chord deviates more than the tolerance from the true curve. The tolerance is in metres and converted to map units at the shape's centre, so it means the same in every view projection. The segment count is clamped to 24 … 1024 per full circle. See [tools.md](tools.md#circle).

| Path               | Type     | Default | Description                                                                                                      |
| ------------------ | -------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `curves.tolerance` | `number` | `0.01`  | Largest distance in metres between a stored chord and the true curve (circles, Bézier curves). Must be positive. |

```json
{ "tolerance": 0.01 }
```

## `units`

Lengths typed into the command line without a unit are in the default unit, and lengths and areas are shown in its system (metric: m, km, m², ha, km²; feet: ft, mi, ft², ac, mi²). A unit typed with the number always wins (`5 ft`, `@3m,4m`, `@10 mi<45`). With `'auto'` the default is the unit of the view projection — `m` for metric CRS, `ft` or `us-ft` for foot-based CRS (proj4 `+units=ft` / `+units=us-ft`), metres for geographic CRS — and it follows a projection switch. Values stored in data (text heights, `curves.tolerance`, the change set) stay in metres. See [tools.md](tools.md#numeric-input).

| Path           | Type     | Default  | Description                                                                                                                        |
| -------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `units.length` | `string` | `'auto'` | `'auto'` or one of `m`, `km`, `cm`, `mm`, `ft`, `us-ft`, `in`, `yd`, `mi`, `nmi`. Change at runtime with `editor.units.setLength`. |

```json
{ "length": "auto" }
```

## `constraints`

| Path                        | Type      | Default | Description                                                                                                                                    |
| --------------------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `constraints.angle`         | object    | –       | Angle lock while drawing lines and polygons, toolbox `<olcad-angle-lock>`, API `editor.constraints`.                                           |
| `constraints.angle.enabled` | `boolean` | `false` | Whether the lock is on. Toggle at runtime with `editor.constraints.setAngleLocked`.                                                            |
| `constraints.angle.step`    | `number`  | `90`    | Allowed directions are multiples of this step in degrees, counted from the straightedge angle (`cursor.angle`). Between 0 (exclusive) and 360. |

```json
{ "angle": { "enabled": false, "step": 90 } }
```

## `draft`

The draft layer takes new objects while no layer is active (the draw tool and any `insertFeature` into its id). It accepts every geometry type (`geometryType: 'Any'`), has no attribute schema, allows insert, update and delete and is snappable. Its features are **local**: they never appear in the change set, `accept` and `discard` leave them alone, and they are lost with the page. It is not part of `config.layers`; `editor.layers.getDraft()` returns its id and `editor.layers.list()` includes it.

| Path            | Type       | Default   | Description                                                                                                   |
| --------------- | ---------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| `draft.enabled` | `boolean`  | `true`    | Create the draft layer. Without it the draw tool needs an active layer.                                       |
| `draft.id`      | `string`   | `'draft'` | Layer id, used by the API and the layer list. Must not collide with a `layers[].id`.                          |
| `draft.title`   | `string`   | `'Draft'` | Human readable name.                                                                                          |
| `draft.style`   | flat style | –         | OpenLayers flat style for all three geometry types. Default: amber circles, dashed amber strokes, light fill. |

```json
{ "enabled": true, "id": "draft", "title": "Draft" }
```

## `projections[]`

| Path                  | Type     | Default  | Description                                                                |
| --------------------- | -------- | -------- | -------------------------------------------------------------------------- |
| `projections[].code`  | `string` | required | Projection code, for example `EPSG:25832`. Must be unique.                 |
| `projections[].def`   | `string` | required | proj4 definition string.                                                   |
| `projections[].title` | `string` | –        | Readable name shown by `<olcad-projection-select>`, for example `UTM 32N`. |

```json
{ "code": "EPSG:25832", "def": "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs" }
```

## `basemaps[]`

Common options for every basemap type:

| Path                     | Type                                                              | Default      | Description                                                                                        |
| ------------------------ | ----------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `basemaps[].id`          | `string`                                                          | required     | Unique id, used by `editor.basemaps` and the UI.                                                   |
| `basemaps[].type`        | `'osm' \| 'xyz' \| 'wms' \| 'wmts' \| 'vector-tile' \| 'geotiff'` | required     | Basemap type.                                                                                      |
| `basemaps[].title`       | `string`                                                          | the `id`     | Display name.                                                                                      |
| `basemaps[].visible`     | `boolean`                                                         | `false`      | Shown at startup. Exactly one basemap is visible at a time; if none is set, the first one is used. |
| `basemaps[].attribution` | `string`                                                          | type default | Attribution text or HTML.                                                                          |

Raster basemaps in another projection than the view are reprojected by OpenLayers on the fly.

### `type: 'osm'`

| Path                 | Type     | Default                                              | Description                                |
| -------------------- | -------- | ---------------------------------------------------- | ------------------------------------------ |
| `basemaps[].maxZoom` | `number` | `19` (osm), `42` (xyz), source default (vector-tile) | Highest zoom level the tile source offers. |

```json
{ "id": "osm", "type": "osm", "title": "OpenStreetMap", "visible": true }
```

### `type: 'xyz'`

| Path                     | Type             | Default  | Description                                                                                                                                                  |
| ------------------------ | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `basemaps[].url`         | `string`         | required | URL template with `{z}`, `{x}`, `{y}` and optional `{a-c}` subdomain placeholders. For `wms`: the GetMap base URL. For `vector-tile`: the tile URL template. |
| `basemaps[].minZoom`     | `number`         | `0`      | Lowest zoom level the tile source offers (also `vector-tile`).                                                                                               |
| `basemaps[].tileSize`    | `number`         | `256`    | Tile size in pixels.                                                                                                                                         |
| `basemaps[].crossOrigin` | `string \| null` | not set  | `crossOrigin` attribute for images (also `wms`, `wmts`). Use `'anonymous'` when the map canvas must be exportable.                                           |

```json
{
  "id": "opentopomap",
  "type": "xyz",
  "url": "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png",
  "attribution": "Map data &copy; OpenStreetMap contributors, SRTM | Map style &copy; OpenTopoMap (CC-BY-SA)",
  "maxZoom": 17
}
```

### `type: 'wms'`

| Path                    | Type                                                       | Default         | Description                                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `basemaps[].params`     | object                                                     | required        | WMS request parameters. `LAYERS` is required; `VERSION`, `FORMAT`, `STYLES`, `TRANSPARENT` and vendor parameters are optional. Values are strings, numbers or booleans. |
| `basemaps[].tiled`      | `boolean`                                                  | `true`          | Request 256px tiles. `false` requests one image for the whole view, which avoids duplicated labels.                                                                     |
| `basemaps[].serverType` | `'mapserver' \| 'geoserver' \| 'qgis' \| 'carmentaserver'` | not set         | Enables correct high-DPI requests for that server.                                                                                                                      |
| `basemaps[].projection` | `string`                                                   | view projection | Projection to request from the server (also `vector-tile`, where it is the tile grid projection).                                                                       |

```json
{
  "id": "osm-wms",
  "type": "wms",
  "url": "https://ows.terrestris.de/osm/service",
  "params": { "LAYERS": "OSM-WMS" },
  "serverType": "geoserver"
}
```

### `type: 'wmts'`

The source is built from a GetCapabilities document, loaded asynchronously. Until it arrives the layer is empty; a failure emits `basemaperror`.

| Path                         | Type     | Default                          | Description                                                                                                                      |
| ---------------------------- | -------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `basemaps[].capabilitiesUrl` | `string` | required                         | URL of the WMTS GetCapabilities document.                                                                                        |
| `basemaps[].layer`           | `string` | required                         | Layer identifier from the capabilities.                                                                                          |
| `basemaps[].matrixSet`       | `string` | first set in the view projection | Tile matrix set identifier.                                                                                                      |
| `basemaps[].format`          | `string` | first format of the layer        | Image format, for example `image/png`. For `vector-tile`: the tile encoding `'mvt' \| 'geojson' \| 'topojson'`, default `'mvt'`. |
| `basemaps[].style`           | `string` | layer default style              | Style identifier. For `vector-tile`: an OpenLayers flat style object or array.                                                   |

```json
{
  "id": "topplus",
  "type": "wmts",
  "capabilitiesUrl": "https://sgx.geodatenzentrum.de/wmts_topplus_open/1.0.0/WMTSCapabilities.xml",
  "layer": "web"
}
```

### `type: 'vector-tile'`

Uses `url`, `format`, `minZoom`, `maxZoom`, `projection` and `style` as described above.

```json
{
  "id": "vt",
  "type": "vector-tile",
  "url": "https://tiles.example.org/{z}/{x}/{y}.pbf",
  "maxZoom": 14,
  "style": { "stroke-color": "#999", "stroke-width": 0.5 }
}
```

### `type: 'geotiff'`

Rendered with WebGL. Several sources are combined band-wise. With the script-tag build, the OpenLayers full build expects the `geotiff` library as a global `GeoTIFF` (load `geotiff/dist-browser/geotiff.js` before `ol.js`); without it the basemap stays empty and `basemaperror` is emitted. Bundlers pull `geotiff` in through OpenLayers automatically.

| Path                          | Type                | Default                | Description                                                 |
| ----------------------------- | ------------------- | ---------------------- | ----------------------------------------------------------- |
| `basemaps[].sources`          | array               | required, at least one | GeoTIFF files.                                              |
| `basemaps[].sources[].url`    | `string`            | required               | URL of a (cloud optimised) GeoTIFF.                         |
| `basemaps[].sources[].bands`  | `number[]`          | all bands              | 1-based band numbers to read.                               |
| `basemaps[].sources[].min`    | `number`            | from data type         | Minimum source value for normalisation.                     |
| `basemaps[].sources[].max`    | `number`            | from data type         | Maximum source value for normalisation.                     |
| `basemaps[].sources[].nodata` | `number`            | from file              | Value that marks no data.                                   |
| `basemaps[].normalize`        | `boolean`           | `true`                 | Scale values to 0..1 using `min` / `max`.                   |
| `basemaps[].convertToRGB`     | `boolean \| 'auto'` | `false`                | Convert to RGB using the file's photometric interpretation. |

```json
{
  "id": "cog",
  "type": "geotiff",
  "sources": [{ "url": "https://example.org/image.tif", "bands": [1, 2, 3], "max": 3000 }]
}
```

## `layers[]`

One entry per object class: where the data comes from, which operations are allowed and which attributes a feature carries (`schema`). The array is plain JSON, so a host may keep it in its own file and merge it into the configuration before calling `createEditor`; the test server does exactly that with `test-server/config/layers.json`.

| Path                    | Type                                                                                                   | Default           | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layers[].id`           | `string`                                                                                               | required          | Unique id, used by `editor.layers`, the UI and the change set.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `layers[].title`        | `string`                                                                                               | the `id`          | Display name.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `layers[].visible`      | `boolean`                                                                                              | `true`            | Shown at startup.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `layers[].source`       | object                                                                                                 | required          | Where the features come from, see below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `layers[].geometryType` | `'Point' \| 'LineString' \| 'Polygon' \| 'MultiPoint' \| 'MultiLineString' \| 'MultiPolygon' \| 'Any'` | required          | Geometry type every feature of the layer has. `'Any'` accepts all of them in one layer (the draft layer uses it); the draw tool then needs `{ type }`, see [tools.md](tools.md#draw).                                                                                                                                                                                                                                                                                                                                                                                 |
| `layers[].idProperty`   | `string`                                                                                               | not set           | Property that supplies the feature id when the format carries none.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `layers[].editable`     | `boolean \| object`                                                                                    | `false`           | `true` allows insert, update and delete; `false` allows nothing; an object selects operations (see below).                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `layers[].snappable`    | `boolean`                                                                                              | `true`            | Features are snap targets, also for read-only layers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `layers[].style`        | flat style                                                                                             | per geometry type | OpenLayers flat style object, array of them, or array of rules. Users may override it at runtime (View → Layer styles…, `editor.layers.setStyle`); a single object with literal values is read back as the starting point of their style.                                                                                                                                                                                                                                                                                                                             |
| `layers[].schema`       | object                                                                                                 | not set           | Attribute schema, see below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `layers[].minZoom`      | `number`                                                                                               | unlimited         | Hide the layer below this view zoom.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `layers[].maxZoom`      | `number`                                                                                               | unlimited         | Hide the layer above this view zoom.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `layers[].text`         | `boolean \| object`                                                                                    | off               | Makes the layer a **text layer**: point features with a text property are drawn as text, sized in metres on the ground and rotated by a property; the `text` tool inserts into it. `true` uses the defaults; an object changes them (see below). Needs `geometryType` `Point`, `MultiPoint` or `Any`. The draft layer is always a text layer with the defaults.                                                                                                                                                                                                       |
| `layers[].dimension`    | `boolean \| object`                                                                                    | off               | Makes the layer a **dimension layer**: two-point line features are drawn as aligned dimensions (extension lines, dimension line at the `offset` property, terminators, value) after a drawing standard preset, with the GIS value in brackets until a field value (`fieldValue` property) is set. `true` uses the defaults; an object changes them (see below). Needs `geometryType` `LineString` or `Any`; a layer cannot be a text and a dimension layer. Objects are checked on insert and update (codes `dimension-type`, `dimension-points`, `dimension-value`). |

```json
{
  "id": "parcels",
  "title": "Parcels",
  "source": { "format": "geojson", "url": "/data/parcels.geojson" },
  "geometryType": "Polygon",
  "idProperty": "id",
  "editable": { "insert": true, "update": true, "delete": false },
  "style": { "stroke-color": "#b45309", "stroke-width": 2, "fill-color": "rgba(245, 158, 11, 0.2)" }
}
```

### `layers[].source`

Exactly one of `url`, `data`, `features` or `loader` is required.

| Path                             | Type                                                                   | Default                                       | Description                                                                                                                                                                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layers[].source.format`         | `'geojson' \| 'topojson' \| 'kml' \| 'gpx' \| 'wkt' \| 'gml' \| 'wfs'` | `'geojson'` with `features`                   | Data format. Required unless `features` is given.                                                                                                                                                                                                  |
| `layers[].source.url`            | `string`                                                               | –                                             | URL to fetch, relative to the page. For `wfs` the service base URL; the GetFeature query is appended.                                                                                                                                              |
| `layers[].source.data`           | `string \| object`                                                     | –                                             | Inline data: text for XML and WKT formats, text or object for `geojson` and `topojson`.                                                                                                                                                            |
| `layers[].source.features`       | `object[]`                                                             | –                                             | Inline GeoJSON features.                                                                                                                                                                                                                           |
| `layers[].source.loader`         | function                                                               | –                                             | `({ extent, resolution, projection }) => data \| Promise<data>`. Returns raw data in `format`. Not JSON; add such layers through `editor.layers.add`.                                                                                              |
| `layers[].source.dataProjection` | `string`                                                               | see description                               | Projection of the data. Defaults: `EPSG:4326` for `geojson`, `topojson`, `kml`, `gpx` and `wkt` (GeoJSON `crs` members are honoured); the first `srsName` in the document for `gml`; the view projection for `wfs` (it is requested as `srsName`). |
| `layers[].source.strategy`       | `'all' \| 'bbox'`                                                      | `'bbox'` for `wfs` and `loader`, else `'all'` | Load everything once, or per view extent. Layers loaded per extent are cleared and reloaded on a projection switch.                                                                                                                                |
| `layers[].source.gmlVersion`     | `'2' \| '3' \| '3.2'`                                                  | `'3'`, `'3.2'` for WFS 2.0.0                  | GML flavour for `gml` and `wfs`.                                                                                                                                                                                                                   |
| `layers[].source.typeName`       | `string`                                                               | required for `wfs`                            | WFS feature type name, for example `ns:parcels`.                                                                                                                                                                                                   |
| `layers[].source.version`        | `'1.0.0' \| '1.1.0' \| '2.0.0'`                                        | `'1.1.0'`                                     | WFS protocol version.                                                                                                                                                                                                                              |
| `layers[].source.outputFormat`   | `string`                                                               | server default (GML)                          | WFS `outputFormat` parameter. Any value containing `json` switches parsing to GeoJSON.                                                                                                                                                             |

```json
{
  "format": "wfs",
  "url": "https://example.org/wfs",
  "typeName": "ns:lamps",
  "outputFormat": "application/json"
}
```

```ts
editor.layers.add({
  id: 'points',
  geometryType: 'Point',
  editable: true,
  source: {
    format: 'geojson',
    loader: ({ extent, projection }) =>
      fetch(`/api/points?bbox=${extent}&crs=${projection}`).then((r) => r.json()),
  },
});
```

### `layers[].editable` (object form)

| Path                          | Type      | Default | Description                                                                                                                                                    |
| ----------------------------- | --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layers[].editable.insert`    | `boolean` | `false` | New features may be drawn.                                                                                                                                     |
| `layers[].editable.update`    | `boolean` | `false` | Geometry and attributes of existing features may be changed.                                                                                                   |
| `layers[].editable.delete`    | `boolean` | `false` | Existing features may be deleted.                                                                                                                              |
| `layers[].editable.predicate` | function  | not set | `(feature, operation) => boolean`, checked in addition to the `update` / `delete` flags for one feature. Not JSON; set it through `editor.layers.setEditable`. |

```ts
editor.layers.setEditable('parcels', {
  update: true,
  predicate: (feature) => feature.get('status') !== 'final',
});
```

### `layers[].text` (object form)

| Path                             | Type     | Default                       | Description                                                                                                                                                      |
| -------------------------------- | -------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layers[].text.property`         | `string` | `'text'`                      | Property holding the text. A point feature with a non-empty value is drawn as text instead of the layer's point style.                                           |
| `layers[].text.heightProperty`   | `string` | `'textHeight'`                | Property holding the text height in metres on the ground; the text scales with the zoom (converted at the text through the projection-aware measure module).     |
| `layers[].text.rotationProperty` | `string` | `'textRotation'`              | Property holding the rotation in degrees, counter-clockwise from the screen x-axis (the straightedge convention); the `text` tool stores the straightedge angle. |
| `layers[].text.height`           | `number` | `2.5`                         | Height in metres the `text` tool offers for a new text (greater than 0).                                                                                         |
| `layers[].text.color`            | `string` | `'#111827'`                   | Text colour (CSS).                                                                                                                                               |
| `layers[].text.haloColor`        | `string` | `'rgba(255, 255, 255, 0.85)'` | Outline around the letters for legibility (CSS).                                                                                                                 |
| `layers[].text.font`             | `string` | `'sans-serif'`                | CSS font family.                                                                                                                                                 |

```json
{
  "id": "labels",
  "geometryType": "Point",
  "source": { "url": "/data/labels.geojson" },
  "editable": true,
  "text": { "height": 5 }
}
```

### `layers[].dimension` (object form)

Sizes are millimetres on paper at the reference scale, so they scale with the map like a printed plan (2.5 mm at 1:100 = 0.25 m on the ground). Values are written with the decimal separator of `locale` (`de`: comma).

| Path                                | Type                                           | Default                           | Description                                                                                                                                                                                                                                                             |
| ----------------------------------- | ---------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layers[].dimension.preset`         | `'architecture' \| 'surveying' \| 'landscape'` | `'surveying'`                     | Drawing standard. `architecture` (DIN 1356-1): below 1 m in centimetres, from 1 m in metres, the millimetre as a superscript (`36⁵`, `2,01⁵`). `surveying` and `landscape`: metres with two decimals (`12,47`). Sets the defaults of `referenceScale` and `terminator`. |
| `layers[].dimension.referenceScale` | `number`                                       | `100` / `500` / `250`             | Plan scale denominator the paper sizes refer to; default per preset (architecture / surveying / landscape). Greater than 0.                                                                                                                                             |
| `layers[].dimension.textSize`       | `number`                                       | `2.5`                             | Text height in paper millimetres (greater than 0). Below one pixel on screen only the lines are drawn.                                                                                                                                                                  |
| `layers[].dimension.terminator`     | `'tick' \| 'arrow' \| 'dot' \| 'none'`         | `'tick'` / `'arrow'` / `'dot'`    | End mark of the dimension line; default per preset (architecture / surveying / landscape).                                                                                                                                                                              |
| `layers[].dimension.tolerance`      | `number`                                       | `0.05`                            | Largest difference in metres between the field value and the GIS value; beyond it the dimension is drawn in `deviationColor`. At least 0.                                                                                                                               |
| `layers[].dimension.showComputed`   | `'brackets' \| 'plain'`                        | `'brackets'`                      | How a value without a field measurement is shown: in brackets as computed (the survey convention), or plain.                                                                                                                                                            |
| `layers[].dimension.color`          | `string`                                       | `'#111827'`                       | Line and text colour (CSS).                                                                                                                                                                                                                                             |
| `layers[].dimension.deviationColor` | `string`                                       | `'#dc2626'`                       | Colour of dimensions whose field value deviates beyond `tolerance` (CSS).                                                                                                                                                                                               |
| `layers[].dimension.font`           | `string`                                       | `'sans-serif'`                    | CSS font family of the values.                                                                                                                                                                                                                                          |
| `layers[].dimension.angleUnit`      | `'deg' \| 'gon'`                               | `'gon'` (surveying), else `'deg'` | Unit in which angular dimensions are written and their field angles typed: degrees with one decimal (`87,5°`) or gon with four (`97,2222 gon`). Angles are stored in degrees.                                                                                           |
| `layers[].dimension.angleTolerance` | `number`                                       | `0.1`                             | Largest difference between the field angle and the GIS angle, in `angleUnit`, before an angular dimension is drawn in `deviationColor`. At least 0.                                                                                                                     |

Dimension objects carry their data as properties: `dimType` (`'aligned'` (may be left out), `'rotated'`, `'running'`, `'tie'`, `'angular'`, `'radius'`, `'diameter'` or `'arc'`; angular and arc dimensions have three points: leg, vertex, leg and centre, start, end; radius and diameter centre and a point on the circle), `rotation` (degrees counter-clockwise, for rotated and running dimensions), `chain` (the id shared by the dimensions of a chain, baseline or running set), `refs` (one entry per point: `{ layer, id, kind: 'vertex' | 'midpoint' | 'edge', path, t? }` naming the object and the vertex or segment the point was snapped to, or `null`; written by the tool), `offset` (metres from the measured points to the dimension line, positive to the left of first → second point), `textPosition` (metres along the line from its middle), `fieldValue` (metres, or degrees for angular dimensions, or `null`), `text` (free text replacing the value; `{value}` inserts it). See [change-set.md](change-set.md#dimension-objects).

```json
{
  "id": "dimensions",
  "geometryType": "LineString",
  "source": { "url": "/data/dimensions.geojson" },
  "editable": true,
  "dimension": { "preset": "architecture", "tolerance": 0.03 }
}
```

### `layers[].schema`

Schema validation of attribute values arrives with milestone 7; the shape is validated now.

| Path                                | Type                                                                 | Default             | Description                                     |
| ----------------------------------- | -------------------------------------------------------------------- | ------------------- | ----------------------------------------------- |
| `layers[].schema.fields`            | array                                                                | required            | Field definitions. Names must be unique.        |
| `layers[].schema.fields[].name`     | `string`                                                             | required            | Property name on the feature.                   |
| `layers[].schema.fields[].type`     | `'string' \| 'number' \| 'integer' \| 'boolean' \| 'enum' \| 'date'` | required            | Value type. `date` values are ISO 8601 strings. |
| `layers[].schema.fields[].label`    | `string`                                                             | the `name`          | Label for forms.                                |
| `layers[].schema.fields[].required` | `boolean`                                                            | `false`             | Value must be present and not empty.            |
| `layers[].schema.fields[].readOnly` | `boolean`                                                            | `false`             | Shown but not editable.                         |
| `layers[].schema.fields[].default`  | `string \| number \| boolean \| null`                                | not set             | Value for new features.                         |
| `layers[].schema.fields[].values`   | `(string \| number)[]`                                               | required for `enum` | Allowed values. Only valid for `enum`.          |
| `layers[].schema.fields[].min`      | `number`                                                             | not set             | Minimum value for `number` and `integer`.       |
| `layers[].schema.fields[].max`      | `number`                                                             | not set             | Maximum value for `number` and `integer`.       |
| `layers[].schema.fields[].pattern`  | `string`                                                             | not set             | Regular expression a `string` value must match. |

```json
{
  "fields": [
    { "name": "owner", "type": "string", "required": true },
    {
      "name": "usage",
      "type": "enum",
      "values": ["residential", "commercial"],
      "default": "residential"
    },
    { "name": "floors", "type": "integer", "min": 0, "max": 50 }
  ]
}
```
