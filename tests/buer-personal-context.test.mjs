import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanPersonalContext, selectPersonalContext, rankExcerpts, SCOPE_KEYS } from '../src/services/buer-personal-context.js';
test('journal lives in Me and product copy does not expose a model brand',()=>{
 const journal=readFileSync(new URL('../src/app/buer-journal.js',import.meta.url),'utf8');assert.doesNotMatch(journal,/homeEntry|home\?\.append/);assert.match(journal,/navEntry\('journal'/);
 for(const f of ['buer-home','buer-growth','buer-membership','buer-relationships'])assert.doesNotMatch(readFileSync(new URL(`../src/app/${f}.js`,import.meta.url),'utf8'),/DeepSeek/i);
});
test('personal context requires explicit scopes and strips unsupported properties',()=>{
 const x=cleanPersonalContext({chart:{Type:'Generator',Name:'secret'},scopes:{chart:true},answers:[],stories:[],actions:[],chats:[]});
 assert.deepEqual(x.chart,{Type:'Generator'});assert.equal(x.scopes.journal,false);
 assert.equal(SCOPE_KEYS.length,4);
 assert.throws(()=>cleanPersonalContext({stories:[{body:42}]}),/INVALID/);
});
test('retrieval respects disabled scopes, ranks relevance and bounds output',()=>{
 const v=cleanPersonalContext({scopes:{chart:true,growth:true,history:false},chart:{Type:'Generator'},stories:[{id:'a',title:'休息',body:'周末散步'},{id:'b',title:'合作分工',body:'我们讨论分工'}],chats:[{id:'c',body:'private chat'}]});
 const ctx=selectPersonalContext(v,'合作分工',{chart:false,growth:true,journal:true,history:true});
 assert.equal(ctx.chart,null);assert.equal(ctx.excerpts[0].title,'合作分工');assert.equal(JSON.stringify(ctx).includes('private chat'),false);
 const ranked=rankExcerpts(Array.from({length:1000},(_,i)=>({id:String(i),title:'工作',body:'工作'.repeat(5000)})),'工作',3,1800);
 assert.equal(ranked.length,3);assert.ok(JSON.stringify(ranked).length<7000);
});
