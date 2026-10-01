import Capacitor
import FirebaseCore
import FirebaseAnalytics
import StoreKit

@objc(BuerAnalyticsPlugin)
public class BuerAnalyticsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BuerAnalyticsPlugin"
    public let jsName = "BuerAnalytics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "consent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "record", returnType: CAPPluginReturnPromise)
    ]
    private var granted = false
    private var configured = false
    private var active = false
    private var generation = 0
    private let allowed: Set<String> = ["visit","screen","active_time","chat_request","chat_success","chat_error","chat_cancel","chat_latency","manual_request","manual_success","manual_error","assessment_saved","guide_request","guide_success","guide_error","story_saved","action_saved","action_completed","action_reviewed","share_request","share_success","share_error","membership_view","purchase_request","purchase_result","restore_result"]

    @objc func consent(_ call: CAPPluginCall) {
        Task { @MainActor in
            self.generation += 1
            let epoch = self.generation
            self.granted = call.getBool("enabled") == true
            self.active = false
            if self.configured { Analytics.setAnalyticsCollectionEnabled(false) }
            if !self.granted {
                if self.configured {
                    Analytics.setAnalyticsCollectionEnabled(false)
                    Analytics.setConsent([.analyticsStorage: .denied, .adStorage: .denied, .adUserData: .denied, .adPersonalization: .denied])
                    Analytics.resetAnalyticsData()
                }
                call.resolve(); return
            }
#if DEBUG || targetEnvironment(simulator)
            self.granted = false
            call.resolve(); return
#else
            // AppTransaction excludes TestFlight / sandbox without exporting its ID.
            guard #available(iOS 16.0, *),
                  case .verified(let transaction) = try? await AppTransaction.shared,
                  transaction.environment == .production,
                  self.granted, epoch == self.generation else { call.resolve(); return }
            if !self.configured {
                guard let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
                      let options = FirebaseOptions(contentsOfFile: path),
                      options.bundleID == Bundle.main.bundleIdentifier else { call.reject("Analytics configuration unavailable"); return }
                FirebaseApp.configure(options: options)
                self.configured = true
            }
            Analytics.setConsent([.analyticsStorage: .granted, .adStorage: .denied, .adUserData: .denied, .adPersonalization: .denied])
            Analytics.setAnalyticsCollectionEnabled(true)
            self.active = true
            call.resolve()
#endif
        }
    }

    @objc func record(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard self.granted, self.configured, self.active,
                  let name = call.getString("name"), name.hasPrefix("buer_v1_"),
                  self.allowed.contains(String(name.dropFirst(8))),
                  let fields = call.getObject("parameters"),
                  fields["surface"] as? String == "ios",
                  fields["schema_version"] as? Int == 1 else { call.resolve(); return }
            var safe: [String: Any] = ["surface":"ios", "schema_version":1]
            let enums = ["screen":["home","growth","profile","manual","overview","assessment","stories"],
                         "outcome":["active","pending","cancelled","inactive","error"], "plan":["monthly","annual"]]
            for (key, value) in fields where key != "surface" && key != "schema_version" {
                if let choices = enums[key], let text = value as? String, choices.contains(text) { safe[key] = text }
                else if key == "value", ["buer_v1_active_time","buer_v1_chat_latency"].contains(name),
                        let number = value as? Double, number.isFinite, number > 0, number <= 120 { safe[key] = number }
                else if key == "answered", name == "buer_v1_assessment_saved", let count = value as? Int, (0...12).contains(count) { safe[key] = count }
                else { call.resolve(); return }
            }
            Analytics.logEvent(name, parameters: safe)
            call.resolve()
        }
    }
}
