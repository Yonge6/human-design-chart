import assert from 'node:assert/strict';
import test from 'node:test';
import { createDailyTipPayload, dailyTipIndex, getDailyTip, latestSavedResult } from '../src/app/daily-tip.js';
const data = {Properties: {Type:'Generator', 'Inner Authority':'Sacral', Name:'private-name', Location:'private-place'}, Meta:{BirthIso:'1990-01-01'}};
test('daily tips are bilingual, stable for a calendar day, and rotate at midnight', () => {
 const zh = createDailyTipPayload(data,'zh'), en = createDailyTipPayload(data,'en');
 assert.equal(zh.tips.length,en.tips.length);
 const morning=new Date(2026,8,7,0,1), evening=new Date(2026,8,7,23,59), next=new Date(2026,8,8);
 assert.equal(getDailyTip(zh,morning),getDailyTip(zh,evening));
 assert.notEqual(getDailyTip(zh,morning),getDailyTip(zh,next));
 assert.notEqual(getDailyTip(zh,morning),getDailyTip(en,morning));
 assert.equal(dailyTipIndex(new Date(2026,8,7),8),7);
});
test('widget payload contains only advice and language, with no personal or chart data', () => {
 const payload=createDailyTipPayload(data,'en');
 assert.deepEqual(Object.keys(payload).sort(),['language','tips','version']);
 assert.doesNotMatch(JSON.stringify(payload), /private-name|private-place|1990|BirthIso|Sacral/);
 assert.equal(createDailyTipPayload(null),null);
 assert.equal(createDailyTipPayload({Properties:{Type:'unknown'}}),null);
 assert.equal(getDailyTip(null),null);
});
test('advice responds to type and authority; latest result obeys privacy opt-out', () => {
 const generator=createDailyTipPayload(data);
 const projector=createDailyTipPayload({Properties:{...data.Properties,Type:'Projector'}});
 const emotional=createDailyTipPayload({Properties:{...data.Properties,'Inner Authority':'Emotional - Solar Plexus'}});
 assert.notDeepEqual(generator.tips,projector.tips);
 assert.notDeepEqual(generator.tips,emotional.tips);
 const older={data,createdAt:1},latest={data,createdAt:3};
 assert.equal(latestSavedResult([older,latest]),latest);
 assert.equal(latestSavedResult([latest],false),null);
 assert.equal(latestSavedResult([]),null);
});
