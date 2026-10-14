import type { Coordinate } from 'ol/coordinate';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Polygon from 'ol/geom/Polygon';
import type Interaction from 'ol/interaction/Interaction';
import {
  MEASUREMENT_MIN_POINTS,
  type MeasurementExtras,
  type MeasurementKind,
} from '../measure/MeasurementStore';
import { PointPickInteraction, pickTolerance } from './pointer';
import { BaseTool, type ToolContext, type ToolOptions } from './Tool';

export type MeasureStep = 'first' | 'next' | 'vertex' | 'second';

/** Prompt shown by the input bar, per kind and step. */
export const MEASURE_PROMPTS: Record<MeasurementKind, Partial<Record<MeasureStep, string>>> = {
  distance: {
    first:
      'First point of the distance: click or type x,y; Alt+click a line or polygon to measure it',
    next: 'Next point: click or type x,y · @dx,dy · @distance<angle; Enter finishes, Backspace removes the last point, Escape drops the distance',
  },
  area: {
    first: 'First corner of the area: click or type x,y; Alt+click a polygon to measure it',
    next: 'Next corner: click or type x,y · @dx,dy · @distance<angle; Enter finishes (3 corners or more), Backspace removes the last corner, Escape drops the area',
  },
  angle: {
    first: 'First point of the angle: click or type x,y',
    vertex:
      'Vertex of the angle: click or type x,y · @dx,dy · @distance<angle; Escape drops the angle',
    second:
      'Second point of the angle: click or type x,y · @dx,dy · @distance<angle; Escape drops the angle',
  },
};

const PICK_NOTICES: Record<MeasurementKind, string> = {
  distance: 'Alt+click a line or polygon to measure it.',
  area: 'Alt+click a polygon to measure its area.',
  angle: '',
};

interface Picked {
  coordinates: Coordinate[];
  extras: MeasurementExtras;
}

/**
 * Measure a distance (a polyline of points; Enter finishes), an area (the corners of a
 * polygon; Enter finishes) or an angle (first point, vertex, second point; finishes itself).
 * Alt+click on a line or polygon measures it directly: its length, or its area and perimeter.
 * The measurement in progress is shown live; finished ones go to `editor.measurements` and the
 * tool stays active for the next. Read-only: it runs with edit mode off too.
 */
export class MeasureTool extends BaseTool {
  readonly id: string;
  override readonly readOnly = true;
  private points: Coordinate[] = [];
  private notice: string | null = null;
  private pointer: PointPickInteraction | null = null;
  private suspended = false;

  readonly kind: MeasurementKind;

  constructor(kind: MeasurementKind) {
    super();
    this.kind = kind;
    this.id = `measure-${kind}`;
  }

  override canActivate(): boolean {
    return true;
  }

  override getPrompt(): string {
    const prompt = MEASURE_PROMPTS[this.kind][this.step()] ?? '';
    return this.notice ? `${this.notice} ${prompt}` : prompt;
  }

  override activate(ctx: ToolContext, options?: ToolOptions): void {
    this.pointer = new PointPickInteraction({
      click: (coordinate, raw, alt) => this.click(coordinate, raw, alt),
      move: (coordinate) => this.showLive(coordinate),
    });
    this.interactions = [this.pointer as Interaction];
    super.activate(ctx, options);
    this.reset();
  }

  override deactivate(): void {
    this.ctx?.measurements.setLive(null);
    this.removeInteractions();
    this.pointer = null;
    this.points = [];
    this.notice = null;
  }

  /** Enter: a distance or area with enough points is stored. */
  override finish(): void {
    if (this.kind === 'angle') return;
    this.store();
  }

  /** Escape drops the measurement in progress; finished ones stay. */
  override cancel(): void {
    this.reset();
  }

  /** Backspace removes the last point. */
  override removeLastPoint(): boolean {
    if (this.points.length === 0) return false;
    this.points.pop();
    this.notice = null;
    this.ctx?.measurements.setLive(this.points.length ? this.kind : null, this.points);
    this.ctx?.promptChanged();
    return true;
  }

  /** A typed point is the next point. */
  override handleInput(coordinate: number[]): boolean {
    this.addPoint(coordinate);
    return true;
  }

  /** Relative input is measured from the last point. */
  override referencePoint(): number[] | null {
    return this.points[this.points.length - 1] ?? null;
  }

  override setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    this.pointer?.setActive(!suspended);
  }

  private step(): MeasureStep {
    if (this.points.length === 0) return 'first';
    if (this.kind !== 'angle') return 'next';
    return this.points.length === 1 ? 'vertex' : 'second';
  }

  private click(coordinate: Coordinate, raw: Coordinate, alt: boolean): void {
    if (this.suspended) return;
    if (alt && this.points.length === 0 && this.kind !== 'angle') {
      this.pick(raw);
      return;
    }
    this.addPoint(coordinate);
  }

  private addPoint(coordinate: Coordinate): void {
    const last = this.points[this.points.length - 1];
    if (last && last[0] === coordinate[0] && last[1] === coordinate[1]) return;
    this.points.push([coordinate[0]!, coordinate[1]!]);
    this.notice = null;
    if (this.kind === 'angle' && this.points.length === 3) {
      this.store();
      return;
    }
    this.ctx?.measurements.setLive(this.kind, this.points);
    this.ctx?.promptChanged();
  }

  private showLive(coordinate: Coordinate): void {
    if (this.points.length === 0) return;
    this.ctx?.measurements.setLive(this.kind, [...this.points, coordinate]);
  }

  private store(): void {
    if (this.points.length < MEASUREMENT_MIN_POINTS[this.kind]) return;
    this.ctx?.measurements.add(this.kind, this.points);
    this.reset();
  }

  private reset(): void {
    this.points = [];
    this.notice = null;
    this.ctx?.measurements.setLive(null);
    this.ctx?.promptChanged();
  }

  /** Measure the line or polygon nearest to the pointer, within the pick tolerance. */
  private pick(raw: Coordinate): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const tolerance = pickTolerance(ctx);
    let best: { picked: Picked; distance: number } | null = null;
    for (const info of ctx.layers.list()) {
      if (!info.visible) continue;
      for (const feature of ctx.layers.getSource(info.id).getFeatures()) {
        const picked = this.pickable(feature, info.id, raw);
        if (!picked) continue;
        const geometry = feature.getGeometry()!;
        const inside =
          (geometry instanceof Polygon || geometry instanceof MultiPolygon) &&
          geometry.intersectsCoordinate(raw);
        const closest = geometry.getClosestPoint(raw);
        const distance = inside ? 0 : Math.hypot(closest[0]! - raw[0]!, closest[1]! - raw[1]!);
        if (distance <= tolerance && (!best || distance < best.distance)) {
          best = { picked, distance };
        }
      }
    }
    if (!best) {
      this.notice = PICK_NOTICES[this.kind];
      ctx.promptChanged();
      return;
    }
    ctx.measurements.add(this.kind, best.picked.coordinates, best.picked.extras);
    this.reset();
  }

  /** What a feature gives this kind of measurement: the part of it nearest to `at`. */
  private pickable(feature: Feature, layer: string, at: Coordinate): Picked | null {
    const geometry = feature.getGeometry();
    if (!geometry) return null;
    const featureId = feature.getId();
    const source = { layer, ...(featureId !== undefined ? { featureId } : {}) };
    const polygon = nearestPart(geometry, at, 'polygon') as Polygon | null;
    if (polygon) {
      const [outer, ...holes] = polygon.getCoordinates();
      if (this.kind === 'area') {
        return {
          coordinates: outer!.slice(0, -1),
          extras: { holes: holes.map((r) => r.slice(0, -1)), source },
        };
      }
      return { coordinates: outer!, extras: { source } }; // the perimeter as a distance
    }
    if (this.kind !== 'distance') return null;
    const line = nearestPart(geometry, at, 'line') as LineString | null;
    return line ? { coordinates: line.getCoordinates(), extras: { source } } : null;
  }
}

/** The single polygon or line of a (multi-)geometry nearest to `at`, or `null`. */
function nearestPart(
  geometry: Geometry,
  at: Coordinate,
  kind: 'polygon' | 'line',
): Geometry | null {
  const parts: Geometry[] =
    kind === 'polygon'
      ? geometry instanceof Polygon
        ? [geometry]
        : geometry instanceof MultiPolygon
          ? geometry.getPolygons()
          : []
      : geometry instanceof LineString
        ? [geometry]
        : geometry instanceof MultiLineString
          ? geometry.getLineStrings()
          : [];
  let best: Geometry | null = null;
  let bestDistance = Infinity;
  for (const part of parts) {
    const inside = part instanceof Polygon && part.intersectsCoordinate(at);
    const closest = part.getClosestPoint(at);
    const distance = inside ? 0 : Math.hypot(closest[0]! - at[0]!, closest[1]! - at[1]!);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = part;
    }
  }
  return best;
}
