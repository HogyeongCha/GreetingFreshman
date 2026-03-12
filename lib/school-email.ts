export function normalizeSchoolEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedSchoolEmail(email: string): boolean {
  return normalizeSchoolEmail(email).endsWith("@hanyang.ac.kr");
}
