/**
 * PhiOperator Passport bridge v1.
 *
 * Local, user-initiated import only. A Passport is editable progress data,
 * NEVER a credential, authorization token, identity, or capability grant.
 * No network, automatic cross-origin reading, or WorldAdapter mutations.
 */
export const OPERATOR_PASSPORT_KEY = "genewrist.operator-passport.v1";
export const OPERATOR_FORMAT = "phioperator-passport";
export const OPERATOR_VERSION = 1;
const LIMIT = 16384;
const PASS = 7;
const RANK_COUNT = 6;
const MODES = ["standard", "chaos"];

export function validateOperatorPassport(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      value.format !== OPERATOR_FORMAT || value.version !== OPERATOR_VERSION ||
      !Array.isArray(value.results) || value.results.length > 12)
    throw new TypeError("Unsupported PhiOperator Passport format.");
  const seen = new Set();
  const results = value.results.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item) ||
        !Number.isInteger(item.rank) || item.rank < 1 || item.rank > RANK_COUNT ||
        !MODES.includes(item.mode) || !Number.isInteger(item.bestScore) ||
        item.bestScore < 0 || item.bestScore > 9)
      throw new TypeError("Invalid PhiOperator progress result.");
    const key = item.mode + ":" + item.rank;
    if (seen.has(key)) throw new TypeError("Duplicate PhiOperator result.");
    seen.add(key);
    return { rank: item.rank, mode: item.mode, bestScore: item.bestScore };
  });
  return { format: OPERATOR_FORMAT, version: OPERATOR_VERSION, results };
}

export function parseOperatorPassport(text) {
  if (typeof text !== "string" || text.length > LIMIT)
    throw new TypeError("Passport exceeds the allowed 16 KiB limit.");
  return validateOperatorPassport(JSON.parse(text));
}

export function operatorPassportSummary(passport) {
  if (passport === null) {
    return Object.freeze({ imported: false, nextRank: 1, clearedRank: 0,
      rewards: Object.freeze([]) });
  }
  const p = validateOperatorPassport(passport);
  let clearedRank = 0;
  for (let rank = 1; rank <= RANK_COUNT; rank++) {
    const score = p.results.find((r) => r.rank === rank && r.mode === "standard")?.bestScore;
    if (score === undefined || score < PASS) break;
    clearedRank = rank;
  }
  const rewards = [];
  if (clearedRank >= 2) rewards.push("phisurf-wheel");
  if (clearedRank >= 3) rewards.push("genewrist-pulse");
  return Object.freeze({
    imported: true,
    nextRank: Math.min(clearedRank + 1, RANK_COUNT),
    clearedRank,
    rewards: Object.freeze(rewards),
  });
}

export function createOperatorPassportBridge({ storage = null } = {}) {
  let current = null, persisted = false, disposed = false;
  const listeners = new Set();
  try {
    const stored = storage?.getItem?.(OPERATOR_PASSPORT_KEY);
    if (stored) {
      current = parseOperatorPassport(stored);
      persisted = true;
    }
  } catch { /* corrupt or blocked storage: harmless session fallback */ }
  const snapshot = () => operatorPassportSummary(current);
  const notify = () => {
    const s = snapshot();
    for (const listener of [...listeners]) {
      try { listener(s); } catch { /* observer isolation */ }
    }
  };
  const assertLive = () => { if (disposed) throw Error("Operator bridge disposed."); };
  return Object.freeze({
    snapshot,
    hasReward(id) { return snapshot().rewards.includes(id); },
    subscribe(fn) {
      assertLive();
      if (typeof fn !== "function") throw TypeError("Listener required.");
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    import(text) {
      assertLive();
      const validated = parseOperatorPassport(text);
      current = validated;
      try {
        storage?.setItem?.(OPERATOR_PASSPORT_KEY, JSON.stringify(validated));
        persisted = Boolean(storage?.setItem);
      } catch { persisted = false; }
      notify();
      return { ...snapshot(), persisted };
    },
    export() {
      assertLive();
      return current ? JSON.stringify(current, null, 2) : null;
    },
    clear() {
      assertLive();
      current = null;
      persisted = false;
      try { storage?.removeItem?.(OPERATOR_PASSPORT_KEY); } catch {}
      notify();
    },
    dispose() { disposed = true; listeners.clear(); },
  });
}
