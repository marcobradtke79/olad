import type { FlatStyle, FlatStyleLike } from 'ol/style/flat';
import type { GeometryType } from '../config/types';

/** Line dash patterns a user can pick. */
export type StrokeDash = 'solid' | 'dashed' | 'dotted';

/**
 * A layer's look as a user edits it (`editor.layers.setStyle`): plain JSON, colours as
 * `#rrggbb`. Which sections apply depends on the geometry type (points, lines, polygons; all
 * for `Any`).
 */
export interface LayerStyle {
  stroke?: { color: string; width: number; dash: StrokeDash };
  fill?: { color: string; opacity: number };
  point?: { radius: number; fill: string; strokeColor: string; strokeWidth: number };
  /** An attribute shown next to each object; `null` for none. */
  label?: { field: string; size: number; color: string; halo: string } | null;
  /** Text layers: colour of the texts and of their halo. */
  text?: { color: string; halo: string };
  /** Layer opacity, 0 … 1. */
  opacity: number;
  /** Drawn from this zoom level on (exclusive, as OpenLayers `minZoom`); absent: always. */
  minZoom?: number;
  /** Drawn up to this zoom level (inclusive); absent: always. */
  maxZoom?: number;
}

/** Thrown for an invalid `LayerStyle`; `path` names the offending property. */
export class StyleError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'StyleError';
    this.path = path;
  }
}

const DASHES: Record<StrokeDash, number[] | undefined> = {
  solid: undefined,
  dashed: [8, 6],
  dotted: [2, 4],
};

/** Which sections a geometry type uses. */
export function styleSections(type: GeometryType): {
  point: boolean;
  stroke: boolean;
  fill: boolean;
} {
  const point = type === 'Point' || type === 'MultiPoint' || type === 'Any';
  const line = type === 'LineString' || type === 'MultiLineString';
  const polygon = type === 'Polygon' || type === 'MultiPolygon';
  return { point, stroke: line || polygon || type === 'Any', fill: polygon || type === 'Any' };
}

// ---- colours ----------------------------------------------------------------------------

const NAMED: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  orange: '#ffa500',
  gray: '#808080',
  grey: '#808080',
};

/** `#rrggbb` and alpha of a CSS-like colour (`#rgb`, `#rrggbb`, `rgb()`, `rgba()`, a few names, `[r,g,b,a]`); `null` if unknown. */
export function parseColor(value: unknown): { hex: string; alpha: number } | null {
  const hex2 = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  if (Array.isArray(value) && value.length >= 3 && value.every((v) => typeof v === 'number')) {
    const [r, g, b, a = 1] = value as number[];
    return { hex: `#${hex2(r!)}${hex2(g!)}${hex2(b!)}`, alpha: a };
  }
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  if (NAMED[text]) return { hex: NAMED[text]!, alpha: 1 };
  let m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(text);
  if (m) return { hex: `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`, alpha: 1 };
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(text);
  if (m) return { hex: `#${m[1]}`, alpha: m[2] ? parseInt(m[2], 16) / 255 : 1 };
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(text);
  if (m) {
    return {
      hex: `#${hex2(Number(m[1]))}${hex2(Number(m[2]))}${hex2(Number(m[3]))}`,
      alpha: m[4] === undefined ? 1 : Number(m[4]),
    };
  }
  return null;
}

/** `rgba(r, g, b, a)` from `#rrggbb` and an alpha. */
export function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${+alpha.toFixed(3)})`;
}

// ---- flat style <-> LayerStyle ------------------------------------------------------------

/**
 * The editable style read from a configured flat style: only a single flat style object whose
 * values are literals (no expressions, no rules, no arrays of styles). `null` otherwise, so the
 * caller starts from defaults and the user knows the configured style will be replaced.
 */
export function styleFromFlat(flat: FlatStyleLike, type: GeometryType): LayerStyle | null {
  if (Array.isArray(flat) || typeof flat !== 'object' || flat === null) return null;
  const f = flat as Record<string, unknown>;
  for (const [key, value] of Object.entries(f)) {
    // ['get', field] in text-value is the one expression we write ourselves.
    if (key === 'text-value') continue;
    if (Array.isArray(value) && typeof value[0] === 'string' && key !== 'stroke-line-dash')
      return null;
  }
  const sections = styleSections(type);
  const style: LayerStyle = { opacity: 1 };
  if (sections.stroke) {
    const color = parseColor(f['stroke-color']) ?? { hex: '#2563eb', alpha: 1 };
    const dash = f['stroke-line-dash'] as number[] | undefined;
    style.stroke = {
      color: color.hex,
      width: typeof f['stroke-width'] === 'number' ? f['stroke-width'] : 1.5,
      dash: !dash || dash.length === 0 ? 'solid' : (dash[0] ?? 0) <= 2 ? 'dotted' : 'dashed',
    };
  }
  if (sections.fill) {
    const fill = parseColor(f['fill-color']) ?? { hex: '#2563eb', alpha: 0 };
    style.fill = { color: fill.hex, opacity: fill.alpha };
  }
  if (sections.point) {
    style.point = {
      radius: typeof f['circle-radius'] === 'number' ? f['circle-radius'] : 5,
      fill: (parseColor(f['circle-fill-color']) ?? { hex: '#2563eb' }).hex,
      strokeColor: (parseColor(f['circle-stroke-color']) ?? { hex: '#ffffff' }).hex,
      strokeWidth: typeof f['circle-stroke-width'] === 'number' ? f['circle-stroke-width'] : 1.5,
    };
  }
  let value = f['text-value'];
  if (Array.isArray(value) && value[0] === 'to-string') value = value[1];
  if (Array.isArray(value) && value[0] === 'get' && typeof value[1] === 'string') {
    const size = /(\d+(?:\.\d+)?)px/.exec(String(f['text-font'] ?? ''));
    style.label = {
      field: value[1] as string,
      size: size ? Number(size[1]) : 12,
      color: (parseColor(f['text-fill-color']) ?? { hex: '#111827' }).hex,
      halo: (parseColor(f['text-stroke-color']) ?? { hex: '#ffffff' }).hex,
    };
  } else {
    style.label = null;
  }
  return style;
}

/** The flat style of an editable style for a layer of `type` (opacity and zoom are layer settings). */
export function flatFromStyle(style: LayerStyle, type: GeometryType): FlatStyle {
  const sections = styleSections(type);
  const flat: FlatStyle = {};
  if (sections.stroke && style.stroke) {
    flat['stroke-color'] = style.stroke.color;
    flat['stroke-width'] = style.stroke.width;
    const dash = DASHES[style.stroke.dash];
    if (dash) flat['stroke-line-dash'] = dash.map((d) => d * Math.max(1, style.stroke!.width / 2));
  }
  if (sections.fill && style.fill) flat['fill-color'] = rgba(style.fill.color, style.fill.opacity);
  if (sections.point && style.point) {
    flat['circle-radius'] = style.point.radius;
    flat['circle-fill-color'] = style.point.fill;
    flat['circle-stroke-color'] = style.point.strokeColor;
    flat['circle-stroke-width'] = style.point.strokeWidth;
  }
  if (style.label) {
    flat['text-value'] = ['to-string', ['get', style.label.field]] as never;
    flat['text-font'] = `${style.label.size}px sans-serif`;
    flat['text-fill-color'] = style.label.color;
    flat['text-stroke-color'] = style.label.halo;
    flat['text-stroke-width'] = 3;
    flat['text-overflow'] = true;
    if (sections.point && !sections.stroke) {
      flat['text-offset-y'] = -((style.point?.radius ?? 5) + style.label.size * 0.7);
    }
    if (!sections.point && sections.stroke && !sections.fill) flat['text-placement'] = 'line';
  }
  return flat;
}

/** Throws `StyleError` for a malformed style; returns a clean copy otherwise. */
export function validateStyle(style: unknown, path = 'style'): LayerStyle {
  const fail = (p: string, m: string): never => {
    throw new StyleError(p, m);
  };
  if (!style || typeof style !== 'object') fail(path, 'expected an object');
  const s = style as Record<string, unknown>;
  const color = (v: unknown, p: string) => {
    if (typeof v !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(v)) fail(p, 'expected a colour #rrggbb');
    return (v as string).toLowerCase();
  };
  const num = (v: unknown, p: string, min: number, max: number) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
      fail(p, `expected a number from ${min} to ${max}`);
    }
    return v as number;
  };
  const obj = (v: unknown, p: string) => {
    if (!v || typeof v !== 'object') fail(p, 'expected an object');
    return v as Record<string, unknown>;
  };
  const out: LayerStyle = { opacity: num(s.opacity ?? 1, `${path}.opacity`, 0, 1) };
  if (s.stroke !== undefined) {
    const o = obj(s.stroke, `${path}.stroke`);
    const dash = o.dash ?? 'solid';
    if (dash !== 'solid' && dash !== 'dashed' && dash !== 'dotted') {
      fail(`${path}.stroke.dash`, 'expected solid, dashed or dotted');
    }
    out.stroke = {
      color: color(o.color, `${path}.stroke.color`),
      width: num(o.width, `${path}.stroke.width`, 0, 50),
      dash: dash as StrokeDash,
    };
  }
  if (s.fill !== undefined) {
    const o = obj(s.fill, `${path}.fill`);
    out.fill = {
      color: color(o.color, `${path}.fill.color`),
      opacity: num(o.opacity, `${path}.fill.opacity`, 0, 1),
    };
  }
  if (s.point !== undefined) {
    const o = obj(s.point, `${path}.point`);
    out.point = {
      radius: num(o.radius, `${path}.point.radius`, 0, 100),
      fill: color(o.fill, `${path}.point.fill`),
      strokeColor: color(o.strokeColor, `${path}.point.strokeColor`),
      strokeWidth: num(o.strokeWidth, `${path}.point.strokeWidth`, 0, 50),
    };
  }
  if (s.label === null || s.label === undefined) {
    out.label = null;
  } else {
    const o = obj(s.label, `${path}.label`);
    if (typeof o.field !== 'string' || o.field.trim() === '')
      fail(`${path}.label.field`, 'expected an attribute name');
    out.label = {
      field: (o.field as string).trim(),
      size: num(o.size, `${path}.label.size`, 4, 96),
      color: color(o.color, `${path}.label.color`),
      halo: color(o.halo, `${path}.label.halo`),
    };
  }
  if (s.text !== undefined) {
    const o = obj(s.text, `${path}.text`);
    out.text = {
      color: color(o.color, `${path}.text.color`),
      halo: color(o.halo, `${path}.text.halo`),
    };
  }
  for (const key of ['minZoom', 'maxZoom'] as const) {
    if (s[key] !== undefined && s[key] !== null) out[key] = num(s[key], `${path}.${key}`, 0, 30);
  }
  if (out.minZoom !== undefined && out.maxZoom !== undefined && out.minZoom >= out.maxZoom) {
    fail(`${path}.maxZoom`, 'must be greater than minZoom');
  }
  return out;
}
