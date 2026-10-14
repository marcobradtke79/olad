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

const lastRoad = (page: Page) =>
  page.evaluate(() => {
    const roads = window.editor.layers.getFeatures('roads');
    return (roads[roads.length - 1]!.getGeometry() as LineString).getCoordinates();
  });

async function type(page: Page, text: string): Promise<void> {
  const input = page.locator('olcad-input-bar .olcad-input-bar__input');
  await input.fill(text);
  await input.press('Enter');
}

test.describe('numeric input', () => {
  test.afterEach(async ({ request }) => {
    await request.post('/reset');
  });

  test('typed points build a line with projection-aware offsets', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    const output = page.locator('olcad-input-bar .olcad-input-bar__output');
    await expect(output).toHaveText(/Switch on edit mode/);
    // Relative input without a drawing: an error, the text is kept.
    await insertInto(page, 'Roads');
    await expect(output).toHaveText(/type a point/);
    await type(page, '@10,10');
    await expect(output).toHaveText(/No previous point/);
    await expect(page.locator('olcad-input-bar .olcad-input-bar__input')).toHaveValue('@10,10');

    const x0 = 935000;
    const y0 = 6270000;
    await type(page, `${x0},${y0}`);
    await expect(output).toHaveText(/→ 935000\.00, 6270000\.00/);
    await type(page, '@100,0');
    await type(page, '@50<90');
    await page.keyboard.press('Enter'); // the input is empty: finishes the drawing
    await waitForLayer(page, 'roads', 3);
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();
    const coords = await lastRoad(page);
    const scale = await page.evaluate(
      ([x, y]) => window.olcad.unitsPerMetre('EPSG:3857', [x!, y!]),
      [x0, y0],
    );
    expect(coords).toHaveLength(3);
    expect(coords[0]).toEqual([x0, y0]);
    expect(coords[1]![0]).toBeCloseTo(x0 + 100 * scale, 6);
    expect(coords[1]![1]).toBeCloseTo(y0, 6);
    expect(coords[2]![0]).toBeCloseTo(coords[1]![0]!, 6);
    expect(coords[2]![1]).toBeGreaterThan(y0 + 50 * scale * 0.999);
    expect(coords[2]![1]).toBeLessThan(y0 + 50 * scale * 1.001);
    // 100 m east at this latitude is more than 100 map units (Mercator scale).
    expect(scale).toBeGreaterThan(1.4);
    expect(scale).toBeLessThan(1.6);
  });

  test('polar angles follow the straightedge; a plain length follows the pointer', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await insertInto(page, 'Roads');
    await page.locator('olcad-snap-settings .olcad-snap-settings__toggle').click(); // snapping off
    await page.evaluate(() => window.editor.straightedge.setAngle(30));
    await type(page, '935000,6270000');
    await type(page, '@100<0');
    await page.keyboard.press('Enter');
    await waitForLayer(page, 'roads', 3);
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();
    let coords = await lastRoad(page);
    let angle =
      (Math.atan2(coords[1]![1]! - coords[0]![1]!, coords[1]![0]! - coords[0]![0]!) * 180) /
      Math.PI;
    expect(angle).toBeCloseTo(30, 6);

    // Direct distance entry: the pointer sits south-west of the first vertex.
    await page.evaluate(() => window.editor.straightedge.setAngle(0));
    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    const start = { x: viewport.x + viewport.width * 0.5, y: viewport.y + viewport.height * 0.4 };
    await page.mouse.click(start.x, start.y);
    await page.mouse.move(start.x - 60, start.y + 60, { steps: 3 });
    await type(page, '75');
    await page.keyboard.press('Enter');
    await waitForLayer(page, 'roads', 4);
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();
    coords = await lastRoad(page);
    angle =
      (Math.atan2(coords[1]![1]! - coords[0]![1]!, coords[1]![0]! - coords[0]![0]!) * 180) /
      Math.PI;
    expect(angle).toBeCloseTo(-135, 4);
    const metres = await page.evaluate(
      ([a, b]) => window.olcad.distanceMetres('EPSG:3857', a!, b!),
      coords,
    );
    expect(metres).toBeCloseTo(75, 2);
  });

  test('the projection select switches the view projection', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    const select = page.locator('olcad-projection-select select');
    await expect(select).toHaveValue('EPSG:3857');
    await expect(select.locator('option')).toHaveText([
      'EPSG:3857 (Web Mercator)',
      'EPSG:4326 (WGS 84)',
      'EPSG:25832 (UTM 32N)',
    ]);
    await select.selectOption('EPSG:25832');
    await expect.poll(() => page.evaluate(() => window.editor.getProjection())).toBe('EPSG:25832');
    await expect(page.locator('olcad-input-bar .olcad-input-bar__output')).toHaveText(
      'Projection: EPSG:25832',
    );
    await page.evaluate(() => window.editor.setProjection('EPSG:4326'));
    await expect(select).toHaveValue('EPSG:4326');
  });
});
