export function isEmbeddedBrowser(userAgent = globalThis.navigator?.userAgent || "") {
  return /MicroMessenger|Weibo|QQ\/|FBAN|FBAV|Instagram|Line\//i.test(userAgent);
}

export function isMobileDevice(navigatorObject = globalThis.navigator || {}) {
  return /Android|iPad|iPhone|iPod/i.test(navigatorObject.userAgent || "")
    || (navigatorObject.platform === "MacIntel" && navigatorObject.maxTouchPoints > 1);
}

export function canUseSystemShare(navigatorObject = globalThis.navigator || {}) {
  return Boolean(navigatorObject.share && isMobileDevice(navigatorObject) && !isEmbeddedBrowser(navigatorObject.userAgent));
}

export async function copyText(text, { navigatorObject = globalThis.navigator, documentObject = globalThis.document } = {}) {
  try {
    if (navigatorObject?.clipboard?.writeText) {
      await navigatorObject.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Continue with the compatibility fallback.
  }
  if (!documentObject) return false;
  const textarea = documentObject.createElement("textarea");
  textarea.value = text;
  textarea.readOnly = true;
  textarea.setAttribute("aria-hidden", "true");
  Object.assign(textarea.style, { position: "fixed", inset: "0 auto auto -9999px", opacity: "0" });
  documentObject.body.append(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  let copied = false;
  try { copied = documentObject.execCommand("copy"); } catch { copied = false; }
  textarea.remove();
  return copied;
}

export async function sharePageLink({ url, title, text, nativePlugin, native = false }) {
  if (native && nativePlugin) {
    try {
      const result = await nativePlugin.shareLink({ text, url });
      return result?.completed === false ? "cancelled" : "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }
  if (canUseSystemShare()) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }
  return (await copyText(url)) ? "copied" : "unavailable";
}
