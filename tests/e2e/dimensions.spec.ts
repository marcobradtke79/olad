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

  test('a chain along the south edges of both parcels lies on one line', async ({ page }) => {
    await editLayer(page, 'Dimensions');
    const [p1, p2] = [await parcelRing(page, 1), await parcelRing(page, 2)];
    const points = [p1[0]!, p1[1]!, p2[0]!, p2[1]!];
    const spans = await page.evaluate((corners) => {
      const e = window.editor;
      e.tools.activate('dimension-linear', { method: 'chain' });
      const at = (c: number[]) => e.input(`${c[0]},${c[1]}`);
      at(corners[0]!);
      at(corners[1]!);
      e.input('6');
      e.tools.finish(); // first span keeps its GIS value
      at(corners[2]!);
      e.tools.finish();
      at(corners[3]!);
      e.input('131.4');
      e.tools.finish(); // ends the chain
      return e.layers
        .getFeatures('dimensions')
        .filter((f) => f.get('chain'))
        .map((f) => ({
          chain: f.get('chain') as string,
          rotation: f.get('rotation') as number,
          offset: f.get('offset') as number,
          fieldValue: f.get('fieldValue') as number | null,
        }));
    }, points);
    expect(spans).toHaveLength(3);
    expect(new Set(spans.map((s) => s.chain)).size).toBe(1);
    for (const span of spans) {
      expect(span.rotation).toBeCloseTo(spans[0]!.rotation, 6);
      expect(span.offset).toBeCloseTo(spans[0]!.offset, 2); // the corners lie on one line
    }
    expect(spans[2]!.fieldValue).toBe(131.4);
  });

  test('running dimensions from one origin and a tie distance', async ({ page }) => {
    await editLayer(page, 'Dimensions');
    const [p1, p2] = [await parcelRing(page, 1), await parcelRing(page, 2)];
    const result = await page.evaluate(
      ([origin, a, b, tieFrom, tieTo]) => {
        const e = window.editor;
        const at = (c: number[]) => e.input(`${c[0]},${c[1]}`);
        e.tools.activate('dimension-linear', { method: 'running' });
        at(origin!);
        at(a!);
        e.input('5');
        e.tools.finish();
        at(b!);
        e.tools.finish();
        e.tools.cancel();
        e.tools.activate('dimension-linear', { method: 'tie' });
        at(tieFrom!);
        at(tieTo!);
        e.tools.finish();
        const features = e.layers.getFeatures('dimensions');
        const running = features.filter((f) => f.get('dimType') === 'running');
        const tie = features.find((f) => f.get('dimType') === 'tie')!;
        return {
          running: running.map((f) => e.dimensions.values(f)!.gis),
          tie: e.dimensions.values(tie)!.gis,
          tieOffset: tie.get('offset'),
        };
      },
      [p1[0]!, p1[1]!, p2[1]!, p1[2]!, p2[0]!],
    );
    expect(result.running).toHaveLength(2);
    expect(result.running[1]!).toBeGreaterThan(result.running[0]!); // cumulative from the origin
    expect(result.tie).toBeGreaterThan(0);
    expect(result.tieOffset).toBe(0);
  });

  test('the table lists GIS value, field value, difference and status', async ({ page }) => {
    await page.evaluate(() =>
      document
        .querySelector<HTMLElement & { show(id: string): void }>('olcad-feature-table')!
        .show('dimensions'),
    );
    const table = page.locator('olcad-feature-table');
    await expect(table.locator('th')).toContainText([
      'GIS value',
      'Field value',
      'Difference',
      'Status',
    ]);
    const deviating = table.locator('tbody tr[data-row="1003"]');
    await expect(deviating).toHaveAttribute('data-status', 'deviates');
    await expect(deviating).toContainText('+0.20 m');
    await expect(table.locator('tbody tr[data-row="1002"]')).not.toHaveAttribute(
      'data-status',
      /.+/,
    );
  });
});

/** Move one corner of parcel 1 (ring path [0, index]) east by `metres`, as one command. */
async function moveParcelCorner(page: Page, index: number, metres: number): Promise<void> {
  await page.evaluate(
    ([i, m]) => {
      const parcel = window.editor.layers.getFeatures('parcels').find((f) => f.getId() === 1)!;
      const geometry = parcel.getGeometry()!.clone() as unknown as {
        getCoordinates(): number[][][];
        setCoordinates(c: number[][][]): void;
      };
      const ring = geometry.getCoordinates();
      const corner = ring[0]![i!]!;
      const projection = window.editor.map.getView().getProjection().getCode();
      const moved = window.olcad.offsetMetres(projection, corner, m!, 0);
      ring[0]![i!] = moved;
      if (i === 0) ring[0]![ring[0]!.length - 1] = moved;
      geometry.setCoordinates(ring);
      window.editor.execute(
        window.olcad.updateGeometry(
          parcel,
          geometry as unknown as Parameters<typeof window.olcad.updateGeometry>[1],
        ),
      );
    },
    [index, metres],
  );
}

const staleIds = (page: Page) =>
  page.evaluate(() => window.editor.dimensions.listStale().map((f) => f.getId()));

test.describe('dimension references', () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post('/reset');
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.editor));
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.get('dimensions').featureCount))
      .toBe(4);
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.get('parcels').featureCount))
      .toBe(2);
    await page.evaluate(() => window.editor.setEditMode(true));
  });

  test('a moved corner makes its dimensions stale; Update moves them back onto it', async ({
    page,
  }) => {
    expect(await staleIds(page)).toEqual([]);
    await moveParcelCorner(page, 1, 3);
    await expect.poll(() => staleIds(page)).toEqual([1001]);
    expect((await labels(page))['1001']!.text).toMatch(/^⚠ \(/);
    const updated = await page.evaluate(() => {
      const e = window.editor;
      const dim = e.layers.getFeatures('dimensions').find((f) => f.getId() === 1001)!;
      const before = dim.get('gisValue') as number | undefined;
      const ok = e.dimensions.update(dim);
      return { ok, before, after: dim.get('gisValue') as number, stale: e.dimensions.isStale(dim) };
    });
    expect(updated.ok).toBe(true);
    expect(updated.stale).toBe(false);
    expect(updated.after).toBeCloseTo(146.04 + 3, 0);
    // Undo of the update makes it stale again; the parcel stays moved.
    await page.evaluate(() => window.editor.undo());
    await expect.poll(() => staleIds(page)).toEqual([1001]);
  });

  test('the attribute form and the table offer the stale actions', async ({ page }) => {
    await moveParcelCorner(page, 0, -2); // the corner both seed dimensions start at
    await expect.poll(async () => (await staleIds(page)).sort()).toEqual([1001, 1002]);
    // Detach 1002 in the attribute form.
    await page.evaluate(() => {
      const dim = window.editor.layers.getFeatures('dimensions').find((f) => f.getId() === 1002)!;
      window.editor.selection.set([dim]);
    });
    await openFlyout(page, 'attributes');
    const notice = page.locator('olcad-attribute-form .olcad-attribute-form__notice');
    await expect(notice).toContainText('A measured object changed');
    await notice.locator('[data-action="detach-dimension"]').click();
    await expect.poll(() => staleIds(page)).toEqual([1001]);
    await closeFlyout(page, 'attributes');
    // Update the rest from the table.
    await page.evaluate(() =>
      document
        .querySelector<HTMLElement & { show(id: string): void }>('olcad-feature-table')!
        .show('dimensions'),
    );
    const table = page.locator('olcad-feature-table');
    await expect(table.locator('tbody tr[data-row="1001"]')).toHaveAttribute(
      'data-status',
      'stale',
    );
    const button = table.locator('[data-action="update-stale"]');
    await expect(button).toHaveText('Update 1 stale');
    await button.click();
    await expect.poll(() => staleIds(page)).toEqual([]);
    await expect(button).toBeHidden();
  });

  test('accept rewrites references to new objects to their backend ids', async ({ page }) => {
    const refs = await page.evaluate(() => {
      const e = window.editor;
      const parcel = e.layers.getFeatures('parcels').find((f) => f.getId() === 2)!;
      const copy = new (parcel.constructor as new (g: unknown) => typeof parcel)(
        parcel.getGeometry()!.clone(),
      );
      e.execute(window.olcad.insertFeature('parcels', copy));
      const tempId = copy.getId() as string;
      const ring = (
        copy.getGeometry() as unknown as { getCoordinates(): number[][][] }
      ).getCoordinates()[0]!;
      const DimFeature = parcel.constructor as new (p: Record<string, unknown>) => typeof parcel;
      const line = new (
        e.layers.getFeatures('dimensions')[0]!.getGeometry()!.constructor as new (
          c: number[][],
        ) => unknown
      )([ring[0]!, ring[1]!]);
      const dim = new DimFeature({
        geometry: line,
        dimType: 'aligned',
        offset: -5,
        refs: [
          { layer: 'parcels', id: tempId, kind: 'vertex', path: [0, 0] },
          { layer: 'parcels', id: tempId, kind: 'vertex', path: [0, 1] },
        ],
      });
      e.execute(window.olcad.insertFeature('dimensions', dim));
      e.changes.accept({ idMap: { [tempId]: 777 } });
      return { refs: dim.get('refs'), stale: e.dimensions.isStale(dim) };
    });
    expect(refs.refs.map((r: { id: unknown }) => r.id)).toEqual([777, 777]);
    expect(refs.stale).toBe(false);
  });
});

test.describe('angular and radial dimensions', () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post('/reset');
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.editor));
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.get('parcels').featureCount))
      .toBe(2);
    await page.evaluate(() => {
      const parcel = window.editor.layers.getFeatures('parcels').find((f) => f.getId() === 2)!;
      window.editor.map
        .getView()
        .fit(parcel.getGeometry()!.getExtent(), { padding: [150, 150, 150, 150] });
    });
    await editLayer(page, 'Dimensions');
  });

  test('an angle at a parcel corner by three points, shown in degrees in the table', async ({
    page,
  }) => {
    const ring = await parcelRing(page, 2);
    const angle = await page.evaluate(
      ([se, sw, nw]) => {
        const e = window.editor;
        e.tools.activate('dimension-angular');
        for (const c of [se!, sw!, nw!]) e.input(`${c[0]},${c[1]}`);
        e.input('20 m'); // the arc radius
        e.tools.finish();
        const dim = e.selection.get()[0]!;
        return { gis: dim.get('gisValue') as number, type: dim.get('dimType') as string };
      },
      [ring[1]!, ring[0]!, ring[3]!],
    );
    expect(angle.type).toBe('angular');
    expect(angle.gis).toBeCloseTo(90, 1);
    await page.evaluate(() =>
      document
        .querySelector<HTMLElement & { show(id: string): void }>('olcad-feature-table')!
        .show('dimensions'),
    );
    await expect(page.locator('olcad-feature-table tbody')).toContainText('90.0°');
  });

  test('the angle between two edges picked with the pointer', async ({ page }) => {
    await page.evaluate(() =>
      window.editor.tools.activate('dimension-angular', { method: 'segments' }),
    );
    const ring = await parcelRing(page, 2);
    const mid = (a: number[], b: number[]) => [(a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2];
    const bottom = await screenPoint(page, mid(ring[0]!, ring[1]!));
    const left = await screenPoint(page, mid(ring[0]!, ring[3]!));
    await page.mouse.click(bottom.x, bottom.y);
    await page.mouse.click(left.x, left.y);
    await page.mouse.move(bottom.x, left.y); // inside the parcel's south-west corner
    await page.mouse.click(bottom.x, left.y);
    await page.locator('olcad-input-bar .olcad-input-bar__input').press('Enter');
    const gis = await page.evaluate(
      () => window.editor.selection.get()[0]!.get('gisValue') as number,
    );
    expect(gis).toBeCloseTo(90, 1);
  });

  test('a radius on a circle drawn with the circle tool', async ({ page }) => {
    const ring = await parcelRing(page, 2);
    const centre = [(ring[0]![0]! + ring[2]![0]!) / 2, (ring[0]![1]! + ring[2]![1]!) / 2];
    const edge = await page.evaluate((c) => {
      const e = window.editor;
      e.layers.setActive(null); // the circle goes into the draft layer
      e.tools.activate('circle');
      e.input(`${c[0]},${c[1]}`);
      e.input('25');
      const circle = e.layers.getFeatures(e.layers.getDraft()!)[0]!;
      e.layers.setActive('dimensions');
      e.tools.activate('dimension-radial');
      const ring = (
        circle.getGeometry() as unknown as { getCoordinates(): number[][][] }
      ).getCoordinates()[0]!;
      const [a, b] = [ring[3]!, ring[4]!];
      return [(a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2];
    }, centre);
    const at = await screenPoint(page, edge);
    await page.mouse.click(at.x, at.y);
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.fill('5');
    await input.press('Enter');
    await input.press('Enter');
    const radius = await page.evaluate(() => {
      const dim = window.editor.selection.get()[0]!;
      return { type: dim.get('dimType') as string, gis: dim.get('gisValue') as number };
    });
    expect(radius.type).toBe('radius');
    expect(radius.gis).toBeCloseTo(25, 1);
  });

  test('a surveying layer writes angles in gon', async ({ page }) => {
    const ring = await parcelRing(page, 2);
    const label = await page.evaluate(
      ([se, sw, nw]) => {
        const e = window.editor;
        const id = e.localLayers.create({
          title: 'Survey',
          geometryType: 'LineString',
          fields: [],
          dimension: { preset: 'surveying' },
        });
        e.layers.setActive(id);
        e.tools.activate('dimension-angular');
        for (const c of [se!, sw!, nw!]) e.input(`${c[0]},${c[1]}`);
        e.input('20 m');
        e.input('100.002');
        const dim = e.layers.getFeatures(id)[0]!;
        const layer = e.map
          .getLayers()
          .getArray()
          .find((l) => l.get('olcad:layer') === id) as unknown as {
          getStyleFunction(): (
            f: unknown,
            r: number,
          ) => { getText(): { getText(): string } | null }[];
        };
        return layer
          .getStyleFunction()(dim, 0.05)
          .find((s) => s.getText())!
          .getText()!
          .getText();
      },
      [ring[1]!, ring[0]!, ring[3]!],
    );
    expect(label).toBe('100.0020 gon');
  });
});

test.describe('survey dimensions', () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post('/reset');
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.editor));
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.get('parcels').featureCount))
      .toBe(2);
    await page.evaluate(() => {
      const parcel = window.editor.layers.getFeatures('parcels').find((f) => f.getId() === 2)!;
      window.editor.map
        .getView()
        .fit(parcel.getGeometry()!.getExtent(), { padding: [150, 150, 150, 150] });
    });
    await editLayer(page, 'Dimensions');
  });

  test('a measuring line records corners by station and offset, then the end measure', async ({
    page,
  }) => {
    const ring = await parcelRing(page, 2);
    const result = await page.evaluate(
      ([sw, se, nw]) => {
        const e = window.editor;
        const at = (c: number[]) => e.input(`${c[0]},${c[1]}`);
        e.tools.activate('dimension-survey');
        at(sw!);
        at(se!);
        at(nw!); // station 0, offset = the parcel's height
        e.tools.finish();
        at(se!); // station = the edge length, offset 0
        e.input('131.45 0');
        e.tools.finish(); // end measure
        e.tools.finish();
        const stations = e.layers
          .getFeatures('dimensions')
          .filter((f) => f.get('dimType') === 'station');
        return stations.map((f) => {
          const v = e.dimensions.values(f)!;
          return {
            gis: v.gis!,
            offset: v.second!.gis,
            field: v.field,
            chain: f.get('chain') as string,
          };
        });
      },
      [ring[0]!, ring[1]!, ring[3]!],
    );
    expect(result).toHaveLength(3);
    expect(result[0]!.gis).toBeCloseTo(0, 3);
    expect(Math.abs(result[0]!.offset)).toBeGreaterThan(100);
    expect(result[1]!.gis).toBeCloseTo(131.43, 1);
    expect(result[1]!.field).toBe(131.45);
    expect(result[2]!.gis).toBeCloseTo(result[1]!.gis, 6); // the end measure
    expect(new Set(result.map((r) => r.chain)).size).toBe(1);
  });

  test('two spot levels and the slope between them, picked with the pointer', async ({ page }) => {
    const ring = await parcelRing(page, 2);
    await page.evaluate(
      ([sw, se]) => {
        const e = window.editor;
        const at = (c: number[]) => e.input(`${c[0]},${c[1]}`);
        e.tools.activate('dimension-survey', { method: 'level' });
        at(sw!);
        e.tools.finish();
        e.input('112.45');
        at(se!);
        e.tools.finish();
        e.input('110');
        e.tools.activate('dimension-survey', { method: 'slope' });
      },
      [ring[0]!, ring[1]!],
    );
    const low = await screenPoint(page, ring[1]!);
    const high = await screenPoint(page, ring[0]!);
    await page.mouse.click(low.x, low.y);
    await page.mouse.click(high.x, high.y);
    await page.locator('olcad-input-bar .olcad-input-bar__input').press('Enter');
    const slope = await page.evaluate(() => {
      const e = window.editor;
      const dim = e.layers.getFeatures('dimensions').find((f) => f.get('dimType') === 'slope')!;
      const [from, to] = (
        dim.getGeometry() as unknown as { getCoordinates(): number[][] }
      ).getCoordinates();
      return { gis: dim.get('gisValue') as number, from: from!, to: to! };
    });
    // 2.45 m over the 131.43 m edge, from the higher (south-west) corner downhill.
    expect(slope.gis).toBeCloseTo((2.45 / 131.43) * 100, 1);
    expect(slope.from).toEqual(ring[0]);
    await page.evaluate(() =>
      document
        .querySelector<HTMLElement & { show(id: string): void }>('olcad-feature-table')!
        .show('dimensions'),
    );
    await expect(page.locator('olcad-feature-table tbody')).toContainText('1.9 %');
    await expect(page.locator('olcad-feature-table tbody')).toContainText('+112.45');
  });
});
