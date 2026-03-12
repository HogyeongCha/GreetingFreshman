import { ADMIN_PAGE_SIZE } from "@/lib/constants";
import { jsonError, jsonOk } from "@/lib/http";
import { requireAdmin } from "@/lib/require-admin";
import { getSupabaseServiceClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const from = (page - 1) * ADMIN_PAGE_SIZE;
    const to = from + ADMIN_PAGE_SIZE - 1;

    const supabase = getSupabaseServiceClient();

    let query = supabase
      .from("applicants")
      .select("id,name,student_id,department,phone,school_email,status,created_at,seats(seat_code)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (search) {
      const like = `%${search}%`;
      query = query.or(`name.ilike.${like},student_id.ilike.${like},phone.ilike.${like}`);
    }

    const { data, error, count } = await query;
    if (error) return jsonError(error.message, 500);
    return jsonOk({
      items: data ?? [],
      total: count ?? 0,
      page,
      pageSize: ADMIN_PAGE_SIZE,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load applicants", 500);
  }
}
