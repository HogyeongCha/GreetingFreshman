truncate table public.application_confirm_results, public.applicants, public.api_rate_limits, public.admin_audit_logs, public.site_notices, public.admins;

update public.seats
set
  status = 'AVAILABLE',
  hold_id = null,
  hold_owner = null,
  hold_expires_at = null,
  updated_at = now();

insert into public.admins (id, login_id, password_hash, role, created_at)
values (
  '77cb99c8-3f71-4f4f-9661-9eb712050434',
  'admin',
  '$2a$10$VjSpftGEiq.1z2YMurLPkOYgZFfD1MCDL.lTU2EiOjk.mJkV1uPFy',
  'superadmin',
  '2026-03-09 18:21:54.897431+00'::timestamptz
);

insert into public.site_notices (key, content, updated_at)
values
  ('complete_notice', '행사에 대한 자세한 안내 사항은 추후에 카톡방 개설 이후 공지해 드리겠습니다. 감사합니다.', '2026-03-09 18:59:49.952502+00'::timestamptz),
  ('home_notice', '참가비는 20,000원입니다. 추가금이 발생할 수 있다는 점 사전 공지드립니다. ', '2026-03-09 18:59:49.952502+00'::timestamptz);

create temporary table tmp_application_seat_map (
  application_id uuid primary key,
  seat_code text not null,
  hold_id uuid not null,
  hold_owner text not null,
  created_at timestamptz not null
) on commit drop;

insert into tmp_application_seat_map (application_id, seat_code, hold_id, hold_owner, created_at)
values
  ('4ca8a60d-d74d-4eb4-9685-a1eaaeec524c', 'C21', '586ced9e-9ec9-4584-a63c-eeced2a02426', '065f5a42-5821-4227-b59a-909b2e5b578d', '2026-03-18 03:00:30.539065+00'::timestamptz),
  ('858bf8e5-6597-46bc-a6cb-48c03d592201', 'A31', 'a0e5b8d0-0134-415c-a7de-2c5dd4f272c9', '8206585f-adbc-4636-8dcd-c9c3402c5efc', '2026-03-18 03:00:30.678516+00'::timestamptz),
  ('ee6308ad-7b66-462b-aa6f-443a4fa995de', 'A51', 'de93b130-d6f9-497f-bd31-4a849fcd9c3e', 'f66cdc42-516d-4b44-9bdd-d5608f3c03be', '2026-03-18 03:00:34.57728+00'::timestamptz),
  ('375ecf24-712b-4127-b4db-4dffdbb3d7e1', 'B53', 'e8994871-07f1-4b35-a584-87edd6dc1965', 'c138e8d1-b9ac-41c5-812c-ff2b6a9e5291', '2026-03-18 03:00:42.422841+00'::timestamptz),
  ('f201c04e-8ce6-4b12-9615-5376c9edc534', 'A32', '8514bcd6-e24e-44c5-855b-c6064a52e83e', 'd30ff189-92a8-4296-adae-a220eec5d09b', '2026-03-18 03:00:44.804417+00'::timestamptz),
  ('bfcb0318-9869-4138-b31a-4cabbd6b8723', 'D22', '03121fcc-f84c-46e1-9bd6-1945949894da', 'd873a2c9-f4c1-4b98-929a-1804b64714d7', '2026-03-18 03:00:48.84265+00'::timestamptz),
  ('127adfab-9d22-4f14-ab32-8a654b23ae4f', 'D52', 'fec78ed5-7796-4601-badd-f927ab2e14c2', 'fa760178-f736-4f10-81f4-bc9736d1812f', '2026-03-18 03:00:50.046077+00'::timestamptz),
  ('9bcc86e2-7a2f-41cc-ab81-e228f9d623d1', 'B42', '494f4902-f962-45ad-9d43-6393369c8bf9', '70e7917f-0c8e-4b1a-b81a-0b6427c33139', '2026-03-18 03:00:51.736661+00'::timestamptz),
  ('5bf94880-ff3e-4413-90b5-b089f6499793', 'B43', 'c1561e14-3f29-471f-81e3-4ec6153f00a0', '0210a328-3fb0-4949-861e-df3735de53b8', '2026-03-18 03:00:53.598564+00'::timestamptz),
  ('1be69881-57c0-4aea-ad03-334f65a0507d', 'B51', 'eb862fba-6101-4e04-abc8-c9adf92c2827', '6a8db250-857c-4566-a972-8aa3144b287c', '2026-03-18 03:00:55.354685+00'::timestamptz),
  ('a7c8ef28-35e9-4bef-a749-4242ec909e59', 'A52', '3e115c6b-27fd-484d-82e3-323a6aebed99', '143d0582-147f-44ef-8330-b3f15520a48e', '2026-03-18 03:00:58.035386+00'::timestamptz),
  ('58e38946-59e8-45a3-8f29-92995e7f21be', 'B54', 'fb38f59d-e482-418b-84e1-a7436adfb5c7', '771fbb75-b586-4a4a-b361-b237d09f281c', '2026-03-18 03:00:59.898158+00'::timestamptz),
  ('c6d181f5-5115-4001-8f00-7426cd09ffe9', 'B32', '1f05a644-3c95-446e-a0bb-f984673f8692', 'b6974c8e-1185-4903-83ec-b4db14d3e6ef', '2026-03-18 03:01:02.000257+00'::timestamptz),
  ('c0b58c80-fc48-4609-86d9-52a6bd79b7c0', 'B31', '0170d8c6-bb54-40ea-85a3-9839e7532305', '5217eaf7-ca2c-4487-b49c-2bd0fc79354e', '2026-03-18 03:01:09.568771+00'::timestamptz),
  ('b5b4ab06-f117-421e-810b-a7d1b4c84070', 'B13', '97f4fa85-7940-475a-a9a4-334f7a3d8f5a', '862c5224-5a10-41d5-9d46-9955162003bb', '2026-03-18 03:01:11.809933+00'::timestamptz),
  ('369fc012-7cd7-400a-ac73-c5bd8cb83197', 'B22', '53738ea5-15b6-4c93-810f-865be9590fc7', '213e625b-f88d-4ac8-9b1d-2235545cc453', '2026-03-18 03:01:13.339694+00'::timestamptz),
  ('ab2343d1-b03c-4765-aaf0-979e100b10cf', 'A34', 'e8b2fdbf-ef3e-4030-8027-b65faab59ac1', 'ce93b178-aea6-4dc3-9853-d109d70a9a92', '2026-03-18 03:01:39.37362+00'::timestamptz),
  ('8894ce0f-da52-44f2-881c-27c0f8d7177d', 'A33', 'ba40bd54-bacd-49ed-bce5-ad8cd76e525c', '96707b75-6ee7-43ed-b883-4fbbd63b6364', '2026-03-18 03:01:58.004577+00'::timestamptz),
  ('4f0ab862-33ec-475c-a0f4-7ad0fc714a30', 'D61', 'da702484-6abe-4145-b3d5-c10f1e2c57c1', '4c0e6c55-544d-4267-ab11-6769d41ec1ae', '2026-03-18 03:03:35.899106+00'::timestamptz),
  ('979fe76a-6eda-425d-8ebf-6b66a4520a1e', 'B24', 'ea0af780-dfbd-4163-9c80-09dc9e42a141', '9f68b256-c31b-4db4-a521-1404c4c0e7ea', '2026-03-18 03:03:37.543843+00'::timestamptz),
  ('f59e827a-9b4c-4267-9fbd-330480896fd2', 'B34', '76c6d456-6ddd-4ed2-bfa3-9b8c7e60fe85', '7c822d7c-c015-41f4-a24a-6cd79e20b9b7', '2026-03-18 04:17:32.391483+00'::timestamptz),
  ('24df5e02-1695-4082-a486-c6dde1bacc62', 'B33', '0c236a82-0b1e-4be4-9d1c-709063bc3abb', 'aeb23858-a420-451f-86f2-d84f3eb30fa7', '2026-03-18 04:17:36.845799+00'::timestamptz),
  ('87dcd546-e30d-46ec-8ab3-ff2294e1805b', 'C32', 'b1c628d5-2a69-49df-9eb5-ae2409c72bdd', 'bdba8b75-7c3a-4b98-9beb-9cff47b109cb', '2026-03-18 04:24:52.750488+00'::timestamptz),
  ('23cf461c-a9c6-4f60-b8bc-8d76243784a1', 'C31', 'c19c43df-6e39-49ce-8dca-bcc224fbdfbb', '2b3a352d-924f-4352-861a-7b1992906ed6', '2026-03-18 04:24:54.270123+00'::timestamptz),
  ('86d643c5-931b-4d02-b220-ec18adfbee22', 'D11', 'd0a517ce-e35d-414b-8ebd-6397f097ea8a', 'd2f8bc13-d9fc-4f91-806f-dacacdf7e9b5', '2026-03-18 04:53:35.13401+00'::timestamptz),
  ('b4cf25f4-80db-404f-8247-20b973215165', 'D51', '226321dd-650e-4ad7-896a-ff259d258942', '530b6d34-970d-4595-ab3c-7c2a7e4a7cfb', '2026-03-18 04:54:51.703409+00'::timestamptz),
  ('f46fbdeb-1a53-49ac-8b29-4ee33ae4fa1e', 'A22', '7de6c51e-9405-4c0a-bdec-3eab6a3bd7a2', 'da09752f-790b-4388-aa81-53f67f0f11fc', '2026-03-18 04:57:37.058083+00'::timestamptz),
  ('a92eff38-485f-478c-ace6-d73c23859def', 'B44', '1517d6bf-0e88-43c0-9fb4-2d9a2547a561', 'b3afd9cd-23aa-492b-a09f-6fb2a7384a0f', '2026-03-18 05:00:20.384418+00'::timestamptz),
  ('d9c53fab-b416-43d2-ac41-0a052a2c3251', 'D21', '82016e7f-13df-4e7b-9a40-878037a26fa2', 'c8c73513-8c70-4df8-b709-4f7c667566e9', '2026-03-18 05:04:34.857481+00'::timestamptz),
  ('c3a5f882-ce61-4d50-8634-35b2ff0b1158', 'B52', '147f0eb6-1f63-4f54-b850-1a65c259dfd3', '8ae6b69b-963a-41a1-855d-3399c2294ada', '2026-03-18 05:05:25.210924+00'::timestamptz),
  ('943fedc9-7e9a-4e53-8924-67c9544d2fb0', 'A11', '05be214b-8eb5-4643-a7c2-77742e83eb2f', '769f4e65-160f-4c23-8eb7-439e8a35eee6', '2026-03-18 05:13:21.93137+00'::timestamptz);

insert into public.applicants (id, name, student_id, department, phone, school_email, instagram_id, seat_id, status, created_at, updated_at)
values
  ('4ca8a60d-d74d-4eb4-9685-a1eaaeec524c', '박주비', '2026028113', '기계공학과', '01047240679', 'jub2ing@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '4ca8a60d-d74d-4eb4-9685-a1eaaeec524c')), 'CONFIRMED', '2026-03-18 03:00:30.539065+00'::timestamptz, '2026-03-18 03:00:30.539065+00'::timestamptz),
  ('858bf8e5-6597-46bc-a6cb-48c03d592201', '김지원', '2024012615', '도시공학과', '01036975341', 'ji1hello@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '858bf8e5-6597-46bc-a6cb-48c03d592201')), 'CONFIRMED', '2026-03-18 03:00:30.678516+00'::timestamptz, '2026-03-18 03:00:30.678516+00'::timestamptz),
  ('ee6308ad-7b66-462b-aa6f-443a4fa995de', '최준혁', '2024035123', '정보시스템학과', '01086407658', 'eric0707@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = 'ee6308ad-7b66-462b-aa6f-443a4fa995de')), 'CONFIRMED', '2026-03-18 03:00:34.57728+00'::timestamptz, '2026-03-18 03:00:34.57728+00'::timestamptz),
  ('375ecf24-712b-4127-b4db-4dffdbb3d7e1', '임태현', '2025026835', '신소재공학부', '01074340107', 'dlaxoh@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '375ecf24-712b-4127-b4db-4dffdbb3d7e1')), 'CONFIRMED', '2026-03-18 03:00:42.422841+00'::timestamptz, '2026-03-18 03:00:42.422841+00'::timestamptz),
  ('f201c04e-8ce6-4b12-9615-5376c9edc534', '이윤진', '2024009003', '도시공학과', '01040832860', 'emily0423@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = 'f201c04e-8ce6-4b12-9615-5376c9edc534')), 'CONFIRMED', '2026-03-18 03:00:44.804417+00'::timestamptz, '2026-03-18 03:00:44.804417+00'::timestamptz),
  ('bfcb0318-9869-4138-b31a-4cabbd6b8723', '임현준', '2025025532', '신소재공학부', '01040193280', 'louis226@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = 'bfcb0318-9869-4138-b31a-4cabbd6b8723')), 'CONFIRMED', '2026-03-18 03:00:48.84265+00'::timestamptz, '2026-03-18 03:00:48.84265+00'::timestamptz),
  ('127adfab-9d22-4f14-ab32-8a654b23ae4f', '신예준', '2026050019', '기계공학부', '01040443657', 'shinzanggu@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '127adfab-9d22-4f14-ab32-8a654b23ae4f')), 'CONFIRMED', '2026-03-18 03:00:50.046077+00'::timestamptz, '2026-03-18 03:00:50.046077+00'::timestamptz),
  ('9bcc86e2-7a2f-41cc-ab81-e228f9d623d1', '박유현', '2025098059', '기계공학부', '01023044153', 'qkrdbgus0223@hanyang.ac.kr', 'epfmvjfof', (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '9bcc86e2-7a2f-41cc-ab81-e228f9d623d1')), 'CONFIRMED', '2026-03-18 03:00:51.736661+00'::timestamptz, '2026-03-18 03:00:51.736661+00'::timestamptz),
  ('5bf94880-ff3e-4413-90b5-b089f6499793', '민지홍', '2021012660', '데이터사이언스학부', '01023252856', 'mjh2856@hanyang.ac.kr', '@minjihongg', (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '5bf94880-ff3e-4413-90b5-b089f6499793')), 'CONFIRMED', '2026-03-18 03:00:53.598564+00'::timestamptz, '2026-03-18 03:00:53.598564+00'::timestamptz),
  ('1be69881-57c0-4aea-ad03-334f65a0507d', '양준석', '2023061749', '전기공학전공', '01091776528', 'jseok1120@hanyang.ac.kr', '0wnseok', (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '1be69881-57c0-4aea-ad03-334f65a0507d')), 'CONFIRMED', '2026-03-18 03:00:55.354685+00'::timestamptz, '2026-03-18 03:00:55.354685+00'::timestamptz),
  ('a7c8ef28-35e9-4bef-a749-4242ec909e59', '김민경', '2024028359', '정보시스템학과', '01073457605', 'asrd122@hanyang.ac.kr', 'ryxdx_', (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = 'a7c8ef28-35e9-4bef-a749-4242ec909e59')), 'CONFIRMED', '2026-03-18 03:00:58.035386+00'::timestamptz, '2026-03-18 03:00:58.035386+00'::timestamptz),
  ('58e38946-59e8-45a3-8f29-92995e7f21be', '차윤서', '2026011576', '기계공학부', '01022621198', 'younseo1197@hanyang.ac.kr', 'caryoun.oo', (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '58e38946-59e8-45a3-8f29-92995e7f21be')), 'CONFIRMED', '2026-03-18 03:00:59.898158+00'::timestamptz, '2026-03-18 03:00:59.898158+00'::timestamptz),
  ('c6d181f5-5115-4001-8f00-7426cd09ffe9', '황예동', '2023066753', '원자력공학과', '01046398987', 'ehddl8980@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = 'c6d181f5-5115-4001-8f00-7426cd09ffe9')), 'CONFIRMED', '2026-03-18 03:01:02.000257+00'::timestamptz, '2026-03-18 03:01:02.000257+00'::timestamptz),
  ('c0b58c80-fc48-4609-86d9-52a6bd79b7c0', '이다연', '2026058122', '신소재공학부', '01086187462', 'iris0524@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = 'c0b58c80-fc48-4609-86d9-52a6bd79b7c0')), 'CONFIRMED', '2026-03-18 03:01:09.568771+00'::timestamptz, '2026-03-18 03:01:09.568771+00'::timestamptz),
  ('b5b4ab06-f117-421e-810b-a7d1b4c84070', '홍지현', '2024026953', '도시공학과', '01048269353', 'hongghd0327@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = 'b5b4ab06-f117-421e-810b-a7d1b4c84070')), 'CONFIRMED', '2026-03-18 03:01:11.809933+00'::timestamptz, '2026-03-18 03:01:11.809933+00'::timestamptz),
  ('369fc012-7cd7-400a-ac73-c5bd8cb83197', '박나혜', '2023010137', '도시공학과', '01049232510', 'nahye0122@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '369fc012-7cd7-400a-ac73-c5bd8cb83197')), 'CONFIRMED', '2026-03-18 03:01:13.339694+00'::timestamptz, '2026-03-18 03:01:13.339694+00'::timestamptz),
  ('ab2343d1-b03c-4765-aaf0-979e100b10cf', '이은화', '2025058495', '기계공학부', '01090748673', 'aehl47g@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = 'ab2343d1-b03c-4765-aaf0-979e100b10cf')), 'CONFIRMED', '2026-03-18 03:01:39.37362+00'::timestamptz, '2026-03-18 03:01:39.37362+00'::timestamptz),
  ('8894ce0f-da52-44f2-881c-27c0f8d7177d', '조원재', '2021099825', '화학공학과', '01031795213', 'vanstorm2002@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '8894ce0f-da52-44f2-881c-27c0f8d7177d')), 'CONFIRMED', '2026-03-18 03:01:58.004577+00'::timestamptz, '2026-03-18 03:01:58.004577+00'::timestamptz),
  ('4f0ab862-33ec-475c-a0f4-7ad0fc714a30', '황진웅', '2025024402', '신소재공학부', '01084426277', 'hshjw0809@hanyang.ac.kr', 'j_woongi_0', (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '4f0ab862-33ec-475c-a0f4-7ad0fc714a30')), 'CONFIRMED', '2026-03-18 03:03:35.899106+00'::timestamptz, '2026-03-18 03:03:35.899106+00'::timestamptz),
  ('979fe76a-6eda-425d-8ebf-6b66a4520a1e', '김려진', '2023035541', '유기나노공학과', '01044562636', 'ryujinlr@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '979fe76a-6eda-425d-8ebf-6b66a4520a1e')), 'CONFIRMED', '2026-03-18 03:03:37.543843+00'::timestamptz, '2026-03-18 03:03:37.543843+00'::timestamptz),
  ('f59e827a-9b4c-4267-9fbd-330480896fd2', '박윤하', '2026035514', '컴퓨터소프트웨어학부', '01065990886', 'gyongha@hanyang.ac.kr', 'uynxia', (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = 'f59e827a-9b4c-4267-9fbd-330480896fd2')), 'CONFIRMED', '2026-03-18 04:17:32.391483+00'::timestamptz, '2026-03-18 04:17:32.391483+00'::timestamptz),
  ('24df5e02-1695-4082-a486-c6dde1bacc62', '김연우', '2025087201', '컴퓨터소프트웨어학부', '01030722352', 'blxndxdd@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '24df5e02-1695-4082-a486-c6dde1bacc62')), 'CONFIRMED', '2026-03-18 04:17:36.845799+00'::timestamptz, '2026-03-18 04:17:36.845799+00'::timestamptz),
  ('87dcd546-e30d-46ec-8ab3-ff2294e1805b', '정민우', '2025044020', '컴퓨터소프트웨어학부', '01062194749', 'jmw0729@hanyang.ac.kr', 'm1n_w0o', (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '87dcd546-e30d-46ec-8ab3-ff2294e1805b')), 'CONFIRMED', '2026-03-18 04:24:52.750488+00'::timestamptz, '2026-03-18 04:24:52.750488+00'::timestamptz),
  ('23cf461c-a9c6-4f60-b8bc-8d76243784a1', '김수혁', '2025060000', '컴퓨터소프트웨어학부', '01047297464', 'plantrevol@hanyang.ac.kr', 'ratisyou', (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '23cf461c-a9c6-4f60-b8bc-8d76243784a1')), 'CONFIRMED', '2026-03-18 04:24:54.270123+00'::timestamptz, '2026-03-18 04:24:54.270123+00'::timestamptz),
  ('86d643c5-931b-4d02-b220-ec18adfbee22', '이준영', '2026029143', '전기공학부', '01064236377', 'mathory1@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '86d643c5-931b-4d02-b220-ec18adfbee22')), 'CONFIRMED', '2026-03-18 04:53:35.13401+00'::timestamptz, '2026-03-18 04:53:35.13401+00'::timestamptz),
  ('b4cf25f4-80db-404f-8247-20b973215165', '황인욱', '2026024811', '기계공학부', '01033963232', 'wook3230@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = 'b4cf25f4-80db-404f-8247-20b973215165')), 'CONFIRMED', '2026-03-18 04:54:51.703409+00'::timestamptz, '2026-03-18 04:54:51.703409+00'::timestamptz),
  ('f46fbdeb-1a53-49ac-8b29-4ee33ae4fa1e', '정상범', '2026019243', '컴퓨터소프트웨어학부', '01034776045', 'jsb3784@hanyang.ac.kr', 'bummy_u', (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = 'f46fbdeb-1a53-49ac-8b29-4ee33ae4fa1e')), 'CONFIRMED', '2026-03-18 04:57:37.058083+00'::timestamptz, '2026-03-18 04:57:37.058083+00'::timestamptz),
  ('a92eff38-485f-478c-ace6-d73c23859def', 'Shai', '2024099170', '전기공학과', '01057320728', 'shokhistar0728@hanyang.ac.kr', 'Shai_28', (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = 'a92eff38-485f-478c-ace6-d73c23859def')), 'CONFIRMED', '2026-03-18 05:00:20.384418+00'::timestamptz, '2026-03-18 05:00:20.384418+00'::timestamptz),
  ('d9c53fab-b416-43d2-ac41-0a052a2c3251', '차수영', '2026082406', '신소재공학부', '01020071713', 'sycha0822@hanyang.ac.kr', null, (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = 'd9c53fab-b416-43d2-ac41-0a052a2c3251')), 'CONFIRMED', '2026-03-18 05:04:34.857481+00'::timestamptz, '2026-03-18 05:04:34.857481+00'::timestamptz),
  ('c3a5f882-ce61-4d50-8634-35b2ff0b1158', '차호경', '2024012833', '데이터사이언스학부', '01059102212', 'radiantwenty@hanyang.ac.kr', 'chahogyeong', (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = 'c3a5f882-ce61-4d50-8634-35b2ff0b1158')), 'CANCELED', '2026-03-18 05:05:25.210924+00'::timestamptz, '2026-03-18 05:05:52.817373+00'::timestamptz),
  ('943fedc9-7e9a-4e53-8924-67c9544d2fb0', '이윤성', '2026056508', '데이터사이언스학부', '01073195572', 'yunsung0223@hanyang.ac.kr', 'yunseong953', (select id from public.seats where seat_code = (select seat_code from tmp_application_seat_map where application_id = '943fedc9-7e9a-4e53-8924-67c9544d2fb0')), 'CONFIRMED', '2026-03-18 05:13:21.93137+00'::timestamptz, '2026-03-18 05:13:21.93137+00'::timestamptz);

insert into public.application_confirm_results (hold_id, hold_owner, application_id, seat_code, created_at)
select hold_id, hold_owner, application_id, seat_code, created_at
from tmp_application_seat_map;

update public.seats
set status = 'CONFIRMED', updated_at = now()
where id in (
  select seat_id
  from public.applicants
  where status = 'CONFIRMED'
);

update public.seats
set status = 'BLOCKED', updated_at = '2026-03-17 15:30:27.001779+00'::timestamptz
where seat_code in ('E41', 'E42', 'E43', 'E44', 'E51', 'E52', 'E53', 'E54', 'E61', 'E62', 'E63', 'E64');

update public.seats
set
  status = 'HOLD',
  hold_id = 'f48a59a5-b185-4cc8-8fbc-aa9954c8cf8b',
  hold_owner = '2b210486-5549-458d-8093-85c0fb6186a6',
  hold_expires_at = '2026-03-18 05:14:38.070206+00'::timestamptz,
  updated_at = '2026-03-18 05:12:38.070206+00'::timestamptz
where seat_code = 'A14';

update public.seats
set
  status = 'HOLD',
  hold_id = 'ed976173-49c4-47f4-87fc-ce8100ec269c',
  hold_owner = '8d2de48e-30be-437f-bcfb-7d10f0855051',
  hold_expires_at = '2026-03-18 05:15:18.275713+00'::timestamptz,
  updated_at = '2026-03-18 05:13:18.275713+00'::timestamptz
where seat_code = 'A41';

update public.seats
set
  status = 'HOLD',
  hold_id = '29b82114-d536-443c-94d9-173c2be22a1a',
  hold_owner = '8ce6dbd9-70de-42ef-b35f-8399cc98cf0d',
  hold_expires_at = '2026-03-18 05:15:08.90211+00'::timestamptz,
  updated_at = '2026-03-18 05:13:08.90211+00'::timestamptz
where seat_code = 'E21';

update public.seats
set
  status = 'HOLD',
  hold_id = '8d2def51-7635-4b28-8b04-bad433323af8',
  hold_owner = '8ce6dbd9-70de-42ef-b35f-8399cc98cf0d',
  hold_expires_at = '2026-03-18 05:15:17.645347+00'::timestamptz,
  updated_at = '2026-03-18 05:13:17.645347+00'::timestamptz
where seat_code = 'E22';
