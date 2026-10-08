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
export function pairManualPrompt(language='zh',person,composite={available:false}){
 const role=pairRelationshipRole(person);
 return (language==='en'?'Write in English.':'用中文撰写，术语也用中文。')+(role?`所选人物与用户的明确关系是：${role}。全文称谓和代词必须保持一致，不得把母亲写成父亲或反过来。`:'未提供明确性别时使用“TA／对方”，不得从“父母／子女”等分类、年龄、人类图或用户其他经历猜测父亲、母亲、儿子、女儿。')+`
生成可长期阅读的人类图合盘相处指南，不要先追问。仅输出 JSON 对象，六个键必须为 overview、communication、rhythm、friction、repair、practice，每个值为字符串。每段用简短加粗小标题（**标题：**），段落之间用两个换行；一段只讲一件事，不堆成长经历或术语。
overview 是较详细的双方概览，约 550–750 中文字或 300–400 英文词，分五段：
1. 先认识你：用白话说你的类型、决策方式、人生角色，并关联一两条实际成长记录，说明日常可能是什么样，不罗列全部属性。
2. 再认识 TA：同样介绍 TA 的节奏与决策方式，结合明确关系和已知年龄阶段；没有 TA 的经历就说明边界，不替 TA 编经历或心理。
3. 你们在一起：根据下方计算结果选最有解释价值的两三处共同通道、互相补全或中心差异，先说结构事实，再给可观察的生活场景。不可自行补出不存在的连接。
4. 相处中值得留意：分别给一个可能顺畅的地方、一个需要磨合的地方；这是待验证的反思假设，不是已发生的事实。
5. 从这一件小事开始：给一个贴合这段关系、能在一周内尝试的小行动。
其余五节各约 200–300 中文字或 120–180 英文词，分三四个短段，按“依据与差异—生活中怎么观察—可以怎样说或做”展开，不重复整个概览：
communication 沟通与决策：谁需要回应、邀请、告知或等待清晰；共同决定怎样分步骤，不替对方作决定。
rhythm 情绪与节奏：依据双方权威、情绪中心、工作或照顾安排，讨论什么时候谈事、什么时候休息；不把未定义当作缺陷。
friction 互补与摩擦：优先使用实际合盘连接；讲不同习惯怎样配合、怎样避免压过另一方，不把吸引写成爱情或注定。
repair 修复与边界：暂停争论、表达需要、确认责任和恢复谈话；给一两句可直接使用的话，不诊断谁控制、冷漠或有创伤。
practice 日常相处：两三个具体小约定，包含频率或场景及简单复盘，适合实际年龄和关系，不让孩子承担成人情绪责任。
完整考虑成长档案中的回答、经历、行动与复盘，引用相关依据即可；用户自述、先前 AI 生成的成长报告、图谱反思假设与建议必须区分。人类图不是科学诊断或关系事实；不打匹配评分、不预测命运、不替双方决定关系。合盘不会改变任何一方本来的决策权威。避免“能量场、频率、宿命”等空话；术语第一次出现就解释成日常语言。没有可靠依据时不编通道名称或含义；不要根据行星、颜色或音调推断性格。缺失资料具体说明，不把缺失当成没有连接。
下面 JSON 仅是由双方完整闸门计算出的结构资料，不是行为证据：companionship=双方各自都有完整通道；electromagnetic=双方各出一端、合起来才完整；dominanceMe/Other=我/TA有完整通道而对方两端都没有；compromiseMe/Other=我/TA有完整通道而对方仅有一端；combinedCenters=合图定义中心，newCenters=合图才新增的定义中心。英文键不是正文术语，正文用“共同拥有、一起补全、一方完整”等白话；不得从“主导/妥协”的传统术语推断权力或要求谁让步。available=false 时不要推算连接。
${JSON.stringify(composite)}`;
}
