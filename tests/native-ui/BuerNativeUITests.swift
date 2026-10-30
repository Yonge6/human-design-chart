import XCTest

final class BuerNativeUITests: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "com.yonge6.buerwithin")

    override func setUpWithError() throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30), "Bundled web workspace loads")
        let language = app.buttons.matching(NSPredicate(format: "label == %@ OR label == %@", "Switch to Chinese", "切换到英文")).firstMatch
        XCTAssertTrue(language.waitForExistence(timeout: 60), "The page has finished initializing")
        if app.buttons["Switch to Chinese"].exists { app.buttons["Switch to Chinese"].tap() }
        XCTAssertTrue(app.buttons["切换到英文"].waitForExistence(timeout: 10))
    }

    private func capture(_ name: String) {
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = name
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

    func testNativeNavigationAndStoreCaptures() throws {
        app.buttons["见己"].firstMatch.tap()
        XCTAssertTrue(app.buttons["发送问题"].waitForExistence(timeout: 10))
        capture("zh-Hans-01-home")
        for (index, title, name) in [(1, "成长档案", "growth"), (2, "身边的人", "people"), (3, "我的", "me")] {
            let tab = app.buttons[title].firstMatch
            XCTAssertTrue(tab.waitForExistence(timeout: 15), "Native navigation includes \(title)")
            XCTAssertTrue(tab.isHittable)
            tab.tap()
            capture("zh-Hans-0\(index + 1)-\(name)")
        }
        app.buttons["切换到英文"].tap()
        XCTAssertTrue(app.buttons["Switch to Chinese"].waitForExistence(timeout: 10))
        for (index, title, name) in [(0, "Home", "home"), (1, "Growth", "growth"), (2, "People", "people"), (3, "Me", "me")] {
            let tab = app.buttons[title].firstMatch
            XCTAssertTrue(tab.waitForExistence(timeout: 10))
            tab.tap()
            capture("en-US-0\(index + 1)-\(name)")
        }
        app.buttons["Switch to Chinese"].tap()
    }

    private func tapButton(startingWith title: String) {
        let button = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", title)).firstMatch
        XCTAssertTrue(button.waitForExistence(timeout: 10))
        for _ in 0..<6 {
            if button.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(button.isHittable)
        button.tap()
    }

    func testAccountSheetMembershipAndResizing() throws {
        app.buttons["我的"].firstMatch.tap()
        tapButton(startingWith: "我的账号")
        XCTAssertTrue(app.buttons["通过 Apple 登录"].waitForExistence(timeout: 15))
        capture("qa-account-sheet")
        app.buttons["关闭"].firstMatch.tap()
        tapButton(startingWith: "隐私设置")
        tapButton(startingWith: "会员与订阅")
        let quota = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "每日免费对话 10 条")).firstMatch
        XCTAssertTrue(quota.waitForExistence(timeout: 15), "The actual native membership screen shows ten free replies")
        capture("qa-membership-ten-replies")
        app.buttons["关闭"].firstMatch.tap()
        app.buttons["关闭"].firstMatch.tap()
        app.buttons["见己"].firstMatch.tap()
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(app.buttons["切换到英文"].waitForExistence(timeout: 10))
        XCTAssertGreaterThan(app.frame.width, app.frame.height, "Scene supports a wide layout")
        capture("qa-landscape")
        XCUIDevice.shared.orientation = .portrait
        XCTAssertTrue(app.buttons["发送问题"].waitForExistence(timeout: 10))
    }
}
