insert into seats (seat_code, status)
select code, 'AVAILABLE'
from unnest(array[
  'A11','A12','A21','A22','A31','A32','A41','A42','A51','A52',
  'A13','A14','A23','A24','A33','A34','A43','A44','A53','A54',
  'B11','B12','B21','B22','B31','B32','B41','B42','B51','B52',
  'B13','B14','B23','B24','B33','B34','B43','B44','B53','B54',
  'C11','C12','C21','C22','C31','C32','C41','C42','C51','C52','C61','C62',
  'C13','C14','C23','C24','C33','C34','C43','C44','C53','C54','C63','C64',
  'D11','D12','D21','D22','D31','D32','D41','D42','D51','D52','D61','D62',
  'D13','D14','D23','D24','D33','D34','D43','D44','D53','D54','D63','D64',
  'E11','E12','E21','E22','E31','E32','E41','E42','E51','E52','E61','E62',
  'E13','E14','E23','E24','E33','E34','E43','E44','E53','E54','E63','E64',
  'Z1','Z2','Z3','Z4','Z5','Z6','Z7','Z8','Z9','Z10','Z11','Z12','Z13','Z14','Z15','Z16'
]::text[]) as code
on conflict (seat_code) do nothing;

create or replace function create_waitlist_application(
  p_name text,
  p_student_id text,
  p_department text,
  p_phone text,
  p_school_email text,
  p_instagram_id text
)
returns table(application_id uuid, seat_code text, waitlist_number integer, created_at timestamptz)
language plpgsql
as $$
declare
  v_waitlist_seat seats%rowtype;
  v_application_id uuid;
  v_created_at timestamptz;
begin
  select * into v_waitlist_seat
  from seats s
  where s.seat_code in ('Z1','Z2','Z3','Z4','Z5','Z6','Z7','Z8','Z9','Z10','Z11','Z12','Z13','Z14','Z15','Z16')
    and s.status = 'AVAILABLE'
  order by substring(s.seat_code from 2)::integer asc
  limit 1
  for update skip locked;

  if not found then
    raise exception 'waitlist full';
  end if;

  if exists (
    select 1 from applicants a
    where a.status in ('CONFIRMED', 'WAITLIST')
      and (a.student_id = p_student_id or a.phone = p_phone or a.school_email = p_school_email)
  ) then
    raise exception 'duplicate application';
  end if;

  insert into applicants (
    name, student_id, department, phone, school_email, instagram_id, seat_id, status
  )
  values (
    p_name, p_student_id, p_department, p_phone, p_school_email, p_instagram_id, v_waitlist_seat.id, 'WAITLIST'
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
  where id = v_waitlist_seat.id;

  return query
  select
    v_application_id as application_id,
    v_waitlist_seat.seat_code as seat_code,
    substring(v_waitlist_seat.seat_code from 2)::integer as waitlist_number,
    v_created_at as created_at;
end;
$$;

alter function public.create_waitlist_application(text, text, text, text, text, text) set search_path = public, extensions;
