import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test.describe('export', () => {
  test('File → Export… writes the chosen layers into one GeoJSON or KML file', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.editor));
    await expect
      .poll(() =>
        page.evaluate(() => [
          window.editor.layers.get('parcels').featureCount,
          window.editor.layers.get('roads').featureCount,
        ]),
      )
      .toEqual([2, 2]);

    // File → Export… through the real menu.
    const open = async () => {
      const menu = page.locator('olcad-menu[label="File"]');
      await menu.locator('.olcad-menu__button').click();
      await menu.locator('#export').click();
    };
    await open();
    const dialog = page.locator('.olcad-export-dialog__dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-action="none"]').click();
    await dialog.locator('input[name="layer"][value="parcels"]').check();
    await dialog.locator('input[name="layer"][value="roads"]').check();
    await dialog.locator('input[name="format"][value="geojson"]').check();
    const [geojson] = await Promise.all([
      page.waitForEvent('download'),
      dialog.locator('[data-action="export"]').click(),
    ]);
    expect(geojson.suggestedFilename()).toMatch(/^export-\d{4}-\d{2}-\d{2}\.geojson$/);
    const json = JSON.parse(await readFile((await geojson.path())!, 'utf8'));
    expect(json.features).toHaveLength(4);
    expect(
      new Set(json.features.map((f: { properties: { layer: string } }) => f.properties.layer)),
    ).toEqual(new Set(['parcels', 'roads']));
    await expect(dialog).toBeHidden();
    await expect(page.locator('olcad-input-bar')).toContainText('Exported 4 objects');

    // Opening again pre-checks every layer with objects; the format is remembered.
    await open();
    await expect(dialog.locator('input[name="format"][value="geojson"]')).toBeChecked();
    await dialog.locator('[data-action="none"]').click();
    await dialog.locator('input[name="layer"][value="parcels"]').check();
    await dialog.locator('input[name="layer"][value="roads"]').check();
    await dialog.locator('input[name="format"][value="kml"]').check();
    await expect(dialog.locator('select[name="projection"]')).toBeDisabled();
    const [kml] = await Promise.all([
      page.waitForEvent('download'),
      dialog.locator('[data-action="export"]').click(),
    ]);
    const text = await readFile((await kml.path())!, 'utf8');
    expect(text.match(/<Folder>/g)).toHaveLength(2);
    expect(errors).toEqual([]);
  });
});
