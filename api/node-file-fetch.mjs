import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

let installed = false;

export function installNodeFileFetch() {
  if (installed) return;
  const networkFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const target = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (target.protocol !== "file:") return networkFetch(input, init);
    const body = await readFile(fileURLToPath(target));
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": target.pathname.endsWith(".wasm") ? "application/wasm" : "application/octet-stream",
      },
    });
  };
  installed = true;
}
