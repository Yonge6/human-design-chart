import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist-api");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const directory of ["api", "src", "shared", "schemas", "vendor"]) {
  await cp(resolve(root, directory), resolve(output, directory), { recursive: true });
}
for (const file of ["LICENSE", "THIRD_PARTY_NOTICES.md", "README.md", "package-lock.json"]) {
  await cp(resolve(root, file), resolve(output, file));
}
await mkdir(resolve(output, "supabase/functions/_shared"), { recursive: true });
for (const contract of ["human-design-profile-contract.js", "product-event-contract.js"]) {
  await cp(resolve(root, "supabase/functions/_shared", contract), resolve(output, "supabase/functions/_shared", contract));
}
const sourcePackage = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
await writeFile(resolve(output, "package.json"), `${JSON.stringify({
  name: sourcePackage.name,
  version: sourcePackage.version,
  license: sourcePackage.license,
  private: true,
  type: "module",
  scripts: { start: "node api/server.mjs" },
}, null, 2)}\n`);
console.log(`Built API production package in ${output}`);
