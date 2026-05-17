import { NextResponse } from "next/server";
import { BODY_LIMITS, readBoundedJson } from "@/lib/body-limits";
import { getDb } from "@/lib/db";
import {
  buildBusyMask,
  findBlocks,
  intersectFree,
  rankBlocks,
} from "@/lib/matching";
import { checkRateLimit, clientKey, rateLimitResponse } from "@/lib/rate-limit";
import type { Course } from "@/lib/schedule-types";
import { getSession } from "@/lib/session";
import { STUDENT_ID_RE } from "@/lib/student-id";

const MAX_STUDENTS = 20;
const RL = { limit: 30, windowMs: 60_000, key: "match:POST" };

export async function POST(request: Request) {
  const rl = checkRateLimit(clientKey(request, RL.key), RL.limit, RL.windowMs);
  if (!rl.ok) return rateLimitResponse(rl);

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

  const parsedBody = await readBoundedJson<{
    studentIds?: unknown;
    me?: unknown;
  }>(request, BODY_LIMITS.match);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { ok: false, error: parsedBody.error },
      { status: parsedBody.status },
    );
  }
  const body = parsedBody.value;

  if (!Array.isArray(body.studentIds)) {
    return NextResponse.json(
      { ok: false, error: "studentIds must be an array" },
      { status: 400 },
    );
  }
  const me = typeof body.me === "string" ? body.me.trim() : "";
  if (!STUDENT_ID_RE.test(me)) {
    return NextResponse.json(
      { ok: false, error: "me must be a valid studentId" },
      { status: 400 },
    );
  }
  if (me !== session.studentId) {
    return NextResponse.json(
      { ok: false, error: "me does not match your session" },
      { status: 403 },
    );
  }

  const requested = Array.from(
    new Set(
      body.studentIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  );

  if (requested.length === 0) {
    return NextResponse.json(
      { ok: false, error: "studentIds is empty" },
      { status: 400 },
    );
  }
  if (requested.length > MAX_STUDENTS) {
    return NextResponse.json(
      { ok: false, error: `Too many studentIds (max ${MAX_STUDENTS})` },
      { status: 400 },
    );
  }
  if (!requested.every((id) => STUDENT_ID_RE.test(id))) {
    return NextResponse.json(
      { ok: false, error: "Invalid studentId in list" },
      { status: 400 },
    );
  }
  if (!requested.includes(me)) {
    return NextResponse.json(
      { ok: false, error: "studentIds must include yourself" },
      { status: 403 },
    );
  }

  try {
    const db = await getDb();
    const docs = await db
      .collection("schedules")
      .find({ studentId: { $in: requested } })
      .project<{ studentId: string; courses: Course[] }>({
        studentId: 1,
        courses: 1,
        _id: 0,
      })
      .toArray();

    const found = docs.map((d) => d.studentId);
    const missing = requested.filter((id) => !found.includes(id));

    if (found.length === 0) {
      return NextResponse.json({
        ok: true,
        requested,
        found,
        missing,
        blocks: [],
      });
    }

    const busyMasks = docs.map((d) => buildBusyMask(d.courses || []));
    const commonFree = intersectFree(busyMasks);
    const blocks = rankBlocks(findBlocks(commonFree));

    return NextResponse.json({
      ok: true,
      requested,
      found,
      missing,
      blocks,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
