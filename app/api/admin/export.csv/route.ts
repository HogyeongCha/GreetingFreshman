import { jsonError } from "@/lib/http";
import { requireAdmin } from "@/lib/require-admin";
import { getSupabaseServiceClient } from "@/lib/supabase";

function escapeCsv(value: string | null | undefined) {
  const v = value ?? "";
  if (v.includes(",") || v.includes("\"") || v.includes("\n")) {
    return `"${v.replaceAll("\"", "\"\"")}"`;
  }
  return v;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("applicants")
      .select("id,name,student_id,department,phone,school_email,instagram_id,status,created_at,seats(seat_code)")
      .order("created_at", { ascending: true });
    if (error) return jsonError(error.message, 500);

    const header = ["id", "name", "student_id", "department", "phone", "school_email", "instagram_id", "seat_code", "status", "created_at"];
    const rows = (data ?? []).map((item) => [
      String(item.id),
      escapeCsv(String(item.name)),
      escapeCsv(String(item.student_id)),
      escapeCsv(String(item.department)),
      escapeCsv(String(item.phone)),
      escapeCsv(String(item.school_email)),
      escapeCsv((item.instagram_id as string | null) ?? ""),
      escapeCsv(((item.seats as { seat_code?: string } | null)?.seat_code as string | undefined) ?? ""),
      escapeCsv(String(item.status)),
      escapeCsv(String(item.created_at)),
    ]);

    const csv = `\uFEFF${header.join(",")}\n${rows.map((row) => row.join(",")).join("\n")}`;
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="applicants-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "CSV export failed", 500);
  }
}
