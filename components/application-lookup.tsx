"use client";

import { FormEvent, useState } from "react";

type LookupResult = {
  found: boolean;
  seatCode?: string;
  seatLabel?: string;
  status?: string;
  notice?: string;
};

export function ApplicationLookup() {
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    setError("");
    const formData = new FormData(event.currentTarget);
    const studentId = String(formData.get("studentId") ?? "");
    const phoneLast4 = String(formData.get("phoneLast4") ?? "");

    const response = await fetch("/api/application/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, phoneLast4 }),
    });
    const payload = (await response.json()) as LookupResult & { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "조회에 실패했습니다.");
      setBusy(false);
      return;
    }
    setResult(payload);
    setBusy(false);
  };

  return (
    <section className="card stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Application Lookup</p>
          <h2 style={{ margin: "4px 0 0" }}>신청 조회</h2>
        </div>
      </div>
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        <label>
          학번
          <input name="studentId" required inputMode="numeric" />
        </label>
        <label>
          연락처 뒷 4자리
          <input name="phoneLast4" required maxLength={4} inputMode="numeric" />
        </label>
        <button className="btn btn-secondary" type="submit" disabled={busy}>
          {busy ? "조회 중..." : "조회"}
        </button>
      </form>
      {error ? <p style={{ margin: 0, color: "#b32b23" }}>{error}</p> : null}
      {result ? (
        <div className="soft-card stack">
          <p style={{ margin: 0, fontWeight: 700 }}>조회 결과: {result.found ? "신청 확인" : "미신청"}</p>
          {result.found ? (
            <p style={{ margin: 0 }} className="muted">
              {result.status === "WAITLIST" ? "대기 순번" : "좌석"}: {result.seatLabel ?? result.seatCode} / 상태: {result.status}
            </p>
          ) : null}
          {result.notice ? (
            <p style={{ margin: 0 }} className="muted">
              {result.notice}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
