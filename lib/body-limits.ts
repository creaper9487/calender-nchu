export const BODY_LIMITS = {
  schedules: 100 * 1024,
  match: 16 * 1024,
  groupCreate: 4 * 1024,
  groupJoin: 4 * 1024,
  groupExtend: 1024,
} as const;

export type BoundedJson<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

export async function readBoundedJson<T = unknown>(
  request: Request,
  maxBytes: number,
): Promise<BoundedJson<T>> {
  const cl = request.headers.get("content-length");
  if (cl && Number(cl) > maxBytes) {
    return { ok: false, status: 413, error: "Payload too large" };
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    return { ok: false, status: 413, error: "Payload too large" };
  }
  if (text.length === 0) {
    return { ok: true, value: {} as T };
  }
  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }
}
