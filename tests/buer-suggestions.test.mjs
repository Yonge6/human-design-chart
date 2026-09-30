import test from 'node:test';
import assert from 'node:assert/strict';
import {nextQuestionBatch,questionPool} from '../src/app/buer-suggestions.js';
test('suggestions exhaust the pool before repeating and avoid repeats across cycle boundaries',()=>{
 let state={},seen=[];
 assert.equal(questionPool.length,100);
 assert.equal(new Set(questionPool.map(q=>q.zh)).size,100);
 assert.equal(new Set(questionPool.map(q=>q.en)).size,100);
 for(let i=0;i<17;i++){const next=nextQuestionBatch(state);assert.ok(next.questions.every(q=>!state.last?.includes(q.id)));state=next.state;assert.equal(next.questions.length,6);seen.push(...next.questions.map(q=>q.id));}
 assert.equal(new Set(seen.slice(0,100)).size,questionPool.length);
 const next=nextQuestionBatch(state);assert.ok(next.questions.every(q=>!state.last.includes(q.id)));
 const resumed=nextQuestionBatch(JSON.parse(JSON.stringify(next.state)));assert.ok(resumed.questions.every(q=>!next.state.last.includes(q.id)));
 assert.ok(questionPool.every(q=>q.zh&&q.en));
});
