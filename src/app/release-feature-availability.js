export function getReleaseFeatureAvailability({
  isNativeRuntime = false,
  hasSupabaseConfig = false,
  remoteRuntimeAllowed = false,
} = {}) {
  const nativeRemoteFeaturesUnavailable = isNativeRuntime && !hasSupabaseConfig;
  const remoteSettingsVisible = !nativeRemoteFeaturesUnavailable;

  return {
    nativeRemoteFeaturesUnavailable,
    remoteSettingsVisible,
    remoteOperationsAllowed: remoteRuntimeAllowed && remoteSettingsVisible,
  };
}
