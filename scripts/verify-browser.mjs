import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { installBrowserXRFixture } from "./browser-xr-fixture.mjs";
const port = 4179,
  base = "http://localhost:" + port + "/GenEWrist/";
const server = spawn(process.execPath, ["scripts/serve.mjs"], {
  env: { ...process.env, PORT: String(port), SERVE_DIST: "1" },
  stdio: "pipe",
});
let browser, page;
const results = [],
  errors = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log("PASS / " + name);
  } catch (error) {
    results.push({ name, pass: false, details: String(error) });
    throw error;
  }
}
// These tail scenarios own fresh browser contexts. Preserve all failures in one run.
async function checkIndependent(name, fn) {
  try {
    await check(name, fn);
  } catch (error) {
    process.exitCode = 1;
    console.error("Independent browser check failed:", name, error);
    await page
      ?.screenshot({
        path:
          "browser-evidence/FAILURE-" +
          name.replace(/[^a-z0-9]+/gi, "-").slice(0, 70) +
          ".png",
        fullPage: true,
      })
      .catch(() => {});
  }
}
const evidence = async (name) =>
  page.screenshot({
    path: "browser-evidence/" + name + ".png",
    fullPage: true,
  });
const nav = (id) =>
  page.locator('.global-nav [data-action=navigate][data-id="' + id + '"]');
const app = async (id, ring = "middle") => {
  await page.locator('#ring-controls [data-id="' + ring + '"]').click();
  await page.locator('.orbit-item[data-id="' + id + '"]').click();
};
const setting = async (fn) => {
  await page.locator(".nav-settings").click();
  await fn();
  await page.getByRole("button", { name: "DONE", exact: true }).click();
};
try {
  await mkdir("browser-evidence", { recursive: true });
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (server.exitCode != null) throw Error("Static server exited");
    try {
      if ((await fetch(base)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await sleep(100);
  }
  assert(ready, "Static server did not start");
  browser = await chromium.launch({
    headless: true,
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await check(
    "desktop loads with honest standalone Glance status and no page errors",
    async () => {
      assert.equal((await page.goto(base)).status(), 200);
      await page
        .getByRole("heading", { name: /ONE WRIST.*EVERY WORLD/ })
        .waitFor();
      assert.equal(await page.locator(".meter").count(), 3);
      assert(
        await page
          .getByText("STANDALONE / NO HOST CONNECTED", { exact: true })
          .isVisible(),
      );
    },
  );
  await evidence("01-desktop-glance");
  await check("PhiSurf keyboard dial traverses the canonical nested menus", async () => {
    await page.keyboard.press("Shift+Space");
    const surf = page.getByRole("dialog", { name: "PhiSurf quick navigation" });
    await surf.waitFor();
    assert.equal(await surf.locator(".phisurf-item").count(), 6);
    await surf.locator(".phisurf-item").nth(4).click();
    assert.equal(await surf.locator(".phisurf-item").count(), 3);
    await surf.locator(".phisurf-item").nth(1).click();
    assert.equal(await surf.locator(".phisurf-item").count(), 6);
    await surf.getByRole("button", { name: "← BACK" }).click();
    assert.equal(await surf.locator(".phisurf-item").count(), 3);
    await surf.getByRole("button", { name: "CLOSE" }).click();
    assert.equal(await surf.isVisible(), false);
  });
  await check("PhiSurf supports center-origin hold-flick-release and keeps keyboard focus inside", async () => {
    await page.keyboard.press("Shift+Space");
    const surf = page.getByRole("dialog", { name: "PhiSurf quick navigation" });
    const center = surf.getByRole("button", { name: "Hold and flick from the center" });
    await center.waitFor();
    assert.equal(await center.evaluate((el) => el === document.activeElement), true);
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.querySelector(".phisurf-panel").contains(document.activeElement)), true);
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.evaluate(() => document.querySelector(".phisurf-panel").contains(document.activeElement)), true);
    const centerBox = await center.boundingBox();
    const top = surf.locator(".phisurf-item").first();
    const itemBox = await top.boundingBox();
    await page.mouse.move(centerBox.x + centerBox.width / 2, centerBox.y + centerBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2, { steps: 5 });
    await page.mouse.up();
    assert.equal(await surf.isVisible(), false);
    assert.equal(await page.locator(".meter").count(), 3);
  });
  await check("PhiSurf chain-surf traverses two menu levels in one held pointer gesture", async () => {
    await page.keyboard.press("Shift+Space");
    const dial = page.getByRole("dialog", { name: "PhiSurf quick navigation" });
    const center = dial.getByRole("button", { name: "Hold and flick from the center" });
    const box = await center.boundingBox();
    const middle = [box.x + box.width / 2, box.y + box.height / 2];
    const aimAt = async (index) => {
      const target = await dial.locator(".phisurf-item").nth(index).boundingBox();
      await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 4 });
    };
    await page.mouse.move(...middle);
    await page.mouse.down();
    await aimAt(4); // MODULES, menu 1
    await page.waitForFunction(() => document.querySelectorAll(".phisurf-item").length === 3, null, { timeout: 3000 });
    await aimAt(0); // OUTER, menu 2
    await page.waitForFunction(() => document.querySelectorAll(".phisurf-item").length === 3 &&
      document.querySelector(".phisurf-center")?.textContent?.includes("IDENTITY"), null, { timeout: 3000 });
    await aimAt(1); // A different direction, a real action in canonical outer ring
    await page.mouse.up();
    assert.equal(await dial.isVisible(), false);
    assert.notEqual(await page.locator("#workspace-title").innerText(), "A home between worlds.");
    // Restore the exact Glance/middle-ring baseline required by existing suites.
    await page.locator('[data-action="close-app"]').click();
    await page.locator('#ring-controls [data-id="middle"]').click();
    await page.locator('.device-bottom [data-action="mode-toggle"]').click();
    assert.equal(await page.locator(".meter").count(), 3);
  });
  await check("PhiSurf pad requires neutral re-arm and does not select a held stick on activation", async () => {
    await page.keyboard.press("Shift+Space");
    const dial = page.getByRole("dialog", { name: "PhiSurf quick navigation" });
    await page.evaluate(() => {
      window.__phisurfPad = {
        connected: true,
        axes: [1, 0],
        buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
      };
      Object.defineProperty(navigator, "getGamepads", {
        configurable: true,
        value: () => [window.__phisurfPad],
      });
    });
    await dial.getByRole("button", { name: "PAD: OFF" }).click();
    await page.waitForTimeout(120); // prime edge detection
    await page.evaluate(() => { window.__phisurfPad.buttons[0].pressed = true; });
    await page.waitForTimeout(120);
    assert.equal(await dial.locator(".phisurf-item[aria-current=true]").count(), 0);
    await page.evaluate(() => {
      window.__phisurfPad.buttons[0].pressed = false;
      window.__phisurfPad.axes = [0, 0];
    });
    await page.waitForTimeout(250); // allow neutral sample on slow CI workers
    await page.evaluate(() => { window.__phisurfPad.axes = [1, 0]; });
    await page.waitForFunction(
      () => [...document.querySelectorAll(".phisurf-panel .phisurf-item")]
        .some((el) => el.getAttribute("aria-current") === "true"),
      null, { timeout: 4000 },
    );
    await page.evaluate(() => { window.__phisurfPad.buttons[0].pressed = true; });
    await page.waitForFunction(() => document.querySelector(".phisurf-center")?.textContent?.includes("WORLD"), null, { timeout: 3000 });
    assert.equal(await dial.locator(".phisurf-item").count(), 1);
    await page.evaluate(() => { window.__phisurfPad.buttons[0].pressed = false; });
    await page.waitForTimeout(100);
    assert.equal(await dial.locator(".phisurf-item[aria-current=true]").count(), 0);
    await dial.getByRole("button", { name: "PAD: ON" }).click();
    await dial.getByRole("button", { name: "CLOSE" }).click();
    await page.evaluate(() => { delete navigator.getGamepads; delete window.__phisurfPad; });
  });
  await check(
    "Field mode reveals six middle-ring modules and nested 3–6–9 mechanism",
    async () => {
      await page
        .getByRole("button", { name: "ACTIVATE FIELD MODE", exact: true })
        .click();
      assert.equal(await page.locator(".orbit-item").count(), 6);
      assert.equal(await page.locator(".nested-ring").count(), 3);
      assert.equal(
        await page.locator(".wheel-center strong").innerText(),
        "3·6·9",
      );
    },
  );
  await check(
    "3 / 6 / 9 navigation preserves exact canonical counts",
    async () => {
      for (const [id, count] of [
        ["outer", 3],
        ["inner", 9],
        ["middle", 6],
      ]) {
        await page.locator('#ring-controls [data-id="' + id + '"]').click();
        assert.equal(await page.locator(".orbit-item").count(), count);
      }
    },
  );
  await evidence("02-expanded-rings");
  await check(
    "Realm Atlas offers documented destinations, unavailable Porch and search",
    async () => {
      await app("realm-atlas");
      assert.equal(await page.locator("button[data-action=launch]").count(), 6);
      assert(
        await page.getByText("Infinite Porch", { exact: true }).isVisible(),
      );
      assert.equal(
        await page
          .locator(
            ".world-card[data-id=infinite-porch] button[data-action=launch]",
          )
          .count(),
        0,
      );
      await page.getByLabel("Search worlds").fill("Domistika");
      assert.equal(await page.locator(".world-card").count(), 1);
      await page.getByLabel("Search worlds").fill("");
    },
  );
  await check(
    "favorites persist across reload and favorites filter works",
    async () => {
      await page.locator("[data-action=favorite][data-id=btm]").click();
      await page.reload();
      await app("realm-atlas");
      assert.equal(
        await page.locator("[data-action=favorite][data-id=btm]").innerText(),
        "★",
      );
      await page.getByLabel("Filter worlds").selectOption("favorites");
      assert.equal(await page.locator(".world-card").count(), 1);
      await page.getByLabel("Filter worlds").selectOption("all");
    },
  );
  await check(
    "external-world handoff has an accessible cancel with no recents recorded",
    async () => {
      await page.locator("[data-action=launch][data-id=btm]").click();
      assert(
        await page
          .getByRole("dialog", { name: "Leave for another world?" })
          .isVisible(),
      );
      await page
        .getByRole("button", { name: "CANCEL / STAY HERE", exact: true })
        .click();
      assert.equal(page.url(), base);
      const preferences = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("genewrist.settings.v1")),
      );
      assert.deepEqual(preferences.recent, []);
    },
  );
  await evidence("03-realm-atlas");
  await check(
    "Loom Market filters categories and launches actual bundled apps",
    async () => {
      await app("loom-market");
      await page.locator("[data-action=market][data-id=Creation]").click();
      assert(
        (await page.getByText("SIGL Designer", { exact: true }).count()) > 0,
      );
      await page
        .locator(".catalog-card")
        .filter({ hasText: "SIGL Designer" })
        .getByRole("button", { name: "OPEN", exact: true })
        .click();
      await page.locator("#glyph-canvas").waitFor();
    },
  );
  await check(
    "SIGL supports real pointer drawing, undo/redo, layers and geometric stamps",
    async () => {
      const canvas = page.locator("#glyph-canvas"),
        box = await canvas.boundingBox();
      await page.mouse.move(box.x + 40, box.y + 40);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, {
        steps: 8,
      });
      await page.mouse.up();
      assert(
        await canvas.evaluate((el) =>
          el
            .getContext("2d")
            .getImageData(0, 0, 640, 480)
            .data.some((v, i) => i % 4 === 3 && v > 0),
        ),
      );
      await page.locator("[data-action=glyph-undo]").click();
      assert.equal(
        await page.locator("#glyph-canvas").evaluate((el) =>
          el
            .getContext("2d")
            .getImageData(0, 0, 640, 480)
            .data.some((v, i) => i % 4 === 3 && v > 0),
        ),
        false,
      );
      await page.locator("[data-action=glyph-redo]").click();
      await page.locator("[data-action=layer-add]").click();
      assert.equal(await page.locator("#layer-select option").count(), 2);
      await page.locator("[data-action=glyph-stamp][data-id=star]").click();
      await page.getByLabel("SIGL project title").fill("Field test SIGL");
      await page.locator("[data-action=glyph-save]").click();
      await page
        .getByText("SIGL project saved locally.", { exact: true })
        .waitFor();
    },
  );
  await check(
    "SIGL PNG/SVG exports create real user-owned downloads",
    async () => {
      for (const type of ["png", "svg"]) {
        const waiting = page.waitForEvent("download");
        await page
          .locator("[data-action=glyph-export][data-id=" + type + "]")
          .click();
        const download = await waiting;
        assert(download.suggestedFilename().endsWith("." + type));
        await download.saveAs("browser-evidence/export-sigl." + type);
      }
    },
  );
  await evidence("04-sigl-designer");
  await check(
    "JourneyLog manually saves notes, survives reload and exports a validated archive",
    async () => {
      await app("journey-log");
      await page.locator("#journal-title").fill("A walk through the Field");
      await page.locator("#journal-world").fill("Test world");
      await page
        .locator("#journal-note")
        .fill("Private, manual note. No automatic recording.");
      await page
        .getByRole("button", { name: "SAVE PRIVATE NOTE", exact: true })
        .click();
      assert.equal(await page.locator(".journal-entry").count(), 1);
      await page.reload();
      await app("journey-log");
      assert(
        await page
          .getByText("Private, manual note. No automatic recording.", {
            exact: true,
          })
          .isVisible(),
      );
      const waiting = page.waitForEvent("download");
      await page.locator("[data-action=content-export]").click();
      await (await waiting).saveAs("browser-evidence/creative-archive.json");
    },
  );
  await check(
    "invalid journal archive import preserves saved notes",
    async () => {
      await page.locator("#content-file").setInputFiles({
        name: "invalid.json",
        mimeType: "application/json",
        buffer: Buffer.from('{"version":99}'),
      });
      await page
        .getByRole("status")
        .getByText(/Invalid content archive/)
        .waitFor();
      assert.equal(await page.locator(".journal-entry").count(), 1);
    },
  );
  await evidence("05-journeylog");
  await check(
    "virtual geometry measurements and reset follow actual dimensions",
    async () => {
      await app("snake-toolkit");
      assert(
        (await page.locator(".measurement-grid").innerText()).includes("24.00"),
      );
      await page.locator("#geometry-width").press("End");
      assert(
        (await page.locator(".measurement-grid").innerText()).includes("60.00"),
      );
      await page.locator("[data-action=geometry-reset]").click();
      assert(
        (await page.locator(".measurement-grid").innerText()).includes("24.00"),
      );
      await page.locator("[data-action=geometry-mirror]").click();
      assert(
        await page
          .getByRole("button", { name: "LEFT-HAND GAUGE / ON", exact: true })
          .isVisible(),
      );
    },
  );
  await evidence("06-virtual-toolkit");
  await check(
    "DriftRocks plays to nine, topples on imbalance and restarts",
    async () => {
      await app("driftrocks", "inner");
      for (let i = 0; i < 9; i++)
        await page
          .locator(
            "[data-action=rock][data-id=" + (i % 2 ? "right" : "left") + "]",
          )
          .click();
      assert.equal(await page.locator(".rock").count(), 9);
      await page.locator("[data-action=rock-reset]").click();
      for (let i = 0; i < 3; i++)
        await page.locator("[data-action=rock][data-id=left]").click();
      assert.equal(await page.locator(".rock").count(), 0);
    },
  );
  await check(
    "Laughter Forge and GlowMotes have distinct working interactions",
    async () => {
      await app("laughter-forge", "inner");
      const before = await page.locator(".laughter-display").innerText();
      await page.locator("[data-action=forge]").click();
      assert.notEqual(
        await page.locator(".laughter-display").innerText(),
        before,
      );
      await app("glowmotes", "inner");
      await page
        .getByRole("button", { name: "GlowMote 1", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "GlowMote 1", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
    },
  );
  await check(
    "World registration is opt-in and no action is usable without a grant",
    async () => {
      await nav("world").click();
      await page.locator("[data-action=host-connect][data-id=btm]").click();
      assert(
        await page
          .getByRole("button", { name: "ORI PULSE", exact: true })
          .isDisabled(),
      );
      await page.locator(".grant-input[data-capability=ori]").check();
      await page
        .getByRole("button", { name: "ORI PULSE", exact: true })
        .click();
      assert((await page.locator(".host-status").innerText()).includes("66%"));
      assert(
        await page
          .getByRole("button", { name: "TACTICAL MAP", exact: true })
          .isDisabled(),
      );
    },
  );
  await evidence("07-world-combat");
  await check(
    "host context changes replace layouts and controls without closing the wrist",
    async () => {
      await page.locator("[data-action=host-connect][data-id=studio]").click();
      assert(await page.locator(".layout-studio").isVisible());
      await page.locator("[data-action=host-context][data-id=paint]").click();
      assert(
        await page.getByText("Field pigments", { exact: true }).isVisible(),
      );
      assert.equal(
        await page
          .getByRole("button", { name: "NEXT SCULPT TOOL", exact: true })
          .count(),
        0,
      );
      assert(
        await page
          .getByRole("button", { name: "ROTATE PALETTE", exact: true })
          .isDisabled(),
      );
    },
  );
  await evidence("08-world-painting");
  await check(
    "Explorer and inventory hosts expose a third distinct approved layout",
    async () => {
      await page.locator("[data-action=host-connect][data-id=porch]").click();
      assert(await page.locator(".layout-explorer").isVisible());
      await page
        .locator("[data-action=host-context][data-id=inventory]")
        .click();
      assert(await page.locator(".layout-inventory").isVisible());
      assert(
        await page.getByText("The spare key", { exact: true }).isVisible(),
      );
    },
  );
  await evidence("09-world-inventory");
  await check(
    "host context cannot trap Home, Universal or Back and is never persisted",
    async () => {
      await page.locator(".nav-home").click();
      assert(
        await page
          .getByRole("heading", { name: "A home between worlds.", exact: true })
          .isVisible(),
      );
      await nav("universal").click();
      await page.getByRole("button", { name: "Back", exact: true }).click();
      await nav("world").click();
      await page.locator("[data-action=host-disconnect]").click();
      const saved = await page.evaluate(() =>
        JSON.stringify({ ...localStorage }),
      );
      for (const privateValue of [
        "btm-demo",
        "studio-demo",
        "porch-demo",
        "Wake-Up Slap",
      ])
        assert(!saved.includes(privateValue));
      await page.reload();
      await nav("world").click();
      assert.equal(await page.locator(".host-picker .host-card").count(), 3);
    },
  );
  await check(
    "theme, text, motion, contrast and Home settings persist; reset preserves content",
    async () => {
      await setting(async () => {
        await page.locator("#theme-select").selectOption("nevora");
        await page.locator("#text-scale").selectOption("large");
        await page.locator("#motion-toggle").check();
        await page.locator("#contrast-toggle").check();
        await page.locator("#home-select").selectOption("btm");
      });
      assert.equal(
        await page.locator("body").getAttribute("data-theme"),
        "nevora",
      );
      assert(
        (await page.locator("body").getAttribute("class")).includes(
          "text-large",
        ),
      );
      await page.locator(".nav-home").click();
      assert(
        (await page.locator("#travel-description").innerText()).includes(
          "Break the Matrix",
        ),
      );
      await page
        .getByRole("button", { name: "CANCEL / STAY HERE", exact: true })
        .click();
      await page.locator(".nav-settings").click();
      page.once("dialog", (d) => d.accept());
      await page.locator("#reset-button").click();
      await page.getByRole("button", { name: "DONE", exact: true }).click();
      assert.equal(
        await page.locator("body").getAttribute("data-theme"),
        "neon",
      );
      await app("journey-log");
      assert.equal(await page.locator(".journal-entry").count(), 1);
    },
  );
  await check(
    "confirmed handoff records history only after explicit opt-in",
    async () => {
      await app("realm-atlas");
      await page.getByLabel("Filter worlds").selectOption("recent");
      assert(await page.getByText(/History is off/).isVisible());
      await setting(async () => page.locator("#history-toggle").check());
      assert.equal(await page.getByText(/History is off/).count(), 0);
      await page.getByLabel("Filter worlds").selectOption("all");
      await page.route("https://michaelwave369.github.io/BTM/", (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<title>Intercepted test destination</title><h1>Confirmed test handoff</h1>",
        }),
      );
      await page.locator("[data-action=launch][data-id=btm]").click();
      await page
        .getByRole("button", { name: "CONFIRM & OPEN ↗", exact: true })
        .click();
      await page.waitForURL("https://michaelwave369.github.io/BTM/");
      await page.goto(base);
      const prefs = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("genewrist.settings.v1")),
      );
      assert.deepEqual(prefs.recent, ["btm"]);
    },
  );
  await check(
    "offline shell reloads at /GenEWrist/ and opens local creative tools",
    async () => {
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.reload();
      await page.waitForFunction(
        () => navigator.serviceWorker.controller !== null,
      );
      await context.setOffline(true);
      await page.reload();
      await app("sigl-designer");
      assert(await page.locator("#glyph-canvas").isVisible());
      assert(
        (await page.locator("#network-state").innerText()).includes("OFFLINE"),
      );
      await context.setOffline(false);
    },
  );
  await check(
    "unavailable WebXR handles intentional entry without breaking the console",
    async () => {
      await page.locator("#xr-button").click();
      await page
        .getByRole("status")
        .getByText(/XR unavailable/)
        .waitFor();
      assert.equal(await page.locator("#xr-button").isDisabled(), false);
    },
  );
  await checkIndependent(
    "mobile touch layout preserves all navigation, ring hit areas and width at 390/320 px",
    async () => {
      const mobile = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
      });
      const previous = page;
      page = await mobile.newPage();
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(base);
      await nav("universal").click();
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        for (const ring of ["outer", "middle", "inner"]) {
          await page.locator("#ring-controls [data-id=" + ring + "]").click();
          const bounds = await page
            .locator(".orbit-item")
            .evaluateAll((nodes) =>
              nodes.map((el) => {
                const b = el.getBoundingClientRect(),
                  p = el.closest(".screen").getBoundingClientRect();
                return {
                  w: b.width,
                  h: b.height,
                  top: b.top - p.top,
                  bottom: p.bottom - b.bottom,
                  left: b.left - p.left,
                  right: p.right - b.right,
                };
              }),
            );
          for (const b of bounds) {
            assert(b.w >= 43 && b.h >= 43);
            assert(
              b.top >= -1 && b.bottom >= -1 && b.left >= -1 && b.right >= -1,
              "Clipped ring button at " + width + ": " + JSON.stringify(b),
            );
          }
        }
        const scrollWidth = await page.evaluate(
          () => document.documentElement.scrollWidth,
        );
        assert(
          scrollWidth <= width,
          "Horizontal overflow at " + width + "px: " + scrollWidth + "px",
        );
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await app("sigl-designer");
      await page.locator("[data-action=glyph-stamp][data-id=diamond]").tap();
      await page.locator("#glyph-canvas").scrollIntoViewIfNeeded();
      const touchCanvas = await page.locator("#glyph-canvas").boundingBox();
      await page.touchscreen.tap(
        touchCanvas.x + touchCanvas.width * 0.5,
        touchCanvas.y + touchCanvas.height * 0.4,
      );
      assert(
        await page.locator("#glyph-canvas").evaluate((el) =>
          el
            .getContext("2d")
            .getImageData(0, 0, 640, 480)
            .data.some((v, i) => i % 4 === 3 && v > 0),
        ),
      );
      await evidence("10-mobile-sigl");
      await nav("world").click();
      await page.locator("[data-action=host-connect][data-id=studio]").click();
      await page.locator("[data-action=host-context][data-id=paint]").click();
      await mobile.setOffline(true);
      await page
        .locator("#network-state.offline")
        .waitFor({ state: "visible" });
      await evidence("11-mobile-world");
      await mobile.setOffline(false);
      assert(await page.locator(".nav-home").isVisible());
      await mobile.close();
      page = previous;
    },
  );
  await checkIndependent(
    "blocked browser storage remains functional and offers session exports",
    async () => {
      const blocked = await browser.newContext();
      await blocked.addInitScript(() => {
        Storage.prototype.getItem = () => {
          throw Error("blocked");
        };
        Storage.prototype.setItem = () => {
          throw Error("blocked");
        };
      });
      const p = await blocked.newPage();
      await p.goto(base);
      await p.locator("#ring-controls [data-id=middle]").click();
      await p.locator(".orbit-item[data-id=sigl-designer]").click();
      await p.locator("[data-action=glyph-stamp][data-id=star]").click();
      await p.locator("[data-action=glyph-save]").click();
      await p
        .getByRole("status")
        .getByText(/Storage is unavailable/)
        .waitFor();
      await blocked.close();
    },
  );
  await checkIndependent(
    "real browser WebGL renders synthetic stereo, controller selections and cleanup",
    async () => {
      const xrContext = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        serviceWorkers: "block",
      });
      await xrContext.addInitScript(installBrowserXRFixture);
      const p = await xrContext.newPage();
      p.on("pageerror", (e) => errors.push(String(e)));
      await p.goto(base);
      await p
        .getByRole("button", { name: "ACTIVATE FIELD MODE", exact: true })
        .click();
      await p.locator("#xr-button").click();
      await p.waitForFunction(() => window.__softwareXR?.frames > 10);
      const before = await p.evaluate(() => ({
        frames: __softwareXR.frames,
        uploads: __softwareXR.uploads,
        draws: __softwareXR.draws,
      }));
      assert(before.draws >= before.frames * 2);
      const select = async (x, y) => {
        const uploads = await p.evaluate(() => __softwareXR.uploads);
        await p.evaluate(([x, y]) => __softwareXR.select(x, y), [x, y]);
        await p.waitForFunction(
          (previous) => __softwareXR.uploads > previous,
          uploads,
        );
      };
      await p.screenshot({ path: "browser-evidence/12-synthetic-stereo.png" });
      await select(710, 120);
      await p.waitForFunction(
        () =>
          document.querySelector("#workspace-title").textContent ===
          "In this world.",
      );
      await select(512, 412);
      await p.waitForFunction(
        () => document.querySelector(".layout-combat") !== null,
      );
      await select(247, 650);
      await select(272, 317);
      await select(314, 120);
      await select(770, 309);
      await p.waitForFunction(() =>
        document.querySelector(".host-status")?.textContent.includes("66%"),
      );
      await p.screenshot({
        path: "browser-evidence/13-synthetic-world-stereo.png",
      });
      await p.evaluate(() => __softwareXR.session.end());
      const deleted = await p.evaluate(() => __softwareXR.deleted);
      assert.deepEqual(deleted, { buffers: 5, textures: 1, programs: 2 });
      assert.equal(await p.locator(".host-actions").count(), 0);
      assert.equal(await p.locator("#software-xr-overlay").count(), 0);
      await xrContext.close();
    },
  );
  await checkIndependent(
    "zero JavaScript page errors across desktop, mobile, storage recovery and stereo tests",
    () => assert.deepEqual(errors, []),
  );
  console.log(
    "Browser verifications: " +
      results.filter((r) => r.pass).length +
      " / " +
      results.length +
      " passed",
  );
} catch (error) {
  console.error("Browser verification failed:", error);
  process.exitCode = 1;
  await page
    ?.screenshot({ path: "browser-evidence/FAILURE.png", fullPage: true })
    .catch(() => {});
} finally {
  await writeFile(
    "browser-evidence/results.json",
    JSON.stringify(results, null, 2),
  );
  await browser?.close().catch(() => {});
  server.kill("SIGTERM");
}
