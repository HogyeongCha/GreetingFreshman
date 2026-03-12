import { z } from "zod";
import { recordAdminAuditLog } from "@/lib/admin-audit";
import { jsonError, jsonOk } from "@/lib/http";
import { getClientIp } from "@/lib/request";
import { assertSameOrigin } from "@/lib/request-security";
import { requireAdmin } from "@/lib/require-admin";
import { isRealSeatCode } from "@/lib/seat-layout";
import { isAllowedSchoolEmail, normalizeSchoolEmail } from "@/lib/school-email";
import { getSupabaseServiceClient } from "@/lib/supabase";

const schema = z.object({
  seatCode: z.string().min(2).max(10),
  name: z.string().min(1).max(50),
  studentId: z.string().regex(/^\d{8,10}$/),
  department: z.string().min(1).max(80),
  phone: z.string().regex(/^\d{10,11}$/),
  schoolEmail: z.string().email(),
  instagramId: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    if (!isRealSeatCode(parsed.data.seatCode)) {
      return jsonError("실제 좌석만 수동 배정할 수 있습니다.", 400);
    }
    if (!isAllowedSchoolEmail(parsed.data.schoolEmail)) {
      return jsonError("학교 이메일(@hanyang.ac.kr)만 사용할 수 있습니다.", 400);
    }

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.rpc("admin_create_application", {
      p_name: parsed.data.name,
      p_student_id: parsed.data.studentId,
      p_department: parsed.data.department,
      p_phone: parsed.data.phone,
      p_school_email: normalizeSchoolEmail(parsed.data.schoolEmail),
      p_instagram_id: parsed.data.instagramId ?? null,
      p_target_seat_code: parsed.data.seatCode,
    });
    if (error) return jsonError(error.message, 409);
    await recordAdminAuditLog({
      action: "ADMIN_MANUAL_ASSIGN",
      adminId: auth.session?.adminId,
      loginId: auth.session?.loginId,
      ip: getClientIp(request),
      targetType: "seat",
      targetId: parsed.data.seatCode,
      details: { source: "manual_assign" },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError(error.message, (error as Error & { status: number }).status);
    }
    return jsonError(error instanceof Error ? error.message : "Manual assignment failed", 500);
  }
}
