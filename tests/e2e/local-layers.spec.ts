import { expect, test, type Page } from '@playwright/test';
import { openFlyout } from './flyout';

interface Persistence {
  ready: Promise<void>;
  flush(): Promise<void>;
}

async function load(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.editor));
  await page.evaluate(
    () => (window as unknown as { localLayerPersistence: Persistence }).localLayerPersistence.ready,
  );
}

test.describe('local layers', () => {
  test('creates a layer in the browser, keeps it across a reload, renames and deletes it', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await load(page);
    await openFlyout(page, 'layers');

    // New layer: name, geometry type, two attributes.
    await page.locator('olcad-layer-list [data-action="new-layer"]').click();
    const dialog = page.locator('.olcad-layer-editor__dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('[name="title"]').fill('Trees');
    await dialog.locator('[name="geometryType"]').selectOption('Point');
    await dialog.locator('.olcad-layer-editor__add').click();
    await dialog.locator('.olcad-layer-editor__add').click();
    const rows = dialog.locator('.olcad-layer-editor__row:not(.olcad-layer-editor__row--head)');
    await rows.nth(0).locator('[data-part="name"]').fill('species');
    await rows.nth(0).locator('[data-part="required"]').check();
    await rows.nth(1).locator('[data-part="name"]').fill('height');
    await rows.nth(1).locator('[data-part="type"]').selectOption('number');
    await dialog.locator('[data-action="save"]').click();
    await expect(dialog).toBeHidden();

    const row = page.locator('olcad-layer-list [data-layer-id="local-1"]');
    await expect(row).toBeVisible();
    await expect(row).toHaveClass(/olcad-layer-list__layer--local/);
    expect(await page.evaluate(() => window.editor.layers.getConfig('local-1').schema)).toEqual({
      fields: [
        { name: 'species', type: 'string', required: true },
        { name: 'height', type: 'number' },
      ],
    });

    // An object in it never reaches the change set.
    await page.evaluate(() => {
      const ol = (
        window as unknown as {
          ol: {
            Feature: new (p: object) => unknown;
            geom: { Point: new (c: number[]) => unknown };
          };
        }
      ).ol;
      const center = window.editor.map.getView().getCenter()!;
      const feature = new ol.Feature({ geometry: new ol.geom.Point(center), species: 'oak' });
      window.editor.execute(window.olcad.insertFeature('local-1', feature as never));
    });
    expect(await page.evaluate(() => window.editor.layers.get('local-1').featureCount)).toBe(1);
    expect(await page.evaluate(() => window.editor.changes.hasChanges())).toBe(false);
    await page.evaluate(() =>
      (window as unknown as { localLayerPersistence: Persistence }).localLayerPersistence.flush(),
    );

    // Restored from IndexedDB after a reload.
    await load(page);
    expect(
      await page.evaluate(() =>
        window.editor.localLayers.list().map(({ id, title, geometryType, featureCount }) => ({
          id,
          title,
          geometryType,
          featureCount,
        })),
      ),
    ).toEqual([{ id: 'local-1', title: 'Trees', geometryType: 'Point', featureCount: 1 }]);
    expect(
      await page.evaluate(() => window.editor.layers.getFeatures('local-1')[0]!.get('species')),
    ).toBe('oak');

    // Settings: rename an attribute and the layer; the value moves along.
    await openFlyout(page, 'layers');
    await page.locator('[data-layer-id="local-1"] [data-action="settings"]').click();
    await expect(dialog.locator('[name="geometryType"]')).toBeDisabled();
    await dialog.locator('[name="title"]').fill('Old trees');
    await rows.nth(0).locator('[data-part="name"]').fill('kind');
    await dialog.locator('[data-action="save"]').click();
    await expect(page.locator('[data-layer-id="local-1"] .olcad-layer-list__title')).toHaveText(
      'Old trees',
    );
    expect(
      await page.evaluate(() => window.editor.layers.getFeatures('local-1')[0]!.get('kind')),
    ).toBe('oak');

    // Delete after a second click.
    await page.locator('[data-layer-id="local-1"] [data-action="settings"]').click();
    await dialog.locator('[data-action="delete"]').click();
    await expect(dialog.locator('[data-action="delete"]')).toHaveText(/Delete 1 object/);
    await dialog.locator('[data-action="delete"]').click();
    await expect(page.locator('[data-layer-id="local-1"]')).toHaveCount(0);
    await page.evaluate(() =>
      (window as unknown as { localLayerPersistence: Persistence }).localLayerPersistence.flush(),
    );
    await load(page);
    expect(await page.evaluate(() => window.editor.localLayers.list())).toEqual([]);
    expect(errors).toEqual([]);
  });
});
