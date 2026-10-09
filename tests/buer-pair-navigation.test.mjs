import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('pair guide keeps metadata in More and exposes concise accessible sticky tabs',async()=>{
 const js=await readFile(new URL('../src/app/buer-relationships.js',import.meta.url),'utf8');
 const css=await readFile(new URL('../buer-journal.css',import.meta.url),'utf8');
 for(const text of ['概览','沟通','决策','节奏','修复','行动'])assert.ok(js.includes(text));
 for(const text of ["role:'tablist'","role:'tab'","role:'tabpanel'","'aria-selected'","'aria-controls'","'aria-labelledby'","ArrowLeft","ArrowRight","Home","End","preventScroll:true","expanded.set(selected"])assert.ok(js.includes(text),text);
 assert.ok(js.includes("more.append(el('summary',l('更多','More'))"));
 assert.ok(js.includes("charts.append(el('summary',l('合盘资料','Chart details'))"));
 assert.ok(js.indexOf('pane.append(connection)') > js.indexOf('pane.append(charts)'));
 assert.ok(!js.includes("button('刷新', 'Refresh'"));
 assert.ok(!js.includes('本机成长档案与账号快照不同。确认属于你后'));
 assert.ok(!js.includes('栏目已重新整理。旧解读仍保留在下方'));
 assert.match(css,/\.pair-manual-tabs\{position:sticky;top:0/);
 assert.ok(!css.includes('.pair-manual-tabs{display:grid;grid-template-columns:1fr 1fr}'));
});
