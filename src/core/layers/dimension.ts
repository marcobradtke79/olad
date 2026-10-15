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
import { dimensionValues, sweepAngle, type DimensionValues } from '../dimensions/values';
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
  /** Distance between the stacked lines of a baseline dimension set. */
  baselineSpacing: 8,
  /** Radius of the origin circle of running dimensions. */
  originRadius: 1,
};

/** Line width of dimensions in pixels. */
const LINE_WIDTH = 1;

const add = (a: Coordinate, b: Coordinate, f = 1): Coordinate => [
  a[0]! + b[0]! * f,
  a[1]! + b[1]! * f,
];

const ROUND_TYPES: readonly string[] = ['radius', 'diameter', 'arc'];
const PREFIX: Record<string, string> = { radius: 'R', diameter: 'Ø', arc: '⌒' };

const unit = (angle: number): Coordinate => [Math.cos(angle), Math.sin(angle)];

/** Points of a circular arc around `centre` from angle `from` sweeping `sweep` (radians, ccw). */
function arcPoints(centre: Coordinate, radius: number, from: number, sweep: number): Coordinate[] {
  const count = Math.max(8, Math.ceil((Math.abs(sweep) / (2 * Math.PI)) * 96));
  return Array.from({ length: count + 1 }, (_, i) =>
    add(centre, unit(from + (sweep * i) / count), radius),
  );
}

/**
 * Angular, radius, diameter and arc dimensions: the dimension arc or leader, extension lines,
 * terminators oriented along the arc or leader, a centre cross for radii, and the value with
 * its prefix (`R`, `Ø`, `⌒`) or in the layer's angle unit.
 */
function roundStyles(
  values: DimensionValues,
  feature: Feature,
  config: ResolvedDimensionConfig,
  projection: string,
  resolution: number,
  decimal: ',' | '.',
): Style[] {
  const [first, second, third] = values.points as [Coordinate, Coordinate, Coordinate | undefined];
  // The centre of the circle, or the vertex of an angle.
  const centre = values.type === 'angular' ? second : first;
  const perMetre = unitsPerMetre(projection, centre);
  const paper = (mm: number) => (mm / 1000) * config.referenceScale * perMetre;
  const offset = (Number(feature.get('offset')) || 0) * perMetre;
  const color = values.status === 'deviates' ? config.deviationColor : config.color;
  const stale = values.status === 'stale';
  const stroke = new Stroke({ color, width: LINE_WIDTH, ...(stale ? { lineDash: [8, 4] } : {}) });
  const fill = new Fill({ color });
  const styles: Style[] = [];
  const gap = paper(DIMENSION_PAPER_MM.extensionGap);
  const overrun = paper(DIMENSION_PAPER_MM.extensionOverrun);

  /** A terminator at `at`, `inward` pointing from it along the dimension line. */
  const terminator = (at: Coordinate, inward: Coordinate, kind = config.terminator) => {
    const n: Coordinate = [-inward[1]!, inward[0]!];
    if (kind === 'tick') {
      const half = paper(DIMENSION_PAPER_MM.tick) / 2;
      const t: Coordinate = [(inward[0]! + n[0]!) / Math.SQRT2, (inward[1]! + n[1]!) / Math.SQRT2];
      styles.push(
        new Style({
          geometry: new LineString([add(at, t, -half), add(at, t, half)]),
          stroke: new Stroke({ color, width: LINE_WIDTH * 1.5 }),
        }),
      );
    } else if (kind === 'arrow') {
      const back = add(at, inward, paper(DIMENSION_PAPER_MM.arrowLength));
      const across = paper(DIMENSION_PAPER_MM.arrowWidth) / 2;
      styles.push(
        new Style({
          geometry: new MultiPolygon([[[at, add(back, n, across), add(back, n, -across), at]]]),
          fill,
        }),
      );
    } else if (kind === 'dot') {
      styles.push(
        new Style({
          geometry: new Point(at),
          image: new CircleStyle({
            radius: Math.max(paper(DIMENSION_PAPER_MM.dotRadius) / resolution, 1.5),
            fill,
          }),
        }),
      );
    }
  };

  // Where the value goes: a point, the direction it is written along, and whether it sits on
  // the left of that direction (above) or on its right (below).
  let anchor: Coordinate;
  let along: Coordinate;
  let outwardIsLeft = true;
  if (values.type === 'angular' || values.type === 'arc') {
    const from = values.type === 'angular' ? first : second;
    const to = values.type === 'angular' ? third! : third!;
    const a1 = Math.atan2(from[1]! - centre[1]!, from[0]! - centre[0]!);
    const sweep = sweepAngle(centre, from, to);
    const a2 = a1 + sweep;
    const radius =
      values.type === 'angular'
        ? offset
        : Math.hypot(from[0]! - centre[0]!, from[1]! - centre[1]!) + offset;
    styles.push(
      new Style({ geometry: new LineString(arcPoints(centre, radius, a1, sweep)), stroke }),
    );
    // Extension lines along the rays where the measured point lies inside the dimension arc.
    const extensions: Coordinate[][] = [];
    for (const [point, angle] of [
      [from, a1],
      [to, a2],
    ] as [Coordinate, number][]) {
      const distance = Math.hypot(point[0]! - centre[0]!, point[1]! - centre[1]!);
      const ray = unit(angle);
      if (distance < radius - gap) {
        extensions.push([add(centre, ray, distance + gap), add(centre, ray, radius + overrun)]);
      }
    }
    if (extensions.length)
      styles.push(new Style({ geometry: new MultiLineString(extensions), stroke }));
    // Terminators point along the arc, into it.
    terminator(add(centre, unit(a1), radius), [-Math.sin(a1), Math.cos(a1)]);
    terminator(add(centre, unit(a2), radius), [Math.sin(a2), -Math.cos(a2)]);
    const middle = a1 + sweep / 2;
    anchor = add(centre, unit(middle), radius + paper(DIMENSION_PAPER_MM.textGap));
    along = [-Math.sin(middle), Math.cos(middle)]; // tangent; its left side is the centre
    outwardIsLeft = false;
  } else {
    const r = Math.hypot(second[0]! - centre[0]!, second[1]! - centre[1]!);
    const u: Coordinate = [(second[0]! - centre[0]!) / r, (second[1]! - centre[1]!) / r];
    const leader = Math.max(offset, paper(DIMENSION_PAPER_MM.arrowLength * 4));
    if (values.type === 'radius') {
      const end = add(second, u, leader);
      styles.push(new Style({ geometry: new LineString([centre, end]), stroke }));
      terminator(second, [-u[0]!, -u[1]!], config.terminator === 'none' ? 'none' : 'arrow');
      const cross = paper(1.5);
      styles.push(
        new Style({
          geometry: new MultiLineString([
            [add(centre, [1, 0], -cross), add(centre, [1, 0], cross)],
            [add(centre, [0, 1], -cross), add(centre, [0, 1], cross)],
          ]),
          stroke,
        }),
      );
      anchor = add(second, u, leader / 2);
    } else {
      const opposite = add(centre, u, -r);
      styles.push(new Style({ geometry: new LineString([opposite, second]), stroke }));
      const kind = config.terminator === 'none' ? 'none' : 'arrow';
      terminator(second, [-u[0]!, -u[1]!], kind);
      terminator(opposite, u, kind);
      anchor = add(centre, u, r / 2);
    }
    anchor = add(anchor, [-u[1]!, u[0]!], paper(DIMENSION_PAPER_MM.textGap));
    along = u;
  }

  const pixels = paper(config.textSize) / resolution;
  if (pixels >= MIN_TEXT_PIXELS) {
    const flip = along[0]! < 0 || (along[0] === 0 && along[1]! < 0);
    const read: Coordinate = flip ? [-along[0]!, -along[1]!] : along;
    // `bottom` puts the text on the left of the reading direction.
    const left = flip ? !outwardIsLeft : outwardIsLeft;
    const formatted = formatDimension(values.value, config.preset, {
      decimal,
      computed: values.computed,
      showComputed: config.showComputed,
      text: (feature.get('text') as string | null | undefined) ?? null,
      ...(values.unit === 'deg' ? { angle: config.angleUnit } : {}),
      ...(PREFIX[values.type] ? { prefix: PREFIX[values.type] } : {}),
    });
    const size = Math.round(Math.min(pixels, MAX_TEXT_PIXELS) * 10) / 10;
    styles.push(
      new Style({
        geometry: new Point(anchor),
        text: new Text({
          text: stale ? `⚠ ${formatted}` : formatted,
          font: `${size}px ${config.font}`,
          fill,
          stroke: new Stroke({
            color: 'rgba(255, 255, 255, 0.85)',
            width: Math.min(Math.max(size / 8, 1), 4),
          }),
          rotation: -Math.atan2(read[1]!, read[0]!),
          rotateWithView: true,
          textAlign: 'center',
          textBaseline: left ? 'bottom' : 'top',
          overflow: true,
        }),
      }),
    );
  }
  return styles;
}

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
  /** Whether a measured object changed since the dimension was drawn (drawn dashed, marked ⚠). */
  isStale: (feature: Feature) => boolean = () => false,
): StyleFunction {
  const baseStyle = flatStyleFunction(base);
  const decimal = decimalSeparator(locale);
  return (feature, resolution) => {
    const projection = getProjection();
    const values = dimensionValues(
      feature as Feature,
      config,
      projection,
      isStale(feature as Feature),
    );
    if (!values) return baseStyle(feature, resolution);
    if (!(resolution > 0)) return undefined;
    if (values.type === 'angular' || ROUND_TYPES.includes(values.type)) {
      return roundStyles(values, feature as Feature, config, projection, resolution, decimal);
    }
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
    // A tie distance is drawn between its points; a running dimension's first point is the
    // origin of the common line.
    const tie = values.type === 'tie';
    const running = values.type === 'running';
    const offset = tie ? 0 : (Number(feature.get('offset')) || 0) * perMetre;
    const d1 = add(p1, n, offset);
    const d2 = add(d1, u, length);
    const color = values.status === 'deviates' ? config.deviationColor : config.color;
    const stale = values.status === 'stale';
    const stroke = new Stroke({ color, width: LINE_WIDTH, ...(stale ? { lineDash: [8, 4] } : {}) });
    const fill = new Fill({ color });
    const styles: Style[] = [
      new Style({
        geometry: new LineString([d1, d2]),
        stroke: tie && !stale ? new Stroke({ color, width: LINE_WIDTH, lineDash: [6, 4] }) : stroke,
      }),
    ];

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
    if (extensions.length > 0 && !tie) {
      styles.push(new Style({ geometry: new MultiLineString(extensions), stroke }));
    }

    // Terminators: none on a tie distance; a running dimension has the origin circle and an
    // arrow pointing away from the origin; otherwise the preset's mark at both ends.
    if (tie) {
      // no terminators
    } else if (running) {
      const along = paper(DIMENSION_PAPER_MM.arrowLength);
      const across = paper(DIMENSION_PAPER_MM.arrowWidth) / 2;
      const back = add(d2, u, -along * Math.sign(length));
      styles.push(
        new Style({
          geometry: new Point(d1),
          image: new CircleStyle({
            radius: Math.max(paper(DIMENSION_PAPER_MM.originRadius) / resolution, 2),
            stroke,
          }),
        }),
        new Style({
          geometry: new MultiPolygon([[[d2, add(back, n, across), add(back, n, -across), d2]]]),
          fill,
        }),
      );
    } else if (config.terminator === 'tick') {
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
      const gapUp = paper(DIMENSION_PAPER_MM.textGap);
      // A running value is written along its extension line, outward from the dimension line at
      // the point's foot (DIN 406), so the values of close points stand side by side; other
      // values sit above the middle of the dimension line.
      let centre = add(add(d1, u, length / 2 + shift), up, gapUp);
      let rotationOf = read;
      let align: CanvasTextAlign = 'center';
      if (running) {
        const outward: Coordinate = offset < 0 ? [-n[0]!, -n[1]!] : n;
        const turn = outward[0]! < 0 || (outward[0] === 0 && outward[1]! < 0);
        rotationOf = turn ? [-outward[0]!, -outward[1]!] : outward;
        align = turn ? 'right' : 'left';
        centre = add(d2, outward, gapUp);
      }
      const formatted = formatDimension(values.value, config.preset, {
        decimal,
        computed: values.computed,
        showComputed: config.showComputed,
        text: (feature.get('text') as string | null | undefined) ?? null,
      });
      const label = stale ? `⚠ ${formatted}` : formatted;
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
            rotation: -Math.atan2(rotationOf[1]!, rotationOf[0]!),
            rotateWithView: true,
            textAlign: align,
            textBaseline: 'bottom',
            overflow: true,
          }),
        }),
      );
      if (running) {
        styles.push(
          new Style({
            geometry: new Point(add(d1, up, gapUp)),
            text: new Text({
              text: '0',
              font: `${size}px ${config.font}`,
              fill,
              rotation: -Math.atan2(read[1]!, read[0]!),
              rotateWithView: true,
              textAlign: 'center',
              textBaseline: 'bottom',
            }),
          }),
        );
      }
    }
    return styles;
  };
}
