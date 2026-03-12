insert into seats (seat_code, status)
select code, 'AVAILABLE'
from unnest(array[
  'A51','A52','A53','A54',
  'B51','B52','B53','B54'
]::text[]) as code
on conflict (seat_code) do nothing;

delete from seats s
where s.seat_code = 'A10'
  and not exists (
    select 1 from applicants a where a.seat_id = s.id
  );
