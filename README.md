# 🎫 공대총회식 티켓팅 — GreetingFreshman Ticketing

> 한양대학교 공과대학 학생회 2026-1 개강총회 행사를 위한 좌석 선택형 선착순 티켓팅 웹 애플리케이션

## 프로젝트 소개

공과대학 재학생 약 100명을 대상으로, 정해진 시각(2026.03.18 12:00)에 오픈되는 **영화관 좌석 예매 방식의 선착순 신청 시스템**입니다.

학생회 건설준비위원회에서 실제 행사 운영에 사용할 목적으로 개발했으며, AI 바이브코딩을 활용하여 기획부터 설계, 구현, 보안 점검, 운영 매뉴얼까지 전 과정을 진행했습니다.

### 운영 결과와 교훈

이 사이트는 Vercel + Supabase 무료 티어 위에서 운영되었습니다. 티켓팅 오픈 시점에 100명 이상의 사용자가 동시에 접속하면서 **무료 티어의 리소스 한계로 5xx 에러가 발생**했고, 기간당 사용량 초과로 서비스가 중단되었습니다. 결국 Google Forms의 좌석 예약 플러그인을 활용하는 방식으로 우회하여 행사를 진행했습니다.

#### 어려움-극복

| 항목 | 내용 |
|------|------|
| 어려움 | 티켓팅이 시작되자마자 사용자가 한 번에 몰리면서 Vercel과 Supabase 무료 티어 사용량을 초과했고, 서비스가 사실상 마비되었다. |
| 대응 시도 | 다른 Supabase 계정으로 급히 마이그레이션을 시도했지만, 기존 데이터 테이블을 불러오는 작업 자체도 block에 막혀 정상적인 전환이 불가능했다. |
| 최종 극복 | 현장 운영을 더 지연시키지 않기 위해 Google Forms의 좌석 예약 플러그인 방식으로 즉시 우회했고, 그 방식으로 사업을 마저 진행했다. |

이 경험을 통해 다음과 같은 점을 배울 수 있었습니다:

- **바이브코딩의 가능성과 한계** — AI를 활용하면 혼자서도 짧은 시간 안에 프로덕션 수준의 코드베이스를 만들어낼 수 있지만, 코드의 완성도와 실제 서비스 안정성은 별개의 문제다.
- **인프라 용량 계획의 중요성** — 기능이 아무리 잘 동작해도, 트래픽이 집중되는 서비스에서 인프라가 버텨주지 못하면 의미가 없다. 특히 무료 티어의 cold start, 동시 연결 수 제한, 함수 실행 시간 제한 등은 부하 테스트 단계에서 실제 환경과 동일한 조건으로 검증해야 한다.
- **티켓팅 같은 스파이크 트래픽 서비스의 특수성** — 평소에는 트래픽이 거의 없다가 특정 시점에 폭발적으로 몰리는 패턴은, 서버리스 아키텍처의 약점(cold start, 동시 실행 제한)과 정면으로 충돌한다.
- **플랜 B의 필요성** — 기술적으로 완벽한 시스템을 만들더라도, 운영 환경에서는 예상치 못한 문제가 발생할 수 있다. 대안을 미리 준비해두는 것이 실제 사업 진행에서는 더 중요하다.


## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Backend | Next.js API Routes (Serverless Functions) |
| Database | Supabase (PostgreSQL + RPC Functions) |
| Deployment | Vercel |
| Auth | HMAC 기반 관리자 세션, bcryptjs |
| Security | Cloudflare Turnstile (CAPTCHA), IP Rate Limiting, Same-Origin 검증 |
| Validation | Zod |

### 기술 선택 메모

#### 문제-의도: 선착순 좌석 신청에서 중복 배정을 막고 싶었다

| 항목 | 내용 |
|------|------|
| 문제 | 티켓팅 오픈 직후 여러 사용자가 같은 좌석을 거의 동시에 선택할 수 있어서, API 레벨의 단순 조회-검사만으로는 race condition이 발생할 수 있었다. |
| 의도 | "먼저 성공한 한 요청만 좌석을 확보한다"는 규칙을 서버 인스턴스 수와 무관하게 일관되게 보장하고 싶었다. |
| 선택 | Supabase의 PostgreSQL RPC 함수 안에서 좌석 홀드와 신청 확정을 처리하고, 핵심 구간에 `FOR UPDATE` 락과 멱등성 테이블(`application_confirm_results`)을 적용했다. |
| 이유 | 서버리스 환경에서는 요청이 여러 인스턴스로 분산될 수 있으므로, 경쟁 상태 판단을 애플리케이션 메모리가 아니라 DB 트랜잭션 안으로 모으는 편이 더 안전했다. 이 선택 덕분에 "누가 먼저 좌석을 확보했는가"를 PostgreSQL이 단일 기준으로 판정할 수 있었다. |

## 주요 기능

### 사용자
- 행사 안내 + 티켓팅 오픈 카운트다운
- 실제 술집 좌석 배치를 반영한 좌석 선택 UI (5개 구역, 112석)
- 좌석 임시 홀드 (120초) → 신청 폼 작성 → 확정
- 신청 완료 화면 (캡처용)
- 본인 신청 내역 조회
- 정원 초과 시 대기자 신청 (16명)

### 관리자
- 로그인/로그아웃
- 실시간 좌석 현황판 + 신청자 목록
- 신청 취소 / 좌석 이동 / 수동 배정 / 좌석 차단
- CSV 다운로드
- 공지사항 수정

### 동시성 제어 & 보안
- PostgreSQL `FOR UPDATE` 락 기반 좌석 선점 — RPC 함수로 원자적 처리
- 중복 신청 방지 — 학번/전화번호/이메일 partial unique index
- 멱등성 보장 — `application_confirm_results` 테이블로 동일 요청 재제출 시 같은 결과 반환
- IP 기반 공유형 Rate Limiting (hold 25회/분, apply 8회/분)
- 관리자 세션 HMAC 서명 + `timingSafeEqual` 검증
- Same-Origin 검증, RLS 활성화, `search_path` 고정
- 관리자 감사 로그 (로그인/취소/좌석이동 등)

## 프로젝트 구조

```
app/
├── page.tsx                    # 메인 (행사 안내 + 좌석 프리뷰)
├── seat/page.tsx               # 좌석 선택
├── apply/page.tsx              # 신청 폼
├── complete/page.tsx           # 신청 완료
├── lookup/page.tsx             # 신청 조회
├── waitlist/page.tsx           # 대기자 신청
├── admin/page.tsx              # 관리자 콘솔
└── api/                        # API Routes
    ├── event/status/           # 이벤트 상태 (오픈 여부, 서버 시간)
    ├── seats/                  # 좌석 조회 / 홀드 / 해제
    ├── applications/           # 신청 확정
    ├── application/lookup/     # 신청 조회
    ├── waitlist/               # 대기자 신청
    ├── site-notice/            # 공지사항
    └── admin/                  # 관리자 API (로그인, 취소, 좌석이동 등)

lib/                            # 서버 유틸리티
├── seat-layout.ts              # 좌석 배치 데이터 (구역/행/코드)
├── rate-limit.ts               # 공유형 Rate Limiter
├── api-observability.ts        # 요청 추적 (X-Request-Id, 에러 분류)
├── admin-auth.ts               # 관리자 세션 관리
├── admin-audit.ts              # 감사 로그
├── request-security.ts         # Same-Origin 검증
└── ...

supabase/migrations/            # DB 스키마 마이그레이션 (13개)
```

## 문서

| 문서 | 설명 |
|------|------|
| [PROJECT.md](PROJECT.md) | 행사 기획서 (일정, 프로그램, 역할 분배) |
| [PRD.md](PRD.md) | 서비스 설계 명세 (페이지 구성, 사용자 흐름, 예외 처리) |
| [ERD.md](ERD.md) | DB 스키마 ERD (Mermaid) |
| [RUNBOOK.md](RUNBOOK.md) | 운영 매뉴얼 (오픈 전 점검, 당일 타임라인, 장애 대응) |
| [LOAD_TEST_PLAN.md](LOAD_TEST_PLAN.md) | 부하 테스트 계획 (동시성 시나리오, 성능 목표) |
| [security_best_practices_report.md](security_best_practices_report.md) | 보안 점검 보고서 (수정 항목, 잔여 항목) |

## 로컬 실행

```bash
# 1. 환경변수 설정
cp .env.example .env.local
# .env.local에 Supabase 키 등 입력

# 2. 의존성 설치
npm install

# 3. Supabase에 마이그레이션 + 시드 적용
# supabase/migrations/*.sql → supabase/seed/seed.sql

# 4. 개발 서버
npm run dev
```

## API 목록

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/event/status` | 이벤트 상태 (오픈 여부, 서버 시간) |
| GET | `/api/seats` | 전체 좌석 상태 조회 |
| POST | `/api/seats/hold` | 좌석 임시 선점 |
| POST | `/api/seats/release` | 좌석 선점 해제 |
| POST | `/api/applications` | 신청 확정 |
| POST | `/api/application/lookup` | 본인 신청 조회 |
| POST | `/api/waitlist` | 대기자 신청 |
| GET | `/api/site-notice` | 공지사항 조회 |
| POST | `/api/admin/login` | 관리자 로그인 |
| GET | `/api/admin/applicants` | 신청자 목록 |
| POST | `/api/admin/cancel` | 신청 취소 |
| POST | `/api/admin/seat-change` | 좌석 이동 |
| POST | `/api/admin/manual-assign` | 수동 배정 |
| POST | `/api/admin/block-seat` | 좌석 차단 |
| POST | `/api/admin/site-notice` | 공지 수정 |
| GET | `/api/admin/export.csv` | CSV 다운로드 |

## License

이 프로젝트는 학생회 행사 운영 목적으로 개발되었으며, 학습 및 포트폴리오 참고용으로 공개합니다.
