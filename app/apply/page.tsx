import Link from "next/link";
import { ApplicationForm } from "@/components/application-form";

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ holdId?: string; seatCode?: string }>;
}) {
  const params = await searchParams;
  const holdId = params.holdId ?? "";
  const seatCode = params.seatCode ?? "";

  return (
    <main className="container stack">
      <div className="page-intro">
        <Link href="/seat" className="muted">
          ← 좌석 선택으로
        </Link>
        <p className="eyebrow" style={{ marginTop: 10 }}>
          Application
        </p>
        <h1 style={{ margin: "4px 0 0", fontSize: 30 }}>신청 정보를 입력해 주세요</h1>
        <p style={{ margin: "6px 0 0" }} className="muted">
          학교 이메일과 기본 인적 사항을 입력하면 신청이 확정됩니다.
        </p>
      </div>
      {!holdId || !seatCode ? (
        <section className="card stack">
          <h2 style={{ margin: 0 }}>유효하지 않은 접근입니다.</h2>
          <p style={{ margin: 0 }}>좌석 선택 페이지에서 다시 시도해 주세요.</p>
          <Link href="/seat" className="btn btn-primary">
            좌석 선택으로 이동
          </Link>
        </section>
      ) : (
        <ApplicationForm holdId={holdId} seatCode={seatCode} />
      )}
    </main>
  );
}
