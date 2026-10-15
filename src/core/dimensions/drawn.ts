import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import Point from 'ol/geom/Point';
import type Style from 'ol/style/Style';
import type { ResolvedDimensionConfig } from '../config/types';
import type { Locale } from '../i18n';
import { dimensionStyleFunction } from '../layers/dimension';

/** A resolution so small that every value is drawn (texts are left out below one pixel). */
const EVERYTHING = 1e-9;

/**
 * Dimensions as drawn, for export to CAD or print: each dimension object becomes its parts —
 * `part: 'line'` (dimension, extension and leader lines, arcs), `'terminator'` (arrow heads),
 * `'mark'` (dots, level marks, the running origin) and `'text'` (a point with `text`,
 * `rotation` in degrees counter-clockwise, `height` in metres on the ground and `align`) —
 * each carrying the source object's `dimension` id and `dimType`. Other objects are kept as
 * they are. Geometries are copies in the view projection.
 */
export function drawnDimensions(
  features: Feature[],
  config: ResolvedDimensionConfig,
  projection: string,
  locale: Locale = 'en',
): Feature[] {
  const style = dimensionStyleFunction(config, {}, () => projection, locale);
  const height = (config.textSize / 1000) * config.referenceScale;
  const out: Feature[] = [];
  for (const feature of features) {
    const drawn = style(feature, EVERYTHING);
    // Not drawn as a dimension (an object the dimension style does not take): exported as it is.
    if (!Array.isArray(drawn) || drawn.length === 0 || !isDimensionDrawing(drawn as Style[])) {
      out.push(feature);
      continue;
    }
    const source = {
      dimension: feature.getId() ?? null,
      dimType: feature.get('dimType') ?? 'aligned',
    };
    for (const part of drawn as Style[]) {
      const geometry = part.getGeometry() as Geometry | null;
      if (!geometry || typeof (geometry as Geometry).clone !== 'function') continue;
      const text = part.getText();
      if (text && geometry instanceof Point) {
        out.push(
          new Feature({
            geometry: geometry.clone(),
            part: 'text',
            text: text.getText(),
            rotation: Math.round(((-(text.getRotation() ?? 0) * 180) / Math.PI) * 1e6) / 1e6,
            height,
            align: text.getTextAlign() ?? 'center',
            ...source,
          }),
        );
        continue;
      }
      const type = geometry.getType();
      const kind = part.getImage() ? 'mark' : type.endsWith('Polygon') ? 'terminator' : 'line';
      out.push(new Feature({ geometry: geometry.clone(), part: kind, ...source }));
    }
  }
  return out;
}

/** Whether the styles are a dimension's parts (each with its own geometry), not a base style. */
function isDimensionDrawing(styles: Style[]): boolean {
  return styles.every((part) => {
    const geometry = part.getGeometry();
    return geometry !== null && typeof geometry === 'object' && 'getType' in geometry;
  });
}
