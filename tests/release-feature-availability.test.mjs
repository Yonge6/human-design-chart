import assert from "node:assert/strict";
import test from "node:test";

import { getReleaseFeatureAvailability } from "../src/app/release-feature-availability.js";

test("Web keeps remote settings visible regardless of Supabase configuration", () => {
  assert.deepEqual(getReleaseFeatureAvailability({
    isNativeRuntime: false,
    hasSupabaseConfig: false,
    remoteRuntimeAllowed: true,
  }), {
    nativeRemoteFeaturesUnavailable: false,
    remoteSettingsVisible: true,
    remoteOperationsAllowed: true,
  });
});

test("native runtime without Supabase hides and blocks remote features", () => {
  assert.deepEqual(getReleaseFeatureAvailability({
    isNativeRuntime: true,
    hasSupabaseConfig: false,
    remoteRuntimeAllowed: true,
  }), {
    nativeRemoteFeaturesUnavailable: true,
    remoteSettingsVisible: false,
    remoteOperationsAllowed: false,
  });
});

test("native runtime with complete Supabase configuration can expose future features", () => {
  assert.deepEqual(getReleaseFeatureAvailability({
    isNativeRuntime: true,
    hasSupabaseConfig: true,
    remoteRuntimeAllowed: true,
  }), {
    nativeRemoteFeaturesUnavailable: false,
    remoteSettingsVisible: true,
    remoteOperationsAllowed: true,
  });
});
