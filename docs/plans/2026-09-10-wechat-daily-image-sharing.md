# Daily tip image sharing in WeChat

The daily tip dialog previously used an anchor download whenever file sharing was unavailable, then reported success without any evidence of a download. In WeChat this could leave both actions ineffective.

The existing PNG design and QR footer remain. Generate its data URL before enabling actions so the actual image is available to long-press menus. WeChat and other embedded browsers show prominent save/send instructions and labels that explicitly require a long press. If the menu has no send action, save first and select the image from WeChat Photos. Never share or copy a page URL as an image fallback.

Ordinary mobile browsers with file sharing use the system sheet for both save and send. The payload contains only the PNG file and title. Desktop browsers retain file download with a truthful request status. Native image APIs remain in use. Cancellation and failures do not claim success.

Validation covers iPhone/Android WeChat user agents, decoded PNG dimensions, no download or URL share in WeChat, English labels, mobile file payloads and errors, desktop download, and native save/share. Browser emulation cannot prove a specific physical phone's WeChat context menu or Photos write; that requires real-device acceptance.
