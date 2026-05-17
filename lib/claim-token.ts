import crypto from "node:crypto";

let cachedKey: string | null = null;

function getKey(): string {
  if (cachedKey) return cachedKey;
  const env = process.env.CLAIM_TOKEN_SECRET;
  if (env && env.length >= 16) {
    cachedKey = env;
    return cachedKey;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CLAIM_TOKEN_SECRET environment variable is required in production (min 16 chars)",
    );
  }
  cachedKey = crypto.randomBytes(32).toString("hex");
  console.warn(
    "[claim-token] CLAIM_TOKEN_SECRET not set — using ephemeral dev secret. Sessions will be lost on process restart.",
  );
  return cachedKey;
}

export function generateClaimToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function hashClaim(studentId: string, token: string): string {
  return crypto
    .createHmac("sha256", getKey())
    .update(`${studentId}.${token}`)
    .digest("hex");
}

export function verifyClaim(
  studentId: string,
  token: string,
  expectedHash: string,
): boolean {
  if (!studentId || !token || !expectedHash) return false;
  try {
    const got = Buffer.from(hashClaim(studentId, token), "hex");
    const want = Buffer.from(expectedHash, "hex");
    if (got.length !== want.length) return false;
    return crypto.timingSafeEqual(got, want);
  } catch {
    return false;
  }
}

// Test hook
export function _setKeyForTest(key: string | null): void {
  cachedKey = key;
}
