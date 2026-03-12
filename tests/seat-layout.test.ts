import test from "node:test";
import assert from "node:assert/strict";
import { REAL_SEAT_CODES, WAITLIST_SEAT_CODES, getSeatLabel, isRealSeatCode, isWaitlistSeatCode } from "@/lib/seat-layout";

test("real and waitlist seat counts should match venue layout", () => {
  assert.equal(REAL_SEAT_CODES.length, 112);
  assert.equal(WAITLIST_SEAT_CODES.length, 16);
});

test("seat type helpers should classify codes correctly", () => {
  assert.equal(isRealSeatCode("B12"), true);
  assert.equal(isWaitlistSeatCode("Z3"), true);
  assert.equal(isRealSeatCode("Z3"), false);
  assert.equal(getSeatLabel("Z3"), "참가대기 3번");
});
