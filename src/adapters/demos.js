import { createWorldAdapter } from "../world-adapter.js";

const meter = (id, label) => ({ id, label, type: "meter", unit: "%" });
const text = (id, label) => ({ id, label, type: "text" });
const control = (action, label, icon = "cube") => ({ action, label, icon });
const action = (id, label, capability = id) => ({ id, label, capability });
const context = (id, title, layout, fields, controls, views = []) => ({
  id,
  title,
  layout,
  fields,
  controls,
  views,
});
const manifests = {
  btm: {
    id: "btm-demo",
    title: "Break the Matrix",
    icon: "crosshair",
    theme: { accent: "#ffb76c" },
    capabilities: ["ori", "map", "weapon"],
    actions: [
      action("ori", "Ori pulse"),
      action("map", "Toggle map"),
      action("weapon", "Cycle weapon"),
    ],
    initialContext: "combat",
    contexts: [
      context(
        "combat",
        "Combat",
        "combat",
        [
          meter("health", "Health"),
          meter("armor", "Armor"),
          meter("energy", "Energy"),
          text("weapon", "Equipped"),
          text("objective", "Objective"),
        ],
        [
          control("ori", "ORI PULSE", "spark"),
          control("map", "TACTICAL MAP", "map"),
          control("weapon", "CYCLE WEAPON", "crosshair"),
        ],
        [
          {
            type: "note",
            title: "Sector 03 / Relay district",
            items: [
              "Break the relays. Keep Ori close.",
              "Bundled demonstration. This is not a live BTM session.",
            ],
          },
        ],
      ),
      context(
        "navigation",
        "Navigation",
        "explorer",
        [text("sector", "Sector"), text("objective", "Route")],
        [control("map", "TOGGLE OVERLAY", "map")],
        [
          {
            type: "steps",
            title: "Route to the exit",
            items: [
              "01 / Enter relay district",
              "02 / Find the maintenance key",
              "03 / Unplug the control tower",
            ],
          },
        ],
      ),
    ],
  },
  studio: {
    id: "studio-demo",
    title: "Domistika Studio",
    icon: "brush",
    theme: { accent: "#8ecbff" },
    capabilities: ["tool", "palette", "undo"],
    actions: [
      action("tool", "Change tool"),
      action("palette", "Change palette"),
      action("undo", "Undo last mark"),
    ],
    initialContext: "sculpt",
    contexts: [
      context(
        "sculpt",
        "Sculpting",
        "studio",
        [
          text("tool", "Active tool"),
          text("material", "Material"),
          { id: "objects", label: "Objects", type: "number", max: 1000 },
        ],
        [
          control("tool", "NEXT SCULPT TOOL", "cube"),
          control("undo", "UNDO SCULPT", "layers"),
        ],
        [
          {
            type: "grid",
            title: "Sculpting workbench",
            items: [
              "Clay / organic forms",
              "Lathe / radial symmetry",
              "Carve / negative space",
              "Smooth / finishing pass",
            ],
          },
        ],
      ),
      context(
        "paint",
        "Painting",
        "studio",
        [text("tool", "Brush"), text("palette", "Palette")],
        [
          control("palette", "ROTATE PALETTE", "brush"),
          control("undo", "UNDO STROKE", "layers"),
        ],
        [
          {
            type: "palette",
            title: "Field pigments",
            items: [
              "Copper",
              "#ecb879",
              "Ion blue",
              "#66d9ef",
              "Midnight",
              "#162a45",
            ],
          },
        ],
      ),
    ],
  },
  porch: {
    id: "porch-demo",
    title: "Infinite Porch",
    icon: "home",
    theme: { accent: "#b8d6a0" },
    capabilities: ["light", "room"],
    actions: [
      action("light", "Change room lighting"),
      action("room", "Visit the next room"),
    ],
    initialContext: "explore",
    contexts: [
      context(
        "explore",
        "Explorer",
        "explorer",
        [
          text("room", "Current room"),
          text("light", "Lighting"),
          text("companion", "Companion"),
        ],
        [
          control("room", "NEXT ROOM", "home"),
          control("light", "CHANGE LIGHT", "spark"),
        ],
        [
          {
            type: "steps",
            title: "A home between worlds",
            items: [
              "Front steps / welcome home",
              "Hall of Brothers / open doors",
              "Listening room / stay awhile",
            ],
          },
        ],
      ),
      context(
        "inventory",
        "Inventory",
        "inventory",
        [text("room", "Room")],
        [control("room", "RETURN TO HALL", "home")],
        [
          {
            type: "grid",
            title: "Carried in this demo",
            items: [
              "Pocket lantern",
              "Unwritten postcard",
              "A very small planet",
              "The spare key",
            ],
          },
        ],
      ),
    ],
  },
};

export const DEMO_HOSTS = Object.freeze(
  Object.entries(manifests).map(([id, m]) =>
    Object.freeze({
      id,
      title: m.title,
      icon: m.icon,
      description:
        id === "btm"
          ? "Combat / tactical instruments"
          : id === "studio"
            ? "Sculpt / paint workbench"
            : "Explorer / pocket inventory",
    }),
  ),
);
export function createDemoHost(id) {
  const source = manifests[id];
  if (!source) throw Error("Unknown demonstration");
  let contextId = source.initialContext,
    count = 0;
  let status =
    id === "btm"
      ? {
          health: 86,
          armor: 42,
          energy: 73,
          weapon: "Wake-Up Slap",
          objective: "Break the relays",
          sector: "Relay district",
        }
      : id === "studio"
        ? {
            tool: "Clay / additive",
            material: "Brushed copper",
            objects: 3,
            palette: "Copper / ion",
          }
        : {
            room: "Hall of Brothers",
            light: "Late afternoon",
            companion: "Ori / resting",
          };
  const listeners = new Set();
  const read = () => ({ contextId, status: { ...status } }),
    emit = () => {
      for (const fn of [...listeners]) fn(read());
    };
  const actions = {};
  for (const entry of source.actions)
    actions[entry.id] = () => {
      count++;
      if (id === "btm") {
        if (entry.id === "ori") status.energy = Math.max(0, status.energy - 7);
        if (entry.id === "weapon")
          status.weapon = ["Wake-Up Slap", "Bass Cannon", "Φ Pulse"][count % 3];
        if (entry.id === "map")
          status.objective =
            count % 2 ? "Map overlay / active" : "Break the relays";
      } else if (id === "studio") {
        if (entry.id === "tool")
          status.tool = [
            "Clay / additive",
            "Carve / subtract",
            "Smooth / finish",
          ][count % 3];
        if (entry.id === "palette")
          status.palette = ["Copper / ion", "Ocean / coral", "Graphite / gold"][
            count % 3
          ];
        if (entry.id === "undo") status.tool = "Undo received / demo";
      } else {
        if (entry.id === "room")
          status.room = ["Front steps", "Hall of Brothers", "Listening room"][
            count % 3
          ];
        if (entry.id === "light")
          status.light = ["Late afternoon", "Midnight blue", "Dawn copper"][
            count % 3
          ];
      }
      emit();
    };
  const adapter = createWorldAdapter({
    manifest: { apiVersion: 1, kind: "demo", ...source },
    readState: read,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    actions,
  });
  return Object.freeze({
    adapter,
    setContext(next) {
      if (!source.contexts.some((c) => c.id === next))
        throw Error("Unknown demo context");
      contextId = next;
      if (id === "studio")
        status.tool = next === "paint" ? "Round brush / 12" : "Clay / additive";
      emit();
    },
    listenerCount: () => listeners.size,
  });
}
