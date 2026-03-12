"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { REAL_SEAT_BLOCKS } from "@/lib/seat-layout";

type SeatItem = {
  seatCode: string;
  status: "AVAILABLE" | "HOLD" | "CONFIRMED" | "BLOCKED";
  holdExpiresAt?: string | null;
};

type SeatsResponse = {
  seats: SeatItem[];
  remainingSeats: number;
  waitlist: {
    total: number;
    remaining: number;
    visible: boolean;
    open: boolean;
  };
};

const HOLD_TOKEN_KEY = "gf_hold_owner_token";
const BLOCK_LAYOUT_CLASSNAME: Record<string, string> = {
  A: "layout-zone-a",
  B: "layout-zone-b",
  C: "layout-zone-c",
  D: "layout-zone-d",
  E: "layout-zone-e",
  Z: "layout-zone-z",
};

function zoneGridStyle(columns: number): CSSProperties {
  return { ["--zone-columns" as string]: String(columns) } as CSSProperties;
}

function getHoldOwnerToken(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(HOLD_TOKEN_KEY);
  if (existing) return existing;
  const token = crypto.randomUUID();
  window.localStorage.setItem(HOLD_TOKEN_KEY, token);
  return token;
}

export function SeatSelector() {
  const router = useRouter();
  const [data, setData] = useState<SeatsResponse | null>(null);
  const [busySeat, setBusySeat] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSeats = async () => {
      const response = await fetch("/api/seats", { cache: "no-store" });
      if (!response.ok) {
        setError("좌석 정보를 불러오지 못했습니다.");
        return;
      }
      setData((await response.json()) as SeatsResponse);
      setError("");
    };
    void fetchSeats();
    const timer = setInterval(fetchSeats, 3000);
    return () => clearInterval(timer);
  }, []);

  const seatMap = useMemo(() => new Map((data?.seats ?? []).map((seat) => [seat.seatCode, seat])), [data]);

  const holdSeat = async (seatCode: string) => {
    setBusySeat(seatCode);
    setError("");
    try {
      const holdOwnerToken = getHoldOwnerToken();
      const response = await fetch("/api/seats/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatCode, holdOwnerToken }),
      });

      const payload = (await response.json()) as { error?: string; holdId?: string; seatCode?: string };
      if (!response.ok || !payload.holdId) {
        setError(payload.error ?? "좌석 홀드에 실패했습니다.");
        return;
      }

      router.push(`/apply?holdId=${encodeURIComponent(payload.holdId)}&seatCode=${encodeURIComponent(payload.seatCode ?? seatCode)}`);
    } catch {
      setError("일시적인 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setBusySeat("");
    }
  };

  return (
    <section className="card stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Venue Layout</p>
          <h2 style={{ margin: "4px 0 0" }}>실제 좌석 배치도</h2>
        </div>
        <div className="status-chip">남은 좌석 {data?.remainingSeats ?? "-"}</div>
      </div>
      <div className="soft-card stack">
        <p style={{ margin: 0 }} className="muted">
          실제 좌석은 구역별 테이블 구조 그대로 표시됩니다. `A11`은 A구역 1번 테이블 1번 자리, `E34`는 E구역 3번 테이블 4번 자리를 의미합니다.
        </p>
      </div>
      <div className="legend-row">
        <span className="legend-item"><i className="legend-swatch legend-available" />선택 가능</span>
        <span className="legend-item"><i className="legend-swatch legend-hold" />홀드 중</span>
        <span className="legend-item"><i className="legend-swatch legend-confirmed" />확정</span>
        <span className="legend-item"><i className="legend-swatch legend-blocked" />차단</span>
      </div>
      {error ? <p style={{ margin: 0, color: "#b32b23" }}>{error}</p> : null}
      <div className="venue-layout-scroll">
        <div className="venue-layout venue-layout-map">
          {REAL_SEAT_BLOCKS.map((block) => (
            <section key={block.zone} className={`zone-card stack ${BLOCK_LAYOUT_CLASSNAME[block.zone] ?? ""}`}>
              <div className="zone-heading">
                <strong>{block.zone} 구역</strong>
                <span className="muted">{block.rows[0].length / 2}개 테이블</span>
              </div>
              <div className="zone-grid zone-grid-compact" style={zoneGridStyle(block.rows[0].length)}>
                {block.rows.flat().map((seatCode) => {
                  const seat = seatMap.get(seatCode);
                  const disabled = !seat || seat.status !== "AVAILABLE" || busySeat.length > 0;
                  return (
                    <button
                      type="button"
                      key={seatCode}
                      className={`seat-cell seat-${seat?.status ?? "BLOCKED"}`}
                      disabled={disabled}
                      onClick={() => void holdSeat(seatCode)}
                    >
                      <span>{busySeat === seatCode ? "처리중" : seatCode}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {data?.waitlist.visible ? (
            <section className={`zone-card stack zone-card-waitlist ${BLOCK_LAYOUT_CLASSNAME.Z}`}>
              <div className="zone-heading">
                <strong>Z 구역</strong>
                <span className="muted">참가대기 전용</span>
              </div>
              <div className="soft-card stack">
                <p style={{ margin: 0 }} className="muted">
                  `Z`는 실제 좌석이 아니라 참가대기 우선순위 슬롯입니다. 사용자가 번호를 직접 고르지 않고, 대기 신청 시 가장 빠른 빈 순번이 자동 부여됩니다.
                </p>
                <p style={{ margin: 0 }} className="muted">
                  남은 대기 슬롯 {data.waitlist.remaining} / {data.waitlist.total}
                </p>
                <Link
                  className="btn btn-secondary"
                  href={data.waitlist.open ? "/waitlist" : "#"}
                  aria-disabled={!data.waitlist.open}
                  style={!data.waitlist.open ? { pointerEvents: "none", opacity: 0.45 } : undefined}
                >
                  {data.waitlist.open ? "참가대기 신청하기" : "실좌석 마감 후 참가대기 오픈"}
                </Link>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
