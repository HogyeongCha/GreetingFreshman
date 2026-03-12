# RUNBOOK — 2026 공과대학 개강총회: 공대총회식 티켓팅 운영

## 1) 오픈 전 점검 (D-1, D-day 11:50 이전)
1. 환경변수 확인
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SESSION_SECRET`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (캡차 운영 시)

2. 데이터 상태 확인
- 실좌석 총 112석 존재 여부 확인
- `BLOCKED` 실좌석 12석 확인
- `AVAILABLE` 실좌석 100석 확인
- `admins` 계정 정상 로그인 확인

3. 기능 점검
- `/api/event/status` 응답 정상
- `/seat` 조회/선택 정상
- `/apply` 제출 정상
- `/admin` 목록 조회/취소/좌석이동/CSV 정상

4. 빌드 점검
- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run build`

5. 동시성 리허설
- [LOAD_TEST_PLAN.md](/mnt/i/Files/Coding/GreetingFreshman/LOAD_TEST_PLAN.md) 기준으로 `같은 좌석 경쟁`, `분산 좌석 신청`, `동일 IP 레이트리밋` 시나리오를 1회 이상 실행
- `hold` p95 1000ms 이하, `apply` p95 1500ms 이하 확인
- `X-Request-Id`, `X-Error-Code` 로그가 남는지 확인

## Preview 운영 원칙
1. 프리뷰 배포는 `npm run deploy:preview`로만 실행
- 기본값은 `.env.preview.local`
- 파일이 없으면 `.env.local`로 fallback 되므로 운영 데이터 오염 위험이 있음

2. 프리뷰 Supabase는 운영과 분리
- 운영 프로젝트의 좌석/신청 데이터를 공유하지 않음
- 운영과 다른 `ADMIN_SESSION_SECRET` 사용
- 필요하면 Turnstile도 별도 site key/secret 사용

3. Git 자동 Preview는 아직 미구성
- 현재 디렉터리가 Git 저장소가 아니므로 브랜치/PR 자동 프리뷰는 불가
- Git 원격 연결 후 Vercel 저장소 연동 시 자동화 가능

## 2) 오픈 당일 타임라인 (2026-03-18 KST)
1. 11:50
- 운영진 1명: 사용자 화면 모니터링(`/`, `/seat`)
- 운영진 1명: 관리자 화면 모니터링(`/admin`)
- 운영진 1명: 이슈 대응 및 커뮤니케이션

2. 11:55
- `/api/event/status`의 `now/openAt/isOpen` 재확인
- 관리자 CSV 다운로드 1회 테스트

3. 12:00
- 오픈 상태 전환 확인
- 신청 성공/실패 로그 실시간 확인

4. 12:00~12:10 집중 모니터링
- 429 비율 급증 여부 확인
- 신청 확정 건수 증가 속도 확인
- 좌석 상태 불일치 민원 즉시 처리

5. 12:10
- 중간 백업 CSV 저장
- 현황 요약 공지(잔여 좌석/마감 여부)

## 3) 장애 대응
1. 증상: 좌석 선택이 안 됨(대량 429)
- 원인: 과다 요청/봇성 트래픽
- 조치:
  - 잠시 공지 후 재시도 유도
  - `api_rate_limits` 기준으로 동일 IP 집중 여부 확인
  - 필요 시 레이트리밋 상향(긴급 배포)
  - 캡차 설정 누락 여부 확인

2. 증상: 캡차 실패 다발
- 원인: `site key/secret` 불일치 또는 도메인 설정 오류
- 조치:
  - Turnstile 대시보드에서 도메인 및 키 재검증
  - 임시로 `TURNSTILE_SECRET_KEY` 제거 후 운영 지속(리스크 공지 필요)

3. 증상: 좌석 상태 불일치
- 원인: 취소/이동 처리 중 동시성 충돌
- 조치:
  - 관리자에서 해당 신청건 `취소` 후 재배정
  - 필요 시 `release_expired_holds()` 실행 후 재확인

4. 증상: 신청 중복 민원
- 원인: 입력 오기/연락처 변형
- 조치:
  - `student_id`, `phone`, `school_email` 기준 중복 확인
  - 운영 원칙에 따라 1건만 유지, 나머지 `CANCELED`

5. 증상: 같은 요청이 여러 번 제출됨
- 원인: 브라우저 재시도 또는 네트워크 지연
- 조치:
  - 같은 `hold_id` 재제출은 `application_confirm_results`에서 동일 결과를 반환하므로, 먼저 중복 생성 여부보다 응답 코드와 신청 ID를 확인
  - 같은 사용자 요청이라면 새 신청 생성 없이 기존 확정 결과를 안내

6. 증상: `https://hanyangtechticketing.vercel.app/` 자체가 느리거나 응답하지 않음
- 원인: 배포 이상, 서버리스 함수 장애, 잘못된 프로덕션 승격, 일시적 Vercel 장애
- 조치:
  - 먼저 `https://hanyangtechticketing.vercel.app/api/event/status` 와 메인 페이지 응답 여부를 확인
  - 최신 프로덕션 배포 상태를 확인: `npx vercel inspect hanyangtechticketing.vercel.app`
  - 직전 정상 배포로 즉시 롤백: `npx vercel rollback`
  - 특정 정상 배포로 롤백해야 하면: `npx vercel rollback <deployment-id-or-url>`
  - 새 프로덕션 배포가 정상인데 alias가 잘못 묶였으면: `npx vercel alias set <deployment-url> hanyangtechticketing.vercel.app`
  - 런타임 오류 확인: Vercel Deployment Logs / Runtime Logs 확인
  - 장애가 1분 이상 지속되면 학생 대상 공지 채널에 "접속 장애 확인 중, 잠시 후 재시도" 공지 발송

7. 증상: 잘못된 변경이 운영 URL에 반영됨
- 원인: 테스트용 상수 또는 데이터가 production에 배포됨
- 조치:
  - `OPEN_AT_KST`, 차단 좌석 수, 운영 공지 문구를 먼저 재확인
  - 직전 정상 배포로 롤백 후 수정본을 다시 배포
  - 재배포 후 `hanyangtechticketing.vercel.app`가 최신 배포를 가리키는지 `npx vercel inspect hanyangtechticketing.vercel.app`로 확인

## 4) 운영 후 정리
1. 최종 CSV 백업
2. 취소/이동 이력 점검
3. 대기자/취소석 수동 처리(필요 시)
4. 회고 항목 정리
- 429 비율
- 평균 신청 성공 시간
- 주요 민원 유형
