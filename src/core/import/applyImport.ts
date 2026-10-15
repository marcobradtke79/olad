import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import { composite, insertFeature, type Command } from '../changes/commands';
import type { FieldConfig, ResolvedLayerConfig } from '../config/types';
import type { LocalLayerDefinition } from '../layers/local';
import { defaultProperties, wrapForLayer } from '../tools/draw';
import type { ImportGroup, ImportPreview } from './readImport';

/** Where the objects of one group go. */
export type ImportTarget =
  { type: 'new'; title?: string } | { type: 'layer'; id: string } | { type: 'skip' };

export interface ImportResult {
  /** Local layers created for the import. */
  created: string[];
  /** Objects inserted. */
  inserted: number;
  /** Objects not imported: no usable geometry, invalid geometry, or a skipped group. */
  skipped: number;
  /** Attribute names left out because the target layer's schema lacks them. */
  droppedAttributes: string[];
}

/** What the import needs from the editor. */
export interface ImportContext {
  listLayers(): { id: string }[];
  getConfig(id: string): ResolvedLayerConfig;
  canInsert(id: string): boolean;
  createLocalLayer(definition: LocalLayerDefinition): string;
  removeLocalLayer(id: string): void;
  execute(command: Command): boolean;
}

/**
 * The layers that can take every object of `group`: insert allowed and the same geometry type,
 * its multi-part form, or `Any`.
 */
export function importTargets(ctx: ImportContext, group: ImportGroup): string[] {
  return ctx
    .listLayers()
    .map((l) => l.id)
    .filter((id) => {
      if (!ctx.canInsert(id) || ctx.getConfig(id).dimension) return false;
      const type = ctx.getConfig(id).geometryType;
      return type === group.geometryType || type === 'Any' || type === `Multi${group.geometryType}`;
    });
}

/**
 * Insert the groups of `preview` into their targets (default: a new local layer named after
 * the group) as one composite command. Throws when a target cannot take a group or validation
 * rejects the command; local layers created for it are removed again then.
 */
export function applyImport(
  ctx: ImportContext,
  preview: ImportPreview,
  targets: Record<string, ImportTarget> = {},
): ImportResult {
  const result: ImportResult = {
    created: [],
    inserted: 0,
    skipped: preview.skipped,
    droppedAttributes: [],
  };
  const dropped = new Set<string>();
  const commands: Command[] = [];
  const plans: { group: ImportGroup; target: ImportTarget }[] = preview.groups.map((group) => ({
    group,
    target: targets[group.key] ?? { type: 'new' },
  }));
  // Check every existing target before anything is created.
  for (const { group, target } of plans) {
    if (target.type === 'layer' && !importTargets(ctx, group).includes(target.id)) {
      throw new Error(
        `Layer "${target.id}" cannot take the ${group.geometryType} objects of "${group.name}"`,
      );
    }
  }
  try {
    for (const { group, target } of plans) {
      result.skipped += group.invalid;
      if (target.type === 'skip' || group.features.length === 0) {
        result.skipped += target.type === 'skip' ? group.features.length : 0;
        continue;
      }
      if (target.type === 'new') {
        const id = ctx.createLocalLayer({
          title: target.title?.trim() || group.name,
          geometryType: group.geometryType,
          fields: group.fields.map((f) => ({ ...f })),
        });
        result.created.push(id);
        for (const source of group.features)
          commands.push(insertFeature(id, copy(source), { imported: true }));
      } else {
        const config = ctx.getConfig(target.id);
        const fields = new Map<string, FieldConfig>(
          (config.schema?.fields ?? []).map((f) => [f.name, f]),
        );
        for (const source of group.features) {
          const feature = new Feature(defaultProperties(config));
          for (const [key, value] of Object.entries(source.getProperties())) {
            if (key === source.getGeometryName()) continue;
            const field = fields.get(key);
            if (!field) {
              dropped.add(key);
              continue;
            }
            feature.set(key, coerce(value, field));
          }
          feature.setGeometry(
            wrapForLayer((source.getGeometry() as Geometry).clone(), config.geometryType),
          );
          commands.push(insertFeature(target.id, feature, { imported: true }));
        }
      }
    }
    if (commands.length > 0) {
      const command = commands.length === 1 ? commands[0]! : composite(commands, 'import');
      if (!ctx.execute(command)) throw new Error('The import was rejected by validation');
    }
  } catch (error) {
    for (const id of result.created) ctx.removeLocalLayer(id);
    throw error;
  }
  result.inserted = commands.length;
  result.droppedAttributes = [...dropped];
  return result;
}

function copy(source: Feature): Feature {
  const feature = source.clone();
  feature.setId(undefined);
  return feature;
}

/** A file value for a schema field: numbers and booleans from text where the field wants them. */
function coerce(value: unknown, field: FieldConfig): unknown {
  if ((field.type === 'number' || field.type === 'integer') && typeof value === 'string') {
    const n = Number(value);
    return value.trim() !== '' && Number.isFinite(n) ? n : value;
  }
  if (field.type === 'boolean' && typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return value;
}
