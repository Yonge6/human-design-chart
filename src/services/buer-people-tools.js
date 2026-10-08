export function orderedPeople(people, ids = []) {
  const available = new Map(people.filter(p=>!p.is_self&&!p.deleted_at).map(p=>[p.id,p]));
  const rows=[];
  for(const id of ids){if(available.has(id)){rows.push(available.get(id));available.delete(id);}}
  return [...rows,...available.values()];
}
export function movePerson(ids, id, target) {
  const next=[...ids],from=next.indexOf(id);
  if(from<0||!Number.isInteger(target))return next;
  next.splice(from,1);next.splice(Math.max(0,Math.min(target,next.length)),0,id);return next;
}
export function relationshipGuidePrompt(language='zh') {
  return language==='en'
    ? 'Please create a practical relationship guide for me and this selected person, based only on our available authorized context, relationship and known age. Include: 1. Where we can support each other; 2. Communication rhythm with two example phrases; 3. Possible friction and how to handle it; 4. Conflict repair and personal boundaries; 5. One small action to try this week. Separate recorded facts from tentative chart-based reflections. Do not invent personality, events or age, give compatibility scores, or make relationship decisions for us. If my chart is missing, say so briefly and still offer useful advice based on what is available. Then offer one optional follow-up question.'
    : '请结合我与当前这位 TA 的可用授权资料、关系和已知年龄，给我一份具体实用的「相处指南」，不用等我先描述问题。请分为：1. 可以彼此支持的地方；2. 更舒服的沟通节奏（给两句可直接使用的话）；3. 可能出现的摩擦与应对；4. 冲突后的修复和彼此边界；5. 这周可尝试的一件小事。区分档案事实和需要在实际相处中验证的人类图线索，不虚构性格、经历或年龄，不做匹配评分，不替我们决定关系。若缺少我的图谱，简短说明具体缺失，但仍基于已有资料给出有用建议。最后只留一个可选的追问，方便继续聊。';
}
