import { describe, expect, it } from 'vitest';
import {
  decimalSeparator,
  formatDimension,
  formatDimensionAngle,
  formatDimensionNumber,
  formatLevel,
  formatSlope,
} from './format';

describe('formatDimensionNumber', () => {
  it('writes architecture dimensions after DIN 1356-1', () => {
    expect(formatDimensionNumber(0.365, 'architecture')).toBe('36⁵');
    expect(formatDimensionNumber(0.3, 'architecture')).toBe('30');
    expect(formatDimensionNumber(0.05, 'architecture')).toBe('5');
    expect(formatDimensionNumber(2.015, 'architecture')).toBe('2,01⁵');
    expect(formatDimensionNumber(2.01, 'architecture')).toBe('2,01');
    expect(formatDimensionNumber(12.5, 'architecture')).toBe('12,50');
    expect(formatDimensionNumber(1.9996, 'architecture')).toBe('2,00');
    expect(formatDimensionNumber(0.9996, 'architecture')).toBe('1,00');
  });

  it('writes surveying and landscape dimensions in metres with centimetres', () => {
    expect(formatDimensionNumber(12.471, 'surveying')).toBe('12,47');
    expect(formatDimensionNumber(0.4, 'landscape')).toBe('0,40');
    expect(formatDimensionNumber(12.471, 'surveying', '.')).toBe('12.47');
  });
});

describe('formatDimension', () => {
  it('brackets computed values unless shown plain, and fills free text', () => {
    expect(formatDimension(12.471, 'surveying', { computed: true })).toBe('(12,47)');
    expect(formatDimension(12.471, 'surveying', { computed: false })).toBe('12,47');
    expect(formatDimension(12.471, 'surveying', { computed: true, showComputed: 'plain' })).toBe(
      '12,47',
    );
    expect(formatDimension(2.015, 'architecture', { text: '{value} lt. Bestand' })).toBe(
      '2,01⁵ lt. Bestand',
    );
    expect(formatDimension(2, 'architecture', { text: '± 0,00' })).toBe('± 0,00');
  });

  it('takes the decimal separator from the locale', () => {
    expect(decimalSeparator('de')).toBe(',');
    expect(decimalSeparator('en')).toBe('.');
  });
});

describe('formatDimensionAngle and prefixes', () => {
  it('writes degrees with one decimal and gon with four', () => {
    expect(formatDimensionAngle(87.5, 'deg')).toBe('87,5°');
    expect(formatDimensionAngle(90, 'gon')).toBe('100,0000 gon');
    expect(formatDimensionAngle(87.5, 'gon', '.')).toBe('97.2222 gon');
    expect(formatDimension(90, 'surveying', { angle: 'gon', computed: true })).toBe(
      '(100,0000 gon)',
    );
    expect(formatDimension(4.5, 'landscape', { prefix: 'R' })).toBe('R 4,50');
    expect(formatDimension(9, 'architecture', { prefix: 'Ø', computed: true })).toBe('Ø (9,00)');
  });
});

describe('formatLevel and formatSlope', () => {
  it('writes heights with their sign and slopes in percent', () => {
    expect(formatLevel(112.454)).toBe('+112,45');
    expect(formatLevel(-0.15)).toBe('−0,15');
    expect(formatLevel(0.001)).toBe('±0,00');
    expect(formatSlope(2.46, '.')).toBe('2.5 %');
    expect(formatDimension(2.5, 'landscape', { kind: 'slope', computed: true })).toBe('(2,5 %)');
  });
});
