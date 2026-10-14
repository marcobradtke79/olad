# Ellipse tool

**Status:** implemented (2026-10-13). Three constructions chosen by the project owner on 2026-10-13 (centre and axes, axis ends and half-axis, box corners) behind one flyout toolbar button of its own; closed ellipses only, stored linearized with `curves.tolerance` like the circle. Elliptical arcs stay with the arc work in [construction tools](construction-tools.md).

## Purpose

An ellipse is the stretched circle of drafting: an oval pond, a roundabout island, a stadium outline, a symbol footprint. CAD offers it in the ways people know an ellipse: from its centre and its two axes, from the two ends of one axis and the width across, or as the oval that fills a box. As with the circle, the project stores no true curves ([decision](../../CLAUDE.md), section 2), so the ellipse is computed exactly and stored as a polygon whose chords stay within the configured tolerance.

## Model

**Definition** (owner, 2026-10-13)

1. Its own toolbar button **Draw ellipse** in the Draw toolbar, after Draw circle, as a flyout of three constructions.
2. **Centre and axes** (`centre-axis`, the default): the centre, the end of the first axis (fixing its length and direction), then the other half-axis.
3. **Axis ends** (`axis`): both ends of the first axis, then the other half-axis.
4. **Box** (`box`): two opposite corners of a box whose sides follow the straightedge; the ellipse fills the box.
5. Closed ellipses only; no elliptical arcs for now.

**One tool, three methods**

`ellipse` is one tool; the construction is `ToolOptions.method`, as for the [circle tool](tool-circle.md). `getOptions()` reports the method in effect, so the flyout button shows the active variant even when a host started it. An unknown method fails `canActivate`.

**Steps**

- `centre-axis`: **centre** (click or `x,y`) → **end of the first axis** (click, or `x,y` / `@dx,dy` / `@distance<angle` / `distance` relative to the centre; a point on the centre is ignored) → **other half-axis**.
- `axis`: **first end** → **second end** (relative to the first; the same point is ignored) → **other half-axis**.
- **Other half-axis**: a plain number is its length in metres (`Tool.handleValue`, converted with `unitsPerMetre` at the centre; every number is taken in this step, one that is not greater than 0 is ignored), or a click / typed point whose **distance from the first axis** is the half-axis (only the distance across the axis counts, so the point need not lie on the ellipse). A point on the axis is ignored. Relative input is measured from the centre.
- `box`: **first corner** → **opposite corner** (relative to the first). The box runs along and across the straightedge angle, as in the [rectangle tool](tool-rectangle.md); a box without width or height is ignored.
- The preview shows the picked points, the first axis (from the centre through the pointer, or the full axis once fixed), the box in the box construction, and the ellipse through the pointer.

**Storage** (`ellipsePolygon`)

The ellipse becomes a closed counter-clockwise ring starting at the end of the first axis, sampled with equal parameter steps. The step count is the circle's (`circleSegmentCount`) for the longer half-axis: the ellipse is that circle squeezed along one axis, and squeezing never lengthens the gap between an arc and its chord, so every chord stays within the tolerance (24 … 1024 segments). The tolerance is `curves.tolerance` in metres converted at the centre ([measurement](measurement.md)). The ring passes [validation](validation.md) like any polygon.

**Target and insert**

As for the circle (`polygonTarget`, `onDrawEnd`): the active layer, else the draft layer, which must allow inserts and accept polygons; schema defaults, multi-part wrapping, one `insertFeature`, selected afterwards. The tool stays active for the next ellipse and follows the active layer.

**Stepping back**

Escape or Backspace drops the last fixed point; with none left, Backspace does nothing.

## Related

- [Circle tool](tool-circle.md): the sibling curve with the same flyout pattern, linearization rule, target and insert path; the ellipse reuses its segment count.
- [Rectangle tool](tool-rectangle.md): the box construction uses the same corners-along-the-straightedge rule and preview.
- [Tools framework](tools.md): multi-step tool with options, prompts and `handleValue` for the typed half-axis.
- [Draw tool](tool-draw.md): shares the target-layer rule and the insert path.
- [Numeric input](numeric-input.md): points typed absolute or relative; a plain number is the other half-axis in metres.
- [Snapping](snapping.md): every point snapped. The tangent mode treats the ring as a curve where the turn per vertex stays under 20°; a very flat ellipse at a coarse tolerance can miss it near the ends of its long axis.
- [Straightedge](straightedge.md): sets the direction of the box.
- [Measurement](measurement.md): tolerance and typed half-axis in metres, converted at the centre.
- [Layers and editability](layers-and-editability.md): target layer must accept polygons and allow inserts; the draft layer is the fallback.
- [Validation](validation.md): the ring is validated like any polygon.
- [Construction tools](construction-tools.md): the ellipse joins the curved shapes; elliptical arcs remain planned with the arcs.
- [UI shell](ui-shell.md): the second flyout button of the toolbar.

## Surface

- `editor.tools.activate('ellipse', { method })`, exported `EllipseTool`, `ELLIPSE_PROMPTS`, `ELLIPSE_METHODS`, `EllipseMethod`, `EllipseStep`, `ellipseMethod`, `DEFAULT_ELLIPSE_METHOD`, and the geometry helpers `ellipseFromCentre`, `ellipseFromAxis`, `ellipseFromCorners`, `ellipsePolygon`, `EllipseDefinition` ([tools.md](../tools.md#ellipse)).
- Toolbar flyout button Draw ellipse, icons `drawEllipse`, `drawEllipseAxis`, `drawEllipseBox` ([ui.md](../ui.md)).

## Open questions

- Elliptical arcs (a part of the ellipse inserted as a line), together with the circular arcs of milestone 6?
- Should the box construction offer a centre-out variant (Alt or a fourth method), as some CAD programs do?
- Sampling with equal parameter steps puts more vertices at the flat sides than needed; is a curvature-adaptive sampling worth it for very flat ellipses?

## Source

- `src/core/tools/ellipse.ts`
- `src/core/geometry/ellipse.ts`
- `src/core/geometry/circle.ts` (`circleSegmentCount`)
- `src/core/tools/draw.ts` (`polygonTarget`, `onDrawEnd`)
