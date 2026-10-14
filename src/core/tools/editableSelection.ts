import Collection from 'ol/Collection';
import type Feature from 'ol/Feature';
import type { ToolContext } from './Tool';

/**
 * A collection mirroring the selection but holding only features that may be updated. Modify
 * and move interactions work on it, so read-only features stay untouched.
 */
export function editableSelection(ctx: ToolContext): {
  collection: Collection<Feature>;
  dispose(): void;
} {
  const collection = new Collection<Feature>();
  const sync = () => {
    collection.clear();
    for (const feature of ctx.selection.get()) if (ctx.canUpdate(feature)) collection.push(feature);
  };
  sync();
  const source = ctx.selection.collection;
  source.on('add', sync);
  source.on('remove', sync);
  return {
    collection,
    dispose: () => {
      source.un('add', sync);
      source.un('remove', sync);
      collection.clear();
    },
  };
}
