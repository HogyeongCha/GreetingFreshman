import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { getClientIp } from "@/lib/request";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isTurnstileEnabled, verifyTurnstileToken } from "@/lib/captcha";
import { isAllowedSchoolEmail, normalizeSchoolEmail } from "@/lib/school-email";
import { classifyApplicationError, createRequestId, logApiEvent } from "@/lib/api-observability";
import { getSeatLabel } from "@/lib/seat-layout";
import { assertTicketOpen } from "@/lib/time";
import { getRemainingSeatCount } from "@/lib/server-seat";

const schema = z.object({
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
      bucket: "waitlist-submit",
      identifier: ip,
      limit: 8,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      const response = jsonError("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", 429);
      response.headers.set("Retry-After", String(rate.retryAfterSec));
      response.headers.set("X-Request-Id", requestId);
      return response;
    }

    assertTicketOpen(new Date());
    const remainingSeats = await getRemainingSeatCount();
    if (remainingSeats > 0) {
      return jsonError("실제 좌석 신청이 아직 가능합니다. 참가대기는 좌석 마감 후에 열립니다.", 409);
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      const response = jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
      response.headers.set("X-Request-Id", requestId);
      return response;
    }

    const payload = parsed.data;
    if (!isAllowedSchoolEmail(payload.schoolEmail)) {
      return jsonError("학교 이메일(@hanyang.ac.kr)만 사용할 수 있습니다.", 400);
    }
    if (isTurnstileEnabled()) {
      const verified = await verifyTurnstileToken(payload.captchaToken ?? "", ip);
      if (!verified) return jsonError("캡차 검증에 실패했습니다. 다시 시도해 주세요.", 400);
    }

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.rpc("create_waitlist_application", {
      p_name: payload.name,
      p_student_id: payload.studentId,
      p_department: payload.department,
      p_phone: payload.phone,
      p_school_email: normalizeSchoolEmail(payload.schoolEmail),
      p_instagram_id: payload.instagramId ?? null,
    });

    if (error) {
      const classified = classifyApplicationError(error);
      const response = jsonError(
        error.message.includes("waitlist full") ? "참가대기 신청이 모두 마감되었습니다." : classified.message,
        error.message.includes("waitlist full") ? 409 : classified.status,
      );
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-Error-Code", error.message.includes("waitlist full") ? "WAITLIST_FULL" : classified.code);
      logApiEvent("request_error", {
        requestId,
        route: "/api/waitlist",
        method: "POST",
        ip,
        status: error.message.includes("waitlist full") ? 409 : classified.status,
        errorCode: error.message.includes("waitlist full") ? "WAITLIST_FULL" : classified.code,
        reason: error.message,
        durationMs: Date.now() - startedAt,
      });
      return response;
    }

    const row = data?.[0];
    if (!row) return jsonError("Waitlist submission failed", 409);

    const response = jsonOk({
      applicationId: row.application_id as string,
      seatCode: row.seat_code as string,
      waitlistNumber: row.waitlist_number as number,
      seatLabel: getSeatLabel(row.seat_code as string),
      createdAt: row.created_at as string,
    });
    response.headers.set("X-Request-Id", requestId);
    logApiEvent("request_ok", {
      requestId,
      route: "/api/waitlist",
      method: "POST",
      ip,
      seatCode: row.seat_code as string,
      status: 200,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError(error.message, (error as Error & { status: number }).status);
    }
    return jsonError(error instanceof Error ? error.message : "Failed to submit waitlist", 500);
  }
}
