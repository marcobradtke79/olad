import { expect, test, type Page } from '@playwright/test';
import type LineString from 'ol/geom/LineString';

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.editor));
}

test.describe('straightedge', () => {
  test('typed angle rotates the crosshair', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    const input = page.locator('olcad-straightedge .olcad-straightedge__input');
    await expect(input).toHaveValue('0');
    await input.fill('30');
    await input.press('Enter');
    expect(await page.evaluate(() => window.editor.straightedge.getAngle())).toBe(30);

    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    await page.mouse.move(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
    await expect(page.locator('.olcad-crosshair__pivot')).toHaveCSS(
      'transform',
      /matrix\(0\.866\d*, -0\.5, 0\.5, 0\.866\d*, [\d.]+, [\d.]+\)/,
    );
    await page.locator('olcad-straightedge .olcad-straightedge__reset').click();
    await expect(input).toHaveValue('0');
    await page.evaluate(() => window.editor.straightedge.setAngle(-45));
    await expect(input).toHaveValue('315');
    // The colour is changeable too; the event carries angle and colour.
    expect(
      await page.evaluate(() => {
        const events: unknown[] = [];
        window.editor.on('straightedgechange', (e) => events.push(e));
        window.editor.straightedge.setColor('#ffffff');
        window.editor.straightedge.setColor('#ffffff'); // unchanged: no event
        return { color: window.editor.straightedge.getColor(), events };
      }),
    ).toEqual({ color: '#ffffff', events: [{ angle: 315, color: '#ffffff' }] });
  });

  test('reference pick aligns the straightedge with the clicked segment', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    const pick = page.locator('olcad-straightedge .olcad-straightedge__pick');
    await expect(pick).toHaveAttribute('aria-label', 'Align to segment');
    await expect(pick).toBeEnabled(); // usable without switching edit mode on first

    // Wait for the roads layer to be loaded and rendered.
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.get('roads').featureCount))
      .toBe(2);
    await page.waitForFunction(() => {
      let rendered = false;
      window.editor.map.once('rendercomplete', () => (rendered = true));
      window.editor.map.render();
      return new Promise((resolve) => setTimeout(() => resolve(rendered), 100));
    });

    await pick.click();
    expect(await page.evaluate(() => window.editor.isEditMode())).toBe(true); // switched on by the button
    await expect(pick).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('olcad-straightedge .olcad-straightedge__hint')).toBeVisible();
    expect(await page.evaluate(() => window.editor.straightedge.isPicking())).toBe(true);
    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    await page.mouse.move(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
    await expect(page.locator('.olcad-crosshair__box')).toHaveCSS(
      'border-color',
      'rgb(250, 204, 21)',
    );

    // "Side Street" runs north-south: from [8.4011, 49.0088] to [8.4011, 49.0110].
    const pixel = await page.evaluate(() => {
      const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 816)!;
      const [a, b] = (road.getGeometry() as LineString).getCoordinates();
      return window.editor.map.getPixelFromCoordinate([
        (a![0]! + b![0]!) / 2,
        (a![1]! + b![1]!) / 2,
      ]);
    });
    // A click a few pixels beside the line still hits it (tolerance 8 px).
    await page.mouse.move(viewport.x + pixel[0]! + 5, viewport.y + pixel[1]!);
    await page.mouse.click(viewport.x + pixel[0]! + 5, viewport.y + pixel[1]!);
    await expect
      .poll(() => page.evaluate(() => window.editor.straightedge.getAngle()))
      .toBeCloseTo(90, 0);
    await expect(page.locator('olcad-straightedge .olcad-straightedge__hint')).toBeHidden();
    await expect(pick).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('olcad-straightedge .olcad-straightedge__input')).toHaveValue('90');
    await expect(page.locator('.olcad-crosshair__box')).toHaveCSS(
      'border-color',
      'rgb(243, 244, 246)',
    );

    // Escape cancels a pick; leaving edit mode cancels too.
    await pick.click();
    await page.keyboard.press('Escape');
    await expect(pick).toHaveAttribute('aria-pressed', 'false');
    await pick.click();
    await page.evaluate(() => window.editor.setEditMode(false));
    expect(await page.evaluate(() => window.editor.straightedge.isPicking())).toBe(false);
    await expect(pick).toHaveAttribute('aria-pressed', 'false');
    await expect(pick).toBeEnabled(); // pressing it again would switch edit mode back on
  });
});
