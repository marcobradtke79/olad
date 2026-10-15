import { expect, test, type Page } from '@playwright/test';

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.editor));
}

test.describe('toolbar and dock', () => {
  test('edit-mode toggle drives the editor and follows API changes', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    const toggle = page.locator('olcad-toolbar .olcad-toolbar__edit-toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('olcad-toolbar[name="main"]')).not.toHaveAttribute('edit-mode', '');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('olcad-toolbar[name="draw"]')).toHaveAttribute('edit-mode', ''); // every toolbar follows
    expect(await page.evaluate(() => window.editor.isEditMode())).toBe(true);

    // The map shows the CAD crosshair with the pick box under the pointer; the native cursor is hidden.
    // (Snapping off, so the crosshair does not jump to a feature near the map centre.)
    await page.evaluate(() => window.editor.snapping.setEnabled(false));
    const viewportCursor = () =>
      page.evaluate(() => getComputedStyle(document.querySelector('.ol-viewport')!).cursor);
    expect(await viewportCursor()).toBe('none');
    await expect(page.locator('#map')).toHaveClass(/olcad-edit-mode/);
    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    const target = { x: viewport.x + viewport.width / 2, y: viewport.y + viewport.height / 2 };
    await page.mouse.move(target.x, target.y);
    const crosshair = page.locator('.ol-viewport .olcad-crosshair');
    await expect(crosshair).toBeVisible();
    const box = (await crosshair.locator('.olcad-crosshair__box').boundingBox())!;
    expect(box.width).toBe(8);
    expect(box.height).toBe(8);
    expect(Math.abs(box.x + 4 - target.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y + 4 - target.y)).toBeLessThanOrEqual(1);
    const left = (await crosshair.locator('.olcad-crosshair__h-left').boundingBox())!;
    const right = (await crosshair.locator('.olcad-crosshair__h-right').boundingBox())!;
    // The segments run past the viewport edges and are clipped by the overlay.
    expect(left.x).toBeLessThanOrEqual(viewport.x);
    expect(left.x + left.width).toBeLessThan(target.x);
    expect(right.x).toBeGreaterThan(target.x);
    expect(right.x + right.width).toBeGreaterThanOrEqual(viewport.x + viewport.width);
    const overlay = (await crosshair.boundingBox())!;
    expect(overlay.width).toBe(viewport.width);
    expect(overlay.height).toBe(viewport.height);
    expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).toBe('auto');

    // Leaving the map hides the crosshair.
    const menubar = (await page.locator('olcad-menubar').boundingBox())!;
    await page.mouse.move(menubar.x + menubar.width / 2, menubar.y + menubar.height / 2);
    await expect(crosshair).toBeHidden();

    await page.evaluate(() => window.editor.setEditMode(false));
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('olcad-toolbar[name="main"]')).not.toHaveAttribute('edit-mode', '');
    await expect(page.locator('.olcad-crosshair')).toHaveCount(0);
    expect(await viewportCursor()).toBe('auto');
    await expect(page.locator('#map')).not.toHaveClass(/olcad-edit-mode/);
  });

  test('the buttons are grouped into main, draw, modify, trim, dimension and measure toolbars', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForEditor(page);
    const toolbars = page.locator('.olcad-dock__zone--top > olcad-toolbar');
    await expect(toolbars).toHaveCount(6);
    const tools = async (name: string) =>
      page
        .locator(`olcad-toolbar[name="${name}"] [data-tool]`)
        .evaluateAll((buttons) => buttons.map((b) => (b as HTMLElement).dataset.tool));
    const label = (name: string) =>
      page.locator(`olcad-toolbar[name="${name}"] [role="toolbar"]`).getAttribute('aria-label');
    expect(await label('main')).toBe('Main');
    expect(await label('draw')).toBe('Draw');
    expect(await label('modify')).toBe('Modify');
    expect(await tools('main')).toEqual(['select', 'delete']);
    expect(await tools('draw')).toEqual([
      'draw',
      'draw',
      'draw',
      'rectangle',
      'circle',
      'ellipse',
      'regular-polygon',
      'curve',
      'parallel',
      'text',
    ]);
    expect(await tools('modify')).toEqual([
      'modify',
      'move',
      'rotate',
      'scale',
      'offset',
      'mirror',
      'template-copy',
    ]);
    expect(await label('trim')).toBe('Trim / Extend');
    expect(await label('dimension')).toBe('Dimension');
    expect(await tools('dimension')).toEqual([
      'dimension-linear',
      'dimension-angular',
      'dimension-radial',
      'dimension-survey',
    ]);
    expect(await tools('trim')).toEqual(['trim', 'extend']);
    expect(await label('measure')).toBe('Measure');
    expect(await tools('measure')).toEqual([
      'measure-distance',
      'measure-area',
      'measure-angle',
      'measure-clear',
    ]);
    await expect(page.locator('olcad-toolbar[name="main"] #zoom-in')).toHaveCount(1);
    // The fixed controls exist once, in the main toolbar.
    await expect(page.locator('.olcad-toolbar__edit-toggle')).toHaveCount(1);
    await expect(page.locator('.olcad-toolbar__undo')).toHaveCount(1);
    await expect(page.locator('.olcad-toolbar__active-layer')).toHaveCount(1);
    await expect(page.locator('olcad-toolbar[name="draw"] .olcad-toolbar__separator')).toHaveCount(
      0,
    );
    // The shortcuts are bound once: one Ctrl+Z undoes one of two inserts.
    await page.locator('.olcad-toolbar__edit-toggle').click();
    await expect(
      page.locator('olcad-toolbar[name="draw"] .olcad-toolbar__tool--draw-point'),
    ).toBeEnabled();
    await page.locator('olcad-toolbar[name="draw"] .olcad-toolbar__tool--draw-point').click();
    const draftCount = () =>
      page.evaluate(
        () => window.editor.layers.getFeatures(window.editor.layers.getDraft()!).length,
      );
    const map = (await page.locator('#map').boundingBox())!;
    await page.mouse.click(map.x + map.width / 2, map.y + map.height / 2);
    await page.mouse.click(map.x + map.width / 2 + 60, map.y + map.height / 2);
    await expect.poll(draftCount).toBe(2);
    await page.keyboard.press('Control+z');
    await expect.poll(draftCount).toBe(1);
    expect(await page.evaluate(() => window.editor.canUndo())).toBe(true);
  });

  test('toolboxes are compact icon strips with tooltips', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    const toolbar = page.locator('olcad-toolbar[name="main"]');
    await expect(toolbar).toHaveAttribute('data-compact', '');
    await expect(toolbar.locator('.olcad-panel__title')).toBeHidden();
    await expect(toolbar.locator('.olcad-panel__menu-button')).toBeHidden();
    // One row of icon buttons: no taller than a button plus padding.
    const box = (await toolbar.boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(40);
    const select = toolbar.locator('.olcad-toolbar__tool--select');
    await expect(select).toHaveAttribute('aria-label', 'Select');
    await expect(select.locator('svg.olcad-icon')).toHaveCount(1);
    await expect(select).toHaveText('');
    const tooltip = page.locator('.olcad-tooltip');
    await select.hover();
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator('.olcad-tooltip__label')).toHaveText('Select');
    await expect(tooltip.locator('.olcad-tooltip__text')).toContainText('Shift+click');
    const tipBox = (await tooltip.boundingBox())!;
    const selectBox = (await select.boundingBox())!;
    expect(tipBox.y).toBeGreaterThanOrEqual(selectBox.y + selectBox.height); // below the button
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();
    // Keyboard focus shows it too (on an enabled button); Escape hides it.
    await toolbar.locator('.olcad-toolbar__edit-toggle').focus();
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator('.olcad-tooltip__label')).toHaveText('Edit mode');
    await page.keyboard.press('Escape');
    await expect(tooltip).toBeHidden();
    // The grip of a compact panel opens the dock menu on click.
    await toolbar.locator('.olcad-panel__grip').click();
    await expect(toolbar.locator('.olcad-panel__menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(toolbar.locator('.olcad-panel__menu')).toBeHidden();
    // Dark theme by default; the View menu switches to light.
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(await bg()).toBe('rgb(27, 29, 33)');
    await page.locator('olcad-menu[label="View"] .olcad-menu__button').click();
    await page.locator('#light-theme').check();
    expect(await bg()).toBe('rgb(255, 255, 255)');
    await expect(page.locator('html')).toHaveAttribute('olcad-theme', 'light');
    // View → Light straightedge is on by default and recolours the crosshair live through the API.
    await expect(page.locator('#light-straightedge')).toBeChecked();
    expect(await page.evaluate(() => window.editor.straightedge.getColor())).toBe('#f3f4f6');
    await page.keyboard.press('Escape'); // close the menu
    await toolbar.locator('.olcad-toolbar__edit-toggle').click();
    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    await page.mouse.move(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
    const lineColor = () =>
      page.evaluate(
        () => document.querySelector<HTMLElement>('.olcad-crosshair__h-left')!.style.background,
      );
    expect(await lineColor()).toBe('rgb(243, 244, 246)');
    await page.locator('olcad-menu[label="View"] .olcad-menu__button').click();
    await page.locator('#light-straightedge').uncheck();
    expect(await page.evaluate(() => window.editor.straightedge.getColor())).toBe('#1f2933');
    expect(await lineColor()).toBe('rgb(31, 41, 51)');
    await page.locator('#light-straightedge').check();
    expect(await lineColor()).toBe('rgb(243, 244, 246)');
  });

  test('panels start in their zones and the map fills the centre', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await expect(page.locator('.olcad-dock__zone--top > olcad-toolbar')).toHaveCount(6);
    await expect(page.locator('.olcad-dock__zone--right > olcad-panel[name="layers"]')).toHaveCount(
      1,
    );
    await expect(page.locator('.olcad-dock__zone--bottom > olcad-input-bar')).toHaveCount(1);
    await expect(page.locator('.olcad-dock__zone--bottom > olcad-panel[name="crs"]')).toHaveCount(
      1,
    );
    // Layers and Attributes are flyouts: collapsed to their tabs until opened.
    const layers = page.locator('olcad-panel[name="layers"]');
    await expect(layers).toHaveAttribute('data-flyout', '');
    await expect(layers.locator('olcad-layer-list')).toBeHidden();
    await layers.locator('.olcad-panel__title').click();
    await expect(layers).toHaveAttribute('open', '');
    await expect(layers.locator('olcad-layer-list')).toBeVisible();
    const overlay = (await layers.locator('.olcad-panel__content').boundingBox())!;
    const mapBox = (await page.locator('#map').boundingBox())!;
    expect(overlay.x + overlay.width).toBeLessThanOrEqual(mapBox.x + mapBox.width + 1); // over the map
    await page.keyboard.press('Escape');
    await expect(layers).not.toHaveAttribute('open', '');
    await expect(page.locator('.olcad-dock__zone--center > #map canvas')).toBeVisible();
    const map = await page.locator('#map').boundingBox();
    const dock = await page.locator('olcad-dock').boundingBox();
    // Top and bottom zones take one row each; the map keeps most of the height.
    expect(map!.height).toBeGreaterThan(dock!.height * 0.6);
    expect(map!.width).toBeLessThan(dock!.width);
  });

  test('dragging the grip floats a panel and dropping near an edge docks it', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    const toolbar = page.locator('olcad-toolbar[name="main"]');
    const grip = toolbar.locator('.olcad-panel__grip');
    const dock = (await page.locator('olcad-dock').boundingBox())!;
    const gripBox = (await grip.boundingBox())!;
    const start = { x: gripBox.x + gripBox.width / 2, y: gripBox.y + gripBox.height / 2 };

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(dock.x + dock.width / 2, dock.y + dock.height / 2, { steps: 5 });
    await expect(toolbar).toHaveAttribute('data-dock', 'floating');
    await expect(page.locator('.olcad-dock__zone--floating > olcad-toolbar')).toHaveCount(1);
    await page.mouse.up();
    await expect(toolbar).toHaveAttribute('data-dock', 'floating');
    const floated = (await toolbar.boundingBox())!;
    expect(floated.y).toBeGreaterThan(dock.y + 50);

    // Drag it to the left edge: zone highlights, then it docks on release.
    const grip2 = (await grip.boundingBox())!;
    await page.mouse.move(grip2.x + grip2.width / 2, grip2.y + grip2.height / 2);
    await page.mouse.down();
    await page.mouse.move(dock.x + 10, dock.y + dock.height / 2, { steps: 5 });
    await expect(page.locator('olcad-dock')).toHaveAttribute('data-drop', 'left');
    await page.mouse.up();
    await expect(toolbar).toHaveAttribute('data-dock', 'left');
    await expect(toolbar).toHaveAttribute('orientation', 'vertical');
    await expect(page.locator('.olcad-dock__zone--left > olcad-toolbar')).toHaveCount(1);
    await expect(page.locator('olcad-dock')).not.toHaveAttribute('data-drop', /./);

    // The layout is persisted and restored after a reload.
    await page.reload();
    await waitForEditor(page);
    await expect(page.locator('.olcad-dock__zone--left > olcad-toolbar')).toHaveCount(1);

    // View → Reset layout puts it back where the markup has it, and that persists too.
    await page.locator('olcad-menu[label="View"] .olcad-menu__button').click();
    await page.locator('#reset-layout').click();
    await expect(page.locator('.olcad-dock__zone--top > olcad-toolbar')).toHaveCount(6);
    await expect(toolbar).toHaveAttribute('data-dock', 'top');
    await expect(page.locator('olcad-input-bar .olcad-input-bar__output')).toHaveText(
      'Layout reset.',
    );
    await page.reload();
    await waitForEditor(page);
    await expect(page.locator('.olcad-dock__zone--top > olcad-toolbar')).toHaveCount(6);
  });

  test('the dock menu is keyboard operable', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    const panel = page.locator('olcad-panel[name="layers"]');
    await panel.locator('.olcad-panel__menu-button').focus();
    await page.keyboard.press('Enter');
    await expect(panel.locator('.olcad-panel__menu')).toBeVisible();
    await expect(panel.locator('[role="menuitemradio"][aria-checked="true"]')).toHaveText(
      'Dock right',
    );
    await page.keyboard.press('ArrowDown'); // bottom
    await page.keyboard.press('Enter');
    await expect(panel).toHaveAttribute('data-dock', 'bottom');
    await expect(panel.locator('.olcad-panel__menu')).toBeHidden();
    await expect(
      page.locator('.olcad-dock__zone--bottom > olcad-panel[name="layers"]'),
    ).toHaveCount(1);
  });
});

test.describe('menu bar', () => {
  test('the File menu holds save, discard and reset and is keyboard operable', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    const bar = page.locator('olcad-menubar');
    await expect(bar).toHaveAttribute('role', 'menubar');
    const file = bar.locator('olcad-menu[label="File"]');
    const popup = file.locator('.olcad-menu__popup');
    await expect(popup).toBeHidden();
    await file.locator('.olcad-menu__button').focus();
    await page.keyboard.press('ArrowDown');
    await expect(popup).toBeVisible();
    await expect(popup.locator('[role="menuitem"]')).toHaveText([
      'Save',
      'Discard',
      'Show change set…',
      'Import…',
      'Export…',
      'Reset server',
    ]);
    await expect(popup.locator('[role="menuitemcheckbox"]')).toHaveText(/Simulate server failure/);
    // Nothing to save yet: Save and Discard are disabled, focus lands on the first enabled item.
    await expect(page.locator('#save')).toBeDisabled();
    await expect(page.locator('#discard')).toBeDisabled();
    await expect(page.locator('#show-changes')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(popup).toBeHidden();
    await expect(file.locator('.olcad-menu__button')).toBeFocused();
    // Reset server through the menu shows the status.
    await file.locator('.olcad-menu__button').click();
    await page.locator('#reset').click();
    await expect(popup).toBeHidden();
    await expect(page.locator('olcad-input-bar .olcad-input-bar__output')).toHaveText(
      'Server data reset to seed.',
    );
  });
});

test.describe('View menu', () => {
  test('shows and hides every toolbar and panel, and keeps it across a reload', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForEditor(page);
    const view = page.locator('olcad-menu[label="View"]');
    const open = async () => {
      if (!(await view.locator('.olcad-menu__popup').isVisible())) {
        await view.locator('.olcad-menu__button').click();
      }
    };
    await open();
    const boxes = view.locator('[role="menuitemcheckbox"]:has(input[data-panel])');
    expect((await boxes.allTextContents()).map((t) => t.trim())).toEqual([
      'Main',
      'Draw',
      'Modify',
      'Trim / Extend',
      'Dimension',
      'Measure (toolbar)',
      'Straightedge',
      'Snap',
      'Grid',
      'Angle',
      'Layers',
      'Templates',
      'Measure (panel)',
      'Attributes',
      'Command line',
      'CRS',
    ]);
    // One toolbar off, through its checkbox; the menu stays open.
    const draw = page.locator('olcad-toolbar[name="draw"]');
    await expect(draw).toBeVisible();
    await view.locator('input[data-panel="draw"]').uncheck();
    await expect(draw).toBeHidden();
    await expect(view.locator('.olcad-menu__popup')).toBeVisible();

    // Hide all: no toolbar or panel is left, the map fills the window.
    await view.locator('[data-panel-action="hide-all"]').click();
    await expect(page.locator('olcad-toolbar:visible')).toHaveCount(0);
    await expect(page.locator('olcad-input-bar')).toBeHidden();
    await expect(page.locator('olcad-panel[name="layers"]')).toBeHidden();

    // Kept across a reload.
    await page.reload();
    await waitForEditor(page);
    await expect(page.locator('olcad-toolbar:visible')).toHaveCount(0);
    await open();
    await expect(view.locator('input[data-panel="main"]')).not.toBeChecked();

    // Show all brings everything back; the table panel still opens only from the layer list.
    await view.locator('[data-panel-action="show-all"]').click();
    await expect(page.locator('olcad-toolbar:visible')).toHaveCount(6);
    await expect(page.locator('olcad-input-bar')).toBeVisible();
    await expect(page.locator('olcad-panel[name="table"]')).toBeHidden();

    // Reset layout also shows hidden panels again.
    await open();
    await view.locator('input[data-panel="snap"]').uncheck();
    await view.locator('#reset-layout').click();
    await expect(page.locator('olcad-snap-settings')).toBeVisible();
  });
});
