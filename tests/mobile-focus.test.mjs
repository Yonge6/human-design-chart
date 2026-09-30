import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('mobile conversation input keeps a 16px focus size without disabling zoom',()=>{
 const css=fs.readFileSync(new URL('../buer-companion.css',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(css,/body\[data-conversation="active"\] #buerChatForm textarea\{font-size:16px/);
 assert.doesNotMatch(html,/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:[,"\s])/);
});
