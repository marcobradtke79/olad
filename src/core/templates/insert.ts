import type { Coordinate } from 'ol/coordinate';
import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import { composite, insertFeature, type Command } from '../changes/commands';
import type { ResolvedLayerConfig } from '../config/types';
import type { LayerManager } from '../layers/LayerManager';
import { defaultProperties, drawType, wrapForLayer } from '../tools/draw';
import type { Template, TemplateFeature, TemplateStore } from './TemplateStore';

/** What the target rule needs from the editor. */
export interface TemplateTargetContext {
  layers: Pick<LayerManager, 'has' | 'canEdit' | 'getConfig'>;
  getActiveLayer(): string | null;
  getDraftLayer(): string | null;
}

export interface TemplateTarget {
  layerId: string;
  layer: ResolvedLayerConfig;
}

/**
 * The layer a template object is inserted into: the layer it was copied from, else the active
 * layer, else the draft layer, the first that exists, allows `insert` and takes the geometry
 * type (the offset tool's rule). `null` when none fits.
 */
export function templateTarget(
  ctx: TemplateTargetContext,
  feature: Pick<TemplateFeature, 'layer' | 'geometry'>,
): TemplateTarget | null {
  const wanted = drawType(feature.geometry.getType() as Parameters<typeof drawType>[0]);
  const fits = (layerId: string | null | undefined): TemplateTarget | null => {
    if (!layerId || !ctx.layers.has(layerId) || !ctx.layers.canEdit(layerId, 'insert')) {
      return null;
    }
    const layer = ctx.layers.getConfig(layerId);
    const type = drawType(layer.geometryType);
    return type === null || type === wanted ? { layerId, layer } : null;
  };
  return fits(feature.layer) ?? fits(ctx.getActiveLayer()) ?? fits(ctx.getDraftLayer());
}

/** Whether at least one object of the template has a layer to go to. */
export function canInsertTemplate(ctx: TemplateTargetContext, template: Template): boolean {
  return template.features.some((feature) => templateTarget(ctx, feature) !== null);
}

/**
 * One composite command inserting a copy of the template with its base point at `at`, and
 * the new features. Each object goes to its target layer (`templateTarget`) with the layer's
 * schema defaults under its copied attributes, wrapped for multi-part layers; objects without
 * a target are skipped. `null` when no object fits anywhere.
 */
export function templateInsertCommand(
  ctx: TemplateTargetContext & { getProjection(): string },
  store: Pick<TemplateStore, 'placed'>,
  template: Template,
  at: Coordinate,
): { command: Command; features: Feature[] } | null {
  const placed = store.placed(template, at, ctx.getProjection());
  const commands: Command[] = [];
  const features: Feature[] = [];
  template.features.forEach((source, i) => {
    const target = templateTarget(ctx, source);
    if (!target) return;
    const geometry: Geometry = wrapForLayer(placed[i]!, target.layer.geometryType);
    const feature = new Feature({
      ...defaultProperties(target.layer),
      ...structuredCopy(source.properties),
      geometry,
    });
    features.push(feature);
    commands.push(insertFeature(target.layerId, feature, { template: template.id }));
  });
  if (commands.length === 0) return null;
  return { command: composite(commands, 'template'), features };
}

function structuredCopy(properties: Record<string, unknown>): Record<string, unknown> {
  try {
    return structuredClone(properties);
  } catch {
    return { ...properties };
  }
}
