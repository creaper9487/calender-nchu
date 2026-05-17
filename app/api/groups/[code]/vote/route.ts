import { NextResponse } from "next/server";
import { BODY_LIMITS, readBoundedJson } from "@/lib/body-limits";
import { getDb } from "@/lib/db";
import { isValidGroupCode } from "@/lib/group-code";
import { checkRateLimit, clientKey, rateLimitResponse } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";

const RL = { limit: 30, windowMs: 60_000, key: "groups:vote" };
const BLOCK_KEY_RE = /^\d{1,2}-\d{1,2}-\d{1,2}$/;

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

    const parsed = await readBoundedJson<{ blockKey?: unknown }>(
      request,
      BODY_LIMITS.groupJoin,
    );
    if (!parsed.ok) {
      return NextResponse.json(
        { ok: false, error: parsed.error },
        { status: parsed.status },
      );
    }
    const blockKey =
      typeof parsed.value.blockKey === "string"
        ? parsed.value.blockKey.trim()
        : "";
    if (!BLOCK_KEY_RE.test(blockKey)) {
      return NextResponse.json(
        { ok: false, error: "Invalid blockKey" },
        { status: 400 },
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
    const group = await db.collection("groups").findOne({ code });
    if (!group) {
      return NextResponse.json(
        { ok: false, error: "Group not found or expired" },
        { status: 404 },
      );
    }
    const members: string[] = Array.isArray(group.members) ? group.members : [];
    if (!members.includes(session.studentId)) {
      return NextResponse.json(
        { ok: false, error: "Not a member" },
        { status: 403 },
      );
    }
    if (group.confirmed) {
      return NextResponse.json(
        { ok: false, error: "Meeting already confirmed" },
        { status: 409 },
      );
    }

    const votes: Record<string, string[]> =
      group.votes && typeof group.votes === "object" ? group.votes : {};
    const current = Array.isArray(votes[blockKey]) ? votes[blockKey] : [];
    const has = current.includes(session.studentId);

    const path = `votes.${blockKey}`;
    if (has) {
      await db.collection("groups").updateOne({ code }, {
        $pull: { [path]: session.studentId },
      } as Record<string, unknown>);
    } else {
      await db.collection("groups").updateOne({ code }, {
        $addToSet: { [path]: session.studentId },
      } as Record<string, unknown>);
    }

    return NextResponse.json({ ok: true, voted: !has });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
