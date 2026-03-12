create table if not exists site_notices (
  key text primary key,
  content text not null,
  updated_at timestamptz not null default now()
);

insert into site_notices (key, content)
values
  ('home_notice', '참가비는 추후 공지됩니다. 티켓팅 성공 화면은 인스타그램 인증 이벤트에 활용할 수 있습니다.'),
  ('complete_notice', '행사 당일 10분 전까지 입장을 권장합니다. 현장 확인을 위해 완료 화면을 준비해 주세요.')
on conflict (key) do nothing;

create or replace function admin_create_application(
  p_name text,
  p_student_id text,
  p_department text,
  p_phone text,
  p_school_email text,
  p_instagram_id text,
  p_target_seat_code text
)
returns void
language plpgsql
as $$
declare
  v_target_seat seats%rowtype;
begin
  perform release_expired_holds();

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
    p_name, p_student_id, p_department, p_phone, p_school_email, p_instagram_id, v_target_seat.id, 'CONFIRMED'
  );

  update seats
  set status = 'CONFIRMED',
      hold_id = null,
      hold_owner = null,
      hold_expires_at = null,
      updated_at = now()
  where id = v_target_seat.id;
end;
$$;
