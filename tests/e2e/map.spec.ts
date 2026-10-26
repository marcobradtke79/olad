import { expect, test } from '@playwright/test';
import { openFlyout } from './flyout';
import type * as olcadModule from '../../src/index';
import type { Editor } from '../../src';

test.describe('test page', () => {
  test('renders the map and the configured basemaps', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#map canvas')).toBeVisible();
    const items = page.locator('olcad-layer-list [role="radio"]');
    await expect(items).toHaveCount(7);
    // The dark vector-tile basemap is the visible one; OpenStreetMap stays first in the list.
    await expect(items.nth(0)).toHaveText('OpenStreetMap');
    await expect(items.nth(0)).toHaveAttribute('aria-checked', 'false');
    await expect(items.nth(1)).toHaveText('VersaTiles dark (vector tiles)');
    await expect(items.nth(1)).toHaveAttribute('aria-checked', 'true');
    expect(await page.evaluate(() => window.editor.basemaps.getActive())).toBe('versatiles-dark');
  });

  test('switches the basemap through the UI and the API', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.editor));
    await openFlyout(page, 'layers');
    const items = page.locator('olcad-layer-list [role="radio"]');
    await items.nth(2).click();
    await expect(items.nth(2)).toHaveAttribute('aria-checked', 'true');
    await expect(items.nth(1)).toHaveAttribute('aria-checked', 'false');
    expect(await page.evaluate(() => window.editor.basemaps.getActive())).toBe('opentopomap');

    await page.evaluate(() => window.editor.basemaps.setActive('osm'));
    await expect(items.nth(0)).toHaveAttribute('aria-checked', 'true');
  });

  test('fits the initial view to the configured extent and zooms to layers', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.editor));
    const view = () =>
      page.evaluate(() => {
        const v = window.editor.map.getView();
        return { center: v.getCenter()!, zoom: v.getZoom()! };
      });
    // view.fit: the lon/lat extent around the configured centre, capped at zoom 16.
    const initial = await view();
    let center = initial.center;
    expect(initial.zoom).toBeCloseTo(16, 5);
    expect(center[0]).toBeCloseTo(935100, -1);
    expect(center[1]).toBeCloseTo(6276400, -1);
    // Configured extents are known at once (survey-points in EPSG:25832), loaded ones after load.
    expect(
      await page.evaluate(() => window.editor.layers.getExtent('survey-points')),
    ).not.toBeNull();
    expect(await page.evaluate(() => window.editor.layers.getExtent('draft'))).toBeNull();
    expect(await page.evaluate(() => window.editor.layers.fit('draft'))).toBe(false);
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.getExtent('roads') !== null))
      .toBe(true);
    // editor.fit with an extent in another projection moves the view.
    expect(
      await page.evaluate(() =>
        window.editor.fit({ extent: [8.39, 49.0, 8.41, 49.02], projection: 'EPSG:4326' }),
      ),
    ).toBe(true);
    ({ center } = await view());
    expect(center[0]).toBeCloseTo(935084, -1);
    expect(center[1]).toBeCloseTo(6276558.5, -1);
    // Zoom to layer through the API and the layer list button.
    expect(await page.evaluate(() => window.editor.layers.fit('survey-points'))).toBe(true);
    const survey = await page.evaluate(() => window.editor.layers.getExtent('survey-points')!);
    ({ center } = await view());
    expect(center[0]).toBeCloseTo((survey[0]! + survey[2]!) / 2, 0);
    expect(center[1]).toBeCloseTo((survey[1]! + survey[3]!) / 2, 0);
    await openFlyout(page, 'layers');
    await page.locator('[data-layer-id="parcels"] [data-action="info"]').click();
    await page.locator('[data-layer-id="parcels"] [data-action="zoom"]').click();
    const parcels = await page.evaluate(() => window.editor.layers.getExtent('parcels')!);
    ({ center } = await view());
    expect(center[0]).toBeCloseTo((parcels[0]! + parcels[2]!) / 2, 0);
    expect(await page.evaluate(() => window.editor.overlays.fit('parcels-wms'))).toBe(true);
    expect(await page.evaluate(() => window.editor.fit({ layers: true }))).toBe(true);
  });

  test('server answers config, data, log and reset', async ({ request }) => {
    const config = await (await request.get('/config')).json();
    expect(config.basemaps).toHaveLength(7);
    const parcels = await (await request.get('/data/parcels')).json();
    expect(parcels.features).toHaveLength(2);
    const failed = await request.post('/changes?fail=1', {
      data: { version: 1, crs: 'EPSG:4326', changes: [] },
    });
    expect(failed.status()).toBe(500);
    const ok = await request.post('/changes', {
      data: {
        version: 1,
        crs: 'EPSG:4326',
        changes: [
          {
            op: 'insert',
            layer: 'parcels',
            crs: 'EPSG:4326',
            tempId: 'tmp-1',
            geometry: { type: 'Point', coordinates: [0, 0] },
          },
          { op: 'delete', layer: 'roads', crs: 'EPSG:4326', id: 815 },
        ],
      },
    });
    const { idMap } = (await ok.json()) as { idMap: Record<string, number> };
    expect(Object.keys(idMap)).toEqual(['tmp-1']);
    expect(idMap['tmp-1']).toBeGreaterThanOrEqual(10_000);
    expect((await (await request.get('/changes/log')).json()).length).toBe(1);
    await request.post('/reset');
    expect((await (await request.get('/changes/log')).json()).length).toBe(0);
    expect((await (await request.get('/data/roads')).json()).features).toHaveLength(2);
  });
});

declare global {
  interface Window {
    editor: Editor;
    /** The UMD global of the test page. */
    olcad: typeof olcadModule;
  }
}
