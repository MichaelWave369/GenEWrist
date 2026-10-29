import { mkdir, readFile, readdir, cp, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const pkg = JSON.parse(await readFile("package.json", "utf8")),
  root = "sdk-dist/package";
await rm("sdk-dist", { recursive: true, force: true });
await mkdir(root, { recursive: true });
await cp("src", root + "/src", { recursive: true });
await cp("LICENSE", root + "/LICENSE");
await writeFile(
  root + "/package.json",
  JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      type: "module",
      license: "MIT",
      private: true,
      exports: {
        "./core": "./src/core.js",
        "./world-adapter": "./src/world-adapter.js",
        "./presentation": "./src/presentation.js",
        "./xr-surface": "./src/xr-surface.js",
        "./btm": "./src/adapters/btm.js",
      },
    },
    null,
    2,
  ),
);
const files = {};
for (const entry of await readdir(root + "/src", { recursive: true })) {
  const name = String(entry);
  if (!/\.(js|ts)$/.test(name)) continue;
  files["src/" + name] = createHash("sha256")
    .update(await readFile(root + "/src/" + name))
    .digest("hex");
}
let revision = "uncommitted";
try {
  revision = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
} catch {}
await writeFile(
  root + "/SDK-MANIFEST.json",
  JSON.stringify(
    {
      version: pkg.version,
      worldAdapterAPI: 1,
      sourceRevision: revision,
      note: "File hashes identify the exact packaged candidate, including any working-tree changes.",
      files,
    },
    null,
    2,
  ),
);
execFileSync("tar", [
  "-czf",
  "sdk-dist/genewrist-" + pkg.version + ".tgz",
  "-C",
  "sdk-dist",
  "package",
]);
const digest = createHash("sha256")
  .update(await readFile("sdk-dist/genewrist-" + pkg.version + ".tgz"))
  .digest("hex");
await writeFile(
  "sdk-dist/SHA256SUMS",
  digest + "  genewrist-" + pkg.version + ".tgz\n",
);
console.log(
  "Packaged private SDK " +
    pkg.version +
    " with " +
    Object.keys(files).length +
    " hashed source files. No npm publication.",
);
