import { z } from "zod";
import { HOLD_SECONDS } from "@/lib/constants";
import { jsonError, jsonOk } from "@/lib/http";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { assertTicketOpen } from "@/lib/time";
import { getClientIp } from "@/lib/request";
import { consumeRateLimit } from "@/lib/rate-limit";
import { classifyHoldError, createRequestId, logApiEvent } from "@/lib/api-observability";
import { isRealSeatCode } from "@/lib/seat-layout";

const schema = z.object({
  seatCode: z.string().min(2).max(10),
  holdOwnerToken: z.string().uuid(),
});

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  const ip = getClientIp(request);
  try {
    const rate = await consumeRateLimit({
      bucket: "seat-hold",
      identifier: ip,
      limit: 25,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      const response = jsonError("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", 429);
      response.headers.set("Retry-After", String(rate.retryAfterSec));
      response.headers.set("X-Request-Id", requestId);
      logApiEvent("request_error", {
        requestId,
        route: "/api/seats/hold",
        method: "POST",
        ip,
        status: 429,
        errorCode: "RATE_LIMITED",
        reason: "seat-hold",
        durationMs: Date.now() - startedAt,
      });
      return response;
    }

    assertTicketOpen(new Date());
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const response = jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
      response.headers.set("X-Request-Id", requestId);
      logApiEvent("request_error", {
        requestId,
        route: "/api/seats/hold",
        method: "POST",
        ip,
        seatCode: typeof body?.seatCode === "string" ? body.seatCode : undefined,
        status: 400,
        errorCode: "INVALID_REQUEST",
        durationMs: Date.now() - startedAt,
      });
      return response;
    }
    if (!isRealSeatCode(parsed.data.seatCode)) {
      const response = jsonError("실제 좌석만 선택할 수 있습니다.", 400);
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-Error-Code", "INVALID_SEAT_CODE");
      return response;
    }

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.rpc("hold_seat", {
      p_seat_code: parsed.data.seatCode,
      p_hold_owner: parsed.data.holdOwnerToken,
      p_hold_seconds: HOLD_SECONDS,
    });
    if (error) {
      const classified = classifyHoldError(error);
      const response = jsonError(classified.message, classified.status);
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-Error-Code", classified.code);
      logApiEvent("request_error", {
        requestId,
        route: "/api/seats/hold",
        method: "POST",
        ip,
        seatCode: parsed.data.seatCode,
        status: classified.status,
        errorCode: classified.code,
        reason: error.message,
        durationMs: Date.now() - startedAt,
      });
      return response;
    }

    const row = data?.[0];
    if (!row) {
      const response = jsonError("Failed to hold seat", 409);
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-Error-Code", "HOLD_EMPTY_RESULT");
      logApiEvent("request_error", {
        requestId,
        route: "/api/seats/hold",
        method: "POST",
        ip,
        seatCode: parsed.data.seatCode,
        status: 409,
        errorCode: "HOLD_EMPTY_RESULT",
        durationMs: Date.now() - startedAt,
      });
      return response;
    }
    const response = jsonOk({
      holdId: row.hold_id as string,
      seatCode: row.seat_code as string,
      expiresAt: row.expires_at as string,
    });
    response.headers.set("X-Request-Id", requestId);
    logApiEvent("request_ok", {
      requestId,
      route: "/api/seats/hold",
      method: "POST",
      ip,
      seatCode: row.seat_code as string,
      holdId: row.hold_id as string,
      status: 200,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const classified = classifyHoldError(error);
      const response = jsonError(classified.message, (error as Error & { status: number }).status);
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-Error-Code", classified.code);
      logApiEvent("request_error", {
        requestId,
        route: "/api/seats/hold",
        method: "POST",
        ip,
        status: (error as Error & { status: number }).status,
        errorCode: classified.code,
        reason: error.message,
        durationMs: Date.now() - startedAt,
      });
      return response;
    }
    const classified = classifyHoldError(error);
    const response = jsonError(classified.message, 500);
    response.headers.set("X-Request-Id", requestId);
    response.headers.set("X-Error-Code", classified.code);
    logApiEvent("request_error", {
      requestId,
      route: "/api/seats/hold",
      method: "POST",
      ip,
      status: 500,
      errorCode: classified.code,
      reason: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    });
    return response;
  }
}
