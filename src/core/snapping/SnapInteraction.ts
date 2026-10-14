import Interaction from 'ol/interaction/Interaction';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type { SnapEngine, SnapResult } from './SnapEngine';

export interface SnapInteractionOptions {
  engine: SnapEngine;
  /** Whether snapping applies right now (snapping on and edit mode on). */
  isActive(): boolean;
  /** Called with the current snap whenever it changes (including `null` when it ends). */
  onSnap(result: SnapResult | null): void;
  /** Last fixed vertex of the active tool's drawing in progress, for the perpendicular mode. */
  getReference(): number[] | null;
  /**
   * Applies drawing constraints (the angle lock) to a pointer coordinate: the constrained
   * coordinate, or `null` when no constraint applies. Consulted when no geometry snap was found;
   * a constrained coordinate is not grid-snapped.
   */
  constrain(coordinate: number[]): number[] | null;
}

/** Every event a tool may take a coordinate from (Draw finishes on pointerup, for example). */
const HANDLED = new Set([
  'pointerdown',
  'pointerup',
  'pointermove',
  'pointerdrag',
  'click',
  'singleclick',
  'dblclick',
]);

/**
 * Rewrites pointer events to the snap location so every tool (draw, modify, move, the
 * straightedge pick) works with snapped coordinates. Must be the last interaction added to the
 * map: OpenLayers hands events to interactions in reverse order of insertion.
 *
 * Order of precedence: a geometry snap within the radius, else the constrained coordinate
 * (angle lock), else the grid.
 */
export class SnapInteraction extends Interaction {
  private readonly options: SnapInteractionOptions;
  private current: SnapResult | null = null;
  private pointer: number[] | null = null;

  constructor(options: SnapInteractionOptions) {
    super();
    this.options = options;
  }

  override handleEvent(event: MapBrowserEvent): boolean {
    if (!HANDLED.has(event.type)) return true;
    const map = this.getMap();
    let result: SnapResult | null = null;
    if (map && this.options.isActive()) {
      const toPixel = (c: number[]) => map.getPixelFromCoordinate(c);
      const { engine } = this.options;
      result = engine.snapGeometry(
        event.coordinate,
        event.pixel,
        map.getView().getResolution() ?? 1,
        toPixel,
        this.options.getReference(),
      );
      if (!result) {
        const constrained = this.options.constrain(event.coordinate);
        if (constrained) {
          event.coordinate = constrained.slice();
          event.pixel = toPixel(constrained);
        } else {
          result = engine.snapGrid(event.coordinate, toPixel);
        }
      }
    }
    if (result) {
      event.coordinate = result.coordinate.slice();
      event.pixel = result.pixel.slice();
    }
    this.pointer = event.coordinate.slice();
    if (!sameSnap(this.current, result)) {
      this.current = result;
      this.options.onSnap(result);
    }
    return true;
  }

  /** The last pointer coordinate after snapping and constraints, or `null` before any event. */
  getPointerCoordinate(): number[] | null {
    return this.pointer;
  }

  /** Forget the current snap (pointer left the map, snapping switched off). */
  reset(): void {
    if (!this.current) return;
    this.current = null;
    this.options.onSnap(null);
  }
}

function sameSnap(a: SnapResult | null, b: SnapResult | null): boolean {
  if (!a || !b) return a === b;
  return (
    a.mode === b.mode && a.coordinate[0] === b.coordinate[0] && a.coordinate[1] === b.coordinate[1]
  );
}
