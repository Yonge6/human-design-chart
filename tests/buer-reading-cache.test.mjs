import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadingCache} from '../src/services/buer-reading-cache.js';
import {readingSegments} from '../src/app/buer-message-format.js';
import {pairManualPrompt,pairManualRoleWarning,pairRelationshipRole} from '../src/services/buer-pair-manual.js';
const deviceStorage=()=>{const values=new Map();return{get length(){return values.size},key:i=>[...values.keys()][i],getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}};
test('device cache survives recreation and arbitrary elapsed time, clears only its own namespace',()=>{
 const storage=deviceStorage(),p={id:'p',revision:1};storage.setItem('unrelated','keep');
 createReadingCache({storage,now:()=>1}).set('owner',p,{saved:{text:'reading'}});
 const afterReload=createReadingCache({storage,now:()=>9999999999999});
 assert.equal(afterReload.get('owner',p).saved.text,'reading');assert.equal(afterReload.get('another',p),null);
 afterReload.clear();assert.equal(createReadingCache({storage}).get('owner',p),null);assert.equal(storage.getItem('unrelated'),'keep');
});
test('blocked storage and malformed cache do not prevent reading',()=>{
 const storage={getItem(){throw Error('blocked')},setItem(){throw Error('full')},get length(){throw Error('blocked')}};
 const c=createReadingCache({storage}),p={id:'p',revision:1};assert.equal(c.get('o',p),null);c.set('o',p,{saved:true});assert.equal(c.get('o',p).saved,true);c.clear();
});
test('explicit parent identity is supplied without guessing from a broad category',()=>{
 const mother={nickname:'妈妈',relationship:'父母'};
 assert.equal(pairRelationshipRole(mother),'母亲');assert.match(pairManualPrompt('zh',mother),/明确关系是：母亲/);
 assert.equal(pairRelationshipRole({nickname:'小明',relationship:'父母'}),null);
 assert.match(pairManualPrompt('zh',{}),/不得从/);
 assert.equal(pairManualRoleWarning(mother,{overview:'你父亲的图谱'}),'母亲');
 assert.equal(pairManualRoleWarning(mother,{overview:'你母亲的图谱'}),null);
});
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
