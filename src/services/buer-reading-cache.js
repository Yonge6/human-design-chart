// Account-scoped, short-lived memory only. Never persist private readings to disk.
export function createReadingCache({ttl=300000,maxEntries=32,now=Date.now}={}){
  const entries=new Map();
  const key=(owner,person)=>JSON.stringify([owner,person.id,person.revision,person.chart?.chartHash]);
  return {
    get(owner,person){
      const k=key(owner,person),entry=entries.get(k);
      if(!entry)return null;
      if(now()-entry.time>=ttl){entries.delete(k);return null;}
      return structuredClone(entry.value);
    },
    set(owner,person,value){
      const k=key(owner,person);entries.delete(k);
      entries.set(k,{time:now(),value:structuredClone(value)});
      while(entries.size>maxEntries)entries.delete(entries.keys().next().value);
    },
    clear(){entries.clear();},
  };
}
