import Foundation

@main
struct DailyTipStoreTests {
    static func main() throws {
        let payload = DailyTipPayload(version: 1, language: "zh", tips: (0..<8).map { "Tip \($0)" })
        let formatter = ISO8601DateFormatter()
        let utc = TimeZone(secondsFromGMT: 0)!
        assert(payload.tip(on: formatter.date(from: "2026-09-07T00:01:00Z")!, timeZone: utc) == "Tip 7")
        assert(payload.tip(on: formatter.date(from: "2026-09-07T23:59:00Z")!, timeZone: utc) == "Tip 7")
        assert(payload.tip(on: formatter.date(from: "2026-09-08T00:00:00Z")!, timeZone: utc) == "Tip 0")
        let shanghai = TimeZone(identifier: "Asia/Shanghai")!
        assert(payload.tip(on: formatter.date(from: "2026-09-07T16:00:00Z")!, timeZone: shanghai) == "Tip 0")
        let ny = TimeZone(identifier: "America/New_York")!
        let first = payload.tip(on: formatter.date(from: "2026-11-01T05:30:00Z")!, timeZone: ny)
        let repeated = payload.tip(on: formatter.date(from: "2026-11-01T06:30:00Z")!, timeZone: ny)
        assert(first == repeated, "DST repeated hour preserves the same calendar-day tip")
        assert(DailyTipPayload(version: 2, language: "zh", tips: ["x"]).isValid == false)
        assert(DailyTipPayload(version: 1, language: "fr", tips: ["x"]).isValid == false)
        assert(DailyTipPayload(version: 1, language: "en", tips: []).tip(on: Date()) == nil)
        let encoded = try JSONEncoder().encode(payload)
        let decoded = try JSONDecoder().decode(DailyTipPayload.self, from: encoded)
        assert(decoded.tips == payload.tips)
        print("Swift daily-tip parity, midnight, timezones, DST and validation passed.")
    }
}
