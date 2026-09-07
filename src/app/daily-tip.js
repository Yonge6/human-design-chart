// One shared, offline advice pool for home cards and WidgetKit. No birth data leaves the app.
const typeTips = {
  Generator: [
    ["今天先做一件你真心想投入的小事，看看精力会不会自然跟上。", "Start with one small task you want to do, and notice how your energy responds."],
    ["答应新任务前，先问自己：我愿意为它留出时间吗？", "Before taking on a task, ask yourself: do I want to make time for this?"],
    ["把今天最有满足感的一刻记下来，慢慢发现适合自己的工作。", "Note today's most satisfying moment. Let it help you notice the work that suits you."],
    ["遇到卡住的事，换一个具体的小问题，再决定下一步。", "When you feel stuck, turn the problem into one small question before choosing a next step."],
  ],
  "Manifesting Generator": [
    ["把大计划缩成一次小尝试，做完再决定要不要继续。", "Turn a big plan into a small experiment, then decide whether to continue."],
    ["今天可以调整方向；先和受影响的人说清楚，会少一些返工。", "You can change direction today. Tell the people affected to avoid extra rework."],
    ["兴趣很多也没关系，今天只选一个最想推进的步骤。", "Many interests are welcome. Choose just one step you most want to move forward today."],
    ["给手头的任务设个检查点，允许自己继续、调整或停下。", "Set a checkpoint for your task. Give yourself room to continue, adjust, or stop."],
  ],
  Manifestor: [
    ["开始新行动前，简短告诉相关的人：你准备做什么，需要什么。", "Before starting something, tell the people involved what you plan to do and what you need."],
    ["为自己留一段不被打断的时间，把想法推进一小步。", "Make a little uninterrupted time to move an idea one step forward."],
    ["今天练习把界限说清楚，让别人知道你什么时候方便回应。", "Name a boundary today. Let others know when you are available to respond."],
    ["一轮忙碌结束后，给自己一点恢复时间，再开始下一件事。", "After a busy stretch, leave room to recover before starting the next task."],
  ],
  Projector: [
    ["分享建议前，先问一句：你想听听我的看法吗？", "Before offering advice, ask: would you like to hear what I think?"],
    ["今天把精力用在一个关键问题上，不必接下所有执行工作。", "Focus on one useful question today. You do not have to take on every task."],
    ["给日程留一点空白，清醒的观察也需要休息。", "Leave a little space in your schedule. Clear observation needs rest, too."],
    ["留意谁愿意认真听你说话，把好的见解分享给合适的人。", "Notice who listens with care, and share your insights where they are welcome."],
  ],
  Reflector: [
    ["留意今天在哪个环境里更自在，为自己多留一点那样的空间。", "Notice where you feel most at ease today, and make more room for that kind of setting."],
    ["把今天的感受记下来，重要的选择可以过几天再回看。", "Write down how you feel today. Revisit an important choice on another day."],
    ["离开喧闹后给自己几分钟，分清自己的感受和周围的气氛。", "Take a few quiet minutes after a busy setting to notice your own feelings."],
    ["今天不必和别人保持同一种节奏，先找到适合自己的步调。", "You do not have to match everyone else's pace today. Find a rhythm that suits you."],
  ],
};
const authorityTips = {
  "Emotional - Solar Plexus": ["重要的答复先放一放，等情绪平稳一些再回看。", "Give an important answer some space. Revisit it when your feelings have settled."],
  Sacral: ["把选择变成一个具体的‘愿不愿意’，留意自己的第一反应。", "Turn a choice into a clear yes-or-no question and notice your first response."],
  Splenic: ["留一点安静，留意当下的感觉，再结合实际信息作决定。", "Make a quiet moment to notice how you feel, alongside the practical facts."],
  "Ego Manifested": ["承诺前先确认：这是我真正想做、也有余力完成的吗？", "Before committing, check: do I want this, and do I have the capacity to follow through?"],
  "Ego Projected": ["今天少答应一件勉强的事，把力气留给真正愿意的承诺。", "Leave one reluctant yes unsaid today. Save your energy for a commitment you want."],
  "Self-Projected": ["把一个选择说出声，听听哪个方向更像真实的自己。", "Say a choice out loud and listen for the direction that feels more like you."],
  Lunar: ["重要选择不必今天定案，记录感受，给答案一点成熟的时间。", "An important choice need not be final today. Record your feelings and let the answer develop."],
  "Mental - Environment": ["找个舒服的地方，向愿意倾听的人说说想法，听见自己的答案。", "Find a comfortable place and talk with someone who listens. Hear your own answer take shape."],
};
const generalTips = [
  ["今天留意一件做起来很自然的事，那可能是你值得多用的优势。", "Notice something that comes naturally today. It may be a strength worth using more."],
  ["做事前先说清楚自己需要什么，让合作轻松一点。", "Before working together, say what you need to make collaboration easier."],
  ["把下一步缩小到今天能完成的程度，然后给自己一个开始。", "Make the next step small enough for today, and give yourself a start."],
];
export function createDailyTipPayload(data, language = "zh") {
  if (!data?.Properties || !typeTips[data.Properties.Type]) return null;
  const index = language === "en" ? 1 : 0;
  const authority = authorityTips[data.Properties["Inner Authority"]];
  const pool = [...typeTips[data.Properties.Type]];
  if (authority) pool.splice(1, 0, authority);
  pool.push(...generalTips);
  return { version: 1, language: index ? "en" : "zh", tips: pool.map(pair => pair[index]) };
}
export function dailyTipIndex(date, count) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime()) || count < 1) return 0;
  // Calendar day, not elapsed local hours: this also stays stable across DST.
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return ((day % count) + count) % count;
}
export function getDailyTip(payload, date = new Date()) {
  if (payload?.version !== 1 || !payload.tips?.length) return null;
  return payload.tips[dailyTipIndex(date, payload.tips.length)];
}
export function latestSavedResult(entries, keepHistory = true) {
  if (!keepHistory || !Array.isArray(entries)) return null;
  return [...entries].filter(entry => typeTips[entry?.data?.Properties?.Type])
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))[0] || null;
}

export function formatDailyTipText(tip, language) {
  return language === "zh" ? tip.replace("把下一步缩小到", "把下一步缩小到\n").replace("程度，", "程度，\n") : tip;
}
