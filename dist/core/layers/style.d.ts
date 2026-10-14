import { FlatStyle, FlatStyleLike } from 'ol/style/flat';
import { GeometryType } from '../config/types';
/** Line dash patterns a user can pick. */
export type StrokeDash = 'solid' | 'dashed' | 'dotted';
/**
 * A layer's look as a user edits it (`editor.layers.setStyle`): plain JSON, colours as
 * `#rrggbb`. Which sections apply depends on the geometry type (points, lines, polygons; all
 * for `Any`).
 */
export interface LayerStyle {
    stroke?: {
        color: string;
        width: number;
        dash: StrokeDash;
    };
    fill?: {
        color: string;
        opacity: number;
    };
    point?: {
        radius: number;
        fill: string;
        strokeColor: string;
        strokeWidth: number;
    };
    /** An attribute shown next to each object; `null` for none. */
    label?: {
        field: string;
        size: number;
        color: string;
        halo: string;
    } | null;
    /** Text layers: colour of the texts and of their halo. */
    text?: {
        color: string;
        halo: string;
    };
    /** Layer opacity, 0 … 1. */
    opacity: number;
    /** Drawn from this zoom level on (exclusive, as OpenLayers `minZoom`); absent: always. */
    minZoom?: number;
    /** Drawn up to this zoom level (inclusive); absent: always. */
    maxZoom?: number;
}
/** Thrown for an invalid `LayerStyle`; `path` names the offending property. */
export declare class StyleError extends Error {
    readonly path: string;
    constructor(path: string, message: string);
}
/** Which sections a geometry type uses. */
export declare function styleSections(type: GeometryType): {
    point: boolean;
    stroke: boolean;
    fill: boolean;
};
/** `#rrggbb` and alpha of a CSS-like colour (`#rgb`, `#rrggbb`, `rgb()`, `rgba()`, a few names, `[r,g,b,a]`); `null` if unknown. */
export declare function parseColor(value: unknown): {
    hex: string;
    alpha: number;
} | null;
/** `rgba(r, g, b, a)` from `#rrggbb` and an alpha. */
export declare function rgba(hex: string, alpha: number): string;
/**
 * The editable style read from a configured flat style: only a single flat style object whose
 * values are literals (no expressions, no rules, no arrays of styles). `null` otherwise, so the
 * caller starts from defaults and the user knows the configured style will be replaced.
 */
export declare function styleFromFlat(flat: FlatStyleLike, type: GeometryType): LayerStyle | null;
/** The flat style of an editable style for a layer of `type` (opacity and zoom are layer settings). */
export declare function flatFromStyle(style: LayerStyle, type: GeometryType): FlatStyle;
/** Throws `StyleError` for a malformed style; returns a clean copy otherwise. */
export declare function validateStyle(style: unknown, path?: string): LayerStyle;
