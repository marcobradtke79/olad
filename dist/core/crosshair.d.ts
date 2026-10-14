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
export declare const CROSSHAIR_CLASS = "olcad-crosshair";
export type SnapMarker = 'vertex' | 'midpoint' | 'perpendicular' | 'tangent' | 'grid';
export declare class Crosshair {
    readonly element: HTMLElement;
    private readonly viewport;
    private readonly pivot;
    private readonly parts;
    private options;
    private position;
    private picking;
    private snapPixel;
    constructor(viewport: HTMLElement, options: CrosshairOptions);
    /** Change size, colours or angle while shown. */
    setOptions(options: Partial<CrosshairOptions>): void;
    /** Highlight the pick box (reference pick in progress). */
    setPicking(on: boolean): void;
    private readonly onLeave;
    /** Whether the crosshair is currently drawn. */
    get visible(): boolean;
    /** Position the crosshair at viewport pixel coordinates (or at the snap location, if any). */
    moveTo(x: number, y: number): void;
    /**
     * Make the crosshair jump to a snap location (viewport pixels) and show the marker for the
     * snap mode; `null` returns it to the pointer.
     */
    setSnap(pixel: [number, number] | null, mode?: SnapMarker): void;
    /** The pixel the crosshair is drawn at: the snap location or the pointer. */
    get drawnAt(): [number, number] | null;
    hide: () => void;
    destroy(): void;
    /** Geometry of the parts relative to the pivot: lines stop at the box, leaving a gap. */
    private applyOptions;
    private onPointerMove;
}
/**
 * Hide (`on`) or restore the native cursor of an element, normally the map viewport. The
 * element's own inline cursor is remembered on the way in and restored on the way out.
 * Repeated calls with the same value are no-ops.
 */
export declare function applyEditCursor(element: HTMLElement, on: boolean): void;
