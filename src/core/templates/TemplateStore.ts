import type { Coordinate } from 'ol/coordinate';
import type Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import type Geometry from 'ol/geom/Geometry';
import { transform } from 'ol/proj';
import { unitsPerMetre } from '../measure';

/** One object of a template: its source layer, geometry (view projection) and attributes. */
export interface TemplateFeature {
  layer: string;
  geometry: Geometry;
  properties: Record<string, unknown>;
}

/** A named group of objects, stored relative to its base point (view projection). */
export interface Template {
  id: string;
  name: string;
  base: Coordinate;
  features: TemplateFeature[];
}

/** Summary of a template for lists. */
export interface TemplateInfo {
  id: string;
  name: string;
  featureCount: number;
  /** The distinct source layers, in order of first appearance. */
  layers: string[];
}

/** A template as plain JSON (`editor.templates.export()`): GeoJSON geometries in EPSG:4326. */
export interface TemplateJson {
  version: 1;
  id: string;
  name: string;
  crs: 'EPSG:4326';
  /** The base point, `[lon, lat]`. */
  base: [number, number];
  features: { layer: string; geometry: object; properties: Record<string, unknown> }[];
}

export type TemplateChange = { id: string | null; type: 'add' | 'remove' | 'rename' | 'import' };

/** Features of the source to copy into a template: the feature and the layer it belongs to. */
export interface TemplateSource {
  feature: Feature;
  layer: string;
  /** The layer's id property, left out of the copied attributes. */
  idProperty?: string;
}

const EXPORT_CRS = 'EPSG:4326';
const format = new GeoJSON();

/** Error thrown by `import` for malformed input; the message names the offending path. */
export class TemplateImportError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'TemplateImportError';
    this.path = path;
  }
}

/**
 * Named templates for the session: copies of objects relative to a base point, inserted
 * elsewhere later (`placed`). Geometries are kept in the view projection and transformed on a
 * projection switch (`reproject`). Plain JSON exchange through `export` / `import`; the store
 * never persists anything itself.
 */
export class TemplateStore {
  private readonly templates = new Map<string, Template>();
  private nextId = 1;
  private readonly onChange: (change: TemplateChange) => void;

  constructor(onChange: (change: TemplateChange) => void = () => {}) {
    this.onChange = onChange;
  }

  list(): TemplateInfo[] {
    return [...this.templates.values()].map(info);
  }

  /** The template, or `undefined`. Geometries are the stored ones: do not modify them. */
  get(id: string): Template | undefined {
    return this.templates.get(id);
  }

  /** The next free default name: `Template 1`, `Template 2` ... */
  suggestName(): string {
    const names = new Set([...this.templates.values()].map((t) => t.name));
    let n = 1;
    while (names.has(`Template ${n}`)) n++;
    return `Template ${n}`;
  }

  /**
   * Store copies of the objects relative to `base`. Geometries are cloned; attributes are
   * copied without the geometry and the layer's id property. Returns the new id.
   */
  create(sources: TemplateSource[], base: Coordinate, name?: string): string {
    if (sources.length === 0) throw new Error('A template needs at least one object');
    const features: TemplateFeature[] = [];
    for (const { feature, layer, idProperty } of sources) {
      const geometry = feature.getGeometry();
      if (!geometry) continue;
      features.push({
        layer,
        geometry: geometry.clone(),
        properties: copyProperties(feature, idProperty),
      });
    }
    if (features.length === 0)
      throw new Error('A template needs at least one object with a geometry');
    const id = this.freshId();
    const trimmed = name?.trim();
    this.templates.set(id, {
      id,
      name: trimmed ? trimmed : this.suggestName(),
      base: [base[0]!, base[1]!],
      features,
    });
    this.onChange({ id, type: 'add' });
    return id;
  }

  rename(id: string, name: string): void {
    const template = this.require(id);
    const trimmed = name.trim();
    if (!trimmed) throw new Error('A template name must not be empty');
    if (template.name === trimmed) return;
    template.name = trimmed;
    this.onChange({ id, type: 'rename' });
  }

  remove(id: string): void {
    this.require(id);
    this.templates.delete(id);
    this.onChange({ id, type: 'remove' });
  }

  /** Remove every template without events (editor teardown). */
  clear(): void {
    this.templates.clear();
  }

  /** Transform every stored geometry and base point after a view projection switch. */
  reproject(from: string, to: string): void {
    for (const template of this.templates.values()) {
      template.base = transform(template.base, from, to);
      for (const feature of template.features) feature.geometry.transform(from, to);
    }
  }

  /**
   * The template's geometries placed with the base point at `at`: translated, then scaled by
   * the ratio of map units per metre at `at` and at the base, so a template keeps its size in
   * metres when inserted at another latitude in Web Mercator (the ratio is 1 in projected CRS).
   */
  placed(template: Template, at: Coordinate, projection: string): Geometry[] {
    const [bx, by] = template.base as [number, number];
    const ratio = unitsPerMetre(projection, at) / unitsPerMetre(projection, template.base);
    return template.features.map(({ geometry }) => {
      const copy = geometry.clone();
      copy.translate(at[0]! - bx, at[1]! - by);
      if (Number.isFinite(ratio) && Math.abs(ratio - 1) > 1e-12) copy.scale(ratio, ratio, at);
      return copy;
    });
  }

  /** All templates as plain JSON, geometries and base points in EPSG:4326. */
  export(viewProjection: string): TemplateJson[] {
    return [...this.templates.values()].map((template) => {
      const [lon, lat] = transform(template.base, viewProjection, EXPORT_CRS) as [number, number];
      return {
        version: 1,
        id: template.id,
        name: template.name,
        crs: EXPORT_CRS,
        base: [lon, lat],
        features: template.features.map(({ layer, geometry, properties }) => ({
          layer,
          geometry: format.writeGeometryObject(geometry, {
            dataProjection: EXPORT_CRS,
            featureProjection: viewProjection,
          }) as object,
          properties: structuredCloneSafe(properties),
        })),
      };
    });
  }

  /**
   * Add templates from `export` output. The whole input is validated first (errors name the
   * path, nothing is added on error); ids that already exist get a fresh one. Returns the ids.
   */
  import(json: unknown, viewProjection: string): string[] {
    if (!Array.isArray(json)) throw new TemplateImportError('templates', 'expected an array');
    const parsed: Omit<Template, 'id'>[] = [];
    const wanted: unknown[] = [];
    json.forEach((entry: unknown, i) => {
      const path = `templates[${i}]`;
      if (!isObject(entry)) throw new TemplateImportError(path, 'expected an object');
      if (entry.version !== 1) throw new TemplateImportError(`${path}.version`, 'expected 1');
      if (typeof entry.name !== 'string' || !entry.name.trim()) {
        throw new TemplateImportError(`${path}.name`, 'expected a non-empty string');
      }
      if (entry.crs !== undefined && entry.crs !== EXPORT_CRS) {
        throw new TemplateImportError(`${path}.crs`, `expected '${EXPORT_CRS}'`);
      }
      const base = entry.base;
      if (!Array.isArray(base) || base.length !== 2 || !base.every((n) => Number.isFinite(n))) {
        throw new TemplateImportError(`${path}.base`, 'expected [lon, lat]');
      }
      if (!Array.isArray(entry.features) || entry.features.length === 0) {
        throw new TemplateImportError(`${path}.features`, 'expected a non-empty array');
      }
      const features = entry.features.map((f: unknown, j: number) => {
        const fpath = `${path}.features[${j}]`;
        if (!isObject(f)) throw new TemplateImportError(fpath, 'expected an object');
        if (typeof f.layer !== 'string') {
          throw new TemplateImportError(`${fpath}.layer`, 'expected a string');
        }
        if (f.properties !== undefined && !isObject(f.properties)) {
          throw new TemplateImportError(`${fpath}.properties`, 'expected an object');
        }
        let geometry: Geometry | null;
        try {
          geometry = format.readGeometry(f.geometry, {
            dataProjection: EXPORT_CRS,
            featureProjection: viewProjection,
          });
        } catch {
          throw new TemplateImportError(`${fpath}.geometry`, 'expected a GeoJSON geometry');
        }
        if (!geometry)
          throw new TemplateImportError(`${fpath}.geometry`, 'expected a GeoJSON geometry');
        return {
          layer: f.layer,
          geometry,
          properties: structuredCloneSafe((f.properties as Record<string, unknown>) ?? {}),
        };
      });
      parsed.push({
        name: entry.name.trim(),
        base: transform(base as number[], EXPORT_CRS, viewProjection),
        features,
      });
      wanted.push(entry.id);
    });
    const ids = parsed.map((template, i) => {
      const requested = wanted[i];
      const id =
        typeof requested === 'string' && requested && !this.templates.has(requested)
          ? requested
          : this.freshId();
      this.templates.set(id, { id, ...template });
      return id;
    });
    this.onChange({ id: null, type: 'import' });
    return ids;
  }

  private freshId(): string {
    let id: string;
    do id = `tpl-${this.nextId++}`;
    while (this.templates.has(id));
    return id;
  }

  private require(id: string): Template {
    const template = this.templates.get(id);
    if (!template) throw new Error(`Unknown template "${id}"`);
    return template;
  }
}

/**
 * A deep copy of a feature's attributes for a new object: without the geometry and without the
 * layer's id property (the copy gets its own id on insert).
 */
export function copyProperties(feature: Feature, idProperty?: string): Record<string, unknown> {
  const properties = { ...feature.getProperties() };
  delete properties[feature.getGeometryName()];
  if (idProperty) delete properties[idProperty];
  return structuredCloneSafe(properties);
}

function info(template: Template): TemplateInfo {
  return {
    id: template.id,
    name: template.name,
    featureCount: template.features.length,
    layers: [...new Set(template.features.map((f) => f.layer))],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A deep copy of plain attribute values; values that cannot be cloned are kept as they are. */
function structuredCloneSafe<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return value;
  }
}
