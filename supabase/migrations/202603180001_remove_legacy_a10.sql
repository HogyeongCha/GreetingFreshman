delete from seats s
where s.seat_code = 'A10'
  and not exists (
    select 1 from applicants a where a.seat_id = s.id
  );
