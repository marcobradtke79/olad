import { expect, test, type Page } from '@playwright/test';
import { insertInto } from './flyout';
import type LineString from 'ol/geom/LineString';
import type Polygon from 'ol/geom/Polygon';

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

/** Midpoint of the road with the given id, in the view projection. */
const roadMidpoint = (page: Page, id: number) =>
  page.evaluate((roadId) => {
    const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === roadId)!;
    const [a, b] = (road.getGeometry() as LineString).getCoordinates();
    return [(a![0]! + b![0]!) / 2, (a![1]! + b![1]!) / 2];
  }, id);

/** The input bar's output line: tool prompts and messages. */
const output = (page: Page) => page.locator('olcad-input-bar .olcad-input-bar__output');

async function renderSettled(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.editor.map.once('rendercomplete', () => resolve());
        window.editor.map.render();
      }),
  );
}

test.describe('tools', () => {
  test.afterEach(async ({ request }) => {
    await request.post('/reset');
  });

  test('tool buttons follow edit mode, active layer and selection', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    const tool = (id: string) => page.locator(`olcad-toolbar .olcad-toolbar__tool--${id}`);
    await expect(tool('select')).toBeDisabled();
    expect(await page.evaluate(() => window.editor.tools.list())).toEqual([
      'select',
      'draw',
      'rectangle',
      'circle',
      'ellipse',
      'regular-polygon',
      'curve',
      'parallel',
      'text',
      'dimension-linear',
      'modify',
      'move',
      'rotate',
      'scale',
      'offset',
      'trim',
      'extend',
      'mirror',
      'template-copy',
      'template-insert',
      'measure-distance',
      'measure-area',
      'measure-angle',
    ]);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    await expect(tool('select')).toBeEnabled();
    // No active layer: every draw button draws into the draft layer.
    await expect(tool('draw-point')).toBeEnabled();
    await expect(tool('draw-line')).toBeEnabled();
    await expect(tool('draw-polygon')).toBeEnabled();
    await expect(tool('modify')).toBeEnabled(); // the vertex tool selects its object itself
    // Insert starts placing: the draw tool is active right away with the layer's type; the
    // matching button is pressed, the other types are not available on a line layer.
    await insertInto(page, 'Roads');
    await expect(tool('draw-line')).toHaveAttribute('aria-pressed', 'true');
    await expect(tool('draw-point')).toBeDisabled();
    await expect(tool('draw-polygon')).toBeDisabled();
    expect(await page.evaluate(() => window.editor.tools.getActive())).toBe('draw');
    expect(await page.evaluate(() => window.editor.tools.getActiveOptions())).toEqual({
      type: 'LineString',
    });
    await tool('draw-line').click();
    expect(await page.evaluate(() => window.editor.tools.getActive())).toBeNull();
    await expect(tool('draw-line')).toBeEnabled();
    await tool('draw-line').click();
    await expect(tool('draw-line')).toHaveAttribute('aria-pressed', 'true');
    // Leaving edit mode deactivates the tool.
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    expect(await page.evaluate(() => window.editor.tools.getActive())).toBeNull();
    await expect(tool('draw-line')).toBeDisabled();
  });

  test('draw inserts a line into the active layer through a command', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    await insertInto(page, 'Roads'); // activates draw
    expect(await page.evaluate(() => window.editor.tools.getActive())).toBe('draw');
    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    const cx = viewport.x + viewport.width * 0.3;
    const cy = viewport.y + viewport.height * 0.7;
    await page.mouse.click(cx, cy);
    await page.mouse.click(cx + 60, cy - 20);
    await page.mouse.click(cx + 120, cy + 10);
    // Backspace removes the last vertex, Enter finishes the drawing.
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Enter');
    await waitForLayer(page, 'roads', 3);
    await page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later').click();
    const change = await page.evaluate(() => window.editor.changes.get().changes[0]);
    expect(change).toMatchObject({ op: 'insert', layer: 'roads', crs: 'EPSG:4326' });
    expect((change as { geometry: { coordinates: number[][] } }).geometry.coordinates).toHaveLength(
      2,
    );
    // Escape aborts a drawing in progress; the tool stays active.
    await page.mouse.click(cx, cy + 40);
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.editor.tools.getActive())).toBe('draw');
    await waitForLayer(page, 'roads', 3);
    expect(await page.evaluate(() => window.editor.changes.get().changes.length)).toBe(1);
  });

  test('select, move, modify and delete act on the selection', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await waitForLayer(page, 'parcels', 2);
    await renderSettled(page);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    await page.locator('olcad-toolbar .olcad-toolbar__tool--select').click();

    // Click selects Main Street (id 815), the toolbar enables modify, move and delete.
    const mid = await roadMidpoint(page, 815);
    const at = await screenPoint(page, mid);
    await page.mouse.click(at.x, at.y);
    await expect
      .poll(() => page.evaluate(() => window.editor.selection.get().map((f) => f.getId())))
      .toEqual([815]);
    await expect(page.locator('olcad-toolbar .olcad-toolbar__tool--move')).toBeEnabled();
    await expect(page.locator('olcad-toolbar .olcad-toolbar__tool--delete')).toBeEnabled();

    // Move: base point on the road, second point 40 px right and down; one update command.
    await page.locator('olcad-toolbar .olcad-toolbar__tool--move').click();
    await expect(output(page)).toContainText('Base point');
    await page.mouse.click(at.x, at.y);
    await expect(output(page)).toContainText('Second point');
    await page.mouse.move(at.x + 20, at.y + 20, { steps: 3 });
    await page.mouse.click(at.x + 40, at.y + 40);
    await expect(output(page)).toContainText('Select the objects'); // done: deselected
    await expect
      .poll(() => page.evaluate(() => window.editor.changes.get().changes.length))
      .toBe(1);
    expect(await page.evaluate(() => window.editor.changes.get().changes[0])).toMatchObject({
      op: 'update',
      id: 815,
      changed: ['geometry'],
    });
    const moved = await roadMidpoint(page, 815);
    expect(moved[0]).toBeGreaterThan(mid[0]!);
    expect(moved[1]).toBeLessThan(mid[1]!);

    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(0);
    // The move deselected the road: pick it again for the vertex edit.
    await page.locator('olcad-toolbar .olcad-toolbar__tool--select').click();
    const movedAt = await screenPoint(page, moved);
    await page.mouse.click(movedAt.x, movedAt.y);
    await expect
      .poll(() => page.evaluate(() => window.editor.selection.get().map((f) => f.getId())))
      .toEqual([815]);
    // Modify: pick the first vertex of the moved road and place it 30 px left and down.
    await page.locator('olcad-toolbar .olcad-toolbar__tool--modify').click();
    await expect(output(page)).toContainText('Click a vertex');
    const first = await page.evaluate(() => {
      const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
      return (road.getGeometry() as LineString).getFirstCoordinate();
    });
    const vertex = await screenPoint(page, first);
    await page.mouse.click(vertex.x, vertex.y);
    await expect(output(page)).toContainText('New position');
    await page.mouse.move(vertex.x - 15, vertex.y + 15, { steps: 3 });
    await page.mouse.click(vertex.x - 30, vertex.y + 30);
    await expect(output(page)).toContainText('Click a vertex');
    await expect
      .poll(() =>
        page.evaluate(() => window.editor.canUndo() && window.editor.changes.get().changes.length),
      )
      .toBe(1);
    const after = await page.evaluate(() => {
      const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
      return (road.getGeometry() as LineString).getFirstCoordinate();
    });
    expect(after[0]).toBeLessThan(first[0]!);
    // Undo restores the vertex; the road stays selected for the next step.
    await page.keyboard.press('Control+z');
    const undone = await page.evaluate(() => {
      const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
      return (road.getGeometry() as LineString).getFirstCoordinate();
    });
    expect(undone[0]).toBeCloseTo(first[0]!, 3);
    expect(await page.evaluate(() => window.editor.selection.get().map((f) => f.getId()))).toEqual([
      815,
    ]);

    // Delete key removes the selected road; parcels (no delete) stay.
    await page.evaluate(() => {
      const parcel = window.editor.layers.getFeatures('parcels')[0]!;
      window.editor.selection.add(parcel);
    });
    await page.keyboard.press('Delete');
    await waitForLayer(page, 'roads', 1);
    await waitForLayer(page, 'parcels', 2);
    expect(await page.evaluate(() => window.editor.selection.get().map((f) => f.getId()))).toEqual([
      await page.evaluate(() => window.editor.layers.getFeatures('parcels')[0]!.getId()),
    ]);
    expect(await page.evaluate(() => window.editor.changes.get().changes.map((c) => c.op))).toEqual(
      ['delete'],
    );

    // Box selection with Ctrl+drag (Cmd on macOS) over the whole map selects features of
    // visible layers.
    await page.locator('olcad-toolbar .olcad-toolbar__tool--select').click();
    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    const platformModifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.down(platformModifier);
    await page.mouse.move(viewport.x + 5, viewport.y + 5);
    await page.mouse.down();
    await page.mouse.move(viewport.x + viewport.width - 5, viewport.y + viewport.height - 5, {
      steps: 5,
    });
    await page.mouse.up();
    await page.keyboard.up(platformModifier);
    await expect
      .poll(() => page.evaluate(() => window.editor.selection.get().length))
      .toBeGreaterThan(3);
    // Escape in the select tool clears the selection.
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => window.editor.selection.get().length)).toBe(0);
  });

  test('move asks for objects, takes a base point and a typed displacement', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await renderSettled(page);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    const move = page.locator('olcad-toolbar .olcad-toolbar__tool--move');
    await expect(move).toBeEnabled(); // no selection needed
    await move.click();
    await expect(output(page)).toContainText('Select the objects');
    const mid = await roadMidpoint(page, 815);
    const at = await screenPoint(page, mid);
    await page.mouse.click(at.x, at.y);
    await expect
      .poll(() => page.evaluate(() => window.editor.selection.get().map((f) => f.getId())))
      .toEqual([815]);
    await page.keyboard.press('Enter');
    await expect(output(page)).toContainText('Base point');
    // The base point may lie anywhere: 80 px below the road.
    await page.mouse.click(at.x, at.y + 80);
    await expect(output(page)).toContainText('Second point');
    const base = await page.evaluate(
      ([x, y]) => window.editor.map.getCoordinateFromPixel([x!, y!]),
      [at.x, at.y + 80],
    );
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.fill('@50<0');
    await input.press('Enter');
    await expect
      .poll(() => page.evaluate(() => window.editor.changes.get().changes.length))
      .toBe(1);
    const moved = await roadMidpoint(page, 815);
    const expectedDx = await page.evaluate(
      (c) => 50 * window.olcad.unitsPerMetre('EPSG:3857', c),
      base,
    );
    expect(Math.abs(moved[0]! - mid[0]! - expectedDx)).toBeLessThan(0.05);
    expect(Math.abs(moved[1]! - mid[1]!)).toBeLessThan(1e-6);
    // The output line echoes the typed input; the tool itself is done: deselected and asking
    // for the next objects.
    await expect(output(page)).toContainText('@50<0 →');
    expect(await page.evaluate(() => window.editor.tools.getPrompt())).toContain(
      'Select the objects',
    );
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(0);
  });

  test('vertex tool inserts, removes and drops vertices and finishes on Enter', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await renderSettled(page);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    await page.locator('olcad-toolbar .olcad-toolbar__tool--modify').click();
    await expect(output(page)).toContainText('Select the object');
    const vertexCount = () =>
      page.evaluate(() => {
        const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
        return (road.getGeometry() as LineString).getCoordinates().length;
      });
    const before = await vertexCount();

    // Click the road: it becomes the object, its grips show, the prompt moves on.
    const mid = await roadMidpoint(page, 815);
    const at = await screenPoint(page, mid);
    await page.mouse.click(at.x, at.y);
    await expect
      .poll(() => page.evaluate(() => window.editor.selection.get().map((f) => f.getId())))
      .toEqual([815]);
    await expect(output(page)).toContainText('Click a vertex');

    // A click on the segment picks up a new vertex there; placing it adds one vertex.
    await page.mouse.click(at.x, at.y);
    await expect(output(page)).toContainText('New position');
    await page.mouse.move(at.x + 10, at.y + 10, { steps: 3 });
    await page.mouse.click(at.x + 20, at.y + 20);
    await expect.poll(vertexCount).toBe(before + 1);
    expect(await page.evaluate(() => window.editor.changes.get().changes.length)).toBe(1);

    // Escape drops a picked vertex without a command.
    await page.mouse.click(at.x + 20, at.y + 20);
    await expect(output(page)).toContainText('New position');
    await page.keyboard.press('Escape');
    await expect(output(page)).toContainText('Click a vertex');
    expect(await vertexCount()).toBe(before + 1);

    // Alt+click removes the inserted vertex again; the net change set is empty.
    await page.keyboard.down('Alt');
    await page.mouse.click(at.x + 20, at.y + 20);
    await page.keyboard.up('Alt');
    await expect.poll(vertexCount).toBe(before);
    expect(await page.evaluate(() => window.editor.changes.get().changes.length)).toBe(0);
    expect(await page.evaluate(() => window.editor.canUndo())).toBe(true);

    // Enter finishes: the object is deselected and the tool asks for the next one.
    await page.keyboard.press('Enter');
    await expect(output(page)).toContainText('Select the object');
    await expect.poll(() => page.evaluate(() => window.editor.selection.get().length)).toBe(0);
    await expect(page.locator('olcad-toolbar .olcad-toolbar__tool--modify')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('rotate asks for objects, takes a centre and two points spanning the angle', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await renderSettled(page);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    const rotate = page.locator('olcad-toolbar .olcad-toolbar__tool--rotate');
    await expect(rotate).toBeEnabled(); // no selection needed
    await rotate.click();
    await expect(output(page)).toContainText('Select the objects');
    const mid = await roadMidpoint(page, 815);
    const at = await screenPoint(page, mid);
    await page.mouse.click(at.x, at.y);
    await expect
      .poll(() => page.evaluate(() => window.editor.selection.get().map((f) => f.getId())))
      .toEqual([815]);
    const first = await page.evaluate(() => {
      const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
      return (road.getGeometry() as LineString).getFirstCoordinate();
    });
    await page.keyboard.press('Enter');
    await expect(output(page)).toContainText('Centre of rotation');
    // Centre typed as absolute coordinates (the road's midpoint), then the two legs of a
    // 90° angle as polar offsets: east, then north.
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    await input.fill(`${mid[0]},${mid[1]}`);
    await input.press('Enter');
    await expect.poll(prompt).toContain('First point'); // the output line echoes the input
    await input.fill('@100<0');
    await input.press('Enter');
    await expect.poll(prompt).toContain('Second point');
    await input.fill('@100<90');
    await input.press('Enter');
    await expect
      .poll(() => page.evaluate(() => window.editor.changes.get().changes.length))
      .toBe(1);
    const after = await page.evaluate(() => {
      const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
      return (road.getGeometry() as LineString).getFirstCoordinate();
    });
    // 90° counter-clockwise around the midpoint: (dx, dy) becomes (-dy, dx).
    const dx = first[0]! - mid[0]!;
    const dy = first[1]! - mid[1]!;
    expect(after[0]).toBeCloseTo(mid[0]! - dy, 3);
    expect(after[1]).toBeCloseTo(mid[1]! + dx, 3);
    // Done: deselected and asking for the next objects.
    await expect.poll(prompt).toContain('Select the objects');
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(0);
  });

  test('rectangle takes a first corner and a typed opposite corner, following the straightedge', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await renderSettled(page);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    const button = page.locator('olcad-toolbar .olcad-toolbar__tool--rectangle');
    await expect(button).toBeEnabled(); // no active layer: the draft layer takes polygons
    await button.click();
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    await expect.poll(prompt).toContain('First corner');
    const draftCount = () =>
      page.evaluate(
        () => window.editor.layers.getFeatures(window.editor.layers.getDraft()!).length,
      );
    const lastDraftRing = () =>
      page.evaluate(() => {
        const features = window.editor.layers.getFeatures(window.editor.layers.getDraft()!);
        return (features[features.length - 1]!.getGeometry() as Polygon).getCoordinates()[0]!;
      });
    // First corner by click away from the roads, opposite corner typed: 100 m east, 50 m north.
    const mid = await roadMidpoint(page, 815);
    const at = await screenPoint(page, mid);
    await page.mouse.click(at.x + 120, at.y + 120);
    await expect.poll(prompt).toContain('Opposite corner');
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.fill('@100,50');
    await input.press('Enter');
    await expect.poll(draftCount).toBe(1);
    const ring = await lastDraftRing();
    expect(ring).toHaveLength(5);
    const perMetre = await page.evaluate(
      (c) => window.olcad.unitsPerMetre('EPSG:3857', c),
      ring[0]!,
    );
    const length = (i: number) =>
      Math.hypot(ring[i + 1]![0]! - ring[i]![0]!, ring[i + 1]![1]! - ring[i]![1]!);
    expect(Math.abs(length(0) - 100 * perMetre)).toBeLessThan(0.05);
    expect(Math.abs(length(1) - 50 * perMetre)).toBeLessThan(0.05);
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(1);
    await expect.poll(prompt).toContain('First corner');
    // Draft objects never reach the change set.
    expect(await page.evaluate(() => window.editor.changes.get().changes.length)).toBe(0);

    // With the straightedge at 30° the sides follow it.
    await page.evaluate(() => window.editor.straightedge.setAngle(30));
    await page.mouse.click(at.x - 150, at.y + 150);
    await page.mouse.move(at.x - 100, at.y + 100, { steps: 3 });
    await page.mouse.click(at.x - 60, at.y + 120);
    await expect.poll(draftCount).toBe(2);
    const rotated = await lastDraftRing();
    const angle =
      ((Math.atan2(rotated[1]![1]! - rotated[0]![1]!, rotated[1]![0]! - rotated[0]![0]!) * 180) /
        Math.PI +
        360) %
      90;
    expect(angle).toBeCloseTo(30, 3);
  });

  test('circle takes a centre and a typed radius, and three points through the flyout', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await renderSettled(page);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    const button = page.locator('olcad-toolbar .olcad-toolbar__tool--circle');
    await expect(button).toBeEnabled(); // no active layer: the draft layer takes polygons
    await expect(button).toHaveAttribute('data-method', 'centre-radius');
    await button.click();
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    await expect.poll(prompt).toContain('Centre');
    const draftCount = () =>
      page.evaluate(
        () => window.editor.layers.getFeatures(window.editor.layers.getDraft()!).length,
      );
    const lastDraftRing = () =>
      page.evaluate(() => {
        const features = window.editor.layers.getFeatures(window.editor.layers.getDraft()!);
        return (features[features.length - 1]!.getGeometry() as Polygon).getCoordinates()[0]!;
      });
    // The centre of a regular ring is the mean of its vertices.
    const fit = (ring: number[][]) => {
      const vertices = ring.slice(0, -1);
      const centre = [
        vertices.reduce((sum, [x]) => sum + x!, 0) / vertices.length,
        vertices.reduce((sum, [, y]) => sum + y!, 0) / vertices.length,
      ];
      const radii = vertices.map(([x, y]) => Math.hypot(x! - centre[0]!, y! - centre[1]!));
      return { centre, radius: radii[0]!, spread: Math.max(...radii) - Math.min(...radii) };
    };

    // Centre by click away from the roads, radius typed: 50 m.
    const mid = await roadMidpoint(page, 815);
    const at = await screenPoint(page, mid);
    await page.mouse.click(at.x + 120, at.y + 120);
    await expect.poll(prompt).toContain('Radius');
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.fill('50');
    await input.press('Enter');
    await expect.poll(draftCount).toBe(1);
    const ring = await lastDraftRing();
    expect(ring.length).toBeGreaterThanOrEqual(25);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    const circle = fit(ring);
    const perMetre = await page.evaluate(
      (c) => window.olcad.unitsPerMetre('EPSG:3857', c),
      circle.centre,
    );
    expect(Math.abs(circle.radius - 50 * perMetre)).toBeLessThan(0.05);
    expect(circle.spread).toBeLessThan(0.001);
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(1);
    await expect.poll(prompt).toContain('Centre');
    expect(await page.evaluate(() => window.editor.changes.get().changes.length)).toBe(0);

    // The triangle opens the flyout; the three-point variant is chosen and activated.
    const flyout = page.locator('olcad-toolbar .olcad-toolbar__flyout--circle');
    const menu = flyout.locator('.olcad-toolbar__flyout-menu');
    await expect(menu).toBeHidden();
    await flyout.locator('.olcad-toolbar__flyout-toggle').click();
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute('role', 'menu');
    await menu.locator('[data-variant="three-point"]').click();
    await expect(menu).toBeHidden();
    await expect(button).toHaveAttribute('data-method', 'three-point');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.editor.tools.getActiveOptions())).toEqual({
      method: 'three-point',
    });
    await expect.poll(prompt).toContain('First point');
    const clicks = [
      [at.x - 150, at.y + 150],
      [at.x - 50, at.y + 150],
      [at.x - 100, at.y + 90],
    ];
    for (const [x, y] of clicks) await page.mouse.click(x!, y!);
    await expect.poll(draftCount).toBe(2);
    const three = fit(await lastDraftRing());
    expect(three.spread).toBeLessThan(0.001);
    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    for (const [x, y] of clicks) {
      const point = await page.evaluate(
        (pixel) => window.editor.map.getCoordinateFromPixel(pixel),
        [x! - viewport.x, y! - viewport.y],
      );
      const distance = Math.hypot(point[0]! - three.centre[0]!, point[1]! - three.centre[1]!);
      expect(Math.abs(distance - three.radius)).toBeLessThan(0.05);
    }
    await expect.poll(prompt).toContain('First point');
  });

  test('regular polygon takes a side count, a centre and a vertex', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await renderSettled(page);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    const button = page.locator('olcad-toolbar .olcad-toolbar__tool--regular-polygon');
    await expect(button).toBeEnabled(); // no active layer: the draft layer takes polygons
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    await expect.poll(prompt).toContain('Number of sides <6>');
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    // An invalid count is refused with a message; the prompt stays.
    await input.fill('2');
    await input.press('Enter');
    await expect(output(page)).toHaveAttribute('data-kind', 'error');
    await expect.poll(prompt).toContain('Number of sides <6>');
    await input.fill('5');
    await input.press('Enter');
    await expect(output(page)).toHaveText('5 → 5');
    await expect.poll(prompt).toContain('Centre');
    // Centre by click away from the roads, circumradius typed: 40 m.
    const mid = await roadMidpoint(page, 815);
    const at = await screenPoint(page, mid);
    await page.mouse.click(at.x + 120, at.y + 120);
    await expect.poll(prompt).toContain('Vertex');
    await input.fill('40');
    await input.press('Enter');
    const draftCount = () =>
      page.evaluate(
        () => window.editor.layers.getFeatures(window.editor.layers.getDraft()!).length,
      );
    await expect.poll(draftCount).toBe(1);
    const ring = await page.evaluate(() => {
      const features = window.editor.layers.getFeatures(window.editor.layers.getDraft()!);
      return (features[0]!.getGeometry() as Polygon).getCoordinates()[0]!;
    });
    expect(ring).toHaveLength(6); // five vertices plus the closing one
    expect(ring[0]).toEqual(ring[5]);
    const vertices = ring.slice(0, 5);
    const centre = [
      vertices.reduce((sum, [x]) => sum + x!, 0) / 5,
      vertices.reduce((sum, [, y]) => sum + y!, 0) / 5,
    ];
    const perMetre = await page.evaluate((c) => window.olcad.unitsPerMetre('EPSG:3857', c), centre);
    const edges: number[] = [];
    for (let i = 0; i < 5; i++) {
      const [x, y] = vertices[i]!;
      expect(Math.abs(Math.hypot(x! - centre[0]!, y! - centre[1]!) - 40 * perMetre)).toBeLessThan(
        0.05,
      );
      const [nx, ny] = ring[i + 1]!;
      edges.push(Math.hypot(nx! - x!, ny! - y!));
    }
    expect(Math.max(...edges) - Math.min(...edges)).toBeLessThan(0.001);
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(1);
    expect(await page.evaluate(() => window.editor.changes.get().changes.length)).toBe(0);
    // The next polygon keeps the count; Escape returns to the question, Enter keeps 5.
    await expect.poll(prompt).toContain('Centre');
    await page.keyboard.press('Escape');
    await expect.poll(prompt).toContain('Number of sides <5>');
    await page.keyboard.press('Enter');
    await expect.poll(prompt).toContain('Centre');
  });

  test('offset copies a road at a typed distance to the clicked side', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await renderSettled(page);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    const button = page.locator('olcad-toolbar .olcad-toolbar__tool--offset');
    await expect(button).toBeEnabled();
    await button.click();
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    await expect.poll(prompt).toContain('Select the object');
    // Click the road: it becomes the source.
    const mid = await roadMidpoint(page, 815);
    const at = await screenPoint(page, mid);
    await page.mouse.click(at.x, at.y);
    await expect.poll(prompt).toContain('Offset distance');
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.fill('10');
    await input.press('Enter');
    await expect.poll(prompt).toContain('Side');
    const roadCount = () => page.evaluate(() => window.editor.layers.getFeatures('roads').length);
    const before = await roadCount();
    const initialIds = await page.evaluate(() =>
      window.editor.layers.getFeatures('roads').map((f) => String(f.getId())),
    );
    const road = await page.evaluate((id) => {
      const feature = window.editor.layers.getFeatures('roads').find((f) => f.getId() === id)!;
      return (feature.getGeometry() as LineString).getCoordinates();
    }, 815);
    // Click 40 px to one side of the road (perpendicular to its first segment).
    const [a, b] = road as [number[], number[]];
    const dir = Math.atan2(b[1]! - a[1]!, b[0]! - a[0]!);
    const side = { x: at.x - 40 * Math.sin(dir), y: at.y - 40 * Math.cos(dir) };
    await page.mouse.click(side.x, side.y);
    await expect.poll(roadCount).toBe(before + 1);
    // Roads have a schema: the attribute popup opens after the insert; put it off.
    const later = page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later');
    await later.click();
    const copies = () =>
      page.evaluate(
        (ids) =>
          window.editor.layers
            .getFeatures('roads')
            .filter((f) => !ids.includes(String(f.getId())))
            .map((f) => (f.getGeometry() as LineString).getCoordinates()),
        initialIds,
      );
    const perMetre = await page.evaluate((c) => window.olcad.unitsPerMetre('EPSG:3857', c), a);
    const distanceToRoad = (p: number[]) => {
      // Perpendicular distance to the line through the road's first segment.
      const dx = b[0]! - a[0]!;
      const dy = b[1]! - a[1]!;
      return Math.abs(dx * (p[1]! - a[1]!) - dy * (p[0]! - a[0]!)) / Math.hypot(dx, dy);
    };
    const first = (await copies())[0]!;
    expect(first).toHaveLength(road.length);
    for (const vertex of first)
      expect(Math.abs(distanceToRoad(vertex) - 10 * perMetre)).toBeLessThan(0.05);
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(1);
    const changes = await page.evaluate(() => window.editor.changes.get().changes);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ op: 'insert', layer: 'roads' });
    // The copy is the next source; Enter keeps 10 m and the same side gives 20 m from the road.
    await expect.poll(prompt).toContain('Offset distance <10.00 m>');
    await page.keyboard.press('Enter');
    await expect.poll(prompt).toContain('Side');
    await page.mouse.click(side.x, side.y);
    await expect.poll(roadCount).toBe(before + 2);
    await later.click();
    const second = (await copies())[1]!;
    for (const vertex of second)
      expect(Math.abs(distanceToRoad(vertex) - 20 * perMetre)).toBeLessThan(0.1);
  });

  test('trim cuts roads at a boundary; extend lengthens a road to it', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await renderSettled(page);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    const coordinates = (id: number | string) =>
      page.evaluate((roadId) => {
        const feature = window.editor.layers
          .getFeatures('roads')
          .find((f) => f.getId() === roadId)!;
        return (feature.getGeometry() as LineString).getCoordinates();
      }, id);
    const main = await coordinates(815);
    const side = await coordinates(816);
    const sideX = side[0]![0]!;

    // Trim: pick Side Street as the boundary, then click Main Street east of it.
    await page.locator('olcad-toolbar .olcad-toolbar__tool--trim').click();
    await expect.poll(prompt).toContain('Select the boundary');
    const sideAt = await screenPoint(page, await roadMidpoint(page, 816));
    await page.mouse.click(sideAt.x, sideAt.y);
    await expect.poll(prompt).toContain('Click the part of a line to remove');
    const east = await screenPoint(page, [(sideX + main[1]![0]!) / 2, main[1]![1]!]);
    await page.mouse.click(east.x, east.y + 2);
    await expect.poll(() => coordinates(815)).not.toEqual(main);
    const trimmed = await coordinates(815);
    expect(trimmed).toHaveLength(2);
    expect(trimmed[0]).toEqual(main[0]);
    expect(Math.abs(trimmed[1]![0]! - sideX)).toBeLessThan(1e-6);
    expect(Math.abs(trimmed[1]![1]! - main[0]![1]!)).toBeLessThan(1e-6);
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(0);
    let changes = await page.evaluate(() => window.editor.changes.get().changes);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ op: 'update', layer: 'roads', id: 815 });
    // Undo restores the road; the boundary stays for the next click.
    await page.keyboard.press('Control+z');
    await expect.poll(() => coordinates(815)).toEqual(main);
    expect(await prompt()).toContain('Click the part of a line to remove');

    // Interior trim between the read-only track and Side Street splits Main Street in two.
    await page.keyboard.press('Escape');
    await expect.poll(prompt).toContain('Select the boundary');
    await page.evaluate(() => {
      const track = window.editor.layers.getFeatures('tracks')[0]!;
      const sideStreet = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 816)!;
      window.editor.selection.set([track, sideStreet]);
    });
    await expect.poll(prompt).toContain('Click the part of a line to remove');
    // The track crosses Main Street 5 % along it, Side Street at about 52 %: click at 30 %.
    const between = await screenPoint(page, [
      main[0]![0]! + 0.3 * (main[1]![0]! - main[0]![0]!),
      main[0]![1]!,
    ]);
    await page.mouse.click(between.x, between.y);
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.getFeatures('roads').length))
      .toBe(3);
    const later = page.locator('olcad-attribute-form[popup] .olcad-attribute-form__later');
    if (await later.isVisible()) await later.click();
    const split = await coordinates(815);
    expect(split[0]).toEqual(main[0]);
    expect(split[1]![0]!).toBeLessThan(sideX);
    const copy = await page.evaluate(() => {
      const feature = window.editor.layers
        .getFeatures('roads')
        .find((f) => f.getId() !== 815 && f.getId() !== 816)!;
      return {
        name: feature.get('name') as string,
        coordinates: (feature.getGeometry() as LineString).getCoordinates(),
      };
    });
    expect(copy.name).toBe('Main Street');
    expect(Math.abs(copy.coordinates[0]![0]! - sideX)).toBeLessThan(1e-6);
    expect(copy.coordinates[1]).toEqual(main[1]);
    changes = await page.evaluate(() => window.editor.changes.get().changes);
    expect(changes.map((c) => c.op).sort()).toEqual(['insert', 'update']);
    await page.keyboard.press('Control+z');
    await expect
      .poll(() => page.evaluate(() => window.editor.layers.getFeatures('roads').length))
      .toBe(2);

    // Extend: shorten Main Street west of Side Street, then extend it back to the boundary.
    await page.keyboard.press('Escape');
    await page.evaluate(
      ([x]) => {
        const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
        const [a] = (road.getGeometry() as LineString).getCoordinates();
        const shorter = (road.getGeometry() as LineString).clone();
        shorter.setCoordinates([a!, [(a![0]! + x!) / 2, a![1]!]]);
        window.editor.execute(window.olcad.updateGeometry(road, shorter));
      },
      [sideX],
    );
    const short = await coordinates(815);
    await page.locator('olcad-toolbar .olcad-toolbar__tool--extend').click();
    await expect.poll(prompt).toContain('Select the boundary');
    await page.mouse.click(sideAt.x, sideAt.y);
    await expect.poll(prompt).toContain('Click a line near the end to extend');
    const nearEnd = await screenPoint(page, short[1]!);
    await page.mouse.click(nearEnd.x - 6, nearEnd.y + 1);
    await expect.poll(() => coordinates(815)).not.toEqual(short);
    const extended = await coordinates(815);
    expect(extended[0]).toEqual(short[0]);
    expect(Math.abs(extended[1]![0]! - sideX)).toBeLessThan(1e-6);
    expect(Math.abs(extended[1]![1]! - short[0]![1]!)).toBeLessThan(1e-6);
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(0);
  });

  test('mirror reflects objects across a typed line, in place on Enter', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    const main = await page.evaluate(() => {
      const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
      window.editor.selection.set([road]);
      return (road.getGeometry() as LineString).getCoordinates();
    });
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    await page.locator('olcad-toolbar .olcad-toolbar__tool--mirror').click();
    await expect.poll(prompt).toContain('First point of the mirror line');
    // A vertical mirror line a quarter along the road, typed for exact coordinates.
    const ax = main[0]![0]! + 0.25 * (main[1]![0]! - main[0]![0]!);
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.fill(`${ax},${main[0]![1]! - 100}`);
    await input.press('Enter');
    await expect.poll(prompt).toContain('Second point');
    await input.fill(`${ax},${main[0]![1]! + 100}`);
    await input.press('Enter');
    await expect.poll(prompt).toContain('Create a copy? [y/N]');
    await input.press('Enter'); // empty: no copy
    await expect.poll(prompt).toContain('Select the objects to mirror');
    const mirrored = await page.evaluate(() =>
      (
        window.editor.layers
          .getFeatures('roads')
          .find((f) => f.getId() === 815)!
          .getGeometry() as LineString
      ).getCoordinates(),
    );
    mirrored.forEach((vertex, i) => {
      expect(vertex[0]).toBeCloseTo(2 * ax - main[i]![0]!, 6);
      expect(vertex[1]).toBeCloseTo(main[i]![1]!, 6);
    });
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(0);
    const changes = await page.evaluate(() => window.editor.changes.get().changes);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ op: 'update', layer: 'roads', id: 815 });
    expect(await page.evaluate(() => window.editor.layers.getFeatures('roads').length)).toBe(2);
  });

  test('mirror with a copy opens the attribute dialog for each copy', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await waitForLayer(page, 'hydrants', 2);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    const main = await page.evaluate(() => {
      const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
      const hydrant = window.editor.layers.getFeatures('hydrants')[0]!;
      window.editor.selection.set([road, hydrant]);
      return (road.getGeometry() as LineString).getCoordinates();
    });
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    await page.locator('olcad-toolbar .olcad-toolbar__tool--mirror').click();
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    // A horizontal mirror line 60 m south of the road.
    const y = main[0]![1]! - 60;
    await input.fill(`${main[0]![0]!},${y}`);
    await input.press('Enter');
    await input.fill(`${main[1]![0]!},${y}`);
    await input.press('Enter');
    await expect.poll(prompt).toContain('Create a copy?');
    await input.fill('y');
    await input.press('Enter');
    await waitForLayer(page, 'roads', 3);
    await waitForLayer(page, 'hydrants', 3);

    // The popup steps through both copies.
    const dialog = page.locator('olcad-attribute-form[popup] dialog');
    await expect(dialog).toHaveAttribute('open', '');
    await expect(dialog.locator('.olcad-attribute-form__progress')).toHaveText('1 of 2');
    const name = dialog.locator('[data-field="name"] input');
    await expect(name).toHaveValue('Main Street');
    await name.fill('Main Street (mirrored)');
    await dialog.locator('.olcad-attribute-form__apply').click();
    await expect(dialog.locator('.olcad-attribute-form__progress')).toHaveText('2 of 2');
    await dialog.locator('.olcad-attribute-form__later').click();
    await expect(dialog).not.toHaveAttribute('open', '');

    const copies = await page.evaluate(() => {
      const road = window.editor.layers
        .getFeatures('roads')
        .find((f) => f.getId() !== 815 && f.getId() !== 816)!;
      return {
        name: road.get('name') as string,
        coordinates: (road.getGeometry() as LineString).getCoordinates(),
      };
    });
    expect(copies.name).toBe('Main Street (mirrored)');
    expect(copies.coordinates[0]![1]).toBeCloseTo(2 * y - main[0]![1]!, 6);
    // The originals stay; the copies are inserts; the mirror itself is one undo step.
    const changes = await page.evaluate(() => window.editor.changes.get().changes);
    expect(changes.map((c) => c.op)).toEqual(['insert', 'insert']);
    await page.evaluate(() => window.editor.undo()); // the name
    await page.evaluate(() => window.editor.undo()); // the mirror
    expect(await page.evaluate(() => window.editor.layers.getFeatures('roads').length)).toBe(2);
    expect(await page.evaluate(() => window.editor.layers.getFeatures('hydrants').length)).toBe(2);
  });

  test('curve takes start and end, a moved handle and Enter', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await renderSettled(page);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    const button = page.locator('olcad-toolbar .olcad-toolbar__tool--curve');
    await expect(button).toBeEnabled(); // no active layer: the draft layer takes lines
    await button.click();
    // Free clicks: no snapping to the test data under the curve.
    await page.evaluate(() => window.editor.snapping.setEnabled(false));
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    await expect.poll(prompt).toContain('Start point');
    const mid = await roadMidpoint(page, 815);
    const at = await screenPoint(page, mid);
    const start = { x: at.x - 150, y: at.y + 150 };
    const end = { x: at.x + 30, y: at.y + 150 };
    await page.mouse.click(start.x, start.y);
    await expect.poll(prompt).toContain('End point');
    await page.mouse.click(end.x, end.y);
    await expect.poll(prompt).toContain('handle');
    const draftCount = () =>
      page.evaluate(
        () => window.editor.layers.getFeatures(window.editor.layers.getDraft()!).length,
      );
    expect(await draftCount()).toBe(0);
    // The start handle sits one third along the chord; pick it, move it up, place it.
    const handle = { x: start.x + (end.x - start.x) / 3, y: start.y };
    await page.mouse.move(handle.x, handle.y);
    await page.mouse.click(handle.x, handle.y);
    await expect.poll(prompt).toContain('Handle');
    await page.mouse.move(handle.x, handle.y - 60);
    await page.mouse.click(handle.x, handle.y - 60);
    await expect.poll(prompt).toContain('handle');
    await page.keyboard.press('Enter');
    await expect.poll(draftCount).toBe(1);
    const line = await page.evaluate(() => {
      const features = window.editor.layers.getFeatures(window.editor.layers.getDraft()!);
      return (features[0]!.getGeometry() as LineString).getCoordinates();
    });
    expect(line.length).toBeGreaterThan(2);
    const viewport = (await page.locator('.ol-viewport').boundingBox())!;
    const coordinateAt = (p: { x: number; y: number }) =>
      page.evaluate(
        (pixel) => window.editor.map.getCoordinateFromPixel(pixel),
        [p.x - viewport.x, p.y - viewport.y],
      );
    const startCoordinate = await coordinateAt(start);
    const endCoordinate = await coordinateAt(end);
    expect(
      Math.hypot(line[0]![0]! - startCoordinate[0]!, line[0]![1]! - startCoordinate[1]!),
    ).toBeLessThan(0.01);
    const last = line[line.length - 1]!;
    expect(Math.hypot(last[0]! - endCoordinate[0]!, last[1]! - endCoordinate[1]!)).toBeLessThan(
      0.01,
    );
    // The handle pulled the curve upwards (north): the middle vertex lies above the chord.
    const middle = line[Math.floor(line.length / 2)]!;
    expect(middle[1]).toBeGreaterThan(startCoordinate[1]! + 1);
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(1);
    await expect.poll(prompt).toContain('Start point');
  });
});

test.describe('scale tool', () => {
  test('scales objects around a typed base point by a typed factor', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    const main = await page.evaluate(() => {
      const road = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
      window.editor.selection.set([road]);
      return (road.getGeometry() as LineString).getCoordinates();
    });
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    await page.locator('olcad-toolbar .olcad-toolbar__tool--scale').click();
    await expect.poll(prompt).toContain('Base point');
    const base = main[0]!;
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.fill(`${base[0]},${base[1]}`);
    await input.press('Enter');
    await expect.poll(prompt).toContain('Scale factor');
    await input.fill('2');
    await input.press('Enter');
    await expect.poll(prompt).toContain('Select the objects to scale');
    const scaled = await page.evaluate(() =>
      (
        window.editor.layers
          .getFeatures('roads')
          .find((f) => f.getId() === 815)!
          .getGeometry() as LineString
      ).getCoordinates(),
    );
    scaled.forEach((vertex, i) => {
      expect(vertex[0]).toBeCloseTo(base[0]! + 2 * (main[i]![0]! - base[0]!), 6);
      expect(vertex[1]).toBeCloseTo(base[1]! + 2 * (main[i]![1]! - base[1]!), 6);
    });
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(0);
    const changes = await page.evaluate(() => window.editor.changes.get().changes);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ op: 'update', layer: 'roads', id: 815 });
  });

  test('scales by the ratio of a reference and a target point', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'parcels', 2);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    const ring = await page.evaluate(() => {
      const parcel = window.editor.layers.getFeatures('parcels').find((f) => f.getId() === 1)!;
      window.editor.selection.set([parcel]);
      return (parcel.getGeometry() as Polygon).getCoordinates()[0]!;
    });
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    await page.locator('olcad-toolbar .olcad-toolbar__tool--scale').click();
    await expect.poll(prompt).toContain('Base point');
    const base = ring[0]!;
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.fill(`${base[0]},${base[1]}`);
    await input.press('Enter');
    await input.fill('@10,0'); // reference 10 m east of the base
    await input.press('Enter');
    await expect.poll(prompt).toContain('Target point');
    await input.fill('@20,0'); // target 20 m east: factor 2
    await input.press('Enter');
    await expect.poll(prompt).toContain('Select the objects to scale');
    const scaled = await page.evaluate(
      () =>
        (
          window.editor.layers
            .getFeatures('parcels')
            .find((f) => f.getId() === 1)!
            .getGeometry() as Polygon
        ).getCoordinates()[0]!,
    );
    scaled.forEach((vertex, i) => {
      expect(vertex[0]).toBeCloseTo(base[0]! + 2 * (ring[i]![0]! - base[0]!), 4);
      expect(vertex[1]).toBeCloseTo(base[1]! + 2 * (ring[i]![1]! - base[1]!), 4);
    });
    // One undo step restores the parcel.
    await page.evaluate(() => window.editor.undo());
    const restored = await page.evaluate(
      () =>
        (
          window.editor.layers
            .getFeatures('parcels')
            .find((f) => f.getId() === 1)!
            .getGeometry() as Polygon
        ).getCoordinates()[0]!,
    );
    expect(restored).toEqual(ring);
  });
});

test.describe('ellipse tool', () => {
  test('draws an ellipse by centre, axis end and a typed half-axis, and by box corners through the flyout', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    const button = page.locator('olcad-toolbar .olcad-toolbar__tool--ellipse');
    await expect(button).toBeEnabled(); // no active layer: the draft layer takes polygons
    await expect(button).toHaveAttribute('data-method', 'centre-axis');
    await button.click();
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    await expect.poll(prompt).toContain('Centre');
    const lastDraftRing = () =>
      page.evaluate(() => {
        const features = window.editor.layers.getFeatures(window.editor.layers.getDraft()!);
        return (features[features.length - 1]!.getGeometry() as Polygon).getCoordinates()[0]!;
      });
    const draftCount = () =>
      page.evaluate(
        () => window.editor.layers.getFeatures(window.editor.layers.getDraft()!).length,
      );

    // Centre and axis end typed, the other half-axis typed in metres.
    const [cx, cy] = await roadMidpoint(page, 815);
    const centre = [cx!, cy! + 200];
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.fill(`${centre[0]},${centre[1]}`);
    await input.press('Enter');
    await expect.poll(prompt).toContain('End of the first axis');
    await input.fill(`${centre[0]! + 80},${centre[1]}`);
    await input.press('Enter');
    await expect.poll(prompt).toContain('Other half-axis');
    await input.fill('20');
    await input.press('Enter');
    await expect.poll(draftCount).toBe(1);
    const perMetre = await page.evaluate((c) => window.olcad.unitsPerMetre('EPSG:3857', c), centre);
    const ring = await lastDraftRing();
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    for (const [x, y] of ring) {
      const u = (x! - centre[0]!) / 80;
      const v = (y! - centre[1]!) / (20 * perMetre);
      expect(u * u + v * v).toBeCloseTo(1, 6);
    }
    expect(await page.evaluate(() => window.editor.selection.get().length)).toBe(1);
    await expect.poll(prompt).toContain('Centre');

    // The flyout switches to the box construction.
    const flyout = page.locator('olcad-toolbar .olcad-toolbar__flyout--ellipse');
    await flyout.locator('.olcad-toolbar__flyout-toggle').click();
    await flyout.locator('[data-variant="box"]').click();
    await expect(button).toHaveAttribute('data-method', 'box');
    expect(await page.evaluate(() => window.editor.tools.getActiveOptions())).toEqual({
      method: 'box',
    });
    await expect.poll(prompt).toContain('First corner of the box');
    await input.fill(`${centre[0]},${centre[1]}`);
    await input.press('Enter');
    await expect.poll(prompt).toContain('Opposite corner');
    await input.fill(`${centre[0]! + 60},${centre[1]! + 30}`);
    await input.press('Enter');
    await expect.poll(draftCount).toBe(2);
    const boxed = await lastDraftRing();
    const xs = boxed.map(([x]) => x!);
    const ys = boxed.map(([, y]) => y!);
    // The first vertex is the end of the first axis; the far end lies between two vertices, so
    // it is only within the chord tolerance (0.01 m, about 0.015 map units here).
    expect(Math.max(...xs)).toBeCloseTo(centre[0]! + 60, 6);
    expect(Math.abs(Math.min(...xs) - centre[0]!)).toBeLessThan(0.05);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(centre[1]! - 1e-6);
    expect(Math.max(...ys)).toBeLessThanOrEqual(centre[1]! + 30 + 1e-6);
  });
});

test.describe('parallel tool', () => {
  test('draws parallels to a road: a typed length, then to the crosshair', async ({ page }) => {
    await page.goto('/');
    await waitForEditor(page);
    await waitForLayer(page, 'roads', 2);
    await renderSettled(page);
    await page.locator('olcad-toolbar .olcad-toolbar__edit-toggle').click();
    const road = await page.evaluate(() => {
      const main = window.editor.layers.getFeatures('roads').find((f) => f.getId() === 815)!;
      window.editor.selection.set([main]);
      return (main.getGeometry() as LineString).getCoordinates();
    });
    const [a, b] = [road[0]!, road[1]!];
    const perMetre = await page.evaluate((c) => window.olcad.unitsPerMetre('EPSG:3857', c), a);
    // The unit normal to the left of the road's direction, and a start 20 m to that side.
    const length = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
    const normal = [-(b[1]! - a[1]!) / length, (b[0]! - a[0]!) / length];
    const offset = 20 * perMetre;
    const start = [a[0]! + normal[0]! * offset, a[1]! + normal[1]! * offset];
    const prompt = () => page.evaluate(() => window.editor.tools.getPrompt());
    await page.locator('olcad-toolbar .olcad-toolbar__tool--parallel').click();
    await expect.poll(prompt).toContain('Start point of the parallel');
    const input = page.locator('olcad-input-bar .olcad-input-bar__input');
    await input.fill(`${start[0]},${start[1]}`);
    await input.press('Enter');
    await expect.poll(prompt).toContain('End of the parallel');
    const metres = Math.floor(length / perMetre / 2);
    await input.fill(String(metres));
    await input.press('Enter');
    await waitForLayer(page, 'draft', 1);

    // The new line: from the start, along the road, 20 m beside it, the typed length.
    const lastDraft = () =>
      page.evaluate(() => {
        const features = window.editor.layers.getFeatures(window.editor.layers.getDraft()!);
        return (features[features.length - 1]!.getGeometry() as LineString).getCoordinates();
      });
    const first = await lastDraft();
    expect(first[0]![0]).toBeCloseTo(start[0]!, 6);
    expect(first[0]![1]).toBeCloseTo(start[1]!, 6);
    const end = first[first.length - 1]!;
    const along = (end[0]! - start[0]!) * (b[0]! - a[0]!) + (end[1]! - start[1]!) * (b[1]! - a[1]!);
    // Metres are converted at the start point, 20 m from where `perMetre` was taken.
    expect(along / length).toBeCloseTo(metres * perMetre, 2);
    const side = (end[0]! - a[0]!) * normal[0]! + (end[1]! - a[1]!) * normal[1]!;
    expect(side).toBeCloseTo(offset, 4);
    expect(
      await page.evaluate(() =>
        window.editor.selection.get().map((f) => window.editor.layers.layerOf(f)),
      ),
    ).toEqual(['draft']);
    await expect.poll(prompt).toContain('Start point of the parallel'); // the road stays

    // A second parallel ends where the crosshair is: level with the road's midpoint.
    await input.fill(`${start[0]},${start[1]}`);
    await input.press('Enter');
    const mid = await roadMidpoint(page, 815);
    const at = await screenPoint(page, mid);
    await page.mouse.move(at.x, at.y);
    await page.mouse.click(at.x, at.y);
    await waitForLayer(page, 'draft', 2);
    const second = await lastDraft();
    const tip = second[second.length - 1]!;
    const expected = [mid[0]! + normal[0]! * offset, mid[1]! + normal[1]! * offset];
    expect(Math.hypot(tip[0]! - expected[0]!, tip[1]! - expected[1]!)).toBeLessThan(perMetre);
  });
});
