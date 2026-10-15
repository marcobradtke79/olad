import type Feature from 'ol/Feature';
import type { Coordinate } from 'ol/coordinate';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPolygon from 'ol/geom/MultiPolygon';
import MultiPoint from 'ol/geom/MultiPoint';
import Point from 'ol/geom/Point';
import type { FlatStyleLike } from 'ol/style/flat';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style, { type StyleFunction } from 'ol/style/Style';
import Text from 'ol/style/Text';
import type { ResolvedDimensionConfig } from '../config/types';
import { decimalSeparator, formatDimension } from '../dimensions/format';
import { dimensionValues } from '../dimensions/values';
import type { Locale } from '../i18n';
import { unitsPerMetre } from '../measure';
import { flatStyleFunction, MAX_TEXT_PIXELS, MIN_TEXT_PIXELS } from './text';

/** Paper sizes of the drawn parts in millimetres (ISO 129-1 proportions). */
export const DIMENSION_PAPER_MM = {
  /** Gap between the measured point and the start of the extension line. */
  extensionGap: 1,
  /** How far the extension line passes the dimension line. */
  extensionOverrun: 2,
  /** Length of a tick (oblique stroke). */
  tick: 3,
  /** Length of an arrow head. */
  arrowLength: 3,
  /** Width of an arrow head. */
  arrowWidth: 1,
  /** Radius of a dot. */
  dotRadius: 0.5,
  /** Gap between the dimension line and the bottom of the value. */
  textGap: 1,
};

/** Line width of dimensions in pixels. */
const LINE_WIDTH = 1;

const add = (a: Coordinate, b: Coordinate, f = 1): Coordinate => [
  a[0]! + b[0]! * f,
  a[1]! + b[1]! * f,
];

/**
 * The style function of a dimension layer. A dimension object (an `aligned` dimension: a line
 * with two definition points) is drawn with extension lines, the dimension line at `offset`
 * metres, terminators and its value in the preset's format; sizes are paper millimetres at the
 * reference scale, converted to the ground and then to pixels. Every other feature uses the
 * layer's flat style. Each part carries its own geometry, so clicks on it hit the feature.
 */
export function dimensionStyleFunction(
  config: ResolvedDimensionConfig,
  base: FlatStyleLike,
  getProjection: () => string,
  locale: Locale = 'en',
): StyleFunction {
  const baseStyle = flatStyleFunction(base);
  const decimal = decimalSeparator(locale);
  return (feature, resolution) => {
    const projection = getProjection();
    const values = dimensionValues(feature as Feature, config, projection);
    if (!values) return baseStyle(feature, resolution);
    if (!(resolution > 0)) return undefined;
    const [p1, p2] = values.points as [Coordinate, Coordinate];
    const dx = p2[0]! - p1[0]!;
    const dy = p2[1]! - p1[1]!;
    // The measured direction: p1 → p2 (aligned) or the rotation (rotated).
    const u = values.direction;
    const n: Coordinate = [-u[1]!, u[0]!]; // left of the direction
    /** Signed length of the dimension line along u (the projected distance). */
    const length = dx * u[0]! + dy * u[1]!;
    if (!(Math.abs(length) > 0)) return undefined;
    const mid: Coordinate = [(p1[0]! + p2[0]!) / 2, (p1[1]! + p2[1]!) / 2];
    const perMetre = unitsPerMetre(projection, mid);
    /** Paper millimetres → map units. */
    const paper = (mm: number) => (mm / 1000) * config.referenceScale * perMetre;
    const offset = (Number(feature.get('offset')) || 0) * perMetre;
    const d1 = add(p1, n, offset);
    const d2 = add(d1, u, length);
    const color = values.status === 'deviates' ? config.deviationColor : config.color;
    const stroke = new Stroke({ color, width: LINE_WIDTH });
    const fill = new Fill({ color });
    const styles: Style[] = [new Style({ geometry: new LineString([d1, d2]), stroke })];

    // Extension lines from each point to its foot on the dimension line, only where the line
    // stands off the point; a rotated dimension's two extension lines differ in length.
    const gap = paper(DIMENSION_PAPER_MM.extensionGap);
    const overrun = paper(DIMENSION_PAPER_MM.extensionOverrun);
    const extensions: Coordinate[][] = [];
    for (const [point, foot] of [
      [p1, d1],
      [p2, d2],
    ] as [Coordinate, Coordinate][]) {
      const across = (foot[0]! - point[0]!) * n[0]! + (foot[1]! - point[1]!) * n[1]!;
      if (Math.abs(across) <= gap) continue;
      const side = Math.sign(across);
      extensions.push([add(point, n, gap * side), add(foot, n, overrun * side)]);
    }
    if (extensions.length > 0) {
      styles.push(new Style({ geometry: new MultiLineString(extensions), stroke }));
    }

    // Terminators.
    if (config.terminator === 'tick') {
      const half = paper(DIMENSION_PAPER_MM.tick) / 2;
      const t: Coordinate = [(u[0]! + n[0]!) / Math.SQRT2, (u[1]! + n[1]!) / Math.SQRT2];
      styles.push(
        new Style({
          geometry: new MultiLineString([d1, d2].map((d) => [add(d, t, -half), add(d, t, half)])),
          stroke: new Stroke({ color, width: LINE_WIDTH * 1.5 }),
        }),
      );
    } else if (config.terminator === 'arrow') {
      const along = paper(DIMENSION_PAPER_MM.arrowLength);
      const across = paper(DIMENSION_PAPER_MM.arrowWidth) / 2;
      const head = (tip: Coordinate, inward: number) => {
        const back = add(tip, u, along * inward);
        return [[tip, add(back, n, across), add(back, n, -across), tip]];
      };
      styles.push(
        new Style({
          geometry: new MultiPolygon([head(d1, Math.sign(length)), head(d2, -Math.sign(length))]),
          fill,
        }),
      );
    } else if (config.terminator === 'dot') {
      const radius = paper(DIMENSION_PAPER_MM.dotRadius) / resolution;
      styles.push(
        new Style({
          geometry: new MultiPoint([d1, d2]),
          image: new CircleStyle({ radius: Math.max(radius, 1.5), fill }),
        }),
      );
    }

    // The value above the dimension line, turned to stay readable (never upside down).
    const pixels = paper(config.textSize) / resolution;
    if (pixels >= MIN_TEXT_PIXELS) {
      const flip = u[0]! < 0 || (u[0] === 0 && u[1]! < 0);
      const read: Coordinate = flip ? [-u[0]!, -u[1]!] : u;
      const up: Coordinate = [-read[1]!, read[0]!];
      const shift = (Number(feature.get('textPosition')) || 0) * perMetre;
      const centre = add(add(d1, u, length / 2 + shift), up, paper(DIMENSION_PAPER_MM.textGap));
      const label = formatDimension(values.value, config.preset, {
        decimal,
        computed: values.computed,
        showComputed: config.showComputed,
        text: (feature.get('text') as string | null | undefined) ?? null,
      });
      const size = Math.round(Math.min(pixels, MAX_TEXT_PIXELS) * 10) / 10;
      styles.push(
        new Style({
          geometry: new Point(centre),
          text: new Text({
            text: label,
            font: `${size}px ${config.font}`,
            fill,
            stroke: new Stroke({
              color: 'rgba(255, 255, 255, 0.85)',
              width: Math.min(Math.max(size / 8, 1), 4),
            }),
            rotation: -Math.atan2(read[1]!, read[0]!),
            rotateWithView: true,
            textAlign: 'center',
            textBaseline: 'bottom',
            overflow: true,
          }),
        }),
      );
    }
    return styles;
  };
}
