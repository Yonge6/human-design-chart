import test from 'node:test';
import assert from 'node:assert/strict';
import { orderedPeople, movePerson, relationshipGuidePrompt } from '../src/services/buer-people-tools.js';
test('ordering preserves saved order, appends new people, excludes self and deleted',()=>{
 const rows=[{id:'a'},{id:'b'},{id:'self',is_self:true},{id:'old',deleted_at:'today'},{id:'c'}];
 assert.deepEqual(orderedPeople(rows,['b','missing','b','a']).map(x=>x.id),['b','a','c']);
 assert.deepEqual(movePerson(['a','b','c'],'c',0),['c','a','b']);
 assert.deepEqual(movePerson(['a','b','c'],'a',2),['b','c','a']);
 assert.deepEqual(movePerson(['a','b'],'missing',0),['a','b']);
 assert.deepEqual(movePerson(['a','b'],'b',-1),['b','a']);
});
test('guide asks for concrete advice, follows existing context and does not invent a score',()=>{
 assert.match(relationshipGuidePrompt('zh'),/相处指南/);
 assert.match(relationshipGuidePrompt('zh'),/年龄/);
 assert.match(relationshipGuidePrompt('zh'),/不.*评分/);
 assert.match(relationshipGuidePrompt('en'),/communication/i);
});
