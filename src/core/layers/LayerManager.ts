import type Feature from 'ol/Feature';
import type OlMap from 'ol/Map';
import type BaseLayer from 'ol/layer/Base';
import { isEmpty, type Extent } from 'ol/extent';
import { transformExtent } from 'ol/proj';
import type VectorLayer from 'ol/layer/Vector';
import type VectorSource from 'ol/source/Vector';
import type {
  FieldConfig,
  EditOperation,
  EditableConfig,
  GeometryType,
  LayerConfig,
  ResolvedEditableConfig,
  ResolvedLayerConfig,
  ResolvedLayerHighlightConfig,
} from '../config/types';
import { resolveEditable, resolveLayer } from '../config/defaults';
import { validateLayerConfig } from '../config/validate';
import type { Locale } from '../i18n';
import { createLayerHighlight } from './highlight';
import { OriginalStore } from './originals';
import {
  flatFromStyle,
  parseColor,
  styleFromFlat,
  StyleError,
  validateStyle,
  type LayerStyle,
} from './style';
import {
  createVectorLayer,
  DATA_PROJECTION_PROPERTY,
  DEFAULT_STYLES,
  vectorLayerStyle,
} from './vector';

export interface LayerInfo {
  id: string;
  title: string;
  visible: boolean;
  geometryType: GeometryType;
  editable: { insert: boolean; update: boolean; delete: boolean };
  snappable: boolean;
  /** Features currently loaded. */
  featureCount: number;
  /** Whether this is the active layer (target of inserts). */
  active: boolean;
  /** Whether all its objects are highlighted (`setHighlighted`). */
  highlighted: boolean;
  /** The projection its data is exchanged in (configured, else detected, else `EPSG:4326`). */
  dataProjection: string;
  /** Whether the user created it in the client (`editor.localLayers`); never in the change set. */
  local: boolean;
}

const DEFAULT_HIGHLIGHT: ResolvedLayerHighlightConfig = {
  strokeColor: '#f59e0b',
  strokeWidth: 3,
  fillColor: 'rgba(245, 158, 11, 0.2)',
  pointRadius: 7,
};

/** What changed about a layer (`layerchange`). */
export type LayerChangeType =
  | 'add'
  | 'remove'
  | 'visible'
  | 'editable'
  | 'snappable'
  | 'highlight'
  | 'title'
  | 'schema'
  | 'style'
  | 'order';

export interface LayerManagerEvents {
  /** `raster`: the change concerns an overlay registered with `attachRaster` (its style). */
  onChange(event: { id: string; type: LayerChangeType; raster?: true }): void;
  onLoad(event: { id: string; features: Feature[] }): void;
  onError(event: { id: string; error: Error }): void;
  onActiveChange(event: { id: string | null }): void;
  /** Veto for loaded features by id (see `VectorLayerContext.shouldLoad`). */
  shouldLoad?(layerId: string, featureId: string | number): boolean;
}

interface Entry {
  config: ResolvedLayerConfig;
  layer: VectorLayer<VectorSource<Feature>>;
  /** The highlight overlay while the layer is highlighted. */
  highlight?: VectorLayer<VectorSource<Feature>>;
  /** The user's style (`setStyle`), replacing the configured one; absent: configured. */
  style?: LayerStyle;
}

/** A raster overlay in the shared drawing order; its user style is opacity and zoom range. */
interface RasterEntry {
  layer: BaseLayer;
  /** The configured opacity and zoom range, restored by `resetStyle`. */
  base: { opacity: number; minZoom?: number; maxZoom?: number };
  style?: LayerStyle;
}

/** User styles and drawing order as plain JSON (`exportStyles` / `importStyles`). */
export interface LayerStylesJson {
  version: 1;
  /** Drawing order, bottom first; empty when it is the configured order. */
  order: string[];
  /** The user's styles by layer id. */
  styles: Record<string, LayerStyle>;
}

/**
 * Overlays and vector layers are drawn with `zIndex` = this + their position in the shared
 * drawing order: above the basemaps, below the layer highlight and the selection.
 */
export const LAYER_Z_INDEX_BASE = 1;

/** Owns the vector layers: creation, runtime changes, editability rules and reprojection. */
export class LayerManager {
  readonly originals = new OriginalStore();
  private readonly entries = new Map<string, Entry>();
  /** Raster overlays (`attachRaster`), sharing `order` and the style store with the vector layers. */
  private readonly raster = new Map<string, RasterEntry>();
  private activeId: string | null = null;
  /** Layers the user created in the client (`editor.localLayers`). */
  private readonly localIds = new Set<string>();
  /** Drawing order, bottom first. */
  private order: string[] = [];
  private orderCustomized = false;
  /** Imported styles and order for layers that do not exist yet (local layers load later). */
  private readonly pendingStyles = new Map<string, LayerStyle>();
  private pendingOrder: string[] = [];

  private readonly map: OlMap;
  private readonly getProjection: () => string;
  private readonly locale: Locale;
  /** Whether a dimension's measured objects changed; set by the editor (`setDimensionStaleTest`). */
  private staleTest: (feature: Feature) => boolean = () => false;
  private readonly isStale = (feature: Feature): boolean => this.staleTest(feature);
  private readonly events: LayerManagerEvents;
  private readonly highlightConfig: ResolvedLayerHighlightConfig;

  constructor(
    map: OlMap,
    getProjection: () => string,
    events: LayerManagerEvents,
    highlight: ResolvedLayerHighlightConfig = DEFAULT_HIGHLIGHT,
    locale: Locale = 'en',
  ) {
    this.map = map;
    this.locale = locale;
    this.getProjection = getProjection;
    this.events = events;
    this.highlightConfig = highlight;
  }

  /** Install the test that marks dimensions whose measured objects changed (drawn as stale). */
  setDimensionStaleTest(test: (feature: Feature) => boolean): void {
    this.staleTest = test;
  }

  add(config: LayerConfig): void {
    validateLayerConfig(config);
    if (this.isKnown(config.id)) throw new Error(`Layer "${config.id}" already exists`);
    const resolved = resolveLayer(config);
    const layer = createVectorLayer(resolved, {
      getProjection: this.getProjection,
      locale: this.locale,
      isDimensionStale: this.isStale,
      originals: this.originals,
      onLoad: (id, features) => this.events.onLoad({ id, features }),
      onError: (id, error) => this.events.onError({ id, error }),
      shouldLoad: (id, featureId) => this.events.shouldLoad?.(id, featureId) ?? true,
    });
    this.entries.set(config.id, { config: resolved, layer });
    this.order.push(config.id);
    this.map.addLayer(layer);
    this.events.onChange({ id: config.id, type: 'add' });
    const pending = this.pendingStyles.get(config.id);
    if (pending) {
      this.pendingStyles.delete(config.id);
      this.setStyle(config.id, pending);
    }
    if (this.pendingOrder.includes(config.id)) this.setOrder(this.pendingOrder, true);
    else this.applyZIndex();
  }

  remove(id: string): void {
    const entry = this.require(id);
    this.map.removeLayer(entry.layer);
    if (entry.highlight) this.map.removeLayer(entry.highlight);
    this.entries.delete(id);
    this.localIds.delete(id);
    this.order = this.order.filter((other) => other !== id);
    this.applyZIndex();
    // Clear the active layer first so listeners of the remove event never see a stale id.
    if (this.activeId === id) this.setActive(null);
    this.events.onChange({ id, type: 'remove' });
  }

  /** Id of the active layer (target of inserts), or `null`. */
  getActive(): string | null {
    return this.activeId;
  }

  /** Make a layer the active one, or `null` for none. Throws for an unknown id. */
  setActive(id: string | null): void {
    if (id !== null) this.require(id);
    if (id === this.activeId) return;
    this.activeId = id;
    this.events.onActiveChange({ id });
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  /** Vector layer ids in drawing order, bottom first (the config order until `setOrder`). */
  ids(): string[] {
    return this.order.filter((id) => this.entries.has(id));
  }

  /** Overlay and vector layer ids in drawing order, bottom first. */
  getOrder(): string[] {
    return [...this.order];
  }

  // ---- raster overlays in the shared order ----

  /**
   * Put an overlay's layer into the drawing order: below the vector layers and above the other
   * overlays, unless a stored order (`importStyles`) names it. Applies a stored style too.
   */
  attachRaster(id: string, layer: BaseLayer, base: RasterEntry['base']): void {
    if (this.isKnown(id)) throw new Error(`Layer "${id}" already exists`);
    this.raster.set(id, { layer, base: { ...base } });
    const firstVector = this.order.findIndex((other) => this.entries.has(other));
    this.order.splice(firstVector === -1 ? this.order.length : firstVector, 0, id);
    const pending = this.pendingStyles.get(id);
    if (pending) {
      this.pendingStyles.delete(id);
      this.setStyle(id, pending);
    }
    if (this.pendingOrder.includes(id)) this.setOrder(this.pendingOrder, true);
    else this.applyZIndex();
  }

  /** Take an overlay out of the drawing order (the caller removes it from the map). */
  detachRaster(id: string): void {
    if (!this.raster.delete(id)) return;
    this.order = this.order.filter((other) => other !== id);
    this.applyZIndex();
  }

  /** Whether the id names an overlay registered with `attachRaster`. */
  isRaster(id: string): boolean {
    return this.raster.has(id);
  }

  // ---- drawing order ----

  /**
   * Draw the layers in `ids` order, bottom first; ids not given keep their relative order
   * above them, unknown ids are ignored (and kept for layers added later when `keepUnknown`).
   * Emits `layerchange` with type `order`.
   */
  setOrder(ids: string[], keepUnknown = false): void {
    const known = ids.filter((id, i) => this.isKnown(id) && ids.indexOf(id) === i);
    this.pendingOrder = keepUnknown && known.length < ids.length ? [...ids] : [];
    const rest = this.order.filter((id) => !known.includes(id));
    // Ids not given keep their relative order: overlays below the given ones, vector layers
    // above them, so a stored vector-only order keeps the overlays underneath.
    this.order = [
      ...rest.filter((id) => this.raster.has(id)),
      ...known,
      ...rest.filter((id) => this.entries.has(id)),
    ];
    this.orderCustomized = this.order.join('\n') !== this.defaultOrder().join('\n');
    this.applyZIndex();
    this.events.onChange({ id: known[0] ?? '', type: 'order' });
  }

  /** Move one layer to position `index` of the drawing order (0 = bottom). */
  moveLayer(id: string, index: number): void {
    if (!this.isKnown(id)) throw new Error(`Unknown layer "${id}"`);
    const rest = this.order.filter((other) => other !== id);
    const at = Math.max(0, Math.min(rest.length, Math.round(index)));
    rest.splice(at, 0, id);
    this.setOrder(rest);
  }

  /** Back to the configured order: overlays below the layers, those added at runtime last. */
  resetOrder(): void {
    this.pendingOrder = [];
    this.setOrder(this.defaultOrder());
  }

  private defaultOrder(): string[] {
    return [...this.raster.keys(), ...this.entries.keys()];
  }

  private isKnown(id: string): boolean {
    return this.entries.has(id) || this.raster.has(id);
  }

  isOrderCustomized(): boolean {
    return this.orderCustomized;
  }

  private applyZIndex(): void {
    this.order.forEach((id, i) => {
      const layer = this.entries.get(id)?.layer ?? this.raster.get(id)?.layer;
      layer?.setZIndex(LAYER_Z_INDEX_BASE + i);
    });
  }

  // ---- user styles ----

  /**
   * The layer's current style: the user's, else the one read from its configured style. For an
   * overlay: its opacity and zoom range.
   */
  getStyle(id: string): LayerStyle {
    const raster = this.raster.get(id);
    if (raster) {
      return structuredClone(
        raster.style ?? rasterStyle(raster.base.opacity, raster.base.minZoom, raster.base.maxZoom),
      );
    }
    const { config, layer, style } = this.require(id);
    if (style) return structuredClone(style);
    const base =
      styleFromFlat(config.style ?? DEFAULT_STYLES[config.geometryType], config.geometryType) ??
      styleFromFlat(DEFAULT_STYLES[config.geometryType], config.geometryType)!;
    base.opacity = layer.getOpacity();
    if (config.minZoom !== undefined) base.minZoom = config.minZoom;
    if (config.maxZoom !== undefined) base.maxZoom = config.maxZoom;
    if (config.text)
      base.text = { color: hex(config.text.color), halo: hex(config.text.haloColor) };
    return base;
  }

  /** Whether the configured style uses expressions or rules, so a user style replaces it entirely. */
  hasExpressionStyle(id: string): boolean {
    if (this.raster.has(id)) return false;
    const { config } = this.require(id);
    return config.style !== undefined && styleFromFlat(config.style, config.geometryType) === null;
  }

  isStyleCustomized(id: string): boolean {
    return (this.raster.get(id) ?? this.require(id)).style !== undefined;
  }

  /**
   * Draw the layer with `style` (validated; throws `StyleError`): its flat style, opacity, zoom
   * range and, for text layers, the text colours. Emits `layerchange` with type `style`.
   */
  setStyle(id: string, style: LayerStyle): void {
    const raster = this.raster.get(id);
    if (raster) {
      const clean = validateStyle(style);
      const extra =
        (['stroke', 'fill', 'point', 'text'] as const).find((key) => clean[key] !== undefined) ??
        (clean.label ? 'label' : undefined);
      if (extra) {
        throw new StyleError(
          `style.${extra}`,
          'an overlay takes opacity, minZoom and maxZoom only',
        );
      }
      raster.style = rasterStyle(clean.opacity, clean.minZoom, clean.maxZoom);
      raster.layer.setOpacity(clean.opacity);
      raster.layer.setMinZoom(clean.minZoom ?? raster.base.minZoom ?? -Infinity);
      raster.layer.setMaxZoom(clean.maxZoom ?? raster.base.maxZoom ?? Infinity);
      this.events.onChange({ id, type: 'style', raster: true });
      return;
    }
    const entry = this.require(id);
    const clean = validateStyle(style);
    entry.style = clean;
    const { config, layer } = entry;
    layer.setStyle(
      vectorLayerStyle(
        config,
        this.getProjection,
        {
          flat: flatFromStyle(clean, config.geometryType),
          ...(clean.text ? { text: clean.text } : {}),
        },
        this.locale,
        this.isStale,
      ),
    );
    layer.setOpacity(clean.opacity);
    layer.setMinZoom(clean.minZoom ?? config.minZoom ?? -Infinity);
    layer.setMaxZoom(clean.maxZoom ?? config.maxZoom ?? Infinity);
    this.events.onChange({ id, type: 'style' });
  }

  /** Back to the configured style, opacity and zoom range. */
  resetStyle(id: string): void {
    this.pendingStyles.delete(id);
    const raster = this.raster.get(id);
    if (raster) {
      if (!raster.style) return;
      delete raster.style;
      raster.layer.setOpacity(raster.base.opacity);
      raster.layer.setMinZoom(raster.base.minZoom ?? -Infinity);
      raster.layer.setMaxZoom(raster.base.maxZoom ?? Infinity);
      this.events.onChange({ id, type: 'style', raster: true });
      return;
    }
    const entry = this.require(id);
    if (!entry.style) return;
    delete entry.style;
    const { config, layer } = entry;
    layer.setStyle(vectorLayerStyle(config, this.getProjection, {}, this.locale, this.isStale));
    layer.setOpacity(config.opacity ?? 1);
    layer.setMinZoom(config.minZoom ?? -Infinity);
    layer.setMaxZoom(config.maxZoom ?? Infinity);
    this.events.onChange({ id, type: 'style' });
  }

  /** User styles and order as JSON, including those kept for layers not added yet. */
  exportStyles(): LayerStylesJson {
    const styles: Record<string, LayerStyle> = Object.fromEntries(this.pendingStyles);
    for (const [id, entry] of this.raster) if (entry.style) styles[id] = entry.style;
    for (const [id, entry] of this.entries) if (entry.style) styles[id] = entry.style;
    let order: string[] = this.orderCustomized ? [...this.order] : [];
    if (this.pendingOrder.length) order = mergeOrder(this.order, this.pendingOrder);
    return { version: 1, order, styles: structuredClone(styles) };
  }

  /**
   * Apply exported styles and order. Everything is validated first (throws `StyleError`
   * naming the path); styles and order positions of layers that do not exist yet are kept
   * and applied when they are added.
   */
  importStyles(json: unknown): void {
    if (!json || typeof json !== 'object') throw new StyleError('styles', 'expected an object');
    const data = json as Record<string, unknown>;
    if (data.version !== 1) throw new StyleError('styles.version', 'expected 1');
    const order = data.order ?? [];
    if (!Array.isArray(order) || order.some((id) => typeof id !== 'string')) {
      throw new StyleError('styles.order', 'expected an array of layer ids');
    }
    const raw = data.styles ?? {};
    if (typeof raw !== 'object' || raw === null) {
      throw new StyleError('styles.styles', 'expected an object');
    }
    const clean = Object.entries(raw).map(
      ([id, style]) => [id, validateStyle(style, `styles.styles.${id}`)] as const,
    );
    for (const [id, style] of clean) {
      if (this.isKnown(id)) this.setStyle(id, style);
      else this.pendingStyles.set(id, style);
    }
    if (order.length) this.setOrder(order as string[], true);
  }

  /** Reset every user style and the order. */
  resetStyles(): void {
    this.pendingStyles.clear();
    for (const id of this.order) this.resetStyle(id);
    this.resetOrder();
  }

  list(): LayerInfo[] {
    return this.ids().map((id) => this.info(id));
  }

  info(id: string): LayerInfo {
    const entry = this.require(id);
    const { config, layer } = entry;
    const { insert, update, delete: del } = config.editable;
    return {
      id,
      title: config.title,
      visible: layer.getVisible(),
      geometryType: config.geometryType,
      editable: { insert, update, delete: del },
      snappable: config.snappable,
      featureCount: layer.getSource()?.getFeatures().length ?? 0,
      active: this.activeId === id,
      highlighted: entry.highlight !== undefined,
      dataProjection: this.dataProjection(id),
      local: this.localIds.has(id),
    };
  }

  /** Mark a layer as created in the client; `info().local` reports it. */
  setLocal(id: string, local: boolean): void {
    this.require(id);
    if (local) this.localIds.add(id);
    else this.localIds.delete(id);
  }

  isLocal(id: string): boolean {
    return this.localIds.has(id);
  }

  /** Change the title shown for a layer. Emits `layerchange` with type `title`. */
  setTitle(id: string, title: string): void {
    const entry = this.require(id);
    if (entry.config.title === title) return;
    entry.config.title = title;
    this.events.onChange({ id, type: 'title' });
  }

  /** Replace a layer's attribute schema. Emits `layerchange` with type `schema`. */
  setFields(id: string, fields: FieldConfig[]): void {
    const entry = this.require(id);
    entry.config.schema = { fields };
    this.events.onChange({ id, type: 'schema' });
  }

  getConfig(id: string): ResolvedLayerConfig {
    return this.require(id).config;
  }

  /**
   * The layer's data extent in the view projection: the configured `extent`, else the extent of
   * the loaded features, else `null` (nothing loaded yet, or an empty layer).
   */
  getExtent(id: string): Extent | null {
    const { config, layer } = this.require(id);
    if (config.extent) {
      return transformExtent(
        config.extent,
        config.extentProjection ?? 'EPSG:4326',
        this.getProjection(),
      );
    }
    const extent = layer.getSource()?.getExtent();
    return extent && !isEmpty(extent) ? [...extent] : null;
  }

  /**
   * The projection a layer's data is exchanged in: the configured `dataProjection`, else the
   * one detected when the layer was loaded, else `EPSG:4326`.
   */
  dataProjection(id: string): string {
    const { config, layer } = this.require(id);
    return (
      config.source.dataProjection ??
      (layer.get(DATA_PROJECTION_PROPERTY) as string | undefined) ??
      'EPSG:4326'
    );
  }

  getOlLayer(id: string): VectorLayer<VectorSource<Feature>> {
    return this.require(id).layer;
  }

  getSource(id: string): VectorSource<Feature> {
    return this.require(id).layer.getSource()!;
  }

  /** Find the layer a feature belongs to. */
  layerOf(feature: Feature): string | undefined {
    for (const [id, entry] of this.entries) {
      if (entry.layer.getSource()?.hasFeature(feature)) return id;
    }
    return undefined;
  }

  setVisible(id: string, visible: boolean): void {
    const entry = this.require(id);
    if (entry.layer.getVisible() === visible) return;
    entry.layer.setVisible(visible);
    entry.highlight?.setVisible(visible);
    entry.config.visible = visible;
    this.events.onChange({ id, type: 'visible' });
  }

  /** Whether all objects of the layer are highlighted. */
  isHighlighted(id: string): boolean {
    return this.require(id).highlight !== undefined;
  }

  /**
   * Highlight all objects of a layer on an overlay (config `layerHighlight`), or stop. The
   * overlay shares the layer's source and follows its visibility.
   */
  setHighlighted(id: string, highlighted: boolean): void {
    const entry = this.require(id);
    if ((entry.highlight !== undefined) === highlighted) return;
    if (highlighted) {
      entry.highlight = createLayerHighlight(
        entry.layer.getSource()!,
        this.highlightConfig,
        entry.layer.getVisible(),
      );
      this.map.addLayer(entry.highlight);
    } else {
      this.map.removeLayer(entry.highlight!);
      delete entry.highlight;
    }
    this.events.onChange({ id, type: 'highlight' });
  }

  setEditable(id: string, editable: boolean | EditableConfig): void {
    const entry = this.require(id);
    entry.config.editable = resolveEditable(editable);
    this.events.onChange({ id, type: 'editable' });
  }

  setSnappable(id: string, snappable: boolean): void {
    const entry = this.require(id);
    if (entry.config.snappable === snappable) return;
    entry.config.snappable = snappable;
    this.events.onChange({ id, type: 'snappable' });
  }

  getEditable(id: string): ResolvedEditableConfig {
    return this.require(id).config.editable;
  }

  /** Whether `operation` is allowed on the layer, and for `update` / `delete` on the given feature. */
  canEdit(id: string, operation: EditOperation, feature?: Feature): boolean {
    const editable = this.require(id).config.editable;
    if (!editable[operation]) return false;
    if (operation !== 'insert' && feature && editable.predicate) {
      return editable.predicate(feature, operation);
    }
    return true;
  }

  /** Ids of layers whose features are snap targets. */
  snappableIds(): string[] {
    return this.ids().filter((id) => this.require(id).config.snappable);
  }

  /**
   * Move every feature from projection `from` to `to`. Untouched features are re-derived from
   * their original data-projection geometry so repeated switches do not accumulate error;
   * features for which `isModified` is true (edited, unsaved) are transformed from their
   * current geometry instead. Layers loaded per extent are cleared and reload on the next
   * render, keeping `keep` features (inserted or edited ones) across the reload.
   */
  reproject(
    from: string,
    to: string,
    isModified: (feature: Feature) => boolean = () => false,
    keep: (feature: Feature) => boolean = () => false,
  ): void {
    const transform = (feature: Feature) => {
      const geometry = feature.getGeometry();
      if (!geometry) return;
      const original = isModified(feature) ? undefined : this.originals.get(feature);
      if (original) {
        feature.setGeometry(original.geometry.clone().transform(original.projection, to));
      } else {
        geometry.transform(from, to);
      }
    };
    for (const { config, layer } of this.entries.values()) {
      const source = layer.getSource()!;
      if (config.source.strategy === 'bbox') {
        const kept = source.getFeatures().filter(keep);
        source.clear(true);
        for (const feature of kept) transform(feature);
        source.addFeatures(kept);
        continue;
      }
      for (const feature of source.getFeatures()) transform(feature);
    }
  }

  /** Remove every layer from the map without emitting events. */
  destroy(): void {
    for (const { layer, highlight } of this.entries.values()) {
      this.map.removeLayer(layer);
      if (highlight) this.map.removeLayer(highlight);
    }
    this.entries.clear();
    this.raster.clear();
    this.order = [];
  }

  private require(id: string): Entry {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(
        this.raster.has(id)
          ? `"${id}" is an overlay, not a vector layer (see editor.overlays)`
          : `Unknown layer "${id}"`,
      );
    }
    return entry;
  }
}

/** The opacity and zoom range of an overlay as a `LayerStyle`. */
function rasterStyle(opacity: number, minZoom?: number, maxZoom?: number): LayerStyle {
  return {
    opacity,
    ...(minZoom !== undefined ? { minZoom } : {}),
    ...(maxZoom !== undefined ? { maxZoom } : {}),
  };
}

/** `#rrggbb` of a CSS colour (black when unreadable). */
function hex(color: string): string {
  return parseColor(color)?.hex ?? '#000000';
}

/**
 * The current order with the ids of a stored order that do not exist yet put back after the
 * id that preceded them there, so saving does not lose their position.
 */
function mergeOrder(current: string[], stored: string[]): string[] {
  const result = [...current];
  stored.forEach((id, i) => {
    if (result.includes(id)) return;
    const before = stored
      .slice(0, i)
      .reverse()
      .find((other) => result.includes(other));
    result.splice(before === undefined ? 0 : result.indexOf(before) + 1, 0, id);
  });
  return result;
}
