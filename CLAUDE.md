# CLAUDE.md

Project brief and working rules for **ol-cad** (working name): a framework-agnostic CAD editing extension for OpenLayers.

## 0. Current state

Updated at the end of every milestone. Milestone numbers refer to section 12.

- **Milestone 1 (scaffold) done, 2026-10-09.** Build, lint, unit and e2e tests, examples, test server, docs skeleton and CHANGELOG exist.
- **Milestone 2 (config and layers) done, 2026-10-09.** All basemap types, vector layers in every format (`src/core/layers/vector.ts`), per-layer editability and schema config, proj4 projections, runtime projection switch with original-geometry store (`src/core/layers/originals.ts`), `editor.layers` / `editor.basemaps` runtime APIs.
- **UI shell (pulled forward from milestone 8), 2026-10-10.** `<olcad-dock>`, `<olcad-panel>` (dockable / floating, drag grip, dock menu, layout persistence, `flyout` mode collapsing side-docked panels to a tab) and `<olcad-toolbar>` (main toolbar with the edit-mode toggle) in `src/ui/elements/`, plus `<olcad-layer-list>`. Core has an active layer (`editor.layers.setActive`, event `activelayerchange`; the layer list's Insert buttons select it, the draw tool of milestone 4 will start from them) and `editMode` (config option, `isEditMode` / `setEditMode`, event `editmodechange`); it only shows the parallel-straightedge crosshair overlay (`src/core/crosshair.ts`, config `cursor`, `editor.straightedge` API with angle and reference pick with hover highlight, `<olcad-straightedge>` toolbox with "Align to segment") and sets the class `olcad-edit-mode` on the map target so far. `src/core/geometry/segments.ts` (nearest segment, screen angle) is the first geometry module. Its meaning (which tools require it, what leaves it) is still to be defined with the project owner.
- **Milestone 3 (command pipeline) done, 2026-10-11.** `src/core/changes/`: commands, `Editing` (validate → apply → history), `ChangeTracker` (snapshots in the view projection, net-change collapse), `exportChangeSet` (per-change `crs`); `editor.execute` / `undo` / `redo`, `editor.changes`, events `change`, `validationerror`, `historychange`. Geometry validity in `src/core/geometry/validity.ts`, messages (`en`, `de`) in `src/core/i18n.ts`, config `changes`, `locale`, `messages`. Toolbar has Undo / Redo; the test page drives commands with buttons.
- **Milestone 4 (basic tools) done, 2026-10-11.** `src/core/tools/`: `Tool` interface, `BaseTool`, `ToolManager`, tools `select`, `draw`, `modify`, `move`; `src/core/selection/Selection.ts` (highlighted shared selection); `editor.tools`, `editor.selection`, `editor.deleteSelection`, events `toolchange`, `selectionchange`, config `selection`. Toolbar has tool buttons and installs keyboard shortcuts (`src/ui/keyboard.ts`).
- **Point placement and attribute form, 2026-10-11.** The layer list's Insert button starts the draw tool for its layer; the draw tool selects what it inserts; `<olcad-attribute-form>` (`src/ui/elements/OlcadAttributeForm.ts`) edits the selected feature's attributes from the schema using browser validation only; with the `popup` attribute it is a modal dialog opened by the `featureinsert` event after every insert.
- **Milestone 5 started, 2026-10-11: snapping.** `src/core/snapping/` (engine with `vertex`, `midpoint`, `perpendicular` and `tangent` (2026-10-13, `src/core/geometry/tangent.ts`, off by default) using the draw tool's `referencePoint()`, `SnapInteraction` rewriting pointer events), crosshair snap jump and markers, config `snapping`, `editor.snapping`, events `snappingchange` / `snap`, `<olcad-snap-settings>`; grid snap (config `grid`, `editor.grid`, event `gridchange`, `GridLayer` dots, `<olcad-grid-settings>`) as the engine's fallback when no geometry snap applies. Constraints started: `src/core/constraints/angle.ts` (angle lock relative to the straightedge, applied by `SnapInteraction` between geometry snap and grid), config `constraints`, `editor.constraints`, event `constraintschange`, `<olcad-angle-lock>`. Numeric input: `src/core/input/parse.ts`, `src/core/measure/` (projection-aware offsets and distances), `editor.input(text)` resolving the text and handing a coordinate to `Tool.handleInput`, event `input`, `<olcad-input-bar>` (command line, bottom zone) and `<olcad-projection-select>` (`projections[].title`). `<olcad-menubar>` / `<olcad-menu>` (`src/ui/elements/OlcadMenubar.ts`) give hosts an accessible menu bar; the test page's File menu holds Save / Discard / Reset server. Design: dark CAD theme by default (`olcad-theme` attribute for light / auto), compact panels (`compact`, grip-only header), inline SVG icons (`src/ui/icons.ts`) and `data-tooltip` tooltips (`src/ui/tooltip.ts`) on all toolbox buttons; the test page starts on a CARTO dark basemap.
- **Draft layer, 2026-10-12.** Config `draft` creates a local layer with `geometryType: 'Any'` that the draw tool targets while no layer is active (`editor.layers.getDraft()`); `Editing` skips the change tracker for it (`isTracked`), so draft objects never reach the change set. Tools take options (`editor.tools.activate(id, options)`, `ToolOptions`, `Tool.getOptions`); the draw tool resolves its target and type through `drawTarget`. The toolbar has three draw buttons (Point / Line / Polygon) sharing the `draw` tool.
- **Selection highlight, 2026-10-12.** `Selection` draws selected features on its own overlay layer (`HIGHLIGHT_LAYER_PROPERTY`, `createHighlightStyle`: halo, stroke, vertex grips) instead of swapping feature styles; config `selection` gained `haloColor`, `haloWidth`, `vertexSize`.
- **Straightedge colour, 2026-10-12.** `editor.straightedge.getColor` / `setColor` change `cursor.color` live (`straightedgechange` carries `{ angle, color }`); the test page's View menu switches it light for the dark basemap.
- **CAD-style move, 2026-10-12.** `src/core/tools/move.ts` is a three-step state machine (select → base point → second point, then deselect and start over) with a dashed preview layer; typed input in the last step is relative to the base point (`referencePoint`). Tool prompts: `Tool.getPrompt`, `ToolContext.promptChanged`, event `toolprompt`, `editor.tools.getPrompt`; `<olcad-input-bar>` shows them.
- **Next: rest of milestone 5.** More snap modes (edge, intersection, centre), tracing, further constraints (parallel / perpendicular to a segment, locked length), live measurement events and attribute-value validation in the core (milestone 7) are not implemented. Host tool registration is open.
- **Layer styles, 2026-10-14.** `src/core/layers/style.ts` (`LayerStyle` ↔ flat style, validation), `LayerManager` user styles (`setStyle` through `vectorLayerStyle` in `vector.ts`, text layers keep `textStyleFunction`) and drawing order (`order` array, `zIndex` = `LAYER_Z_INDEX_BASE` + position, `list()` follows it), `exportStyles` / `importStyles` with pending entries for layers added later; `<olcad-layer-style-dialog>` (View → Layer styles…) and `persistLayerStyles` (localStorage). Concept `docs/concepts/layer-styles.md`.
- **Length units, 2026-10-14.** `src/core/units.ts` (units table, `crsLengthUnit`, conversions, metric / imperial formatting); `parseInput(text, defaultUnit)` reads unit suffixes and returns metres; config `units.length` (`'auto'` = the CRS unit), `editor.units`, event `unitschange`; `Tool.handleLength(metres)` for length steps beside `handleValue` (dimensionless); `{unit}` in prompts; `MeasurementStore.relabel()`; `<olcad-unit-select>`. Values stay metres in data and API.
- **Show / hide toolbars and panels, 2026-10-14.** Panel visibility is part of the dock layout (`PanelPlacement.hidden`, `OlcadDock.listPanels` / `setPanelVisible` / `setAllPanelsVisible`, panel attribute `no-toggle` for content-managed panels such as the table); `bindPanelMenu(menu, dock)` in `src/ui/panelMenu.ts` fills the View menu; `OlcadMenu.refresh()`.
- **Import, 2026-10-14.** `src/core/import/readImport.ts` (format detection, grouping by the file's layer / KML folder / GML feature type and by geometry family, CRS from the file, Z dropped, attribute inference, invalid geometries counted) and `applyImport.ts` (new local layers or existing layers, one composite, inserts flagged `imported` so no attribute popup); `editor.import`, event `import`; `<olcad-import-dialog>`; File → Import… on the test page. Concept `docs/concepts/import.md`.
- **Export, 2026-10-14.** `src/core/export/exportLayers.ts` (`editor.exportLayers`: GeoJSON, KML, GML 3.2, GPX into one combined file with OL writers; KML folders and the GML collection are assembled as strings because the core must not use DOM globals); `<olcad-export-dialog>` (`src/ui/elements/OlcadExportDialog.ts`) and `downloadFile` (`src/ui/download.ts`); File → Export… on the test page. Concept `docs/concepts/export.md`.
- **Local layers, 2026-10-13.** `src/core/layers/local.ts` (`LocalLayers`, `editor.localLayers`: create with title, geometry type and fields, rename, `setFields` with renames, remove, JSON export / import; untracked like the draft layer via `LayerManager.isLocal`; event `locallayerchange`, `layerchange` types `title` / `schema`, `LayerInfo.local`). UI: `<olcad-layer-editor>` dialog, New layer / Settings buttons in `<olcad-layer-list>`, `persistLocalLayers` + `indexedDbStorage` in `src/ui/localLayerStorage.ts` (the core never touches storage). Concept `docs/concepts/local-layers.md`.
- **Table view, 2026-10-13.** `<olcad-feature-table>` (`src/ui/elements/OlcadFeatureTable.ts`): one layer's objects as rows (id, schema fields, text, geometry with length / area), sort, filter, change markers, selection sync, zoom on double click; it hides its enclosing panel while closed and takes its own row in the bottom zone. `<olcad-layer-list>` opens it through a Table button per row via the UI registry `featureTablesOf` / `onFeatureTableChange`. Read-only; inline editing planned. Concept `docs/concepts/table-view.md`.
- **Text tool, 2026-10-13.** `src/core/tools/text.ts` (insert point → height in metres via `handleValue` → text via `handleText`; point feature with `text` / `textHeight` / `textRotation` = straightedge angle; `textTarget`: active text layer, else draft) following `docs/concepts/tool-text.md`; config `layers[].text` (`resolveText`, `TEXT_DEFAULTS`); text layers render through `textStyleFunction` in `src/core/layers/text.ts` (metres → pixels per resolution, flat base style via `flatStylesToStyleFunction`); the draft layer is a text layer; test layer `labels`.
- **Measurement toolbox, 2026-10-13.** Read-only tools `measure-distance` / `measure-area` / `measure-angle` (`src/core/tools/measure.ts`, Alt+click measures an object) that run with edit mode off (`Tool.readOnly`, `ToolManager.isReadOnly`; inspect pauses, snapping and input work); `editor.measurements` on `src/core/measure/MeasurementStore.ts` (labelled overlay, events `measurechange` / `measure`); math in `src/core/measure/measurements.ts` (planar in true-to-scale grids, exact sphere integral in Web Mercator); `<olcad-measure-results>`; a Measure toolbar and panel (`name="measurements"`) on the test page. Concept `docs/concepts/tool-measure.md`.
- **Parallel tool, 2026-10-13.** `src/core/tools/parallel.ts` (select a line / polygon → start point fixes distance and side → the crosshair sets the end along the parallel, through the bends; click inserts via `lineTarget` / `onDrawEnd`, reference kept; a typed number is the length) following `docs/concepts/tool-parallel.md`; `src/core/geometry/parallel.ts` (`parallelPath` on `offsetPath`, the tolerant `offsetRing` variant that skips collapsed segments and crossed notch walls, then `keepDistance`: cut at self-crossings and other segments' bands, jump at crossings, so the parallel never comes closer than its distance; stations, `subPath` with unwrapped stations on rings).
- **Moving drafts, 2026-10-13.** `src/core/layers/draft.ts` (`draftTargets`, `moveDraftsCommand`: deletes in the draft layer + inserts of copies as one composite), `editor.layers.draftTargets` / `moveDrafts` / `moveDraft` (select the copies, event `draftmove`); `<olcad-layer-list>` shows a move button on each layer row that takes the selected drafts (`reveal` opens the Layers flyout for drafts); `<olcad-attribute-form reveal>` opens on `draftmove`. Concept `docs/concepts/draft-move.md`.
- **Ellipse tool, 2026-10-13.** `src/core/tools/ellipse.ts` (one tool, `ToolOptions.method`: `centre-axis`, `axis`, `box`; other half-axis typed via `handleValue` or as a point's distance from the axis; `polygonTarget` / `onDrawEnd`) following `docs/concepts/tool-ellipse.md`; math in `src/core/geometry/ellipse.ts` (linearized with `circleSegmentCount` of the longer half-axis). Second flyout button (Draw ellipse) after Draw circle.
- **Scale tool, 2026-10-13.** `src/core/tools/scale.ts` (select → base point → typed factor via `handleValue`, or reference point → target point; uniform, updatable objects only, one command) following `docs/concepts/tool-scale.md`; `scaleGeometry` / `scaleFactor` in `src/core/geometry/scale.ts`.
- **Mirror tool, 2026-10-13.** `src/core/tools/mirror.ts` (select → two line points → `Create a copy? [y/N]` via `handleText`; in place as updates of updatable objects, or copies through the template target rule and `copyProperties`) following `docs/concepts/tool-mirror.md`; reflection in `src/core/geometry/mirror.ts` (rings keep their winding). The popup attribute form queues several inserts of one command ("1 of 3").
- **Templates, 2026-10-13.** `src/core/templates/` (`TemplateStore`: named copies relative to a base point in the view projection, reprojected in `setProjection`, JSON export / import in EPSG:4326; `insert.ts`: source → active → draft target rule, one composite per copy flagged `template`), `editor.templates`, event `templatechange`; tools `template-copy` (select → base → name via `Tool.handleText`) and `template-insert` (`{ template }`, repeat until Escape via `ctx.done()`); `<olcad-template-list>`; the test page persists templates in localStorage. Concepts `templates.md`, `tool-template-copy.md`, `tool-template-insert.md`. This delivers milestone 6's Copy.
- **Layer list redesign and layer highlight, 2026-10-13.** `<olcad-layer-list>` rows: name plus icon buttons visibility / highlight / Edit (edit mode on + active layer, no tool) / info (details below the row). Core `editor.layers.setHighlighted` (overlay sharing the layer's source, `src/core/layers/highlight.ts`, config `layerHighlight`), concept `docs/concepts/layer-highlight.md`. The Insert button is gone.
- **Trim and extend tools, 2026-10-13.** `src/core/tools/trim.ts` and `extend.ts` on the shared base `src/core/tools/boundary.ts` (`BoundaryTool`: boundary from the selection or a click → any number of clicks on lines, one command each, selection cleared after the first, boundary kept until Enter / Escape; lines hit with the raw pointer position) following `docs/concepts/tool-trim.md` / `tool-extend.md`; geometry in `src/core/geometry/trim.ts`, crossing helpers in `intersect.ts`. A trimmed-out interior piece splits a line into update + insert (composite). Fourth toolbar Trim / Extend on the test page and the vanilla example.
- **Curve tool, 2026-10-13.** `src/core/tools/curve.ts` (start → end → adjustable handles as grips picked with the raw pointer position → Enter inserts; linearized with `curves.tolerance`; `lineTarget`) following `docs/concepts/tool-curve.md`; Bézier math in `src/core/geometry/bezier.ts` (Wang's bound). `PointPickInteraction` now carries the raw position and Alt, shared with the vertex tool.
- **Offset tool, 2026-10-12.** `src/core/tools/offset.ts` (select one line or polygon → distance typed as a value → side click; copy inserted into the source layer, else active / draft, through `onDrawEnd`; the copy becomes the next source) following `docs/concepts/tool-offset.md`; planar offset math in `src/core/geometry/offset.ts` without a geometry library (`docs/decisions/0003`).
- **Toolbars regrouped, 2026-10-12.** The test page and the vanilla example bind three `<olcad-toolbar>` elements: Main (`tools="select delete"` plus zoom), Draw (`controls="" tools="draw rectangle circle regular-polygon"`) and Modify (`controls="" tools="modify move rotate"`). New `controls` attribute (`edit layer history`); keyboard shortcuts are bound once per editor (shared by its toolbars).
- **Regular polygon tool, 2026-10-12.** `src/core/tools/regularPolygon.ts` (number of sides typed as a value → centre → one vertex; inscribed, exact ring; `ToolOptions.sides` skips the question; inserted through `onDrawEnd`) following `docs/concepts/tool-regular-polygon.md`; ring math in `src/core/geometry/regularPolygon.ts`. First use of the value channel `Tool.handleValue` (`editor.input` offers a plain number to the tool's step before resolving it as a distance; `InputResult` gained `{ value }`).
- **Circle tool, 2026-10-12.** `src/core/tools/circle.ts` (one tool, `ToolOptions.method`: centre + typed radius, centre + point, three points; linearized with config `curves.tolerance` in metres via `ToolContext.getCurveTolerance` / `getProjection`; inserted through `onDrawEnd`, target rule `polygonTarget` in `draw.ts`) following `docs/concepts/tool-circle.md`; circle math in `src/core/geometry/circle.ts`. The toolbar's first **flyout button** (`TOOL_BUTTONS[id].variants` in `src/ui/elements/OlcadToolbar.ts`: triangle toggle, right-click, long press; menu of variants; the button shows the last chosen one).
- **Rectangle tool, 2026-10-12.** `src/core/tools/rectangle.ts` (first corner → opposite corner by click or command line; sides follow the straightedge angle via `ToolContext.getStraightedgeAngle`; inserted through the draw tool's `onDrawEnd`) following `docs/concepts/tool-rectangle.md`; ring math in `src/core/geometry/rectangle.ts`.
- **Rotate tool, 2026-10-12.** `src/core/tools/rotate.ts` (select → centre → first angle point → second angle point, one command, deselect) following `docs/concepts/tool-rotate.md`; the first of the milestone 6 construction tools. Point-picking interaction shared with the move tool in `src/core/tools/pointer.ts`.
- **Vertex tool rewritten, 2026-10-12.** `src/core/tools/modify.ts` is a click-move-click state machine (select one object → pick a vertex or a segment → place it; one `updateGeometry` per placement; Alt+click / Delete removes; Enter finishes) following `docs/concepts/tool-modify.md`; vertex addressing in `src/core/geometry/vertices.ts`, preview layer shared with the move tool in `src/core/tools/preview.ts`. `Tool.removeLastPoint` returns a boolean.
- **Concept documentation, 2026-10-12.** `docs/concepts/` holds one file per tool and process (purpose, model, related concepts, surface, open questions, source), covering target and current state with a status line each, cross-linked in both directions and guarded by `tests/unit/concept-docs.test.ts`. The edit-mode question above is recorded in `docs/concepts/edit-mode.md`.
- Sections 5 to 9 below describe the target, not the current state. `docs/` describes only what is implemented, except `docs/concepts/`, which describes the target and marks per concept what is implemented, partial or planned.

## 1. What we are building

A library that adds CAD-style drawing and editing tools to an OpenLayers map. A host application of any kind (plain HTML, React, Vue, Angular, Svelte, server-rendered pages) configures it with a single JSON-compatible object, and receives all edits as a JSON change set that it sends to its own backend.

### Goals

- CAD-like tools: snapping, tracing, numeric input, constraints, construction and modify tools, arcs and circles.
- Zero framework dependency. Integrates with any web application.
- Background maps and vector layers are added by configuration.
- Editability is configured per layer / object class.
- Every insert, update and delete is tracked and exposed as JSON. Transport to the backend is the host's job.

### Non-goals (v1)

- No built-in network transport for saving changes (no WFS-T client, no REST client).
- No topology rules between features (no shared-vertex editing, no gap/overlap checks). Geometry validity only.
- No true curve storage. Curves are linearized on save.
- No 3D / Z editing, no multi-user live collaboration, no offline sync.

## 2. Decisions already made

| Topic | Decision |
|---|---|
| UI delivery | Headless core plus an optional UI layer built as Web Components (custom elements). The core must be fully usable without the UI. |
| Change tracking | Net changes per feature. Repeated edits to one feature collapse to a single entry. |
| Integrity | Geometry validity only (closed rings, no self-intersection, minimum vertex counts). |
| Curves | Arcs and circles are drawn with true arc math, then stored as linearized GeoJSON geometry with a configurable tolerance. |
| Attributes | Schema-driven. Each object class declares fields, types, defaults and constraints. Core validates; UI offers a generated form. |
| CRS | Default view projection is EPSG:3857. The view projection is configurable and can be switched at runtime. Any CRS can be registered through proj4 definitions in config. |
| Packaging | One npm package, simplest possible integration: ESM for bundlers, a single-file UMD/IIFE build for `<script>` tags, TypeScript types included. |

## 3. Tech stack

- **Language:** TypeScript 5.9, `strict` mode. Not 7.x yet: typescript-eslint and vite-plugin-dts do not support it (see `docs/decisions/0002`).
- **Runtime:** Node 22.6 or newer (the test server relies on built-in TypeScript type stripping; `erasableSyntaxOnly` is on).
- **Map engine:** OpenLayers as a `peerDependency`, supported range `>=9 <11`. Development and tests run against the installed 10.x (10.11.0 at project start). Never bundle `ol` into the ESM build.
- **Projections:** `proj4` as an optional peer dependency, registered via `ol/proj/proj4`.
- **Build:** Vite in library mode (see `docs/decisions/0001`). One `vite.config.ts` branches on `command` (dev server for examples) and `BUILD_TARGET=umd`. Outputs: ESM, UMD, `.d.ts` via vite-plugin-dts, one CSS file for the UI.
- **Tests:** Vitest for unit tests, Playwright for interaction tests against the example pages.
- **Lint/format:** ESLint + Prettier.
- **Package manager:** pnpm.
- **Runtime dependencies:** keep them minimal. A geometry library (for example JSTS or selected Turf modules) may be added for offset/buffer and validity checks, but only after writing a short decision record in `docs/decisions/` comparing bundle size against writing the planar math ourselves.

### Package entry points

```
ol-cad            -> headless core (no DOM beyond what OpenLayers needs)
ol-cad/ui         -> Web Components: toolbar, toolboxes, input bar, attribute form, layer list, projection select
ol-cad/ui.css     -> default theme, all colors and sizes as CSS custom properties
dist/ol-cad.umd.js -> script-tag build exposing a global `olcad` (expects global `ol`)
```

## 4. Architecture

```
src/
  core/
    Editor.ts            # public facade: createEditor(map | target, config)
    config/              # config types, defaults, runtime validation
    layers/              # builds OL layers and sources from config
    tools/               # one file per tool, all implement Tool interface
    snapping/            # snap engine: vertex, edge, midpoint, intersection, centre, perpendicular
    constraints/         # ortho, parallel, perpendicular, fixed length, fixed angle
    geometry/            # planar math: arcs, offset, trim, extend, fillet, linearize
    measure/             # projection-aware length, angle and area
    changes/             # ChangeTracker, undo/redo stack, change set export
    schema/              # attribute schema and validation
    events.ts            # typed event emitter
  ui/
    elements/            # <olcad-toolbar>, <olcad-input-bar>, <olcad-attribute-form>, <olcad-layer-list>
    theme.css
examples/
  vanilla/  script-tag/  react/  vue/
docs/
  decisions/
```

### Principles

1. **Core never touches the UI.** The UI talks to the core only through the public API and events. Anything the UI can do, a host application must be able to do through the same API.
2. **Tools are OpenLayers interactions** wrapped by a common `Tool` interface (`id`, `activate()`, `deactivate()`, `handleInput(value)`, `cancel()`). Exactly one tool is active at a time. Reuse `ol/interaction` `Draw`, `Modify`, `Snap`, `Translate` and `Select` where they fit; write custom interactions where they do not.
3. **Every mutation goes through a command.** Tools never modify features directly. They submit a command (`InsertFeature`, `UpdateGeometry`, `UpdateProperties`, `DeleteFeature`, or a composite) to the editor. This single path feeds undo/redo, validation and change tracking.
4. **Config is plain JSON-compatible data.** No class instances are required in config. Escape hatches may accept OL instances (for example a ready-made `ol/layer`), but every documented feature works with plain objects so the config can come from a server.
5. **Accept an existing map or create one.** `createEditor({ map })` attaches to a host-owned `ol/Map`; `createEditor({ target })` creates the map.
6. **Clean teardown.** `editor.destroy()` removes all interactions, layers it created, listeners and DOM.

## 5. Configuration

Target shape (refine the types, keep the spirit):

```ts
const editor = createEditor({
  target: 'map',                      // or: map: existingOlMap
  view: { projection: 'EPSG:3857', center: [0, 0], zoom: 2 },
  projections: [                      // optional proj4 definitions
    { code: 'EPSG:25832', def: '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs' }
  ],
  basemaps: [
    { id: 'osm', type: 'osm', visible: true },
    { id: 'ortho', type: 'wms', url: '...', params: { LAYERS: '...' } },
    { id: 'topo', type: 'wmts', capabilitiesUrl: '...', layer: '...' },
    { id: 'tiles', type: 'xyz', url: 'https://.../{z}/{x}/{y}.png', attribution: '...' }
  ],
  layers: [
    {
      id: 'parcels',
      title: 'Parcels',
      source: { format: 'geojson', url: '/data/parcels.geojson', dataProjection: 'EPSG:4326' },
      geometryType: 'Polygon',
      idProperty: 'id',
      editable: { insert: true, update: true, delete: false },
      snappable: true,
      style: { /* flat style */ },
      schema: {
        fields: [
          { name: 'owner', type: 'string', required: true },
          { name: 'usage', type: 'enum', values: ['residential', 'commercial'], default: 'residential' },
          { name: 'area_m2', type: 'number', readOnly: true }
        ]
      }
    }
  ],
  snapping: { tolerancePx: 12, modes: ['vertex', 'edge', 'midpoint', 'intersection'] },
  curves: { tolerance: 0.01 },        // max chord deviation in metres (decided 2026-10-12)
  units: { length: 'm', angle: 'deg' }
});
```

Requirements:

- **Basemap types:** `osm`, `xyz`, `wms` (tiled and single image), `wmts`, `vector-tile`, `geotiff`. Multiple basemaps, switchable at runtime.
- **Vector formats:** GeoJSON, TopoJSON, KML, GPX, WKT, GML, WFS (read), plus inline `features`. Loading can be by URL, inline data, or a host-supplied loader function.
- **Editability** is per layer and per operation (`insert`, `update`, `delete`). `editable: true` and `editable: false` are shorthands. An optional predicate allows per-feature rules. Non-editable layers can still be snap targets.
- **One layer is one object class** with one geometry type and one schema.
- Validate config at startup and throw errors that name the offending path (`layers[2].source.format`).
- Layers, basemaps and editability can be changed at runtime through the API.

## 6. Tools (v1)

**Draw:** point, line/polyline, polygon, rectangle (2-point and 3-point), circle (centre+radius, 2-point, 3-point), arc (3-point, centre+start+end), arc segments inside polylines and polygons.

**Modify:** select (click, box, lasso), move, copy, rotate, scale, mirror, vertex edit (add, move, delete), offset/parallel, trim, extend, fillet, chamfer, split (by line), merge/union, delete.

**Aids:**

- Snapping: vertex, edge/nearest, midpoint, intersection, centre, perpendicular, tangent. Toggle per mode at runtime. Works across all snappable layers.
- Tracing along existing geometry.
- Constraints: ortho, parallel to / perpendicular to a picked segment, locked length, locked angle.
- Numeric input: absolute `x,y`, relative `@dx,dy`, polar `@distance<angle`, single value for length or radius. Exposed in core as `editor.input(value)`; the UI input bar is only a thin wrapper.
- Live measurement feedback (length, angle, radius, area) through events.
- Keyboard: Esc cancel, Enter finish, Backspace remove last vertex, Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z, configurable shortcuts for tools and snap toggles.

### Measurement and projections

Web Mercator distorts distances, so a typed length of 10 m is not 10 map units. All measurement and numeric input must go through `measure/`, which is projection-aware:

- In projected metric CRS (UTM and similar): plain planar math.
- In EPSG:3857 and geographic CRS: correct for scale at the working location (geodesic computation). Document the accuracy limits.

Switching the view projection at runtime reprojects editable features and any in-progress state must be cancelled first. Store the original data-projection coordinates of untouched features so a round trip does not degrade them.

## 7. Change tracking

Internally: an ordered command stack for undo/redo, plus a snapshot of each feature's original state at first touch. The exported change set is derived by comparing current state with the original, so it always holds net changes.

Collapse rules:

- insert + update(s) → one `insert` with final state
- insert + delete → nothing
- update + update → one `update`
- update(s) + delete → one `delete`
- update that returns a feature to its original state → nothing

Change set format:

```json
{
  "version": 1,
  "crs": "EPSG:4326",
  "changes": [
    {
      "op": "insert",
      "layer": "parcels",
      "tempId": "tmp-7f3a",
      "geometry": { "type": "Polygon", "coordinates": [] },
      "properties": { "owner": "..." }
    },
    {
      "op": "update",
      "layer": "parcels",
      "id": 4711,
      "geometry": { "type": "Polygon", "coordinates": [] },
      "properties": { "usage": "commercial" },
      "changed": ["geometry", "usage"]
    },
    { "op": "delete", "layer": "roads", "id": 815 }
  ]
}
```

- Geometry is GeoJSON. Output CRS and coordinate precision are configurable (default: the layer's `dataProjection`).
- `update` carries only changed properties, and geometry only if it changed. An option switches to full-feature output.
- The change set must be plain serializable data (`JSON.stringify` round-trips losslessly).

API for the host:

```ts
editor.changes.get();                    // current change set
editor.changes.hasChanges();
editor.on('change', (changeSet) => {});  // fired after every command, undo and redo
editor.changes.accept({ idMap: { 'tmp-7f3a': 9001 } }); // after successful save: assign real IDs, reset baseline
editor.changes.discard();                // revert all features to baseline
editor.undo(); editor.redo();
```

The library ships no transport. The examples must show a host-side `fetch` save with success (`accept`) and failure (keep changes) paths.

## 8. Validation

- Geometry validity is checked before a command is accepted: ring closure, minimum vertices, no self-intersection, no zero-length segments, geometry type matches the layer.
- Attribute validation against the layer schema: type, required, enum values, min/max, pattern.
- A rejected command changes nothing and emits a `validationerror` event with a machine-readable code and a readable message. Messages are translatable (ship `en` and `de`, allow host overrides).

## 9. UI package

- Custom elements without a framework: `<olcad-toolbar>`, `<olcad-input-bar>`, `<olcad-attribute-form>`, `<olcad-layer-list>`, `<olcad-snap-settings>`.
- Each element is bound with `element.editor = editor`.
- Themeable through CSS custom properties; no CSS framework.
- Which tools appear is configurable; the toolbar also greys out tools that the active layer's editability does not allow.
- Accessible: keyboard operable, ARIA labels, visible focus.

## 10. Local test server

The repo contains a local test server so the full edit-and-save cycle can be tried without any external backend. Start it with `pnpm serve:test`.

```
test-server/
  server.ts            # small Node server (plain node:http or Hono; no heavy framework)
  config/
    test-config.json   # the test case configuration (everything but layers), loaded by the test page
    layers.json        # the layers: source, editability, attribute schema; merged into GET /config
  data/                # seed data: parcels.geojson, roads.geojson, points.kml ...
  public/index.html    # test page: map + UI elements + save / discard buttons + live change set view
```

- **Test case configuration** (`test-config.json`) is a complete, realistic config that exercises every documented option: several basemap types, at least one layer per geometry type, several vector formats, a mix of fully editable, partially editable (for example insert and update but no delete) and read-only layers, attribute schemas with every field type, snapping settings, and a second projection (EPSG:25832) for the runtime switch.
- **Endpoints:**
  - `GET /config` returns the test configuration.
  - `GET /data/:layer` returns the current data of a layer.
  - `POST /changes` accepts a change set, validates its shape, applies it to an in-memory copy of the seed data, and returns `{ idMap }` for inserted features.
  - `GET /changes/log` returns all received change sets for inspection.
  - `POST /reset` restores the seed data.
- `POST /changes?fail=1` (or a toggle on the test page) makes the server answer with an error, so the failed-save path can be tested.
- The test page implements the host-side save mechanism with `fetch`, calling `editor.changes.accept()` on success and keeping the changes on failure. It serves as the reference implementation for integrators.
- The Playwright tests run against this server and this configuration.
- Whenever a config option is added or changed, `test-config.json` (or `layers.json` for layer options) is updated to use it.

## 11. Documentation

All documentation is Markdown in `docs/`, kept in the repo and updated in the same commit as the code it describes.

```
README.md                 # what it is, install, quick start (bundler and script tag), link list
CHANGELOG.md              # every change, Keep a Changelog format, semantic versioning
docs/
  configuration.md        # every config option
  api.md                  # public methods, events, types
  tools.md                # every tool: purpose, steps, numeric input, shortcuts
  change-set.md           # change set format, collapse rules, accept / discard, save example
  ui.md                   # custom elements, attributes, CSS custom properties
  test-server.md          # how to run it, endpoints, the test configuration explained
  decisions/              # one short record per architectural decision
  concepts/               # one file per tool and process: purpose, model, related concepts, status, open questions
```

- `docs/concepts/` explains how each tool and process is meant to work and how the features fit together; it is the only place where planned behaviour appears beside the current state. Every file follows the template in `docs/concepts/README.md` (status line, Purpose, Model, Related, Surface, Open questions, Source), is listed in that index, and names its related concepts in `Related` with a sentence on how they relate, in **both** directions. `tests/unit/concept-docs.test.ts` fails on a missing index entry, a broken link, a one-directional link, a missing template section or a named source path that does not exist.
- `docs/configuration.md` documents **every** configuration option: path (`layers[].editable.delete`), type, default, allowed values, description and a short example. An undocumented option is treated as a bug.
- `CHANGELOG.md` records **every** change to behaviour, API, configuration or change set format under an `Unreleased` heading, grouped as Added / Changed / Fixed / Removed, with breaking changes marked.
- A test compares the keys of the config types with the options listed in `docs/configuration.md` and fails when they differ, so the documentation cannot silently fall behind.

## 12. Milestones

Work in this order. Each milestone ends with passing tests and an updated example page.

1. **Scaffold:** repo, build (ESM + UMD + types), lint, test setup, vanilla and script-tag examples showing a map, test server skeleton with a first test configuration, documentation skeleton and CHANGELOG.
2. **Config and layers:** config types and validation, basemaps, vector formats, projections, runtime projection switch.
3. **Command pipeline:** commands, undo/redo, change tracker, change set export, `accept` / `discard`. Fully unit tested before any tool exists.
4. **Basic tools:** select, draw point/line/polygon, vertex edit, move, delete, with per-layer editability enforced.
5. **Snapping and numeric input:** snap engine, tracing, input parser, constraints, measurement module.
6. **Construction tools:** rectangle, circle, arc, offset, trim, extend, fillet, chamfer, split, merge, rotate, scale, mirror, copy.
7. **Attributes:** schema validation in core.
8. **UI package:** all custom elements, theme, i18n.
9. **Examples and docs:** React and Vue examples, final review of all documentation for completeness.

The test server, its test configuration and the documentation grow with every milestone; they are not left to the end.

## 13. Working rules for Claude

- `CLAUDE.md`, `docs/concepts/`, `todo-features.md` and `.claude/settings.local.json` are local working files: ignored by Git (`.gitignore`) and never published. Keep maintaining the concept files as described below, but do not link them from tracked docs (`README.md`, `docs/*.md`); `tests/unit/concept-docs.test.ts` skips itself where the folder is missing. The npm package is `dist`, `README.md`, `CHANGELOG.md` (package.json `files`); check it with `npm pack --dry-run`.

- Read this file first. If a task conflicts with a decision in section 2, stop and ask.
- Check the current OpenLayers API in the installed `node_modules/ol` version before using an interaction or source option; do not rely on remembered signatures.
- Public API changes need matching updates to types, tests, documentation and at least one example.
- A task is not done until `CHANGELOG.md` has an entry, any new or changed config option is in `docs/configuration.md`, `test-server/config/test-config.json` (or `layers.json` for `layers[]` options) uses it, and the affected `docs/concepts/` files reflect the behaviour.
- Before designing or changing a tool or process, read the concept files it touches in `docs/concepts/` (start at the index). They hold the intended behaviour, the relations to other features and the open questions.
- A change that adds a tool or process, alters its steps, states, precedence or preconditions, or changes how two features interact, updates the concept file(s) in the same commit: the status line (with the date), the Model section, `Related` in both directions, and the index row. A new tool or process gets a new concept file from the template in `docs/concepts/README.md`. Mark planned behaviour as "Planned" inside the Model section rather than leaving it out.
- Open questions about a single feature go into that concept's `Open questions` section; section 14 below lists only cross-cutting ones. When the owner decides, remove the question and record the outcome in the Model (and in `docs/decisions/` when it is architectural).
- Geometry math, the input parser, collapse rules and config validation require unit tests. Aim for high coverage in `core/geometry`, `core/changes` and `core/measure`.
- No framework imports anywhere in `src/`. No DOM access in `src/core/` beyond what OpenLayers itself needs.
- Do not add a runtime dependency without a decision record in `docs/decisions/`.
- Keep the UMD build working: after build changes, open the script-tag example.
- Small, focused commits with Conventional Commit messages.

### Commands

```
pnpm install
pnpm dev          # examples with live reload at http://localhost:5173/examples/
pnpm serve:test   # local test server at http://localhost:8787/ (needs pnpm build first)
pnpm start:test   # scripts/start-test-system.sh: install if needed, build, serve (--e2e, --check)
pnpm build        # dist/: ESM, UMD, types, CSS
pnpm typecheck    # tsc --noEmit
pnpm test         # unit tests (Vitest)
pnpm test:e2e     # Playwright; builds and starts the test server itself
pnpm lint         # eslint + prettier --check
pnpm format       # prettier --write
```

Single tests:

```
pnpm vitest run src/core/config/validate.test.ts          # one file
pnpm vitest run -t "rejects unknown keys"                  # by test name
pnpm playwright test tests/e2e/map.spec.ts --grep basemap  # one e2e file / name
```

First-time Playwright setup: `pnpm exec playwright install chromium`.

### Repo-specific facts

- Unit tests live next to the code (`src/**/*.test.ts`) plus `tests/unit/`. E2e tests live in `tests/e2e/` and run against `test-server/`.
- `tests/unit/config-docs.test.ts` walks the `EditorConfig` type with the TypeScript compiler API and compares it with the backticked paths in the first column of the tables in `docs/configuration.md`. Adding a config field without a doc row, or a doc row without a field, fails the test.
- `validateConfig` rejects unknown keys. New config options need: the type, the validator's allowed-key list, `applyDefaults`, a doc row, and `test-config.json`.
- The UMD build maps `ol/x/y` imports to the global `ol.x.y` of the OpenLayers full build. Any new `ol/...` import must exist as a namespace in `node_modules/ol/dist/ol.d.ts`.
- ESLint forbids `window`, `document`, `navigator` and storage globals in `src/core/`.
- The e2e helper `insertInto(page, title)` (`tests/e2e/flyout.ts`) presses the layer list's Edit button and then starts the draw tool through the API; the layer list itself starts no tool.
- The test page `test-server/public/index.html` loads `dist/ol-cad.umd.js`; run `pnpm build` before `pnpm serve:test`.
- Features in memory are always in the view projection. `LayerManager.originals` keeps each loaded feature's geometry in its data projection for loss-free reprojection; `Editing.accept` refreshes it for touched features. Change-tracker snapshots and undo records are in the view projection and are transformed on a projection switch; `LayerManager.reproject` transforms edited features instead of rebuilding them from originals, and bbox layers keep touched features across the reload and skip locally deleted ids (`shouldLoad`).
- Every feature mutation goes through `editor.execute`. The move tool translates geometries in place for its result; it snapshots before, then restores the originals and submits the new geometries as commands (`submitGeometryChanges` in `src/core/tools/modify.ts`). The modify tool builds the new geometry from a copy (`src/core/geometry/vertices.ts`) and executes it without touching the feature. A tool that lets OpenLayers mutate in place must follow the snapshot pattern.
- A tool step that asks for text (a template name) implements `Tool.handleText`, which `editor.input` offers before any parsing; a tool that ends itself calls `ctx.done()`.
- A tool step that expects typing (text or a number) returns `'text'` / `'value'` from `Tool.getInputRequest()`; `<olcad-input-bar>` then focuses and highlights itself and blurs when the step ends. Point steps return `null`.
- A tool step that asks for a dimensionless number (a count, a factor) implements `Tool.handleValue`; a step that asks for a length implements `Tool.handleLength(metres)`. `editor.input` offers a number typed without a unit to `handleValue` first, then the length in metres (typed unit, else the default unit `editor.units.getLength()`) to `handleLength`, and otherwise resolves it as a distance from `referencePoint()`. Regular polygon and scale use `handleValue`; offset, parallel, ellipse and text use `handleLength`. Prompts write `{unit}` for the default unit, never "metres".
- Bézier math lives in `src/core/geometry/bezier.ts`; curves are linearized with Wang's bound (`bezierSegmentCount`) and the configured tolerance. Grips (vertex tool, curve handles) are hit-tested with the raw pointer position from `PointPickInteraction` and `pickTolerance(ctx)`; the placed position is the snapped one.
- Planar offset math lives in `src/core/geometry/offset.ts`: mitre joins with a bevel fallback, no loop cleanup (a segment whose shifted copy runs backwards makes the offset `null`), polygons grow / shrink with holes handled; anything else invalid is rejected by command validation. Extend it rather than adding a geometry library without a decision record.
- Several `<olcad-toolbar>` elements may be bound to one editor; secondary toolbars use `controls=""` and a `tools` list, and the shortcuts are bound once per editor (refcounted in `OlcadToolbar.ts`). Test selectors like `olcad-toolbar .olcad-toolbar__tool--move` still match once because every button exists once on the page.
- A toolbar button with several constructions of one tool is a `TOOL_BUTTONS` entry with `variants` (one tool id, one option set per variant); the toolbar renders it as a flyout button. Do not add one button per variant.
- The snap interaction must stay the **last** interaction on the map (OpenLayers hands events to interactions last-added first); the editor re-adds it after every `toolchange`. Tools get snapped coordinates for free and must not add their own `ol/interaction/Snap`.
- Tools only run in edit mode, except read-only tools (`Tool.readOnly`, the measure tools); `setEditMode(false)` deactivates the active tool unless it is read-only and a straightedge reference pick suspends it. The draw tool follows the active layer and falls back to the draft layer (`drawTarget` in `src/core/tools/draw.ts`); a layer with `geometryType: 'Any'` needs `ToolOptions.type`. Outside edit mode the editor's own inspect interaction (config `selection.inspect`, `createSelectInteraction` shared with the select tool) still selects on click.
- The crosshair overlay in `src/core/crosshair.ts` creates DOM through `viewport.ownerDocument` because the core lint rule forbids the `document` global; its tests live in `tests/unit/` for the same reason.
- UI elements are tested under jsdom too (`src/ui/elements/*.test.ts`); jsdom has no layout, so code that reads bounding rectangles must tolerate all-zero rects, and tests stub `getBoundingClientRect`. Custom elements may be upgraded in any order (the test page calls `defineElements()` after parsing), so a container element must not assume its children are upgraded in `connectedCallback`.
- Unit tests that need OpenLayers formats or sources start with `// @vitest-environment jsdom`; `ol/Map` cannot be constructed under jsdom (no canvas), so map behaviour is covered by Playwright only.
- The test server is `node:http` plus `proj4` (dev dependency) and emulates WFS at `/wfs` with JSON output only.
- The OpenLayers full build (`ol/dist/ol.js`) externalises `geotiff` as global `GeoTIFF`; script-tag users and the test page must load it themselves. Check `node_modules/ol/dist/ol.d.ts` for what the full build exposes before relying on an OL module in the UMD build.

## 14. Open questions

Decide these with the project owner when they come up; do not guess silently. Questions about a single feature live in the `Open questions` section of its file in `docs/concepts/`; this list holds the cross-cutting ones.

- Final package name and license (`package.json` currently says `ol-cad`, `UNLICENSED`, `private: true`).
- Whether multi-part geometries (MultiPolygon etc.) are edited as a whole or per part.
- Whether inserted features need a host-supplied ID generator instead of `tempId`.
- Whether an optional conflict hint (per-feature version or timestamp in `update` / `delete`) should be part of the change set.
- Large-data behaviour: maximum feature count for snapping before a spatial index or viewport limit is needed.
