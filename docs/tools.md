# Tools

Tools wrap OpenLayers interactions. Exactly one tool is active at a time, tools require edit mode (`editor.setEditMode(true)`), and every change a tool makes goes through `editor.execute` as a command, so validation, undo / redo and the change set see it (see [change-set.md](change-set.md)).

```ts
editor.tools.list(); // ['select', 'draw', 'rectangle', 'circle', 'ellipse', 'regular-polygon', 'curve', 'parallel', 'text', 'dimension-linear', 'dimension-angular', 'dimension-radial', 'dimension-survey', 'modify', 'move', 'rotate', 'scale', 'offset', 'trim', 'extend', 'mirror', 'template-copy', 'template-insert', 'measure-distance', 'measure-area', 'measure-angle']
editor.tools.canActivate('draw'); // preconditions: edit mode, a layer to insert into ...
editor.tools.activate('draw'); // into the active layer, or the draft layer when none is active
editor.tools.activate('draw', { type: 'Polygon' }); // the type on a layer accepting any geometry
editor.tools.getActive(); // 'draw'
editor.tools.getActiveOptions(); // { type: 'Polygon' }
editor.tools.cancel(); // Escape
editor.tools.finish(); // Enter
editor.tools.removeLastPoint(); // Backspace: last vertex, step back, or drop a picked vertex; returns whether it did
editor.tools.deactivate();
editor.on('toolchange', ({ id, options }) => {});
```

Hit detection uses half of `cursor.pickBoxSize` as tolerance and only considers the editor's vector layers.

## Snapping

With snapping on (default, config `snapping`, toolbox `<olcad-snap-settings>`, API `editor.snapping`), the pointer snaps to the nearest snap location within `snapping.tolerancePx` pixels of the pointer:

- `vertex`: every vertex of lines and polygons and every point feature; marker: a square.
- `midpoint`: the middle of every segment; marker: a triangle.
- `perpendicular`: the point on an existing segment where a line from the last fixed vertex of the drawing in progress meets it at a right angle (the foot of the perpendicular, only if it falls inside the segment); marker: a right-angle symbol. It needs a reference vertex: while placing the first vertex, or with tools that have no drawing in progress, the mode yields nothing (CAD's deferred perpendicular).
- `tangent` (off by default): the point of a circle or curve where a line from the last fixed vertex of the drawing in progress touches it; marker: a circle with a thick top edge. Circles and curves are stored as linearized rings and lines, so the candidate is the vertex nearest the exact tangent point (within half a chord), which makes the drawn line really touch the stored geometry. Only curve-like vertices count (a turn of at most 20° at the vertex, as on any linearized circle or curve); polygon corners and straight lines never yield one, and a reference inside a circle sees none. Like `perpendicular` it needs a reference vertex. A tangent point is also a vertex, so when both modes are on the tangent marker is shown.

**Grid snap** (config `grid`, toolbox `<olcad-grid-settings>`, API `editor.grid`) is a separate toggle, like CAD's SNAP next to OSNAP. With it on, the pointer always sits on the nearest intersection of a square grid aligned with the axes of the view projection, `grid.spacing` units apart (metres in EPSG:3857 and other projected systems, degrees in a geographic CRS) with an intersection at `grid.origin`; marker: a circle. There is no radius for the grid. A geometry snap within the snap radius wins over the grid, so vertices are still hit exactly. With `grid.visible` the intersections are drawn as small dots while edit mode is on; the dots disappear when they would be closer than 8 pixels (zoomed out), snapping still applies. Event `gridchange` reports every change.

Candidates come from the visible layers with `snappable: true`, including read-only ones. Snapping happens in the editor's snap interaction, which rewrites the pointer events before the tools see them, so draw, modify, move and the straightedge pick all work with the snapped coordinate; the crosshair jumps to the snap location while the native pointer stays where it is. Snapping is active in edit mode only. `editor.snapping.setEnabled`, `setTolerance` and `setModes` change it at runtime (event `snappingchange`); `editor.on('snap', result)` reports the current snap location or `null`. Further modes (edge, intersection, centre) and tracing arrive later in milestone 5.

## Angle lock

With the angle lock on (config `constraints.angle`, toolbox `<olcad-angle-lock>`, API `editor.constraints`), a line or polygon in progress may only continue in directions that are multiples of `constraints.angle.step` degrees from the straightedge angle (`cursor.angle`, see [Straightedge](#straightedge)): step 90 on a 0° straightedge gives the four orthogonal directions (CAD ortho), step 45 the eight diagonals as well, and step 90 on a 30° straightedge gives 30°, 120°, 210° and 300°. The pointer is projected onto the nearest allowed direction through the last fixed vertex, keeping its component along that direction. The first vertex is free; the move tool is affected only in its second-point step (around the base point), the rotate tool in its angle steps (around the centre) and the modify tool only while a vertex is being placed (around its old position).

Precedence: a geometry snap within the snap radius wins over the lock (CAD's object snap overrides ortho), so a locked line can still end exactly on an existing vertex; otherwise the lock applies, and a locked segment is not grid-snapped. `editor.constraints.setAngleLocked` and `setAngleStep` change it at runtime (event `constraintschange`).

## Numeric input

`editor.input(text)` (command line `<olcad-input-bar>`) types a point for the active tool. The draw tool takes it as the next vertex of the line or polygon in progress (starting one if none is), or inserts it directly on a point layer; the move tool takes it as the base point or the second point (relative to the base point); the rotate tool as the centre or one of the two angle points (relative to the centre); the scale tool as the base, the reference or the target point (relative to the base; a plain number in the factor step is the factor); the rectangle tool as the first or the opposite corner (relative to the first); the circle tool as the centre, the radius point (a typed length is the radius) or the points on the circle (relative to the previous one); the regular polygon tool as the centre or the vertex (a typed length is the circumradius); the curve tool as the start, the end (relative to the start) or the picked handle (relative to its end point, so `@distance<angle` types the tangent). A step that asks for a **number** rather than a point (the regular polygon tool's number of sides, the scale tool's factor) takes a number typed without a unit first (`Tool.handleValue`); a step that asks for a **length** (the offset tool's distance, the ellipse tool's other half-axis, the parallel tool's length, the text tool's height) then takes the length in metres (`Tool.handleLength`); only when neither uses it is the length resolved as a distance from the last point. Steps that expect typing (those value steps, the text tool's text, the template name, the mirror copy question; `editor.tools.getInputRequest()`) focus and highlight the command line, so the user types right away; when the step is done the focus returns to the page. Forms:

| Input             | Meaning                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x,y`             | Absolute coordinate in view-projection units (`,`, `;` or a space between the numbers).                                                                                                                       |
| `@dx,dy`          | Offset east and north from the last fixed vertex, lengths in the default unit or each with its own unit (`@3ft,4ft`, `@3,4 m`).                                                                               |
| `@distance<angle` | Polar offset: `distance` (default unit or its own: `@10 mi<45`) from the last fixed vertex at `angle` degrees counter-clockwise from the straightedge angle (`cursor.angle`), like the angle lock.            |
| `distance`        | Direct distance entry: `distance` (`25`, `25 ft`, `3'`) from the last fixed vertex towards the pointer (angle-locked if the lock is on); along the straightedge when the pointer has not been on the map yet. |

**Units.** A length without a unit is in the **default unit**: `units.length` ([configuration.md](configuration.md#units), `editor.units.setLength`, `<olcad-unit-select>`), which with `'auto'` is the unit of the view projection (`m`; `ft` / `us-ft` for foot-based CRS; metres for geographic CRS). A unit typed after the number always wins: `m`, `km`, `cm`, `mm`, `ft` (also `foot`, `feet`, `'`), `us-ft` (`usft`, `ftus`, `US ft`), `in` (`inch`, `"`), `yd`, `mi`, `nmi` (`nm`), case-insensitive, with or without a space. Absolute `x,y` coordinates are map units and take no unit. Prompts name the default unit, and lengths and areas are shown in its system (measurements, the feature table, the command line echo).

Relative, polar and length input need a previous point and fail with `input-no-reference` while the first vertex is open; input without an active tool fails with `input-no-tool` (except while one dimension is selected: a number sets its field value, `-` clears it, `t <text>` sets a free text, see [field values](#field-values-of-dimensions)), unparsable text (also a unit on `x,y` or an unknown unit) with `input-invalid`, a tool or step that does not take points (select, the selection step of move and rotate, the modify tool while no vertex is picked) with `input-not-accepted`, as does a value the step refuses (for example `2` sides). The result (`{ ok, text, coordinate }`, `{ ok, text, value }`, `{ ok, text, length }` or `{ ok: false, code, error }`) is returned and emitted as event `input`; messages follow `locale` and `messages`.

Lengths are converted to metres, then to map units through the projection-aware helpers of the measure module (`offsetMetres`, `distanceMetres`, `unitsPerMetre`, exported): exact local scale in EPSG:3857 (1 / cos φ, so 100 m east at 49° N is about 152 map units), geodesic on the sphere in geographic projections, the projection's own point resolution elsewhere (about 1 in UTM). The scale is taken at the start point of an offset, so a very long typed segment in Web Mercator is off by the change of scale along it (a 10 km segment at 49° N by about 0.1 %).

## Keyboard

Bound by `<olcad-toolbar>` (or `bindKeyboard(editor)` from `ol-cad/ui`): Escape cancels, Enter finishes, Backspace removes the last vertex while drawing, steps back in the rectangle, circle, ellipse, regular polygon, curve, parallel, text, linear dimension, measure, move, rotate, scale, offset, mirror, trim, extend and template tools and drops a picked vertex in the modify tool, otherwise deletes the selection; Delete removes the vertex under the pointer in the modify tool and otherwise deletes the selection; Ctrl / Cmd+Z undoes, Shift+Ctrl / Cmd+Z and Ctrl / Cmd+Y redo. Configurable shortcuts and numeric input arrive with milestone 5.

## `select`

Purpose: choose the features the other tools act on (`editor.selection`).

- Click a feature to select it; clicking empty map clears the selection.
- Shift+click toggles a feature in the selection.
- Ctrl / Cmd+drag draws a box: every feature of a visible editor layer intersecting the box becomes the selection.
- Escape clears the selection.

The selection is highlighted on an overlay layer above all other layers (`selection` in the configuration): a light halo under a cyan stroke, a translucent fill, square grips on every vertex and a ringed circle for points, so a selected object stands out on any basemap while keeping its own style underneath. The selection survives tool switches. Features that disappear (deleted, discarded, layer removed) leave the selection by themselves.

**Outside edit mode** a click still selects: with `selection.inspect` (default `true`) the editor keeps a click selection active while edit mode is off, so a feature can be picked and its attributes viewed (Shift+click toggles, a click on empty map clears, Escape clears when no tool is active). No tool is involved and nothing can be changed; switching edit mode on keeps the selection, so modify, move and delete can act on it right away.

## `draw`

Purpose: insert a new feature into the active layer (`editor.layers.setActive`, the Edit button in the layer list), or into the **draft layer** while no layer is active. Precondition: that layer allows `insert`.

- The geometry type comes from the layer. A layer with `geometryType: 'Any'` (the draft layer) draws the `type` the tool was activated with (`activate('draw', { type: 'Point' | 'LineString' | 'Polygon' })`, points by default); a fixed-type layer refuses a different `type`. `<olcad-toolbar>` offers three buttons, Draw point, Draw line and Draw polygon; with a layer active only the matching one is enabled.
- Points: one click.
- Lines: click each vertex, double-click or Enter to finish (at least two vertices).
- Polygons: click each vertex, double-click or Enter to close.
- Backspace removes the last vertex, Escape aborts the drawing. The tool stays active, so several features can be drawn in a row.
- Each inserted feature becomes the selection, so `<olcad-attribute-form>` (or a host form listening to `selectionchange`) can capture its attributes right away.
- The Edit button of `<olcad-layer-list>` selects the target: it switches edit mode on and sets the active layer without starting a tool; a draw button then inserts into that layer (for a point layer such as hydrants every click places an object).
- Multi-part layers (`MultiPoint`, `MultiLineString`, `MultiPolygon`) receive one part per drawing, wrapped into the multi geometry.
- New features get the `default` values of the layer schema. An invalid geometry (for example a self-intersecting ring) is rejected with `validationerror` and nothing is inserted.
- Changing the active layer while drawing switches the tool to the new layer (keeping the type when the layer allows it), or deactivates it when that layer does not allow inserts. Clearing the active layer switches to the draft layer.

**Draft layer** (config `draft`, default on; `editor.layers.getDraft()`): new objects drawn without an active layer land there without any attributes. Draft objects are local: they are validated, selectable, snappable, editable with the other tools and part of undo / redo, but they never appear in the change set, `accept` and `discard` leave them alone, and `editor.changes.hasChanges()` ignores them. Delete them like any feature, or move on by inserting into a real layer. `<olcad-attribute-form popup>` opens no dialog for them.

## `rectangle`

Purpose: insert a rectangle from two corners into the active layer, or into the draft layer while no layer is active. Precondition: that layer allows `insert` and accepts polygons (`Polygon`, `MultiPolygon` or `Any`); on a point or line layer the tool cannot activate.

1. **First corner**: click on the map (snapped like any other point) or type `x,y`.
2. **Opposite corner**: click on the map, or type `x,y`, `@dx,dy`, `@distance<angle` or a plain `distance` relative to the first corner (direct distance entry follows the pointer). A dashed preview of the rectangle follows the pointer. A corner on one of the rectangle's axes (no width or no height) is ignored.

- The sides follow the **straightedge** angle (`cursor.angle`, see [Straightedge](#straightedge)): with 0° the rectangle is axis-aligned; after "Align to segment" it comes out parallel to that segment. The ring is counter-clockwise whatever the drag direction, starting at the first corner.
- The polygon is inserted like a drawn one: schema defaults, wrapped for `MultiPolygon` layers, one `insertFeature` command, selected afterwards (`featureinsert` opens the attribute popup). The tool stays active, so several rectangles can be drawn in a row; it follows the active layer like the draw tool.
- Escape or Backspace drops the first corner. The input bar shows the prompt of the current step.

## `circle`

Purpose: insert a circle into the active layer, or into the draft layer while no layer is active. Precondition: that layer allows `insert` and accepts polygons (`Polygon`, `MultiPolygon` or `Any`). One tool with three constructions, chosen with `editor.tools.activate('circle', { method })` (`getActiveOptions()` reports the method in effect; the default is `centre-radius`):

| `method`        | Steps                                                                                                                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `centre-radius` | **Centre** (click or `x,y`), then **Radius**: type the radius in metres (a plain number) or click a point on the circle; the preview shows the circle through the pointer and the radius leg.                               |
| `centre-point`  | **Centre**, then a **point on the circle** (click, or `x,y` / `@dx,dy` / `@distance<angle` / `distance` relative to the centre); the preview marks the point and shows the circle through it.                               |
| `three-point`   | **First**, **second** and **third point** on the circle (click, or typed relative to the previous point); after two points the preview shows the circle through the pointer, or just a line while the points are collinear. |

- A point equal to the centre (zero radius) and three collinear points are ignored: the tool waits for another point.
- The circle is stored as a polygon, linearized with `curves.tolerance` (metres, converted to map units at the centre; see [configuration.md](configuration.md#curves)): the segment count keeps every chord within the tolerance, clamped to 24 … 1024 segments. The ring starts east of the centre and runs counter-clockwise.
- The polygon is inserted like a drawn one: schema defaults, wrapped for `MultiPolygon` layers, one `insertFeature` command, selected afterwards (`featureinsert` opens the attribute popup). The tool stays active for the next circle of the same method and follows the active layer like the draw tool.
- Escape or Backspace drops the last fixed point (the centre, or the latest of the three points). The input bar shows the prompt of the current step.
- Toolbar: one flyout button (a triangle in its corner) offering the three constructions, see [ui.md](ui.md#olcad-toolbar).

## `ellipse`

Purpose: insert an ellipse into the active layer, or into the draft layer while no layer is active. Precondition: that layer allows `insert` and accepts polygons (`Polygon`, `MultiPolygon` or `Any`). One tool with three constructions, chosen with `editor.tools.activate('ellipse', { method })` (`getActiveOptions()` reports the method in effect; the default is `centre-axis`):

| `method`      | Steps                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `centre-axis` | **Centre** (click or `x,y`), **end of the first axis** (click, or typed relative to the centre; fixes its length and direction), then the **other half-axis**.                 |
| `axis`        | **First end** and **second end** of the first axis (the second typed relative to the first), then the **other half-axis**; the centre is halfway between the ends.             |
| `box`         | **First corner** and **opposite corner** (relative to the first) of a box whose sides follow the straightedge angle; the ellipse fills the box, and the preview shows the box. |

- **Other half-axis**: type its length in metres (a plain number, taken as a value: `editor.input('12')` returns `{ ok: true, value: 12 }`; 0 or less is ignored), or click / type a point: its distance from the first axis is the half-axis. Relative input in this step is measured from the centre.
- Degenerate input is ignored and the tool waits: an axis end on the centre (or on the first end), a half-axis point on the axis, a box without width or height.
- The ellipse is stored as a polygon, linearized with `curves.tolerance` (metres, converted to map units at the centre; see [configuration.md](configuration.md#curves)) with equal parameter steps, as many as a circle with the longer half-axis needs (24 … 1024), so every chord stays within the tolerance. The ring starts at the end of the first axis and runs counter-clockwise. Exported helpers: `ellipseFromCentre`, `ellipseFromAxis`, `ellipseFromCorners`, `ellipsePolygon` (type `EllipseDefinition`).
- Inserted like a drawn polygon: schema defaults, wrapped for `MultiPolygon` layers, one `insertFeature` command, selected afterwards (`featureinsert` opens the attribute popup). The tool stays active for the next ellipse of the same method and follows the active layer.
- Escape or Backspace drops the last fixed point. Toolbar: the flyout button Draw ellipse, see [ui.md](ui.md#olcad-toolbar).

## `regular-polygon`

Purpose: insert a regular polygon (equal sides, 3 or more) into the active layer, or into the draft layer while no layer is active. Precondition: that layer allows `insert` and accepts polygons (`Polygon`, `MultiPolygon` or `Any`). `editor.tools.activate('regular-polygon', { sides })` presets the side count and skips the first step; a `sides` that is not a whole number from 3 to 1024 fails `canActivate`.

1. **Number of sides** (prompt `Number of sides <6>`): type a whole number of 3 or more (up to 1024) into the input bar; it is taken as a value, not a distance (`editor.input('5')` returns `{ ok: true, value: 5 }`). Enter keeps the count shown; a click on the map (or a typed `x,y`) also keeps it and sets the centre right away. An invalid number is refused with `input-not-accepted`. The count is remembered for the session (6 at first) and reused for the next polygons.
2. **Centre**: click on the map or type `x,y`. Escape or Backspace returns to the number of sides.
3. **Vertex**: click, or type `x,y`, `@dx,dy`, `@distance<angle` or a plain `distance` (the circumradius in metres, towards the pointer) relative to the centre. The polygon is inscribed in the circle through this point: the point is its first vertex, the others follow counter-clockwise at equal angles. The preview shows the polygon through the pointer, the radius leg and markers on the centre and the pointer. A vertex on the centre is ignored. Escape or Backspace drops the centre.

- The ring is exact (no linearization): `sides` vertices plus the closing one, counter-clockwise.
- The polygon is inserted like a drawn one: schema defaults, wrapped for `MultiPolygon` layers, one `insertFeature` command, selected afterwards (`featureinsert` opens the attribute popup). The tool then asks for the next centre with the same count and follows the active layer like the draw tool.
- The input bar shows the prompt of the current step (`Tool.getPrompt`, event `toolprompt`). Toolbar button: Draw regular polygon, see [ui.md](ui.md#olcad-toolbar).

## `curve`

Purpose: insert a curve (a cubic Bézier) into the active layer, or into the draft layer while no layer is active. Precondition: that layer allows `insert` and accepts lines (`LineString`, `MultiLineString` or `Any`). A handle at each end controls the entry and exit angle: its direction is the tangent at that end, its length the tension.

1. **Start point**: click on the map or type `x,y`.
2. **End point**: click, or type `x,y`, `@dx,dy`, `@distance<angle` or a plain `distance` relative to the start. A point equal to the start is ignored. The curve appears with its handles one third along the chord from each end, so it starts straight.
3. **Shape**: click a handle (within the pick radius, at least 10 px) to pick it up; it follows the crosshair and the curve bends live. Click where it goes, or type a point relative to the handle's end point (`@30<45` makes the curve leave at 45° with a 30 m handle). Escape puts the handle back. Repeat for either handle as often as needed. Enter inserts the curve (a handle being placed stays where the pointer is). Escape or Backspace in the shape step drops the end point; in the end step the start.

- The curve is stored as a line, linearized with `curves.tolerance` (metres, converted to map units at the start; see [configuration.md](configuration.md#curves)): the number of equal parameter steps follows Wang's bound for a cubic, `ceil(sqrt(0.75 d / t))` with `d` the largest second difference of the control points, so no chord deviates more than the tolerance; a straight curve is one segment, at most 1024.
- The line is inserted like a drawn one: schema defaults, wrapped for `MultiLineString` layers, one `insertFeature` command, selected afterwards (`featureinsert` opens the attribute popup). The tool stays active for the next curve and follows the active layer like the draw tool.
- The input bar shows the prompt of the current step (`Tool.getPrompt`, event `toolprompt`). Toolbar button: Draw curve, see [ui.md](ui.md#olcad-toolbar).

## `parallel`

Purpose: draw a line parallel to an existing line, polyline or polygon, following its bends, as far as the crosshair says. Precondition: a layer that takes lines (the active layer, else the draft layer), as for `curve`.

1. **Select the object** (skipped when a single line or polygon is selected): click it. Read-only objects are fine. It stays the reference until Escape.
2. **Start point**: click (snapped) or type `x,y`. Its perpendicular distance from the object's nearest segment and its side fix the parallel; a start on the object traces the object. The nearest part of a multi-part object, or ring of a polygon (outer or hole), is followed. Parts the parallel cannot follow at that distance are skipped: a segment shorter than the distance on the inside of a bend, the walls of a notch narrower than twice the distance (the parallel runs straight across), a too-short end leg. The parallel also never comes closer than its distance to any other part of the object: at a hairpin, a pocket with a narrow mouth or where the object crosses itself it skips the vertices in between and continues where its offsets cross, or it ends there; a polygon ring that loses parts becomes an open path around the start. Only when nothing is left, a ring would turn inside out (a start in the middle of a small parcel), or the start's own stretch is too close to another part, the prompt says so and the tool waits.
3. **End**: move the crosshair along the object. The dashed preview runs from the start along the parallel to its point nearest the crosshair, through every bend (mitre joins, bevels at sharp turns, as in `offset`); on an open line it stops at the line's end, around a polygon it follows the pointer past corners and the ring's first vertex, at most once around. Click (or type `x,y` / `@dx,dy` relative to the start) to insert the line there; or type a plain number, the length in metres along the parallel in the direction the crosshair pulls (converted at the start point; 0 or less is ignored).

- The line is inserted like a drawn one into the active or draft layer: schema defaults, multi-part wrapping, one `insertFeature`, selected afterwards (`featureinsert` opens the attribute popup). The tool returns to **Start point** with the same reference.
- Escape or Backspace steps back: end → start point → object (forgetting the reference and clearing the selection). The tool follows the active layer.
- Exported helpers: `parallelPath(geometry, start)` (`{ path, closed, distance }`, or a `ParallelFailure`: `'unsupported'`, `'collapsed'`, `'too-close'`), `subPath(path, closed, from, to)`, `stationOf(path, point)`, `pathLength(path)`.
- Toolbar: Draw parallel (`.olcad-toolbar__tool--parallel`, icon `drawParallel`).

## `text`

Purpose: place a text on the map as a point object of a text layer (`layers[].text`, see [configuration.md](configuration.md)), or of the draft layer while no layer is active (the draft layer is always a text layer). Precondition: that layer allows `insert`, is a text layer and takes points; otherwise the tool cannot be activated.

1. **Insert point**: click (snapped) or type `x,y`.
2. **Text height** in metres on the ground, prompt `Text height in metres <2.5>`: type a number, or press Enter to keep the one offered (the layer's `text.height`, then the last height used). 0 or less is refused with a notice. A marker shows the insert point.
3. **Text**: type it into the command line and press Enter. The whole line is the text, numbers included (`editor.input('42')` returns `{ ok: true, kind: 'text' }` in this step). A sample shows the height and angle.

- The text is inserted as one `insertFeature`: a point (wrapped for `MultiPoint` layers) with the layer's schema defaults and the text properties `text`, `textHeight` (metres) and `textRotation` (the straightedge angle in degrees, counter-clockwise), or the names set in `layers[].text`. It is selected; `featureinsert` opens the attribute popup for a layer with schema fields. The tool returns to step 1 for the next text and follows the active layer.
- Rendering: the text is drawn left-aligned on its baseline at the point, `textHeight` metres high (it scales with the zoom; texts below one pixel are hidden), rotated by `textRotation`, in `text.color` with a `text.haloColor` outline; clicks on its letters select it. Exported: `textStyleFunction(text, baseStyle, getProjection)`, `textStyle`, `featureText`, `TEXT_DEFAULTS`, `textTarget`.
- Escape or Backspace steps back (text → height → point). Toolbar: Draw text (`.olcad-toolbar__tool--text`, icon `drawText`).

## `dimension-linear`

Purpose: draw linear dimensions into a dimension layer ([`layers[].dimension`](configuration.md#layersdimension-object-form), configured or a local one). Precondition: some dimension layer allows `insert`; there is no draft fallback. Activating the tool makes the active layer a dimension layer by itself — the one already active when it is a dimension layer, else the first dimension layer in the layer list (`pickDimensionLayer`, exported) — and the previously active layer comes back when the dimension tools end (another tool, Escape, edit mode off), unless another layer was chosen meanwhile. Making a non-dimension layer active while the tool runs ends it. One tool with six variants (`editor.tools.activate('dimension-linear', { method })`, default `aligned`):

| `method`   | Measures                                                                                                                                                                                                  | Stored as                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `aligned`  | The true distance between two points; the dimension line runs parallel to them.                                                                                                                           | `dimType: 'aligned'`                       |
| `rotated`  | The distance projected onto the straightedge angle at the second point; set the straightedge to 0° for horizontal, 90° for vertical, or align it to an edge.                                              | `'rotated'` with `rotation`                |
| `chain`    | Consecutive spans on **one** dimension line in the first span's direction: every further point adds a span from the last point, measured along that direction.                                            | `'rotated'`, shared `rotation` and `chain` |
| `baseline` | Every point from one origin; each further dimension line one 8 mm spacing (paper, at the reference scale) further out than the last.                                                                      | `'rotated'`, shared `rotation` and `chain` |
| `running`  | Every point from one origin on one common line: cumulative values written along the extension lines beyond the dimension line (DIN 406), an origin circle with "0", arrows pointing away from the origin. | `'running'`, shared `rotation` and `chain` |
| `tie`      | A survey tie distance: the direct distance between two points, its value written along a thin dashed line; no dimension line step.                                                                        | `'tie'` (offset 0)                         |

1. **First point** (or **Origin** for `baseline` and `running`): click (snapped to vertices, midpoints, perpendicular feet like every tool) or type `x,y`.
2. **Second point**: click or type, also relative to the first (`@12.5<30`). A point equal to the first is ignored; nothing measured along the direction (a rotated dimension perpendicular to the straightedge) waits for another point. The direction of a chain, baseline or running set is fixed here.
3. **Dimension line** (not for `tie`): the dimension follows the pointer in the layer's style; a click fixes the line there and **inserts** the dimension with its GIS value, or type the offset (a length; it goes to the side the pointer is on). A `tie` is inserted with its second point. The field measurement comes afterwards: click the value (see [field values](#field-values-of-dimensions)).
4. `chain`, `baseline`, `running`: **next point**, again and again, each span inserted as it is placed; relative input is measured from the last point (chain) or the origin. **Enter**, Escape or Backspace while the tool waits for the next point ends the set.

Each dimension is one `insertFeature` command with `dimType`, `offset`, `gisValue` (metres, rounded to millimetres), `fieldValue` and `text` (both `null`), `refs` (for each point snapped onto an object with an id: the object and its vertex, segment midpoint or the point on the segment; a later change of that object makes the dimension stale, see [api.md](api.md#editordimensions)), `rotation` (rotated, chain, baseline, running), `chain` (the set's id, `c-…`) and the layer's schema defaults, and is selected; no attribute popup opens. A chain span's offset is chosen so its line coincides with the first span's line. The tool stays active and follows the active layer. Escape drops the dimension in progress, Backspace steps back one step. Toolbar: one flyout button with the six variants, see [ui.md](ui.md#olcad-toolbar).

### Field values of dimensions

A dimension is drawn with its **GIS value** (measured from the map, in the layer's `computedColor`). The real-world measurement is added afterwards: in edit mode, **click the value on the map** (with no tool, the select tool, or a dimension tool that has nothing in progress — also a station line waiting for its next point). The dimension is selected and the inline box of [`<olcad-dimension-input>`](ui.md#olcad-dimension-input) opens at the value, pre-filled with the field value in the layer's unit (empty, with the GIS value as placeholder, while none is set): type the field value and press Enter (a length in the default unit; an angle in the layer's `angleUnit`; a signed height for a level, a percentage for a slope; `station offset` in one entry for a station, the offset taking the side of the measured one), an empty box or `-` clears the field value and the free text, `t <text>` sets a free text instead (`{value}` inserts the value); Escape or leaving the box cancels. The value is then drawn in `color` (or `deviationColor` when it differs from the GIS value beyond `tolerance`). The same text works in the command line while one dimension is selected and no tool runs, and headless through `editor.dimensions.input(feature, text)` or `setFieldValue` ([api.md](api.md#editordimensions)); the attribute form of a dimension layer offers **Field value** and **Text** too ([ui.md](ui.md#olcad-attribute-form)).

## `dimension-angular`

Purpose: dimension an angle in a dimension layer. Precondition and layer choice as `dimension-linear`. Two variants (`{ method }`, default `points`):

| `method`   | Steps                                                                                                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `points`   | A point on the **first leg**, the **vertex**, a point on the **second leg** (clicks snapped and recorded as `refs`, or typed; relative input from the vertex).                                                                      |
| `segments` | The **first edge** and the **second edge**: clicks on segments of visible objects (lines and polygon edges, picked with the raw pointer). The vertex is where their lines meet, also outside the edges; parallel edges are ignored. |

Then the **arc**: the pointer chooses which angle is dimensioned (the sector it is in: inner or reflex for points, one of the four angles between two lines for edges) and the arc radius; a click fixes it and inserts the angle with its GIS value, a typed length sets the radius and inserts. The field angle comes afterwards by clicking the value (a plain number in the layer's `angleUnit`, degrees or gon; see [field values](#field-values-of-dimensions)). Stored as `dimType: 'angular'`, geometry [leg, vertex, leg] counter-clockwise, `offset` = arc radius in metres, angles in degrees.

## `dimension-radial`

Purpose: dimension a circle or arc in a dimension layer (chosen as for `dimension-linear`). Three variants (`{ method }`, default `radius`): `radius` (R), `diameter` (Ø), `arc` (arc length, ⌒).

1. **Curve**: click a circle, an arc or a curved edge. The circle is fitted to the evenly turning vertices around the click (linearized circles and circular arcs inside lines and rings; an ellipse's turns vary too much to fit, use three points there). Where no circle is found the prompt asks for **three points on the arc** (snapped), and their circumcircle is used.
2. `arc` only: **start** and **end** on the curve (projected onto the circle); the arc is the one holding the picked point (or the middle of the three points).
3. **Place**: the pointer sets the direction of the leader (radius, diameter) or the distance of the dimension arc outside the circle (arc); a click fixes it and inserts the dimension with its GIS value, a typed length sets the offset and inserts. The field value comes afterwards by clicking the value ([field values](#field-values-of-dimensions)).

Stored as `dimType` `radius` / `diameter` with [centre, point on the circle], `arc` with [centre, start, end] counter-clockwise; `offset` in metres. Radial dimensions carry no references yet.

## `dimension-survey`

Purpose: survey and landscape dimensions in a dimension layer (chosen as for `dimension-linear`). Three variants (`{ method }`, default `station`):

| `method`  | Steps                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `station` | Orthogonal survey. **Start** and **end** of the measuring line (snapped, referenced), then each **point** to record (click or typed) is inserted at once with its GIS station and offset. The field values are typed afterwards by clicking the value — also while the line waits for its next point — as `station offset` in one entry separated by a space (`12.47 3.05`; the typed offset takes the side of the measured one) or a single number for the station only. Enter while waiting for a point writes the **end measure** (the line's length at its end); Escape ends the line. |
| `level`   | Spot level. The **point** (snapped), the **label position** (a click; Enter puts it beside the point), then the **height** in metres (`112.45`, `-0.15`).                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `slope`   | Slope. Click the **upper** and the **lower spot level** of the active layer: the percentage is their height difference over the horizontal GIS distance, the arrow points downhill, both levels are referenced, and the slope is inserted with the second level (a measured percentage is typed afterwards by clicking the value). Clicking elsewhere draws a free arrow (start, end) whose percentage must be typed.                                                                                                                                                                      |

Stored as `dimType` `station` ([line start, line end, point]; the end measure repeats the line end; `fieldValue` station, `fieldOffset` signed offset, `gisOffset`; all points of one line share `chain`), `level` ([point, label position]; `fieldValue` height, `levelKind` `finished` / `structural` / `existing` / `planned`, default `finished` for architecture, else `existing`) and `slope` ([start, end] downhill; `gisValue` % when derived, `fieldValue` %). Levels are drawn with an open triangle (finished, existing) or a filled one (structural, planned), a cross in the surveying preset — check the legend against DIN 1356-1 / DIN 18702 for your plans. A selected level or slope takes a typed number in the inline box or the command line (negative allowed), a selected station `station offset`.

## `modify` (vertex edit)

Purpose: edit the vertices of one object, CAD grip style. No precondition beyond edit mode: it can be started without a selection.

1. **Select the object** (skipped when exactly one updatable feature is selected): click it. With several features selected, click the one to edit. Read-only features cannot be edited (`editor.canEdit('update', feature)`).
2. **Pick a vertex**: the selected object's vertices are its grips. Click a vertex to pick it up; it follows the crosshair. Click a segment to pick up a new vertex at that point of the segment. Alt+click a vertex, or press Delete while the pointer is over one, removes it.
3. **Place it**: click on the map, or type `x,y`, `@dx,dy`, `@distance<angle` or a plain `distance` relative to where the vertex was. Snapping and the angle lock apply, with the vertex's old position as reference. Escape or Backspace drops the vertex back.

- Each placement or removal is one `updateGeometry` command: one undo step, validated like any other command. A rejected result (for example a ring that would self-intersect, or a line left with one vertex) leaves the geometry unchanged and emits `validationerror`.
- Continue with the next vertex, or press Enter to finish: the object is deselected and the tool asks for the next one. Escape while no vertex is picked finishes too. Switching tools keeps the selection.
- The input bar shows the prompt of the current step (`Tool.getPrompt`, event `toolprompt`).
- **Dimensions** are edited through their grips instead of their vertices: one grip per definition point; for linear dimensions (aligned, rotated, running) a grip on the dimension line (its `offset`) and one on the value (its `textPosition` along the line); for angular dimensions a grip on the arc (its radius); for radius and diameter one at the leader end; for arc lengths one on the dimension arc. Tie, station, level and slope dimensions have point grips only. Pick a grip, then place it like a vertex; the dimension is drawn in the layer's style while it follows the crosshair. A moved definition point records the reference of the object it snaps to (or drops the old one) and refreshes the stored GIS value; the line and value grips change only `offset` / `textPosition`. One command per placement. `dimensionGrips(feature, values, projection)` and `moveGrip(…)` are exported for hosts building their own grip editing.

## `move`

Purpose: translate features by a displacement, CAD style. No precondition: it can be started without a selection.

1. **Select the objects** (skipped when a selection exists): click, Shift+click adds, Ctrl / Cmd+drag selects a box; Enter continues once something updatable is selected.
2. **Base point**: click on the map (snapped like any other point, so it can sit on the object or on another geometry) or type `x,y`.
3. **Second point**: click on the map, or type `@dx,dy`, `@distance<angle` or a plain `distance` relative to the base point (direct distance entry follows the pointer). A dashed preview of the moved objects and the displacement vector follows the pointer. Two quick clicks are two picks, never a double-click zoom.

- The displacement is applied to every selected feature that may be updated (`editor.canEdit('update', feature)`; read-only ones stay) and submitted as one `updateGeometry` command (a composite for several features): one undo step, validated like any other command.
- Afterwards the moved objects are deselected and the tool asks for the next objects; switch tools at any time. Escape steps back (second point → base point → selection, clearing it); Backspace drops the base point. Switching tools keeps the selection.
- The input bar shows the prompt of the current step (`Tool.getPrompt`, event `toolprompt`).

## `rotate`

Purpose: rotate features around a centre by an angle given with two points, CAD style. No precondition: it can be started without a selection.

1. **Select the objects** (skipped when a selection exists): click, Shift+click adds, Ctrl / Cmd+drag selects a box; Enter confirms the selection once something updatable is selected.
2. **Centre of rotation**: click on the map (snapped like any other point) or type `x,y`.
3. **First point of the angle**: click, or type `x,y`, `@dx,dy` or `@distance<angle` relative to the centre. A line from the centre to the pointer previews the first leg. A point on the centre is ignored (no direction).
4. **Second point of the angle**: click, or type a point relative to the centre (a plain `distance` follows the pointer). The angle from the first leg to the second, counter-clockwise positive, is the rotation; a dashed preview of the rotated objects and both legs follows the pointer. Two quick clicks are two picks, never a double-click zoom.

- The rotation is applied to every selected feature that may be updated (`editor.canEdit('update', feature)`; read-only ones stay) and submitted as one `updateGeometry` command (a composite for several features): one undo step, validated like any other command.
- Afterwards the rotated objects are deselected and the tool asks for the next objects; switch tools at any time. Escape steps back (second point → first point → centre → selection, clearing it); Backspace steps back from the angle points. Switching tools keeps the selection.
- The input bar shows the prompt of the current step (`Tool.getPrompt`, event `toolprompt`).

## `scale`

Purpose: scale features uniformly around a base point, CAD style. No precondition beyond edit mode; it can be started without a selection.

1. **Select the objects** (skipped when a selection exists): click, Shift+click adds, Ctrl / Cmd+drag selects a box; Enter confirms the selection once something updatable is selected.
2. **Base point**: click on the map (snapped) or type `x,y`. The base point stays fixed.
3. **Scale factor or reference point**: type a factor (`2` doubles, `0.5` halves) and press Enter, or click / type a reference point (`x,y`, `@dx,dy`, `@distance<angle` relative to the base). A factor that is not greater than 0 is refused with a notice in the prompt; a reference point on the base is ignored.
4. **Target point** (after a reference point): click or type a point relative to the base. The factor is the distance base → target divided by the distance base → reference; a plain number is a length in metres from the base, so `25` scales the reference length to 25 m. A dashed preview of the scaled objects and both legs follows the pointer.

- The scale is applied to every selected feature that may be updated (read-only ones stay) and submitted as one `updateGeometry` command (a composite for several features): one undo step, validated like any other command. Exported helpers: `scaleGeometry(geometry, factor, anchor)` (a scaled copy) and `scaleFactor(base, reference, target)`.
- Afterwards the scaled objects are deselected and the tool asks for the next objects. Escape steps back (target → factor → base point → selection, clearing it); Backspace steps back from the factor and target steps. Switching tools keeps the selection.

## `mirror`

Purpose: reflect objects across a line, in place or as copies, CAD style. No precondition beyond edit mode.

1. **Select the objects** (skipped when something is selected at activation): click, Shift+click adds, Ctrl / Cmd+drag a box; Enter continues. Read-only objects may be selected (they can be copied).
2. **First point of the mirror line**: click (snapped) or type `x,y`.
3. **Second point of the mirror line**: click, or type `x,y`, `@dx,dy` or `@distance<angle` relative to the first point (angle lock and perpendicular snap work from it). A dashed preview shows the mirrored objects and the line, extended across them. A point on the first one is ignored.
4. **Create a copy? [y/N]**: the preview stays. Enter on the empty command line, `n` / `no` / `nein` or a click on the map mirror the objects **in place**; `y` / `yes` / `j` / `ja` keep the originals and insert mirrored **copies**. Other text is refused.

- In place: every selected object the user may update gets its mirrored geometry, as one `updateGeometry` command (a composite for several): one undo step. Read-only objects are skipped; the next prompt says how many.
- Copies: one composite of inserts (one undo step). Each copy goes to its source layer when it exists, allows `insert` and takes the type, else the active layer, else the draft layer (the template rule); it carries the original's attributes (without the layer's id property) over the target layer's schema defaults. The popup attribute form opens for the copies one after another ("1 of 3") so their attributes can be updated.
- Geometry (`mirrorGeometry`, `reflectPoint` in `src/core/geometry/mirror.ts`): every vertex is reflected; polygon rings are reversed afterwards so they keep their winding.
- Afterwards the selection is cleared and the tool asks for the next objects. Escape and Backspace step back (copy question → second point → first point → selection, clearing it). A copy or mirror rejected by validation keeps the question with a notice. Switching tools keeps the selection.

## `offset`

Purpose: create a parallel copy of a line or polygon at a typed distance, CAD style. No precondition beyond edit mode: it can be started without a selection, and the source may be on a read-only layer.

1. **Select the object** (skipped when exactly one line or polygon is selected): click it. Points cannot be offset.
2. **Offset distance**: type the distance in metres into the input bar; it is taken as a value (`editor.input('10')` returns `{ ok: true, value: 10 }`), a non-positive number is refused. The distance is remembered for the session: the prompt shows `Offset distance <10>` and Enter keeps it. Escape or Backspace returns to the selection (and clears it).
3. **Side**: click on the side the copy goes to, or type `x,y`: for a line the left or right of its nearest segment, for a polygon inside (the copy is smaller) or outside (larger). A dashed preview follows the pointer. Escape or Backspace returns to the distance.

- The copy is built with planar math (`src/core/geometry/offset.ts`): every segment is shifted by the distance (metres converted to map units at the object), corners are joined where the shifted segments meet (mitre), turns sharper than about 30° get a bevel instead of a spike, open lines keep their ends square; a polygon's holes shrink when it grows. A segment that would run backwards (shorter than the distance on the inside of a turn), a polygon shrunk past its size, or a click exactly on the line is ignored: the tool waits for another click. A multi-part geometry is offset part by part; see `docs/decisions/0003-planar-offset-without-geometry-library.md` for the limits.
- Target layer: the source object's layer when it allows `insert` and accepts the geometry; otherwise the active layer under the same rule; otherwise the draft layer. With none of them fitting, the click is ignored. The copy is inserted like a drawn geometry: schema defaults, wrapped for multi-part layers, one `insertFeature` command, validated (a self-intersecting result is rejected with `validationerror` and the tool keeps asking for the side), selected afterwards (`featureinsert` opens the attribute popup).
- The copy becomes the next source: Enter keeps the distance and another click makes the next parallel; clicking another object replaces the selection. Switching tools keeps the selection.
- The input bar shows the prompt of the current step (`Tool.getPrompt`, event `toolprompt`).

## `trim`

Purpose: cut lines back to a boundary, CAD style. No precondition beyond edit mode.

1. **Select the boundary** (skipped when something with segments is selected; several selected lines or polygons are all boundaries): click a line or polygon. Read-only layers are fine; the boundary is never changed.
2. **Click the part of a line to remove**, as often as needed: the clicked part up to the nearest crossings with the boundary on either side is removed (to the line's end where there is no crossing on that side). A dashed preview shows the boundary and the piece under the pointer. The line is hit with the real pointer position within at least 10 px (snapping does not move it); boundaries are not targets. Enter, Escape or Backspace drop the boundary and return to step 1.

- An end piece: one `updateGeometry`. An interior piece of a line splits it: the original keeps its id and the first part, the second part is inserted into the same layer with the same attributes (id property removed) — one composite command; this needs `insert` on the layer and opens the attribute popup (`featureinsert`) on schema layers. An interior piece of a multi-line becomes two parts of the same feature.
- After the first successful click the selection is cleared; the tool keeps the boundary for further clicks. Each click is one undo step.
- A click that changes nothing (no line there, a line that cannot be updated, no crossing bounding the clicked part, a split without insert rights, an invalid result) shows the reason in front of the prompt. Only `LineString` and `MultiLineString` features are trimmed. Geometry in `src/core/geometry/trim.ts` (`trimLine`), crossings in `src/core/geometry/intersect.ts` (`segmentIntersection`).
- The input bar shows the prompt of the current step (`Tool.getPrompt`, event `toolprompt`).

## `extend`

Purpose: lengthen lines up to a boundary. No precondition beyond edit mode.

1. **Select the boundary**: as for `trim`.
2. **Click a line near the end to extend**, as often as needed: the end nearer to the click (measured along the line) moves along the direction of its end segment onto the first boundary crossing ahead; the line keeps its vertex count. A dashed preview shows the extension under the pointer. Enter, Escape or Backspace return to step 1.

- One `updateGeometry` per click; the selection is cleared after the first one, the boundary kept.
- Refused with a reason in front of the prompt: no line there, a line that cannot be updated, the ray from the end misses every boundary, or the end already lies on one. Geometry in `src/core/geometry/trim.ts` (`extendLine`), rays in `src/core/geometry/intersect.ts` (`rayIntersection`).
- The input bar shows the prompt of the current step.

## `template-copy`

Purpose: copy one object or a group into a named **template** (`editor.templates`), to insert copies elsewhere later from the Templates panel. No precondition beyond edit mode; read-only objects can be copied. Copying changes no data.

1. **Select the objects** (skipped when something is selected at activation): click, Shift+click adds, Ctrl / Cmd+drag a box; Enter continues.
2. **Base point**: click (snapped) or type `x,y`: the point copies will be inserted at.
3. **Template name**: the prompt suggests `Template <n>`; type a name into the command line and press Enter, or press Enter on the empty line to keep the suggestion. The text is taken as is (`Tool.handleText`), even when it looks like a number.

- The template is stored (geometries, attributes without the layer's id property, source layers), the selection is cleared and the tool starts over; the prompt confirms `Template "…" stored.`
- Escape and Backspace step back: name → base point → objects (clearing the selection). Switching tools keeps the selection.

## `template-insert`

Purpose: insert copies of a template. Started from `<olcad-template-list>` or with `editor.tools.activate('template-insert', { template: id })`; available when the template exists and at least one of its objects has a target layer.

- A dashed preview follows the pointer with the template's base point at it (snapped). Every click, or a typed point (`x,y`, or `@dx,dy` relative to the last copy), inserts one copy as one composite command (one undo step) and selects it.
- Target layer per object: the layer it was copied from when that layer exists, allows `insert` and takes the type; else the active layer; else the draft layer. Objects without a target are skipped and not previewed. Copies keep their attributes over the layer's schema defaults; the attribute popup stays closed.
- Size: in Web Mercator a copy keeps its size in metres at another latitude (see [api.md](api.md#editortemplates)).
- Escape, Enter or Backspace end the tool.

## Measurement

Three read-only tools measure on the map without changing data: `measure-distance`, `measure-area` and `measure-angle` (`Tool.readOnly`). They run with edit mode on **or off**: `editor.tools.activate('measure-distance')` works while viewing and does not switch edit mode on, and switching edit mode off keeps a measure tool running (other tools are deactivated). While one runs outside edit mode, clicks are measure points rather than inspect selections; snapping and numeric input work as in edit mode; the crosshair is not shown.

- **Distance** (`measure-distance`): click (or type) points along the way; the dashed line shows each segment's length and the total at the pointer. **Enter** finishes (2 points or more).
- **Area** (`measure-area`): click the corners; the polygon shows its area and perimeter. **Enter** finishes (3 corners or more).
- **Angle** (`measure-angle`): first point, vertex, second point; finishes on the third. Shows the angle at the vertex (0–180°) with an arc; the reflex angle is listed too.
- **Alt+click** an object (nothing in progress): with the distance tool a line's length or a polygon's perimeter, with the area tool a polygon's area (holes subtracted) and perimeter; the nearest part of a multi-part object; any visible editor layer, read-only ones included.
- Typed points: `x,y`, and `@dx,dy` / `@distance<angle` relative to the last point. **Backspace** drops the last point, **Escape** drops the measurement in progress (finished ones stay). The tool stays active for the next measurement.
- Finished measurements are kept in `editor.measurements` and drawn with labels on an overlay until removed (`remove(id)`, the panel's remove buttons) or cleared (`clear()`, the toolbar's Clear button). They are never part of a layer, the selection or the change set.
- Values: metres, square metres, degrees. Planar in a true-to-scale metric projection (UTM); in Web Mercator corrected for the local scale (lengths) and integrated on the projection's sphere (areas); on the sphere in geographic projections. Display: `12.35 m`, `1.234 km`, `950.0 m²`, `1.25 ha`, `2.500 km²`, `45.0°`.

## Delete

Not a tool but an action: `editor.deleteSelection()`, the Delete button in the toolbar, or the Delete key. Deletes the selected features whose layers allow `delete` as one command; the others stay selected. Returns `false` when nothing could be deleted.

## Planned

Arc drawing (and the 3-point rectangle, the 2-point circle), fillet, chamfer, split and merge arrive with milestone 6; tracing and further constraints with milestone 5.
