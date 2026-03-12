import Link from "next/link";
import { ApplicationLookup } from "@/components/application-lookup";

export default function LookupPage() {
  return (
    <main className="container stack">
      <div className="page-intro">
        <Link href="/" className="muted">
          ← 메인으로
        </Link>
        <p className="eyebrow" style={{ marginTop: 10 }}>
          Lookup
        </p>
        <h1 style={{ margin: "4px 0 0", fontSize: 30 }}>신청 상태를 확인하세요</h1>
        <p style={{ margin: "6px 0 0" }} className="muted">
          학번과 연락처 끝자리 4개를 입력하면 좌석과 신청 상태를 조회할 수 있습니다.
        </p>
      </div>
      <ApplicationLookup />
    </main>
  );
}
