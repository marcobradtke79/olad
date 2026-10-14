// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installTooltips, TOOLTIP_DELAY_MS } from './tooltip';

let uninstall: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = `
    <button id="a" aria-label="Select" data-tooltip="Click to select">A</button>
    <button id="b" data-tooltip="Only text">B</button>
    <button id="c">no tooltip</button>`;
  uninstall = installTooltips();
});

afterEach(() => {
  uninstall();
  vi.useRealTimers();
});

const tip = () => document.querySelector<HTMLElement>('.olcad-tooltip');
const over = (el: Element) =>
  el.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }) as PointerEvent);
const out = (el: Element) =>
  el.dispatchEvent(new MouseEvent('pointerout', { bubbles: true }) as PointerEvent);

describe('tooltips', () => {
  it('shows label and text after the delay on hover and hides on leave', () => {
    const a = document.getElementById('a')!;
    over(a);
    expect(tip()).toBeNull(); // not before the delay
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    const el = tip()!;
    expect(el.hidden).toBe(false);
    expect(el.getAttribute('role')).toBe('tooltip');
    expect(el.querySelector('.olcad-tooltip__label')!.textContent).toBe('Select');
    expect(el.querySelector('.olcad-tooltip__text')!.textContent).toBe('Click to select');
    out(a);
    expect(el.hidden).toBe(true);
  });

  it('shows only the text when there is no label, and nothing for plain elements', () => {
    over(document.getElementById('b')!);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    expect(tip()!.querySelector('.olcad-tooltip__label')).toBeNull();
    expect(tip()!.querySelector('.olcad-tooltip__text')!.textContent).toBe('Only text');
    out(document.getElementById('b')!);
    over(document.getElementById('c')!);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    expect(tip()!.hidden).toBe(true);
  });

  it('shows on keyboard focus and hides on blur, Escape or pointer down', () => {
    const a = document.getElementById('a')!;
    a.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    expect(tip()!.hidden).toBe(false);
    a.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(tip()!.hidden).toBe(true);

    over(a);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    expect(tip()!.hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(tip()!.hidden).toBe(true);

    out(a);
    over(a);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    expect(tip()!.hidden).toBe(false);
    a.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(tip()!.hidden).toBe(true);
  });

  it('leaving before the delay never shows it; install is idempotent and uninstall removes it', () => {
    const a = document.getElementById('a')!;
    over(a);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS / 2);
    out(a);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    expect(tip()).toBeNull();
    expect(installTooltips()).toBe(uninstall);
    over(a);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    expect(document.querySelectorAll('.olcad-tooltip')).toHaveLength(1);
    uninstall();
    expect(tip()).toBeNull();
    over(a);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    expect(tip()).toBeNull();
    uninstall = installTooltips(); // for afterEach
  });
});
