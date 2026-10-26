import { expect, test, type Page } from '@playwright/test';
import { openFlyout } from './flyout';

async function openStyles(page: Page): Promise<void> {
  const view = page.locator('olcad-menu[label="View"]');
  await view.locator('.olcad-menu__button').click();
  await view.locator('#layer-styles').click();
  await expect(page.locator('.olcad-layer-style-dialog__dialog')).toBeVisible();
}

/** Visibility, opacity, zIndex and zoom range of an overlay's OpenLayers layer. */
const overlayLayer = (page: Page, id: string) =>
  page.evaluate((overlayId) => {
    const layer = window.editor.map
      .getLayers()
      .getArray()
      .find((l) => l.get('olcad:overlay') === overlayId)!;
    return {
      visible: layer.getVisible(),
      opacity: layer.getOpacity(),
      zIndex: layer.getZIndex(),
      minZoom: layer.getMinZoom(),
    };
  }, id);

const CONFIGURED = [
  'parcels-wms',
  'roads-wms',
  'hatch-xyz',
  'topplus-overlay',
  'versatiles-overlay',
  's2-overlay',
];
/** Overlays the test configuration's `discover` adds from the WMS (after the configured ones). */
const DISCOVERED = ['test:parcels', 'test:roads'];

test.describe('overlays', () => {
  test('lists the configured overlays, switches, dims and reorders them', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.editor));
    expect(
      await page.evaluate(() =>
        window.editor.overlays.list().map((o) => [o.id, o.visible, o.opacity]),
      ),
    ).toEqual([
      ['parcels-wms', true, 0.7],
      ['roads-wms', false, 1],
      ['hatch-xyz', false, 0.5],
      ['topplus-overlay', false, 1],
      ['versatiles-overlay', false, 1],
      ['s2-overlay', false, 1],
      ['test:parcels', false, 0.8],
      ['test:roads', false, 0.8],
    ]);
    // Drawn above the basemaps and below every vector layer, in one shared order.
    const order = await page.evaluate(() => window.editor.layers.getOrder());
    expect(order.slice(0, CONFIGURED.length)).toEqual(CONFIGURED);
    const overlayCount = CONFIGURED.length + DISCOVERED.length;
    expect(order.slice(CONFIGURED.length, overlayCount)).toEqual(DISCOVERED);
    expect(order.slice(overlayCount)).toEqual(
      await page.evaluate(() => window.editor.layers.list().map((l) => l.id)),
    );
    expect((await overlayLayer(page, 'parcels-wms')).zIndex).toBe(1);
    // Never a hit target: no overlay carries the editor layer property.
    expect(
      await page.evaluate(() =>
        window.editor.map
          .getLayers()
          .getArray()
          .filter((l) => l.get('olcad:overlay'))
          .every((l) => l.get('olcad:layer') === undefined),
      ),
    ).toBe(true);

    await openFlyout(page, 'layers');
    await expect(page.locator('olcad-layer-list [data-overlay-id]')).toHaveCount(8);
    await expect(page.locator('olcad-layer-list [data-layer-id]')).toHaveCount(14);

    // Switching the hidden single-image WMS on sends a GetMap to the test server.
    const getMap = page.waitForRequest(
      (r) => /\/wms\?.*REQUEST=GetMap/i.test(r.url()) && /test(%3A|:)roads/.test(r.url()),
    );
    await page.locator('[data-overlay-id="roads-wms"] [data-action="visible"]').click();
    await getMap;
    const roads = await overlayLayer(page, 'roads-wms');
    expect(roads.visible).toBe(true);
    expect(roads.minZoom).toBe(10);

    // Details: zoom range, the legend from the service and the opacity slider.
    await page.locator('[data-overlay-id="parcels-wms"] [data-action="info"]').click();
    const details = page.locator('[data-overlay-id="parcels-wms"] .olcad-layer-list__details');
    await expect(details).toBeVisible();
    await expect(details.locator('[data-detail="zoom"] dd')).toHaveText('any');
    const legend = details.locator('.olcad-layer-list__legend');
    await expect(legend).toHaveAttribute('src', /GetLegendGraphic/);
    const legendResponse = await page.request.get((await legend.getAttribute('src'))!);
    expect(legendResponse.headers()['content-type']).toBe('image/png');
    await details.locator('[data-action="opacity"]').evaluate((el) => {
      (el as HTMLInputElement).value = '0.4';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect((await overlayLayer(page, 'parcels-wms')).opacity).toBeCloseTo(0.4);
    await expect(details.locator('output')).toHaveText('40 %');

    // The style dialog lists the overlays in the shared order with the Layer section only.
    await openStyles(page);
    const dialog = page.locator('.olcad-layer-style-dialog__dialog');
    const items = dialog.locator('.olcad-layer-style-dialog__layer');
    await expect(items).toHaveCount(order.length);
    await expect(items.last()).toHaveAttribute('data-layer-id', 'parcels-wms');
    await expect(items.last()).toHaveAttribute('data-kind', 'overlay');
    await dialog.locator('[data-layer-id="parcels-wms"] [data-action="select"]').click();
    await expect(dialog.locator('legend')).toHaveText(['Layer']);
    await expect(dialog.locator('[name="opacity"]')).toHaveValue('0.4');
    // Move the parcels WMS right above the parcels layer.
    await page.evaluate(
      (index) => window.editor.layers.moveLayer('parcels-wms', index),
      order.indexOf('parcels'),
    );
    const positions = () =>
      page.evaluate(() => {
        const current = window.editor.layers.getOrder();
        return current.indexOf('parcels-wms') - current.indexOf('parcels');
      });
    expect(await positions()).toBe(1);
    const parcelsZ = await page.evaluate(() =>
      window.editor.map
        .getLayers()
        .getArray()
        .find((l) => l.get('olcad:layer') === 'parcels')!
        .getZIndex()!,
    );
    expect((await overlayLayer(page, 'parcels-wms')).zIndex).toBe(parcelsZ + 1);
    await expect(items.first()).not.toHaveAttribute('data-layer-id', 'parcels-wms');
    await dialog.locator('[data-action="close"]').click();

    // Kept across a reload (persistLayerStyles); Reset all returns to the configured state.
    await page.reload();
    await page.waitForFunction(() => Boolean(window.editor));
    expect(await positions()).toBe(1);
    expect((await overlayLayer(page, 'parcels-wms')).opacity).toBeCloseTo(0.4);
    await openStyles(page);
    await dialog.locator('[data-action="reset-all"]').click();
    expect(await page.evaluate(() => window.editor.layers.getOrder())).toEqual(order);
    expect((await overlayLayer(page, 'parcels-wms')).opacity).toBeCloseTo(0.7);
    expect(errors).toEqual([]);
  });

  test('adds and removes overlays through the API with events', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.editor));
    const result = await page.evaluate(() => {
      const events: string[] = [];
      window.editor.on('overlaychange', (e) => events.push(`${e.type}:${e.id}`));
      window.editor.overlays.add({
        id: 'extra',
        type: 'wms',
        title: 'Extra',
        url: '/wms',
        params: { LAYERS: 'test:hillshade', TRANSPARENT: true },
      });
      const position = window.editor.layers.getOrder().indexOf('extra');
      window.editor.overlays.setOpacity('extra', 0.2);
      const opacity = window.editor.overlays.get('extra').opacity;
      window.editor.overlays.remove('extra');
      return {
        events,
        position,
        opacity,
        listed: window.editor.overlays.list().some((o) => o.id === 'extra'),
        inConfig: window.editor.config.overlays.some((o) => o.id === 'extra'),
      };
    });
    expect(result.events).toEqual(['add:extra', 'style:extra', 'remove:extra']);
    // above the overlays, below the layers
    expect(result.position).toBe(CONFIGURED.length + DISCOVERED.length);
    expect(result.opacity).toBe(0.2);
    expect(result.listed).toBe(false);
    expect(result.inConfig).toBe(false);
  });
});
