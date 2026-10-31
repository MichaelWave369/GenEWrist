/** Pure WebXR geometry/input helpers. Synthetic tests do not qualify hardware. */
import { radialIndex } from "./phisurf.js";
export function rayPanelHit(model, ray) {
  if (!model || !ray) return null;
  const sx = Math.hypot(model[0], model[1], model[2]),
    sy = Math.hypot(model[4], model[5], model[6]);
  if (!sx || !sy) return null;
  const rx = model[0] / sx,
    ry = model[1] / sx,
    rz = model[2] / sx,
    ux = model[4] / sy,
    uy = model[5] / sy,
    uz = model[6] / sy;
  const nx = ry * uz - rz * uy,
    ny = rz * ux - rx * uz,
    nz = rx * uy - ry * ux,
    dx = -ray[8],
    dy = -ray[9],
    dz = -ray[10];
  const denominator = dx * nx + dy * ny + dz * nz;
  if (Math.abs(denominator) < 1e-6) return null;
  const t =
    ((model[12] - ray[12]) * nx +
      (model[13] - ray[13]) * ny +
      (model[14] - ray[14]) * nz) /
    denominator;
  if (t <= 0 || t > 6) return null;
  const x = ray[12] + dx * t - model[12],
    y = ray[13] + dy * t - model[13],
    z = ray[14] + dz * t - model[14];
  const u = 0.5 + (x * rx + y * ry + z * rz) / sx,
    v = 0.5 - (x * ux + y * uy + z * uz) / sy;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? { u, v, distance: t } : null;
}
export function targetAt(targets, hit) {
  if (!hit || !Number.isFinite(hit.u) || !Number.isFinite(hit.v) ||
      hit.u < 0 || hit.u > 1 || hit.v < 0 || hit.v > 1) return null;
  const x = hit.u * 1024, y = hit.v * 768;
  return targets.find((t) => {
    if (t.shape === "annular-sector") {
      const dx = x - t.cx, dy = y - t.cy;
      const center = -Math.PI / 2 + t.sector * Math.PI * 2 / t.count;
      const delta = Math.atan2(Math.sin(Math.atan2(dy, dx) - center),
        Math.cos(Math.atan2(dy, dx) - center));
      const half = Math.PI / t.count;
      return radialIndex(dx, dy, t.count, {
        inner: t.inner, outer: t.outer,
      }) === t.sector && Math.abs(delta) <= half - (t.gapRadians || 0);
    }
    return x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h;
  }) || null;
}
export function createInputGuard() {
  const sources = new Map();
  return Object.freeze({
    observe(source, pressed) {
      if (!sources.has(source))
        sources.set(source, { ready: pressed !== true, armed: null });
      else if (pressed === false) sources.get(source).ready = true;
    },
    start(source, target, revision) {
      const s = sources.get(source);
      if (!s?.ready || !target) return false;
      s.ready = false;
      s.armed = { id: target.id, revision };
      return true;
    },
    select(source, target, revision) {
      const s = sources.get(source),
        armed = s?.armed;
      if (s) s.armed = null;
      return Boolean(
        armed &&
          target &&
          armed.id === target.id &&
          armed.revision === revision,
      );
    },
    end(source) {
      const s = sources.get(source);
      if (s) {
        s.ready = true;
        s.armed = null;
      }
    },
    reset() {
      for (const s of sources.values()) {
        s.ready = false;
        s.armed = null;
      }
    },
    remove(source) {
      sources.delete(source);
    },
    clear() {
      sources.clear();
    },
  });
}
export function positionDock(
  viewer,
  hand,
  model,
  device,
  { mode = "field", posture = "seated" } = {},
) {
  const m = viewer.transform.matrix,
    p = viewer.transform.position;
  let x = p.x - m[8] * 1.15 - m[0] * 0.1,
    y = p.y - m[9] * 1.15 - (posture === "seated" ? 0.13 : 0.05),
    z = p.z - m[10] * 1.15 - m[2] * 0.1,
    attached = false;
  const hp = hand?.transform?.position;
  if (hp) {
    const dx = hp.x - p.x,
      dy = hp.y - p.y,
      dz = hp.z - p.z,
      d = Math.hypot(dx, dy, dz),
      f = (-dx * m[8] - dy * m[9] - dz * m[10]) / Math.max(0.001, d);
    if (d >= 0.5 && d <= 1.4 && f > 0.55) {
      x = hp.x;
      y = hp.y + 0.16;
      z = hp.z;
      attached = true;
    }
  }
  const w = mode === "glance" ? 0.3 : 0.72,
    h = mode === "glance" ? 0.225 : 0.54;
  for (let i = 0; i < 16; i++) {
    model[i] = m[i];
    device[i] = m[i];
  }
  for (let i = 0; i < 3; i++) {
    model[i] *= w;
    model[4 + i] *= h;
  }
  model[12] = x;
  model[13] = y;
  model[14] = z;
  model[15] = 1;
  device[12] = x - m[4] * 0.35;
  device[13] = y - m[5] * 0.35;
  device[14] = z - m[6] * 0.35 + 0.05;
  device[15] = 1;
  return attached;
}
