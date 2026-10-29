import { RINGS, ringItems } from "./catalog.js";
import { BUNDLED_APPS } from "./application-registry.js";
import { drawSIGL, forgeLine } from "./content.js";
/** One reviewed Canvas presentation, shared core navigation, bounded hit targets. */
export function createXRSurface({
  wrist,
  onExit,
  onRecenter,
  onTravel,
  onNotice = () => {},
  onDemo = () => {},
  readApp = () => ({}),
  onAppAction = () => {},
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 768;
  const art = document.createElement("canvas");
  art.width = 640;
  art.height = 480;
  const c = canvas.getContext("2d"),
    targets = [];
  let page = 0,
    pending = null,
    permissions = false,
    hover = null,
    fontScale = 1,
    contrast = false;
  const text = (value, x, y, size = 25, color = "#dcebe9") => {
    c.fillStyle = contrast && color === "#b7cbd0" ? "#e1eff0" : color;
    c.font =
      (size >= 30 ? "500 " : "") +
      size * fontScale +
      'px "Trebuchet MS",sans-serif';
    c.fillText(String(value).slice(0, 62), x, y);
  };
  const wrap = (value, x, y, width = 440, size = 25) => {
    c.font = size * fontScale + 'px "Trebuchet MS",sans-serif';
    const words = String(value).split(" ");
    let line = "",
      row = 0;
    for (const word of words) {
      if (c.measureText(line + word).width > width && line) {
        text(line, x, y + row * 35 * fontScale, size, "#b7cbd0");
        line = "";
        row++;
        if (row === 5) break;
      }
      line += word + " ";
    }
    text(line, x, y + row * 35 * fontScale, size, "#b7cbd0");
  };
  const button = (id, x, y, w, h, label, action, enabled = true) => {
    c.fillStyle = hover === id ? "#35505b" : "#142b38";
    c.fillRect(x, y, w, h);
    c.strokeStyle = enabled
      ? hover === id
        ? "#edc591"
        : contrast
          ? "#95b4bc"
          : "#567b84"
      : "#344752";
    c.lineWidth = 2;
    c.strokeRect(x, y, w, h);
    c.fillStyle = enabled ? "#e7c899" : "#75868a";
    let size = (label.length > 20 ? 19 : 22) * fontScale;
    c.font = "500 " + size + 'px "Trebuchet MS",sans-serif';
    while (c.measureText(label).width > w - 24 && size > 17) {
      size--;
      c.font = "500 " + size + 'px "Trebuchet MS",sans-serif';
    }
    c.fillText(label, x + 13, y + h / 2 + 8);
    if (enabled) targets.push({ id, x, y, w, h, action });
  };
  const nav = () => {
    [
      [
        "home",
        "HOME",
        () => {
          pending = null;
          permissions = false;
          wrist.home();
        },
      ],
      [
        "back",
        "BACK",
        () => {
          if (pending) pending = null;
          else if (permissions) permissions = false;
          else wrist.back();
        },
      ],
      [
        "universal",
        "UNIVERSAL",
        () => {
          permissions = false;
          pending = null;
          wrist.navigate("universal");
          wrist.setMode("field");
        },
      ],
      [
        "world",
        "WORLD",
        () => {
          permissions = false;
          pending = null;
          wrist.navigate("world");
          wrist.setMode("field");
        },
      ],
      [
        "close",
        "CLOSE",
        () => {
          pending = null;
          permissions = false;
          wrist.setMode("glance");
        },
      ],
    ].forEach(([id, label, fn], i) =>
      button(id, 24 + i * 198, 92, 184, 55, label, fn),
    );
    button("exit", 24, 696, 190, 49, "EXIT XR", onExit);
    button("recenter", 230, 696, 204, 49, "RECENTER", onRecenter);
    button("atlas", 450, 696, 238, 49, "REALM ATLAS", () => {
      pending = null;
      permissions = false;
      wrist.navigate("atlas");
      wrist.setMode("field");
    });
    button(
      "expand",
      704,
      696,
      296,
      49,
      wrist.snapshot().preferences.mode === "glance"
        ? "EXPAND FIELD"
        : "MINIMIZE / GLANCE",
      () =>
        wrist.setMode(
          wrist.snapshot().preferences.mode === "glance" ? "field" : "glance",
        ),
    );
  };
  const next = (total, size = 4) => {
    if (total > size)
      button("next", 804, 626, 196, 48, "NEXT PAGE →", () => {
        page = (page + 1) % Math.ceil(total / size);
      });
  };
  function render() {
    targets.length = 0;
    const s = wrist.snapshot(),
      world = s.worldHost,
      app = s.apps.find((a) => a.id === s.activeApp),
      appState = readApp();
    fontScale =
      s.preferences.subtitleSize === "large"
        ? 1.12
        : s.preferences.subtitleSize === "small"
          ? 0.94
          : 1;
    contrast = s.preferences.contrast;
    c.clearRect(0, 0, 1024, 768);
    c.fillStyle = "#081923";
    c.fillRect(0, 0, 1024, 768);
    c.strokeStyle = "#a18763";
    c.lineWidth = 4;
    c.strokeRect(5, 5, 1014, 758);
    text("GEN.E.WRIST", 28, 51, 32, "#edc591");
    text("FIELD ENGINE / 03", 660, 50, 24, "#82aeb8");
    nav();
    if (pending) {
      text("CONFIRM WORLD HANDOFF", 40, 223, 34, "#edc591");
      text(pending.title, 40, 288, 32);
      wrap(
        "This ends XR and opens another website. Enter VR again there. No host state or saves are transferred.",
        40,
        353,
        850,
        28,
      );
      button(
        "travel-cancel",
        40,
        546,
        400,
        65,
        "CANCEL / STAY",
        () => (pending = null),
      );
      button("travel-confirm", 468, 546, 532, 65, "CONFIRM / LEAVE XR ↗", () =>
        onTravel(pending.id),
      );
      return;
    }
    if (permissions && world) {
      text("EXPLICIT CAPABILITY GRANTS", 40, 207, 30, "#edc591");
      text(
        "Cleared on disconnect. No private game data is stored.",
        40,
        250,
        23,
        "#b7cbd0",
      );
      world.manifest.capabilities
        .slice(
          (page %
            Math.max(1, Math.ceil(world.manifest.capabilities.length / 8))) *
            8,
        )
        .slice(0, 8)
        .forEach((cap, i) => {
          const granted = world.grants.includes(cap);
          button(
            "grant-" + cap,
            40 + (i % 2) * 486,
            286 + Math.floor(i / 2) * 76,
            464,
            62,
            (granted ? "[✓] " : "[ ] ") + cap.toUpperCase(),
            () =>
              wrist.setWorldGrants(
                granted
                  ? world.grants.filter((g) => g !== cap)
                  : [...world.grants, cap],
              ),
          );
        });
      next(world.manifest.capabilities.length, 8);
      return;
    }
    if (s.preferences.mode === "glance") {
      text("ONE WRIST. EVERY WORLD.", 80, 255, 44, "#62e5ed");
      text(
        world ? world.manifest.title : "STANDALONE / NO HOST CONNECTED",
        80,
        315,
        27,
      );
      if (world) {
        let i = 0;
        for (const [key, value] of Object.entries(world.status).slice(0, 4)) {
          text(
            key.toUpperCase() + " / " + value,
            80,
            375 + i++ * 47,
            28,
            "#b7cbd0",
          );
        }
      } else
        wrap(
          "Your local tools and creative work are ready. Expand the field to begin.",
          80,
          390,
          840,
          32,
        );
      button("activate", 80, 586, 864, 64, "ACTIVATE FIELD MODE", () =>
        wrist.setMode("field"),
      );
      return;
    }
    if (s.destination === "world") {
      if (!world) {
        text("WORLD MODE / STANDALONE", 40, 218, 32, "#62e5ed");
        wrap(
          "Choose a simulated host. Your universal tools stay with you.",
          40,
          277,
          850,
          28,
        );
        [
          ["btm", "BTM / COMBAT"],
          ["studio", "DOMISTIKA / STUDIO"],
          ["porch", "PORCH / EXPLORER"],
        ].forEach(([id, label], i) =>
          button("demo-" + id, 40, 380 + i * 85, 944, 65, label, () =>
            onDemo(id),
          ),
        );
        return;
      }
      const context = world.manifest.contexts.find(
        (c) => c.id === world.contextId,
      );
      text(
        world.manifest.title + " / " + context.title,
        40,
        210,
        30,
        world.manifest.theme.accent,
      );
      text(
        world.manifest.kind === "demo"
          ? "SIMULATED / BUNDLED HOST"
          : "TRUSTED HOST / EVENT UPDATES",
        40,
        252,
        21,
        "#b7cbd0",
      );
      context.fields.slice(0, 6).forEach((f, i) => {
        text(f.label.toUpperCase(), 40, 310 + i * 52, 19, "#82aeb8");
        text(world.status[f.id] ?? "—", 215, 310 + i * 52, 24);
      });
      context.controls
        .slice((page % Math.max(1, Math.ceil(context.controls.length / 5))) * 5)
        .slice(0, 5)
        .forEach((control, i) => {
          const action = world.manifest.actions.find(
            (a) => a.id === control.action,
          );
          button(
            "host-" + control.action,
            550,
            282 + i * 66,
            440,
            54,
            control.label,
            () =>
              wrist
                .requestWorldAction(control.action)
                .catch((e) => onNotice(e.message)),
            world.grants.includes(action.capability),
          );
        });
      button(
        "permissions",
        40,
        626,
        414,
        48,
        "PERMISSIONS / " + world.grants.length + " GRANTED",
        () => {
          permissions = true;
          page = 0;
        },
      );
      button("disconnect", 472, 626, 316, 48, "DISCONNECT HOST", () =>
        wrist.disconnectWorld(),
      );
      next(context.controls.length, 5);
      return;
    }
    if (s.destination === "atlas" || app?.id === "realm-atlas") {
      text("REALM ATLAS / INDEPENDENT WORLDS", 40, 210, 30, "#62e5ed");
      text(
        "Choose a world, then confirm the external handoff.",
        40,
        252,
        23,
        "#b7cbd0",
      );
      s.worlds
        .slice((page % Math.ceil(s.worlds.length / 4)) * 4)
        .slice(0, 4)
        .forEach((world, i) => {
          button(
            "world-" + world.id,
            40,
            294 + i * 76,
            944,
            64,
            world.title + (world.url ? "  ↗" : " / PLANNED"),
            () => (pending = world),
            Boolean(world.url),
          );
        });
      next(s.worlds.length);
      return;
    }
    if (app && app.id !== "house") {
      text(app.title, 40, 211, 34, "#edc591");
      if (app.action === "glyph") {
        if (appState.drawing) {
          drawSIGL(art.getContext("2d"), appState.drawing);
          c.drawImage(art, 30, 240, 540, 405);
        }
        button("stamp-diamond", 600, 276, 382, 62, "◇ ADD DIAMOND", () =>
          onAppAction("glyph-stamp", "diamond"),
        );
        button("stamp-star", 600, 354, 382, 62, "✦ ADD STAR", () =>
          onAppAction("glyph-stamp", "star"),
        );
        button("undo", 600, 432, 382, 62, "UNDO", () =>
          onAppAction("glyph-undo"),
        );
        button("save", 600, 510, 382, 62, "SAVE LOCAL PROJECT", () =>
          onAppAction("glyph-save"),
        );
        text(
          "Full drawing / layers in desktop editor.",
          40,
          668,
          22,
          "#b7cbd0",
        );
      } else if (app.action === "rocks") {
        const rocks = appState.rocks || [];
        rocks.forEach((rock, i) => {
          c.fillStyle = i % 2 ? "#e0b789" : "#8cc5c3";
          c.fillRect(
            245 + i * 10 + (rock === "left" ? -8 : 8),
            610 - i * 32,
            390 - i * 20,
            24,
          );
        });
        text(rocks.length + " / 9 STONES", 620, 290, 34, "#62e5ed");
        button("rock-left", 620, 345, 350, 62, "← PLACE LEFT", () =>
          onAppAction("rock", "left"),
        );
        button("rock-right", 620, 425, 350, 62, "PLACE RIGHT →", () =>
          onAppAction("rock", "right"),
        );
        button("rock-reset", 620, 505, 350, 62, "RESTART", () =>
          onAppAction("rock-reset"),
        );
      } else if (app.action === "laughter") {
        wrap(
          forgeLine(appState.forgeSubject || 0, appState.forgeTurn || 0),
          50,
          310,
          900,
          38,
        );
        button("forge", 50, 560, 920, 66, "FORGE MORE NONSENSE", () =>
          onAppAction("forge"),
        );
      } else if (app.action === "motes") {
        const motes = appState.motes || [];
        Array.from({ length: 9 }, (_, i) =>
          button(
            "mote-" + i,
            140 + (i % 3) * 250,
            270 + Math.floor(i / 3) * 110,
            224,
            85,
            motes.includes(i) ? "✦ ALIGHT" : "· LIGHT MOTE",
            () => onAppAction("mote", String(i)),
          ),
        );
      } else if (app.action === "geometry") {
        const g = appState.geometry || {
          width: 4,
          height: 3,
          depth: 2,
          angle: 0,
        };
        text("VIRTUAL GEOMETRY / SCENE UNITS ONLY", 40, 268, 25, "#82aeb8");
        text(
          g.width + " × " + g.height + " × " + g.depth,
          40,
          338,
          44,
          "#62e5ed",
        );
        text("WORKPLANE " + g.angle + "°", 40, 397, 30);
        button("geometry-zero", 40, 460, 440, 64, "ZERO / RESET", () =>
          onAppAction("geometry-reset"),
        );
        button("geometry-gauge", 520, 460, 440, 64, "LEFT-HAND GAUGE", () =>
          onAppAction("geometry-mirror"),
        );
        wrap(
          "Use the desktop tool to adjust dimensions and inspect measurements.",
          40,
          577,
          900,
          26,
        );
      } else if (app.action === "market") {
        const apps = BUNDLED_APPS.filter((a) => a.action);
        apps
          .slice((page % Math.ceil(apps.length / 4)) * 4)
          .slice(0, 4)
          .forEach((a, i) =>
            button("app-" + a.id, 40, 280 + i * 82, 944, 66, a.title, () =>
              wrist.openApp(a.id),
            ),
          );
        next(apps.length);
      } else if (app.action === "journal") {
        text(
          (appState.noteCount || 0) + " PRIVATE NOTES / LOCAL ONLY",
          40,
          292,
          32,
          "#62e5ed",
        );
        wrap(
          "Your journal is never recorded automatically. Writing, importing and exporting are available in the desktop editor.",
          40,
          370,
          900,
          32,
        );
        button(
          "desktop-editor",
          40,
          566,
          944,
          64,
          "EXIT XR / CONTINUE IN JOURNEYLOG",
          onExit,
        );
      } else {
        wrap(app.description, 40, 300, 900, 34);
        text(
          "HISTORICAL / " + app.status.toUpperCase(),
          40,
          510,
          25,
          "#edc591",
        );
        text(
          "Concept only. No hardware or service is connected.",
          40,
          570,
          25,
          "#b7cbd0",
        );
      }
      return;
    }
    const ring = RINGS.find((r) => r.id === s.preferences.ring),
      apps = ringItems(ring.id);
    const radii = { outer: 211, middle: 157, inner: 99 };
    for (const r of RINGS) {
      c.beginPath();
      c.arc(308, 421, radii[r.id], 0, Math.PI * 2);
      c.strokeStyle = r.id === ring.id ? "#65dce6" : "#34515b";
      c.lineWidth = 2;
      c.stroke();
    }
    apps.forEach((app, i) => {
      const a = (i * Math.PI * 2) / apps.length - Math.PI / 2,
        r = radii[ring.id];
      button(
        "app-" + app.id,
        308 + Math.cos(a) * r - 34,
        421 + Math.sin(a) * r - 29,
        68,
        58,
        String(i + 1).padStart(2, "0"),
        () => wrist.openApp(app.id),
      );
    });
    text("3·6·9", 266, 432, 31, "#edc591");
    text(ring.label, 600, 252, 33, "#62e5ed");
    apps.forEach((a, i) => {
      if (i < 9) text(i + 1 + ". " + a.title, 600, 296 + i * 36, 23, "#b7cbd0");
    });
    RINGS.forEach((r, i) =>
      button(
        "ring-" + r.id,
        40 + i * 322,
        625,
        306,
        49,
        r.count + " / " + r.label,
        () => {
          wrist.setRing(r.id);
          wrist.navigate("universal");
        },
      ),
    );
  }
  return Object.freeze({
    canvas,
    targets,
    render,
    setHover(value) {
      hover = value;
    },
    reset() {
      pending = null;
      permissions = false;
      page = 0;
    },
    destroy() {
      targets.length = 0;
      canvas.width = canvas.height = art.width = art.height = 1;
    },
  });
}
