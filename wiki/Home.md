# OpenLayers Aided Design (OLAD)

**CAD-style design and construction for any OpenLayers map, as a flexible, general-purpose editing extension that runs entirely in the client.**

> Applies to: version 0.1.1 ([releases](https://github.com/marcobradtke79/olad/releases)). Developers install the package file from the GitHub release, not from npm ([README → Install](https://github.com/marcobradtke79/olad#install)).

## What is OLAD?

[OpenLayers](https://openlayers.org/) is excellent at showing maps. Editing them precisely is a different job: drawing a parcel boundary exactly 12.5 m from a road, snapping to an existing corner, constructing a parallel, trimming a line at a boundary. That is the domain of CAD software.

OLAD brings that way of working into the browser. It is an **extension for OpenLayers**, not a replacement: it attaches to an existing `ol/Map` or creates one, and adds CAD-like tools, aids and a complete edit pipeline on top.

## A flexible extension

- **Framework-agnostic.** A headless core plus optional Web Components. It works the same in plain HTML, React, Vue, Angular, Svelte or server-rendered pages.
- **Configured with plain data.** One JSON-compatible object describes basemaps, vector layers, projections, editability, attribute schemas, snapping and units, so the configuration can come from your server.
- **Use as much as you need.** Take the ready-made toolbars, panels and dialogs, or drive everything through the API and build your own UI. Anything the UI can do, your application can do through the same API.
- **Fits your data.** Basemaps (OSM, XYZ, WMS, WMTS, vector tiles, GeoTIFF), vector layers in GeoJSON, TopoJSON, KML, GPX, WKT, GML and WFS, any CRS through proj4, and a runtime projection switch.
- **Per-layer rules.** Each layer is one object class with its own geometry type, attribute schema and editability (insert / update / delete).

## CAD-like design and construction

OLAD treats the map like a drawing board:

- **Precise input:** snapping (vertex, midpoint, perpendicular, tangent, grid), an angle lock, a straightedge crosshair and a command line for absolute, relative and polar coordinates with length units.
- **Drawing:** points, lines, polygons, rectangles, circles, ellipses, regular polygons, Bézier curves, parallels and text.
- **Construction and modification:** select, vertex edit, move, rotate, scale, mirror, offset, trim, extend and reusable templates.
- **Measurement:** distance, area and angle that are correct in the projection you work in, including Web Mercator.

On the roadmap: more snap modes, tracing, further constraints, fillet, chamfer, split and merge.

## A general-purpose editor in the client

OLAD is not tied to one domain. Cadastre, utilities, planning, field data or a simple "draw your area" form all use the same building blocks:

- **Every edit is tracked.** Inserts, updates and deletes collapse into net changes with undo and redo, and are exported as a plain JSON change set.
- **Your backend, your transport.** OLAD ships no network client. Your application sends the change set wherever it needs to go and calls `accept` on success.
- **Validated before it lands.** Geometry validity and layer rules are checked before a change is accepted, with translatable messages (English and German).
- **Client-side tools.** Local layers, import, export, a table view and layer styles all work in the browser without a server.

## User guide

New to OLAD? Start with the [user interface](User-Interface) and [edit mode and layers](Edit-Mode-and-Layers).

- **Tools:** [Drawing tools](Drawing-Tools) · [Modify tools](Modify-Tools) · [Precision aids](Precision-Aids) · [Measuring](Measuring) · [Templates](Templates)
- **Data:** [Attributes and table](Attributes-and-Table) · [Import and export](Import-and-Export) · [Undo and saving](Undo-and-Saving) · [Keyboard shortcuts](Keyboard-Shortcuts)
- **Workflows:** [A parcel with exact dimensions](Workflow-Precise-Parcel) · [Correcting roads](Workflow-Road-Corrections) · [Sketch first, assign later](Workflow-Sketch-Then-Assign) · [Import, edit, export](Workflow-Import-Edit-Export)

![The OLAD screen](images/ui-overview.png)

## For developers

- [README: install and quick start](https://github.com/marcobradtke79/olad#readme)
- [Framework integration (Angular, React, Vue)](https://github.com/marcobradtke79/olad/blob/main/docs/frameworks.md)
- [Configuration reference](https://github.com/marcobradtke79/olad/blob/main/docs/configuration.md)
- [Tools reference](https://github.com/marcobradtke79/olad/blob/main/docs/tools.md)
- [API reference](https://github.com/marcobradtke79/olad/blob/main/docs/api.md)
- [Change set format](https://github.com/marcobradtke79/olad/blob/main/docs/change-set.md)
- [UI elements](https://github.com/marcobradtke79/olad/blob/main/docs/ui.md)
