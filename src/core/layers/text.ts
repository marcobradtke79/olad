import type { FeatureLike } from 'ol/Feature';
import Point from 'ol/geom/Point';
import MultiPoint from 'ol/geom/MultiPoint';
import { flatStylesToStyleFunction, rulesToStyleFunction } from 'ol/render/canvas/style';
import type { FlatStyle, FlatStyleLike, Rule } from 'ol/style/flat';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style, { type StyleFunction } from 'ol/style/Style';
import Text from 'ol/style/Text';
import type { ResolvedTextConfig } from '../config/types';
import { unitsPerMetre } from '../measure';

/** Texts smaller than this many pixels are not drawn; larger ones are capped. */
export const MIN_TEXT_PIXELS = 1;
export const MAX_TEXT_PIXELS = 2000;

/** A flat style (one, several, or rules) as a style function. */
export function flatStyleFunction(style: FlatStyleLike): StyleFunction {
  if (Array.isArray(style)) {
    const isRules = style.length > 0 && 'style' in (style[0] as object);
    return isRules
      ? rulesToStyleFunction(style as Rule[])
      : flatStylesToStyleFunction(style as FlatStyle[]);
  }
  return flatStylesToStyleFunction([style as FlatStyle]);
}

/** The text of a feature drawn as text: a non-empty text property on a point geometry. */
export function featureText(feature: FeatureLike, text: ResolvedTextConfig): string | null {
  const value = feature.get(text.property) as unknown;
  if (value === undefined || value === null || value === '') return null;
  const geometry = feature.getGeometry();
  if (!(geometry instanceof Point || geometry instanceof MultiPoint)) return null;
  return String(value);
}

/**
 * The style of one text: `value` at `pixels` font size, rotated by `rotation` degrees
 * counter-clockwise (the straightedge convention), left-aligned on its baseline at the point.
 */
export function textStyle(
  value: string,
  pixels: number,
  rotation: number,
  text: Pick<ResolvedTextConfig, 'color' | 'haloColor' | 'font'>,
): Style {
  return new Style({
    text: new Text({
      text: value,
      font: `${pixels}px ${text.font}`,
      fill: new Fill({ color: text.color }),
      stroke: new Stroke({ color: text.haloColor, width: Math.max(1, Math.min(4, pixels / 8)) }),
      rotation: (-rotation * Math.PI) / 180,
      rotateWithView: true,
      textAlign: 'left',
      textBaseline: 'alphabetic',
      overflow: true,
    }),
  });
}

/**
 * The style function of a text layer: a point feature with a text is drawn as that text,
 * `heightProperty` metres high on the ground (converted to pixels at the point in the current
 * view projection) and rotated by `rotationProperty`; every other feature uses the layer's
 * flat style.
 */
export function textStyleFunction(
  text: ResolvedTextConfig,
  base: FlatStyleLike,
  getProjection: () => string,
): StyleFunction {
  const baseStyle = flatStyleFunction(base);
  const cache = new Map<string, Style>();
  return (feature, resolution) => {
    const value = featureText(feature, text);
    if (value === null) return baseStyle(feature, resolution);
    const height = Number(feature.get(text.heightProperty) ?? text.height);
    const rotation = Number(feature.get(text.rotationProperty) ?? 0) || 0;
    const geometry = feature.getGeometry() as Point | MultiPoint;
    const at = geometry instanceof Point ? geometry.getCoordinates() : geometry.getCoordinates()[0];
    if (!at || !(height > 0) || !(resolution > 0)) return undefined;
    const pixels = (height * unitsPerMetre(getProjection(), at)) / resolution;
    if (pixels < MIN_TEXT_PIXELS) return undefined;
    const size = Math.round(Math.min(pixels, MAX_TEXT_PIXELS) * 10) / 10;
    const key = `${size}|${rotation}|${value}`;
    let style = cache.get(key);
    if (!style) {
      if (cache.size > 1000) cache.clear();
      style = textStyle(value, size, rotation, text);
      cache.set(key, style);
    }
    return style;
  };
}
