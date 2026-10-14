import type { Coordinate } from 'ol/coordinate';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type SimpleGeometry from 'ol/geom/SimpleGeometry';
import type { Pixel } from 'ol/pixel';
import type { ResolvedGridConfig, ResolvedSnappingConfig, SnapMode } from '../config/types';
import { nearestGridPoint } from '../geometry/grid';
import { projectOnSegment, ringsOf, segmentsOf } from '../geometry/segments';
import { tangentPoints } from '../geometry/tangent';
import type { LayerManager } from '../layers/LayerManager';

/** What the pointer snapped to: a geometry snap mode or the grid. */
export type SnapTarget = SnapMode | 'grid';

export interface SnapResult {
  /** Snap location in the view projection. */
  coordinate: Coordinate;
  pixel: Pixel;
  mode: SnapTarget;
  /** Layer and feature of a geometry snap; absent for a grid snap. */
  layer?: string;
  feature?: Feature;
}

/**
 * Ranking of modes when two candidates are equally close: a vertex wins over a midpoint. A
 * tangent point is always a vertex of the linearized curve, so it ranks first or it would never
 * show while the vertex mode is on.
 */
const MODE_RANK: Record<SnapMode, number> = {
  tangent: 0,
  vertex: 1,
  midpoint: 2,
  perpendicular: 3,
};

/**
 * Every snap candidate a geometry offers for the given modes. `reference` is the last fixed
 * vertex of a drawing in progress; without it the `perpendicular` and `tangent` modes yield
 * nothing.
 */
export function snapCandidates(
  geometry: Geometry,
  modes: readonly SnapMode[],
  reference: Coordinate | null = null,
): { coordinate: Coordinate; mode: SnapMode }[] {
  const candidates: { coordinate: Coordinate; mode: SnapMode }[] = [];
  if (modes.includes('vertex')) {
    for (const coordinate of flatVertices(geometry))
      candidates.push({ coordinate, mode: 'vertex' });
  }
  const wantMidpoint = modes.includes('midpoint');
  const wantPerpendicular = modes.includes('perpendicular') && reference !== null;
  if (wantMidpoint || wantPerpendicular) {
    for (const [a, b] of segmentsOf(geometry)) {
      if (wantMidpoint) {
        candidates.push({
          coordinate: [(a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2],
          mode: 'midpoint',
        });
      }
      if (wantPerpendicular) {
        // The foot of the perpendicular from the reference onto the segment, if it lies on it.
        const { foot, t } = projectOnSegment(reference!, a, b);
        if (t >= 0 && t <= 1) candidates.push({ coordinate: foot, mode: 'perpendicular' });
      }
    }
  }
  if (modes.includes('tangent') && reference !== null) {
    for (const ring of ringsOf(geometry)) {
      for (const coordinate of tangentPoints(ring, reference))
        candidates.push({ coordinate, mode: 'tangent' });
    }
  }
  return candidates;
}

function flatVertices(geometry: Geometry): Coordinate[] {
  const coordinates = (geometry as SimpleGeometry).getCoordinates?.() as unknown;
  const out: Coordinate[] = [];
  const walk = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === 'number') out.push(value as Coordinate);
    else for (const inner of value) walk(inner);
  };
  walk(coordinates);
  return out;
}

/**
 * Finds the snap location nearest to the pointer among the vertices, segment midpoints,
 * perpendicular feet and tangent points of the snappable, visible layers. Distances are measured in pixels so the
 * radius is screen-based. Without a geometry snap, and with grid snap on, the nearest grid
 * intersection is the result (no radius: the pointer always sits on the grid).
 */
export class SnapEngine {
  private readonly layers: LayerManager;
  private readonly getConfig: () => ResolvedSnappingConfig;
  private readonly getGrid: () => ResolvedGridConfig;

  constructor(
    layers: LayerManager,
    getConfig: () => ResolvedSnappingConfig,
    getGrid: () => ResolvedGridConfig = () => ({
      enabled: false,
      spacing: 1,
      origin: [0, 0],
      visible: false,
    }),
  ) {
    this.layers = layers;
    this.getConfig = getConfig;
    this.getGrid = getGrid;
  }

  /**
   * @param coordinate pointer position in the view projection
   * @param pixel pointer position in pixels
   * @param resolution map units per pixel
   * @param toPixel converts a coordinate to pixels (the map's `getPixelFromCoordinate`)
   */
  snap(
    coordinate: Coordinate,
    pixel: Pixel,
    resolution: number,
    toPixel: (coordinate: Coordinate) => Pixel,
    reference: Coordinate | null = null,
  ): SnapResult | null {
    return (
      this.snapGeometry(coordinate, pixel, resolution, toPixel, reference) ??
      this.snapGrid(coordinate, toPixel)
    );
  }

  /** The nearest grid intersection, when grid snap is on. */
  snapGrid(coordinate: Coordinate, toPixel: (c: Coordinate) => Pixel): SnapResult | null {
    const { enabled, spacing, origin } = this.getGrid();
    if (!enabled) return null;
    const snapped = nearestGridPoint(coordinate, spacing, origin);
    return { coordinate: snapped, pixel: toPixel(snapped), mode: 'grid' };
  }

  /** The nearest geometry snap within the radius, ignoring the grid. */
  snapGeometry(
    coordinate: Coordinate,
    pixel: Pixel,
    resolution: number,
    toPixel: (coordinate: Coordinate) => Pixel,
    reference: Coordinate | null,
  ): SnapResult | null {
    const { enabled, tolerancePx, modes } = this.getConfig();
    if (!enabled || modes.length === 0) return null;
    const radius = tolerancePx * resolution;
    const extent = [
      coordinate[0]! - radius,
      coordinate[1]! - radius,
      coordinate[0]! + radius,
      coordinate[1]! + radius,
    ];
    let best: SnapResult | null = null;
    let bestDistance = Infinity;
    for (const id of this.layers.snappableIds()) {
      if (!this.layers.getOlLayer(id).getVisible()) continue;
      this.layers.getSource(id).forEachFeatureInExtent(extent, (feature) => {
        const geometry = feature.getGeometry();
        if (!geometry) return;
        for (const candidate of snapCandidates(geometry, modes, reference)) {
          const candidatePixel = toPixel(candidate.coordinate);
          const distance = Math.hypot(
            candidatePixel[0]! - pixel[0]!,
            candidatePixel[1]! - pixel[1]!,
          );
          if (distance > tolerancePx) continue;
          const better =
            distance < bestDistance ||
            (distance === bestDistance &&
              best !== null &&
              MODE_RANK[candidate.mode] < MODE_RANK[best.mode as SnapMode]);
          if (better) {
            bestDistance = distance;
            best = {
              coordinate: candidate.coordinate,
              pixel: candidatePixel,
              mode: candidate.mode,
              layer: id,
              feature,
            };
          }
        }
      });
    }
    return best;
  }
}
