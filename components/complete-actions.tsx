"use client";

import { useState } from "react";

type Props = {
  name: string;
  seatCode: string;
  seatLabel: string;
  applicationId: string;
  isWaitlist?: boolean;
};

export function CompleteActions({ name, seatCode, seatLabel, applicationId, isWaitlist = false }: Props) {
  const [copied, setCopied] = useState(false);

  const shareText = isWaitlist
    ? `${name} / 참가대기 ${seatLabel} / 신청번호 ${applicationId}\n2026 공과대학 개강총회: 공대총회식 참가대기 신청이 완료되었습니다.`
    : `${name} / 좌석 ${seatLabel || seatCode} / 신청번호 ${applicationId}\n2026 공과대학 개강총회: 공대총회식 신청이 완료되었습니다.`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="action-row">
      <button type="button" className="btn btn-primary" onClick={() => window.print()}>
        저장용 카드 인쇄
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => void handleCopy()}>
        {copied ? "문구 복사됨" : "공유 문구 복사"}
      </button>
    </div>
  );
}
