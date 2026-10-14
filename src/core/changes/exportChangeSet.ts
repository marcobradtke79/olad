import type Feature from 'ol/Feature';
import GeoJSON, { type GeoJSONGeometry } from 'ol/format/GeoJSON';
import type { ResolvedChangesConfig } from '../config/types';
import { featureProperties, type ChangeTracker } from './ChangeTracker';

export interface InsertChange {
  op: 'insert';
  layer: string;
  /** Projection of `geometry`. */
  crs: string;
  tempId: string;
  geometry: GeoJSONGeometry | null;
  properties: Record<string, unknown>;
}

export interface UpdateChange {
  op: 'update';
  layer: string;
  crs: string;
  id: string | number;
  /** Present when the geometry changed (always with `fullFeatures`). */
  geometry?: GeoJSONGeometry | null;
  /** Changed properties only (all with `fullFeatures`). Removed properties are `null`. */
  properties?: Record<string, unknown>;
  /** `'geometry'` and the names of changed properties. */
  changed: string[];
}

export interface DeleteChange {
  op: 'delete';
  layer: string;
  crs: string;
  id: string | number;
}

export type Change = InsertChange | UpdateChange | DeleteChange;

export interface ChangeSet {
  version: 1;
  /** Set when every change has the same `crs`. */
  crs?: string;
  changes: Change[];
}

export interface ExportContext {
  tracker: ChangeTracker;
  /** The projection to export a layer's geometries in (its data projection). */
  dataProjection(layer: string): string;
  viewProjection: string;
  options: ResolvedChangesConfig;
}

/** Plain-data copy of properties: drops functions and `undefined`, like `JSON.stringify` would. */
function plain(properties: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(properties)) as Record<string, unknown>;
}

/** Derive the net changes of every tracked feature. The result survives `JSON.stringify`. */
export function exportChangeSet(ctx: ExportContext): ChangeSet {
  const format = new GeoJSON();
  const geometryOf = (feature: Feature, crs: string): GeoJSONGeometry | null => {
    const geometry = feature.getGeometry();
    if (!geometry) return null;
    return format.writeGeometryObject(geometry, {
      dataProjection: crs,
      featureProjection: ctx.viewProjection,
      decimals: ctx.options.precision,
    });
  };

  const changes: Change[] = [];
  for (const [feature, entry] of ctx.tracker.all()) {
    const op = ctx.tracker.netOperation(feature);
    if (!op) continue;
    const crs = ctx.options.crs ?? ctx.dataProjection(entry.layer);
    const base = { layer: entry.layer, crs };
    if (op === 'insert') {
      changes.push({
        op,
        ...base,
        tempId: entry.tempId!,
        geometry: geometryOf(feature, crs),
        properties: plain(featureProperties(feature)),
      });
    } else if (op === 'delete') {
      changes.push({ op, ...base, id: feature.getId()! });
    } else {
      const changed = ctx.tracker.changedKeys(feature);
      const current = featureProperties(feature);
      const names = ctx.options.fullFeatures
        ? Object.keys(current)
        : changed.filter((key) => key !== 'geometry');
      const properties: Record<string, unknown> = {};
      for (const name of names)
        properties[name] = current[name] === undefined ? null : current[name];
      const change: UpdateChange = { op, ...base, id: feature.getId()!, changed };
      if (ctx.options.fullFeatures || changed.includes('geometry')) {
        change.geometry = geometryOf(feature, crs);
      }
      if (ctx.options.fullFeatures || names.length > 0) change.properties = plain(properties);
      changes.push(change);
    }
  }

  const set: ChangeSet = { version: 1, changes };
  const first = changes[0]?.crs;
  if (first !== undefined && changes.every((c) => c.crs === first)) set.crs = first;
  return set;
}
