import { calculateHumanDesign, localToUtcCandidates } from "./human-design-engine.js?v=20260715-11";
import { fetchPlaceCandidates, inferTimezoneFromAddress } from "./location-service.js?v=20260715-2";

const planets = ["Sun", "Earth", "North Node", "South Node", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const graph = document.querySelector("#bodygraph");
const fields = {
  name: document.querySelector("#name"),
  year: document.querySelector("#year"),
  month: document.querySelector("#month"),
  day: document.querySelector("#day"),
  hour: document.querySelector("#hour"),
  minute: document.querySelector("#minute"),
  ampm: document.querySelector("#ampm"),
  location: document.querySelector("#location"),
  clockOccurrence: document.querySelector("#clockOccurrence"),
};
const locationResults = document.querySelector("#locationResults");
const clockOccurrenceField = document.querySelector("#clockOccurrenceField");
const status = document.querySelector("#status");
const chartForm = document.querySelector("#chartForm");
const downloadButton = document.querySelector("#download");
const shareButton = document.querySelector("#share");
const editButton = document.querySelector("#editChart");
const shell = document.querySelector(".shell");
const formPanel = document.querySelector(".form-panel");
const chartPanel = document.querySelector("#capture");
const chartResult = document.querySelector("#chartResult");
const chartPreview = document.querySelector("#chartPreview");
const chartQr = document.querySelector("#chartQr");
const privacyToggle = document.querySelector("#privacyMode");
const ampmSwitch = document.querySelector("#ampmSwitch");
const ampmButtons = [...document.querySelectorAll("[data-ampm]")];
const detailButton = document.querySelector("#detailReading");
const detailDialog = document.querySelector("#detailDialog");
const closeDetailButton = document.querySelector("#closeDetail");
const detailContent = document.querySelector("#detailContent");
const celebrityMatches = document.querySelector("#celebrityMatches");
const languageButtons = [...document.querySelectorAll("[data-language]")];

const copy = {
  zh: {
    brand: "Pluto 人生使用说明书",
    formEyebrow: "人生使用说明书", formTitle: "认识你自己", name: "姓名", year: "年", month: "月", day: "日",
    hour: "时", minute: "分", ampm: "上午/下午", am: "上午", pm: "下午", birthLocation: "出生地点",
    locationPlaceholder: "城市、区县或地区", locationSuggestions: "出生地点建议", clockOccurrence: "重复时刻",
    bodygraphLabel: "人生使用说明书图谱",
    firstOccurrence: "第一次出现", secondOccurrence: "第二次出现", attribution: "可直接输入完整地点，无需选择候选。",
    generate: "免费获取人生使用说明书", yourChart: "你的人生使用说明书", emptyChart: "填写出生资料后生成。", editChart: "重新填写", download: "保存图片", share: "分享", previewAlt: "人生使用说明书",
    design: "设计", personality: "人格", watermark: "Swiss Ephemeris · 出生前回溯 88° 太阳弧 · True Node", interpretationTitle: "解读", celebrityTitle: "拥有相似基础配置的人物", celebrityBasis: "基于类型、权威、人生角色与定义匹配", celebrityNote: "名人结构参考公开出生资料；相似仅指基础配置，不代表完整图谱、性格、经历或命运相同。", qrLabel: "扫码生成你的人生使用说明书", privacyMode: "隐私模式",
    searchingPlace: "正在搜索地点…", noPlace: "暂未显示候选，仍可直接点击生成人生使用说明书。", placeUnavailable: "搜索建议暂时未加载，仍可直接点击生成人生使用说明书。",
    resolvingPlace: "正在确认地点和当地时间…", placeNeedsDetail: "暂时无法确认这个地点，请补充城市、省/州和国家后再试。", enterName: "请输入姓名。",
    missingTime: "该出生时刻因夏令时向前调整而不存在。", repeatedTime: "这个时刻出现过两次，请选择出生记录对应的那一次。",
    futureTime: "出生日期和时间不能晚于现在。", calculating: "正在计算行星位置…", calculated: "已使用 Swiss Ephemeris 在本地完成计算。",
    failed: "计算失败：{message}", preparing: "正在生成图片…", downloaded: "图片已保存。", chooseSaveImage: "请在系统菜单中选择“存储图像”保存到相册。", shared: "分享已完成。", linkCopied: "当前设备不支持分享图片，网站链接已复制。", exportFailed: "图片导出失败：{message}",
    shareTitle: "我的人生使用说明书", shareText: "这是我的人生使用说明书。", selectAmPm: "请选择上午或下午。", detailReading: "详细解读", close: "关闭",
  },
  en: {
    brand: "Pluto Life Manual",
    formEyebrow: "Life Manual", formTitle: "Know Yourself", name: "Name", year: "Year", month: "Month", day: "Day",
    hour: "Hour", minute: "Minute", ampm: "AM/PM", am: "AM", pm: "PM", birthLocation: "Birth location",
    locationPlaceholder: "City, district or region", locationSuggestions: "Birth location suggestions", clockOccurrence: "Clock occurrence",
    bodygraphLabel: "Life Manual bodygraph",
    firstOccurrence: "First occurrence", secondOccurrence: "Second occurrence", attribution: "Enter the full place directly; selecting a suggestion is optional.",
    generate: "Get Your Life Manual Free", yourChart: "Your Life Manual", emptyChart: "Enter details to generate.", editChart: "Edit Details", download: "Save Image", share: "Share", previewAlt: "Personal life manual",
    design: "Design", personality: "Personality", watermark: "Swiss Ephemeris · 88° pre-birth solar-arc · True Node", interpretationTitle: "Reading", celebrityTitle: "People with Similar Core Configurations", celebrityBasis: "Matched by type, authority, profile, and definition", celebrityNote: "Celebrity structures use public birth records; similarity means core configuration, not a complete chart, personality, experience, or destiny.", qrLabel: "Scan to create your life manual", privacyMode: "Privacy mode",
    searchingPlace: "Searching locations…", noPlace: "No suggestions yet. You can still generate the chart directly.", placeUnavailable: "Suggestions did not load. You can still generate the chart directly.",
    resolvingPlace: "Confirming the place and its local time…", placeNeedsDetail: "We could not confirm this place. Add the city, state or region, and country, then try again.", enterName: "Enter a name.",
    missingTime: "This local birth time did not exist because the clocks moved forward.", repeatedTime: "This clock time occurred twice. Choose which occurrence is on the birth record.",
    futureTime: "Birth date and time cannot be in the future.", calculating: "Calculating planetary positions…", calculated: "Chart calculated locally with Swiss Ephemeris.",
    failed: "Failed: {message}", preparing: "Preparing image…", downloaded: "Image saved.", chooseSaveImage: "Choose Save Image in the system menu to add it to Photos.", shared: "Shared.", linkCopied: "Image sharing is unavailable on this device. The site link was copied.", exportFailed: "Image export failed: {message}",
    shareTitle: "My Life Manual", shareText: "Here is my personal life manual.", selectAmPm: "Choose AM or PM.", detailReading: "Detailed Reading", close: "Close",
  },
};

const planetNames = {
  Sun: "太阳", Earth: "地球", "North Node": "北交点", "South Node": "南交点", Moon: "月亮", Mercury: "水星",
  Venus: "金星", Mars: "火星", Jupiter: "木星", Saturn: "土星", Uranus: "天王星", Neptune: "海王星", Pluto: "冥王星",
};
const propertyNames = {
  Type: "类型", Strategy: "策略", "Inner Authority": "内在权威", Profile: "人生角色", Definition: "定义",
  "Incarnation Cross": "轮回交叉", "Not Self Theme": "非自己主题", Digestion: "消化", Sense: "认知感官", Environment: "环境",
};
const valueNames = {
  Generator: "生产者", "Manifesting Generator": "显示生产者", Manifestor: "显现者", Projector: "投射者", Reflector: "反映者",
  "To Respond": "等待回应", "To Inform": "告知", "Wait for the Invitation": "等待邀请", "Wait a Lunar Cycle": "等待一个月亮周期",
  "Emotional - Solar Plexus": "情绪权威 · 太阳神经丛", Sacral: "荐骨权威", Splenic: "脾脏权威", "Ego Manifested": "意志显现权威",
  "Ego Projected": "意志投射权威", "Self-Projected": "自我投射权威", Lunar: "月亮权威", "Mental - Environment": "环境权威",
  "No Definition": "无定义", "Single Definition": "一分人", "Split Definition": "二分人", "Triple Split Definition": "三分人", "Quadruple Split Definition": "四分人",
  Frustration: "挫败", Anger: "愤怒", Bitterness: "苦涩", Disappointment: "失望", Satisfaction: "满足感", Peace: "平和", Success: "成功", Surprise: "惊喜",
  "Consecutive Appetite": "连续食欲", "Alternating Appetite": "交替食欲", "Open Taste": "开放味觉", "Closed Taste": "封闭味觉",
  "Hot Thirst": "热渴", "Cold Thirst": "冷渴", "Calm Touch": "平静触觉", "Nervous Touch": "紧张触觉", "High Sound": "高声音", "Low Sound": "低声音",
  "Direct Light": "直接光", "Indirect Light": "间接光", Smell: "嗅觉", Taste: "味觉", "Outer Vision": "外在视觉", "Inner Vision": "内在视觉",
  Feeling: "感觉", Touch: "触觉", Caves: "洞穴", Markets: "市场", Kitchens: "厨房", Mountains: "山脉", Valleys: "山谷", Shores: "海岸", "Natural Shores": "自然海岸", "Artificial Shores": "人工海岸",
};
const profileRoles = { Investigator: "研究者", Martyr: "体验者", Opportunist: "机会主义者", Hermit: "隐士", Heretic: "异端者", "Role Model": "榜样" };
const strategyGuidance = {
  "To Respond": "等待身体对眼前的人和事产生明确回应",
  "To Inform": "行动前先告知可能受影响的人",
  "Wait for the Invitation": "等待自己被看见，再接受真正合适的邀请",
  "Wait a Lunar Cycle": "给自己一个完整的月亮周期看清答案",
};
const authorityGuidance = {
  "Emotional - Solar Plexus": "不必当场答应，等情绪波浪平稳后再确认",
  Sacral: "留意身体当下自然出现的“愿意”或“不愿意”",
  Splenic: "相信当下安静、短暂却清楚的直觉",
  "Ego Manifested": "先确认自己是否真心想要，并愿意为它投入",
  "Ego Projected": "在正确的邀请中，听听自己真正想要什么",
  "Self-Projected": "把选择说出来，从自己的声音里听见方向",
  Lunar: "不急着定论，让不同时刻的感受帮你看清全貌",
  "Mental - Environment": "去到让自己舒服的环境，在值得信任的人面前说出想法",
};
const definitionGuidance = {
  "No Definition": "你会明显感受环境和他人的影响，给决定多一点时间很重要",
  "Single Definition": "你的内在运作较连贯，独处时也容易把事情想明白",
  "Split Definition": "你的不同部分常在交流和连接中被串起来，合适的互动会带来启发",
  "Triple Split Definition": "你需要在不同关系与场景间流动，思路才更容易慢慢整合",
  "Quadruple Split Definition": "你有多个相对独立的处理区块，给自己充足时间会更从容",
};
const typeGuidance = {
  Generator: "你拥有较稳定的生命力，当身体对一件事有真实回应时，持续投入会让你越做越有能量",
  "Manifesting Generator": "你的能量运作得快且容许多线推进，边做边调整很正常，关键是先有身体回应再加速",
  Manifestor: "你适合从内在冲动发起行动，不需要等待所有人认可，但事前告知会显著减少阻力",
  Projector: "你的优势在于看见人和系统如何更高效运作，与其长时间硬撑，不如把精力留给真正认可你的邀请",
  Reflector: "你对人群与环境的状态非常敏感，不急于固定定义自己，给时间观察变化更容易看清真实答案",
};
const profileLineGuidance = {
  1: "1号线需要先研究和建立安全的基础",
  2: "2号线需要独处来恢复天然才能，也常由别人看见你的长处",
  3: "3号线通过亲身试错得到最可靠的经验",
  4: "4号线的机会往往来自稳定的人际网络与信任",
  5: "5号线容易承接他人期待，说清边界会保护你的影响力",
  6: "6号线会在人生不同阶段中沉淀经验，最终以身作则地影响别人",
};
const profileGuidanceZh = {
  "5/1": "你倾向先深入调查、建立可靠基础，再向他人提供实际可行的解决方案。别人容易期待你解决问题，因此需要管理承诺与外界投射，避免承担并不属于你的责任",
};
const profileGuidanceEn = {
  "5/1": "You tend to investigate deeply, build a reliable foundation, and then offer practical solutions. Others may project the role of problem-solver onto you, so clear promises and boundaries matter",
};
const environmentGuidanceZh = {
  "Artificial Shores": "人工海岸不只指海边，更包括城市与郊区、商业与住宅、室内与室外，以及不同人群或行业交汇的过渡地带",
  "Natural Shores": "自然海岸不只指海边，也包括自然形成的边界、林地与空地、水域与陆地等过渡地带",
};
const environmentGuidanceEn = {
  "Artificial Shores": "Artificial Shores includes designed transition zones: city and suburb, commercial and residential areas, indoors and outdoors, or places where different groups and fields meet",
  "Natural Shores": "Natural Shores includes organically formed edges between land and water, woodland and open ground, or other natural transition zones",
};
const gateThemesZh = {
  1: "原创表达", 2: "感知方向", 3: "在混乱中开创新秩序", 4: "把疑问形成答案", 5: "建立稳定节奏", 6: "辨认关系边界", 7: "引导共同方向", 8: "以个人风格作出贡献",
  9: "聚焦细节", 10: "忠于真实自我", 11: "产生丰富构想", 12: "选择正确时机表达", 13: "倾听并保存经验", 14: "驾驭资源与能力", 15: "包容差异与极端", 16: "把热情练成技能",
  17: "形成有结构的观点", 18: "发现问题并推动改善", 19: "敏锐感知需要", 20: "在当下清楚行动", 21: "管理资源与边界", 22: "以情绪风度影响氛围", 23: "把复杂洞见说简单", 24: "反复思考后提炼理解",
  25: "以开放之心接纳", 26: "影响、说服与整合经验", 27: "照料与滋养", 28: "为真正有意义的事坚持", 29: "对正确体验全心投入", 30: "辨认欲望并经历情感", 31: "在被认可时发挥领导力", 32: "判断什么值得延续",
  33: "退后复盘并保存故事", 34: "运用纯粹生命力", 35: "通过经历推动变化", 36: "在未知与危机中成长", 37: "建立互惠的社群关系", 38: "为价值与目标而战", 39: "激发被压住的生命精神", 40: "独立承担并懂得休息",
  41: "启动新的想象周期", 42: "把成长周期完成", 43: "产生突破性洞见", 44: "识别过去留下的模式", 45: "汇聚并分配资源", 46: "在身体经验中发现幸运", 47: "从困惑中提炼意义", 48: "用深度解决问题",
  49: "依据原则推动改变", 50: "守护共同价值", 51: "以勇气唤醒自己和他人", 52: "在静止中保持专注", 53: "发起新的成长周期", 54: "把野心转化成进步动力", 55: "寻找内在精神丰盛", 56: "用故事带来启发",
  57: "捕捉当下直觉", 58: "以喜悦推动改善", 59: "打破隔阂并建立亲密", 60: "接纳限制并等待突变", 61: "探索内在真理", 62: "精确命名与表达细节", 63: "用怀疑检验可靠性", 64: "从混乱图像中整合意义",
};
const gateThemesEn = {
  1: "original self-expression", 2: "sensing direction", 3: "creating order from chaos", 4: "forming workable answers", 5: "steady natural rhythms", 6: "relationship boundaries", 7: "guiding shared direction", 8: "contribution through personal style",
  9: "focused attention", 10: "authentic self-conduct", 11: "generating ideas", 12: "well-timed expression", 13: "listening and preserving experience", 14: "power skills and resources", 15: "embracing human extremes", 16: "turning enthusiasm into skill",
  17: "structured opinions", 18: "correction and improvement", 19: "sensitivity to needs", 20: "clear action in the now", 21: "resource control and boundaries", 22: "emotional grace", 23: "making insight understandable", 24: "returning to an idea until it resolves",
  25: "open-hearted acceptance", 26: "influence and persuasion", 27: "care and nourishment", 28: "struggle for meaning", 29: "wholehearted commitment", 30: "desire and emotional experience", 31: "recognized leadership", 32: "instinct for continuity",
  33: "privacy and reflection", 34: "pure life-force power", 35: "growth through experience", 36: "learning through the unknown", 37: "reciprocal community", 38: "fighting for purpose", 39: "provoking spirit", 40: "independent work and rest",
  41: "initiating a new imaginative cycle", 42: "completing cycles of growth", 43: "breakthrough insight", 44: "recognizing past patterns", 45: "gathering and distributing resources", 46: "wisdom through the body", 47: "finding meaning in confusion", 48: "depth and practical solutions",
  49: "principled change", 50: "protecting shared values", 51: "awakening courage", 52: "stillness and concentration", 53: "starting new cycles", 54: "transforming ambition", 55: "inner abundance and spirit", 56: "stimulation through stories",
  57: "present-moment intuition", 58: "joyful improvement", 59: "breaking barriers to intimacy", 60: "accepting limits until change arrives", 61: "inner truth and mystery", 62: "precise naming and detail", 63: "testing through doubt", 64: "integrating meaning from confusion",
};
const celebrities = [
  { name: "Elon Musk", nameZh: "埃隆·马斯克", type: "Manifesting Generator", profile: "3/5", authority: "Sacral" },
  { name: "Nicole Kidman", nameZh: "妮可·基德曼", type: "Manifesting Generator", profile: "1/3", authority: "Sacral", definition: "Single Definition" },
  { name: "Bruno Mars", nameZh: "布鲁诺·马尔斯", type: "Manifesting Generator", profile: "1/3", authority: "Sacral", definition: "Single Definition" },
  { name: "Bruce Lee", nameZh: "李小龙", type: "Manifesting Generator", profile: "6/2", authority: "Emotional - Solar Plexus" },
  { name: "Arnold Schwarzenegger", nameZh: "阿诺德·施瓦辛格", type: "Manifesting Generator", profile: "5/1", authority: "Sacral", definition: "Single Definition" },
  { name: "Michael Jordan", nameZh: "迈克尔·乔丹", type: "Manifesting Generator", profile: "5/1", authority: "Emotional - Solar Plexus", definition: "Split Definition" },
  { name: "Martin Luther King Jr.", nameZh: "马丁·路德·金", type: "Manifesting Generator", profile: "5/1", authority: "Sacral", definition: "Single Definition" },
  { name: "Beyoncé", nameZh: "碧昂丝", type: "Generator", profile: "1/3", authority: "Sacral", definition: "Split Definition" },
  { name: "Stephen Hawking", nameZh: "斯蒂芬·霍金", type: "Generator", profile: "3/5", authority: "Sacral" },
  { name: "Warren Buffett", nameZh: "沃伦·巴菲特", type: "Generator", profile: "2/4", authority: "Emotional - Solar Plexus" },
  { name: "Steve Jobs", nameZh: "史蒂夫·乔布斯", type: "Generator", profile: "6/3", authority: "Emotional - Solar Plexus", definition: "Split Definition" },
  { name: "Oprah Winfrey", nameZh: "奥普拉·温弗瑞", type: "Generator", profile: "2/4", authority: "Emotional - Solar Plexus", definition: "Triple Split Definition" },
  { name: "Bert Convy", nameZh: "伯特·康维", type: "Generator", profile: "5/1", authority: "Sacral", definition: "Split Definition" },
  { name: "Claude Bernard", nameZh: "克洛德·贝尔纳", type: "Generator", profile: "5/1", authority: "Sacral", definition: "Split Definition" },
  { name: "Taylor Swift", nameZh: "泰勒·斯威夫特", type: "Projector", profile: "5/1", authority: "Splenic", definition: "Single Definition" },
  { name: "Leonardo DiCaprio", nameZh: "莱昂纳多·迪卡普里奥", type: "Projector", profile: "6/2", authority: "Emotional - Solar Plexus" },
  { name: "Freddie Mercury", nameZh: "弗雷迪·默丘里", type: "Projector", profile: "1/4", authority: "Splenic", definition: "Split Definition" },
  { name: "Magnus Carlsen", nameZh: "马格努斯·卡尔森", type: "Projector", profile: "2/5", authority: "Emotional - Solar Plexus" },
  { name: "Robert Oppenheimer", nameZh: "罗伯特·奥本海默", type: "Manifestor", profile: "6/3", authority: "Emotional - Solar Plexus" },
  { name: "Phyllis A. Whitney", nameZh: "菲莉丝·惠特尼", type: "Manifestor", profile: "4/1", authority: "Splenic", definition: "Single Definition" },
  { name: "Lupita Tovar", nameZh: "卢皮塔·托瓦尔", type: "Manifestor", profile: "2/4", authority: "Emotional - Solar Plexus", definition: "Single Definition" },
  { name: "Sandra Bullock", nameZh: "桑德拉·布洛克", type: "Reflector", profile: "2/4", authority: "Lunar", definition: "No Definition" },
  { name: "Kim Gordon", nameZh: "金·戈登", type: "Reflector", profile: "1/3", authority: "Lunar", definition: "No Definition" },
  { name: "Uri Geller", nameZh: "尤里·盖勒", type: "Reflector", profile: "6/2", authority: "Lunar", definition: "No Definition" },
];
let language = localStorage.getItem("pluto-language") || (navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en");
let statusState;

function t(key, values = {}) {
  return Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), copy[language][key] || key);
}

function setStatus(key, values = {}) {
  statusState = key ? { key, values } : null;
  status.textContent = key ? t(key, values) : "";
}

function translatedValue(key, value) {
  if (language !== "zh") return value;
  if (key === "Profile") {
    return value.replace(/(Investigator|Martyr|Opportunist|Hermit|Heretic|Role Model)/g, (role) => profileRoles[role]);
  }
  if (key === "Incarnation Cross") {
    return value
      .replace(/^Right Angle Cross of /, "右角度交叉 · ")
      .replace(/^Left Angle Cross of /, "左角度交叉 · ")
      .replace(/^Juxtaposition Cross of /, "并列交叉 · ");
  }
  return valueNames[value] || value;
}

function interpretation(data) {
  const properties = data.Properties;
  const consciousSun = data.Personality.Sun.Gate;
  const consciousEarth = data.Personality.Earth.Gate;
  const designSun = data.Design.Sun.Gate;
  const designEarth = data.Design.Earth.Gate;
  if (language === "en") {
    const profile = profileCode(properties.Profile);
    const profileText = profileGuidanceEn[profile] || `Your ${profile} profile combines two different ways of learning, contributing, and being perceived by others`;
    return `You are a ${properties.Type} with ${properties["Inner Authority"]} authority. When a specific person, task, or opportunity appears, let your strategy of ${properties.Strategy.toLowerCase()} reveal whether your body is genuinely available before committing energy.\n\n${profileText}. Your visible gift is ${gateThemesEn[consciousSun]}, grounded by ${gateThemesEn[consciousEarth]}.\n\nYour mission is better understood as a life theme: ${gateThemesEn[consciousSun]}, ${gateThemesEn[consciousEarth]}, ${gateThemesEn[designSun]}, and ${gateThemesEn[designEarth]} may repeatedly meet in your work, relationships, and creations. It does not prescribe a career. Seeing what needs correction is a gift; timing and receptivity determine whether it becomes help or friction.\n\nAligned engagement tends to bring ${properties.Sign.toLowerCase()}. When ${properties["Not Self Theme"].toLowerCase()} persists, pause and check whether pressure or expectation is pushing you ahead of a real response.`;
  }
  const type = translatedValue("Type", properties.Type);
  const profile = profileCode(properties.Profile);
  const theme = translatedValue("Not Self Theme", properties["Not Self Theme"]);
  const sign = translatedValue("Sign", properties.Sign);
  const strategy = strategyGuidance[properties.Strategy] || translatedValue("Strategy", properties.Strategy);
  const authority = authorityGuidance[properties["Inner Authority"]] || `依照${translatedValue("Inner Authority", properties["Inner Authority"])}做选择`;
  const profileText = profileGuidanceZh[profile] || `你的${profile}人生角色结合了两种不同的学习、贡献和被他人看见的方式`;
  return `你是${translatedValue("Inner Authority", properties["Inner Authority"])}的${type}。面对具体的人、事情与机会时，更适合${strategy}，再决定是否投入能量。重要选择不必只依赖头脑分析，可以${authority}。\n\n${profileText}。你最容易被看见的天赋是${gateThemesZh[consciousSun]}，并通过${gateThemesZh[consciousEarth]}把它落到现实。\n\n你的使命更适合理解为生命主题：${gateThemesZh[consciousSun]}、${gateThemesZh[consciousEarth]}、${gateThemesZh[designSun]}与${gateThemesZh[designEarth]}，可能反复出现在工作、关系和创作中；它不指定某一种职业。看见哪里需要修正是天赋，但对方是否准备好、表达时机与方式，决定它会成为帮助还是冲突。\n\n当你按照身体回应投入正确的事情时，通常更容易体验${sign}；当${theme}持续出现时，可以暂停一下，检查是否正被焦虑、证明或外界期待推着前进。`;
}

function detailedReadingSections(data) {
  const properties = data.Properties;
  const [firstLine, secondLine] = (properties.Profile.match(/^(\d)\/(\d)/) || []).slice(1).map(Number);
  const consciousSun = data.Personality.Sun.Gate;
  const consciousEarth = data.Personality.Earth.Gate;
  const designSun = data.Design.Sun.Gate;
  const designEarth = data.Design.Earth.Gate;
  const profileCodeValue = profileCode(properties.Profile);
  const environmentGuidance = language === "zh" ? environmentGuidanceZh[properties.Environment] : environmentGuidanceEn[properties.Environment];
  if (language === "en") {
    return [
      { title: "Core energy and strategy", text: `Your type is ${properties.Type}. Your strategy is ${properties.Strategy.toLowerCase()}. This is less about waiting passively and more about noticing which opportunities create a clear, sustainable engagement before committing your energy.` },
      { title: "Your natural gift", text: `Your conscious Sun is Gate ${consciousSun}, highlighting a visible gift for ${gateThemesEn[consciousSun]}. Profile line ${firstLine} shapes how you develop and express it. Gate ${consciousEarth} grounds this talent through ${gateThemesEn[consciousEarth]}, helping it become practical rather than remaining only potential.` },
      { title: "Your life theme (mission)", text: `Your incarnation cross is ${properties["Incarnation Cross"]}. In plain language, your life may repeatedly bring together ${gateThemesEn[consciousSun]}, ${gateThemesEn[consciousEarth]}, ${gateThemesEn[designSun]}, and ${gateThemesEn[designEarth]}. This is a recurring contribution and learning theme, not a job title or a fate you must force. You may notice what needs correcting quickly; timing, tone, and the other person's receptivity determine whether that insight becomes help or friction.` },
      { title: "How to make important decisions", text: `Your authority is ${properties["Inner Authority"]}. Give this inner signal more weight than urgency, other people's expectations, or the need to explain yourself immediately. For major choices, create enough space to recognize the same answer more than once.` },
      { title: "Profile and relationships", text: `${profileGuidanceEn[profileCodeValue] || `Your ${properties.Profile} profile combines two distinct ways of learning and being seen`}. One line describes how you consciously approach life; the other often appears naturally in how others experience you.` },
      { title: "Inner connections and pace", text: `Your ${properties.Definition.toLowerCase()} describes how defined areas of the chart communicate. Notice whether clarity arrives best alone, through conversation, or after moving between different people and settings. Your own repeatable pattern matters more than someone else's ideal routine.` },
      { title: "Body and environment clues", text: `${properties.Digestion}, Cognition: ${properties.Sense}, and ${properties.Environment} are practical observation points. ${environmentGuidance || "Experiment gently with which surroundings help your nervous system settle"}. Treat these as observations to test, not rigid rules.` },
      { title: "Drift and reset", text: `${properties["Not Self Theme"]} is a useful warning light, not a personal failure. When it repeats, reduce pressure, return to your strategy and authority, and review what your body was responding to when the choice began. Treat this manual as a set of experiments, not rigid rules.` },
    ];
  }
  const type = translatedValue("Type", properties.Type);
  const strategy = strategyGuidance[properties.Strategy] || translatedValue("Strategy", properties.Strategy);
  const authorityName = translatedValue("Inner Authority", properties["Inner Authority"]);
  const authority = authorityGuidance[properties["Inner Authority"]] || `依照${authorityName}做选择`;
  const profile = translatedValue("Profile", properties.Profile);
  const profileGuidance = [profileLineGuidance[firstLine], profileLineGuidance[secondLine]].filter(Boolean).join("；");
  const definition = definitionGuidance[properties.Definition] || `你的${translatedValue("Definition", properties.Definition)}描述了内在信息的连接方式`;
  const cross = translatedValue("Incarnation Cross", properties["Incarnation Cross"]);
  const theme = translatedValue("Not Self Theme", properties["Not Self Theme"]);
  return [
    { title: "核心能量与策略", text: `你是${type}。${typeGuidance[properties.Type] || "你需要观察自己的能量在哪些事情上会自然打开"}。你的策略是${strategy}。这不是被动等待，而是先辨认身体是否真的被某个人、机会或问题触发，再决定要不要投入。` },
    { title: "你的天赋", text: `你的人格太阳落在${consciousSun}号闸门，最容易被看见的天赋是${gateThemesZh[consciousSun]}。人格太阳的${firstLine}号线决定了你会怎样有意识地发展和表达它。${consciousEarth}号闸门的${gateThemesZh[consciousEarth]}是这份天赋的落地点，能帮助它从潜力变成别人真正感受到的价值。` },
    { title: "你的生命主题（使命）", text: `你的轮回交叉是${cross}。用大白话说，你的人生中可能反复出现${gateThemesZh[consciousSun]}、${gateThemesZh[consciousEarth]}、${gateThemesZh[designSun]}和${gateThemesZh[designEarth]}等主题，并逐渐把它们整合成自己的贡献方式。它不指定职业，也不是必须强求的命运任务。你可能很容易看见哪里不对，但对方是否准备好、表达时机与方式，决定修正会成为帮助还是冲突。` },
    { title: "重要决定怎么做", text: `你的内在权威是${authorityName}。${authority}。当选择涉及关系、工作、金钱或长期承诺时，不要让时间压力、别人的期待或“我应该马上回答”代替这个内在信号。给自己一点空间，看答案是否仍然稳定。` },
    { title: "人生角色与关系", text: `你的人生角色是${profile}。${profileGuidanceZh[profileCodeValue] || profileGuidance}。两条线一条更像你有意识的学习方式，另一条常是别人自然感受到的你。` },
    { title: "内在连接与行动节奏", text: `${definition}。观察自己是在独处时更容易理清，还是需要通过对话、换环境或接触不同的人才会慢慢完整。不要强迫自己套用别人的高效模板，找到可重复、不透支的节奏更重要。` },
    { title: "身体与环境线索", text: `你的消化是${translatedValue("Digestion", properties.Digestion)}，认知感官是${translatedValue("Sense", properties.Sense)}，适合的环境是${translatedValue("Environment", properties.Environment)}。${environmentGuidance || "这些线索指向什么空间更容易让神经系统放松"}。建议小范围实验，用真实感受验证，不用一次性改变全部生活。` },
    { title: "偏离信号与复位", text: `你的非自己主题是${theme}。它不代表你做错了，更像一盏警示灯：可能你正在用头脑强推、为证明自己而勉强投入，或留在不适合的关系与环境中。当它反复出现，先降低压力，回到自己的策略和权威，再回看当初的身体信号。把这份说明书当成实验地图，而不是僵硬规则。` },
  ];
}

function renderDetailedReading(data) {
  const readingSections = detailedReadingSections(data).map(({ title, text }) => {
    const section = document.createElement("section");
    const heading = document.createElement("h3");
    const paragraph = document.createElement("p");
    heading.textContent = title;
    paragraph.textContent = text;
    section.append(heading, paragraph);
    return section;
  });
  const celebritySection = document.createElement("section");
  const celebrityHeading = document.createElement("h3");
  const celebrityList = document.createElement("div");
  celebritySection.className = "detail-celebrities";
  celebrityHeading.textContent = language === "zh" ? "相似基础配置人物：详细说明" : "Similar core configurations: in detail";
  celebrityList.className = "detail-celebrity-list";
  celebrityList.replaceChildren(...getCelebrityMatches(data).map((celebrity) => {
    const item = document.createElement("article");
    const heading = document.createElement("h4");
    const paragraph = document.createElement("p");
    heading.textContent = language === "zh" ? celebrity.nameZh : celebrity.name;
    paragraph.textContent = celebrityDetailedReason(data.Properties, celebrity);
    item.append(heading, paragraph);
    return item;
  }));
  celebritySection.append(celebrityHeading, celebrityList);
  detailContent.replaceChildren(...readingSections, celebritySection);
}

function profileCode(value) {
  return value.match(/^(\d\/\d)/)?.[1] || value;
}

function celebrityScore(properties, celebrity) {
  const userProfile = profileCode(properties.Profile);
  const userLines = userProfile.split("/");
  const celebrityLines = celebrity.profile.split("/");
  let score = celebrity.type === properties.Type ? 60 : 0;
  if (celebrity.authority === properties["Inner Authority"]) score += 22;
  if (celebrity.profile === userProfile) score += 14;
  else score += celebrityLines.filter((line) => userLines.includes(line)).length * 4;
  if (celebrity.definition && celebrity.definition === properties.Definition) score += 8;
  return score;
}

function celebrityReason(properties, celebrity) {
  const userProfile = profileCode(properties.Profile);
  const sharedLines = celebrity.profile.split("/").filter((line) => userProfile.split("/").includes(line));
  const sameAuthority = celebrity.authority === properties["Inner Authority"];
  const sameDefinition = celebrity.definition === properties.Definition;
  if (language === "en") {
    const reasons = [`the same ${properties.Type} energy type`];
    if (sameAuthority) reasons.push(`the same ${properties["Inner Authority"]} authority`);
    if (celebrity.profile === userProfile) reasons.push(`the same ${userProfile} profile`);
    else if (sharedLines.length) reasons.push(`profile line ${sharedLines.join(" and ")}`);
    if (sameDefinition) reasons.push(`the same ${properties.Definition.toLowerCase()}`);
    return `You share ${reasons.join(", ")}.`;
  }
  const reasons = [`同为${translatedValue("Type", properties.Type)}`];
  if (sameAuthority) reasons.push(`同为${translatedValue("Inner Authority", properties["Inner Authority"])}`);
  if (celebrity.profile === userProfile) reasons.push(`同为${userProfile}人生角色`);
  else if (sharedLines.length) reasons.push(`共享${sharedLines.join("、")}号线特质`);
  if (sameDefinition) reasons.push(`同为${translatedValue("Definition", properties.Definition)}`);
  return `${reasons.join("，")}。`;
}

function getCelebrityMatches(data) {
  return celebrities
    .map((celebrity) => ({ ...celebrity, score: celebrityScore(data.Properties, celebrity) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 3);
}

function celebrityDetailedReason(properties, celebrity) {
  const userProfile = profileCode(properties.Profile);
  const sharedLines = celebrity.profile.split("/").filter((line) => userProfile.split("/").includes(line));
  const sameAuthority = celebrity.authority === properties["Inner Authority"];
  const sameProfile = celebrity.profile === userProfile;
  const sameDefinition = celebrity.definition === properties.Definition;
  if (language === "en") {
    const authorityText = sameAuthority
      ? `You also share ${properties["Inner Authority"]} authority, so the most reliable decision signal follows a similar inner mechanism.`
      : `Your authorities differ, so the timing and inner signal used for decisions should not be copied from their path.`;
    const profileText = sameProfile
      ? `The exact ${userProfile} profile match suggests a similar tension between how you consciously meet life and how others naturally perceive you.`
      : sharedLines.length
        ? `You share profile line ${sharedLines.join(" and ")}, while the other line changes how that quality is learned and expressed.`
        : `Your profiles differ, so the learning style and social role are not the same.`;
    const definitionText = sameDefinition ? ` Both charts also have ${properties.Definition.toLowerCase()}, adding a similar pattern of internal processing.` : "";
    return `The strongest connection is the shared ${properties.Type} energy type. ${authorityText} ${profileText}${definitionText} This is a structural comparison, not a prediction that your personality or life will resemble theirs.`;
  }
  const type = translatedValue("Type", properties.Type);
  const authorityText = sameAuthority
    ? `你们也拥有相同的${translatedValue("Inner Authority", properties["Inner Authority"])}，说明做重要决定时，可靠信号来自相似的内在机制。`
    : "你们的内在权威不同，所以不能照搬对方做决定的时机与方式。";
  const profileText = sameProfile
    ? `完全相同的${userProfile}人生角色，意味着你们在主动面对世界和被别人看见的方式上有相近张力。`
    : sharedLines.length
      ? `你们共享${sharedLines.join("、")}号线特质，但另一条线不同，会改变这种特质的学习路径与外在表达。`
      : "你们的人生角色不同，因此学习方式与关系位置并不相同。";
  const definitionText = sameDefinition ? `你们也同为${translatedValue("Definition", properties.Definition)}，内在信息的整合节奏更接近。` : "";
  return `最强的共同点是同为${type}，因此能量启动与行动策略有相似底层逻辑。${authorityText}${profileText}${definitionText}这只是结构对照，不代表你的性格、经历或人生结果会复制对方。`;
}

function renderCelebrityMatches(data) {
  celebrityMatches.replaceChildren(...getCelebrityMatches(data).map((celebrity, index) => {
    const item = document.createElement("article");
    const number = document.createElement("span");
    const content = document.createElement("div");
    const heading = document.createElement("h3");
    const reason = document.createElement("p");
    item.className = "celebrity-card";
    number.className = "celebrity-rank";
    number.textContent = String(index + 1).padStart(2, "0");
    heading.textContent = language === "zh" ? celebrity.nameZh : celebrity.name;
    reason.textContent = celebrityReason(data.Properties, celebrity);
    content.append(heading, reason);
    item.append(number, content);
    return item;
  }));
}

function formattedBirth(data) {
  if (language === "en" || !data.Meta?.BirthIso) return `${data.Properties.BirthDateLocal} in ${data.Properties.Location}`;
  const date = new Intl.DateTimeFormat("zh-CN", {
    timeZone: data.Meta.Timezone, year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(data.Meta.BirthIso));
  return `${date} · ${data.Properties.Location}`;
}

function privateBirthLine() {
  return language === "zh" ? "****年**月**日 **:** · ********" : "****-**-** **:** · ********";
}

const centerColors = {
  "head-center": "#a8a27c",
  "ajna-center": "#777168",
  "throat-center": "#b58b63",
  "g-center": "#ddbf70",
  "heart-center": "#c8afbd",
  "sacral-center": "#b8756e",
  "splenic-center": "#ad8764",
  "solar-plexus-center": "#a995b6",
  "root-center": "#c29d6b",
};

let graphTemplate;
let lastData;
let posterBlob;
let posterUrl;
let posterRenderVersion = 0;
let placeMatches = [];
let placeLabels = [];
let activePlaceIndex = -1;
let placeTimer;
let placeRequest;
let placeQueryVersion = 0;
const placeCache = new Map();
let selectedPlace = null;

function appendOptions(select, values, selected, includePlaceholder = true) {
  const options = values.map(({ value, label }) => {
    const option = document.createElement("option");
    const formatted = String(value).padStart(2, "0");
    option.value = formatted;
    option.textContent = label ?? formatted;
    option.selected = String(value) === String(selected);
    return option;
  });
  if (includePlaceholder) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "--";
    placeholder.disabled = true;
    placeholder.selected = selected === null || selected === undefined || selected === "";
    options.unshift(placeholder);
  }
  select.replaceChildren(...options);
}

function updateDays() {
  const year = Number(fields.year.value);
  const month = Number(fields.month.value);
  if (!year || !month) {
    appendOptions(fields.day, [], null);
    return;
  }
  const currentDay = Number(fields.day.value);
  const previous = currentDay ? Math.min(currentDay, new Date(year, month, 0).getDate()) : null;
  const days = Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => ({ value: index + 1 }));
  appendOptions(fields.day, days, previous);
}

function initializeSelectors() {
  const currentYear = new Date().getFullYear();
  appendOptions(fields.year, Array.from({ length: currentYear - 1899 }, (_, index) => ({ value: currentYear - index })), 1997);
  appendOptions(fields.month, Array.from({ length: 12 }, (_, index) => ({ value: index + 1 })), 7);
  appendOptions(fields.hour, Array.from({ length: 12 }, (_, index) => ({ value: index + 1 })), 7);
  appendOptions(fields.minute, Array.from({ length: 60 }, (_, index) => ({ value: index })), 7);
  updateDays();
  fields.day.value = "07";
  fields.ampm.value = "am";
  ampmButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.ampm === "am")));
}

function placeLabel(properties) {
  const parts = [properties.name, properties.district, properties.city, properties.county, properties.state, properties.country];
  return parts.filter((part, index) => part && parts.indexOf(part) === index).join(", ");
}

function resultLabel(place, query) {
  const fallback = placeLabel(place.properties);
  if (place.properties.countrycode !== "CN" || !/[\u3400-\u9fff]/.test(query)) return fallback;
  return query.trim().replace(/[\s,，、/]+/g, ", ");
}

function closePlaceResults() {
  locationResults.hidden = true;
  fields.location.setAttribute("aria-expanded", "false");
  fields.location.removeAttribute("aria-activedescendant");
  activePlaceIndex = -1;
}

function highlightPlace(index) {
  const options = [...locationResults.children];
  if (!options.length) return;
  activePlaceIndex = (index + options.length) % options.length;
  options.forEach((option, optionIndex) => {
    const isActive = optionIndex === activePlaceIndex;
    option.classList.toggle("active", isActive);
    option.setAttribute("aria-selected", String(isActive));
  });
  fields.location.setAttribute("aria-activedescendant", options[activePlaceIndex].id);
  options[activePlaceIndex].scrollIntoView({ block: "nearest" });
}

function resetClockOccurrence() {
  clockOccurrenceField.hidden = true;
  fields.clockOccurrence.value = "earlier";
}

function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function selectPlace(index) {
  const place = placeMatches[index];
  if (!place) return;
  const [longitude, latitude] = place.geometry.coordinates;
  if (![longitude, latitude].every(Number.isFinite)) return;
  const label = placeLabels[index] || placeLabel(place.properties);
  const timezone = inferTimezoneFromAddress(label)
    || (place.properties.countrycode === "CN" ? "Asia/Shanghai" : window.tzlookup(latitude, longitude));
  if (!isValidTimezone(timezone)) return;
  fields.location.value = label;
  selectedPlace = { label, coordinates: [longitude, latitude], timezone };
  fields.location.removeAttribute("aria-invalid");
  placeRequest?.abort();
  resetClockOccurrence();
  closePlaceResults();
}

function renderPlaceResults(features, query) {
  const labels = new Set();
  placeMatches = features.filter((place) => {
    const label = resultLabel(place, query);
    if (!label || labels.has(label)) return false;
    labels.add(label);
    return true;
  });
  placeLabels = placeMatches.map((place) => resultLabel(place, query));
  locationResults.replaceChildren(...placeMatches.map((place, index) => {
    const option = document.createElement("li");
    option.id = `location-option-${index}`;
    option.role = "option";
    option.tabIndex = -1;
    const label = placeLabels[index];
    const [primary, ...context] = label.split(", ");
    const name = document.createElement("strong");
    const detail = document.createElement("span");
    name.textContent = primary;
    detail.textContent = context.join(" · ");
    option.append(name, detail);
    option.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      selectPlace(index);
    });
    return option;
  }));
  locationResults.hidden = placeMatches.length === 0;
  fields.location.setAttribute("aria-expanded", String(placeMatches.length > 0));
  activePlaceIndex = -1;
  if (placeMatches.length) {
    setStatus(null);
    highlightPlace(0);
  } else {
    setStatus("noPlace");
  }
}

async function searchPlaces(query, queryVersion) {
  const cacheKey = `${language}:${query}`;
  if (placeCache.has(cacheKey)) {
    renderPlaceResults(placeCache.get(cacheKey), query);
    return;
  }
  placeRequest?.abort();
  const request = new AbortController();
  placeRequest = request;
  let timedOut = false;
  const timeout = window.setTimeout(() => {
    timedOut = true;
    request.abort();
  }, 12000);
  try {
    const features = await fetchPlaceCandidates(query, { language, signal: request.signal });
    if (queryVersion !== placeQueryVersion || fields.location.value.trim() !== query) return;
    placeCache.set(cacheKey, features);
    renderPlaceResults(features, query);
  } catch (error) {
    if ((error.name !== "AbortError" || timedOut) && queryVersion === placeQueryVersion) {
      closePlaceResults();
      setStatus("placeUnavailable");
    }
  } finally {
    window.clearTimeout(timeout);
  }
}

function cancelPlaceSearch() {
  placeQueryVersion += 1;
  placeRequest?.abort();
  closePlaceResults();
}

fields.location.addEventListener("input", () => {
  window.clearTimeout(placeTimer);
  placeRequest?.abort();
  placeQueryVersion += 1;
  selectedPlace = null;
  placeMatches = [];
  placeLabels = [];
  locationResults.replaceChildren();
  closePlaceResults();
  resetClockOccurrence();
  fields.location.removeAttribute("aria-invalid");
  setStatus(null);
  const query = fields.location.value.trim();
  if (query.length < 2) {
    closePlaceResults();
    return;
  }
  setStatus("searchingPlace");
  const queryVersion = placeQueryVersion;
  placeTimer = window.setTimeout(() => searchPlaces(query, queryVersion), 360);
});

fields.location.addEventListener("keydown", (event) => {
  if (event.isComposing) return;
  if (locationResults.hidden) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    highlightPlace(activePlaceIndex + 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    highlightPlace(activePlaceIndex - 1);
  } else if (event.key === "Enter" && placeMatches.length > 0) {
    event.preventDefault();
    selectPlace(activePlaceIndex >= 0 ? activePlaceIndex : 0);
  } else if (event.key === "Escape") {
    cancelPlaceSearch();
  }
});

fields.location.addEventListener("blur", () => window.setTimeout(closePlaceResults, 180));

function selectionFromPlace(place, label) {
  const [longitude, latitude] = place.geometry.coordinates;
  if (![longitude, latitude].every(Number.isFinite)) return null;
  const timezone = inferTimezoneFromAddress(label)
    || (place.properties.countrycode === "CN" ? "Asia/Shanghai" : window.tzlookup(latitude, longitude));
  if (!isValidTimezone(timezone)) return null;
  return { label, coordinates: [longitude, latitude], timezone };
}

async function resolveTypedPlace(query) {
  const inferredTimezone = inferTimezoneFromAddress(query);
  if (inferredTimezone) return { label: query, coordinates: null, timezone: inferredTimezone };

  setStatus("resolvingPlace");
  fields.location.setAttribute("aria-busy", "true");
  window.clearTimeout(placeTimer);
  placeQueryVersion += 1;
  closePlaceResults();
  placeRequest?.abort();
  const request = new AbortController();
  placeRequest = request;
  try {
    const cached = placeCache.get(`${language}:${query}`);
    const matches = cached?.length ? cached : await fetchPlaceCandidates(query, {
      language,
      signal: request.signal,
      fallbackDelay: 0,
    });
    const resolved = matches.map((place) => selectionFromPlace(place, query)).find(Boolean);
    if (resolved) {
      selectedPlace = resolved;
      fields.location.removeAttribute("aria-invalid");
      return resolved;
    }
  } catch (error) {
    if (error.name === "AbortError") return null;
  } finally {
    fields.location.removeAttribute("aria-busy");
  }

  fields.location.setAttribute("aria-invalid", "true");
  fields.location.focus();
  setStatus("placeNeedsDetail");
  return null;
}

function time24(hour, minute, ampm) {
  let value = Number(hour);
  if (value === 12) value = 0;
  if (ampm === "pm") value += 12;
  return { hour: value, minute: Number(minute) };
}

async function decodeImage(image) {
  if (image.decode) await image.decode();
  else if (!image.complete) await new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", reject, { once: true });
  });
}

async function loadExportAssets() {
  const background = new Image();
  background.src = "./assets/pluto-chart-mobile-v1.png";
  await Promise.all([decodeImage(background), decodeImage(chartQr)]);
}

async function loadGraphTemplate() {
  if (!graphTemplate) {
    const response = await fetch("./assets/bodygraph-template.svg?v=20260712-9");
    if (!response.ok) throw new Error("BodyGraph template failed to load");
    graphTemplate = await response.text();
  }
  graph.innerHTML = graphTemplate;
  const svg = graph.querySelector("svg");
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Life Manual BodyGraph");
  return svg;
}

function activeGates(data) {
  const design = new Set(Object.values(data.Design || {}).map((value) => value.Gate));
  const personality = new Set(Object.values(data.Personality || {}).map((value) => value.Gate));
  return { design, personality, all: new Set([...design, ...personality]) };
}

async function paintBodygraph(data) {
  const svg = await loadGraphTemplate();
  const active = activeGates(data);

  svg.querySelectorAll("[data-gate-number]").forEach((label) => {
    const gate = Number(label.dataset.gateNumber);
    const marker = label.previousElementSibling;
    const isActive = active.all.has(gate);
    if (marker) {
      marker.style.fill = isActive ? "#2b2430" : "#f7ecdc";
      marker.style.stroke = isActive ? "#b88a51" : "#cbbca8";
    }
    label.style.fill = isActive ? "#fbefdc" : "#503d3d";
  });

  svg.querySelectorAll("[data-gate-line]").forEach((line) => {
    const gate = Number(line.dataset.gateLine);
    const hasDesign = active.design.has(gate);
    const hasPersonality = active.personality.has(gate);
    if (hasDesign && hasPersonality) {
      line.style.fill = line.dataset.gateLineType === "design" ? "#8c3040" : "#302936";
    } else if (hasDesign) {
      line.style.fill = "#8c3040";
    } else if (hasPersonality) {
      line.style.fill = "#302936";
    } else {
      line.style.fill = "transparent";
    }
  });

  Object.entries(centerColors).forEach(([id]) => {
    const center = svg.querySelector(`#${id}`);
    if (!center) return;
    center.style.fill = "rgba(249, 238, 221, .94)";
    center.style.stroke = "#a87945";
  });
  for (const centerName of data["Defined Centers"] || []) {
    const id = centerName.replace(/\s+/g, "-");
    const center = svg.querySelector(`#${id}`);
    if (center) center.style.fill = centerColors[id];
  }
}

function row(name, item) {
  const iconClass = `wb-${name.replaceAll(" ", "-")}`;
  const label = language === "zh" ? planetNames[name] : name;
  return `<li><span><i class="${iconClass}" aria-hidden="true"></i><em>${label}</em></span><b>${item.Gate}.${item.Line}</b></li>`;
}

async function render(data) {
  await paintBodygraph(data);
  document.querySelector("#personName").textContent = privacyToggle.checked ? "***" : data.Properties.Name;
  document.querySelector("#birthLine").textContent = privacyToggle.checked ? privateBirthLine() : formattedBirth(data);
  document.querySelector("#designList").innerHTML = planets.map((planet) => row(planet, data.Design[planet])).join("");
  document.querySelector("#personalityList").innerHTML = planets.map((planet) => row(planet, data.Personality[planet])).join("");
  const keys = ["Type", "Strategy", "Inner Authority", "Profile", "Definition", "Incarnation Cross", "Not Self Theme", "Digestion", "Sense", "Environment"];
  document.querySelector("#properties").innerHTML = keys.map((key) => {
    const label = language === "zh" ? propertyNames[key] : (key === "Sense" ? "Cognition" : key);
    return `<div class="property"><b>${label}</b><span>${translatedValue(key, data.Properties[key])}</span></div>`;
  }).join("");
  document.querySelector("#interpretationText").textContent = interpretation(data);
  renderCelebrityMatches(data);
  renderDetailedReading(data);
}

function clearPoster() {
  posterRenderVersion += 1;
  posterBlob = undefined;
  if (posterUrl) URL.revokeObjectURL(posterUrl);
  posterUrl = undefined;
  chartPreview.removeAttribute("src");
  chartResult.removeAttribute("aria-busy");
  downloadButton.disabled = true;
  shareButton.disabled = true;
  privacyToggle.disabled = false;
  languageButtons.forEach((button) => { button.disabled = false; });
}

async function createPosterImage() {
  const renderVersion = ++posterRenderVersion;
  chartResult.setAttribute("aria-busy", "true");
  downloadButton.disabled = true;
  shareButton.disabled = true;
  privacyToggle.disabled = true;
  languageButtons.forEach((button) => { button.disabled = true; });
  try {
    await Promise.all([document.fonts.ready, loadExportAssets()]);
    const canvas = await window.html2canvas(chartPanel, {
      backgroundColor: "#0d0b12",
      logging: false,
      scale: 2,
      useCORS: true,
      windowWidth: 660,
      scrollX: 0,
      scrollY: 0,
      onclone: (documentClone) => {
        const source = documentClone.querySelector("#capture");
        source.classList.remove("capture-source");
        source.style.position = "static";
      },
    });
    const nextBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!nextBlob) throw new Error("Canvas could not be encoded");
    if (renderVersion !== posterRenderVersion) return;
    if (posterUrl) URL.revokeObjectURL(posterUrl);
    posterBlob = nextBlob;
    posterUrl = URL.createObjectURL(nextBlob);
    chartPreview.src = posterUrl;
    if (chartPreview.decode) await chartPreview.decode();
    downloadButton.disabled = false;
    shareButton.disabled = false;
  } finally {
    if (renderVersion === posterRenderVersion) {
      chartResult.removeAttribute("aria-busy");
      privacyToggle.disabled = false;
      languageButtons.forEach((button) => { button.disabled = false; });
    }
  }
}

function showFormView() {
  if (detailDialog.open) detailDialog.close();
  setStatus(null);
  closePlaceResults();
  chartResult.hidden = true;
  formPanel.hidden = false;
  shell.classList.remove("result-view");
  shell.classList.add("form-view");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function showChartView() {
  formPanel.hidden = true;
  chartResult.hidden = false;
  shell.classList.remove("form-view");
  shell.classList.add("result-view");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function applyLanguage(nextLanguage, rerender = true) {
  language = nextLanguage === "en" ? "en" : "zh";
  localStorage.setItem("pluto-language", language);
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = language === "zh" ? "Pluto 人生使用说明书" : "Pluto Life Manual";
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    element.alt = t(element.dataset.i18nAlt);
  });
  fields.location.placeholder = t("locationPlaceholder");
  locationResults.setAttribute("aria-label", t("locationSuggestions"));
  graph.setAttribute("aria-label", t("bodygraphLabel"));
  graph.querySelector("svg")?.setAttribute("aria-label", t("bodygraphLabel"));
  languageButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.language === language)));
  if (statusState) status.textContent = t(statusState.key, statusState.values);
  if (rerender && lastData) {
    render(lastData)
      .then(createPosterImage)
      .catch((error) => { setStatus("exportFailed", { message: error.message }); });
  }
}

languageButtons.forEach((button) => button.addEventListener("click", () => applyLanguage(button.dataset.language)));
ampmButtons.forEach((button) => button.addEventListener("click", () => {
  fields.ampm.value = button.dataset.ampm;
  ampmButtons.forEach((option) => option.setAttribute("aria-pressed", String(option === button)));
  ampmSwitch.removeAttribute("aria-invalid");
  fields.ampm.dispatchEvent(new Event("change", { bubbles: true }));
}));
privacyToggle.addEventListener("change", () => {
  if (!lastData) return;
  render(lastData)
    .then(createPosterImage)
    .catch((error) => { setStatus("exportFailed", { message: error.message }); });
});
detailButton.addEventListener("click", () => {
  if (lastData) detailDialog.showModal();
});
closeDetailButton.addEventListener("click", () => detailDialog.close());
detailDialog.addEventListener("click", (event) => {
  if (event.target === detailDialog) detailDialog.close();
});
editButton.addEventListener("click", showFormView);

function invalidateChart() {
  if (!lastData) return;
  lastData = undefined;
  clearPoster();
  document.querySelector("#personName").textContent = "-";
  document.querySelector("#birthLine").textContent = t("emptyChart");
  document.querySelector("#designList").replaceChildren();
  document.querySelector("#personalityList").replaceChildren();
  document.querySelector("#properties").replaceChildren();
  document.querySelector("#interpretationText").textContent = "";
  celebrityMatches.replaceChildren();
  detailContent.replaceChildren();
  paintBodygraph({ Design: {}, Personality: {}, "Defined Centers": [] }).catch((error) => {
    setStatus("failed", { message: error.message });
  });
}

fields.year.addEventListener("change", updateDays);
fields.month.addEventListener("change", updateDays);
[fields.year, fields.month, fields.day, fields.hour, fields.minute, fields.ampm].forEach((field) => field.addEventListener("change", resetClockOccurrence));
chartForm.addEventListener("input", invalidateChart);
chartForm.addEventListener("change", invalidateChart);

chartForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = event.submitter || document.querySelector("#chartForm button[type='submit']");
  if (submit.disabled) return;
  const name = fields.name.value.trim();
  if (!name) {
    fields.name.setAttribute("aria-invalid", "true");
    fields.name.focus();
    setStatus("enterName");
    return;
  }
  fields.name.removeAttribute("aria-invalid");
  if (!fields.ampm.value) {
    ampmSwitch.setAttribute("aria-invalid", "true");
    ampmButtons[0].focus();
    setStatus("selectAmPm");
    return;
  }
  ampmSwitch.removeAttribute("aria-invalid");
  const time = time24(fields.hour.value, fields.minute.value, fields.ampm.value);
  submit.disabled = true;
  try {
    const locationQuery = fields.location.value.trim();
    const place = selectedPlace?.label === locationQuery ? selectedPlace : await resolveTypedPlace(locationQuery);
    if (!place) return;
    selectedPlace = place;
    const candidates = localToUtcCandidates(
      Number(fields.year.value), Number(fields.month.value), Number(fields.day.value),
      time.hour, time.minute, place.timezone,
    );
    if (!candidates.length) throw new RangeError(t("missingTime"));
    if (candidates.length > 1 && clockOccurrenceField.hidden) {
      clockOccurrenceField.hidden = false;
      setStatus("repeatedTime");
      fields.clockOccurrence.focus();
      return;
    }
    const selectedUtc = fields.clockOccurrence.value === "later" ? candidates[candidates.length - 1] : candidates[0];
    if (selectedUtc > Date.now()) throw new RangeError(t("futureTime"));
    setStatus("calculating");
    const data = await calculateHumanDesign({
      name,
      location: place.label,
      year: Number(fields.year.value),
      month: Number(fields.month.value),
      day: Number(fields.day.value),
      hour: time.hour,
      minute: time.minute,
      timezone: place.timezone,
      timeDisambiguation: fields.clockOccurrence.value,
    });
    await render(data);
    lastData = data;
    setStatus("preparing");
    await createPosterImage();
    setStatus("calculated");
    showChartView();
  } catch (error) {
    console.error(error);
    setStatus("failed", { message: error.message });
  } finally {
    submit.disabled = false;
  }
});

function posterFileName() {
  const fileName = privacyToggle.checked ? "private" : (lastData?.Properties.Name || "life-manual");
  const safeName = fileName
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .trim()
    .slice(0, 80) || "life-manual";
  return `${safeName}-life-manual.png`;
}

function posterFile() {
  return new File([posterBlob], posterFileName(), { type: "image/png" });
}

function canShareFile(file) {
  try {
    return Boolean(navigator.share && navigator.canShare?.({ files: [file] }));
  } catch {
    return false;
  }
}

function downloadPoster() {
  const link = document.createElement("a");
  link.download = posterFileName();
  link.href = posterUrl;
  document.body.append(link);
  link.click();
  link.remove();
}

downloadButton.addEventListener("click", async () => {
  if (!lastData || !posterBlob || !posterUrl) return;
  downloadButton.disabled = true;
  try {
    const file = posterFile();
    const mobile = matchMedia("(pointer: coarse)").matches || /Android|iPad|iPhone|iPod/i.test(navigator.userAgent);
    if (mobile && canShareFile(file)) {
      setStatus("chooseSaveImage");
      await navigator.share({ files: [file] });
      setStatus("downloaded");
    } else {
      downloadPoster();
      setStatus("downloaded");
    }
  } catch (error) {
    if (error.name === "AbortError") setStatus("calculated");
    else {
      console.error(error);
      setStatus("exportFailed", { message: error.message });
    }
  } finally {
    downloadButton.disabled = !lastData || !posterBlob;
  }
});

shareButton.addEventListener("click", async () => {
  if (!lastData || !posterBlob || !posterUrl) return;
  shareButton.disabled = true;
  try {
    const file = posterFile();
    if (canShareFile(file)) {
      await navigator.share({ files: [file], title: t("shareTitle"), text: t("shareText") });
      setStatus("shared");
    } else if (navigator.share) {
      await navigator.share({ title: t("shareTitle"), text: t("shareText"), url: `${location.origin}${location.pathname}` });
      setStatus("shared");
    } else {
      await navigator.clipboard.writeText(`${location.origin}${location.pathname}`);
      setStatus("linkCopied");
    }
  } catch (error) {
    if (error.name === "AbortError") setStatus("calculated");
    else {
      console.error(error);
      setStatus("exportFailed", { message: error.message });
    }
  } finally {
    shareButton.disabled = !lastData || !posterBlob;
  }
});

paintBodygraph({ Design: {}, Personality: {}, "Defined Centers": [] }).catch((error) => {
  setStatus("failed", { message: error.message });
});
initializeSelectors();
applyLanguage(language, false);
