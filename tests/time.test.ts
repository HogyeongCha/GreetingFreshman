import test from "node:test";
import assert from "node:assert/strict";
import { OPEN_AT_KST } from "@/lib/constants";
import { getOpenAtDate, isTicketOpenAt } from "@/lib/time";

test("open time should match configured OPEN_AT_KST value", () => {
  assert.equal(getOpenAtDate().toISOString(), new Date(OPEN_AT_KST).toISOString());
});

test("isTicketOpenAt should be false before open and true after open", () => {
  const openAt = getOpenAtDate().getTime();
  assert.equal(isTicketOpenAt(new Date(openAt - 1)), false);
  assert.equal(isTicketOpenAt(new Date(openAt)), true);
});
