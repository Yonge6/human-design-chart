import {CHANNELS} from '../engine/human-design-engine.js';

export const GUIDE_VERSION='[BUER_GUIDE_V2]';
export const guideV2=sections=>Object.values(sections||{}).length===6&&Object.values(sections).every(v=>v.startsWith(GUIDE_VERSION));
export const stampGuide=sections=>Object.fromEntries(Object.entries(sections).map(([key,value])=>[key,GUIDE_VERSION+'\n'+value]));
export const guideText=value=>String(value||'').replace(/^\[BUER_GUIDE_V2\]\s*/, '');
const centerTopics={head:['疑问','questions'],ajna:['理解方式','understanding'],throat:['表达','expression'],g:['方向','direction'],heart:['承诺','commitments'],sacral:['投入与休息','effort and rest'],spleen:['安全感','feeling safe'],solar:['情绪','emotions'],root:['压力与节奏','pressure and pace']};
const canonical=id=>String(id).split(/[–-]/).map(Number).sort((a,b)=>a-b).join('–');
// These are reflection questions, not behavioral predictions. The two specific
// themes are sourced in docs/plans/2026-10-08-pair-guidance-v2.md. Other channels
// use their connected centers as discussion topics, not invented channel names.
export function channelGuidance(id,language='zh'){
 const en=language==='en',key=canonical(id),channel=CHANNELS.find(([g])=>canonical(g.join('–'))===key);if(!channel)return null;
 if(key==='27–50')return {id:key,title:en?'Care without taking over':'关心，不等于替对方做主',question:en?'What kind of help is actually wanted?':'对方此刻想要哪一种帮助？',action:en?'Ask: “Would you like me to listen, help plan, or do one specific thing?” Agree what each person will handle.':'先问：“你希望我听你说、一起想办法，还是帮你做一件具体的事？”再商量各自负责什么。',theme:en?'Traditional theme: care and nurturing.':'体系中的主题：照顾与养育。',section:'rhythm'};
 if(key==='25–51')return {id:key,title:en?'Encouragement without pressure':'鼓励，不等于催促或比较',question:en?'Is this challenge something both people want?':'这次尝试，是双方愿意的，还是有人被推着走？',action:en?'Ask: “Would you like to try? What pace feels manageable?” Leave room to say no; do not turn encouragement into a contest.':'可以说：“你想试试看吗？什么节奏更合适？”允许拒绝，不把鼓励变成比较谁更强。',theme:en?'Traditional theme: initiation and challenge.':'体系中的主题：启动与挑战。',section:'friction'};
 const topics=channel[1].map(c=>centerTopics[c]?.[en?1:0]).filter(Boolean),title=topics.join(en?' & ':'与');
 return {id:key,title:en?`Talk about ${title}`:`把${title}说清楚`,question:en?'Do you handle this differently, and what would help both of you?':'在这件事上，你们做法相同吗？怎样安排双方都舒服？',action:en?'Each person describes one recent example and one need. Agree on a small trial, then review how it felt.':'各举一个最近的例子，说清自己的需要，商量一个小调整，再看实际感受；不要求对方照自己的方式来。',theme:(en?'Discussion topics derived from the connected centers, not a named channel interpretation: ':'按连接中心整理的讨论主题，不是通道名称或性格结论：')+title,section:channel[1].includes('solar')||channel[1].includes('sacral')?'rhythm':channel[1].includes('throat')?'communication':'friction'};
}
export function compositeGuidance(composite,language='zh'){
 if(!composite?.available)return [];
 const en=language==='en';
 const relation={companionship:en?'Both charts contain this whole connection.':'双方都拥有完整连接。',electromagnetic:en?'Each chart contributes one end; it is complete only together.':'双方各有一端，放在一起才补全。',dominanceMe:en?'Your chart contains the full connection; theirs has neither end.':'你有完整连接，对方没有两端。',dominanceOther:en?'Their chart contains the full connection; yours has neither end.':'对方有完整连接，你没有两端。',compromiseMe:en?'Your chart contains the whole connection; theirs contains one end.':'你有完整连接，对方有其中一端。',compromiseOther:en?'Their chart contains the whole connection; yours contains one end.':'对方有完整连接，你有其中一端。'};
 return Object.entries(relation).flatMap(([kind,basis])=>(composite[kind]||[]).map(id=>{const card=channelGuidance(id,language);return card?{...card,kind,basis:`${card.id} · ${basis} ${card.theme}`} :null;})).filter(Boolean).sort((a,b)=>Number(['27–50','25–51'].includes(b.id))-Number(['27–50','25–51'].includes(a.id)));
}
export function sectionFoundation(section,me,other,language='zh'){
 const en=language==='en',own=me?.core||{},their=other?.core||other||{};
 const authority=(c)=>c['Inner Authority']||c.authority||(en?'Not available':'尚未提供');
 const basis=en?`Decision-making references — you: ${authority(own)}; them: ${authority(their)}. Neither is a rule for who gets the final say.`:`双方决策方式参考：你 · ${authority(own)}；对方 · ${authority(their)}。这不是决定谁说了算的规则。`;
 const items={
  overview:en?['Start with both people’s needs','Compare how each person prefers to talk, decide and rest. Chart differences offer questions to explore, not a verdict on compatibility.','Each name one thing that feels good and one thing you would like to adjust. Choose the smallest shared priority.']:['先看彼此需要，再看怎样配合','一起看表达、决定和休息的方式。相同的地方可以借力，不同的地方需要商量；图谱不能代替对方亲口说出的感受。','双方各说一件相处舒服的事、一件想调整的事，先选择一件共同愿意尝试的小事。'],
  communication:en?['Make the request easy to understand','Separate what happened, how you feel and what you need. Ask before offering advice.','Try: “When … happened, I felt …. Would you be willing to …?” Then ask what they heard.']:['把需要说具体，让对方有机会回应','把发生了什么、自己的感受、希望对方做什么分开说。给建议前先问对方是否需要。','试试：“刚才发生……时，我感到……，我希望……，你愿意吗？”再请对方说说听到了什么。'],
  friction:en?['A shared decision needs two willing answers','Check each person’s timing, willingness and real constraints. A quick response from one person is not agreement from both.','Set a time to revisit the choice. Discuss money, time and responsibility separately; either person can ask for more time.']:['共同决定，需要两个真实的愿意','先确认双方是否愿意、各自需要多少时间，再谈现实限制。一方反应快，不等于两个人都已同意。','约定再次讨论的时间；把钱、时间、责任分别说清楚。谁还没想清楚，就先不替谁答应。'],
  rhythm:en?['Agree on closeness and breathing room','Check what restores each person’s energy and how much support each can offer. Care should not erase boundaries.','Try one predictable time together and one protected time apart. For children, adults hold responsibility and offer age-appropriate choices.']:['靠近与留白，都可以约定','问清什么陪伴有帮助、什么时候需要独处，以及每个人实际能承担多少。照顾关系不等于一直硬撑。','试着约定一个固定相处时段、一个不被打扰的休息时段。面对孩子，由成人承担照顾责任，给适龄选择。'],
  repair:en?['Pause without abandoning the conversation','Notice when the discussion turns into blame. Stop escalation, then return to the specific issue and each person’s responsibility.','Say: “I want to talk this through. Can we pause and return at …?” Afterward name one thing you can change. Safety comes before repairing the relationship.']:['暂停争执，不等于丢下关系','当讨论开始变成人身评价，先停止升级，再回到具体事件与各自责任。不要用类型或通道给对方定性。','可以说：“我想把这件事谈好，先暂停一下，我们……再聊。”回来后各说一件自己能调整的事。出现伤害或威胁，先保护安全。'],
  practice:en?['Try, observe, adjust','A better relationship is measured by both people’s experience, not a chart score. Keep only habits that help.','Pick two small agreements. Review weekly: Did both feel heard? Was responsibility manageable? What should we keep or change?']:['用实际感受，检查关系有没有变好','不靠合盘分数判断成效，而是看双方是否更能表达、分工是否更合理、疲惫和误会是否减少。','先挑两个小约定。一周后各自回答：哪里更舒服了？哪里还累？下周保留什么、调整什么？'],
 };
 const [title,question,action]=items[section]||items.overview;
 return {title,question,action,basis:section==='friction'?basis:(en?'General conversation practice, not a claim that a chart proves your behavior. Adapt to your real situation.':'这是通用相处练习，不代表图谱已经证明你们有某种行为；请结合真实反馈调整。')};
}
