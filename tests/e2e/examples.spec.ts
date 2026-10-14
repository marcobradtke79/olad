import { expect, test } from '@playwright/test';

// The examples run on the Vite dev server (second webServer in playwright.config.ts).
const EXAMPLES = 'http://localhost:5173/examples';

test('vanilla example renders a map with basemap switcher', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${EXAMPLES}/vanilla/`);
  await expect(page.locator('#map canvas')).toBeVisible();
  await expect(page.locator('olcad-layer-list [role="radio"]')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('script-tag example loads the UMD build', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${EXAMPLES}/script-tag/`);
  await expect(page.locator('#map canvas')).toBeVisible();
  await expect(page.locator('olcad-layer-list [role="radio"]')).toHaveCount(2);
  expect(await page.evaluate(() => typeof (window as never as { olcad: object }).olcad)).toBe(
    'object',
  );
  expect(errors).toEqual([]);
});
