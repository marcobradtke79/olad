# Text tool

**Status:** implemented (2026-10-13). Defined by the project owner on 2026-10-13: pick an insert point, give the text size and write the text; texts are point objects in a layer, sized in metres, rotated along the straightedge, entered in the command line.

## Purpose

Plans carry text: street names, parcel numbers, notes. In CAD a text is part of the drawing: it has a ground size, so it scales with the plan, and it is aligned with what it labels. Here a text is an ordinary object in a layer, so it is saved with the change set, undone, moved and deleted like any other object.

## Model

**Definition** (owner, 2026-10-13)

1. A text is a **point feature** in a layer with properties for the text, its height and its rotation; it is part of the change set like any object.
2. The **height is in metres on the ground**, so the text scales with the zoom.
3. The text takes the **straightedge angle** at insert.
4. Input goes through the **command line**: insert point, `Text height <2.5>` (Enter keeps it), `Text:` (the typed line; Enter inserts).

**Text layers** (`layers[].text`, [layers and editability](layers-and-editability.md))

- A layer becomes a text layer with `text: true` or a `TextConfig` (`property`, `heightProperty`, `rotationProperty` with defaults `text`, `textHeight`, `textRotation`; `height` offered for new texts, default 2.5 m; `color`, `haloColor`, `font`). It must take points (`Point`, `MultiPoint` or `Any`).
- The draft layer is always a text layer with the defaults, so texts can be placed without a text layer.
- Rendering (`textStyleFunction`): a point feature with a non-empty text property is drawn as that text; its font size in pixels is the height in metres converted at the point through [measurement](measurement.md) (`unitsPerMetre`) divided by the resolution; texts below one pixel are not drawn. It is left-aligned on its baseline at the point, rotated counter-clockwise by the rotation (degrees, the [straightedge](straightedge.md) convention), turns with the view, and has a halo. Every other feature uses the layer's flat style.
- Texts are hit by clicks on their letters, so the [select tool](tool-select.md), move, delete and inspect work on them; the selection halo marks the insert point; [snapping](snapping.md) snaps to the insert point.

**State machine** (`point` → `height` → `text`)

- **point**: a click (snapped) or a typed `x,y` is the insert point.
- **height**: a plain number is the height in metres (`Tool.handleValue`); 0 or less is refused with a notice; Enter keeps the offered height: the target layer's `text.height` at first, then the last height used in the session. A marker shows the insert point.
- **text**: the typed line is the text (`Tool.handleText`, offered before any parsing, so `42` is text here); an empty line does nothing. A sample "Text" in the preview colour shows the height and angle.
- On insert: one `insertFeature` with the target layer's schema defaults under the text properties, the point wrapped for a `MultiPoint` layer; the text is [selected](selection.md) and `featureinsert` opens the [attribute](attributes.md) popup for a layer with schema fields (the Labels layer of the test page shows text, height and rotation filled in). The tool returns to **point** for the next text.
- Escape and Backspace step back: text → height → point.

**Target** (`textTarget`)

The active layer, else the draft layer; it must allow inserts, be a text layer and take points. A non-text active layer (Roads, Hydrants) gives no target: the toolbar button is greyed out. The tool follows the active layer like the [draw tool](tool-draw.md).

## Related

- [Layers and editability](layers-and-editability.md): the `text` layer option; the draft layer is a text layer; inserts need the layer's `insert` right.
- [Draw tool](tool-draw.md): the same active / draft target order and insert path (defaults, wrapping, select after insert).
- [Straightedge](straightedge.md): its angle becomes the text's rotation.
- [Numeric input](numeric-input.md): the insert point as `x,y`; the height through `handleValue`; the text through `handleText`.
- [Measurement](measurement.md): metres on the ground are converted to pixels at the text.
- [Attributes](attributes.md): the popup opens for texts in a layer with a schema, with the text fields filled in.
- [Snapping](snapping.md): the insert point is snapped and can be snapped to.
- [Moving drafts](draft-move.md): a text placed in the draft layer can be moved into a point layer; it keeps its text properties, drawn as text in a text layer.
- [Tools framework](tools.md): a three-step tool using both the value and the text channel of the command line.
- [UI shell](ui-shell.md): the Draw text button in the Draw toolbar.
- [Layer styles](layer-styles.md): users can change the colours of text layers; texts stay sized in metres.

## Surface

- Config `layers[].text` ([configuration.md](../configuration.md)); exported `TEXT_DEFAULTS`, `textStyleFunction`, `textStyle`, `featureText`.
- `editor.tools.activate('text')`, exported `TextTool`, `TEXT_PROMPTS`, `TextStep`, `textTarget`, `TextTarget` ([tools.md](../tools.md#text)).
- Toolbar button Draw text, icon `drawText` ([ui.md](../ui.md)).

## Open questions

- Editing a text's content where the layer has no schema (the draft layer): a dedicated edit-text step, or a built-in field in the attribute form?
- Multi-line texts and justification (left, centre, right; baseline, middle).
- The rotate tool turns the insert point only; should it also change a text's rotation property? And should the move tool keep texts upright?
- A pixel-sized (screen) text option beside ground size.

## Source

- `src/core/tools/text.ts`
- `src/core/layers/text.ts`
- `src/core/config/defaults.ts` (`TEXT_DEFAULTS`, `resolveText`)
