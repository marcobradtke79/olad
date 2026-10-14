# Snapping

**Status:** partial (2026-10-13). Modes `vertex`, `midpoint`, `perpendicular` and `tangent` with per-mode toggles, a pixel radius and crosshair markers exist. Edge / nearest, intersection, centre and tracing are planned (milestone 5).

## Purpose

Object snap (CAD's OSNAP) makes a click land exactly on existing geometry: a vertex, the middle of a segment, the foot of a perpendicular. It is what lets a new wall meet an old one without gaps and is the main reason a CAD-style editor feels precise. Snapping works across all snappable layers, including read-only ones, and is a stage of the [pointer pipeline](pointer-pipeline.md), so every tool benefits without code of its own.

## Model

**Candidates**

- From the **visible** layers with `snappable: true` ([layers and editability](layers-and-editability.md)), searched in an extent of the snap radius around the pointer.
- `vertex`: every vertex of lines and polygons, every point feature. Marker: square.
- `midpoint`: the middle of every segment. Marker: triangle.
- `perpendicular`: the foot of the perpendicular from the tool's reference point onto a segment, only when it falls inside the segment. Marker: right angle. Without a reference point (first vertex, modify) the mode yields nothing: CAD's deferred perpendicular.
- `tangent` (off by default): the vertex of a linearized circle or curve where the line from the tool's reference point touches it. Circles and curves are stored as rings and lines (no centre or control points, [circle tool](tool-circle.md), [curve tool](tool-curve.md)), so the candidate is the stored vertex nearest the exact tangent point, within half a chord; what is drawn then really touches the stored geometry. A vertex qualifies when the turn at it is at most 20° (`TANGENT_MAX_TURN`; a linearized circle turns at most 15°) and both neighbours lie on the same side of the line from the reference through it, so the line touches without crossing: polygon corners and straight runs never qualify, the end vertices of an open line neither, and a reference inside a circle sees none. Needs a reference point like `perpendicular`. Marker: a circle with a thick top edge.

**Choosing**

1. The nearest candidate measured in pixels within `tolerancePx` wins.
2. On a tie: tangent before vertex before midpoint before perpendicular. A tangent point is always a vertex, so the more specific mode wins the exact tie and its marker shows.
3. No candidate: the pipeline continues with the constraint and the [grid](grid.md).

**Rules**

- Snapping is on by default, togglable as a whole and per mode at runtime; at least one mode stays enabled.
- Active only in [edit mode](edit-mode.md).
- The result carries `coordinate`, `pixel`, `mode`, `layer` and `feature`, so a host can show what was hit.
- Snapping never selects and never changes data: it only moves the coordinate a tool will use.

**Planned**

- `edge` (nearest point on a segment), `intersection` (of two segments, including apparent intersections of extended segments), `centre` (of a circle or arc: the stored ring carries no centre, so it has to be recovered from the vertices).
- **Tracing**: after snapping onto an edge, follow it with the pointer so a new line copies the existing outline segment by segment; planned as its own pipeline stage.
- A spatial index or viewport limit once layers grow beyond the candidate count a per-move scan can afford (CLAUDE.md section 14).

## Related

- [Text tool](tool-text.md): the insert point is snapped and can be snapped to.
- [Measure tools](tool-measure.md): measure points are snapped, also while edit mode is off.
- [Parallel tool](tool-parallel.md): start and end points are snapped, the end then projected onto the parallel.
- [Pointer pipeline](pointer-pipeline.md): snapping is stage one and wins over constraint and grid.
- [Grid](grid.md): the fallback when no geometry snap applies.
- [Constraints](constraints.md): a geometry snap overrides the angle lock.
- [Tools framework](tools.md): tools add no snap interaction of their own; the reference point feeds the perpendicular mode.
- [Layers and editability](layers-and-editability.md): `snappable` and visibility decide the candidate layers.
- [Edit mode](edit-mode.md): active only while on.
- [Draw tool](tool-draw.md), [Modify tool](tool-modify.md), [Move tool](tool-move.md), [Rotate tool](tool-rotate.md), [Scale tool](tool-scale.md), [Ellipse tool](tool-ellipse.md): all receive snapped points and provide reference points in their point steps.
- [Construction tools](construction-tools.md): the tangent mode targets their linearized circles and curves; a centre mode is planned.
- [UI shell](ui-shell.md): the snap settings toolbox toggles modes and radius.
- [Rectangle tool](tool-rectangle.md): both corners snapped; perpendicular from the first corner.
- [Circle tool](tool-circle.md): every point snapped; perpendicular from the centre or the last point on the circle. Its linearized ring is the main target of the tangent mode.
- [Regular polygon tool](tool-regular-polygon.md): centre and vertex snapped; perpendicular from the centre.
- [Curve tool](tool-curve.md): points and handles snapped, so a tangent can aim at a vertex; perpendicular from the step's reference point. Its linearized line is a target of the tangent mode.
- [Trim tool](tool-trim.md) and [Extend tool](tool-extend.md): their target step uses the raw pointer position, not the snapped one.

## Surface

- Config `snapping` (`enabled`, `tolerancePx`, `modes`) ([configuration.md](../configuration.md)).
- `editor.snapping`, events `snappingchange`, `snap` ([api.md](../api.md), [tools.md](../tools.md#snapping)).
- `<olcad-snap-settings>` ([ui.md](../ui.md)).

## Open questions

- Maximum feature count before a spatial index is needed; measure with the test server's data first.
- Should snapping to the feature being modified be suppressed (a vertex dragged onto its own neighbour)?
- Should snap candidates be limited to the active layer on request ("snap to same class only")?

## Source

- `src/core/snapping/SnapEngine.ts`
- `src/core/snapping/SnapInteraction.ts`
- `src/core/geometry/segments.ts`
- `src/core/geometry/tangent.ts`
- `src/core/crosshair.ts` (markers)
