"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSeatLabel, isRealSeatCode, isWaitlistSeatCode, sortManagedSeatCode } from "@/lib/seat-layout";

type ApplicantItem = {
  id: string;
  name: string;
  student_id: string;
  department: string;
  phone: string;
  school_email: string;
  status: string;
  created_at: string;
  seats?: { seat_code?: string | null } | null;
};

type ApplicantsResponse = {
  items: ApplicantItem[];
  total: number;
  page: number;
  pageSize: number;
};

type SeatBoardItem = {
  id: string;
  seatCode: string;
  status: "AVAILABLE" | "HOLD" | "CONFIRMED" | "BLOCKED";
  holdOwner: string | null;
  holdExpiresAt: string | null;
  applicant: {
    id: string;
    name: string;
    student_id: string;
    department: string;
    phone: string;
    school_email: string;
    instagram_id?: string | null;
    status: string;
    seat_id: string;
  } | null;
};

export function AdminConsole() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ApplicantItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [seats, setSeats] = useState<SeatBoardItem[]>([]);
  const [selectedSeatCode, setSelectedSeatCode] = useState("");
  const [homeNotice, setHomeNotice] = useState("");
  const [completeNotice, setCompleteNotice] = useState("");
  const [manualAssignLoading, setManualAssignLoading] = useState(false);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [seatActionLoading, setSeatActionLoading] = useState(false);

  const loadApplicants = async () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    const response = await fetch(`/api/admin/applicants?${query.toString()}`, { cache: "no-store" });
    if (response.status === 401) {
      setLoggedIn(false);
      return;
    }
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "신청자 목록을 불러오지 못했습니다.");
      return;
    }
    const data = (await response.json()) as ApplicantsResponse;
    setItems(data.items);
    setTotal(data.total);
    setError("");
    setLoggedIn(true);
  };

  const loadSeats = async () => {
    const response = await fetch("/api/admin/seats", { cache: "no-store" });
    if (response.status === 401) {
      setLoggedIn(false);
      return;
    }
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "좌석 현황을 불러오지 못했습니다.");
      return;
    }
    const payload = (await response.json()) as { items: SeatBoardItem[] };
    setSeats(payload.items);
    setSelectedSeatCode((current) => current || payload.items[0]?.seatCode || "");
  };

  const loadNotices = async () => {
    const response = await fetch("/api/admin/site-notice", { cache: "no-store" });
    if (response.status === 401) {
      setLoggedIn(false);
      return;
    }
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "공지 문구를 불러오지 못했습니다.");
      return;
    }
    const payload = (await response.json()) as { homeNotice: string; completeNotice: string };
    setHomeNotice(payload.homeNotice);
    setCompleteNotice(payload.completeNotice);
  };

  const loadDashboard = async () => {
    await Promise.all([loadApplicants(), loadSeats(), loadNotices()]);
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const loginId = String(formData.get("loginId") ?? "");
    const password = String(formData.get("password") ?? "");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    });
    const payload = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !payload.ok) {
      setError(payload.error ?? "로그인에 실패했습니다.");
      setLoading(false);
      return;
    }
    setLoading(false);
    setLoggedIn(true);
    await loadDashboard();
  };

  const handleCancel = async (applicantId: string) => {
    const response = await fetch("/api/admin/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantId }),
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "취소에 실패했습니다.");
      return;
    }
    await loadDashboard();
  };

  const handleDeleteCanceled = async (applicantId: string) => {
    const confirmed = window.confirm("취소된 신청 기록을 목록에서 완전히 삭제할까요?");
    if (!confirmed) return;

    const response = await fetch("/api/admin/delete-canceled", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantId }),
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "삭제에 실패했습니다.");
      return;
    }
    await loadDashboard();
  };

  const handleSeatChange = async (applicantId: string) => {
    const targetSeatCode = window.prompt("이동할 좌석 번호를 입력해 주세요. (예: B12)");
    if (!targetSeatCode) return;
    const response = await fetch("/api/admin/seat-change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantId, targetSeatCode }),
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "좌석 변경에 실패했습니다.");
      return;
    }
    await loadDashboard();
  };

  const handleManualAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setManualAssignLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/manual-assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seatCode: String(formData.get("seatCode") ?? "").trim(),
        name: String(formData.get("name") ?? "").trim(),
        studentId: String(formData.get("studentId") ?? "").trim(),
        department: String(formData.get("department") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").replace(/[^\d]/g, ""),
        schoolEmail: String(formData.get("schoolEmail") ?? "").trim(),
        instagramId: String(formData.get("instagramId") ?? "").trim() || undefined,
      }),
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "수동 배정에 실패했습니다.");
      setManualAssignLoading(false);
      return;
    }
    event.currentTarget.reset();
    setManualAssignLoading(false);
    await loadDashboard();
  };

  const handleSaveNotices = async () => {
    setNoticeSaving(true);
    setError("");
    const response = await fetch("/api/admin/site-notice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeNotice, completeNotice }),
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "공지 저장에 실패했습니다.");
      setNoticeSaving(false);
      return;
    }
    setNoticeSaving(false);
  };

  const handleLogout = async () => {
    const response = await fetch("/api/admin/logout", {
      method: "POST",
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "로그아웃에 실패했습니다.");
      return;
    }
    setLoggedIn(false);
    setItems([]);
    setSeats([]);
  };

  const handleBlockToggle = async () => {
    if (!selectedSeat) return;
    setSeatActionLoading(true);
    setError("");
    const response = await fetch("/api/admin/block-seat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatCode: selectedSeat.seatCode }),
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "좌석 차단 상태 변경에 실패했습니다.");
      setSeatActionLoading(false);
      return;
    }
    setSeatActionLoading(false);
    await loadDashboard();
  };

  const selectedSeat = seats.find((seat) => seat.seatCode === selectedSeatCode) ?? null;
  const realSeats = seats.filter((seat) => isRealSeatCode(seat.seatCode)).sort((a, b) => sortManagedSeatCode(a.seatCode, b.seatCode));
  const waitlistSeats = seats.filter((seat) => isWaitlistSeatCode(seat.seatCode)).sort((a, b) => sortManagedSeatCode(a.seatCode, b.seatCode));
  const waitlistItems = waitlistSeats
    .filter((seat) => seat.applicant?.status === "WAITLIST")
    .map((seat) => ({
      seatCode: seat.seatCode,
      applicant: seat.applicant,
    }));
  const seatCounts = seats.reduce(
    (acc, seat) => {
      if (isRealSeatCode(seat.seatCode)) acc[seat.status] += 1;
      return acc;
    },
    { AVAILABLE: 0, HOLD: 0, CONFIRMED: 0, BLOCKED: 0 },
  );
  const availableSeats = realSeats.filter((seat) => seat.status === "AVAILABLE");

  return (
    <section className="card stack">
      <h2 style={{ margin: 0 }}>관리자 페이지</h2>
      {error ? <p style={{ margin: 0, color: "#b32b23" }}>{error}</p> : null}

      {!loggedIn ? (
        <form className="stack" onSubmit={(event) => void handleLogin(event)}>
          <label>
            아이디
            <input name="loginId" required />
          </label>
          <label>
            비밀번호
            <input name="password" type="password" required />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={() => void handleLogout()}>
              로그아웃
            </button>
          </div>
          <div className="stats-grid">
            <div className="stat-chip">선택 가능 {seatCounts.AVAILABLE}</div>
            <div className="stat-chip">홀드 {seatCounts.HOLD}</div>
            <div className="stat-chip">확정 {seatCounts.CONFIRMED}</div>
            <div className="stat-chip">차단 {seatCounts.BLOCKED}</div>
          </div>

          <div className="admin-grid">
            <section className="card stack">
              <h3 style={{ margin: 0 }}>좌석 상태판</h3>
              <div className="seat-grid">
                {realSeats.map((seat) => (
                  <button
                    key={seat.id}
                    type="button"
                    className={`seat-cell seat-${seat.status} ${selectedSeatCode === seat.seatCode ? "seat-selected" : ""}`}
                    onClick={() => setSelectedSeatCode(seat.seatCode)}
                  >
                    {seat.seatCode}
                  </button>
                ))}
              </div>
            </section>

            <section className="card stack">
              <h3 style={{ margin: 0 }}>선택 좌석 정보</h3>
              <p style={{ margin: 0 }}>
                좌석: <strong>{selectedSeat ? getSeatLabel(selectedSeat.seatCode) : "-"}</strong> / 상태: {selectedSeat?.status ?? "-"}
              </p>
              {selectedSeat?.applicant ? (
                <>
                  <p style={{ margin: 0 }}>신청자: {selectedSeat.applicant.name}</p>
                  <p style={{ margin: 0 }} className="muted">
                    학번 {selectedSeat.applicant.student_id} / 연락처 {selectedSeat.applicant.phone}
                  </p>
                  <p style={{ margin: 0 }} className="muted">
                    {selectedSeat.applicant.department} / {selectedSeat.applicant.school_email}
                  </p>
                </>
              ) : selectedSeat?.status === "HOLD" ? (
                <p style={{ margin: 0 }} className="muted">
                  홀드 만료 시각: {selectedSeat.holdExpiresAt ? new Date(selectedSeat.holdExpiresAt).toLocaleString("ko-KR") : "-"}
                </p>
              ) : (
                <p style={{ margin: 0 }} className="muted">
                  현재 신청자 정보가 없습니다.
                </p>
              )}
              <button
                type="button"
                className={selectedSeat?.status === "BLOCKED" ? "btn btn-secondary" : "btn btn-danger"}
                onClick={() => void handleBlockToggle()}
                disabled={!selectedSeat || !isRealSeatCode(selectedSeat.seatCode) || selectedSeat.status === "CONFIRMED" || seatActionLoading}
              >
                {selectedSeat?.status === "BLOCKED"
                  ? seatActionLoading
                    ? "해제 중..."
                    : "좌석 차단 해제"
                  : seatActionLoading
                    ? "차단 중..."
                    : "좌석 차단"}
              </button>
            </section>
          </div>

          <div className="admin-grid">
            <form className="card stack" onSubmit={(event) => void handleManualAssign(event)}>
              <h3 style={{ margin: 0 }}>좌석 수동 배정</h3>
              <label>
                좌석
                <select name="seatCode" defaultValue={availableSeats[0]?.seatCode ?? ""} required>
                  <option value="" disabled>
                    좌석 선택
                  </option>
                  {availableSeats.map((seat) => (
                    <option key={seat.id} value={seat.seatCode}>
                      {seat.seatCode}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                이름
                <input name="name" required />
              </label>
              <label>
                학번
                <input name="studentId" required inputMode="numeric" />
              </label>
              <label>
                학과
                <input name="department" required />
              </label>
              <label>
                연락처
                <input name="phone" required inputMode="tel" />
              </label>
              <label>
                학교 이메일
                <input name="schoolEmail" required type="email" placeholder="example@hanyang.ac.kr" />
              </label>
              <label>
                인스타 아이디
                <input name="instagramId" />
              </label>
              <button type="submit" className="btn btn-primary" disabled={manualAssignLoading || availableSeats.length === 0}>
                {manualAssignLoading ? "배정 중..." : "수동 배정"}
              </button>
            </form>

            <section className="card stack">
              <h3 style={{ margin: 0 }}>공지 문구 수정</h3>
              <label>
                메인 공지
                <textarea value={homeNotice} onChange={(event) => setHomeNotice(event.target.value)} rows={4} />
              </label>
              <label>
                완료 페이지 공지
                <textarea value={completeNotice} onChange={(event) => setCompleteNotice(event.target.value)} rows={4} />
              </label>
              <button type="button" className="btn btn-secondary" onClick={() => void handleSaveNotices()} disabled={noticeSaving}>
                {noticeSaving ? "저장 중..." : "공지 저장"}
              </button>
            </section>
          </div>

          <div className="admin-grid">
            <section className="card stack">
              <h3 style={{ margin: 0 }}>참가대기 슬롯 현황</h3>
              <div className="seat-grid">
                {waitlistSeats.map((seat) => (
                  <div key={seat.id} className={`seat-cell seat-${seat.status}`} style={{ cursor: "default" }}>
                    {getSeatLabel(seat.seatCode)}
                  </div>
                ))}
              </div>
            </section>

            <section className="card stack">
              <h3 style={{ margin: 0 }}>참가대기 명단</h3>
              {waitlistItems.length === 0 ? (
                <p style={{ margin: 0 }} className="muted">
                  현재 참가대기 신청이 없습니다.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>대기번호</th>
                        <th>이름</th>
                        <th>학번</th>
                        <th>연락처</th>
                        <th>이메일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitlistItems.map((item) => (
                        <tr key={item.applicant?.id}>
                          <td>{getSeatLabel(item.seatCode)}</td>
                          <td>{item.applicant?.name}</td>
                          <td>{item.applicant?.student_id}</td>
                          <td>{item.applicant?.phone}</td>
                          <td>{item.applicant?.school_email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="stack">
            <label>
              검색(이름/학번/연락처)
              <input value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <label>
              상태
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">전체</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="CANCELED">CANCELED</option>
                <option value="WAITLIST">WAITLIST</option>
              </select>
            </label>
            <button type="button" className="btn btn-secondary" onClick={() => void loadApplicants()}>
              조회
            </button>
            <a className="btn btn-secondary" href="/api/admin/export.csv">
              엑셀용 CSV 다운로드
            </a>
          </div>
          <p style={{ margin: 0 }} className="muted">
            총 {total}건
          </p>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>학번</th>
                  <th>학과</th>
                  <th>연락처</th>
                  <th>이메일</th>
                  <th>좌석</th>
                  <th>상태</th>
                  <th>신청시간</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.student_id}</td>
                    <td>{item.department}</td>
                    <td>{item.phone}</td>
                    <td>{item.school_email}</td>
                    <td>{item.seats?.seat_code ? getSeatLabel(item.seats.seat_code) : "-"}</td>
                    <td>{item.status}</td>
                    <td>{new Date(item.created_at).toLocaleString("ko-KR")}</td>
                    <td style={{ display: "flex", gap: 8 }}>
                      {item.status === "CONFIRMED" ? (
                        <button className="btn btn-secondary" type="button" onClick={() => void handleSeatChange(item.id)}>
                          좌석이동
                        </button>
                      ) : null}
                      {item.status === "CONFIRMED" ? (
                        <button className="btn btn-danger" type="button" onClick={() => void handleCancel(item.id)}>
                          취소
                        </button>
                      ) : null}
                      {item.status === "CANCELED" ? (
                        <button className="btn btn-danger" type="button" onClick={() => void handleDeleteCanceled(item.id)}>
                          삭제
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="muted">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
