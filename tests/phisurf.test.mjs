import test from "node:test";
import assert from "node:assert/strict";
import { createWrist } from "../src/core.js";
import { createWorldAdapter } from "../src/world-adapter.js";
import { createPhiSurf, phiSurfTree, radialIndex } from "../src/phisurf.js";
import { CATALOG, RINGS } from "../src/catalog.js";

function host({ count = 1, calls } = {}) {
  const actions = Array.from({ length: count }, (_, i) => ({
    id: "do-" + i, label: "ACTION " + i, capability: "operate",
  }));
  return createWorldAdapter({
    manifest: {
      apiVersion: 1, id: "test-host", title: "Test Host",
      initialContext: "work", capabilities: ["operate"], actions,
      contexts: [
        { id: "work", title: "Working", layout: "studio", fields: [],
          controls: actions.map((item) => ({ action: item.id, label: item.label })) },
        { id: "idle", title: "Idle", layout: "dashboard", fields: [], controls: [] },
      ],
    },
    readState: () => ({ contextId: "work", status: {} }),
    actions: Object.fromEntries(actions.map((item) => [
      item.id, () => { calls.push(item.id); return true; },
    ])),
  });
}

test("PhiSurf preserves canonical rings and six fixed destinations", () => {
  const w = createWrist();
  const tree = phiSurfTree(w.snapshot());
  assert.deepEqual(tree.children.map((item) => item.id), [
    "home", "universal", "world", "atlas", "modules", "back",
  ]);
  const groups = tree.children[4].children;
  assert.deepEqual(groups.map((item) => item.children.length), [3, 6, 9]);
  assert.equal(groups.flatMap((group) => group.children).length, CATALOG.length);
  assert.deepEqual(groups.map((group) => group.label.split(" / ")[0]), RINGS.map((ring) => String(ring.count)));
  w.dispose();
});

test("PhiSurf opens nested rings, navigates, and is never a nineteenth module", async () => {
  const w = createWrist();
  const surf = createPhiSurf({ wrist: w });
  const initial = w.snapshot().preferences;
  surf.open();
  assert.equal(surf.snapshot().items.length, 6);
  assert.equal(await surf.activate(4), true); // modules
  assert.equal(await surf.activate(0), true); // first canonical ring
  const item = CATALOG.find((app) => app.ring === RINGS[0].id);
  assert.equal(await surf.activate(0), true);
  assert.equal(w.snapshot().activeApp, item.id);
  assert.equal(w.snapshot().preferences.ring, item.ring);
  assert.equal(w.snapshot().apps.length, 18);
  assert.equal(surf.snapshot().open, false);
  surf.open(); await surf.activate(3); // realm atlas
  assert.equal(w.snapshot().destination, "atlas");
  surf.open(); await surf.activate(0); // local home
  assert.equal(w.snapshot().destination, "home");
  assert.equal(surf.snapshot().open, false);
  assert.equal(initial.theme, w.snapshot().preferences.theme);
  surf.dispose(); w.dispose();
});

test("PhiSurf cannot execute locked host commands or grant itself access", async () => {
  const calls = [];
  const w = createWrist();
  w.connectWorld(host({ calls }));
  const surf = createPhiSurf({ wrist: w });
  surf.open();
  await surf.activate(2); // WORLD submenu
  assert.equal(surf.snapshot().items[1].enabled, false);
  assert.equal(await surf.activate(1), false);
  assert.deepEqual(calls, []);
  w.setWorldGrants(["operate"]);
  assert.equal(surf.snapshot().items[1].enabled, true);
  assert.equal(await surf.activate(1), true);
  assert.deepEqual(calls, ["do-0"]);
  assert.equal(surf.snapshot().open, false);
  surf.dispose(); w.dispose();
});

test("Context changes remove obsolete host actions while the dial is open", async () => {
  const calls = [];
  const w = createWrist();
  w.connectWorld(host({ calls }), { grants: ["operate"] });
  const surf = createPhiSurf({ wrist: w });
  surf.open(); await surf.activate(2);
  w.updateWorld({ contextId: "idle", status: {} });
  assert.equal(surf.snapshot().items.length, 1);
  assert.equal(await surf.activate(1), false);
  assert.deepEqual(calls, []);
  w.disconnectWorld();
  assert.equal(surf.snapshot().items.length, 1);
  surf.dispose(); w.dispose();
});

test("Large host menus page within nine radial slots", async () => {
  const calls = [];
  const w = createWrist();
  w.connectWorld(host({ count: 16, calls }), { grants: ["operate"] });
  const surf = createPhiSurf({ wrist: w });
  surf.open(); await surf.activate(2);
  assert.equal(surf.snapshot().items.length, 9);
  assert.equal(surf.snapshot().items[8].kind, "menu");
  await surf.activate(8);
  assert.equal(surf.snapshot().items.length, 9);
  await surf.activate(1);
  assert.deepEqual(calls, ["do-8"]);
  surf.dispose(); w.dispose();
});

test("Back, disabled selection, subscriptions, and cleanup are bounded", async () => {
  const w = createWrist();
  const surf = createPhiSurf({ wrist: w });
  let changed = 0;
  const off = surf.subscribe(() => changed++);
  assert.equal(await surf.activate(0), false); // closed
  surf.open(); surf.select(2);
  const count = changed;
  surf.select(2);
  assert.equal(changed, count);
  await surf.activate(4);
  assert.deepEqual(surf.snapshot().path, ["modules"]);
  assert.equal(surf.back(), true);
  assert.deepEqual(surf.snapshot().path, []);
  assert.equal(surf.back(), true);
  assert.equal(surf.snapshot().open, false);
  off(); surf.dispose(); w.dispose();
});

test("Radial mapping is deterministic and refuses neutral or invalid directions", () => {
  assert.equal(radialIndex(0, -1, 6), 0);
  assert.equal(radialIndex(1, 0, 6), 2);
  assert.equal(radialIndex(0, 1, 6), 3);
  assert.equal(radialIndex(0, 0, 6, { inner: 0.3 }), -1);
  assert.equal(radialIndex(0.5, 0, 6, { inner: 0.55 }), -1);
  assert.equal(radialIndex(1.5, 0, 6, { inner: 0, outer: 1 }), -1);
  assert.equal(radialIndex(Infinity, 1, 6), -1);
  assert.equal(radialIndex(0, -1, 0), -1);
  assert.equal(radialIndex(0, -1, 10), -1);
  assert.equal(radialIndex(0, -1, 6, { inner: -1 }), -1);
});
