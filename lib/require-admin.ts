import { getAdminSessionFromCookies } from "@/lib/admin-auth";
import { jsonError } from "@/lib/http";

export async function requireAdmin() {
  const session = await getAdminSessionFromCookies();
  if (!session) return { errorResponse: jsonError("Unauthorized", 401), session: null };
  return { errorResponse: null, session };
}
