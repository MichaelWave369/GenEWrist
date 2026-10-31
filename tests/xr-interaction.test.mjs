import test from "node:test";
import assert from "node:assert/strict";
import {
  rayPanelHit,
  targetAt,
  createInputGuard,
  positionDock,
} from "../src/xr-interaction.js";
const matrix = () =>
  Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
test("controller ray intersects the actual plane and rejects behind/parallel/off-panel input", () => {
  const model = matrix(),
    ray = matrix();
  model[0] = 0.72;
  model[5] = 0.54;
  model[14] = -1;
  assert.deepEqual(rayPanelHit(model, ray), { u: 0.5, v: 0.5, distance: 1 });
  ray[12] = 2;
  assert.equal(rayPanelHit(model, ray), null);
  ray[12] = 0;
  ray[10] = -1;
  assert.equal(rayPanelHit(model, ray), null);
  ray[10] = 0;
  ray[8] = 1;
  assert.equal(rayPanelHit(model, ray), null);
});
test("hit targets use the same normalized geometry as the rendered canvas", () => {
  const t = { id: "one", x: 400, y: 300, w: 200, h: 100 };
  assert.equal(targetAt([t], { u: 0.5, v: 0.45 }), t);
  assert.equal(targetAt([t], { u: 0.1, v: 0.1 }), null);
});
test("held trigger on entry cannot activate until neutral re-arm", () => {
  const gate = createInputGuard(),
    source = {},
    target = { id: "fire" };
  gate.observe(source, true);
  assert.equal(gate.start(source, target, 1), false);
  gate.observe(source, false);
  assert.equal(gate.start(source, target, 1), true);
  assert.equal(gate.select(source, target, 1), true);
  assert.equal(gate.select(source, target, 1), false);
});
test("input cancels on tracking loss, source changes, context revision and drag-off", () => {
  const gate = createInputGuard(),
    source = {},
    target = { id: "a" };
  gate.observe(source, false);
  gate.start(source, target, 1);
  gate.reset();
  assert.equal(gate.select(source, target, 1), false);
  gate.observe(source, false);
  gate.start(source, target, 2);
  assert.equal(gate.select(source, target, 3), false);
  gate.end(source);
  gate.start(source, target, 3);
  assert.equal(gate.select(source, { id: "b" }, 3), false);
  gate.remove(source);
  assert.equal(gate.start(source, target, 4), false);
});
test("comfortable hand tracking and fixed fallback dock use caller-owned buffers", () => {
  const viewer = {
      transform: { matrix: matrix(), position: { x: 0, y: 1.6, z: 0 } },
    },
    model = matrix(),
    device = matrix();
  assert.equal(positionDock(viewer, null, model, device), false);
  assert(Math.abs(model[0] - 0.72) < 1e-5);
  assert(model[14] < -1);
  assert.equal(
    positionDock(
      viewer,
      { transform: { position: { x: -0.25, y: 1.3, z: -0.65 } } },
      model,
      device,
    ),
    true,
  );
  assert.equal(
    positionDock(
      viewer,
      { transform: { position: { x: 0, y: 1.6, z: 0.7 } } },
      model,
      device,
    ),
    false,
  );
  positionDock(viewer, null, model, device, {
    mode: "glance",
    posture: "standing",
  });
  assert(Math.abs(model[0] - 0.3) < 1e-5);
});

test("PhiSurf annular targets select exact wedge without rectangular overlap", () => {
  const cx = 512, cy = 423, inner = 86, outer = 182;
  const sector = (index) => ({
    id: "surf-" + index, shape: "annular-sector", cx, cy, inner, outer,
    sector: index, count: 9, gapRadians: 0.035,
  });
  const targets = Array.from({ length: 9 }, (_, i) => sector(i));
  const hit = (x, y) => ({ u: x / 1024, v: y / 768 });
  const sample = (i, r = 130) => {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 9;
    return hit(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  };
  for (let i = 0; i < 9; i++) {
    assert.equal(targetAt(targets, sample(i))?.id, "surf-" + i);
  }
  assert.equal(targetAt(targets, hit(cx, cy)), null, "center deadzone");
  assert.equal(targetAt(targets, sample(0, 82)), null, "inside inner radius");
  assert.equal(targetAt(targets, sample(0, 186)), null, "outside visible rim");
  const boundaryAngle = -Math.PI / 2 + Math.PI / 9;
  assert.equal(
    targetAt(targets, hit(cx + 130 * Math.cos(boundaryAngle), cy + 130 * Math.sin(boundaryAngle))),
    null,
    "visible separation is not an invisible click target",
  );
  assert.equal(targetAt(targets, { u: Infinity, v: 0 }), null);
  assert.equal(targetAt(targets, { u: -0.1, v: 0.5 }), null);
  assert.equal(targetAt(targets.filter((t) => t.sector !== 3), sample(3)), null, "disabled wedge absent");
});
