import Link from "next/link";
import { CompleteActions } from "@/components/complete-actions";
import { SiteNotice } from "@/components/site-notice";
import { EVENT_NAME, EVENT_PLACE, EVENT_TIME_TEXT } from "@/lib/constants";

export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ applicationId?: string; seatCode?: string; seatLabel?: string; name?: string; applicationType?: string; waitlistNumber?: string }>;
}) {
  const params = await searchParams;
  const applicationId = params.applicationId ?? "-";
  const seatCode = params.seatCode ?? "-";
  const seatLabel = params.seatLabel ?? seatCode;
  const name = params.name ?? "신청자";
  const applicationType = params.applicationType ?? "SEAT";
  const isWaitlist = applicationType === "WAITLIST";

  return (
    <main className="container">
      <section className="card stack">
        <h1 style={{ margin: 0 }}>신청이 완료되었습니다.</h1>
        <div className="ticket-card stack">
          <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>{EVENT_NAME}</p>
          <p style={{ margin: 0 }}>
            {isWaitlist ? (
              <>
                {name}님, <strong>{seatLabel}</strong> 참가대기 신청이 접수되었습니다.
              </>
            ) : (
              <>
                {name}님, 좌석 <strong>{seatLabel}</strong> 신청이 접수되었습니다.
              </>
            )}
          </p>
          <p style={{ margin: 0 }} className="muted">
            신청번호: {applicationId}
          </p>
          {isWaitlist ? (
            <p style={{ margin: 0 }} className="muted">
              결원 발생 시 참가대기 순번대로 안내됩니다.
            </p>
          ) : null}
          <p style={{ margin: 0 }} className="muted">
            행사 일시: {EVENT_TIME_TEXT}
          </p>
          <p style={{ margin: 0 }} className="muted">
            장소: {EVENT_PLACE}
          </p>
          <SiteNotice kind="complete_notice" />
          <p style={{ margin: 0 }} className="muted">
            완료 화면은 캡처해 두는 것을 권장합니다.
          </p>
        </div>
        <CompleteActions applicationId={applicationId} seatCode={seatCode} seatLabel={seatLabel} name={name} isWaitlist={isWaitlist} />
        <Link href="/" className="btn btn-secondary">
          메인으로 이동
        </Link>
      </section>
    </main>
  );
}
