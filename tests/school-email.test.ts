import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedSchoolEmail, normalizeSchoolEmail } from "@/lib/school-email";

test("normalizeSchoolEmail should trim and lowercase", () => {
  assert.equal(normalizeSchoolEmail("  TEST@HANYANG.AC.KR "), "test@hanyang.ac.kr");
});

test("isAllowedSchoolEmail should only allow hanyang.ac.kr domain", () => {
  assert.equal(isAllowedSchoolEmail("student@hanyang.ac.kr"), true);
  assert.equal(isAllowedSchoolEmail("student@gmail.com"), false);
});
