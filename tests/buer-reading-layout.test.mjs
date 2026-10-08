import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readingParagraphs} from '../src/app/buer-message-format.js';
test('saved readings split into paragraphs at inline headings without losing words',()=>{
 const text='**依据：**这是资料。 **建议：**先沟通。\n\n**边界：**保留空间。';
 const result=readingParagraphs(text);assert.equal(result.length,3);
 assert.equal(result[0],'**依据：**这是资料。');assert.equal(result[1],'**建议：**先沟通。');
 assert.equal(result.join('').replace(/\s/g,''),text.replace(/\s/g,''));
});
test('long readings split at sentence boundaries, preserving punctuation and plain HTML text',()=>{
 const text='这是一段用于检查阅读排版的文字。'.repeat(30)+'<img src=x onerror=alert(1)>';
 const result=readingParagraphs(text);assert.ok(result.length>1);assert.equal(result.join(''),text);
});
test('home preview is static and its dependency-free timer does not fabricate percentages',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const boot=readFileSync(new URL('../src/app/buer-home-loading.js',import.meta.url),'utf8');
 assert.match(html,/data-home-pending/);assert.match(html,/id="homeBootPreview"/);assert.doesNotMatch(boot,/import |\d+%/);
});
