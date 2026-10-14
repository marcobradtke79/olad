# ol-cad

CAD-style drawing and editing tools for [OpenLayers](https://openlayers.org/). Framework-agnostic: configure it with one JSON-compatible object, receive every edit as a JSON change set, send it to your backend however you like.

> Status: milestone 5 of 9 (snapping and numeric input) in progress, on top of the UI shell. The library creates a map with every basemap type, loads vector layers in all supported formats with per-layer editability rules, switches the view projection at runtime, offers select, draw (into the active layer or a local draft layer), vertex-edit, move and delete tools with snapping (vertex, midpoint, perpendicular, grid), an angle lock and projection-aware numeric input, and tracks every edit as a JSON change set with undo / redo, accept and discard. Tracing, construction tools and attribute validation follow in later milestones. See [CHANGELOG.md](CHANGELOG.md).

## Install

```sh
pnpm add ol-cad ol
# optional, for custom projections
pnpm add proj4
```

Supported OpenLayers versions: 9.x and 10.x (peer dependency).

## Quick start (bundler)

```ts
import 'ol/ol.css';
import 'ol-cad/ui.css';
import { createEditor } from 'ol-cad';
import { defineElements } from 'ol-cad/ui';

defineElements();

const editor = createEditor({
  target: 'map',
  view: { projection: 'EPSG:3857', center: [935000, 6270000], zoom: 13 },
  basemaps: [
    { id: 'osm', type: 'osm', title: 'OpenStreetMap', visible: true },
    { id: 'topo', type: 'xyz', url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png' },
  ],
});

document.querySelector('olcad-layer-list').editor = editor;
document.querySelector('olcad-toolbar').editor = editor;
```

with this markup, where the dock places the toolbar at the top, the layer list on the right and the map in the centre (panels can be dragged to any side or left floating, see [docs/ui.md](docs/ui.md)):

```html
<olcad-dock>
  <olcad-toolbar name="main" dock="top"></olcad-toolbar>
  <olcad-panel name="layers" heading="Layers" dock="right">
    <olcad-layer-list></olcad-layer-list>
  </olcad-panel>
  <div id="map"></div>
</olcad-dock>
```

## Quick start (script tag)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@10/ol.css" />
<link rel="stylesheet" href="ol-cad/dist/ui.css" />
<script src="https://cdn.jsdelivr.net/npm/ol@10/dist/ol.js"></script>
<script src="ol-cad/dist/ol-cad.umd.js"></script>
<script>
  olcad.defineElements();
  const editor = olcad.createEditor({ target: 'map', basemaps: [{ id: 'osm', type: 'osm' }] });
</script>
```

The UMD build exposes a global `olcad` and expects the OpenLayers full build as global `ol`. Load `proj4` before it when you configure `projections`, and `geotiff/dist-browser/geotiff.js` (global `GeoTIFF`) before `ol.js` when you use `geotiff` basemaps.

## Documentation

- [Configuration](docs/configuration.md): every option
- [API](docs/api.md): methods, events, types
- [Tools](docs/tools.md)
- [Change set](docs/change-set.md)
- [UI elements](docs/ui.md)
- [Test server](docs/test-server.md)
- [Decision records](docs/decisions/)

## Development

```sh
pnpm install
pnpm dev          # examples with live reload at http://localhost:5173/examples/
pnpm build        # dist/: ESM, UMD, types, CSS
pnpm serve:test   # local test server at http://localhost:8787/ (run pnpm build first)
pnpm test         # unit tests
pnpm test:e2e     # Playwright against the test server (builds first)
pnpm lint
```
