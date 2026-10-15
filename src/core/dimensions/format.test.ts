import { describe, expect, it } from 'vitest';
import { decimalSeparator, formatDimension, formatDimensionNumber } from './format';

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
