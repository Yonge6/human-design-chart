import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHumanDesign } from '../human-design-engine.js';
import { createHumanDesignProfileSnapshot } from '../src/engine/profile-snapshot.js';
import { personManualData } from '../src/services/buer-person-manual.js';
import { installNodeFileFetch } from '../api/node-file-fetch.mjs';
installNodeFileFetch();
test('person manual reproduces their saved chart without mutating it, including repeated DST time',async()=>{
 for(const [timezone,date,time,which] of [['Asia/Shanghai','1990-01-01','12:00','earlier'],['America/New_York','1990-10-28','01:30','later']]){
  const [year,month,day]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
  const result=await calculateHumanDesign({name:'Test person',location:'Test city',year,month,day,hour,minute,timezone,timeDisambiguation:which});
  const chart=await createHumanDesignProfileSnapshot({input:{birthDate:date,birthTime:time,timezone,locationLabel:'Test city'},result});
  const person={nickname:'Test person',chart},before=JSON.stringify(person);
  const manual=await personManualData(person);
  assert.equal(manual.Meta.BirthIso,result.Meta.BirthIso);assert.deepEqual(manual.Properties,result.Properties);
  assert.equal(JSON.stringify(person),before);
 }
 await assert.rejects(personManualData({chart:null}),/INVALID_CHART/);
});
