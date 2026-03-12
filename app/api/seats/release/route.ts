import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { getSupabaseServiceClient } from "@/lib/supabase";

const schema = z.object({
  holdId: z.string().uuid(),
  holdOwnerToken: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase
      .from("seats")
      .update({
        status: "AVAILABLE",
        hold_id: null,
        hold_owner: null,
        hold_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("hold_id", parsed.data.holdId)
      .eq("hold_owner", parsed.data.holdOwnerToken)
      .eq("status", "HOLD");

    if (error) return jsonError(error.message, 500);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to release hold", 500);
  }
}
