# UI shell

**Status:** partial (2026-10-14). Dock, panels, flyouts, compact toolboxes, toolbar, command line, layer list, attribute form, menubar, icons, tooltips, dark / light theme and keyboard shortcuts exist. Translated labels, configurable shortcuts and the complete element set are milestone 8.

## Purpose

The Web Components are an optional convenience layer: everything they do goes through the public API and events, so a host can replace any of them. They give a CAD-like workbench (dockable toolboxes, a command line at the bottom, a crosshair instead of a cursor) to a plain HTML page without a framework, and they encode the editing preconditions visually (greyed buttons) so the UI never offers what the core would refuse.

## Model

**Binding pattern**

- Every element that talks to the editor has an `editor` property: setting it subscribes to the events it needs and renders; setting `null` or the editor's `destroy` unbinds. Elements never reach into the core beyond the public API.
- Elements render into light DOM so the theme and host CSS apply; custom elements may be upgraded in any order, so containers do not assume upgraded children.

**Layout**

- `<olcad-dock>` with four zones around a centre (the map) and a floating layer; `<olcad-panel>` is dragged by its grip, docks near an edge, floats elsewhere; layout persists by `storage-key` or through `getLayout` / `setLayout`.
- Every named toolbar and panel can be shown and hidden (2026-10-14): visibility is part of the layout and persists with it; the View menu (`bindPanelMenu`) offers Show all, Hide all and a checkbox per toolbar and panel; Reset layout returns to the authored state. A panel whose content decides its visibility opts out with `no-toggle` (the [table view](table-view.md) panel).
- Side-docked panels can be `flyout` tabs; toolboxes are `compact` (grip-only header). The dark theme is default, `olcad-theme` switches.

**Toolbar**

- Edit-mode toggle ([edit mode](edit-mode.md)), active layer status, Undo / Redo, tool buttons, Delete. Buttons are enabled exactly when `canActivate` holds ([tools framework](tools.md)); the three draw buttons are one tool with options; Delete needs a selection in edit mode ([selection](selection.md)).
- Toolbars are composable: `tools` picks the tool buttons, `controls` the fixed controls, the heading names the group. The reference layout (test page, vanilla example, 2026-10-12) has four toolbars in the top row: Main (edit mode, layer, undo / redo, Select, Delete, host zoom buttons), Draw (new objects: point, line, polygon, rectangle, circle, regular polygon, curve), Modify (vertices, move, rotate, offset) and Trim / Extend (trim, extend; 2026-10-13).
- The toolbar installs the keyboard shortcuts unless `no-keyboard`; toolbars bound to one editor share a single binding.

**Keyboard shortcuts** (`bindKeyboard`, on `document`, ignored inside inputs, editable elements and open dialogs)

| Key                              | Action                                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| Escape                           | `tools.cancel()`; without a tool, clear the selection                                              |
| Enter                            | `tools.finish()` (not on focused buttons and links)                                                |
| Backspace                        | `removeLastPoint` for the drawing, construction, move and modify tools, otherwise delete selection |
| Delete                           | delete selection                                                                                   |
| Ctrl / Cmd+Z                     | undo                                                                                               |
| Shift+Ctrl / Cmd+Z, Ctrl / Cmd+Y | redo                                                                                               |

**Command line** (`<olcad-input-bar>`)

Shows the active tool's prompt (per step), echoes accepted [numeric input](numeric-input.md), shows input and validation errors, projection switches and inserts; Enter sends text to `editor.input`, Enter on empty finishes, Escape cancels.

**Toolboxes**

[Straightedge](straightedge.md) (angle, reset, align to segment), [snapping](snapping.md) (toggle, radius, modes), [grid](grid.md) (toggle, spacing with unit, show), [constraints](constraints.md) (lock, presets, step), projection select, length unit select (`<olcad-unit-select>`, [measurement](measurement.md); 2026-10-14). Each mirrors one `editor.*` namespace and follows its change event.

**Layer list and attribute form**

The layer list (2026-10-13) shows basemaps and one row per layer with its name and icon buttons: visibility, [highlight](layer-highlight.md), Edit (edit mode on, layer active, no tool started; [layers and editability](layers-and-editability.md)) and info, which opens the geometry type, editability, object count, snap flag, data projection and id below the row; the attribute form edits the selected feature and pops up after inserts ([attributes](attributes.md)). A New layer button and Settings buttons on local rows open the layer dialog for [local layers](local-layers.md). A Table button per layer row opens the [table view](table-view.md) in a bottom panel above the command line (2026-10-13).

**Menubar**

`<olcad-menubar>` turns the host's own buttons and checkboxes into an accessible menu; it needs no editor and is where host actions (Save, Discard, Reset, Import…, Export…) live; they open the [import](import.md) and [export](export.md) dialogs.

**Planned (milestone 8)**

- Translated labels and tooltips from `locale`.
- Configurable shortcuts for tools and snap toggles.
- Which tools appear stays configurable (`tools` attribute); host-registered tools get buttons through `TOOL_BUTTONS`.

**Command line focus.** While the active tool's step expects typing ([numeric input](numeric-input.md): `getInputRequest`), the input bar is focused and highlighted (`olcad-input-bar--awaiting`); afterwards it gives the focus back to the page.

## Related

- [Text tool](tool-text.md): button Draw text in the Draw toolbar.
- [Measure tools](tool-measure.md): the Measure toolbar and the Measure panel (`<olcad-measure-results>`).
- [Parallel tool](tool-parallel.md): button Draw parallel in the Draw toolbar.
- [Edit mode](edit-mode.md): toggle, `edit-mode` attribute, disabled controls.
- [Moving drafts](draft-move.md): a move button on each fitting row of the Layers panel, which opens for selected drafts.
- [Tools framework](tools.md): buttons mirror `canActivate`; prompts in the command line; shortcuts call the verbs.
- [Selection](selection.md): Delete button and keys; Escape clears without a tool.
- [Numeric input](numeric-input.md): the input bar is its UI.
- [Straightedge](straightedge.md), [Snapping](snapping.md), [Grid](grid.md), [Constraints](constraints.md): one toolbox each.
- [Attributes](attributes.md): the form and its popup.
- [Layers and editability](layers-and-editability.md): the layer list and its Edit entry point.
- [Rotate tool](tool-rotate.md): toolbar button, enabled in edit mode; prompts in the command line.
- [Rectangle tool](tool-rectangle.md): toolbar button, enabled when a target layer accepts polygons.
- [Circle tool](tool-circle.md): the toolbar's first flyout button (triangle toggle, right-click, long press; menu of the construction variants; the button shows the one chosen last).
- [Regular polygon tool](tool-regular-polygon.md): toolbar button Draw regular polygon, enabled when a target layer accepts polygons; the command line echoes the side count it takes as a value.
- [Curve tool](tool-curve.md): button Draw curve in the Draw toolbar, enabled when a target layer accepts lines; Enter inserts.
- [Offset tool](tool-offset.md): button Offset in the Modify toolbar, enabled in edit mode; the command line echoes the distance.
- [Trim tool](tool-trim.md) and [Extend tool](tool-extend.md): buttons in the Trim / Extend toolbar, enabled in edit mode.
- [Layer highlight](layer-highlight.md): the layer list's highlight button wraps `setHighlighted`.
- [Templates](templates.md): the Templates panel `<olcad-template-list>` and the Copy to template button.
- [Template copy tool](tool-template-copy.md) and [template insert tool](tool-template-insert.md): started from the Modify toolbar and the Templates panel.
- [Mirror tool](tool-mirror.md): button Mirror in the Modify toolbar.
- [Scale tool](tool-scale.md): button Scale in the Modify toolbar.
- [Ellipse tool](tool-ellipse.md): flyout button Draw ellipse in the Draw toolbar.
- [Table view](table-view.md): a bottom-docked panel above the command line and the CRS bar, opened from the layer list.
- [Local layers](local-layers.md): New layer and Settings buttons in the layer list, the `<olcad-layer-editor>` dialog and `persistLocalLayers`.
- [Export](export.md): the `<olcad-export-dialog>`, opened from the host's File menu.
- [Import](import.md): the `<olcad-import-dialog>`, opened from the host's File menu.
- [Layer styles](layer-styles.md): View → Layer styles… opens `<olcad-layer-style-dialog>`.

## Surface

- All elements, attributes, CSS custom properties, `bindKeyboard`, `ICONS`, `installTooltips` ([ui.md](../ui.md)).

## Open questions

- Should the keyboard binding skip events another element already handled (`defaultPrevented`)? See the straightedge Escape question.
- Mobile / touch: is a touch layout (larger pick box, no hover tooltips) in scope for v1?

## Source

- `src/ui/index.ts`
- `src/ui/elements/OlcadDock.ts`
- `src/ui/elements/OlcadPanel.ts`
- `src/ui/elements/OlcadToolbar.ts`
- `src/ui/elements/OlcadInputBar.ts`
- `src/ui/elements/OlcadLayerList.ts`
- `src/ui/elements/OlcadFeatureTable.ts`
- `src/ui/elements/OlcadMenubar.ts`
- `src/ui/keyboard.ts`
- `src/ui/tooltip.ts`
- `src/ui/icons.ts`
- `src/ui/theme.css`
