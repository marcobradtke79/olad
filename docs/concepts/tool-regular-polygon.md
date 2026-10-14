# Regular polygon tool

**Status:** implemented (2026-10-12). The construction defined by the project owner on 2026-10-12 (number of sides, centre, one reference point on the polygon) with the two decisions taken the same day: the side count is typed as the first step, the reference point is a vertex.

## Purpose

Equal-sided polygons stand for things a circle is too round for and a free polygon too loose for: a hexagonal pavilion, an octagonal tower, a triangular marker, a square manhole at an angle. CAD defines them by the number of sides, a centre and one point that fixes size and rotation at once. Unlike the [circle](tool-circle.md) the result needs no linearization: the ring is the exact shape.

## Model

**Definition** (owner, 2026-10-12)

1. A function that creates polygons with equal edges and a given number of edges (3 or higher).
2. The user selects the number of points, a centre point and one reference point on the polygon.

Decided with the owner: the number of sides is typed as the first step of the tool (CAD convention `Number of sides <6>:`), remembered for the session, Enter keeps the current value; the reference point is a **vertex**, so the polygon is inscribed in the circle through it (its distance to the centre is the circumradius) and the other vertices follow counter-clockwise at equal angles.

**Shape** (`regularPolygon`)

`sides` vertices on the circle around the centre through the vertex, the first one being the vertex itself, then counter-clockwise by `360° / sides`; closed ring; `null` for a vertex on the centre. Side counts are whole numbers from 3 to 1024 (`isValidSideCount`); the upper bound mirrors the circle's segment cap.

**State machine**

1. **sides**: the prompt shows the current count (6 at first, later the one used last). A typed whole number of 3 or more replaces it and continues (value channel, see below); an invalid number is refused (`input-not-accepted`) and the step stays. Enter keeps the count. A map click or a typed `x,y` also keeps the count and takes the point as the centre (soft prompt), so the question never blocks a user happy with the last count. `editor.tools.activate('regular-polygon', { sides })` with a valid count starts at the centre step; an invalid `sides` fails `canActivate`.
2. **centre**: click or `x,y`. Escape / Backspace returns to **sides** (the way to change the count later).
3. **vertex**: click, or any typed form relative to the centre; a plain number is the circumradius in metres towards the pointer, like the circle's radius. Preview: the polygon through the pointer, the radius leg, a marker on the centre and on the pointer. A vertex on the centre is ignored. Escape / Backspace drops the centre.
4. On completion: one `insertFeature` through [editing](editing.md) with schema defaults and multi-part wrapping (the draw tool's insert path), the feature becomes the [selection](selection.md), `featureinsert` lets the [attribute](attributes.md) popup open, and the tool returns to **centre** with the same count.

**Value channel** ([numeric input](numeric-input.md))

The command line used to resolve every plain number as a distance from `referencePoint()`. The side count is the first value that is not a point, so the [tools framework](tools.md) gained `Tool.handleValue(value)`: `editor.input` offers a plain number to the active tool's step first and reports `{ ok: true, value }` when it is taken; otherwise the number is resolved as before. Only the sides step of this tool takes values; in the vertex step a plain number is the circumradius.

**Target layer**

As for the [rectangle](tool-rectangle.md) and [circle](tool-circle.md) tools (`polygonTarget`): the active layer, else the draft layer; it must allow inserts and accept polygons. The tool follows the active layer ([layers and editability](layers-and-editability.md)); the toolbar greys the button out otherwise.

**Aids**

- `referencePoint()` is the centre in the vertex step, so relative input, the perpendicular snap ([snapping](snapping.md)) and the angle lock work from it; `null` otherwise.
- Every point goes through the pointer pipeline, so a snapped vertex puts a corner of the polygon exactly on existing geometry.
- The ring passes [validation](validation.md) like any polygon; the typed circumradius is metres through [measurement](measurement.md).

**Toolbar** ([UI shell](ui-shell.md))

One plain button, Draw regular polygon, enabled when a target layer accepts polygons; the command line shows the prompt per step and echoes a taken value (`5 → 5`). Backspace steps back like in the other drawing tools.

## Related

- [Tools framework](tools.md): three-step tool with prompts; `Tool.handleValue` was added for its sides step; Escape and Backspace step back.
- [Numeric input](numeric-input.md): the side count is the first value taken through `handleValue`; centre as `x,y`; vertex relative to the centre, a plain number as circumradius in metres.
- [Draw tool](tool-draw.md): shares the target-layer rule (`polygonTarget`) and the insert path (defaults, wrapping, select after insert, follow the active layer).
- [Rectangle tool](tool-rectangle.md): sibling constructed polygon; same target rule and insert path.
- [Circle tool](tool-circle.md): the same centre-and-point construction, with equal sides instead of a linearized circle; shares the point picking and preview.
- [Snapping](snapping.md): centre and vertex snapped; perpendicular from the centre.
- [Editing](editing.md): one `insertFeature` per polygon.
- [Selection](selection.md): the inserted polygon is selected.
- [Layers and editability](layers-and-editability.md): target layer must accept polygons and allow inserts; the draft layer is the fallback.
- [Attributes](attributes.md): defaults on insert; the popup opens for schema layers.
- [Measurement](measurement.md): a typed circumradius is metres, converted at the centre.
- [Validation](validation.md): the ring is validated like any polygon.
- [Construction tools](construction-tools.md): a drawing variant delivered beside the planned ones; the circumscribed variant is an open question here.
- [UI shell](ui-shell.md): toolbar button Draw regular polygon; the command line echoes the taken value.

## Surface

- `editor.tools.activate('regular-polygon', { sides })`, `Tool.handleValue`, `ToolManager.handleValue`, `ToolOptions.sides`, `InputResult` value variant, exported `RegularPolygonTool`, `REGULAR_POLYGON_PROMPTS`, `DEFAULT_REGULAR_POLYGON_SIDES`, `RegularPolygonStep`, `regularPolygon`, `isValidSideCount`, `MIN_REGULAR_POLYGON_SIDES`, `MAX_REGULAR_POLYGON_SIDES` ([tools.md](../tools.md#regular-polygon), [api.md](../api.md#custom-tools)).
- Toolbar button Draw regular polygon, icon `drawRegularPolygon` ([ui.md](../ui.md#olcad-toolbar)).

## Open questions

- A circumscribed variant (the reference point is the midpoint of an edge, its distance the apothem), as AutoCAD's inscribed / circumscribed choice? It would make the button a flyout like the circle's.
- Preset variants in a flyout (triangle, square, pentagon, hexagon, octagon) that set the count and skip the question?
- When the circumradius is typed, the first vertex points towards the pointer (or along the straightedge when the pointer is off the map). Should the rotation follow the straightedge angle explicitly instead?
- Star polygons (every k-th vertex) are not planned; say so or add them?
- Is 1024 the right upper bound for the side count, or should it share a config option with the circle's segment cap?
- Should the remembered side count be persisted with the panel layout?

## Source

- `src/core/tools/regularPolygon.ts`
- `src/core/geometry/regularPolygon.ts`
- `src/core/tools/draw.ts` (`polygonTarget`, `onDrawEnd`)
- `src/core/tools/pointer.ts`
- `src/core/tools/preview.ts`
- `src/core/Editor.ts` (`resolveInput`, the value channel)
- `src/ui/elements/OlcadToolbar.ts`
