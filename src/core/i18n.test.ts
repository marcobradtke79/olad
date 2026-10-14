import { describe, expect, it } from 'vitest';
import { formatMessage, LOCALES, MESSAGES } from './i18n';

describe('formatMessage', () => {
  it('fills parameters in both shipped locales', () => {
    expect(formatMessage('en', {}, 'geometry-type', { expected: 'Polygon', actual: 'Point' })).toBe(
      'Expected a Polygon geometry, got Point.',
    );
    expect(formatMessage('de', {}, 'too-few-vertices', { minimum: 4, actual: 3 })).toBe(
      'Mindestens 4 Stützpunkte sind nötig, erhalten 3.',
    );
  });

  it('prefers host overrides and keeps unknown placeholders', () => {
    expect(formatMessage('en', { 'ring-not-closed': 'Close it ({x})!' }, 'ring-not-closed')).toBe(
      'Close it ({x})!',
    );
    expect(formatMessage('de', {}, 'custom-code')).toBe('custom-code');
  });

  it('ships every code in every locale', () => {
    const codes = Object.keys(MESSAGES.en);
    for (const locale of LOCALES)
      expect(Object.keys(MESSAGES[locale]).sort()).toEqual(codes.sort());
  });
});
