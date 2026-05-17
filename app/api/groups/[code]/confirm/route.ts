import { NextResponse } from "next/server";
import { BODY_LIMITS, readBoundedJson } from "@/lib/body-limits";
import { blockKey as makeBlockKey } from "@/lib/calendar";
import { getDb } from "@/lib/db";
import { isValidGroupCode } from "@/lib/group-code";
import { buildBusyMask, findBlocks, intersectFree } from "@/lib/matching";
import { checkRateLimit, clientKey, rateLimitResponse } from "@/lib/rate-limit";
import type { ConfirmedMeeting, Course } from "@/lib/schedule-types";
import { getSession } from "@/lib/session";

const RL = { limit: 10, windowMs: 60_000, key: "groups:confirm" };
const BLOCK_KEY_RE = /^\d{1,2}-\d{1,2}-\d{1,2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TITLE_LEN = 100;
const MAX_LOCATION_LEN = 200;

interface Params {
  params: Promise<{ code: string }>;
}

function canConfirm(
  group: Record<string, unknown>,
  studentId: string,
): boolean {
  const creatorId = (group.creatorId as string | null) ?? null;
  const members = Array.isArray(group.members)
    ? (group.members as string[])
    : [];
  if (creatorId === null) return members.includes(studentId);
  return creatorId === studentId;
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

    const parsed = await readBoundedJson<{
      blockKey?: unknown;
      date?: unknown;
      title?: unknown;
      location?: unknown;
    }>(request, BODY_LIMITS.groupJoin);
    if (!parsed.ok) {
      return NextResponse.json(
        { ok: false, error: parsed.error },
        { status: parsed.status },
      );
    }
    const { value } = parsed;
    const blockKey =
      typeof value.blockKey === "string" ? value.blockKey.trim() : "";
    const date = typeof value.date === "string" ? value.date.trim() : "";
    const title =
      typeof value.title === "string"
        ? value.title.trim().slice(0, MAX_TITLE_LEN)
        : "夠咪亭";
    const location =
      typeof value.location === "string"
        ? value.location.trim().slice(0, MAX_LOCATION_LEN)
        : undefined;

    if (!BLOCK_KEY_RE.test(blockKey)) {
      return NextResponse.json(
        { ok: false, error: "Invalid blockKey" },
        { status: 400 },
      );
    }
    if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) {
      return NextResponse.json(
        { ok: false, error: "Invalid date (expected YYYY-MM-DD)" },
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
    if (!canConfirm(group as Record<string, unknown>, session.studentId)) {
      return NextResponse.json(
        { ok: false, error: "Only the group creator can confirm" },
        { status: 403 },
      );
    }

    // Re-derive the block from current schedules to make sure the choice
    // is actually a real common-free block (defends against confirming
    // arbitrary blockKey values).
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
    if (docs.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Group needs at least 2 imported schedules" },
        { status: 400 },
      );
    }
    const blocks = findBlocks(
      intersectFree(docs.map((d) => buildBusyMask(d.courses || []))),
    );
    const match = blocks.find(
      (b) => makeBlockKey(b.dayOfWeek, b.fromPeriod, b.toPeriod) === blockKey,
    );
    if (!match) {
      return NextResponse.json(
        { ok: false, error: "blockKey is not a current common free block" },
        { status: 400 },
      );
    }

    const confirmed: ConfirmedMeeting = {
      blockKey,
      dayOfWeek: match.dayOfWeek,
      fromPeriod: match.fromPeriod,
      toPeriod: match.toPeriod,
      fromTime: match.fromTime,
      toTime: match.toTime,
      date,
      title,
      location,
      confirmedBy: session.studentId,
      confirmedAt: new Date().toISOString(),
    };

    await db.collection("groups").updateOne({ code }, { $set: { confirmed } });

    return NextResponse.json({ ok: true, confirmed });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
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
    if (!canConfirm(group as Record<string, unknown>, session.studentId)) {
      return NextResponse.json(
        { ok: false, error: "Only the group creator can unconfirm" },
        { status: 403 },
      );
    }
    await db
      .collection("groups")
      .updateOne({ code }, { $set: { confirmed: null } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
