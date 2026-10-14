# Pointer pipeline

**Status:** implemented (2026-10-12). Geometry snap, angle lock and grid rewrite pointer events in that order for every tool; the crosshair shows snap feedback. The angle lock gives no feedback yet (see Open questions).

## Purpose

CAD precision comes from one rule: the coordinate a tool receives is never the raw pointer. It has been pulled onto existing geometry, locked to an allowed direction or placed on the grid, and the user has seen where it went before clicking. ol-cad implements this as one process in front of all tools, so draw, modify, move, the straightedge pick and future tools get it for free and behave identically.

## Model

**Stages** (for pointermove, pointerdown, pointerup, pointerdrag, click, singleclick, dblclick)

1. **Geometry snap** ([snapping](snapping.md)): the nearest vertex, midpoint or perpendicular foot of a visible snappable layer within the snap radius. If found, it wins and the pipeline ends here.
2. **Angle constraint** ([constraints](constraints.md)): when the lock is on and the active tool has a reference point, the pointer is projected onto the nearest allowed direction through that point. A constrained point is **not** grid-snapped (it would leave the direction).
3. **Grid** ([grid](grid.md)): when grid snap is on, the nearest grid intersection, with no radius.
4. The event's coordinate and pixel are rewritten; the tool's interaction sees the result.
5. **Feedback**: the crosshair jumps to the snap pixel and shows the mode's marker (square, triangle, right angle, circle); `snap` fires with the result or `null` when it changes.

Precedence in words: object snap beats ortho beats grid, as in CAD. The pipeline runs only in [edit mode](edit-mode.md), or while a read-only [measure tool](tool-measure.md) is active, and only while at least one of snapping, grid or angle lock is enabled.

**The last-interaction rule**

OpenLayers hands a pointer event to interactions in reverse order of insertion; an interaction that rewrites the event must therefore be the **last** one added to the map. The editor removes and re-adds the snap interaction after every `toolchange`, and tools must not add their own `ol/interaction/Snap` ([tools framework](tools.md)).

**Reference point**

Stages 1 (perpendicular) and 2 need a "previous point": the active tool's `referencePoint()`. Without one, those stages are skipped, which is why the first vertex of a drawing is free and why the modify tool is only constrained while a vertex is being placed.

**Snapped pointer position**

The pipeline remembers the last rewritten pointer coordinate; direct-distance [numeric input](numeric-input.md) uses it for the direction from the reference point, so a typed length goes where the user is pointing, snapped and constrained.

**Native pointer**

The browser cursor is hidden in edit mode and the crosshair ([straightedge](straightedge.md)) stands in for it; the crosshair follows the snapped position while the real pointer stays where the hand put it.

## Related

- [Measure tools](tool-measure.md): the pipeline also runs outside edit mode while a read-only measure tool is active.
- [Snapping](snapping.md): stage one and the winner over everything else.
- [Constraints](constraints.md): stage two, applied around the reference point.
- [Grid](grid.md): stage three, the fallback.
- [Straightedge](straightedge.md): the crosshair is the pipeline's feedback channel; the pick click is itself snapped.
- [Tools framework](tools.md): tools consume rewritten events; the snap interaction is kept last on every tool change; `referencePoint` feeds stages one and two.
- [Edit mode](edit-mode.md): the pipeline is active only in edit mode (or for a read-only tool).
- [Numeric input](numeric-input.md): direct-distance entry reads the snapped pointer position.

## Surface

- `editor.snapping.snap(coordinate)` runs stages one and three without the constraint; event `snap` ([api.md](../api.md)).
- Exported `SnapResult`, `SnapTarget`.

## Open questions

- The angle lock gives no `snap` event and no crosshair marker when it moves the pointer. Should a constrained position show a marker (CAD shows the ortho tracking line) and be reported, for example as `mode: 'angle'`?
- Tracing (milestone 5) is a fourth stage: following an existing edge from a snapped point. Where does it sit relative to the constraint?

## Source

- `src/core/snapping/SnapInteraction.ts`
- `src/core/snapping/SnapEngine.ts`
- `src/core/constraints/angle.ts`
- `src/core/crosshair.ts` (snap marker)
- `src/core/Editor.ts` (re-adding the snap interaction on `toolchange`)
