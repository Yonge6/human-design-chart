import test from 'node:test';
import assert from 'node:assert/strict';
import {pairComposite,compositeSummaryLines} from '../src/services/buer-pair-composite.js';
import {pairManualPrompt} from '../src/services/buer-pair-manual.js';
import {CHANNELS} from '../src/engine/human-design-engine.js';
import {validateConversation} from '../api/chat.mjs';

const names=['Sun','Earth','North Node','South Node','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
const chart=(gates,compact=false)=>{
 const sides=Object.fromEntries(['design','personality'].map((side,index)=>[side,Object.fromEntries(names.map((name,i)=>[
  compact?name.charAt(0).toLowerCase()+name.slice(1).replaceAll(' ',''):name,
  {[compact?'gate':'Gate']:gates[(i+index*13)%gates.length]},
 ]))]));
 return compact?{activations:sides}:sides;
};
test('pair channel categories are mutually exclusive and preserve who has the complete channel',()=>{
 for(const [mine,theirs,category] of [
  [[1,8],[1,8],'companionship'],[[1],[8],'electromagnetic'],
  [[1,8],[2],'dominanceMe'],[[2],[1,8],'dominanceOther'],
  [[1,8],[1],'compromiseMe'],[[8],[1,8],'compromiseOther'],
 ]){
  const result=pairComposite(chart(mine),chart(theirs,true));
  assert.equal(result.available,true);assert.ok(result[category].includes('1–8'));
  const matches=Object.keys(result).filter(k=>!['combinedCenters','newCenters'].includes(k)&&Array.isArray(result[k])&&result[k].includes('1–8'));
  assert.deepEqual(matches,[category]);
 }
 assert.deepEqual(pairComposite(chart([1]),chart([1])).electromagnetic,[]);
});
test('all 36 channels use canonical endpoints, including reversed gate numbering',()=>{
 for(const [[a,b],centers] of CHANNELS){
  const result=pairComposite(chart([a]),chart([b],true));
  assert.deepEqual(result.electromagnetic,[[a,b].sort((x,y)=>x-y).join('–')]);
  assert.deepEqual(result.combinedCenters,[...centers].sort());
  assert.deepEqual(result.newCenters,result.combinedCenters);
 }
 const result=pairComposite(chart([1,8]),chart([1]));assert.deepEqual(result.newCenters,[]);
});
test('partial or invalid chart data stays unknown, never becomes absence',()=>{
 for(const bad of [null,{},chart([0]),chart([65]),chart([1.5]),{design:{Sun:{Gate:1}},personality:{}}]){
  assert.deepEqual(pairComposite(bad,chart([8])),{available:false});
 }
 const bad=chart([1]);delete bad.personality.Pluto;bad.personality.Imaginary={Gate:8};
 assert.deepEqual(pairComposite(bad,chart([8])),{available:false});
 assert.match(compositeSummaryLines({available:false}).join(''),/不把缺失资料当成没有连接/);
});
test('formats match, source data is untouched, and summary uses Chinese centers',()=>{
 const me=chart([1,8,6]),other=chart([59]),before=JSON.stringify({me,other});
 const result=pairComposite(me,other);
 assert.deepEqual(result,pairComposite(chart([1,8,6],true),chart([59],true)));
 assert.equal(JSON.stringify({me,other}),before);
 assert.match(compositeSummaryLines(result).join('\n'),/情绪/);
 assert.ok(!compositeSummaryLines(result).join('\n').includes('solar'));
 assert.match(compositeSummaryLines(result,'en').join('\n'),/Solar plexus/);
});
test('detailed composite prompt fits chat input limit and preserves relationship boundaries',()=>{
 // A conservative bound: no pair can have more than 36 classified channels.
 const channels=CHANNELS.map(([g])=>g.join('–'));
 const result={available:true,companionship:channels,electromagnetic:[],dominanceMe:[],dominanceOther:[],compromiseMe:[],compromiseOther:[],combinedCenters:['head','ajna','throat','g','heart','sacral','spleen','solar','root'],newCenters:[]};
 for(const language of ['zh','en']){
  const prompt=pairManualPrompt(language,{nickname:'妈妈',relationship:'父母'},result);
  assert.ok(prompt.length<=4000,`prompt length: ${prompt.length}`);
  assert.match(prompt,/明确关系是：母亲/);assert.match(prompt,/550–750/);assert.match(prompt,/不打匹配评分/);assert.match(prompt,/不会改变任何一方/);
  assert.match(prompt,/每段用简短加粗小标题/);assert.ok(prompt.includes(JSON.stringify(result)));
  assert.doesNotThrow(()=>validateConversation({messages:[{role:'user',content:prompt}]}));
 }
});
