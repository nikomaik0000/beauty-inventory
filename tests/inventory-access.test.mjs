import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateInventoryAccess,
  parseInventoryAllowedUserIds,
} from "../lib/inventory-access.ts";

const OWNER_ID = "2e1f7f38-3ba6-4d6e-8f74-5dc6c95d2575";
const OTHER_ID = "38824d15-79cc-4f32-b95b-42853805e00d";

test("unauthenticated requests are rejected", () => {
  assert.deepEqual(evaluateInventoryAccess(null, OWNER_ID), {
    allowed: false,
    reason: "unauthenticated",
    status: 401,
  });
});

test("a signed-in user outside the UUID allowlist is rejected", () => {
  assert.deepEqual(evaluateInventoryAccess(OTHER_ID, OWNER_ID), {
    allowed: false,
    reason: "not-allowlisted",
    status: 403,
  });
});

test("the designated UUID is allowed", () => {
  assert.deepEqual(evaluateInventoryAccess(OWNER_ID, ` ${OTHER_ID}, ${OWNER_ID.toUpperCase()} `), {
    allowed: true,
    reason: "allowed",
    status: 200,
  });
});

test("a missing or invalid allowlist fails closed", () => {
  assert.equal(evaluateInventoryAccess(OWNER_ID, undefined).status, 503);
  assert.equal(evaluateInventoryAccess(OWNER_ID, "not-a-uuid").status, 503);
  assert.deepEqual([...parseInventoryAllowedUserIds(`${OWNER_ID},bad-value`)], [OWNER_ID]);
});

