import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadingCache} from '../src/services/buer-reading-cache.js';
import {readingSegments} from '../src/app/buer-message-format.js';
test('reading cache isolates owners, revisions, expiry, mutations and explicit refresh',()=>{
 let time=0;const c=createReadingCache({ttl:100,now:()=>time});const p={id:'p',revision:1,chart:{chartHash:'a'}};
 c.set('a',p,{saved:{text:'private'}});
 assert.equal(c.get('b',p),null);assert.equal(c.get('a',{...p,revision:2}),null);
 const copy=c.get('a',p);copy.saved.text='changed';assert.equal(c.get('a',p).saved.text,'private');
 time=100;assert.equal(c.get('a',p),null);
 c.set('a',p,{saved:true});c.clear();assert.equal(c.get('a',p),null);
});
test('plain reading labels become bold without altering saved wording or HTML safety',()=>{
 for(const text of ['依据：事实内容。','你自己的节律：先休息。','需要说明：只是建议。','**建议：**先沟通。']){
  const parts=readingSegments(text);assert.equal(parts[0].bold,true);assert.equal(parts.map(x=>x.text).join(''),text.replaceAll('**',''));
 }
 assert.equal(readingSegments('这是一句正常文字，没有小标题。')[0].bold,false);
 assert.equal(readingSegments('<img src=x>')[0].bold,false);
});
