import Foundation

struct DailyTipPayload: Codable {
    let version: Int
    let language: String
    let tips: [String]

    var isValid: Bool {
        version == 1 && ["zh", "en"].contains(language) && !tips.isEmpty && tips.count <= 32
            && tips.allSatisfy { !$0.isEmpty && $0.count <= 280 }
    }

    func tip(on date: Date, timeZone: TimeZone = .current) -> String? {
        guard isValid else { return nil }
        var local = Calendar(identifier: .gregorian)
        local.timeZone = timeZone
        var utc = Calendar(identifier: .gregorian)
        utc.timeZone = TimeZone(secondsFromGMT: 0)!
        let parts = local.dateComponents([.year, .month, .day], from: date)
        guard let dayDate = utc.date(from: parts) else { return nil }
        let day = Int(floor(dayDate.timeIntervalSince1970 / 86400))
        return tips[((day % tips.count) + tips.count) % tips.count]
    }
}

enum DailyTipStore {
    static let group = "group.com.yonge6.buerwithin"
    static let widgetKind = "PlutoDailyTip"
    static let key = "daily-tip-v1"
    static let pendingLinkKey = "pluto-pending-widget-link"

    static func load() -> DailyTipPayload? {
        guard let data = UserDefaults(suiteName: group)?.data(forKey: key),
              let value = try? JSONDecoder().decode(DailyTipPayload.self, from: data), value.isValid else { return nil }
        return value
    }

    static func save(_ payload: DailyTipPayload?) throws {
        guard let defaults = UserDefaults(suiteName: group) else {
            throw NSError(domain: "PlutoWidget", code: 1, userInfo: [NSLocalizedDescriptionKey: "Shared widget storage is unavailable."])
        }
        if let payload {
            guard payload.isValid else { throw NSError(domain: "PlutoWidget", code: 2) }
            defaults.set(try JSONEncoder().encode(payload), forKey: key)
        } else {
            defaults.removeObject(forKey: key)
        }
    }
}
