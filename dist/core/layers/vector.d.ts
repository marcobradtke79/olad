import { default as Feature, FeatureLike } from 'ol/Feature';
import { default as FeatureFormat } from 'ol/format/Feature';
import { default as VectorLayer } from 'ol/layer/Vector';
import { default as VectorSource } from 'ol/source/Vector';
import { FlatStyleLike } from 'ol/style/flat';
import { StyleFunction } from 'ol/style/Style';
import { GeometryType, ResolvedLayerConfig, VectorSourceConfig } from '../config/types';
import { OriginalStore } from './originals';
/** Property set on every vector layer this library creates, holding the layer id. */
export declare const LAYER_ID_PROPERTY = "olcad:layer";
/** Layer property holding the data projection detected on first load. */
export declare const DATA_PROJECTION_PROPERTY = "olcad:dataProjection";
export interface VectorLayerContext {
    getProjection(): string;
    originals: OriginalStore;
    onLoad(id: string, features: Feature[]): void;
    onError(id: string, error: Error): void;
    /** Veto for loaded features by id, for example ones deleted locally but not yet saved. */
    shouldLoad?(layerId: string, featureId: string | number): boolean;
}
/** The style of a layer without `style` in its config, per geometry type. */
export declare const DEFAULT_STYLES: Record<GeometryType, FlatStyleLike>;
/** Build the OpenLayers format for a source config. */
export declare function createFormat(source: VectorSourceConfig): FeatureFormat<FeatureLike>;
/** Build the GetFeature URL for a WFS source. */
export declare function wfsUrl(source: VectorSourceConfig, extent: number[] | undefined, srsName: string): string;
/** Resolve a CRS identifier (code, URN or URL form) to the registered OpenLayers code. */
export declare function normalizeCode(code: string | undefined): string | undefined;
interface ReadResult {
    features: Feature[];
    dataProjection: string;
}
/**
 * Parse raw data into features in the view projection and remember each feature's
 * original geometry in the data projection.
 */
export declare function readFeatures(layer: ResolvedLayerConfig, format: FeatureFormat<FeatureLike>, data: string | object, viewProjection: string, originals: OriginalStore): ReadResult;
/**
 * The OpenLayers style of a layer: `flat` (a user style, `editor.layers.setStyle`) or the
 * configured / default flat style; text layers draw their texts through `textStyleFunction`
 * with `text` colours overriding the configured ones.
 */
export declare function vectorLayerStyle(layer: ResolvedLayerConfig, getProjection: () => string, override?: {
    flat?: FlatStyleLike;
    text?: {
        color: string;
        halo: string;
    };
}): FlatStyleLike | StyleFunction;
/** Create the OpenLayers vector layer for a layer config. Loading starts when the map renders it. */
export declare function createVectorLayer(layer: ResolvedLayerConfig, ctx: VectorLayerContext): VectorLayer<VectorSource<Feature>>;
export {};
