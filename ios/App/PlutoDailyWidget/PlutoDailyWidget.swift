import SwiftUI
import WidgetKit

struct DailyTipEntry: TimelineEntry {
    let date: Date
    let payload: DailyTipPayload?
    var isChinese: Bool { payload?.language == "zh" || (payload == nil && Locale.preferredLanguages.first?.hasPrefix("zh") == true) }
    var text: String {
        payload?.tip(on: date) ?? (isChinese
            ? "打开 Pluto，生成你的说明书，获得每日生活提示。"
            : "Open Pluto and create your Life Manual for a daily suggestion.")
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
    private let gold = Color(red: 0.85, green: 0.69, blue: 0.49)
    private let ink = Color(red: 0.95, green: 0.91, blue: 0.86)
    private var background: some View {
        Color(red: 0.063, green: 0.055, blue: 0.078)
    }
    private var content: some View {
        VStack(alignment: .leading, spacing: family == .systemSmall ? 8 : 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(entry.isChinese ? "今日提示" : "A thought for today")
                    .font(.caption2.weight(.semibold)).foregroundStyle(gold)
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
                Text("PLUTO").font(.system(size: 9, weight: .semibold, design: .rounded)).tracking(2)
                Spacer()
                Image(systemName: "arrow.up.right").font(.caption2)
            }.foregroundStyle(gold.opacity(0.8))
        }
        .padding(16)
        .widgetURL(URL(string: "plutolifemanual://daily-tip"))
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
        .configurationDisplayName("Daily Tip")
        .description("A daily suggestion from your latest Life Manual.")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}
