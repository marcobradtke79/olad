import { LengthUnit } from '../units';
/**
 * Parser for CAD numeric input. Forms:
 * - `x,y` absolute coordinate in view-projection units,
 * - `@dx,dy` relative offset from the last point,
 * - `@distance<angle` polar offset from the last point, angle in degrees,
 * - `distance` a single length along the current pointer direction.
 * Every length may carry a unit (`5ft`, `5 ft`, `12.5 m`, `3'`, `@3ft,4ft`, `@10 mi<45`); one
 * without a unit is in the default unit. Lengths are returned in metres. Numbers use `.` as
 * decimal separator; the two values of a pair are separated by `,`, `;` or whitespace.
 */
export type ParsedInput = {
    kind: 'absolute';
    x: number;
    y: number;
} | {
    kind: 'relative';
    dx: number;
    dy: number;
} | {
    kind: 'polar';
    distance: number;
    angle: number;
}
/** `value` is the number as typed, `unit` the unit typed with it (`null` for the default). */
 | {
    kind: 'length';
    distance: number;
    value: number;
    unit: LengthUnit | null;
};
/**
 * Parse one line of numeric input; `null` when it is not a recognised form. Lengths without
 * a unit are in `defaultUnit` (default metres).
 */
export declare function parseInput(text: string, defaultUnit?: LengthUnit): ParsedInput | null;
