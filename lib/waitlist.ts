export const WAITLIST_VISIBLE_REMAINING_SEATS = 10;

export function isWaitlistVisible(remainingSeats: number) {
  return remainingSeats <= WAITLIST_VISIBLE_REMAINING_SEATS;
}
