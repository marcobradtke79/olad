import { expect, test, type Page } from '@playwright/test';
import type Point from 'ol/geom/Point';
import { openFlyout } from './flyout';

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

const textButton = (page: Page) => page.locator('olcad-toolbar .olcad-toolbar__tool--text');

test.describe('text tool', () => {
  test.afterEach(async ({ request }) => {
    await request.post('/reset');
  });

  test('places a text in the draft layer by point, height and text', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'labels', 2);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    await expect(textButton(page)).toBeEnabled(); // no active layer: the draft layer
    await textButton(page).click();
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    await expect.poll(prompt).toContain('Insert point of the text');
    const centre = await page.evaluate(() => window.editor.map.getView().getCenter()!);
    const at = [centre[0]! - 80, centre[1]! - 60];
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    const bar = page.locator('olcad-input-bar');
    await expect(input).not.toBeFocused();
    // The insert point by a click on the map; then the command line asks for typing and is
    // focused and highlighted: height and text are typed straight away.
    const click = await screenPoint(page, at);
    await page.mouse.click(click.x, click.y);
    await expect.poll(prompt).toContain('Text height <2.50 m>');
    await expect(input).toBeFocused();
    await expect(bar).toHaveClass(/olcad-input-bar--awaiting/);
    await expect(bar).toHaveAttribute('data-input', 'value');
    await page.keyboard.type('40'); // large enough to click its letters reliably
    await page.keyboard.press('Enter');
    await expect.poll(prompt).toContain('Text: type it');
    await expect(input).toBeFocused();
    await expect(bar).toHaveAttribute('data-input', 'text');
    await page.keyboard.type('Hello 42');
    await page.keyboard.press('Enter');
    await waitForLayer(page, 'draft', 1);
    // Back to clicking: the command line gives the focus back to the page.
    await expect(input).not.toBeFocused();
    await expect(bar).not.toHaveClass(/olcad-input-bar--awaiting/);
    const placed = await page.evaluate(() => {
      const [feature] = window.editor.layers.getFeatures('draft');
      const { geometry, ...properties } = feature!.getProperties();
      return { properties, at: (geometry as Point).getCoordinates() };
    });
    expect(placed.properties).toEqual({ text: 'Hello 42', textHeight: 40, textRotation: 0 });
    at[0] = placed.at[0]!; // the click may have been snapped
    at[1] = placed.at[1]!;
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(1);
    await expect.poll(prompt).toContain('Insert point of the text'); // ready for the next
    expect(await page.evaluate(() => window.editor.changes.hasChanges())).toBe(false);

    // The text is drawn and can be clicked: a click on its letters selects it again.
    await page.evaluate(() => window.editor.selection.clear());
    await page.evaluate(() => window.editor.tools.activate('select'));
    const resolution = await page.evaluate(() => window.editor.map.getView().getResolution()!);
    const anchor = await screenPoint(page, at);
    // Halfway along "Hello 42" and half a text height above its baseline.
    const height =
      (40 * (await page.evaluate((c) => window.olcad.unitsPerMetre('EPSG:3857', c), at))) /
      resolution;
    // OpenLayers counts a second click within 250 ms of the last one (the insert point, quickly
    // followed by fast typing) as a double click wherever it lands: wait that out.
    await page.waitForTimeout(300);
    await page.mouse.click(anchor.x + height * 1.5, anchor.y - height * 0.35);
    await expect
      .poll(() => page.evaluate(() => window.editor.selection.get().map((f) => f.get('text'))))
      .toEqual(['Hello 42']);
  });

  test('a text in a text layer follows the straightedge and is a tracked insert', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'labels', 2);
    await openFlyout(page, 'layers');
    await page.getByRole('button', { name: 'Edit Labels', exact: true }).click();
    await page.evaluate(() => window.editor.straightedge.setAngle(30));
    // A layer that is not a text layer offers no text tool.
    await page.evaluate(() => window.editor.layers.setActive('hydrants'));
    await expect(textButton(page)).toBeDisabled();
    await page.evaluate(() => window.editor.layers.setActive('labels'));
    await expect(textButton(page)).toBeEnabled();
    await textButton(page).click();
    const centre = await page.evaluate(() => window.editor.map.getView().getCenter()!);
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.fill(`${centre[0]},${centre[1]}`);
    await input.press('Enter');
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    await expect.poll(prompt).toContain('<5.00 m>'); // the layer's text height
    await input.press('Enter'); // keep it
    await input.fill('Station Road');
    await input.press('Enter');
    await waitForLayer(page, 'labels', 3);

    // The attribute popup opens with the text fields filled in.
    const dialog = page.locator('olcad-attribute-form[popup] dialog[open]');
    await expect(dialog.locator('[data-field="text"] input')).toHaveValue('Station Road');
    await expect(dialog.locator('[data-field="textHeight"] input')).toHaveValue('5');
    await expect(dialog.locator('[data-field="textRotation"] input')).toHaveValue('30');
    await dialog.locator('.olcad-attribute-form__later').click();
    const changes = await page.evaluate(() => window.editor.changes.get().changes);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      op: 'insert',
      layer: 'labels',
      properties: { text: 'Station Road', textHeight: 5, textRotation: 30 },
    });
    await page.evaluate(() => window.editor.undo());
    await waitForLayer(page, 'labels', 2);
  });
});
