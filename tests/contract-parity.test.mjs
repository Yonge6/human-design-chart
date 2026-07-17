import assert from "node:assert/strict";
import test from "node:test";

import * as runtimeContract from "../shared/human-design-profile-contract.js";
import * as edgeContract from "../supabase/functions/_shared/human-design-profile-contract.js";
import * as runtimeEvents from "../shared/product-event-contract.js";
import * as edgeEvents from "../supabase/functions/_shared/product-event-contract.js";

test("browser, Node, and Deno Edge import one canonical contract implementation", () => {
  assert.equal(runtimeContract.createChartHash, edgeContract.createChartHash);
  assert.equal(runtimeContract.validateHumanDesignProfileSnapshot, edgeContract.validateHumanDesignProfileSnapshot);
  assert.equal(runtimeEvents.validateProductEvent, edgeEvents.validateProductEvent);
  assert.equal(runtimeContract.PROFILE_SCHEMA_VERSION, "1.0");
  assert.equal(runtimeContract.PROFILE_ENGINE_VERSION, "1.0.0");
});
