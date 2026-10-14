import type Feature from 'ol/Feature';
import VectorLayer from 'ol/layer/Vector';
import type VectorSource from 'ol/source/Vector';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';

/** Layer property marking a tool's preview layer (`true`); not an editor layer. */
export const PREVIEW_LAYER_PROPERTY = 'olcad:preview';

/** Feature property marking a vertex marker on a preview layer (`'hover'` or `'picked'`). */
export const PREVIEW_VERTEX_PROPERTY = 'olcad:vertex';

const PREVIEW_COLOR = 'rgba(34, 211, 238, 0.8)';
const PREVIEW_STROKE = new Stroke({ color: PREVIEW_COLOR, width: 2, lineDash: [6, 4] });
const PREVIEW_STYLE = new Style({
  stroke: PREVIEW_STROKE,
  image: new CircleStyle({
    radius: 5,
    stroke: PREVIEW_STROKE,
    fill: new Fill({ color: 'rgba(34, 211, 238, 0.2)' }),
  }),
});
const HOVER_VERTEX_STYLE = new Style({
  image: new CircleStyle({
    radius: 7,
    stroke: new Stroke({ color: PREVIEW_COLOR, width: 2 }),
  }),
  zIndex: 1,
});
const PICKED_VERTEX_STYLE = new Style({
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: PREVIEW_COLOR }),
    stroke: new Stroke({ color: 'rgba(255, 255, 255, 0.9)', width: 1.5 }),
  }),
  zIndex: 2,
});

/**
 * The dashed preview layer tools draw their in-progress result on (the moved objects, the
 * displacement vector, the vertex being placed). Vertex markers are features carrying
 * `PREVIEW_VERTEX_PROPERTY`.
 */
export function createPreviewLayer(
  source: VectorSource<Feature>,
): VectorLayer<VectorSource<Feature>> {
  return new VectorLayer({
    source,
    style: (feature) => {
      const marker = feature.get(PREVIEW_VERTEX_PROPERTY);
      if (marker === 'picked') return PICKED_VERTEX_STYLE;
      if (marker === 'hover') return HOVER_VERTEX_STYLE;
      return PREVIEW_STYLE;
    },
    zIndex: 1001,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
    properties: { [PREVIEW_LAYER_PROPERTY]: true },
  });
}
