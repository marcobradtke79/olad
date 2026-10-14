import { expect, type Page } from '@playwright/test';

/** Open or close a flyout panel of the test page through its tab. */
export async function setFlyout(page: Page, name: string, open: boolean): Promise<void> {
  const panel = page.locator(`olcad-panel[name="${name}"]`);
  const isOpen = await panel.evaluate((el) => el.hasAttribute('open'));
  if (isOpen === open) return;
  await panel.locator('.olcad-panel__title').click();
  if (open) await expect(panel).toHaveAttribute('open', '');
  else await expect(panel).not.toHaveAttribute('open', '');
}

export const openFlyout = (page: Page, name: string) => setFlyout(page, name, true);
export const closeFlyout = (page: Page, name: string) => setFlyout(page, name, false);

/**
 * Press "Edit <layer>" in the Layers flyout (edit mode on, the layer active), close the flyout so
 * it never covers the map, and start the draw tool for the layer, as a user would from the Draw
 * toolbar.
 */
export async function insertInto(page: Page, layerTitle: string): Promise<void> {
  await openFlyout(page, 'layers');
  const edit = page.getByRole('button', { name: `Edit ${layerTitle}` });
  // A second press would clear the active layer again.
  if ((await edit.getAttribute('aria-pressed')) !== 'true') await edit.click();
  await closeFlyout(page, 'layers');
  await page.evaluate(() => window.editor.tools.activate('draw'));
}
