type ApiLogContext = {
  requestId: string;
  route: string;
  method: string;
  ip: string;
  seatCode?: string;
  holdId?: string;
  status?: number;
  errorCode?: string;
  reason?: string;
  durationMs: number;
};

type ApiErrorDescriptor = {
  code: string;
  message: string;
  status: number;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (typeof error === "object" && error) {
    if ("message" in error && typeof (error as { message?: unknown }).message === "string" && (error as { message: string }).message) {
      return (error as { message: string }).message;
    }
    if ("error" in error && typeof (error as { error?: unknown }).error === "string" && (error as { error: string }).error) {
      return (error as { error: string }).error;
    }
  }
  return fallback;
}

function lowerIncludes(source: string, pattern: string) {
  return source.toLowerCase().includes(pattern.toLowerCase());
}

export function createRequestId() {
  return crypto.randomUUID();
}

export function logApiEvent(event: "request_ok" | "request_error", context: ApiLogContext) {
  const payload = {
    event,
    ...context,
  };
  const line = JSON.stringify(payload);
  if (event === "request_error") {
    console.error(line);
    return;
  }
  console.info(line);
}

export function classifyHoldError(error: unknown): ApiErrorDescriptor {
  const message = getErrorMessage(error, "Failed to hold seat");
  if (lowerIncludes(message, "seat not available")) {
    return { code: "SEAT_NOT_AVAILABLE", message: "이미 선점되었거나 사용할 수 없는 좌석입니다.", status: 409 };
  }
  if (lowerIncludes(message, "ticketing is not open")) {
    return { code: "TICKETING_NOT_OPEN", message: "티켓팅 오픈 전입니다.", status: 403 };
  }
  return { code: "HOLD_FAILED", message, status: 409 };
}

export function classifyApplicationError(error: unknown): ApiErrorDescriptor {
  const message = getErrorMessage(error, "Failed to submit application");
  if (lowerIncludes(message, "invalid hold")) {
    return { code: "INVALID_HOLD", message: "유효하지 않은 좌석 선점입니다. 좌석 선택부터 다시 진행해 주세요.", status: 409 };
  }
  if (lowerIncludes(message, "duplicate application")) {
    return { code: "DUPLICATE_APPLICATION", message: "이미 신청이 완료된 정보입니다.", status: 409 };
  }
  if (lowerIncludes(message, "hold expired or owner mismatch")) {
    return { code: "HOLD_EXPIRED", message: "좌석 선점이 만료되었거나 본인 요청이 아닙니다.", status: 409 };
  }
  if (lowerIncludes(message, "ticketing is not open")) {
    return { code: "TICKETING_NOT_OPEN", message: "티켓팅 오픈 전입니다.", status: 403 };
  }
  return { code: "APPLICATION_FAILED", message, status: 409 };
}
