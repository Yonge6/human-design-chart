import { calculateHumanDesign, localToUtcCandidates } from "./human-design-engine.js?v=20260715-11";
import { fetchPlaceCandidates, inferTimezoneFromAddress } from "./src/services/location-service.js";
import { createHumanDesignProfileSnapshot } from "./src/engine/profile-snapshot.js";
import { DEFAULT_CONSENT, deleteCloudData, recordProductEvent, saveChartToCloud, updateConsent } from "./src/services/backend-service.js";
import { canUseSystemShare, isMobileDevice, sharePageLink } from "./src/services/sharing-service.js";
import { readStoredJson, writeStoredJson } from "./src/services/storage-service.js";
import { createBodygraphRenderer } from "./src/renderer/bodygraph-renderer.js";
import { renderPosterElement } from "./src/renderer/poster-renderer.js";

const publicAppUrl = "https://human-design.wonderelian.com/";
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
const shareLabel = document.querySelector("[data-share-label]");
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
const shareDetailButton = document.querySelector("#shareDetail");
const shareDetailLabel = document.querySelector("[data-detail-share-label]");
const detailContent = document.querySelector("#detailContent");
const celebrityMatches = document.querySelector("#celebrityMatches");
const languageButtons = [...document.querySelectorAll("[data-language]")];
const openHistoryButton = document.querySelector("#openHistory");
const openSettingsButton = document.querySelector("#openSettings");
const historyDialog = document.querySelector("#historyDialog");
const deleteHistoryDialog = document.querySelector("#deleteHistoryDialog");
const settingsDialog = document.querySelector("#settingsDialog");
const closeHistoryButton = document.querySelector("#closeHistory");
const closeSettingsButton = document.querySelector("#closeSettings");
const historyList = document.querySelector("#historyList");
const historyEmpty = document.querySelector("#historyEmpty");
const cancelHistoryDeleteButton = document.querySelector("#cancelHistoryDelete");
const confirmHistoryDeleteButton = document.querySelector("#confirmHistoryDelete");
const defaultPrivacyInput = document.querySelector("#defaultPrivacy");
const saveHistoryInput = document.querySelector("#saveHistory");
const cloudSaveInput = document.querySelector("#cloudSave");
const productAnalyticsInput = document.querySelector("#productAnalytics");
const deleteCloudDataButton = document.querySelector("#deleteCloudData");
const clearHistoryButton = document.querySelector("#clearHistory");
const nativePlugin = globalThis.Capacitor?.registerPlugin?.("PlutoNative") || null;

function currentShareUrl() {
  if (location.protocol === "http:" || location.protocol === "https:") {
    return new URL(location.pathname, location.origin).href;
  }
  return publicAppUrl;
}

const copy = {
  zh: {
    brand: "Pluto 人生使用说明书",
    brandShort: "人生使用说明书",
    formEyebrow: "人生使用说明书", formTitle: "认识你自己", name: "姓名", year: "年", month: "月", day: "日",
    hour: "时", minute: "分", ampm: "上午/下午", am: "上午", pm: "下午", birthLocation: "出生地点",
    locationPlaceholder: "城市、区县或地区", locationSuggestions: "出生地点建议", clockOccurrence: "重复时刻",
    bodygraphLabel: "人生使用说明书图谱",
    firstOccurrence: "第一次出现", secondOccurrence: "第二次出现", attribution: "可直接输入完整地点，无需选择候选。",
    generate: "免费获取人生使用说明书", yourChart: "你的人生使用说明书", emptyChart: "填写出生资料后生成。", editChart: "重新填写", download: "保存图片", share: "分享", previewAlt: "人生使用说明书",
    design: "设计", personality: "人格", watermark: "Swiss Ephemeris · 出生前回溯 88° 太阳弧 · True Node", interpretationTitle: "解读", celebrityTitle: "拥有相似基础配置的人物", celebrityBasis: "基于类型、权威、人生角色与定义匹配", celebrityNote: "名人结构参考公开出生资料；相似仅指基础配置，不代表完整图谱、性格、经历或命运相同。", qrLabel: "扫码获取", privacyMode: "隐私模式",
    searchingPlace: "正在搜索地点…", noPlace: "暂未显示候选，仍可直接点击生成人生使用说明书。", placeUnavailable: "搜索建议暂时未加载，仍可直接点击生成人生使用说明书。",
    resolvingPlace: "正在确认地点和当地时间…", placeNeedsDetail: "暂时无法确认这个地点，请补充城市、省/州和国家后再试。", enterName: "请输入姓名。",
    missingTime: "该出生时刻因夏令时向前调整而不存在。", repeatedTime: "这个时刻出现过两次，请选择出生记录对应的那一次。",
    futureTime: "出生日期和时间不能晚于现在。", calculating: "正在计算行星位置…", calculated: "已使用 Swiss Ephemeris 在本地完成计算。",
    failed: "计算失败：{message}", preparing: "正在生成图片…", downloaded: "图片已保存。", chooseSaveImage: "请在系统菜单中选择“存储图像”保存到相册。", shared: "分享已完成。", linkCopied: "当前设备不支持分享图片，网站链接已复制。", exportFailed: "图片导出失败：{message}",
    shareTitle: "我的人生使用说明书", shareText: "这是我的人生使用说明书。", shareReading: "分享", shareReadingText: "免费生成你的人生使用说明书与详细解读。", openingShareShort: "正在打开…", linkCopiedShort: "已复制", sharedShort: "已分享", cancelledShort: "已取消", downloadedShort: "已下载", selectAmPm: "请选择上午或下午。", detailReading: "详细解读", close: "关闭",
    history: "历史记录", settings: "隐私设置", localOnly: "仅保存在此设备", historyEmpty: "还没有保存的人生使用说明书。", openHistory: "打开", deleteHistory: "删除", confirmDeleteTitle: "删除这条记录？", confirmDeleteHint: "删除后无法恢复。", cancel: "取消", confirmDelete: "确认删除", openSource: "源代码",
    defaultPrivacy: "默认开启隐私模式", defaultPrivacyHint: "生成图片时自动隐藏姓名、日期、时间和地点。", saveHistory: "保存本地历史记录", saveHistoryHint: "可离线重新打开最近生成的说明书。", cloudSave: "将新生成的说明书保存到云端", cloudSaveHint: "关闭时不上传姓名、出生资料或图谱；默认关闭。", productAnalytics: "帮助我们改进 Pluto", productAnalyticsHint: "仅发送允许的匿名操作事件，不包含出生资料或完整图谱；默认关闭。", deleteCloudData: "删除全部云端数据", deleteCloudConfirm: "确定删除当前匿名身份的云端图谱和个人云端资料吗？本地历史不会被删除。", cloudDeleted: "云端数据已删除；本地历史保留。", clearHistory: "清空历史记录", privacyPolicy: "隐私政策", support: "帮助与支持", legalNotice: "法律声明", privacyNote: "云端保存和匿名统计均默认关闭；删除云端数据不会删除本设备的历史记录。", historyCleared: "历史记录已清空。",
  },
  en: {
    brand: "Pluto Life Manual",
    brandShort: "Life Manual",
    formEyebrow: "Life Manual", formTitle: "Know Yourself", name: "Name", year: "Year", month: "Month", day: "Day",
    hour: "Hour", minute: "Minute", ampm: "AM/PM", am: "AM", pm: "PM", birthLocation: "Birth location",
    locationPlaceholder: "City, district or region", locationSuggestions: "Birth location suggestions", clockOccurrence: "Clock occurrence",
    bodygraphLabel: "Life Manual bodygraph",
    firstOccurrence: "First occurrence", secondOccurrence: "Second occurrence", attribution: "Enter the full place directly; selecting a suggestion is optional.",
    generate: "Get Your Life Manual Free", yourChart: "Your Life Manual", emptyChart: "Enter details to generate.", editChart: "Edit Details", download: "Save Image", share: "Share", previewAlt: "Personal life manual",
    design: "Design", personality: "Personality", watermark: "Swiss Ephemeris · 88° pre-birth solar-arc · True Node", interpretationTitle: "Reading", celebrityTitle: "People with Similar Core Configurations", celebrityBasis: "Matched by type, authority, profile, and definition", celebrityNote: "Celebrity structures use public birth records; similarity means core configuration, not a complete chart, personality, experience, or destiny.", qrLabel: "Scan to get", privacyMode: "Privacy mode",
    searchingPlace: "Searching locations…", noPlace: "No suggestions yet. You can still generate the chart directly.", placeUnavailable: "Suggestions did not load. You can still generate the chart directly.",
    resolvingPlace: "Confirming the place and its local time…", placeNeedsDetail: "We could not confirm this place. Add the city, state or region, and country, then try again.", enterName: "Enter a name.",
    missingTime: "This local birth time did not exist because the clocks moved forward.", repeatedTime: "This clock time occurred twice. Choose which occurrence is on the birth record.",
    futureTime: "Birth date and time cannot be in the future.", calculating: "Calculating planetary positions…", calculated: "Chart calculated locally with Swiss Ephemeris.",
    failed: "Failed: {message}", preparing: "Preparing image…", downloaded: "Image saved.", chooseSaveImage: "Choose Save Image in the system menu to add it to Photos.", shared: "Shared.", linkCopied: "Image sharing is unavailable on this device. The site link was copied.", exportFailed: "Image export failed: {message}",
    shareTitle: "My Life Manual", shareText: "Here is my personal life manual.", shareReading: "Share", shareReadingText: "Create your free Life Manual and detailed reading.", openingShareShort: "Opening…", linkCopiedShort: "Copied", sharedShort: "Shared", cancelledShort: "Cancelled", downloadedShort: "Downloaded", selectAmPm: "Choose AM or PM.", detailReading: "Detailed Reading", close: "Close",
    history: "History", settings: "Privacy", localOnly: "Stored only on this device", historyEmpty: "No saved Life Manuals yet.", openHistory: "Open", deleteHistory: "Delete", confirmDeleteTitle: "Delete this record?", confirmDeleteHint: "This action cannot be undone.", cancel: "Cancel", confirmDelete: "Delete", openSource: "Open Source",
    defaultPrivacy: "Privacy mode by default", defaultPrivacyHint: "Hide name, date, time, and location in generated images.", saveHistory: "Save local history", saveHistoryHint: "Reopen recent Life Manuals while offline.", cloudSave: "Save new Life Manuals to the cloud", cloudSaveHint: "When off, names, birth details, and charts are not uploaded. Off by default.", productAnalytics: "Help us improve Pluto", productAnalyticsHint: "Send only allowlisted anonymous actions, never birth details or a full chart. Off by default.", deleteCloudData: "Delete all cloud data", deleteCloudConfirm: "Delete cloud charts and personal cloud data for the current anonymous identity? Local history will remain.", cloudDeleted: "Cloud data deleted. Local history remains.", clearHistory: "Clear history", privacyPolicy: "Privacy Policy", support: "Help & Support", legalNotice: "Legal Notice", privacyNote: "Cloud saving and anonymous analytics are off by default. Deleting cloud data does not delete this device's local history.", historyCleared: "History cleared.",
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
const typeStrengthsZh = {
  Generator: "你的核心优势是稳定、可持续的生命力，以及在真正有回应的事情上持续练习并形成专业深度的能力",
  "Manifesting Generator": "你的核心优势是多线整合、快速试验与边做边优化，能用较短路径把想法推向结果",
  Manifestor: "你的核心优势是发起、开路与创造行动势能，能够让原本停滞的事情开始运转",
  Projector: "你的核心优势是看见人、资源与系统如何更有效运作，并用精准观察帮助他人少走弯路",
  Reflector: "你的核心优势是敏锐读取群体与环境的真实状态，发现别人已经习惯而忽略的变化",
};
const typeStrengthsEn = {
  Generator: "Your core strength is sustainable life-force energy and the ability to build mastery through consistent engagement with work your body genuinely responds to",
  "Manifesting Generator": "Your core strength is integrating multiple tracks, testing quickly, and improving as you move, often finding a shorter path from idea to result",
  Manifestor: "Your core strength is initiating movement, opening new paths, and giving stalled situations the momentum to begin",
  Projector: "Your core strength is seeing how people, resources, and systems can work more effectively, then guiding attention toward the highest-leverage adjustment",
  Reflector: "Your core strength is sensing the true condition of a group or environment and noticing changes that others may have normalized",
};
const authorityStrengthsZh = {
  "Emotional - Solar Plexus": "你的优势是能从不同情绪位置看见事情的完整度，等波浪平稳后通常更容易作出经得起时间的决定",
  Sacral: "你的优势是身体会对眼前选项给出直接反馈，能帮助你快速识别什么值得持续投入",
  Splenic: "你的优势是对风险、时机与当下状态有快速而细腻的直觉辨识",
  "Ego Manifested": "你的优势是清楚感受自己真正想争取什么，并把意愿转化成有力量的行动",
  "Ego Projected": "你的优势是辨认什么承诺真正值得投入意志力，并在正确关系中发挥影响力",
  "Self-Projected": "你的优势是通过说出想法听见真实方向，声音常能帮你把身份与选择对齐",
  Lunar: "你的优势是拥有多角度观察力，让时间与不同环境帮助你形成更完整的判断",
  "Mental - Environment": "你的优势是借由合适环境与高质量对话整理思路，能够从交流中听见自己的清晰",
};
const authorityStrengthsEn = {
  "Emotional - Solar Plexus": "Your strength is seeing a decision from several emotional positions; once the wave settles, your choices can carry more depth and durability",
  Sacral: "Your strength is direct bodily feedback to what is in front of you, helping you recognize where sustained energy is genuinely available",
  Splenic: "Your strength is fast, subtle recognition of timing, risk, and what is healthy in the present moment",
  "Ego Manifested": "Your strength is knowing what you truly want and converting authentic will into decisive action",
  "Ego Projected": "Your strength is recognizing which commitments deserve your willpower and where your influence is genuinely invited",
  "Self-Projected": "Your strength is hearing direction through your own voice, using expression to align identity and choice",
  Lunar: "Your strength is multi-angle awareness, allowing time and changing environments to reveal a more complete decision",
  "Mental - Environment": "Your strength is clarifying thought through the right environment and high-quality dialogue",
};
const definitionStrengthsZh = {
  "No Definition": "你拥有很强的环境感受力与适应性，能够映照不同人群的状态",
  "Single Definition": "你的内在连接较完整，常能独立整合信息并形成连续行动",
  "Split Definition": "你的优势会在高质量连接中被激活，对话与协作常能带来关键启发",
  "Triple Split Definition": "你擅长从不同人群与场景中吸收信息，再把多个视角整合成更全面的理解",
  "Quadruple Split Definition": "你拥有多个稳定而专注的内部处理区域，适合给复杂问题足够时间逐层成熟",
};
const definitionStrengthsEn = {
  "No Definition": "You bring strong environmental sensitivity and adaptability, often reflecting the condition of a group with unusual clarity",
  "Single Definition": "Your internal connections are relatively self-contained, supporting independent integration and continuous action",
  "Split Definition": "Your strengths often activate through high-quality connection; conversation and collaboration can unlock key insight",
  "Triple Split Definition": "You can gather information across different people and settings, then synthesize several perspectives into a fuller view",
  "Quadruple Split Definition": "You have several stable internal processing areas and benefit from letting complex questions mature layer by layer",
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
  "1/3": "你擅长先研究清楚，再通过真实试验检验答案；优势是能把理论变成经得起现实验证的方法",
  "1/4": "你会先建立扎实基础，再通过稳定关系分享价值；优势是专业深度与信任影响力可以彼此放大",
  "2/4": "你拥有需要独处滋养的自然才能，也容易通过熟悉的人际网络被看见；优势是不用过度推销，也能在信任中获得机会",
  "2/5": "你既有自然天赋，也容易被期待提供解决方案；优势是能把看似轻松的能力转化为别人真正用得上的方法",
  "3/5": "你擅长通过试验快速识别什么有效，再把经验提炼成可复制的解决方案；优势是适应力、恢复力和实战判断",
  "3/6": "你会从亲身经验中积累智慧，并逐渐形成更长远的观察；优势是既理解现实复杂度，也能看见更成熟的方向",
  "4/6": "你的影响力来自关系信任与长期示范；优势是能连接合适的人，并用稳定行动让别人看见一种可行的生活方式",
  "4/1": "你拥有相对稳定的内在基础，并通过熟悉网络发挥影响力；优势是立场清楚、关系可靠，适合长期建设",
  "5/1": "你倾向先深入调查、建立可靠基础，再向他人提供实际可行的解决方案。别人容易期待你解决问题，因此需要管理承诺与外界投射，避免承担并不属于你的责任",
  "5/2": "你结合了自然才能与解决复杂问题的影响力；优势是能在被正确看见时，用简洁方式回应现实需要，同时保留必要的独处与边界",
  "6/2": "你拥有自然才能，也会随着人生经验逐渐形成榜样式影响力；优势是既能在独处中沉淀能力，也能用更成熟的视角启发别人",
  "6/3": "你通过真实经历理解世界，并把经验沉淀成长期智慧；优势是面对变化有恢复力，最终能以真实而非完美的方式影响他人",
};
const profileGuidanceEn = {
  "1/3": "You investigate before testing ideas in real life; your strength is turning theory into methods that can survive practical reality",
  "1/4": "You build a solid foundation and share value through trusted relationships; depth and relational influence reinforce one another",
  "2/4": "Your natural talents are restored in solitude and often recognized through familiar networks; trusted relationships can bring opportunity without constant self-promotion",
  "2/5": "You combine natural talent with the projection of being a practical problem-solver; your strength is turning what feels intuitive into something genuinely useful",
  "3/5": "You learn quickly through experimentation and can translate lived experience into scalable solutions; adaptability and practical judgment are central strengths",
  "3/6": "You accumulate wisdom through direct experience and gradually develop a longer view; your strength is understanding real complexity while seeing a more mature direction",
  "4/6": "Your influence grows through trusted relationships and long-term example; you connect the right people and make possibility visible through consistent action",
  "4/1": "You bring a relatively stable inner foundation and influence through familiar networks; clarity, reliability, and long-term building are key strengths",
  "5/1": "You tend to investigate deeply, build a reliable foundation, and then offer practical solutions. Others may project the role of problem-solver onto you, so clear promises and boundaries matter",
  "5/2": "You combine natural talent with strong problem-solving influence; when correctly recognized, you can answer real needs simply while protecting essential solitude and boundaries",
  "6/2": "You combine natural talent with an influence that matures into role-model wisdom; solitude refines your gifts, while perspective helps those gifts inspire others",
  "6/3": "You understand life through direct experience and gradually distill it into durable wisdom; resilience and honest example become important strengths",
};
const typeReassuranceZh = {
  Generator: "你不需要证明自己永远有力气。没有回应时的疲惫，不代表你懒惰或不够自律；它往往只是身体在提醒你，这件事并不值得继续消耗。真正适合你的方向，会让投入本身逐渐变成能量来源。",
  "Manifesting Generator": "你不需要因为兴趣变化、路径转弯或同时推进多件事而责怪自己。你并不是三心二意，而是通过行动快速辨认真正有效的路径。允许自己修正，比为了证明一致而困在旧选择里更诚实。",
  Manifestor: "你不需要先获得所有人的理解，才有资格开始。你对自主空间的需要并不等于难相处；当你愿意在行动前让重要的人知道方向，既能保留自由，也能减少不必要的误解与阻力。",
  Projector: "你不需要用持续忙碌证明价值。你的珍贵之处往往不是做得比所有人更多，而是比别人更早看见问题的关键。被正确看见与邀请，会让你的洞察落在真正愿意接住它的人身上。",
  Reflector: "你不需要急着给自己一个固定答案。对不同人和环境产生不同感受，并不代表你没有自我；这种流动性正是你读取世界的方式。合适的环境会让你越来越轻松地辨认什么属于自己。",
};
const typeWorkZh = {
  Generator: "你适合在有真实回应的领域长期打磨，把重复变成手感，把兴趣变成专业。比起不断追逐新鲜感，你更容易在持续投入中形成难以替代的深度。",
  "Manifesting Generator": "你适合需要整合、多线程推进和快速迭代的工作。你常能发现别人没想到的捷径，但真正的优势不是单纯求快，而是在快速行动后愿意回头校准，让结果越来越准确。",
  Manifestor: "你适合发起项目、定义新方向、推动从零到一。需要高度自主、能够决定节奏的空间，会比被过度管理的环境更能释放你的创造力。",
  Projector: "你适合诊断、顾问、策略、管理、设计与人才发展等需要看见系统规律的工作。你的价值常体现在一个关键判断，能够替团队节省大量试错和无效消耗。",
  Reflector: "你适合观察群体、文化、趋势与环境质量。研究、评估、策展、社群与组织观察等工作，能让你的敏感度成为集体的镜子，而不是个人的负担。",
};
const authorityCareZh = {
  "Emotional - Solar Plexus": "晚一点回答不是拖延，而是尊重自己的完整感受。高点时不必急着承诺，低点时也不必急着否定；真正适合你的答案，通常经得起情绪变化。",
  Sacral: "你未必总能立刻解释为什么愿意或不愿意，这并不代表答案不可靠。身体往往比语言更早知道方向，先尊重那份真实，再慢慢补上理由。",
  Splenic: "你的直觉通常很轻、很快，而且只说一次。它不像焦虑那样反复轰炸，也未必能提供完整逻辑；给自己更多安静，才更容易听见这份细微但准确的保护。",
  "Ego Manifested": "你不需要对每件事都证明意志力。真正值得承诺的事情，会让你发自内心地想要；选择少而重要的目标，反而能让你的意志产生更大影响。",
  "Ego Projected": "你的承诺需要发生在正确的关系和认可中。不是每一个请求都值得你动用意志力；被真正看见之后作出的选择，更容易让你既有力量，也不失去自己。",
  "Self-Projected": "当你把选择说出来时，留意自己的声音是变得开阔、笃定，还是越来越收缩。你不需要从别人那里得到标准答案，真正的方向常藏在你说话时呈现出来的自己里。",
  Lunar: "需要更长时间并不意味着你优柔寡断。你的清晰来自多个时刻、多个环境与多种感受的共同验证；允许答案成熟，是你对重大选择最负责任的方式。",
  "Mental - Environment": "你不是靠独自在头脑里反复推演获得清晰。来到舒服的环境，在不替你作决定的人面前把想法说出来，常能帮助你听见真正属于自己的方向。",
};
const profileCareZh = {
  "1/3": "你会希望先弄懂再行动，却又必须在现实中验证。走过弯路并不推翻你的准备，它会让你的知识长出真正可靠的根。",
  "1/4": "你对基础和关系都很认真。无需为了扩大影响力而勉强经营所有关系，少数稳定、互相信任的连接更能承载你的价值。",
  "2/4": "你既需要被人看见，也需要拥有不被打扰的空间。独处不是逃避，而是让天然能力恢复清晰；真正适合你的机会常从信任关系中自然出现。",
  "2/5": "别人可能在你还没准备好时就期待你给出答案。你可以先退回自己的空间确认能力和意愿，再决定是否回应；被需要不等于必须负责。",
  "3/5": "你的经验常比标准答案更真实。试错不是失败，而是你识别可行方案的方式；但你也不必替所有人承担实验后的期待，分享经验时保留边界同样重要。",
  "3/6": "有些阶段可能让你觉得人生反复推倒重来。其实每一次经历都在扩充你的判断，时间会把零散体验变成一种更宽厚、更可信的智慧。",
  "4/6": "你重视信任，也会观察一个人是否值得长期同行。你的影响力不需要喧闹，它会在稳定关系和持续示范中慢慢累积。",
  "4/1": "你的内在立场较稳定，不必为了取悦所有人频繁改变。真正适合的关系会尊重你的基础，并让你的坚定成为可靠而不是僵硬。",
  "5/1": "你可能经常被当成能够解决问题的人，甚至承接超出能力范围的期待。被误解不代表你不够好；先研究、说清边界、只承诺真正能完成的事，会保护你的信誉与善意。",
  "5/2": "你既容易被期待，也需要独处保存天然能力。不是每一次呼唤都必须回应；当问题真正适合你、对方也愿意配合时，你的解决能力才最有力量。",
  "6/2": "你需要撤退、观察和沉淀，也可能在某些阶段对外界期待感到疲惫。暂时不站出来并不代表没有价值；你的成熟影响力，往往来自那些安静整合自己的时间。",
  "6/3": "你既经历现实碰撞，也会逐渐站到更远的位置看人生。无需把自己包装成从不出错的人，你真正能带给别人的，是经历过之后仍然诚实、柔软并愿意继续前进。",
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
const historyStorageKey = "pluto-chart-history-v1";
const settingsStorageKey = "pluto-app-settings-v1";
const defaultSettings = { privacyByDefault: false, keepHistory: true, ...DEFAULT_CONSENT };

let appSettings = { ...defaultSettings, ...readStoredJson(settingsStorageKey, {}) };
let historyEntries = readStoredJson(historyStorageKey, []);
if (!Array.isArray(historyEntries)) historyEntries = [];
historyEntries = historyEntries.filter((entry) => (
  typeof entry?.id === "string"
  && entry.data?.Properties
  && entry.data?.Meta
));
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
    const typeStrength = typeStrengthsEn[properties.Type];
    const authorityStrength = authorityStrengthsEn[properties["Inner Authority"]];
    const definitionStrength = definitionStrengthsEn[properties.Definition];
    return `Core advantage: ${typeStrength}. ${authorityStrength}. Your strategy of ${properties.Strategy.toLowerCase()} helps direct these strengths toward people, work, and opportunities that can truly use them.\n\nTalent combination: ${profileText}. Your visible gift is ${gateThemesEn[consciousSun]}, grounded through ${gateThemesEn[consciousEarth]}. Together, these qualities help you turn natural ability into value that other people can recognize and use.\n\nLife theme: ${gateThemesEn[consciousSun]}, ${gateThemesEn[consciousEarth]}, ${gateThemesEn[designSun]}, and ${gateThemesEn[designEarth]} may repeatedly meet in your work, relationships, and creations. This does not prescribe a career; it describes the kind of contribution that becomes stronger as you trust your own design. Your ability to notice what can be improved is especially valuable when timing and receptivity are present.\n\nBest expression: ${definitionStrength}. Aligned engagement tends to bring ${properties.Sign.toLowerCase()}. If ${properties["Not Self Theme"].toLowerCase()} persists, treat it as a useful recalibration signal rather than a flaw: reduce pressure, return to your authority, and redirect your strengths toward what produces a genuine inner yes.`;
  }
  const type = translatedValue("Type", properties.Type);
  const profile = profileCode(properties.Profile);
  const theme = translatedValue("Not Self Theme", properties["Not Self Theme"]);
  const sign = translatedValue("Sign", properties.Sign);
  const strategy = strategyGuidance[properties.Strategy] || translatedValue("Strategy", properties.Strategy);
  const authority = authorityGuidance[properties["Inner Authority"]] || `依照${translatedValue("Inner Authority", properties["Inner Authority"])}做选择`;
  const profileText = profileGuidanceZh[profile] || `你的${profile}人生角色结合了两种不同的学习、贡献和被他人看见的方式`;
  const typeStrength = typeStrengthsZh[properties.Type];
  const authorityStrength = authorityStrengthsZh[properties["Inner Authority"]];
  const definitionStrength = definitionStrengthsZh[properties.Definition];
  return `核心优势：${typeStrength}。${authorityStrength}。你的策略是${strategy}，它能帮助你把宝贵能量放到真正值得的人、事情与机会中。\n\n天赋组合：${profileText}。你最容易被看见的天赋是${gateThemesZh[consciousSun]}，并能通过${gateThemesZh[consciousEarth]}把它落到现实。这组组合让你的优势不只停留在想法，也更容易转化成别人能感受到的价值。\n\n生命主题：${gateThemesZh[consciousSun]}、${gateThemesZh[consciousEarth]}、${gateThemesZh[designSun]}与${gateThemesZh[designEarth]}，可能反复出现在工作、关系和创作中。它不指定职业，而是在提醒你：越信任自己的节奏与判断，这些能力越容易形成独特贡献。你看见改善空间的能力很珍贵，在对方准备好时表达，会更有影响力。\n\n最佳发挥方式：${definitionStrength}。重要选择时可以${authority}。当你把优势用在正确方向，通常更容易体验${sign}；若${theme}持续出现，把它当成校准信号，而不是缺点，先降低压力，再回到真正让身体有回应的方向。`;
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
      { title: "First, what you do not need to prove", text: `You do not need to become a louder, faster, or more conventional version of yourself in order to be valuable. ${typeStrengthsEn[properties.Type]}.\n\nWhen your natural rhythm differs from the people around you, it can be tempting to interpret that difference as a flaw. This reading invites another possibility: the difference may be the exact condition that allows your strengths to emerge. The goal is not to perform your design perfectly, but to notice where life feels more honest, sustainable, and alive.` },
      { title: "Your core energy and strategy", text: `Your type is ${properties.Type}, and your strategy is ${properties.Strategy.toLowerCase()}. Strategy is not a rule that makes life smaller. It is a way to protect your energy from commitments that look correct externally but create ongoing resistance internally.\n\nWatch what happens after the first excitement or pressure fades. The right direction usually gives your energy somewhere meaningful to go. It may still require effort, but the effort tends to build capacity rather than quietly draining your sense of self.` },
      { title: "The gifts people can see", text: `Your conscious Sun is Gate ${consciousSun}, highlighting a visible gift for ${gateThemesEn[consciousSun]}. Gate ${consciousEarth} grounds that gift through ${gateThemesEn[consciousEarth]}, helping it become useful in real situations rather than remaining only potential.\n\nProfile line ${firstLine} shapes how you consciously develop this talent. The deepest value is not a single trait, but the combination: what you notice, how you stabilize it, and how you translate it into something another person can actually receive.` },
      { title: "The strengths working underneath", text: `Your design Sun and Earth bring ${gateThemesEn[designSun]} and ${gateThemesEn[designEarth]} into the background of your life. These qualities may be easier for other people to notice than for you to name. They often appear in spontaneous choices, body language, recurring instincts, and the role you naturally take when something real is happening.\n\nYou do not need to force these traits into performance. They become more trustworthy when you create enough space for the body to respond before the mind begins managing the outcome.` },
      { title: "Your life theme and contribution", text: `Your incarnation cross is ${properties["Incarnation Cross"]}. In practical terms, ${gateThemesEn[consciousSun]}, ${gateThemesEn[consciousEarth]}, ${gateThemesEn[designSun]}, and ${gateThemesEn[designEarth]} may repeatedly meet in your work, relationships, and creations.\n\nThis is not a fixed occupation or a destiny you must chase. It is a pattern of contribution that becomes clearer as you live more honestly. If you notice what can be improved quickly, that discernment is a gift. Timing, tone, and receptivity help the same insight land as support instead of criticism.` },
      { title: "How your best decisions feel", text: `Your authority is ${properties["Inner Authority"]}. ${authorityStrengthsEn[properties["Inner Authority"]]}. Give this signal more weight than urgency, social pressure, or the need to produce an immediate explanation.\n\nThe goal is not perfect certainty. It is a decision your whole system can support without constant inner negotiation afterward. A choice can be challenging and still be correct; the useful distinction is whether the challenge feels alive and meaningful, or whether you are repeatedly abandoning yourself to maintain it.` },
      { title: "Profile, expectations, and being understood", text: `${profileGuidanceEn[profileCodeValue] || `Your ${properties.Profile} profile combines two distinct ways of learning and being seen`}.\n\nOther people may recognize a role in you before you have consciously chosen it. That recognition can open doors, but it can also create expectations. Clear boundaries are not a rejection of connection. They allow your generosity, skill, and influence to remain genuine rather than becoming an obligation built from someone else's projection.` },
      { title: "Relationships and emotional honesty", text: `In close relationships, your design does not ask you to be endlessly available. It asks for enough honesty to distinguish care from self-abandonment. Notice which relationships make your body soften, your voice become clearer, and your natural pace feel welcome.\n\nThe right people do not require you to erase your timing in order to remain connected. They may not understand every internal signal, but they can respect the space you need to reach a real answer. That respect creates more intimacy than a quick yes offered out of fear.` },
      { title: "Work, creativity, and sustainable impact", text: `${definitionStrengthsEn[properties.Definition]}. Your ${properties.Definition.toLowerCase()} describes how internal clarity tends to connect and move.\n\nAt work, your strongest contribution often appears when the task uses both your natural energy pattern and your visible gate themes. Build systems around the way clarity actually arrives for you. A workflow that respects your design can improve not only productivity, but also the quality, originality, and emotional sustainability of what you create.` },
      { title: "Body, cognition, and the places that support you", text: `${properties.Digestion}, Cognition: ${properties.Sense}, and ${properties.Environment} offer practical ways to support your nervous system. ${environmentGuidance || "Experiment gently with which surroundings help your body settle"}.\n\nCognition points to a sensory channel that may register useful information before the mind can explain it. Treat these variables as invitations to experiment, not strict lifestyle rules. Keep the conditions that bring steadier attention, easier breathing, clearer perception, and a quieter need to force yourself.` },
      { title: "When you drift away from yourself", text: `${properties.Sign} is the signature that often appears when your strengths are being used in the right context. ${properties["Not Self Theme"]} is not a weakness, punishment, or verdict. It is an early signal that your energy may be serving pressure instead of truth.\n\nWhen it repeats, respond with curiosity rather than self-criticism. Ask what you agreed to before your inner authority was ready, where you are trying to prove value, and what your body has been quietly saying. Recalibration is not going backward; it is a mature use of self-trust.` },
      { title: "A gentle practice for the next few weeks", text: `Before one meaningful decision each day, pause long enough to notice your authority before explaining the choice. Keep a short record of what created energy, what reduced it, and what brought a sense of ${properties.Sign.toLowerCase()}.\n\nYou do not need to redesign your entire life at once. One honest response, one clearer boundary, and one environment that lets your nervous system settle can begin to change the quality of many decisions that follow.` },
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
  const sign = translatedValue("Sign", properties.Sign);
  const typeReassurance = typeReassuranceZh[properties.Type] || "";
  const typeWork = typeWorkZh[properties.Type] || "";
  const authorityCare = authorityCareZh[properties["Inner Authority"]] || "";
  const profileCare = profileCareZh[profileCodeValue] || "";
  return [
    { title: "先说最重要的：你不需要变成别人", text: `${typeReassurance}\n\n这份图不是要你把自己修理成一个更标准的人，而是帮助你看见：很多曾经被误解成缺点的地方，可能只是你的运作方式与周围人的期待不同。你不需要完美执行任何规则。只要开始分辨哪些选择让自己更真实、稳定、有生命力，就已经在慢慢回到自己的位置。` },
    { title: "你的核心能量优势", text: `你是${type}。${typeStrengthsZh[properties.Type]}。你的策略是${strategy}，它不是让你退缩，而是帮你筛掉那些表面正确、实际却不断消耗你的方向。\n\n真正适合你的事情未必轻松，但通常会让你在投入之后更有力量、更愿意继续，也更容易从过程中获得${sign}。相反，如果一件事长期只剩责任、证明和自我催促，就值得停下来听听身体是不是早已给过不同答案。` },
    { title: "别人最容易看见的天赋", text: `你的人格太阳落在${consciousSun}号闸门，最容易被别人看见的天赋是${gateThemesZh[consciousSun]}；${consciousEarth}号闸门的${gateThemesZh[consciousEarth]}，则帮助这份天赋在现实中站稳。\n\n${firstLine}号线影响你主动发展能力的方式。你的价值并不只是“拥有某种天赋”，而是能把看到的、理解的和坚持的东西，逐渐变成别人真正感受得到的帮助。很多时候，你可能已经在自然使用这份能力，只是因为它对你太熟悉，反而低估了它的分量。` },
    { title: "你未必意识到的潜在力量", text: `设计太阳与地球带来${gateThemesZh[designSun]}和${gateThemesZh[designEarth]}。这部分更像身体自带的推动力，不一定是你刻意经营的形象，却常在真实场景、临场选择、压力反应和他人对你的评价里出现。\n\n${secondLine}号线也影响别人自然感受到的你。你不需要把这些特质包装成表演；越允许身体先反应、越少急着管理别人怎么看，它们越容易以稳定而可信的方式出现。` },
    { title: "你的生命主题与独特贡献", text: `你的轮回交叉是${cross}。用大白话说，${gateThemesZh[consciousSun]}、${gateThemesZh[consciousEarth]}、${gateThemesZh[designSun]}和${gateThemesZh[designEarth]}，可能反复出现在工作、关系与创作中。\n\n它不指定职业，也不是一项必须完成的命运任务。它更像一个逐渐浮现的主题：当你不再勉强成为别人期待的样子，这些能力会自然组合成你的贡献方式。你可能很快看见哪里可以优化，这种辨识力本身非常珍贵；配合合适的时机、语气和对方的接受度，会更容易从“看见问题”走向真正的帮助与影响。` },
    { title: "做决定时，怎样才算对自己诚实", text: `你的内在权威是${authorityName}。${authorityStrengthsZh[properties["Inner Authority"]]}。实际使用时，可以${authority}。\n\n${authorityCare}面对关系、工作、金钱或长期承诺，不必追求头脑里百分之百确定的答案。更重要的是找到一个身体愿意支持、之后不需要持续说服自己的选择。正确并不等于没有困难，而是困难之中仍然有一部分你愿意在场。` },
    { title: "人生角色：你如何成长，也如何被看见", text: `你的人生角色是${profile}。${profileGuidanceZh[profileCodeValue] || profileGuidance}。\n\n${profileCare}两条线一条更像你主动学习、建立能力的方式，另一条常是别人自然感受到的你。你的影响力不需要来自迎合所有人，而是来自对能力、边界与承诺的诚实。越清楚自己能提供什么、暂时不能承担什么，你的善意和专业越不容易被消耗。` },
    { title: "关系中的你：亲近不等于失去自己", text: `在关系里，你的优势不是永远配合，而是有能力以真实状态进入连接。可以观察：哪些人让你的身体更放松、声音更自然、节奏被尊重；又有哪些关系让你总在提前答应、解释自己、担心拒绝后会失去爱。\n\n真正适合你的关系未必完全理解你的所有内在信号，但会愿意尊重你的时间与边界。一个出于害怕而给出的“可以”，通常不会带来真正亲密；一个经过内在确认的“愿意”，反而更有温度、更能长久。` },
    { title: "工作、创造力与真正适合你的成就感", text: `${typeWork}\n\n你的人格太阳与地球提示，你在工作中尤其可以发挥${gateThemesZh[consciousSun]}与${gateThemesZh[consciousEarth]}。与其只问“什么工作最体面”，不如也问：什么问题会让你愿意持续研究？什么成果完成后，身体会出现真实的满足或轻松？成就感不只来自被认可，也来自知道自己没有在成功的路上弄丢自己。` },
    { title: "你的整合方式与自然节奏", text: `${definitionStrengthsZh[properties.Definition]}。${definition}。\n\n观察自己是在独处时更容易理清，还是在对话、协作、移动或换环境后出现关键连接。你不必强迫自己套用别人的效率模板。真正稳定的节奏，应该让你可以反复使用，而不是每次完成任务都需要很久才能恢复。尊重自己的整合方式，会同时提升判断质量与创造力。` },
    { title: "身体、认知与环境在默默支持你", text: `你的消化是${translatedValue("Digestion", properties.Digestion)}，认知感官是${translatedValue("Sense", properties.Sense)}，适合的环境是${translatedValue("Environment", properties.Environment)}。${environmentGuidance || "这些线索指向什么空间更容易让神经系统放松"}。\n\n这些并不是必须严格执行的生活规定，而是邀请你重新相信身体。可以小范围测试光线、声音、空间、人群密度和信息输入方式，观察什么条件会让呼吸更深、注意力更稳、内心不再那么急。身体放松时，你的优势通常更容易被调用。` },
    { title: "当你偏离自己时，请先不要责怪自己", text: `你的正向信号是${sign}，它常提示优势正在正确场景中运作。${theme}则不是缺点、惩罚或失败，而是一盏很有价值的预警灯：可能你正在用头脑强推，承接不属于自己的期待，或把能力放在一个无法回应你的环境里。\n\n当${theme}反复出现，不需要立刻否定整段人生。先问自己：我是不是在内在权威准备好之前就答应了？是不是为了证明价值而持续消耗？身体最初的声音是什么？愿意重新选择，不代表退步，而是你开始认真站在自己这一边。` },
    { title: "接下来可以怎样温柔地实践", text: `未来几周，不需要一次改变所有生活。每天只挑一个有分量的选择，在回答前多停一会儿，先留意内在权威，再听头脑解释。简单记录三件事：什么让你更有能量，什么让你明显收缩，什么时刻带来了${sign}。\n\n也可以练习一个更清楚的边界，例如“我需要晚一点回复”“这件事我暂时不能承诺”或“我愿意，但希望用自己的节奏完成”。你不必靠剧烈改变证明成长。一个真实的回应、一个不再勉强的决定、一个让身体安定的环境，都可能慢慢改变之后许多选择的质量。` },
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
    .slice(0, 2);
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
    return `The strongest connection is the shared ${properties.Type} energy type, which points to a similar foundation for using energy and creating momentum. ${authorityText} ${profileText}${definitionText} The useful comparison is the shared strength pattern: how capacity, decisions, and influence may be directed. It is structural inspiration, not a prediction that your personality or life will resemble theirs.`;
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
  return `最强的共同点是同为${type}，因此能量启动与行动策略有相似底层逻辑，也可能共享某些把优势转化为成果的方式。${authorityText}${profileText}${definitionText}真正值得参考的是相似配置如何支持能力、判断与影响力，而不是模仿对方的人生选择。这只是结构对照，不代表你的性格、经历或人生结果会复制对方。`;
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
let pendingHistoryDeleteId = null;
const paintBodygraph = createBodygraphRenderer({
  container: graph,
  templateUrl: "./assets/bodygraph-template.svg?v=20260717-12",
  centerColors,
  label: "Life Manual BodyGraph",
});

function persistSettings() {
  writeStoredJson(settingsStorageKey, appSettings);
}

function persistHistory() {
  writeStoredJson(historyStorageKey, historyEntries);
}

function currentConsent() {
  return {
    cloudSave: Boolean(appSettings.cloudSave),
    productAnalytics: Boolean(appSettings.productAnalytics),
  };
}

function trackEvent(eventName, properties = {}) {
  recordProductEvent(eventName, properties, currentConsent()).catch((error) => {
    console.warn("Anonymous product event was not sent.", error);
  });
}

function saveChartHistory(data, input) {
  if (!appSettings.keepHistory) return;
  const id = `${data.Meta?.BirthIso || ""}|${data.Properties.Name}|${data.Properties.Location}`;
  historyEntries = [
    { id, createdAt: Date.now(), data, input },
    ...historyEntries.filter((entry) => entry.id !== id),
  ].slice(0, 10);
  persistHistory();
  renderHistory();
}

function renderHistory() {
  historyList.replaceChildren();
  historyEmpty.hidden = historyEntries.length > 0;
  clearHistoryButton.disabled = historyEntries.length === 0;

  historyEntries.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "history-card";

    const details = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = entry.data?.Properties?.Name || "-";
    const birth = document.createElement("p");
    birth.textContent = entry.data ? formattedBirth(entry.data) : "";
    const type = document.createElement("p");
    const properties = entry.data?.Properties || {};
    type.textContent = [
      properties.Type ? translatedValue("Type", properties.Type) : "",
      properties.Profile ? translatedValue("Profile", properties.Profile) : "",
    ].filter(Boolean).join(" · ");
    details.append(name, birth, type);

    const actions = document.createElement("div");
    actions.className = "history-card-actions";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "history-open";
    open.dataset.historyOpen = entry.id;
    open.textContent = t("openHistory");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "history-delete";
    remove.dataset.historyDelete = entry.id;
    remove.setAttribute("aria-label", t("deleteHistory"));
    remove.title = t("deleteHistory");
    remove.textContent = t("deleteHistory");
    actions.append(open, remove);
    card.append(details, actions);
    historyList.append(card);
  });
}

function hydrateForm(input) {
  if (!input) return;
  fields.name.value = input.name || "";
  fields.year.value = String(input.year || "");
  fields.month.value = String(input.month || "").padStart(2, "0");
  updateDays();
  fields.day.value = String(input.day || "").padStart(2, "0");
  fields.hour.value = String(input.hour || "").padStart(2, "0");
  fields.minute.value = String(input.minute || "").padStart(2, "0");
  fields.ampm.value = input.ampm === "pm" ? "pm" : "am";
  ampmButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.ampm === fields.ampm.value)));
  fields.location.value = input.location || input.place?.label || "";
  selectedPlace = input.place || null;
}

async function openHistoryEntry(entry) {
  if (!entry?.data) return;
  historyDialog.close();
  clearPoster();
  hydrateForm(entry.input);
  privacyToggle.checked = appSettings.privacyByDefault;
  lastData = entry.data;
  setStatus("preparing");
  showChartView();
  await render(lastData);
  await createPosterImage();
  setStatus("calculated");
}

function isNativeApp() {
  return Boolean(nativePlugin && globalThis.Capacitor?.isNativePlatform?.());
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error || new Error("The image could not be read."));
    reader.readAsDataURL(blob);
  });
}

function flashShareLabel(label, key, resetKey) {
  label.textContent = t(key);
  window.setTimeout(() => {
    label.textContent = t(resetKey);
  }, 1800);
}

async function shareLink(text) {
  return sharePageLink({
    url: currentShareUrl(),
    title: t("shareTitle"),
    text,
    nativePlugin,
    native: isNativeApp(),
  });
}

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
    const nextBlob = await renderPosterElement(chartPanel);
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
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const label = t(element.dataset.i18nAriaLabel);
    element.setAttribute("aria-label", label);
    element.title = label;
  });
  fields.location.placeholder = t("locationPlaceholder");
  locationResults.setAttribute("aria-label", t("locationSuggestions"));
  graph.setAttribute("aria-label", t("bodygraphLabel"));
  graph.querySelector("svg")?.setAttribute("aria-label", t("bodygraphLabel"));
  languageButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.language === language)));
  if (statusState) status.textContent = t(statusState.key, statusState.values);
  renderHistory();
  if (rerender && lastData) {
    render(lastData)
      .then(createPosterImage)
      .catch((error) => { setStatus("exportFailed", { message: error.message }); });
  }
}

languageButtons.forEach((button) => button.addEventListener("click", () => {
  applyLanguage(button.dataset.language);
  trackEvent("language_changed", { language: button.dataset.language });
}));
openHistoryButton.addEventListener("click", () => {
  renderHistory();
  historyDialog.showModal();
});
openSettingsButton.addEventListener("click", () => settingsDialog.showModal());
closeHistoryButton.addEventListener("click", () => historyDialog.close());
closeSettingsButton.addEventListener("click", () => settingsDialog.close());
[historyDialog, settingsDialog].forEach((dialog) => dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
}));
historyList.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-history-open]");
  const deleteButton = event.target.closest("[data-history-delete]");
  if (openButton) {
    const entry = historyEntries.find((item) => item.id === openButton.dataset.historyOpen);
    openHistoryEntry(entry).catch((error) => {
      console.error(error);
      setStatus("failed", { message: error.message });
    });
  }
  if (deleteButton) {
    pendingHistoryDeleteId = deleteButton.dataset.historyDelete;
    deleteHistoryDialog.showModal();
  }
});
cancelHistoryDeleteButton.addEventListener("click", () => deleteHistoryDialog.close());
confirmHistoryDeleteButton.addEventListener("click", () => {
  if (pendingHistoryDeleteId) {
    historyEntries = historyEntries.filter((entry) => entry.id !== pendingHistoryDeleteId);
    persistHistory();
    renderHistory();
  }
  deleteHistoryDialog.close();
});
deleteHistoryDialog.addEventListener("click", (event) => {
  if (event.target === deleteHistoryDialog) deleteHistoryDialog.close();
});
deleteHistoryDialog.addEventListener("close", () => { pendingHistoryDeleteId = null; });
defaultPrivacyInput.addEventListener("change", () => {
  appSettings.privacyByDefault = defaultPrivacyInput.checked;
  persistSettings();
  privacyToggle.checked = defaultPrivacyInput.checked;
  if (lastData) {
    render(lastData)
      .then(createPosterImage)
      .catch((error) => { setStatus("exportFailed", { message: error.message }); });
  }
});
saveHistoryInput.addEventListener("change", () => {
  appSettings.keepHistory = saveHistoryInput.checked;
  persistSettings();
});
cloudSaveInput.addEventListener("change", () => {
  appSettings.cloudSave = cloudSaveInput.checked;
  persistSettings();
  updateConsent(currentConsent()).catch((error) => console.warn("Cloud consent was not synchronized.", error));
});
productAnalyticsInput.addEventListener("change", () => {
  appSettings.productAnalytics = productAnalyticsInput.checked;
  persistSettings();
  updateConsent(currentConsent()).catch((error) => console.warn("Analytics consent was not synchronized.", error));
  trackEvent("privacy_mode_changed", { setting: "productAnalytics", enabled: productAnalyticsInput.checked });
});
deleteCloudDataButton.addEventListener("click", async () => {
  if (!window.confirm(t("deleteCloudConfirm"))) return;
  deleteCloudDataButton.disabled = true;
  try {
    await deleteCloudData(currentConsent());
    appSettings.cloudSave = false;
    cloudSaveInput.checked = false;
    persistSettings();
    setStatus("cloudDeleted");
  } catch (error) {
    console.error(error);
    setStatus("failed", { message: error.message });
  } finally {
    deleteCloudDataButton.disabled = false;
  }
});
clearHistoryButton.addEventListener("click", () => {
  if (!window.confirm(`${t("clearHistory")}?`)) return;
  historyEntries = [];
  persistHistory();
  renderHistory();
  setStatus("historyCleared");
});
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
  if (lastData) {
    detailDialog.showModal();
    trackEvent("detail_opened");
  }
});
closeDetailButton.addEventListener("click", () => detailDialog.close());
shareDetailButton.addEventListener("click", async () => {
  shareDetailButton.disabled = true;
  shareDetailLabel.textContent = t("openingShareShort");
  try {
    const result = await shareLink(t("shareReadingText"));
    if (result === "shared") flashShareLabel(shareDetailLabel, "sharedShort", "shareReading");
    if (result === "copied") flashShareLabel(shareDetailLabel, "linkCopiedShort", "shareReading");
    if (result === "cancelled") flashShareLabel(shareDetailLabel, "cancelledShort", "shareReading");
    if (result === "unavailable") {
      window.prompt(t("shareReadingText"), currentShareUrl());
      shareDetailLabel.textContent = t("shareReading");
    }
  } catch (error) {
    console.error(error);
    shareDetailLabel.textContent = t("shareReading");
  } finally {
    shareDetailButton.disabled = false;
  }
});
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
chartForm.addEventListener("input", () => trackEvent("form_started"), { once: true });

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
  trackEvent("chart_generate_started");
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
    const birthDate = `${fields.year.value}-${fields.month.value}-${fields.day.value}`;
    const birthTime = `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
    const snapshot = await createHumanDesignProfileSnapshot({
      input: { birthDate, birthTime, timezone: place.timezone, locationLabel: place.label },
      result: data,
    });
    saveChartToCloud(snapshot, {
      name,
      birthDate,
      birthTime,
      locationLabel: place.label,
      timezone: place.timezone,
    }, currentConsent()).catch((error) => {
      console.warn("Cloud chart save failed; the local chart remains available.", error);
    });
    await render(data);
    lastData = data;
    saveChartHistory(data, {
      name,
      year: Number(fields.year.value),
      month: Number(fields.month.value),
      day: Number(fields.day.value),
      hour: fields.hour.value,
      minute: fields.minute.value,
      ampm: fields.ampm.value,
      location: place.label,
      place: { label: place.label, timezone: place.timezone },
    });
    setStatus("preparing");
    await createPosterImage();
    setStatus("calculated");
    showChartView();
    trackEvent("chart_generate_succeeded", {
      schemaVersion: snapshot.schemaVersion,
      engineVersion: snapshot.engineVersion,
    });
  } catch (error) {
    console.error(error);
    setStatus("failed", { message: error.message });
    trackEvent("chart_generate_failed", { category: error instanceof RangeError ? "validation" : "calculation" });
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
    return Boolean(canUseSystemShare() && navigator.canShare?.({ files: [file] }));
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
    const mobile = isMobileDevice() || matchMedia("(pointer: coarse)").matches;
    if (isNativeApp()) {
      const base64 = await blobToBase64(posterBlob);
      await nativePlugin.saveImage({ base64, fileName: posterFileName() });
      setStatus("downloaded");
    } else if (mobile && canShareFile(file)) {
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
  shareLabel.textContent = t("openingShareShort");
  try {
    const file = posterFile();
    if (isNativeApp()) {
      try {
        const base64 = await blobToBase64(posterBlob);
        const result = await nativePlugin.shareImage({
          base64,
          fileName: posterFileName(),
          text: t("shareText"),
          url: currentShareUrl(),
        });
        if (result?.completed === false) {
          flashShareLabel(shareLabel, "cancelledShort", "share");
          return;
        }
        setStatus("shared");
        flashShareLabel(shareLabel, "sharedShort", "share");
        return;
      } catch (error) {
        if (error?.name === "AbortError") {
          flashShareLabel(shareLabel, "cancelledShort", "share");
          return;
        }
        console.warn("Native image sharing failed; using the web fallback.", error);
      }
    }
    if (canShareFile(file)) {
      try {
        await navigator.share({ files: [file], title: t("shareTitle"), text: t("shareText") });
        setStatus("shared");
        flashShareLabel(shareLabel, "sharedShort", "share");
        return;
      } catch (error) {
        if (error?.name === "AbortError") {
          flashShareLabel(shareLabel, "cancelledShort", "share");
          return;
        }
        console.warn("System image sharing failed; sharing the page link instead.", error);
      }
    }
    const result = await shareLink(t("shareText"));
    if (result === "shared") {
      setStatus("shared");
      flashShareLabel(shareLabel, "sharedShort", "share");
    } else if (result === "copied") {
      setStatus("linkCopied");
      flashShareLabel(shareLabel, "linkCopiedShort", "share");
    } else if (result === "cancelled") {
      flashShareLabel(shareLabel, "cancelledShort", "share");
    } else if (result === "unavailable") {
      downloadPoster();
      setStatus("downloaded");
      flashShareLabel(shareLabel, "downloadedShort", "share");
    }
  } catch (error) {
    console.error(error);
    downloadPoster();
    setStatus("downloaded");
    flashShareLabel(shareLabel, "downloadedShort", "share");
  } finally {
    shareButton.disabled = !lastData || !posterBlob;
  }
});

paintBodygraph({ Design: {}, Personality: {}, "Defined Centers": [] }).catch((error) => {
  setStatus("failed", { message: error.message });
});
initializeSelectors();
defaultPrivacyInput.checked = appSettings.privacyByDefault;
saveHistoryInput.checked = appSettings.keepHistory;
cloudSaveInput.checked = appSettings.cloudSave;
productAnalyticsInput.checked = appSettings.productAnalytics;
privacyToggle.checked = appSettings.privacyByDefault;
applyLanguage(language, false);
trackEvent("app_open", { environment: globalThis.PLUTO_CONFIG?.environment || "development" });
