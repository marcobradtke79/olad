# 0003: Planar offset without a geometry library

Date: 2026-10-12

## Decision

- The offset tool (`src/core/tools/offset.ts`) uses offset math written in the project (`src/core/geometry/offset.ts`) instead of a buffer from JSTS or Turf: segments are shifted along their normals, consecutive shifted segments are joined at the intersection of their lines (mitre), a mitre that would reach farther than `OFFSET_MITRE_LIMIT` (4) offset distances from the vertex becomes a bevel, open lines keep butt ends, polygons grow or shrink with their holes doing the opposite, and multi-part geometries are offset part by part.
- Limits, accepted for now: no removal of local loops. A segment whose shifted copy would run backwards (it is shorter than the distance on the inside of a turn) makes the whole offset `null`, and the tool ignores that click; any other self-intersecting result is rejected by command validation. Curved joins (rounded outer corners) are not produced.
- Revisit when trim, extend, fillet, split and merge arrive (milestone 6): if several of them need robust polygon operations, compare JSTS (several hundred kB) and selected Turf modules against the own planar code in a new decision record.

## Why

- No runtime dependency: the ESM build stays small and the UMD build needs no further global.
- The parallel copy a CAD user expects is exactly the mitre offset; a buffer would round corners and merge parts.
- The failure modes are explicit and testable (`src/core/geometry/offset.test.ts`).
