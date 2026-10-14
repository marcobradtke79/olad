import type { Coordinate } from 'ol/coordinate';
import PointerInteraction from 'ol/interaction/Pointer';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type { ToolContext } from './Tool';

/**
 * Clicks and pointer moves for the point-picking steps of a tool. `coordinate` is snapped;
 * `raw` is where the pointer really is (for hit testing grips); `alt` reports the Alt key.
 */
export interface PointHandlers {
  click(coordinate: number[], raw: number[], alt: boolean): void;
  move(coordinate: number[], raw: number[]): void;
}

/**
 * Hands every click and pointer move to the tool as a (snapped) coordinate plus the raw
 * pointer position. Clicks are consumed; `singleclick` and `dblclick` are swallowed so two
 * quick picks never zoom the map.
 */
export class PointPickInteraction extends PointerInteraction {
  private readonly handlers: PointHandlers;

  constructor(handlers: PointHandlers) {
    super();
    this.handlers = handlers;
  }

  override handleEvent(event: MapBrowserEvent): boolean {
    if (event.type === 'click') {
      const alt = Boolean((event.originalEvent as MouseEvent | undefined)?.altKey);
      this.handlers.click(event.coordinate.slice(), rawCoordinate(event), alt);
      return false; // consumed
    }
    // Two quick picks are not a double click: keep the default double-click zoom out of it.
    if (event.type === 'dblclick' || event.type === 'singleclick') return false;
    if (event.type === 'pointermove')
      this.handlers.move(event.coordinate.slice(), rawCoordinate(event));
    return true;
  }
}

/** The pointer position before the snap interaction rewrote the event. */
export function rawCoordinate(event: MapBrowserEvent): Coordinate {
  const original = event.originalEvent as MouseEvent | undefined;
  if (original && typeof event.map?.getEventCoordinate === 'function') {
    return event.map.getEventCoordinate(original);
  }
  return event.coordinate.slice();
}

/** Grip pick radius in map units: at least 10 px, else the editor's hit tolerance. */
export function pickTolerance(ctx: Pick<ToolContext, 'map' | 'hitTolerance'>): number {
  const resolution = ctx.map.getView().getResolution() ?? 1;
  return Math.max(10, ctx.hitTolerance) * resolution;
}
