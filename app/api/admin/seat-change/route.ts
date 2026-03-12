import { z } from "zod";
import { recordAdminAuditLog } from "@/lib/admin-audit";
import { jsonError, jsonOk } from "@/lib/http";
import { getClientIp } from "@/lib/request";
import { assertSameOrigin } from "@/lib/request-security";
import { requireAdmin } from "@/lib/require-admin";
import { isRealSeatCode } from "@/lib/seat-layout";
import { getSupabaseServiceClient } from "@/lib/supabase";

const schema = z.object({
  applicantId: z.string().uuid(),
  targetSeatCode: z.string().min(2).max(10),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    if (!isRealSeatCode(parsed.data.targetSeatCode)) {
      return jsonError("실제 좌석으로만 이동할 수 있습니다.", 400);
    }

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.rpc("admin_change_seat", {
      p_applicant_id: parsed.data.applicantId,
      p_target_seat_code: parsed.data.targetSeatCode,
    });
    if (error) return jsonError(error.message, 409);
    await recordAdminAuditLog({
      action: "ADMIN_CHANGE_SEAT",
      adminId: auth.session?.adminId,
      loginId: auth.session?.loginId,
      ip: getClientIp(request),
      targetType: "applicant",
      targetId: parsed.data.applicantId,
      details: { targetSeatCode: parsed.data.targetSeatCode },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError(error.message, (error as Error & { status: number }).status);
    }
    return jsonError(error instanceof Error ? error.message : "Seat change failed", 500);
  }
}
