import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorldAdapter,
  validateWorldManifest,
  connectWorld,
} from "../src/world-adapter.js";
import { createDemoHost } from "../src/adapters/demos.js";
import { makeBTMWorldAdapter } from "../src/adapters/btm.js";
import { createWrist } from "../src/core.js";
import { STORAGE_KEY } from "../src/storage.js";
const memory = () => {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) || null,
    setItem: (k, v) => map.set(k, v),
    map,
  };
};
const manifest = () => ({
  apiVersion: 1,
  id: "test-world",
  title: "Test World",
  initialContext: "build",
  capabilities: ["edit"],
  actions: [{ id: "carve", label: "Carve", capability: "edit" }],
  contexts: [
    {
      id: "build",
      title: "Builder",
      layout: "studio",
      fields: [{ id: "pieces", label: "Pieces", type: "number", max: 1000 }],
      controls: [{ action: "carve", label: "CARVE" }],
    },
    {
      id: "explore",
      title: "Explorer",
      layout: "explorer",
      fields: [{ id: "room", label: "Room", type: "text" }],
      controls: [],
    },
  ],
});
const host = (overrides = {}) =>
  createWorldAdapter({
    manifest: manifest(),
    readState: () => ({
      contextId: "build",
      status: { pieces: 4, privateSave: { password: "secret" } },
    }),
    ...overrides,
  });

test("host accents preserve text contrast on the approved presentation surface", () => {
  const dark = manifest();
  dark.theme = { accent: "#010101" };
  assert.equal(validateWorldManifest(dark).theme.accent, "#61e5ed");
  const light = manifest();
  light.theme = { accent: "#8ecbff" };
  assert.equal(validateWorldManifest(light).theme.accent, "#8ecbff");
});

test("versioned registration rejects unsupported versions, executable components and duplicate identifiers", () => {
  for (const change of [
    (m) => (m.apiVersion = 99),
    (m) => (m.contexts[0].layout = "javascript"),
    (m) => m.contexts.push(m.contexts[0]),
    (m) =>
      (m.contexts[0].views = [{ type: "html", title: "Plugin", items: [] }]),
    (m) => (m.actions[0].capability = "undeclared"),
  ]) {
    const m = manifest();
    change(m);
    assert.throws(() => validateWorldManifest(m));
  }
  assert.throws(() => connectWorld({ manifest: manifest() }), /trusted/);
});
test("manifest is normalized, detached and deeply immutable", () => {
  const raw = manifest();
  raw.theme = { accent: "red; background:url(https://evil)" };
  const adapter = host({ manifest: raw });
  raw.contexts[0].title = "mutated";
  assert.equal(adapter.manifest.contexts[0].title, "Builder");
  assert.equal(adapter.manifest.theme.accent, "#61e5ed");
  assert.throws(() => adapter.manifest.contexts.push({}));
});
test("no host action grants itself authority; undocumented actions are denied", async () => {
  let calls = 0;
  const connection = connectWorld(host({ actions: { carve: () => calls++ } }));
  await assert.rejects(connection.request("carve"), /not granted/);
  await assert.rejects(connection.request("read-memory"), /Undocumented/);
  assert.equal(calls, 0);
  connection.setGrants(["edit"]);
  assert.equal(await connection.request("carve"), true);
  assert.equal(calls, 1);
  connection.setGrants([]);
  await assert.rejects(connection.request("carve"), /not granted/);
  connection.dispose();
});
test("unknown grants and undeclared callbacks cannot expand the action surface", async () => {
  const adapter = host({ actions: { "read-secrets": () => true } });
  assert.throws(
    () => connectWorld(adapter, { grants: ["read-secrets"] }),
    /Unknown/,
  );
  const c = connectWorld(adapter, { grants: ["edit"] });
  await assert.rejects(c.request("carve"), /unavailable/);
  c.dispose();
});
test("host statuses filter private objects and preserve unknown values as absent", () => {
  const c = connectWorld(host());
  assert.deepEqual(c.snapshot().status, { pieces: 4 });
  c.update({ status: { pieces: Infinity, privateSave: "secret" } });
  assert.deepEqual(c.snapshot().status, {});
  c.update({ status: { pieces: 9999 } });
  assert.equal(c.snapshot().status.pieces, 1000);
  c.dispose();
});
test("subscribed context changes replace fields and actions without reopening the wrist", async () => {
  let publish;
  const w = createWrist();
  w.connectWorld(
    host({
      subscribe: (fn) => {
        publish = fn;
        return () => {};
      },
      actions: { carve: () => true },
    }),
    { grants: ["edit"] },
  );
  w.navigate("world");
  publish({ contextId: "explore", status: { room: "Hall", pieces: 8 } });
  assert.equal(w.snapshot().destination, "world");
  assert.equal(w.snapshot().worldHost.contextId, "explore");
  assert.deepEqual(w.readHostStatus(), { room: "Hall" });
  await assert.rejects(w.requestWorldAction("carve"), /current context/);
  w.dispose();
});
test("malformed subscription fails closed to universal navigation", () => {
  let publish;
  const w = createWrist();
  w.connectWorld(
    host({
      subscribe: (fn) => {
        publish = fn;
        return () => {};
      },
    }),
  );
  w.navigate("world");
  publish({ contextId: "not-in-manifest", status: {} });
  assert.equal(w.snapshot().worldHost, null);
  assert.equal(w.snapshot().destination, "universal");
  assert.match(w.snapshot().hostError, /disconnected/);
  w.home();
  assert.equal(w.snapshot().destination, "home");
});
test("host replacement, disconnect and disposal clear subscriptions and ignore late updates", () => {
  const first = createDemoHost("btm"),
    second = createDemoHost("studio"),
    w = createWrist();
  w.connectWorld(first.adapter);
  assert.equal(first.listenerCount(), 1);
  w.connectWorld(second.adapter);
  assert.equal(first.listenerCount(), 0);
  assert.equal(second.listenerCount(), 1);
  first.setContext("navigation");
  assert.equal(w.snapshot().worldHost.manifest.id, "studio-demo");
  w.disconnectWorld();
  assert.equal(second.listenerCount(), 0);
  second.setContext("paint");
  assert.equal(w.snapshot().worldHost, null);
  w.dispose();
});
test("cleanup exceptions cannot trap Home, Back or Universal controls", () => {
  const w = createWrist();
  w.connectWorld(
    host({
      subscribe: () => () => {
        throw Error("bad cleanup");
      },
      onDisconnect: () => {
        throw Error("bad host");
      },
    }),
  );
  w.navigate("world");
  w.home();
  assert.equal(w.snapshot().destination, "home");
  w.navigate("universal");
  w.back();
  assert.equal(w.snapshot().destination, "home");
  w.disconnectWorld();
  assert.equal(w.snapshot().worldHost, null);
});
test("host context, fields, action grants and capture never enter persistent preferences", () => {
  const s = memory(),
    w = createWrist({ storage: s });
  w.setTheme("field");
  const saved = s.getItem(STORAGE_KEY);
  w.connectWorld(host(), { grants: ["edit"] });
  w.navigate("world");
  w.setInputCaptured(true);
  w.updateWorld({ contextId: "explore", status: { room: "PRIVATE ROOM" } });
  assert.equal(s.getItem(STORAGE_KEY), saved);
  const other = createWrist({ storage: s });
  assert.equal(other.snapshot().worldHost, null);
  assert.equal(other.snapshot().destination, "home");
  assert.equal(other.snapshot().preferences.theme, "field");
  w.dispose();
});
test("in-flight actions receive abort and cannot return results after disconnect", async () => {
  let finish, signal;
  const w = createWrist();
  w.connectWorld(
    host({
      actions: {
        carve: (input) => {
          signal = input.signal;
          return new Promise((resolve) => (finish = resolve));
        },
      },
    }),
    { grants: ["edit"] },
  );
  const pending = w.requestWorldAction("carve");
  w.disconnectWorld();
  assert.equal(signal.aborted, true);
  finish({ private: "must never escape" });
  await assert.rejects(pending, /cancelled/);
});
test("revoking a grant while an action is pending discards its completion", async () => {
  let finish;
  const c = connectWorld(
    host({
      actions: { carve: () => new Promise((resolve) => (finish = resolve)) },
    }),
    { grants: ["edit"] },
  );
  const pending = c.request("carve");
  c.setGrants([]);
  finish();
  await assert.rejects(pending, /cancelled/);
  c.dispose();
});
test("capture is explicit, coalesced and released on disconnect", () => {
  const captures = [],
    c = connectWorld(host({ onCapture: (value) => captures.push(value) }));
  c.capture(true);
  c.capture(true);
  c.capture(false);
  c.capture(true);
  c.dispose();
  assert.deepEqual(captures, [true, false, true, false]);
});
test("a failing capture hook disconnects without affecting Home fallback", () => {
  const w = createWrist();
  w.connectWorld(
    host({
      onCapture: (value) => {
        if (value) throw Error("capture failed");
      },
    }),
  );
  w.navigate("world");
  w.setMode("field");
  assert.equal(w.snapshot().worldHost, null);
  w.home();
  assert.equal(w.snapshot().destination, "home");
});
test("universal Home is always available even without a verified Porch URL", () => {
  const w = createWrist();
  assert.throws(() => w.setHomeWorld("infinite-porch"), /verified/);
  w.setHomeWorld("btm");
  assert.equal(w.snapshot().preferences.homeWorldId, "btm");
  w.setHomeWorld(null);
  w.navigate("world");
  w.back();
  assert.equal(w.snapshot().destination, "home");
  w.home();
  assert.equal(w.snapshot().activeApp, null);
});
test("subscriber exceptions cannot suppress the remaining navigation listeners", () => {
  const w = createWrist();
  let observed = false;
  w.subscribe(() => {
    throw Error("bad view");
  });
  w.subscribe(() => (observed = true));
  w.home();
  assert.equal(observed, true);
});
test("BTM WorldAdapter matches real HUD fields and requires grants and unlocked weapons", async () => {
  let calls = [],
    snapshot = {
      player: { health: 120, armor: 42, energy: 73, privateSave: "secret" },
      unlocked: 2,
      weapon: "Wake-Up Slap",
      objective: "Break the relays",
      ori: "ONLINE",
    };
  const adapter = makeBTMWorldAdapter({
      readSnapshot: () => snapshot,
      actions: {
        ori: () => calls.push("ori"),
        weapon: (index) => calls.push(index),
      },
    }),
    c = connectWorld(adapter, { grants: ["weapon"] });
  assert.deepEqual(c.snapshot().status, {
    health: 100,
    armor: 42,
    energy: 73,
    weapon: "Wake-Up Slap",
    objective: "Break the relays",
    ori: "ONLINE",
  });
  await c.request("weapon-1");
  assert.deepEqual(calls, [1]);
  await assert.rejects(c.request("weapon-4"), /locked/);
  await assert.rejects(c.request("ori"), /not granted/);
  await assert.rejects(c.request("scan"), /Undocumented/);
  c.dispose();
});
test("BTM read-only registration never exposes optional actions or save data", () => {
  const adapter = makeBTMWorldAdapter({
    readSnapshot: () => ({ health: 86, save: { private: true } }),
  });
  assert.deepEqual(adapter.manifest.capabilities, []);
  assert.deepEqual(adapter.readState().status, { health: 86 });
});
test("all three mock hosts use distinct contextual layouts and clean updates", () => {
  const combat = createDemoHost("btm"),
    studio = createDemoHost("studio"),
    porch = createDemoHost("porch");
  assert.deepEqual(
    [combat, studio, porch].map((h) => h.adapter.manifest.contexts[0].layout),
    ["combat", "studio", "explorer"],
  );
  studio.setContext("paint");
  assert.equal(studio.adapter.readState().contextId, "paint");
  porch.setContext("inventory");
  assert.equal(porch.adapter.readState().contextId, "inventory");
});

test("identical allowlisted host updates do not trigger redundant presentation work", () => {
  let publish,
    updates = 0;
  const c = connectWorld(
    host({
      subscribe: (fn) => {
        publish = fn;
        return () => {};
      },
    }),
    { onUpdate: () => updates++ },
  );
  publish({
    contextId: "build",
    status: { pieces: 4, privateSave: "different private object" },
  });
  assert.equal(updates, 0);
  publish({ contextId: "build", status: { pieces: 5 } });
  c.update({ contextId: "build", status: { pieces: 5 } });
  assert.equal(updates, 1);
  publish({ contextId: "explore", status: { room: "Hall" } });
  assert.equal(updates, 2);
  c.dispose();
});
test("BTM contextual HUD quantization matches its live wrist display", () => {
  const adapter = makeBTMWorldAdapter({
    readSnapshot: () => ({
      player: { health: 86.2, armor: 42.2, energy: 73.9 },
    }),
  });
  assert.deepEqual(adapter.readState().status, {
    health: 87,
    armor: 43,
    energy: 73,
  });
});
