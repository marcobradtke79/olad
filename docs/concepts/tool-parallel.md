# Parallel tool

**Status:** implemented (2026-10-13). Defined by the project owner on 2026-10-13: pick a line, polyline or polygon, then a start point; while the crosshair moves, the new line runs parallel to the object up to the point nearest the crosshair; a click inserts it.

## Purpose

Drawing beside existing objects is everyday drafting: a kerb along a road, a fence inside a parcel boundary, a pipe at a fixed distance from a wall. The [offset tool](tool-offset.md) copies a whole object at a typed distance; the parallel tool draws only the piece you need, at the distance you click, and lets the crosshair say how far it goes, so it reads like tracing with a ruler held against the object.

## Model

**Definition** (owner, 2026-10-13)

1. The user selects one geometry: a line, a polyline or a polygon (multi-part ones too).
2. The user picks the start point of the new line. Its distance from the object and its side fix the parallel.
3. While the crosshair moves, the new line is drawn parallel to the object, following its bends, from the start point to the point of the parallel nearest the crosshair.
4. A click inserts the line into the active layer (or the draft layer); the object stays the reference, so the next click starts another parallel. Escape picks another object.
5. Instead of clicking, a plain number is the length of the new line in metres, along the parallel, in the direction the crosshair pulls.

**State machine** (`select` → `start` → `end`)

- **select**: the click selection of the [select tool](tool-select.md); a single selected line or polygon becomes the reference (read-only objects too). A suitable selection skips the step. The reference is kept by the tool, so the selection may change afterwards (the inserted line is selected).
- **start**: a click (snapped) or a typed `x,y`. When the parallel at that distance would collapse, the prompt says so and the tool waits.
- **end**: the preview (dashed) runs from the start along the parallel to the point nearest the pointer, with markers at both ends. A click or typed point (`x,y`, `@dx,dy` relative to the start) ends it there; a plain number is the length in metres (`Tool.handleValue`; 0 or less is ignored). A piece without length is ignored. Afterwards back to **start**.
- Escape / Backspace: **end** → **start**; **start** → **select**, forgetting the reference and clearing the selection.

**Geometry** (`parallelPath`, `subPath`)

- The part of the object nearest to the start point is the base: a line of a multi-line, or a ring (outer or hole) of a polygon.
- The parallel distance is the start point's perpendicular distance from the base's nearest segment, positive to the left of the direction of travel. The base is offset by it with the offset tool's planar math in its tolerant form (`offsetPath`, 2026-10-13): mitre joins, bevels at sharp outer turns, but parts that cannot be followed at this distance are skipped instead of refusing the whole parallel. A segment shorter than the distance on the inside of a bend is removed and its neighbours are joined directly; the walls of a notch narrower than twice the distance go as well, so the parallel runs straight across the notch; a too-short first or last leg of a line is dropped. The parallel also keeps at least its distance from **every other part** of the object (2026-10-13): where another part comes closer (a hairpin, a line doubling back, a pocket with a narrow mouth, a line crossing itself) the raw parallel is cut where it enters that part's band and where it crosses itself; it continues where its offsets cross, skipping the vertices in between (it goes past the pocket's mouth instead of into it), or ends where it cannot go on without crossing the object. Only distances to a segment beside its interior count, so the parallel's own bevels round a sharp bend are kept. A ring that loses parts this way becomes an open path around the start. The parallel is refused (the prompt says so) when nothing is left or a ring would turn inside out ("No parallel at this distance: the object bends too tightly.", for example a start in the middle of a small parcel) or when the start's own stretch is already too close to another part ("Too close to another part of the object for this distance."). A start on the object (distance 0) traces the object itself.
- Positions along the parallel are stations (distance from its start). The pointer's station is its nearest point on the parallel; on an open line it is clamped to the ends, so the new line stops at the end of the parallel.
- On a ring the end station follows the pointer's movement without jumping (the change since the last position is added, unwrapped), so the line runs around corners and past the ring's first vertex, at most once around.

**Insert**

As for the [curve tool](tool-curve.md) (`lineTarget`, `onDrawEnd`): the active layer, else the draft layer, which must allow inserts and accept lines; schema defaults, multi-part wrapping, one `insertFeature`, the line selected, `featureinsert` opens the attribute popup. The tool follows the active layer.

## Related

- [Offset tool](tool-offset.md): the whole-object sibling with the same line / polygon sources and offset math; the offset tool refuses collapsing parts (`offsetRing`), the parallel tool skips them (`offsetPath`).
- [Curve tool](tool-curve.md): shares the line target rule and the insert path.
- [Draw tool](tool-draw.md): the insert path (defaults, wrapping, select after insert) and the active / draft layer rule.
- [Straightedge](straightedge.md): the crosshair the user follows the object with.
- [Snapping](snapping.md): start and end points are snapped; the end is then projected onto the parallel.
- [Numeric input](numeric-input.md): the start as `x,y`; the length as a plain value; end points relative to the start.
- [Measurement](measurement.md): the typed length is converted to map units at the start point.
- [Selection](selection.md): the reference is picked from the selection; the inserted line is selected.
- [Layers and editability](layers-and-editability.md): the target layer must accept lines and allow inserts; read-only objects can be references.
- [Construction tools](construction-tools.md): parallels are one of the drafting constructions.
- [Tools framework](tools.md): prompts per step, Escape and Backspace step back, `handleValue` for the length.
- [UI shell](ui-shell.md): the Draw parallel button in the Draw toolbar.

## Surface

- `editor.tools.activate('parallel')`, exported `ParallelTool`, `PARALLEL_PROMPTS`, `ParallelStep`, and the geometry helpers `parallelPath`, `subPath`, `stationOf`, `pathLength`, `ParallelPath` ([tools.md](../tools.md#parallel)).
- Toolbar button Draw parallel, icon `drawParallel` ([ui.md](../ui.md)).

## Open questions

- Continue as a polyline (a click fixes a vertex and the next piece starts there) instead of inserting each piece?
- A typed distance instead of a start point (CAD's "offset through point" vs. "offset by distance")?
- Snap the end to the object's vertices projected onto the parallel, so a parallel can stop exactly level with a corner?

## Source

- `src/core/tools/parallel.ts`
- `src/core/geometry/parallel.ts`
- `src/core/geometry/offset.ts` (`offsetPath`)
- `src/core/tools/draw.ts` (`lineTarget`, `onDrawEnd`)
