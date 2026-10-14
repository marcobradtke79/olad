import { default as Collection } from 'ol/Collection';
import { default as Feature } from 'ol/Feature';
import { default as Geometry } from 'ol/geom/Geometry';
import { default as MultiPoint } from 'ol/geom/MultiPoint';
import { default as VectorLayer } from 'ol/layer/Vector';
import { default as OlMap } from 'ol/Map';
import { default as VectorSource } from 'ol/source/Vector';
import { default as Style } from 'ol/style/Style';
import { ResolvedSelectionConfig } from '../config/types';
/** Layer property marking the highlight overlay (`true`). */
export declare const HIGHLIGHT_LAYER_PROPERTY = "olcad:highlight";
/** Every vertex of a geometry (rings without their closing copy), for the grip markers. */
export declare function vertexPoints(geometry: Geometry | undefined): MultiPoint | null;
/**
 * The CAD-like highlight drawn over selected features: a halo under the main stroke, a light
 * fill, square grips on every vertex and a ringed circle for points. Pure: the style array is
 * built once from the configuration.
 */
export declare function createHighlightStyle(config: ResolvedSelectionConfig): Style[];
/**
 * The selected features. Shared by every tool: the select tool fills it, modify, move and
 * delete act on it. Selected features are drawn a second time on a highlight layer above
 * everything else (`createHighlightStyle`); their own style is untouched. `onChange` fires once
 * per batch of changes (microtask), with the current selection.
 */
export declare class Selection {
    readonly collection: Collection<Feature<Geometry, {
        [x: string]: any;
    }>>;
    /** The overlay drawing the highlight; not an editor layer, so tools and snapping ignore it. */
    readonly layer: VectorLayer<VectorSource<Feature>>;
    private readonly map;
    private readonly onChange;
    private pending;
    constructor(map: OlMap, config: ResolvedSelectionConfig, onChange: (features: Feature[]) => void);
    get(): Feature[];
    has(feature: Feature): boolean;
    set(features: Feature[]): void;
    add(feature: Feature): void;
    remove(feature: Feature): void;
    clear(): void;
    /** Drop every selected feature for which `keep` is false (for example after a discard). */
    prune(keep: (feature: Feature) => boolean): void;
    destroy(): void;
    private schedule;
}
