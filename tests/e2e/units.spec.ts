import { expect, test, type Page } from '@playwright/test';
import type LineString from 'ol/geom/LineString';
import { insertInto } from './flyout';

async function type(page: Page, text: string): Promise<void> {
  const input = page.locator('olcad-input-bar .olcad-input-bar__input');
  await input.fill(text);
  await input.press('Enter');
}

const lastRoad = (page: Page) =>
  page.evaluate(() => {
    const roads = window.editor.layers.getFeatures('roads');
    return (roads[roads.length - 1]!.getGeometry() as LineString).getCoordinates();
  });

test.describe('length units', () => {
  test.afterEach(async ({ request }) => {
    await request.post('/reset');
  });

  test('typed lengths take explicit units, else the default unit; displays follow it', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.editor));
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.get('roads').featureCount))
      .toBe(2);
    // A metric, true-to-scale CRS: map units are metres, so offsets can be checked exactly.
    await page.evaluate(() => window.editor.setProjection('EPSG:25832'));
    expect(await page.evaluate(() => window.editor.units.getLength())).toBe('m');
    const unitSelect = page.locator('olcad-unit-select select');
    await expect(unitSelect).toHaveValue('auto');
    await expect(unitSelect.locator('option').first()).toHaveText('Auto (m)');

    const output = page.locator('olcad-input-bar .olcad-input-bar__output');
    await insertInto(page, 'Roads');
    await type(page, '460000,5430000');
    await type(page, '@10ft,0'); // explicit unit
    await type(page, '@0,2'); // default unit: metres
    await unitSelect.selectOption('ft');
    await expect(output).toHaveText('Length unit: ft');
    await type(page, '@10,0'); // default unit now: feet
    await type(page, '@0,3 m'); // explicit metres win
    await page.keyboard.press('Enter');
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();
    const coords = await lastRoad(page);
    expect(coords).toHaveLength(5);
    const lengths = await page.evaluate(
      (points) =>
        points.slice(1).map((p, i) => window.olcad.distanceMetres('EPSG:25832', points[i]!, p)),
      coords,
    );
    [3.048, 2, 3.048, 3].forEach((metres, i) => expect(lengths[i]).toBeCloseTo(metres, 6));
    expect(await page.evaluate(() => window.editor.changes.hasChanges())).toBe(true);

    // Measurements and prompts are written in feet now.
    await page.evaluate(() => {
      window.editor.measurements.add('distance', [
        [460000, 5430000],
        [460030.48, 5430000], // the measure tools are planar in UTM
      ]);
    });
    expect(await page.evaluate(() => window.editor.measurements.list()[0]!.label)).toBe(
      '100.00 ft',
    );
    await page.evaluate(() => {
      window.editor.layers.setActive(null); // texts go to the draft layer
      window.editor.tools.activate('text');
    });
    await type(page, '460010,5430010');
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    expect(await prompt()).toMatch(/^Text height <8\.20 ft>: type a value in ft/);
    await type(page, '3 m');
    await expect(output).toHaveText('3 m → 9.84 ft');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');

    // Back to Auto: metres again, labels rewritten.
    await unitSelect.selectOption('auto');
    expect(await page.evaluate(() => window.editor.measurements.list()[0]!.label)).toBe('30.48 m');
    // A unit on an absolute coordinate or an unknown unit is refused.
    await insertInto(page, 'Roads');
    await type(page, '460000 m,5430000 m');
    await expect(output).toHaveText(/^Not a coordinate or length/);
    await type(page, '5 furlongs');
    await expect(output).toHaveText(/^Not a coordinate or length/);
  });
});
