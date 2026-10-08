import { cleanGrowth } from './buer-growth.js';

export const PAIR_SECTIONS = [
 ['overview','双方概览','At a glance'],['communication','沟通与决策','Communication & decisions'],
 ['rhythm','情绪与节奏','Emotions & rhythm'],['friction','互补与摩擦','Support & friction'],
 ['repair','修复与边界','Repair & boundaries'],['practice','日常相处','Everyday practice'],
];
const CORE=['Type','Strategy','Inner Authority','Profile','Definition','Incarnation Cross','Sign','Not Self Theme','Digestion','Sense','Environment'];
const PLANETS=['Sun','Earth','North Node','South Node','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
const text=(v,n=500)=>typeof v==='string'?v.slice(0,n):'';
export function guideChart(data) {
 if(!data?.Properties)return null;
 const core=Object.fromEntries(CORE.map(k=>[k,text(data.Properties[k])]));
 const side=name=>Object.fromEntries(PLANETS.filter(k=>data[name]?.[k]).map(k=>{
  const a=data[name][k];return [k,Object.fromEntries(['Gate','Line','Color','Tone','Base','Longitude'].filter(key=>Number.isFinite(a[key])).map(key=>[key,a[key]]))];
 }));
 return {core,centers:(data['Defined Centers']||[]).map(x=>text(x,50)).slice(0,9),channels:(data.Channels||[]).filter(x=>Array.isArray(x)&&x.length===2&&x.every(n=>Number.isInteger(n)&&n>=1&&n<=64)).slice(0,36),design:side('Design'),personality:side('Personality'),variables:Object.fromEntries(['Digestion','Environment','Awareness','Perspective'].map(k=>[k,text(data.Variables?.[k])]))};
}
export function cleanGuideSource(value) {
 if(!value||value.version!==1||!value.growth||typeof value.growth!=='object')throw Error('INVALID_GUIDE_SOURCE');
 let chart=null;
 if(value.chart){
  const c=value.chart;
  if(!c.core||!Array.isArray(c.centers)||!Array.isArray(c.channels))throw Error('INVALID_GUIDE_SOURCE');
  chart=guideChart({Properties:c.core,'Defined Centers':c.centers,Channels:c.channels,Design:c.design,Personality:c.personality,Variables:c.variables});
 }
 const source={version:1,chart,growth:cleanGrowth(value.growth)};
 if(new TextEncoder().encode(JSON.stringify(source)).length>850000)throw Error('GUIDE_SOURCE_TOO_LARGE');
 return source;
}
export function makeGuideSource(data,growth){return cleanGuideSource({version:1,chart:guideChart(data),growth});}
export function validatePairSections(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==PAIR_SECTIONS.length)throw Error('INVALID_GUIDE_SECTIONS');
 for(const [key] of PAIR_SECTIONS)if(typeof value[key]!=='string'||!value[key].trim()||value[key].length>6000)throw Error('INVALID_GUIDE_SECTIONS');
 return Object.fromEntries(PAIR_SECTIONS.map(([key])=>[key,value[key].trim()]));
}
export function parsePairSections(raw){return validatePairSections(JSON.parse(raw.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')));}
export function pairManualStale(manual,source,person){return !!manual&&(manual.source_revision!==source?.revision||manual.person_revision!==person.revision);}
export function guideSourceEqual(a,b){return JSON.stringify(cleanGuideSource(a))===JSON.stringify(cleanGuideSource(b));}
export function pairRelationshipRole(person={}){
 const roles=[['母亲',['母亲','妈妈','妈','母','mother','mom','mum']],['父亲',['父亲','爸爸','爸','父','father','dad']],['女儿',['女儿','闺女','daughter']],['儿子',['儿子','son']],['妻子',['妻子','老婆','夫人','太太','wife']],['丈夫',['丈夫','老公','先生','husband']]];
 for(const value of [person.relationship,person.nickname]){const name=String(value||'').trim().toLowerCase();const role=roles.find(([,names])=>names.includes(name));if(role)return role[0];}
 return null;
}
export function pairManualRoleWarning(person,sections){
 const role=pairRelationshipRole(person),text=Object.values(sections||{}).join('\n');
 return role==='母亲'&&/你(?:的)?父亲|your father/i.test(text)?role:role==='父亲'&&/你(?:的)?母亲|your mother/i.test(text)?role:null;
}
export function pairManualPrompt(language='zh',person){
 const role=pairRelationshipRole(person);
 return (language==='en'?'Write in English.':'用中文撰写。')+(role?`所选人物与用户的明确关系是：${role}。全文称谓和代词必须保持一致，不得把母亲写成父亲或反过来。`:'未提供明确性别时使用“TA／对方”，不得从“父母／子女”等分类、年龄、人类图或用户其他经历猜测父亲、母亲、儿子、女儿。')+'生成可长期阅读的双人相处说明书，不要先追问。仅输出 JSON 对象，六个键必须为 overview、communication、rhythm、friction、repair、practice，每个值为纯文本（可含换行），每节约 250-450 中文字或 150-250 英文词。分别写双方概览、沟通与决策、情绪与节奏、互补与摩擦、冲突修复与边界、日常实践。覆盖提供的成长档案各领域，结合具体回答、经历、行动与复盘，标出依据；记录事实、图谱反思假设与建议要区分。不得虚构资料或匹配评分，不替双方决定关系。缺少资料具体说明，不要声称已读取不存在的内容。';
}
