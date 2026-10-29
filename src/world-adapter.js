/** WorldAdapter v1. Trusted, bundled callbacks; manifest data is never executable. */
export const WORLD_ADAPTER_VERSION = 1;
export const WORLD_LAYOUTS = Object.freeze([
  "combat",
  "studio",
  "explorer",
  "inventory",
  "dashboard",
]);
export const WORLD_ICONS = Object.freeze([
  "crosshair",
  "brush",
  "compass",
  "cube",
  "home",
  "layers",
  "spark",
  "map",
  "inventory",
]);
const adapters = new WeakSet();
const idPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
const id = (value) => {
  if (typeof value !== "string" || !idPattern.test(value))
    throw Error("Invalid manifest identifier");
  return value;
};
const label = (value, limit = 100) => {
  if (typeof value !== "string" || !value.trim() || value.length > limit)
    throw Error("Invalid manifest label");
  return value;
};
const list = (value, max) => {
  if (!Array.isArray(value) || value.length > max)
    throw Error("Invalid manifest list");
  return value;
};
const unique = (values) => {
  if (new Set(values).size !== values.length)
    throw Error("Duplicate manifest identifier");
};
const icon = (value) => (WORLD_ICONS.includes(value) ? value : "cube");
const safeAccent = (value) => {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value))
    return "#61e5ed";
  const luminance = (hex) => {
    const rgb = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  return (luminance(value) + 0.05) / (luminance("#0b1a24") + 0.05) >= 4.5
    ? value
    : "#61e5ed";
};
const freeze = (value) => {
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) freeze(v);
    Object.freeze(value);
  }
  return value;
};

export function validateWorldManifest(value) {
  if (!value || value.apiVersion !== WORLD_ADAPTER_VERSION)
    throw Error("Unsupported WorldAdapter version");
  const capabilities = list(value.capabilities || [], 24).map(id);
  unique(capabilities);
  const actions = list(value.actions || [], 32).map((action) => ({
    id: id(action.id),
    capability: id(action.capability),
    label: label(action.label),
  }));
  unique(actions.map((a) => a.id));
  if (actions.some((a) => !capabilities.includes(a.capability)))
    throw Error("Undeclared action capability");
  const contexts = list(value.contexts, 12).map((context) => {
    if (!WORLD_LAYOUTS.includes(context.layout))
      throw Error("Unapproved presentation layout");
    const fields = list(context.fields || [], 12).map((field) => {
      if (!["meter", "text", "number"].includes(field.type))
        throw Error("Unapproved status field");
      const min = Number.isFinite(field.min) ? field.min : 0,
        max = Number.isFinite(field.max) ? field.max : 100;
      if (max <= min) throw Error("Invalid field range");
      return {
        id: id(field.id),
        label: label(field.label, 50),
        type: field.type,
        min,
        max,
        unit: String(field.unit || "").slice(0, 12),
      };
    });
    unique(fields.map((f) => f.id));
    const controls = list(context.controls || [], 16).map((control) => {
      if (!actions.some((a) => a.id === control.action))
        throw Error("Undocumented control action");
      return {
        action: control.action,
        label: label(control.label),
        icon: icon(control.icon),
      };
    });
    unique(controls.map((c) => c.action));
    const views = list(context.views || [], 6).map((view) => {
      if (!["note", "steps", "palette", "grid"].includes(view.type))
        throw Error("Unapproved presentation component");
      return {
        type: view.type,
        title: label(view.title),
        items: list(view.items || [], 12).map((item) => label(item, 160)),
      };
    });
    return {
      id: id(context.id),
      title: label(context.title),
      description: String(context.description || "").slice(0, 240),
      icon: icon(context.icon),
      layout: context.layout,
      fields,
      controls,
      views,
    };
  });
  if (!contexts.length) throw Error("Host requires a context");
  unique(contexts.map((c) => c.id));
  if (!contexts.some((c) => c.id === value.initialContext))
    throw Error("Unknown initial context");
  const accent = safeAccent(value.theme?.accent);
  return freeze({
    apiVersion: 1,
    id: id(value.id),
    title: label(value.title),
    description: String(value.description || "").slice(0, 240),
    kind: value.kind === "demo" ? "demo" : "host",
    icon: icon(value.icon),
    theme: { accent },
    capabilities,
    actions,
    initialContext: value.initialContext,
    contexts,
  });
}

export function sanitizeWorldState(manifest, raw = {}) {
  if (!raw || typeof raw !== "object") throw Error("Invalid host update");
  const contextId = raw.contextId ?? manifest.initialContext;
  const context = manifest.contexts.find((c) => c.id === contextId);
  if (!context) throw Error("Unknown host context");
  const status = {};
  for (const field of context.fields) {
    const value = raw.status?.[field.id];
    if (field.type === "text") {
      if (typeof value === "string") status[field.id] = value.slice(0, 160);
    } else if (typeof value === "number" && Number.isFinite(value))
      status[field.id] = Math.max(field.min, Math.min(field.max, value));
  }
  return freeze({ contextId, status });
}

export function createWorldAdapter({
  manifest: input,
  readState = () => ({}),
  subscribe = null,
  actions = {},
  onCapture = () => {},
  onDisconnect = () => {},
} = {}) {
  const manifest = validateWorldManifest(input);
  if (
    typeof readState !== "function" ||
    (subscribe !== null && typeof subscribe !== "function") ||
    typeof onCapture !== "function" ||
    typeof onDisconnect !== "function"
  )
    throw Error("Invalid host lifecycle callbacks");
  const handlers = new Map();
  for (const action of manifest.actions) {
    if (typeof actions[action.id] === "function")
      handlers.set(action.id, actions[action.id]);
  }
  const adapter = Object.freeze({
    manifest,
    readState: () => sanitizeWorldState(manifest, readState()),
    subscribe(listener) {
      if (!subscribe) return () => {};
      const unsubscribe = subscribe((raw) => {
        let next;
        try {
          next = sanitizeWorldState(manifest, raw);
        } catch (error) {
          listener(null, error);
          return;
        }
        listener(next);
      });
      if (typeof unsubscribe !== "function")
        throw Error("Host subscription requires cleanup");
      return unsubscribe;
    },
    hasAction: (action) => handlers.has(action),
    execute(action, { signal } = {}) {
      if (!handlers.has(action)) throw Error("Action unavailable");
      return handlers.get(action)({ signal });
    },
    capture: onCapture,
    disconnect: onDisconnect,
  });
  adapters.add(adapter);
  return adapter;
}
export const isWorldAdapter = (adapter) => adapters.has(adapter);

/** An ephemeral connection. The wrist supplies grants; a host cannot grant itself actions. */
export function connectWorld(
  adapter,
  { grants = [], onUpdate = () => {}, onFault = () => {} } = {},
) {
  if (!isWorldAdapter(adapter)) throw Error("Register a trusted WorldAdapter");
  if (
    !Array.isArray(grants) ||
    grants.some((g) => !adapter.manifest.capabilities.includes(g))
  )
    throw Error("Unknown capability grant");
  const granted = new Set(grants),
    abort = new AbortController();
  let active = true,
    state = adapter.readState(),
    unsubscribe = () => {},
    captured = false;
  const snapshot = () =>
    active
      ? freeze({
          manifest: adapter.manifest,
          ...state,
          grants: [...granted],
          captured,
        })
      : null;
  const dispose = () => {
    if (!active) return;
    active = false;
    abort.abort();
    granted.clear();
    for (const cleanup of [
      unsubscribe,
      () => adapter.capture(false),
      adapter.disconnect,
    ]) {
      try {
        cleanup();
      } catch {
        /* A bad host cannot block universal navigation. */
      }
    }
    captured = false;
  };
  const fail = (error) => {
    dispose();
    onFault(error);
  };
  const changed = (next) =>
    next.contextId !== state.contextId ||
    Object.keys(next.status).length !== Object.keys(state.status).length ||
    Object.entries(next.status).some(
      ([key, value]) => state.status[key] !== value,
    );
  try {
    unsubscribe = adapter.subscribe((next, error) => {
      if (!active) return;
      if (error) {
        fail(error);
        return;
      }
      if (!changed(next)) return;
      state = next;
      try {
        onUpdate(snapshot());
      } catch (error) {
        fail(error);
      }
    });
    if (!active) {
      unsubscribe();
      throw Error("Host failed during registration");
    }
  } catch (error) {
    dispose();
    throw error;
  }
  return Object.freeze({
    snapshot,
    update(raw) {
      if (!active) return false;
      const next = sanitizeWorldState(adapter.manifest, raw);
      if (changed(next)) {
        state = next;
        onUpdate(snapshot());
      }
      return true;
    },
    setGrants(values) {
      if (
        !active ||
        !Array.isArray(values) ||
        values.some((g) => !adapter.manifest.capabilities.includes(g))
      )
        throw Error("Unknown capability grant");
      granted.clear();
      for (const value of values) granted.add(value);
      onUpdate(snapshot());
    },
    capture(value) {
      if (!active) return false;
      if (captured === Boolean(value)) return true;
      captured = Boolean(value);
      try {
        adapter.capture(captured);
      } catch (error) {
        fail(error);
        return false;
      }
      return true;
    },
    async request(actionId) {
      if (!active) throw Error("Host disconnected");
      const action = adapter.manifest.actions.find((a) => a.id === actionId);
      const context = adapter.manifest.contexts.find(
        (c) => c.id === state.contextId,
      );
      if (!action || !context.controls.some((c) => c.action === actionId))
        throw Error("Undocumented action in current context");
      if (!granted.has(action.capability))
        throw Error("Capability not granted: " + action.capability);
      if (!adapter.hasAction(actionId)) throw Error("Action unavailable");
      await adapter.execute(actionId, { signal: abort.signal });
      if (
        !active ||
        !granted.has(action.capability) ||
        state.contextId !== context.id
      )
        throw Error("Host action cancelled");
      // Results and private host objects deliberately do not cross this boundary.
      return true;
    },
    dispose,
  });
}
