# Rectangle tool

**Status:** implemented (2026-10-12). The two-point rectangle as defined by the project owner on 2026-10-12, with sides following the straightedge (decided with the owner). The three-point rectangle stays in [construction tools](construction-tools.md).

## Purpose

A rectangle from two corners is the most common construction shape: a building footprint, a parcel, a frame. The CAD-style part is the orientation: on a drafting machine the rectangle is square to the straightedge, not to the paper, so once the [straightedge](straightedge.md) is aligned with a road every rectangle comes out parallel to it. Typing the opposite corner (`@12,8`) gives exact dimensions.

## Model

**Definition** (owner, 2026-10-12)

1. The user sets a first point (first corner) on the map or via the command line.
2. The second point (opposite corner) is added interactively on the map or typed into the command line.
3. The rectangle is inserted into the target layer, selected, and the tool is ready for the next one.

**Orientation**

The sides run along and across the straightedge angle (`cursor.angle`). With the default 0° the rectangle is axis-aligned in the view projection; a rotated straightedge gives a rotated rectangle. The ring is counter-clockwise whatever the drag direction, starting at the first corner.

**Target layer**

The active layer, else the draft layer, like the [draw tool](tool-draw.md); it must allow inserts and accept polygons (`Polygon`, `MultiPolygon` or `Any`). On a point or line layer the tool cannot activate, and the toolbar greys it out ([layers and editability](layers-and-editability.md)). The tool follows the active layer: switching it re-targets the tool or deactivates it when the new layer cannot take a rectangle.

**State machine** (`first` → `second`)

- **first**: a click or typed `x,y` sets the first corner.
- **second**: the preview shows the rectangle between the first corner and the snapped pointer; a click or typed point (`x,y`, or `@dx,dy` / `@distance<angle` / `distance` relative to the first corner) sets the opposite corner. A corner on one of the rectangle's axes (no width or no height) is ignored. Escape or Backspace drops the first corner.
- On completion: one `insertFeature` through [editing](editing.md) with schema defaults and multi-part wrapping (the draw tool's insert path), the feature becomes the [selection](selection.md), `featureinsert` lets the [attribute](attributes.md) popup open, and the tool returns to **first**.

**Aids**

- `referencePoint()` is the first corner while the opposite corner is open, so relative [numeric input](numeric-input.md), the perpendicular snap ([snapping](snapping.md)) and the angle lock work from it.
- The prompt names the step (`toolprompt`).

## Related

- [Tools framework](tools.md): two-step tool with prompts; Escape and Backspace drop the first corner.
- [Draw tool](tool-draw.md): shares the target-layer rule and the insert path (defaults, wrapping, select after insert, follow the active layer).
- [Straightedge](straightedge.md): the sides follow its angle.
- [Numeric input](numeric-input.md): first corner as `x,y`, opposite corner relative to the first.
- [Snapping](snapping.md): both corners are snapped; perpendicular from the first corner.
- [Editing](editing.md): one `insertFeature` per rectangle.
- [Selection](selection.md): the inserted rectangle is selected.
- [Layers and editability](layers-and-editability.md): target layer must accept polygons and allow inserts; the draft layer is the fallback.
- [Attributes](attributes.md): defaults on insert; the popup opens for schema layers.
- [Construction tools](construction-tools.md): the first drawing variant delivered; the three-point rectangle, circle and arc remain.
- [UI shell](ui-shell.md): the toolbar's Draw rectangle button, enabled when a target layer accepts polygons.
- [Circle tool](tool-circle.md): the second constructed polygon; shares the target rule (`polygonTarget`), the insert path and the two-step shape.
- [Ellipse tool](tool-ellipse.md): its box construction uses the same corners-along-the-straightedge rule.
- [Regular polygon tool](tool-regular-polygon.md): the third constructed polygon; same target rule and insert path.

## Surface

- `editor.tools.activate('rectangle')`, exported `RECTANGLE_PROMPTS`, `RectangleStep`, `rectangleTarget`, `rectangleFromCorners`, `ToolContext.getStraightedgeAngle` ([tools.md](../tools.md#rectangle), [api.md](../api.md#custom-tools)).
- Toolbar button Draw rectangle ([ui.md](../ui.md)).

## Open questions

- Should the angle lock constrain the opposite corner (today it does, through the pipeline, which locks the diagonal rather than a side)? Possibly the rectangle tool should opt out of the lock, since its sides are already aligned.
- Typed width and height as two numbers (`12 8`) instead of an offset, as CAD's dimension prompt offers?
- Should a rectangle on a line layer be allowed as a closed line (the ring without the polygon)?

## Source

- `src/core/tools/rectangle.ts`
- `src/core/geometry/rectangle.ts`
- `src/core/tools/draw.ts` (`onDrawEnd`, `drawType`)
- `src/core/tools/pointer.ts`
- `src/core/tools/preview.ts`
