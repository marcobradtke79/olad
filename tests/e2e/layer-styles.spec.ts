import { expect, test, type Page } from '@playwright/test';
import type VectorLayer from 'ol/layer/Vector';

async function openStyles(page: Page): Promise<void> {
  const view = page.locator('olcad-menu[label="View"]');
  await view.locator('.olcad-menu__button').click();
  await view.locator('#layer-styles').click();
  await expect(page.locator('.olcad-layer-style-dialog__dialog')).toBeVisible();
}

/** The flat style, opacity, zIndex and zoom range of a layer's OpenLayers layer. */
const olLayer = (page: Page, id: string) =>
  page.evaluate((layerId) => {
    const layer = window.editor.map
      .getLayers()
      .getArray()
      .find((l) => l.get('olcad:layer') === layerId) as VectorLayer;
    const style = layer.getStyle();
    return {
      style: typeof style === 'function' ? 'function' : style,
      opacity: layer.getOpacity(),
      zIndex: layer.getZIndex(),
      minZoom: layer.getMinZoom(),
    };
  }, id);

test.describe('layer styles', () => {
  test('reorders and restyles layers live, keeps it across a reload and resets', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.editor));
    await openStyles(page);
    const dialog = page.locator('.olcad-layer-style-dialog__dialog');
    const row = (id: string) =>
      dialog.locator(`.olcad-layer-style-dialog__layer[data-layer-id="${id}"]`);

    // Roads to the top of the drawing order.
    const initial = await olLayer(page, 'parcels');
    const before = initial.zIndex!;
    expect((await olLayer(page, 'roads')).zIndex).toBe(before + 1);
    const ids = await page.evaluate(() => window.editor.layers.list().map((l) => l.id));
    for (let i = ids.indexOf('roads'); i < ids.length - 1; i++) {
      await row('roads').locator('[data-action="up"]').click();
    }
    await expect(dialog.locator('.olcad-layer-style-dialog__layer').first()).toHaveAttribute(
      'data-layer-id',
      'roads',
    );
    expect((await olLayer(page, 'roads')).zIndex).toBe(ids.length);

    // Parcels: stroke colour, fill opacity, a label and a minimum zoom.
    await row('parcels').locator('[data-action="select"]').click();
    await dialog.locator('[name="stroke-color"]').fill('#ff0000');
    await dialog.locator('[name="fill-opacity"]').fill('0.6');
    await dialog.locator('[name="label-field"]').selectOption('owner');
    await dialog.locator('[name="min-zoom"]').fill('12');
    await dialog.locator('[name="min-zoom"]').press('Tab');
    let parcels = await olLayer(page, 'parcels');
    expect(parcels.style).toMatchObject({
      'stroke-color': '#ff0000',
      'fill-color': 'rgba(245, 158, 11, 0.6)',
      'text-value': ['to-string', ['get', 'owner']],
    });
    expect(parcels.minZoom).toBe(12);
    await dialog.locator('[data-action="close"]').click();

    // Kept in this browser.
    await page.reload();
    await page.waitForFunction(() => Boolean(window.editor));
    parcels = await olLayer(page, 'parcels');
    expect(parcels.style).toMatchObject({ 'stroke-color': '#ff0000' });
    expect((await olLayer(page, 'roads')).zIndex).toBe(ids.length);
    expect(await page.evaluate(() => window.editor.layers.list().at(-1)!.id)).toBe('roads');

    // Reset all: configured styles and order again, also after a reload.
    await openStyles(page);
    await dialog.locator('[data-action="reset-all"]').click();
    parcels = await olLayer(page, 'parcels');
    expect(parcels.style).toMatchObject({ 'stroke-color': '#b45309' });
    expect(parcels.minZoom).toBe(initial.minZoom); // the configured zoom range
    expect((await olLayer(page, 'roads')).zIndex).toBe(before + 1);
    await page.reload();
    await page.waitForFunction(() => Boolean(window.editor));
    expect(await page.evaluate(() => window.editor.layers.exportStyles())).toEqual({
      version: 1,
      order: [],
      styles: {},
    });
    expect(errors).toEqual([]);
  });
});
