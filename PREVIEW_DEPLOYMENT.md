# Preview Deployment

## Current Limitation
- 이 폴더는 아직 Git 저장소가 아니므로 PR별 자동 Preview Deploy는 설정할 수 없습니다.
- 대신 `vercel deploy` 기반 수동 Preview Deploy를 표준화했습니다.

## One-Time Setup
1. `.env.preview.example`를 복사해 `.env.preview.local` 생성
2. 운영과 다른 Preview 전용 Supabase 값을 입력
3. 필요하면 Preview 전용 Turnstile 키 입력

## Deploy Preview
- `bash scripts/deploy-preview-vercel.sh`

기본 동작:
- `.env.preview.local`이 있으면 이를 사용
- 없으면 `.env.local`로 fallback
- fallback 시 Preview가 운영 Supabase를 함께 사용하므로 권장하지 않음

## Recommended Supabase Split
- 운영 프로젝트: 실제 신청/좌석 데이터
- Preview 프로젝트: QA 전용 데이터

Preview 프로젝트에 권장하는 최소 조치:
- 동일 스키마 마이그레이션 적용
- 시드 계정/좌석만 별도 구성
- 관리자 비밀번호와 `ADMIN_SESSION_SECRET` 분리
- Turnstile은 Preview용 사이트 도메인 포함

## To Unlock Automatic Branch Previews
1. 이 폴더를 Git 저장소로 초기화
2. GitHub/GitLab/Bitbucket 원격 연결
3. Vercel 프로젝트에 저장소 연결
4. 그 다음 branch/PR 단위 Preview URL과 branch-specific env 사용 가능
