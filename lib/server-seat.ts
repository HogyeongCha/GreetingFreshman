import { getSupabaseEnv } from "@/lib/env";
import { REAL_SEAT_CODES, WAITLIST_SEAT_CODES } from "@/lib/seat-layout";

let lastReleaseExpiredHoldsAt = 0;
let releaseExpiredHoldsPromise: Promise<void> | null = null;

type SeatState = "AVAILABLE" | "HOLD" | "CONFIRMED" | "BLOCKED";

type SeatOverride = {
  seatCode: string;
  status: SeatState;
  holdExpiresAt: string | null;
};

type SeatSnapshot = {
  overriddenSeats: Map<string, SeatOverride>;
  remainingSeats: number;
  remainingWaitlistSlots: number;
};

const SEAT_QUERY_TIMEOUT_MS = 1500;
const FALLBACK_OVERRIDDEN_SEATS: Array<[string, SeatState]> = [
  ["A31", "CONFIRMED"],
  ["A32", "CONFIRMED"],
  ["A33", "CONFIRMED"],
  ["A34", "CONFIRMED"],
  ["A51", "CONFIRMED"],
  ["A52", "CONFIRMED"],
  ["B13", "CONFIRMED"],
  ["B22", "CONFIRMED"],
  ["B24", "CONFIRMED"],
  ["B31", "CONFIRMED"],
  ["B32", "CONFIRMED"],
  ["B42", "CONFIRMED"],
  ["B43", "CONFIRMED"],
  ["B51", "CONFIRMED"],
  ["B53", "CONFIRMED"],
  ["B54", "CONFIRMED"],
  ["C21", "CONFIRMED"],
  ["D22", "CONFIRMED"],
  ["D52", "CONFIRMED"],
  ["D61", "CONFIRMED"],
  ["E41", "BLOCKED"],
  ["E42", "BLOCKED"],
  ["E43", "BLOCKED"],
  ["E44", "BLOCKED"],
  ["E51", "BLOCKED"],
  ["E52", "BLOCKED"],
  ["E53", "BLOCKED"],
  ["E54", "BLOCKED"],
  ["E61", "BLOCKED"],
  ["E62", "BLOCKED"],
  ["E63", "BLOCKED"],
  ["E64", "BLOCKED"],
];

function buildSeatSnapshot(overrides: Array<[string, SeatState] | [string, SeatState, string | null]>): SeatSnapshot {
  const overriddenSeats = new Map<string, SeatOverride>(
    overrides.map(([seatCode, status, holdExpiresAt]) => [
      seatCode,
      {
        seatCode,
        status,
        holdExpiresAt: holdExpiresAt ?? null,
      },
    ]),
  );
  return {
    overriddenSeats,
    remainingSeats:
      REAL_SEAT_CODES.length -
      REAL_SEAT_CODES.filter((seatCode) => overriddenSeats.has(seatCode)).length,
    remainingWaitlistSlots:
      WAITLIST_SEAT_CODES.length -
      WAITLIST_SEAT_CODES.filter((seatCode) => overriddenSeats.has(seatCode)).length,
  };
}

let lastSeatSnapshot: SeatSnapshot | null = buildSeatSnapshot(FALLBACK_OVERRIDDEN_SEATS);

export async function releaseExpiredHolds() {
  const now = Date.now();
  if (now - lastReleaseExpiredHoldsAt < 15_000) {
    return;
  }
  if (releaseExpiredHoldsPromise) {
    return releaseExpiredHoldsPromise;
  }

  releaseExpiredHoldsPromise = (async () => {
    const env = getSupabaseEnv();
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/release_expired_holds`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: "{}",
    });
    if (!response.ok) {
      throw new Error(`release_expired_holds failed: ${response.status}`);
    }
    lastReleaseExpiredHoldsAt = Date.now();
  })().finally(() => {
    releaseExpiredHoldsPromise = null;
  });

  return releaseExpiredHoldsPromise;
}

export async function getRemainingSeatCount(): Promise<number> {
  const snapshot = await getSeatSnapshot();
  return snapshot.remainingSeats;
}

export async function getRemainingWaitlistCount(): Promise<number> {
  const snapshot = await getSeatSnapshot();
  return snapshot.remainingWaitlistSlots;
}

export async function getSeatSnapshot(timeoutMs = SEAT_QUERY_TIMEOUT_MS): Promise<SeatSnapshot> {
  try {
    const env = getSupabaseEnv();
    const url = new URL(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/seats`);
    url.searchParams.set("select", "seat_code,status,hold_expires_at");
    url.searchParams.set("status", "not.eq.AVAILABLE");
    url.searchParams.set("order", "seat_code.asc");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("seat snapshot timeout"), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`seat snapshot failed: ${response.status}`);
      }
      const rows = (await response.json()) as Array<{
        seat_code: string;
        status: SeatState;
        hold_expires_at: string | null;
      }>;
      const snapshot = buildSeatSnapshot(
        rows.map((row) => [row.seat_code, row.status, row.hold_expires_at] as [string, SeatState, string | null]),
      );
      lastSeatSnapshot = snapshot;
      return snapshot;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if (lastSeatSnapshot) {
      return lastSeatSnapshot;
    }
    throw error;
  }
}
