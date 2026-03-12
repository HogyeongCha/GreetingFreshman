"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { InfoDialogButton } from "@/components/info-dialog-button";

const HOLD_TOKEN_KEY = "gf_hold_owner_token";

type Props = {
  holdId: string;
  seatCode: string;
};

function normalizePhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

export function ApplicationForm({ holdId, seatCode }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const submittedRef = useRef(false);

  const holdOwnerToken = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(HOLD_TOKEN_KEY) ?? "";
  }, []);

  useEffect(() => {
    if (!holdId || !holdOwnerToken) return;
    let releaseArmed = false;

    // React Strict Mode re-runs effects in development. Arm cleanup on the next
    // tick so the simulated unmount does not release the seat immediately.
    const armTimer = window.setTimeout(() => {
      releaseArmed = true;
    }, 0);

    const releaseHold = () => {
      if (submittedRef.current) return;
      const payload = JSON.stringify({ holdId, holdOwnerToken });
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/seats/release", blob);
        return;
      }

      void fetch("/api/seats/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    };

    const handlePageHide = () => {
      releaseHold();
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.clearTimeout(armTimer);
      window.removeEventListener("pagehide", handlePageHide);
      if (!releaseArmed) return;
      releaseHold();
    };
  }, [holdId, holdOwnerToken]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      holdId,
      holdOwnerToken,
      name: String(formData.get("name") ?? "").trim(),
      studentId: String(formData.get("studentId") ?? "").trim(),
      department: String(formData.get("department") ?? "").trim(),
      phone: normalizePhone(String(formData.get("phone") ?? "").trim()),
      schoolEmail: String(formData.get("schoolEmail") ?? "").trim(),
      instagramId: String(formData.get("instagramId") ?? "").trim() || undefined,
      captchaToken: String(formData.get("cf-turnstile-response") ?? "").trim() || undefined,
      consentPersonal: formData.get("consentPersonal") === "on",
      consentNotice: formData.get("consentNotice") === "on",
    };

    if (!/^\d{8,10}$/.test(payload.studentId)) {
      setError("학번 형식이 올바르지 않습니다.");
      setBusy(false);
      return;
    }
    if (!/^\d{10,11}$/.test(payload.phone)) {
      setError("연락처 형식이 올바르지 않습니다.");
      setBusy(false);
      return;
    }
    if (!payload.consentPersonal || !payload.consentNotice) {
      setError("필수 동의 항목에 체크해 주세요.");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string; applicationId?: string; seatCode?: string; createdAt?: string };
      if (!response.ok || !data.applicationId) {
        setError(data.error ?? "신청에 실패했습니다.");
        return;
      }

      submittedRef.current = true;
      router.push(
        `/complete?applicationId=${encodeURIComponent(data.applicationId)}&seatCode=${encodeURIComponent(
          data.seatCode ?? seatCode,
        )}&name=${encodeURIComponent(payload.name)}`,
      );
    } catch {
      setError("일시적인 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Reservation Form</p>
          <h2 style={{ margin: "4px 0 0" }}>신청 정보 입력</h2>
        </div>
        <div className="status-chip">선택 좌석 {seatCode}</div>
      </div>
      <div className="soft-card stack">
        <p style={{ margin: 0 }} className="muted">
          학교 이메일은 `@hanyang.ac.kr` 형식만 허용됩니다. 이 페이지를 벗어나면 홀드 좌석은 즉시 반납되며, 제출 가능 시간은 2분입니다.
        </p>
      </div>
      {error ? <p style={{ margin: 0, color: "#b32b23" }}>{error}</p> : null}
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        <label>
          이름
          <input name="name" required maxLength={50} />
        </label>
        <label>
          학번
          <input name="studentId" required inputMode="numeric" placeholder="예: 2026123456" />
        </label>
        <label>
          학과
          <input name="department" required maxLength={80} placeholder="예: 데이터사이언스학부" />
        </label>
        <label>
          연락처
          <input name="phone" required inputMode="tel" placeholder="예: 01012345678" />
        </label>
        <label>
          학교 이메일
          <input name="schoolEmail" required type="email" placeholder="example@hanyang.ac.kr" pattern=".+@hanyang\.ac\.kr" />
        </label>
        <label>
          인스타 아이디 (선택)
          <input name="instagramId" />
        </label>
        <div className="consent-row">
          <label htmlFor="apply-consent-personal" className="consent-label">개인정보 수집 및 이용에 동의합니다.</label>
          <InfoDialogButton title="개인정보 수집 및 이용 안내" ariaLabel="개인정보 수집 및 이용 안내 보기">
            <p style={{ margin: 0 }}>
              신청 확인과 행사 운영을 위해 최소한의 개인정보만 수집합니다. 내용을 끝까지 확인한 뒤 동의해 주세요.
            </p>
            <div className="dialog-note">
              <strong>수집 항목</strong>
              <p style={{ margin: 0 }}>이름, 학번, 학과, 연락처, 학교 이메일, 인스타그램 아이디(선택), 신청 좌석 또는 참가대기 순번</p>
            </div>
            <div className="dialog-note">
              <strong>이용 목적</strong>
              <p style={{ margin: 0 }}>본인 확인, 좌석 배정, 참가 안내 연락, 취소석 발생 시 재배정, 행사 운영 기록 관리</p>
            </div>
            <div className="dialog-note">
              <strong>보관 기간</strong>
              <p style={{ margin: 0 }}>행사 종료 후 운영 정산 및 문의 대응에 필요한 기간 동안 보관 후 파기합니다.</p>
            </div>
            <div className="dialog-note">
              <strong>동의 거부 권리</strong>
              <p style={{ margin: 0 }}>동의를 거부할 수 있으나, 필수 정보가 없으면 좌석 신청 및 참가대기 접수가 불가능합니다.</p>
            </div>
          </InfoDialogButton>
          <input id="apply-consent-personal" type="checkbox" name="consentPersonal" />
        </div>
        <div className="consent-row">
          <label htmlFor="apply-consent-notice" className="consent-label">행사 유의사항을 확인했습니다.</label>
          <InfoDialogButton title="행사 유의사항" ariaLabel="행사 유의사항 보기">
            <p style={{ margin: 0 }}>신청 전 아래 내용을 확인해 주세요.</p>
            <div className="dialog-note">
              <strong>1. 좌석 홀드</strong>
              <p style={{ margin: 0 }}>좌석을 고른 뒤 2분 안에 제출해야 하며, 페이지를 벗어나면 홀드가 바로 반납됩니다.</p>
            </div>
            <div className="dialog-note">
              <strong>2. 학교 이메일 인증</strong>
              <p style={{ margin: 0 }}>학교 이메일은 `@hanyang.ac.kr` 형식만 허용됩니다.</p>
            </div>
            <div className="dialog-note">
              <strong>3. 선착순 확정</strong>
              <p style={{ margin: 0 }}>다른 사용자가 먼저 확정한 좌석은 즉시 선택 불가로 바뀌며, 신청 완료 화면까지 확인해야 최종 접수됩니다.</p>
            </div>
            <div className="dialog-note">
              <strong>4. 참가대기</strong>
              <p style={{ margin: 0 }}>실좌석 마감 후에는 참가대기로 전환되며, 결원 발생 시 순번대로 별도 안내됩니다.</p>
            </div>
            <div className="dialog-note">
              <strong>5. 현장 확인</strong>
              <p style={{ margin: 0 }}>행사 당일 빠른 입장을 위해 신청 완료 화면을 준비해 주세요.</p>
            </div>
          </InfoDialogButton>
          <input id="apply-consent-notice" type="checkbox" name="consentNotice" />
        </div>
        {turnstileSiteKey ? (
          <>
            <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
            <div
              className="cf-turnstile"
              data-sitekey={turnstileSiteKey}
              data-theme="light"
              data-language="ko"
              style={{ minHeight: 65 }}
            />
          </>
        ) : null}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "제출 중..." : "신청 완료"}
        </button>
      </form>
    </section>
  );
}
