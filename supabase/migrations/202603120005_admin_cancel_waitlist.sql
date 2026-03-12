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

  if v_app.status not in ('CONFIRMED', 'WAITLIST') then
    raise exception 'only active application can be canceled';
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

alter function public.admin_cancel_application(uuid) set search_path = public, extensions;
