import { createWorldAdapter } from "../src/world-adapter.js";
/** A minimal, reusable host pattern. No deployment or repository changes. */
export function makeSpatialHost({
  id,
  title,
  readSnapshot,
  subscribe,
  context = "explore",
  onAction,
  onCapture,
}) {
  return createWorldAdapter({
    manifest: {
      apiVersion: 1,
      id,
      title,
      initialContext: context,
      capabilities: ["navigation"],
      actions: [
        { id: "focus", label: "Focus selected room", capability: "navigation" },
      ],
      contexts: [
        {
          id: context,
          title: context === "build" ? "Builder" : "Explorer",
          layout: context === "build" ? "studio" : "explorer",
          fields: [
            { id: "selection", label: "Selected room / object", type: "text" },
          ],
          controls: [
            { action: "focus", label: "FOCUS SELECTION", icon: "compass" },
          ],
          views: [
            {
              type: "note",
              title: "Host-owned navigation",
              items: [
                "This command changes only a scene already owned by the active host.",
              ],
            },
          ],
        },
      ],
    },
    readState: () => ({
      contextId: context,
      status: { selection: readSnapshot().selection },
    }),
    subscribe: (notify) =>
      subscribe(() =>
        notify({
          contextId: context,
          status: { selection: readSnapshot().selection },
        }),
      ),
    actions: { focus: ({ signal }) => onAction("focus", { signal }) },
    onCapture,
  });
}
