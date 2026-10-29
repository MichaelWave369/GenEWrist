import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
const root = process.cwd(),
  port = Number(process.env.PORT) || 4173,
  built = process.env.SERVE_DIST === "1";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};
http
  .createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, "http://localhost").pathname.replace(
        /^\/GenEWrist(?=\/)/,
        "",
      );
      const route = built
        ? "dist/" + (pathname === "/" ? "index.html" : pathname.slice(1))
        : pathname === "/"
          ? "public/index.html"
          : pathname.startsWith("/src/")
            ? pathname.slice(1)
            : "public/" + pathname.slice(1);
      const filename = resolve(root, route);
      if (!filename.startsWith(root + sep)) throw Error("Traversal");
      const data = await readFile(filename);
      res.writeHead(200, {
        "Content-Type": MIME[extname(filename)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, () => console.log("GenEWrist demo: http://localhost:" + port));
