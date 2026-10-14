# Offset tool

**Status:** implemented (2026-10-12). The construction defined by the project owner on 2026-10-12 (select a geometry, type an offset distance in the command line, click the side; a new geometry is created) with the layer decision taken the same day; planar offset math without a geometry library ([decision 0003](../decisions/0003-planar-offset-without-geometry-library.md)).

## Purpose

OFFSET is the CAD way to draw parallels: a kerb from a road axis, a setback from a parcel boundary, a wall thickness. The user says how far and on which side; the copy keeps the shape of the original, so later edits keep their relation. The result is an ordinary geometry in a layer, not a construction line.

## Model

**Definition** (owner, 2026-10-12)

1. The user selects a geometry.
2. The user defines an offset in the command line.
3. The user clicks for the direction of the offset.
4. A new geometry is created.

Decided with the owner: the copy goes to the **source object's layer** when that layer allows inserts; otherwise to the active layer when its type fits, else the draft layer. So read-only layers can be offset into an editable one.

**State machine**

1. **select**: exactly one selected line or polygon (single or multi-part) is the source; it need not be updatable. Points cannot be offset. The shared select interaction of the [select tool](tool-select.md) picks it; with such a selection on activation the step is skipped.
2. **distance**: a typed plain number of metres, taken as a value through `Tool.handleValue` ([numeric input](numeric-input.md)); zero or negative is refused (`input-not-accepted`). The value is remembered for the session, the prompt shows it (`Offset distance <10>`) and Enter keeps it. Escape / Backspace return to **select** and clear the selection.
3. **side**: a click or a typed `x,y`. Lines: left or right of the nearest segment (a point exactly on its line has no side and is ignored). Polygons: inside shrinks, outside grows. A dashed preview of the copy follows the pointer. Escape / Backspace return to **distance**.
4. On completion: the copy is inserted through the draw tool's insert path ([editing](editing.md): schema defaults, multi-part wrapping, one `insertFeature`, validation) and becomes the [selection](selection.md); `featureinsert` lets the [attribute](attributes.md) popup open. The tool returns to **select**, finds the copy selected and continues at **distance**: Enter and a click make the next parallel; clicking another object replaces the selection.

**Geometry** (`offsetGeometry`, `offsetSide`, [decision 0003](../decisions/0003-planar-offset-without-geometry-library.md))

- Every segment is shifted along its normal by the distance (metres converted to map units at the object through [measurement](measurement.md)).
- Joins: the intersection of the shifted lines (mitre); when the mitre would reach farther than 4 distances from the vertex (turns sharper than about 30°) a bevel keeps both shifted endpoints; collinear segments join at the shifted vertex. Open lines keep butt ends; rings are closed again.
- Polygons: the outer ring moves away from the interior for a positive distance, holes towards their own inside (they shrink when the polygon grows); a hole that collapses is dropped.
- Collapse: a segment whose shifted copy runs backwards (shorter than the distance on the inside of a turn) or a ring shrunk past its size gives no result; the click is ignored. No loop cleanup. A result that still self-intersects is rejected by [validation](validation.md), and the tool keeps asking for the side.

**Target layer** (`offsetTarget`, [layers and editability](layers-and-editability.md))

The source layer, then the active layer, then the draft layer: the first that exists, allows `insert` and takes the geometry type (`drawType` equal, or `Any`). None → the click is ignored. The toolbar cannot grey the button per object; it is enabled in edit mode.

**UI** ([UI shell](ui-shell.md))

Button Offset in the Modify toolbar; prompts per step in the command line, which echoes the taken distance; Backspace steps back.

## Related

- [Parallel tool](tool-parallel.md): the interactive, partial variant: a clicked distance, the length followed with the crosshair; shares `offsetRing`.
- [Tools framework](tools.md): three-step tool with a value step (`handleValue`, second user), selection watching, suspension; Escape and Backspace step back.
- [Select tool](tool-select.md): reuses the select interaction for its first step.
- [Numeric input](numeric-input.md): the distance is a value; the side may be typed as `x,y`; no relative forms (no reference point).
- [Editing](editing.md): one `insertFeature` per copy; a self-intersecting copy is rejected.
- [Selection](selection.md): the source is the single selected object; the copy becomes the selection and the next source.
- [Layers and editability](layers-and-editability.md): the source layer, else the active layer, else the draft layer, must allow inserts and take the type.
- [Attributes](attributes.md): schema defaults on insert; the popup opens for schema layers.
- [Measurement](measurement.md): the distance is metres, converted at the object.
- [Validation](validation.md): a copy that self-intersects is rejected; the tool stays in its side step.
- [Construction tools](construction-tools.md): the first geometric modification delivered; fillet and the geometry-library question are listed there.
- [UI shell](ui-shell.md): button in the Modify toolbar; the command line echoes the distance.
- [Trim tool](tool-trim.md): the next geometric modification, also with own planar math; selection first like offset.

## Surface

- `editor.tools.activate('offset')`, exported `OFFSET_PROMPTS`, `OffsetStep`, `offsetTarget`, `OffsetTarget`, `isOffsetable`, `offsetGeometry`, `offsetRing`, `offsetSide`, `OFFSET_MITRE_LIMIT` ([tools.md](../tools.md#offset), [api.md](../api.md)).
- Toolbar button Offset, icon `offset` ([ui.md](../ui.md#olcad-toolbar)).

## Open questions

- A "through point" variant: click a point the copy must pass through instead of typing a distance (AutoCAD's Through)?
- Offsetting several selected objects at once, each to the clicked side?
- Keeping both sides (two copies) in one go, as a shortcut for corridors?
- Loop cleanup for inward offsets of short segments (today refused), with or without a geometry library (decision 0003). The [parallel tool](tool-parallel.md) already skips such parts (`offsetPath`: collapsed segments and crossed notch walls removed); should the offset tool use it too?
- Rounded outer corners as an option once arcs exist, for the circle and arc segments the tool will meet.
- Should the copy keep a reference to its source (property) for a later "re-offset"?
- Greying the button per selected object (points, no target layer) instead of only per edit mode?

## Source

- `src/core/tools/offset.ts`
- `src/core/geometry/offset.ts`
- `src/core/geometry/segments.ts` (`nearestSegment`)
- `src/core/tools/draw.ts` (`onDrawEnd`, `drawType`)
- `src/core/tools/select.ts`
- `src/core/tools/pointer.ts`
- `src/core/tools/preview.ts`
- `docs/decisions/0003-planar-offset-without-geometry-library.md`
