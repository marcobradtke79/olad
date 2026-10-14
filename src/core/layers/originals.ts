import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';

export interface OriginalGeometry {
  /** Projection code the stored coordinates are in (the layer's data projection at load time). */
  projection: string;
  /** Geometry as loaded, never transformed. */
  geometry: Geometry;
}

/**
 * Remembers each loaded feature's geometry in its data projection so that
 * projection round trips and change-set export do not degrade untouched coordinates.
 */
export class OriginalStore {
  private readonly originals = new WeakMap<Feature, OriginalGeometry>();

  set(feature: Feature, projection: string, geometry: Geometry): void {
    this.originals.set(feature, { projection, geometry });
  }

  get(feature: Feature): OriginalGeometry | undefined {
    return this.originals.get(feature);
  }

  delete(feature: Feature): void {
    this.originals.delete(feature);
  }
}
