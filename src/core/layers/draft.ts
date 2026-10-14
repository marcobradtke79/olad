import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import { composite, deleteFeature, insertFeature, type Command } from '../changes/commands';
import type { GeometryType, ResolvedLayerConfig } from '../config/types';
import { copyProperties } from '../templates/TemplateStore';
import { defaultProperties, wrapForLayer } from '../tools/draw';
import type { LayerManager } from './LayerManager';

/**
 * Whether a layer of `layerType` takes `geometry`: the same type, the single part of a
 * multi-part layer's type (it is wrapped on the move), or any type on an `Any` layer.
 */
export function layerAcceptsGeometry(layerType: GeometryType, geometry: Geometry): boolean {
  if (layerType === 'Any') return true;
  const type = geometry.getType();
  return type === layerType || `Multi${type}` === layerType;
}

/** What the draft move needs from the editor. */
export interface DraftMoveContext {
  layers: Pick<LayerManager, 'list' | 'has' | 'canEdit' | 'getConfig' | 'layerOf'>;
  getDraftLayer(): string | null;
}

/**
 * The layers a draft object can be moved to, in layer order: every layer except the draft
 * layer that allows `insert` and takes the object's geometry. Empty for a feature that is not
 * in the draft layer or has no geometry.
 */
export function draftTargets(ctx: DraftMoveContext, feature: Feature): string[] {
  const draft = ctx.getDraftLayer();
  const geometry = feature.getGeometry();
  if (!draft || !geometry || ctx.layers.layerOf(feature) !== draft) return [];
  return ctx.layers
    .list()
    .map((info) => info.id)
    .filter(
      (id) =>
        id !== draft &&
        ctx.layers.canEdit(id, 'insert') &&
        layerAcceptsGeometry(ctx.layers.getConfig(id).geometryType, geometry),
    );
}

/**
 * One composite command moving draft objects into `layerId`: it deletes them from the draft
 * layer and inserts a copy of each into the target, with the target's schema defaults under the
 * object's own attributes (a template copy brings its attributes along), wrapped for a
 * multi-part layer. Objects the layer does not take (`draftTargets`) are left out; `null` when
 * none is left. `features` are the copies and `sources` the moved draft objects, in order.
 */
export function moveDraftsCommand(
  ctx: DraftMoveContext,
  features: Feature[],
  layerId: string,
): { command: Command; features: Feature[]; sources: Feature[] } | null {
  const sources = features.filter((f) => draftTargets(ctx, f).includes(layerId));
  if (sources.length === 0) return null;
  const draft = ctx.getDraftLayer()!;
  const idProperty = ctx.layers.getConfig(draft).idProperty;
  const target: ResolvedLayerConfig = ctx.layers.getConfig(layerId);
  const copies = sources.map(
    (source) =>
      new Feature({
        ...defaultProperties(target),
        ...copyProperties(source, idProperty),
        geometry: wrapForLayer(source.getGeometry()!.clone(), target.geometryType),
      }),
  );
  return {
    command: composite(
      [...sources.map(deleteFeature), ...copies.map((copy) => insertFeature(layerId, copy))],
      'move draft',
    ),
    features: copies,
    sources,
  };
}
