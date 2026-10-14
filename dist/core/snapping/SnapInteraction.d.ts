import { default as Interaction } from 'ol/interaction/Interaction';
import { default as MapBrowserEvent } from 'ol/MapBrowserEvent';
import { SnapEngine, SnapResult } from './SnapEngine';
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
/**
 * Rewrites pointer events to the snap location so every tool (draw, modify, move, the
 * straightedge pick) works with snapped coordinates. Must be the last interaction added to the
 * map: OpenLayers hands events to interactions in reverse order of insertion.
 *
 * Order of precedence: a geometry snap within the radius, else the constrained coordinate
 * (angle lock), else the grid.
 */
export declare class SnapInteraction extends Interaction {
    private readonly options;
    private current;
    private pointer;
    constructor(options: SnapInteractionOptions);
    handleEvent(event: MapBrowserEvent): boolean;
    /** The last pointer coordinate after snapping and constraints, or `null` before any event. */
    getPointerCoordinate(): number[] | null;
    /** Forget the current snap (pointer left the map, snapping switched off). */
    reset(): void;
}
