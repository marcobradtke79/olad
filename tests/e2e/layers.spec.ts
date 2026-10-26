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
    await expect(rows).toHaveCount(14); // the configured, discovered and draft layers

    const expected: Record<string, number> = {
      parcels: 2,
      roads: 2,
      hydrants: 2,
      tracks: 1,
      buildings: 1,
      'survey-points': 1,
      trees: 3,
      lamps: 3,
      'points-wfs': 0, // hidden at start: loads once shown
      labels: 2,
      dimensions: 4,
      draft: 0,
      'test:lamps': 0, // discovered, hidden at start
      'test:points': 0,
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
    await expect(enabled).toHaveCount(9); // all but the read-only tracks, trees and points
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
      .toBe(45); // the seed points file

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

  test('pages a WFS 2.0.0 layer and marks failed loads until a load succeeds', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/wfs?')) requests.push(r.url());
    });
    await page.goto('/');
    await waitForEditor(page);
    // Hidden at start (its 45 points would sit under the other specs' clicks): show it to load.
    await page.evaluate(() => window.editor.layers.setVisible('points-wfs', true));
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.get('points-wfs').featureCount))
      .toBe(45);
    const pages = requests.filter((u) => /typeNames=points/.test(u)).map((u) => new URL(u));
    expect(pages.map((u) => u.searchParams.get('startIndex'))).toEqual(['0', '20', '40']);
    expect(pages.every((u) => u.searchParams.get('count') === '20')).toBe(true);
    expect(pages.every((u) => u.searchParams.get('sortBy') === 'id')).toBe(true);
    expect(requests.some((u) => /typeName=lamps/.test(u) && /maxFeatures=500/.test(u))).toBe(true);
    expect(await page.evaluate(() => window.editor.layers.get('points-wfs'))).toMatchObject({
      loading: false,
      error: null,
    });

    // A source whose first request fails: the row carries the message until a load succeeds.
    await page.evaluate(() =>
      window.editor.layers.add({
        id: 'flaky',
        title: 'Flaky',
        geometryType: 'Point',
        source: {
          format: 'wfs',
          url: `/wfs?failonce=${Date.now()}`,
          typeName: 'lamps',
          outputFormat: 'application/json',
          strategy: 'bbox',
        },
      }),
    );
    await openFlyout(page, 'layers');
    const marker = page.locator('[data-layer-id="flaky"] .olcad-layer-list__error');
    await expect(marker).toBeVisible();
    await expect(marker).toHaveAttribute('data-tooltip', /503 Service Unavailable/);
    expect(await page.evaluate(() => window.editor.layers.get('flaky').error)).toMatch(/503/);
    // Panning requests a new extent; that load succeeds and clears the error.
    await page.evaluate(() => {
      const view = window.editor.map.getView();
      const [x, y] = view.getCenter()!;
      view.setCenter([x! + 2000, y!]);
    });
    await expect(marker).toHaveCount(0);
    expect(await page.evaluate(() => window.editor.layers.get('flaky').error)).toBeNull();
  });

  test('WFS emulation reprojects and filters', async ({ request }) => {
    const unauthorized = await request.get(
      '/wfs?auth=1&typeName=lamps&outputFormat=application/json',
    );
    expect(unauthorized.status()).toBe(401);
    const authorized = await request.get(
      '/wfs?auth=1&typeName=lamps&outputFormat=application/json',
      {
        headers: { Authorization: 'Bearer test' },
      },
    );
    expect(authorized.status()).toBe(200);
    const paged = await (
      await request.get(
        '/wfs?typeNames=points&version=2.0.0&outputFormat=application/json&count=20&startIndex=40',
      )
    ).json();
    expect(paged.numberMatched).toBe(45);
    expect(paged.numberReturned).toBe(5);
    expect(paged.features).toHaveLength(5);
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

test.describe('layer groups', () => {
  test('a group row lists its members and switches them on and off together', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await openFlyout(page, 'layers');
    const groups = await page.evaluate(() => window.editor.groups.list());
    expect(groups).toEqual([
      {
        id: 'infrastructure',
        title: 'Infrastructure',
        collapsed: false,
        layers: ['roads', 'hydrants', 'lamps'],
        overlays: ['roads-wms'],
      },
      // Implicit groups of the discovered entries, overlays first (drawing order).
      {
        id: 'Test',
        title: 'Test',
        collapsed: false,
        layers: [],
        overlays: ['test:parcels', 'test:roads'],
      },
      {
        id: 'Discovered',
        title: 'Discovered',
        collapsed: false,
        layers: ['test:lamps', 'test:points'],
        overlays: [],
      },
    ]);
    const head = page.locator(
      'olcad-layer-list .olcad-layer-list__group-row[data-section="layers"][data-group-id="infrastructure"]',
    );
    await expect(head.locator('.olcad-layer-list__title')).toHaveText('Infrastructure');
    const members = head.locator('+ .olcad-layer-list__group-members');
    await expect(members.locator('[data-layer-id]')).toHaveCount(3);
    // roads-wms starts hidden, so the group is mixed.
    const eye = head.locator('[data-action="group-visible"]');
    await expect(eye).toHaveAttribute('aria-pressed', 'mixed');
    await eye.click();
    await expect(eye).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.editor.overlays.get('roads-wms').visible)).toBe(true);
    await eye.click();
    await expect(eye).toHaveAttribute('aria-pressed', 'false');
    expect(
      await page.evaluate(() =>
        ['roads', 'hydrants', 'lamps'].map((id) => window.editor.layers.get(id).visible),
      ),
    ).toEqual([false, false, false]);
    expect(await page.evaluate(() => window.editor.layers.get('parcels').visible)).toBe(true);
    // The disclosure button hides the members.
    await head.locator('[data-action="group-toggle"]').click();
    await expect(members).toBeHidden();
  });
});
