import { NextResponse } from "next/server";
import { BODY_LIMITS, readBoundedJson } from "@/lib/body-limits";
import { generateClaimToken, hashClaim } from "@/lib/claim-token";
import { getDb } from "@/lib/db";
import { checkRateLimit, clientKey, rateLimitResponse } from "@/lib/rate-limit";
import type { Course, DetailedScheduleData } from "@/lib/schedule-types";
import { getSession } from "@/lib/session";
import { buildSessionCookie, clearSessionCookie } from "@/lib/session-cookie";
import { STUDENT_ID_RE } from "@/lib/student-id";

const RL_POST = { limit: 10, windowMs: 60_000, key: "schedules:POST" };
const RL_GET = { limit: 30, windowMs: 60_000, key: "schedules:GET" };
const RL_DELETE = { limit: 5, windowMs: 60_000, key: "schedules:DELETE" };

function isCourse(value: unknown): value is Course {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.courseName === "string" &&
    typeof c.instructor === "string" &&
    typeof c.room === "string" &&
    typeof c.courseCode === "string" &&
    typeof c.dayOfWeek === "number" &&
    typeof c.timeSlot === "string" &&
    typeof c.periodIndex === "number"
  );
}

export async function POST(request: Request) {
  const rl = checkRateLimit(
    clientKey(request, RL_POST.key),
    RL_POST.limit,
    RL_POST.windowMs,
  );
  if (!rl.ok) return rateLimitResponse(rl);

  const parsedBody = await readBoundedJson<{
    studentId?: unknown;
    schedule?: unknown;
  }>(request, BODY_LIMITS.schedules);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { ok: false, error: parsedBody.error },
      { status: parsedBody.status },
    );
  }
  const body = parsedBody.value;
  const studentId =
    typeof body.studentId === "string" ? body.studentId.trim() : "";
  if (!STUDENT_ID_RE.test(studentId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid studentId" },
      { status: 400 },
    );
  }
  if (!body.schedule || typeof body.schedule !== "object") {
    return NextResponse.json(
      { ok: false, error: "Missing schedule" },
      { status: 400 },
    );
  }
  const schedule = body.schedule as Partial<DetailedScheduleData>;
  if (!Array.isArray(schedule.courses) || !schedule.courses.every(isCourse)) {
    return NextResponse.json(
      { ok: false, error: "Invalid courses" },
      { status: 400 },
    );
  }
  if (
    !Array.isArray(schedule.timeSlots) ||
    !schedule.timeSlots.every((s) => typeof s === "string")
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid timeSlots" },
      { status: 400 },
    );
  }

  try {
    const db = await getDb();
    const existing = await db
      .collection("schedules")
      .findOne({ studentId }, { projection: { claimHash: 1 } });

    let cookieToSet: string | null = null;
    if (existing && typeof existing.claimHash === "string") {
      const session = await getSession(request);
      if (!session || session.studentId !== studentId) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "This studentId is already claimed. Use the same device/browser as the original import, or contact admin.",
            code: "claim_required",
          },
          { status: 401 },
        );
      }
    } else {
      const token = generateClaimToken();
      const claimHash = hashClaim(studentId, token);
      cookieToSet = buildSessionCookie(studentId, token);
      // Persist hash now so the upsert below carries it via $set
      schedule.studentId = studentId;
      (schedule as Record<string, unknown>).claimHash = claimHash;
    }

    const studentName =
      typeof schedule.studentName === "string" ? schedule.studentName : "";
    const semester =
      typeof schedule.semester === "string" ? schedule.semester : "";
    const now = new Date();

    const setFields: Record<string, unknown> = {
      studentName,
      semester,
      courses: schedule.courses,
      timeSlots: schedule.timeSlots,
      updatedAt: now,
    };
    if (cookieToSet) {
      // newly claimed: store claimHash
      setFields.claimHash = (schedule as Record<string, unknown>).claimHash;
    }

    const result = await db.collection("schedules").updateOne(
      { studentId },
      {
        $set: setFields,
        $setOnInsert: { studentId, createdAt: now },
      },
      { upsert: true },
    );

    const response = NextResponse.json({
      ok: true,
      upserted: result.upsertedCount > 0,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
    if (cookieToSet) {
      response.headers.set("set-cookie", cookieToSet);
    }
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "Not found" },
      { status: 404 },
    );
  }
  const rl = checkRateLimit(
    clientKey(request, RL_GET.key),
    RL_GET.limit,
    RL_GET.windowMs,
  );
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    const url = new URL(request.url);
    const studentId = (url.searchParams.get("studentId") || "").trim();
    if (!STUDENT_ID_RE.test(studentId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid studentId" },
        { status: 400 },
      );
    }
    const db = await getDb();
    const doc = await db
      .collection("schedules")
      .findOne({ studentId }, { projection: { claimHash: 0 } });
    if (!doc) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(doc);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const rl = checkRateLimit(
    clientKey(request, RL_DELETE.key),
    RL_DELETE.limit,
    RL_DELETE.windowMs,
  );
  if (!rl.ok) return rateLimitResponse(rl);

  const session = await getSession(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthenticated" },
      { status: 401 },
    );
  }

  try {
    const db = await getDb();
    const result = await db
      .collection("schedules")
      .deleteOne({ studentId: session.studentId });
    const response = NextResponse.json({
      ok: true,
      deleted: result.deletedCount,
    });
    response.headers.set("set-cookie", clearSessionCookie());
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
