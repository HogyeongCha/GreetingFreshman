export type SeatBlock = {
  zone: string;
  kind: "REAL" | "WAITLIST";
  rows: string[][];
};

export const REAL_SEAT_BLOCKS: SeatBlock[] = [
  {
    zone: "A",
    kind: "REAL",
    rows: [
      ["A11", "A12", "A21", "A22", "A31", "A32", "A41", "A42", "A51", "A52"],
      ["A13", "A14", "A23", "A24", "A33", "A34", "A43", "A44", "A53", "A54"],
    ],
  },
  {
    zone: "C",
    kind: "REAL",
    rows: [
      ["C11", "C12", "C21", "C22", "C31", "C32", "C41", "C42", "C51", "C52", "C61", "C62"],
      ["C13", "C14", "C23", "C24", "C33", "C34", "C43", "C44", "C53", "C54", "C63", "C64"],
    ],
  },
  {
    zone: "B",
    kind: "REAL",
    rows: [
      ["B11", "B12", "B21", "B22", "B31", "B32", "B41", "B42", "B51", "B52"],
      ["B13", "B14", "B23", "B24", "B33", "B34", "B43", "B44", "B53", "B54"],
    ],
  },
  {
    zone: "D",
    kind: "REAL",
    rows: [
      ["D11", "D12", "D21", "D22", "D31", "D32", "D41", "D42", "D51", "D52", "D61", "D62"],
      ["D13", "D14", "D23", "D24", "D33", "D34", "D43", "D44", "D53", "D54", "D63", "D64"],
    ],
  },
  {
    zone: "E",
    kind: "REAL",
    rows: [
      ["E11", "E12", "E21", "E22", "E31", "E32", "E41", "E42", "E51", "E52", "E61", "E62"],
      ["E13", "E14", "E23", "E24", "E33", "E34", "E43", "E44", "E53", "E54", "E63", "E64"],
    ],
  },
];

export const WAITLIST_BLOCK: SeatBlock = {
  zone: "Z",
  kind: "WAITLIST",
  rows: [
    ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6", "Z7", "Z8"],
    ["Z9", "Z10", "Z11", "Z12", "Z13", "Z14", "Z15", "Z16"],
  ],
};

export const REAL_SEAT_CODES = REAL_SEAT_BLOCKS.flatMap((block) => block.rows.flat());
export const WAITLIST_SEAT_CODES = WAITLIST_BLOCK.rows.flat();
export const MANAGED_SEAT_CODES = [...REAL_SEAT_CODES, ...WAITLIST_SEAT_CODES];

export function isRealSeatCode(seatCode: string) {
  return REAL_SEAT_CODES.includes(seatCode);
}

export function isWaitlistSeatCode(seatCode: string) {
  return WAITLIST_SEAT_CODES.includes(seatCode);
}

export function getWaitlistNumber(seatCode: string) {
  if (!isWaitlistSeatCode(seatCode)) return null;
  return Number(seatCode.slice(1));
}

export function getSeatLabel(seatCode: string) {
  const waitlistNumber = getWaitlistNumber(seatCode);
  if (waitlistNumber) return `참가대기 ${waitlistNumber}번`;
  return seatCode;
}

export function sortManagedSeatCode(a: string, b: string) {
  const aWait = getWaitlistNumber(a);
  const bWait = getWaitlistNumber(b);
  if (aWait !== null && bWait !== null) return aWait - bWait;
  if (aWait !== null) return 1;
  if (bWait !== null) return -1;
  return a.localeCompare(b, "ko");
}
