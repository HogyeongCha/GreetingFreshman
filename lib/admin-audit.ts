import { getSupabaseServiceClient } from "@/lib/supabase";

type AdminAuditAction =
  | "ADMIN_LOGIN_SUCCESS"
  | "ADMIN_LOGIN_FAILURE"
  | "ADMIN_CANCEL_APPLICATION"
  | "ADMIN_DELETE_CANCELED_APPLICATION"
  | "ADMIN_CHANGE_SEAT"
  | "ADMIN_MANUAL_ASSIGN"
  | "ADMIN_BLOCK_SEAT"
  | "ADMIN_UPDATE_SITE_NOTICE";

type RecordAdminAuditLogInput = {
  action: AdminAuditAction;
  adminId?: string | null;
  loginId?: string | null;
  ip?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
};

export async function recordAdminAuditLog(input: RecordAdminAuditLogInput) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_id: input.adminId ?? null,
    login_id: input.loginId ?? null,
    action: input.action,
    ip_address: input.ip ?? null,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    details: input.details ?? {},
  });

  if (error) {
    console.error(JSON.stringify({
      event: "admin_audit_log_failed",
      action: input.action,
      adminId: input.adminId ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      reason: error.message,
    }));
  }
}
