import { mkdtemp, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { findFileAdminByLoginId, getFileAdminAccounts } from "@/lib/admin-values";
import { resetEnvCacheForTests } from "@/lib/env";

process.env.ADMIN_SESSION_SECRET = "this_is_a_test_secret_key_with_32_chars_or_more";

test("admin values should prefer fixed admin account from env", async () => {
  resetEnvCacheForTests();
  process.env.ADMIN_LOGIN_ID = "env-admin";
  process.env.ADMIN_PASSWORD = "env-secret";
  process.env.ADMIN_ROLE = "superadmin";
  process.env.ADMIN_ID = "11111111-1111-4111-8111-111111111111";

  const admins = await getFileAdminAccounts();
  const admin = await findFileAdminByLoginId("env-admin");

  assert.equal(admins.length, 1);
  assert.equal(admin?.loginId, "env-admin");
  assert.equal(admin?.password, "env-secret");
  assert.equal(admin?.role, "superadmin");

  delete process.env.ADMIN_LOGIN_ID;
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_ROLE;
  delete process.env.ADMIN_ID;
  resetEnvCacheForTests();
});

test("admin values should load accounts from configured json file", async () => {
  resetEnvCacheForTests();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "gf-admin-values-"));
  const valuesPath = path.join(tempDir, "@VALUES.json");
  process.env.ADMIN_VALUES_PATH = valuesPath;

  await writeFile(
    valuesPath,
    JSON.stringify({
      admins: [
        {
          adminId: "11111111-1111-4111-8111-111111111111",
          loginId: "root-admin",
          password: "secret123",
          role: "superadmin",
        },
      ],
    }),
    "utf8",
  );

  const admins = await getFileAdminAccounts();
  const admin = await findFileAdminByLoginId("root-admin");

  assert.equal(admins.length, 1);
  assert.equal(admin?.loginId, "root-admin");
  assert.equal(admin?.password, "secret123");

  delete process.env.ADMIN_VALUES_PATH;
  resetEnvCacheForTests();
  await rm(tempDir, { recursive: true, force: true });
});
