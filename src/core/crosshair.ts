/**
 * CAD-style cursor for edit mode, a parallel straightedge: two thin lines spanning the whole
 * map that follow the pointer, rotated by an adjustable angle, with a small square (the pick
 * box) at their crossing. Drawn as an overlay inside the OpenLayers viewport; the native
 * cursor is hidden meanwhile.
 *
 * DOM nodes are created through the viewport's own document so the core stays free of
 * globals (see the `no-restricted-globals` rule for `src/core`).
 */

export interface CrosshairOptions {
  /** Side length of the pick box in CSS pixels. */
  pickBoxSize: number;
  /** CSS colour of lines and box. */
  color: string;
  /** Pick box colour while a reference geometry is being picked. */
  pickColor: string;
  /** X-axis angle in degrees, counter-clockwise from the screen x-axis. */
  angle: number;
}

export const CROSSHAIR_CLASS = 'olcad-crosshair';

/** Half-length of each line in pixels. Clipped by the container, so any large value works. */
const LINE_LENGTH = 10000;

type Part = 'h-left' | 'h-right' | 'v-top' | 'v-bottom' | 'box' | 'snap';
const PARTS: readonly Part[] = ['h-left', 'h-right', 'v-top', 'v-bottom', 'box', 'snap'];

export type SnapMarker = 'vertex' | 'midpoint' | 'perpendicular' | 'tangent' | 'grid';

export class Crosshair {
  readonly element: HTMLElement;
  private readonly viewport: HTMLElement;
  private readonly pivot: HTMLElement;
  private readonly parts: Record<Part, HTMLElement>;
  private options: CrosshairOptions;
  private position: [number, number] | null = null;
  private picking = false;
  private snapPixel: [number, number] | null = null;

  constructor(viewport: HTMLElement, options: CrosshairOptions) {
    this.viewport = viewport;
    this.options = { ...options };
    const doc = viewport.ownerDocument;
    this.element = doc.createElement('div');
    this.element.className = CROSSHAIR_CLASS;
    Object.assign(this.element.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '1000',
      overflow: 'hidden',
      display: 'none',
    });
    this.pivot = doc.createElement('div');
    this.pivot.className = `${CROSSHAIR_CLASS}__pivot`;
    Object.assign(this.pivot.style, { position: 'absolute', left: '0', top: '0' });
    this.element.append(this.pivot);
    this.parts = {} as Record<Part, HTMLElement>;
    for (const part of PARTS) {
      const el = doc.createElement('div');
      el.className = `${CROSSHAIR_CLASS}__${part}`;
      el.style.position = 'absolute';
      el.style.boxSizing = 'border-box';
      this.pivot.append(el);
      this.parts[part] = el;
    }
    this.applyOptions();
    viewport.append(this.element);
    viewport.addEventListener('pointermove', this.onPointerMove);
    viewport.addEventListener('pointerenter', this.onPointerMove);
    viewport.addEventListener('pointerleave', this.onLeave);
  }

  /** Change size, colours or angle while shown. */
  setOptions(options: Partial<CrosshairOptions>): void {
    this.options = { ...this.options, ...options };
    this.applyOptions();
    if (this.position) this.moveTo(this.position[0], this.position[1]);
  }

  /** Highlight the pick box (reference pick in progress). */
  setPicking(on: boolean): void {
    this.picking = on;
    this.element.classList.toggle(`${CROSSHAIR_CLASS}--picking`, on);
    this.applyOptions();
  }

  private readonly onLeave = (): void => {
    this.setSnap(null);
    this.hide();
  };

  /** Whether the crosshair is currently drawn. */
  get visible(): boolean {
    return this.element.style.display !== 'none';
  }

  /** Position the crosshair at viewport pixel coordinates (or at the snap location, if any). */
  moveTo(x: number, y: number): void {
    this.position = [x, y];
    const [px, py] = this.snapPixel ?? [x, y];
    // CSS rotates clockwise for positive angles; the straightedge angle is counter-clockwise.
    this.pivot.style.transform = `translate(${px}px, ${py}px) rotate(${-this.options.angle}deg)`;
    this.element.style.display = '';
  }

  /**
   * Make the crosshair jump to a snap location (viewport pixels) and show the marker for the
   * snap mode; `null` returns it to the pointer.
   */
  setSnap(pixel: [number, number] | null, mode?: SnapMarker): void {
    this.snapPixel = pixel;
    const marker = this.parts.snap;
    if (pixel && mode) marker.dataset.mode = mode;
    else delete marker.dataset.mode;
    this.applyOptions(); // restyles the marker for the mode and hides it without one
    if (this.position) this.moveTo(this.position[0], this.position[1]);
  }

  /** The pixel the crosshair is drawn at: the snap location or the pointer. */
  get drawnAt(): [number, number] | null {
    return this.snapPixel ?? this.position;
  }

  hide = (): void => {
    this.element.style.display = 'none';
    this.position = null;
  };

  destroy(): void {
    this.viewport.removeEventListener('pointermove', this.onPointerMove);
    this.viewport.removeEventListener('pointerenter', this.onPointerMove);
    this.viewport.removeEventListener('pointerleave', this.onLeave);
    this.element.remove();
  }

  /** Geometry of the parts relative to the pivot: lines stop at the box, leaving a gap. */
  private applyOptions(): void {
    const { color, pickBoxSize, pickColor } = this.options;
    const half = pickBoxSize / 2;
    const { parts } = this;
    const px = (v: number) => `${v}px`;
    const L = LINE_LENGTH;
    Object.assign(parts['h-left'].style, {
      left: px(-L),
      width: px(L - half),
      top: '0',
      height: '1px',
      background: color,
    });
    Object.assign(parts['h-right'].style, {
      left: px(half),
      width: px(L),
      top: '0',
      height: '1px',
      background: color,
    });
    Object.assign(parts['v-top'].style, {
      top: px(-L),
      height: px(L - half),
      left: '0',
      width: '1px',
      background: color,
    });
    Object.assign(parts['v-bottom'].style, {
      top: px(half),
      height: px(L),
      left: '0',
      width: '1px',
      background: color,
    });
    Object.assign(parts.box.style, {
      left: px(-half),
      top: px(-half),
      width: px(pickBoxSize),
      height: px(pickBoxSize),
      border: `1px solid ${this.picking ? pickColor : color}`,
      background: 'transparent',
    });
    // Snap marker around the pick box: a square for vertices, a triangle for midpoints, a
    // right angle for perpendicular feet, a circle with a thick top edge (the tangent line) for
    // tangent points, a plain circle for grid intersections.
    const size = pickBoxSize + 6;
    const marker = parts.snap;
    const mode = marker.dataset.mode;
    marker.style.borderRadius = mode === 'grid' || mode === 'tangent' ? '50%' : '0';
    if (mode === 'midpoint') {
      Object.assign(marker.style, {
        left: px(-size / 2),
        top: px(-size / 2),
        width: '0',
        height: '0',
        border: 'none',
        borderLeft: `${size / 2}px solid transparent`,
        borderRight: `${size / 2}px solid transparent`,
        borderBottom: `${size}px solid ${pickColor}`,
        background: 'transparent',
        opacity: '0.7',
      });
    } else if (mode === 'perpendicular') {
      // Right-angle symbol: an L of two edges.
      Object.assign(marker.style, {
        left: px(-size / 2),
        top: px(-size / 2),
        width: px(size),
        height: px(size),
        border: 'none',
        borderLeft: `2px solid ${pickColor}`,
        borderRight: 'none',
        borderBottom: `2px solid ${pickColor}`,
        background: 'transparent',
        opacity: '1',
      });
    } else {
      Object.assign(marker.style, {
        left: px(-size / 2),
        top: px(-size / 2),
        width: px(size),
        height: px(size),
        border: `2px solid ${pickColor}`,
        borderTop: `${mode === 'tangent' ? 4 : 2}px solid ${pickColor}`,
        borderLeft: `2px solid ${pickColor}`,
        borderRight: `2px solid ${pickColor}`,
        borderBottom: `2px solid ${pickColor}`,
        background: 'transparent',
        opacity: '1',
      });
    }
    marker.style.display = mode ? '' : 'none';
  }

  private onPointerMove = (event: PointerEvent): void => {
    // Keep OpenLayers controls (zoom buttons and the like) usable with a normal look.
    if ((event.target as Element | null)?.closest?.('.ol-control')) {
      this.hide();
      return;
    }
    const rect = this.viewport.getBoundingClientRect();
    this.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  };
}

const previousCursors = new WeakMap<HTMLElement, string>();

/**
 * Hide (`on`) or restore the native cursor of an element, normally the map viewport. The
 * element's own inline cursor is remembered on the way in and restored on the way out.
 * Repeated calls with the same value are no-ops.
 */
export function applyEditCursor(element: HTMLElement, on: boolean): void {
  if (on) {
    if (previousCursors.has(element)) return;
    previousCursors.set(element, element.style.cursor);
    element.style.cursor = 'none';
  } else {
    if (!previousCursors.has(element)) return;
    element.style.cursor = previousCursors.get(element) ?? '';
    previousCursors.delete(element);
  }
}
