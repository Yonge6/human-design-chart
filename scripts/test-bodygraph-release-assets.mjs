import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const expected='92552e280efafd3167150c1230c588d430a49c00f361887093a4f8abc5ca870d';
for (const directory of ['assets','dist/assets']) {
 const svg=await readFile(resolve(root,directory,'bodygraph-template.svg'));
 assert.equal(createHash('sha256').update(svg).digest('hex'),expected,'H5 retains exact historical SVG');
}
async function files(directory) {
 const list=await readdir(directory,{withFileTypes:true});
 return (await Promise.all(list.map(e=>e.isDirectory()?files(resolve(directory,e.name)):[resolve(directory,e.name)]))).flat();
}
for (const directory of ['dist-native','ios/App/App/public']) {
 const paths=await files(resolve(root,directory));
 assert.ok(!paths.some(p=>/bodygraph.*\.svg$|src\/visualization\//.test(p)),`${directory}: no graph assets or geometry`);
 for (const p of paths.filter(p=>/\.(?:js|html|css|json)$/.test(p))) {
  assert.doesNotMatch(await readFile(p,'utf8'),/bodygraph-(?:original-)?template\.svg/,`${directory}: no graph template references`);
 }
 const renderer=await readFile(resolve(root,directory,'src/renderer/bodygraph-renderer.js'),'utf8');
 assert.doesNotMatch(renderer,/fetch\(|innerHTML|data-gate|data-channel/);
}
const h5Assets=await readdir(resolve(root,'dist/assets'));
assert.ok(!h5Assets.includes('bodygraph-original-template.svg'),'H5 excludes alternate graph template');
console.log('H5 exact historical SVG verified; native and synced public contain no BodyGraph assets or active renderer.');
