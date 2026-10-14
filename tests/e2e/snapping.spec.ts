import { expect, test, type Page } from '@playwright/test';
import { insertInto } from './flyout';
import type LineString from 'ol/geom/LineString';
import type Point from 'ol/geom/Point';
import type Polygon from 'ol/geom/Polygon';

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.editor));
}

async function waitForLayer(page: Page, id: string, count: number): Promise<void> {
  await expect
    .poll(() => page.evaluate((layer) => window.editor.layers.get(layer).featureCount, id))
    .toBe(count);
}

/** Main Street (id 815): its first vertex and the midpoint of its only segment, as pixels. */
async function roadPoints(page: Page) {
  return page.evaluate(() => {
    const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
    const [a, b] = (road.getGeometry() as LineString).getCoordinates();
    const mid = [(a![0]! + b![0]!) / 2, (a![1]! + b![1]!) / 2];
    const px = (c: number[]) => window.editor.map.getPixelFromCoordinate(c);
    return { vertex: a!, vertexPx: px(a!), mid, midPx: px(mid) };
  });
}

const lastHydrant = (page: Page) =>
  page.evaluate(() => {
    const features = window.editor.layers.getFeatures('hydrants');
    return (features[features.length - 1]!.getGeometry() as Point).getCoordinates();
  });

test.describe('snapping', () => {
  test.afterEach(async ({ request }) => {
    await request.post('/reset');
  });

  test('the cursor jumps to vertices and midpoints and placed points land there', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await waitForLayer(page, 'hydrants', 2);
    const toggle = page.locator('olcad-snap-settings .olcad-snap-settings__toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true'); // on by default
    await insertInto(page, 'Hydrants'); // edit mode + draw
    const points = await roadPoints(page);
    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    const at = (px: number[], dx: number, dy: number) =>
      page.mouse.move(viewport.x + px[0]! + dx, viewport.y + px[1]! + dy);

    // 6 px beside the first vertex: the crosshair sits on the vertex, marker = vertex.
    await at(points.vertexPx, 6, 4);
    const marker = page.locator('.olcad-crosshair__snap');
    await expect(marker).toBeVisible();
    await expect(marker).toHaveAttribute('data-mode', 'vertex');
    // The crosshair pivot sits on the vertex pixel, not on the pointer (6 px away).
    const pivot = await page.evaluate(() => {
      const transform = getComputedStyle(
        document.querySelector('.olcad-crosshair__pivot')!,
      ).transform;
      const [, , , , tx, ty] = transform
        .replace(/matrix\((.*)\)/, '$1')
        .split(',')
        .map(Number);
      return [tx, ty];
    });
    expect(Math.abs(pivot[0]! - points.vertexPx[0]!)).toBeLessThan(1);
    expect(Math.abs(pivot[1]! - points.vertexPx[1]!)).toBeLessThan(1);
    await page.mouse.click(
      viewport.x + points.vertexPx[0]! + 6,
      viewport.y + points.vertexPx[1]! + 4,
    );
    await waitForLayer(page, 'hydrants', 3);
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();
    let placed = await lastHydrant(page);
    expect(placed[0]).toBeCloseTo(points.vertex[0]!, 6);
    expect(placed[1]).toBeCloseTo(points.vertex[1]!, 6);

    // Midpoints only: near the middle of the road the marker is a midpoint.
    await page.locator('.olcad-snap-settings__mode[data-mode="vertex"] input').uncheck();
    await page.locator('.olcad-snap-settings__mode[data-mode="perpendicular"] input').uncheck();
    await page.locator('.olcad-snap-settings__mode[data-mode="tangent"] input').uncheck();
    expect(await page.evaluate(() => window.editor.snapping.getModes())).toEqual(['midpoint']);
    await at(points.midPx, 5, -5);
    await expect(marker).toHaveAttribute('data-mode', 'midpoint');
    await page.mouse.click(viewport.x + points.midPx[0]! + 5, viewport.y + points.midPx[1]! - 5);
    await waitForLayer(page, 'hydrants', 4);
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();
    placed = await lastHydrant(page);
    expect(placed[0]).toBeCloseTo(points.mid[0]!, 6);
    expect(placed[1]).toBeCloseTo(points.mid[1]!, 6);

    // Smaller radius: 5 px away is outside 2 px, no snap.
    await page.locator('.olcad-snap-settings__tolerance').fill('2');
    await page.locator('.olcad-snap-settings__tolerance').press('Enter');
    expect(await page.evaluate(() => window.editor.snapping.getTolerance())).toBe(2);
    await at(points.midPx, 5, -5);
    await expect(marker).toBeHidden();

    // Snapping off: no marker, the point lands where the pointer is.
    await page.locator('.olcad-snap-settings__tolerance').fill('12');
    await page.locator('.olcad-snap-settings__tolerance').press('Enter');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await at(points.midPx, 5, -5);
    await expect(marker).toBeHidden();
    await page.mouse.click(viewport.x + points.midPx[0]! + 5, viewport.y + points.midPx[1]! - 5);
    await waitForLayer(page, 'hydrants', 5);
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();
    placed = await lastHydrant(page);
    expect(Math.abs(placed[0]! - points.mid[0]!)).toBeGreaterThan(1);
  });

  test('the snapping API and event work headless', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    const result = await page.evaluate(() => {
      const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
      const [a] = (road.getGeometry() as LineString).getCoordinates();
      const resolution = window.editor.map.getView().getResolution()!;
      const events: unknown[] = [];
      window.editor.on('snappingchange', (e) => events.push(e));
      window.editor.snapping.setTolerance(20);
      const hit = window.editor.snapping.snap([a![0]! + 5 * resolution, a![1]!]);
      window.editor.snapping.setEnabled(false);
      const miss = window.editor.snapping.snap([a![0]! + 5 * resolution, a![1]!]);
      return {
        hit: hit && { mode: hit.mode, layer: hit.layer, coordinate: hit.coordinate },
        miss,
        events,
      };
    });
    expect(result.hit).toMatchObject({ mode: 'vertex', layer: 'roads' });
    expect(result.miss).toBeNull();
    const modes = ['vertex', 'midpoint', 'perpendicular', 'tangent']; // the test config's list
    expect(result.events).toEqual([
      { enabled: true, tolerancePx: 20, modes },
      { enabled: false, tolerancePx: 20, modes },
    ]);
  });
});

test.describe('perpendicular snapping', () => {
  test.afterEach(async ({ request }) => {
    await request.post('/reset');
  });

  test('a drawn line meets the existing road at a right angle', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await insertInto(page, 'Roads'); // edit mode + draw
    await page.locator('.olcad-snap-settings__mode[data-mode="vertex"] input').uncheck();
    await page.locator('.olcad-snap-settings__mode[data-mode="midpoint"] input').uncheck();
    await page.locator('.olcad-snap-settings__mode[data-mode="tangent"] input').uncheck();
    expect(await page.evaluate(() => window.editor.snapping.getModes())).toEqual(['perpendicular']);

    const road = await page.evaluate(() => {
      const main = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
      const [a, b] = (main.getGeometry() as LineString).getCoordinates();
      const px = (c: number[]) => window.editor.map.getPixelFromCoordinate(c);
      return { a: a!, b: b!, aPx: px(a!), bPx: px(b!) };
    });
    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    const marker = page.locator('.olcad-crosshair__snap');
    // Main Street runs west to east; start 60 px below it, 30 px right of its first vertex.
    const start = { x: viewport.x + road.aPx[0]! + 30, y: viewport.y + road.aPx[1]! + 60 };
    // Before the first vertex nothing can be perpendicular: no marker near the road.
    await page.mouse.move(start.x, viewport.y + road.aPx[1]! + 4);
    await expect(marker).toBeHidden();
    await page.mouse.click(start.x, start.y);
    // Now the foot of the perpendicular is 60 px straight up; approach it 7 px off.
    await page.mouse.move(start.x + 7, viewport.y + road.aPx[1]! + 3, { steps: 4 });
    await expect(marker).toBeVisible();
    await expect(marker).toHaveAttribute('data-mode', 'perpendicular');
    await page.mouse.click(start.x + 7, viewport.y + road.aPx[1]! + 3);
    await page.keyboard.press('Enter');
    await waitForLayer(page, 'roads', 3);
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();

    const check = await page.evaluate(() => {
      const roads = window.editor.layers.getFeatures('roads');
      const drawn = (roads[roads.length - 1]!.getGeometry() as LineString).getCoordinates();
      const main = roads.find((f) => f.getId() === 815)!;
      const [a, b] = (main.getGeometry() as LineString).getCoordinates();
      const dir = [b![0]! - a![0]!, b![1]! - a![1]!];
      const len = Math.hypot(dir[0]!, dir[1]!);
      const u = [dir[0]! / len, dir[1]! / len];
      const [p, q] = drawn;
      const d = [q![0]! - p![0]!, q![1]! - p![1]!];
      const dl = Math.hypot(d[0]!, d[1]!);
      const dot = (d[0]! * u[0]! + d[1]! * u[1]!) / dl;
      // Distance of the second vertex from the infinite line through Main Street.
      const cross = Math.abs((q![0]! - a![0]!) * u[1]! - (q![1]! - a![1]!) * u[0]!);
      return { vertices: drawn.length, dot, cross };
    });
    expect(check.vertices).toBe(2);
    expect(Math.abs(check.dot)).toBeLessThan(1e-6);
    expect(check.cross).toBeLessThan(1e-6);
  });
});

test.describe('tangent snapping', () => {
  test.afterEach(async ({ request }) => {
    await request.post('/reset');
  });

  test('a drawn line touches a circle at a vertex of its ring', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    const toScreen = async (coordinate: number[]) => {
      const pixel = await page.evaluate(
        (c) => window.editor.map.getPixelFromCoordinate(c),
        coordinate,
      );
      return { x: viewport.x + pixel[0]!, y: viewport.y + pixel[1]! };
    };
    // A circle of 150 m in the draft layer, well away from the roads.
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    await page.locator('olcad-toolbar .olcad-toolbar__tool--circle').click();
    const { midPx } = await roadPoints(page);
    await page.mouse.click(viewport.x + midPx[0]! + 150, viewport.y + midPx[1]! + 150);
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.fill('150');
    await input.press('Enter');
    const ring = await expect
      .poll(() =>
        page.evaluate(() => {
          const features = window.editor.layers.getFeatures(window.editor.layers.getDraft()!);
          const last = features[features.length - 1];
          return last ? (last.getGeometry() as Polygon).getCoordinates()[0]! : null;
        }),
      )
      .not.toBeNull()
      .then(() =>
        page.evaluate(() => {
          const features = window.editor.layers.getFeatures(window.editor.layers.getDraft()!);
          return (features[features.length - 1]!.getGeometry() as Polygon).getCoordinates()[0]!;
        }),
      );
    const vertices = ring.slice(0, -1);
    const centre = [
      vertices.reduce((sum, [x]) => sum + x!, 0) / vertices.length,
      vertices.reduce((sum, [, y]) => sum + y!, 0) / vertices.length,
    ];
    const radius = Math.hypot(vertices[0]![0]! - centre[0]!, vertices[0]![1]! - centre[1]!);

    await insertInto(page, 'Roads');
    await page.locator('.olcad-snap-settings__mode[data-mode="vertex"] input').uncheck();
    await page.locator('.olcad-snap-settings__mode[data-mode="midpoint"] input').uncheck();
    await page.locator('.olcad-snap-settings__mode[data-mode="perpendicular"] input').uncheck();
    expect(await page.evaluate(() => window.editor.snapping.getModes())).toEqual(['tangent']);

    // The first vertex lies east of the circle, three radii from the centre.
    const reference = [centre[0]! + 3 * radius, centre[1]!];
    const marker = page.locator('.olcad-crosshair__snap');
    const start = await toScreen(reference);
    // Before the first vertex nothing can be tangent: no marker on the ring.
    const east = await toScreen([centre[0]! + radius, centre[1]!]);
    await page.mouse.move(east.x + 3, east.y, { steps: 4 });
    await expect(marker).toBeHidden();
    await page.mouse.click(start.x, start.y);
    // The upper tangent point: the radius there is at acos(1 / 3) from the line to the reference.
    const angle = Math.acos(1 / 3);
    const expected = [centre[0]! + radius * Math.cos(angle), centre[1]! + radius * Math.sin(angle)];
    const at = await toScreen(expected);
    await page.mouse.move(at.x + 5, at.y - 4, { steps: 4 });
    await expect(marker).toBeVisible();
    await expect(marker).toHaveAttribute('data-mode', 'tangent');
    await page.mouse.click(at.x + 5, at.y - 4);
    await page.keyboard.press('Enter');
    await waitForLayer(page, 'roads', 3);
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();

    const drawn = await page.evaluate(() => {
      const roads = window.editor.layers.getFeatures('roads');
      return (roads[roads.length - 1]!.getGeometry() as LineString).getCoordinates();
    });
    expect(drawn).toHaveLength(2);
    const [, touch] = drawn;
    expect(ring).toContainEqual(touch);
    // The line from the reference meets the radius at a right angle, up to the chord angle.
    const rx = touch![0]! - centre[0]!;
    const ry = touch![1]! - centre[1]!;
    const lx = touch![0]! - reference[0]!;
    const ly = touch![1]! - reference[1]!;
    const cos = Math.abs(rx * lx + ry * ly) / (Math.hypot(rx, ry) * Math.hypot(lx, ly));
    expect(cos).toBeLessThan(Math.sin(Math.PI / vertices.length));
  });
});
