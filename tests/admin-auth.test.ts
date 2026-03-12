import test from "node:test";
import assert from "node:assert/strict";
import { createAdminSessionToken, verifyAdminSessionToken } from "@/lib/admin-auth";

process.env.ADMIN_SESSION_SECRET = "this_is_a_test_secret_key_with_32_chars_or_more";

test("admin session token should be issued and verified", () => {
  const token = createAdminSessionToken({
    adminId: "admin-1",
    loginId: "admin",
    role: "superadmin",
  });
  const decoded = verifyAdminSessionToken(token);
  assert.ok(decoded);
  assert.equal(decoded?.adminId, "admin-1");
  assert.equal(decoded?.loginId, "admin");
  assert.equal(decoded?.role, "superadmin");
});

test("tampered token should fail verification", () => {
  const token = createAdminSessionToken({
    adminId: "admin-2",
    loginId: "staff",
    role: "staff",
  });
  const tampered = `${token}x`;
  const decoded = verifyAdminSessionToken(tampered);
  assert.equal(decoded, null);
});

test("malformed token payload should fail verification", () => {
  const invalid = `${Buffer.from("{not-json", "utf8").toString("base64url")}.invalid`;
  const decoded = verifyAdminSessionToken(invalid);
  assert.equal(decoded, null);
});
