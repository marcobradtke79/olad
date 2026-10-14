# Scale tool

**Status:** implemented (2026-10-13). The flow below is the project owner's definition of 2026-10-13; the tool was built to it the same day.

## Purpose

Scale objects up or down around a base point, CAD style. The factor is either typed (`2` doubles, `0.5` halves) or shown with two points: a reference point and a target point, so "make this wall as long as that one" is a pick on each end, and snapping makes both exact.

## Model

**Definition** (owner, 2026-10-13)

1. If nothing is selected, the user is prompted to select one or several objects (click, Shift+click adds, Ctrl / Cmd+drag selects a box). Enter confirms. With a selection already present this step is skipped.
2. The user picks the **base point**: the point that stays fixed.
3. The user either **types a factor** or picks a **reference point** and then a **target point**. In the second case the factor is the distance base → target divided by the distance base → reference.

**State machine** (`select` → `base` → `factor` → `target`), built like the [rotate tool](tool-rotate.md)

- **select**: the select and box interactions are active; Enter continues when something updatable is selected.
- **base**: a click (snapped) or a typed `x,y` sets the base point.
- **factor**: a plain number is the factor (`Tool.handleValue`). Every number is taken in this step, so it is never read as a distance for the reference point. A factor that is not greater than 0 is not applied, and the notice "The scale factor must be greater than 0." stands in front of the prompt. A click or a typed point (`x,y`, or `@dx,dy` / `@distance<angle` relative to the base) is the reference point; a point on the base is ignored because it has no length. The preview draws the leg from the base to the pointer.
- **target**: a click or a typed point completes the factor. A plain length is resolved by `editor.input` to a point at that many metres from the base, so typing `25` scales the reference length to 25 m. A target on the base (factor 0) only shows the notice. The preview shows dashed ghosts of the scaled objects and both legs.

**Completion**

- Scaling is **uniform** (one factor for x and y) and is applied to the editable subset of the [selection](selection.md) (read-only objects are left out, as in rotate). Each geometry is scaled as a copy and submitted as one `updateGeometry`, or one composite for several objects, through [editing](editing.md), so one scale is one undo step. A positive factor keeps the ring winding.
- The selection is cleared and the tool returns to `select`.

**Stepping back**

- Escape: `target` → `factor` → `base` → `select` (clearing the selection) → clear.
- Backspace steps back from the factor and target steps and does nothing in the others.
- Switching tools keeps the selection; losing all editable features from the selection drops back to `select`.

**Aids**

- `referencePoint()` is the base point in the `factor` and `target` steps, so relative [numeric input](numeric-input.md), the angle lock and the perpendicular snap ([snapping](snapping.md)) work from the base. Typing `@10,0` then `@20,0` scales by exactly 2.

## Related

- [Tools framework](tools.md): prompts per step; Escape and Backspace step back; the base is the reference point.
- [Rotate tool](tool-rotate.md): same four-step shape (objects, fixed point, two points); scale adds the typed factor.
- [Move tool](tool-move.md): same select step, preview layer and point picking.
- [Mirror tool](tool-mirror.md): the other transformation built on the rotate pattern; mirror can keep the originals, scale cannot yet.
- [Selection](selection.md): built in the first step, consumed in the last, cleared afterwards.
- [Editing](editing.md): one command per scale.
- [Numeric input](numeric-input.md): the factor as a plain value through `handleValue`; reference and target relative to the base; a plain length in the target step.
- [Snapping](snapping.md): base, reference and target are snapped.
- [Construction tools](construction-tools.md): scale is one of the transformations by base point.
- [UI shell](ui-shell.md): the toolbar's Scale button in the Modify toolbar.

## Surface

- `editor.tools.activate('scale')`, exported `ScaleTool`, `SCALE_PROMPTS`, `ScaleStep`, `scaleGeometry`, `scaleFactor` ([tools.md](../tools.md#scale)).
- Toolbar button Scale, icon `scale` ([ui.md](../ui.md)).

## Open questions

- Non-uniform scaling (separate x / y factors, or along the straightedge axes)?
- A copy option (keep the originals) as the mirror tool has?
- Should point symbols (style sizes) scale with the geometry, or does scaling only touch coordinates?

## Source

- `src/core/tools/scale.ts`
- `src/core/geometry/scale.ts`
- `src/core/tools/pointer.ts`
- `src/core/tools/preview.ts`
