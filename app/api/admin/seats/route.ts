import { jsonError, jsonOk } from "@/lib/http";
import { MANAGED_SEAT_CODES } from "@/lib/seat-layout";
import { requireAdmin } from "@/lib/require-admin";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { releaseExpiredHolds } from "@/lib/server-seat";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    await releaseExpiredHolds();
    const supabase = getSupabaseServiceClient();

    const [{ data: seats, error: seatsError }, { data: applicants, error: applicantsError }] = await Promise.all([
      supabase.from("seats").select("id,seat_code,status,hold_owner,hold_expires_at").in("seat_code", MANAGED_SEAT_CODES).order("seat_code", { ascending: true }),
      supabase
        .from("applicants")
        .select("id,name,student_id,department,phone,school_email,instagram_id,status,seat_id")
        .in("status", ["CONFIRMED", "WAITLIST"]),
    ]);

    if (seatsError) return jsonError(seatsError.message, 500);
    if (applicantsError) return jsonError(applicantsError.message, 500);

    const applicantBySeatId = new Map((applicants ?? []).map((item) => [item.seat_id as string, item]));
    const items = (seats ?? []).map((seat) => ({
      id: seat.id as string,
      seatCode: seat.seat_code as string,
      status: seat.status as "AVAILABLE" | "HOLD" | "CONFIRMED" | "BLOCKED",
      holdOwner: seat.hold_owner as string | null,
      holdExpiresAt: seat.hold_expires_at as string | null,
      applicant: applicantBySeatId.get(seat.id as string) ?? null,
    }));

    return jsonOk({ items });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load seat dashboard", 500);
  }
}
