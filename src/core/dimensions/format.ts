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
}

/** The label of a dimension: formatted number, brackets for computed values, free text. */
export function formatDimension(
  metres: number,
  preset: DimensionPreset,
  options: DimensionFormatOptions = {},
): string {
  let value = formatDimensionNumber(metres, preset, options.decimal ?? ',');
  if (options.computed && (options.showComputed ?? 'brackets') === 'brackets') value = `(${value})`;
  if (options.text) return options.text.split('{value}').join(value);
  return value;
}
