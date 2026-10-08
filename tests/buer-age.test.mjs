import test from 'node:test';
import assert from 'node:assert/strict';
import { ageContext } from '../src/services/buer-age.js';
import { anonymousPerson } from '../src/services/buer-relationships.js';
import { loadRelationshipContext } from '../api/relationship-context.mjs';
import { validateConversation } from '../api/chat.mjs';
const at = date => new Date(`${date}T04:00:00Z`);
test('age tracks birthdays, newborn days and leap birthdays without leaking full birth data',()=>{
  assert.equal(ageContext('2018-10-09',at('2026-10-08')).ageYears,7);
  assert.equal(ageContext('2018-10-08',at('2026-10-08')).ageYears,8);
  assert.equal(ageContext('2018-10-07',at('2026-10-08')).ageYears,8);
  assert.equal(ageContext('2024-02-29',at('2025-02-28')).ageYears,0);
  assert.equal(ageContext('2024-02-29',at('2025-03-01')).ageYears,1);
  assert.equal(ageContext('2026-10-07',at('2026-10-08')).ageDays,1);
  assert.equal(ageContext('2026-03-09',at('2026-10-08')).ageMonths,6);
  assert.equal(ageContext('2018-10-09',new Date('2026-10-08T16:00:00Z')).ageYears,8);
  for(const date of ['',null,'2026-02-30','2026-10-09','not-date'])assert.equal(ageContext(date,at('2026-10-08')),null);
  const person=anonymousPerson({birth:{date:'2018-10-09',certainty:'unknown',location:'private place'},notes:'private'},at('2026-10-08'));
  assert.equal(person.age.ageYears,7);assert.equal(person.age.birthYear,2018);
  assert.equal(person.chart,null);assert.ok(!JSON.stringify(person).includes('2018-10-09'));
  assert.ok(!JSON.stringify(person).includes('private'));
});
test('owned relationship context carries server-derived age into the model prompt',async()=>{
  const owner='00000000-0000-4000-a000-000000000001',id='00000000-0000-4000-a000-000000000002';
  const scopes={chart:false,growth:false,journal:false,history:false};
  const context=await loadRelationshipContext({version:2,personId:id,personRevision:1,contextRevision:0,scopes},'Bearer test',{
    environment:{BUER_ACCOUNT_URL:'https://example.test',BUER_ACCOUNT_PUBLISHABLE_KEY:'public'},
    fetchImpl:async url=>Response.json(url.endsWith('/auth/v1/user')?{id:owner}:url.includes('buer_people')?[{id,user_id:owner,revision:1,is_self:false,birth:{date:'2018-10-09'},relationship:'子女'}]:[])
  });
  assert.equal(context.other.age.birthYear,2018);
  const messages=validateConversation({mode:'relationship',messages:[{role:'user',content:'她多大？'}]},context);
  assert.match(messages[0].content,/不得重复询问/);
  assert.match(messages[1].content,/"ageYears":/);
});
