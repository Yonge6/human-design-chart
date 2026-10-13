import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {relationshipSavedTime,pairReadingVersionsDiffer,checkPairReadingVersions} from '../src/app/buer-relationships.js';
test('pair guide exposes save status and a read-only refresh before accessible sticky tabs',async()=>{
 const js=await readFile(new URL('../src/app/buer-relationships.js',import.meta.url),'utf8');
 const css=await readFile(new URL('../buer-journal.css',import.meta.url),'utf8');
 for(const text of ['概览','沟通','决策','节奏','修复','行动'])assert.ok(js.includes(text));
 for(const text of ["role:'tablist'","role:'tab'","role:'tabpanel'","'aria-selected'","'aria-controls'","'aria-labelledby'","ArrowLeft","ArrowRight","Home","End","preventScroll:true","expanded.set(selected"])assert.ok(js.includes(text),text);
 assert.ok(js.includes("more.append(el('summary',l('更多','More'))"));
 assert.ok(!js.includes("content.append(meta,el('div','',{class:'pair-reading-anchor'"));
 const finalReadingMeta=js.indexOf(")),meta);",js.indexOf("content.append(generateActions,el('small'"));
 assert.ok(finalReadingMeta>js.indexOf("content.append(generateActions,el('small'"),'saved-reading status belongs after the guide content');
 assert.ok(js.includes("class: 'pair-reading-saved-time'"));
 assert.ok(js.includes("button('从账号刷新','Refresh from account',()=>pairManual(person,true),'pair-reading-refresh')"));
 assert.ok(js.includes("saved?'更新解读':'生成分类解读'"));
 assert.ok(js.includes("source?'使用最新档案更新':'使用最新档案生成'"));
 assert.ok(js.includes("charts.append(el('summary',l('更多合盘详细资料','More chart details'))"));
 assert.ok(js.includes('pane.append(connection,charts)'));
 assert.ok(!js.includes("button('刷新', 'Refresh'"));
 assert.ok(!js.includes('本机成长档案与账号快照不同。确认属于你后'));
 assert.ok(!js.includes('栏目已重新整理。旧解读仍保留在下方'));
 assert.match(css,/\.pair-manual-tabs\{position:sticky;top:0/);
 assert.ok(!css.includes('.pair-manual-tabs{display:grid;grid-template-columns:1fr 1fr}'));
});
test('saved-reading timestamps omit unavailable dates instead of showing an invalid date',()=>{
 assert.equal(relationshipSavedTime(undefined), '');
 assert.equal(relationshipSavedTime('invalid-date'), '');
 assert.match(relationshipSavedTime('2026-10-13T12:00:00Z', 'zh'), /2026/);
 assert.match(relationshipSavedTime('2026-10-13T12:00:00Z', 'en'), /2026/);
});
test('pair reading detects saved or source revisions without treating text differences as a new version',()=>{
 const cached={source:{revision:2,updated_at:'2026-10-12T12:00:00Z'},saved:{revision:4,updated_at:'2026-10-12T13:00:00Z',sections:{overview:'Keep reading this'}}};
 assert.equal(pairReadingVersionsDiffer(cached,structuredClone(cached)),false);
 assert.equal(pairReadingVersionsDiffer(cached,{...cached,saved:{...cached.saved,revision:5}}),true);
 assert.equal(pairReadingVersionsDiffer(cached,{...cached,source:{...cached.source,updated_at:'2026-10-13T12:00:00Z'}}),true);
 assert.equal(pairReadingVersionsDiffer(cached,{...cached,saved:null}),true);
 assert.equal(pairReadingVersionsDiffer({source:null,saved:null},{source:null,saved:{revision:1}}),true);
 assert.equal(pairReadingVersionsDiffer(cached,{...cached,saved:{...cached.saved,sections:{overview:'Other text without a new version'}}}),false);
});
test('background pair version checks only read saved account records and do not replace cached content',async()=>{
 const cached={source:{revision:2},saved:{revision:4,sections:{overview:'Current reading'}}},before=structuredClone(cached),calls=[];
 const repository={
  async guideSource(owner){calls.push(['source',owner]);return {revision:3};},
  async pairManual(owner,personId){calls.push(['saved',owner,personId]);return {revision:5,sections:{overview:'New reading'}};},
  async savePairManual(){assert.fail('A version check must never save or generate a reading');},
 };
 assert.equal(await checkPairReadingVersions({repository,owner:'account-A',personId:'person-1',cached,isCurrent:()=>true}),true);
 assert.deepEqual(calls,[['source','account-A'],['saved','account-A','person-1']]);
 assert.deepEqual(cached,before);
});
test('a late background response cannot announce updates after an account or reading changed',async()=>{
 let current=true,resolve;
 const gate=new Promise(done=>{resolve=done;});
 const repository={guideSource:async()=>{await gate;return {revision:2};},pairManual:async()=>{await gate;return {revision:2};}};
 const pending=checkPairReadingVersions({repository,owner:'account-A',personId:'person-1',cached:{source:{revision:1},saved:{revision:1}},isCurrent:()=>current});
 current=false;resolve();
 assert.equal(await pending,false);
 let reads=0;
 assert.equal(await checkPairReadingVersions({repository:{guideSource:()=>{reads++;},pairManual:()=>{reads++;}},owner:'account-A',personId:'person-1',cached:{},isCurrent:()=>false}),false);
 assert.equal(reads,0);
});
