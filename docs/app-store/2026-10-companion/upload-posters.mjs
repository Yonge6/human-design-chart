import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const root=new URL('./',import.meta.url);
const sets=[['zh-Hans','iphone','dd059338-41b8-4c69-8033-2773022d2a95'],['zh-Hans','ipad','e02aed5b-80ad-492f-8b4d-a9858d9a348e'],['en-US','iphone','ae6b1485-9b5b-47e8-8bce-99d5b8083fc6'],['en-US','ipad','598bc023-bd11-495b-995e-53c630935703']];
export async function upload(p){
 const api=async(path,method='GET',body)=>p.evaluate(async({path,method,body})=>{const r=await fetch('/iris/v1/'+path,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const j=r.status===204?{}:await r.json();if(!r.ok)throw Error(JSON.stringify({status:r.status,errors:j.errors}));return j},{path,method,body});
 const record=[];
 for(const [lang,device,setId] of sets){
  const old=(await api(`appScreenshotSets/${setId}/appScreenshots`)).data.map(x=>({id:x.id,fileName:x.attributes.fileName,checksum:x.attributes.sourceFileChecksum}));
  const entry={lang,device,setId,old,added:[]};record.push(entry);
  await fs.writeFile(new URL('upload-records.json',root),JSON.stringify(record,null,2));
  for(let index=1;index<=4;index++){
   const bytes=await fs.readFile(new URL(`posters/${lang}/${device}/0${index}.png`,root));
   const checksum=crypto.createHash('md5').update(bytes).digest('hex');
   const asset=(await api('appScreenshots','POST',{data:{type:'appScreenshots',attributes:{fileName:`0${index}-companion-${lang}-${device}.png`,fileSize:bytes.length},relationships:{appScreenshotSet:{data:{type:'appScreenshotSets',id:setId}}}}})).data;
   entry.added.push({id:asset.id,index,checksum});
   await fs.writeFile(new URL('upload-records.json',root),JSON.stringify(record,null,2));
   for(const op of asset.attributes.uploadOperations){const r=await fetch(op.url,{method:op.method,headers:Object.fromEntries(op.requestHeaders.map(x=>[x.name,x.value])),body:bytes.subarray(op.offset,op.offset+op.length)});if(!r.ok)throw Error(`Binary upload failed ${r.status}`);}
   await api('appScreenshots/'+asset.id,'PATCH',{data:{type:'appScreenshots',id:asset.id,attributes:{uploaded:true,sourceFileChecksum:checksum}}});
   console.log({lang,device,index,state:'uploaded'});
  }
 }
 return record.map(x=>({lang:x.lang,device:x.device,uploaded:x.added.length}));
}
export async function verifyAndReplace(p){
 const records=JSON.parse(await fs.readFile(new URL('upload-records.json',root),'utf8'));
 const results=await p.evaluate(async(records)=>{const read=async(path)=>{const r=await fetch('/iris/v1/'+path);if(!r.ok)throw Error('Read '+r.status);return r.json()};const checked=[];
 for(const set of records){const all=(await read(`appScreenshotSets/${set.setId}/appScreenshots`)).data;for(const asset of set.added){const current=all.find(x=>x.id===asset.id);if(current?.attributes.assetDeliveryState?.state!=='COMPLETE'||current.attributes.sourceFileChecksum!==asset.checksum)throw Error(JSON.stringify({id:asset.id,state:current?.attributes.assetDeliveryState}));}checked.push(set);}
 for(const set of checked){for(const old of set.old){const r=await fetch('/iris/v1/appScreenshots/'+old.id,{method:'DELETE'});if(!r.ok&&r.status!==404)throw Error('Delete '+r.status);}
 const ordered=set.added.sort((a,b)=>a.index-b.index).map(x=>({type:'appScreenshots',id:x.id}));const r=await fetch(`/iris/v1/appScreenshotSets/${set.setId}/relationships/appScreenshots`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:ordered})});if(!r.ok)throw Error('Order '+r.status);}
 return Promise.all(checked.map(async set=>({lang:set.lang,device:set.device,assets:(await read(`appScreenshotSets/${set.setId}/appScreenshots`)).data.map(x=>({id:x.id,name:x.attributes.fileName,state:x.attributes.assetDeliveryState,checksum:x.attributes.sourceFileChecksum}))})));},records);
 await fs.writeFile(new URL('asset-verification.json',root),JSON.stringify(results,null,2));return results;
}
