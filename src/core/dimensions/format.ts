import type { DimensionPreset } from '../config/types';
import type { Locale } from '../i18n';

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** Decimal separator of a locale: German plans write a comma. */
export function decimalSeparator(locale: Locale): ',' | '.' {
  return locale === 'de' ? ',' : '.';
}

/**
 * The number of a dimension in a preset's format, without brackets.
 *
 * - `architecture` (DIN 1356-1): below 1 m in centimetres, from 1 m in metres with two
 *   decimals; the millimetre digit follows as a superscript when it is not 0
 *   (0.365 → `36⁵`, 2.015 → `2,01⁵`, 2.01 → `2,01`). Rounded to millimetres.
 * - `surveying`, `landscape`: metres with two decimals (12.471 → `12,47`).
 */
export function formatDimensionNumber(
  metres: number,
  preset: DimensionPreset,
  decimal: ',' | '.' = ',',
): string {
  const value = Math.abs(metres);
  if (preset !== 'architecture') return value.toFixed(2).replace('.', decimal);
  const mm = Math.round(value * 1000);
  const cm = Math.floor(mm / 10);
  const rest = mm % 10;
  const sup = rest === 0 ? '' : SUPERSCRIPT[rest]!;
  if (mm < 1000) return `${cm}${sup}`;
  return `${Math.floor(cm / 100)}${decimal}${String(cm % 100).padStart(2, '0')}${sup}`;
}

export interface DimensionFormatOptions {
  /** Decimal separator. Default `','`. */
  decimal?: ',' | '.';
  /** Whether the value is computed (no field value). */
  computed?: boolean;
  /** `'brackets'` writes computed values in brackets. Default `'brackets'`. */
  showComputed?: 'brackets' | 'plain';
  /** Free text replacing the value; `{value}` inserts the formatted value. */
  text?: string | null;
  /** Format the value (degrees) as an angle in this unit instead of a length. */
  angle?: 'deg' | 'gon';
  /** Symbol written before the number: `R`, `Ø`, `⌒` for radial dimensions. */
  prefix?: string;
  /** Format as a height with its sign (`+112,45`) or as a slope in percent (`2,5 %`). */
  kind?: 'level' | 'slope';
}

/** A height in metres with its sign and centimetres: `+112,45`, `−0,15`, `±0,00`. */
export function formatLevel(metres: number, decimal: ',' | '.' = ','): string {
  const rounded = Math.round(metres * 100) / 100;
  const number = Math.abs(rounded).toFixed(2).replace('.', decimal);
  return rounded === 0 ? `±${number}` : `${rounded > 0 ? '+' : '−'}${number}`;
}

/** A slope in percent with one decimal: `2,5 %`. */
export function formatSlope(percent: number, decimal: ',' | '.' = ','): string {
  return `${percent.toFixed(1).replace('.', decimal)} %`;
}

/**
 * An angle given in degrees, written in `unit`: degrees with one decimal (`87,5°`) or gon with
 * four decimals (`97,2222 gon`), as surveyors write them.
 */
export function formatDimensionAngle(
  degrees: number,
  unit: 'deg' | 'gon',
  decimal: ',' | '.' = ',',
): string {
  return unit === 'gon'
    ? `${((degrees * 400) / 360).toFixed(4).replace('.', decimal)} gon`
    : `${degrees.toFixed(1).replace('.', decimal)}°`;
}

/**
 * The label of a dimension: formatted number (metres, or degrees with `angle`), brackets for
 * computed values, a radial prefix, free text.
 */
export function formatDimension(
  metres: number,
  preset: DimensionPreset,
  options: DimensionFormatOptions = {},
): string {
  const decimal = options.decimal ?? ',';
  let value =
    options.kind === 'level'
      ? formatLevel(metres, decimal)
      : options.kind === 'slope'
        ? formatSlope(metres, decimal)
        : options.angle
          ? formatDimensionAngle(metres, options.angle, decimal)
          : formatDimensionNumber(metres, preset, decimal);
  if (options.computed && (options.showComputed ?? 'brackets') === 'brackets') value = `(${value})`;
  if (options.prefix) value = `${options.prefix} ${value}`;
  if (options.text) return options.text.split('{value}').join(value);
  return value;
}
