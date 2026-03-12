import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getAdminEnv } from "@/lib/env";

const SESSION_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type AdminSession = {
  adminId: string;
  loginId: string;
  role: string;
  exp: number;
};

function base64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(payloadB64: string): string {
  const env = getAdminEnv();
  return crypto.createHmac("sha256", env.ADMIN_SESSION_SECRET).update(payloadB64).digest("base64url");
}

export function createAdminSessionToken(admin: Omit<AdminSession, "exp">): string {
  const payload: AdminSession = {
    ...admin,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifyAdminSessionToken(token: string): AdminSession | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;
  const expectedSignature = sign(payloadB64);
  const actualBytes = Buffer.from(signature, "utf8");
  const expectedBytes = Buffer.from(expectedSignature, "utf8");
  if (actualBytes.length !== expectedBytes.length) return null;
  if (!crypto.timingSafeEqual(actualBytes, expectedBytes)) return null;

  try {
    const payloadRaw = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadRaw) as AdminSession;
    if (!payload.adminId || !payload.loginId || !payload.role || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setAdminSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getAdminSessionFromCookies(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}
