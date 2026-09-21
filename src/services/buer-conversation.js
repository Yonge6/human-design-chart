export async function readBuerEvents(stream, onEvent) {
  const reader=stream.getReader();const decoder=new TextDecoder();let pending='';let done=false;
  try {
    while(true) {
      const item=await reader.read(); if(item.done)break;
      pending+=decoder.decode(item.value,{stream:true});
      let boundary;
      while((boundary=pending.indexOf('\n\n'))>=0) {
        const block=pending.slice(0,boundary);pending=pending.slice(boundary+2);
        const type=block.split('\n').find(line=>line.startsWith('event:'))?.slice(6).trim();
        const data=block.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trim()).join('\n');
        if(!type || !data)continue;
        const payload=JSON.parse(data);
        if(type==='error')throw new Error(payload.error || 'AI_UNAVAILABLE');
        if(type==='done')done=true;
        onEvent(type,payload);
      }
    }
    if(!done)throw new Error('AI_INCOMPLETE');
  } finally {reader.releaseLock();}
}
export function anonymousReport(properties) {
  if(!properties)return null;
  const report={};
  for(const key of ['Type','Strategy','Inner Authority','Profile']) if(typeof properties[key]==='string')report[key]=properties[key].slice(0,160);
  return Object.keys(report).length?report:null;
}
const safeDate=value=>Number.isFinite(Number(value)) && Math.abs(Number(value))<8640000000000000 ? Number(value) : Date.now();
export function validChatHistory(value) {
  if(!Array.isArray(value))return [];
  return value.filter(item=>item && typeof item.id==='string' && Array.isArray(item.messages)).slice(0,20).map(item=>({
    id:item.id.slice(0,80),date:safeDate(item.date),
    messages:item.messages.filter(m=>m && ['user','assistant'].includes(m.role) && typeof m.content==='string').slice(-40).map(m=>({role:m.role,content:m.content.slice(0,6000),date:safeDate(m.date),...(m.failed?{failed:true,errorKey:['failed','unconfigured','rate','stopped'].includes(m.errorKey)?m.errorKey:'failed'}:{})})),
  }));
}
