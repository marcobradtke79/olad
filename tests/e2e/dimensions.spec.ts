import { expect, test, type Page } from '@playwright/test';

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
