# Rotate tool

**Status:** implemented (2026-10-12). The flow below is the project owner's definition, confirmed on 2026-10-12; the tool was built to it the same day as the first construction tool.

## Purpose

Rotate objects the CAD way: pick the objects, pick the centre of rotation, then show the angle with two points, one for the first leg and one for the second. The angle is read off the map rather than typed blind, so "turn this building until its wall is parallel to that road" is one pick on each wall, and snapping makes both legs exact.

## Model

**Definition** (owner, 2026-10-12)

1. The rotate tool is available in edit mode; it can be started with or without a selection.
2. If nothing is selected, the user is prompted to select one or several objects (click, Shift+click adds, Ctrl / Cmd+drag selects a box). Enter confirms that the selection is complete. With a selection already present this step is skipped.
3. The user picks the **centre of rotation**.
4. The user picks a **first point**, which fixes the first leg of the angle from the centre.
5. The user picks a **second point**, which completes the angle: the rotation is the angle from the first leg to the second.
6. When the rotation is applied, the objects are deselected and the user can start the next rotation or change the tool.

**State machine** (`select` → `center` → `start` → `end`), built like the [move tool](tool-move.md)

- **select**: the select and box interactions are active; Enter continues when something updatable is selected; skipped when a selection exists.
- **center**: a click (snapped) or a typed `x,y` sets the centre.
- **start**: a click or a typed point (`x,y`, or `@dx,dy` / `@distance<angle` relative to the centre) fixes the first leg; a point on the centre is ignored because it has no direction. The preview draws the leg from the centre to the pointer.
- **end**: a click or a typed point completes the angle. The preview shows dashed ghosts of the rotated objects plus both legs. The angle is counter-clockwise positive, measured from the first leg to the second.

**Completion**

- The rotation is applied to the editable subset of the [selection](selection.md); geometries are snapshotted, rotated in place around the centre and submitted as one `updateGeometry` or composite through [editing](editing.md) (the same snapshot-restore-submit pattern as the move tool), so one rotation is one undo step.
- The selection is cleared and the tool returns to `select`, prompting for the next objects; the tool stays active until the user switches.

**Stepping back**

- Escape: `end` → `start` → `center` → `select` (clearing the selection) → clear.
- Backspace steps back from the angle points (`end` → `start` → `center`) and does nothing in the other steps.
- Switching tools keeps the selection; losing all editable features from the selection (undo, delete) drops back to `select`.

**Aids**

- `referencePoint()` is the centre in the `start` and `end` steps and `null` otherwise, so relative [numeric input](numeric-input.md), the angle lock and the perpendicular snap ([snapping](snapping.md)) work from the centre. Typing `@100<0` then `@100<90` therefore rotates by exactly 90°.
- Each step change updates the prompt (`toolprompt`).

**Pattern**

Objects, centre, first point, second point is the shape scale and mirror take as well; rotate is the template for the remaining transformations in [construction tools](construction-tools.md).

## Related

- [Tools framework](tools.md): prompts per step; Escape and Backspace step back; the centre is the reference point.
- [Move tool](tool-move.md): same state-machine skeleton, select step, preview layer and command pattern; shares the point-picking interaction.
- [Selection](selection.md): built in the first step, consumed in the last, cleared afterwards.
- [Editing](editing.md): one command per rotation.
- [Numeric input](numeric-input.md): centre as `x,y`, angle points relative to the centre.
- [Snapping](snapping.md): all three points are snapped; perpendicular from the centre.
- [Construction tools](construction-tools.md): the first transformation delivered; scale and mirror follow its shape.
- [UI shell](ui-shell.md): the toolbar's Rotate button, enabled in edit mode.
- [Mirror tool](tool-mirror.md): follows the same select-then-points pattern.
- [Scale tool](tool-scale.md): same four steps with a base point instead of the centre; adds a typed factor.

## Surface

- `editor.tools.activate('rotate')`, exported `ROTATE_PROMPTS`, `RotateStep`, `rotateFeatures`, `rotationAngle`, `PointPickInteraction` ([tools.md](../tools.md#rotate)).
- Toolbar button Rotate ([ui.md](../ui.md)).

## Open questions

- Typed angle: should the second-point step also accept a plain number as the rotation angle in degrees (CAD's "rotate 45"), beside the point forms?
- Should the preview show the angle value (live measurement, milestone 5 / 6) next to the second leg?
- Copy-and-rotate (keep the originals) as an option, as CAD offers?

## Source

- `src/core/tools/rotate.ts`
- `src/core/tools/pointer.ts`
- `src/core/tools/modify.ts` (`snapshot`, `submitGeometryChanges`)
- `src/core/tools/preview.ts`
