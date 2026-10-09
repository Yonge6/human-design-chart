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

export function compositeSummaryLines(result,language='zh',describe=null){
  if(!result.available)return [language==='en'?'Complete gate data is needed to calculate the connection.':'完整闸门资料不足，暂不能计算合盘连接；不把缺失资料当成没有连接。'];
  const l=(zh,en)=>language==='en'?en:zh;
  const explain=(id)=>{
    const item=describe?.(id);
    if(!item)return id;
    return l(`${id}｜${item.title}。生活里可以观察：${item.question}`,`${id} | ${item.title}. Notice in daily life: ${item.question}`);
  };
  const list=(values,empty=l('无','None'))=>values.length?values.map(explain).join('\n'):empty;
  const centers={head:['头顶','Head'],ajna:['逻辑','Ajna'],throat:['喉咙','Throat'],g:['G 中心','G'],heart:['意志','Heart'],sacral:['荐骨','Sacral'],spleen:['脾脏','Spleen'],solar:['情绪','Solar plexus'],root:['根部','Root']};
  return [
    l('**怎样阅读这里：** 数字是通道编号，不是关系分数。后面的白话说明是用来观察日常互动的提问，不是对性格或关系的定论。','**How to read this:** The numbers identify channels; they are not relationship scores. The plain-language notes are prompts for observing daily interaction, not verdicts about either person or the relationship.'),
    l(`**你们都拥有：** ${list(result.companionship,'没有相同的完整通道。')}\n这类通道表示双方各自都有这条完整连接，可能较容易理解彼此在相关主题上的习惯，但不等于想法一定相同。`,`**Present in both charts:** ${list(result.companionship,'No complete channel is shared.')}\nBoth people carry the whole connection. It can make related habits easier to recognize, but does not imply identical opinions.`),
    l(`**你们一起补全：** ${list(result.electromagnetic,'没有由双方各提供一端而补全的通道。')}\n这类通道表示双方各带来一端，相处时相关主题可能更容易被带动；它不是“命中注定”或吸引力证明。`,`**Completed together:** ${list(result.electromagnetic,'No channel is completed by combining one gate from each person.')}\nEach person contributes one end. The related topic may become more noticeable together; this is not proof of destiny or attraction.`),
    l(`**一方带来完整方式：**\n你：${list(result.dominanceMe,'无')}\n对方：${list(result.dominanceOther,'无')}\n表示一方有完整连接，另一方没有两端。可以观察谁在相关事情上较有固定做法，但不代表谁应该主导。`,`**One person brings the whole pattern:**\nYou: ${list(result.dominanceMe,'None')}\nThem: ${list(result.dominanceOther,'None')}\nOne person has the complete connection and the other has neither end. Notice who has a more established approach without treating it as a right to lead.`),
    l(`**一方完整、另一方已有一端：**\n你完整：${list(result.compromiseMe,'无')}\n对方完整：${list(result.compromiseOther,'无')}\n双方都接触到相关主题，但熟悉程度或做法可能不同。把差异说清楚即可，不代表一定冲突，也不要求谁迁就。`,`**One complete, the other already has one end:**\nYours complete: ${list(result.compromiseMe,'None')}\nTheirs complete: ${list(result.compromiseOther,'None')}\nBoth touch the topic, but their familiarity or approach may differ. Discuss the difference without assuming conflict or demanding concessions.`),
    l(`合图新增的定义中心：${list(result.newCenters.map(c=>centers[c][0]))}。指两张图放在一起才由完整通道连上的中心，不改变你们各自原本的决策方式。`,`Centers newly defined in the combined chart: ${list(result.newCenters.map(c=>centers[c][1]))}. These become connected only in the combined chart; neither person's own decision-making authority changes.`),
  ];
}
