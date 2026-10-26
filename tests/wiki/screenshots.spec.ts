import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { closeFlyout, openFlyout } from "../e2e/flyout";
import type { Editor } from "../../src/core/Editor";

/**
 * Generates the images of the GitHub wiki (`wiki/images/`) from the test page: `pnpm wiki:images`,
 * one group with `pnpm wiki:images --grep <title>`. Needs the network for the basemap tiles.
 */

declare global {
  interface Window {
    editor: Editor;
    ol: {
      proj: { fromLonLat(c: number[]): number[] };
      interaction: { DoubleClickZoom: new (...args: never[]) => object };
    };
  }
}

const OUT = "wiki/images";
/** Mid grey that reads on GitHub's light and dark background. */
const ICON_COLOR = "#8b949e";
/** Centre of the seed parcels and roads. */
const CENTRE = [8.401, 49.0097];

async function renderSettled(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.editor.map.once("rendercomplete", () => resolve());
        window.editor.map.render();
      }),
  );
}

/** Seed data, empty storage, authored layout, map centred on the seed objects. */
async function start(page: Page, zoom = 17.6): Promise<void> {
  await page.request.post("/reset");
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.editor));
  await expect
    .poll(() =>
      page.evaluate(() => window.editor.layers.get("parcels").featureCount),
    )
    .toBe(2);
  await page.evaluate(
    ([centre, z]) => {
      const view = window.editor.map.getView();
      view.setCenter(window.ol.proj.fromLonLat(centre as number[]));
      view.setZoom(z as number);
    },
    [CENTRE, zoom] as const,
  );
  await page.evaluate(() => {
    // The grid dots of the test configuration would cover every map scene.
    window.editor.grid.setVisible(false);
    // Two quick picks of a scene must never zoom the map.
    window.editor.map.getInteractions().forEach((interaction) => {
      if (interaction instanceof window.ol.interaction.DoubleClickZoom)
        interaction.setActive(false);
    });
  });
  await settle(page);
}

async function settle(page: Page): Promise<void> {
  await renderSettled(page);
  await page.waitForTimeout(1500);
}

/** Page position of a lon / lat coordinate. */
async function at(
  page: Page,
  lon: number,
  lat: number,
): Promise<{ x: number; y: number }> {
  const box = (await page.locator(".ol-viewport").boundingBox())!;
  const pixel = await page.evaluate(
    (c) =>
      window.editor.map.getPixelFromCoordinate(window.ol.proj.fromLonLat(c)),
    [lon, lat],
  );
  return { x: box.x + pixel[0]!, y: box.y + pixel[1]! };
}

async function click(
  page: Page,
  lon: number,
  lat: number,
  modifiers?: "Alt",
): Promise<void> {
  const p = await at(page, lon, lat);
  await page.mouse.move(p.x, p.y, { steps: 3 });
  if (modifiers) await page.keyboard.down(modifiers);
  await page.mouse.click(p.x, p.y);
  if (modifiers) await page.keyboard.up(modifiers);
  await page.waitForTimeout(150);
}

async function hover(page: Page, lon: number, lat: number): Promise<void> {
  const p = await at(page, lon, lat);
  await page.mouse.move(p.x, p.y, { steps: 6 });
  await page.waitForTimeout(300);
}

async function type(page: Page, text: string): Promise<void> {
  const input = page.locator("olcad-input-bar .olcad-input-bar__input");
  await input.fill(text);
  await input.press("Enter");
}

/** Press "Edit <layer>" in the Layers flyout: edit mode on, the layer active, no tool. */
async function editLayer(page: Page, title: string): Promise<void> {
  await openFlyout(page, "layers");
  const edit = page.getByRole("button", { name: `Edit ${title}` });
  if ((await edit.getAttribute("aria-pressed")) !== "true") await edit.click();
  await closeFlyout(page, "layers");
}

async function editMode(page: Page): Promise<void> {
  await page.evaluate(() => window.editor.setEditMode(true));
}

async function activate(
  page: Page,
  id: string,
  options?: Record<string, unknown>,
): Promise<void> {
  await page.evaluate(
    ([tool, opts]) =>
      window.editor.tools.activate(tool as string, opts as never),
    [id, options] as const,
  );
}

/** Select seed objects by layer and id. */
async function select(
  page: Page,
  layer: string,
  ...ids: number[]
): Promise<void> {
  await page.evaluate(
    ([layerId, featureIds]) => {
      const features = window.editor.layers
        .getFeatures(layerId as string)
        .filter((f) => (featureIds as number[]).includes(f.getId() as number));
      window.editor.selection.set(features);
    },
    [layer, ids] as const,
  );
}

async function laterAttributes(page: Page): Promise<void> {
  const later = page.locator(
    "olcad-attribute-form[popup] .olcad-attribute-form__later",
  );
  if (await later.isVisible()) await later.click();
}

/** The middle of the map, where the seed objects are. */
async function mapShot(
  page: Page,
  name: string,
  width = 1240,
  height = 700,
): Promise<void> {
  const box = (await page.locator(".ol-viewport").boundingBox())!;
  await page.waitForTimeout(300);
  await page.screenshot({
    path: `${OUT}/${name}.png`,
    clip: {
      x: Math.round(box.x + (box.width - width) / 2),
      y: Math.round(box.y + (box.height - height) / 2),
      width,
      height,
    },
  });
}

async function shot(locator: Locator, name: string): Promise<void> {
  await locator.screenshot({ path: `${OUT}/${name}.png` });
}

/** Screenshot of the union of several elements, with a margin. */
async function unionShot(
  page: Page,
  locators: Locator[],
  name: string,
  margin = 6,
): Promise<void> {
  const boxes = await Promise.all(
    locators.map(async (l) => (await l.boundingBox())!),
  );
  const x = Math.max(0, Math.min(...boxes.map((b) => b.x)) - margin);
  const y = Math.max(0, Math.min(...boxes.map((b) => b.y)) - margin);
  const right = Math.max(...boxes.map((b) => b.x + b.width)) + margin;
  const bottom = Math.max(...boxes.map((b) => b.y + b.height)) + margin;
  await page.screenshot({
    path: `${OUT}/${name}.png`,
    clip: { x, y, width: right - x, height: bottom - y },
  });
}

async function menu(page: Page, label: string, item: string): Promise<void> {
  const m = page.locator(`olcad-menu[label="${label}"]`);
  await m.locator(".olcad-menu__button").click();
  await m.locator(`#${item}`).click();
}

test.beforeAll(() => {
  mkdirSync(`${OUT}/icons`, { recursive: true });
});

test.describe("icon images", () => {
  test.use({ deviceScaleFactor: 2 });

  /** Every icon as SVG and as PNG (the wiki embeds the PNG, 24 px shown at 48 px for sharpness). */
  test("icons", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() =>
      Boolean((window.olcad as unknown as { ICONS?: object }).ICONS),
    );
    const icons = await page.evaluate(
      () =>
        (window.olcad as unknown as { ICONS: Record<string, string> }).ICONS,
    );
    await page.setContent(
      '<body style="margin:0;background:transparent"><div id="icon"></div></body>',
    );
    for (const [name, svg] of Object.entries(icons)) {
      const file = svg
        .replaceAll("currentColor", ICON_COLOR)
        .replace(/ class="[^"]*"/, "")
        .replace(/ aria-hidden="true"/, "")
        .replace("<svg ", '<svg width="24" height="24" ');
      writeFileSync(`${OUT}/icons/${name}.svg`, `${file}\n`);
      await page.evaluate((markup) => {
        document.getElementById("icon")!.innerHTML = markup;
      }, file);
      await page
        .locator("#icon svg")
        .screenshot({ path: `${OUT}/icons/${name}.png`, omitBackground: true });
    }
    expect(Object.keys(icons).length).toBeGreaterThan(40);
  });
});

test("overview", async ({ page }) => {
  await start(page, 16.8);
  const marks: [string, string][] = [
    ["olcad-menubar", "1"],
    ['olcad-toolbar[name="main"]', "2"],
    ['olcad-toolbar[name="draw"]', "3"],
    ["olcad-snap-settings", "4"],
    [".ol-viewport", "5"],
    ['olcad-panel[name="layers"]', "6"],
    ["olcad-input-bar", "7"],
    ['olcad-panel[name="crs"]', "8"],
  ];
  await page.evaluate((list) => {
    for (const [selector, label] of list) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const badge = document.createElement("div");
      badge.textContent = label;
      const inside = selector === ".ol-viewport";
      const tab = selector.startsWith('olcad-panel[name="layers"]');
      const left = inside ? r.left + 60 : tab ? r.left - 26 : r.right + 1;
      const top = inside || tab ? r.top + 60 : r.top + r.height / 2 - 11;
      Object.assign(badge.style, {
        position: "fixed",
        left: `${Math.min(left, window.innerWidth - 26)}px`,
        top: `${Math.min(top, window.innerHeight - 24)}px`,
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: "#f59e0b",
        color: "#111",
        font: "bold 13px/22px sans-serif",
        textAlign: "center",
        zIndex: "10000",
        boxShadow: "0 0 0 2px #111",
        pointerEvents: "none",
      });
      document.body.append(badge);
    }
  }, marks);
  await page.screenshot({ path: `${OUT}/ui-overview.png` });
});

test.describe("elements", () => {
  test.use({ deviceScaleFactor: 2 });

  test("toolbars and aids", async ({ page }) => {
    await start(page);
    await editLayer(page, "Parcels");
    await page.evaluate(() => window.editor.grid.setVisible(true));
    for (const name of ["main", "draw", "modify", "trim", "measure"]) {
      await shot(
        page.locator(`olcad-toolbar[name="${name}"]`),
        `toolbar-${name}`,
      );
    }
    await shot(page.locator("olcad-snap-settings"), "aids-snap");
    await shot(page.locator("olcad-grid-settings"), "aids-grid");
    await shot(page.locator("olcad-angle-lock"), "aids-angle-lock");
    await shot(page.locator("olcad-straightedge"), "aids-straightedge");
    await shot(page.locator('olcad-panel[name="crs"]'), "crs-bar");
    for (const id of ["circle", "ellipse"]) {
      const flyout = page.locator(`.olcad-toolbar__flyout--${id}`);
      const button = flyout.locator(`.olcad-toolbar__tool--${id}`);
      await button.click({ button: "right" });
      const popup = flyout.locator(".olcad-toolbar__flyout-menu");
      await expect(popup).toBeVisible();
      await unionShot(page, [button, popup], `toolbar-${id}-flyout`);
      await page.keyboard.press("Escape");
    }
  });

  test("layers", async ({ page }) => {
    await start(page);
    await editLayer(page, "Parcels");
    await openFlyout(page, "layers");
    await shot(page.locator("olcad-layer-list"), "layer-list");
    await page.locator(".olcad-layer-list__new").click();
    const editor = page.locator(".olcad-layer-editor__dialog");
    await expect(editor).toBeVisible();
    await editor.locator("input").first().fill("Planned trees");
    await shot(editor, "layer-editor");
    await editor.getByRole("button", { name: "Cancel" }).click();
    await expect(editor).toBeHidden();
    await closeFlyout(page, "layers");
    await menu(page, "View", "layer-styles");
    const styles = page.locator(".olcad-layer-style-dialog__dialog");
    await expect(styles).toBeVisible();
    await shot(styles, "layer-styles");
  });

  test("dialogs", async ({ page }) => {
    await start(page);
    await menu(page, "File", "import");
    const importDialog = page.locator(".olcad-import-dialog__dialog");
    await expect(importDialog).toBeVisible();
    await shot(importDialog, "import-dialog");
    await page.keyboard.press("Escape");
    await menu(page, "File", "export");
    const exportDialog = page.locator(".olcad-export-dialog__dialog");
    await expect(exportDialog).toBeVisible();
    await shot(exportDialog, "export-dialog");
    await page.keyboard.press("Escape");
  });

  test("table", async ({ page }) => {
    await start(page);
    await openFlyout(page, "layers");
    await page.getByRole("button", { name: "Table of Parcels" }).click();
    await closeFlyout(page, "layers");
    const table = page.locator('olcad-panel[name="table"]');
    await expect(table).toBeVisible();
    await select(page, "parcels", 2);
    await page.waitForTimeout(300);
    await shot(table, "feature-table");
  });
});

test("workflow parcel", async ({ page }) => {
  await start(page, 18);
  await editLayer(page, "Parcels");
  await activate(page, "rectangle");
  // Snap the first corner onto the south-east corner of parcel 2.
  await hover(page, 8.40302, 49.00901);
  await mapShot(page, "workflow-parcel-1-snap");
  await click(page, 8.403, 49.009);
  await hover(page, 8.4035, 49.0099);
  await mapShot(page, "workflow-parcel-2-preview");
  await shot(page.locator("olcad-input-bar"), "input-bar-prompt");
  await type(page, "@30,40");
  const form = page.locator(
    "olcad-attribute-form[popup] .olcad-attribute-form__dialog",
  );
  await expect(form).toBeVisible();
  await form.locator("input").first().fill("City of Example");
  await shot(form, "attribute-popup");
  await form.locator(".olcad-attribute-form__apply").click();
  await page.mouse.move(5, 450);
  await mapShot(page, "workflow-parcel-3-result");
});

test("draw rectangle", async ({ page }) => {
  await start(page);
  await editLayer(page, "Parcels");
  await activate(page, "rectangle");
  await click(page, 8.4034, 49.0092);
  await hover(page, 8.4046, 49.0101);
  await mapShot(page, "draw-rectangle");
});

test("draw circle", async ({ page }) => {
  await start(page);
  await editLayer(page, "Parcels");
  await activate(page, "circle", { method: "centre-radius" });
  await click(page, 8.4041, 49.0097);
  await hover(page, 8.4048, 49.0099);
  await mapShot(page, "draw-circle");
});

test("draw parallel", async ({ page }) => {
  await start(page);
  await editLayer(page, "Roads");
  await select(page, "roads", 815);
  await activate(page, "parallel");
  await click(page, 8.3996, 49.00862);
  await hover(page, 8.4032, 49.0087);
  await mapShot(page, "draw-parallel");
});

test("draw curve", async ({ page }) => {
  await start(page);
  await editLayer(page, "Roads");
  await activate(page, "curve");
  await click(page, 8.3982, 49.0093);
  await click(page, 8.3986, 49.0104);
  // Pick the handle at the start (a third along the chord) and bend the curve.
  await click(page, 8.39833, 49.00967);
  await hover(page, 8.3976, 49.0099);
  await mapShot(page, "draw-curve");
});

test("modify scenes", async ({ page }) => {
  await start(page);
  await editMode(page);

  // Vertex edit: pick the north-east corner of parcel 1 and drag it.
  await select(page, "parcels", 1);
  await activate(page, "modify");
  await click(page, 8.401, 49.0105);
  await hover(page, 8.4007, 49.0109);
  await mapShot(page, "modify-vertices");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Enter");

  // Move parcel 2 by its south-west corner.
  await select(page, "parcels", 2);
  await activate(page, "move");
  await click(page, 8.4012, 49.009);
  await hover(page, 8.4022, 49.0096);
  await mapShot(page, "move");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  // Rotate parcel 2 around its south-west corner.
  await select(page, "parcels", 2);
  await activate(page, "rotate");
  await click(page, 8.4012, 49.009);
  await click(page, 8.403, 49.009);
  await hover(page, 8.4027, 49.0099);
  await mapShot(page, "rotate");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  // Offset parcel 1 by 10 m, side outside.
  await select(page, "parcels", 1);
  await activate(page, "offset");
  await type(page, "10");
  await hover(page, 8.3986, 49.0098);
  await mapShot(page, "offset");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
});

test("trim scenes", async ({ page }) => {
  await start(page);
  // A road running through both parcels.
  await editLayer(page, "Roads");
  await activate(page, "draw");
  await click(page, 8.3982, 49.0098);
  await click(page, 8.4038, 49.0098);
  await page.keyboard.press("Enter");
  await laterAttributes(page);
  await page.evaluate(() => window.editor.tools.deactivate());
  await select(page, "parcels", 1);
  await activate(page, "trim");
  await hover(page, 8.3986, 49.0098);
  await mapShot(page, "trim-before");
  await click(page, 8.3986, 49.0098);
  await laterAttributes(page);
  await page.mouse.move(5, 450);
  await mapShot(page, "trim-after");
});

test("drafts", async ({ page }) => {
  await start(page);
  await editMode(page);
  await activate(page, "draw", { type: "Polygon" });
  await click(page, 8.3972, 49.0096);
  await click(page, 8.3984, 49.0096);
  await click(page, 8.3984, 49.0104);
  await click(page, 8.3972, 49.0104);
  await page.keyboard.press("Enter");
  await page.evaluate(() => window.editor.tools.deactivate());
  // Selecting drafts reveals the Layers flyout; close it for the map.
  await closeFlyout(page, "layers");
  await page.mouse.move(5, 450);
  await mapShot(page, "draft-sketch");
  await openFlyout(page, "layers");
  await shot(page.locator("olcad-layer-list"), "draft-move");
});

test("templates and measuring", async ({ page }) => {
  await start(page);
  await editMode(page);
  await select(page, "parcels", 2);
  await activate(page, "template-copy");
  await click(page, 8.4012, 49.009);
  await type(page, "Small parcel");
  await expect
    .poll(() => page.evaluate(() => window.editor.templates.list().length))
    .toBe(1);
  await openFlyout(page, "templates");
  await shot(page.locator("olcad-template-list"), "templates");
  await closeFlyout(page, "templates");
  const id = await page.evaluate(() => window.editor.templates.list()[0]!.id);
  await activate(page, "template-insert", { template: id });
  await hover(page, 8.4035, 49.0092);
  await mapShot(page, "template-insert");
  await page.keyboard.press("Escape");

  await page.evaluate(() => window.editor.setEditMode(false));
  await activate(page, "measure-distance");
  await click(page, 8.399, 49.0087);
  await click(page, 8.401, 49.0087);
  await click(page, 8.403, 49.0087);
  await page.keyboard.press("Enter");
  await activate(page, "measure-area");
  await click(page, 8.402, 49.0096, "Alt");
  await activate(page, "measure-angle");
  await click(page, 8.3999, 49.0105);
  await click(page, 8.4011, 49.0088);
  await click(page, 8.4027, 49.0102);
  await page.mouse.move(5, 450);
  await mapShot(page, "measure");
  await openFlyout(page, "measurements");
  await shot(page.locator("olcad-measure-results"), "measure-results");
});
