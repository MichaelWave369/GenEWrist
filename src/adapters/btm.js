/**
 * Host integration template: BTM remains owner of all real gameplay state.
 * This is a contract, NOT a currently installed adapter in the BTM repository.
 */
import { createHostAdapter } from "../bridge.js";
import { createWorldAdapter } from "../world-adapter.js";
const ALLOWED_STATUSES = [
  "health",
  "armor",
  "energy",
  "weapon",
  "objective",
  "ori",
];
export function makeBTMAdapter({ readSnapshot, requestScan = null } = {}) {
  if (typeof readSnapshot !== "function")
    throw TypeError("BTM readSnapshot callback required");
  const capabilities = typeof requestScan === "function" ? ["scan"] : [];
  return createHostAdapter({
    id: "btm",
    capabilities,
    readStatus() {
      const raw = readSnapshot();
      if (!raw || typeof raw !== "object") return {};
      const out = {};
      for (const key of ALLOWED_STATUSES) {
        if (!(key in raw)) continue;
        const value = raw[key];
        if (["health", "armor", "energy"].includes(key)) {
          if (typeof value === "number" && Number.isFinite(value))
            out[key] = Math.min(100, Math.max(0, value));
        } else if (typeof value === "string") out[key] = value.slice(0, 120);
      }
      return out;
    },
    async requestAction(action, payload) {
      if (action !== "scan" || !requestScan) throw Error("Action unavailable");
      return requestScan(payload);
    },
  });
}

/** WorldAdapter v1 for BTM's current six weapons, Ori, tactical map and real HUD.
 * No BTM imports, session creation, save access, polling or hidden scan command.
 * Host callbacks are optional; no callback means no registered action.
 */
export function makeBTMWorldAdapter({
  readSnapshot,
  subscribe = null,
  actions = {},
  onCapture = () => {},
  onDisconnect = () => {},
} = {}) {
  if (typeof readSnapshot !== "function")
    throw TypeError("BTM readSnapshot callback required");
  const specs = [
    ["ori", "ORI PULSE", "ori"],
    ["map", "TACTICAL MAP", "map"],
    ...["SLAP", "BLASTER", "BASS", "Φ PULSE", "DISRUPT", "UNPLUG"].map(
      (label, i) => ["weapon-" + i, label, "weapon"],
    ),
  ];
  const enabled = specs.filter(
    ([, , key]) => typeof actions[key] === "function",
  );
  const controls = enabled.map(([id, label]) => ({
    action: id,
    label,
    icon: id === "map" ? "map" : id === "ori" ? "spark" : "crosshair",
  }));
  const handlers = Object.fromEntries(
    enabled.map(([id, , key]) => [
      id,
      async ({ signal }) => {
        if (signal.aborted) throw Error("BTM host disconnected");
        if (key === "weapon") {
          const index = Number(id.slice(7)),
            snapshot = readSnapshot();
          if (
            !Number.isInteger(snapshot?.unlocked) ||
            index >= snapshot.unlocked
          )
            throw Error("Weapon locked");
          return actions.weapon(index, { signal });
        }
        return actions[key]({ signal });
      },
    ]),
  );
  const read = (raw) => {
    if (!raw || typeof raw !== "object") raw = {};
    const player =
      raw.player && typeof raw.player === "object" ? raw.player : raw;
    return {
      contextId: raw.contextId === "navigation" ? "navigation" : "combat",
      status: {
        health:
          typeof player.health === "number"
            ? Math.ceil(player.health)
            : undefined,
        armor:
          typeof player.armor === "number"
            ? Math.ceil(player.armor)
            : undefined,
        energy:
          typeof player.energy === "number"
            ? Math.floor(player.energy)
            : undefined,
        weapon: raw.weapon,
        objective: raw.objective,
        ori: raw.ori,
        sector: raw.sector,
      },
    };
  };
  const common = [
    { id: "health", label: "Health", type: "meter", unit: "%" },
    { id: "armor", label: "Armor", type: "meter", unit: "%" },
    { id: "energy", label: "Energy", type: "meter", unit: "%" },
    { id: "weapon", label: "Equipped", type: "text" },
    { id: "objective", label: "Objective", type: "text" },
    { id: "ori", label: "Ori", type: "text" },
  ];
  return createWorldAdapter({
    manifest: {
      apiVersion: 1,
      id: "btm",
      title: "Break the Matrix",
      kind: "host",
      icon: "crosshair",
      theme: { accent: "#ffb76c" },
      capabilities: [...new Set(enabled.map((s) => s[2]))],
      actions: enabled.map(([id, label, capability]) => ({
        id,
        label,
        capability,
      })),
      initialContext: "combat",
      contexts: [
        {
          id: "combat",
          title: "Combat",
          layout: "combat",
          fields: common,
          controls,
          views: [
            {
              type: "note",
              title: "BTM live host",
              items: [
                "The game owns combat, checkpointing, input re-arm and its XR session.",
              ],
            },
          ],
        },
        {
          id: "navigation",
          title: "Navigation",
          layout: "explorer",
          fields: [...common, { id: "sector", label: "Sector", type: "text" }],
          controls: controls.filter((c) => c.action === "map"),
          views: [],
        },
      ],
    },
    readState: () => read(readSnapshot()),
    subscribe: subscribe
      ? (listener) => subscribe((raw) => listener(read(raw)))
      : null,
    actions: handlers,
    onCapture,
    onDisconnect,
  });
}
