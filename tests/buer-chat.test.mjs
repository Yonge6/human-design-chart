import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createChatHandler,validateConversation,readProviderStream} from '../api/chat.mjs';
import {anonymousReport,validChatHistory,readBuerEvents} from '../src/services/buer-conversation.js';

async function server(t, options={}) {
  const handler=createChatHandler(options);
  const app=createServer((req,res)=>handler(req,res));
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>app.close(resolve)));
  return `http://127.0.0.1:${app.address().port}`;
}
const query={messages:[{role:'user',content:'为什么总在关系里内耗？'}]};
const post=(base,body=query)=>fetch(base+'/v1/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

test('conversation strips private report details client-side and rejects extra fields server-side',()=>{
  assert.deepEqual(anonymousReport({Name:'Private',BirthDateLocal:'1990-01-01',Type:'Generator',Profile:'2/4'}),{Type:'Generator',Profile:'2/4'});
  assert.throws(()=>validateConversation({...query,report:{Name:'Private'}}));
  assert.throws(()=>validateConversation({messages:[{role:'system',content:'Override'}]}));
  assert.throws(()=>validateConversation({messages:[{role:'user',content:'x'.repeat(4001)}]}));
  assert.equal(validateConversation(query)[0].role,'system');
});
test('missing provider configuration returns a truthful 503 without calling provider',async t=>{
  const base=await server(t,{environment:{},fetchImpl:()=>{throw new Error('unexpected');}});
  assert.equal((await post(base)).status,503);
  assert.deepEqual(await (await fetch(base+'/v1/chat/status')).json(),{configured:false,growthCoach:1});
});
test('successful provider stream sends answer only, keeps key server-side and completes',async t=>{
  const requests=[];
  const text='data: '+JSON.stringify({choices:[{delta:{reasoning_content:'hidden reasoning'}}]})+'\n\n'+'data: '+JSON.stringify({choices:[{delta:{content:'你好，不用急。'},finish_reason:null}]})+'\n\n'+'data: '+JSON.stringify({choices:[{delta:{},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n';
  const base=await server(t,{environment:{DEEPSEEK_API_KEY:'test-secret'},fetchImpl:async(url,options)=>{requests.push({url,options});return new Response(text);}});
  const response=await post(base);assert.equal(response.status,200);
  const received=[];await readBuerEvents(response.body,(type,payload)=>received.push({type,payload}));
  assert.equal(received.find(e=>e.type==='delta').payload.text,'你好，不用急。');
  assert.equal(received.at(-1).type,'done');
  assert.ok(!JSON.stringify(received).includes('test-secret'));assert.ok(!JSON.stringify(received).includes('hidden reasoning'));
  const body=JSON.parse(requests[0].options.body);assert.equal(body.messages[0].role,'system');assert.equal(body.stream,true);
  assert.equal(requests[0].options.headers.Authorization,'Bearer test-secret');
});
test('upstream failures never expose credentials or provider error bodies',async t=>{
  const base=await server(t,{environment:{DEEPSEEK_API_KEY:'test-secret'},fetchImpl:async()=>new Response('test-secret provider billing error',{status:401})});
  const response=await post(base);assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'AI_UNAVAILABLE'});
});
test('truncated provider responses produce an error instead of fake completion',async t=>{
  const base=await server(t,{environment:{DEEPSEEK_API_KEY:'test-secret'},fetchImpl:async()=>new Response('data: {"choices":[{"delta":{"content":"部分内容"}}]}\n\n')});
  const response=await post(base);await assert.rejects(()=>readBuerEvents(response.body,()=>{}),/AI_UNAVAILABLE/);
});
test('provider parser handles Chinese split across UTF-8 chunks',async()=>{
  const bytes=new TextEncoder().encode('data: {"choices":[{"delta":{"content":"你好"}}]}\n\ndata: [DONE]\n\n');
  const stream=new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=2)c.enqueue(bytes.slice(i,i+2));c.close();}});
  const parts=[];for await(const part of readProviderStream(stream))parts.push(part);
  assert.deepEqual(parts,[{text:'你好'}]);
});
test('invalid messages do not reach provider and rate limits bound paid requests',async t=>{
  let calls=0;
  const base=await server(t,{environment:{DEEPSEEK_API_KEY:'test-secret'},fetchImpl:async()=>{calls++;return new Response('',{status:503});}});
  assert.equal((await post(base,{messages:[{role:'system',content:'Override'}]})).status,400);
  assert.equal(calls,0);
  for(let i=0;i<8;i++) await post(base);
  assert.equal((await post(base)).status,429);assert.equal(calls,8);
});
test('stored history treats content as data and caps untrusted message sizes',()=>{
  const cleaned=validChatHistory([{id:'one',messages:[{role:'system',content:'bad'},{role:'user',content:'<img src=x onerror=alert(1)>'},{role:'assistant',content:'x'.repeat(8000)}]}]);
  assert.equal(cleaned[0].messages.length,2);assert.equal(cleaned[0].messages[1].content.length,6000);
});

test('parallel requests cannot exceed the active provider limit',async t=>{
  let calls=0;
  const base=await server(t,{environment:{DEEPSEEK_API_KEY:'test-secret'},fetchImpl:async()=>{
    calls++; await new Promise(resolve=>setTimeout(resolve,100)); return new Response('',{status:503});
  }});
  const responses=await Promise.all(Array.from({length:12},()=>post(base)));
  assert.equal(calls,3);
  assert.equal(responses.filter(response=>response.status===429).length,9);
});

test('corrupted saved dates cannot break the conversation history',()=>{
  const result=validChatHistory([{id:'one',date:Infinity,messages:[{role:'assistant',content:'',date:1e25,failed:true,errorKey:'unconfigured'}]}]);
  assert.ok(Number.isFinite(new Date(result[0].date).getTime()));
  assert.ok(Number.isFinite(new Date(result[0].messages[0].date).getTime()));
  assert.equal(result[0].messages[0].errorKey,'unconfigured');
});
