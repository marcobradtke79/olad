# Straightedge

**Status:** implemented (2026-10-12). Escape during a reference pick is handled twice (see Open questions).

## Purpose

The drafting machine's parallel straightedge: a ruler fixed at an angle that every orthogonal construction refers to. In ol-cad it is the rotatable crosshair shown in edit mode. Its angle is the base for the angle lock and for polar and length input, so "0°" can mean "along this building" instead of "east", and a reference pick aligns it with an existing segment in one click.

## Model

**Crosshair**

- Two full-map lines through the pointer with a pick box at the crossing, rotated by the straightedge angle; it replaces the native cursor in [edit mode](edit-mode.md) and hides over map controls and when the pointer leaves the map.
- It jumps to the snapped position and shows the snap marker ([pointer pipeline](pointer-pipeline.md)).

**Angle**

- Degrees counter-clockwise from the screen x-axis, normalised to `[0, 360)`; **screen space**, so view rotation or a projection switch does not change it.
- Base for [constraints](constraints.md) (allowed directions are multiples of the step from this angle) and for [numeric input](numeric-input.md) (polar angles are relative to it; a typed length with no pointer goes along it).

**Colour**

`cursor.color` can be changed live (light over a dark basemap); it also colours the grid dots.

**Reference pick** ("Align to segment")

1. `pick()` (edit mode required) suspends the active tool ([tools framework](tools.md)), turns the pick box into the pick colour and highlights the candidate segment under the pointer.
2. The next click on a line or polygon of an editor layer (the click is snapped) sets the angle to that of the segment nearest the click, in `[0, 180)`. Clicks on nothing or on a point keep the pick running.
3. The pick ends, the tool resumes. `cancelPick()`, Escape in the toolbox and leaving edit mode end it without changing the angle.

## Related

- [Text tool](tool-text.md): a new text takes the straightedge angle as its rotation.
- [Parallel tool](tool-parallel.md): the user follows the reference object with the crosshair.
- [Constraints](constraints.md): the angle lock's directions are relative to the straightedge angle.
- [Numeric input](numeric-input.md): polar angles and the default direction of a typed length are relative to it.
- [Pointer pipeline](pointer-pipeline.md): the crosshair is the feedback channel; the pick click is snapped.
- [Edit mode](edit-mode.md): exists only in edit mode; leaving ends a pick.
- [Tools framework](tools.md): a pick suspends and resumes the active tool.
- [Modify tool](tool-modify.md): a picked vertex follows the crosshair until it is placed.
- [UI shell](ui-shell.md): the straightedge toolbox (angle, reset, align) and the View menu colour switch on the test page.
- [Rectangle tool](tool-rectangle.md): its sides follow the straightedge angle.
- [Ellipse tool](tool-ellipse.md): the box of its box construction follows the straightedge angle.

## Surface

- Config `cursor` (`crosshair`, `pickBoxSize`, `color`, `pickColor`, `angle`) ([configuration.md](../configuration.md)).
- `editor.straightedge` (`getAngle`, `setAngle`, `getColor`, `setColor`, `pick`, `cancelPick`, `isPicking`), events `straightedgechange`, `straightedgepick` ([api.md](../api.md)).
- `<olcad-straightedge>` ([ui.md](../ui.md)).

## Open questions

- Escape during a pick: the toolbox cancels the pick from its own key listener and the keyboard binding also runs (it does not check `defaultPrevented`), so the same key may cancel the suspended tool or clear the selection. Decide: the binding skips handled events, or the editor owns Escape during a pick.
- Should the straightedge angle be stored per layout (persisted like the dock layout) or reset per session?
- Should a pick on two points (two clicks) be offered beside the segment pick?

## Source

- `src/core/crosshair.ts`
- `src/core/Editor.ts` (`straightedge`, `startPick`, `endPick`, `segmentAtPixel`)
- `src/core/geometry/segments.ts`
- `src/ui/elements/OlcadStraightedge.ts`
