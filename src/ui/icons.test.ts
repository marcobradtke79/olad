// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { ICONS, icon, type IconName } from './icons';

describe('icons', () => {
  it('every icon is an inline svg hidden from assistive technology', () => {
    for (const name of Object.keys(ICONS) as IconName[]) {
      const svg = icon(name);
      expect(svg.tagName.toLowerCase()).toBe('svg');
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
      expect(svg.classList.contains('olcad-icon')).toBe(true);
      expect(svg.children.length).toBeGreaterThan(0);
    }
  });

  it('creates a fresh element each time', () => {
    expect(icon('select')).not.toBe(icon('select'));
  });
});
