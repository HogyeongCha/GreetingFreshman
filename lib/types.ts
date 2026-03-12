export type SeatStatus = "AVAILABLE" | "HOLD" | "CONFIRMED" | "BLOCKED";
export type ApplicantStatus = "CONFIRMED" | "CANCELED" | "WAITLIST";

export type SeatRecord = {
  id: string;
  seat_code: string;
  status: SeatStatus;
  kind?: "REAL" | "WAITLIST";
  hold_owner: string | null;
  hold_expires_at: string | null;
};

export type ApplicantRecord = {
  id: string;
  name: string;
  student_id: string;
  department: string;
  phone: string;
  school_email: string;
  instagram_id: string | null;
  seat_id: string;
  status: ApplicantStatus;
  created_at: string;
};
