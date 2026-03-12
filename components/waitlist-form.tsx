"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { InfoDialogButton } from "@/components/info-dialog-button";

function normalizePhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

export function WaitlistForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const payload = {
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
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        error?: string;
        applicationId?: string;
        seatCode?: string;
        seatLabel?: string;
        waitlistNumber?: number;
      };
      if (!response.ok || !data.applicationId || !data.waitlistNumber) {
        setError(data.error ?? "대기 신청에 실패했습니다.");
        return;
      }

      router.push(
        `/complete?applicationId=${encodeURIComponent(data.applicationId)}&seatCode=${encodeURIComponent(
          data.seatCode ?? "",
        )}&seatLabel=${encodeURIComponent(data.seatLabel ?? "")}&name=${encodeURIComponent(payload.name)}&applicationType=WAITLIST&waitlistNumber=${encodeURIComponent(String(data.waitlistNumber))}`,
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
          <p className="eyebrow">Waitlist Form</p>
          <h2 style={{ margin: "4px 0 0" }}>참가대기 신청</h2>
        </div>
        <div className="status-chip">자동 순번 부여</div>
      </div>
      <div className="soft-card stack">
        <p style={{ margin: 0 }} className="muted">
          참가대기는 실제 좌석 선택이 아니라 자동 우선순위 부여 방식입니다. 빈 좌석이 생기면 순번대로 연락 및 배정됩니다.
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
          <label htmlFor="waitlist-consent-personal" className="consent-label">개인정보 수집 및 이용에 동의합니다.</label>
          <InfoDialogButton title="개인정보 수집 및 이용 안내" ariaLabel="개인정보 수집 및 이용 안내 보기">
            <p style={{ margin: 0 }}>
              참가대기 접수와 이후 연락을 위해 필요한 정보만 수집합니다. 내용을 확인한 뒤 동의해 주세요.
            </p>
            <div className="dialog-note">
              <strong>수집 항목</strong>
              <p style={{ margin: 0 }}>이름, 학번, 학과, 연락처, 학교 이메일, 인스타그램 아이디(선택), 참가대기 순번</p>
            </div>
            <div className="dialog-note">
              <strong>이용 목적</strong>
              <p style={{ margin: 0 }}>본인 확인, 참가대기 접수, 결원 발생 시 순차 연락, 행사 운영 기록 관리</p>
            </div>
            <div className="dialog-note">
              <strong>보관 기간</strong>
              <p style={{ margin: 0 }}>행사 종료 후 운영 정산 및 문의 대응에 필요한 기간 동안 보관 후 파기합니다.</p>
            </div>
            <div className="dialog-note">
              <strong>동의 거부 권리</strong>
              <p style={{ margin: 0 }}>동의를 거부할 수 있으나, 필수 정보가 없으면 참가대기 접수가 불가능합니다.</p>
            </div>
          </InfoDialogButton>
          <input id="waitlist-consent-personal" type="checkbox" name="consentPersonal" />
        </div>
        <div className="consent-row">
          <label htmlFor="waitlist-consent-notice" className="consent-label">대기 신청 운영 방식을 확인했습니다.</label>
          <InfoDialogButton title="참가대기 운영 안내" ariaLabel="참가대기 운영 안내 보기">
            <p style={{ margin: 0 }}>참가대기 신청 전 아래 내용을 확인해 주세요.</p>
            <div className="dialog-note">
              <strong>1. 자동 순번 부여</strong>
              <p style={{ margin: 0 }}>참가대기는 좌석 선택이 아니라 접수 순서대로 우선순위 번호가 자동 배정됩니다.</p>
            </div>
            <div className="dialog-note">
              <strong>2. 결원 발생 시 안내</strong>
              <p style={{ margin: 0 }}>취소석이나 결원이 생기면 순번대로 연락 및 배정이 진행됩니다.</p>
            </div>
            <div className="dialog-note">
              <strong>3. 즉시 확정 아님</strong>
              <p style={{ margin: 0 }}>참가대기 접수만으로 행사 참석이 확정되지는 않습니다.</p>
            </div>
            <div className="dialog-note">
              <strong>4. 연락 정보 정확성</strong>
              <p style={{ margin: 0 }}>연락처와 학교 이메일을 정확히 입력해야 안내를 받을 수 있습니다.</p>
            </div>
          </InfoDialogButton>
          <input id="waitlist-consent-notice" type="checkbox" name="consentNotice" />
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
          {busy ? "제출 중..." : "참가대기 신청"}
        </button>
      </form>
    </section>
  );
}
