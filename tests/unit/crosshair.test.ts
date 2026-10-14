// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { applyEditCursor, Crosshair, type CrosshairOptions } from '../../src/core/crosshair';

const base: CrosshairOptions = { pickBoxSize: 8, color: 'red', pickColor: 'yellow', angle: 0 };

function viewport(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'ol-viewport';
  el.getBoundingClientRect = () =>
    ({ left: 100, top: 50, right: 500, bottom: 350, width: 400, height: 300 }) as DOMRect;
  document.body.append(el);
  return el;
}

const pointer = (el: Element, type: string, clientX: number, clientY: number) =>
  el.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true }));

const part = (crosshair: Crosshair, name: string) =>
  crosshair.element.querySelector<HTMLElement>(`.olcad-crosshair__${name}`)!.style;

beforeEach(() => document.body.replaceChildren());

describe('Crosshair', () => {
  it('is created hidden inside the viewport with lines and a pick box around a pivot', () => {
    const vp = viewport();
    const crosshair = new Crosshair(vp, base);
    const container = vp.querySelector<HTMLElement>('.olcad-crosshair')!;
    expect(container).toBe(crosshair.element);
    expect(crosshair.visible).toBe(false);
    expect(container.style.pointerEvents).toBe('none');
    expect(
      container.querySelector('.olcad-crosshair__pivot > .olcad-crosshair__box'),
    ).not.toBeNull();
    expect(part(crosshair, 'box').width).toBe('8px');
    expect(part(crosshair, 'box').border).toBe('1px solid red');
    expect(part(crosshair, 'h-left').background).toBe('red');
  });

  it('positions the parts relative to the pivot, leaving a gap for the pick box', () => {
    const crosshair = new Crosshair(viewport(), { ...base, pickBoxSize: 10 });
    expect(part(crosshair, 'h-left').left).toBe('-10000px');
    expect(part(crosshair, 'h-left').width).toBe('9995px');
    expect(part(crosshair, 'h-right').left).toBe('5px');
    expect(part(crosshair, 'v-top').top).toBe('-10000px');
    expect(part(crosshair, 'v-top').height).toBe('9995px');
    expect(part(crosshair, 'v-bottom').top).toBe('5px');
    expect(part(crosshair, 'box').left).toBe('-5px');
    expect(part(crosshair, 'box').top).toBe('-5px');
  });

  it('follows the pointer by moving the pivot and rotates by the angle', () => {
    const vp = viewport();
    const crosshair = new Crosshair(vp, base);
    pointer(vp, 'pointermove', 300, 170); // viewport-relative (200, 120)
    expect(crosshair.visible).toBe(true);
    expect(part(crosshair, 'pivot').transform).toBe('translate(200px, 120px) rotate(0deg)');
    crosshair.setOptions({ angle: 30 });
    expect(part(crosshair, 'pivot').transform).toBe('translate(200px, 120px) rotate(-30deg)');
  });

  it('hides when the pointer leaves or hovers an OpenLayers control', () => {
    const vp = viewport();
    const control = document.createElement('div');
    control.className = 'ol-control';
    const button = document.createElement('button');
    control.append(button);
    vp.append(control);
    const crosshair = new Crosshair(vp, base);
    pointer(vp, 'pointerenter', 150, 100);
    expect(crosshair.visible).toBe(true);
    pointer(vp, 'pointerleave', 0, 0);
    expect(crosshair.visible).toBe(false);
    pointer(vp, 'pointermove', 150, 100);
    expect(crosshair.visible).toBe(true);
    pointer(button, 'pointermove', 150, 100);
    expect(crosshair.visible).toBe(false);
  });

  it('applies new options live', () => {
    const crosshair = new Crosshair(viewport(), base);
    crosshair.setOptions({ pickBoxSize: 20, color: 'blue' });
    expect(part(crosshair, 'box').width).toBe('20px');
    expect(part(crosshair, 'box').border).toBe('1px solid blue');
    expect(part(crosshair, 'box').left).toBe('-10px');
    expect(part(crosshair, 'h-left').width).toBe('9990px');
    expect(part(crosshair, 'v-top').background).toBe('blue');
  });

  it('jumps to a snap location and shows the marker for the mode', () => {
    const vp = viewport();
    const crosshair = new Crosshair(vp, base);
    pointer(vp, 'pointermove', 300, 170); // (200, 120)
    expect(crosshair.drawnAt).toEqual([200, 120]);
    crosshair.setSnap([210, 130], 'vertex');
    expect(crosshair.drawnAt).toEqual([210, 130]);
    expect(part(crosshair, 'pivot').transform).toBe('translate(210px, 130px) rotate(0deg)');
    expect(part(crosshair, 'snap').display).toBe('');
    expect(part(crosshair, 'snap').width).toBe('14px'); // pick box 8 + 6
    pointer(vp, 'pointermove', 305, 175); // pointer moves, crosshair stays snapped
    expect(crosshair.drawnAt).toEqual([210, 130]);
    crosshair.setSnap([220, 140], 'midpoint');
    expect(part(crosshair, 'snap').borderBottom).toContain('yellow');
    expect(part(crosshair, 'snap').width).toBe('0px');
    crosshair.setSnap([220, 140], 'perpendicular');
    expect(part(crosshair, 'snap').borderLeft).toContain('yellow');
    expect(part(crosshair, 'snap').borderRight).not.toContain('yellow');
    expect(part(crosshair, 'snap').borderBottom).toContain('yellow');
    expect(part(crosshair, 'snap').borderRadius).toBe('0px');
    crosshair.setSnap([220, 140], 'grid');
    expect(part(crosshair, 'snap').borderRadius).toBe('50%');
    expect(part(crosshair, 'snap').borderLeft).toContain('yellow');
    expect(part(crosshair, 'snap').borderTop).toBe('2px solid yellow');
    crosshair.setSnap([220, 140], 'tangent');
    expect(part(crosshair, 'snap').borderRadius).toBe('50%');
    expect(part(crosshair, 'snap').borderTop).toBe('4px solid yellow');
    expect(part(crosshair, 'snap').borderBottom).toBe('2px solid yellow');
    crosshair.setSnap(null);
    expect(crosshair.drawnAt).toEqual([205, 125]);
    expect(part(crosshair, 'snap').display).toBe('none');
    crosshair.setSnap([1, 1], 'vertex');
    pointer(vp, 'pointerleave', 0, 0); // leaving clears the snap
    expect(crosshair.visible).toBe(false);
    pointer(vp, 'pointermove', 300, 170);
    expect(crosshair.drawnAt).toEqual([200, 120]);
  });

  it('highlights the pick box while picking', () => {
    const crosshair = new Crosshair(viewport(), base);
    crosshair.setPicking(true);
    expect(part(crosshair, 'box').border).toBe('1px solid yellow');
    expect(crosshair.element.classList.contains('olcad-crosshair--picking')).toBe(true);
    expect(part(crosshair, 'h-left').background).toBe('red');
    crosshair.setPicking(false);
    expect(part(crosshair, 'box').border).toBe('1px solid red');
    expect(crosshair.element.classList.contains('olcad-crosshair--picking')).toBe(false);
  });

  it('destroy removes the overlay and stops listening', () => {
    const vp = viewport();
    const crosshair = new Crosshair(vp, base);
    crosshair.destroy();
    expect(vp.querySelector('.olcad-crosshair')).toBeNull();
    pointer(vp, 'pointermove', 200, 150);
    expect(crosshair.visible).toBe(false);
  });
});

describe('applyEditCursor', () => {
  it('hides the native cursor and restores the previous inline value', () => {
    const el = document.createElement('div');
    el.style.cursor = 'grab';
    applyEditCursor(el, true);
    expect(el.style.cursor).toBe('none');
    applyEditCursor(el, false);
    expect(el.style.cursor).toBe('grab');
  });

  it('restores an empty cursor and ignores repeated calls', () => {
    const el = document.createElement('div');
    applyEditCursor(el, false);
    expect(el.style.cursor).toBe('');
    applyEditCursor(el, true);
    applyEditCursor(el, true);
    expect(el.style.cursor).toBe('none');
    applyEditCursor(el, false);
    applyEditCursor(el, false);
    expect(el.style.cursor).toBe('');
  });
});
