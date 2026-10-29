export const STORAGE_KEY = "genewrist.settings.v1";
export const DEFAULTS = Object.freeze({
  theme: "neon",
  ring: "middle",
  mode: "glance",
  favorites: [],
  recent: [],
  subtitleSize: "medium",
  reducedMotion: false,
  contrast: false,
  homeWorldId: null,
  rememberHistory: false,
  handedness: "right",
  posture: "seated",
  environment: true,
});
const safeIds = (value, max) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (x) => typeof x === "string" && /^[a-z0-9-]{1,64}$/.test(x),
          ),
        ),
      ].slice(0, max)
    : [];
export function sanitizePreferences(value) {
  const x =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    theme: ["neon", "field", "nevora"].includes(x.theme) ? x.theme : "neon",
    ring: ["outer", "middle", "inner"].includes(x.ring) ? x.ring : "middle",
    mode: x.mode === "field" ? "field" : "glance",
    favorites: safeIds(x.favorites, 30),
    recent: safeIds(x.recent, 10),
    subtitleSize: ["small", "medium", "large"].includes(x.subtitleSize)
      ? x.subtitleSize
      : "medium",
    reducedMotion: x.reducedMotion === true,
    contrast: x.contrast === true,
    homeWorldId:
      typeof x.homeWorldId === "string" &&
      /^[a-z0-9-]{1,64}$/.test(x.homeWorldId)
        ? x.homeWorldId
        : null,
    rememberHistory: x.rememberHistory === true,
    handedness: x.handedness === "left" ? "left" : "right",
    posture: x.posture === "standing" ? "standing" : "seated",
    environment: x.environment !== false,
  };
}
export function loadPreferences(storage) {
  try {
    return sanitizePreferences(
      JSON.parse(storage?.getItem?.(STORAGE_KEY) ?? "{}"),
    );
  } catch {
    return sanitizePreferences({});
  }
}
export function savePreferences(storage, value) {
  try {
    storage?.setItem?.(STORAGE_KEY, JSON.stringify(sanitizePreferences(value)));
    return true;
  } catch {
    return false;
  }
}
export function resetPreferences(storage) {
  try {
    storage?.removeItem?.(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
