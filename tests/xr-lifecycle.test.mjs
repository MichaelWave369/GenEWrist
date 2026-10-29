import test from "node:test";
import assert from "node:assert/strict";
import { launchExperimentalXR } from "../src/xr.js";
import { createWrist } from "../src/core.js";
import { createDemoHost } from "../src/adapters/demos.js";
import { installFakeXR } from "./helpers/fake-xr.mjs";

test("software XR renders both eyes, coalesces texture uploads and disposes all resources", async () => {
  const env = installFakeXR();
  let ended = 0;
  const w = createWrist();
  w.setMode("field");
  try {
    const xr = await launchExperimentalXR({ wrist: w, onEnd: () => ended++ });
    for (let i = 0; i < 8; i++) env.session.pump(env.frame);
    const before = xr.stats();
    assert.equal(before.eyeDraws, 16);
    assert.equal(before.textureUploads, 1);
    for (let i = 0; i < 30; i++) env.session.pump(env.frame);
    assert.equal(xr.stats().textureUploads, 1);
    w.setRing("inner");
    env.session.pump(env.frame);
    assert.equal(xr.stats().textureUploads, 2);
    await xr.end();
    await xr.end();
    assert.equal(ended, 1);
    assert.equal(xr.stats().disposed, true);
    assert.deepEqual(
      [xr.stats().buffers, xr.stats().textures, xr.stats().programs],
      [0, 0, 0],
    );
    assert.deepEqual(env.deleted, {
      buffers: 5,
      textures: 1,
      programs: 2,
      shaders: 4,
    });
    assert.equal(env.session.listenerCount(), 0);
    assert.equal(env.space.listenerCount(), 0);
    assert.equal(env.document.listenerCount(), 0);
    assert.equal(env.session.frame, null);
  } finally {
    env.restore();
  }
});
test("ending XR releases host input, subscriptions, grants and contextual controls", async () => {
  const env = installFakeXR(),
    demo = createDemoHost("btm"),
    w = createWrist();
  w.connectWorld(demo.adapter, { grants: ["ori"] });
  w.navigate("world");
  w.setMode("field");
  try {
    const xr = await launchExperimentalXR({ wrist: w });
    env.session.pump(env.frame);
    assert.equal(demo.listenerCount(), 1);
    assert.equal(w.snapshot().worldHost.captured, true);
    await xr.end();
    assert.equal(demo.listenerCount(), 0);
    assert.equal(w.snapshot().worldHost, null);
    assert.equal(w.snapshot().destination, "universal");
  } finally {
    env.restore();
  }
});
test("session visibility and viewer tracking loss release captured input", async () => {
  const env = installFakeXR(),
    captures = [],
    w = createWrist();
  const { createWorldAdapter } = await import("../src/world-adapter.js");
  w.connectWorld(
    createWorldAdapter({
      manifest: {
        apiVersion: 1,
        id: "test",
        title: "Test",
        initialContext: "one",
        contexts: [
          {
            id: "one",
            title: "One",
            layout: "dashboard",
            fields: [],
            controls: [],
          },
        ],
      },
      onCapture: (value) => captures.push(value),
    }),
  );
  w.setMode("field");
  try {
    const xr = await launchExperimentalXR({ wrist: w });
    env.session.pump(env.frame);
    env.session.pump({ ...env.frame, getViewerPose: () => null });
    assert.equal(captures.at(-1), false);
    env.session.pump(env.frame);
    assert.equal(captures.at(-1), true);
    env.session.visibilityState = "hidden";
    env.session.dispatchEvent(new Event("visibilitychange"));
    assert.equal(captures.at(-1), false);
    await xr.end();
  } finally {
    env.restore();
  }
});
test("XR allocation failure and reference-space failure clean partially created state", async () => {
  for (const options of [{ failTexture: true }, { failSpace: true }]) {
    const env = installFakeXR(options);
    try {
      await assert.rejects(
        launchExperimentalXR(),
        /allocation|reference space/,
      );
      assert.equal(env.session.ended, true);
      assert.equal(env.session.listenerCount(), 0);
      if (options.failTexture) {
        assert.equal(env.deleted.buffers, 5);
        assert.equal(env.deleted.programs, 2);
      }
    } finally {
      env.restore();
    }
  }
});
test("tracking-loss fallback and recenter do not allocate more GPU objects", async () => {
  const env = installFakeXR();
  try {
    const xr = await launchExperimentalXR();
    env.session.pump(env.frame);
    const before = xr.stats();
    xr.recenter();
    env.session.pump(env.frame);
    assert.equal(xr.stats().buffers, before.buffers);
    assert.equal(xr.stats().textures, before.textures);
    assert.equal(xr.stats().programs, before.programs);
    await xr.end();
  } finally {
    env.restore();
  }
});
