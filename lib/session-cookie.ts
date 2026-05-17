export const COOKIE_NAME = "gomeeting_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days

export interface ParsedSession {
  studentId: string;
  token: string;
}

export function parseSessionCookie(request: Request): ParsedSession | null {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${COOKIE_NAME}=`)) continue;
    const value = decodeURIComponent(trimmed.slice(COOKIE_NAME.length + 1));
    const dot = value.indexOf(".");
    if (dot <= 0 || dot === value.length - 1) return null;
    return {
      studentId: value.slice(0, dot),
      token: value.slice(dot + 1),
    };
  }
  return null;
}

export function buildSessionCookie(studentId: string, token: string): string {
  const value = encodeURIComponent(`${studentId}.${token}`);
  const attrs = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SECONDS}`,
  ];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return attrs.join("; ");
}

export function clearSessionCookie(): string {
  const attrs = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return attrs.join("; ");
}
