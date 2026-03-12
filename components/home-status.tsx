"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const DISPLAY_TOTAL_SEATS = 100;

type EventStatus = {
  now: string;
  openAt: string;
  isOpen: boolean;
  isClosed: boolean;
  isFullyClosed: boolean;
  waitlistVisible: boolean;
  waitlistOpen: boolean;
  remainingSeats: number;
  remainingWaitlistSlots: number;
};

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatKoreanDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function HomeStatus() {
  const [status, setStatus] = useState<EventStatus | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/event/status", { cache: "no-store" });
        const data = (await response.json()) as EventStatus & { error?: string };
        if (!response.ok) {
          setStatus(null);
          setError(data.error ?? "상태 정보를 불러오지 못했습니다.");
          return;
        }
        setStatus(data);
        setError("");
      } catch {
        setError("상태 정보를 불러오지 못했습니다.");
      }
    };
    void fetchStatus();
    const timer = setInterval(fetchStatus, 5000);
    return () => clearInterval(timer);
  }, []);

  const countdown = useMemo(() => {
    if (!status) return "--:--:--";
    const remain = new Date(status.openAt).getTime() - new Date(status.now).getTime();
    return formatCountdown(remain);
  }, [status]);

  const buttonDisabled = !status || !status.isOpen || status.isClosed;

  return (
    <section className="card status-panel stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ticket Status</p>
          <h2 style={{ margin: "4px 0 0" }}>티켓팅 상태</h2>
        </div>
        <div className="status-chip">{status?.isClosed ? "마감" : status?.isOpen ? "진행 중" : "오픈 전"}</div>
      </div>
      {error ? <p style={{ margin: 0, color: "#b32b23" }}>{error}</p> : null}
      <div className="status-grid">
        <div className="soft-card stack">
          <span className="muted">오픈 시각</span>
          <strong style={{ fontSize: 20 }}>{status ? formatKoreanDateTime(status.openAt) : "-"}</strong>
          <span className="muted">KST 기준</span>
        </div>
        <div className="soft-card stack">
          <span className="muted">카운트다운</span>
          <strong style={{ fontSize: 28, letterSpacing: "0.04em" }}>{countdown}</strong>
          <span className="muted">오픈 이후에는 즉시 좌석 선택 가능</span>
        </div>
        <div className="soft-card stack">
          <span className="muted">남은 좌석</span>
          <strong style={{ fontSize: 28 }}>{status?.remainingSeats ?? "-"}</strong>
          <span className="muted">총 {DISPLAY_TOTAL_SEATS}석 중 선택 가능 수량</span>
        </div>
        {status?.waitlistVisible ? (
          <div className="soft-card stack">
            <span className="muted">참가대기</span>
            <strong style={{ fontSize: 28 }}>{status.remainingWaitlistSlots}</strong>
            <span className="muted">{status.waitlistOpen ? "대기 신청 가능" : "실좌석 마감 후 오픈"}</span>
          </div>
        ) : null}
      </div>
      <div className="action-row">
        <Link
          className="btn btn-primary"
          href={buttonDisabled ? "#" : "/seat"}
          aria-disabled={buttonDisabled}
          style={buttonDisabled ? { pointerEvents: "none", opacity: 0.45 } : undefined}
        >
          좌석 선택 시작
        </Link>
        {status?.waitlistVisible ? (
          <Link
            className="btn btn-secondary"
            href={status.waitlistOpen ? "/waitlist" : "#"}
            aria-disabled={!status.waitlistOpen}
            style={!status.waitlistOpen ? { pointerEvents: "none", opacity: 0.45 } : undefined}
          >
            참가대기 신청
          </Link>
        ) : null}
      </div>
      {status?.isFullyClosed ? <p style={{ margin: 0, color: "#b32b23" }}>실좌석과 참가대기 신청이 모두 마감되었습니다.</p> : null}
    </section>
  );
}
