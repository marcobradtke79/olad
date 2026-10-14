# Move tool

**Status:** implemented (2026-10-12). The flow below is the project owner's definition, confirmed on 2026-10-12; the implementation follows it. Backspace only acts in the second-point step (see Open questions).

## Purpose

Translate objects the CAD way: pick the objects, pick a base point, define the move vector. The vector is the difference between two picked or typed points, so precise moves ("100 m east", "this corner onto that corner") are natural, unlike dragging.

## Model

**Definition** (owner, 2026-10-12)

1. The move tool is available in edit mode; it can be started with or without a selection.
2. If nothing is selected, the user is prompted to select one or several objects (click, Shift+click adds, Ctrl / Cmd+drag selects a box; Enter continues). With a selection already present this step is skipped.
3. The user picks a **base point** for the move on the map.
4. The user defines the **move vector**: a second point on the map, or a direction typed on the prompt with `@` and `<` (`@dx,dy` as an offset in metres, `@distance<angle` as a polar offset relative to the straightedge angle).
5. When the move completes, the selection is cleared, the objects sit at their new place, and the user can start the next move or change the tool.

**State machine** (`select` → `base` → `target`) implements the definition:

- **select**: the select and box interactions are active (shared with the [select tool](tool-select.md)); Enter continues when something updatable is selected; skipped when a selection exists.
- **base**: a click sets the base point (snapped like any other point). Additionally the implementation accepts a typed `x,y`.
- **target**: a click or a typed `@dx,dy` / `@distance<angle` completes the move. Additionally a plain `distance` (direct distance entry towards the pointer) is accepted. A dashed preview of the moved objects and the vector follows the pointer; two quick clicks are two picks, never a double-click zoom.

**Completion**

- The vector is applied to the editable subset of the [selection](selection.md); geometries are snapshotted, translated and submitted as one `updateGeometry` or composite through [editing](editing.md) (same pattern as modify), so one move is one undo step.
- The selection is cleared and the tool returns to `select`, prompting for the next objects; the tool stays active until the user switches.

**Stepping back**

- Escape: `target` → `base` → `select` (clearing the selection) → clear.
- Backspace drops the base point (only in `target`).
- Switching tools keeps the selection; losing all editable features from the selection (undo, delete) drops back to `select`.

**Aids**

- `referencePoint()` is the base point in `target` and `null` otherwise, so relative [numeric input](numeric-input.md), the angle lock ([constraints](constraints.md)) and the perpendicular snap ([snapping](snapping.md)) all work from the base point.
- Each step change updates the prompt (`toolprompt`), which the input bar shows.

**Pattern for other tools**

Objects, base point, second point or value is the shape of copy, rotate, scale and mirror as well; the move tool is the template ([construction tools](construction-tools.md)).

## Related

- [Selection](selection.md): built in the first step, consumed in the last, cleared afterwards.
- [Select tool](tool-select.md): shares its interactions for the select step.
- [Tools framework](tools.md): prompts per step; Escape and Backspace step back.
- [Numeric input](numeric-input.md): base point as `x,y`, second point relative to the base.
- [Constraints](constraints.md): the angle lock constrains the second point around the base point.
- [Snapping](snapping.md): both points are snapped; perpendicular from the base point.
- [Editing](editing.md): one command per move.
- [Rotate tool](tool-rotate.md): built on the same skeleton (select step, point picks, preview, one command, deselect).
- [Construction tools](construction-tools.md): copy, scale and mirror follow the same state machine.
- [Template copy tool](tool-template-copy.md): reuses the select and base point steps to store a template.
- [Mirror tool](tool-mirror.md): same select step and point picking.
- [Scale tool](tool-scale.md): same select step, preview and point picking.

## Surface

- `editor.tools.activate('move')`, exported `MOVE_PROMPTS`, `translateFeatures`, `PREVIEW_LAYER_PROPERTY` ([tools.md](../tools.md#move)).
- Toolbar button Move ([ui.md](../ui.md)).

## Open questions

- Backspace in `select` and `base` does nothing: the keyboard binding routes Backspace to `removeLastPoint` for the move tool, so the selection cannot be deleted by key while move is active. Decide: Backspace in `select` deletes the selection as elsewhere, or stays a no-op.
- Should the preview also show the original objects faded, as CAD does?
- "Displacement" mode (type the vector at the base-point prompt and skip the second point) is a common CAD shortcut; worth adding?

## Source

- `src/core/tools/move.ts`
- `src/core/tools/modify.ts` (`snapshot`, `submitGeometryChanges`)
- `src/core/tools/select.ts`
