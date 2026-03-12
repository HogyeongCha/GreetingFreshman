import { jsonError, jsonOk } from "@/lib/http";
import { OPEN_AT_KST, TOTAL_SEATS, TOTAL_WAITLIST_SLOTS } from "@/lib/constants";
import { getOpenAtDate, isTicketOpenAt } from "@/lib/time";
import { getSeatSnapshot } from "@/lib/server-seat";
import { isWaitlistVisible } from "@/lib/waitlist";

export async function GET() {
  try {
    const now = new Date();
    const snapshot = await getSeatSnapshot();
    const remainingSeats = snapshot.remainingSeats;
    const remainingWaitlistSlots = snapshot.remainingWaitlistSlots;

    const isOpen = isTicketOpenAt(now);
    const isClosed = isOpen && remainingSeats <= 0;
    const waitlistVisible = isWaitlistVisible(remainingSeats);
    const waitlistOpen = isOpen && remainingSeats <= 0 && remainingWaitlistSlots > 0;
    const isFullyClosed = isOpen && remainingSeats <= 0 && remainingWaitlistSlots <= 0;

    return jsonOk({
      now: now.toISOString(),
      openAt: getOpenAtDate().toISOString(),
      openAtKst: OPEN_AT_KST,
      isOpen,
      isClosed,
      isFullyClosed,
      waitlistVisible,
      waitlistOpen,
      remainingSeats,
      remainingWaitlistSlots,
      totalSeats: TOTAL_SEATS,
      totalWaitlistSlots: TOTAL_WAITLIST_SLOTS,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load event status", 500);
  }
}
