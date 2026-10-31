import { RINGS, CATALOG } from "./catalog.js";

/**
 * PhiSurf / rung 1: small, local-only, framework-independent navigation model.
 * Uses the public wrist API; never reads host memory, executes remote code,
 * grants capabilities, changes saves, or changes the canonical 3-6-9 catalog.
 */
export function phiSurfTree(snapshot, { operatorRewards = [] } = {}) {
  const rings = RINGS.map((ring) => ({
    id: "ring-" + ring.id,
    label: ring.count + " / " + ring.label,
    kind: "menu",
    children: CATALOG.filter((app) => app.ring === ring.id).map((app) => ({
      id: "app-" + app.id,
      label: app.title,
      kind: "app",
      value: app.id,
      enabled: true,
    })),
  }));
  // Optional learned shortcut wheel, not a new 3-6-9 module or an authority.
  // Core favorites represent world destinations, not bundled apps.
  // Use a small curated set of existing safe local tools; never reinterpret
  // favorite world IDs as app IDs or bypass the normal World handoff.
  const quickAppIds = ["sigl-designer", "snake-toolkit", "journey-log"];
  const shortcuts = CATALOG.filter((app) => quickAppIds.includes(app.id)).slice(0, 9).map((app) => ({
    id: "operator-app-" + app.id,
    label: app.title,
    kind: "app",
    value: app.id,
    enabled: true,
  }));
  const operatorMenus = operatorRewards.includes("phisurf-wheel") ? [{
    id: "operator-shortcuts",
    label: "OPERATOR SHORTCUTS",
    kind: "menu",
    children: shortcuts.length ? shortcuts : [{
      id: "favorite-hint",
      label: "STAR MODULES TO ADD SHORTCUTS",
      kind: "hint",
      enabled: false,
    }],
  }] : [];
  const world = snapshot.worldHost;
  const context = world?.manifest.contexts.find((x) => x.id === world.contextId);
  const worldItems = [{ id: "open-world", label: "OPEN WORLD MODE", kind: "navigate", value: "world", enabled: true }];
  if (context) {
    const actions = new Map(world.manifest.actions.map((action) => [action.id, action]));
    for (const control of context.controls) {
      const action = actions.get(control.action);
      if (!action) continue;
      worldItems.push({
        id: "host-" + control.action,
        label: control.label,
        kind: "host",
        value: control.action,
        enabled: world.grants.includes(action.capability),
      });
    }
  }
  // At most nine radial slots. Page the host controls rather than dropping them.
  const paginate = (items, prefix) => {
    if (items.length <= 9) return items;
    const first = items.slice(0, 8);
    first.push({ id: prefix + "-more", label: "MORE CONTROLS", kind: "menu", children: paginate(items.slice(8), prefix + "-next") });
    return first;
  };
  return {
    id: "root",
    label: "ΦSURF",
    kind: "menu",
    children: [
      { id: "home", label: "HOME", kind: "home", enabled: true },
      { id: "universal", label: "UNIVERSAL", kind: "navigate", value: "universal", enabled: true },
      { id: "world", label: "WORLD", kind: "menu", children: paginate(worldItems, "world") },
      { id: "atlas", label: "REALM ATLAS", kind: "navigate", value: "atlas", enabled: true },
      { id: "modules", label: "3 · 6 · 9 MODULES", kind: "menu", children: [...rings, ...operatorMenus] },
      { id: "back", label: "BACK", kind: "back", enabled: true },
    ],
  };
}
/**
 * Pure direction-to-sector mapper shared by pointer and gamepad adapters.
 * -1 is a deliberate neutral/cancel state, never an implicit command.
 */
export function radialIndex(x, y, count, { inner = 0, outer = Infinity } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isInteger(count) ||
      count < 1 || count > 9 || !Number.isFinite(inner) || inner < 0 ||
      !(outer > inner)) return -1;
  const r = Math.hypot(x, y);
  if (r <= inner || r > outer) return -1;
  const sector = ((Math.atan2(y, x) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)) *
    count / (Math.PI * 2);
  return Math.round(sector) % count;
}
const publicItem = (item) => Object.freeze({
  id: item.id, label: item.label, kind: item.kind,
  enabled: item.enabled !== false,
});
export function createPhiSurf({ wrist, onError = () => {}, operatorBridge = null } = {}) {
  if (!wrist?.snapshot || !wrist?.subscribe || !wrist?.navigate) throw TypeError("PhiSurf requires a Gen.E.Wrist instance");
  if (operatorBridge && (typeof operatorBridge.snapshot !== "function" ||
      typeof operatorBridge.subscribe !== "function"))
    throw TypeError("Operator bridge must expose snapshot and subscribe.");
  let opened = false, path = [], selected = -1;
  const listeners = new Set();
  const tree = () => phiSurfTree(wrist.snapshot(), { operatorRewards: operatorBridge?.snapshot().rewards || [] });
  const node = () => {
    let current = tree();
    const valid = [];
    for (const id of path) {
      const child = current.children?.find((item) => item.id === id && item.kind === "menu");
      if (!child) break;
      current = child;
      valid.push(id);
    }
    path = valid;
    return current;
  };
  const snapshot = () => {
    const menu = node();
    return Object.freeze({
      open: opened,
      title: menu.label,
      path: Object.freeze([...path]),
      selected,
      items: Object.freeze((menu.children || []).map(publicItem)),
    });
  };
  const notify = () => {
    const s = snapshot();
    for (const fn of [...listeners]) {
      try { fn(s); } catch { /* one subscriber cannot stop another */ }
    }
  };
  const wristUnsubscribe = wrist.subscribe(() => {
    if (opened) { selected = -1; notify(); }
  });
  const operatorUnsubscribe = operatorBridge?.subscribe(() => {
    if (opened) { selected = -1; notify(); }
  });
  const close = () => { opened = false; path = []; selected = -1; notify(); };
  async function activate(index) {
    if (!opened || !Number.isInteger(index)) return false;
    const item = node().children?.[index];
    if (!item || item.enabled === false) return false;
    if (item.kind === "menu") {
      path.push(item.id); selected = -1; notify(); return true;
    }
    try {
      switch (item.kind) {
        case "home": wrist.home(); break;
        case "back": wrist.back(); break;
        case "navigate": wrist.navigate(item.value); wrist.setMode("field"); break;
        case "app": {
          const app = CATALOG.find((entry) => entry.id === item.value);
          if (app) wrist.setRing(app.ring);
          wrist.openApp(item.value);
          break;
        }
        case "host": await wrist.requestWorldAction(item.value); break;
        default: return false;
      }
      close();
      return true;
    } catch (error) {
      onError(error);
      notify();
      return false;
    }
  }
  return Object.freeze({
    snapshot,
    subscribe(fn) {
      if (typeof fn !== "function") throw TypeError("Listener required");
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    open() { opened = true; path = []; selected = -1; notify(); },
    close,
    back() {
      if (!opened) return false;
      if (!path.length) { close(); return true; }
      path.pop(); selected = -1; notify(); return true;
    },
    select(index) {
      const count = node().children?.length || 0;
      const next = Number.isInteger(index) && index >= 0 && index < count ? index : -1;
      if (next === selected) return selected;
      selected = next;
      notify();
      return selected;
    },
    activate,
    dispose() { close(); wristUnsubscribe(); operatorUnsubscribe?.(); listeners.clear(); },
  });
}
