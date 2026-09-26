import Capacitor
import WebKit

@objc(PlutoViewController)
public class PlutoViewController: CAPBridgeViewController {
    public override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PlutoNativePlugin())
        webView?.scrollView.alwaysBounceHorizontal = false
        webView?.scrollView.showsHorizontalScrollIndicator = false
        webView?.scrollView.isDirectionalLockEnabled = true
    }
}

/// System tab controller owns the material, layout, selection and accessibility.
@objc(BuerTabController)
final class BuerTabController: UITabBarController, UITabBarControllerDelegate, WKScriptMessageHandler {
    private let workspace = PlutoViewController()
    private let pages = [UIViewController(), UIViewController(), UIViewController()]
    private let keys = ["home", "manual", "profile"]
    private var webReady = false

    override func viewDidLoad() {
        super.viewDidLoad()
        delegate = self
        overrideUserInterfaceStyle = .light
        view.backgroundColor = UIColor(red: 245 / 255, green: 242 / 255, blue: 234 / 255, alpha: 1)
        let titles = ["见己", "成长档案", "我的"]
        let symbols = ["house", "book", "person.crop.circle"]
        for (index, page) in pages.enumerated() {
            page.tabBarItem = UITabBarItem(title: titles[index], image: UIImage(systemName: symbols[index]), selectedImage: UIImage(systemName: symbols[index] + ".fill"))
            page.view.backgroundColor = .clear
        }
        setViewControllers(pages, animated: false)
        tabBar.tintColor = UIColor(red: 86 / 255, green: 103 / 255, blue: 75 / 255, alpha: 1)
        attachWorkspace(to: pages[0])
        guard let web = workspace.webView else { return }
        web.configuration.userContentController.add(self, name: "buerNavigation")
        let source = """
        (() => {
          const setup = () => {
            if (!document.body || !document.querySelector('.buer-rail')) return;
            document.documentElement.classList.add('native-system-tabs');
            const sync = () => window.webkit.messageHandlers.buerNavigation.postMessage({
              workspace: document.body.dataset.workspace === 'growth' ? 'manual' : (document.body.dataset.workspace || 'home'),
              english: document.documentElement.lang.startsWith('en'),
              modal: !!document.querySelector('dialog[open]')
            });
            new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-workspace']});
            new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
            new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
            sync();
          };
          if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
        })();
        """
        web.configuration.userContentController.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        web.evaluateJavaScript(source, completionHandler: nil)
    }

    private func attachWorkspace(to page: UIViewController) {
        if workspace.parent === page { return }
        workspace.willMove(toParent: nil)
        workspace.view.removeFromSuperview()
        workspace.removeFromParent()
        page.addChild(workspace)
        workspace.view.frame = page.view.bounds
        workspace.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        page.view.addSubview(workspace.view)
        workspace.didMove(toParent: page)
    }

    func tabBarController(_ tabBarController: UITabBarController, didSelect viewController: UIViewController) {
        attachWorkspace(to: viewController)
        guard webReady else { return }
        let key = keys[selectedIndex]
        workspace.webView?.evaluateJavaScript("document.querySelector('.rail-item[data-\(key)]')?.click()", completionHandler: nil)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let state = message.body as? [String: Any] else { return }
        webReady = true
        let titles = state["english"] as? Bool == true ? ["Home", "Growth", "Me"] : ["见己", "成长档案", "我的"]
        for (index, page) in pages.enumerated() { page.tabBarItem.title = titles[index] }
        tabBar.isHidden = state["modal"] as? Bool == true
        if let key = state["workspace"] as? String, let index = keys.firstIndex(of: key), selectedIndex != index {
            selectedIndex = index
            attachWorkspace(to: pages[index])
        }
    }
}
