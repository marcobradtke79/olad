# UI elements

```ts
import 'ol-cad/ui.css';
import { defineElements } from 'ol-cad/ui';
defineElements(); // registers every <olcad-*> element, safe to call twice
```

The theme is a dark CAD look by default (see [Theme](#theme) for the light variant). Toolbox buttons are icons with an accessible name and a tooltip (see [Icons and tooltips](#icons-and-tooltips)). Elements render into light DOM so the theme and the host's CSS apply. Elements that talk to the editor are bound with `element.editor = editor`; setting `null` unbinds. They unbind themselves when the editor is destroyed. Everything an element does goes through the public API, so a host can do the same without the UI.

Attributes that elements read (`name`, `open`, `reveal`, `popup`, `heading`, `dock` …) also exist as properties that reflect to the attribute. Frameworks that set custom element properties (React 19, Vue 3) work with the plain attribute syntax. `ol-cad/ui` adds every tag to TypeScript's `HTMLElementTagNameMap`, so `document.querySelector('olcad-toolbar')` returns an `OlcadToolbar`. For JSX typings see [frameworks.md](frameworks.md#react).

Elements: [`<olcad-menubar>`](#menu-bar), [`<olcad-dock>`](#olcad-dock), [`<olcad-panel>`](#olcad-panel), [`<olcad-toolbar>`](#olcad-toolbar), [`<olcad-straightedge>`](#olcad-straightedge), [`<olcad-snap-settings>`](#olcad-snap-settings), [`<olcad-grid-settings>`](#olcad-grid-settings), [`<olcad-angle-lock>`](#olcad-angle-lock), [`<olcad-input-bar>`](#olcad-input-bar), [`<olcad-projection-select>`](#olcad-projection-select), [`<olcad-unit-select>`](#olcad-unit-select), [`<olcad-layer-list>`](#olcad-layer-list), [`<olcad-feature-table>`](#olcad-feature-table), [`<olcad-layer-editor>`](#olcad-layer-editor), [`<olcad-layer-style-dialog>`](#olcad-layer-style-dialog), [`<olcad-export-dialog>`](#olcad-export-dialog), [`<olcad-import-dialog>`](#olcad-import-dialog), [`<olcad-template-list>`](#olcad-template-list), [`<olcad-measure-results>`](#olcad-measure-results), [`<olcad-attribute-form>`](#olcad-attribute-form).

## Menu bar

```html
<olcad-menubar aria-label="Main menu">
  <olcad-menu label="File">
    <button id="save" type="button">Save</button>
    <label><input id="fail" type="checkbox" /> Simulate server failure</label>
    <hr />
    <button id="reset" type="button">Reset server</button>
  </olcad-menu>
</olcad-menubar>
```

`<olcad-menubar>` (`role="menubar"`, `aria-label` defaults to "Main menu") holds `<olcad-menu>` elements. Each menu renders a button (`.olcad-menu__button`, `aria-haspopup`, `aria-expanded`) with its `label` attribute and a popup (`.olcad-menu__popup`, `role="menu"`) that takes the menu's original children: a `<button>` becomes a `menuitem`, a `<label>` with a checkbox a `menuitemcheckbox` (`aria-checked` follows the input), an `<hr>` a `separator`; all get `.olcad-menu__item` / `__separator`. The host keeps its own ids and click handlers; activating an item runs them and then closes the menu (checkbox items stay open). Disabled buttons are skipped. Keyboard: Enter, Space or Arrow Down on a menu button opens it, Arrow Up / Down, Home / End and type-ahead move inside, Enter / Space activate, Escape closes and refocuses the button, Arrow Left / Right switch menus, Tab leaves. One menu is open at a time; hovering another button while one is open switches; a click outside or focus leaving the bar closes it. Properties: `OlcadMenu.show(focus?)`, `hide(refocus?)`, `open`, `items()`, `refresh()` (decorates items appended to `popup` after the menu was built); `OlcadMenubar.menus()`, `openMenu()`, `closeAll()`. The elements do not need an editor.

**Toolbars and panels in a menu.** `bindPanelMenu(menu, dock)` appends to a menu (the test page's and the vanilla example's View menu) a separator, **Show all toolbars and panels** and **Hide all toolbars and panels** (`data-panel-action="show-all" | "hide-all"`, calling `dock.setAllPanelsVisible`) and one checkbox per entry of `dock.listPanels()` (`input[data-panel="{name}"]`, labelled with the panel's heading; when two headings are equal, `(toolbar)` / `(panel)` is added). Checkboxes call `dock.setPanelVisible` and keep the menu open; the items follow `olcad-layoutchange` (updated in place, rebuilt when panels come or go). Returns a function that removes the items.

## Dockable and floating panels

```html
<olcad-dock storage-key="my-app-layout">
  <olcad-toolbar name="main" dock="top"></olcad-toolbar>
  <olcad-panel name="layers" heading="Layers" dock="right">
    <olcad-layer-list></olcad-layer-list>
  </olcad-panel>
  <div id="map"></div>
</olcad-dock>
```

`<olcad-dock>` lays out four dock zones (top, right, bottom, left) around a centre area, plus a floating layer above everything. Panels go to the zone named by their `dock` attribute; any other child, normally the map element, fills the centre. The top and bottom zones are rows that wrap onto further rows when their panels do not fit the width (panels are never squeezed); the side zones are columns. Each panel has a header with a drag grip, a title and a dock menu. Dragging the grip floats the panel; releasing it within `dropThreshold` pixels of a dock edge docks it there (the zone highlights while hovering), anywhere else leaves it floating at that position. The menu offers the same positions for keyboard users.

### `<olcad-dock>`

Give the dock a height (for example `height: 100%` inside a sized parent, or `height: 100vh`). Do not set its `display` or other layout properties: its own rule (`.olcad-dock`) lays out the zones, and a more specific host rule, such as a Vue scoped style `olcad-dock[data-v-…]`, would override it and stack the zones with a map 0 px tall.

| Attribute / property             | Description                                                                                                                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage-key`                    | Attribute. When set, the layout is saved to `localStorage` under this key after every change and restored when the dock connects.                                           |
| `dropThreshold`                  | Property, default `40`. Distance in pixels from the dock's edge within which a dropped panel docks.                                                                         |
| `getLayout()`                    | `{ [name]: { dock, x, y, hidden? } }` for every panel with a `name` (`hidden: true` only for a hidden panel that can be toggled). Plain JSON.                               |
| `setLayout(layout)`              | Applies placements by panel name. Unknown names are ignored. Use it to persist layouts server-side instead of `storage-key`. Saves once and emits one `olcad-layoutchange`. |
| `defaultLayout()`                | The placement every named panel was authored with (its `dock`, `x`, `y` attributes when it joined the dock, before a stored layout was applied).                            |
| `resetLayout()`                  | Returns every panel to its authored placement, overwrites the stored layout and emits one `olcad-layoutchange`. Returns the resulting layout.                               |
| `listPanels()`                   | `{ name, heading, hidden }[]`: the named panels without `no-toggle`, in document order.                                                                                     |
| `setPanelVisible(name, visible)` | Shows or hides one of them (the `hidden` attribute). Saves and emits one `olcad-layoutchange`.                                                                              |
| `setAllPanelsVisible(visible)`   | Shows or hides all of them at once. Saves and emits one `olcad-layoutchange`.                                                                                               |
| `panels()`                       | The panels inside the dock.                                                                                                                                                 |
| `dropZoneAt(x, y)`               | Which side a drop at client coordinates would dock to, or `null`.                                                                                                           |
| `highlightZone(side)`            | Marks a zone as drop target (`data-drop` attribute on the dock); `null` clears it.                                                                                          |

Events: `olcad-layoutchange` (`detail` is the layout) after any panel moved, was shown or hidden. Restoring the stored layout when panels join the dock does not save (so the stored placements of panels not adopted yet stay intact).

Children may be added at any time; a panel appended later is placed by its `dock` attribute. The dock and the panels may be upgraded in any order, so `defineElements()` can run after the page is parsed.

### `<olcad-panel>`

| Attribute / property   | Description                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                 | Key in the dock layout. Panels without a name are not persisted.                                                                                                                                                                                                                                                                                                            |
| `heading`              | Title shown in the header and used for the grip's accessible label. Default `Panel`.                                                                                                                                                                                                                                                                                        |
| `dock`                 | `top`, `right`, `bottom`, `left` or `floating`. Default `floating`. Reflected as `data-dock`; `orientation` is set to `vertical` for `left` / `right`.                                                                                                                                                                                                                      |
| `x`, `y`               | Floating position in pixels from the dock's top-left corner.                                                                                                                                                                                                                                                                                                                |
| `placement`            | Property: `{ dock, x, y, hidden? }`; setting it applies them at once (`hidden` only when the panel can be toggled).                                                                                                                                                                                                                                                         |
| `hidden` / `no-toggle` | Standard `hidden` attribute: a hidden panel takes no space; the dock stores it in the layout and the View menu switches it. `no-toggle` (boolean attribute, `toggleable` property `false`) leaves the visibility to the panel's content: such a panel is not listed, shown, hidden or stored by the layout. `<olcad-feature-table>` sets it on its panel.                   |
| `flyout`               | Boolean attribute / property. While docked `left` or `right` the panel collapses to its header and shows its content as an overlay over the centre only while `open` (reflected as `data-flyout`). Floating, top and bottom placements show the panel normally.                                                                                                             |
| `open`                 | Boolean attribute / property: whether the flyout shows its content. `toggleFlyout(open?)` opens, closes or toggles it; opening closes the other open flyouts of the same zone.                                                                                                                                                                                              |
| `compact`              | Boolean attribute / property (`compact` or `compact="false"`). No title and no menu button: the grip alone is the header, beside a single row of content. Toolboxes (`<olcad-toolbar>` and the others below, `<olcad-input-bar>`) are compact by default; a plain `<olcad-panel>` is not. Reflected as `data-compact`; not applied while the panel is a side-docked flyout. |
| `content`              | Property: the `.olcad-panel__content` element that holds the panel's children. Append to it to add content after the panel was created.                                                                                                                                                                                                                                     |

Events: `olcad-dockchange` (bubbles; `detail` is `{ name, dock, x, y }`) whenever `dock`, `x` or `y` change; `olcad-flyouttoggle` (`detail` `{ name, open }`) when a flyout opens or closes.

Flyouts: the title in the header is the tab (`role="button"`, `aria-expanded`, `aria-controls`); click, Enter or Space toggle it, Escape inside the open flyout closes it and refocuses the tab. The overlay spans the zone's height and is `--olcad-flyout-width` wide (set it on the panel to size one flyout). The flyout stays open while the map is used; it closes on its tab, Escape, or when another flyout of the zone opens.

Compact panels: the heading becomes the accessible name of the content (`aria-label`, with `role="group"` unless the element sets its own role, as the toolbar does). The grip opens the dock menu on a click without a drag, on Enter, Space or the context menu, and shows the heading in its tooltip.

Keyboard: the grip is a button; with a floating panel, arrow keys nudge it by 10 px (50 px with Shift) and Escape cancels a drag in progress. The dock menu button (or the grip of a compact panel) opens a `role="menu"` with `menuitemradio` items; arrow keys, Home, End and Escape work as expected.

Structure: `.olcad-panel` > `.olcad-panel__header` (`.olcad-panel__grip`, `.olcad-panel__title`, `.olcad-panel__menu-button`, `.olcad-panel__menu` with `.olcad-panel__menu-item`) + `.olcad-panel__content`. Modifier `.olcad-panel--dragging` while a drag is in progress.

### `<olcad-toolbar>`

A toolbar. A compact `<olcad-panel>` (same attributes, default `dock="top"`, default heading `Tools`; the heading is the `aria-label` of the `role="toolbar"` content) with roving arrow-key focus. A page may bind several toolbars to one editor and split the buttons between them with the `tools` and `controls` attributes (the test page and the vanilla example have Main, Draw, Modify, Trim / Extend, Dimension and Measure, see below). All buttons are icon buttons with their name as `aria-label` and a tooltip. The first button is the **edit-mode toggle** (`.olcad-toolbar__edit-toggle`, `aria-pressed`, name "Edit mode"), which calls `editor.setEditMode` and follows `editmodechange`. Then come the active-layer status, a separator (`.olcad-toolbar__separator`, `role="separator"`), Undo / Redo, another separator and the **tool buttons** (`.olcad-toolbar__tool--select`, `--draw-point`, `--draw-line`, `--draw-polygon`, `--rectangle`, `--circle`, `--ellipse`, `--regular-polygon`, `--curve`, `--parallel`, `--text`, `--dimension-linear`, `--dimension-angular`, `--dimension-radial`, `--dimension-survey`, `--modify`, `--move`, `--rotate`, `--scale`, `--offset`, `--trim`, `--extend`, `--mirror`, `--template-copy`, `--measure-distance`, `--measure-area`, `--measure-angle`, `--measure-clear`, `--delete`; names "Select", "Draw point", "Draw line", "Draw polygon", "Draw rectangle", "Draw circle" and "Draw ellipse" (showing their current variant, see below), "Draw regular polygon", "Draw curve", "Draw parallel", "Draw text", "Linear dimension", "Angular dimension", "Radial dimension", "Survey dimension" (showing their current variants), "Vertices", "Move", "Rotate", "Scale", "Offset", "Trim", "Extend", "Mirror", "Copy to template", "Measure distance", "Measure area", "Measure angle", "Clear measurements", "Delete"): a tool button activates its tool (`aria-pressed`) or deactivates it when pressed again; Delete calls `editor.deleteSelection()`; Clear measurements calls `editor.measurements.clear()` and is disabled while there are none. The three draw buttons share the `draw` tool (`data-tool="draw"`, `data-type`) and call `editor.tools.activate('draw', { type })`; the one whose type is in effect (`editor.tools.getActiveOptions()`) is pressed, also when the tool was started elsewhere. Buttons are greyed out while their preconditions do not hold (edit mode, a layer to insert into with a matching type, a deletable selection for Delete; Draw rectangle, Draw circle, Draw ellipse and Draw regular polygon need a layer accepting polygons, Draw curve and Draw parallel one accepting lines, Draw text a text layer (or the draft layer), Linear, Angular, Radial and Survey dimension an active dimension layer; Vertices, Move, Rotate, Scale, Offset, Mirror, Trim, Extend and Copy to template need only edit mode; the three measure buttons are enabled with edit mode off too, since their tools are read-only); with no active layer all three draw buttons draw into the draft layer. The `tools` attribute lists which buttons appear, for example `tools="select draw delete"` (`draw` stands for the three draw buttons, or name them individually). `TOOL_BUTTONS` (exported) maps each button id to its `label`, tooltip `title`, `icon` and, for the draw buttons, `tool` and `options`, and for flyout buttons its `variants`; `toolButtonIds(attr)` and `optionsMatch(buttonOptions, activeOptions)` are exported too.

**Flyout buttons.** A `TOOL_BUTTONS` entry with `variants` (today `circle`, with the constructions centre and radius, centre and point, three points; `ellipse`, with centre and axes, axis ends and half-axis, box corners; `dimension-linear`, with aligned, rotated, chain, baseline, running and tie distance; `dimension-angular`, with three points and two edges; `dimension-radial`, with radius, diameter and arc length; and `dimension-survey`, with orthogonal survey, spot level and slope) renders as a flyout: a wrapper `.olcad-toolbar__flyout` (`--circle`, `--ellipse`, `--dimension-linear`, `--dimension-angular`, `--dimension-radial`, `--dimension-survey`; `data-open` while open) holding the tool button, a small toggle (`.olcad-toolbar__flyout-toggle`, `aria-haspopup="menu"`, `aria-expanded`, drawn as a triangle in the button's bottom-left corner) and a menu (`.olcad-toolbar__flyout-menu`, `role="menu"`, hidden until opened) with one `menuitemradio` item per variant (`.olcad-toolbar__flyout-item`, `aria-checked`, `data-variant`, the variant's icon and its name in `.olcad-toolbar__flyout-label`). The button shows the variant chosen last (the first one by default): its name, icon, tooltip, `data-variant` and, when the variant's options set `method`, `data-method`; a click activates the tool with that variant's options (`editor.tools.activate('circle', { method })`), or deactivates it when pressed. The flyout opens on a click on the triangle (or Enter, Space, Arrow Down on it), a right-click on the button, or a press of 400 ms on it (`LONG_PRESS_MS`, exported; the click ending the press does not activate the tool). It focuses the checked item; Arrow keys and Home / End move, Enter or Space choose a variant (it is shown on the button, activated and the flyout closes, focus returns to the button), Escape closes and refocuses the button without reaching the keyboard shortcuts, Tab, a pointer down outside or focus leaving the flyout close it. The button is pressed whichever variant of its tool is active, and a variant activated through the API is mirrored on the button. `OlcadToolbar.currentVariant(id)` and `isFlyoutOpen(id)` expose the state; the `ToolVariant` type is exported. The menu opens below the button in a horizontal toolbar and beside it in a vertical one (mirrored for `dock="right"` and `dock="bottom"`); it relies on the compact toolbar's content not clipping, so in a `compact="false"` toolbar whose content scrolls the menu is cut off.

**Controls.** The `controls` attribute lists the fixed controls before the tool buttons, in their fixed order: `edit` (the edit-mode toggle), `layer` (the status span) and `history` (Undo / Redo); without the attribute all three appear, `controls=""` renders none (`toolbarControls(attr)` and the `ToolbarControl` type are exported). Separators stand only between the groups that exist (status, history, tools), never at the ends. The `edit-mode` attribute and the greyed-out buttons do not depend on the toggle being shown.

While bound, the toolbar installs the keyboard shortcuts (`bindKeyboard`, see [tools.md](tools.md#keyboard)) on `document`, **once per editor**: toolbars bound to the same editor share one binding, which the last toolbar to unbind releases; set the `no-keyboard` attribute to opt an element out and bind them yourself. While edit mode is on the element carries the `edit-mode` attribute. A status span (`.olcad-toolbar__active-layer`, `aria-live`) after the toggle shows the active layer ("Layer: Parcels") or "No layer selected". Any children the host puts inside the element follow the toggle, so an application can add its own buttons. The reference layout of the test page:

```html
<olcad-toolbar name="main" dock="top" tools="select delete">
  <button type="button" id="zoom-in" aria-label="Zoom in" data-tooltip="Zoom in"></button>
</olcad-toolbar>
<olcad-toolbar
  name="draw"
  heading="Draw"
  dock="top"
  controls=""
  tools="draw rectangle circle ellipse regular-polygon curve parallel text"
></olcad-toolbar>
<olcad-toolbar
  name="modify"
  heading="Modify"
  dock="top"
  controls=""
  tools="modify move rotate scale offset mirror template-copy"
></olcad-toolbar>
<olcad-toolbar
  name="trim"
  heading="Trim / Extend"
  dock="top"
  controls=""
  tools="trim extend"
></olcad-toolbar>
<olcad-toolbar
  name="measure"
  heading="Measure"
  dock="top"
  controls=""
  tools="measure-distance measure-area measure-angle measure-clear"
></olcad-toolbar>
<script>
  for (const toolbar of document.querySelectorAll('olcad-toolbar')) toolbar.editor = editor;
  document.getElementById('zoom-in').append(icon('zoomIn'));
</script>
```

Bind with `element.editor = editor`. The toggle is disabled while unbound.

### `<olcad-straightedge>`

Toolbox for the parallel straightedge (`editor.straightedge`). A compact `<olcad-panel>` (default `dock="top"`, heading `Straightedge`) with:

- a number input (`.olcad-straightedge__input`, degrees, labelled "X axis angle" by a straightedge icon with hidden text) applied on change or Enter, showing the normalised angle;
- **Reset** (`.olcad-straightedge__reset`, icon button) back to 0°;
- **Align to segment** (`.olcad-straightedge__pick`, icon button, `aria-pressed` while picking): starts `editor.straightedge.pick()`, switching edit mode on first when needed. The pick box on the map turns yellow, the segment under the pointer is highlighted, and the next click on a line or polygon aligns the straightedge with its nearest segment. A hint (`.olcad-straightedge__hint`) says what to do; pressing the button again or Escape cancels.

While a pick runs the element carries the `picking` attribute. Bind with `element.editor = editor`.

### `<olcad-snap-settings>`

Toolbox for snapping (`editor.snapping`, see [tools.md](tools.md#snapping)). A compact `<olcad-panel>` (default `dock="top"`, heading `Snap`) with:

- **Snap** (`.olcad-snap-settings__toggle`, icon button, `aria-pressed`): one click turns snapping on or off; the element carries the `snapping` attribute while on.
- **Radius** (`.olcad-snap-settings__tolerance`, number input in pixels with a hidden label and a tooltip, applied on change or Enter; values below 1 are ignored).
- Mode checkboxes **Points**, **Midpoints**, **Perpendicular** and **Tangent** (`label.olcad-snap-settings__mode[data-mode]` as icon toggles: the checkbox is visually hidden and named by `aria-label`, the label shows the icon and carries `olcad-icon-toggle--on` while checked); the last remaining mode cannot be unchecked.

Follows `snappingchange`. Bind with `element.editor = editor`.

### `<olcad-grid-settings>`

Toolbox for grid snap (`editor.grid`, see [tools.md](tools.md#snapping)). A compact `<olcad-panel>` (default `dock="top"`, heading `Grid`) with:

- **Grid snap** (`.olcad-grid-settings__toggle`, icon button, `aria-pressed`): one click turns grid snap on or off; the element carries the `grid` attribute while on.
- **Spacing** (`.olcad-grid-settings__spacing`, number input in view-projection units with a hidden label and a tooltip, applied on change or Enter; values of 0 or less are ignored) followed by the unit of the current projection (`.olcad-grid-settings__unit`: `m`, `°`, `ft`).
- **Show grid** checkbox (`.olcad-grid-settings__show`, an eye icon toggle like the snap modes) that draws the grid as dots in edit mode (`editor.grid.setVisible`).

Follows `gridchange` and `projectionchange`. Bind with `element.editor = editor`.

### `<olcad-angle-lock>`

Toolbox for the angle lock (`editor.constraints`, see [tools.md](tools.md#angle-lock)). A compact `<olcad-panel>` (default `dock="top"`, heading `Angle`) with:

- **Lock angle** (`.olcad-angle-lock__toggle`, icon button, `aria-pressed`): one click turns the lock on or off; the element carries the `locked` attribute while on.
- Preset buttons **90°** and **45°** (`.olcad-angle-lock__preset[data-step]`, `aria-pressed` for the current step, named "Step of 90 degrees"; `ANGLE_PRESETS` exported from `ol-cad/ui`).
- **Step** (`.olcad-angle-lock__step`, number input in degrees with a hidden label and a tooltip, applied on change or Enter; values outside (0, 360] are ignored).

Follows `constraintschange`. Bind with `element.editor = editor`.

### `<olcad-input-bar>`

The command line (see [tools.md](tools.md#numeric-input)). A compact `<olcad-panel>` (default `dock="bottom"`, heading `Command line`) that fills the width of its zone, with:

- an output line (`.olcad-input-bar__output`, `role="status"`, `aria-live="polite"`, `data-kind` `prompt` / `info` / `error`) showing the active tool's prompt (with no tool running and one dimension selected: "Field value of the selected dimension in m; - clears it"), the echo of accepted input (`@100,0 → 935152.37, 6270000.00`, six decimals in a geographic projection; `5 → 5` for a plain number a tool took as a value, `3 m → 9.84 ft` for a length a step took, in the default unit; `Field value 12.47 m` / `Field value cleared` for a selected dimension), input errors, `validationerror` messages, projection switches, unit changes (`Length unit: ft`) and inserts;
- a text input (`.olcad-input-bar__input`): Enter sends the text to `editor.input` and clears it when accepted (an error keeps it for correction); Enter on an empty input calls `editor.tools.finish()`, Escape calls `editor.tools.cancel()` and clears.
- **Typed-input steps**: whenever the active tool's step expects typing (`editor.tools.getInputRequest()` is `'text'` or `'value'`: the text tool's height and text, the template name, the mirror copy question, the number of sides, the offset distance, the scale factor, the circle radius, the ellipse half-axis, the dimension offset and field value), the input is focused and its content selected, so the user types right away, and the element carries the class `olcad-input-bar--awaiting` and `data-input="text|value"` (an accent border and glow; the placeholder reads "Type the text and press Enter" / "Type a value and press Enter"). It does not take the focus while a modal `<dialog>` is open or while another text field outside the bar is focused (the highlight still shows). When such a step ends and the input still has the focus, it gives the focus back to the page, so the map's keyboard shortcuts work again; an input the user focused for a point step is left alone.

Properties: `message` (current output text), `show(text, kind)`. Follows `toolchange`, `toolprompt` (a tool's own prompt per step, else a default per tool, also for a read-only tool while edit mode is off), `editmodechange`, `selectionchange`, `input`, `validationerror`, `projectionchange`, `featureinsert`. Bind with `element.editor = editor`.

## `<olcad-unit-select>`

A `<select>` (`.olcad-unit-select__select`, `aria-label="Length unit"`) for the default length unit (`editor.units.setLength`): `Auto (m)` — the view projection's unit, named in brackets and updated on `projectionchange` — then every unit (`Metres (m)`, `Feet (ft)`, `US survey feet (US ft)` …). Lengths typed without a unit are in it; lengths and areas are shown in its system. Follows `unitschange`. Not a panel: the test page puts it into the CRS panel, the vanilla example into a `Units` panel. Bind with `element.editor = editor`.

## `<olcad-projection-select>`

A `<select>` (`.olcad-projection-select__select`, `aria-label="Projection"`) that switches the view projection with `editor.setProjection`. Options: the initial view projection, `EPSG:3857` (Web Mercator), `EPSG:4326` (WGS 84) and every `projections[]` entry, labelled `code (title)` when a `title` is configured (`projectionOptions(editor)` exported). Follows `projectionchange`; a projection switched to through the API that is not listed is appended. Not a panel: put it inside an `<olcad-panel>` to dock it. Bind with `element.editor = editor`.

## `<olcad-layer-list>`

Two sections:

- **Basemaps** as a radio group (`role="radiogroup"`, buttons with `role="radio"` and `aria-checked`). Clicking calls `editor.basemaps.setActive(id)`.
- **New layer** (`.olcad-layer-list__new`, `data-action="new-layer"`, icon `addLayer`) beside the Layers heading (`.olcad-layer-list__heading-row`): opens the [`<olcad-layer-editor>`](#olcad-layer-editor) dialog for a local layer. Local layers are kept in memory and lost on reload unless the page calls [`persistLocalLayers(editor)`](#persistlocallayerseditor-storage-options), which keeps them in this browser. The list creates the dialog as its own child on first use and keeps it across re-renders.
- **Layers** as rows (`.olcad-layer-list__layer[data-layer-id]`): the layer name (`.olcad-layer-list__title`) and five or six icon buttons (`data-action`, name as `aria-label`, description as tooltip):
  - **Visibility** (`.olcad-layer-list__visible`, "Visible: {title}", `aria-pressed`): icon `eye`, or `eyeOff` while hidden; calls `editor.layers.setVisible`. Hidden rows carry `olcad-layer-list__layer--hidden` (dimmed title).
  - **Highlight** (`.olcad-layer-list__highlight`, "Highlight {title}", `aria-pressed`): calls `editor.layers.setHighlighted`, which draws every object of the layer in the `layerHighlight` style ([configuration.md](configuration.md#layerhighlight)); works for read-only layers too.
  - **Table** (`.olcad-layer-list__table`, "Table of {title}", icon `table`, `aria-pressed` while a table shows the layer): opens the layer in the first [`<olcad-feature-table>`](#olcad-feature-table) bound to the same editor (`show`), or closes it when it already shows this layer. Offered for every layer, read-only and draft included; disabled, with the tooltip "No table panel on this page", while no table is bound.
  - **Edit** (`.olcad-layer-list__edit`, "Edit {title}", `aria-pressed` while the layer is active and edit mode is on): switches edit mode on if needed and makes the layer the active one (`editor.layers.setActive`). It starts no tool, so pick one from the toolbars (a draw tool then inserts into this layer). A draw tool that is already running stays running and follows the new layer when the layer takes its geometry type. Pressing Edit on the active layer clears the active layer while edit mode is on; edit mode stays on. While edit mode is off it switches edit mode back on and keeps the layer active. Disabled for read-only layers. The active row carries `olcad-layer-list__layer--active`.
  - **Move draft** (`.olcad-layer-list__move-draft`, `data-action="move-draft"`, icon `moveToLayer`), only while draft objects are selected and only on the rows of layers that take at least one of them (`editor.layers.draftTargets`): "Move selected draft to {title}" or "Move {n} selected drafts to {title}". It calls `editor.layers.moveDrafts` with the selected drafts that layer takes (one undo step); the copies are selected, the attribute popup asks for each, and the Attributes flyout opens on them. Disabled outside edit mode.
  - **Settings** (`.olcad-layer-list__settings`, "Settings of {title}", icon `settings`), on local layers only (rows carry `olcad-layer-list__layer--local` and show "· local" after the name): opens the dialog for its name, attributes and delete.
  - **Info** (`.olcad-layer-list__info-toggle`, "Details of {title}", `aria-expanded`, `aria-controls`): opens a details list below the row (`dl.olcad-layer-list__details`, items `.olcad-layer-list__detail[data-detail]` with `dt` / `dd`): `geometry`, `editable` (`insert update delete` or `read-only`), `features` (loaded count), `snappable`, `projection` (data projection), `id` and, for local layers, `storage`: `this browser` while [`persistLocalLayers`](#persistlocallayerseditor-storage-options) runs for the editor, else `memory (lost on reload)`. The local row's tooltip says the same. Open details stay open across re-renders.

The element re-renders on `basemapchange`, `layerchange`, `layerload`, `change` (feature counts), `activelayerchange`, `editmodechange`, `selectionchange` (the move buttons), `locallayerchange`, when a feature table is bound, opened or closed (`onFeatureTableChange`) and when `persistLocalLayers` starts or stops (`onLocalLayerPersistenceChange`); the focused row button keeps the focus across the rebuild, so the rows are fully keyboard operable. Attribute `reveal`: a selection holding draft objects opens the `<olcad-panel flyout>` the list sits in (never closes it; nothing outside a flyout), as on the test page. Put it inside an `<olcad-panel>` to make it dockable.

## `<olcad-feature-table>`

The objects of one layer as a read-only table. Bind with `element.editor = editor`; the layer list's Table buttons open it, a host can too:

| Member                     | Description                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `layer` (attribute / prop) | Id of the shown layer, or `null` when closed. Changing it resets sort and filter. An unknown or removed layer closes the table.            |
| `show(layerId)`            | Shows the layer; opens the enclosing panel if it is a closed flyout.                                                                       |
| `close()`                  | Hides the table.                                                                                                                           |
| `featureTablesOf(editor)`  | Exported function: the tables bound to `editor`.                                                                                           |
| `onFeatureTableChange(cb)` | Exported function: `cb` runs when a table is bound, unbound, opened, switched or closed; returns the unsubscriber. The layer list uses it. |

While closed, the element sets `hidden` on its enclosing `<olcad-panel>` (or on itself without one). Inside the bottom dock zone the panel takes a row of its own (`flex-basis: 100%`), so placed before `<olcad-input-bar>` it sits above the command line and the CRS bar, as on the test page and the vanilla example:

```html
<olcad-panel name="table" heading="Table" dock="bottom" hidden>
  <olcad-feature-table></olcad-feature-table>
</olcad-panel>
```

- **Header** (`.olcad-feature-table__header`): layer title, object count (`3 objects`, or `1 of 3` while filtered), filter field (`.olcad-feature-table__filter`: rows containing the text in any column, case-insensitive) and a close button (`.olcad-feature-table__close`, icon `close`).
- **Columns**: the id (headed by `idProperty`; new objects show their `tempId`), the schema fields in schema order (headed by `label`; booleans as yes / no), text and height for text layers; for dimension layers **GIS value**, **Field value** (in place of a schema `fieldValue` column), **Difference** (field − GIS, signed) and **Status** (`ok` / `deviates`), lengths in the default unit (`editor.dimensions.values`); and Geometry: the type plus length (lines) or area (polygons), projection-aware like the measure tools. A header button (`.olcad-feature-table__sort[data-sort]`) sorts ascending, descending, off (`aria-sort`); empty values sort last.
- **Rows** (`tr.olcad-feature-table__row[data-row]`, focusable): click selects the object (`editor.selection.set`), Ctrl / Cmd+click toggles it, Shift+click selects the range from the last clicked row; Enter selects, Shift+Enter or double click zooms the map to it. Dimensions whose field value deviates carry `data-status="deviates"` (drawn in `--olcad-color-error`), stale ones `data-status="stale"` (italic); while the shown dimension layer has stale dimensions the header offers **Update N stale** (`.olcad-feature-table__update-stale`, `data-action="update-stale"`, `editor.dimensions.updateStale`; disabled outside edit mode). Selected rows carry `aria-selected="true"`; a selection made on the map scrolls its first row into view. `data-state="inserted"` / `"updated"` marks the net changes of `editor.changes`.
- Re-renders on `change`, `layerchange`, `layerload`, `projectionchange` and `selectionchange`. Values are edited in `<olcad-attribute-form>`, which follows the selected row; Delete deletes the selected rows through the keyboard shortcut.

## `<olcad-layer-style-dialog>`

A modal dialog (`dialog.olcad-layer-style-dialog__dialog`) for the look of the layers. The host opens it (test page and vanilla example: View → Layer styles…). Bind with `element.editor = editor`; `open(layerId?)`, `close()`, `isOpen`.

- **Order** (left, `ol.olcad-layer-style-dialog__layers`, one `li[data-layer-id]` per layer): the top of the list is drawn on top (the reverse of `editor.layers.list()`). Drag a row onto another to draw it right above that one, or use **Up** / **Down** (`data-action="up" | "down"`, icons `arrowUp` / `arrowDown`); both call `editor.layers.moveLayer`. A dot after the name marks a layer with a user style; the name button (`data-action="select"`) selects the layer.
- **Style** (right, the selected layer; sections by geometry type): Line (`stroke-color`, `stroke-width`, `stroke-dash`), Fill (`fill-color`, `fill-opacity`), Points (`point-radius`, `point-fill`, `point-stroke`, `point-stroke-width`), Texts for text layers (`text-color`, `text-halo`), Label (`label-field` — a select of the schema fields with None, else a text input —, `label-size`, `label-color`, `label-halo`), Layer (`opacity`, `min-zoom`, `max-zoom`, empty = unlimited). Colour pickers and sliders apply while they move, numbers on change, all through `editor.layers.setStyle`. A note says when the configured style is computed (expressions) and will be replaced. Invalid input (a zoom range the wrong way round) shows in `.olcad-layer-style-dialog__error`.
- **Reset layer** (`data-action="reset-layer"`), **Reset all** (styles and order), **Close**.

`persistLayerStyles(editor, { key = 'olcad-layer-styles', storage = localStorage })` keeps the styles and the order in browser storage: it imports the stored JSON (ignoring unreadable data) and saves `exportStyles()` after every `layerchange` of type `style` or `order`; returns a function that stops saving.

## `<olcad-layer-editor>`

A modal dialog (`dialog.olcad-layer-editor__dialog`) that creates or edits a local layer through [`editor.localLayers`](api.md#editorlocallayers). Bind with `element.editor = editor`; `<olcad-layer-list>` creates its own.

| Member          | Description                                                      |
| --------------- | ---------------------------------------------------------------- |
| `open()`        | Opens the dialog for a new layer.                                |
| `open(layerId)` | Opens the settings of a local layer; throws for any other layer. |
| `close()`       | Closes the dialog without saving.                                |
| `isOpen`        | Whether the dialog is open.                                      |

- **Name** (`[name="title"]`) and **Geometry** (`[name="geometryType"]`: Point, Line, Polygon, Multi-point, Multi-line, Multi-polygon, or **Dimensions**; fixed for an existing layer). Dimensions creates a dimension layer (`geometryType: 'LineString'`, `dimension: { preset }`) with the drawing standard chosen in **Standard** (`[name="preset"]`: Architecture (DIN 1356-1), Surveying, Landscape; shown only for Dimensions, fixed for an existing layer).
- **Attributes**: one row per field (`.olcad-layer-editor__row`, controls `[data-part]`: `name`, `type` (`string`, `number`, `integer`, `boolean`, `enum`, `date`), `label`, `required`, `values` (comma-separated, enum only), `default` (not for boolean)) with a remove button; **Add attribute** appends a row, empty new rows are ignored. Renaming a stored field moves the objects' values (`setFields(…, { renamed })`); removing one deletes its values.
- **Create layer** / **Save** validates through the core; an error (`.olcad-layer-editor__error`, `role="alert"`) names the attribute and keeps the dialog open. **Delete layer** (existing layers only) asks for a second click ("Delete 3 objects and the layer?").

## `<olcad-export-dialog>`

A modal dialog (`dialog.olcad-export-dialog__dialog`) that exports layers into one file through [`editor.exportLayers`](api.md#export). The host opens it, for example from its File menu (as on the test page; the vanilla example has an Export button). Bind with `element.editor = editor`.

- **Layers**: a checkbox per layer (`input[name="layer"]`, value = layer id) with its object count; layers with objects are checked when the dialog opens. **All** / **None** (`data-action`). Export is disabled while none is checked.
- **Format**: radios (`input[name="format"]`: `geojson`, `kml`, `gml`, `gpx`) and the **Coordinate system** select (`select[name="projection"]`: EPSG:4326 and the projections of [`<olcad-projection-select>`](#olcad-projection-select)); disabled for KML and GPX, which are always EPSG:4326. A note (`.olcad-export-dialog__note`) says so and that GPX skips polygons and multi-points. Format and CRS are remembered between openings.
- **Export** (`data-action="export"`) writes the file, downloads it with `downloadFile(content, filename, mimeType)` (exported helper: a `Blob` behind a temporary `<a download>`), closes the dialog and fires `olcad-export` (`EXPORT_EVENT`, bubbling, `detail`: the `ExportResult`); the test page shows "Exported n objects to file" in the command line. Errors show in `.olcad-export-dialog__error` and keep the dialog open.

| Member    | Description                               |
| --------- | ----------------------------------------- |
| `open()`  | Opens the dialog with the current layers. |
| `close()` | Closes it without exporting.              |
| `isOpen`  | Whether the dialog is open.               |

## `<olcad-import-dialog>`

A modal dialog (`dialog.olcad-import-dialog__dialog`) that imports a file through [`editor.import`](api.md#import). The host opens it (test page: File → Import…; vanilla example: Import button). Bind with `element.editor = editor`.

- **File**: an `input[type="file"]` (accepting `.geojson,.json,.topojson,.kml,.gml,.xml,.gpx`) inside a drop zone (`.olcad-import-dialog__drop`, `--over` while dragging).
- **Groups** (`table.olcad-import-dialog__groups`, one `tr[data-group]` per group): the name of the new layer (editable), the geometry type, the object count (with invalid ones) and **Import into**: New local layer, `Into {layer}` for each layer that can take the group (`targetsFor`), or Skip. A summary line names the format, the CRS and objects without usable geometry.
- **Import** (disabled while every group is skipped) runs `editor.import.apply` (one undo step), closes the dialog and fires `olcad-import` (`IMPORT_EVENT`, bubbling, `detail`: the `ImportResult`). Read and apply errors show in `.olcad-import-dialog__error`. The attribute popup stays closed for imported objects.

| Member                     | Description                                       |
| -------------------------- | ------------------------------------------------- |
| `open()`                   | Opens the dialog, empty.                          |
| `load(file)`               | Reads a `File` and shows its groups.              |
| `loadText(text, filename)` | The same for text already in hand.                |
| `close()` / `isOpen`       | Closes it without importing / whether it is open. |

## `persistLocalLayers(editor, storage?, options?)`

Keeps `editor.localLayers` in browser storage: imports the stored layers once, then saves `export()` shortly after every local layer change and every command, undo and redo, and when the page is hidden. Stops when the editor is destroyed. Returns `{ ready, flush(), stop() }` (`ready` settles after the import).

- `storage` defaults to `indexedDbStorage({ dbName = 'olcad-local-layers', key = 'layers' })`: one record in an IndexedDB object store. Any `{ load(): Promise<unknown>, save(json): Promise<void> }` works, for example a server endpoint.
- `options.delay` (ms, default `300`) debounces saves; `options.onError` receives load and save failures (default `console.error`).
- `isLocalLayerPersisted(editor)` tells whether a `persistLocalLayers` call is running for the editor (between the call and `stop()` or `destroy()`); `onLocalLayerPersistenceChange(listener)` is called whenever one starts or stops and returns an unsubscribe. `<olcad-layer-list>` uses them for its storage label.

```js
const persistence = persistLocalLayers(editor); // or olcad.persistLocalLayers in the script-tag build
await persistence.ready;
```

## `<olcad-template-list>`

The templates of `editor.templates` (see [api.md](api.md#editortemplates)). A header with **Copy to template** (`.olcad-template-list__copy`, `aria-pressed` while the `template-copy` tool runs; switches edit mode on if needed) and the number of templates, then a list (`ul.olcad-template-list__list`) with one row per template (`li.olcad-template-list__template[data-template-id]`): the name (`.olcad-template-list__name`), the object count and source layers (`.olcad-template-list__meta`), and icon buttons (`data-action`):

- **Insert** (`.olcad-template-list__insert`, "Insert {name}", icon `stamp`, `aria-pressed` while inserting this template): switches edit mode on if needed and starts `template-insert` for it; pressing it again stops. Disabled, with the tooltip "No layer can take these objects", when no object has a target layer.
- **Rename** (`.olcad-template-list__rename`, icon `rename`): replaces the name with an input (`.olcad-template-list__name-input`); Enter or leaving the field saves through `editor.templates.rename`, Escape cancels.
- **Remove** (`.olcad-template-list__remove`, icon `delete`): `editor.templates.remove`; stops inserting it first.

Without templates a hint (`.olcad-template-list__empty`) explains how to make one. Re-renders on `templatechange`, `toolchange`, `editmodechange`, `activelayerchange` and `layerchange`, keeping the focused button. Attributes: none. The test page puts it in a `Templates` flyout panel and persists the templates in `localStorage` through `export` / `import` on every `templatechange`.

## `<olcad-measure-results>`

The measurements of `editor.measurements` (see [api.md](api.md#editormeasurements) and the measure tools in [tools.md](tools.md#measurement)). A header with the number of measurements (`.olcad-measure-results__count`) and **Clear all** (`.olcad-measure-results__clear`, disabled without measurements); while a measure tool is measuring, a live row (`.olcad-measure-results__live`, `role="status"`, "Distance (measuring): 123.45 m"); then a list (`ul.olcad-measure-results__list`) with one row per measurement (`li.olcad-measure-results__item[data-measurement-id][data-kind]`):

- a button (`.olcad-measure-results__show`, `data-action="show"`) with the kind's icon, the name (`.olcad-measure-results__name`, "Distance 1") and the values (`.olcad-measure-results__value`: "200.00 m · 2 segments", "1.25 ha · perimeter 450.00 m", "90.0° · reflex 270.0°"); a click zooms the map to the measurement;
- a remove icon button (`.olcad-measure-results__remove`, `data-action="remove"`, "Remove {name}").

Without measurements a hint (`.olcad-measure-results__empty`) says how to start. Re-renders on `measurechange` and `measure`, keeping the focused button. Attributes: none. The test page puts it in a `Measure` flyout panel (`name="measurements"`; panel names must differ from toolbar names, since the layout is stored per name).

## `<olcad-attribute-form>`

A form generated from the layer schema (`layers[].schema.fields`) for the **single selected feature**. For a dimension layer it also offers **Field value** (`fieldValue`, number ≥ 0; emptied = no field value) and **Text** (`text`) before the schema fields (`layerFormFields`, unless the schema declares them; a station also offers **Field offset**, a spot level **Level kind**), and it opens no popup after a dimension insert, since the dimension tool asks for the field value itself. A **stale** dimension (`editor.dimensions.isStale`) gets a notice (`.olcad-attribute-form__notice`) with **Update** (`data-action="update-dimension"`: back onto the measured objects, field value kept) and **Detach** (`data-action="detach-dimension"`: drop the references); the form follows `dimensionstale`. Since the draw tool selects what it inserts, placing a hydrant immediately shows its attributes. Bind with `element.editor = editor`.

- Header (`.olcad-attribute-form__title`): layer title and feature id. Hints (`.olcad-attribute-form__hint`) when nothing or several features are selected, or the layer has no schema.
- One row per field (`.olcad-attribute-form__field[data-field]`, label `.olcad-attribute-form__label`, control `.olcad-attribute-form__control`): `string` → text input (`pattern` applied), `number` → number input (`step=any`), `integer` → number input (`step=1`), both with `min` / `max`, `boolean` → checkbox, `enum` → select over `values` (with an empty option unless required), `date` → date input. `required` sets the attribute, `readOnly` disables the control. All controls and Apply are disabled outside edit mode or when the layer does not allow `update` for the feature; a hint says why.
- **Apply** (`.olcad-attribute-form__apply`, submit) runs the browser's validation (`reportValidity`), converts values (numbers, booleans; empty inputs remove the property) and executes one `updateProperties` command with the changed values only. A rejection from the core shows as `.olcad-attribute-form__error`. **Reset** re-reads the feature.
- The form follows `selectionchange` and re-renders on `change` (undo / redo) unless the user is typing in it, in which case the draft is kept until Apply or Reset.
- **Draft objects**: for a selected object of the draft layer the form shows no fields but a hint that it is moved into a layer from the Layers panel (`<olcad-layer-list>`). After a move (event `draftmove`) the form shows the moved object's fields with the first input focused (unless the popup opened for it).
- **Popup mode** (`<olcad-attribute-form popup>`): the form lives in a modal `<dialog>` (`.olcad-attribute-form__dialog`) that opens whenever a command inserts a feature (`featureinsert` event: the draw tool, a host's `insertFeature`) into a layer that has schema fields (no dialog for the draft layer), with the first input focused. **Save** applies the values and closes; **Later** (`.olcad-attribute-form__later`) closes and keeps the feature with its current attributes; a feature that disappears (undo) is skipped. When one command inserts several features (mirrored copies, a split line), the dialog shows them one after another, with the progress (`.olcad-attribute-form__progress`, "1 of 3") next to the title: Save and Later move on to the next, Escape closes the dialog for all of them. `closePopup()` is done with the shown feature (the next one follows), `closeAll()` closes for all. A page can use a docked form and a popup form side by side, as the test page does.
- **`reveal`** attribute: when the selection becomes a single feature while edit mode is off (a click with `selection.inspect`), or when draft objects were moved into a layer (`draftmove`, in edit mode too), the form opens the `<olcad-panel flyout>` it sits in, so the attributes show up without a click on the tab. It never closes the panel and does nothing outside a flyout.
- Validation of attribute values in the core (required, enum values, ranges for API users) arrives with milestone 7; translated labels with milestone 8.

## Icons and tooltips

`ICONS` (exported from `ol-cad/ui`) holds inline SVG strings (24-unit view box, stroked with `currentColor`, `aria-hidden`, class `olcad-icon`) for every icon the elements use: `edit`, `undo`, `redo`, `select`, `drawPoint`, `drawLine`, `drawPolygon`, `drawRectangle`, `drawCircle`, `drawCirclePoint`, `drawCircleThreePoints`, `drawEllipse`, `drawEllipseAxis`, `drawEllipseBox`, `drawRegularPolygon`, `drawCurve`, `drawParallel`, `drawText`, `vertices`, `move`, `rotate`, `scale`, `offset`, `trim`, `extend`, `delete`, `zoomIn`, `zoomOut`, `snap`, `snapVertex`, `snapMidpoint`, `snapPerpendicular`, `snapTangent`, `grid`, `eye`, `eyeOff`, `info`, `highlight`, `mirror`, `moveToLayer`, `measureDistance`, `measureArea`, `measureAngle`, `measureClear`, `copy`, `stamp`, `rename`, `angleLock`, `straightedge`, `reset`, `alignSegment` (type `IconName`). `icon(name)` returns a fresh `<svg>` element. `setIconButton(button, name, label, description?)` turns any button into an icon button: the icon as its only content, `label` as `aria-label`, `description` (or the label) as `data-tooltip`, class `olcad-icon-button`; a `title` is removed so the browser does not show a second tooltip. `hiddenText(text)` returns a visually hidden span for label text.

Tooltips: any element with a `data-tooltip` attribute shows a tooltip (`.olcad-tooltip`, `role="tooltip"`, one per document, appended to `<body>`) after 400 ms (`TOOLTIP_DELAY_MS`) on hover or keyboard focus: the element's `aria-label` in bold (`.olcad-tooltip__label`) and the `data-tooltip` text (`.olcad-tooltip__text`) when it differs. It sits below the element, centred and kept inside the viewport (above when there is no room), and hides on leave, blur, pointer down or Escape. `installTooltips(document?)` installs the delegated listeners once per document and returns the uninstall function; `defineElements()` and every element that uses icon buttons call it, so hosts only need `data-tooltip` on their own buttons.

## `bindKeyboard(editor, target = document)`

Exported from `ol-cad/ui`: binds the editor's keyboard shortcuts (Escape, Enter, Backspace, Delete, Ctrl / Cmd+Z, Shift+Ctrl / Cmd+Z, Ctrl / Cmd+Y; in the modify tool Delete removes the vertex under the pointer before falling back to the selection, see [tools.md](tools.md#keyboard)) on `target`, ignoring keys typed into inputs and keys inside an open `<dialog>` (modal dialogs keep their native Escape and Enter). Returns a function that unbinds.

## Theme

`ol-cad/ui.css` is a dark CAD theme by default. The attribute `olcad-theme` on `<html>` or any ancestor selects a variant: `light` for the light palette, `auto` to follow the operating system (`prefers-color-scheme`), `dark` to force dark inside a light region. The theme sets `color-scheme` accordingly, so native form controls and dialog backdrops follow. All colours and sizes are custom properties on `:root` (dark values) and on `[olcad-theme='light']`; override them on `:root` or on any ancestor.

**The theme applies to the whole page, not only to the ol-cad elements.** `color-scheme: dark` is set on `:root`, so the browser's defaults for the entire document turn dark: text colour, form controls, scroll bars and the canvas background. On a light host page this can leave your own buttons with light text on a light background. Set `olcad-theme="light"` on `<html>` when the page is light, or on the element that wraps the editor to keep the dark look only there (for example `<div olcad-theme="dark">` around `<olcad-dock>` inside a light page with `<html olcad-theme="light">`). The map canvas (`.ol-viewport canvas`) keeps `color-scheme: light`, so basemaps show their own colours in the dark theme too.

| Property                        | Dark (default)                                                                                                             | Light                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `--olcad-font-family`           | `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`                                                                 |                                |
| `--olcad-font-size`             | `13px`                                                                                                                     |                                |
| `--olcad-font-mono`             | `ui-monospace, 'SF Mono', Menlo, Consolas, monospace`                                                                      |                                |
| `--olcad-color-bg`              | `#1b1d21` (dock background)                                                                                                | `#ffffff`                      |
| `--olcad-color-surface`         | `#24262b` (menu bar, zones, panels)                                                                                        | `#f3f4f6`                      |
| `--olcad-color-surface-raised`  | `#2c2f35` (popups, inputs, dialogs)                                                                                        | `#ffffff`                      |
| `--olcad-color-hover`           | `rgba(255, 255, 255, 0.08)`                                                                                                | `rgba(0, 0, 0, 0.07)`          |
| `--olcad-color-fg`              | `#e6e8ec`                                                                                                                  | `#1f2933`                      |
| `--olcad-color-muted`           | `#9da3ad`                                                                                                                  | `#6b7280`                      |
| `--olcad-color-border`          | `#3b3f47`                                                                                                                  | `#d1d5db`                      |
| `--olcad-color-accent`          | `#3d8bff` (pressed buttons, active items)                                                                                  | `#2563eb`                      |
| `--olcad-color-accent-fg`       | `#ffffff`                                                                                                                  | `#ffffff`                      |
| `--olcad-table-height`          | `30vh` (maximum height of the feature table's scrolling body)                                                              | same                           |
| `--olcad-layer-highlight-color` | `#f59e0b` (pressed highlight button in the layer list; match it to config `layerHighlight.strokeColor`)                    | same                           |
| `--olcad-color-focus`           | `#f5a524`                                                                                                                  | `#f59e0b`                      |
| `--olcad-color-error`           | `#f87171`                                                                                                                  | `#b91c1c`                      |
| `--olcad-tooltip-bg`            | `#111318`                                                                                                                  | `#1f2933`                      |
| `--olcad-tooltip-fg`            | `#e6e8ec`                                                                                                                  | `#ffffff`                      |
| `--olcad-radius`                | `4px`                                                                                                                      |                                |
| `--olcad-spacing`               | `8px`                                                                                                                      |                                |
| `--olcad-icon-size`             | `18px`                                                                                                                     |                                |
| `--olcad-panel-shadow`          | `0 4px 16px rgba(0, 0, 0, 0.5)` (floating panels, menus)                                                                   | `0 2px 8px rgba(0, 0, 0, 0.2)` |
| `--olcad-panel-header-bg`       | `#2c2f35`                                                                                                                  | `#e5e7eb`                      |
| `--olcad-dock-drop-bg`          | `rgba(61, 139, 255, 0.2)` (highlighted drop zone)                                                                          | `rgba(37, 99, 235, 0.15)`      |
| `--olcad-dock-zone-padding`     | `0px`                                                                                                                      |                                |
| `--olcad-toolbar-layer-width`   | `12em` (width of the toolbar's "Layer: …" label; longer names are cut off with an ellipsis and shown in full as a tooltip) |                                |
| `--olcad-toolbar-button-size`   | `28px`                                                                                                                     |                                |
| `--olcad-flyout-width`          | `320px`                                                                                                                    |                                |

Docked panels are flat (no border radius, zones separated by 1 px borders); floating panels, menus and tooltips get the radius and the shadow. OpenLayers controls inside the dock (`.ol-control`, attribution) are restyled with the same colours.

Class names follow BEM. Shared: `.olcad-icon`, `.olcad-icon-button`, `.olcad-icon-toggle` (modifier `--on`), `.olcad-tooltip` (`__label`, `__text`), `.olcad-visually-hidden`. Layer list: `.olcad-layer-list`, `__heading`, `__group`, `__item` (basemap), `__layer` (modifiers `--active`, `--hidden`), `__title`, `__visible`, `__highlight`, `__edit`, `__move-draft`, `__info-toggle`, `__details`, `__detail`. Template list: `.olcad-template-list`, `__header`, `__copy`, `__count`, `__empty`, `__list`, `__template`, `__text`, `__name`, `__name-input`, `__meta`, `__insert`, `__rename`, `__remove`. Dock: `.olcad-dock`, `.olcad-dock__zone` with modifiers `--top`, `--right`, `--bottom`, `--left`, `--center`, `--floating`. Panel state attributes: `data-dock`, `data-flyout`, `data-compact`. Toolbar: `.olcad-toolbar`, `.olcad-toolbar__button`, `.olcad-toolbar__edit-toggle`, `.olcad-toolbar__active-layer`, `.olcad-toolbar__separator`, `.olcad-toolbar__undo`, `.olcad-toolbar__redo`, `.olcad-toolbar__tool` with `--select`, `--draw-point`, `--draw-line`, `--draw-polygon`, `--rectangle`, `--circle`, `--ellipse`, `--regular-polygon`, `--curve`, `--parallel`, `--text`, `--dimension-linear`, `--dimension-angular`, `--dimension-radial`, `--dimension-survey`, `--modify`, `--move`, `--rotate`, `--scale`, `--offset`, `--trim`, `--extend`, `--mirror`, `--template-copy`, `--measure-distance`, `--measure-area`, `--measure-angle`, `--measure-clear`, `--delete`; flyout buttons: `.olcad-toolbar__flyout` (`--circle`, `--ellipse`, state `data-open`), `__flyout-toggle`, `__flyout-menu`, `__flyout-item`, `__flyout-label`. Straightedge: `.olcad-straightedge`, `__label`, `__input`, `__unit`, `__reset`, `__pick`. Snap settings: `.olcad-snap-settings`, `__toggle`, `__label`, `__tolerance`, `__unit`, `__modes`, `__mode`. Grid settings: `.olcad-grid-settings`, `__toggle`, `__label`, `__spacing`, `__unit`, `__show`. Angle lock: `.olcad-angle-lock`, `__toggle`, `__presets`, `__preset`, `__label`, `__step`, `__unit`. Input bar: `.olcad-input-bar` (modifier `--awaiting`, attribute `data-input`), `__output`, `__input`. Menu bar: `.olcad-menubar`, `.olcad-menu`, `__button`, `__popup`, `__item` (modifier `--checkbox`), `__separator`. Projection select: `.olcad-projection-select`, `__select`. Measure results: `.olcad-measure-results`, `__header`, `__count`, `__clear`, `__live`, `__empty`, `__list`, `__item`, `__show`, `__text`, `__name`, `__value`, `__remove`. Attribute form: `.olcad-attribute-form`, `__title`, `__hint`, `__error`, `__form`, `__field`, `__label`, `__control`, `__actions`, `__apply`, `__reset`, `__later`, `__progress`, `__dialog` (popup mode).
