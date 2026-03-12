import Link from "next/link";
import { AdminConsole } from "@/components/admin-console";

export default function AdminPage() {
  return (
    <main className="container stack">
      <div className="page-intro">
        <Link href="/" className="muted">
          ← 메인으로
        </Link>
        <p className="eyebrow" style={{ marginTop: 10 }}>
          Admin Console
        </p>
        <h1 style={{ margin: "4px 0 0", fontSize: 30 }}>운영용 신청 관리 콘솔</h1>
        <p style={{ margin: "6px 0 0" }} className="muted">
          좌석 현황, 신청자 목록, 공지 문구, 수동 배정과 차단 상태를 한 화면에서 관리합니다.
        </p>
      </div>
      <AdminConsole />
    </main>
  );
}
