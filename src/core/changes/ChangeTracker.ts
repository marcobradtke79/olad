import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import type SimpleGeometry from 'ol/geom/SimpleGeometry';

/** A feature's state before its first change, in the view projection. */
export interface Snapshot {
  geometry: Geometry | null;
  properties: Record<string, unknown>;
}

export interface TrackedEntry {
  layer: string;
  inserted: boolean;
  deleted: boolean;
  tempId?: string;
  snapshot: Snapshot;
}

export type NetOperation = 'insert' | 'update' | 'delete' | null;

/** User properties of a feature: everything except the geometry. */
export function featureProperties(feature: Feature): Record<string, unknown> {
  const properties = { ...feature.getProperties() };
  delete properties[feature.getGeometryName()];
  return properties;
}

export function geometriesEqual(
  a: Geometry | null | undefined,
  b: Geometry | null | undefined,
): boolean {
  if (!a || !b) return !a && !b;
  if (a.getType() !== b.getType()) return false;
  const ca = (a as SimpleGeometry).getCoordinates?.();
  const cb = (b as SimpleGeometry).getCoordinates?.();
  if (ca === undefined || cb === undefined) return a === b;
  return JSON.stringify(ca) === JSON.stringify(cb);
}

export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined || a === null || b === null) return false;
  if (typeof a === 'object' && typeof b === 'object')
    return JSON.stringify(a) === JSON.stringify(b);
  return false;
}

/**
 * Remembers every feature touched since the last `accept` / `discard`: whether it was inserted
 * or deleted and a snapshot of its original state. The net change of a feature is derived from
 * these facts and its current state, which is what makes repeated edits collapse.
 */
export class ChangeTracker {
  private readonly entries = new Map<Feature, TrackedEntry>();

  entry(feature: Feature): TrackedEntry | undefined {
    return this.entries.get(feature);
  }

  /** Snapshot the feature on first touch. Returns the entry. */
  touch(feature: Feature, layer: string): TrackedEntry {
    let entry = this.entries.get(feature);
    if (!entry) {
      entry = {
        layer,
        inserted: false,
        deleted: false,
        snapshot: {
          geometry: feature.getGeometry()?.clone() ?? null,
          properties: featureProperties(feature),
        },
      };
      this.entries.set(feature, entry);
    }
    return entry;
  }

  markInserted(feature: Feature, layer: string, tempId: string): void {
    const entry = this.touch(feature, layer);
    entry.inserted = true;
    entry.deleted = false;
    entry.tempId = tempId;
  }

  /** Undo of an insert: the feature was never there. */
  unmarkInserted(feature: Feature): void {
    this.entries.delete(feature);
  }

  markDeleted(feature: Feature, layer: string): void {
    this.touch(feature, layer).deleted = true;
  }

  unmarkDeleted(feature: Feature): void {
    const entry = this.entries.get(feature);
    if (entry) entry.deleted = false;
  }

  netOperation(feature: Feature): NetOperation {
    const entry = this.entries.get(feature);
    if (!entry) return null;
    if (entry.inserted) return entry.deleted ? null : 'insert';
    if (entry.deleted) return 'delete';
    return this.changedKeys(feature).length > 0 ? 'update' : null;
  }

  /** `'geometry'` and the names of properties that differ from the snapshot. */
  changedKeys(feature: Feature): string[] {
    const entry = this.entries.get(feature);
    if (!entry) return [];
    const keys: string[] = [];
    if (!geometriesEqual(entry.snapshot.geometry, feature.getGeometry())) keys.push('geometry');
    const current = featureProperties(feature);
    const names = new Set([...Object.keys(entry.snapshot.properties), ...Object.keys(current)]);
    for (const name of names) {
      if (!valuesEqual(entry.snapshot.properties[name], current[name])) keys.push(name);
    }
    return keys;
  }

  isTouched(feature: Feature): boolean {
    return this.entries.has(feature);
  }

  isGeometryModified(feature: Feature): boolean {
    const entry = this.entries.get(feature);
    if (!entry) return false;
    return entry.inserted || !geometriesEqual(entry.snapshot.geometry, feature.getGeometry());
  }

  isDeletedId(layer: string, id: string | number): boolean {
    for (const [feature, entry] of this.entries) {
      if (entry.layer === layer && entry.deleted && !entry.inserted && feature.getId() === id) {
        return true;
      }
    }
    return false;
  }

  /** Every tracked feature with its entry, in first-touch order. */
  all(): [Feature, TrackedEntry][] {
    return [...this.entries];
  }

  hasChanges(): boolean {
    for (const feature of this.entries.keys()) if (this.netOperation(feature)) return true;
    return false;
  }

  /** Put a feature back into its snapshot state. */
  restore(feature: Feature): void {
    const entry = this.entries.get(feature);
    if (!entry) return;
    feature.setGeometry(entry.snapshot.geometry?.clone() ?? undefined);
    for (const name of Object.keys(featureProperties(feature))) {
      if (!(name in entry.snapshot.properties)) feature.unset(name);
    }
    feature.setProperties({ ...entry.snapshot.properties });
  }

  /** Transform all snapshot geometries when the view projection changes. */
  reproject(from: string, to: string): void {
    for (const entry of this.entries.values()) entry.snapshot.geometry?.transform(from, to);
  }

  dropLayer(layer: string): void {
    for (const [feature, entry] of this.entries) {
      if (entry.layer === layer) this.entries.delete(feature);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}
