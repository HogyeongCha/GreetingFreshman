#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERCEL_SCOPE="${VERCEL_SCOPE:-team_fq8biQREJwP7diLqfcp15Wl0}"
ENV_FILE="${PREVIEW_ENV_FILE:-.env.preview.local}"

if [ ! -f "$ENV_FILE" ]; then
  if [ -f ".env.local" ]; then
    ENV_FILE=".env.local"
    echo "warning: .env.preview.local not found, falling back to .env.local" >&2
    echo "warning: this preview will use the same Supabase project as production" >&2
  else
    echo "missing env file: $ENV_FILE" >&2
    echo "create .env.preview.local from .env.preview.example first" >&2
    exit 1
  fi
fi

set -a
source "$ENV_FILE"
set +a

required_vars=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  ADMIN_SESSION_SECRET
)

for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "missing required variable: $var_name" >&2
    exit 1
  fi
done

echo "deploying preview with env file: $ENV_FILE" >&2

npx vercel@latest deploy \
  --scope "$VERCEL_SCOPE" \
  --env NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --env SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  --env ADMIN_SESSION_SECRET="$ADMIN_SESSION_SECRET" \
  ${ADMIN_ID:+--env ADMIN_ID="$ADMIN_ID"} \
  ${ADMIN_LOGIN_ID:+--env ADMIN_LOGIN_ID="$ADMIN_LOGIN_ID"} \
  ${ADMIN_PASSWORD:+--env ADMIN_PASSWORD="$ADMIN_PASSWORD"} \
  ${ADMIN_ROLE:+--env ADMIN_ROLE="$ADMIN_ROLE"} \
  ${NEXT_PUBLIC_TURNSTILE_SITE_KEY:+--env NEXT_PUBLIC_TURNSTILE_SITE_KEY="$NEXT_PUBLIC_TURNSTILE_SITE_KEY"} \
  ${TURNSTILE_SECRET_KEY:+--env TURNSTILE_SECRET_KEY="$TURNSTILE_SECRET_KEY"}
