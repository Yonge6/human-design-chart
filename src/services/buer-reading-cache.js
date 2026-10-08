// Device-local read cache, keyed by account and immutable person revision.
// Persistence is optional; blocked/full storage falls back to memory.
export function createReadingCache({ttl=Infinity,maxEntries=100,now=Date.now,storage=null}={}){
  const entries=new Map();
  const prefix='buer:pair-reading:v1:';
  const key=(owner,person)=>prefix+JSON.stringify([owner,person.id,person.revision,person.chart?.chartHash]);
  const remove=k=>{entries.delete(k);try{storage?.removeItem(k);}catch{}};
  const storedKeys=()=>{try{return Array.from({length:storage?.length||0},(_,i)=>storage.key(i)).filter(k=>k?.startsWith(prefix));}catch{return [];}};
  return {
    get(owner,person){
      if(!owner)return null;
      const k=key(owner,person);let entry=entries.get(k);
      if(!entry){try{entry=JSON.parse(storage?.getItem(k)||'null');}catch{return null;}}
      if(!entry)return null;
      if(!Number.isFinite(entry.time)||!entry.value||typeof entry.value!=='object'||now()-entry.time>=ttl){remove(k);return null;}
      return structuredClone(entry.value);
    },
    set(owner,person,value){
      if(!owner)return;
      const k=key(owner,person);entries.delete(k);
      entries.set(k,{time:now(),value:structuredClone(value)});
      while(entries.size>maxEntries)remove(entries.keys().next().value);
      try{
        storage?.setItem(k,JSON.stringify(entries.get(k)));
        const keys=storedKeys();
        if(keys.length>maxEntries){
          keys.sort((a,b)=>JSON.parse(storage.getItem(a))?.time-JSON.parse(storage.getItem(b))?.time);
          for(const old of keys.slice(0,keys.length-maxEntries))remove(old);
        }
      }catch{}
    },
    clear(){entries.clear();for(const k of storedKeys())remove(k);},
  };
}
