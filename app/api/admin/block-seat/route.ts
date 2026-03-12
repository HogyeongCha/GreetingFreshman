import { z } from "zod";
import { recordAdminAuditLog } from "@/lib/admin-audit";
import { jsonError, jsonOk } from "@/lib/http";
import { getClientIp } from "@/lib/request";
import { assertSameOrigin } from "@/lib/request-security";
import { requireAdmin } from "@/lib/require-admin";
import { isRealSeatCode } from "@/lib/seat-layout";
import { getSupabaseServiceClient } from "@/lib/supabase";

const schema = z.object({
  seatCode: z.string().min(2).max(10),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    if (!isRealSeatCode(parsed.data.seatCode)) {
      return jsonError("실제 좌석만 차단할 수 있습니다.", 400);
    }

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.from("seats").select("id,status").eq("seat_code", parsed.data.seatCode).maybeSingle();
    if (error) return jsonError(error.message, 500);
    if (!data) return jsonError("Seat not found", 404);

    const currentStatus = data.status as string;
    if (currentStatus === "CONFIRMED") {
      return jsonError("확정된 좌석은 차단할 수 없습니다.", 409);
    }

    const nextStatus = currentStatus === "BLOCKED" ? "AVAILABLE" : "BLOCKED";
    const { error: updateError } = await supabase
      .from("seats")
      .update({
        status: nextStatus,
        hold_id: null,
        hold_owner: null,
        hold_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id as string);

    if (updateError) return jsonError(updateError.message, 500);
    await recordAdminAuditLog({
      action: "ADMIN_BLOCK_SEAT",
      adminId: auth.session?.adminId,
      loginId: auth.session?.loginId,
      ip: getClientIp(request),
      targetType: "seat",
      targetId: parsed.data.seatCode,
      details: { nextStatus },
    });
    return jsonOk({ ok: true, status: nextStatus });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError(error.message, (error as Error & { status: number }).status);
    }
    return jsonError(error instanceof Error ? error.message : "Seat block toggle failed", 500);
  }
}
