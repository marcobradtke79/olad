import { expect, test, type Page } from '@playwright/test';
import type LineString from 'ol/geom/LineString';
import { closeFlyout, openFlyout } from './flyout';

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.editor));
}

const count = (page: Page, layer: string) =>
  page.evaluate((id) => window.editor.layers.getFeatures(id).length, layer);

/** A map coordinate as a page position. */
async function screenPoint(page: Page, coordinate: number[]): Promise<{ x: number; y: number }> {
  const viewport = (await page.locator('.ol-viewport').boundingBox())!;
  const pixel = await page.evaluate((c) => window.editor.map.getPixelFromCoordinate(c), coordinate);
  return { x: viewport.x + pixel[0]!, y: viewport.y + pixel[1]! };
}

test.describe('templates', () => {
  test.afterEach(async ({ request }) => {
    await request.post('/reset');
  });

  test('copy objects to a named template and insert copies from the panel', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await expect.poll(() => count(page, 'roads')).toBe(2);
    await expect.poll(() => count(page, 'hydrants')).toBe(2);
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    const output = page.locator('olcad-input-bar .olcad-input-bar__output');

    // Main Street and a hydrant are the selection; Copy to template takes it as the objects.
    const base = await page.evaluate(() => {
      const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
      const hydrant = window.editor.layers.getFeatures('hydrants')[0]!;
      window.editor.selection.set([road, hydrant]);
      return (road.getGeometry() as LineString).getFirstCoordinate();
    });
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    await page.locator('olcad-toolbar .olcad-toolbar__tool--template-copy').click();
    await expect.poll(prompt).toContain('Base point');
    const at = await screenPoint(page, base);
    await page.mouse.click(at.x, at.y);
    await expect(output).toContainText('Template name <Template 1>');
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.fill('Junction');
    await input.press('Enter');
    await expect(output).toContainText('Template "Junction" stored.');
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(0);
    expect(await page.evaluate(() => window.editor.changes.hasChanges())).toBe(false);

    // The Templates panel lists it; Insert starts placing copies.
    await openFlyout(page, 'templates');
    const row = page.locator('olcad-template-list [data-template-id]');
    await expect(row).toHaveCount(1);
    await expect(row.locator('.olcad-template-list__name')).toHaveText('Junction');
    await expect(row.locator('.olcad-template-list__meta')).toHaveText(
      '2 objects · roads, hydrants',
    );
    await row.locator('[data-action="insert"]').click();
    await expect(row.locator('[data-action="insert"]')).toHaveAttribute('aria-pressed', 'true');
    await closeFlyout(page, 'templates');
    await expect.poll(prompt).toContain('Insert "Junction"');

    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    await page.mouse.click(viewport.x + 120, viewport.y + viewport.height - 120);
    await expect.poll(() => count(page, 'roads')).toBe(3);
    await page.mouse.click(viewport.x + 260, viewport.y + viewport.height - 140);
    await expect.poll(() => count(page, 'roads')).toBe(4);
    expect(await count(page, 'hydrants')).toBe(4);
    // No attribute popup: the copies carry their attributes.
    await expect(page.locator('olcad-attribute-form[popup] dialog[open]')).toHaveCount(0);
    const copies = await page.evaluate(() =>
      window.editor.layers
        .getFeatures('roads')
        .filter((f) => f.getId() !== 815 && f.getId() !== 816)
        .map((f) => ({
          name: f.get('name') as string,
          length: (f.getGeometry() as LineString).getLength(),
        })),
    );
    const original = await page.evaluate(() =>
      (
        window.editor.layers
          .getFeatures('roads')
          .find((f) => f.getId() === 815)!
          .getGeometry() as LineString
      ).getLength(),
    );
    expect(copies.map((c) => c.name)).toEqual(['Main Street', 'Main Street']);
    for (const copy of copies) expect(copy.length).toBeCloseTo(original, 0);
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(2);
    const changes = await page.evaluate(() => window.editor.changes.get().changes);
    expect(changes.map((c) => c.op)).toEqual(['insert', 'insert', 'insert', 'insert']);

    // One undo step per copy; Escape ends the tool.
    await page.evaluate(() => window.editor.undo());
    expect(await count(page, 'roads')).toBe(3);
    expect(await count(page, 'hydrants')).toBe(3);
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.editor.tools.getActive())).toBeNull();

    // Rename in the panel; the template survives a reload through the page's localStorage.
    await openFlyout(page, 'templates');
    await row.locator('[data-action="rename"]').click();
    const name = page.locator('.olcad-template-list__name-input');
    await name.fill('Crossing');
    await name.press('Enter');
    await expect(row.locator('.olcad-template-list__name')).toHaveText('Crossing');
    await page.reload();
    await waitForEditor(page);
    expect(await page.evaluate(() => window.editor.templates.list().map((t) => t.name))).toEqual([
      'Crossing',
    ]);
    await openFlyout(page, 'templates');
    await page.locator('olcad-template-list [data-action="remove"]').click();
    await expect(page.locator('olcad-template-list .olcad-template-list__empty')).toBeVisible();
  });
});
