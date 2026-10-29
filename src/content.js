/** User-owned content only. No host state, capability grants or game saves. */
export const CONTENT_KEY = "genewrist.content.v1";
const COLORS = [
  "#62e5ed",
  "#e9b874",
  "#fa8bba",
  "#edf5eb",
  "#8ecbff",
  "#b8d6a0",
];
export { COLORS };
export const freshDrawing = () => ({
  version: 1,
  layers: [{ id: "layer-1", name: "Layer 1", visible: true, strokes: [] }],
});
const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
export function validateDrawing(raw) {
  if (
    !raw ||
    raw.version !== 1 ||
    !Array.isArray(raw.layers) ||
    raw.layers.length < 1 ||
    raw.layers.length > 5
  )
    throw Error("Invalid SIGL project");
  let pointCount = 0;
  const layers = raw.layers.map((layer, i) => {
    if (!Array.isArray(layer.strokes) || layer.strokes.length > 200)
      throw Error("Too many strokes");
    const strokes = layer.strokes.map((stroke) => {
      if (
        !Array.isArray(stroke.points) ||
        !stroke.points.length ||
        stroke.points.length > 2000 ||
        !/^#[0-9a-fA-F]{6}$/.test(stroke.color) ||
        !Number.isFinite(stroke.width) ||
        stroke.width < 1 ||
        stroke.width > 32 ||
        ![1, 2, 4, 8].includes(stroke.symmetry)
      )
        throw Error("Invalid stroke");
      const points = stroke.points.map((p) => {
        if (
          !Array.isArray(p) ||
          p.length !== 2 ||
          !p.every(Number.isFinite) ||
          p[0] < 0 ||
          p[0] > 640 ||
          p[1] < 0 ||
          p[1] > 480
        )
          throw Error("Invalid drawing coordinate");
        return [...p];
      });
      pointCount += points.length;
      if (pointCount > 40000) throw Error("SIGL point limit exceeded");
      return {
        color: stroke.color,
        width: stroke.width,
        symmetry: stroke.symmetry,
        points,
      };
    });
    return {
      id: "layer-" + (i + 1),
      name: str(layer.name, 40) || "Layer " + (i + 1),
      visible: layer.visible !== false,
      strokes,
    };
  });
  return { version: 1, layers };
}
export function validateContent(raw) {
  if (
    !raw ||
    raw.version !== 1 ||
    !Array.isArray(raw.journal) ||
    !Array.isArray(raw.sigls) ||
    raw.journal.length > 200 ||
    raw.sigls.length > 20
  )
    throw Error("Invalid content archive");
  const journal = raw.journal.map((entry, i) => ({
    id: str(entry.id, 64) || "entry-" + i,
    title: str(entry.title, 100) || "Untitled journey",
    world: str(entry.world, 100),
    note: str(entry.note, 4000),
    created: str(entry.created, 40),
  }));
  const sigls = raw.sigls.map((entry, i) => ({
    id: str(entry.id, 64) || "sigl-" + i,
    title: str(entry.title, 100) || "Untitled SIGL",
    drawing: validateDrawing(entry.drawing),
  }));
  return { version: 1, journal, sigls };
}
export function parseContent(text) {
  if (typeof text !== "string" || text.length > 3000000)
    throw Error("Archive exceeds 3 MB");
  return validateContent(JSON.parse(text));
}
export function createContentStore(storage = null) {
  let data = { version: 1, journal: [], sigls: [] },
    warning = null;
  try {
    const raw = storage?.getItem?.(CONTENT_KEY);
    if (raw) data = parseContent(raw);
  } catch {
    warning =
      "Saved content could not be read. Export any recoverable content before replacing it.";
  }
  const snapshot = () => structuredClone(data);
  const commit = (next) => {
    const validated = validateContent(next),
      encoded = JSON.stringify(validated);
    if (encoded.length > 3000000) throw Error("Archive exceeds 3 MB");
    data = validated;
    try {
      if (!storage?.setItem) throw Error("Storage unavailable");
      storage.setItem(CONTENT_KEY, encoded);
      warning = null;
      return true;
    } catch {
      warning =
        "Storage is unavailable. Content is held for this session; export to keep it.";
      return false;
    }
  };
  return Object.freeze({
    snapshot,
    warning: () => warning,
    save: commit,
    import(text) {
      return commit(parseContent(text));
    },
    export: () => JSON.stringify(data, null, 2),
    clear() {
      return commit({ version: 1, journal: [], sigls: [] });
    },
  });
}
export function rotatedPaths(stroke) {
  return Array.from({ length: stroke.symmetry }, (_, i) => {
    const a = (i * Math.PI * 2) / stroke.symmetry,
      c = Math.cos(a),
      s = Math.sin(a);
    return stroke.points.map(([x, y]) => [
      320 + (x - 320) * c - (y - 240) * s,
      240 + (x - 320) * s + (y - 240) * c,
    ]);
  });
}
export function drawSIGL(context, drawing) {
  context.clearRect(0, 0, 640, 480);
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const layer of drawing.layers) {
    if (!layer.visible) continue;
    for (const stroke of layer.strokes) {
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.width;
      for (const path of rotatedPaths(stroke)) {
        context.beginPath();
        path.forEach(([x, y], i) =>
          i ? context.lineTo(x, y) : context.moveTo(x, y),
        );
        if (path.length === 1)
          context.lineTo(path[0][0] + 0.01, path[0][1] + 0.01);
        context.stroke();
      }
    }
  }
}
export function exportSVG(raw) {
  const drawing = validateDrawing(raw);
  const paths = drawing.layers
    .filter((l) => l.visible)
    .flatMap((l) =>
      l.strokes.flatMap((s) =>
        rotatedPaths(s).map(
          (p) =>
            '<path d="' +
            p
              .map(
                ([x, y], i) =>
                  (i ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2),
              )
              .join(" ") +
            '" fill="none" stroke="' +
            s.color +
            '" stroke-width="' +
            s.width +
            '" stroke-linecap="round" stroke-linejoin="round"/>',
        ),
      ),
    )
    .join("");
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="640" height="480">' +
    paths +
    "</svg>"
  );
}
export function measureGeometry({ width, height, depth, angle = 0 } = {}) {
  if (
    ![width, height, depth, angle].every(Number.isFinite) ||
    [width, height, depth].some((v) => v <= 0 || v > 1000)
  )
    throw Error("Invalid virtual geometry");
  return Object.freeze({
    diagonal: Math.hypot(width, height, depth),
    volume: width * height * depth,
    surface: 2 * (width * height + height * depth + width * depth),
    levelOffset: Math.sin((angle * Math.PI) / 180),
    angle,
  });
}
export const FORGE_SUBJECTS = Object.freeze([
  "A unionized portal",
  "A time-travelling gopher",
  "The world’s smallest evil corporation",
  "An emotionally unavailable toaster",
  "A machinist from the year 3086",
  "An interdimensional HOA",
]);
export const FORGE_TURNS = Object.freeze([
  "has filed a complaint about excessive destiny.",
  "will only open after its lunch break.",
  "is three raccoons in a very expensive lab coat.",
  "replaced the apocalypse with a mandatory pizza meeting.",
  "demands that all prophecies be submitted in triplicate.",
  "has misplaced the universe but kept the receipt.",
]);
export const forgeLine = (subject, turn) =>
  FORGE_SUBJECTS[Math.abs(subject) % FORGE_SUBJECTS.length] +
  " " +
  FORGE_TURNS[Math.abs(turn) % FORGE_TURNS.length];
