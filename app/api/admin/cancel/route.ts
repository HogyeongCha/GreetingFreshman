import { z } from "zod";
import { recordAdminAuditLog } from "@/lib/admin-audit";
import { jsonError, jsonOk } from "@/lib/http";
import { getClientIp } from "@/lib/request";
import { assertSameOrigin } from "@/lib/request-security";
import { requireAdmin } from "@/lib/require-admin";
import { getSupabaseServiceClient } from "@/lib/supabase";

const schema = z.object({
  applicantId: z.string().uuid(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.rpc("admin_cancel_application", {
      p_applicant_id: parsed.data.applicantId,
    });
    if (error) return jsonError(error.message, 409);
    await recordAdminAuditLog({
      action: "ADMIN_CANCEL_APPLICATION",
      adminId: auth.session?.adminId,
      loginId: auth.session?.loginId,
      ip: getClientIp(request),
      targetType: "applicant",
      targetId: parsed.data.applicantId,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError(error.message, (error as Error & { status: number }).status);
    }
    return jsonError(error instanceof Error ? error.message : "Cancellation failed", 500);
  }
}
