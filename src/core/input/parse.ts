import { toMetres, unitFromText, unitSpellings, type LengthUnit } from '../units';

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
export type ParsedInput =
  | { kind: 'absolute'; x: number; y: number }
  | { kind: 'relative'; dx: number; dy: number }
  | { kind: 'polar'; distance: number; angle: number }
  /** `value` is the number as typed, `unit` the unit typed with it (`null` for the default). */
  | { kind: 'length'; distance: number; value: number; unit: LengthUnit | null };

const NUMBER = String.raw`[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?`;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A unit word: any accepted spelling, not followed by a letter (so `5 ft 4` is a pair). */
const UNIT = `(?:${unitSpellings().map(escape).join('|')})(?![A-Za-z])`;
const LENGTH = String.raw`(${NUMBER})\s*(${UNIT})?`;
const PAIR = new RegExp(String.raw`^${LENGTH}\s*(?:[,;]|\s)\s*${LENGTH}$`, 'i');
const POLAR = new RegExp(String.raw`^${LENGTH}\s*<\s*(${NUMBER})$`, 'i');
const SINGLE = new RegExp(`^${LENGTH}$`, 'i');

/**
 * Parse one line of numeric input; `null` when it is not a recognised form. Lengths without
 * a unit are in `defaultUnit` (default metres).
 */
export function parseInput(text: string, defaultUnit: LengthUnit = 'm'): ParsedInput | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const relative = trimmed.startsWith('@');
  const body = (relative ? trimmed.slice(1) : trimmed).trim();
  const unitOf = (word: string | undefined): LengthUnit | null =>
    word === undefined ? null : unitFromText(word);
  const metres = (value: string, word: string | undefined) =>
    toMetres(Number(value), unitOf(word) ?? defaultUnit);
  const polar = POLAR.exec(body);
  if (polar) {
    if (!relative) return null;
    return { kind: 'polar', distance: metres(polar[1]!, polar[2]), angle: Number(polar[3]) };
  }
  const pair = PAIR.exec(body);
  if (pair) {
    if (relative) {
      return { kind: 'relative', dx: metres(pair[1]!, pair[2]), dy: metres(pair[3]!, pair[4]) };
    }
    // Absolute coordinates are in map units; a unit there is a mistake.
    if (pair[2] !== undefined || pair[4] !== undefined) return null;
    return { kind: 'absolute', x: Number(pair[1]), y: Number(pair[3]) };
  }
  const single = SINGLE.exec(body);
  if (single) {
    if (relative) return null;
    const unit = unitOf(single[2]);
    return {
      kind: 'length',
      distance: metres(single[1]!, single[2]),
      value: Number(single[1]),
      unit,
    };
  }
  return null;
}
