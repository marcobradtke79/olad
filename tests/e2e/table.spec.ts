import { expect, test } from '@playwright/test';
import { openFlyout } from './flyout';

test.describe('feature table', () => {
  test('the layer list opens a layer as a table above the command line', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.editor));
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.get('parcels').featureCount))
      .toBe(2);

    const panel = page.locator('olcad-panel[name="table"]');
    await expect(panel).toBeHidden();
    await openFlyout(page, 'layers');
    const button = page.locator('olcad-layer-list [data-layer-id="parcels"] [data-action="table"]');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(panel).toBeVisible();
    const rows = page.locator('olcad-feature-table tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(page.locator('.olcad-feature-table__title')).toHaveText('Parcels');

    // Its own row in the bottom zone, above the command line.
    const table = (await panel.boundingBox())!;
    const input = (await page.locator('olcad-input-bar').boundingBox())!;
    expect(table.y + table.height).toBeLessThanOrEqual(input.y + 1);

    // A row click selects the object on the map.
    await rows.first().click();
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(1);
    await expect(rows.first()).toHaveAttribute('aria-selected', 'true');

    await page.locator('.olcad-feature-table__close').click();
    await expect(panel).toBeHidden();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(errors).toEqual([]);
  });
});
