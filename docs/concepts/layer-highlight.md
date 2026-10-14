# Layer highlight

**Status:** implemented (2026-10-13). Requested by the project owner on 2026-10-13 with the layer list redesign: optionally highlight all objects of a layer in a style different from the selection; exposed in the core API with a configurable style.

## Purpose

Seeing at a glance which objects belong to a layer: where the parcels are among buildings of similar shape, which lines are roads, what a read-only reference layer covers. Unlike the [selection](selection.md) it marks a whole object class, changes nothing tools act on and can stay on while editing.

## Model

- `editor.layers.setHighlighted(id, on)` / `isHighlighted(id)`; several layers may be highlighted at once; `LayerInfo.highlighted` reports it and `layerchange` with type `highlight` announces it.
- Each highlighted layer gets an overlay `VectorLayer` that **shares the layer's own source**, so added, removed, edited, reloaded (bbox) and reprojected objects appear without mirroring code.
- Style from config `layerHighlight` (stroke, fill, point radius; default amber, distinct from the cyan selection). The objects keep their own style underneath.
- Stacking: z-index 999, above the editor layers and below the selection overlay (1000) and tool previews (1001), so a selected object still shows the selection style.
- The overlay follows the layer's visibility ([layers and editability](layers-and-editability.md)); removing the layer or destroying the editor removes it.
- Hit testing ignores it: it carries `LAYER_HIGHLIGHT_PROPERTY`, not the editor layer id, so selection and tools still pick the real objects.
- Independent of [edit mode](edit-mode.md) and editability: read-only layers can be highlighted.

## Related

- [Selection](selection.md): a different, layer-wide highlight drawn below the selection overlay; it never changes the selection.
- [Layers and editability](layers-and-editability.md): per-layer state next to visibility; follows visibility, removed with the layer.
- [UI shell](ui-shell.md): the layer list's highlight button is a thin wrapper over the API.
- [Edit mode](edit-mode.md): unaffected; the highlight shows in and out of edit mode.
- [Table view](table-view.md): another per-layer view started from the layer list.
- [Layer styles](layer-styles.md): the highlight overlay stays above every user-ordered layer.

## Surface

- `editor.layers.setHighlighted`, `isHighlighted`, `LayerInfo.highlighted`, event `layerchange` type `highlight`; exported `createLayerHighlightStyle`, `LAYER_HIGHLIGHT_PROPERTY`, `LAYER_HIGHLIGHT_Z_INDEX` ([api.md](../api.md)).
- Config `layerHighlight` ([configuration.md](../configuration.md#layerhighlight)).
- Layer list button Highlight ([ui.md](../ui.md#olcad-layer-list)).

## Open questions

- A highlight style per layer (in `layers[]`) instead of one for all highlighted layers?
- Highlighting only some objects of a layer (by attribute filter), for example all parcels of one owner?
- Should the highlight state be part of the host's persisted layout like panel positions?

## Source

- `src/core/layers/highlight.ts`
- `src/core/layers/LayerManager.ts`
- `src/ui/elements/OlcadLayerList.ts`
