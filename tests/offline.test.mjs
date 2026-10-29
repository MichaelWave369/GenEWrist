import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const template = await readFile(
  new URL("../public/sw.js", import.meta.url),
  "utf8",
);
function serviceWorker({ failInstall = false } = {}) {
  const events = {},
    stores = new Map([
      ["unrelated-site-cache", new Map()],
      ["genewrist-shell:/GenEWrist/:old", new Map()],
    ]),
    deleted = [],
    network = [];
  let claimed = 0;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const data = stores.get(name);
      return {
        async addAll(urls) {
          if (failInstall) throw Error("network unavailable");
          for (const url of urls)
            data.set(url, { url, source: "offline-shell" });
        },
        async match(url) {
          return data.get(url);
        },
      };
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      deleted.push(name);
      return stores.delete(name);
    },
  };
  vm.runInNewContext(
    template
      .replace("__SHELL_VERSION__", "new")
      .replace(
        "__SHELL_FILES__",
        JSON.stringify(["./index.html", "./src/main.js", "./style.css"]),
      ),
    {
      URL,
      Set,
      Promise,
      caches,
      fetch: async (request) => {
        network.push(request.url);
        return { source: "network" };
      },
      self: {
        registration: { scope: "https://example.test/GenEWrist/" },
        clients: {
          async claim() {
            claimed++;
          },
        },
        addEventListener: (name, fn) => (events[name] = fn),
      },
    },
  );
  const lifecycle = async (name) => {
    let done;
    events[name]({ waitUntil: (p) => (done = p) });
    await done;
  };
  const request = (url, options = {}) => {
    let response;
    events.fetch({
      request: { url, method: "GET", mode: "cors", ...options },
      respondWith: (p) => (response = p),
    });
    return response;
  };
  return {
    lifecycle,
    request,
    stores,
    deleted,
    network,
    claimed: () => claimed,
  };
}
test("cached same-origin shell reloads offline under the real Pages subpath", async () => {
  const sw = serviceWorker();
  await sw.lifecycle("install");
  await sw.lifecycle("activate");
  const response = await sw.request("https://example.test/GenEWrist/", {
    mode: "navigate",
  });
  assert.equal(response.source, "offline-shell");
  assert.equal(response.url, "https://example.test/GenEWrist/index.html");
  assert.equal(
    (await sw.request("https://example.test/GenEWrist/src/main.js")).source,
    "offline-shell",
  );
  assert.deepEqual(sw.network, []);
});
test("activation removes only obsolete GenEWrist caches within the exact scope", async () => {
  const sw = serviceWorker();
  await sw.lifecycle("install");
  await sw.lifecycle("activate");
  assert.deepEqual(sw.deleted, ["genewrist-shell:/GenEWrist/:old"]);
  assert(sw.stores.has("unrelated-site-cache"));
  assert.equal(sw.claimed(), 1);
});
test("external worlds, arbitrary scripts, saves, requests with queries and writes are never intercepted", async () => {
  const sw = serviceWorker();
  await sw.lifecycle("install");
  for (const [url, options] of [
    ["https://external.test/game.js", {}],
    ["https://example.test/BTM/src/main.js", {}],
    ["https://example.test/GenEWrist/save.json", {}],
    ["https://example.test/GenEWrist/src/main.js?private=1", {}],
    ["https://example.test/GenEWrist/index.html", { method: "POST" }],
  ])
    assert.equal(sw.request(url, options), undefined);
});
test("a failed install discards its partial cache without deleting the previous version", async () => {
  const sw = serviceWorker({ failInstall: true });
  await assert.rejects(sw.lifecycle("install"), /network unavailable/);
  assert(sw.stores.has("genewrist-shell:/GenEWrist/:old"));
  assert(!sw.stores.has("genewrist-shell:/GenEWrist/:new"));
});
test("worker updates wait for existing editors instead of forcing a mixed-version reload", () => {
  assert(!template.includes("skipWaiting("));
  assert(!template.includes("message"));
});
