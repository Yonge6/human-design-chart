import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SignedDataVerifier, Environment } from '@apple/app-store-server-library';

export const SUBSCRIPTIONS = ['com.yonge6.buerwithin.plus.monthly', 'com.yonge6.buerwithin.plus.annual'];
export function appleMembershipVerifier(environment=process.env) {
  const roots=[readFileSync(new URL('./apple-roots/AppleRootCA-G3.der',import.meta.url))];
  const verifiers=[Environment.PRODUCTION,Environment.SANDBOX].map(env=>new SignedDataVerifier(roots,true,env,'com.yonge6.buerwithin',Number(environment.BUER_APP_APPLE_ID || 6814764726)));
  return async proof=>{
    if(typeof proof!=='string'||proof.length>24000)return false;
    for(const verifier of verifiers)try {
      const tx=await verifier.verifyAndDecodeTransaction(proof);
      if(SUBSCRIPTIONS.includes(tx.productId)&&tx.expiresDate>Date.now()&&!tx.revocationDate&&tx.type==='Auto-Renewable Subscription')return true;
    }catch{}
    return false;
  };
}
export function createChatAccess({file,verify=async()=>false,now=()=>Date.now()}={}) {
  let usage={};const pending=new Map();
  if(file)try{usage=JSON.parse(readFileSync(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const save=()=>{if(!file)return;mkdirSync(dirname(file),{recursive:true});writeFileSync(file+'.tmp',JSON.stringify(usage),{mode:0o600});renameSync(file+'.tmp',file);};
  return { async reserve(body) {
    if(await verify(body.transactionJWS))return {finish(){},member:true};
    if(typeof body.installationId!=='string'||!/^[a-f0-9-]{36}$/i.test(body.installationId))throw new Error('DEVICE_REQUIRED');
    // UTC reset is explicit in the paywall and consistent across travel/time changes.
    const day=new Date(now()).toISOString().slice(0,10);
    const key=createHash('sha256').update(body.installationId).digest('hex');
    const reservationKey=key+day;
    const used=usage[key]?.day===day?usage[key].count:0;
    if(used+(pending.get(reservationKey)||0)>=3)throw new Error('DAILY_LIMIT');
    pending.set(reservationKey,(pending.get(reservationKey)||0)+1);
    let settled=false;
    return {member:false,finish(success){
      if(settled)return;settled=true;
      pending.set(reservationKey,Math.max(0,(pending.get(reservationKey)||1)-1));
      if(success){const count=usage[key]?.day===day?usage[key].count:0;usage[key]={day,count:count+1};save();}
    }};
  }};
}
