# Trim tool

**Status:** implemented (2026-10-13). Defined by the project owner on 2026-10-13: the boundary is picked first, then any number of clicks on lines each remove the clicked part; the selection is cleared once a line has been changed. Own planar math, no geometry library ([decision 0003](../decisions/0003-planar-offset-without-geometry-library.md)).

## Purpose

TRIM is the CAD way to clean up where lines run past each other: a road drawn across a junction, a kerb overshooting a parcel boundary. The user names the cutting edge once and then clicks the overshooting pieces away, so a drawing is tidied in a few clicks without editing vertices.

## Model

**Definition** (owner, 2026-10-13)

1. The user selects the boundary line (prompted when nothing is selected).
2. Every following click on a line removes the part that was clicked on, up to the boundary.
3. After an operation the selection is cleared.

**State machine** (shared with the [extend tool](tool-extend.md), `BoundaryTool`)

1. **boundary**: the selected features with segments (lines and polygon edges, read-only layers included) are the cutting edges; with such a selection on activation the step is skipped, so several edges can be pre-selected. Otherwise the shared select interaction of the [select tool](tool-select.md) picks one. Points are no boundary.
2. **target**: the select interaction is off; clicks go to the tool. The clicked line is the `LineString` / `MultiLineString` nearest to the **raw** pointer position within the pick radius (at least 10 px), boundaries excluded; [snapping](snapping.md) does not move the click onto another line. A dashed preview shows the boundary and, under the pointer, the piece a click would remove. Each successful click is one command (one undo step); the [selection](selection.md) is cleared, the tool keeps the boundary and stays in **target**.
3. Enter, Escape or Backspace drop the boundary, clear the selection and return to **boundary**. Escape in **boundary** clears the selection. Switching tools keeps the selection.

**Geometry** (`trimLine` in `src/core/geometry/trim.ts`)

- Crossings of the clicked line (or the clicked part of a multi-line) with the boundary segments are found as positions along the line; crossings of the line with itself do not count.
- The click is projected onto the line. The piece between the nearest crossing before and the nearest crossing after the click is removed; without a crossing on one side the piece runs to that end. A crossing through a vertex reuses the vertex.
- No crossing bounding the clicked piece, or nothing left of the line: the click changes nothing and the prompt says why.

**Result** ([editing](editing.md))

- An end piece: one `updateGeometry`.
- An interior piece of a `LineString`: the line is split. The original keeps its id and the first part (`updateGeometry`); the second part is inserted into the same layer with the original's attributes (id property removed) — one `composite` labelled `trim`. Needs `insert` on the layer ([layers and editability](layers-and-editability.md)), else the click is refused. The insert emits `featureinsert`, so the [attribute](attributes.md) popup opens for schema layers.
- An interior piece of a `MultiLineString`: the part becomes two parts of the same feature.
- Lines the user may not update are refused; a result failing [validation](validation.md) is rejected and the tool keeps the boundary.

**UI** ([UI shell](ui-shell.md))

Button Trim in the Trim / Extend toolbar; prompts per step in the command line, with the reason in front when a click changed nothing; Backspace steps back.

## Related

- [Tools framework](tools.md): two-step tool on the shared `BoundaryTool` base; selection watching, suspension, Escape / Enter / Backspace back to the boundary.
- [Extend tool](tool-extend.md): the same boundary-first steps; extends the clicked end instead of removing the clicked part.
- [Select tool](tool-select.md): reuses the select interaction for the boundary step.
- [Selection](selection.md): the selection is the boundary; it is cleared once a line has been trimmed.
- [Editing](editing.md): one `updateGeometry`, or a composite of update and insert for a split.
- [Layers and editability](layers-and-editability.md): boundaries may be read-only; trimmed lines need `update`, splits also `insert`.
- [Attributes](attributes.md): the inserted second part copies the original's attributes; the popup opens for schema layers.
- [Validation](validation.md): the trimmed geometry is validated like any command.
- [Snapping](snapping.md): not used in the target step; the raw pointer position picks the line and the piece.
- [Construction tools](construction-tools.md): trim is one of the geometric modifications listed there.
- [Offset tool](tool-offset.md): the previous geometric modification; same pattern of selection-first steps and own planar math.
- [UI shell](ui-shell.md): button in the Trim / Extend toolbar.

## Surface

- `editor.tools.activate('trim')`, exported `TrimTool`, `TRIM_PROMPTS`, `BoundaryTool`, `BoundaryStep`, `BoundaryFailure` ([tools.md](../tools.md#trim), [api.md](../api.md)).
- Toolbar button Trim, icon `trim` ([ui.md](../ui.md#olcad-toolbar)).

## Open questions

- Trimming polygons (cutting a ring at a boundary) — today only lines are targets.
- Apparent intersections: trimming at the extension of a boundary that does not reach the line (AutoCAD's edge mode "extend").
- Should the attribute popup open for the split-off part, which already carries the original's attributes?
- Fence or crossing selection of several pieces to remove in one go.

## Source

- `src/core/tools/trim.ts`
- `src/core/tools/boundary.ts`
- `src/core/geometry/trim.ts`
- `src/core/geometry/intersect.ts`
- `src/core/tools/select.ts`
- `src/core/tools/pointer.ts`
- `src/core/tools/preview.ts`
