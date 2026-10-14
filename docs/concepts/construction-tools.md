# Construction tools

**Status:** planned (milestone 6, 2026-10-13). The [rotate tool](tool-rotate.md), the two-point [rectangle tool](tool-rectangle.md), the [circle tool](tool-circle.md) (centre + radius, centre + point, three points) the [regular polygon tool](tool-regular-polygon.md), the [curve tool](tool-curve.md) (Bézier with handles) the [offset tool](tool-offset.md), the [trim tool](tool-trim.md) and the [extend tool](tool-extend.md) are delivered and have their own concepts; the rest is recorded here so the tools framework and the geometry module grow towards it.

## Purpose

The construction tools turn ol-cad from a feature editor into a drafting tool: shapes defined by geometric relations (rectangle by two or three points, circle by centre and radius, arc by three points), modifications defined by geometry (offset, trim, extend, fillet, chamfer, split, merge) and transformations defined by base points (copy, rotate, scale, mirror). All of them produce ordinary GeoJSON geometry; curves are drawn with true arc math and **linearized on store** with `curves.tolerance` (decision, CLAUDE.md section 2).

## Model

**Drawing variants** (extend the [draw tool](tool-draw.md) or sit beside it)

| Tool                                              | Steps                                                              | Typed input   |
| ------------------------------------------------- | ------------------------------------------------------------------ | ------------- |
| Rectangle (2-point)                               | done, see the [rectangle tool](tool-rectangle.md)                  |               |
| Rectangle (3-point)                               | corner, direction point along one side, width point                | lengths       |
| Circle (centre + radius, centre + point, 3-point) | done, see the [circle tool](tool-circle.md)                        |               |
| Ellipse (centre + axes, axis ends, box)           | done, see the [ellipse tool](tool-ellipse.md)                      |               |
| Circle (2-point)                                  | diameter ends                                                      | points        |
| Regular polygon (sides, centre, vertex)           | done, see the [regular polygon tool](tool-regular-polygon.md)      |               |
| Curve (Bézier, start, end, two handles)           | done, see the [curve tool](tool-curve.md)                          |               |
| Arc (3-point)                                     | start, point on arc, end                                           | points        |
| Arc (centre + start + end)                        | centre, start (radius), end (angle)                                | radius, angle |
| Arc segment inside a polyline                     | while drawing a line or polygon, switch the next segment to an arc | same as arc   |

**Transformations** (follow the [move tool](tool-move.md) state machine: select → base point → second point or value)

- Copy: done as [templates](templates.md) (2026-10-13): the [template copy tool](tool-template-copy.md) stores selected objects with a base point under a name, the [template insert tool](tool-template-insert.md) inserts copies (one composite per copy), repeatedly.
- Rotate: done, see the [rotate tool](tool-rotate.md) (centre, first and second angle point).
- Scale: done, see the [scale tool](tool-scale.md) (base point, then a typed factor or a reference and a target point).
- Mirror: done, see the [mirror tool](tool-mirror.md) (two points define the line; `Create a copy? [y/N]`).

**Geometric modifications** (need the planar geometry module)

- Offset / parallel: done, see the [offset tool](tool-offset.md) (typed distance, side click; own planar math, [decision 0003](../decisions/0003-planar-offset-without-geometry-library.md)).
- Trim and extend: done, see the [trim tool](tool-trim.md) and the [extend tool](tool-extend.md) (boundary first, then clicks on the lines; own planar math).
- Fillet and chamfer: radius or distances, then two segments; the corner is replaced by an arc (linearized) or a bevel.
- Split by line: a drawn line splits the selected polygon or line; one delete plus two inserts in a composite, or one update plus one insert (decide, see Open questions).
- Merge / union: several selected features of one layer become one; delete plus insert in a composite.

**Rules for every construction tool**

1. One composite command per user action, so one undo step ([editing](editing.md)).
2. Every picked point runs through the pointer pipeline ([snapping](snapping.md)) and every value through [numeric input](numeric-input.md) (`Tool.handleValue`, first used by the regular polygon tool).
3. Live measurement feedback (radius, angle, length) through the [measurement](measurement.md) events.
4. Results are validated like any geometry; a split that would yield a sliver ring is rejected, not silently fixed.

## Related

- [Parallel tool](tool-parallel.md): delivered; partial parallels following lines and polygons.
- [Tools framework](tools.md): all of them implement the `Tool` contract; host registration arrives with them.
- [Draw tool](tool-draw.md): rectangle, circle and arc are drawing variants; arc segments extend line and polygon drawing.
- [Move tool](tool-move.md): copy, scale and mirror reuse its state machine and preview.
- [Rotate tool](tool-rotate.md): the first transformation delivered; scale and mirror follow its four-step shape.
- [Editing](editing.md): one composite per action.
- [Numeric input](numeric-input.md): radii, angles and factors as single values.
- [Snapping](snapping.md): the tangent mode snaps onto the linearized circles and curves these tools insert; a centre mode is planned.
- [Measurement](measurement.md): live radius, angle and length feedback.
- [Rectangle tool](tool-rectangle.md): the two-point rectangle, delivered; the three-point variant is listed here.
- [Circle tool](tool-circle.md): the circle by centre and radius, centre and point, or three points, delivered; the two-point (diameter) circle is listed here.
- [Regular polygon tool](tool-regular-polygon.md): delivered; its circumscribed variant is an open question in its own concept.
- [Curve tool](tool-curve.md): the free curve delivered; circular arcs and arc segments inside polylines remain here.
- [Offset tool](tool-offset.md): the first geometric modification delivered; fillet and the library question stay here.
- [Trim tool](tool-trim.md): delivered; removes the clicked parts of lines at a boundary.
- [Extend tool](tool-extend.md): delivered; extends lines to a boundary.
- [Templates](templates.md): the delivered Copy, as named reusable templates.
- [Mirror tool](tool-mirror.md): delivered; in place or as copies.
- [Scale tool](tool-scale.md): delivered; typed factor or reference and target point.
- [Ellipse tool](tool-ellipse.md): delivered; centre and axes, axis ends, or box; elliptical arcs remain with the arcs.

## Surface

Delivered: `offset`, `trim`, `extend` and the tools listed in the status line. Planned: `editor.tools.activate('rectangle3' | 'arc' | 'copy' | 'fillet' | 'chamfer' | 'split' | 'merge')`, toolbar buttons (as flyout variants where a tool has several constructions). Config `curves.tolerance` exists ([configuration.md](../configuration.md#curves)) and applies to arcs once they arrive.

## Open questions

- Geometry library (JSTS, Turf modules) versus own planar math for union and split: offset went without one ([decision 0003](../decisions/0003-planar-offset-without-geometry-library.md)); a new record is due when the next tools need robust polygon operations.
- Split: is the original feature updated (keeps its id, one part) and the rest inserted, or is it deleted and both parts inserted? Backends differ in what they prefer.
- Should arcs stay editable as arcs while the session lasts (arc metadata on the feature) and only linearize on export, or linearize immediately as the decision says?

## Source

- `src/core/geometry/` (planar math grows here)
- `src/core/tools/` (one file per tool)
