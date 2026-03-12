import { OPEN_AT_KST } from "@/lib/constants";

export function getOpenAtDate(): Date {
  return new Date(OPEN_AT_KST);
}

export function isTicketOpenAt(now: Date): boolean {
  return now.getTime() >= getOpenAtDate().getTime();
}

export function assertTicketOpen(now: Date): void {
  if (!isTicketOpenAt(now)) {
    const error = new Error("Ticketing is not open yet.");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}
