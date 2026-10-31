import test from "node:test";
import assert from "node:assert/strict";
import { createWrist } from "../src/core.js";
import { createPhiSurf, phiSurfTree } from "../src/phisurf.js";
import {
  OPERATOR_PASSPORT_KEY, createOperatorPassportBridge, parseOperatorPassport,
  operatorPassportSummary, validateOperatorPassport,
} from "../src/operator-passport.js";

const passport = (standard = [], chaos = []) => ({
  format: "phioperator-passport", version: 1,
  results: [
    ...standard.map((score, i) => ({ rank: i + 1, mode: "standard", bestScore: score })),
    ...chaos.map((score, i) => ({ rank: i + 1, mode: "chaos", bestScore: score })),
  ],
});
function fakeStore() {
  const state = new Map();
  return { getItem: k => state.get(k) ?? null, setItem: (k,v) => state.set(k,v),
    removeItem: k => state.delete(k), raw: state };
}

test("PhiOperator v1 format, bounds and duplicate results are strictly checked", () => {
  assert.deepEqual(validateOperatorPassport(passport([9])), passport([9]));
  for (const payload of [
    { format: "other", version: 1, results: [] },
    passport([10]), passport([-1]), passport([1.5]),
    { format: "phioperator-passport", version: 2, results: [] },
    { ...passport(), results: [{ rank: 1, mode: "standard", bestScore: 9 },
      { rank: 1, mode: "standard", bestScore: 8 }] },
    { ...passport(), results: [{ rank: 1, mode: "admin", bestScore: 9 }] },
    { ...passport(), results: [{ rank: 99, mode: "standard", bestScore: 9 }] },
    { ...passport(), results: new Array(13).fill({ rank: 1, mode: "standard", bestScore: 9 }) },
  ]) assert.throws(() => validateOperatorPassport(payload), TypeError);
  assert.throws(() => parseOperatorPassport("x".repeat(16385)), TypeError);
  assert.throws(() => parseOperatorPassport("{oops"), SyntaxError);
});

test("rank 2 and 3 cosmetic rewards require sequential standard clears", () => {
  assert.deepEqual(operatorPassportSummary(null).rewards, []);
  assert.deepEqual(operatorPassportSummary(passport([9])).rewards, []);
  assert.deepEqual(operatorPassportSummary(passport([9,9])).rewards, ["phisurf-wheel"]);
  assert.deepEqual(operatorPassportSummary(passport([9,7,9])).rewards,
    ["phisurf-wheel", "genewrist-pulse"]);
  assert.equal(operatorPassportSummary(passport([9,6,9])).clearedRank, 1);
  assert.equal(operatorPassportSummary(passport([], [9,9,9])).clearedRank, 0);
  assert.equal(operatorPassportSummary(passport([9,9,9,9,9,9])).nextRank, 6);
});

test("explicit import, export, refresh and removal remain isolated", () => {
  const storage = fakeStore();
  const bridge = createOperatorPassportBridge({ storage });
  assert.equal(bridge.snapshot().imported, false);
  assert.equal(storage.raw.has(OPERATOR_PASSPORT_KEY), false);
  let changes = 0;
  const unsubscribe = bridge.subscribe(() => changes++);
  const input = JSON.stringify(passport([9,9,9]));
  const state = bridge.import(input);
  assert.equal(state.persisted, true);
  assert.equal(bridge.hasReward("phisurf-wheel"), true);
  assert.equal(bridge.hasReward("genewrist-pulse"), true);
  assert.equal(changes, 1);
  assert.equal(JSON.parse(bridge.export()).results.length, 3);
  const fresh = createOperatorPassportBridge({ storage });
  assert.equal(fresh.snapshot().clearedRank, 3);
  bridge.clear();
  assert.equal(storage.raw.has(OPERATOR_PASSPORT_KEY), false);
  assert.equal(changes, 2);
  unsubscribe(); bridge.dispose(); fresh.dispose();
  assert.throws(() => bridge.import(input), /disposed/);
});

test("blocked storage still permits nonpersistent import and explicit export", () => {
  const storage = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); },
    removeItem() { throw Error("blocked"); } };
  const bridge = createOperatorPassportBridge({ storage });
  const imported = bridge.import(JSON.stringify(passport([9,9])));
  assert.equal(imported.persisted, false);
  assert.equal(bridge.snapshot().clearedRank, 2);
  assert.ok(bridge.export()?.includes("phioperator-passport"));
  bridge.dispose();
});

test("PhiSurf keeps six canonical destinations while exposing optional shortcuts", async () => {
  const w = createWrist();
  const bridge = createOperatorPassportBridge();
  w.toggleFavorite("sigl-designer");
  let tree = phiSurfTree(w.snapshot(), { operatorRewards: [] });
  assert.equal(tree.children.length, 6);
  assert.equal(tree.children[4].children.length, 3);
  bridge.import(JSON.stringify(passport([9,9])));
  tree = phiSurfTree(w.snapshot(), { operatorRewards: bridge.snapshot().rewards });
  assert.equal(tree.children.length, 6);
  assert.equal(tree.children[4].children.length, 4);
  assert.equal(tree.children[4].children[3].id, "operator-shortcuts");
  const surf = createPhiSurf({ wrist: w, operatorBridge: bridge });
  surf.open();
  await surf.activate(4);
  assert.equal(surf.snapshot().items[3].label, "OPERATOR SHORTCUTS");
  await surf.activate(3);
  assert.equal(surf.snapshot().items[0].kind, "app");
  assert.equal(await surf.activate(0), true);
  assert.equal(w.snapshot().activeApp, "sigl-designer");
  assert.equal(w.snapshot().apps.length, 18);
  assert.equal(w.snapshot().worldHost, null);
  surf.dispose(); bridge.dispose(); w.dispose();
});

test("revoking imported progress removes optional shortcuts without changing navigation", async () => {
  const w = createWrist();
  const bridge = createOperatorPassportBridge();
  bridge.import(JSON.stringify(passport([9,9])));
  const surf = createPhiSurf({ wrist: w, operatorBridge: bridge });
  surf.open(); await surf.activate(4);
  assert.equal(surf.snapshot().items.length, 4);
  bridge.clear();
  assert.equal(surf.snapshot().items.length, 3);
  assert.deepEqual(surf.snapshot().path, ["modules"]);
  surf.dispose(); bridge.dispose(); w.dispose();
});
