# Constraints

**Status:** partial (2026-10-12). The angle lock (ortho generalised to any step and base angle) exists. Parallel / perpendicular to a picked segment and locked length are planned (milestone 5).

## Purpose

Constraints restrict where the next point may go so the user only has to aim roughly: ortho keeps a wall straight, a locked length makes every segment 5 m, parallel copies a direction. In ol-cad constraints are a stage of the [pointer pipeline](pointer-pipeline.md), relative to the tool's reference point, and are overridden by object snap, as in CAD.

## Model

**Angle lock**

1. Allowed directions are `straightedge angle + k × step` ([straightedge](straightedge.md)); step 90 on a 0° straightedge is classic ortho, step 45 adds the diagonals, step 90 on a 30° straightedge gives 30°, 120°, 210°, 300°.
2. The pointer is projected onto the nearest allowed direction **through the reference point**, keeping its component along that direction.
3. Applies only while the active tool has a reference point (a line or polygon with a fixed vertex, the move tool's second point); the first vertex is free; the [modify tool](tool-modify.md) is locked only while a vertex is being placed, around the vertex's old position.
4. A geometry snap within the radius wins over the lock; a locked point is not grid-snapped.
5. Typed direct-distance input follows the locked direction as well ([numeric input](numeric-input.md)).

**Planned**

- **Parallel / perpendicular to a segment**: pick a segment (like the straightedge pick) and lock the next segment to its direction or its normal; a one-shot version of changing the straightedge angle.
- **Locked length**: every new segment has a fixed length; the pointer only chooses the direction. Combined with the angle lock this types-free drafting of regular shapes.
- **Locked angle** (CLAUDE.md section 6): the step is one fixed angle rather than a lattice.
- Constraints compose: length and angle lock together fully determine the next point from the pointer's rough position.

## Related

- [Straightedge](straightedge.md): the base angle.
- [Pointer pipeline](pointer-pipeline.md): stage two, after the geometry snap and before the grid.
- [Snapping](snapping.md): a geometry snap overrides the constraint.
- [Tools framework](tools.md): applies only while the tool has a reference point.
- [Draw tool](tool-draw.md): the next vertex is constrained relative to the last fixed one.
- [Move tool](tool-move.md): the second point is constrained around the base point.
- [Modify tool](tool-modify.md): a vertex being placed is constrained around its original position.
- [Numeric input](numeric-input.md): direct-distance entry goes along the locked direction.
- [UI shell](ui-shell.md): the angle lock toolbox (toggle, presets, step).

## Surface

- Config `constraints.angle` (`enabled`, `step`) ([configuration.md](../configuration.md)).
- `editor.constraints`, event `constraintschange`, exported `constrainToAngleStep`, `nearestAllowedAngle` ([api.md](../api.md), [tools.md](../tools.md#angle-lock)).
- `<olcad-angle-lock>` ([ui.md](../ui.md)).

## Open questions

- Should the lock show feedback (a tracking line along the allowed direction, a marker) and report through `snap`? See the pointer pipeline.
- Toggle ortho temporarily with a held key (Shift in many CAD programs) in addition to the persistent toggle?

## Source

- `src/core/constraints/angle.ts`
- `src/core/constraints/index.ts`
- `src/core/snapping/SnapInteraction.ts` (`constrain`)
