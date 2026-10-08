const fields=[['Type','类型','type'],['Strategy','策略','strategy'],['Inner Authority','内在权威','authority'],['Profile','人生角色','profile'],['Definition','定义','definition'],['Incarnation Cross','轮回交叉','incarnationCross'],['Sign','标志','sign'],['Not Self Theme','非自己主题','notSelfTheme'],['Digestion','消化','digestion'],['Sense','感知','sense'],['Environment','环境','environment']];
const centers=[['head','头顶'],['ajna','逻辑'],['throat','喉咙'],['g','G 中心'],['heart','意志'],['sacral','荐骨'],['spleen','脾脏'],['solar plexus','情绪'],['root','根部']];
const planets=[['Sun','太阳'],['Earth','地球'],['North Node','北交点'],['South Node','南交点'],['Moon','月亮'],['Mercury','水星'],['Venus','金星'],['Mars','火星'],['Jupiter','木星'],['Saturn','土星'],['Uranus','天王星'],['Neptune','海王星'],['Pluto','冥王星']];
const token=v=>String(v).toLowerCase().replace(/[\s_-]/g,'');
const centerKey=v=>String(v).toLowerCase().replace(/ center$/,'').replaceAll('-',' ').replace('splenic','spleen');
const channels=values=>Array.isArray(values)?new Set(values.filter(v=>Array.isArray(v)&&v.length===2).map(v=>[...v].sort((a,b)=>a-b).join('–'))):null;
const activation=(side,name)=>{
  const a=Object.entries(side||{}).find(([key])=>token(key)===token(name))?.[1];
  const gate=a?.Gate??a?.gate,line=a?.Line??a?.line;
  return Number.isFinite(gate)&&Number.isFinite(line)?`${gate}.${line}`:null;
};

// Adapt the existing growth snapshot and person snapshot without mutating either.
export function pairComparisonGroups(me,other,{language='zh',translate=(_k,v)=>v,otherProperties=null}={}){
  const l=(zh,en)=>language==='en'?en:zh,missing=l('暂无资料','Not recorded');
  const value=(key,v)=>v?translate(key,key==='Profile'?String(v).split(':')[0]:v):missing;
  const basic=fields.map(([key,zh,alias])=>[l(zh,key),value(key,me?.core?.[key]),value(key,otherProperties?.[key]||other?.core?.[alias])]);
  const mine=Array.isArray(me?.centers)?new Set(me.centers.map(centerKey)):null;
  const theirs=Array.isArray(other?.structure?.definedCenters)?new Set(other.structure.definedCenters.map(centerKey)):null;
  const state=(set,key,yes,no)=>set?(set.has(key)?yes:no):missing;
  const centerRows=centers.map(([key,zh])=>[l(zh,key),state(mine,key,l('已定义','Defined'),l('未定义','Undefined')),state(theirs,key,l('已定义','Defined'),l('未定义','Undefined'))]);
  const mc=channels(me?.channels),tc=channels(other?.structure?.channels);
  const union=[...new Set([...(mc||[]),...(tc||[])])].sort((a,b)=>{const x=a.split('–').map(Number),y=b.split('–').map(Number);return x[0]-y[0]||x[1]-y[1];});
  const channelRows=union.map(key=>[key,state(mc,key,l('有','Present'),l('无','Absent')),state(tc,key,l('有','Present'),l('无','Absent'))]);
  if(!channelRows.length)channelRows.push([l('已定义通道','Defined channels'),mc?l('无','None'):missing,tc?l('无','None'):missing]);
  return [
    {key:'basic',title:l('基础信息','Core information'),rows:basic},
    {key:'centers',title:l('九大中心','Nine centers'),rows:centerRows},
    {key:'channels',title:l('通道','Channels'),rows:channelRows},
    ...['design','personality'].map(side=>({key:side,title:side==='design'?l('设计行星 · 闸门.爻线','Design · Gate.Line'):l('人格行星 · 闸门.爻线','Personality · Gate.Line'),rows:planets.map(([name,zh])=>[l(zh,name),activation(me?.[side],name)||missing,activation(other?.activations?.[side],name)||missing])})),
  ];
}

export function comparisonTable(group,{language='zh',otherName='TA'}={}){
  const table=document.createElement('table');table.className='pair-comparison-table';
  const caption=document.createElement('caption');caption.textContent=group.title;table.append(caption);
  const head=document.createElement('thead'),header=document.createElement('tr');
  for(const text of [language==='en'?'Item':'项目',language==='en'?'Me':'我',otherName]){const th=document.createElement('th');th.scope='col';th.textContent=text;header.append(th);}head.append(header);table.append(head);
  const body=document.createElement('tbody');
  for(const row of group.rows){const tr=document.createElement('tr');row.forEach((text,i)=>{const cell=document.createElement(i?'td':'th');if(!i)cell.scope='row';
    if(i&&['centers','channels'].includes(group.key)&&['已定义','有','Defined','Present','未定义','无','Undefined','Absent','None'].includes(text)){
      const badge=document.createElement('span');badge.className='pair-state '+(['已定义','有','Defined','Present'].includes(text)?'pair-state-present':'pair-state-absent');badge.textContent=text;cell.append(badge);
    }else cell.textContent=text;tr.append(cell);});body.append(tr);}table.append(body);return table;
}
