import { getSupabaseServiceClient } from "@/lib/supabase";

type BucketConfig = {
  bucket: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

type BucketState = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
};

const states = new Map<string, BucketState>();

function cleanupExpired(now: number) {
  for (const [key, state] of states) {
    if (state.resetAt <= now) states.delete(key);
  }
}

function consumeRateLimitLocal(config: BucketConfig): RateLimitResult {
  const now = Date.now();
  cleanupExpired(now);

  const key = `${config.bucket}:${config.identifier}`;
  const existing = states.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + config.windowMs;
    states.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(config.limit - 1, 0),
      resetAt,
      retryAfterSec: Math.ceil(config.windowMs / 1000),
    };
  }

  existing.count += 1;
  states.set(key, existing);

  return {
    allowed: existing.count <= config.limit,
    remaining: Math.max(config.limit - existing.count, 0),
    resetAt: existing.resetAt,
    retryAfterSec: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
  };
}

function canUseSharedRateLimit() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function consumeRateLimit(config: BucketConfig): Promise<RateLimitResult> {
  if (!canUseSharedRateLimit()) {
    return consumeRateLimitLocal(config);
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_bucket: config.bucket,
    p_identifier: config.identifier,
    p_limit: config.limit,
    p_window_ms: config.windowMs,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = data?.[0];
  if (!row) {
    throw new Error("Failed to consume shared rate limit");
  }

  return {
    allowed: Boolean(row.allowed),
    remaining: Number(row.remaining ?? 0),
    resetAt: new Date(String(row.reset_at)).getTime(),
    retryAfterSec: Number(row.retry_after_sec ?? 1),
  };
}

export function __resetRateLimitForTests() {
  states.clear();
}
