create extension if not exists pgcrypto;

create table if not exists seats (
  id uuid primary key default gen_random_uuid(),
  seat_code text not null unique,
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE', 'HOLD', 'CONFIRMED', 'BLOCKED')),
  hold_id uuid,
  hold_owner text,
  hold_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists applicants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  student_id text not null,
  department text not null,
  phone text not null,
  school_email text not null,
  instagram_id text,
  seat_id uuid not null references seats(id),
  status text not null default 'CONFIRMED' check (status in ('CONFIRMED', 'CANCELED', 'WAITLIST')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  login_id text not null unique,
  password_hash text not null,
  role text not null default 'staff',
  created_at timestamptz not null default now()
);

create index if not exists idx_applicants_status_created on applicants(status, created_at desc);
create index if not exists idx_applicants_seat_id on applicants(seat_id);

create unique index if not exists uq_applicants_student_confirmed
  on applicants(student_id)
  where status = 'CONFIRMED';

create unique index if not exists uq_applicants_phone_confirmed
  on applicants(phone)
  where status = 'CONFIRMED';

create unique index if not exists uq_applicants_email_confirmed
  on applicants(school_email)
  where status = 'CONFIRMED';

create unique index if not exists uq_applicants_seat_confirmed
  on applicants(seat_id)
  where status = 'CONFIRMED';

create or replace function release_expired_holds()
returns void
language plpgsql
as $$
begin
  update seats
  set
    status = 'AVAILABLE',
    hold_id = null,
    hold_owner = null,
    hold_expires_at = null,
    updated_at = now()
  where status = 'HOLD'
    and hold_expires_at is not null
    and hold_expires_at <= now();
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
begin
  perform release_expired_holds();

  select * into v_seat
  from seats s
  where s.hold_id = p_hold_id
  for update;

  if not found then
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

  return query
  select v_application_id as application_id, v_seat.seat_code as seat_code, v_created_at as created_at;
end;
$$;

create or replace function admin_cancel_application(p_applicant_id uuid)
returns void
language plpgsql
as $$
declare
  v_app applicants%rowtype;
begin
  select * into v_app
  from applicants
  where id = p_applicant_id
  for update;

  if not found then
    raise exception 'applicant not found';
  end if;

  if v_app.status <> 'CONFIRMED' then
    raise exception 'only confirmed application can be canceled';
  end if;

  update applicants
  set status = 'CANCELED', updated_at = now()
  where id = v_app.id;

  update seats
  set
    status = 'AVAILABLE',
    hold_id = null,
    hold_owner = null,
    hold_expires_at = null,
    updated_at = now()
  where id = v_app.seat_id;
end;
$$;

create or replace function admin_change_seat(
  p_applicant_id uuid,
  p_target_seat_code text
)
returns void
language plpgsql
as $$
declare
  v_app applicants%rowtype;
  v_current_seat seats%rowtype;
  v_target_seat seats%rowtype;
begin
  perform release_expired_holds();

  select * into v_app
  from applicants
  where id = p_applicant_id
  for update;

  if not found then
    raise exception 'applicant not found';
  end if;

  if v_app.status <> 'CONFIRMED' then
    raise exception 'only confirmed application can move seat';
  end if;

  select * into v_current_seat
  from seats
  where id = v_app.seat_id
  for update;

  select * into v_target_seat
  from seats
  where seat_code = p_target_seat_code
  for update;

  if not found then
    raise exception 'target seat not found';
  end if;

  if v_target_seat.status <> 'AVAILABLE' then
    raise exception 'target seat is not available';
  end if;

  update seats
  set status = 'AVAILABLE',
      hold_id = null,
      hold_owner = null,
      hold_expires_at = null,
      updated_at = now()
  where id = v_current_seat.id;

  update seats
  set status = 'CONFIRMED',
      hold_id = null,
      hold_owner = null,
      hold_expires_at = null,
      updated_at = now()
  where id = v_target_seat.id;

  update applicants
  set seat_id = v_target_seat.id, updated_at = now()
  where id = v_app.id;
end;
$$;
