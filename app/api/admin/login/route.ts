import crypto from "node:crypto";
import { z } from "zod";
import { recordAdminAuditLog } from "@/lib/admin-audit";
import { createAdminSessionToken, setAdminSessionCookie } from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getClientIp } from "@/lib/request";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";
import { findFileAdminByLoginId } from "@/lib/admin-values";

const schema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
});

function safeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  try {
    assertSameOrigin(request);
    const rate = await consumeRateLimit({
      bucket: "admin-login",
      identifier: ip,
      limit: 8,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      const response = jsonError("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", 429);
      response.headers.set("Retry-After", String(rate.retryAfterSec));
      return response;
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);

    const admin = await findFileAdminByLoginId(parsed.data.loginId);
    if (!admin) {
      await recordAdminAuditLog({
        action: "ADMIN_LOGIN_FAILURE",
        loginId: parsed.data.loginId,
        ip,
        targetType: "admin",
        targetId: parsed.data.loginId,
        details: { reason: "login_id_not_found" },
      });
      return jsonError("Invalid credentials", 401);
    }

    const ok = safeEqualText(parsed.data.password, admin.password);
    if (!ok) {
      await recordAdminAuditLog({
        action: "ADMIN_LOGIN_FAILURE",
        adminId: admin.adminId,
        loginId: admin.loginId,
        ip,
        targetType: "admin",
        targetId: admin.adminId,
        details: { reason: "password_mismatch" },
      });
      return jsonError("Invalid credentials", 401);
    }

    const token = createAdminSessionToken({
      adminId: admin.adminId,
      loginId: admin.loginId,
      role: admin.role,
    });
    await setAdminSessionCookie(token);
    await recordAdminAuditLog({
      action: "ADMIN_LOGIN_SUCCESS",
      adminId: admin.adminId,
      loginId: admin.loginId,
      ip,
      targetType: "admin",
      targetId: admin.adminId,
      details: { role: admin.role, source: "@VALUES.json" },
    });
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError(error.message, (error as Error & { status: number }).status);
    }
    return jsonError(error instanceof Error ? error.message : "Login failed", 500);
  }
}
