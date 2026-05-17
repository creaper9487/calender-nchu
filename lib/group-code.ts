// Avoid ambiguous chars (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LEN = 6;

export const GROUP_CODE_RE = new RegExp(`^[${ALPHABET}]{${CODE_LEN}}$`);

export function isValidGroupCode(code: string): boolean {
  return GROUP_CODE_RE.test(code);
}

export function generateGroupCode(): string {
  const bytes = new Uint8Array(CODE_LEN);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < CODE_LEN; i++)
      bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < CODE_LEN; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export const GROUP_TTL_HOURS = 24;

export function newGroupExpiry(): Date {
  return new Date(Date.now() + GROUP_TTL_HOURS * 60 * 60 * 1000);
}
