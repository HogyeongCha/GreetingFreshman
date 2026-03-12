import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { getSiteNotice } from "@/lib/site-settings";

const schema = z.object({
  key: z.enum(["home_notice", "complete_notice"]),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = schema.safeParse({ key: searchParams.get("key") });
    if (!parsed.success) return jsonError("Invalid notice key", 400);

    const content = await getSiteNotice(parsed.data.key);
    return jsonOk({ key: parsed.data.key, content });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load notice", 500);
  }
}
