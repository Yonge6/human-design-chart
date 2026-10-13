import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const expected='92552e280efafd3167150c1230c588d430a49c00f361887093a4f8abc5ca870d';
for (const directory of ['assets','dist/assets','dist-native/assets','ios/App/App/public/assets']) {
 const svg=await readFile(resolve(root,directory,'bodygraph-template.svg'));
 assert.equal(createHash('sha256').update(svg).digest('hex'),expected,`${directory}: chart geometry remains unchanged`);
}
async function files(directory) {
 const list=await readdir(directory,{withFileTypes:true});
 return (await Promise.all(list.map(e=>e.isDirectory()?files(resolve(directory,e.name)):[resolve(directory,e.name)]))).flat();
}
for (const directory of ['dist-native','ios/App/App/public']) {
 const paths=await files(resolve(root,directory));
 assert.ok(!paths.some(p=>/bodygraph-original-template\.svg$|src\/visualization\//.test(p)),`${directory}: no alternate graph assets or geometry`);
 const renderer=await readFile(resolve(root,directory,'src/renderer/bodygraph-renderer.js'),'utf8');
 assert.match(renderer,/fetch\(templateUrl\)/,`${directory}: active renderer loads the chart`);
 const html=await readFile(resolve(root,directory,'index.html'),'utf8');
 assert.match(html,/vendor\/html2canvas\/html2canvas\.min\.js/,`${directory}: poster renderer library is packaged`);
 const app=await readFile(resolve(root,directory,'app.js'),'utf8');
 assert.match(app,/templateUrl: "\.\/assets\/bodygraph-template\.svg/,`${directory}: main manual uses the packaged chart`);
 const relationship=await readFile(resolve(root,directory,'src/app/buer-relationships.js'),'utf8');
 assert.match(relationship,/assets\/bodygraph-template\.svg/,`${directory}: relationship manuals share the same chart resource`);
}
const h5Assets=await readdir(resolve(root,'dist/assets'));
assert.ok(!h5Assets.includes('bodygraph-original-template.svg'),'H5 excludes alternate graph template');
console.log('H5, native and synced public share the unchanged chart geometry, active renderer and poster resources.');
