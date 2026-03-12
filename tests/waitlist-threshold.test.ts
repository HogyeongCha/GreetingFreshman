import test from "node:test";
import assert from "node:assert/strict";
import { WAITLIST_VISIBLE_REMAINING_SEATS, isWaitlistVisible } from "@/lib/waitlist";

test("waitlist becomes visible for everyone once remaining seats reach ten", () => {
  assert.equal(WAITLIST_VISIBLE_REMAINING_SEATS, 10);
  assert.equal(isWaitlistVisible(12), false);
  assert.equal(isWaitlistVisible(11), false);
  assert.equal(isWaitlistVisible(10), true);
  assert.equal(isWaitlistVisible(0), true);
});
