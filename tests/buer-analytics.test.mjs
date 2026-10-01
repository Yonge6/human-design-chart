import test from 'node:test';
import assert from 'node:assert/strict';
import {usageEvent,CONSENT_KEY} from '../shared/buer-analytics-contract.js';
import {createUsage} from '../src/services/buer-analytics.js';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('contract rejects text, identifiers, unknown keys and unbounded numbers',()=>{
  for(const fields of [{text:'private'},{installationId:'id'},{screen:'private'},{value:Infinity},{value:-1},{value:'10'},{value:121}])assert.equal(usageEvent('active_time',fields),null);
  assert.equal(usageEvent('unknown'),null);assert.equal(usageEvent('visit',{},'other'),null);
  assert.equal(usageEvent('chat_latency',{value:1.235},'ios').parameters.value,1.24);
});
test('off by default, opt out drops waiting events, reconsent does not replay',async()=>{
  const sent=[],store=new Map();const storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
  const usage=createUsage({storage,send:e=>sent.push(e)});usage.start();usage.track('visit');await tick();assert.equal(sent.length,0);
  usage.consent(true);usage.track('chat_request');usage.consent(false);await tick();assert.equal(sent.length,0);
  usage.consent(true);usage.track('chat_success');await tick();assert.equal(sent.length,1);assert.equal(store.get(CONSENT_KEY),'yes');
});
test('active time excludes hidden, suspension and pre-consent time',async()=>{
  const sent=[],usage=createUsage({send:e=>sent.push(e)});usage.sample(0,true);usage.consent(true);usage.sample(100,true);usage.sample(30100,true);usage.sample(60100,false);usage.sample(90100,true);usage.sample(190100,true);await tick();
  assert.deepEqual(sent.map(e=>e.parameters.value),[30]);
});
test('bridge failure fails closed without unhandled rejection or disrupting product',async()=>{
 const sent=[];const usage=createUsage({send:e=>sent.push(e),setNativeConsent:async()=>{throw Error('Unavailable');}});
 usage.consent(true);usage.track('visit');await tick();assert.equal(usage.enabled,false);assert.equal(sent.length,0);
 const sync=createUsage({send:e=>sent.push(e),setNativeConsent:()=>{throw Error('Missing');}});assert.doesNotThrow(()=>sync.start());
});
test('web transport drops opt-out queues and stale async work; ignores sensitive fields',async()=>{
 const raw=await readFile(new URL('../analytics.js',import.meta.url),'utf8');
 // Inject only the module-loader boundary into the VM; execute the actual bootstrap.
 const source=raw.replace("import('./shared/buer-analytics-contract.js')","loadContract()");
 const listeners={},sent=[],frameListeners={};let granted='no';
 const frame={style:{},setAttribute(){},addEventListener:(n,f)=>frameListeners[n]=f,contentWindow:{gtag:(...args)=>sent.push(args)}};
 const window={location:{hostname:'buer.wonderelian.com',protocol:'https:',search:''},addEventListener:(n,f)=>listeners[n]=f};
 const document={currentScript:{src:'https://buer.wonderelian.com/analytics.js'},createElement:()=>frame,body:{appendChild(){}}};
 vm.runInNewContext(source,{window,document,URL,URLSearchParams,localStorage:{getItem:()=>granted},loadContract:async()=>({usageEvent})});
 const emit=fields=>listeners['buer:usage']({detail:fields});const event=usageEvent('chat_request');
 await emit(event);assert.equal(sent.length,0);
 granted='yes';listeners['buer:usage-consent']();await emit(event);
 granted='no';listeners['buer:usage-consent']();frameListeners.load();assert.equal(sent.length,0);
 granted='yes';listeners['buer:usage-consent']();const stale=emit(event);granted='no';listeners['buer:usage-consent']();granted='yes';listeners['buer:usage-consent']();await stale;assert.equal(sent.length,0);
 await emit({...event,parameters:{...event.parameters,text:'PRIVATE'}});assert.equal(sent.length,0);
 await emit(event);assert.equal(sent.length,1);assert.equal(sent[0][1],'buer_v1_chat_request');assert.ok(!JSON.stringify(sent).includes('PRIVATE'));
});
test('native bridge uses Buer identity, production gate, no advertising and matching event names',async()=>{
 const swift=await readFile(new URL('../ios/App/App/BuerAnalyticsPlugin.swift',import.meta.url),'utf8');
 const info=await readFile(new URL('../ios/App/App/Info.plist',import.meta.url),'utf8');
 const config=await readFile(new URL('../ios/App/App/GoogleService-Info.plist',import.meta.url),'utf8');
 assert.match(config,/com\.yonge6\.buerwithin/);assert.match(swift,/transaction.environment == .production/);assert.match(swift,/#if DEBUG \|\| targetEnvironment\(simulator\)/);
 for(const name of ['FIREBASE_ANALYTICS_COLLECTION_ENABLED','GOOGLE_ANALYTICS_IDFV_COLLECTION_ENABLED','FirebaseAutomaticScreenReportingEnabled'])assert.ok(info.includes(`<key>${name}</key><false/>`));
 assert.doesNotMatch(swift,/setUserID|transaction\.id|IDFA/);
});
