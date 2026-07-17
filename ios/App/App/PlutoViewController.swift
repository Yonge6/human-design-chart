import Capacitor

@objc(PlutoViewController)
public class PlutoViewController: CAPBridgeViewController {
    public override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PlutoNativePlugin())
    }
}
