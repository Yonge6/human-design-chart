import Capacitor
import WebKit

@objc(PlutoViewController)
public class PlutoViewController: CAPBridgeViewController {
    public override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PlutoNativePlugin())
        bridge?.registerPluginInstance(BuerAnalyticsPlugin())
        webView?.scrollView.alwaysBounceHorizontal = false
        webView?.scrollView.showsHorizontalScrollIndicator = false
        webView?.scrollView.isDirectionalLockEnabled = true
    }
}

/// System tab controller owns the material, layout, selection and accessibility.
@objc(BuerTabController)
final class BuerTabController: UITabBarController, UITabBarControllerDelegate, WKScriptMessageHandler {
    private let workspace = PlutoViewController()
    private let pages = [UIViewController(), UIViewController(), UIViewController(), UIViewController()]
    private let keys = ["home", "manual", "people", "profile"]
    private var webReady = false
    private var sheetHost: UIViewController?
    private var sheetTransitionInProgress = false
    private var modalRequested = false
    private let paper = UIColor(red: 247 / 255, green: 244 / 255, blue: 236 / 255, alpha: 1)

    override func viewDidLoad() {
        super.viewDidLoad()
        delegate = self
        overrideUserInterfaceStyle = .light
        view.backgroundColor = paper
        let titles = ["见己", "成长档案", "身边的人", "我的"]
        let symbols = ["house", "book", "person.2", "person.crop.circle"]
        for (index, page) in pages.enumerated() {
            page.tabBarItem = UITabBarItem(title: titles[index], image: UIImage(systemName: symbols[index]), selectedImage: UIImage(systemName: symbols[index] + ".fill"))
            page.view.backgroundColor = .clear
        }
        setViewControllers(pages, animated: false)
        // Leave the system bar material intact so current iOS adopts Liquid Glass.
        let accent = UIColor(red: 54 / 255, green: 126 / 255, blue: 140 / 255, alpha: 1)
        view.tintColor = accent
        tabBar.tintColor = accent
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
            document.addEventListener('buer:language', sync);
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
        workspace.view.translatesAutoresizingMaskIntoConstraints = false
        page.view.addSubview(workspace.view)
        // Duo can place system controls along a vertical edge. Constrain to
        // UIKit's changing safe area rather than assuming a bottom tab bar.
        let safeArea = page.view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            workspace.view.leadingAnchor.constraint(equalTo: safeArea.leadingAnchor),
            workspace.view.trailingAnchor.constraint(equalTo: safeArea.trailingAnchor),
            workspace.view.topAnchor.constraint(equalTo: safeArea.topAnchor),
            workspace.view.bottomAnchor.constraint(equalTo: safeArea.bottomAnchor)
        ])
        workspace.didMove(toParent: page)
    }

    private func updateSheetPresentation() {
        guard !sheetTransitionInProgress else { return }
        if modalRequested {
            guard sheetHost == nil, presentedViewController == nil else { return }
            let host = UIViewController()
            host.view.backgroundColor = paper
            host.modalPresentationStyle = .pageSheet
            // The page owns its unsaved-change checks and close action.
            host.isModalInPresentation = true
            if let sheet = host.sheetPresentationController {
                sheet.detents = [.large()]
                sheet.prefersGrabberVisible = true
                sheet.prefersScrollingExpandsWhenScrolledToEdge = true
                sheet.prefersEdgeAttachedInCompactHeight = true
                sheet.widthFollowsPreferredContentSizeWhenEdgeAttached = true
            }
            sheetHost = host
            sheetTransitionInProgress = true
            workspace.webView?.evaluateJavaScript("document.documentElement.classList.add('native-system-sheet')", completionHandler: nil)
            attachWorkspace(to: host)
            present(host, animated: true) { [weak self] in
                self?.sheetTransitionInProgress = false
                self?.updateSheetPresentation()
            }
        } else if let host = sheetHost {
            sheetTransitionInProgress = true
            host.dismiss(animated: true) { [weak self] in
                guard let self else { return }
                self.sheetHost = nil
                self.attachWorkspace(to: self.pages[self.selectedIndex])
                self.workspace.webView?.evaluateJavaScript("document.documentElement.classList.remove('native-system-sheet')", completionHandler: nil)
                self.sheetTransitionInProgress = false
                self.updateSheetPresentation()
            }
        }
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
        let titles = state["english"] as? Bool == true ? ["Home", "Growth", "People", "Me"] : ["见己", "成长档案", "身边的人", "我的"]
        for (index, page) in pages.enumerated() {
            page.tabBarItem.title = titles[index]
            page.tabBarItem.accessibilityLabel = titles[index]
            tabBar.items?[index].title = titles[index]
            tabBar.items?[index].accessibilityLabel = titles[index]
        }
        modalRequested = state["modal"] as? Bool == true
        if let key = state["workspace"] as? String, let index = keys.firstIndex(of: key), selectedIndex != index {
            selectedIndex = index
            if sheetHost == nil { attachWorkspace(to: pages[index]) }
        }
        updateSheetPresentation()
    }
}
