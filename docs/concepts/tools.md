# Tools framework

**Status:** partial (2026-10-12). The `Tool` contract, `BaseTool`, the manager, options, prompts and suspension exist; `select`, `draw`, `modify` and `move` are built on it. Registration of host tools on the editor is planned (milestone 6); construction tools are planned.

## Purpose

A tool is a mode of the pointer: while it is active, clicks and drags mean one thing (place a vertex, pick a base point). Exactly one tool is active at a time, every tool is driven by the same verbs (Escape, Enter, Backspace, typed input) and every tool changes data only through commands. The framework makes those rules uniform so the toolbar, the command line, the keyboard bindings and hosts can treat all tools alike, including tools a host adds.

## Model

**The contract** (`Tool`)

- `id`; `canActivate(ctx, options)` states the preconditions (edit mode is checked by the manager; the tool adds its own: a layer to insert into, an updatable selection).
- `activate(ctx, options)` adds the tool's OpenLayers interactions; `deactivate()` removes them (and cancels in-progress work). A tool must not add its own `ol/interaction/Snap`: snapped coordinates come from the [pointer pipeline](pointer-pipeline.md).
- `getOptions()` reports the options in effect (the draw tool reports the geometry type it actually draws).
- Verbs: `cancel()` (Escape), `finish()` (Enter), `removeLastPoint()` (Backspace / Delete, returns whether it dropped or removed something), `handleInput(coordinate)` (a typed point, already resolved by [numeric input](numeric-input.md); returns whether the tool took it), `handleValue(value)` (a plain number offered to a step that asks for a value rather than a point, before it is resolved as a distance; `BaseTool` returns `false`).
- `referencePoint()`: the last fixed point of the tool's current step (last sketch vertex, move base point) or `null`. It is the anchor for the perpendicular snap, the angle lock and relative input, and it is `null` whenever the tool has no "previous point" so those aids stay off.
- `getPrompt()` plus `ctx.promptChanged()`: multi-step tools say what they expect next; the editor emits `toolprompt` and the command line shows it.
- `setSuspended(on)`: the straightedge reference pick parks the tool's interactions and resumes them afterwards.

**The context** (`ToolContext`)

`map`, `layers`, `selection`, `execute`, active and draft layer ids, the hit tolerance (half the pick box), `canUpdate(feature)`. Tools never reach the editor otherwise.

**The manager**

1. `activate(id, options)`: edit mode required; `canActivate` false → return `false`; otherwise deactivate the current tool, activate the new one, re-apply suspension, emit `toolchange { id, options }`.
2. After every `toolchange` the editor re-adds the snap interaction so it stays last on the map (OpenLayers hands events to interactions last-added first); see [pointer pipeline](pointer-pipeline.md).
3. `deactivate()` emits `toolchange` with `null`. Leaving [edit mode](edit-mode.md) deactivates.
4. The verbs and `referencePoint` are forwarded to the active tool; without one they are no-ops.

**Options**

`ToolOptions` is an open record; `type` is the shared key for geometry types. The three draw buttons are one tool with three option sets, and the pressed button is the one whose options match the ones in effect.

**Preconditions and the UI**

The toolbar asks `canActivate` for every button and greys out those that fail, so what the UI shows is exactly what the API would allow ([UI shell](ui-shell.md)).

**Keyboard verbs across tools**

| Key       | Framework meaning                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Escape    | `cancel()`: abort the current step or drawing; without a tool, clear the selection                                                          |
| Enter     | `finish()`: complete the drawing / continue to the next step                                                                                |
| Backspace | `removeLastPoint()` for the drawing, construction, move and modify tools (returns whether it did something); otherwise delete the selection |
| Delete    | in modify, `removeLastPoint()` removes the vertex under the pointer; otherwise delete the selection                                         |

**Planned**

- `editor.tools.register(tool)` / `unregister(id)` for host tools, with the same preconditions and toolbar integration (`TOOL_BUTTONS` extension).
- [Construction tools](construction-tools.md) built on the move tool's base-point pattern.
- Configurable shortcuts for activating tools (CLAUDE.md section 6).

## Related

- [Text tool](tool-text.md): uses both the value channel (height) and the text channel (the text).
- [Measure tools](tool-measure.md): the first read-only tools (`Tool.readOnly`), allowed outside edit mode.
- [Parallel tool](tool-parallel.md): keeps its reference across inserts; `handleValue` for the length.
- [Edit mode](edit-mode.md): tools activate only in edit mode; leaving it deactivates.
- [Pointer pipeline](pointer-pipeline.md): tools receive snapped and constrained coordinates; the snap interaction is re-added after every tool change.
- [Snapping](snapping.md): the perpendicular mode uses the tool's reference point.
- [Constraints](constraints.md): the angle lock applies only while the tool has a reference point.
- [Straightedge](straightedge.md): a reference pick suspends the active tool.
- [Numeric input](numeric-input.md): resolves text to a coordinate and hands it to `handleInput`.
- [Editing](editing.md): `ctx.execute` is the only way a tool changes data.
- [Selection](selection.md): shared through the context; survives tool switches.
- [Select tool](tool-select.md), [Draw tool](tool-draw.md), [Modify tool](tool-modify.md), [Move tool](tool-move.md), [Rotate tool](tool-rotate.md): the built-in tools.
- [Construction tools](construction-tools.md): the planned tools and how they fit the contract.
- [UI shell](ui-shell.md): toolbar buttons mirror `canActivate`; the command line shows prompts; keyboard shortcuts call the verbs.
- [Rectangle tool](tool-rectangle.md): a two-step drawing tool aligned with the straightedge through `ctx.getStraightedgeAngle()`.
- [Circle tool](tool-circle.md): one tool with three construction methods selected through `ToolOptions.method`; measures through `ctx.getProjection()` and linearizes with `ctx.getCurveTolerance()`.
- [Regular polygon tool](tool-regular-polygon.md): first tool with a value step; `Tool.handleValue` and `ToolOptions.sides` were added for it.
- [Curve tool](tool-curve.md): four steps with a grip loop (pick a handle, place it); Enter inserts; the raw pointer position from `PointPickInteraction` hit-tests the handles.
- [Offset tool](tool-offset.md): three steps with a value step and the shared select interaction; watches the selection like the rotate tool.
- [Trim tool](tool-trim.md) and [Extend tool](tool-extend.md): boundary-first tools on the shared `BoundaryTool` base.
- [Template copy tool](tool-template-copy.md) and [template insert tool](tool-template-insert.md): first users of `handleText` and `ctx.done()`.
- [Mirror tool](tool-mirror.md): answers a question through `handleText`.
- [Scale tool](tool-scale.md): takes its factor through `handleValue`; the base is the reference point.
- [Ellipse tool](tool-ellipse.md): a flyout of three methods; the other half-axis typed through `handleValue`.

## Surface

- `editor.tools` (`list`, `getActive`, `getActiveOptions`, `getPrompt`, `canActivate`, `activate`, `deactivate`, `cancel`, `finish`, `removeLastPoint`; `ToolManager.handleValue`), events `toolchange`, `toolprompt`, exported `BaseTool`, `Tool`, `ToolContext`, `ToolOptions` ([api.md](../api.md), [tools.md](../tools.md)).

## Open questions

- Should Escape with no in-progress step deactivate the tool (CAD: Escape twice leaves the command) or only clear the selection, as today?
- Should the selection be cleared when a tool that does not use it (draw) is activated?
- Tool shortcuts: single letters (`L` line, `M` move) as in CAD, or modifier combinations to avoid clashing with host pages?

## Source

- `src/core/tools/Tool.ts`
- `src/core/tools/ToolManager.ts`
- `src/core/tools/index.ts`
- `src/core/Editor.ts` (`tools` API, snap re-add on `toolchange`)
- `src/ui/keyboard.ts`
