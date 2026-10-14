# Circle tool

**Status:** implemented (2026-10-12). The three constructions defined by the project owner on 2026-10-12 (centre and typed radius, centre and a point on the circle, three points on the circle) behind one flyout toolbar button; circles are stored linearized with `curves.tolerance` in metres (decided with the owner). The two-point (diameter) circle and arcs stay in [construction tools](construction-tools.md).

## Purpose

A circle is the first curved shape: a tank, a tree crown, a protection radius. CAD offers several ways to define the same circle, depending on what the user knows: the centre and a radius (typed, exact), the centre and a point the circle must pass through, or three points on it (a circle through existing corners). The project stores no true curves ([decision](../../CLAUDE.md), section 2), so the circle is drawn with exact circle math and stored as a polygon whose chords stay within a configured tolerance.

## Model

**Definition** (owner, 2026-10-12)

1. One toolbar button with a flyout, marked by a small triangle in its bottom-left corner; the flyout lists the construction variants.
2. Centre and a radius (entered).
3. Centre and a reference point on the circle.
4. Three points on the circle.

Decided with the owner: a plain click on the button activates the variant it shows (the one chosen last, the first by default); the triangle opens the flyout (CAD convention). In centre + radius a map click also sets the radius (its distance to the centre). The chord tolerance is in metres.

**One tool, three methods**

`circle` is one tool; the construction is `ToolOptions.method` (`centre-radius`, the default, `centre-point`, `three-point`), like the draw tool's `type`. `getOptions()` reports the method in effect, so the toolbar shows the variant that is active even when a host started it. An unknown method fails `canActivate`.

**Storage** (`circlePolygon`)

The circle becomes a closed counter-clockwise ring starting east of the centre with `n` equal segments, `n = ceil(π / acos(1 − t / r))` for the tolerance `t` and radius `r`, clamped to 24 … 1024. `t` is `curves.tolerance` (metres) converted to map units at the centre through [measurement](measurement.md) (`unitsPerMetre`), so a 0.01 m tolerance means the same in Web Mercator and in a UTM view. The ring passes [validation](validation.md) like any polygon (closed, no self-intersection).

**Target layer**

As for the [rectangle tool](tool-rectangle.md) (`polygonTarget`): the active layer, else the draft layer; it must allow inserts and accept polygons (`Polygon`, `MultiPolygon`, `Any`). The tool follows the active layer and deactivates when the new layer cannot take a polygon; the toolbar greys the button out ([layers and editability](layers-and-editability.md)).

**State machines**

- `centre-radius`: **centre** (click or `x,y`) → **radius**. The second point's distance to the centre is the radius; a typed plain number is the radius in metres (it resolves to a point that far from the centre, in whatever direction; the direction does not matter). Preview: the circle through the pointer and a dashed radius leg from the centre.
- `centre-point`: **centre** → **point on the circle** (click or any typed form relative to the centre). Preview: the circle through the pointer and a hover marker on the point.
- `three-point`: **first** → **second** → **third** point on the circle (click or typed relative to the previous point). Preview: a line from the fixed points to the pointer until a circle exists, then the circumcircle through the two points and the pointer.
- A zero radius (point equal to the centre) and three collinear or coincident points are ignored; the tool waits for another point.
- Escape or Backspace drops the last fixed point and steps back; in the first step they do nothing. Enter does nothing (every construction completes with its last point).
- On completion: one `insertFeature` through [editing](editing.md) with schema defaults and multi-part wrapping (the draw tool's insert path), the feature becomes the [selection](selection.md), `featureinsert` lets the [attribute](attributes.md) popup open, and the tool returns to its first step with the same method.

**Aids**

- `referencePoint()` is the centre in the radius / point step and the last fixed point in the second and third step, so relative [numeric input](numeric-input.md), the perpendicular snap ([snapping](snapping.md)) and the angle lock work from it; `null` in the first step.
- The prompt names the step and, in the radius step, says that a plain number is metres (`toolprompt`).
- Every point goes through the pointer pipeline, so snapped points on existing geometry define exact circles (three corners of a building).

**Flyout button** ([UI shell](ui-shell.md))

The toolbar entry carries `variants`; the toolbar renders the tool button, a triangle toggle and a `role="menu"` of `menuitemradio` items. Opening: triangle click (Enter, Space, Arrow Down on it), right-click, or a long press on the button. Choosing shows the variant on the button (name, icon, `data-variant`, `data-method`), activates the tool with its options and closes the menu. The button is pressed whichever method is active, and a method activated through the API is mirrored. The variant chosen is remembered for the session only.

## Related

- [Tools framework](tools.md): multi-step tool with options and prompts; Escape and Backspace step back; `ctx.getProjection()` and `ctx.getCurveTolerance()` were added for it.
- [Draw tool](tool-draw.md): shares the target-layer rule (`polygonTarget`) and the insert path (defaults, wrapping, select after insert, follow the active layer).
- [Rectangle tool](tool-rectangle.md): the sibling constructed polygon; same target rule and insert path.
- [Numeric input](numeric-input.md): centre as `x,y`; a plain number is the radius in metres; other points relative to the previous one.
- [Snapping](snapping.md): every point snapped; perpendicular from the centre or the last point. The inserted ring is the main target of the tangent snap mode.
- [Editing](editing.md): one `insertFeature` per circle.
- [Selection](selection.md): the inserted circle is selected.
- [Layers and editability](layers-and-editability.md): target layer must accept polygons and allow inserts; the draft layer is the fallback.
- [Attributes](attributes.md): defaults on insert; the popup opens for schema layers.
- [Measurement](measurement.md): the tolerance in metres is converted at the centre; a typed radius is metres.
- [Validation](validation.md): the linearized ring is validated like any polygon.
- [Construction tools](construction-tools.md): three of the planned circle constructions delivered; the two-point circle and arcs remain, and arcs will reuse the linearization.
- [UI shell](ui-shell.md): the first flyout button of the toolbar.
- [Regular polygon tool](tool-regular-polygon.md): the same centre-and-point construction with equal sides and an exact ring; shares point picking, preview and insert path.
- [Curve tool](tool-curve.md): the other linearized curve, with the same `curves.tolerance` and its own segment bound.
- [Ellipse tool](tool-ellipse.md): the stretched sibling with the same flyout pattern, target and insert path; it reuses `circleSegmentCount` for its longer half-axis.

## Surface

- `editor.tools.activate('circle', { method })`, exported `CIRCLE_PROMPTS`, `CIRCLE_METHODS`, `CircleMethod`, `CircleStep`, `circleMethod`, `DEFAULT_CIRCLE_METHOD`, `polygonTarget`, `circumcircle`, `circlePolygon`, `circleSegmentCount`, `ToolContext.getProjection`, `ToolContext.getCurveTolerance` ([tools.md](../tools.md#circle), [api.md](../api.md#custom-tools)).
- Config `curves.tolerance` ([configuration.md](../configuration.md#curves)).
- Toolbar flyout button Draw circle with the variants Circle: centre and radius, Circle: centre and point, Circle: three points; `ToolButton.variants`, `ToolVariant`, `LONG_PRESS_MS` ([ui.md](../ui.md#olcad-toolbar)).

## Open questions

- A two-point (diameter) variant, and a typed diameter (`d50`) in the radius step?
- Should a circle on a line layer be allowed as a closed line (the ring without the polygon)?
- Stored circles are plain polygons: should the feature keep the centre and radius (metadata) so a later edit, a centre snap mode or a re-linearization on export can recognise them? Linked to the arc question in [construction tools](construction-tools.md).
- Should the start vertex of the ring follow the straightedge angle instead of pointing east?
- Should the variant chosen last be persisted with the panel layout, so the toolbar reopens with it?
- Live radius feedback while the pointer moves belongs to the planned measurement events.

## Source

- `src/core/tools/circle.ts`
- `src/core/geometry/circle.ts`
- `src/core/tools/draw.ts` (`polygonTarget`, `onDrawEnd`)
- `src/core/tools/pointer.ts`
- `src/core/tools/preview.ts`
- `src/core/measure/index.ts` (`unitsPerMetre`)
- `src/ui/elements/OlcadToolbar.ts` (flyout button)
