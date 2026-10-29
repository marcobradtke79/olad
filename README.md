# ol-cad

CAD-style drawing and editing tools for [OpenLayers](https://openlayers.org/). Framework-agnostic: configure it with one JSON-compatible object, receive every edit as a JSON change set, send it to your backend however you like.

**[Try the live demo](http://olad.bradtke.eu)**: every tool, snapping, dimensions, measuring, templates, the table view, projection switch, import and export, in your browser, no install needed. **[Watch the demo video](https://youtu.be/oHBkhbzZNSs)** for a quick tour.

> Status: pre-release (0.x), released on GitHub (see [Install](#install)). Snapping, numeric input, constraints and most construction and modify tools are available (draw, rectangle, circle, ellipse, curve, text, move, rotate, scale, mirror, offset, parallel, trim, extend, templates), as are measuring, local layers, import / export and the table view. Arcs, fillet, chamfer, split, merge, tracing and attribute validation in the core are still to come. See [CHANGELOG.md](CHANGELOG.md) and [docs/tools.md](docs/tools.md).

## Demo

The [live demo](http://olad.bradtke.eu) is a static page with the script-tag build: all toolbars (draw, modify, trim / extend, dimensions, measure), snapping and the drawing aids, the command line, the attribute form and table view, templates, the projection switch, the layer list with basemaps and layer styles, import and export. Edits live only in your browser tab and are lost on reload; File → Export downloads them, File → Reset demo data starts over.

[![ol-cad demo video](https://img.youtube.com/vi/oHBkhbzZNSs/maxresdefault.jpg)](https://youtu.be/oHBkhbzZNSs)

To try the full edit-and-save cycle against a backend, run the local test server with `pnpm start:test` (see [Development](#development)).

## Install

ol-cad is released on GitHub, not on npm. Each [release](https://github.com/marcobradtke79/olad/releases) has the package file attached; install it by URL:

```sh
pnpm add https://github.com/marcobradtke79/olad/releases/download/v0.3.0/ol-cad-0.3.0.tgz ol
# optional, for custom projections
pnpm add proj4
```

npm and yarn take the same URL (`npm install <url> ol`). To update, install the URL of the newer release; version ranges and `pnpm update` do not apply to URL installs.

**Verify a download.** Every release also carries a `SHA256SUMS` file and build provenance attestations created by the release workflow: `shasum -a 256 -c SHA256SUMS` checks the files, `gh attestation verify ol-cad-<version>.tgz --repo marcobradtke79/olad` tells which workflow run built them (see [docs/releasing.md](docs/releasing.md)). URL installs also record the package file's integrity hash in the lockfile.

Supported OpenLayers versions: 9.x and 10.x (peer dependency).

**Development version** (unreleased changes from `main`): build a package file from the repository and install it.

```sh
git clone https://github.com/marcobradtke79/olad.git
cd olad
pnpm install && pnpm build && pnpm pack   # writes ol-cad-<version>.tgz
cd ../your-app
pnpm add ../olad/ol-cad-<version>.tgz ol
```

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
- **Angular, React, Vue:** see [docs/frameworks.md](docs/frameworks.md): a complete component for each, plus JSX typings for React and `shallowRef` for Vue.

## Quick start (script tag)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@10/ol.css" />
<link rel="stylesheet" href="ui.css" />
<script src="https://cdn.jsdelivr.net/npm/ol@10/dist/ol.js"></script>
<script src="ol-cad.umd.js"></script>
<script>
  olcad.defineElements();
  const editor = olcad.createEditor({ target: 'map', basemaps: [{ id: 'osm', type: 'osm' }] });
</script>
```

Download `ol-cad.umd.js` and `ui.css` from the [release](https://github.com/marcobradtke79/olad/releases/latest) and serve them with your page; GitHub release downloads cannot be linked directly from a `<script>` tag. The UMD build exposes a global `olcad` and expects the OpenLayers full build as global `ol`. Load `proj4` before it when you configure `projections`, and `geotiff/dist-browser/geotiff.js` (global `GeoTIFF`) before `ol.js` when you use `geotiff` basemaps.

## Documentation

- [Configuration](docs/configuration.md): every option
- [API](docs/api.md): methods, events, types
- [Tools](docs/tools.md)
- [Change set](docs/change-set.md)
- [UI elements](docs/ui.md)
- [Framework integration](docs/frameworks.md): Angular, React, Vue
- [Test server](docs/test-server.md)
- [Releasing](docs/releasing.md): tags, the release workflow, checksums and attestations
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
