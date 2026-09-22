import test from 'node:test';
import assert from 'node:assert/strict';
import {nextQuestionBatch,questionPool} from '../src/app/buer-suggestions.js';
test('suggestions exhaust the pool before repeating and avoid repeats across cycle boundaries',()=>{
 let state={},seen=[];
 for(let i=0;i<4;i++){const next=nextQuestionBatch(state);state=next.state;assert.equal(next.questions.length,6);seen.push(...next.questions.map(q=>q.id));}
 assert.equal(new Set(seen).size,questionPool.length);
 const next=nextQuestionBatch(state);assert.ok(next.questions.every(q=>!state.last.includes(q.id)));
 const resumed=nextQuestionBatch(JSON.parse(JSON.stringify(next.state)));assert.ok(resumed.questions.every(q=>!next.state.last.includes(q.id)));
 assert.ok(questionPool.every(q=>q.zh&&q.en));
});
