import { readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";
const worker = await readFile("dist/sw.js", "utf8"),
  html = await readFile("dist/index.html", "utf8");
assert(!worker.includes("__SHELL_"), "Unexpanded offline shell template");
const version = worker.match(/const VERSION='([a-f0-9]{16})'/)?.[1];
assert(version, "Missing content hash");
assert(
  html.includes('content="' + version + '"'),
  "HTML/shell versions disagree",
);
const files = JSON.parse(worker.match(/const FILES=(\[[^;]+\]);/)[1]);
for (const path of files) {
  assert(
    path.startsWith("./") && !path.includes("..") && !path.includes("://"),
    "Only bundled paths may be cached",
  );
  await stat("dist/" + path.slice(2));
}
for (const required of [
  "./index.html",
  "./style.css",
  "./src/main.js",
  "./src/world-adapter.js",
  "./src/content.js",
  "./src/xr.js",
])
  assert(files.includes(required), "Offline shell missing " + required);
assert(
  !files.some((path) => /save|\.env|token|node_modules|tests\//.test(path)),
  "Private or development file in shell",
);
console.log(
  "Offline build OK: " +
    files.length +
    " allowlisted shell assets; content version " +
    version,
);
