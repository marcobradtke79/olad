import { Coordinate } from 'ol/coordinate';
import { default as PointerInteraction } from 'ol/interaction/Pointer';
import { default as MapBrowserEvent } from 'ol/MapBrowserEvent';
import { ToolContext } from './Tool';
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
export declare class PointPickInteraction extends PointerInteraction {
    private readonly handlers;
    constructor(handlers: PointHandlers);
    handleEvent(event: MapBrowserEvent): boolean;
}
/** The pointer position before the snap interaction rewrote the event. */
export declare function rawCoordinate(event: MapBrowserEvent): Coordinate;
/** Grip pick radius in map units: at least 10 px, else the editor's hit tolerance. */
export declare function pickTolerance(ctx: Pick<ToolContext, 'map' | 'hitTolerance'>): number;
