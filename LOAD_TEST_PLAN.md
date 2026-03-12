# Load Test Plan

## 목표
- 오픈 직후 다수 사용자가 동시에 클릭해도 좌석 중복 확정이 발생하지 않아야 한다.
- `seat hold`와 `application submit`의 실패 원인이 `429`, `seat not available`, `duplicate application` 등으로 명확히 분리되어야 한다.
- 집중 구간 기준으로 `hold` p95 1000ms 이하, `apply` p95 1500ms 이하를 목표로 한다.

## 사전 조건
- 개발 서버 또는 배포 서버가 켜져 있어야 한다.
- 테스트 시작 전 남은 좌석 수를 확인한다.
- `hold/apply` 경로 응답 헤더의 `X-Request-Id`, `X-Error-Code`를 로그 확인 기준으로 사용한다.

## 실행 명령
### 1. 같은 좌석 경쟁 테스트
```bash
npm run loadtest:hold -- --base-url=http://127.0.0.1:3000 --seat-code=A1 --requests=100 --concurrency=40
```

기대 결과:
- 정확히 1건만 `200`
- 나머지는 대부분 `409`
- `statusCounts`와 `errorCounts`에 실패 원인이 분리되어 출력

### 2. 서로 다른 좌석 분산 신청 테스트
```bash
npm run loadtest:apply -- --base-url=http://127.0.0.1:3000 --requests=20 --concurrency=10
```

기대 결과:
- 대부분 `200`
- `hold` 후 `apply`까지 연결된 지연 시간이 p95 기준 1500ms 이하
- 중복 신청 데이터 없이 모두 다른 좌석으로 확정

### 3. 레이트리밋 확인
```bash
npm run loadtest:hold -- --base-url=http://127.0.0.1:3000 --seat-code=A1 --requests=40 --concurrency=20 --unique-ips=false
```

기대 결과:
- 동일 IP 기준 `429` 발생
- `Retry-After` 헤더와 `RATE_LIMITED` 로그 확인 가능

## 리허설 순서
1. `같은 좌석 20명 경쟁`
- 중복 확정이 없는지 확인한다.
2. `분산 좌석 20명 신청`
- 실제 신청 완료 흐름이 유지되는지 확인한다.
3. `같은 좌석 100명 경쟁`
- 오픈 직후 최악 케이스를 재현한다.
4. `동일 IP 과다 요청`
- 공유형 rate limit가 서버 인스턴스와 무관하게 동작하는지 확인한다.

## 결과 기록
- 총 요청 수
- `200/409/429/500` 분포
- `hold` p50/p95/max
- `apply` p50/p95/max
- 대표 실패 메시지와 `X-Error-Code`
- 좌석/신청 데이터 불일치 여부

## 테스트 후 정리
- 리허설 중 생성된 신청 데이터를 관리자 취소 또는 SQL로 정리한다.
- 장시간 남은 `HOLD` 좌석이 있으면 `release_expired_holds()`를 실행한다.
- 결과를 `RUNBOOK.md`의 오픈 전 점검 항목에 반영한다.
