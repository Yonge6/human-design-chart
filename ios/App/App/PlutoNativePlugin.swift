import Capacitor
import Photos
import UIKit

@objc(PlutoNativePlugin)
public class PlutoNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PlutoNativePlugin"
    public let jsName = "PlutoNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareLink", returnType: CAPPluginReturnPromise),
    ]

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
