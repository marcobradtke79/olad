// @vitest-environment jsdom
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import MultiLineString from 'ol/geom/MultiLineString';
import MultiPoint from 'ol/geom/MultiPoint';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Point from 'ol/geom/Point';
import type Style from 'ol/style/Style';
import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';
import { resolveDimension } from '../config/defaults';
import type { DimensionConfig } from '../config/types';
import { registerProjections } from '../projections/register';
import { dimensionStyleFunction } from './dimension';

registerProjections(
  [{ code: 'EPSG:25832', def: '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs' }],
  proj4,
);

const base = { 'circle-radius': 5, 'circle-fill-color': '#f00', 'stroke-color': '#00f' };

function draw(config: DimensionConfig, feature: Feature, resolution = 0.05) {
  const style = dimensionStyleFunction(resolveDimension(config)!, base, () => 'EPSG:25832', 'de');
  return style(feature, resolution) as Style[] | Style | undefined;
}

/** Near Karlsruhe in zone 32, where a metre is almost exactly one map unit (scale 0.9996). */
const O = [457000, 5428000];
const at = (x: number, y: number) => [O[0]! + x, O[1]! + y];
const dim = (from: number[], to: number[], properties: Record<string, unknown> = {}) =>
  new Feature({
    geometry: new LineString([at(from[0]!, from[1]!), at(to[0]!, to[1]!)]),
    ...properties,
  });
/** Coordinates relative to O, rounded to centimetres. */
const rel = (c: number[]) => [
  Math.round((c[0]! - O[0]!) * 100) / 100,
  Math.round((c[1]! - O[1]!) * 100) / 100,
];

const parts = (styles: Style[]) => ({
  line: styles[0]!.getGeometry() as LineString,
  extensions: styles.find((s) => s.getGeometry() instanceof MultiLineString)?.getGeometry() as
    MultiLineString | undefined,
  text: styles.find((s) => s.getText())!,
});

describe('dimensionStyleFunction', () => {
  it('draws an aligned dimension at its offset with extension lines and a bracketed value', () => {
    // UTM: one metre is one map unit; architecture 1:100, so 1 mm on paper is 0.1 m.
    const styles = draw({ preset: 'architecture' }, dim([0, 0], [10, 0], { offset: 2 })) as Style[];
    const { line, extensions, text } = parts(styles);
    expect(line.getCoordinates().map(rel)).toEqual([
      [0, 2],
      [10, 2],
    ]);
    const [left] = extensions!.getCoordinates();
    expect(rel(left![0]!)).toEqual([0, 0.1]); // 1 mm gap
    expect(rel(left![1]!)).toEqual([0, 2.2]); // 2 mm overrun
    expect(text.getText()!.getText()).toBe('(10,00)');
    expect(text.getText()!.getRotation()).toBeCloseTo(0);
    expect(rel((text.getGeometry() as Point).getCoordinates())).toEqual([5, 2.1]);
    // 2.5 mm text at 1:100 is 0.25 m, at 0.05 m per pixel 5 px.
    expect(text.getText()!.getFont()).toBe('5px sans-serif');
  });

  it('keeps the value readable for a dimension drawn right to left', () => {
    const styles = draw({ preset: 'surveying' }, dim([10, 0], [0, 0], { offset: 2 })) as Style[];
    const { line, text } = parts(styles);
    expect(rel(line.getCoordinates()[0]!)[1]).toBe(-2); // left of 10,0 → 0,0 is south
    expect(text.getText()!.getRotation()).toBeCloseTo(0);
    expect(rel((text.getGeometry() as Point).getCoordinates())[1]).toBe(-1.5); // 1 mm at 1:500
  });

  it('shows field values plain, deviating ones in the deviation colour', () => {
    const ok = parts(draw({}, dim([0, 0], [10, 0], { fieldValue: 10.03 })) as Style[]).text;
    expect(ok.getText()!.getText()).toBe('10,03');
    expect(ok.getText()!.getFill()!.getColor()).toBe('#111827');
    const off = parts(draw({}, dim([0, 0], [10, 0], { fieldValue: 10.2 })) as Style[]).text;
    expect(off.getText()!.getFill()!.getColor()).toBe('#dc2626');
  });

  it('draws the preset terminators', () => {
    const drawn = (config: DimensionConfig) => draw(config, dim([0, 0], [10, 0])) as Style[];
    expect(
      drawn({ terminator: 'arrow' }).some((s) => s.getGeometry() instanceof MultiPolygon),
    ).toBe(true);
    expect(drawn({ terminator: 'dot' }).some((s) => s.getGeometry() instanceof MultiPoint)).toBe(
      true,
    );
    const ticks = drawn({ preset: 'architecture' }).find(
      (s) => s.getGeometry() instanceof MultiLineString,
    )!;
    const [tick] = (ticks.getGeometry() as MultiLineString).getCoordinates();
    const [from, to] = tick! as [number[], number[]];
    expect(to[0]! - from[0]!).toBeCloseTo(to[1]! - from[1]!); // 45°
    expect(drawn({ terminator: 'none' })).toHaveLength(2); // line and value only
  });

  it('draws a rotated dimension along its direction with extension lines of their own length', () => {
    // Horizontal dimension (rotation 0) between points 8 m apart east and 6 m apart north,
    // its line 2 m north of the first point: the second point lies above the line.
    const styles = draw(
      { preset: 'architecture' },
      dim([0, 0], [8, 6], { dimType: 'rotated', rotation: 0, offset: 2 }),
    ) as Style[];
    const { line, extensions, text } = parts(styles);
    expect(line.getCoordinates().map(rel)).toEqual([
      [0, 2],
      [8, 2],
    ]);
    const [first, second] = extensions!.getCoordinates();
    expect([rel(first![0]!), rel(first![1]!)]).toEqual([
      [0, 0.1],
      [0, 2.2],
    ]);
    // From the second point down to the line, gap and overrun on its own side.
    expect([rel(second![0]!), rel(second![1]!)]).toEqual([
      [8, 5.9],
      [8, 1.8],
    ]);
    expect(text.getText()!.getText()).toBe('(8,00)');
  });

  it('draws a tie distance as a dashed line with the value in the middle, no terminators', () => {
    const styles = draw(
      { preset: 'surveying' },
      dim([0, 0], [10, 0], { dimType: 'tie', offset: 7 }),
    ) as Style[];
    expect(styles).toHaveLength(2); // the line and the value
    const line = styles[0]!;
    expect((line.getGeometry() as LineString).getCoordinates().map(rel)).toEqual([
      [0, 0],
      [10, 0],
    ]);
    expect(line.getStroke()!.getLineDash()).toEqual([6, 4]);
    expect(rel((styles[1]!.getGeometry() as Point).getCoordinates())).toEqual([5, 0.5]);
  });

  it('draws a running dimension with the origin mark, an outward arrow and the value at its end', () => {
    const styles = draw(
      { preset: 'surveying' },
      dim([0, 0], [10, 3], { dimType: 'running', rotation: 0, offset: -2 }),
    ) as Style[];
    const texts = styles.filter((s) => s.getText()).map((s) => s.getText()!.getText());
    expect(texts).toEqual(['(10,00)', '0']);
    const value = styles.find((s) => s.getText()?.getText() === '(10,00)')!;
    // Written along the extension line, outward (south) from the line at the point's foot,
    // turned to read upwards: right-aligned, so it ends 1 mm (0.5 m) beyond the line.
    expect(value.getText()!.getTextAlign()).toBe('right');
    expect(value.getText()!.getRotation()).toBeCloseTo(-Math.PI / 2);
    expect(rel((value.getGeometry() as Point).getCoordinates())).toEqual([10, -2.5]);
    const origin = styles.find((s) => s.getGeometry() instanceof Point && s.getImage())!;
    expect(rel((origin.getGeometry() as Point).getCoordinates())).toEqual([0, -2]);
    const arrow = styles.find((s) => s.getGeometry() instanceof MultiPolygon)!;
    const [tip] = (arrow.getGeometry() as MultiPolygon).getCoordinates()[0]![0]!;
    expect(rel(tip!)).toEqual([10, -2]);
  });

  it('draws a stale dimension dashed with a warning sign before the value', () => {
    const feature = dim([0, 0], [10, 0], { offset: 2 });
    const style = dimensionStyleFunction(
      resolveDimension({ preset: 'surveying' })!,
      base,
      () => 'EPSG:25832',
      'de',
      (f) => f === feature,
    );
    const styles = style(feature, 0.05) as Style[];
    expect(styles[0]!.getStroke()!.getLineDash()).toEqual([8, 4]);
    expect(parts(styles).text.getText()!.getText()).toBe('⚠ (10,00)');
  });

  it('leaves out the value below one pixel and draws other features with the base style', () => {
    const tiny = draw({ preset: 'architecture' }, dim([0, 0], [10, 0]), 10) as Style[];
    expect(tiny.some((s) => s.getText())).toBe(false);
    const other = draw({}, new Feature(new Point(O)));
    expect(other).toBeDefined();
    expect(Array.isArray(other) ? other.some((s) => s.getText()) : false).toBe(false);
  });
});
