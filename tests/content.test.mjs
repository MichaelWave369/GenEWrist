import test from "node:test";
import assert from "node:assert/strict";
import {
  createContentStore,
  CONTENT_KEY,
  freshDrawing,
  validateDrawing,
  parseContent,
  exportSVG,
  measureGeometry,
  forgeLine,
  rotatedPaths,
} from "../src/content.js";
import {
  createApplicationRegistry,
  BUNDLED_APPS,
} from "../src/application-registry.js";
import { esc, worldHTML } from "../src/views.js";
import { createWrist } from "../src/core.js";
import { createDemoHost } from "../src/adapters/demos.js";
const memory = () => {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) || null,
    setItem: (k, v) => map.set(k, v),
    map,
  };
};
const drawing = () => {
  const d = freshDrawing();
  d.layers[0].strokes.push({
    color: "#62e5ed",
    width: 4,
    symmetry: 4,
    points: [
      [320, 110],
      [430, 240],
    ],
  });
  return d;
};
test("SIGL layer projects round-trip through a validated local archive", () => {
  const storage = memory(),
    store = createContentStore(storage);
  store.save({
    version: 1,
    journal: [],
    sigls: [{ id: "art", title: "My mark", drawing: drawing() }],
  });
  assert.deepEqual(
    createContentStore(storage).snapshot().sigls[0].drawing,
    drawing(),
  );
  assert.equal(parseContent(store.export()).sigls.length, 1);
});
test("journal is manual, private and retained on settings reset", () => {
  const storage = memory(),
    store = createContentStore(storage);
  assert.equal(store.snapshot().journal.length, 0);
  store.save({
    version: 1,
    sigls: [],
    journal: [
      {
        id: "one",
        title: "A moment",
        world: "Hall",
        note: "Private words",
        created: "2026-10-28",
      },
    ],
  });
  const w = createWrist({ storage });
  w.reset();
  assert.equal(
    createContentStore(storage).snapshot().journal[0].note,
    "Private words",
  );
  assert(!JSON.stringify(w.snapshot().preferences).includes("Private words"));
});
test("blocked or corrupt storage preserves a usable session and an export path", () => {
  const store = createContentStore({
    getItem: () => "{oops",
    setItem: () => {
      throw Error("blocked");
    },
  });
  assert(store.warning());
  assert.equal(store.save({ version: 1, journal: [], sigls: [] }), false);
  assert.equal(parseContent(store.export()).version, 1);
});
test("content import strips host data and unrecognized fields", () => {
  const store = createContentStore(memory());
  store.import(
    JSON.stringify({
      version: 1,
      journal: [],
      sigls: [],
      host: { secret: "no" },
      grants: ["write"],
    }),
  );
  assert.deepEqual(store.snapshot(), { version: 1, journal: [], sigls: [] });
});
test("invalid imports do not replace existing creative content", () => {
  const storage = memory(),
    store = createContentStore(storage);
  store.save({
    version: 1,
    journal: [],
    sigls: [{ id: "a", title: "Art", drawing: drawing() }],
  });
  const before = storage.getItem(CONTENT_KEY);
  assert.throws(() => store.import("{bad"));
  assert.equal(storage.getItem(CONTENT_KEY), before);
  assert.throws(() => parseContent("x".repeat(3000001)), /3 MB/);
});
test("drawing input bounds reject non-finite coordinates, injection and excessive data", () => {
  for (const mutate of [
    (d) => (d.layers[0].strokes[0].points[0][0] = Infinity),
    (d) => (d.layers[0].strokes[0].color = '" onload="evil'),
    (d) => (d.layers[0].strokes[0].symmetry = 99),
    (d) => (d.layers = Array(6).fill(d.layers[0])),
  ]) {
    const d = drawing();
    mutate(d);
    assert.throws(() => validateDrawing(d));
  }
});
test("SVG exports preserve symmetry and omit hidden layers without executable input", () => {
  const d = drawing(),
    svg = exportSVG(d);
  assert.equal((svg.match(/<path /g) || []).length, 4);
  assert(!svg.includes("script"));
  d.layers[0].visible = false;
  assert.equal((exportSVG(d).match(/<path /g) || []).length, 0);
  assert.equal(rotatedPaths(drawing().layers[0].strokes[0]).length, 4);
});
test("virtual geometry uses correct length, volume and surface calculations", () => {
  const result = measureGeometry({ width: 3, height: 4, depth: 12, angle: 0 });
  assert.equal(result.diagonal, 13);
  assert.equal(result.volume, 144);
  assert.equal(result.surface, 192);
  assert.equal(result.levelOffset, 0);
  assert.throws(() => measureGeometry({ width: -1, height: 2, depth: 3 }));
});
test("Loom registry launches only bundled modules through a host callback", () => {
  let last;
  const registry = createApplicationRegistry({ launch: (id) => (last = id) });
  registry.launch("sigl-designer");
  assert.equal(last, "sigl-designer");
  assert.throws(() => registry.launch("https://untrusted/plugin.js"));
  assert.equal(BUNDLED_APPS.filter((a) => a.action).length, 8);
});
test("host strings are escaped and host components cannot replace universal controls", () => {
  assert.equal(esc('<script>"&'), "&lt;script&gt;&quot;&amp;");
  const w = createWrist(),
    demo = createDemoHost("studio");
  w.connectWorld(demo.adapter);
  w.navigate("world");
  const html = worldHTML(w.snapshot(), { demoId: "studio" });
  assert(html.includes("UNIVERSAL MODE"));
  assert(html.includes("DISCONNECT HOST"));
  assert(!html.includes("<script"));
  w.dispose();
});
test("original humor produces complete deterministic user-exportable lines", () => {
  assert.equal(
    forgeLine(0, 0),
    "A unionized portal has filed a complaint about excessive destiny.",
  );
  assert.notEqual(forgeLine(0, 0), forgeLine(0, 1));
});
