import { clearAdminSessionCookie } from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { assertSameOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await clearAdminSessionCookie();
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return jsonError(error.message, (error as Error & { status: number }).status);
    }
    return jsonError(error instanceof Error ? error.message : "Logout failed", 500);
  }
}
