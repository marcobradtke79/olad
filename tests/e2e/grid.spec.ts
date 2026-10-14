import { expect, test, type Page } from '@playwright/test';
import { insertInto } from './flyout';
import type LineString from 'ol/geom/LineString';
import type Point from 'ol/geom/Point';

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.editor));
}

async function waitForLayer(page: Page, id: string, count: number): Promise<void> {
  await expect
    .poll(() => page.evaluate((layer) => window.editor.layers.get(layer).featureCount, id))
    .toBe(count);
}

const lastHydrant = (page: Page) =>
  page.evaluate(() => {
    const features = window.editor.layers.getFeatures('hydrants');
    return (features[features.length - 1]!.getGeometry() as Point).getCoordinates();
  });

test.describe('grid snap', () => {
  test.afterEach(async ({ request }) => {
    await request.post('/reset');
  });

  test('placed points land on grid intersections; geometry snaps win', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await waitForLayer(page, 'hydrants', 2);
    const toggle = page.locator('olcad-grid-settings .olcad-grid-settings__toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false'); // off in the test config
    await expect(page.locator('.olcad-grid-settings__unit')).toHaveText('m');
    await insertInto(page, 'Hydrants'); // edit mode + draw
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await page.locator('.olcad-grid-settings__spacing').fill('50');
    await page.locator('.olcad-grid-settings__spacing').press('Enter');
    expect(await page.evaluate(() => window.editor.grid.getSpacing())).toBe(50);

    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    const marker = page.locator('.olcad-crosshair__snap');
    // Anywhere away from geometry: the cursor sits on a grid intersection.
    const x = viewport.x + viewport.width * 0.3;
    const y = viewport.y + viewport.height * 0.7;
    await page.mouse.move(x, y, { steps: 3 });
    await expect(marker).toBeVisible();
    await expect(marker).toHaveAttribute('data-mode', 'grid');
    await page.mouse.click(x, y);
    await waitForLayer(page, 'hydrants', 3);
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();
    const placed = await lastHydrant(page);
    const offGrid = (v: number) => Math.abs(v - Math.round(v / 50) * 50);
    expect(offGrid(placed[0]!)).toBeLessThan(1e-6);
    expect(offGrid(placed[1]!)).toBeLessThan(1e-6);

    // Next to a road vertex the geometry snap wins over the grid.
    const vertexPx = await page.evaluate(() => {
      const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
      const [a] = (road.getGeometry() as LineString).getCoordinates();
      return window.editor.map.getPixelFromCoordinate(a!);
    });
    await page.mouse.move(viewport.x + vertexPx[0]! + 6, viewport.y + vertexPx[1]! + 4, {
      steps: 3,
    });
    await expect(marker).toHaveAttribute('data-mode', 'vertex');

    // Grid snap off: away from geometry (including the hydrant just placed) nothing snaps.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    const free = await page.evaluate(
      ([px, py]) => {
        // First pixel on a short walk from the start that has no geometry snap within the radius.
        for (let i = 1; i < 10; i++) {
          const pixel = [px! + 25 * i, py! + 15 * i];
          if (!window.editor.snapping.snap(window.editor.map.getCoordinateFromPixel(pixel))) {
            return pixel;
          }
        }
        throw new Error('no free spot');
      },
      [x - viewport.x, y - viewport.y],
    );
    await page.mouse.move(viewport.x + free[0]!, viewport.y + free[1]!, { steps: 3 });
    await expect(marker).toBeHidden();
  });

  test('the grid API and event work headless', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    const result = await page.evaluate(() => {
      const events: unknown[] = [];
      window.editor.on('gridchange', (e) => events.push(e));
      window.editor.grid.setEnabled(true);
      window.editor.grid.setSpacing(25);
      window.editor.grid.setOrigin([5, 5]);
      window.editor.grid.setVisible(false);
      const hit = window.editor.snapping.snap([1012, 2003]);
      let rejected = false;
      try {
        window.editor.grid.setSpacing(0);
      } catch {
        rejected = true;
      }
      return { hit, events, rejected, visible: window.editor.grid.isVisible() };
    });
    expect(result.hit).toMatchObject({ coordinate: [1005, 2005], mode: 'grid' });
    expect(result.rejected).toBe(true);
    expect(result.visible).toBe(false);
    expect(result.events).toEqual([
      { enabled: true, spacing: 5, origin: [0, 0], visible: true },
      { enabled: true, spacing: 25, origin: [0, 0], visible: true },
      { enabled: true, spacing: 25, origin: [5, 5], visible: true },
      { enabled: true, spacing: 25, origin: [5, 5], visible: false },
    ]);
  });

  test('the Show checkbox follows the editor', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    const show = page.locator('.olcad-grid-settings__show input');
    await expect(show).toBeChecked();
    await show.uncheck();
    expect(await page.evaluate(() => window.editor.grid.isVisible())).toBe(false);
    await page.evaluate(() => window.editor.grid.setVisible(true));
    await expect(show).toBeChecked();
  });
});
