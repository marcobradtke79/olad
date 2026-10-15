/**
 * Inline SVG icons for the UI elements: 24-unit view box, stroked with `currentColor`, no
 * runtime dependency. Hosts may reuse them (`icon('zoomIn')`) for their own toolbar buttons.
 */

const ICON_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="olcad-icon" aria-hidden="true" focusable="false"';

const svg = (body: string): string => `<svg ${ICON_ATTRS}>${body}</svg>`;

export const ICONS = {
  edit: svg('<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="m13.5 6.5 3 3"/>'),
  undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
  redo: svg('<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),
  select: svg('<path d="M5 3l14 9-6 1.5L10.5 20 5 3Z"/>'),
  drawPoint: svg(
    '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>',
  ),
  drawLine: svg(
    '<path d="M4 18 10 7l5 8 5-10"/><circle cx="4" cy="18" r="1.6" fill="currentColor" stroke="none"/><circle cx="10" cy="7" r="1.6" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.6" fill="currentColor" stroke="none"/><circle cx="20" cy="5" r="1.6" fill="currentColor" stroke="none"/>',
  ),
  drawPolygon: svg(
    '<path d="M12 3 20 9l-3 10H7L4 9Z"/><circle cx="12" cy="3" r="1.6" fill="currentColor" stroke="none"/><circle cx="20" cy="9" r="1.6" fill="currentColor" stroke="none"/><circle cx="17" cy="19" r="1.6" fill="currentColor" stroke="none"/><circle cx="7" cy="19" r="1.6" fill="currentColor" stroke="none"/><circle cx="4" cy="9" r="1.6" fill="currentColor" stroke="none"/>',
  ),
  drawRectangle: svg(
    '<rect x="4" y="6" width="16" height="12"/><circle cx="4" cy="6" r="1.6" fill="currentColor" stroke="none"/><circle cx="20" cy="18" r="1.6" fill="currentColor" stroke="none"/>',
  ),
  drawCircle: svg(
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M12 12h8"/>',
  ),
  drawCirclePoint: svg(
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="17.66" cy="6.34" r="1.6" fill="currentColor" stroke="none"/>',
  ),
  drawEllipse: svg(
    '<ellipse cx="12" cy="12" rx="9" ry="5.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M12 12h9"/>',
  ),
  drawEllipseAxis: svg(
    '<ellipse cx="12" cy="12" rx="9" ry="5.5"/><path d="M3 12h18"/><circle cx="3" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="21" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  ),
  drawEllipseBox: svg(
    '<rect x="3" y="6.5" width="18" height="11" stroke-dasharray="2 2"/><ellipse cx="12" cy="12" rx="9" ry="5.5"/><circle cx="3" cy="6.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="21" cy="17.5" r="1.6" fill="currentColor" stroke="none"/>',
  ),
  drawCircleThreePoints: svg(
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="4" r="1.6" fill="currentColor" stroke="none"/><circle cx="5.07" cy="16" r="1.6" fill="currentColor" stroke="none"/><circle cx="18.93" cy="16" r="1.6" fill="currentColor" stroke="none"/>',
  ),
  drawRegularPolygon: svg(
    '<path d="M19 12l-3.5 6.06h-7L5 12l3.5-6.06h7z"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  ),
  offset: svg(
    '<path d="M4 18l5-9 5 4 6-8"/><path d="M4 9l5-5 5 4 6-6" stroke-dasharray="2 2" transform="translate(0 2)"/>',
  ),
  trim: svg('<path d="M14 3v18"/><path d="M3 12h11"/><path d="M14 12h7" stroke-dasharray="2 2"/>'),
  extend: svg(
    '<path d="M20 3v18"/><path d="M3 12h9"/><path d="M12 12h8" stroke-dasharray="2 2"/><path d="m16 9 3 3-3 3"/>',
  ),
  drawCurve: svg(
    '<path d="M4 18c6-14 10 14 16-6"/><path d="M4 18l4-7M20 12l-3 5" stroke-dasharray="2 2"/><circle cx="8" cy="11" r="1.6" fill="currentColor" stroke="none"/><circle cx="17" cy="17" r="1.6" fill="currentColor" stroke="none"/>',
  ),
  drawParallel: svg(
    '<path d="M3 15h8l6-8h4"/><path d="M3 20h10l6-8h2" stroke-dasharray="2 2"/><circle cx="3" cy="20" r="1.6" fill="currentColor" stroke="none"/>',
  ),
  drawText: svg(
    '<path d="M5 6V4h12v2"/><path d="M11 4v14"/><path d="M8 18h6"/><path d="M17 20h4M19 18v4" />',
  ),
  vertices: svg(
    '<path d="M5 18 12 6l7 12"/><rect x="3" y="16" width="4" height="4"/><rect x="10" y="4" width="4" height="4"/><rect x="17" y="16" width="4" height="4"/>',
  ),
  move: svg(
    '<path d="M12 3v18M3 12h18"/><path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
  ),
  rotate: svg(
    '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 3v5h-5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  ),
  scale: svg(
    '<rect x="3" y="13" width="8" height="8"/><path d="M3 9V3h18v18h-6" stroke-dasharray="2 2"/><path d="m10 14 8-8M13 6h5v5"/>',
  ),
  delete: svg(
    '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
  ),
  zoomIn: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/><path d="M11 8v6M8 11h6"/>'),
  zoomOut: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/><path d="M8 11h6"/>'),
  snap: svg(
    '<path d="M6 4v8a6 6 0 0 0 12 0V4"/><path d="M6 4h4v8a2 2 0 0 0 4 0V4h4"/><path d="M6 8h4M14 8h4"/>',
  ),
  snapVertex: svg(
    '<path d="M3 18 12 6l9 12"/><rect x="9" y="3" width="6" height="6" fill="currentColor" stroke="none"/>',
  ),
  snapMidpoint: svg(
    '<path d="M3 17 21 7"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
  ),
  snapPerpendicular: svg('<path d="M3 18h18"/><path d="M12 18V5"/><path d="M12 13h5v5"/>'),
  snapTangent: svg('<circle cx="12" cy="14" r="6"/><path d="M3 8h18"/>'),
  grid: svg(
    '<circle cx="5" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="5" cy="19" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="19" r="1.4" fill="currentColor" stroke="none"/>',
  ),
  eye: svg(
    '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  ),
  eyeOff: svg(
    '<path d="M2 12s4-7 10-7c2 0 3.8.8 5.3 1.8M22 12s-4 7-10 7c-2 0-3.8-.8-5.3-1.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/>',
  ),
  addLayer: svg(
    '<path d="m12 4 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 4-2"/><path d="M19 14v6M16 17h6"/>',
  ),
  settings: svg(
    '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  ),
  arrowUp: svg('<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>'),
  arrowDown: svg('<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>'),
  palette: svg(
    '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.2-1.6-.4-1 .3-2.4 1.6-2.4H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14.5" cy="7" r="1"/>',
  ),
  table: svg(
    '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M3 14.5h18M9 9v11"/>',
  ),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.5"/>'),
  highlight: svg('<path d="m9 11-5 5v4h4l5-5"/><path d="m9 11 6-6 4 4-6 6z"/><path d="M14 20h6"/>'),
  mirror: svg(
    '<path d="M12 3v18" stroke-dasharray="2 2"/><path d="M9 7 3 17h6z"/><path d="m15 7 6 10h-6z"/>',
  ),
  moveToLayer: svg(
    '<path d="m12 13 8-4-8-4-8 4z"/><path d="m4 13 8 4 8-4"/><path d="m4 17 8 4 8-4"/><path d="M12 1v6M9.5 4.5 12 7l2.5-2.5"/>',
  ),
  // Aligned dimension: oblique dimension line with ticks and extension lines.
  dimensionAligned: svg(
    '<path d="M4 15 15 4M6 19 19 6"/><path d="M4 15l2 4M15 4l4 2"/><path d="M8 18l-1.5-2.5M19.5 7.5 17 6"/>',
  ),
  // Rotated dimension: horizontal dimension line over an oblique edge, following the straightedge.
  dimensionRotated: svg(
    '<path d="M5 20 17 12"/><path d="M5 20V6M17 12V6"/><path d="M5 8h12"/><path d="m3.5 9.5 3-3M15.5 9.5l3-3"/>',
  ),
  measureDistance: svg('<path d="M3 16 16 3l5 5L8 21z"/><path d="m7 12 2 2M10 9l2 2M13 6l2 2"/>'),
  measureArea: svg(
    '<path d="M4 6 13 3l7 7-4 10H6z" stroke-dasharray="2 2"/><path d="M9 10h6M9 14h6"/>',
  ),
  measureAngle: svg(
    '<path d="M4 20 18 4"/><path d="M4 20h16"/><path d="M11 20a7 7 0 0 0-2.4-5.3"/>',
  ),
  measureClear: svg(
    '<path d="M3 16 12 7l5 5-9 9H3z"/><path d="m14 4 6 6"/><path d="m15 15 6 6M21 15l-6 6"/>',
  ),
  copy: svg(
    '<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  ),
  stamp: svg('<path d="M9 13V9.5a3 3 0 1 1 6 0V13"/><path d="M5 13h14v4H5z"/><path d="M5 20h14"/>'),
  rename: svg('<path d="M4 7h10M4 12h6"/><path d="M13 20h3l5-5a1.4 1.4 0 0 0-2-2l-5 5z"/>'),
  angleLock: svg(
    '<path d="M4 20h16"/><path d="M4 20 16 6"/><path d="M11 20a7 7 0 0 0-2-5"/><rect x="15" y="12" width="6" height="5" rx="1"/><path d="M16.5 12v-1.5a1.5 1.5 0 0 1 3 0V12"/>',
  ),
  straightedge: svg('<path d="M3 17 17 3l4 4L7 21l-4-4Z"/><path d="m8 12 2 2M11 9l2 2M14 6l2 2"/>'),
  reset: svg('<path d="M4 10a8 8 0 1 1 2 7"/><path d="M4 4v6h6"/>'),
  alignSegment: svg(
    '<path d="M3 19 21 5"/><path d="m8 15 1.5 1.5"/><path d="M11 10l6 6-2.5 1-1.5 3.5L11 10Z" fill="currentColor"/>',
  ),
} as const;

export type IconName = keyof typeof ICONS;

/** Create an `<svg>` element for an icon. */
export function icon(name: IconName, doc: Document = document): SVGSVGElement {
  const fragment = doc.createRange().createContextualFragment(ICONS[name]);
  return fragment.firstElementChild as SVGSVGElement;
}
