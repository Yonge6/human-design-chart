import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('mobile conversation input keeps a 16px focus size without disabling zoom',()=>{
 const css=fs.readFileSync(new URL('../buer-companion.css',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(css,/body\[data-conversation="active"\] #buerChatForm textarea\{font-size:16px/);
 assert.doesNotMatch(html,/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:[,"\s])/);
});
test('mobile navigation reserves header space and tracks the visible viewport',()=>{
 const css=fs.readFileSync(new URL('../buer-companion.css',import.meta.url),'utf8');
 const js=fs.readFileSync(new URL('../src/app/buer-home.js',import.meta.url),'utf8');
 assert.match(css,/body\{padding-top:72px\}/);
 assert.match(css,/\.topbar\{position:fixed;top:var\(--buer-viewport-top,0px\)/);
 assert.match(css,/\.buer-rail\{position:fixed;inset:auto 0 var\(--buer-viewport-bottom,0px\)/);
 assert.match(js,/visualViewport\?\.addEventListener\('resize',syncNavigationViewport/);
 assert.match(js,/Math\.abs\(viewport\.scale-1\)<0\.01/);
});
