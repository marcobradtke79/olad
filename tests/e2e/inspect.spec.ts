import { expect, test, type Page } from '@playwright/test';
import type LineString from 'ol/geom/LineString';

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.editor));
}

/** A pixel on Main Street (id 815): the midpoint of its only segment. */
async function roadPixel(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
    const [a, b] = (road.getGeometry() as LineString).getCoordinates();
    return window.editor.map.getPixelFromCoordinate([(a![0]! + b![0]!) / 2, (a![1]! + b![1]!) / 2]);
  });
}

const selectedIds = (page: Page) =>
  page.evaluate(() => window.editor.selection.get().map((f) => f.getId()));

test.describe('inspect selection outside edit mode', () => {
  test('a click selects a feature, reveals its attributes read-only and survives edit mode', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForEditor(page);
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.get('roads').featureCount))
      .toBe(2);
    await page.waitForFunction(() => {
      let rendered = false;
      window.editor.map.once('rendercomplete', () => (rendered = true));
      window.editor.map.render();
      return new Promise((resolve) => setTimeout(() => resolve(rendered), 100));
    });
    expect(await page.evaluate(() => window.editor.isEditMode())).toBe(false);
    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    const px = await roadPixel(page);
    const attributes = page.locator('olcad-panel[name="attributes"]');
    await expect(attributes).not.toHaveAttribute('open', '');

    // Click on the road: selected, highlighted, the Attributes flyout opens read-only.
    await page.mouse.click(viewport.x + px[0]!, viewport.y + px[1]!);
    await expect.poll(() => selectedIds(page)).toEqual([815]);
    // The highlight is an overlay layer holding the selection; the road keeps its own style.
    expect(
      await page.evaluate(() => {
        const highlight = window.editor.map
          .getLayers()
          .getArray()
          .filter((l) => l.get('olcad:highlight') === true);
        const source = (
          highlight[0] as unknown as { getSource(): { getFeatures(): { getId(): unknown }[] } }
        ).getSource();
        return {
          layers: highlight.length,
          ids: source.getFeatures().map((f) => f.getId()),
          ownStyle: window.editor.selection.get()[0]!.getStyle() ?? null,
        };
      }),
    ).toEqual({ layers: 1, ids: [815], ownStyle: null });
    await expect(attributes).toHaveAttribute('open', '');
    const form = attributes.locator('olcad-attribute-form');
    await expect(form.locator('.olcad-attribute-form__title')).toHaveText('Roads #815');
    await expect(form.locator('[data-field="name"] .olcad-attribute-form__control')).toBeDisabled();
    await expect(form.locator('.olcad-attribute-form__apply')).toBeDisabled();
    await expect(form).toContainText('Switch on edit mode to change attributes.');

    // Shift+click toggles it off; a plain click on empty map clears; Escape clears too.
    await page.keyboard.down('Shift');
    await page.mouse.click(viewport.x + px[0]!, viewport.y + px[1]!);
    await page.keyboard.up('Shift');
    await expect.poll(() => selectedIds(page)).toEqual([]);
    await page.mouse.click(viewport.x + px[0]!, viewport.y + px[1]!);
    await expect.poll(() => selectedIds(page)).toEqual([815]);
    await page.mouse.click(viewport.x + 20, viewport.y + viewport.height - 20);
    await expect.poll(() => selectedIds(page)).toEqual([]);
    await page.mouse.click(viewport.x + px[0]!, viewport.y + px[1]!);
    await expect.poll(() => selectedIds(page)).toEqual([815]);
    await page.keyboard.press('Escape'); // clears the selection with no tool active
    await expect.poll(() => selectedIds(page)).toEqual([]);
    await expect(attributes).toHaveAttribute('open', ''); // the panel is never closed by the form

    // Switching edit mode on keeps the selection, so Vertices is enabled right away.
    await page.mouse.click(viewport.x + px[0]!, viewport.y + px[1]!);
    await expect.poll(() => selectedIds(page)).toEqual([815]);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    expect(await selectedIds(page)).toEqual([815]);
    await expect(page.locator('olcad-toolbar .olcad-toolbar__tool--modify')).toBeEnabled();
    await expect(form.locator('[data-field="name"] .olcad-attribute-form__control')).toBeEnabled();
    // Back off edit mode: a click selects again without a tool.
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    await page.mouse.click(viewport.x + 20, viewport.y + viewport.height - 20);
    await expect.poll(() => selectedIds(page)).toEqual([]);
    await page.mouse.click(viewport.x + px[0]!, viewport.y + px[1]!);
    await expect.poll(() => selectedIds(page)).toEqual([815]);
  });
});
