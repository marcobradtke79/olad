// @vitest-environment jsdom
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import MultiPoint from 'ol/geom/MultiPoint';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import type Style from 'ol/style/Style';
import { describe, expect, it } from 'vitest';
import { TEXT_DEFAULTS } from '../config/defaults';
import { featureText, flatStyleFunction, textStyleFunction } from './text';

const base = { 'circle-radius': 5, 'circle-fill-color': '#f00', 'stroke-color': '#00f' };
const style = textStyleFunction(TEXT_DEFAULTS, base, () => 'EPSG:3857');
const draw = (feature: Feature, resolution: number) =>
  style(feature, resolution) as Style | Style[] | undefined;

describe('textStyleFunction', () => {
  it('draws a text sized in metres at the point and rotated counter-clockwise', () => {
    // At 49° N one metre is 1 / cos 49° map units in Web Mercator.
    const at = fromLonLat([8.4, 49]);
    const feature = new Feature({
      geometry: new Point(at),
      text: 'Main Street',
      textHeight: 10,
      textRotation: 30,
    });
    const scale = 1 / Math.cos((49 * Math.PI) / 180);
    const text = (draw(feature, 0.5) as Style).getText()!;
    expect(text.getText()).toBe('Main Street');
    const pixels = Number(/^([\d.]+)px/.exec(text.getFont()!)![1]);
    expect(pixels).toBeCloseTo((10 * scale) / 0.5, 0);
    expect(text.getFont()).toMatch(/px sans-serif$/);
    expect(text.getRotation()).toBeCloseTo((-30 * Math.PI) / 180, 12);
    expect(text.getRotateWithView()).toBe(true);
    expect(text.getTextAlign()).toBe('left');
    expect(text.getTextBaseline()).toBe('alphabetic');
    // Zoomed out it shrinks; below one pixel it is not drawn.
    const far = (draw(feature, 5) as Style).getText()!;
    expect(Number(/^([\d.]+)px/.exec(far.getFont()!)![1])).toBeCloseTo(pixels / 10, 0);
    expect(draw(feature, 1e6)).toBeUndefined();
    // The same size, rotation and text reuse the style.
    expect(draw(feature, 0.5)).toBe(draw(feature, 0.5));
  });

  it('uses the layer height when a text has none and handles multi-points', () => {
    const feature = new Feature({ geometry: new MultiPoint([[0, 0]]), text: 42 });
    const text = (draw(feature, 1) as Style).getText()!;
    expect(text.getText()).toBe('42');
    expect(Number(/^([\d.]+)px/.exec(text.getFont()!)![1])).toBeCloseTo(2.5, 1);
  });

  it('draws features without text with the layer style', () => {
    const plain = new Feature(new Point([0, 0]));
    const styles = draw(plain, 1) as Style[];
    expect(styles[0]!.getImage()).toBeTruthy();
    expect(featureText(plain, TEXT_DEFAULTS)).toBeNull();
    expect(
      featureText(new Feature({ geometry: new Point([0, 0]), text: '' }), TEXT_DEFAULTS),
    ).toBeNull();
    // A text property on a line is not a text.
    const line = new Feature({
      geometry: new LineString([
        [0, 0],
        [1, 1],
      ]),
      text: 'x',
    });
    expect(featureText(line, TEXT_DEFAULTS)).toBeNull();
    expect((draw(line, 1) as Style[])[0]!.getStroke()).toBeTruthy();
  });

  it('turns a rule list into a style function too', () => {
    const rules = flatStyleFunction([{ filter: ['==', ['get', 'kind'], 'a'], style: base }]);
    expect(rules(new Feature({ geometry: new Point([0, 0]), kind: 'a' }), 1)).toHaveLength(1);
    expect(rules(new Feature({ geometry: new Point([0, 0]), kind: 'b' }), 1)).toHaveLength(0);
  });
});
