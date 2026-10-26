import { expect, test, type Page } from '@playwright/test';
import { openFlyout } from './flyout';

/** The test page sets window.editor once discovery is done. */
async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.editor));
}

test.describe('discovery', () => {
  test('adds WFS layers and WMS overlays from the capabilities', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    const status = await page.evaluate(() => window.editor.discovery.status());
    expect(status).toEqual([
      {
        state: 'done',
        source: { type: 'wfs', url: '/wfs' },
        added: ['test:lamps', 'test:points'],
        skipped: [],
      },
      {
        state: 'done',
        source: { type: 'wms', url: '/wms' },
        added: ['test:parcels', 'test:roads'],
        skipped: [],
      },
    ]);

    const lamps = await page.evaluate(() => {
      const info = window.editor.layers.get('test:lamps');
      const config = window.editor.layers.getConfig('test:lamps');
      return {
        title: info.title,
        geometryType: info.geometryType,
        editable: info.editable,
        group: info.group,
        visible: info.visible,
        minZoom: config.minZoom,
        fields: config.schema?.fields,
        source: config.source,
      };
    });
    expect(lamps).toEqual({
      title: 'Lamps (WFS)',
      geometryType: 'Point',
      editable: { insert: false, update: false, delete: false },
      group: 'Discovered',
      visible: false,
      minZoom: 10,
      fields: [
        { name: 'id', type: 'integer' },
        { name: 'watt', type: 'integer' },
      ],
      source: {
        format: 'wfs',
        url: '/wfs',
        typeName: 'test:lamps',
        version: '1.1.0',
        outputFormat: 'application/json',
        strategy: 'bbox',
        dataProjection: 'EPSG:4326',
        fetch: { credentials: 'same-origin' },
      },
    });
    expect(await page.evaluate(() => window.editor.layers.get('test:points').geometryType)).toBe(
      'Any',
    );
    // The discovered layer loads through GetFeature with the test: prefix once shown.
    await page.evaluate(() => window.editor.layers.setVisible('test:lamps', true));
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.get('test:lamps').featureCount))
      .toBe(3);

    const overlays = await page.evaluate(() =>
      ['test:parcels', 'test:roads'].map((id) => window.editor.overlays.get(id)),
    );
    expect(overlays[0]).toMatchObject({
      title: 'Parcels',
      type: 'wms',
      visible: false,
      opacity: 0.8,
      queryable: true,
      group: 'Test',
    });
    expect(overlays[0]!.legendUrl).toContain('REQUEST=GetLegendGraphic');
    expect(overlays[1]).toMatchObject({ queryable: false, minZoom: 10.13, maxZoom: 19.09 });

    // The layer list shows the discovered group.
    await openFlyout(page, 'layers');
    const group = page.locator(
      'olcad-layer-list .olcad-layer-list__group-row[data-section="layers"][data-group-id="Discovered"]',
    );
    await expect(group.locator('.olcad-layer-list__title')).toHaveText('Discovered');
  });

  test('a failed source rejects with discoveryerror and a re-run skips existing ids', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForEditor(page);
    const failed = await page.evaluate(async () => {
      const events: string[] = [];
      window.editor.on('discoveryerror', ({ source, error }) =>
        events.push(`${source.url}: ${error.message}`),
      );
      const message = await window.editor.discovery.run({ type: 'wfs', url: '/missing' }).then(
        () => 'resolved',
        (e: Error) => e.message,
      );
      return { message, events, state: window.editor.discovery.status()[2] };
    });
    expect(failed.message).toMatch(/^404/);
    expect(failed.events).toEqual([`/missing: ${failed.message}`]);
    expect(failed.state).toMatchObject({ state: 'failed', error: failed.message });

    const again = await page.evaluate(() =>
      window.editor.discovery.run({
        type: 'wfs',
        url: '/wfs',
        include: ['test:lamps', 'test:points'],
      }),
    );
    expect(again).toEqual({
      source: { type: 'wfs', url: '/wfs' },
      added: [],
      skipped: [
        { name: 'test:lamps', reason: 'exists' },
        { name: 'test:points', reason: 'exists' },
      ],
    });
    await expect(
      page.evaluate(() => window.editor.discovery.run({ type: 'wcs' } as never)),
    ).rejects.toThrow(/discover\.type/);
  });
});
