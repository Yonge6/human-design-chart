export function canUseRemoteServices({ isSecureContext = false, isNativeRuntime = false } = {}) {
  return isSecureContext === true || isNativeRuntime === true;
}

export function isCapacitorNativeRuntime(capacitor = globalThis.Capacitor) {
  if (!capacitor) return false;
  if (typeof capacitor.isNativePlatform === "function") return capacitor.isNativePlatform() === true;
  if (typeof capacitor.getPlatform === "function") return ["ios", "android"].includes(capacitor.getPlatform());
  return false;
}

export function nativeImageCapabilities({ isNativeRuntime = false, pluginAvailable = false, plugin } = {}) {
  const available = isNativeRuntime && pluginAvailable;
  return {
    save: available && typeof plugin?.saveImage === "function",
    share: available && typeof plugin?.shareImage === "function",
  };
}

export function effectiveRemoteConsent(settings = {}, remoteServicesAllowed = false) {
  if (!remoteServicesAllowed) return { cloudSave: false, productAnalytics: false };
  return {
    cloudSave: settings.cloudSave === true,
    productAnalytics: settings.productAnalytics === true,
  };
}
