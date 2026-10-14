import { MeasurementKind } from '../measure/MeasurementStore';
import { BaseTool, ToolContext, ToolOptions } from './Tool';
export type MeasureStep = 'first' | 'next' | 'vertex' | 'second';
/** Prompt shown by the input bar, per kind and step. */
export declare const MEASURE_PROMPTS: Record<MeasurementKind, Partial<Record<MeasureStep, string>>>;
/**
 * Measure a distance (a polyline of points; Enter finishes), an area (the corners of a
 * polygon; Enter finishes) or an angle (first point, vertex, second point; finishes itself).
 * Alt+click on a line or polygon measures it directly: its length, or its area and perimeter.
 * The measurement in progress is shown live; finished ones go to `editor.measurements` and the
 * tool stays active for the next. Read-only: it runs with edit mode off too.
 */
export declare class MeasureTool extends BaseTool {
    readonly id: string;
    readonly readOnly = true;
    private points;
    private notice;
    private pointer;
    private suspended;
    readonly kind: MeasurementKind;
    constructor(kind: MeasurementKind);
    canActivate(): boolean;
    getPrompt(): string;
    activate(ctx: ToolContext, options?: ToolOptions): void;
    deactivate(): void;
    /** Enter: a distance or area with enough points is stored. */
    finish(): void;
    /** Escape drops the measurement in progress; finished ones stay. */
    cancel(): void;
    /** Backspace removes the last point. */
    removeLastPoint(): boolean;
    /** A typed point is the next point. */
    handleInput(coordinate: number[]): boolean;
    /** Relative input is measured from the last point. */
    referencePoint(): number[] | null;
    setSuspended(suspended: boolean): void;
    private step;
    private click;
    private addPoint;
    private showLive;
    private store;
    private reset;
    /** Measure the line or polygon nearest to the pointer, within the pick tolerance. */
    private pick;
    /** What a feature gives this kind of measurement: the part of it nearest to `at`. */
    private pickable;
}
