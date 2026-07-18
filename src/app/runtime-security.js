export function canUseRemoteServices({ isSecureContext = false, isNativeRuntime = false } = {}) {
  return isSecureContext === true || isNativeRuntime === true;
}

export function isCapacitorNativeRuntime(capacitor = globalThis.Capacitor) {
  if (!capacitor) return false;
  if (typeof capacitor.isNativePlatform === "function") return capacitor.isNativePlatform() === true;
  if (typeof capacitor.getPlatform === "function") return ["ios", "android"].includes(capacitor.getPlatform());
  return false;
}

export function effectiveRemoteConsent(settings = {}, remoteServicesAllowed = false) {
  if (!remoteServicesAllowed) return { cloudSave: false, productAnalytics: false };
  return {
    cloudSave: settings.cloudSave === true,
    productAnalytics: settings.productAnalytics === true,
  };
}
