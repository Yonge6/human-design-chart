import assert from "node:assert/strict";
import test from "node:test";

import {
  canUseRemoteServices,
  effectiveRemoteConsent,
  isCapacitorNativeRuntime,
} from "../src/app/runtime-security.js";

test("remote services require a secure context or native Capacitor runtime", () => {
  assert.equal(canUseRemoteServices({ isSecureContext: false, isNativeRuntime: false }), false);
  assert.equal(canUseRemoteServices({ isSecureContext: true, isNativeRuntime: false }), true);
  assert.equal(canUseRemoteServices({ isSecureContext: false, isNativeRuntime: true }), true);
});

test("Capacitor runtime detection accepts native platforms only", () => {
  assert.equal(isCapacitorNativeRuntime(undefined), false);
  assert.equal(isCapacitorNativeRuntime({ isNativePlatform: () => true }), true);
  assert.equal(isCapacitorNativeRuntime({ isNativePlatform: () => false }), false);
  assert.equal(isCapacitorNativeRuntime({ getPlatform: () => "ios" }), true);
  assert.equal(isCapacitorNativeRuntime({ getPlatform: () => "web" }), false);
});

test("insecure mode masks remote consent without mutating stored preferences", () => {
  const stored = { cloudSave: true, productAnalytics: true };

  assert.deepEqual(effectiveRemoteConsent(stored, false), { cloudSave: false, productAnalytics: false });
  assert.deepEqual(stored, { cloudSave: true, productAnalytics: true });
  assert.deepEqual(effectiveRemoteConsent(stored, true), stored);
});
