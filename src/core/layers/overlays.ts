import type OlMap from 'ol/Map';
import type BaseLayer from 'ol/layer/Base';
import type { Extent } from 'ol/extent';
import { transformExtent } from 'ol/proj';
import type Layer from 'ol/layer/Layer';
import TileWMS from 'ol/source/TileWMS';
import ImageWMS from 'ol/source/ImageWMS';
import type { OverlayConfig, ResolvedOverlayConfig } from '../config/types';
import { resolveOverlay } from '../config/defaults';
import { validateOverlayConfig } from '../config/validate';
import type { LayerManager } from './LayerManager';
import { createRasterLayer, type RasterSpec } from './raster';

/**
 * Property set on every overlay layer, holding the overlay id. Overlays never carry
 * `olcad:layer`, so selection, inspection, snapping and the straightedge pick ignore them.
 */
export const OVERLAY_ID_PROPERTY = 'olcad:overlay';

/** What changed about an overlay (`overlaychange`). */
export type OverlayChangeType = 'add' | 'remove' | 'visible' | 'style';

export interface OverlayInfo {
  id: string;
  title: string;
  type: OverlayConfig['type'];
  visible: boolean;
  /** Current opacity, 0 … 1. */
  opacity: number;
  /** Drawn from this view zoom on; absent: no lower limit. */
  minZoom?: number;
  /** Drawn up to this view zoom; absent: no upper limit. */
  maxZoom?: number;
  /** The configured legend image, or the one a WMS service offers (`GetLegendGraphic`). */
  legendUrl?: string;
  attribution?: string;
}

export interface OverlayManagerEvents {
  onChange(event: { id: string; type: OverlayChangeType }): void;
  onError(event: { id: string; error: Error }): void;
}

interface Entry {
  config: ResolvedOverlayConfig;
  layer: BaseLayer;
}

/**
 * Owns the raster overlays: creation, visibility, info and legend. Their place in the drawing
 * order and their user style (opacity, zoom range) live in the `LayerManager`, which overlays
 * share with the vector layers, so one order and one stored style JSON cover both.
 */
export class OverlayManager {
  private readonly entries = new Map<string, Entry>();
  private readonly map: OlMap;
  private readonly layers: LayerManager;
  private readonly getProjection: () => string;
  private readonly events: OverlayManagerEvents;

  constructor(
    map: OlMap,
    layers: LayerManager,
    getProjection: () => string,
    events: OverlayManagerEvents,
  ) {
    this.map = map;
    this.layers = layers;
    this.getProjection = getProjection;
    this.events = events;
  }

  /** Add an overlay (validated); it is drawn below the vector layers. Returns the resolved config. */
  add(config: OverlayConfig): ResolvedOverlayConfig {
    validateOverlayConfig(config);
    if (this.entries.has(config.id) || this.layers.has(config.id)) {
      throw new Error(`Layer "${config.id}" already exists`);
    }
    const resolved = resolveOverlay(config);
    const layer = createRasterLayer(toRasterSpec(resolved), {
      getProjection: this.getProjection,
      onError: (id, error) => this.events.onError({ id, error }),
    });
    layer.set(OVERLAY_ID_PROPERTY, resolved.id);
    layer.setVisible(resolved.visible);
    layer.setOpacity(resolved.opacity);
    if (resolved.minZoom !== undefined) layer.setMinZoom(resolved.minZoom);
    if (resolved.maxZoom !== undefined) layer.setMaxZoom(resolved.maxZoom);
    this.entries.set(resolved.id, { config: resolved, layer });
    this.map.addLayer(layer);
    this.layers.attachRaster(resolved.id, layer, {
      opacity: resolved.opacity,
      minZoom: resolved.minZoom,
      maxZoom: resolved.maxZoom,
    });
    this.events.onChange({ id: resolved.id, type: 'add' });
    return resolved;
  }

  remove(id: string): void {
    const entry = this.require(id);
    this.layers.detachRaster(id);
    this.map.removeLayer(entry.layer);
    this.entries.delete(id);
    this.events.onChange({ id, type: 'remove' });
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  /** Overlay ids in drawing order, bottom first. */
  ids(): string[] {
    return this.layers.getOrder().filter((id) => this.entries.has(id));
  }

  list(): OverlayInfo[] {
    return this.ids().map((id) => this.info(id));
  }

  info(id: string): OverlayInfo {
    const { config, layer } = this.require(id);
    const minZoom = layer.getMinZoom();
    const maxZoom = layer.getMaxZoom();
    const legendUrl = this.getLegendUrl(id);
    return {
      id,
      title: config.title,
      type: config.type,
      visible: layer.getVisible(),
      opacity: layer.getOpacity(),
      ...(Number.isFinite(minZoom) ? { minZoom } : {}),
      ...(Number.isFinite(maxZoom) ? { maxZoom } : {}),
      ...(legendUrl ? { legendUrl } : {}),
      ...(config.attribution ? { attribution: config.attribution } : {}),
    };
  }

  getConfig(id: string): ResolvedOverlayConfig {
    return this.require(id).config;
  }

  getOlLayer(id: string): BaseLayer {
    return this.require(id).layer;
  }

  /** The configured data extent in the view projection, or `null`. */
  getExtent(id: string): Extent | null {
    const { config } = this.require(id);
    if (!config.extent) return null;
    return transformExtent(
      config.extent,
      config.extentProjection ?? 'EPSG:4326',
      this.getProjection(),
    );
  }

  setVisible(id: string, visible: boolean): void {
    const entry = this.require(id);
    if (entry.layer.getVisible() === visible) return;
    entry.layer.setVisible(visible);
    entry.config.visible = visible;
    this.events.onChange({ id, type: 'visible' });
  }

  /**
   * The configured `legendUrl`, else for WMS overlays the service's GetLegendGraphic URL (with
   * `SCALE` for `resolution` when given), else `undefined`.
   */
  getLegendUrl(id: string, resolution?: number): string | undefined {
    const { config, layer } = this.require(id);
    if (config.legendUrl) return config.legendUrl;
    if (config.type !== 'wms' || !('getSource' in layer)) return undefined;
    const source = (layer as Layer).getSource();
    if (source instanceof TileWMS || source instanceof ImageWMS) {
      return source.getLegendUrl(resolution);
    }
    return undefined;
  }

  /** Remove every overlay from the map and the order without emitting events. */
  destroy(): void {
    for (const [id, { layer }] of this.entries) {
      this.layers.detachRaster(id);
      this.map.removeLayer(layer);
    }
    this.entries.clear();
  }

  private require(id: string): Entry {
    const entry = this.entries.get(id);
    if (!entry) throw new Error(`Unknown overlay "${id}"`);
    return entry;
  }
}

/** The raster factory's input for an overlay: its source options with the tile-grid zoom keys. */
function toRasterSpec(o: ResolvedOverlayConfig): RasterSpec {
  const common = { id: o.id, attribution: o.attribution, fetch: o.fetch };
  switch (o.type) {
    case 'xyz':
      return {
        ...common,
        type: 'xyz',
        url: o.url,
        minZoom: o.sourceMinZoom,
        maxZoom: o.sourceMaxZoom,
        tileSize: o.tileSize,
        crossOrigin: o.crossOrigin,
      };
    case 'wms':
      return {
        ...common,
        type: 'wms',
        url: o.url,
        params: o.params,
        tiled: o.tiled,
        serverType: o.serverType,
        projection: o.projection,
        crossOrigin: o.crossOrigin,
      };
    case 'wmts':
      return {
        ...common,
        type: 'wmts',
        capabilitiesUrl: o.capabilitiesUrl,
        layer: o.layer,
        matrixSet: o.matrixSet,
        format: o.format,
        style: o.style,
        crossOrigin: o.crossOrigin,
      };
    case 'vector-tile':
      return {
        ...common,
        type: 'vector-tile',
        url: o.url,
        format: o.format,
        minZoom: o.sourceMinZoom,
        maxZoom: o.sourceMaxZoom,
        projection: o.projection,
        style: o.style,
      };
    case 'geotiff':
      return {
        ...common,
        type: 'geotiff',
        sources: o.sources,
        normalize: o.normalize,
        convertToRGB: o.convertToRGB,
      };
  }
}
