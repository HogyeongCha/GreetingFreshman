import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { getSeatLabel, isWaitlistSeatCode } from "@/lib/seat-layout";
import { getSupabaseServiceClient } from "@/lib/supabase";

const schema = z.object({
  studentId: z.string().regex(/^\d{8,10}$/),
  phoneLast4: z.string().regex(/^\d{4}$/),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", 400);

    const { studentId, phoneLast4 } = parsed.data;
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("applicants")
      .select("status,phone,seats(seat_code)")
      .eq("student_id", studentId)
      .in("status", ["CONFIRMED", "WAITLIST"])
      .limit(1)
      .maybeSingle();

    if (error) return jsonError(error.message, 500);
    if (!data || !(data.phone as string).endsWith(phoneLast4)) {
      return jsonOk({ found: false, notice: "신청 내역이 없습니다." });
    }

    const seatCode = (data.seats as { seat_code?: string } | null)?.seat_code ?? null;
    return jsonOk({
      found: true,
      seatCode,
      seatLabel: seatCode ? getSeatLabel(seatCode) : null,
      status: data.status,
      notice: isWaitlistSeatCode(seatCode ?? "") ? "참가대기 신청이 확인되었습니다." : "신청이 확인되었습니다.",
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Lookup failed", 500);
  }
}
