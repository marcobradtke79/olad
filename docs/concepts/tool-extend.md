# Extend tool

**Status:** implemented (2026-10-13). Defined by the project owner on 2026-10-13 together with the [trim tool](tool-trim.md): the boundary is picked first, then any number of clicks on lines each extend the clicked end to it; the selection is cleared once a line has been changed.

## Purpose

EXTEND closes gaps: a road that stops short of a junction, a fence line that should meet a parcel edge. The user names the boundary once and clicks the lines near the end that should reach it; the end segment is lengthened in its own direction, so the line keeps its course.

## Model

**Definition** (owner, 2026-10-13)

1. The user selects the boundary line (prompted when nothing is selected).
2. Every following click on a line extends that line up to the boundary.
3. After an operation the selection is cleared.

**State machine**: the same as the [trim tool](tool-trim.md) (`BoundaryTool`): **boundary** (selection or click; lines and polygon edges, read-only included) → **target** (clicks on lines with the raw pointer position, dashed preview of the extension, one command per click, selection cleared, boundary kept) → Enter / Escape / Backspace back to **boundary**.

**Geometry** (`extendLine` in `src/core/geometry/trim.ts`)

- The end to extend is the line end nearer to the click, measured along the line (for a multi-line, along the clicked part).
- A ray from that end in the direction of its end segment (coincident vertices skipped) is intersected with the boundary segments; the first crossing ahead becomes the new end. The end vertex moves there: no vertex is added and the line keeps its vertex count.
- Refused (nothing changes, the prompt says why): the ray misses every boundary, the end already lies on a boundary, the line has no length.

**Result** ([editing](editing.md)): one `updateGeometry`; lines the user may not update are refused ([layers and editability](layers-and-editability.md)); the result is validated ([validation](validation.md)).

**UI** ([UI shell](ui-shell.md)): button Extend in the Trim / Extend toolbar; prompts per step with the reason in front when a click changed nothing; Backspace steps back.

## Related

- [Trim tool](tool-trim.md): the same boundary-first steps and base class; removes the clicked part instead.
- [Tools framework](tools.md): two-step tool on the shared `BoundaryTool` base.
- [Select tool](tool-select.md): reuses the select interaction for the boundary step.
- [Selection](selection.md): the selection is the boundary; it is cleared once a line has been extended.
- [Editing](editing.md): one `updateGeometry` per click.
- [Layers and editability](layers-and-editability.md): boundaries may be read-only; extended lines need `update`.
- [Validation](validation.md): the extended geometry is validated like any command.
- [Snapping](snapping.md): not used in the target step; the raw pointer position picks the line and the end.
- [Construction tools](construction-tools.md): extend is one of the geometric modifications listed there.
- [UI shell](ui-shell.md): button in the Trim / Extend toolbar.

## Surface

- `editor.tools.activate('extend')`, exported `ExtendTool`, `EXTEND_PROMPTS` ([tools.md](../tools.md#extend), [api.md](../api.md)).
- Toolbar button Extend, icon `extend` ([ui.md](../ui.md#olcad-toolbar)).

## Open questions

- Extending both ends of a line with one click when both reach the boundary.
- Extending arcs and curves along their curvature rather than along the last chord, once arcs exist.
- Extending to the apparent extension of a boundary that is itself too short.

## Source

- `src/core/tools/extend.ts`
- `src/core/tools/boundary.ts`
- `src/core/geometry/trim.ts`
- `src/core/geometry/intersect.ts`
