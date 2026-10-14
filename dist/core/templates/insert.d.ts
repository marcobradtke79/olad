import { Coordinate } from 'ol/coordinate';
import { default as Feature } from 'ol/Feature';
import { Command } from '../changes/commands';
import { ResolvedLayerConfig } from '../config/types';
import { LayerManager } from '../layers/LayerManager';
import { Template, TemplateFeature, TemplateStore } from './TemplateStore';
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
export declare function templateTarget(ctx: TemplateTargetContext, feature: Pick<TemplateFeature, 'layer' | 'geometry'>): TemplateTarget | null;
/** Whether at least one object of the template has a layer to go to. */
export declare function canInsertTemplate(ctx: TemplateTargetContext, template: Template): boolean;
/**
 * One composite command inserting a copy of the template with its base point at `at`, and
 * the new features. Each object goes to its target layer (`templateTarget`) with the layer's
 * schema defaults under its copied attributes, wrapped for multi-part layers; objects without
 * a target are skipped. `null` when no object fits anywhere.
 */
export declare function templateInsertCommand(ctx: TemplateTargetContext & {
    getProjection(): string;
}, store: Pick<TemplateStore, 'placed'>, template: Template, at: Coordinate): {
    command: Command;
    features: Feature[];
} | null;
