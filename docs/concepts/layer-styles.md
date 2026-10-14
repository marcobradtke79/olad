# Layer styles

**Status:** implemented (2026-10-14). Requested by the project owner on 2026-10-14: users change the order, colours and other styling of the layers from the View menu. Decided with the owner: a dialog from the View menu with live preview, kept in this browser with a reset to the configured styles, editing basic styling, labels and the zoom range.

## Purpose

The configuration gives every layer a look, but users work differently: one wants the roads above the parcels, another needs a strong colour on a dark basemap, a third wants owner names on the parcels. Layer styles are a personal view setting — they change how layers are drawn, never the data or the change set.

## Model

**Style** (`LayerStyle`, plain JSON)

- Sections by geometry type: line (colour, width, solid / dashed / dotted), fill (colour, opacity) for polygons, points (radius, fill, outline colour and width), a **label** (an attribute drawn next to each object: size, colour, halo; along the line for line layers), text colours for [text layers](tool-text.md), the layer **opacity** and a **zoom range** (from / to zoom). A layer of type `Any` (the draft layer) has all sections.
- A user style replaces the configured flat style. A configured style with literal values is read back as the starting point; one with expressions, rules or several styles cannot be, so the dialog starts from the defaults and says that the computed style will be replaced.
- Text layers keep drawing their texts sized in metres; the user style sets their colours and the style of objects without text.
- Reset returns a layer to its configured style, full opacity and configured zoom range.

**Order**

- The drawing order is the configured order until the user changes it; `list()` (and with it the layer list) follows it, bottom first. In the dialog the top of the list is drawn on top.
- Vector layers get `zIndex` 1 + position. Stacking bands: basemaps (0) < editor layers (1 …) < [layer highlight](layer-highlight.md) (999) < [selection](selection.md) (1000) < tool previews (1001) < measurements (1002); the grid and the crosshair are overlays on top.

**Persistence**

- The core keeps styles and order in memory; `exportStyles` / `importStyles` exchange JSON. The UI's `persistLayerStyles` stores it in localStorage and restores it at start.
- Entries for layers that do not exist yet — [local layers](local-layers.md) load asynchronously from IndexedDB — are kept and applied when the layer is added; saving in between keeps them.

**UI** ([UI shell](ui-shell.md)): View → Layer styles… opens `<olcad-layer-style-dialog>`: the layers in drawing order on the left (drag and drop, up / down), the selected layer's form on the right; every change is applied live; Reset layer, Reset all, Close.

## Related

- [Layers and editability](layers-and-editability.md): styles and order are per-layer view state next to visibility; they never change editability or data.
- [Layer highlight](layer-highlight.md): drawn above every user-ordered layer, in its own style.
- [Selection](selection.md): the selection overlay stays above all layers whatever their order and style.
- [Text tool](tool-text.md): text layers keep their metre-sized texts; the user style sets their colours.
- [Local layers](local-layers.md): local layers are styled and ordered like any layer; their stored styles wait until they are loaded.
- [UI shell](ui-shell.md): the dialog opens from the View menu.

## Surface

- `editor.layers` `getStyle`, `setStyle`, `resetStyle`, `isStyleCustomized`, `hasExpressionStyle`, `setOrder`, `moveLayer`, `resetOrder`, `isOrderCustomized`, `exportStyles`, `importStyles`, `resetStyles`; `layerchange` types `style` / `order`; `LayerStyle`, `StyleError` ([api.md](../api.md#editorlayers)).
- `<olcad-layer-style-dialog>`, `persistLayerStyles` ([ui.md](../ui.md#olcad-layer-style-dialog)).

## Open questions

- Category styles (a colour per attribute value, for example per usage), which the configured flat styles can express but this editor cannot yet.
- Should the host be able to share styles between users (store them on the server instead of the browser)?
- Should the layer list show a small swatch of each layer's style?

## Source

- `src/core/layers/style.ts`
- `src/core/layers/LayerManager.ts`
- `src/core/layers/vector.ts`
- `src/ui/elements/OlcadLayerStyleDialog.ts`
- `src/ui/layerStyleStorage.ts`
