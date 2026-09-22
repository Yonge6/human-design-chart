export const questionPool = [
 ['我适合怎样的工作节奏？','What work rhythm suits me?'],
 ['为什么我总在关系里内耗？','Why do I overthink relationships?'],
 ['做决定时，怎样听见自己？','How can I hear myself when making decisions?'],
 ['总觉得累，该怎样找回能量？','How can I restore my energy?'],
 ['怎样发现自己的优势？','How can I discover my strengths?'],
 ['如何温柔地建立边界？','How can I set kinder boundaries?'],
 ['我是真的想做，还是怕让人失望？','Do I want this, or am I afraid to disappoint others?'],
 ['怎样分清直觉和一时冲动？','How can I tell intuition from impulse?'],
 ['不确定的时候，可以先不决定吗？','Can I wait when I feel unsure?'],
 ['为什么休息时也会有负罪感？','Why do I feel guilty when I rest?'],
 ['怎样找到适合自己的独处方式？','What kind of time alone suits me?'],
 ['我需要被理解，还是被认可？','Do I need understanding or approval?'],
 ['怎样表达需求，才不总是委屈自己？','How can I express my needs more honestly?'],
 ['为什么我很难开口说“不”？','Why is it hard for me to say no?'],
 ['如何减少和别人的比较？','How can I compare myself with others less?'],
 ['遇到冲突时，我可以先做什么？','What can I do first when conflict arises?'],
 ['热情消退后，还要继续坚持吗？','Should I keep going when my enthusiasm fades?'],
 ['怎样区分想要和应该？','How can I distinguish what I want from what I should do?'],
 ['我为什么总在最后一刻行动？','Why do I tend to act at the last minute?'],
 ['什么样的合作让我更自在？','What kind of collaboration feels right for me?'],
 ['情绪起伏时，怎样照顾自己？','How can I care for myself through emotional ups and downs?'],
 ['怎样知道一段关系是否适合我？','How can I tell whether a relationship suits me?'],
 ['如果不急着证明自己，我想做什么？','What would I do if I did not need to prove myself?'],
 ['今天可以为自己做哪件小事？','What small thing can I do for myself today?'],
].map(([zh,en],id)=>({id,zh,en}));

export function nextQuestionBatch(state={}, random=Math.random) {
 const last=Array.isArray(state?.last)?state.last:[];
 let remaining=Array.isArray(state?.remaining)?[...new Set(state.remaining.filter(id=>Number.isInteger(id)&&id>=0&&id<questionPool.length))]:[];
 if(remaining.length<6){
  remaining=questionPool.map(q=>q.id);
  for(let i=remaining.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[remaining[i],remaining[j]]=[remaining[j],remaining[i]];}
  remaining=[...remaining.filter(id=>!last.includes(id)),...remaining.filter(id=>last.includes(id))];
 }
 const ids=remaining.splice(0,6);
 return {questions:ids.map(id=>questionPool[id]),state:{remaining,last:ids}};
}
