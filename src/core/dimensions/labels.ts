import type Feature from 'ol/Feature';
import type { Coordinate } from 'ol/coordinate';
import type { ProjectionLike } from 'ol/proj';
import type { ResolvedDimensionConfig } from '../config/types';
import { unitsPerMetre } from '../measure';
import { formatDimension, formatDimensionNumber, type DimensionFormatOptions } from './format';
import { sweepAngle, type DimensionValues } from './values';

/**
 * Paper gap between the dimension line and the bottom of the value, in millimetres (ISO 129-1).
 * Lives here, not in the renderer, because the label anchors depend on it.
 */
export const TEXT_GAP_MM = 1;
/** Paper length of an arrow head in millimetres; a radius leader is at least four of them. */
const ARROW_LENGTH_MM = 3;

/** Where a dimension writes a value and how: the anchor of one text as the style draws it. */
export interface DimensionLabelAnchor {
  /** The value, a station's offset (`second`), or the zero of a running or station line. */
  kind: 'value' | 'second' | 'zero';
  /** Anchor point in the view projection (the text style's point). */
  at: Coordinate;
  /**
   * Unit vector of the reading direction in map units, already turned so the text never stands
   * upside down (the text is rotated by `-atan2(direction)` on screen).
   */
  direction: Coordinate;
  /** The text keeps its screen orientation (levels): `direction` is `[1, 0]` on screen. */
  screen: boolean;
  align: 'left' | 'center' | 'right';
  baseline: 'top' | 'bottom';
}

/** A label with its text as drawn and whether that text is a computed (GIS) value. */
export interface DimensionLabel extends DimensionLabelAnchor {
  /** The text as drawn, with the ⚠ prefix of a stale dimension. */
  text: string;
  /** The text is a value computed from the map (no field value); zeros count as fixed. */
  computed: boolean;
}

const add = (a: Coordinate, b: Coordinate, f = 1): Coordinate => [
  a[0]! + b[0]! * f,
  a[1]! + b[1]! * f,
];
const unit = (angle: number): Coordinate => [Math.cos(angle), Math.sin(angle)];

/** Whether text written along `direction` would stand upside down (reads right to left). */
function flips(direction: Coordinate): boolean {
  return direction[0]! < 0 || (direction[0] === 0 && direction[1]! < 0);
}

/** An anchor read along `direction`, turned upright; a left / right alignment turns with it. */
function anchor(
  kind: DimensionLabelAnchor['kind'],
  at: Coordinate,
  direction: Coordinate,
  options: {
    align?: 'left' | 'center' | 'right';
    baseline?: 'top' | 'bottom';
    screen?: boolean;
  } = {},
): DimensionLabelAnchor {
  const flip = !options.screen && flips(direction);
  let align = options.align ?? 'center';
  if (flip && align !== 'center') align = align === 'left' ? 'right' : 'left';
  return {
    kind,
    at,
    direction: flip ? [-direction[0]!, -direction[1]!] : [direction[0]!, direction[1]!],
    screen: options.screen ?? false,
    align,
    baseline: options.baseline ?? 'bottom',
  };
}

/**
 * The anchors of a dimension's texts: where each is written and along which direction, from
 * the geometry alone (paper millimetres at `referenceScale`, like the renderer). In the order
 * the style draws them: a station's zero, offset and station value; a running dimension's
 * value and zero; otherwise the value only. Empty when nothing is drawn.
 */
export function dimensionLabelAnchors(
  feature: Feature,
  values: DimensionValues,
  projection: ProjectionLike,
  referenceScale: number,
): DimensionLabelAnchor[] {
  const [first, second, third] = values.points as [Coordinate, Coordinate, Coordinate | undefined];
  const offsetMetres = Number(feature.get('offset')) || 0;

  if (values.type === 'station' || values.type === 'level' || values.type === 'slope') {
    const perMetre = unitsPerMetre(projection, first);
    const gap = (TEXT_GAP_MM / 1000) * referenceScale * perMetre;
    if (values.type === 'level')
      return [anchor('value', second, [1, 0], { align: 'left', screen: true })];
    if (values.type === 'slope') {
      const length = Math.hypot(second[0]! - first[0]!, second[1]! - first[1]!);
      if (!(length > 0)) return [];
      const u: Coordinate = [(second[0]! - first[0]!) / length, (second[1]! - first[1]!) / length];
      const n: Coordinate = [-u[1]!, u[0]!];
      return [anchor('value', add(add(first, u, length / 2), n, gap), u)];
    }
    const [a, b, p] = [first, second, third!];
    const length = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
    if (!(length > 0)) return [];
    const u: Coordinate = [(b[0]! - a[0]!) / length, (b[1]! - a[1]!) / length];
    const n: Coordinate = [-u[1]!, u[0]!];
    const t = (p[0]! - a[0]!) * u[0]! + (p[1]! - a[1]!) * u[1]!;
    const foot = add(a, u, t);
    const across = (p[0]! - a[0]!) * n[0]! + (p[1]! - a[1]!) * n[1]!;
    // Station values stand on the side away from the point (on the line's left when on it);
    // the line's zero always on its right, so the stations of one line draw it once.
    const outward: Coordinate = across > 0 ? [-n[0]!, -n[1]!] : n;
    const right: Coordinate = [-n[0]!, -n[1]!];
    const anchors = [anchor('zero', add(a, right, gap), right, { align: 'left' })];
    if (Math.abs(across) > gap) {
      const side = Math.sign(across);
      const towards: Coordinate = [n[0]! * side, n[1]! * side];
      anchors.push(anchor('second', add(foot, towards, Math.abs(across) / 2), towards));
    }
    anchors.push(anchor('value', add(foot, outward, gap), outward, { align: 'left' }));
    return anchors;
  }

  if (
    values.type === 'angular' ||
    values.type === 'radius' ||
    values.type === 'diameter' ||
    values.type === 'arc'
  ) {
    // The centre of the circle, or the vertex of an angle.
    const centre = values.type === 'angular' ? second : first;
    const perMetre = unitsPerMetre(projection, centre);
    const paper = (mm: number) => (mm / 1000) * referenceScale * perMetre;
    const offset = offsetMetres * perMetre;
    if (values.type === 'angular' || values.type === 'arc') {
      const from = values.type === 'angular' ? first : second;
      const a1 = Math.atan2(from[1]! - centre[1]!, from[0]! - centre[0]!);
      const middle = a1 + sweepAngle(centre, from, third!) / 2;
      const radius =
        values.type === 'angular'
          ? offset
          : Math.hypot(from[0]! - centre[0]!, from[1]! - centre[1]!) + offset;
      const at = add(centre, unit(middle), radius + paper(TEXT_GAP_MM));
      // Along the tangent; the centre is on its left, so the text stands on the right (below).
      const along: Coordinate = [-Math.sin(middle), Math.cos(middle)];
      return [anchor('value', at, along, { baseline: flips(along) ? 'bottom' : 'top' })];
    }
    const r = Math.hypot(second[0]! - centre[0]!, second[1]! - centre[1]!);
    if (!(r > 0)) return [];
    const u: Coordinate = [(second[0]! - centre[0]!) / r, (second[1]! - centre[1]!) / r];
    const leader = Math.max(offset, paper(ARROW_LENGTH_MM * 4));
    const on = values.type === 'radius' ? add(second, u, leader / 2) : add(centre, u, r / 2);
    const at = add(on, [-u[1]!, u[0]!], paper(TEXT_GAP_MM));
    return [anchor('value', at, u, { baseline: flips(u) ? 'top' : 'bottom' })];
  }

  // Linear: aligned, rotated, running, tie.
  const u = values.direction;
  const n: Coordinate = [-u[1]!, u[0]!];
  const length = (second[0]! - first[0]!) * u[0]! + (second[1]! - first[1]!) * u[1]!;
  if (!(Math.abs(length) > 0)) return [];
  const mid: Coordinate = [(first[0]! + second[0]!) / 2, (first[1]! + second[1]!) / 2];
  const perMetre = unitsPerMetre(projection, mid);
  const gapUp = (TEXT_GAP_MM / 1000) * referenceScale * perMetre;
  const offset = values.type === 'tie' ? 0 : offsetMetres * perMetre;
  const d1 = add(first, n, offset);
  const d2 = add(d1, u, length);
  const read: Coordinate = flips(u) ? [-u[0]!, -u[1]!] : u;
  const up: Coordinate = [-read[1]!, read[0]!];
  if (values.type === 'running') {
    // The value along the extension line, outward from the dimension line at the point's foot
    // (DIN 406), so the values of close points stand side by side; "0" at the origin.
    const outward: Coordinate = offset < 0 ? [-n[0]!, -n[1]!] : n;
    return [
      anchor('value', add(d2, outward, gapUp), outward, { align: 'left' }),
      anchor('zero', add(d1, up, gapUp), read),
    ];
  }
  const shift = (Number(feature.get('textPosition')) || 0) * perMetre;
  return [anchor('value', add(add(d1, u, length / 2 + shift), up, gapUp), read)];
}

const PREFIX: Record<string, string> = { radius: 'R', diameter: 'Ø', arc: '⌒' };

/**
 * The text colour of a label: `computedColor` for a value computed from the map, `deviationColor`
 * for a field value that deviates, else `color` (field values and zeros).
 */
export function labelColor(
  label: Pick<DimensionLabel, 'kind' | 'computed'>,
  status: DimensionValues['status'],
  config: Pick<ResolvedDimensionConfig, 'color' | 'computedColor' | 'deviationColor'>,
): string {
  if (label.kind === 'zero') return config.color;
  if (label.computed) return config.computedColor;
  return status === 'deviates' ? config.deviationColor : config.color;
}

/**
 * The labels of a dimension as the style draws them: anchors plus the formatted texts (the
 * preset's number format, brackets when `showComputed` asks, the angle unit, radial prefixes,
 * free text, ⚠ on a stale dimension) and whether each text is a computed value.
 */
export function dimensionLabels(
  feature: Feature,
  values: DimensionValues,
  config: ResolvedDimensionConfig,
  projection: ProjectionLike,
  decimal: ',' | '.' = ',',
): DimensionLabel[] {
  const anchors = dimensionLabelAnchors(feature, values, projection, config.referenceScale);
  const stale = values.status === 'stale';
  const survey = values.type === 'station' || values.type === 'level' || values.type === 'slope';
  const text = (feature.get('text') as string | null | undefined) ?? null;
  const format = (value: number, computed: boolean, extra: Partial<DimensionFormatOptions> = {}) =>
    formatDimension(value, config.preset, {
      decimal,
      computed,
      showComputed: config.showComputed,
      ...extra,
    });
  return anchors.map((at) => {
    let label: string;
    let computed = false;
    if (at.kind === 'zero') {
      label = values.type === 'running' ? '0' : formatDimensionNumber(0, config.preset, decimal);
    } else if (at.kind === 'second') {
      computed = values.second!.computed;
      label = format(Math.abs(values.second!.value), computed, { text: null });
    } else {
      computed = values.type === 'level' ? false : values.computed;
      label = format(values.value, computed, {
        text,
        ...(values.type === 'level' ? { kind: 'level' as const } : {}),
        ...(values.type === 'slope' ? { kind: 'slope' as const } : {}),
        ...(values.unit === 'deg' ? { angle: config.angleUnit } : {}),
        ...(PREFIX[values.type] ? { prefix: PREFIX[values.type] } : {}),
      });
    }
    // Survey dimensions mark every text as stale, the others the value only.
    const marked = stale && (survey || at.kind === 'value') ? `⚠ ${label}` : label;
    return { ...at, text: marked, computed };
  });
}
