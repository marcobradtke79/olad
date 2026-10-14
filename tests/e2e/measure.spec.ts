import { expect, test, type Page } from '@playwright/test';
import type Polygon from 'ol/geom/Polygon';

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.editor));
}

async function waitForLayer(page: Page, id: string, count: number): Promise<void> {
  await expect
    .poll(() => page.evaluate((layer) => window.editor.layers.get(layer).featureCount, id))
    .toBe(count);
}

/** Screen position of a map coordinate (view projection). */
async function screenPoint(page: Page, coordinate: number[]): Promise<{ x: number; y: number }> {
  const viewport = (await page.locator('.ol-viewport').boundingBox())!;
  const pixel = await page.evaluate((c) => window.editor.map.getPixelFromCoordinate(c), coordinate);
  return { x: viewport.x + pixel[0]!, y: viewport.y + pixel[1]! };
}

const button = (page: Page, id: string) =>
  page.locator(`olcad-toolbar[name="measure"] .olcad-toolbar__tool--${id}`);

test.describe('measurement toolbox', () => {
  test('measures distances, areas and angles without edit mode', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'parcels', 2);
    expect(await page.evaluate(() => window.editor.isEditMode())).toBe(false);
    await expect(button(page, 'measure-distance')).toBeEnabled();
    await expect(button(page, 'measure-clear')).toBeDisabled();
    await expect(page.locator('olcad-toolbar .olcad-toolbar__tool--draw-line')).toBeDisabled();

    // Distance: three typed points, two segments of 100 m each (metres east, then north).
    await button(page, 'measure-distance').click();
    await expect(button(page, 'measure-distance')).toHaveAttribute('aria-pressed', 'true');
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    await expect.poll(prompt).toContain('First point of the distance');
    const centre = await page.evaluate(() => window.editor.map.getView().getCenter()!);
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.fill(`${centre[0]},${centre[1]}`);
    await input.press('Enter');
    await input.fill('@100,0');
    await input.press('Enter');
    await input.fill('@0,100');
    await input.press('Enter');
    await input.press('Enter'); // empty: finishes
    await expect.poll(() => page.evaluate(() => window.editor.measurements.list().length)).toBe(1);
    const distance = await page.evaluate(() => window.editor.measurements.list()[0]!);
    expect(distance.values.length).toBeCloseTo(200, 1);
    expect(distance.label).toBe('200.00 m');
    // Still not in edit mode; the measurement is listed in the panel.
    expect(await page.evaluate(() => window.editor.isEditMode())).toBe(false);
    await page.locator('olcad-panel[name="measurements"] .olcad-panel__title').click();
    const rows = page.locator('olcad-measure-results .olcad-measure-results__item');
    await expect(rows).toHaveCount(1);
    await expect(rows.first().locator('.olcad-measure-results__value')).toHaveText(
      '200.00 m · 2 segments',
    );
    await expect(button(page, 'measure-clear')).toBeEnabled();

    // Area: Alt+click inside a parcel measures it; it matches the polygon's area on the sphere.
    await button(page, 'measure-area').click();
    const parcel = await page.evaluate(() => {
      const feature = window.editor.layers.getFeatures('parcels').find((f) => f.getId() === 1)!;
      const ring = (feature.getGeometry() as Polygon).getCoordinates()[0]!;
      return {
        ring,
        inside: [(ring[0]![0]! + ring[2]![0]!) / 2, (ring[0]![1]! + ring[2]![1]!) / 2],
      };
    });
    const at = await screenPoint(page, parcel.inside);
    await page.keyboard.down('Alt');
    await page.mouse.click(at.x, at.y);
    await page.keyboard.up('Alt');
    await expect.poll(() => page.evaluate(() => window.editor.measurements.list().length)).toBe(2);
    const area = await page.evaluate(() => window.editor.measurements.list()[1]!);
    expect(area.kind).toBe('area');
    expect(area.source).toEqual({ layer: 'parcels', featureId: 1 });
    const expected = await page.evaluate(
      (ring) => window.olcad.measureArea('EPSG:3857', [ring]).area,
      parcel.ring,
    );
    expect(area.values.area).toBeCloseTo(expected, 3);

    // Angle: a right angle by three typed points finishes by itself.
    await button(page, 'measure-angle').click();
    await input.fill(`${centre[0]! + 50},${centre[1]}`);
    await input.press('Enter');
    await input.fill(`${centre[0]},${centre[1]}`);
    await input.press('Enter');
    await input.fill(`${centre[0]},${centre[1]! + 50}`);
    await input.press('Enter');
    await expect.poll(() => page.evaluate(() => window.editor.measurements.list().length)).toBe(3);
    expect(await page.evaluate(() => window.editor.measurements.list()[2]!.label)).toBe('90.0°');
    await expect(rows).toHaveCount(3);

    // Remove one in the panel, then clear all; nothing ever reached the change set.
    await rows.nth(0).locator('[data-action="remove"]').click();
    await expect(rows).toHaveCount(2);
    await button(page, 'measure-clear').click();
    await expect(rows).toHaveCount(0);
    expect(await page.evaluate(() => window.editor.changes.hasChanges())).toBe(false);
  });

  test('a measure tool keeps running when edit mode is switched off', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    await page.evaluate(() => window.editor.tools.activate('measure-angle'));
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    expect(await page.evaluate(() => window.editor.tools.getActive())).toBe('measure-angle');
    // A drawing tool does not survive leaving edit mode.
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    await page.evaluate(() => window.editor.tools.activate('draw', { type: 'LineString' }));
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    expect(await page.evaluate(() => window.editor.tools.getActive())).toBeNull();
    expect(
      await page.evaluate(() => {
        try {
          window.editor.tools.activate('draw', { type: 'LineString' });
          return 'activated';
        } catch (error) {
          return (error as Error).message;
        }
      }),
    ).toBe('Tools require edit mode');
  });
});
