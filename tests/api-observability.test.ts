import test from "node:test";
import assert from "node:assert/strict";
import { classifyApplicationError, classifyHoldError } from "@/lib/api-observability";

test("classifyApplicationError reads message from plain object errors", () => {
  const result = classifyApplicationError({ message: "duplicate application" });
  assert.equal(result.code, "DUPLICATE_APPLICATION");
  assert.equal(result.message, "이미 신청이 완료된 정보입니다.");
  assert.equal(result.status, 409);
});

test("classifyApplicationError maps invalid hold to a user-friendly message", () => {
  const result = classifyApplicationError({ message: "invalid hold" });
  assert.equal(result.code, "INVALID_HOLD");
  assert.equal(result.message, "유효하지 않은 좌석 선점입니다. 좌석 선택부터 다시 진행해 주세요.");
  assert.equal(result.status, 409);
});

test("classifyHoldError reads message from plain object errors", () => {
  const result = classifyHoldError({ message: "seat not available" });
  assert.equal(result.code, "SEAT_NOT_AVAILABLE");
  assert.equal(result.message, "이미 선점되었거나 사용할 수 없는 좌석입니다.");
  assert.equal(result.status, 409);
});
