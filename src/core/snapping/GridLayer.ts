import type { Coordinate } from 'ol/coordinate';
import MultiPoint from 'ol/geom/MultiPoint';
import VectorLayer from 'ol/layer/Vector';
import type OlMap from 'ol/Map';
import { getVectorContext } from 'ol/render';
import type RenderEvent from 'ol/render/Event';
import VectorSource from 'ol/source/Vector';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Style from 'ol/style/Style';
import type { ResolvedGridConfig } from '../config/types';
import { gridPointsInExtent } from '../geometry/grid';

/** Grid dots closer than this (in pixels) are not drawn. */
export const MIN_GRID_PIXELS = 8;
/** Safety cap on the dots drawn per frame. */
const MAX_DOTS = 20000;

/**
 * Draws the grid intersections as dots. An unmanaged layer (`setMap`) that paints on its own
 * `postrender` event, so nothing is added to the host's layer list and nothing is hit-testable.
 */
export class GridLayer {
  private readonly layer = new VectorLayer({ source: new VectorSource() });
  private readonly getConfig: () => ResolvedGridConfig;
  private readonly style: Style;
  private map: OlMap | null = null;

  constructor(getConfig: () => ResolvedGridConfig, color: string) {
    this.getConfig = getConfig;
    this.style = new Style({
      image: new CircleStyle({ radius: 1.5, fill: new Fill({ color }) }),
    });
    this.layer.on('postrender', this.draw);
  }

  /** Show the dots on `map`, or hide them with `null`. */
  attach(map: OlMap | null): void {
    if (map === this.map) return;
    this.map = map;
    this.layer.setMap(map);
  }

  /** Repaint after a configuration change. */
  refresh(): void {
    this.layer.changed();
    this.map?.render();
  }

  private readonly draw = (event: RenderEvent): void => {
    const { visible, spacing, origin } = this.getConfig();
    const frameState = event.frameState;
    if (!visible || !frameState) return;
    const { extent, viewState } = frameState;
    if (!extent || spacing / viewState.resolution < MIN_GRID_PIXELS) return;
    const points = gridPointsInExtent(extent, spacing, origin as Coordinate, MAX_DOTS);
    if (!points || points.length === 0) return;
    const context = getVectorContext(event);
    context.setStyle(this.style);
    context.drawGeometry(new MultiPoint(points));
  };
}
