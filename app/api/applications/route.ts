import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { assertTicketOpen } from "@/lib/time";
import { getClientIp } from "@/lib/request";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isTurnstileEnabled, verifyTurnstileToken } from "@/lib/captcha";
import { isAllowedSchoolEmail, normalizeSchoolEmail } from "@/lib/school-email";
import { classifyApplicationError, createRequestId, logApiEvent } from "@/lib/api-observability";

const schema = z.object({
  holdId: z.string().uuid(),
  holdOwnerToken: z.string().uuid(),
  name: z.string().min(1).max(50),
  studentId: z.string().regex(/^\d{8,10}$/),
  department: z.string().min(1).max(80),
  phone: z.string().regex(/^\d{10,11}$/),
  schoolEmail: z.string().email(),
  instagramId: z.string().max(100).optional(),
  captchaToken: z.string().optional(),
  consentPersonal: z.literal(true),
  consentNotice: z.literal(true),
});

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  const ip = getClientIp(request);
  try {
    const rate = await consumeRateLimit({
      bucket: "application-submit",
      identifier: ip,
      limit: 8,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      const response = jsonError("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", 429);
      response.headers.set("Retry-After", String(rate.retryAfterSec));
      response.headers.set("X-Request-Id", requestId);
      logApiEvent("request_error", {
        requestId,
        route: "/api/applications",
        method: "POST",
        ip,
        status: 429,
        errorCode: "RATE_LIMITED",
        reason: "application-submit",
        durationMs: Date.now() - startedAt,
      });
      return response;
    }

    assertTicketOpen(new Date());
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      const response = jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
      response.headers.set("X-Request-Id", requestId);
      logApiEvent("request_error", {
        requestId,
        route: "/api/applications",
        method: "POST",
        ip,
        status: 400,
        errorCode: "INVALID_REQUEST",
        durationMs: Date.now() - startedAt,
      });
      return response;
    }

    const payload = parsed.data;
    if (!isAllowedSchoolEmail(payload.schoolEmail)) {
      const response = jsonError("학교 이메일(@hanyang.ac.kr)만 사용할 수 있습니다.", 400);
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-Error-Code", "INVALID_SCHOOL_EMAIL");
      logApiEvent("request_error", {
        requestId,
        route: "/api/applications",
        method: "POST",
        ip,
        holdId: payload.holdId,
        status: 400,
        errorCode: "INVALID_SCHOOL_EMAIL",
        durationMs: Date.now() - startedAt,
      });
      return response;
    }
    if (isTurnstileEnabled()) {
      const token = payload.captchaToken ?? "";
      const verified = await verifyTurnstileToken(token, ip);
      if (!verified) {
        const response = jsonError("캡차 검증에 실패했습니다. 다시 시도해 주세요.", 400);
        response.headers.set("X-Request-Id", requestId);
        response.headers.set("X-Error-Code", "CAPTCHA_FAILED");
        logApiEvent("request_error", {
          requestId,
          route: "/api/applications",
          method: "POST",
          ip,
          holdId: payload.holdId,
          status: 400,
          errorCode: "CAPTCHA_FAILED",
          durationMs: Date.now() - startedAt,
        });
        return response;
      }
    }

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.rpc("confirm_application", {
      p_hold_id: payload.holdId,
      p_hold_owner: payload.holdOwnerToken,
      p_name: payload.name,
      p_student_id: payload.studentId,
      p_department: payload.department,
      p_phone: payload.phone,
      p_school_email: normalizeSchoolEmail(payload.schoolEmail),
      p_instagram_id: payload.instagramId ?? null,
    });

    if (error) {
      const classified = classifyApplicationError(error);
      const response = jsonError(classified.message, classified.status);
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-Error-Code", classified.code);
      logApiEvent("request_error", {
        requestId,
        route: "/api/applications",
        method: "POST",
        ip,
        holdId: payload.holdId,
        status: classified.status,
        errorCode: classified.code,
        reason: error.message,
        durationMs: Date.now() - startedAt,
      });
      return response;
    }
    const row = data?.[0];
    if (!row) {
      const response = jsonError("Application confirmation failed", 409);
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-Error-Code", "APPLICATION_EMPTY_RESULT");
      logApiEvent("request_error", {
        requestId,
        route: "/api/applications",
        method: "POST",
        ip,
        holdId: payload.holdId,
        status: 409,
        errorCode: "APPLICATION_EMPTY_RESULT",
        durationMs: Date.now() - startedAt,
      });
      return response;
    }

    const response = jsonOk({
      applicationId: row.application_id as string,
      seatCode: row.seat_code as string,
      createdAt: row.created_at as string,
    });
    response.headers.set("X-Request-Id", requestId);
    logApiEvent("request_ok", {
      requestId,
      route: "/api/applications",
      method: "POST",
      ip,
      seatCode: row.seat_code as string,
      holdId: payload.holdId,
      status: 200,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const classified = classifyApplicationError(error);
      const response = jsonError(classified.message, (error as Error & { status: number }).status);
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-Error-Code", classified.code);
      logApiEvent("request_error", {
        requestId,
        route: "/api/applications",
        method: "POST",
        ip,
        status: (error as Error & { status: number }).status,
        errorCode: classified.code,
        reason: error.message,
        durationMs: Date.now() - startedAt,
      });
      return response;
    }
    const classified = classifyApplicationError(error);
    const response = jsonError(classified.message, 500);
    response.headers.set("X-Request-Id", requestId);
    response.headers.set("X-Error-Code", classified.code);
    logApiEvent("request_error", {
      requestId,
      route: "/api/applications",
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
