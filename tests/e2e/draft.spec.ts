import { expect, test, type Page } from '@playwright/test';
import type Feature from 'ol/Feature';
import type LineString from 'ol/geom/LineString';
import type Point from 'ol/geom/Point';
import { insertInto, openFlyout } from './flyout';

/** The OpenLayers full build loaded by the test page. */
type OlGlobal = {
  Feature: typeof Feature;
  geom: { Point: typeof Point; LineString: typeof LineString };
};

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.editor));
}

async function waitForLayer(page: Page, id: string, count: number): Promise<void> {
  await expect
    .poll(() => page.evaluate((layer) => window.editor.layers.get(layer).featureCount, id))
    .toBe(count);
}

const tool = (page: Page, id: string) => page.locator(`olcad-toolbar .olcad-toolbar__tool--${id}`);

test.describe('draft layer', () => {
  test.afterEach(async ({ request }) => {
    await request.post('/reset');
  });

  test('draws into the draft layer without an active layer; drafts stay local', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    expect(await page.evaluate(() => window.editor.layers.getActive())).toBeNull();
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    await expect(tool(page, 'draw-point')).toBeEnabled();
    await expect(tool(page, 'draw-line')).toBeEnabled();
    await expect(tool(page, 'draw-polygon')).toBeEnabled();

    // A line: two clicks and Enter.
    await tool(page, 'draw-line').click();
    await expect(tool(page, 'draw-line')).toHaveAttribute('aria-pressed', 'true');
    await expect(tool(page, 'draw-point')).toHaveAttribute('aria-pressed', 'false');
    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    const cx = viewport.x + viewport.width * 0.3;
    const cy = viewport.y + viewport.height * 0.3;
    await page.mouse.click(cx, cy);
    await page.mouse.click(cx + 80, cy + 30);
    await page.keyboard.press('Enter');
    await waitForLayer(page, 'draft', 1);
    // Local only: no change, no popup, but selected like any inserted feature.
    expect(await page.evaluate(() => window.editor.changes.get().changes)).toEqual([]);
    expect(await page.evaluate(() => window.editor.changes.hasChanges())).toBe(false);
    await expect(page.locator('olcad-attribute-form[popup] dialog[open]')).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        window.editor.selection.get().map((f) => window.editor.layers.layerOf(f)),
      ),
    ).toEqual(['draft']);
    expect(await page.evaluate(() => window.editor.layers.getActive())).toBeNull();
    await expect(page.locator('olcad-toolbar .olcad-toolbar__active-layer')).toHaveText(
      'No layer selected',
    );

    // A polygon: the type switches, the tool stays the draw tool.
    await tool(page, 'draw-polygon').click();
    await expect(tool(page, 'draw-polygon')).toHaveAttribute('aria-pressed', 'true');
    await page.mouse.click(cx, cy + 120);
    await page.mouse.click(cx + 80, cy + 120);
    await page.mouse.click(cx + 40, cy + 180);
    await page.keyboard.press('Enter');
    await waitForLayer(page, 'draft', 2);
    expect(
      await page.evaluate(() =>
        window.editor.layers.getFeatures('draft').map((f) => f.getGeometry()!.getType()),
      ),
    ).toEqual(['LineString', 'Polygon']);
    expect(await page.evaluate(() => window.editor.changes.hasChanges())).toBe(false);

    // The layer list shows the draft layer with its mixed type and count.
    await openFlyout(page, 'layers');
    const row = page.locator('olcad-layer-list [data-layer-id="draft"]');
    await row.locator('[data-action="info"]').click();
    await expect(row.locator('[data-detail="geometry"] dd')).toHaveText('Any');
    await expect(row.locator('[data-detail="features"] dd')).toHaveText('2');

    // A real layer narrows the buttons to its type; the draft objects survive.
    await insertInto(page, 'Roads');
    await expect(tool(page, 'draw-line')).toHaveAttribute('aria-pressed', 'true');
    await expect(tool(page, 'draw-point')).toBeDisabled();
    await expect(tool(page, 'draw-polygon')).toBeDisabled();
    await waitForLayer(page, 'draft', 2);

    // Drafts can be deleted like any feature (the polygon is still selected).
    await tool(page, 'draw-line').click(); // stop drawing
    await page.keyboard.press('Delete');
    await waitForLayer(page, 'draft', 1);
    expect(await page.evaluate(() => window.editor.changes.hasChanges())).toBe(false);
    // Undo brings it back; the history is shared with tracked edits.
    await page.keyboard.press('Control+z');
    await waitForLayer(page, 'draft', 2);
  });

  test('a headless insert into the draft layer is validated but not exported', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    const result = await page.evaluate(() => {
      const ol = (window as unknown as { ol: OlGlobal }).ol;
      const draft = window.editor.layers.getDraft()!;
      const ok = window.editor.execute(
        window.olcad.insertFeature(draft, new ol.Feature(new ol.geom.Point([1, 2]))),
      );
      const rejected = window.editor.execute(
        window.olcad.insertFeature(draft, new ol.Feature(new ol.geom.LineString([[1, 2]]))),
      );
      return {
        ok,
        rejected,
        count: window.editor.layers.get(draft).featureCount,
        changes: window.editor.changes.get().changes.length,
        canUndo: window.editor.canUndo(),
      };
    });
    expect(result).toEqual({ ok: true, rejected: false, count: 1, changes: 0, canUndo: true });
  });

  test('moves a selected draft object into a layer from the layers panel', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    await tool(page, 'draw-line').click();
    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    const cx = viewport.x + viewport.width * 0.3;
    const cy = viewport.y + viewport.height * 0.3;
    await page.mouse.click(cx, cy);
    await page.mouse.click(cx + 80, cy + 30);
    await page.keyboard.press('Enter');
    await waitForLayer(page, 'draft', 1);
    const drafted = await page.evaluate(() =>
      (window.editor.layers.getFeatures('draft')[0]!.getGeometry() as LineString).getCoordinates(),
    );

    // The draft line is selected: the layers panel opens by itself and the rows of the layers
    // that take a line get a move button.
    await expect(page.locator('olcad-panel[name="layers"]')).toHaveAttribute('open', '');
    const moves = page.locator('olcad-layer-list .olcad-layer-list__move-draft');
    await expect(moves).toHaveCount(1); // Roads only: Tracks is read-only
    await expect(moves).toHaveAccessibleName('Move selected draft to Roads');
    const form = page.locator('olcad-attribute-form[reveal]');
    await expect(form).toContainText('Move it to a layer in the Layers panel');
    await moves.click();

    // The copy is in Roads, selected, and its attributes are asked for.
    await waitForLayer(page, 'draft', 0);
    await waitForLayer(page, 'roads', 3);
    const dialog = page.locator('olcad-attribute-form[popup] dialog[open]');
    await expect(dialog.locator('.olcad-attribute-form__title')).toContainText('Roads');
    await dialog.locator('[data-field="name"] input').fill('Draft Lane');
    await dialog.locator('.olcad-attribute-form__apply').click();
    await expect(dialog).toHaveCount(0);
    // The attributes panel opened on the moved object; the move buttons are gone.
    await expect(page.locator('olcad-panel[name="attributes"]')).toHaveAttribute('open', '');
    await expect(form.locator('.olcad-attribute-form__title')).toContainText('Roads');
    await expect(moves).toHaveCount(0);
    const changes = await page.evaluate(() => window.editor.changes.get().changes);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ op: 'insert', layer: 'roads' });
    expect((changes[0] as { properties: Record<string, unknown> }).properties.name).toBe(
      'Draft Lane',
    );
    const moved = await page.evaluate(() => {
      const [feature] = window.editor.selection.get();
      return {
        layer: window.editor.layers.layerOf(feature!),
        coordinates: (feature!.getGeometry() as LineString).getCoordinates(),
      };
    });
    expect(moved).toEqual({ layer: 'roads', coordinates: drafted });

    // Undo the attributes, then the move: the draft is back and nothing is left to save.
    await page.evaluate(() => window.editor.undo());
    await page.evaluate(() => window.editor.undo());
    await waitForLayer(page, 'draft', 1);
    await waitForLayer(page, 'roads', 2);
    expect(await page.evaluate(() => window.editor.changes.hasChanges())).toBe(false);
  });

  test('moves several selected drafts at once and asks for each one', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    // Two draft lines and a draft point, inserted headless and selected together.
    await page.evaluate(() => {
      const { Feature, geom } = (window as unknown as { ol: OlGlobal }).ol;
      const editor = window.editor;
      const draft = editor.layers.getDraft()!;
      const [x, y] = editor.map.getView().getCenter()!;
      const features = [
        new Feature(
          new geom.LineString([
            [x!, y!],
            [x! + 50, y!],
          ]),
        ),
        new Feature(
          new geom.LineString([
            [x!, y! + 30],
            [x! + 50, y! + 30],
          ]),
        ),
        new Feature(new geom.Point([x! + 20, y! - 20])),
      ];
      for (const feature of features) editor.execute(window.olcad.insertFeature(draft, feature));
      editor.selection.set(features);
    });
    await expect(page.locator('olcad-panel[name="layers"]')).toHaveAttribute('open', '');
    const roads = page.locator(
      'olcad-layer-list [data-layer-id="roads"] .olcad-layer-list__move-draft',
    );
    await expect(roads).toHaveAccessibleName('Move 2 selected drafts to Roads');
    await expect(
      page.locator('olcad-layer-list [data-layer-id="lamps"] .olcad-layer-list__move-draft'),
    ).toHaveAccessibleName('Move selected draft to Lamps (WFS)');
    await roads.click();

    // Both lines moved as one step; the point stays a draft; the popup asks for each line.
    await waitForLayer(page, 'roads', 4);
    await waitForLayer(page, 'draft', 1);
    const dialog = page.locator('olcad-attribute-form[popup] dialog[open]');
    await expect(dialog.locator('.olcad-attribute-form__progress')).toHaveText('1 of 2');
    await dialog.locator('.olcad-attribute-form__later').click();
    await expect(dialog.locator('.olcad-attribute-form__progress')).toHaveText('2 of 2');
    await dialog.locator('.olcad-attribute-form__later').click();
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(2);
    await page.evaluate(() => window.editor.undo());
    await waitForLayer(page, 'draft', 3);
    await waitForLayer(page, 'roads', 2);
  });
});
