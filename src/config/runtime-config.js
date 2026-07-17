const defaults = {
  supabaseUrl: "",
  supabasePublishableKey: "",
  apiBaseUrl: "",
  appVersion: "development",
  gitCommit: "development",
  buildDate: "development",
  environment: "development",
};

export const runtimeConfig = Object.freeze({ ...defaults, ...(globalThis.PLUTO_CONFIG || {}) });

export function hasSupabaseConfig() {
  return Boolean(runtimeConfig.supabaseUrl && runtimeConfig.supabasePublishableKey);
}

export function hasApiConfig() {
  return Boolean(runtimeConfig.apiBaseUrl);
}
