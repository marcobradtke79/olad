import { expect, test, type Page } from '@playwright/test';

async function fileMenu(page: Page, id: string): Promise<void> {
  const menu = page.locator('olcad-menu[label="File"]');
  await menu.locator('.olcad-menu__button').click();
  await menu.locator(`#${id}`).click();
}

/** Export Parcels and Roads in `format` through the export dialog; returns the file path. */
async function exportFile(page: Page, format: string): Promise<string> {
  await fileMenu(page, 'export');
  const dialog = page.locator('.olcad-export-dialog__dialog');
  await dialog.locator('[data-action="none"]').click();
  await dialog.locator('input[name="layer"][value="parcels"]').check();
  await dialog.locator('input[name="layer"][value="roads"]').check();
  await dialog.locator(`input[name="format"][value="${format}"]`).check();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.locator('[data-action="export"]').click(),
  ]);
  return (await download.path())!;
}

test.describe('import', () => {
  test('imports an exported file into new local layers or an existing layer', async ({ page }) => {
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

    // KML round trip: one group per folder, into new local layers.
    const kml = await exportFile(page, 'kml');
    await fileMenu(page, 'import');
    const dialog = page.locator('.olcad-import-dialog__dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'site.kml',
      mimeType: 'application/vnd.google-earth.kml+xml',
      buffer: await import('node:fs/promises').then((fs) => fs.readFile(kml)),
    });
    const rows = dialog.locator('tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0).locator('input')).toHaveValue('Parcels');
    await dialog.locator('[data-action="import"]').click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('olcad-input-bar')).toContainText(
      'Imported 4 objects into 2 new local layers',
    );
    expect(
      await page.evaluate(() =>
        window.editor.localLayers.list().map((l) => [l.title, l.geometryType, l.featureCount]),
      ),
    ).toEqual([
      ['Parcels', 'Polygon', 2],
      ['Roads', 'LineString', 2],
    ]);
    expect(await page.evaluate(() => window.editor.changes.hasChanges())).toBe(false);

    // GeoJSON: the parcels go back into the server layer and land in the change set.
    const geojson = await exportFile(page, 'geojson');
    await fileMenu(page, 'import');
    await dialog.locator('input[type="file"]').setInputFiles(geojson);
    const parcels = dialog.locator('tbody tr').nth(0);
    await parcels.locator('select').selectOption({ label: 'Into Parcels' });
    await dialog.locator('tbody tr').nth(1).locator('select').selectOption('skip');
    await dialog.locator('[data-action="import"]').click();
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => window.editor.layers.get('parcels').featureCount)).toBe(4);
    expect(
      await page.evaluate(() => window.editor.changes.get().changes.map((c) => [c.op, c.layer])),
    ).toEqual([
      ['insert', 'parcels'],
      ['insert', 'parcels'],
    ]);
    // One undo step removes the import again.
    await page.evaluate(() => window.editor.undo());
    expect(await page.evaluate(() => window.editor.layers.get('parcels').featureCount)).toBe(2);

    // A broken file shows an error in the dialog.
    await fileMenu(page, 'import');
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'broken.geojson',
      mimeType: 'application/geo+json',
      buffer: Buffer.from('{ nope'),
    });
    await expect(dialog.locator('.olcad-import-dialog__error')).toHaveText(
      'The file is not valid JSON',
    );
    expect(errors).toEqual([]);
  });
});
