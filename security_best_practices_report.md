# Security Best Practices Report

## Executive Summary

`SECURITY_CHECKLIST.md` 기준으로 현재 코드베이스를 점검했고, 즉시 보완 가능한 주요 항목은 직접 수정했다.  
이번 작업으로 관리자 로그인 시도 제한, 관리자 변경 요청의 same-origin 검증, 관리자 세션 쿠키 강화, 관리자 감사로그, 로그아웃 경로가 추가됐다.  
이후 Supabase에 감사로그 테이블, RLS 활성화, `search_path` 고정까지 실제 적용했다.

## Fixed

### F-01 관리자 로그인 시도 제한 부재
영향: 관리자 계정에 대해 무차별 대입 시도가 가능했다.

- 수정: 로그인 API에 공유형 rate limit를 적용했다.
- 위치: [app/api/admin/login/route.ts](/mnt/i/Files/Coding/GreetingFreshman/app/api/admin/login/route.ts#L16)

### F-02 관리자 POST 요청의 출처 검증 부재
영향: 브라우저 세션이 있는 상태에서 교차 출처 요청 방어가 쿠키 정책에만 의존했다.

- 수정: 관리자 로그인, 로그아웃, 취소, 좌석 이동, 수동 배정, 공지 수정, 좌석 차단에 same-origin 검증을 추가했다.
- 위치: [lib/request-security.ts](/mnt/i/Files/Coding/GreetingFreshman/lib/request-security.ts#L1)
- 대표 적용: [app/api/admin/cancel/route.ts](/mnt/i/Files/Coding/GreetingFreshman/app/api/admin/cancel/route.ts#L13)

### F-03 관리자 세션 토큰 검증 강도 보강 필요
영향: 서명 비교가 일반 문자열 비교였고, 비정상 payload 처리도 더 엄격할 필요가 있었다.

- 수정: `timingSafeEqual` 기반 비교, payload 구조 검증, 예외 안전 처리로 보강했다.
- 수정: 관리자 세션 쿠키를 `SameSite=Strict`로 강화했다.
- 위치: [lib/admin-auth.ts](/mnt/i/Files/Coding/GreetingFreshman/lib/admin-auth.ts#L34)

### F-04 관리자 중요 작업 감사로그 부재
영향: 누가 언제 어떤 관리자 작업을 수행했는지 추적이 어려웠다.

- 수정: 감사로그 기록 헬퍼를 추가했고 로그인 성공/실패, 신청 취소, 좌석 이동, 수동 배정, 좌석 차단, 공지 수정을 기록하도록 연결했다.
- 위치: [lib/admin-audit.ts](/mnt/i/Files/Coding/GreetingFreshman/lib/admin-audit.ts#L22)
- 마이그레이션: [supabase/migrations/202603120001_admin_security_hardening.sql](/mnt/i/Files/Coding/GreetingFreshman/supabase/migrations/202603120001_admin_security_hardening.sql#L1)

### F-06 Supabase public 스키마 RLS 미설정
영향: PostgREST에 노출되는 `public` 테이블이 RLS 없이 열려 있었다.

- 수정: `public` 테이블 전체에 RLS를 활성화하고 `anon`, `authenticated` 권한을 회수했다.
- 마이그레이션: [supabase/migrations/202603120002_harden_public_schema.sql](/mnt/i/Files/Coding/GreetingFreshman/supabase/migrations/202603120002_harden_public_schema.sql#L1)

### F-07 DB 함수의 mutable search_path
영향: 함수 실행 시 `search_path` 하이재킹 가능성이 남아 있었다.

- 수정: 주요 RPC 함수에 `search_path = public, extensions`를 고정했다.
- 마이그레이션: [supabase/migrations/202603120002_harden_public_schema.sql](/mnt/i/Files/Coding/GreetingFreshman/supabase/migrations/202603120002_harden_public_schema.sql#L16)

### F-05 관리자 로그아웃 경로 부재
영향: 관리자 세션 종료를 명시적으로 수행할 수 없었다.

- 수정: 로그아웃 API와 관리자 화면 로그아웃 버튼을 추가했다.
- 위치: [app/api/admin/logout/route.ts](/mnt/i/Files/Coding/GreetingFreshman/app/api/admin/logout/route.ts#L1)
- 위치: [components/admin-console.tsx](/mnt/i/Files/Coding/GreetingFreshman/components/admin-console.tsx#L220)

## Remaining

### R-01 Supabase service role 사용 범위 재점검 필요
영향: 현재 서버가 service role에 의존하는 구조라, 운영 전에는 테이블별 RLS 정책과 최소 권한 범위를 점검하는 것이 안전하다.

- 관련 코드: [lib/supabase.ts](/mnt/i/Files/Coding/GreetingFreshman/lib/supabase.ts#L13)

### R-02 관리자 로그인 감사로그 조회 UI는 아직 없음
영향: 로그는 저장되더라도 현재 관리자 화면에서 바로 조회할 수는 없다.

- 상태: 저장 구조만 추가

## Validation

- `npm test`: 통과
- `tsc --noEmit`: 통과
- Supabase security advisor: `ERROR/WARN` 해소, 현재는 `RLS enabled no policy` 수준의 `INFO`만 남음

## Source Basis

이 보고서는 `개발보안_가이드.pdf`의 다음 축을 기준으로 정리했다.

- 입력데이터 검증 및 표현
- 인증수행 제한
- 비밀번호 관리
- 중요자원 접근통제
- 세션통제
- 경쟁조건
- 오류 메시지 정보노출 및 예외처리
