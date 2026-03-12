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
    const { data: applicant, error: selectError } = await supabase
      .from("applicants")
      .select("id,status")
      .eq("id", parsed.data.applicantId)
      .maybeSingle();

    if (selectError) return jsonError(selectError.message, 500);
    if (!applicant) return jsonError("Applicant not found", 404);
    if (applicant.status !== "CANCELED") return jsonError("Only canceled application can be deleted", 409);

    const { error: deleteError } = await supabase.from("applicants").delete().eq("id", parsed.data.applicantId);
    if (deleteError) return jsonError(deleteError.message, 500);

    await recordAdminAuditLog({
      action: "ADMIN_DELETE_CANCELED_APPLICATION",
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
    return jsonError(error instanceof Error ? error.message : "Delete failed", 500);
  }
}
