import { z } from "zod";
import { recordAdminAuditLog } from "@/lib/admin-audit";
import { jsonError, jsonOk } from "@/lib/http";
import { getClientIp } from "@/lib/request";
import { assertSameOrigin } from "@/lib/request-security";
import { requireAdmin } from "@/lib/require-admin";
import { getSiteNotices } from "@/lib/site-settings";
import { getSupabaseServiceClient } from "@/lib/supabase";

const schema = z.object({
  homeNotice: z.string().min(1).max(1000),
  completeNotice: z.string().min(1).max(1000),
});

export async function GET() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const notices = await getSiteNotices();
    return jsonOk({
      homeNotice: notices.home_notice,
      completeNotice: notices.complete_notice,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load notices", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);

    const supabase = getSupabaseServiceClient();
    const rows = [
      { key: "home_notice", content: parsed.data.homeNotice },
      { key: "complete_notice", content: parsed.data.completeNotice },
    ];
    const { error } = await supabase.from("site_notices").upsert(rows, { onConflict: "key" });
    if (error) return jsonError(error.message, 500);
    await recordAdminAuditLog({
      action: "ADMIN_UPDATE_SITE_NOTICE",
      adminId: auth.session?.adminId,
      loginId: auth.session?.loginId,
      ip: getClientIp(request),
      targetType: "site_notice",
      targetId: "home_notice,complete_notice",
      details: {
        homeNoticeLength: parsed.data.homeNotice.length,
        completeNoticeLength: parsed.data.completeNotice.length,
      },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError(error.message, (error as Error & { status: number }).status);
    }
    return jsonError(error instanceof Error ? error.message : "Failed to save notices", 500);
  }
}
