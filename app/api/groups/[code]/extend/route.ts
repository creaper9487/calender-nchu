import { NextResponse } from "next/server";
import { BODY_LIMITS, readBoundedJson } from "@/lib/body-limits";
import { getDb } from "@/lib/db";
import {
  GROUP_TTL_HOURS,
  isValidGroupCode,
  newGroupExpiry,
} from "@/lib/group-code";
import { checkRateLimit, clientKey, rateLimitResponse } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";

const RL = { limit: 5, windowMs: 60_000, key: "groups:extend" };

interface Params {
  params: Promise<{ code: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const rl = checkRateLimit(clientKey(request, RL.key), RL.limit, RL.windowMs);
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    const { code } = await params;
    if (!isValidGroupCode(code)) {
      return NextResponse.json(
        { ok: false, error: "Invalid group code" },
        { status: 400 },
      );
    }

    // Allow empty body
    const parsedBody = await readBoundedJson(request, BODY_LIMITS.groupExtend);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { ok: false, error: parsedBody.error },
        { status: parsedBody.status },
      );
    }

    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const db = await getDb();
    const expiresAt = newGroupExpiry();
    const result = await db
      .collection("groups")
      .updateOne({ code, members: session.studentId }, { $set: { expiresAt } });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Group not found, expired, or you are not a member",
        },
        { status: 404 },
      );
    }
    return NextResponse.json({
      ok: true,
      expiresAt: expiresAt.toISOString(),
      ttlHours: GROUP_TTL_HOURS,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
