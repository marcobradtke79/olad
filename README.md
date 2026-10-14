# ol-cad

CAD-style drawing and editing tools for [OpenLayers](https://openlayers.org/). Framework-agnostic: configure it with one JSON-compatible object, receive every edit as a JSON change set, send it to your backend however you like.

> Status: pre-release, not yet published to npm (see [Install](#install)). Snapping, numeric input, constraints and most construction and modify tools are available (draw, rectangle, circle, ellipse, curve, text, move, rotate, scale, mirror, offset, parallel, trim, extend, templates), as are measuring, local layers, import / export and the table view. Arcs, fillet, chamfer, split, merge, tracing and attribute validation in the core are still to come. See [CHANGELOG.md](CHANGELOG.md) and [docs/tools.md](docs/tools.md).

## Install

> `ol-cad` is not on npm yet, so `pnpm add ol-cad` fails with 404 until the first release. Use the development version in the meantime.

**Development version** (build a package file from the repository and install it):

```sh
git clone https://github.com/marcobradtke79/olad.git
cd olad
pnpm install && pnpm build && pnpm pack   # writes ol-cad-<version>.tgz
cd ../your-app
pnpm add ../olad/ol-cad-<version>.tgz ol
```

Repeat the build and `pnpm add` after pulling changes. `pnpm link ../olad` works as well, but then your app resolves `ol` from both projects. Use it only if your bundler deduplicates `ol`.

**After the release:**

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
  <olcad-toolbar name="main" dock="top" tools="select draw delete"></olcad-toolbar>
  <olcad-panel name="layers" heading="Layers" dock="right">
    <olcad-layer-list></olcad-layer-list>
  </olcad-panel>
  <div id="map"></div>
</olcad-dock>
```

- **Toolbar:** `tools` lists the tool buttons the toolbar shows. Without it a toolbar shows every tool, about 30 buttons. `tools=""` gives a toolbar with only the controls (edit mode, layer, undo / redo), which `controls` selects. Several toolbars can share one editor ([docs/ui.md](docs/ui.md#olcad-toolbar)).
- **Theme:** `ol-cad/ui.css` is a dark theme by default and sets `color-scheme` and its colours on the whole page (`:root`), which also changes your own form controls and default text colours. On a light page add `<html olcad-theme="light">`. See [Theme](docs/ui.md#theme).
- **Local layers** that users create with the layer list's New layer button are kept in memory and lost on reload, unless the page calls `persistLocalLayers(editor)` from `ol-cad/ui` ([docs/ui.md](docs/ui.md#persistlocallayerseditor-storage-options)).
- **Angular, React, Vue:** see [docs/frameworks.md](docs/frameworks.md).

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
- [Framework integration](docs/frameworks.md): Angular, React, Vue
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
