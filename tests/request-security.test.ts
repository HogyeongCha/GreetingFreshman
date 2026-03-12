import test from "node:test";
import assert from "node:assert/strict";
import { assertSameOrigin } from "@/lib/request-security";

test("assertSameOrigin allows matching origin", () => {
  const request = new Request("http://localhost:3000/api/admin/login", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      host: "localhost:3000",
    },
  });

  assert.doesNotThrow(() => assertSameOrigin(request));
});

test("assertSameOrigin rejects mismatched origin", () => {
  const request = new Request("http://localhost:3000/api/admin/login", {
    method: "POST",
    headers: {
      origin: "https://evil.example",
      host: "localhost:3000",
    },
  });

  assert.throws(() => assertSameOrigin(request), /Invalid origin/);
});
