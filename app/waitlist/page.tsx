import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function WaitlistPage() {
  return (
    <main className="container stack">
      <div className="page-intro">
        <Link href="/seat" className="muted">
          ← 좌석 선택으로
        </Link>
        <p className="eyebrow" style={{ marginTop: 10 }}>
          Waitlist
        </p>
        <h1 style={{ margin: "4px 0 0", fontSize: 30 }}>참가대기 신청</h1>
        <p style={{ margin: "6px 0 0" }} className="muted">
          실제 좌석이 모두 마감된 뒤 열리는 대기 신청입니다. 신청 순서대로 우선순위가 부여되며, 결원 발생 시 번호 순서대로 안내됩니다.
        </p>
      </div>
      <WaitlistForm />
    </main>
  );
}
