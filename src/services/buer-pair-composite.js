import {CHANNELS} from '../engine/human-design-engine.js';

const PLANETS=['sun','earth','northnode','southnode','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
const readGates=chart=>{
  const sides=chart?.activations||chart;
  if(!sides)return null;
  const gates=new Set();
  for(const key of ['design','personality']){
    const values=Object.fromEntries(Object.entries(sides[key]||{}).map(([name,value])=>[name.toLowerCase().replaceAll(' ',''),value]));
    for(const name of PLANETS){const value=values[name],gate=value?.Gate??value?.gate;if(!Number.isInteger(gate)||gate<1||gate>64)return null;gates.add(gate);}
  }
  return gates;
};
export function pairComposite(me,other){
  const mine=readGates(me),theirs=readGates(other);
  if(!mine||!theirs)return {available:false};
  const result={available:true,companionship:[],electromagnetic:[],dominanceMe:[],dominanceOther:[],compromiseMe:[],compromiseOther:[],combinedCenters:[],newCenters:[]};
  const combined=new Set(),individual=new Set();
  for(const [[a,b],centers] of CHANNELS){
    const m=Number(mine.has(a))+Number(mine.has(b)),t=Number(theirs.has(a))+Number(theirs.has(b));
    if(m===2||t===2)centers.forEach(c=>individual.add(c));
    if(!(mine.has(a)||theirs.has(a))||!(mine.has(b)||theirs.has(b)))continue;
    centers.forEach(c=>combined.add(c));const channel=[a,b].sort((x,y)=>x-y).join('–');
    if(m===2&&t===2)result.companionship.push(channel);
    else if(m===2)result[t===1?'compromiseMe':'dominanceMe'].push(channel);
    else if(t===2)result[m===1?'compromiseOther':'dominanceOther'].push(channel);
    else result.electromagnetic.push(channel);
  }
  result.combinedCenters=[...combined].sort();result.newCenters=result.combinedCenters.filter(c=>!individual.has(c));
  return result;
}

export function compositeSummaryLines(result,language='zh'){
  if(!result.available)return [language==='en'?'Complete gate data is needed to calculate the connection.':'完整闸门资料不足，暂不能计算合盘连接；不把缺失资料当成没有连接。'];
  const l=(zh,en)=>language==='en'?en:zh;
  const list=values=>values.join('、')||l('无','None');
  const centers={head:['头顶','Head'],ajna:['逻辑','Ajna'],throat:['喉咙','Throat'],g:['G 中心','G'],heart:['意志','Heart'],sacral:['荐骨','Sacral'],spleen:['脾脏','Spleen'],solar:['情绪','Solar plexus'],root:['根部','Root']};
  return [
    l(`共同拥有：${list(result.companionship)}。你们各自都有的完整通道，可作为观察共同习惯的线索，不等于一定想法相同。`,`Shared channels: ${list(result.companionship)}. Both charts contain these channels; shared structure does not mean identical opinions.`),
    l(`一起补全：${list(result.electromagnetic)}。各自提供一端，放在一起才形成完整连接。可观察彼此是否更容易带动某种反应，不等于命中注定的吸引。`,`Completed together: ${list(result.electromagnetic)}. Each chart supplies one end. Observe interaction; this is not proof of attraction.`),
    l(`一方完整、另一方没有：我 ${list(result.dominanceMe)}；TA ${list(result.dominanceOther)}。可观察谁在某些事上更有固定方式，但不代表谁应该主导关系。`,`One chart has the whole channel, the other neither gate: me ${list(result.dominanceMe)}; them ${list(result.dominanceOther)}. A structural difference, not a right to control.`),
    l(`一方完整、另一方有一端：我完整 ${list(result.compromiseMe)}；TA 完整 ${list(result.compromiseOther)}。这是留意不同做事方式的线索，不代表一定冲突，更不要求一方迁就。`,`One full channel and one partial: mine full ${list(result.compromiseMe)}; theirs full ${list(result.compromiseOther)}. Observe differences without assuming conflict or demanding concessions.`),
    l(`合图新增的定义中心：${list(result.newCenters.map(c=>centers[c][0]))}。指两张图放在一起才由完整通道连上的中心，不改变你们各自原本的决策方式。`,`Centers newly defined in the combined chart: ${list(result.newCenters.map(c=>centers[c][1]))}. These become connected only in the combined chart; neither person's own decision-making authority changes.`),
  ];
}
