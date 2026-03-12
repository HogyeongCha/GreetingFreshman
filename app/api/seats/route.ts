import { jsonError, jsonOk } from "@/lib/http";
import { REAL_SEAT_CODES, WAITLIST_SEAT_CODES } from "@/lib/seat-layout";
import { getSeatSnapshot } from "@/lib/server-seat";
import { isWaitlistVisible } from "@/lib/waitlist";

export async function GET() {
  try {
    const snapshot = await getSeatSnapshot();
    const seats = REAL_SEAT_CODES.map((seatCode) =>
      snapshot.overriddenSeats.get(seatCode) ?? {
        seatCode,
        status: "AVAILABLE" as const,
        holdExpiresAt: null,
      },
    );
    const waitlistSeats = WAITLIST_SEAT_CODES.map((seatCode) =>
      snapshot.overriddenSeats.get(seatCode) ?? {
        seatCode,
        status: "AVAILABLE" as const,
        holdExpiresAt: null,
      },
    );
    return jsonOk({
      seats,
      remainingSeats: snapshot.remainingSeats,
      waitlist: {
        total: WAITLIST_SEAT_CODES.length,
        remaining: snapshot.remainingWaitlistSlots,
        visible: isWaitlistVisible(snapshot.remainingSeats),
        open: snapshot.remainingSeats <= 0 && snapshot.remainingWaitlistSlots > 0,
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load seats", 500);
  }
}
