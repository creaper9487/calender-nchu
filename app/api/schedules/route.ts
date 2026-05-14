import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import type { Course, DetailedScheduleData } from "@/lib/schedule-types";

const STUDENT_ID_RE = /^[A-Za-z0-9]{4,12}$/;
const MAX_BODY_BYTES = 100 * 1024;

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
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Payload too large" },
        { status: 413 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON" },
        { status: 400 },
      );
    }

    const body = parsed as { studentId?: unknown; schedule?: unknown };
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

    const studentName =
      typeof schedule.studentName === "string" ? schedule.studentName : "";
    const semester =
      typeof schedule.semester === "string" ? schedule.semester : "";

    const client = await clientPromise;
    const db = client.db("test");
    const now = new Date();

    const result = await db.collection("schedules").updateOne(
      { studentId },
      {
        $set: {
          studentName,
          semester,
          courses: schedule.courses,
          timeSlots: schedule.timeSlots,
          updatedAt: now,
        },
        $setOnInsert: {
          studentId,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({
      ok: true,
      upserted: result.upsertedCount > 0,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const studentId = (url.searchParams.get("studentId") || "").trim();
    if (!STUDENT_ID_RE.test(studentId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid studentId" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("test");
    const doc = await db.collection("schedules").findOne({ studentId });
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
