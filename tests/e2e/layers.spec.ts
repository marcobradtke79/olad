import { expect, test, type Page } from '@playwright/test';
import { openFlyout } from './flyout';

/** The test page creates the editor after fetching /config. */
async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.editor));
}

test.describe('layers and projections', () => {
  test('lists every configured layer and loads features in all formats', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await waitForEditor(page);
    await expect(page.locator('#map canvas')).toBeVisible();
    const rows = page.locator('olcad-layer-list [data-layer-id]');
    await expect(rows).toHaveCount(10); // the configured layers and the draft layer

    const expected: Record<string, number> = {
      parcels: 2,
      roads: 2,
      hydrants: 2,
      tracks: 1,
      buildings: 1,
      'survey-points': 1,
      trees: 3,
      lamps: 3,
      labels: 2,
      draft: 0,
    };
    await expect
      .poll(() =>
        page.evaluate(() =>
          Object.fromEntries(window.editor.layers.list().map((l) => [l.id, l.featureCount])),
        ),
      )
      .toEqual(expected);
    // The info button opens the details below the row.
    await openFlyout(page, 'layers');
    const detail = async (layer: string, key: string) => {
      const row = page.locator(`olcad-layer-list [data-layer-id="${layer}"]`);
      const details = row.locator('.olcad-layer-list__details');
      if (await details.isHidden()) await row.locator('[data-action="info"]').click();
      return row.locator(`[data-detail="${key}"] dd`);
    };
    await expect(await detail('tracks', 'editable')).toHaveText('read-only');
    await expect(await detail('tracks', 'geometry')).toHaveText('MultiLineString');
    await expect(await detail('tracks', 'projection')).toHaveText('EPSG:4326');
    await expect(await detail('parcels', 'editable')).toHaveText('insert update');
    await expect(await detail('parcels', 'features')).toHaveText('2');
    await expect(await detail('draft', 'geometry')).toHaveText('Any');
    expect(await page.evaluate(() => window.editor.layers.getDraft())).toBe('draft');
    expect(errors).toEqual([]);
  });

  test('edit buttons switch edit mode on and select the active layer', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await openFlyout(page, 'layers');
    const enabled = page.locator('olcad-layer-list [data-action="edit"]:not([disabled])');
    await expect(enabled).toHaveCount(8); // all but the read-only tracks and trees
    await expect(page.locator('olcad-toolbar .olcad-toolbar__active-layer')).toHaveText(
      'No layer selected',
    );

    // Edit works without switching edit mode on first: it does that itself, starting no tool.
    const parcels = page.getByRole('button', { name: 'Edit Parcels', exact: true });
    await parcels.click();
    expect(await page.evaluate(() => window.editor.isEditMode())).toBe(true);
    expect(await page.evaluate(() => window.editor.layers.getActive())).toBe('parcels');
    expect(await page.evaluate(() => window.editor.tools.getActive())).toBeNull();
    await expect(parcels).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('olcad-layer-list [data-layer-id="parcels"]')).toHaveClass(
      /olcad-layer-list__layer--active/,
    );
    await expect(page.locator('olcad-toolbar .olcad-toolbar__active-layer')).toHaveText(
      'Layer: Parcels',
    );
    // The visibility of the row is untouched by the edit button.
    await expect(
      page.locator('olcad-layer-list [data-layer-id="parcels"] [data-action="visible"]'),
    ).toHaveAttribute('aria-pressed', 'true');
    // A second press clears the active layer; edit mode stays on.
    await parcels.click();
    expect(await page.evaluate(() => window.editor.layers.getActive())).toBeNull();
    expect(await page.evaluate(() => window.editor.isEditMode())).toBe(true);
    await parcels.click();

    await page.evaluate(() => window.editor.layers.remove('parcels'));
    expect(await page.evaluate(() => window.editor.layers.getActive())).toBeNull();
    await expect(page.locator('olcad-toolbar .olcad-toolbar__active-layer')).toHaveText(
      'No layer selected',
    );
  });

  test('toggles visibility and editability through UI and API', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await openFlyout(page, 'layers');
    const eye = page.locator('olcad-layer-list [data-layer-id="roads"] [data-action="visible"]');
    await expect(eye).toHaveAttribute('aria-pressed', 'true');
    await eye.click();
    expect(await page.evaluate(() => window.editor.layers.get('roads').visible)).toBe(false);
    await expect(eye).toHaveAttribute('aria-pressed', 'false');
    await expect(eye).toBeFocused(); // the re-render keeps the keyboard focus
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => window.editor.layers.get('roads').visible)).toBe(true);

    const tracks = page.locator('olcad-layer-list [data-layer-id="tracks"]');
    await expect(tracks.locator('[data-action="edit"]')).toBeDisabled();
    await page.evaluate(() => window.editor.layers.setEditable('tracks', { update: true }));
    await expect(tracks.locator('[data-action="edit"]')).toBeEnabled();
    await tracks.locator('[data-action="info"]').click();
    await expect(tracks.locator('[data-detail="editable"] dd')).toHaveText('update');
    expect(await page.evaluate(() => window.editor.layers.canEdit('tracks', 'delete'))).toBe(false);
  });

  test('highlights all objects of a layer in its own style', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await openFlyout(page, 'layers');
    const row = page.locator('olcad-layer-list [data-layer-id="parcels"]');
    const button = row.locator('[data-action="highlight"]');
    const overlays = () =>
      page.evaluate(() =>
        window.editor.map
          .getLayers()
          .getArray()
          .filter((l) => l.get('olcad:layer-highlight') === true)
          .map((l) => ({ visible: l.getVisible(), zIndex: l.getZIndex() })),
      );
    expect(await overlays()).toEqual([]);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.editor.layers.get('parcels').highlighted)).toBe(true);
    expect(await overlays()).toEqual([{ visible: true, zIndex: 999 }]);
    // The overlay follows the layer's visibility.
    await row.locator('[data-action="visible"]').click();
    expect(await overlays()).toEqual([{ visible: false, zIndex: 999 }]);
    await row.locator('[data-action="visible"]').click();
    // Highlighted objects stay selectable by click: the overlay is no hit target.
    await page.evaluate(() => window.editor.setEditMode(true));
    await page.evaluate(() => window.editor.layers.setHighlighted('roads', true));
    expect(await overlays()).toHaveLength(2);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(await overlays()).toHaveLength(1);
  });

  test('switches the projection and reprojects features without loss', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.get('parcels').featureCount))
      .toBe(2);
    const before = await page.evaluate(() =>
      window.editor.layers.getFeatures('parcels')[0]!.getGeometry()!.getExtent(),
    );

    await page.selectOption('olcad-projection-select select', 'EPSG:25832');
    await expect.poll(() => page.evaluate(() => window.editor.getProjection())).toBe('EPSG:25832');
    const utm = await page.evaluate(() =>
      window.editor.layers.getFeatures('parcels')[0]!.getGeometry()!.getExtent(),
    );
    expect(utm[0]).toBeGreaterThan(400_000);
    expect(utm[0]).toBeLessThan(500_000);
    expect(utm[1]).toBeGreaterThan(5_000_000);
    expect(await page.evaluate(() => window.editor.map.getView().getProjection().getUnits())).toBe(
      'm',
    );

    await page.selectOption('olcad-projection-select select', 'EPSG:4326');
    const original = await page.evaluate(() => {
      const f = window.editor.layers.getFeatures('parcels')[0]!;
      return [
        f.getGeometry()!.getExtent(),
        window.editor.layers.getOriginalGeometry(f)!.geometry.getExtent(),
      ];
    });
    expect(original[0]).toEqual(original[1]);

    await page.selectOption('olcad-projection-select select', 'EPSG:3857');
    const after = await page.evaluate(() =>
      window.editor.layers.getFeatures('parcels')[0]!.getGeometry()!.getExtent(),
    );
    after.forEach((v, i) => expect(Math.abs(v - before[i]!)).toBeLessThan(1e-6));
    // The bbox-loaded WFS layer reloaded in the new projection.
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.get('lamps').featureCount))
      .toBe(3);
  });

  test('adds a loader layer and a basemap at runtime', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await page.locator('olcad-menu[label="Commands"] .olcad-menu__button').click();
    await page.click('#add-loader-layer');
    await openFlyout(page, 'layers');
    await expect(page.locator('olcad-layer-list [data-layer-id="points"]')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.get('points').featureCount))
      .toBe(1);

    await page.evaluate(() =>
      window.editor.basemaps.add({
        id: 'extra',
        type: 'xyz',
        url: 'https://tile.example/{z}/{x}/{y}.png',
        visible: true,
      }),
    );
    await expect(page.locator('olcad-layer-list [role="radio"]')).toHaveCount(8);
    expect(await page.evaluate(() => window.editor.basemaps.getActive())).toBe('extra');
    await page.evaluate(() => window.editor.basemaps.remove('extra'));
    // Removing the active basemap falls back to the first configured one.
    expect(await page.evaluate(() => window.editor.basemaps.getActive())).toBe('osm');
  });

  test('WFS emulation reprojects and filters', async ({ request }) => {
    const bad = await request.get('/wfs?typeName=nope&outputFormat=application/json');
    expect(bad.status()).toBe(400);
    const utm = await (
      await request.get(
        '/wfs?service=WFS&request=GetFeature&typeName=lamps&srsName=EPSG:25832&outputFormat=application/json',
      )
    ).json();
    expect(utm.features).toHaveLength(3);
    expect(utm.features[0].geometry.coordinates[0]).toBeGreaterThan(400_000);
    const none = await (
      await request.get(
        '/wfs?typeName=lamps&srsName=EPSG:4326&outputFormat=application/json&bbox=0,0,1,1,EPSG:4326',
      )
    ).json();
    expect(none.features).toHaveLength(0);
  });
});
