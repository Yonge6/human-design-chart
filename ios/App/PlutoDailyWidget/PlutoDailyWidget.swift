import SwiftUI
import WidgetKit

struct DailyTipEntry: TimelineEntry {
    let date: Date
    let payload: DailyTipPayload?
    var isChinese: Bool { payload?.language == "zh" || (payload == nil && Locale.preferredLanguages.first?.hasPrefix("zh") == true) }
    var text: String {
        payload?.tip(on: date) ?? (isChinese
            ? "打开不二见己，生成你的说明书，获得每日生活提示。"
            : "Open Buer Within and create your Life Manual for a daily thought.")
    }
}

struct DailyTipProvider: TimelineProvider {
    func placeholder(in context: Context) -> DailyTipEntry {
        DailyTipEntry(date: Date(), payload: nil)
    }
    func getSnapshot(in context: Context, completion: @escaping (DailyTipEntry) -> Void) {
        completion(DailyTipEntry(date: Date(), payload: DailyTipStore.load()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<DailyTipEntry>) -> Void) {
        let now = Date()
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: now)
        let payload = DailyTipStore.load()
        var entries = [DailyTipEntry(date: now, payload: payload)]
        for day in 1...14 {
            if let date = calendar.date(byAdding: .day, value: day, to: start) {
                entries.append(DailyTipEntry(date: date, payload: payload))
            }
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct DailyTipWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: DailyTipEntry
    private let accent = Color(red: 54 / 255, green: 126 / 255, blue: 140 / 255)
    private let ink = Color(red: 39 / 255, green: 57 / 255, blue: 62 / 255)
    private var background: some View {
        Color(red: 247 / 255, green: 244 / 255, blue: 236 / 255)
    }
    private var content: some View {
        VStack(alignment: .leading, spacing: family == .systemSmall ? 8 : 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(entry.isChinese ? "今日提示" : "A thought for today")
                    .font(.caption2.weight(.semibold)).foregroundStyle(accent)
                Spacer(minLength: 4)
                if family != .systemSmall {
                    Text(entry.date, format: .dateTime.month(.abbreviated).day())
                        .font(.caption2).foregroundStyle(ink.opacity(0.65))
                }
            }
            Text(entry.text)
                .font(.system(size: family == .systemSmall ? 15 : 19, weight: .regular, design: .serif))
                .foregroundStyle(ink).lineSpacing(3)
                .minimumScaleFactor(0.75).fixedSize(horizontal: false, vertical: false)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .accessibilityLabel(entry.text)
            HStack {
                Text(entry.isChinese ? "不二见己" : "BUER WITHIN").font(.system(size: 9, weight: .medium)).tracking(2)
                Spacer()
                Image(systemName: "arrow.up.right").font(.caption2)
            }.foregroundStyle(accent)
        }
        .padding(16)
        .widgetURL(URL(string: "buerwithin://daily-tip"))
    }
    var body: some View {
        if #available(iOS 17.0, *) {
            content.containerBackground(for: .widget) { background }
        } else {
            content.background(background)
        }
    }
}

@main
struct PlutoDailyWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: DailyTipStore.widgetKind, provider: DailyTipProvider()) { entry in
            DailyTipWidgetView(entry: entry)
        }
        .configurationDisplayName("不二见己 · 今日提示")
        .description("A daily suggestion from your latest Life Manual.")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}
