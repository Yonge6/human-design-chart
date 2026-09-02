import Capacitor

@objc(PlutoViewController)
public class PlutoViewController: CAPBridgeViewController {
    public override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PlutoNativePlugin())

        guard let scrollView = webView?.scrollView else { return }
        scrollView.alwaysBounceHorizontal = false
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.isDirectionalLockEnabled = true
    }
}
