import { default as Collection } from 'ol/Collection';
import { default as Feature } from 'ol/Feature';
import { ToolContext } from './Tool';
/**
 * A collection mirroring the selection but holding only features that may be updated. Modify
 * and move interactions work on it, so read-only features stay untouched.
 */
export declare function editableSelection(ctx: ToolContext): {
    collection: Collection<Feature>;
    dispose(): void;
};
