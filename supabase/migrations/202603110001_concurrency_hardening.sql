create table if not exists api_rate_limits (
  bucket text not null,
  identifier text not null,
  window_started_at timestamptz not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (bucket, identifier)
);

create index if not exists idx_api_rate_limits_window_started_at
  on api_rate_limits(window_started_at);

create table if not exists application_confirm_results (
  hold_id uuid primary key,
  hold_owner text not null,
  application_id uuid not null references applicants(id) on delete cascade,
  seat_code text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_application_confirm_results_application_id
  on application_confirm_results(application_id);

create or replace function consume_rate_limit(
  p_bucket text,
  p_identifier text,
  p_limit integer,
  p_window_ms integer
)
returns table(allowed boolean, remaining integer, reset_at timestamptz, retry_after_sec integer)
language plpgsql
as $$
declare
  v_window interval;
  v_state api_rate_limits%rowtype;
begin
  if p_limit < 1 then
    raise exception 'invalid rate limit';
  end if;

  if p_window_ms < 1000 then
    raise exception 'invalid rate limit window';
  end if;

  v_window := (p_window_ms || ' milliseconds')::interval;

  insert into api_rate_limits as rl (bucket, identifier, window_started_at, count, updated_at)
  values (p_bucket, p_identifier, now(), 1, now())
  on conflict (bucket, identifier) do update
  set
    window_started_at = case
      when rl.window_started_at + v_window <= now() then now()
      else rl.window_started_at
    end,
    count = case
      when rl.window_started_at + v_window <= now() then 1
      else rl.count + 1
    end,
    updated_at = now()
  returning * into v_state;

  allowed := v_state.count <= p_limit;
  remaining := greatest(p_limit - v_state.count, 0);
  reset_at := v_state.window_started_at + v_window;
  retry_after_sec := greatest(ceil(extract(epoch from (reset_at - now())))::integer, 1);

  return next;
end;
$$;

create or replace function hold_seat(
  p_seat_code text,
  p_hold_owner text,
  p_hold_seconds integer default 180
)
returns table(hold_id uuid, seat_code text, expires_at timestamptz)
language plpgsql
as $$
declare
  v_seat seats%rowtype;
  v_hold_id uuid;
  v_expires_at timestamptz;
begin
  if p_hold_seconds < 30 or p_hold_seconds > 600 then
    raise exception 'invalid hold seconds';
  end if;

  perform release_expired_holds();

  select * into v_seat
  from seats s
  where s.seat_code = p_seat_code
  for update;

  if not found then
    raise exception 'seat not found';
  end if;

  if v_seat.status = 'HOLD'
    and v_seat.hold_owner is not distinct from p_hold_owner
    and v_seat.hold_expires_at is not null
    and v_seat.hold_expires_at > now() then
    return query
    select v_seat.hold_id as hold_id, v_seat.seat_code as seat_code, v_seat.hold_expires_at as expires_at;
    return;
  end if;

  if v_seat.status <> 'AVAILABLE' then
    raise exception 'seat not available';
  end if;

  v_hold_id := gen_random_uuid();
  v_expires_at := now() + make_interval(secs => p_hold_seconds);

  update seats
  set
    status = 'HOLD',
    hold_id = v_hold_id,
    hold_owner = p_hold_owner,
    hold_expires_at = v_expires_at,
    updated_at = now()
  where id = v_seat.id;

  return query
  select v_hold_id as hold_id, p_seat_code as seat_code, v_expires_at as expires_at;
end;
$$;

create or replace function confirm_application(
  p_hold_id uuid,
  p_hold_owner text,
  p_name text,
  p_student_id text,
  p_department text,
  p_phone text,
  p_school_email text,
  p_instagram_id text
)
returns table(application_id uuid, seat_code text, created_at timestamptz)
language plpgsql
as $$
declare
  v_seat seats%rowtype;
  v_application_id uuid;
  v_created_at timestamptz;
  v_existing application_confirm_results%rowtype;
begin
  select * into v_existing
  from application_confirm_results acr
  where acr.hold_id = p_hold_id
    and acr.hold_owner is not distinct from p_hold_owner;

  if found then
    return query
    select v_existing.application_id, v_existing.seat_code, v_existing.created_at;
    return;
  end if;

  perform release_expired_holds();

  select * into v_seat
  from seats s
  where s.hold_id = p_hold_id
  for update;

  if not found then
    select * into v_existing
    from application_confirm_results acr
    where acr.hold_id = p_hold_id
      and acr.hold_owner is not distinct from p_hold_owner;

    if found then
      return query
      select v_existing.application_id, v_existing.seat_code, v_existing.created_at;
      return;
    end if;

    raise exception 'invalid hold';
  end if;

  if v_seat.status <> 'HOLD'
    or v_seat.hold_owner is distinct from p_hold_owner
    or v_seat.hold_expires_at is null
    or v_seat.hold_expires_at <= now() then
    raise exception 'hold expired or owner mismatch';
  end if;

  if exists (
    select 1 from applicants a
    where a.status = 'CONFIRMED'
      and (a.student_id = p_student_id or a.phone = p_phone or a.school_email = p_school_email)
  ) then
    raise exception 'duplicate application';
  end if;

  insert into applicants (
    name, student_id, department, phone, school_email, instagram_id, seat_id, status
  )
  values (
    p_name, p_student_id, p_department, p_phone, p_school_email, p_instagram_id, v_seat.id, 'CONFIRMED'
  )
  returning id, applicants.created_at
  into v_application_id, v_created_at;

  update seats
  set
    status = 'CONFIRMED',
    hold_id = null,
    hold_owner = null,
    hold_expires_at = null,
    updated_at = now()
  where id = v_seat.id;

  insert into application_confirm_results (hold_id, hold_owner, application_id, seat_code, created_at)
  values (p_hold_id, p_hold_owner, v_application_id, v_seat.seat_code, v_created_at)
  on conflict (hold_id) do nothing;

  return query
  select v_application_id as application_id, v_seat.seat_code as seat_code, v_created_at as created_at;
end;
$$;
