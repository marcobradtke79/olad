# Draw tool

**Status:** partial (2026-10-12). Point, line and polygon into the active or draft layer, typed vertices, multi-part wrapping, defaults and select-after-insert exist. Rectangle, circle and arc drawing and arc segments inside polylines belong to [construction tools](construction-tools.md).

## Purpose

Insert new objects. In CAD the drawing command stays active so several objects can be placed in a row, every vertex can be clicked or typed, and the pointer is helped by snapping and constraints. In ol-cad the tool additionally knows _where_ the object goes (the active layer) and _what_ it is (the layer's geometry type and schema defaults), so the host's object classes are respected without extra UI.

## Model

**Target resolution** (`drawTarget`)

1. The target layer is the active layer, else the draft layer. It must exist and allow `insert`, otherwise the tool cannot activate.
2. A fixed-type layer dictates the geometry type (`Multi*` layers draw one part); an option `type` that differs is refused.
3. An `Any` layer (the draft) draws the option `type`, `Point` by default.
4. When the active layer changes while the tool is active, the editor re-activates it for the new target with the same options, else without, else deactivates ([layers and editability](layers-and-editability.md)).

**Drawing**

- Points: one click (or one typed point) inserts.
- Lines: click vertices, double-click or Enter finishes (at least two vertices). Polygons: Enter or double-click closes.
- Backspace removes the last vertex; Escape aborts the sketch; the tool stays active afterwards.
- Every click arrives already snapped and constrained ([snapping](snapping.md), [constraints](constraints.md)); the tool adds no snapping of its own.
- Typed points ([numeric input](numeric-input.md)) are appended as vertices (starting a sketch when none exists) or, on a point layer, inserted directly.
- `referencePoint()` is the last **fixed** vertex of the sketch (not the moving one), `null` while the first vertex is open. This drives the perpendicular snap, the angle lock and relative input.

**On finish**

1. Schema defaults are applied ([attributes](attributes.md)).
2. For `Multi*` layers the geometry is wrapped into the multi type.
3. One `insertFeature` goes through [editing](editing.md); an invalid geometry is rejected (`validationerror`) and nothing is inserted.
4. On success the new feature becomes the [selection](selection.md) and `featureinsert` lets the attribute popup open.

**Planned**

- Rectangle, circle and arc variants and arc segments inside lines and polygons, see [construction tools](construction-tools.md).
- Tracing along existing geometry while drawing (milestone 5, see snapping).

## Related

- [Text tool](tool-text.md): the same target order (active, else draft) and insert path for texts.
- [Parallel tool](tool-parallel.md): inserts its lines through the same path into the active or draft layer.
- [Layers and editability](layers-and-editability.md): target layer, geometry type and insert right; follows the active layer.
- [Tools framework](tools.md): the verbs map onto finish, remove last vertex and abort.
- [Moving drafts](draft-move.md): objects drawn into the draft layer can be moved into a proper layer later.
- [Snapping](snapping.md): snapped vertices for free; the sketch's last vertex anchors the perpendicular snap.
- [Constraints](constraints.md): the angle lock constrains the next vertex relative to the last fixed one.
- [Numeric input](numeric-input.md): typed points become vertices; relative input is measured from the last fixed vertex.
- [Attributes](attributes.md): defaults on insert; the popup opens on `featureinsert`.
- [Editing](editing.md): one `insertFeature` per drawing.
- [Selection](selection.md): the inserted feature is selected.
- [Construction tools](construction-tools.md): the planned drawing variants.
- [Rectangle tool](tool-rectangle.md): reuses the target-layer rule and the insert path for polygons.
- [Circle tool](tool-circle.md): reuses the target-layer rule (`polygonTarget`) and the insert path for polygons.
- [Ellipse tool](tool-ellipse.md): reuses the target-layer rule (`polygonTarget`) and the insert path for polygons.
- [Regular polygon tool](tool-regular-polygon.md): reuses the target-layer rule (`polygonTarget`) and the insert path for polygons.
- [Curve tool](tool-curve.md): reuses the target-layer rule (`lineTarget`) and the insert path for lines.

## Surface

- `editor.tools.activate('draw', { type })`, exported `drawTarget`, `DrawType` ([tools.md](../tools.md#draw)).
- Toolbar buttons Draw point / line / polygon, layer list Edit button selecting the target layer ([ui.md](../ui.md)).

## Open questions

- Should finishing a polygon with fewer than three vertices be refused silently (today the sketch is dropped by OpenLayers) or reported as a validation error?
- Should the tool offer "close with last segment" vs "undo last vertex" on Enter for lines (CAD `C` vs Enter)?

## Source

- `src/core/tools/draw.ts`
- `src/core/tools/ToolManager.ts`
- `src/core/Editor.ts` (`activelayerchange` handling)
