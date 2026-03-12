import { getSupabaseServiceClient } from "@/lib/supabase";
import { DEFAULT_COMPLETE_NOTICE, DEFAULT_HOME_NOTICE } from "@/lib/constants";

export type SiteNoticeKey = "home_notice" | "complete_notice";

const NOTICE_FALLBACKS: Record<SiteNoticeKey, string> = {
  home_notice: DEFAULT_HOME_NOTICE,
  complete_notice: DEFAULT_COMPLETE_NOTICE,
};

export async function getSiteNotice(key: SiteNoticeKey): Promise<string> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("site_notices").select("content").eq("key", key).maybeSingle();
  if (error) return NOTICE_FALLBACKS[key];
  return (data?.content as string | undefined) ?? NOTICE_FALLBACKS[key];
}

export async function getSiteNotices(): Promise<Record<SiteNoticeKey, string>> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("site_notices").select("key,content");
  if (error) return { ...NOTICE_FALLBACKS };

  const notices = { ...NOTICE_FALLBACKS };
  for (const row of data ?? []) {
    const key = row.key as SiteNoticeKey;
    if (key in notices) notices[key] = (row.content as string) ?? notices[key];
  }
  return notices;
}
