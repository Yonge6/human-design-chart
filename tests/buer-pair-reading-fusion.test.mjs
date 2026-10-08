import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readingSections,PAIR_SECTIONS,LEGACY_PAIR_SECTIONS,pairManualPrompt} from '../src/services/buer-pair-manual.js';
import {stampGuide} from '../src/services/buer-pair-guidance.js';
test('saved legacy guides retain original category meanings without mutating their prose',()=>{
 const old=Object.fromEntries(LEGACY_PAIR_SECTIONS.map(([key,zh])=>[key,zh+' 原文']));const before=JSON.stringify(old);
 assert.equal(readingSections(old),LEGACY_PAIR_SECTIONS);assert.equal(readingSections(old).find(s=>s[0]==='friction')[1],'互补与摩擦');
 assert.equal(readingSections(stampGuide(old)),PAIR_SECTIONS);assert.equal(readingSections(null),PAIR_SECTIONS);assert.equal(JSON.stringify(old),before);
});
test('personal prose leads saved guides; generic cards are only the no-reading fallback',async()=>{
 const js=await readFile(new URL('../src/app/buer-relationships.js',import.meta.url),'utf8');
 assert.ok(js.indexOf('pair-personal-reading')<js.indexOf('const card=(item)'));
 assert.ok(js.includes("if(!saved?.sections?.[selected])pane.append(card(foundation))"));
 assert.ok(!js.includes('阅读保留的旧版解读'));
 assert.match(pairManualPrompt(),/连贯可读/);
});
