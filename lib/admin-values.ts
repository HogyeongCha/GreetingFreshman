import { readFile } from "node:fs/promises";
import { z } from "zod";
import { getAdminEnv } from "@/lib/env";

const adminValuesSchema = z.object({
  admins: z.array(
    z.object({
      adminId: z.string().uuid(),
      loginId: z.string().min(1),
      password: z.string().min(1),
      role: z.string().min(1),
    }),
  ).min(1),
});

export type FileAdminAccount = z.infer<typeof adminValuesSchema>["admins"][number];

function getAdminValuesPath() {
  return process.env.ADMIN_VALUES_PATH || `${process.cwd()}/@VALUES.json`;
}

function getEnvAdminAccount(): FileAdminAccount | null {
  const env = getAdminEnv();
  if (!env.ADMIN_LOGIN_ID || !env.ADMIN_PASSWORD) return null;

  return {
    adminId: env.ADMIN_ID ?? "11111111-1111-4111-8111-111111111111",
    loginId: env.ADMIN_LOGIN_ID,
    password: env.ADMIN_PASSWORD,
    role: env.ADMIN_ROLE ?? "superadmin",
  };
}

export async function getFileAdminAccounts(): Promise<FileAdminAccount[]> {
  const envAdmin = getEnvAdminAccount();
  if (envAdmin) return [envAdmin];

  const filePath = getAdminValuesPath();
  const raw = await readFile(filePath, "utf8");
  const parsed = adminValuesSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
    throw new Error(`Invalid admin values file (${filePath}): ${message}`);
  }

  return parsed.data.admins;
}

export async function findFileAdminByLoginId(loginId: string) {
  const admins = await getFileAdminAccounts();
  return admins.find((admin) => admin.loginId === loginId) ?? null;
}
