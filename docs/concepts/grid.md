# Grid

**Status:** implemented (2026-10-12).

## Purpose

Grid snap is CAD's SNAP as opposed to OSNAP: with nothing to snap to, the pointer still lands on a regular lattice, so free-hand sketches come out with round coordinates. It is a separate toggle from object snapping, has no radius (it always applies when on) and loses to any geometry snap or active constraint.

## Model

- A square grid aligned with the axes of the view projection, `spacing` view units apart (metres in projected systems, degrees in geographic ones), with an intersection at `origin`.
- Position in the [pointer pipeline](pointer-pipeline.md): the last stage. A geometry snap within the radius wins, and a point moved by the angle lock is not grid-snapped.
- **Dots**: with `visible` on, intersections are drawn as small dots in the cursor colour while [edit mode](edit-mode.md) is on; dots are hidden when they would be closer than 8 px (zoomed out) or more than 20 000 would be drawn. Snapping still applies while the dots are hidden.
- Spacing and origin are plain numbers in view units; a projection switch does not convert them ([projections](projections.md)).
- Marker on the crosshair: circle. `snap` reports `mode: 'grid'` without layer or feature.

## Related

- [Snapping](snapping.md): the geometry snap wins over the grid.
- [Pointer pipeline](pointer-pipeline.md): the grid is the last stage.
- [Projections](projections.md): spacing and origin are in view units and not converted.
- [Edit mode](edit-mode.md): the dot layer is attached in edit mode only.
- [Measurement](measurement.md): a spacing in metres is only a ground distance in projected metric systems.
- [UI shell](ui-shell.md): the grid settings toolbox shows the unit of the current projection.

## Surface

- Config `grid` (`enabled`, `spacing`, `origin`, `visible`) ([configuration.md](../configuration.md)).
- `editor.grid`, event `gridchange` ([api.md](../api.md), [tools.md](../tools.md#snapping)).
- `<olcad-grid-settings>` ([ui.md](../ui.md)).

## Open questions

- Should the grid follow the straightedge angle (rotated grid, CAD's snap angle) instead of the projection axes?
- Should spacing be expressed in metres and converted per projection, so a 1 m grid stays 1 m after a switch?

## Source

- `src/core/geometry/grid.ts`
- `src/core/snapping/GridLayer.ts`
- `src/core/snapping/SnapEngine.ts` (`snapGrid`)
