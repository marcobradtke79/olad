import type OlMap from 'ol/Map';
import { createEmpty, extend, isEmpty, type Extent } from 'ol/extent';
import { transformExtent } from 'ol/proj';

/** How to fit the view: pixel padding, a zoom cap and an animation duration. */
export interface FitViewOptions {
  /** Padding in pixels: top, right, bottom, left. */
  padding?: [number, number, number, number];
  /** Highest zoom level the fit may reach. */
  maxZoom?: number;
  /** Animation duration in milliseconds; `0` or absent jumps. */
  duration?: number;
}

/** An extent and the projection it is given in (default: the view projection). */
export interface ExtentIn {
  extent: Extent;
  projection?: string;
}

/**
 * Fit the map view to an extent once the map has a size: at once when it has one, else on the
 * first `change:size` (a map in a container that is laid out later).
 */
export function fitView(map: OlMap, target: ExtentIn, options: FitViewOptions = {}): void {
  const view = map.getView();
  const code = view.getProjection().getCode();
  const extent =
    target.projection && target.projection !== code
      ? transformExtent(target.extent, target.projection, code)
      : target.extent;
  const apply = () => {
    const size = map.getSize();
    if (!size) return;
    view.fit(extent, {
      size,
      padding: options.padding,
      maxZoom: options.maxZoom,
      duration: options.duration,
    });
  };
  if (map.getSize()) apply();
  else map.once('change:size', apply);
}

/** The extent covering all given extents, or `null` for none. */
export function unionExtents(extents: Extent[]): Extent | null {
  const union = createEmpty();
  for (const extent of extents) extend(union, extent);
  return isEmpty(union) ? null : union;
}
