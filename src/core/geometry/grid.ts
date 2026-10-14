import type { Coordinate } from 'ol/coordinate';
import type { Extent } from 'ol/extent';

/**
 * Grid math for grid snapping: a square grid aligned with the axes of the view projection,
 * `spacing` units wide, with one intersection at `origin`.
 */

/** The grid intersection nearest to `coordinate`. */
export function nearestGridPoint(
  coordinate: Coordinate,
  spacing: number,
  origin: Coordinate = [0, 0],
): Coordinate {
  const snap = (value: number, o: number) => o + Math.round((value - o) / spacing) * spacing;
  return [snap(coordinate[0]!, origin[0]!), snap(coordinate[1]!, origin[1]!)];
}

/**
 * Every grid intersection inside `extent` (inclusive), row by row, or `null` when there would be
 * more than `maxCount` of them (the grid is too dense to draw).
 */
export function gridPointsInExtent(
  extent: Extent,
  spacing: number,
  origin: Coordinate = [0, 0],
  maxCount = Infinity,
): Coordinate[] | null {
  const [minX, minY, maxX, maxY] = extent as [number, number, number, number];
  const first = (min: number, o: number) => Math.ceil((min - o) / spacing);
  const last = (max: number, o: number) => Math.floor((max - o) / spacing);
  const i0 = first(minX, origin[0]!);
  const i1 = last(maxX, origin[0]!);
  const j0 = first(minY, origin[1]!);
  const j1 = last(maxY, origin[1]!);
  if (i1 < i0 || j1 < j0) return [];
  if ((i1 - i0 + 1) * (j1 - j0 + 1) > maxCount) return null;
  const points: Coordinate[] = [];
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      points.push([origin[0]! + i * spacing, origin[1]! + j * spacing]);
    }
  }
  return points;
}
