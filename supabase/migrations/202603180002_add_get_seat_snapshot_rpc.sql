create or replace function public.get_seat_snapshot()
returns table(seat_code text, status text, hold_expires_at timestamptz)
language sql
stable
set search_path = public, extensions
as $$
  select s.seat_code, s.status::text, s.hold_expires_at
  from public.seats s
  where s.status <> 'AVAILABLE'
  order by s.seat_code asc;
$$;

grant execute on function public.get_seat_snapshot() to anon, authenticated, service_role;
