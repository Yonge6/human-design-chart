import { createChatHandler } from "../api/chat.mjs";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..", "dist");
const port = Number(process.env.PORT || 8789);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".se1": "application/octet-stream",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
};

const chat = createChatHandler();
createServer(async (request, response) => {
  try {
    const host = request.headers.host;
    if (request.headers.origin && request.headers.origin !== `http://${host}`) {
      response.writeHead(403); response.end('Origin not allowed'); return;
    }
    if (await chat(request,response)) return;
    const pathname = decodeURIComponent(new URL(request.url || "/", `http://${request.headers.host}`).pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const file = resolve(root, relativePath);
    if (file !== root && !file.startsWith(`${root}${sep}`)) throw new Error("Invalid path");
    const metadata = await stat(file);
    if (!metadata.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": types[extname(file).toLowerCase()] || "application/octet-stream",
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`Serving dist on http://127.0.0.1:${port}\n`);
});
