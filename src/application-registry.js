import { CATALOG } from "./catalog.js";
/** Reviewed, bundled applications. No remote modules or manifest-provided JS. */
const categories = {
  "realm-atlas": "Navigation",
  "loom-market": "Fusion",
  "snake-toolkit": "Creation",
  "journey-log": "Lore",
  "sigl-designer": "Creation",
  tribewire: "Community",
  house: "Lore",
  "sovereign-weave": "Lore",
  "resonance-stats": "Lore",
  "aether-compass": "Navigation",
};
export const BUNDLED_APPS = Object.freeze(
  CATALOG.map((app) =>
    Object.freeze({
      ...app,
      category: categories[app.id] || "Play / Well-Being",
      capabilities: Object.freeze(
        app.action === "glyph"
          ? ["local-content", "export"]
          : app.action === "journal"
            ? ["local-content", "import", "export"]
            : app.action === "worlds"
              ? ["confirmed-navigation"]
              : [],
      ),
    }),
  ),
);
export function createApplicationRegistry({ launch } = {}) {
  if (typeof launch !== "function")
    throw Error("Application launch callback required");
  return Object.freeze({
    list: () => BUNDLED_APPS,
    launch(id) {
      const app = BUNDLED_APPS.find((a) => a.id === id);
      if (!app) throw Error("Application not bundled");
      launch(app.id);
      return app;
    },
  });
}
