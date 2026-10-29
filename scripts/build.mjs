import { rm, mkdir, cp, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("public", "dist", { recursive: true });
await cp("src", "dist/src", { recursive: true });
const html = await readFile("dist/index.html", "utf8");
if (!html.includes("./src/main.js")) throw Error("Demo entry not found");
async function list(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? list(dir + "/" + e.name) : dir + "/" + e.name,
      ),
    )
  ).flat();
}
const files = (await list("dist")).filter((p) => !p.endsWith("/sw.js")).sort();
const hash = createHash("sha256");
for (const file of files) {
  hash.update(file);
  hash.update(await readFile(file));
}
const version = hash.digest("hex").slice(0, 16);
await writeFile(
  "dist/index.html",
  html.replace(
    "</head>",
    '  <meta name="genewrist-build" content="' + version + '"/>\n</head>',
  ),
);
const serviceWorker = (await readFile("public/sw.js", "utf8"))
  .replace("__SHELL_VERSION__", version)
  .replace(
    "__SHELL_FILES__",
    JSON.stringify(files.map((p) => "./" + p.slice(5))),
  );
await writeFile("dist/sw.js", serviceWorker);
console.log(
  "Built static GenEWrist " +
    version +
    " (" +
    files.length +
    " offline shell assets)",
);
