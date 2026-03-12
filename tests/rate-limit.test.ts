import test from "node:test";
import assert from "node:assert/strict";
import { __resetRateLimitForTests, consumeRateLimit } from "@/lib/rate-limit";

test("rate limit should block after exceeding limit in same window", async () => {
  __resetRateLimitForTests();
  const config = {
    bucket: "test-hold",
    identifier: "1.1.1.1",
    limit: 2,
    windowMs: 60_000,
  };

  const first = await consumeRateLimit(config);
  const second = await consumeRateLimit(config);
  const third = await consumeRateLimit(config);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfterSec >= 1);
});
