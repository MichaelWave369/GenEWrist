import {
  RINGS,
  CATALOG,
  TOOLKIT,
  LOOM_CATEGORIES,
  ringItems,
} from "./catalog.js";
import { BUNDLED_APPS } from "./application-registry.js";
import { DEMO_HOSTS } from "./adapters/demos.js";
import { FORGE_SUBJECTS, forgeLine, measureGeometry } from "./content.js";
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  crosshair:
    "M12 2v5m0 10v5M2 12h5m10 0h5M19 12a7 7 0 1 1-14 0 7 7 0 1 1 14 0Z",
  brush: "m15 3 6 6-10 10-6-6Zm-10 10-2 8 8-2M14 6l4 4",
  compass: "M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0ZM16 8l-2 6-6 2 2-6Z",
  cube: "m12 2 9 5v10l-9 5-9-5V7Zm0 10 9-5M3 7l9 5v10",
  home: "m3 11 9-8 9 8M5 9v12h14V9M10 21v-7h4v7",
  layers: "m12 2 10 6-10 6L2 8Zm-10 10 10 6 10-6M2 16l10 6 10-6",
  spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z",
  map: "m2 5 7-3 6 3 7-3v17l-7 3-6-3-7 3Zm7-3v17m6-14v17",
  inventory: "M4 8h16v13H4ZM8 8V4h8v4M4 12h16",
};
export const icon = (name) =>
  '<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="' +
  (paths[name] || paths.cube) +
  '"/></svg></span>';
export const button = (action, id, label, extra = "") => {
  const classes = extra.match(/class="([^"]*)"/)?.[1] || "chip";
  return (
    '<button type="button" class="' +
    classes +
    '" data-action="' +
    action +
    '" data-id="' +
    esc(id) +
    '" ' +
    extra.replace(/class="[^"]*"/, "") +
    ">" +
    esc(label) +
    "</button>"
  );
};
const labelStatus = (a) =>
  a.action
    ? "LOCAL APP"
    : a.status === "informational"
      ? "FICTION / CONCEPT"
      : "PLANNED";
export function wristHTML(s) {
  const world = s.worldHost,
    stats = world?.status;
  const header =
    '<div class="device-head">GEN.E / ' +
    (s.preferences.mode === "glance"
      ? "GLANCE"
      : s.destination === "world"
        ? "WORLD"
        : "FIELD") +
    "<small>" +
    (world
      ? esc(world.manifest.title).toUpperCase()
      : "ENTER THE FIELD / Φ369") +
    "</small></div>";
  if (s.preferences.mode === "glance") {
    const readings = stats
      ? Object.entries(stats)
          .filter(([, v]) => typeof v === "number")
          .slice(0, 3)
          .map(([k, v]) => [k.toUpperCase(), Math.round(v)])
      : [
          ["APPS", BUNDLED_APPS.filter((a) => a.action).length],
          ["WORLDS", s.worlds.filter((w) => w.url).length],
          ["SIGNAL", "—"],
        ];
    return (
      header +
      '<div class="glance"><div class="glance-mark" aria-hidden="true">Φ</div><p class="glance-title">' +
      (world ? "WORLDLINK / ACTIVE" : "YOUR FIELD. READY.") +
      '</p><p class="glance-sub">' +
      (world
        ? world.manifest.kind === "demo"
          ? "BUNDLED HOST / SIMULATED"
          : "TRUSTED HOST / LIVE UPDATES"
        : "STANDALONE / NO HOST CONNECTED") +
      '</p><div class="meters">' +
      readings
        .map(
          ([label, v]) =>
            '<div class="meter"><label>' +
            esc(label) +
            "</label><strong>" +
            esc(v) +
            "</strong></div>",
        )
        .join("") +
      '</div><button class="button" data-action="mode" data-id="field">ACTIVATE FIELD MODE</button><span class="glance-foot">ONE WRIST. ONE HOME. EVERY WORLD.</span></div>'
    );
  }
  if (s.destination === "world") {
    const context = world?.manifest.contexts.find(
      (c) => c.id === world.contextId,
    );
    return (
      header +
      '<div class="world-wrist">' +
      icon(world?.manifest.icon || "compass") +
      "<h3>" +
      esc(context?.title || "World Mode") +
      "</h3><p>" +
      esc(
        world?.manifest.kind === "demo"
          ? "SIMULATED HOST / " + world.manifest.title
          : world?.manifest.title || "NO HOST CONNECTED",
      ) +
      "</p>" +
      (world
        ? '<div class="meters">' +
          Object.entries(world.status)
            .filter(([, v]) => typeof v === "number")
            .slice(0, 3)
            .map(
              ([k, v]) =>
                '<div class="meter"><label>' +
                esc(k.toUpperCase()) +
                "</label><strong>" +
                Math.round(v) +
                "</strong></div>",
            )
            .join("") +
          "</div>"
        : "<p>Connect a bundled demonstration<br/>in the context window.</p>") +
      button("navigate", "universal", "↖ UNIVERSAL MODE") +
      "</div>"
    );
  }
  const ring = RINGS.find((r) => r.id === s.preferences.ring);
  const circles = RINGS.map(
    (r) =>
      '<div class="nested-ring ' +
      r.id +
      (ring.id === r.id ? " selected" : "") +
      '"></div>' +
      ringItems(r.id)
        .map((app, i) =>
          ring.id === r.id
            ? '<button class="orbit-item ' +
              r.id +
              (s.activeApp === app.id ? " active" : "") +
              '" style="--angle:' +
              (i * 360) / r.count +
              'deg" data-action="app" data-id="' +
              app.id +
              '" aria-label="' +
              esc(app.title) +
              '" title="' +
              esc(app.title) +
              '"><b>' +
              String(i + 1).padStart(2, "0") +
              "</b><small>" +
              esc(app.title) +
              "</small></button>"
            : '<span class="ring-ghost ' +
              r.id +
              '" style="--angle:' +
              (i * 360) / r.count +
              'deg" aria-hidden="true"></span>',
        )
        .join(""),
  ).join("");
  return (
    '<div class="field"><div class="wheel" role="group" aria-label="' +
    ring.label +
    ' ring">' +
    circles +
    '<div class="wheel-center"><strong>3·6·9</strong><small>' +
    ring.label +
    '</small></div></div><span class="screen-selection">' +
    esc(CATALOG.find((a) => a.id === s.activeApp)?.title || ring.hint) +
    "</span></div>"
  );
}
export const ringControls = (s) =>
  RINGS.map(
    (r) =>
      '<button type="button" class="tab' +
      (s.preferences.ring === r.id ? " active" : "") +
      '" data-action="ring" data-id="' +
      r.id +
      '" aria-pressed="' +
      (s.preferences.ring === r.id) +
      '"><b>' +
      r.count +
      '</b><span class="tab-label"> / ' +
      r.label +
      "</span></button>",
  ).join("");
export function homeHTML() {
  return (
    '<p class="work-description">An instrument for the things you make, the places you go, and the worlds you call home.</p><div class="home-features">' +
    [
      ["atlas", "01", "Somewhere new", "Open the Realm Atlas.", "navigate"],
      [
        "sigl-designer",
        "02",
        "Make your mark",
        "Draw, layer and export a SIGL.",
        "app",
      ],
      [
        "world",
        "03",
        "Belong in every world",
        "Try the Universal Context Engine.",
        "navigate",
      ],
    ]
      .map(
        ([id, num, title, desc, action]) =>
          '<button class="home-feature" data-action="' +
          action +
          '" data-id="' +
          id +
          '"><span class="feature-number">' +
          num +
          "</span><span><strong>" +
          title +
          "</strong><small>" +
          desc +
          '</small></span><span class="feature-arrow" aria-hidden="true">↗</span></button>',
      )
      .join("") +
    '</div><div class="home-note"><p><strong>Local by design.</strong> Your creative work stays yours. No account. No telemetry. No private host data is saved.</p><p>Infinite Porch is our intended universal Home. Until its web integration is verified, this console is your reliable return point.</p></div>'
  );
}
export function universalHTML(s) {
  const ring = RINGS.find((r) => r.id === s.preferences.ring);
  return (
    '<p class="work-description">' +
    esc(ring.hint) +
    '. The original eighteen modules, arranged in three familiar rings. Choose one on the instrument or below.</p><div class="module-list">' +
    ringItems(ring.id)
      .map(
        (a) =>
          '<button class="module-link" data-action="app" data-id="' +
          a.id +
          '"><b>' +
          esc(a.title) +
          "</b><small>" +
          labelStatus(a) +
          "<br/>" +
          esc(a.description) +
          "</small></button>",
      )
      .join("") +
    '</div><p class="dim">Concepts and planned modules preserve the original fiction. Working local apps are explicitly marked.</p>'
  );
}
export function atlasHTML(s, m) {
  const query = m.atlasQuery.toLowerCase(),
    favorites = s.preferences.favorites;
  const list = s.worlds
    .filter((w) =>
      (w.title + " " + w.category + " " + w.subtitle)
        .toLowerCase()
        .includes(query),
    )
    .filter((w) =>
      m.atlasFilter === "favorites"
        ? favorites.includes(w.id)
        : m.atlasFilter === "recent"
          ? s.preferences.recent.includes(w.id)
          : true,
    )
    .sort((a, b) =>
      m.atlasFilter === "recent"
        ? s.preferences.recent.indexOf(a.id) -
          s.preferences.recent.indexOf(b.id)
        : Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)),
    );
  return (
    '<p class="work-description">Independent worlds. Familiar way home. Travel is a confirmed handoff to another website and its own XR session.</p><div class="search-row"><input id="world-search" aria-label="Search worlds" placeholder="Find a world…" value="' +
    esc(m.atlasQuery) +
    '"/><select id="world-filter" aria-label="Filter worlds"><option value="all" ' +
    (m.atlasFilter === "all" ? "selected" : "") +
    '>All worlds</option><option value="favorites" ' +
    (m.atlasFilter === "favorites" ? "selected" : "") +
    '>Favorites</option><option value="recent" ' +
    (m.atlasFilter === "recent" ? "selected" : "") +
    ">Recent</option></select></div>" +
    (m.atlasFilter === "recent" && !s.preferences.rememberHistory
      ? '<p class="dim">History is off. Enable “Remember confirmed destinations” in Device Settings to keep recents.</p>'
      : "") +
    '<div class="work-grid atlas-list">' +
    (list.length
      ? list
          .map(
            (w) =>
              '<article class="world-card" data-id="' +
              w.id +
              '"><div class="world-art" aria-hidden="true">' +
              icon(
                w.category === "STUDIO"
                  ? "brush"
                  : w.category === "HOME"
                    ? "home"
                    : w.category === "GAME"
                      ? "crosshair"
                      : "compass",
              ) +
              '</div><div class="world-info"><div class="world-category">' +
              esc(w.category) +
              " / " +
              (w.url ? "SOURCE-DOCUMENTED LINK" : "DESTINATION UNVERIFIED") +
              "</div><strong>" +
              esc(w.title) +
              "</strong><small>" +
              esc(w.subtitle) +
              '</small><div class="world-controls">' +
              button(
                "favorite",
                w.id,
                favorites.includes(w.id) ? "★" : "☆",
                'aria-label="' +
                  (favorites.includes(w.id)
                    ? "Remove favorite"
                    : "Add favorite") +
                  " " +
                  esc(w.title) +
                  '" class="icon-button ' +
                  (favorites.includes(w.id) ? "fav" : "") +
                  '"',
              ) +
              (w.url
                ? button("launch", w.id, "OPEN ↗")
                : '<span class="status-pill">PLANNED</span>') +
              (s.preferences.recent.includes(w.id)
                ? '<span class="recent-world">VISITED</span>'
                : "") +
              "</div></div></article>",
          )
          .join("")
      : '<p class="empty-state">No worlds here yet. Try a different filter.</p>') +
    '</div><p class="dim">External destinations require a connection and may be unavailable. Their assets and saves are not cached or transferred.</p>'
  );
}
export function worldHTML(s, m) {
  const world = s.worldHost,
    allowDemos = m.allowDemos !== false,
    allowContextChange = m.allowContextChange !== false;
  if (!world && !allowDemos)
    return '<p class="work-description">No host connected. Register a trusted WorldAdapter to display its contextual controls.</p><p class="dim">HOME, BACK and UNIVERSAL MODE are always available. Host state is not persisted.</p>';
  if (!world)
    return (
      (s.hostError
        ? '<p class="storage-warning">' + esc(s.hostError) + "</p>"
        : "") +
      '<p class="work-description">World Mode belongs to the place you’re in. A host registers its screens; your wrist supplies the familiar controls.</p><p class="section-caption">STANDALONE / CHOOSE A DEMONSTRATION</p><div class="host-picker">' +
      DEMO_HOSTS.map(
        (host) =>
          '<button class="host-card" data-action="host-connect" data-id="' +
          host.id +
          '">' +
          icon(host.icon) +
          "<span><b>" +
          esc(host.title) +
          "</b><small>" +
          esc(host.description) +
          '</small></span><span aria-hidden="true">↗</span></button>',
      ).join("") +
      '</div><p class="dim">These are bundled, simulated worlds. They do not connect to the actual games. No action permission is granted until you choose it.</p>'
    );
  const context = world.manifest.contexts.find((c) => c.id === world.contextId),
    isDemo = world.manifest.kind === "demo";
  const viewHTML = (view) =>
    '<section class="approved-view"><h4>' +
    esc(view.title) +
    "</h4>" +
    (view.type === "grid"
      ? '<div class="view-grid">' +
        view.items.map((t) => "<span>" + esc(t) + "</span>").join("") +
        "</div>"
      : view.type === "steps"
        ? "<ol>" +
          view.items.map((t) => "<li>" + esc(t) + "</li>").join("") +
          "</ol>"
        : view.type === "palette"
          ? '<div class="palette-chips">' +
            view.items
              .filter((t) => /^#[0-9a-f]{6}$/i.test(t))
              .map(
                (t) =>
                  '<span style="background:' +
                  t +
                  '" title="' +
                  t +
                  '"></span>',
              )
              .join("") +
            "</div><p>" +
            view.items
              .filter((t) => !t.startsWith("#"))
              .map(esc)
              .join(" / ") +
            "</p>"
          : view.items.map((t) => "<p>" + esc(t) + "</p>").join("")) +
    "</section>";
  return (
    '<div class="world-surface layout-' +
    context.layout +
    '" style="--host-accent:' +
    world.manifest.theme.accent +
    '"><div class="host-heading"><div><strong class="host-name">' +
    esc(world.manifest.title) +
    '</strong><span class="host-kind">' +
    (isDemo
      ? "SIMULATED HOST / BUNDLED DEMO"
      : "CONNECTED HOST / EXPLICIT UPDATES") +
    "</span></div>" +
    icon(world.manifest.icon) +
    "</div>" +
    (isDemo && allowContextChange
      ? '<div class="context-switcher" role="group" aria-label="Simulate host context change">' +
        world.manifest.contexts
          .map((c) =>
            button(
              "host-context",
              c.id,
              c.title,
              'aria-pressed="' +
                (c.id === context.id) +
                '" ' +
                (c.id === context.id ? 'class="chip active"' : ""),
            ),
          )
          .join("") +
        "</div>"
      : "") +
    '<div class="host-status">' +
    context.fields
      .map(
        (f) =>
          '<div class="host-stat ' +
          f.type +
          '"><small>' +
          esc(f.label.toUpperCase()) +
          "</small><strong>" +
          esc(world.status[f.id] ?? "—") +
          (world.status[f.id] !== undefined ? esc(f.unit) : "") +
          "</strong>" +
          (f.type === "meter" && world.status[f.id] !== undefined
            ? '<progress aria-label="' +
              esc(f.label) +
              '" value="' +
              (world.status[f.id] - f.min) +
              '" max="' +
              (f.max - f.min) +
              '"></progress>'
            : "") +
          "</div>",
      )
      .join("") +
    '</div><div class="host-actions">' +
    context.controls
      .map((c) => {
        const a = world.manifest.actions.find((a) => a.id === c.action),
          granted = world.grants.includes(a.capability);
        return (
          '<button class="host-action" data-action="host-action" data-id="' +
          c.action +
          '" ' +
          (!granted
            ? 'disabled title="Grant ' +
              esc(a.capability) +
              ' permission below"'
            : "") +
          ">" +
          icon(c.icon) +
          esc(c.label) +
          "</button>"
        );
      })
      .join("") +
    "</div>" +
    context.views.map(viewHTML).join("") +
    '<details class="permissions" ' +
    (!world.grants.length ? "open" : "") +
    "><summary>EXPLICIT HOST PERMISSIONS / " +
    world.grants.length +
    ' GRANTED</summary><p class="dim">Only the listed commands can be invoked. Grants end on disconnect. No game saves or private data are stored.</p><div class="grant-list">' +
    world.manifest.capabilities
      .map(
        (c) =>
          '<label><input class="grant-input" data-capability="' +
          c +
          '" type="checkbox" ' +
          (world.grants.includes(c) ? "checked" : "") +
          "/>" +
          esc(c) +
          "</label>",
      )
      .join("") +
    "</div>" +
    button("host-revoke", "", "REVOKE ALL") +
    '</details></div><div class="disconnect-row">' +
    button("host-disconnect", "", "DISCONNECT HOST") +
    button("navigate", "universal", "↖ UNIVERSAL MODE") +
    "</div>" +
    (isDemo && allowDemos
      ? '<p class="dim">Context buttons simulate events from the host application. Switch worlds with a clean disconnect.</p><div class="work-buttons">' +
        DEMO_HOSTS.filter((h) => h.id !== m.demoId)
          .map((h) => button("host-connect", h.id, h.title))
          .join("") +
        "</div>"
      : "")
  );
}
export function marketHTML(s, m) {
  const selected = BUNDLED_APPS.filter(
    (a) => m.marketCategory === "All" || a.category === m.marketCategory,
  );
  return (
    '<p class="work-description">A shelf of trusted, bundled tools. No purchases, remote scripts or unreviewed downloads.</p><div class="work-buttons">' +
    ["All", ...LOOM_CATEGORIES]
      .map((c) =>
        button(
          "market",
          c,
          c,
          m.marketCategory === c ? 'class="chip active"' : "",
        ),
      )
      .join("") +
    '</div><div class="work-grid">' +
    selected
      .map(
        (a) =>
          '<div class="catalog-card"><div><strong>' +
          esc(a.title) +
          "</strong><small>" +
          esc(a.description) +
          '</small><span class="status-pill ' +
          (a.action ? "live" : "") +
          '">' +
          labelStatus(a) +
          (a.capabilities.length
            ? " / " + a.capabilities.map(esc).join(", ")
            : "") +
          "</span></div>" +
          button("app", a.id, a.action ? "OPEN" : "READ") +
          "</div>",
      )
      .join("") +
    "</div>"
  );
}
export function glyphHTML(m, content) {
  return (
    '<p class="work-description">Make something only you could make. Layered vector strokes, radial symmetry, and local projects. Save or export deliberately.</p><div class="drawing-toolbar"><label>INK <input id="ink-color" type="color" value="' +
    m.color +
    '"/></label><label>BRUSH <input id="brush-size" type="range" min="1" max="24" value="' +
    m.brush +
    '" aria-label="Brush size"/></label><label>SYMMETRY <select id="symmetry-select">' +
    [1, 2, 4, 8]
      .map(
        (n) =>
          '<option value="' +
          n +
          '" ' +
          (m.symmetry === n ? "selected" : "") +
          ">" +
          n +
          "×</option>",
      )
      .join("") +
    '</select></label></div><canvas id="glyph-canvas" class="glyph-canvas" width="640" height="480" tabindex="0" aria-label="Draw a personal glyph. Use geometric stamp buttons for keyboard access."></canvas><div class="layer-row"><select id="layer-select" aria-label="Active drawing layer">' +
    m.drawing.layers
      .map(
        (l, i) =>
          '<option value="' +
          i +
          '" ' +
          (i === m.layer ? "selected" : "") +
          ">" +
          esc(l.name) +
          (l.visible ? "" : " / hidden") +
          "</option>",
      )
      .join("") +
    "</select>" +
    button(
      "layer-add",
      "",
      "+ LAYER",
      m.drawing.layers.length >= 5 ? "disabled" : "",
    ) +
    button("layer-visible", "", "SHOW / HIDE") +
    '</div><div class="work-buttons">' +
    button("glyph-undo", "", "UNDO", !m.undo.length ? "disabled" : "") +
    button("glyph-redo", "", "REDO", !m.redo.length ? "disabled" : "") +
    button("glyph-stamp", "diamond", "◇ DIAMOND") +
    button("glyph-stamp", "star", "✦ STAR") +
    button("glyph-clear", "", "CLEAR LAYER") +
    '</div><div class="project-row"><input id="sigl-title" aria-label="SIGL project title" maxlength="100" value="' +
    esc(m.siglTitle) +
    '" placeholder="Name your SIGL…"/>' +
    button("glyph-save", "", "SAVE PROJECT") +
    '</div><div class="work-buttons">' +
    button("glyph-export", "png", "EXPORT PNG") +
    button("glyph-export", "svg", "EXPORT SVG") +
    button("content-export", "", "BACKUP JSON") +
    '</div><p class="dim">Transparent exports. Canvas drawing uses pointer or touch; stamps, layers and all editing controls work with a keyboard. Up to five layers, twenty saved projects.</p>' +
    (content.sigls.length
      ? '<p class="section-caption">YOUR SAVED PROJECTS</p>' +
        content.sigls
          .map(
            (p) =>
              '<div class="saved-project">' +
              button("glyph-load", p.id, p.title) +
              button("glyph-delete", p.id, "DELETE") +
              "</div>",
          )
          .join("")
      : "")
  );
}
export function journalHTML(m, content) {
  return (
    '<p class="work-description">Keep the parts you want to remember. Nothing is recorded automatically.</p><form id="journal-form" class="journal-form"><label>TITLE<input id="journal-title" maxlength="100" required value="' +
    esc(m.journal.title) +
    '" placeholder="A little moment worth keeping"/></label><label>WORLD / PLACE<input id="journal-world" maxlength="100" value="' +
    esc(m.journal.world) +
    '" placeholder="Where were you?"/></label><label>NOTE<textarea id="journal-note" maxlength="4000" required placeholder="In your own words…">' +
    esc(m.journal.note) +
    '</textarea></label><button class="button" type="submit">SAVE PRIVATE NOTE</button></form><div class="work-buttons">' +
    button("content-export", "", "EXPORT ARCHIVE") +
    button("content-import", "", "IMPORT ARCHIVE") +
    '</div><input id="content-file" type="file" class="file-import" accept="application/json,.json"/><p class="dim">Import replaces this local journal and saved SIGLs after confirmation. Export first to keep a copy. Maximum 200 notes / 3 MB.</p>' +
    (!content.journal.length
      ? '<p class="empty-state">Your journal is empty. The first page is yours.</p>'
      : content.journal
          .slice()
          .reverse()
          .map(
            (entry) =>
              '<article class="journal-entry"><h3>' +
              esc(entry.title) +
              "</h3><small>" +
              esc(entry.world || "A place of your own") +
              " / " +
              esc(entry.created.slice(0, 10)) +
              "</small><p>" +
              esc(entry.note) +
              "</p>" +
              button("journal-delete", entry.id, "DELETE NOTE") +
              "</article>",
          )
          .join("")) +
    '<div class="work-buttons">' +
    button(
      "content-delete",
      "",
      "DELETE ALL CREATIVE CONTENT",
      'class="chip danger"',
    ) +
    "</div>"
  );
}
export function geometryHTML(m) {
  const v = measureGeometry(m.geometry),
    g = m.geometry;
  const w = g.width * 12,
    h = g.height * 8,
    d = g.depth * 8;
  const scale = Math.min(1.8, 140 / (w + d), 66 / (h + d * 0.6));
  const shape = `M ${-w} ${-h} L ${w} ${-h} L ${w} ${h} L ${-w} ${h} Z M ${-w} ${-h} L ${-w + d} ${-h - d * 0.6} L ${w + d} ${-h - d * 0.6} L ${w} ${-h} M ${w} ${-h} L ${w + d} ${-h - d * 0.6} L ${w + d} ${h - d * 0.6} L ${w} ${h}`;
  const measures = `M ${-w} ${h + 10} L ${w} ${h + 10} M ${-w - 10} ${-h} L ${-w - 10} ${h}`;
  return (
    '<p class="work-description">The Machinist’s Measure. Inspect a virtual solid in scene units; level its workplane. This is simulated geometry, not a physical measuring instrument.</p><div class="geometry-preview"><svg viewBox="0 0 360 200" role="img" aria-label="Virtual block with measured width, height and depth"><g transform="translate(180 110) rotate(' +
    g.angle +
    ") scale(" +
    (m.mirrored ? -1 : 1) * scale +
    " " +
    scale +
    ')"><path d="' +
    shape +
    '" fill="#183641" stroke="#88b7bd" stroke-width="1.5"/><path d="' +
    measures +
    '" fill="none" stroke="#e9b874" stroke-dasharray="3 3"/></g><text x="20" y="185" fill="#b9cccd" font-size="10" font-family="monospace">' +
    g.width.toFixed(1) +
    " × " +
    g.height.toFixed(1) +
    " × " +
    g.depth.toFixed(1) +
    ' SCENE UNITS</text></svg></div><div class="geometry-controls">' +
    [
      ["width", "WIDTH", 0.5, 10, 0.1],
      ["height", "HEIGHT", 0.5, 10, 0.1],
      ["depth", "DEPTH", 0.5, 10, 0.1],
      ["angle", "WORKPLANE ANGLE", -20, 20, 1],
    ]
      .map(
        ([key, title, min, max, step]) =>
          "<label>" +
          title +
          " / " +
          g[key] +
          '<input type="range" data-geometry="' +
          key +
          '" id="geometry-' +
          key +
          '" min="' +
          min +
          '" max="' +
          max +
          '" step="' +
          step +
          '" value="' +
          g[key] +
          '" aria-label="' +
          title +
          '"/></label>',
      )
      .join("") +
    '</div><div class="level-indicator" aria-label="Virtual level ' +
    g.angle +
    ' degrees" style="--bubble:' +
    (50 + v.levelOffset * 100) +
    '%"><span></span></div><div class="measurement-grid"><div><small>SPACE DIAGONAL</small><strong>' +
    v.diagonal.toFixed(3) +
    "</strong><small>scene units</small></div><div><small>VOLUME</small><strong>" +
    v.volume.toFixed(2) +
    "</strong><small>scene units³</small></div><div><small>SURFACE AREA</small><strong>" +
    v.surface.toFixed(2) +
    "</strong><small>scene units²</small></div><div><small>BUILDER’S LEVEL</small><strong>" +
    g.angle +
    "°</strong><small>" +
    (!g.angle ? "Level workplane" : "Virtual tilt") +
    '</small></div></div><div class="work-buttons">' +
    button("geometry-reset", "", "ZERO / RESET") +
    button(
      "geometry-mirror",
      "",
      "LEFT-HAND GAUGE" + (m.mirrored ? " / ON" : ""),
    ) +
    '</div><details><summary class="dim">Original machinist’s collection</summary><ul class="tool-names">' +
    TOOLKIT.map(
      (t, i) =>
        "<li>" +
        esc(t) +
        ([0, 2, 4].includes(i) ? " / virtual demo" : " / historical concept") +
        "</li>",
    ).join("") +
    "</ul></details>"
  );
}
export function rocksHTML(m) {
  return (
    '<p class="work-description">Nine stones. A small rebellion against gravity. Alternate left and right to keep the tower balanced.</p><div class="rock-stack" aria-label="' +
    m.rocks.length +
    ' stones">' +
    m.rocks
      .map(
        (x, i) =>
          '<div class="rock" style="width:' +
          Math.max(28, 86 - i * 6) +
          "%;transform:translateX(" +
          (x === "left" ? -6 : 6) +
          'px)"></div>',
      )
      .join("") +
    '</div><p class="count">' +
    m.rocks.length +
    " / 9" +
    (m.rockWon ? " · COMPLETE" : "") +
    '</p><div class="work-buttons">' +
    button("rock", "left", "← PLACE LEFT", m.rockWon ? "disabled" : "") +
    button("rock", "right", "PLACE RIGHT →", m.rockWon ? "disabled" : "") +
    button("rock-reset", "", "RESTART") +
    '</div><p class="dim">Voluntary, quiet play. No scores leave this browser.</p>'
  );
}
export function laughterHTML(m) {
  return (
    '<p class="work-description">Welcome to the Department of Questionable Inventions. Please leave your seriousness at reception.</p><div class="laughter-display">' +
    esc(forgeLine(m.forgeSubject, m.forgeTurn)) +
    '</div><label class="section-caption">TODAY’S UNLIKELY PROTAGONIST<select id="forge-subject">' +
    FORGE_SUBJECTS.map(
      (s, i) =>
        '<option value="' +
        i +
        '" ' +
        (i === m.forgeSubject ? "selected" : "") +
        ">" +
        esc(s) +
        "</option>",
    ).join("") +
    '</select></label><div class="work-buttons">' +
    button("forge", "", "FORGE ANOTHER") +
    button("forge-export", "", "KEEP THIS NONSENSE") +
    "</div>"
  );
}
export function motesHTML(m) {
  return (
    '<p class="work-description">Nine little lights, no wrong arrangement. Tap a mote to light your own tiny constellation.</p><div class="mote-grid">' +
    Array.from(
      { length: 9 },
      (_, i) =>
        '<button class="mote ' +
        (m.motes.has(i) ? "on" : "") +
        '" data-action="mote" data-id="' +
        i +
        '" aria-label="GlowMote ' +
        (i + 1) +
        '" aria-pressed="' +
        m.motes.has(i) +
        '"></button>',
    ).join("") +
    '</div><p class="count">' +
    m.motes.size +
    " / 9 ALIGHT</p>" +
    button("mote-reset", "", "A CLEAR SKY")
  );
}
export function conceptHTML(a) {
  return (
    '<p class="work-description">' +
    esc(a.description) +
    '</p><p class="status-pill">' +
    (a.status === "planned"
      ? "PLANNED / NOT IMPLEMENTED"
      : "FICTIONAL DESIGN / INFORMATIONAL") +
    '</p><p class="dim">Preserved from the original Gen.E.Wrist specification. This is an in-world concept, not functioning hardware or a connected service.</p><div class="work-buttons">' +
    button("app", "sigl-designer", "MAKE A SIGL") +
    button("navigate", "universal", "ALL MODULES") +
    "</div>"
  );
}
