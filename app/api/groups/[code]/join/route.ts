import { NextResponse } from "next/server";
import { BODY_LIMITS, readBoundedJson } from "@/lib/body-limits";
import { getDb } from "@/lib/db";
import { isValidGroupCode } from "@/lib/group-code";
import { checkRateLimit, clientKey, rateLimitResponse } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";

const MAX_MEMBERS = 20;
const RL = { limit: 20, windowMs: 60_000, key: "groups:join" };

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

    const parsedBody = await readBoundedJson<Record<string, unknown>>(
      request,
      BODY_LIMITS.groupJoin,
    );
    if (!parsedBody.ok) {
      return NextResponse.json(
        { ok: false, error: parsedBody.error },
        { status: parsedBody.status },
      );
    }

    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required. Import your schedule first.",
          code: "auth_required",
        },
        { status: 401 },
      );
    }

    // Always use the authenticated studentId. Body is ignored — prevents
    // forcing third parties into groups.
    const studentId = session.studentId;

    const db = await getDb();
    const result = await db
      .collection("groups")
      .updateOne(
        { code, $expr: { $lt: [{ $size: "$members" }, MAX_MEMBERS] } },
        { $addToSet: { members: studentId } },
      );

    if (result.matchedCount === 0) {
      const existing = await db.collection("groups").findOne({ code });
      if (!existing) {
        return NextResponse.json(
          { ok: false, error: "Group not found or expired" },
          { status: 404 },
        );
      }
      const members: string[] = Array.isArray(existing.members)
        ? existing.members
        : [];
      if (members.includes(studentId)) {
        return NextResponse.json({ ok: true, alreadyJoined: true });
      }
      return NextResponse.json(
        { ok: false, error: `Group full (max ${MAX_MEMBERS})` },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
