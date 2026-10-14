import Collection from 'ol/Collection';
import type Feature from 'ol/Feature';
import Geometry from 'ol/geom/Geometry';
import GeometryCollection from 'ol/geom/GeometryCollection';
import MultiPoint from 'ol/geom/MultiPoint';
import Point from 'ol/geom/Point';
import type { FeatureLike } from 'ol/Feature';
import VectorLayer from 'ol/layer/Vector';
import type OlMap from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import RegularShape from 'ol/style/RegularShape';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import type { ResolvedSelectionConfig } from '../config/types';

/** Layer property marking the highlight overlay (`true`). */
export const HIGHLIGHT_LAYER_PROPERTY = 'olcad:highlight';

/** Every vertex of a geometry (rings without their closing copy), for the grip markers. */
export function vertexPoints(geometry: Geometry | undefined): MultiPoint | null {
  if (!geometry || geometry instanceof Point) return null;
  const points: number[][] = [];
  const walk = (g: Geometry): void => {
    if (g instanceof GeometryCollection) {
      g.getGeometriesArray().forEach(walk);
      return;
    }
    if (g instanceof Point) {
      points.push(g.getCoordinates());
      return;
    }
    if (g instanceof MultiPoint) {
      points.push(...g.getCoordinates());
      return;
    }
    const type = g.getType();
    const coordinates = (g as unknown as { getCoordinates(): unknown }).getCoordinates();
    if (type === 'LineString') points.push(...(coordinates as number[][]));
    else if (type === 'MultiLineString' || type === 'Polygon') {
      for (const part of coordinates as number[][][]) points.push(...ring(part, type));
    } else if (type === 'MultiPolygon') {
      for (const polygon of coordinates as number[][][][]) {
        for (const part of polygon) points.push(...ring(part, 'Polygon'));
      }
    }
  };
  walk(geometry);
  return points.length ? new MultiPoint(points) : null;
}

function ring(part: number[][], type: string): number[][] {
  return type === 'Polygon' ? part.slice(0, -1) : part;
}

/**
 * The CAD-like highlight drawn over selected features: a halo under the main stroke, a light
 * fill, square grips on every vertex and a ringed circle for points. Pure: the style array is
 * built once from the configuration.
 */
export function createHighlightStyle(config: ResolvedSelectionConfig): Style[] {
  const stroke = new Stroke({ color: config.strokeColor, width: config.strokeWidth });
  const fill = new Fill({ color: config.fillColor });
  const halo =
    config.haloWidth > 0
      ? new Stroke({ color: config.haloColor, width: config.strokeWidth + 2 * config.haloWidth })
      : null;
  const styles: Style[] = [];
  if (halo) {
    styles.push(
      new Style({
        stroke: halo,
        image: new CircleStyle({
          radius: config.pointRadius + config.haloWidth,
          fill: new Fill({ color: config.haloColor }),
        }),
        zIndex: 0,
      }),
    );
  }
  styles.push(
    new Style({
      stroke,
      fill,
      image: new CircleStyle({ radius: config.pointRadius, stroke, fill }),
      zIndex: 1,
    }),
  );
  if (config.vertexSize > 0) {
    styles.push(
      new Style({
        image: new RegularShape({
          points: 4,
          radius: config.vertexSize / Math.SQRT2,
          angle: Math.PI / 4,
          fill: new Fill({ color: config.strokeColor }),
          stroke: new Stroke({ color: config.haloColor, width: 1 }),
        }),
        geometry: (feature: FeatureLike) => {
          const geometry = feature.getGeometry();
          return (geometry instanceof Geometry ? vertexPoints(geometry) : null) ?? undefined;
        },
        zIndex: 2,
      }),
    );
  }
  return styles;
}

/**
 * The selected features. Shared by every tool: the select tool fills it, modify, move and
 * delete act on it. Selected features are drawn a second time on a highlight layer above
 * everything else (`createHighlightStyle`); their own style is untouched. `onChange` fires once
 * per batch of changes (microtask), with the current selection.
 */
export class Selection {
  readonly collection = new Collection<Feature>();
  /** The overlay drawing the highlight; not an editor layer, so tools and snapping ignore it. */
  readonly layer: VectorLayer<VectorSource<Feature>>;
  private readonly map: OlMap;
  private readonly onChange: (features: Feature[]) => void;
  private pending = false;

  constructor(
    map: OlMap,
    config: ResolvedSelectionConfig,
    onChange: (features: Feature[]) => void,
  ) {
    this.map = map;
    this.onChange = onChange;
    this.layer = new VectorLayer({
      source: new VectorSource({ features: this.collection }),
      style: createHighlightStyle(config),
      zIndex: 1000,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      properties: { [HIGHLIGHT_LAYER_PROPERTY]: true },
    });
    map.addLayer(this.layer);
    this.collection.on('add', () => this.schedule());
    this.collection.on('remove', () => this.schedule());
  }

  get(): Feature[] {
    return this.collection.getArray().slice();
  }

  has(feature: Feature): boolean {
    return this.collection.getArray().includes(feature);
  }

  set(features: Feature[]): void {
    this.collection.clear();
    for (const feature of features) if (!this.has(feature)) this.collection.push(feature);
  }

  add(feature: Feature): void {
    if (!this.has(feature)) this.collection.push(feature);
  }

  remove(feature: Feature): void {
    this.collection.remove(feature);
  }

  clear(): void {
    this.collection.clear();
  }

  /** Drop every selected feature for which `keep` is false (for example after a discard). */
  prune(keep: (feature: Feature) => boolean): void {
    for (const feature of this.get()) if (!keep(feature)) this.collection.remove(feature);
  }

  destroy(): void {
    this.clear();
    this.map.removeLayer(this.layer);
  }

  private schedule(): void {
    if (this.pending) return;
    this.pending = true;
    queueMicrotask(() => {
      this.pending = false;
      this.onChange(this.get());
    });
  }
}
