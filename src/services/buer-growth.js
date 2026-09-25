export const GROWTH_KEY='buer-growth-profile-v1';
export const DOMAINS=['mind','body','spirit','vocation'];
export const QUESTIONS=[
 ['mind','遇到与你深信的观点相反的意见时，你最近一次是怎样回应的？','Think of a recent disagreement with a belief you hold. How did you respond?'],
 ['mind','最近一次改变想法，是因为什么具体经历或证据？','What experience or evidence last changed your mind?'],
 ['mind','有什么道理你已经懂了，却还没做到？什么阻碍了你？','What do you understand in theory but struggle to put into practice? What gets in the way?'],
 ['body','回看最近一周，你的睡眠、活动与精力是什么状态？','Looking at the past week, how have your sleep, movement and energy been?'],
 ['body','生活忙乱时，什么照顾自己的习惯能留下，什么最先被放弃？','When life gets busy, which self-care habits stay and which disappear first?'],
 ['body','你尝试过什么让身体更舒服的做法？什么有效，什么难以持续？','What have you tried to feel better physically? What helped, and what was hard to sustain?'],
 ['spirit','最近什么时候，你感到被理解、有连接或有归属？','When did you last feel understood, connected or a sense of belonging?'],
 ['spirit','在重要关系中，你最想改变哪个反复出现的情境？','What recurring situation would you most like to change in an important relationship?'],
 ['spirit','除了成就和他人的评价，什么让你觉得生活值得投入？','Beyond achievement and approval, what makes life feel worth engaging with?'],
 ['vocation','你现在把时间投入什么工作或学习？哪些有价值，哪些消耗你？','What work or learning takes your time? What feels worthwhile, and what drains you?'],
 ['vocation','举一个你用已有技能帮助他人或创造价值的真实例子。','Describe a real example of using your skills to help someone or create value.'],
 ['vocation','未来三个月最想推进什么？有哪些资源、限制或可借助的工具？','What would you like to move forward in the next three months? What resources, constraints or tools matter?'],
].map(([domain,zh,en],index)=>({id:`q${index+1}`,domain,zh,en}));
const text=(v,n)=>typeof v==='string'?v.slice(0,n):'';
export function cleanGrowth(value={}) {
 const v=value&&typeof value==='object'?value:{};
 const shareAssessment=v.shareAssessment===true||v.version===1||(v.version==null&&v.shareAssessment==null);
 return {version:2,answers:Object.fromEntries(QUESTIONS.map(q=>[q.id,text(v.answers?.[q.id],1200)])),cursor:Math.max(0,Math.min(11,Number.isInteger(v.cursor)?v.cursor:0)),skipped:v.skipped===true,shareAssessment,
 report:text(v.report,16000),reportDate:text(v.reportDate,40),
 stories:(Array.isArray(v.stories)?v.stories:[]).filter(x=>x&&typeof x.id==='string').slice(0,100).map(x=>({id:text(x.id,80),title:text(x.title,100),body:text(x.body,4000),useAI:x.useAI===true,date:text(x.date,40)})),
 actions:(Array.isArray(v.actions)?v.actions:[]).filter(x=>x&&typeof x.id==='string').slice(0,100).map(x=>({id:text(x.id,80),title:text(x.title,200),metric:text(x.metric,300),due:/^\d{4}-\d{2}-\d{2}$/.test(x.due)?x.due:'',done:x.done===true,reflection:text(x.reflection,1200)}))};
}
export function readGrowth(storage){try{return cleanGrowth(JSON.parse(storage.getItem(GROWTH_KEY)||'{}'));}catch{return cleanGrowth();}}
export function saveGrowth(storage,value){const clean=cleanGrowth(value);storage.setItem(GROWTH_KEY,JSON.stringify(clean));return clean;}
export function setGrowthAnswer(state,id,value){const next=cleanGrowth(state);if(!QUESTIONS.some(q=>q.id===id))throw Error('INVALID_QUESTION');const answer=text(value,1200);if(next.answers[id]!==answer){next.report='';next.reportDate='';}next.answers[id]=answer;next.skipped=false;return next;}
export function answeredCount(state){return QUESTIONS.filter(q=>state.answers[q.id]?.trim()).length;}
export function assessmentContext(state){return QUESTIONS.filter(q=>state.answers[q.id]?.trim()).map(q=>({id:q.id,answer:state.answers[q.id].trim()}));}
export function growthContext(state,query=''){
 const tokens=[...new Set(query.toLowerCase().match(/[a-z]{3,}|[\u4e00-\u9fff]{2}/g)||[])];
 const selected=state.stories.filter(x=>x.useAI).map((x,index)=>({x,index,score:tokens.reduce((n,t)=>n+Number((x.title+x.body).toLowerCase().includes(t)),0)})).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,4);
 return {answers:state.shareAssessment?assessmentContext(state):[],stories:selected.map(({x})=>({id:x.id,title:x.title,body:x.body.slice(0,2000)}))};
}
// This module is shared by browser and server. Unknown fields never become AI instructions.
export function validateGrowthContext(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['answers','stories'].includes(k)))throw Error('INVALID_INPUT');
 if(!Array.isArray(value.answers)||value.answers.length>12||!Array.isArray(value.stories)||value.stories.length>4)throw Error('INVALID_INPUT');
 const ids=new Set();const answers=value.answers.map(x=>{if(!x||Object.keys(x).some(k=>!['id','answer'].includes(k))||!QUESTIONS.some(q=>q.id===x.id)||ids.has(x.id)||typeof x.answer!=='string'||!x.answer.trim()||x.answer.length>1200)throw Error('INVALID_INPUT');ids.add(x.id);return {id:x.id,domain:QUESTIONS.find(q=>q.id===x.id).domain,question:QUESTIONS.find(q=>q.id===x.id).en,answer:x.answer};});
 const stories=value.stories.map(x=>{if(!x||Object.keys(x).some(k=>!['id','title','body'].includes(k))||typeof x.id!=='string'||x.id.length>80||typeof x.title!=='string'||x.title.length>100||typeof x.body!=='string'||x.body.length>2000)throw Error('INVALID_INPUT');return {id:x.id,title:x.title,body:x.body};});
 return {answers,stories};
}
