# Edit mode

**Status:** implemented (2026-10-12). The gate itself, the crosshair, the class on the map target and the deactivation on leaving exist; what edit mode should mean beyond that is still open with the project owner (see Open questions).

## Purpose

A CAD workstation separates _looking at the plan_ from _working on it_. Edit mode is that switch: a single boolean on the editor that decides whether the map behaves like a viewer (pan, zoom, click to inspect) or like a drawing board (crosshair, tools, snapping, numeric input). Hosts show or hide their own editing UI on the same flag, and a host-owned map gets its native cursor and interactions back the moment the flag goes off.

## Model

Edit mode is `config.editMode` (default off), read with `isEditMode()` and switched with `setEditMode(on)`; `editmodechange` fires only when the value changes.

**Switching on**

1. The crosshair overlay is created and the native cursor hidden over the map (unless `cursor.crosshair` is off); it is drawn at the [straightedge](straightedge.md) angle.
2. The [grid](grid.md) dot layer is attached (it draws only while `grid.visible` is set).
3. The map target gets the class `olcad-edit-mode` (exported `EDIT_MODE_CLASS`).
4. The inspect-selection interaction is switched off; from now on the [select tool](tool-select.md) does the selecting.

**Switching off**

1. A running straightedge reference pick is ended without changing the angle.
2. The active tool is deactivated (`toolchange` with `null`), which also cancels any drawing or move step in progress, unless it is read-only (the [measure tools](tool-measure.md), 2026-10-13): those keep running.
3. The snap interaction resets (`snap` with `null`).
4. Crosshair, cursor, grid layer and class are restored.
5. The inspect-selection interaction comes back when `selection.inspect` is set.

**Gated by edit mode**

- [Tools](tools.md): `tools.activate` throws and `canActivate` is false while off, except for read-only tools (`Tool.readOnly`, the measure tools), which run while viewing; meanwhile the inspect selection pauses, and snapping and numeric input work for them.
- The [pointer pipeline](pointer-pipeline.md): [snapping](snapping.md), the angle lock and the grid rewrite pointer events only while on.
- Numeric input fails with `input-no-tool` while off, unless a read-only tool is active.
- `straightedge.pick()` throws while off.
- In the [UI shell](ui-shell.md), the attribute form is read-only, tool buttons and Delete are disabled, and the toolbar toggle reflects the state.

**Not gated**

- The [selection](selection.md) survives the switch in both directions. While off, a click still selects for inspection (`selection.inspect`, default on), so a feature's attributes can be viewed, and switching on lets modify, move and delete act on it at once.
- Undo and redo, `editor.execute`, `accept` and `discard` work regardless of the mode: edit mode gates interactive editing, not the API.
- Basemaps, layer visibility and the projection switch are view concerns and are not gated.

## Related

- [Measure tools](tool-measure.md): read-only tools that run with edit mode off and survive leaving it.
- [Moving drafts](draft-move.md): its Move to _layer_ buttons are disabled outside edit mode, like the attribute inputs.
- [Tools framework](tools.md): tools only activate in edit mode; leaving it deactivates the active tool.
- [Selection](selection.md): survives the switch; inspect mode selects while edit mode is off.
- [Select tool](tool-select.md): the same select interaction serves inspect mode outside edit mode.
- [Straightedge](straightedge.md): the crosshair exists only in edit mode; leaving it ends a reference pick.
- [Snapping](snapping.md): snaps only in edit mode; leaving it resets the snap state.
- [Grid](grid.md): the dot layer is attached in edit mode only.
- [Pointer pipeline](pointer-pipeline.md): the whole pipeline is active only in edit mode.
- [UI shell](ui-shell.md): the toolbar toggle, the `edit-mode` attribute and disabled controls mirror the flag.
- [Layer highlight](layer-highlight.md): independent of edit mode; the layer list's Edit button switches edit mode on.
- [Table view](table-view.md): independent of edit mode; the table and its selection work in both.

## Surface

- Config `editMode`, `cursor` ([configuration.md](../configuration.md)).
- `editor.isEditMode()`, `editor.setEditMode(on)`, event `editmodechange`, `EDIT_MODE_CLASS` ([api.md](../api.md#edit-mode)).
- `<olcad-toolbar>` edit-mode toggle ([ui.md](../ui.md)).

## Open questions

- What else should edit mode mean? Candidates: whether the map can be panned by dragging while a tool is active, whether leaving edit mode with unsaved changes needs a confirmation hook, whether edit mode should be per layer (only the active layer editable) or global as today. To be decided with the project owner.
- Should the inspect selection be allowed to clear itself when edit mode is switched on with a tool that cannot use it (for example the draw tool)? Today it stays.

## Source

- `src/core/Editor.ts` (`setEditMode`, crosshair and grid attachment, inspect interaction)
- `src/core/crosshair.ts`
- `src/core/config/defaults.ts`
