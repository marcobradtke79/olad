/**
 * Inline SVG icons for the UI elements: 24-unit view box, stroked with `currentColor`, no
 * runtime dependency. Hosts may reuse them (`icon('zoomIn')`) for their own toolbar buttons.
 */
export declare const ICONS: {
    readonly edit: string;
    readonly undo: string;
    readonly redo: string;
    readonly select: string;
    readonly drawPoint: string;
    readonly drawLine: string;
    readonly drawPolygon: string;
    readonly drawRectangle: string;
    readonly drawCircle: string;
    readonly drawCirclePoint: string;
    readonly drawEllipse: string;
    readonly drawEllipseAxis: string;
    readonly drawEllipseBox: string;
    readonly drawCircleThreePoints: string;
    readonly drawRegularPolygon: string;
    readonly offset: string;
    readonly trim: string;
    readonly extend: string;
    readonly drawCurve: string;
    readonly drawParallel: string;
    readonly drawText: string;
    readonly vertices: string;
    readonly move: string;
    readonly rotate: string;
    readonly scale: string;
    readonly delete: string;
    readonly zoomIn: string;
    readonly zoomOut: string;
    readonly snap: string;
    readonly snapVertex: string;
    readonly snapMidpoint: string;
    readonly snapPerpendicular: string;
    readonly snapTangent: string;
    readonly grid: string;
    readonly eye: string;
    readonly eyeOff: string;
    readonly addLayer: string;
    readonly settings: string;
    readonly arrowUp: string;
    readonly arrowDown: string;
    readonly palette: string;
    readonly table: string;
    readonly close: string;
    readonly info: string;
    readonly highlight: string;
    readonly mirror: string;
    readonly moveToLayer: string;
    readonly measureDistance: string;
    readonly measureArea: string;
    readonly measureAngle: string;
    readonly measureClear: string;
    readonly copy: string;
    readonly stamp: string;
    readonly rename: string;
    readonly angleLock: string;
    readonly straightedge: string;
    readonly reset: string;
    readonly alignSegment: string;
};
export type IconName = keyof typeof ICONS;
/** Create an `<svg>` element for an icon. */
export declare function icon(name: IconName, doc?: Document): SVGSVGElement;
