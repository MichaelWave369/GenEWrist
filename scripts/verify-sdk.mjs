import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const project = JSON.parse(await readFile("package.json", "utf8")),
  archive = resolve("sdk-dist/genewrist-" + project.version + ".tgz"),
  folder = await mkdtemp(join(tmpdir(), "genewrist-sdk-"));
try {
  execFileSync("tar", ["-xzf", archive, "-C", folder]);
  const root = join(folder, "package"),
    manifest = JSON.parse(
      await readFile(join(root, "SDK-MANIFEST.json"), "utf8"),
    ),
    pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  assert.equal(pkg.version, project.version);
  assert.equal(pkg.private, true);
  assert.equal(manifest.worldAdapterAPI, 1);
  for (const [path, digest] of Object.entries(manifest.files)) {
    assert(!path.includes(".."));
    assert.equal(
      createHash("sha256")
        .update(await readFile(join(root, path)))
        .digest("hex"),
      digest,
    );
  }
  const { createWrist } = await import(
      pathToFileURL(join(root, "src/core.js")).href
    ),
    { makeBTMWorldAdapter } = await import(
      pathToFileURL(join(root, "src/adapters/btm.js")).href
    );
  const wrist = createWrist();
  wrist.connectWorld(
    makeBTMWorldAdapter({ readSnapshot: () => ({ health: 86 }) }),
  );
  assert.equal(wrist.readHostStatus().health, 86);
  wrist.home();
  wrist.dispose();
  const sum = await readFile("sdk-dist/SHA256SUMS", "utf8");
  assert(
    sum.startsWith(
      createHash("sha256")
        .update(await readFile(archive))
        .digest("hex"),
    ),
  );
  console.log(
    "SDK archive verified: " +
      Object.keys(manifest.files).length +
      " source hashes; packaged core/BTM imports work; version " +
      pkg.version,
  );
} finally {
  await rm(folder, { recursive: true, force: true });
}
