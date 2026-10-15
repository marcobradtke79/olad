import type { Editor } from '../../core/Editor';
import type { ToolOptions } from '../../core/tools';
import { icon, type IconName } from '../icons';
import { bindKeyboard } from '../keyboard';
import { setIconButton } from './controls';
import { OlcadPanel, type DockPosition } from './OlcadPanel';

/** One construction variant offered by a flyout button. */
export interface ToolVariant {
  /** Variant id, written to `data-variant` on the button and the menu item. */
  id: string;
  /** Accessible name while the variant is shown on the button, and the menu item's text. */
  label: string;
  /** Tooltip text. */
  title: string;
  icon: IconName;
  /** Options passed to `editor.tools.activate` for this variant. */
  options: ToolOptions;
}

export interface ToolButton {
  /** Accessible name. */
  label: string;
  /** Tooltip text. */
  title: string;
  icon: IconName;
  /** The tool the button activates; defaults to the button id. */
  tool?: string;
  /** Options passed to `editor.tools.activate`; the button is pressed while they are in effect. */
  options?: ToolOptions;
  /**
   * Construction variants behind a flyout (a triangle in the button's corner opens it). The
   * button shows the variant chosen last (the first one by default) and activates it on click.
   */
  variants?: ToolVariant[];
}

/** How long the pointer must rest on a flyout button to open its flyout. */
export const LONG_PRESS_MS = 400;

/**
 * Tool buttons the toolbar can show, in order. `delete` and `measure-clear` are actions, the
 * others activate tools.
 * The three draw buttons share the `draw` tool and differ in the geometry type; the circle
 * and ellipse buttons are flyouts whose variants share one tool and differ in the method.
 */
export const TOOL_BUTTONS: Record<string, ToolButton> = {
  select: {
    label: 'Select',
    title: 'Click, Shift+click toggles, Ctrl/Cmd+drag for a box',
    icon: 'select',
  },
  'draw-point': {
    label: 'Draw point',
    title: 'Place points into the active layer, or into the draft layer when none is selected',
    icon: 'drawPoint',
    tool: 'draw',
    options: { type: 'Point' },
  },
  'draw-line': {
    label: 'Draw line',
    title:
      'Draw lines into the active layer, or into the draft layer when none is selected: click vertices, double-click or Enter to finish, Escape to abort',
    icon: 'drawLine',
    tool: 'draw',
    options: { type: 'LineString' },
  },
  'draw-polygon': {
    label: 'Draw polygon',
    title:
      'Draw polygons into the active layer, or into the draft layer when none is selected: click vertices, double-click or Enter to close, Escape to abort',
    icon: 'drawPolygon',
    tool: 'draw',
    options: { type: 'Polygon' },
  },
  rectangle: {
    label: 'Draw rectangle',
    title:
      'Draw a rectangle into the active layer, or into the draft layer when none is selected: first corner, then the opposite corner; the sides follow the straightedge',
    icon: 'drawRectangle',
  },
  circle: {
    label: 'Draw circle',
    title:
      'Draw a circle into the active layer, or into the draft layer when none is selected; the triangle opens the construction variants',
    icon: 'drawCircle',
    variants: [
      {
        id: 'centre-radius',
        label: 'Circle: centre and radius',
        title:
          'Draw a circle: click the centre, then type the radius or click a point on the circle',
        icon: 'drawCircle',
        options: { method: 'centre-radius' },
      },
      {
        id: 'centre-point',
        label: 'Circle: centre and point',
        title: 'Draw a circle: click the centre, then a point on the circle',
        icon: 'drawCirclePoint',
        options: { method: 'centre-point' },
      },
      {
        id: 'three-point',
        label: 'Circle: three points',
        title: 'Draw a circle through three points on it',
        icon: 'drawCircleThreePoints',
        options: { method: 'three-point' },
      },
    ],
  },
  ellipse: {
    label: 'Draw ellipse',
    title:
      'Draw an ellipse into the active layer, or into the draft layer when none is selected; the triangle opens the construction variants',
    icon: 'drawEllipse',
    variants: [
      {
        id: 'centre-axis',
        label: 'Ellipse: centre and axes',
        title:
          'Draw an ellipse: click the centre and the end of one axis, then type the other half-axis or click a point at that distance',
        icon: 'drawEllipse',
        options: { method: 'centre-axis' },
      },
      {
        id: 'axis',
        label: 'Ellipse: axis ends and half-axis',
        title:
          'Draw an ellipse: click both ends of one axis, then type the other half-axis or click a point at that distance',
        icon: 'drawEllipseAxis',
        options: { method: 'axis' },
      },
      {
        id: 'box',
        label: 'Ellipse: box corners',
        title:
          'Draw an ellipse filling a box: click two opposite corners; the box follows the straightedge',
        icon: 'drawEllipseBox',
        options: { method: 'box' },
      },
    ],
  },
  'regular-polygon': {
    label: 'Draw regular polygon',
    title:
      'Draw a regular polygon into the active layer, or into the draft layer when none is selected: type the number of sides, click the centre, then one vertex',
    icon: 'drawRegularPolygon',
  },
  curve: {
    label: 'Draw curve',
    title:
      'Draw a curve into the active layer, or into the draft layer when none is selected: start, end, then adjust the handles; Enter inserts',
    icon: 'drawCurve',
  },
  parallel: {
    label: 'Draw parallel',
    title:
      'Draw a line parallel to an object: click the object, a start point beside it, then follow it with the crosshair and click',
    icon: 'drawParallel',
  },
  text: {
    label: 'Draw text',
    title:
      'Place a text into the active text layer, or the draft layer: click the insert point, type the height, then the text; it follows the straightedge angle',
    icon: 'drawText',
  },
  'dimension-linear': {
    label: 'Linear dimension',
    title:
      'Dimension a distance in the active dimension layer: two points, the dimension line, then the field value; the triangle opens the variants',
    icon: 'dimensionAligned',
    variants: [
      {
        id: 'aligned',
        label: 'Aligned dimension',
        title:
          'Aligned dimension: the true distance between two points, the dimension line parallel to them',
        icon: 'dimensionAligned',
        options: { method: 'aligned' },
      },
      {
        id: 'rotated',
        label: 'Rotated dimension',
        title:
          'Rotated dimension: the distance along the straightedge angle (set it to 0° for horizontal, or align it to a building edge)',
        icon: 'dimensionRotated',
        options: { method: 'rotated' },
      },
      {
        id: 'chain',
        label: 'Chain dimension',
        title:
          'Chain: consecutive spans on one dimension line in the first span’s direction; Enter ends',
        icon: 'dimensionChain',
        options: { method: 'chain' },
      },
      {
        id: 'baseline',
        label: 'Baseline dimension',
        title: 'Baseline: every point from one origin, the dimension lines stacked; Enter ends',
        icon: 'dimensionBaseline',
        options: { method: 'baseline' },
      },
      {
        id: 'running',
        label: 'Running dimension',
        title:
          'Running: every point from one origin on one line, cumulative values (DIN 406); Enter ends',
        icon: 'dimensionRunning',
        options: { method: 'running' },
      },
      {
        id: 'tie',
        label: 'Tie distance',
        title:
          'Tie distance (survey): the direct distance between two points, written along a thin line',
        icon: 'dimensionTie',
        options: { method: 'tie' },
      },
    ],
  },
  'dimension-angular': {
    label: 'Angular dimension',
    title:
      'Dimension an angle in the active dimension layer: three points or two edges, the arc, then the field angle; the triangle opens the variants',
    icon: 'dimensionAngular',
    variants: [
      {
        id: 'points',
        label: 'Angle: three points',
        title:
          'Angle by three points: a point on the first leg, the vertex, a point on the second leg',
        icon: 'dimensionAngular',
        options: { method: 'points' },
      },
      {
        id: 'segments',
        label: 'Angle: two edges',
        title: 'Angle between two edges of objects; the vertex is where their lines meet',
        icon: 'dimensionAngularSegments',
        options: { method: 'segments' },
      },
    ],
  },
  'dimension-radial': {
    label: 'Radial dimension',
    title:
      'Dimension a circle or arc in the active dimension layer: click the curve, place the dimension, then the field value; the triangle opens the variants',
    icon: 'dimensionRadius',
    variants: [
      {
        id: 'radius',
        label: 'Radius',
        title: 'Radius of a circle or arc (R)',
        icon: 'dimensionRadius',
        options: { method: 'radius' },
      },
      {
        id: 'diameter',
        label: 'Diameter',
        title: 'Diameter of a circle (Ø)',
        icon: 'dimensionDiameter',
        options: { method: 'diameter' },
      },
      {
        id: 'arc',
        label: 'Arc length',
        title: 'Length along an arc between a start and an end point',
        icon: 'dimensionArc',
        options: { method: 'arc' },
      },
    ],
  },
  modify: {
    label: 'Vertices',
    title:
      'Edit vertices: click an object, click a vertex to move it, click a segment to add one, Alt+click to delete',
    icon: 'vertices',
  },
  move: {
    label: 'Move',
    title: 'Move objects: select them, pick a base point, then a second point or a typed distance',
    icon: 'move',
  },
  rotate: {
    label: 'Rotate',
    title: 'Rotate objects: select them, pick the centre, then two points that span the angle',
    icon: 'rotate',
  },
  scale: {
    label: 'Scale',
    title:
      'Scale objects: select them, pick a base point, then type a factor or click a reference and a target point',
    icon: 'scale',
  },
  offset: {
    label: 'Offset',
    title:
      'Offset an object: click a line or polygon, type the distance, then click the side the copy goes to',
    icon: 'offset',
  },
  trim: {
    label: 'Trim',
    title: 'Trim lines: select the boundary, then click the parts of lines to remove',
    icon: 'trim',
  },
  extend: {
    label: 'Extend',
    title: 'Extend lines: select the boundary, then click lines near the end to extend to it',
    icon: 'extend',
  },
  mirror: {
    label: 'Mirror',
    title: 'Mirror objects: select them, draw the mirror line, then Enter (or y for a copy)',
    icon: 'mirror',
  },
  'template-copy': {
    label: 'Copy to template',
    title:
      'Copy objects to a named template: select them, pick the base point, type a name; insert copies from the Templates panel',
    icon: 'copy',
  },
  'measure-distance': {
    label: 'Measure distance',
    title:
      'Measure a distance: click points along the way, Enter finishes; Alt+click a line or polygon to measure it (works without edit mode)',
    icon: 'measureDistance',
  },
  'measure-area': {
    label: 'Measure area',
    title:
      'Measure an area: click its corners, Enter finishes; Alt+click a polygon to measure it (works without edit mode)',
    icon: 'measureArea',
  },
  'measure-angle': {
    label: 'Measure angle',
    title:
      'Measure an angle: click a first point, the vertex, then a second point (works without edit mode)',
    icon: 'measureAngle',
  },
  'measure-clear': {
    label: 'Clear measurements',
    title: 'Remove all measurements from the map',
    icon: 'measureClear',
  },
  delete: { label: 'Delete', title: 'Delete the selected features (Delete key)', icon: 'delete' },
};

/** Button ids for the `tools` attribute; `draw` stands for the three draw buttons. */
export function toolButtonIds(tools: string | null): string[] {
  const ids = (tools ?? Object.keys(TOOL_BUTTONS).join(' '))
    .split(/\s+/)
    .flatMap((id) => (id === 'draw' ? ['draw-point', 'draw-line', 'draw-polygon'] : [id]));
  return ids.filter((id, index) => id in TOOL_BUTTONS && ids.indexOf(id) === index);
}

/** The fixed controls a toolbar can show before its tool buttons. */
export type ToolbarControl = 'edit' | 'layer' | 'history';
const TOOLBAR_CONTROLS: ToolbarControl[] = ['edit', 'layer', 'history'];

/**
 * Controls for the `controls` attribute, in their fixed order: `edit` (the edit-mode toggle),
 * `layer` (the active-layer status), `history` (Undo / Redo). All three without the attribute,
 * none for `controls=""`; unknown names are dropped.
 */
export function toolbarControls(controls: string | null): ToolbarControl[] {
  if (controls === null) return [...TOOLBAR_CONTROLS];
  const names = controls.split(/\s+/);
  return TOOLBAR_CONTROLS.filter((control) => names.includes(control));
}

/**
 * Keyboard shortcuts are bound once per editor, however many toolbars are bound to it: the
 * first toolbar binds, the others share, the last one to unbind releases.
 */
const keyboardBindings = new WeakMap<Editor, { count: number; unbind: () => void }>();

function acquireKeyboard(editor: Editor): () => void {
  const shared = keyboardBindings.get(editor) ?? { count: 0, unbind: bindKeyboard(editor) };
  shared.count += 1;
  keyboardBindings.set(editor, shared);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    shared.count -= 1;
    if (shared.count === 0) {
      shared.unbind();
      keyboardBindings.delete(editor);
    }
  };
}

/** Whether a button's options are in effect: every key it sets matches the active options. */
export function optionsMatch(button: ToolOptions | undefined, active: ToolOptions): boolean {
  return Object.entries(button ?? {}).every(([key, value]) => active[key] === value);
}

function separator(): HTMLElement {
  const el = document.createElement('span');
  el.className = 'olcad-toolbar__separator';
  el.setAttribute('role', 'separator');
  el.setAttribute('aria-orientation', 'vertical');
  return el;
}

interface Flyout {
  wrapper: HTMLElement;
  button: HTMLButtonElement;
  toggle: HTMLButtonElement;
  menu: HTMLElement;
  items: HTMLButtonElement[];
  variants: ToolVariant[];
  current: ToolVariant;
  /** Set by a long press so that the click it ends with does not also activate the tool. */
  suppressClick: boolean;
}

/**
 * `<olcad-toolbar>`: a toolbar. A dockable panel (see `OlcadPanel`) whose content is a
 * `role="toolbar"` named by the `heading` with the fixed controls (attribute `controls`: the
 * edit-mode toggle, the active layer, undo / redo; default all, `controls=""` none), the tool
 * buttons (attribute `tools`, default all) and any child elements the host puts inside, so a
 * page can split the buttons over several toolbars (main, draw, modify). Buttons are icons with
 * tooltips; a button with variants is a flyout button. Binds the keyboard shortcuts on
 * `document` unless the `no-keyboard` attribute is set, once per editor however many toolbars
 * share it. Bind with `element.editor = editor`. Docked at the top by default, compact.
 */
export class OlcadToolbar extends OlcadPanel {
  private boundEditor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];
  private unbindKeyboard: (() => void) | null = null;
  private readonly editToggle: HTMLButtonElement = document.createElement('button');
  private readonly activeLayer: HTMLElement = document.createElement('span');
  private readonly undoButton: HTMLButtonElement = document.createElement('button');
  private readonly redoButton: HTMLButtonElement = document.createElement('button');
  private readonly toolButtons = new Map<string, HTMLButtonElement>();
  private readonly flyouts = new Map<string, Flyout>();
  private openFlyoutId: string | null = null;
  /** The content is built once; the dock reconnects the element when it moves it. */
  private rendered = false;

  protected override get defaultDock(): DockPosition {
    return 'top';
  }

  protected override get defaultHeading(): string {
    return 'Tools';
  }

  protected override get defaultCompact(): boolean {
    return true;
  }

  get editor(): Editor | null {
    return this.boundEditor;
  }

  set editor(editor: Editor | null) {
    this.unbind();
    this.boundEditor = editor;
    if (editor) {
      this.unsubscribe.push(
        editor.on('editmodechange', () => this.renderEditMode()),
        editor.on('activelayerchange', () => this.renderActiveLayer()),
        editor.on('layerchange', () => this.renderActiveLayer()),
        editor.on('historychange', () => this.renderHistory()),
        editor.on('toolchange', () => this.renderTools()),
        editor.on('selectionchange', () => this.renderTools()),
        editor.on('measurechange', () => this.renderTools()),
        editor.on('destroy', () => {
          this.editor = null;
        }),
      );
      if (!this.hasAttribute('no-keyboard')) this.unbindKeyboard = acquireKeyboard(editor);
    }
    this.renderEditMode();
    this.renderActiveLayer();
    this.renderHistory();
    this.renderTools();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.classList.add('olcad-toolbar');
    this.content.setAttribute('role', 'toolbar');
    this.content.setAttribute('aria-label', this.heading);
    if (!this.rendered) {
      this.rendered = true;
      this.editToggle.type = 'button';
      this.editToggle.className = 'olcad-toolbar__button olcad-toolbar__edit-toggle';
      setIconButton(this.editToggle, 'edit', 'Edit mode', 'Switch edit mode on or off');
      this.editToggle.addEventListener('click', () => {
        const editor = this.boundEditor;
        if (editor) editor.setEditMode(!editor.isEditMode());
      });
      this.activeLayer.className = 'olcad-toolbar__active-layer';
      this.activeLayer.setAttribute('aria-live', 'polite');
      this.undoButton.type = 'button';
      this.undoButton.className = 'olcad-toolbar__button olcad-toolbar__undo';
      setIconButton(this.undoButton, 'undo', 'Undo', 'Undo (Ctrl+Z)');
      this.undoButton.addEventListener('click', () => this.boundEditor?.undo());
      this.redoButton.type = 'button';
      this.redoButton.className = 'olcad-toolbar__button olcad-toolbar__redo';
      setIconButton(this.redoButton, 'redo', 'Redo', 'Redo (Shift+Ctrl+Z)');
      this.redoButton.addEventListener('click', () => this.boundEditor?.redo());
      const toolElements: HTMLElement[] = [];
      for (const id of toolButtonIds(this.getAttribute('tools'))) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `olcad-toolbar__button olcad-toolbar__tool olcad-toolbar__tool--${id}`;
        const definition = TOOL_BUTTONS[id]!;
        const { icon: iconName, label, title, tool, options, variants } = definition;
        button.dataset.tool = tool ?? id;
        if (typeof options?.type === 'string') button.dataset.type = options.type;
        setIconButton(button, iconName, label, title);
        button.addEventListener('click', () => this.onToolClick(id));
        this.toolButtons.set(id, button);
        toolElements.push(
          variants?.length ? this.createFlyout(id, definition, button, variants) : button,
        );
      }
      const controls = toolbarControls(this.getAttribute('controls'));
      const groups: HTMLElement[][] = [];
      const status: HTMLElement[] = [];
      if (controls.includes('edit')) status.push(this.editToggle);
      if (controls.includes('layer')) status.push(this.activeLayer);
      if (status.length) groups.push(status);
      if (controls.includes('history')) groups.push([this.undoButton, this.redoButton]);
      if (toolElements.length) groups.push(toolElements);
      // A separator between groups, none at the ends.
      this.content.prepend(
        ...groups.flatMap((group, index) => (index === 0 ? group : [separator(), ...group])),
      );
      this.content.addEventListener('keydown', this.onToolbarKeyDown);
    }
    this.renderEditMode();
    this.renderActiveLayer();
    this.renderHistory();
    this.renderTools();
  }

  /** The variant a flyout button currently shows, or `undefined` for a plain button. */
  currentVariant(id: string): ToolVariant | undefined {
    return this.flyouts.get(id)?.current;
  }

  /** Whether the flyout of a button is open. */
  isFlyoutOpen(id: string): boolean {
    return this.openFlyoutId === id;
  }

  /** The options a button activates its tool with: its variant's, else its own. */
  private buttonOptions(id: string): ToolOptions | undefined {
    return this.flyouts.get(id)?.current.options ?? TOOL_BUTTONS[id]!.options;
  }

  private onToolClick(id: string): void {
    const flyout = this.flyouts.get(id);
    if (flyout?.suppressClick) {
      flyout.suppressClick = false;
      return;
    }
    const editor = this.boundEditor;
    if (!editor) return;
    if (id === 'delete') {
      editor.deleteSelection();
      return;
    }
    if (id === 'measure-clear') {
      editor.measurements.clear();
      return;
    }
    const tool = TOOL_BUTTONS[id]!.tool ?? id;
    if (this.isPressed(editor, id)) editor.tools.deactivate();
    else editor.tools.activate(tool, this.buttonOptions(id));
  }

  /**
   * Whether the button's tool is active with the button's options in effect. A flyout button
   * is pressed whichever of its variants is active.
   */
  private isPressed(editor: Editor, id: string): boolean {
    const tool = TOOL_BUTTONS[id]!.tool ?? id;
    if (editor.tools.getActive() !== tool) return false;
    if (this.flyouts.has(id)) return true;
    return optionsMatch(TOOL_BUTTONS[id]!.options, editor.tools.getActiveOptions());
  }

  private renderTools(): void {
    const editor = this.boundEditor;
    for (const [id, button] of this.toolButtons) {
      if (id === 'delete') {
        const deletable = editor?.isEditMode() && editor.selection.get().length > 0;
        button.disabled = !deletable;
        continue;
      }
      if (id === 'measure-clear') {
        button.disabled = !editor || editor.measurements.list().length === 0;
        continue;
      }
      const tool = TOOL_BUTTONS[id]!.tool ?? id;
      const pressed = editor ? this.isPressed(editor, id) : false;
      if (pressed && editor) this.mirrorVariant(id, editor.tools.getActiveOptions());
      button.disabled = !editor?.tools.canActivate(tool, this.buttonOptions(id)) && !pressed;
      button.setAttribute('aria-pressed', String(pressed));
    }
  }

  /** Show the variant whose options are in effect, so a tool started elsewhere is mirrored. */
  private mirrorVariant(id: string, active: ToolOptions): void {
    const flyout = this.flyouts.get(id);
    if (!flyout) return;
    const variant = flyout.variants.find((v) => optionsMatch(v.options, active));
    if (variant && variant !== flyout.current) this.setVariant(id, variant);
  }

  private createFlyout(
    id: string,
    definition: ToolButton,
    button: HTMLButtonElement,
    variants: ToolVariant[],
  ): HTMLElement {
    const wrapper = document.createElement('span');
    wrapper.className = `olcad-toolbar__flyout olcad-toolbar__flyout--${id}`;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'olcad-toolbar__flyout-toggle';
    toggle.tabIndex = -1;
    toggle.setAttribute('aria-haspopup', 'menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', `${definition.label} variants`);
    const menu = document.createElement('div');
    menu.className = 'olcad-toolbar__flyout-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', `${definition.label} variants`);
    menu.hidden = true;
    const items = variants.map((variant) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'olcad-toolbar__flyout-item';
      item.tabIndex = -1;
      item.setAttribute('role', 'menuitemradio');
      item.dataset.variant = variant.id;
      const text = document.createElement('span');
      text.className = 'olcad-toolbar__flyout-label';
      text.textContent = variant.label;
      item.append(icon(variant.icon, document), text);
      item.addEventListener('click', () => this.chooseVariant(id, variant));
      return item;
    });
    menu.append(...items);
    wrapper.append(button, toggle, menu);
    const flyout: Flyout = {
      wrapper,
      button,
      toggle,
      menu,
      items,
      variants,
      current: variants[0]!,
      suppressClick: false,
    };
    this.flyouts.set(id, flyout);
    this.setVariant(id, flyout.current);

    toggle.addEventListener('click', () => {
      if (this.openFlyoutId === id) this.hideFlyout(id, true);
      else this.showFlyout(id);
    });
    toggle.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      event.stopPropagation();
      this.showFlyout(id);
    });
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.showFlyout(id);
    });
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clearTimer = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };
    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || button.disabled) return;
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        flyout.suppressClick = true;
        this.showFlyout(id);
      }, LONG_PRESS_MS);
    });
    for (const type of ['pointerup', 'pointerleave', 'pointercancel']) {
      button.addEventListener(type, clearTimer);
    }
    menu.addEventListener('keydown', (event) => this.onFlyoutKeyDown(id, event));
    wrapper.addEventListener('focusout', (event) => {
      if (this.openFlyoutId !== id) return;
      const next = event.relatedTarget;
      if (next instanceof Node && wrapper.contains(next)) return;
      this.hideFlyout(id, false);
    });
    return wrapper;
  }

  private setVariant(id: string, variant: ToolVariant): void {
    const flyout = this.flyouts.get(id);
    if (!flyout) return;
    flyout.current = variant;
    setIconButton(flyout.button, variant.icon, variant.label, variant.title);
    flyout.button.dataset.variant = variant.id;
    if (typeof variant.options.method === 'string') {
      flyout.button.dataset.method = variant.options.method;
    }
    for (const item of flyout.items) {
      item.setAttribute('aria-checked', String(item.dataset.variant === variant.id));
    }
  }

  private chooseVariant(id: string, variant: ToolVariant): void {
    this.setVariant(id, variant);
    this.hideFlyout(id, true);
    const editor = this.boundEditor;
    if (!editor) return;
    editor.tools.activate(TOOL_BUTTONS[id]!.tool ?? id, variant.options);
    this.renderTools();
  }

  private showFlyout(id: string): void {
    const flyout = this.flyouts.get(id);
    if (!flyout) return;
    if (this.openFlyoutId !== null && this.openFlyoutId !== id) {
      this.hideFlyout(this.openFlyoutId, false);
    }
    this.openFlyoutId = id;
    flyout.menu.hidden = false;
    flyout.toggle.setAttribute('aria-expanded', 'true');
    flyout.wrapper.setAttribute('data-open', '');
    document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
    const checked = flyout.items.find((item) => item.getAttribute('aria-checked') === 'true');
    (checked ?? flyout.items[0])?.focus();
  }

  private hideFlyout(id: string, refocus: boolean): void {
    const flyout = this.flyouts.get(id);
    if (!flyout || this.openFlyoutId !== id) return;
    this.openFlyoutId = null;
    flyout.menu.hidden = true;
    flyout.toggle.setAttribute('aria-expanded', 'false');
    flyout.wrapper.removeAttribute('data-open');
    document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    if (refocus) flyout.button.focus();
  }

  private onDocumentPointerDown = (event: Event): void => {
    const id = this.openFlyoutId;
    if (id === null) return;
    const target = event.target;
    if (target instanceof Node && this.flyouts.get(id)!.wrapper.contains(target)) return;
    this.hideFlyout(id, false);
  };

  private onFlyoutKeyDown(id: string, event: KeyboardEvent): void {
    const flyout = this.flyouts.get(id);
    if (!flyout) return;
    const { items } = flyout;
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const focus = (i: number) => items[(i + items.length) % items.length]?.focus();
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        focus(index + 1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        focus(index - 1);
        break;
      case 'Home':
        focus(0);
        break;
      case 'End':
        focus(items.length - 1);
        break;
      case 'Escape':
        this.hideFlyout(id, true);
        break;
      case 'Tab':
        this.hideFlyout(id, false);
        return; // let the browser move focus
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  private renderHistory(): void {
    const editor = this.boundEditor;
    this.undoButton.disabled = !editor?.canUndo();
    this.redoButton.disabled = !editor?.canRedo();
  }

  protected override applyPlacement(): void {
    super.applyPlacement();
    this.content.setAttribute('aria-orientation', this.orientation);
  }

  disconnectedCallback(): void {
    if (this.openFlyoutId !== null) this.hideFlyout(this.openFlyoutId, false);
    this.unbind();
  }

  private unbind(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
    this.unbindKeyboard?.();
    this.unbindKeyboard = null;
  }

  private renderEditMode(): void {
    const editor = this.boundEditor;
    const on = editor?.isEditMode() ?? false;
    this.editToggle.disabled = !editor;
    this.editToggle.setAttribute('aria-pressed', String(on));
    this.toggleAttribute('edit-mode', on);
    this.renderTools();
  }

  private renderActiveLayer(): void {
    const editor = this.boundEditor;
    const active = editor?.layers.list().find((layer) => layer.active);
    this.activeLayer.textContent = active ? `Layer: ${active.title}` : 'No layer selected';
    this.activeLayer.title = this.activeLayer.textContent; // full name when it is cut off
    this.activeLayer.hidden = !editor;
    this.renderTools();
  }

  /** Roving focus with arrow keys, as recommended for `role="toolbar"`. */
  private onToolbarKeyDown = (event: KeyboardEvent): void => {
    const horizontal = this.orientation === 'horizontal';
    const next = horizontal ? 'ArrowRight' : 'ArrowDown';
    const prev = horizontal ? 'ArrowLeft' : 'ArrowUp';
    if (event.key !== next && event.key !== prev) return;
    const items = Array.from(
      this.content.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not(.olcad-toolbar__flyout-toggle):not(.olcad-toolbar__flyout-item), [tabindex="0"]',
      ),
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index === -1) return;
    const target = items[(index + (event.key === next ? 1 : -1) + items.length) % items.length];
    target?.focus();
    event.preventDefault();
  };
}
