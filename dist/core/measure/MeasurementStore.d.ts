import { Coordinate } from 'ol/coordinate';
import { LengthUnit } from '../units';
import { Extent } from 'ol/extent';
import { default as Feature } from 'ol/Feature';
import { default as VectorLayer } from 'ol/layer/Vector';
import { default as VectorSource } from 'ol/source/Vector';
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
export declare const MEASURE_LAYER_PROPERTY = "olcad:measure";
/** Fewest points a finished measurement of each kind needs. */
export declare const MEASUREMENT_MIN_POINTS: Record<MeasurementKind, number>;
/**
 * The values and label of a measurement, computed in `projection`. `null` when there are not
 * enough points for the kind.
 */
export declare function computeMeasurement(projection: string, kind: MeasurementKind, coordinates: Coordinate[], holes?: Coordinate[][], unit?: LengthUnit): {
    values: MeasurementValues;
    label: string;
} | null;
/** The label of a measurement's values, lengths and areas in `unit`'s system. */
export declare function measurementLabel(kind: MeasurementKind, values: MeasurementValues, unit?: LengthUnit): string;
/** The extent of a measurement, for zooming to it. */
export declare function measurementExtent(measurement: Pick<Measurement, 'coordinates'>): Extent;
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
export declare class MeasurementStore {
    readonly layer: VectorLayer<VectorSource<Feature>>;
    private readonly source;
    private readonly liveSource;
    readonly liveLayer: VectorLayer<VectorSource<Feature>>;
    private readonly items;
    private readonly counters;
    private nextId;
    private live;
    private readonly getProjection;
    private readonly events;
    private readonly getUnit;
    /** `getUnit` gives the length unit labels are written in (default metres). */
    constructor(getProjection: () => string, events: MeasurementEvents, getUnit?: () => LengthUnit);
    list(): Measurement[];
    get(id: string): Measurement | undefined;
    /**
     * Add a finished measurement; its values are computed in the view projection. Returns it, or
     * `null` when there are too few points for the kind.
     */
    add(kind: MeasurementKind, coordinates: Coordinate[], extras?: MeasurementExtras): Measurement | null;
    remove(id: string): boolean;
    clear(): void;
    /** The measurement in progress (dashed, labelled live), or `null` to remove it. */
    setLive(kind: MeasurementKind | null, coordinates?: Coordinate[]): Measurement | null;
    getLive(): Measurement | null;
    /** Follow a view projection switch: coordinates are transformed, values stay. */
    reproject(from: string, to: string): void;
    /** Rewrite every label in the current length unit (after `unitschange`). */
    relabel(): void;
    private redraw;
}
