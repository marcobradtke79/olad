import Feature from 'ol/Feature';
import { platformModifierKeyOnly, shiftKeyOnly } from 'ol/events/condition';
import type { Extent } from 'ol/extent';
import DragBox from 'ol/interaction/DragBox';
import Select from 'ol/interaction/Select';
import { isEditorLayer } from './layerFilter';
import { BaseTool, type ToolContext } from './Tool';

/**
 * The click selection shared by the select tool and the editor's inspect mode: a click selects
 * a feature of an editor layer into the shared selection, Shift+click toggles it, a click on
 * empty map clears. The Selection applies the highlight itself.
 */
export function createSelectInteraction(
  ctx: Pick<ToolContext, 'selection' | 'hitTolerance'>,
): Select {
  return new Select({
    features: ctx.selection.collection,
    style: null,
    layers: isEditorLayer,
    hitTolerance: ctx.hitTolerance,
    toggleCondition: shiftKeyOnly,
    multi: false,
    filter: (feature) => feature instanceof Feature,
  });
}

/** Box selection with Ctrl / Cmd+drag: every feature of a visible editor layer in the box. */
export function createBoxSelectInteraction(
  ctx: Pick<ToolContext, 'selection' | 'layers'>,
): DragBox {
  const box = new DragBox({ condition: platformModifierKeyOnly });
  box.on('boxend', () => {
    const extent = box.getGeometry().getExtent();
    ctx.selection.set(featuresInExtent(ctx, extent));
  });
  return box;
}

/**
 * Select features by click (Shift+click toggles) or by dragging a box with Ctrl / Cmd held.
 * Clicking empty map clears the selection. Only editor layers are hit.
 */
export class SelectTool extends BaseTool {
  readonly id = 'select';

  override activate(ctx: ToolContext): void {
    this.interactions = [createSelectInteraction(ctx), createBoxSelectInteraction(ctx)];
    super.activate(ctx);
  }

  /** Escape clears the selection ... */
  override cancel(): void {
    this.ctx?.selection.clear();
  }

  /** ... but switching tools keeps it, so modify, move and delete can act on it. */
  override deactivate(): void {
    this.removeInteractions();
  }
}

function featuresInExtent(ctx: Pick<ToolContext, 'layers'>, extent: Extent): Feature[] {
  const found: Feature[] = [];
  for (const info of ctx.layers.list()) {
    if (!info.visible) continue;
    ctx.layers.getSource(info.id).forEachFeatureIntersectingExtent(extent, (feature) => {
      found.push(feature);
    });
  }
  return found;
}
