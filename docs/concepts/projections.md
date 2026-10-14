# Projections

**Status:** implemented (2026-10-12). Registration, the runtime switch, the originals store and consistent reprojection of edits and history exist. In-progress tool state is not cancelled on a switch although the API documentation says so (see Open questions).

## Purpose

The map works in one view projection at a time (EPSG:3857 by default); every feature in memory is in that projection, and every tool, snap and measurement computes in it. Hosts need other projections (UTM zones, national grids) and want to switch at runtime without degrading their data. The concept therefore has two halves: the view projection as the single in-memory CRS, and a store of each feature's **original** coordinates in its data projection so round trips are loss-free and the change set can be exported in the CRS the backend served.

## Model

**Registration**

- `projections[]` holds proj4 definitions; `createEditor` registers them through `ol/proj/proj4` with the `proj4` instance from config, else the global one. A missing proj4 or a failing definition throws a `ConfigError` naming the path.

**Originals**

- When a layer loads, each feature's geometry is stored as loaded, together with the layer's data projection (configured `dataProjection`, else detected, else EPSG:4326). `layers.getOriginalGeometry(feature)` exposes it.
- `accept` refreshes the originals of touched features from their current geometry, so the baseline after a save is loss-free again.

**Runtime switch** (`setProjection(code)`)

1. Unknown code: throw. Same code: nothing happens.
2. `beforeprojectionchange { from, to }`.
3. A new view is created at the same centre, fitted to the old extent.
4. [Change tracking](change-tracking.md) transforms its baseline snapshots and the undo / redo records, so collapse rules and history stay valid.
5. Layers reproject: untouched features are **rebuilt from their originals** (no drift over repeated switches); edited features are transformed from their current geometry; `bbox` layers are cleared and reload, keeping touched features and skipping locally deleted ids.
6. `config.view.projection` is updated, `projectionchange { from, to }` fires.

**Unaffected by a switch**

- The selection (same features, new coordinates).
- The straightedge angle (screen space).
- The [grid](grid.md) spacing and origin: they are plain numbers in view units and are not converted, so 10 m becomes 10° after a switch to a geographic CRS. The grid settings toolbox shows the unit.

**Measurement**

Lengths typed or displayed are in metres, but map units are metres only in projected metric systems. [Measurement](measurement.md) corrects for the local scale, so [numeric input](numeric-input.md) gives the same ground distance in every projection.

**Target**

Switching the view projection should first cancel in-progress tool state (an open sketch, a move base point), because those coordinates would otherwise stay in the old CRS (CLAUDE.md section 6).

## Related

- [Measure tools](tool-measure.md): measurements are transformed on a switch; values are computed per projection.
- [Measurement](measurement.md): projection-aware distances make metres mean the same thing in every CRS.
- [Change tracking](change-tracking.md): snapshots and history are transformed on a switch; `accept` refreshes the originals; export uses the per-layer data projection.
- [Editing](editing.md): undo records hold geometries in the view projection and are reprojected with it.
- [Numeric input](numeric-input.md): absolute `x,y` is in view-projection units, relative input in metres.
- [Grid](grid.md): spacing and origin are in view units and are not converted on a switch.
- [Layers and editability](layers-and-editability.md): the data projection is a layer property; `bbox` layers reload after a switch.
- [Templates](templates.md): the template store is reprojected with the features.
- [Local layers](local-layers.md): local objects keep no originals and are transformed on a switch; stored in EPSG:4326.
- [Export](export.md): GeoJSON and GML take any registered CRS; KML and GPX are EPSG:4326.
- [Import](import.md): a file's CRS must be registered; objects are read into the view projection.

## Surface

- Config `view.projection`, `projections[]` (`code`, `def`, `title`), `proj4`, `layers[].source.dataProjection`, `changes.crs` ([configuration.md](../configuration.md)).
- `editor.getProjection()`, `editor.setProjection(code)`, `editor.layers.getOriginalGeometry`, events `beforeprojectionchange`, `projectionchange` ([api.md](../api.md)).
- `<olcad-projection-select>` ([ui.md](../ui.md)).

## Open questions

- Nothing in the core listens to `beforeprojectionchange`: an open draw sketch or a move base point survives the switch with coordinates in the old CRS. [api.md](../api.md#events) claims tools cancel there. Decide: the editor cancels the active tool's in-progress state (`tools.cancel()`) before switching, or each tool subscribes.
- Should grid spacing be converted on a switch (keep the ground spacing) or kept numeric (keep the configured value)? Today it is kept numeric.

## Source

- `src/core/projections/register.ts`
- `src/core/layers/originals.ts`
- `src/core/layers/LayerManager.ts` (`reproject`, `shouldLoad`)
- `src/core/changes/Editing.ts` (`reproject`)
- `src/core/Editor.ts` (`setProjection`)
