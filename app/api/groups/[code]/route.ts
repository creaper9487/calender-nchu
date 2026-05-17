import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isValidGroupCode } from "@/lib/group-code";
import {
  buildBusyMask,
  findBlocks,
  intersectFree,
  rankBlocks,
} from "@/lib/matching";
import { checkRateLimit, clientKey, rateLimitResponse } from "@/lib/rate-limit";
import type { Course } from "@/lib/schedule-types";

const RL = { limit: 60, windowMs: 60_000, key: "groups:GET" };

interface Params {
  params: Promise<{ code: string }>;
}

export async function GET(request: Request, { params }: Params) {
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

    const db = await getDb();
    const group = await db.collection("groups").findOne({ code });
    if (!group) {
      return NextResponse.json(
        { ok: false, error: "Group not found or expired" },
        { status: 404 },
      );
    }

    const members: string[] = Array.isArray(group.members) ? group.members : [];
    const docs = members.length
      ? await db
          .collection("schedules")
          .find({ studentId: { $in: members } })
          .project<{ studentId: string; courses: Course[] }>({
            studentId: 1,
            courses: 1,
            _id: 0,
          })
          .toArray()
      : [];

    const found = docs.map((d) => d.studentId);
    const missing = members.filter((m) => !found.includes(m));

    let blocks: ReturnType<typeof rankBlocks> = [];
    if (found.length >= 2) {
      const masks = docs.map((d) => buildBusyMask(d.courses || []));
      blocks = rankBlocks(findBlocks(intersectFree(masks)));
    }

    const rawVotes =
      group.votes && typeof group.votes === "object"
        ? (group.votes as Record<string, unknown>)
        : {};
    const votes: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(rawVotes)) {
      if (Array.isArray(v)) votes[k] = v.filter((s) => typeof s === "string");
    }

    return NextResponse.json({
      ok: true,
      code,
      creatorId: group.creatorId ?? null,
      members,
      found,
      missing,
      blocks,
      votes,
      confirmed: group.confirmed ?? null,
      expiresAt:
        group.expiresAt instanceof Date
          ? group.expiresAt.toISOString()
          : group.expiresAt,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
