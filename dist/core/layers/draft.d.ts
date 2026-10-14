import { default as Feature } from 'ol/Feature';
import { default as Geometry } from 'ol/geom/Geometry';
import { Command } from '../changes/commands';
import { GeometryType } from '../config/types';
import { LayerManager } from './LayerManager';
/**
 * Whether a layer of `layerType` takes `geometry`: the same type, the single part of a
 * multi-part layer's type (it is wrapped on the move), or any type on an `Any` layer.
 */
export declare function layerAcceptsGeometry(layerType: GeometryType, geometry: Geometry): boolean;
/** What the draft move needs from the editor. */
export interface DraftMoveContext {
    layers: Pick<LayerManager, 'list' | 'has' | 'canEdit' | 'getConfig' | 'layerOf'>;
    getDraftLayer(): string | null;
}
/**
 * The layers a draft object can be moved to, in layer order: every layer except the draft
 * layer that allows `insert` and takes the object's geometry. Empty for a feature that is not
 * in the draft layer or has no geometry.
 */
export declare function draftTargets(ctx: DraftMoveContext, feature: Feature): string[];
/**
 * One composite command moving draft objects into `layerId`: it deletes them from the draft
 * layer and inserts a copy of each into the target, with the target's schema defaults under the
 * object's own attributes (a template copy brings its attributes along), wrapped for a
 * multi-part layer. Objects the layer does not take (`draftTargets`) are left out; `null` when
 * none is left. `features` are the copies and `sources` the moved draft objects, in order.
 */
export declare function moveDraftsCommand(ctx: DraftMoveContext, features: Feature[], layerId: string): {
    command: Command;
    features: Feature[];
    sources: Feature[];
} | null;
