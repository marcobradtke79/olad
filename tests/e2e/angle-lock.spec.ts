import { expect, test, type Page } from '@playwright/test';
import { insertInto } from './flyout';
import type LineString from 'ol/geom/LineString';

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.editor));
}

async function waitForLayer(page: Page, id: string, count: number): Promise<void> {
  await expect
    .poll(() => page.evaluate((layer) => window.editor.layers.get(layer).featureCount, id))
    .toBe(count);
}

/** Direction of the last drawn road in degrees, counter-clockwise from +x, in [0, 360). */
const lastRoadAngle = (page: Page) =>
  page.evaluate(() => {
    const roads = window.editor.layers.getFeatures('roads');
    const [p, q] = (roads[roads.length - 1]!.getGeometry() as LineString).getCoordinates();
    const deg = (Math.atan2(q![1]! - p![1]!, q![0]! - p![0]!) * 180) / Math.PI;
    return ((deg % 360) + 360) % 360;
  });

test.describe('angle lock', () => {
  test.afterEach(async ({ request }) => {
    await request.post('/reset');
  });

  test('locks drawn segments to the step from the straightedge angle', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    const toggle = page.locator('olcad-angle-lock .olcad-angle-lock__toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false'); // off in the test config
    await insertInto(page, 'Roads'); // edit mode + draw
    await page.locator('olcad-snap-settings .olcad-snap-settings__toggle').click(); // snapping off
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.editor.constraints.getAngleStep())).toBe(90);

    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    const start = { x: viewport.x + viewport.width * 0.3, y: viewport.y + viewport.height * 0.6 };
    // 80 px right and 30 px up: with step 90 the segment is exactly horizontal.
    await page.mouse.click(start.x, start.y);
    await page.mouse.move(start.x + 80, start.y - 30, { steps: 4 });
    await page.mouse.click(start.x + 80, start.y - 30);
    await page.keyboard.press('Enter');
    await waitForLayer(page, 'roads', 3);
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();
    expect(await lastRoadAngle(page)).toBeCloseTo(0, 6);

    // Rotated straightedge: the same pointer path yields 30° (nearest of 30, 120, 210, 300).
    await page.evaluate(() => window.editor.straightedge.setAngle(30));
    await page.mouse.click(start.x, start.y);
    await page.mouse.move(start.x + 80, start.y - 30, { steps: 4 });
    await page.mouse.click(start.x + 80, start.y - 30);
    await page.keyboard.press('Enter');
    await waitForLayer(page, 'roads', 4);
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();
    expect(await lastRoadAngle(page)).toBeCloseTo(30, 6);

    // Preset 45: 80 right, 50 up (~32°) on a 0° straightedge rounds to 45 with step 45.
    await page.evaluate(() => window.editor.straightedge.setAngle(0));
    await page.locator('.olcad-angle-lock__preset[data-step="45"]').click();
    expect(await page.evaluate(() => window.editor.constraints.getAngleStep())).toBe(45);
    await page.mouse.click(start.x, start.y);
    await page.mouse.move(start.x + 80, start.y - 50, { steps: 4 });
    await page.mouse.click(start.x + 80, start.y - 50);
    await page.keyboard.press('Enter');
    await waitForLayer(page, 'roads', 5);
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();
    expect(await lastRoadAngle(page)).toBeCloseTo(45, 6);
    await page.locator('.olcad-angle-lock__step').fill('30');
    await page.locator('.olcad-angle-lock__step').press('Enter');
    expect(await page.evaluate(() => window.editor.constraints.getAngleStep())).toBe(30);
  });

  test('a geometry snap wins over the lock', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await insertInto(page, 'Roads');
    await page.evaluate(() => window.editor.constraints.setAngleLocked(true));
    const road = await page.evaluate(() => {
      const main = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
      const [a] = (main.getGeometry() as LineString).getCoordinates();
      return { a: a!, aPx: window.editor.map.getPixelFromCoordinate(a!) };
    });
    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    // Start 70 px below and 40 px left of the vertex, then approach the vertex 5 px off.
    const start = { x: viewport.x + road.aPx[0]! - 40, y: viewport.y + road.aPx[1]! + 70 };
    await page.mouse.click(start.x, start.y);
    await page.mouse.move(viewport.x + road.aPx[0]! + 5, viewport.y + road.aPx[1]! + 3, {
      steps: 4,
    });
    const marker = page.locator('.olcad-crosshair__snap');
    await expect(marker).toHaveAttribute('data-mode', 'vertex');
    await page.mouse.click(viewport.x + road.aPx[0]! + 5, viewport.y + road.aPx[1]! + 3);
    await page.keyboard.press('Enter');
    await waitForLayer(page, 'roads', 3);
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();
    const end = await page.evaluate(() => {
      const roads = window.editor.layers.getFeatures('roads');
      const coords = (roads[roads.length - 1]!.getGeometry() as LineString).getCoordinates();
      return coords[coords.length - 1]!;
    });
    expect(end[0]).toBeCloseTo(road.a[0]!, 6);
    expect(end[1]).toBeCloseTo(road.a[1]!, 6);
  });

  test('the constraints API and event work headless', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    const result = await page.evaluate(() => {
      const events: unknown[] = [];
      window.editor.on('constraintschange', (e) => events.push(e));
      window.editor.constraints.setAngleLocked(true);
      window.editor.constraints.setAngleStep(45);
      let rejected = false;
      try {
        window.editor.constraints.setAngleStep(0);
      } catch {
        rejected = true;
      }
      return { events, rejected };
    });
    expect(result.rejected).toBe(true);
    expect(result.events).toEqual([
      { angle: { enabled: true, step: 90 } },
      { angle: { enabled: true, step: 45 } },
    ]);
  });
});
