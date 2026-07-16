import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist");
const files = [
  "index.html",
  "style.css",
  "app.js",
  "human-design-engine.js",
  "location-service.js",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
];
const directories = ["assets", "vendor"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

await Promise.all([
  ...files.map((file) => cp(resolve(root, file), resolve(output, file))),
  ...directories.map((directory) => cp(
    resolve(root, directory),
    resolve(output, directory),
    { recursive: true },
  )),
]);

console.log(`Built native web bundle in ${output}`);
