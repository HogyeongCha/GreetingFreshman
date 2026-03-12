import Link from "next/link";
import { SeatSelector } from "@/components/seat-selector";

export default function SeatPage() {
  return (
    <main className="container stack">
      <div className="page-intro">
        <Link href="/" className="muted">
          ← 메인으로
        </Link>
        <p className="eyebrow" style={{ marginTop: 10 }}>
          Seat Selection
        </p>
        <h1 style={{ margin: "4px 0 0", fontSize: 30 }}>좌석을 먼저 선택해 주세요</h1>
        <p style={{ margin: "6px 0 0" }} className="muted">
          실제 자리 배치도 기준으로 원하는 좌석을 선택할 수 있습니다. 좌석을 고르면 2분 동안 임시 홀드되며, 그 안에 신청 정보를 제출해야 확정됩니다.
        </p>
      </div>
      <SeatSelector />
    </main>
  );
}
