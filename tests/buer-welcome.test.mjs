import test from 'node:test';
import assert from 'node:assert/strict';
import {WELCOME_LINES,pickWelcome,welcomeForVisit} from '../src/app/buer-welcome.js';
test('100 unique bilingual openings',()=>{
 assert.equal(WELCOME_LINES.length,100);
 for(const lang of ['zh','en']){assert.equal(new Set(WELCOME_LINES.map(x=>x[lang])).size,100);assert.ok(WELCOME_LINES.every(x=>x[lang].length>0));}
});
test('every previous opening is excluded from the next draw',()=>{
 for(let previous=0;previous<100;previous++)for(let i=0;i<100;i++){const index=pickWelcome(previous,()=>i/100);assert.notEqual(index,previous);assert.ok(WELCOME_LINES[index]);}
});
test('visit persists only its index and tolerates unavailable storage',()=>{
 let saved=null;const storage={getItem:()=>saved,setItem:(_,v)=>saved=v};
 const first=welcomeForVisit(storage,()=>0),second=welcomeForVisit(storage,()=>0);
 assert.notEqual(first,second);
 assert.ok(welcomeForVisit({getItem(){throw Error();},setItem(){throw Error();}}));
});
