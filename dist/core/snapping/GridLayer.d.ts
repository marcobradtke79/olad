import { default as OlMap } from 'ol/Map';
import { ResolvedGridConfig } from '../config/types';
/** Grid dots closer than this (in pixels) are not drawn. */
export declare const MIN_GRID_PIXELS = 8;
/**
 * Draws the grid intersections as dots. An unmanaged layer (`setMap`) that paints on its own
 * `postrender` event, so nothing is added to the host's layer list and nothing is hit-testable.
 */
export declare class GridLayer {
    private readonly layer;
    private readonly getConfig;
    private readonly style;
    private map;
    constructor(getConfig: () => ResolvedGridConfig, color: string);
    /** Show the dots on `map`, or hide them with `null`. */
    attach(map: OlMap | null): void;
    /** Repaint after a configuration change. */
    refresh(): void;
    private readonly draw;
}
