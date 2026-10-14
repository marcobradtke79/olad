import type { Coordinate } from 'ol/coordinate';
import type { LengthUnit } from '../units';
import { boundingExtent, type Extent } from 'ol/extent';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import VectorLayer from 'ol/layer/Vector';
import { transform } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import {
  formatAngle,
  formatArea,
  formatLength,
  measureAngle,
  measureArea,
  measureLength,
} from './measurements';

export type MeasurementKind = 'distance' | 'area' | 'angle';

/** Measured values: metres, square metres and degrees. */
export interface MeasurementValues {
  /** Distance: total length; area: perimeter is in `perimeter`. */
  length?: number;
  /** Distance: the length of each segment. */
  segments?: number[];
  area?: number;
  perimeter?: number;
  /** Angle at the vertex, 0 … 180, and its reflex. */
  angle?: number;
  reflex?: number;
}

/** Where a measurement of an existing object came from. */
export interface MeasurementSource {
  layer: string;
  featureId?: string | number;
}

/**
 * One measurement. `coordinates` are in the view projection: the points of a distance, the
 * outer ring of an area (open), or first point, vertex and second point of an angle.
 */
export interface Measurement {
  id: string;
  kind: MeasurementKind;
  /** "Distance 1", "Area 2", "Angle 3". */
  name: string;
  coordinates: Coordinate[];
  /** Holes of an area measured from a polygon. */
  holes?: Coordinate[][];
  values: MeasurementValues;
  /** The values as display text ("1.25 ha · 450.00 m"). */
  label: string;
  source?: MeasurementSource;
}

export interface MeasurementExtras {
  holes?: Coordinate[][];
  source?: MeasurementSource;
}

/** Layer property marking the measurement overlay (`true`); not an editor layer. */
export const MEASURE_LAYER_PROPERTY = 'olcad:measure';

const KIND_NAMES: Record<MeasurementKind, string> = {
  distance: 'Distance',
  area: 'Area',
  angle: 'Angle',
};

/** Fewest points a finished measurement of each kind needs. */
export const MEASUREMENT_MIN_POINTS: Record<MeasurementKind, number> = {
  distance: 2,
  area: 3,
  angle: 3,
};

const COLOR = 'rgba(251, 191, 36, 0.95)';
const solid = new Stroke({ color: COLOR, width: 2 });
const dashed = new Stroke({ color: COLOR, width: 2, lineDash: [6, 4] });
const areaFill = new Fill({ color: 'rgba(251, 191, 36, 0.15)' });
const SHAPE_STYLE = new Style({ stroke: solid, fill: areaFill });
const LIVE_SHAPE_STYLE = new Style({ stroke: dashed, fill: areaFill });
const labelStyles = new Map<string, Style>();

function labelStyle(text: string, strong: boolean): Style {
  const key = `${strong ? 1 : 0}${text}`;
  let style = labelStyles.get(key);
  if (!style) {
    style = new Style({
      text: new Text({
        text,
        font: `${strong ? '600 ' : ''}12px system-ui, sans-serif`,
        fill: new Fill({ color: '#fff' }),
        backgroundFill: new Fill({ color: 'rgba(17, 24, 39, 0.8)' }),
        padding: [2, 4, 2, 4],
        offsetY: strong ? -14 : 0,
        overflow: true,
      }),
      zIndex: strong ? 3 : 2,
    });
    if (labelStyles.size > 500) labelStyles.clear();
    labelStyles.set(key, style);
  }
  return style;
}

/**
 * The values and label of a measurement, computed in `projection`. `null` when there are not
 * enough points for the kind.
 */
export function computeMeasurement(
  projection: string,
  kind: MeasurementKind,
  coordinates: Coordinate[],
  holes: Coordinate[][] = [],
  unit: LengthUnit = 'm',
): { values: MeasurementValues; label: string } | null {
  if (coordinates.length < MEASUREMENT_MIN_POINTS[kind]) return null;
  let values: MeasurementValues;
  if (kind === 'distance') {
    const { total, segments } = measureLength(projection, coordinates);
    values = { length: total, segments };
  } else if (kind === 'area') {
    const { area, perimeter } = measureArea(projection, [coordinates, ...holes]);
    values = { area, perimeter };
  } else {
    const { angle, reflex } = measureAngle(coordinates[0]!, coordinates[1]!, coordinates[2]!);
    values = { angle, reflex };
  }
  return { values, label: measurementLabel(kind, values, unit) };
}

/** The label of a measurement's values, lengths and areas in `unit`'s system. */
export function measurementLabel(
  kind: MeasurementKind,
  values: MeasurementValues,
  unit: LengthUnit = 'm',
): string {
  if (kind === 'distance') return formatLength(values.length ?? 0, unit);
  if (kind === 'area') {
    return `${formatArea(values.area ?? 0, unit)} · ${formatLength(values.perimeter ?? 0, unit)}`;
  }
  return formatAngle(values.angle ?? 0);
}

/** The extent of a measurement, for zooming to it. */
export function measurementExtent(measurement: Pick<Measurement, 'coordinates'>): Extent {
  return boundingExtent(measurement.coordinates);
}

const midpoint = (a: Coordinate, b: Coordinate): Coordinate => [
  (a[0]! + b[0]!) / 2,
  (a[1]! + b[1]!) / 2,
];

/** The overlay features for a measurement (its shape and its labels). */
function featuresFor(
  kind: MeasurementKind,
  coordinates: Coordinate[],
  holes: Coordinate[][],
  values: MeasurementValues | null,
  label: string | null,
  live: boolean,
  unit: LengthUnit = 'm',
): Feature[] {
  const out: Feature[] = [];
  const shape = (geometry: LineString | Polygon) => {
    const feature = new Feature(geometry);
    feature.setStyle(live ? LIVE_SHAPE_STYLE : SHAPE_STYLE);
    out.push(feature);
  };
  const text = (at: Coordinate, value: string, strong: boolean) => {
    const feature = new Feature(new Point(at));
    feature.setStyle(labelStyle(value, strong));
    out.push(feature);
  };
  if (coordinates.length < 2) return out;
  if (kind === 'distance') {
    shape(new LineString(coordinates));
    const segments = values?.segments ?? [];
    if (segments.length > 1) {
      segments.forEach((length, i) =>
        text(midpoint(coordinates[i]!, coordinates[i + 1]!), formatLength(length, unit), false),
      );
    }
    if (label) text(coordinates[coordinates.length - 1]!, label, true);
  } else if (kind === 'area') {
    if (coordinates.length < 3) {
      shape(new LineString(coordinates));
      return out;
    }
    const polygon = new Polygon([
      [...coordinates, coordinates[0]!],
      ...holes.map((ring) => [...ring, ring[0]!]),
    ]);
    shape(polygon);
    if (label) text(polygon.getInteriorPoint().getCoordinates().slice(0, 2), label, true);
  } else {
    shape(new LineString(coordinates.slice(0, 3)));
    if (coordinates.length === 3 && values?.angle !== undefined) {
      const [first, vertex, second] = coordinates as [Coordinate, Coordinate, Coordinate];
      const legs = [first, second].map((p) => Math.hypot(p[0]! - vertex[0]!, p[1]! - vertex[1]!));
      const radius = Math.min(...legs) * 0.3;
      if (radius > 0) {
        const a = Math.atan2(first[1]! - vertex[1]!, first[0]! - vertex[0]!);
        let sweep = Math.atan2(second[1]! - vertex[1]!, second[0]! - vertex[0]!) - a;
        while (sweep > Math.PI) sweep -= 2 * Math.PI;
        while (sweep < -Math.PI) sweep += 2 * Math.PI;
        const arc: Coordinate[] = [];
        for (let i = 0; i <= 24; i++) {
          const t = a + (sweep * i) / 24;
          arc.push([vertex[0]! + radius * Math.cos(t), vertex[1]! + radius * Math.sin(t)]);
        }
        shape(new LineString(arc));
        if (label) text(arc[12]!, label, true);
      }
    }
  }
  return out;
}

/** Callbacks of the store: the list changed, the measurement in progress changed. */
export interface MeasurementEvents {
  change(measurements: Measurement[]): void;
  live(measurement: Measurement | null): void;
}

/**
 * The measurements of the session (`editor.measurements`) and their overlay layer: finished
 * measurements with their labels, plus the one in progress (dashed). Measurements are never
 * part of a layer or the change set.
 */
export class MeasurementStore {
  readonly layer: VectorLayer<VectorSource<Feature>>;
  private readonly source = new VectorSource<Feature>();
  private readonly liveSource = new VectorSource<Feature>();
  readonly liveLayer: VectorLayer<VectorSource<Feature>>;
  private readonly items: Measurement[] = [];
  private readonly counters: Record<MeasurementKind, number> = { distance: 0, area: 0, angle: 0 };
  private nextId = 1;
  private live: Measurement | null = null;

  private readonly getProjection: () => string;
  private readonly events: MeasurementEvents;
  private readonly getUnit: () => LengthUnit;

  /** `getUnit` gives the length unit labels are written in (default metres). */
  constructor(
    getProjection: () => string,
    events: MeasurementEvents,
    getUnit: () => LengthUnit = () => 'm',
  ) {
    this.getProjection = getProjection;
    this.events = events;
    this.getUnit = getUnit;
    const options = {
      zIndex: 1002,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      properties: { [MEASURE_LAYER_PROPERTY]: true },
    };
    this.layer = new VectorLayer({ source: this.source, ...options });
    this.liveLayer = new VectorLayer({ source: this.liveSource, ...options });
  }

  list(): Measurement[] {
    return this.items.map((m) => ({ ...m }));
  }

  get(id: string): Measurement | undefined {
    const found = this.items.find((m) => m.id === id);
    return found ? { ...found } : undefined;
  }

  /**
   * Add a finished measurement; its values are computed in the view projection. Returns it, or
   * `null` when there are too few points for the kind.
   */
  add(
    kind: MeasurementKind,
    coordinates: Coordinate[],
    extras: MeasurementExtras = {},
  ): Measurement | null {
    const coords = coordinates.map((c) => [c[0]!, c[1]!]);
    const holes = extras.holes?.map((ring) => ring.map((c) => [c[0]!, c[1]!]));
    const computed = computeMeasurement(this.getProjection(), kind, coords, holes, this.getUnit());
    if (!computed) return null;
    this.counters[kind]++;
    const measurement: Measurement = {
      id: `m${this.nextId++}`,
      kind,
      name: `${KIND_NAMES[kind]} ${this.counters[kind]}`,
      coordinates: coords,
      ...(holes?.length ? { holes } : {}),
      values: computed.values,
      label: computed.label,
      ...(extras.source ? { source: { ...extras.source } } : {}),
    };
    this.items.push(measurement);
    this.redraw();
    this.events.change(this.list());
    return { ...measurement };
  }

  remove(id: string): boolean {
    const index = this.items.findIndex((m) => m.id === id);
    if (index < 0) return false;
    this.items.splice(index, 1);
    this.redraw();
    this.events.change(this.list());
    return true;
  }

  clear(): void {
    if (this.items.length === 0) return;
    this.items.length = 0;
    this.redraw();
    this.events.change(this.list());
  }

  /** The measurement in progress (dashed, labelled live), or `null` to remove it. */
  setLive(kind: MeasurementKind | null, coordinates: Coordinate[] = []): Measurement | null {
    this.liveSource.clear(true);
    if (!kind || coordinates.length === 0) {
      if (this.live) {
        this.live = null;
        this.events.live(null);
      }
      return null;
    }
    const computed = computeMeasurement(
      this.getProjection(),
      kind,
      coordinates,
      [],
      this.getUnit(),
    );
    this.live = {
      id: 'live',
      kind,
      name: KIND_NAMES[kind],
      coordinates: coordinates.map((c) => [c[0]!, c[1]!]),
      values: computed?.values ?? {},
      label: computed?.label ?? '',
    };
    this.liveSource.addFeatures(
      featuresFor(
        kind,
        coordinates,
        [],
        computed?.values ?? null,
        computed?.label ?? null,
        true,
        this.getUnit(),
      ),
    );
    this.events.live({ ...this.live });
    return { ...this.live };
  }

  getLive(): Measurement | null {
    return this.live ? { ...this.live } : null;
  }

  /** Follow a view projection switch: coordinates are transformed, values stay. */
  reproject(from: string, to: string): void {
    const move = (c: Coordinate) => transform(c, from, to);
    for (const m of this.items) {
      m.coordinates = m.coordinates.map(move);
      if (m.holes) m.holes = m.holes.map((ring) => ring.map(move));
    }
    this.setLive(null);
    this.redraw();
    if (this.items.length) this.events.change(this.list());
  }

  /** Rewrite every label in the current length unit (after `unitschange`). */
  relabel(): void {
    const unit = this.getUnit();
    for (const m of this.items) m.label = measurementLabel(m.kind, m.values, unit);
    if (this.live) this.setLive(this.live.kind, this.live.coordinates);
    this.redraw();
    if (this.items.length) this.events.change(this.list());
  }

  private redraw(): void {
    const unit = this.getUnit();
    this.source.clear(true);
    this.source.addFeatures(
      this.items.flatMap((m) =>
        featuresFor(m.kind, m.coordinates, m.holes ?? [], m.values, m.label, false, unit),
      ),
    );
  }
}
