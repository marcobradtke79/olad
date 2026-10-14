# Curve tool

**Status:** implemented (2026-10-13). The construction defined by the project owner on 2026-10-13 (a curve with a handle at its start and end point to control the entry and exit angle) with the two decisions taken the same day: handles are adjustable grips and Enter inserts; the handles start on the chord.

## Purpose

A free curve between two points: a path bending around an obstacle, a cable, a kerb that is neither straight nor circular. CAD and vector tools define it by its end points and a handle at each, whose direction is the tangent at that end and whose length is the tension (a cubic Bézier). The project stores no true curves ([decision](../../CLAUDE.md), section 2), so the curve is drawn exactly and stored as a line within the configured chord tolerance, like the [circle](tool-circle.md).

## Model

**Definition** (owner, 2026-10-13)

1. A tool to create a curve.
2. At the start and the end point the curve has a handle to control the entry and exit angle.

Decided with the owner: after the start and end points the curve appears with a handle at each end; the user picks a handle, moves it and places it as often as wanted, and Enter inserts the curve. The handles start one third along the chord from each end, so the initial curve is the straight segment.

**Shape** (`CubicBezier`, `bezierLineString`)

Start `P0`, start handle `P1`, end handle `P2`, end `P3`; the tangent at the start is `P1 − P0`, at the end `P3 − P2`, longer handles pull the curve further. Stored as a line with `n` equal parameter steps, `n = ceil(sqrt(0.75 d / t))` (Wang's bound, `d` the largest second difference of the control points, `t` the tolerance in map units), one segment for a straight curve, at most 1024; `t` is `curves.tolerance` (metres) converted at the start through [measurement](measurement.md).

**State machine**

1. **start**: click or `x,y`.
2. **end**: click or typed relative to the start (`referencePoint`); a point equal to the start is ignored. Preview: the start marker and a dashed line to the pointer. Escape / Backspace drop the start.
3. **shape**: the handles are set on the chord. Preview: the dashed linearized curve, a leg from each end point to its handle, picked markers on the ends, the handle under the pointer highlighted. A click within the pick radius of a handle (raw pointer position, `pickTolerance`: at least 10 px) picks it up → **handle**; a click elsewhere does nothing. Enter inserts. Escape / Backspace drop the end point and the handles.
4. **handle**: the picked handle follows the snapped pointer (it can snap to geometry, so a tangent can aim at a vertex) and the curve bends live. Click or a typed point relative to the handle's end point (`referencePoint`; `@distance<angle` types the exit or entry angle and the tension) places it → **shape**. Escape / Backspace put it back where it was. Enter places it where it is and inserts.
5. On insert: `lineTarget` (active layer, else draft; must allow inserts and accept lines), the draw tool's insert path ([editing](editing.md): defaults, `MultiLineString` wrapping, one `insertFeature`, validation), the curve becomes the [selection](selection.md), `featureinsert` lets the [attribute](attributes.md) popup open, the tool returns to **start**. A rejected command keeps the shape step.

**Aids**

- Every point and handle goes through the pointer pipeline ([snapping](snapping.md)); the perpendicular snap and the angle lock work from the reference point of the step.
- The prompt names the step; the handle step says that typed input is relative to the handle's end point ([numeric input](numeric-input.md)).

**UI** ([UI shell](ui-shell.md))

Button Draw curve in the Draw toolbar, enabled when a target layer accepts lines; Backspace steps back; Enter in the command line (empty input) or on the map inserts.

## Related

- [Parallel tool](tool-parallel.md): shares the line target rule and the insert path.
- [Tools framework](tools.md): four-step tool with a grip loop; Enter inserts; Escape and Backspace step back; `referencePoint` per step.
- [Draw tool](tool-draw.md): shares the target rule (`lineTarget`, `shapeTarget`) and the insert path for lines.
- [Modify tool](tool-modify.md): the same grip pattern (hover, click to pick, click to place) and the shared `PointPickInteraction` with the raw pointer position.
- [Circle tool](tool-circle.md): the other linearized curve; same tolerance, different bound.
- [Numeric input](numeric-input.md): end relative to the start; a handle relative to its end point (`@distance<angle` as angle and tension); the shape step takes no points.
- [Snapping](snapping.md): points and handles snapped; perpendicular from the step's reference point. The inserted line is a target of the tangent snap mode.
- [Editing](editing.md): one `insertFeature` per curve.
- [Selection](selection.md): the inserted curve is selected.
- [Layers and editability](layers-and-editability.md): target layer must accept lines and allow inserts; the draft layer is the fallback.
- [Attributes](attributes.md): defaults on insert; the popup opens for schema layers.
- [Measurement](measurement.md): the tolerance in metres is converted at the start.
- [Validation](validation.md): the linearized line is validated like any line.
- [Construction tools](construction-tools.md): the curve is delivered beside the planned circular arc; arc segments inside polylines remain.
- [UI shell](ui-shell.md): button Draw curve in the Draw toolbar.

## Surface

- `editor.tools.activate('curve')`, exported `CURVE_PROMPTS`, `CurveStep`, `CurveHandle`, `CurveTool.curve()`, `lineTarget`, `shapeTarget`, `pickTolerance`, `rawCoordinate`, `bezierPoint`, `bezierSegmentCount`, `bezierLineString`, `chordHandles`, `MAX_BEZIER_SEGMENTS` ([tools.md](../tools.md#curve), [api.md](../api.md#custom-tools)).
- Config `curves.tolerance` ([configuration.md](../configuration.md#curves)).
- Toolbar button Draw curve, icon `drawCurve` ([ui.md](../ui.md#olcad-toolbar)).

## Open questions

- Curve segments inside a polyline or polygon being drawn (CLAUDE.md section 6), and chains of curves with smooth joins (the next curve's start handle mirroring the previous end handle)?
- Symmetric handles (Shift while placing mirrors the other handle) and locking a handle's length or angle?
- Should the feature keep the four control points (metadata) so the handles can be edited later and the line re-linearized on export?
- A circular arc variant (three points, or centre + start + end) beside the Bézier, as section 6 asks?
- Should the default handles follow the straightedge angle instead of the chord (declined for now, 2026-10-13)?
- Live feedback of the tangent angle while a handle moves belongs to the planned measurement events.

## Source

- `src/core/tools/curve.ts`
- `src/core/geometry/bezier.ts`
- `src/core/tools/draw.ts` (`lineTarget`, `shapeTarget`, `onDrawEnd`)
- `src/core/tools/pointer.ts` (`PointPickInteraction`, `pickTolerance`, `rawCoordinate`)
- `src/core/tools/preview.ts`
- `src/core/measure/index.ts` (`unitsPerMetre`)
