import { expect, test, type Page } from '@playwright/test';
import { closeFlyout, openFlyout } from './flyout';

/** Label and colour the dimension layer's style draws for each seed dimension. */
async function labels(page: Page): Promise<Record<string, { text: string; color: string }>> {
  return page.evaluate(() => {
    const layer = window.editor.map
      .getLayers()
      .getArray()
      .find((l) => l.get('olcad:layer') === 'dimensions') as unknown as {
      getStyleFunction(): (feature: unknown, resolution: number) => unknown;
    };
    const style = layer.getStyleFunction();
    const out: Record<string, { text: string; color: string }> = {};
    for (const feature of window.editor.layers.getFeatures('dimensions')) {
      // A small resolution, so every value is drawn.
      const styles = style(feature, 0.05) as {
        getText(): { getText(): string; getFill(): { getColor(): string } } | null;
      }[];
      const text = styles.find((s) => s.getText())!.getText()!;
      out[String(feature.getId())] = { text: text.getText(), color: text.getFill().getColor() };
    }
    return out;
  });
}

test.describe('dimension layer', () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post('/reset');
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.editor));
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.get('dimensions').featureCount))
      .toBe(4);
  });

  test('draws computed values in brackets, field values plain and deviations in colour', async ({
    page,
  }) => {
    const drawn = await labels(page);
    expect(drawn['1001']!.text).toMatch(/^\(146\.0\d[⁰¹²³⁴⁵⁶⁷⁸⁹]?\)$/);
    expect(drawn['1002']).toEqual({ text: '166.98', color: '#fde68a' });
    expect(drawn['1003']).toEqual({ text: '131.63', color: '#f87171' });
    expect(drawn['1004']).toEqual({ text: '2.01⁵ lt. Bestand', color: '#fde68a' });
  });

  test('keeps the values across a projection switch', async ({ page }) => {
    const before = await labels(page);
    await page.evaluate(() => window.editor.setProjection('EPSG:25832'));
    const after = await labels(page);
    expect(after['1002']!.text).toBe(before['1002']!.text);
    expect(after['1004']!.text).toBe(before['1004']!.text);
    // The GIS value is now the UTM grid distance: within 0.1 % of the Web Mercator value.
    const gis = (label: string) => Number(label.replace(/[()⁰¹²³⁴⁵⁶⁷⁸⁹]/g, ''));
    expect(gis(after['1001']!.text)).toBeCloseTo(gis(before['1001']!.text), -1);
  });

  test('a dimension is an ordinary tracked object', async ({ page }) => {
    const changes = await page.evaluate(() => {
      const feature = window.editor.layers
        .getFeatures('dimensions')
        .find((f) => f.getId() === 1003)!;
      window.editor.execute(window.olcad.updateProperties(feature, { fieldValue: 131.45 }));
      return window.editor.changes.get().changes;
    });
    expect(changes).toEqual([
      expect.objectContaining({
        op: 'update',
        layer: 'dimensions',
        id: 1003,
        changed: ['fieldValue'],
      }),
    ]);
    expect((await labels(page))['1003']).toEqual({ text: '131.45', color: '#fde68a' });
  });
});

/** Press "Edit <layer>" in the Layers flyout (edit mode on, layer active) and close the flyout. */
async function editLayer(page: Page, title: string): Promise<void> {
  await openFlyout(page, 'layers');
  const edit = page.getByRole('button', { name: `Edit ${title}` });
  if ((await edit.getAttribute('aria-pressed')) !== 'true') await edit.click();
  await closeFlyout(page, 'layers');
}

/** The ring of a seed parcel in the view projection. */
function parcelRing(page: Page, id: number): Promise<number[][]> {
  return page.evaluate((parcel) => {
    const feature = window.editor.layers.getFeatures('parcels').find((f) => f.getId() === parcel)!;
    return (
      feature.getGeometry() as unknown as { getCoordinates(): number[][][] }
    ).getCoordinates()[0]!;
  }, id);
}

/** Page position of a map coordinate. */
async function screenPoint(page: Page, coordinate: number[]): Promise<{ x: number; y: number }> {
  const viewport = (await page.locator('.ol-viewport').boundingBox())!;
  const pixel = await page.evaluate((c) => window.editor.map.getPixelFromCoordinate(c), coordinate);
  return { x: viewport.x + pixel[0]!, y: viewport.y + pixel[1]! };
}

/** The inserts of the dimensions layer in the change set. */
function dimensionInserts(page: Page) {
  return page.evaluate(() =>
    window.editor.changes
      .get()
      .changes.filter((c) => c.op === 'insert' && c.layer === 'dimensions'),
  );
}

test.describe('linear dimension tool', () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post('/reset');
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.editor));
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.get('parcels').featureCount))
      .toBe(2);
    // Parcel 2 fills the view.
    await page.evaluate(() => {
      const parcel = window.editor.layers.getFeatures('parcels').find((f) => f.getId() === 2)!;
      window.editor.map
        .getView()
        .fit(parcel.getGeometry()!.getExtent(), { padding: [150, 150, 150, 150] });
    });
  });

  test('snaps two corners, places the line, keeps the GIS value on Enter and types a field value', async ({
    page,
  }) => {
    await editLayer(page, 'Dimensions');
    await page.locator('olcad-toolbar .olcad-toolbar__tool--dimension-linear').click();
    await expect
      .poll(() => page.evaluate(() => window.editor.tools.getActive()))
      .toBe('dimension-linear');
    const ring = await parcelRing(page, 2);
    const [sw, se] = [ring[0]!, ring[1]!];
    // Click a few pixels off the corners: the vertex snap places the points on them.
    const a = await screenPoint(page, sw);
    const b = await screenPoint(page, se);
    await page.mouse.click(a.x + 4, a.y - 3);
    await page.mouse.click(b.x - 3, b.y + 4);
    await page.mouse.move((a.x + b.x) / 2, a.y + 40);
    await page.mouse.click((a.x + b.x) / 2, a.y + 40);
    await expect
      .poll(() => page.evaluate(() => window.editor.tools.getPrompt()))
      .toContain('Enter keeps');
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.press('Enter');
    let inserts = await dimensionInserts(page);
    expect(inserts).toHaveLength(1);
    const first = inserts[0] as unknown as {
      properties: Record<string, unknown>;
      geometry: { coordinates: number[][] };
    };
    expect(first.properties).toMatchObject({ dimType: 'aligned', fieldValue: null, text: null });
    expect(first.properties.gisValue as number).toBeCloseTo(131.4, 0);
    expect(first.properties.offset as number).toBeLessThan(0); // south of the edge
    // Snapped exactly onto the parcel corners (EPSG:4326 in the change set).
    expect(first.geometry.coordinates[0]![0]).toBeCloseTo(8.4012, 7);
    expect(first.geometry.coordinates[1]![0]).toBeCloseTo(8.403, 7);

    // A second dimension: a typed offset, then a typed field value.
    await page.mouse.click(a.x, a.y);
    await page.mouse.click(b.x, b.y);
    await page.mouse.move((a.x + b.x) / 2, a.y + 20);
    await input.fill('3');
    await input.press('Enter');
    await input.fill('131.5');
    await input.press('Enter');
    inserts = await dimensionInserts(page);
    expect(inserts).toHaveLength(2);
    expect(
      (inserts[1] as unknown as { properties: Record<string, unknown> }).properties,
    ).toMatchObject({ offset: -3, fieldValue: 131.5 });
  });

  test('a rotated dimension measures along the straightedge', async ({ page }) => {
    await editLayer(page, 'Dimensions');
    const ring = await parcelRing(page, 2);
    const result = await page.evaluate(
      ([sw, ne]) => {
        window.editor.straightedge.setAngle(0);
        window.editor.tools.activate('dimension-linear', { method: 'rotated' });
        window.editor.input(`${sw![0]},${sw![1]}`);
        window.editor.input(`${ne![0]},${ne![1]}`);
        window.editor.input('5');
        window.editor.tools.finish();
        const projection = window.editor.map.getView().getProjection().getCode();
        const horizontal = window.olcad.measureLength(projection, [sw!, [ne![0]!, sw![1]!]]).total;
        const feature = window.editor.selection.get()[0]!;
        return { horizontal, gis: feature.get('gisValue'), rotation: feature.get('rotation') };
      },
      [ring[0]!, ring[2]!],
    );
    expect(result.rotation).toBe(0);
    expect(result.gis).toBeCloseTo(result.horizontal, 2);
  });

  test('the command line sets the field value of a selected dimension', async ({ page }) => {
    await editLayer(page, 'Dimensions');
    await page.evaluate(() => {
      window.editor.tools.deactivate();
      const feature = window.editor.layers
        .getFeatures('dimensions')
        .find((f) => f.getId() === 1001)!;
      window.editor.selection.set([feature]);
    });
    const output = page.locator('olcad-input-bar .olcad-input-bar__output');
    await expect(output).toContainText('Field value of the selected dimension');
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.fill('146.1');
    await input.press('Enter');
    await expect(output).toHaveText(/^Field value 146.10 m$/);
    const fieldValue = () =>
      page.evaluate(
        () =>
          window.editor.layers
            .getFeatures('dimensions')
            .find((f) => f.getId() === 1001)!
            .get('fieldValue') as number | undefined,
      );
    expect(await fieldValue()).toBe(146.1);
    await input.fill('-');
    await input.press('Enter');
    await expect(output).toHaveText('Field value cleared');
    expect(await fieldValue()).toBeUndefined();
  });

  test('draws into a local dimension layer, which stays out of the change set', async ({
    page,
  }) => {
    const ring = await parcelRing(page, 2);
    const result = await page.evaluate(
      ([sw, se]) => {
        const id = window.editor.localLayers.create({
          title: 'Site dimensions',
          geometryType: 'LineString',
          fields: [],
          dimension: { preset: 'landscape' },
        });
        window.editor.setEditMode(true);
        window.editor.layers.setActive(id);
        window.editor.tools.activate('dimension-linear');
        window.editor.input(`${sw![0]},${sw![1]}`);
        window.editor.input(`${se![0]},${se![1]}`);
        window.editor.input('2');
        window.editor.input('131.45');
        return {
          count: window.editor.layers.get(id).featureCount,
          changes: window.editor.changes.get().changes.length,
          preset: window.editor.layers.getConfig(id).dimension?.preset,
        };
      },
      [ring[0]!, ring[1]!],
    );
    expect(result).toEqual({ count: 1, changes: 0, preset: 'landscape' });
  });
});
