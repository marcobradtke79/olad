import { expect, test, type Page } from '@playwright/test';
import { insertInto } from './flyout';

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.editor));
}

async function waitForLayer(page: Page, id: string, count: number): Promise<void> {
  await expect
    .poll(() => page.evaluate((layer) => window.editor.layers.get(layer).featureCount, id))
    .toBe(count);
}

const changeCount = (page: Page) => page.evaluate(() => window.editor.changes.get().changes.length);

/** Open a menu of the test page's menu bar. */
async function openMenu(page: Page, label: string): Promise<void> {
  const menu = page.locator(`olcad-menu[label="${label}"]`);
  await menu.locator('.olcad-menu__button').click();
  await expect(menu.locator('.olcad-menu__popup')).toBeVisible();
}
const openFile = (page: Page) => openMenu(page, 'File');

/** Run one of the test page's command buttons from the Commands menu. */
async function command(page: Page, id: string): Promise<void> {
  await openMenu(page, 'Commands');
  await page.locator(`#${id}`).click();
}

/** The status line: the input bar's output. */
const status = (page: Page) => page.locator('olcad-input-bar .olcad-input-bar__output');

test.describe('change tracking and save cycle', () => {
  test.afterEach(async ({ request }) => {
    await request.post('/reset');
  });

  test('commands feed the change set, undo and redo, save with accept, failure and discard', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);

    // Without an active layer the insert goes to the draft layer: no change, no popup.
    await command(page, 'cmd-insert');
    await expect(status(page)).toHaveText('Inserted into draft');
    await waitForLayer(page, 'draft', 1);
    expect(await changeCount(page)).toBe(0);
    expect(await page.evaluate(() => window.editor.changes.hasChanges())).toBe(false);
    await expect(page.locator('olcad-attribute-form[popup] dialog[open]')).toHaveCount(0);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    await insertInto(page, 'Roads');

    await command(page, 'cmd-insert');
    await expect(status(page)).toHaveText('Inserted into roads');
    // Every insert pops up the attribute form; dismiss it here.
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();
    expect(await changeCount(page)).toBe(1);
    await expect(page.locator('#changes')).toContainText('"op": "insert"');
    await expect(page.locator('#changes')).toContainText('"crs": "EPSG:4326"');
    // tmp-1 went to the draft object: temporary ids stay unique across all layers.
    await expect(page.locator('#changes')).toContainText('"tempId": "tmp-2"');
    // The change set is shown in a popup from the File menu.
    await openFile(page);
    await page.locator('#show-changes').click();
    await expect(page.locator('#changes-dialog')).toBeVisible();
    await expect(page.locator('#changes-dialog')).toContainText('"op": "insert"');
    await page.keyboard.press('Escape');
    await expect(page.locator('#changes-dialog')).toBeHidden();
    await waitForLayer(page, 'roads', 3);

    // Undo and redo through the toolbar.
    const undo = page.locator('olcad-toolbar .olcad-toolbar__undo');
    const redo = page.locator('olcad-toolbar .olcad-toolbar__redo');
    await expect(undo).toBeEnabled();
    await expect(redo).toBeDisabled();
    await undo.click();
    expect(await changeCount(page)).toBe(0);
    await waitForLayer(page, 'roads', 2);
    await expect(redo).toBeEnabled();
    await redo.click();
    expect(await changeCount(page)).toBe(1);

    // Update of a loaded feature: only the changed property is exported.
    await command(page, 'cmd-rename');
    await expect(status(page)).toHaveText('Renamed 815');
    await expect(page.locator('#changes')).toContainText('"changed": [\n      "name"\n    ]');
    expect(await changeCount(page)).toBe(2);

    // A rejected command: trees is read-only.
    await waitForLayer(page, 'trees', 3);
    await page.evaluate(() => {
      const feature = window.editor.layers.getFeatures('trees')[0]!;
      window.editor.execute(window.olcad.deleteFeature(feature));
    });
    await expect(status(page)).toHaveText(/Rejected \(not-editable\)/);
    expect(await changeCount(page)).toBe(2);

    // Failed save keeps the changes. Save lives in the File menu.
    await openFile(page);
    await page.locator('#fail').check();
    await page.locator('#save').click();
    await expect(page.locator('olcad-menu[label="File"] .olcad-menu__popup')).toBeHidden();
    await expect(status(page)).toHaveText(/Save failed/);
    expect(await page.evaluate(() => window.editor.changes.hasChanges())).toBe(true);

    // Successful save: the server answers an idMap and accept applies it.
    await openFile(page);
    await page.locator('#fail').uncheck();
    await page.locator('#save').click();
    await expect(status(page)).toHaveText(/Saved/);
    expect(await page.evaluate(() => window.editor.changes.hasChanges())).toBe(false);
    await expect(undo).toBeDisabled();
    const ids = await page.evaluate(() =>
      window.editor.layers.getFeatures('roads').map((f) => f.getId()),
    );
    expect(ids).toHaveLength(3);
    expect(ids.some((id) => typeof id === 'number' && id >= 10_000)).toBe(true);
    expect(ids).not.toContain('tmp-2');
    const log = (await (await request.get('/changes/log')).json()) as {
      changeSet: { crs?: string; changes: { op: string; crs: string }[] };
      idMap: Record<string, number>;
    }[];
    const last = log.at(-1)!;
    expect(last.changeSet.crs).toBe('EPSG:4326');
    expect(last.changeSet.changes.map((c) => c.op)).toEqual(['insert', 'update']);
    expect(Object.keys(last.idMap)).toEqual(['tmp-2']);
    const roads = (await (await request.get('/data/roads')).json()) as {
      features: { id: number; properties: { name: string } }[];
    };
    expect(roads.features).toHaveLength(3);
    expect(roads.features.find((f) => f.id === 815)!.properties.name).toMatch(/^Renamed/);

    // Further edits start from the new baseline; discard restores it.
    await command(page, 'cmd-delete');
    await expect(page.locator('#changes')).toContainText('"op": "delete"');
    await waitForLayer(page, 'roads', 2);
    await openFile(page);
    await page.locator('#discard').click();
    await waitForLayer(page, 'roads', 3);
    expect(await page.evaluate(() => window.editor.changes.hasChanges())).toBe(false);
    // Save and discard left the draft object alone.
    await waitForLayer(page, 'draft', 1);
  });

  test('a geometry update is exported in the layer data projection', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'trees', 3);
    await page.evaluate(() => window.editor.layers.setEditable('trees', true));
    const change = await page.evaluate(() => {
      const tree = window.editor.layers.getFeatures('trees')[0]!;
      const geometry = tree.getGeometry()!.clone();
      geometry.translate(10, 0);
      window.editor.execute(window.olcad.updateGeometry(tree, geometry));
      return window.editor.changes.get().changes[0] as {
        crs: string;
        changed: string[];
        geometry: { type: string; coordinates: number[] };
      };
    });
    expect(change.crs).toBe('EPSG:25832');
    expect(change.changed).toEqual(['geometry']);
    expect(change.geometry.type).toBe('Point');
    expect(change.geometry.coordinates[0]).toBeGreaterThan(400_000); // UTM easting
  });
});
