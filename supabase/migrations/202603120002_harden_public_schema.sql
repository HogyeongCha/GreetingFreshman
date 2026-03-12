alter table public.seats enable row level security;
alter table public.applicants enable row level security;
alter table public.admins enable row level security;
alter table public.site_notices enable row level security;
alter table public.api_rate_limits enable row level security;
alter table public.application_confirm_results enable row level security;
alter table public.admin_audit_logs enable row level security;

revoke all on public.seats from anon, authenticated;
revoke all on public.applicants from anon, authenticated;
revoke all on public.admins from anon, authenticated;
revoke all on public.site_notices from anon, authenticated;
revoke all on public.api_rate_limits from anon, authenticated;
revoke all on public.application_confirm_results from anon, authenticated;
revoke all on public.admin_audit_logs from anon, authenticated;

alter function public.consume_rate_limit(text, text, integer, integer) set search_path = public, extensions;
alter function public.release_expired_holds() set search_path = public, extensions;
alter function public.admin_cancel_application(uuid) set search_path = public, extensions;
alter function public.admin_change_seat(uuid, text) set search_path = public, extensions;
alter function public.admin_create_application(text, text, text, text, text, text, text) set search_path = public, extensions;
alter function public.hold_seat(text, text, integer) set search_path = public, extensions;
alter function public.confirm_application(uuid, text, text, text, text, text, text, text) set search_path = public, extensions;
