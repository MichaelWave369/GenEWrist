/** Integration example for a separately reviewed BTM change. Not installed in BTM. */
import { createWrist } from "../src/core.js";
import { makeBTMWorldAdapter } from "../src/adapters/btm.js";
import { createXRSurface } from "../src/xr-surface.js";

export function attachBTMWorld({
  game,
  WEAPONS,
  subscribeHUD,
  readMap,
  activate,
  setWristInputCapture,
  paintDirty,
  worlds = [],
  requestExitXR = null,
  requestRecenter = null,
  requestTravel = null,
}) {
  for (const fn of [
    subscribeHUD,
    readMap,
    activate,
    setWristInputCapture,
    paintDirty,
  ])
    if (typeof fn !== "function") throw TypeError("BTM host callback required");
  const wrist = createWrist({ worlds });
  const snapshot = () => ({
    player: {
      health: game.player.health,
      armor: game.player.armor,
      energy: game.player.energy,
    },
    weapon: WEAPONS[game.weapon].name,
    unlocked: game.unlocked,
    objective: game.objective,
    contextId: readMap() ? "navigation" : "combat",
  });
  const host = makeBTMWorldAdapter({
    readSnapshot: snapshot,
    subscribe: (notify) => subscribeHUD(() => notify(snapshot())),
    actions: {
      ori: () => activate("ori"),
      map: () => activate("map"),
      weapon: (index) => activate("weapon", index),
    },
    onCapture: setWristInputCapture,
  });
  // UI prompts for grants. Do not supply grants automatically in a host integration.
  wrist.connectWorld(host);
  wrist.navigate("world");
  const surface = createXRSurface({
    wrist,
    onExit: requestExitXR,
    onRecenter: requestRecenter,
    onTravel: requestTravel,
  });
  const stop = wrist.subscribe(() => {
    surface.render();
    paintDirty();
  });
  surface.render();
  return {
    wrist,
    surface,
    update: () => wrist.updateWorld(host.readState()),
    dispose() {
      stop();
      surface.destroy();
      wrist.dispose();
    },
  };
}
