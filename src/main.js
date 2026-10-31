import { createWrist } from "./core.js";
import { mountPhiSurf } from "./phisurf-dom.js";
import { createOperatorPassportBridge, parseOperatorPassport, operatorPassportSummary } from "./operator-passport.js";
import { RINGS } from "./catalog.js";
import { createApplicationRegistry } from "./application-registry.js";
import { createDemoHost } from "./adapters/demos.js";
import {
  createContentStore,
  freshDrawing,
  validateDrawing,
  drawSIGL,
  exportSVG,
  forgeLine,
} from "./content.js";
import * as views from "./views.js";
import { launchExperimentalXR } from "./xr.js";
import { registerOfflineShell } from "./offline.js";
const localStore = (() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
})();
const wrist = createWrist({ storage: localStore }),
  content = createContentStore(localStore);
const operatorBridge = createOperatorPassportBridge({ storage: localStore });
const registry = createApplicationRegistry({
  launch: (id) => wrist.openApp(id),
});
const $ = (selector) => document.querySelector(selector);
const display = $("#wrist-root"),
  workspace = $("#workspace-root"),
  notice = $("#notice");
const model = {
  rocks: [],
  rockWon: false,
  marketCategory: "All",
  atlasQuery: "",
  atlasFilter: "all",
  demoId: null,
  demo: null,
  drawing: freshDrawing(),
  layer: 0,
  color: "#62e5ed",
  brush: 4,
  symmetry: 4,
  undo: [],
  redo: [],
  siglTitle: "Untitled SIGL",
  siglId: null,
  journal: { title: "", world: "", note: "" },
  geometry: { width: 4, height: 3, depth: 2, angle: 0 },
  mirrored: false,
  forgeSubject: 0,
  forgeTurn: 0,
  motes: new Set(),
};
let xrController = null,
  noticeTimer = null,
  pendingTravel = null,
  lastWorkspaceKey = "",
  lastDisplay = "",
  lastRings = "",
  disposed = false;
const uid = () =>
  globalThis.crypto?.randomUUID?.() || "local-" + Date.now().toString(36);
function announce(message) {
  notice.textContent = message;
  notice.classList.add("active");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => notice.classList.remove("active"), 6000);
}
function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function refreshOperatorPassport() {
  const status = operatorBridge.snapshot();
  document.body.classList.toggle("operator-surf-wheel", status.rewards.includes("phisurf-wheel"));
  document.body.classList.toggle("operator-wrist-pulse", status.rewards.includes("genewrist-pulse"));
  const label = $("#operator-passport-status");
  label.textContent = status.imported
    ? "Imported Operator Passport • Standard rank " + status.clearedRank +
      " cleared / 6 • " + (status.rewards.length
        ? status.rewards.length + " cosmetic integration(s) active."
        : "More optional cosmetics are available at rank 2.")
    : "No Operator Passport imported. Normal navigation remains fully available.";
  $("#operator-passport-clear").disabled = !status.imported;
  $("#operator-passport-export").disabled = !status.imported;
}
function rememberFocus() {
  const active = document.activeElement;
  if (!active || active === document.body) return () => {};
  const id = active.id,
    action = active.dataset?.action,
    item = active.dataset?.id,
    cap = active.dataset?.capability,
    start = active.selectionStart,
    end = active.selectionEnd;
  return () => {
    const next = id
      ? document.getElementById(id)
      : cap
        ? document.querySelector(
            '.grant-input[data-capability="' + CSS.escape(cap) + '"]',
          )
        : action
          ? document.querySelector(
              '[data-action="' +
                CSS.escape(action) +
                '"]' +
                (item !== undefined
                  ? '[data-id="' + CSS.escape(item) + '"]'
                  : ""),
            )
          : null;
    if (next && next !== active) {
      next.focus({ preventScroll: true });
      if (
        typeof start === "number" &&
        typeof next.setSelectionRange === "function"
      )
        try {
          next.setSelectionRange(start, end);
        } catch {}
    }
  };
}
function currentView(s) {
  const app = s.apps.find((a) => a.id === s.activeApp);
  if (s.destination === "world")
    return {
      title: s.worldHost
        ? s.worldHost.manifest.contexts.find(
            (c) => c.id === s.worldHost.contextId,
          ).title
        : "In this world.",
      kicker: "WORLD / UNIVERSAL CONTEXT ENGINE",
      html: views.worldHTML(s, model),
    };
  if (s.destination === "atlas" || app?.action === "worlds")
    return {
      title: "Find your next world.",
      kicker: "PORTAL MODE / REALM ATLAS",
      html: views.atlasHTML(s, model),
    };
  if (app) {
    const renderers = {
      market: () => views.marketHTML(s, model),
      glyph: () => views.glyphHTML(model, content.snapshot()),
      journal: () => views.journalHTML(model, content.snapshot()),
      geometry: () => views.geometryHTML(model),
      rocks: () => views.rocksHTML(model),
      laughter: () => views.laughterHTML(model),
      motes: () => views.motesHTML(model),
    };
    const body = (renderers[app.action] || (() => views.conceptHTML(app)))();
    return {
      title: app.title,
      kicker:
        "UNIVERSAL / " +
        (app.action ? "WORKING LOCAL APP" : "ORIGINAL DESIGN CONCEPT"),
      html:
        '<div class="app-meta">' +
        views.button("close-app", "", "← ALL MODULES") +
        '<span class="status-pill ' +
        (app.action ? "live" : "") +
        '">' +
        (app.action ? "LOCAL / USER-OWNED" : "CONCEPT / NOT CONNECTED") +
        "</span></div>" +
        body,
    };
  }
  return s.destination === "home"
    ? {
        title: "A home between worlds.",
        kicker: "HOME / YOUR LOCAL CONSOLE",
        html: views.homeHTML(),
      }
    : {
        title:
          RINGS.find((r) => r.id === s.preferences.ring).label === "TOOLS"
            ? "The things you can make."
            : RINGS.find((r) => r.id === s.preferences.ring).hint + ".",
        kicker: "UNIVERSAL / ORIGINAL 3–6–9",
        html: views.universalHTML(s),
      };
}
function syncSettings(s) {
  const p = s.preferences;
  for (const [selector, value] of [
    ["#theme-select", p.theme],
    ["#text-scale", p.subtitleSize],
    ["#hand-select", p.handedness],
    ["#posture-select", p.posture],
  ])
    $(selector).value = value;
  for (const [selector, value] of [
    ["#motion-toggle", p.reducedMotion],
    ["#contrast-toggle", p.contrast],
    ["#environment-toggle", p.environment],
    ["#history-toggle", p.rememberHistory],
  ])
    $(selector).checked = value;
  $("#home-select").innerHTML =
    '<option value="">This console / safe Home</option>' +
    s.worlds
      .filter((w) => w.url)
      .map(
        (w) =>
          '<option value="' + w.id + '">' + views.esc(w.title) + "</option>",
      )
      .join("");
  $("#home-select").value = p.homeWorldId || "";
}
function render(force = false) {
  if (disposed) return;
  const restore = rememberFocus(),
    s = wrist.snapshot(),
    p = s.preferences;
  document.body.dataset.theme = p.theme;
  document.body.classList.toggle("reduced-motion", p.reducedMotion);
  document.body.classList.toggle("high-contrast", p.contrast);
  document.body.classList.toggle("text-large", p.subtitleSize === "large");
  document.body.classList.toggle("text-small", p.subtitleSize === "small");
  document.body.classList.toggle("host-connected", Boolean(s.worldHost));
  for (const nav of document.querySelectorAll(
    ".global-nav [data-action=navigate]",
  )) {
    const selected = nav.dataset.id === s.destination;
    nav.classList.toggle("active", selected);
    if (selected) nav.setAttribute("aria-current", "page");
    else nav.removeAttribute("aria-current");
  }
  $(".nav-home").classList.toggle("active", s.destination === "home");
  $("#world-nav-label").textContent = s.worldHost
    ? s.worldHost.manifest.title
    : "CONTEXT ENGINE";
  $("#device-signal").textContent = s.worldHost
    ? s.worldHost.manifest.kind === "demo"
      ? "SIMULATED HOST"
      : "HOST CONNECTED"
    : "STANDALONE CONSOLE";
  const html = views.wristHTML(s);
  if (html !== lastDisplay) {
    display.innerHTML = html;
    lastDisplay = html;
  }
  const rings = views.ringControls(s);
  if (rings !== lastRings) {
    $("#ring-controls").innerHTML = rings;
    lastRings = rings;
  }
  // Host events must not remount unrelated creative editors or discard their work.
  const key = JSON.stringify([
    s.destination,
    s.activeApp,
    p.ring,
    p.favorites,
    p.recent,
    p.rememberHistory,
    s.destination === "world" ? s.worldHost : null,
    s.destination === "world" ? s.hostError : null,
  ]);
  if (force || lastWorkspaceKey !== key) {
    const view = currentView(s);
    $("#workspace-title").textContent = view.title;
    $("#workspace-kicker").textContent = view.kicker;
    workspace.innerHTML =
      (content.warning()
        ? '<p class="storage-warning">' + views.esc(content.warning()) + "</p>"
        : "") + view.html;
    lastWorkspaceKey = key;
    if ($("#glyph-canvas")) setupGlyph();
  }
  syncSettings(s);
  restore();
}
function activateDestination(id) {
  wrist.navigate(id);
  wrist.setMode("field");
  $("#workspace-title").focus({ preventScroll: true });
}
function editDrawing(fn) {
  const before = structuredClone(model.drawing);
  try {
    fn();
    model.drawing = validateDrawing(model.drawing);
  } catch (error) {
    model.drawing = before;
    throw error;
  }
  model.undo.push(before);
  model.undo = model.undo.slice(-40);
  model.redo = [];
  render(true);
}
function setupGlyph() {
  const canvas = $("#glyph-canvas"),
    ctx = canvas?.getContext("2d");
  if (!ctx) return;
  drawSIGL(ctx, model.drawing);
  let stroke = null;
  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    return [
      Math.max(0, Math.min(640, ((e.clientX - r.left) * 640) / r.width)),
      Math.max(0, Math.min(480, ((e.clientY - r.top) * 480) / r.height)),
    ];
  };
  const preview = () => {
    const drawing = {
      ...model.drawing,
      layers: model.drawing.layers.map((layer, index) =>
        index === model.layer
          ? { ...layer, strokes: [...layer.strokes, stroke] }
          : layer,
      ),
    };
    drawSIGL(ctx, drawing);
  };
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !model.drawing.layers[model.layer].visible) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    stroke = {
      color: model.color,
      width: model.brush,
      symmetry: model.symmetry,
      points: [point(e)],
    };
    preview();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!stroke || stroke.points.length >= 2000) return;
    const p = point(e),
      previous = stroke.points.at(-1);
    if (Math.hypot(p[0] - previous[0], p[1] - previous[1]) < 1) return;
    stroke.points.push(p);
    preview();
  });
  canvas.addEventListener("pointerup", () => {
    if (!stroke) return;
    const finished = stroke;
    stroke = null;
    try {
      editDrawing(() =>
        model.drawing.layers[model.layer].strokes.push(finished),
      );
    } catch (error) {
      announce(error.message);
      drawSIGL(ctx, model.drawing);
    }
  });
  const cancel = () => {
    stroke = null;
    drawSIGL(ctx, model.drawing);
  };
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("lostpointercapture", cancel);
}
function saveContent(next, message) {
  const persisted = content.save(next);
  announce(
    persisted
      ? message
      : "Session saved. Storage is unavailable; export a backup to keep it.",
  );
  render(true);
}
function connectDemo(id) {
  model.demo = null;
  model.demoId = null;
  wrist.disconnectWorld();
  const demo = createDemoHost(id);
  model.demo = demo;
  model.demoId = id;
  wrist.connectWorld(demo.adapter);
  activateDestination("world");
  announce("Simulated host connected. Grant only the controls you want.");
}
async function planTravel(id) {
  const plan = wrist.planLaunch(id);
  if (!plan.available) {
    announce(plan.reason);
    return;
  }
  pendingTravel = plan;
  $("#travel-description").textContent =
    wrist.getWorld(id).title + " — " + plan.url;
  $("#travel-dialog").showModal();
}
async function confirmTravel() {
  if (!pendingTravel) return;
  const plan = pendingTravel;
  pendingTravel = null;
  try {
    if (xrController) {
      await xrController.end();
      xrController = null;
    }
    wrist.disconnectWorld();
    if (wrist.snapshot().preferences.rememberHistory)
      wrist.markVisited(plan.worldId);
    window.location.assign(plan.url);
  } catch (error) {
    announce("Travel stopped: " + error.message);
  }
}
$("#travel-dialog").addEventListener("close", () => {
  if ($("#travel-dialog").returnValue === "confirm") confirmTravel();
  else pendingTravel = null;
});
function showSettings() {
  syncSettings(wrist.snapshot());
  $("#settings-dialog").showModal();
}
function glyphStamp(kind) {
  const points =
    kind === "star"
      ? Array.from({ length: 11 }, (_, i) => {
          const a = (i * Math.PI) / 5 - Math.PI / 2,
            r = i % 2 ? 50 : 110;
          return [320 + Math.cos(a) * r, 240 + Math.sin(a) * r];
        })
      : [
          [320, 110],
          [430, 240],
          [320, 370],
          [210, 240],
          [320, 110],
        ];
  editDrawing(() =>
    model.drawing.layers[model.layer].strokes.push({
      points,
      color: model.color,
      width: model.brush,
      symmetry: 1,
    }),
  );
}
const actions = {
  home: () => {
    const home = wrist.snapshot().preferences.homeWorldId;
    if (home && wrist.getWorld(home)?.url) return planTravel(home);
    wrist.home();
    announce("Home / your local console.");
  },
  back: () => wrist.back(),
  navigate: (id) => activateDestination(id),
  settings: showSettings,
  mode: (id) => wrist.setMode(id),
  "mode-toggle": () =>
    wrist.setMode(
      wrist.snapshot().preferences.mode === "field" ? "glance" : "field",
    ),
  ring: (id) => {
    wrist.setRing(id);
    wrist.navigate("universal");
    wrist.setMode("field");
  },
  app: (id) => {
    registry.launch(id);
    $("#workspace-title").focus({ preventScroll: true });
  },
  "close-app": () => {
    wrist.closeApp();
    wrist.navigate("universal");
  },
  favorite: (id) => wrist.toggleFavorite(id),
  launch: planTravel,
  market: (id) => {
    model.marketCategory = id;
    render(true);
  },
  "host-connect": connectDemo,
  "host-context": (id) => model.demo?.setContext(id),
  "host-action": async (id) => {
    await wrist.requestWorldAction(id);
    announce("Host received the authorized action.");
  },
  "host-revoke": () => wrist.setWorldGrants([]),
  "host-disconnect": () => {
    wrist.disconnectWorld();
    model.demo = null;
    model.demoId = null;
    render(true);
    announce("Host disconnected. Context and permissions cleared.");
  },
  "glyph-clear": () =>
    editDrawing(() => (model.drawing.layers[model.layer].strokes = [])),
  "glyph-stamp": glyphStamp,
  "glyph-undo": () => {
    if (!model.undo.length) return;
    model.redo.push(structuredClone(model.drawing));
    model.drawing = model.undo.pop();
    model.layer = Math.min(model.layer, model.drawing.layers.length - 1);
    render(true);
  },
  "glyph-redo": () => {
    if (!model.redo.length) return;
    model.undo.push(structuredClone(model.drawing));
    model.drawing = model.redo.pop();
    model.layer = Math.min(model.layer, model.drawing.layers.length - 1);
    render(true);
  },
  "layer-add": () => {
    if (model.drawing.layers.length >= 5) return;
    editDrawing(() => {
      const i = model.drawing.layers.length + 1;
      model.drawing.layers.push({
        id: "layer-" + i,
        name: "Layer " + i,
        visible: true,
        strokes: [],
      });
      model.layer = i - 1;
    });
  },
  "layer-visible": () =>
    editDrawing(
      () =>
        (model.drawing.layers[model.layer].visible =
          !model.drawing.layers[model.layer].visible),
    ),
  "glyph-save": () => {
    const data = content.snapshot(),
      id = model.siglId || uid(),
      project = {
        id,
        title: model.siglTitle.trim() || "Untitled SIGL",
        drawing: validateDrawing(model.drawing),
      },
      i = data.sigls.findIndex((p) => p.id === id);
    if (i >= 0) data.sigls[i] = project;
    else data.sigls.push(project);
    saveContent(data, "SIGL project saved locally.");
    model.siglId = id;
  },
  "glyph-load": (id) => {
    const project = content.snapshot().sigls.find((p) => p.id === id);
    if (!project) return;
    if (
      model.undo.length &&
      !confirm("Replace the current drawing with this saved project?")
    )
      return;
    model.drawing = project.drawing;
    model.siglTitle = project.title;
    model.siglId = id;
    model.layer = 0;
    model.undo = [];
    model.redo = [];
    render(true);
  },
  "glyph-delete": (id) => {
    if (
      !confirm(
        "Delete this saved SIGL? Export a backup first if you want to keep it.",
      )
    )
      return;
    const data = content.snapshot();
    data.sigls = data.sigls.filter((p) => p.id !== id);
    saveContent(data, "Saved project deleted.");
    if (model.siglId === id) model.siglId = null;
  },
  "glyph-export": (id) => {
    if (id === "svg")
      download("genewrist-sigl.svg", exportSVG(model.drawing), "image/svg+xml");
    else {
      const a = document.createElement("a");
      a.download = "genewrist-sigl.png";
      a.href = $("#glyph-canvas").toDataURL("image/png");
      a.click();
    }
    announce("SIGL exported.");
  },
  "content-export": () =>
    download(
      "genewrist-creative-archive.json",
      content.export(),
      "application/json",
    ),
  "content-import": () => $("#content-file")?.click(),
  "journal-delete": (id) => {
    if (!confirm("Delete this private note?")) return;
    const data = content.snapshot();
    data.journal = data.journal.filter((e) => e.id !== id);
    saveContent(data, "Note deleted.");
  },
  "content-delete": () => {
    if (
      !confirm(
        "Delete all local journal notes and saved SIGLs? Export a backup first to keep them.",
      )
    )
      return;
    content.clear();
    model.siglId = null;
    render(true);
    announce("Local creative content deleted.");
  },
  "geometry-reset": () => {
    model.geometry = { width: 4, height: 3, depth: 2, angle: 0 };
    render(true);
  },
  "geometry-mirror": () => {
    model.mirrored = !model.mirrored;
    render(true);
  },
  rock: (id) => {
    if (model.rockWon) return;
    model.rocks.push(id);
    const balance = model.rocks.reduce(
      (n, x) => n + (x === "left" ? -1 : 1),
      0,
    );
    if (Math.abs(balance) > 2) {
      model.rocks = [];
      announce("Gravity has entered the chat. Try alternating sides.");
    } else if (model.rocks.length === 9) {
      model.rockWon = true;
      announce("Nine stones. A very small triumph.");
    }
    render(true);
  },
  "rock-reset": () => {
    model.rocks = [];
    model.rockWon = false;
    render(true);
  },
  forge: () => {
    model.forgeTurn++;
    if (model.forgeTurn % 6 === 0)
      model.forgeSubject = (model.forgeSubject + 1) % 6;
    render(true);
  },
  "forge-export": () =>
    download(
      "department-of-questionable-inventions.txt",
      forgeLine(model.forgeSubject, model.forgeTurn),
      "text/plain",
    ),
  mote: (id) => {
    const n = Number(id);
    model.motes.has(n) ? model.motes.delete(n) : model.motes.add(n);
    render(true);
  },
  "mote-reset": () => {
    model.motes.clear();
    render(true);
  },
};
async function clickHandler(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn || btn.disabled) return;
  try {
    await actions[btn.dataset.action]?.(btn.dataset.id);
  } catch (error) {
    announce("Action unavailable: " + error.message);
  }
}
document.addEventListener("click", clickHandler);
document.addEventListener("submit", (e) => {
  if (e.target.id !== "journal-form") return;
  e.preventDefault();
  try {
    const data = content.snapshot();
    if (!model.journal.title.trim() || !model.journal.note.trim()) return;
    data.journal.push({
      id: uid(),
      ...model.journal,
      created: new Date().toISOString(),
    });
    model.journal = { title: "", world: "", note: "" };
    saveContent(data, "Private note saved locally.");
  } catch (error) {
    announce(error.message);
  }
});
document.addEventListener("input", (e) => {
  const target = e.target;
  if (target.id === "world-search") {
    model.atlasQuery = target.value;
    render(true);
  }
  if (target.id === "ink-color") model.color = target.value;
  if (target.id === "brush-size") model.brush = Number(target.value);
  if (target.id === "sigl-title") model.siglTitle = target.value;
  if (target.id === "journal-title") model.journal.title = target.value;
  if (target.id === "journal-world") model.journal.world = target.value;
  if (target.id === "journal-note") model.journal.note = target.value;
  if (target.dataset.geometry) {
    model.geometry[target.dataset.geometry] = Number(target.value);
    const template = document.createElement("template");
    template.innerHTML = views.geometryHTML(model);
    for (const selector of [
      ".geometry-preview",
      ".measurement-grid",
      ".level-indicator",
    ]) {
      const next = template.content.querySelector(selector);
      workspace.querySelector(selector)?.replaceWith(next);
    }
    target.closest("label").firstChild.nodeValue =
      target.dataset.geometry.toUpperCase() + " / " + target.value;
  }
});
document.addEventListener("change", async (e) => {
  const target = e.target;
  try {
    const preferenceMap = {
      "theme-select": "theme",
      "text-scale": "subtitleSize",
      "hand-select": "handedness",
      "posture-select": "posture",
      "motion-toggle": "reducedMotion",
      "contrast-toggle": "contrast",
      "environment-toggle": "environment",
      "history-toggle": "rememberHistory",
    };
    if (preferenceMap[target.id])
      wrist.setPreferences({
        [preferenceMap[target.id]]:
          target.type === "checkbox" ? target.checked : target.value,
      });
    if (target.id === "home-select") wrist.setHomeWorld(target.value || null);
    if (target.classList.contains("grant-input"))
      wrist.setWorldGrants(
        [...document.querySelectorAll(".grant-input:checked")].map(
          (el) => el.dataset.capability,
        ),
      );
    if (target.id === "world-filter") {
      model.atlasFilter = target.value;
      render(true);
    }
    if (target.id === "symmetry-select") model.symmetry = Number(target.value);
    if (target.id === "layer-select") model.layer = Number(target.value);
    if (target.id === "forge-subject") {
      model.forgeSubject = Number(target.value);
      render(true);
    }
    if (target.id === "content-file") {
      const file = target.files[0];
      if (!file) return;
      if (file.size > 3000000) throw Error("Archive exceeds 3 MB");
      const text = await file.text();
      // Validate before asking to replace anything.
      const { parseContent } = await import("./content.js");
      parseContent(text);
      if (
        !confirm(
          "Replace local notes and saved SIGLs with this archive? Export first to keep your current content.",
        )
      )
        return;
      const persisted = content.import(text);
      render(true);
      announce(
        persisted
          ? "Creative archive imported locally."
          : "Imported for this session. Export to keep a backup.",
      );
    }
  } catch (error) {
    announce("Update unavailable: " + error.message);
  }
});
$("#reset-button").addEventListener("click", () => {
  if (
    confirm(
      "Reset local device settings and favorites? Your saved SIGLs and private notes are kept.",
    )
  ) {
    wrist.reset();
    announce("Device settings reset. Creative content kept.");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !document.querySelector("dialog[open]")) {
    wrist.back();
    e.preventDefault();
  }
});
$("#xr-button").addEventListener("click", async () => {
  const button = $("#xr-button");
  if (xrController) {
    try {
      await xrController.end();
    } catch (error) {
      announce(error.message);
    }
    return;
  }
  try {
    button.disabled = true;
    xrController = await launchExperimentalXR({
      wrist,
      onNotice: announce,
      onDemo: connectDemo,
      readApp: () => ({
        drawing: model.drawing,
        rocks: model.rocks,
        geometry: model.geometry,
        motes: [...model.motes],
        forgeSubject: model.forgeSubject,
        forgeTurn: model.forgeTurn,
        noteCount: content.snapshot().journal.length,
      }),
      onAppAction: (action, id) => {
        const allowed = [
          "glyph-stamp",
          "glyph-undo",
          "glyph-save",
          "rock",
          "rock-reset",
          "forge",
          "mote",
          "geometry-reset",
          "geometry-mirror",
        ];
        if (!allowed.includes(action))
          throw Error("Unapproved local XR action");
        return actions[action](id);
      },
      onTravel: async (id) => {
        const plan = wrist.planLaunch(id);
        if (!plan.available) throw Error("Destination unavailable");
        pendingTravel = plan;
        await confirmTravel();
      },
      onEnd: () => {
        xrController = null;
        wrist.disconnectWorld();
        model.demo = null;
        model.demoId = null;
        button.textContent = "ENTER XR ↗";
        announce("XR ended. Host context and grants cleared.");
      },
    });
    button.textContent = "EXIT XR ×";
  } catch (error) {
    announce("XR unavailable: " + error.message);
  } finally {
    button.disabled = false;
  }
});
$("#operator-passport-import").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (file.size > 16384) return announce("Operator Passport exceeds the 16 KiB limit.");
  try {
    const text = await file.text();
    const validated = parseOperatorPassport(text);
    const summary = operatorPassportSummary(validated);
    if (!confirm(
      "Import PhiOperator Passport (Standard rank " + summary.clearedRank +
      " cleared)? This replaces only the previously imported Operator progress. " +
      "It does not affect your Gen.E.Wrist settings, creative work or World grants."
    )) return;
    const state = operatorBridge.import(text);
    announce(state.persisted
      ? "Operator Passport imported locally. Optional cosmetics refreshed."
      : "Operator Passport loaded for this session. Export to keep a backup.");
  } catch (error) {
    announce("Operator import rejected: " + error.message);
  }
});
$("#operator-passport-export").addEventListener("click", () => {
  const text = operatorBridge.export();
  if (!text) return announce("No Operator Passport has been imported.");
  download("phioperator-passport-v1.json", text, "application/json");
  announce("Operator Passport exported.");
});
$("#operator-passport-clear").addEventListener("click", () => {
  if (!operatorBridge.snapshot().imported) return;
  if (!confirm("Forget the imported Operator Passport in Gen.E.Wrist? This does not change your PhiOperator progress.")) return;
  operatorBridge.clear();
  announce("Operator Passport removed here. All normal tools remain available.");
});
const networkState = () => {
  $("#network-state").classList.toggle("offline", !navigator.onLine);
  $("#network-state").innerHTML =
    '<i class="status-dot"></i> ' +
    (navigator.onLine ? "LOCAL FIRST" : "OFFLINE / LOCAL");
};
window.addEventListener("online", networkState);
window.addEventListener("offline", networkState);
networkState();
const stop = wrist.subscribe(() => render());
const stopOperator = operatorBridge.subscribe(refreshOperatorPassport);
render();
refreshOperatorPassport();
const surfUI = mountPhiSurf({ wrist, onNotice: announce, operatorBridge });
if (matchMedia("(prefers-reduced-motion: reduce)").matches)
  document.body.classList.add("reduced-motion");
registerOfflineShell({ onState: (message) => announce(message) });
window.addEventListener(
  "pagehide",
  () => {
    disposed = true;
    clearTimeout(noticeTimer);
    stop();
    stopOperator();
    surfUI.dispose();
    operatorBridge.dispose();
    wrist.dispose();
    xrController?.end().catch(() => {});
  },
  { once: true },
);
