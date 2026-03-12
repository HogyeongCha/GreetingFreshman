import { z } from "zod";

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1)
});

const adminEnvSchema = z.object({
  ADMIN_SESSION_SECRET: z.string().min(32),
  ADMIN_ID: z.string().uuid().optional(),
  ADMIN_LOGIN_ID: z.string().min(1).optional(),
  ADMIN_PASSWORD: z.string().min(1).optional(),
  ADMIN_ROLE: z.string().min(1).optional(),
});

type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;
type AdminEnv = z.infer<typeof adminEnvSchema>;

let cachedSupabaseEnv: SupabaseEnv | null = null;
let cachedAdminEnv: AdminEnv | null = null;

export function getSupabaseEnv(): SupabaseEnv {
  if (cachedSupabaseEnv) return cachedSupabaseEnv;
  const parsed = supabaseEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  });
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
    throw new Error(`Invalid environment variables: ${message}`);
  }
  cachedSupabaseEnv = parsed.data;
  return cachedSupabaseEnv;
}

export function getAdminEnv(): AdminEnv {
  if (cachedAdminEnv) return cachedAdminEnv;
  const parsed = adminEnvSchema.safeParse({
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
    ADMIN_ID: process.env.ADMIN_ID,
    ADMIN_LOGIN_ID: process.env.ADMIN_LOGIN_ID,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_ROLE: process.env.ADMIN_ROLE,
  });
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
    throw new Error(`Invalid environment variables: ${message}`);
  }
  cachedAdminEnv = parsed.data;
  return cachedAdminEnv;
}

export function resetEnvCacheForTests() {
  cachedSupabaseEnv = null;
  cachedAdminEnv = null;
}
