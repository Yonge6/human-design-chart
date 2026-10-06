import Capacitor
import Photos
import UIKit
import WidgetKit
import StoreKit
import Security
import AuthenticationServices
import CryptoKit

@objc(PlutoNativePlugin)
public class PlutoNativePlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "PlutoNativePlugin"
    public let jsName = "PlutoNative"
    private let subscriptionIDs = ["com.yonge6.buerwithin.plus.monthly", "com.yonge6.buerwithin.plus.annual"]
    private var transactionListener: Task<Void, Never>?
    private let installationLock = NSLock()
    private var accountWebSession: ASWebAuthenticationSession?
    private var accountAppleCall: CAPPluginCall?
    private var accountNonce: String?
    private let accountStorageService = "com.yonge6.buerwithin.account"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "accountOAuth", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "accountAppleSignIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "accountStorageGet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "accountStorageSet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "accountStorageRemove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "subscriptionStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchaseSubscription", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restoreSubscriptions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareLink", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exportGrowthProfile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateDailyWidget", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumeWidgetLink", returnType: CAPPluginReturnPromise),
    ]

    public override func load() {
        let ids = subscriptionIDs
        transactionListener = Task {
            for await result in Transaction.updates {
                if Task.isCancelled { break }
                if case .verified(let transaction) = result, ids.contains(transaction.productID) {
                    await transaction.finish()
                }
            }
        }
        NotificationCenter.default.addObserver(self, selector: #selector(dailyTipOpened), name: Notification.Name("PlutoDailyTipOpened"), object: nil)
    }

    deinit { transactionListener?.cancel(); NotificationCenter.default.removeObserver(self) }

    private func accountStorageQuery(_ call: CAPPluginCall) -> [String: Any]? {
        guard let key = call.getString("key"), ["buer-auth-v1", "buer-auth-v1-code-verifier", "buer-auth-v1-user"].contains(key) else {
            call.reject("INVALID_STORAGE_KEY"); return nil
        }
        return [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: accountStorageService, kSecAttrAccount as String: key]
    }
    @objc func accountStorageGet(_ call: CAPPluginCall) {
        guard var query = accountStorageQuery(call) else { return }
        query[kSecReturnData as String] = true
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { call.resolve([:]); return }
        guard status == errSecSuccess, let data = result as? Data, let value = String(data: data, encoding: .utf8) else { call.reject("KEYCHAIN_UNAVAILABLE"); return }
        call.resolve(["value": value])
    }
    @objc func accountStorageSet(_ call: CAPPluginCall) {
        guard let query = accountStorageQuery(call), let value = call.getString("value"), let data = value.data(using: .utf8), data.count <= 100_000 else { call.reject("INVALID_STORAGE_VALUE"); return }
        let update = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if update == errSecSuccess { call.resolve(); return }
        guard update == errSecItemNotFound else { call.reject("KEYCHAIN_UNAVAILABLE"); return }
        var item = query
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { call.reject("KEYCHAIN_UNAVAILABLE"); return }
        call.resolve()
    }
    @objc func accountStorageRemove(_ call: CAPPluginCall) {
        guard let query = accountStorageQuery(call) else { return }
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { call.reject("KEYCHAIN_UNAVAILABLE"); return }
        call.resolve()
    }
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
    @objc func accountOAuth(_ call: CAPPluginCall) {
        guard let raw = call.getString("url"), let url = URL(string: raw), url.scheme == "https",
              url.host == "hiuphqtqqvejyjgoxfov.supabase.co", url.path == "/auth/v1/authorize",
              url.user == nil, url.password == nil, url.port == nil, url.fragment == nil,
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              components.queryItems?.filter({ $0.name == "provider" }).map({ $0.value }) == ["google"],
              components.queryItems?.filter({ $0.name == "redirect_to" }).map({ $0.value }) == ["buerwithin://auth/callback"] else {
            call.reject("INVALID_AUTH_URL"); return
        }
        DispatchQueue.main.async {
            guard self.accountWebSession == nil else { call.reject("AUTH_IN_PROGRESS"); return }
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "buerwithin") { callback, error in
                self.accountWebSession = nil
                guard error == nil, let callback = callback, callback.scheme == "buerwithin", callback.host == "auth", callback.path == "/callback",
                      callback.user == nil, callback.password == nil, callback.port == nil, callback.fragment == nil else {
                    call.reject("AUTH_CANCELLED"); return
                }
                call.resolve(["url": callback.absoluteString])
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = true
            self.accountWebSession = session
            if !session.start() { self.accountWebSession = nil; call.reject("AUTH_UNAVAILABLE") }
        }
    }
    @objc func accountAppleSignIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.accountAppleCall == nil else { call.reject("AUTH_IN_PROGRESS"); return }
            var bytes = [UInt8](repeating: 0, count: 32)
            guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { call.reject("AUTH_UNAVAILABLE"); return }
            let nonce = bytes.map { String(format: "%02x", $0) }.joined()
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
            self.accountAppleCall = call; self.accountNonce = nonce
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self; controller.presentationContextProvider = self; controller.performRequests()
        }
    }
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        defer { accountAppleCall = nil; accountNonce = nil }
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let data = credential.identityToken, let token = String(data: data, encoding: .utf8), let nonce = accountNonce else {
            accountAppleCall?.reject("AUTH_UNAVAILABLE"); return
        }
        var result: [String: Any] = ["identityToken": token, "nonce": nonce]
        if let givenName = credential.fullName?.givenName?.trimmingCharacters(in: .whitespacesAndNewlines), !givenName.isEmpty {
            result["givenName"] = givenName
        }
        if let familyName = credential.fullName?.familyName?.trimmingCharacters(in: .whitespacesAndNewlines), !familyName.isEmpty {
            result["familyName"] = familyName
        }
        if let data = credential.authorizationCode, let code = String(data: data, encoding: .utf8), !code.isEmpty {
            result["authorizationCode"] = code
        }
        accountAppleCall?.resolve(result)
    }
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        accountAppleCall?.reject("AUTH_CANCELLED"); accountAppleCall = nil; accountNonce = nil
    }

    private func installationID() -> String {
        installationLock.lock()
        defer { installationLock.unlock() }
        let query: [String: Any] = [kSecClass as String:kSecClassGenericPassword, kSecAttrService as String:"com.yonge6.buerwithin.installation", kSecAttrAccount as String:"anonymous", kSecReturnData as String:true]
        var result: CFTypeRef?
        if SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess, let data = result as? Data, let value = String(data:data,encoding:.utf8) { return value }
        let value=UUID().uuidString.lowercased()
        var add=query;add.removeValue(forKey:kSecReturnData as String);add[kSecValueData as String]=Data(value.utf8);add[kSecAttrAccessible as String]=kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(add as CFDictionary,nil)
        return value
    }

    private func membership() async -> [String: Any] {
        var proof=""
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction)=result, subscriptionIDs.contains(transaction.productID), transaction.revocationDate == nil, let expiry=transaction.expirationDate, expiry > Date() { proof=result.jwsRepresentation }
        }
        return ["installationId":installationID(),"transactionJWS":proof,"member":!proof.isEmpty]
    }

    @objc func subscriptionStatus(_ call: CAPPluginCall) {
        Task {
            var state=await membership()
            do {
                let products=try await Product.products(for:subscriptionIDs)
                state["products"]=products.map { ["id":$0.id,"price":$0.displayPrice,"name":$0.displayName] }
            } catch { state["products"]=[] as [[String:String]] }
            call.resolve(state)
        }
    }

    @objc func purchaseSubscription(_ call: CAPPluginCall) {
        guard let id=call.getString("productId"),subscriptionIDs.contains(id) else {call.reject("INVALID_PRODUCT");return}
        Task { @MainActor in
            do {
                guard let product=try await Product.products(for:[id]).first else {call.reject("PRODUCT_UNAVAILABLE");return}
                let result=try await product.purchase()
                switch result {
                case .success(let verification):
                    guard case .verified(let transaction)=verification else {call.reject("UNVERIFIED_PURCHASE");return}
                    await transaction.finish();call.resolve(await membership())
                case .userCancelled: call.resolve(["cancelled":true])
                case .pending: call.resolve(["pending":true])
                @unknown default: call.reject("PURCHASE_UNAVAILABLE")
                }
            } catch {call.reject("PURCHASE_UNAVAILABLE",nil,error)}
        }
    }

    @objc func restoreSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {try await AppStore.sync();call.resolve(await membership())}
            catch {call.reject("RESTORE_UNAVAILABLE",nil,error)}
        }
    }

    @objc private func dailyTipOpened() {
        notifyListeners("dailyTipOpened", data: [:])
    }

    @objc func consumeWidgetLink(_ call: CAPPluginCall) {
        let pending = UserDefaults.standard.bool(forKey: DailyTipStore.pendingLinkKey)
        UserDefaults.standard.removeObject(forKey: DailyTipStore.pendingLinkKey)
        call.resolve(["openDailyTip": pending])
    }

    @objc func updateDailyWidget(_ call: CAPPluginCall) {
        do {
            var payload: DailyTipPayload?
            if let object = call.getObject("payload") {
                let data = try JSONSerialization.data(withJSONObject: object)
                let decoded = try JSONDecoder().decode(DailyTipPayload.self, from: data)
                guard decoded.isValid else { call.reject("Invalid daily advice."); return }
                payload = decoded
            }
            try DailyTipStore.save(payload)
            WidgetCenter.shared.reloadTimelines(ofKind: DailyTipStore.widgetKind)
            call.resolve(["updated": true])
        } catch {
            call.reject("Daily advice could not be shared with the widget.", nil, error)
        }
    }

    @objc func saveImage(_ call: CAPPluginCall) {
        guard let fileURL = writeTemporaryImage(call) else { return }

        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else {
                try? FileManager.default.removeItem(at: fileURL)
                call.reject("Photo library access was not granted.")
                return
            }

            PHPhotoLibrary.shared().performChanges({
                PHAssetChangeRequest.creationRequestForAssetFromImage(atFileURL: fileURL)
            }) { success, error in
                try? FileManager.default.removeItem(at: fileURL)
                if success {
                    call.resolve(["saved": true])
                } else {
                    call.reject(error?.localizedDescription ?? "The image could not be saved.")
                }
            }
        }
    }

    @objc func shareImage(_ call: CAPPluginCall) {
        guard let fileURL = writeTemporaryImage(call) else { return }
        var items: [Any] = [fileURL]
        if let text = call.getString("text"), !text.isEmpty { items.append(text) }
        if let urlString = call.getString("url"), let url = URL(string: urlString) { items.append(url) }
        presentShareSheet(items: items, temporaryFile: fileURL, call: call)
    }

    @objc func exportGrowthProfile(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), let data = json.data(using: .utf8),
              data.count <= 3_000_000,
              (try? JSONSerialization.jsonObject(with: data)) is [String: Any] else {
            call.reject("The growth profile is invalid or too large.")
            return
        }
        let file = FileManager.default.temporaryDirectory.appendingPathComponent("buer-growth-\(UUID().uuidString).json")
        do {
            try data.write(to: file, options: [.atomic, .completeFileProtection])
            presentShareSheet(items: [file], temporaryFile: file, call: call)
        } catch {
            call.reject("The growth profile could not be exported.", nil, error)
        }
    }

    @objc func shareLink(_ call: CAPPluginCall) {
        var items: [Any] = []
        if let text = call.getString("text"), !text.isEmpty { items.append(text) }
        if let urlString = call.getString("url"), let url = URL(string: urlString) { items.append(url) }
        guard !items.isEmpty else {
            call.reject("There is nothing to share.")
            return
        }
        presentShareSheet(items: items, temporaryFile: nil, call: call)
    }

    private func writeTemporaryImage(_ call: CAPPluginCall) -> URL? {
        guard let base64 = call.getString("base64"),
              let data = Data(base64Encoded: base64, options: .ignoreUnknownCharacters) else {
            call.reject("The image data is invalid.")
            return nil
        }

        let requestedName = call.getString("fileName") ?? "pluto-life-manual.png"
        let safeName = requestedName
            .components(separatedBy: CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_.")).inverted)
            .filter { !$0.isEmpty }
            .joined(separator: "-")
        let fileName = safeName.lowercased().hasSuffix(".png") ? safeName : "\(safeName).png"
        let fileURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)

        do {
            try data.write(to: fileURL, options: .atomic)
            return fileURL
        } catch {
            call.reject(error.localizedDescription)
            return nil
        }
    }

    private func presentShareSheet(items: [Any], temporaryFile: URL?, call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let viewController = self.bridge?.viewController else {
                if let temporaryFile { try? FileManager.default.removeItem(at: temporaryFile) }
                call.reject("The share sheet is unavailable.")
                return
            }

            let shareSheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
            if let popover = shareSheet.popoverPresentationController {
                popover.sourceView = viewController.view
                popover.sourceRect = CGRect(
                    x: viewController.view.bounds.midX,
                    y: viewController.view.bounds.maxY - 24,
                    width: 1,
                    height: 1
                )
            }
            shareSheet.completionWithItemsHandler = { _, completed, _, error in
                if let temporaryFile { try? FileManager.default.removeItem(at: temporaryFile) }
                if let error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve(["completed": completed])
                }
            }
            viewController.present(shareSheet, animated: true)
        }
    }
}
