# Select tool

**Status:** partial (2026-10-12). Click, Shift+click toggle and Ctrl / Cmd box exist; lasso is planned.

## Purpose

Build the [selection](selection.md) in edit mode. It is the default tool to fall back to, changes no data, and its interactions are reused wherever picking is needed: inspect mode outside edit mode and the first step of the move tool.

## Model

1. Click a feature of an editor layer: it becomes the selection. Click on empty map: the selection clears.
2. Shift+click toggles one feature.
3. Ctrl / Cmd+drag draws a box; every feature of a visible editor layer whose extent intersects the box becomes the selection (no editability filter; read-only features are selectable).
4. Escape (`cancel`) clears the selection; deactivating the tool keeps it so modify, move and delete can act on it.

Rules: hit detection with half the pick-box size as tolerance, editor layers only (never the highlight or preview layers); the select interaction draws nothing itself, the selection's highlight layer does. Snapping does not affect picking (the click coordinate is rewritten, but hit detection uses the pixel).

**Shared interactions**

- `createSelectInteraction` is also the inspect interaction while [edit mode](edit-mode.md) is off.
- The [move tool](tool-move.md) activates the same click and box interactions in its select step.

**Planned**

- Lasso (free-hand polygon) selection.

## Related

- [Text tool](tool-text.md): texts are selected by clicking their letters.
- [Parallel tool](tool-parallel.md): reuses the click selection to pick its reference object.
- [Selection](selection.md): the tool's only output.
- [Tools framework](tools.md): a tool with no preconditions beyond edit mode; `cancel` clears, `deactivate` keeps.
- [Move tool](tool-move.md): reuses the select and box interactions for its first step.
- [Offset tool](tool-offset.md): reuses the select interaction to pick its single source object.
- [Edit mode](edit-mode.md): outside edit mode the same interaction serves inspection.
- [Trim tool](tool-trim.md) and [Extend tool](tool-extend.md): reuse the select interaction for their boundary step.
- [Template copy tool](tool-template-copy.md): reuses the click and box selection for its first step.
- [Mirror tool](tool-mirror.md): reuses the click and box selection for its first step.

## Surface

- `editor.tools.activate('select')`, exported `createSelectInteraction`, `createBoxSelectInteraction` ([tools.md](../tools.md#select)).
- Toolbar button Select ([ui.md](../ui.md)).

## Open questions

- Should box selection honour a "window" vs "crossing" distinction (fully inside vs intersecting), as CAD does? Today it is crossing only.
- Should a click on a stacked set of features cycle through them (CAD selection cycling)?

## Source

- `src/core/tools/select.ts`
- `src/core/tools/layerFilter.ts`
