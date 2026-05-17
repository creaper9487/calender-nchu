import { NextResponse } from "next/server";
import { BODY_LIMITS, readBoundedJson } from "@/lib/body-limits";
import { getDb } from "@/lib/db";
import {
  GROUP_TTL_HOURS,
  generateGroupCode,
  newGroupExpiry,
} from "@/lib/group-code";
import { checkRateLimit, clientKey, rateLimitResponse } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";

const MAX_ATTEMPTS = 5;
const RL = { limit: 5, windowMs: 60_000, key: "groups:POST" };

export async function POST(request: Request) {
  const rl = checkRateLimit(clientKey(request, RL.key), RL.limit, RL.windowMs);
  if (!rl.ok) return rateLimitResponse(rl);

  const parsedBody = await readBoundedJson<Record<string, unknown>>(
    request,
    BODY_LIMITS.groupCreate,
  );
  if (!parsedBody.ok) {
    return NextResponse.json(
      { ok: false, error: parsedBody.error },
      { status: parsedBody.status },
    );
  }

  // Creator is derived from the authenticated session only. Body is ignored.
  const session = await getSession(request);
  const creatorId = session?.studentId ?? null;

  try {
    const db = await getDb();
    const now = new Date();
    const expiresAt = newGroupExpiry();

    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const code = generateGroupCode();
      try {
        await db.collection("groups").insertOne({
          code,
          creatorId,
          members: creatorId ? [creatorId] : [],
          createdAt: now,
          expiresAt,
        });
        return NextResponse.json({
          ok: true,
          code,
          expiresAt: expiresAt.toISOString(),
          ttlHours: GROUP_TTL_HOURS,
        });
      } catch (e) {
        lastErr = e;
      }
    }
    console.error("Failed to create group after retries:", lastErr);
    return NextResponse.json(
      { ok: false, error: "Could not allocate group code" },
      { status: 500 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
