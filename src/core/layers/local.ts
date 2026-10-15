import type Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import type VectorSource from 'ol/source/Vector';
import { ConfigError, validateLayerConfig } from '../config/validate';
import type { DimensionConfig, FieldConfig, GeometryType, LayerConfig } from '../config/types';

/** Geometry types a local layer may have. */
export const LOCAL_GEOMETRY_TYPES = [
  'Point',
  'LineString',
  'Polygon',
  'MultiPoint',
  'MultiLineString',
  'MultiPolygon',
] as const satisfies readonly GeometryType[];

export type LocalGeometryType = (typeof LOCAL_GEOMETRY_TYPES)[number];

/** What `editor.localLayers.create` takes. */
export interface LocalLayerDefinition {
  title: string;
  geometryType: LocalGeometryType;
  fields: FieldConfig[];
  /**
   * Makes it a dimension layer (`layers[].dimension`), for example `{ preset: 'architecture' }`.
   * Needs `geometryType: 'LineString'`.
   */
  dimension?: boolean | DimensionConfig;
}

/** A local layer as listed: its definition plus id and object count. */
export interface LocalLayerInfo extends LocalLayerDefinition {
  id: string;
  featureCount: number;
}

/** Plain JSON of all local layers; geometries are GeoJSON in EPSG:4326. */
export interface LocalLayersJson {
  version: 1;
  layers: (LocalLayerDefinition & {
    id: string;
    features: { type: 'FeatureCollection'; features: Record<string, unknown>[] };
  })[];
}

export type LocalLayerChange = {
  id: string | null;
  type: 'create' | 'rename' | 'schema' | 'remove' | 'import';
};

/** Thrown by `import` for malformed data; nothing has been changed. */
export class LocalLayerImportError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'LocalLayerImportError';
    this.path = path;
  }
}

/** What the local layer store needs from the editor. */
export interface LocalLayersContext {
  /** Add a layer through the editor (validated, listed in `config.layers`). */
  addLayer(config: LayerConfig): void;
  /** Remove a layer through the editor (selection and history are cleaned up). */
  removeLayer(id: string): void;
  hasLayer(id: string): boolean;
  getSource(id: string): VectorSource;
  setTitle(id: string, title: string): void;
  setFields(id: string, fields: FieldConfig[]): void;
  setLocal(id: string, local: boolean): void;
  /** The view projection, in which features are kept in memory. */
  getProjection(): string;
  emit(change: LocalLayerChange): void;
}

const FIELD_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Layers the user creates in the client: one geometry type and a schema each, fully editable,
 * never in the change set. Kept in memory like the other layers; `export` / `import` give plain
 * JSON so a host (or `persistLocalLayers` of the UI package) can store them in the browser.
 */
export class LocalLayers {
  private readonly definitions = new Map<string, LocalLayerDefinition>();
  private counter = 0;
  private featureCounter = 0;

  private readonly ctx: LocalLayersContext;

  constructor(ctx: LocalLayersContext) {
    this.ctx = ctx;
  }

  has(id: string): boolean {
    return this.definitions.has(id);
  }

  list(): LocalLayerInfo[] {
    return [...this.definitions].map(([id, def]) => this.info(id, def));
  }

  get(id: string): LocalLayerInfo {
    return this.info(id, this.require(id));
  }

  /** Create a layer; returns its id. Throws a `ConfigError` for an invalid definition. */
  create(definition: LocalLayerDefinition): string {
    const def = normalize(definition, 'definition');
    let id: string;
    do id = `local-${++this.counter}`;
    while (this.ctx.hasLayer(id));
    this.add(id, def);
    this.ctx.emit({ id, type: 'create' });
    return id;
  }

  rename(id: string, title: string): void {
    const def = this.require(id);
    const trimmed = title.trim();
    if (!trimmed) throw new ConfigError('title', 'must not be empty');
    if (trimmed === def.title) return;
    def.title = trimmed;
    this.ctx.setTitle(id, trimmed);
    this.ctx.emit({ id, type: 'rename' });
  }

  /**
   * Replace the attributes. `renamed` maps old field names to new ones so the objects keep
   * their values; values of fields that are gone are removed from the objects. These property
   * changes bypass the command history (local layers are not tracked).
   */
  setFields(
    id: string,
    fields: FieldConfig[],
    options: { renamed?: Record<string, string> } = {},
  ): void {
    const def = this.require(id);
    const next = normalize({ ...def, fields }, 'definition').fields;
    const renamed = options.renamed ?? {};
    const keep = new Set(next.map((f) => f.name));
    for (const feature of this.ctx.getSource(id).getFeatures()) {
      const values: Record<string, unknown> = {};
      for (const [from, to] of Object.entries(renamed)) {
        if (from !== to && feature.get(from) !== undefined) values[to] = feature.get(from);
      }
      for (const old of def.fields) {
        if (!keep.has(old.name) && feature.get(old.name) !== undefined)
          feature.unset(old.name, true);
      }
      for (const [from, to] of Object.entries(renamed)) {
        if (from !== to && !keep.has(from)) feature.unset(from, true);
        if (to in values) feature.set(to, values[to], true);
      }
      feature.changed();
    }
    def.fields = next;
    this.ctx.setFields(id, structuredClone(next));
    this.ctx.emit({ id, type: 'schema' });
  }

  /** Remove the layer and its objects. */
  remove(id: string): void {
    this.require(id);
    this.definitions.delete(id);
    this.ctx.removeLayer(id);
    this.ctx.emit({ id, type: 'remove' });
  }

  export(): LocalLayersJson {
    const format = new GeoJSON();
    const featureProjection = this.ctx.getProjection();
    return {
      version: 1,
      layers: [...this.definitions].map(([id, def]) => {
        const collection = format.writeFeaturesObject(this.ctx.getSource(id).getFeatures(), {
          dataProjection: 'EPSG:4326',
          featureProjection,
        });
        return {
          id,
          ...structuredClone(def),
          features: {
            type: 'FeatureCollection' as const,
            features: collection.features as unknown as Record<string, unknown>[],
          },
        };
      }),
    };
  }

  /**
   * Add the layers of `json`; a layer with an id that exists as a local layer replaces it.
   * Everything is validated first. Objects get fresh ids (`loc-<n>`).
   */
  import(json: unknown): void {
    const layers = parse(json);
    for (const layer of layers) {
      if (this.ctx.hasLayer(layer.id) && !this.definitions.has(layer.id)) {
        throw new LocalLayerImportError(
          `layers[${layers.indexOf(layer)}].id`,
          `"${layer.id}" is used by another layer`,
        );
      }
    }
    const format = new GeoJSON();
    const featureProjection = this.ctx.getProjection();
    for (const layer of layers) {
      if (this.definitions.has(layer.id)) {
        this.definitions.delete(layer.id);
        this.ctx.removeLayer(layer.id);
      }
      this.add(layer.id, {
        title: layer.title,
        geometryType: layer.geometryType,
        fields: layer.fields,
        ...(layer.dimension ? { dimension: layer.dimension } : {}),
      });
      const features = format.readFeatures(layer.features, {
        dataProjection: 'EPSG:4326',
        featureProjection,
      }) as Feature[];
      for (const feature of features) feature.setId(`loc-${++this.featureCounter}`);
      this.ctx.getSource(layer.id).addFeatures(features);
      const n = /^local-(\d+)$/.exec(layer.id);
      if (n) this.counter = Math.max(this.counter, Number(n[1]));
    }
    this.ctx.emit({ id: null, type: 'import' });
  }

  /** Forget all local layers without removing them (editor teardown). */
  clear(): void {
    this.definitions.clear();
  }

  private add(id: string, def: LocalLayerDefinition): void {
    this.ctx.addLayer({
      id,
      title: def.title,
      geometryType: def.geometryType,
      source: { features: [] },
      editable: true,
      snappable: true,
      schema: { fields: structuredClone(def.fields) },
      ...(def.dimension ? { dimension: structuredClone(def.dimension) } : {}),
    });
    this.ctx.setLocal(id, true);
    this.definitions.set(id, def);
  }

  private info(id: string, def: LocalLayerDefinition): LocalLayerInfo {
    return {
      id,
      ...structuredClone(def),
      featureCount: this.ctx.getSource(id).getFeatures().length,
    };
  }

  private require(id: string): LocalLayerDefinition {
    const def = this.definitions.get(id);
    if (!def) throw new Error(`Unknown local layer "${id}"`);
    return def;
  }
}

/** Validate a definition and return a trimmed deep copy. Throws `ConfigError`. */
function normalize(definition: LocalLayerDefinition, path: string): LocalLayerDefinition {
  if (!definition || typeof definition !== 'object')
    throw new ConfigError(path, 'expected an object');
  const title = typeof definition.title === 'string' ? definition.title.trim() : '';
  if (!title) throw new ConfigError(`${path}.title`, 'must not be empty');
  if (!(LOCAL_GEOMETRY_TYPES as readonly string[]).includes(definition.geometryType)) {
    throw new ConfigError(
      `${path}.geometryType`,
      `expected one of ${LOCAL_GEOMETRY_TYPES.join(', ')}`,
    );
  }
  if (!Array.isArray(definition.fields))
    throw new ConfigError(`${path}.fields`, 'expected an array');
  const fields = structuredClone(definition.fields).map((field, i) => {
    const name = typeof field?.name === 'string' ? field.name.trim() : '';
    if (!FIELD_NAME.test(name)) {
      throw new ConfigError(
        `${path}.fields[${i}].name`,
        'expected a name of letters, digits and underscores, not starting with a digit',
      );
    }
    if (name === 'geometry') {
      throw new ConfigError(`${path}.fields[${i}].name`, '"geometry" is reserved');
    }
    const copy: FieldConfig = { ...field, name };
    if (typeof copy.label === 'string') {
      const label = copy.label.trim();
      if (label) copy.label = label;
      else delete copy.label;
    }
    return copy;
  });
  const dimension = definition.dimension ? structuredClone(definition.dimension) : undefined;
  // Field types, enum values, uniqueness, dimension settings: the same rules as a configured
  // layer (a dimension layer needs a line geometry type).
  validateLayerConfig(
    {
      id: 'local',
      geometryType: definition.geometryType,
      source: { features: [] },
      schema: { fields },
      ...(dimension ? { dimension } : {}),
    },
    path,
  );
  return {
    title,
    geometryType: definition.geometryType,
    fields,
    ...(dimension ? { dimension } : {}),
  };
}

function parse(json: unknown): (LocalLayerDefinition & {
  id: string;
  features: Record<string, unknown>;
})[] {
  const fail = (path: string, message: string): never => {
    throw new LocalLayerImportError(path, message);
  };
  if (!json || typeof json !== 'object') fail('json', 'expected an object');
  const data = json as Record<string, unknown>;
  if (data.version !== 1) fail('version', 'expected 1');
  if (!Array.isArray(data.layers)) fail('layers', 'expected an array');
  const ids = new Set<string>();
  return (data.layers as unknown[]).map((raw, i) => {
    const path = `layers[${i}]`;
    if (!raw || typeof raw !== 'object') fail(path, 'expected an object');
    const layer = raw as Record<string, unknown>;
    if (typeof layer.id !== 'string' || !layer.id) fail(`${path}.id`, 'expected a string');
    if (ids.has(layer.id as string)) fail(`${path}.id`, `duplicate id "${String(layer.id)}"`);
    ids.add(layer.id as string);
    let def: LocalLayerDefinition;
    try {
      def = normalize(layer as unknown as LocalLayerDefinition, path);
    } catch (error) {
      if (error instanceof ConfigError)
        fail(error.path, error.message.replace(/^Invalid config at [^:]+: /, ''));
      throw error;
    }
    const features = layer.features as Record<string, unknown> | undefined;
    if (!features || features.type !== 'FeatureCollection' || !Array.isArray(features.features)) {
      fail(`${path}.features`, 'expected a GeoJSON FeatureCollection');
    }
    return { id: layer.id as string, ...def!, features: features! };
  });
}
