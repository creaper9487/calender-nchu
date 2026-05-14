import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import type { Course, DetailedScheduleData } from "@/lib/schedule-types";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
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

    const body = parsed as { email?: unknown; schedule?: unknown };
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email" },
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
      { email },
      {
        $set: {
          studentName,
          semester,
          courses: schedule.courses,
          timeSlots: schedule.timeSlots,
          updatedAt: now,
        },
        $setOnInsert: {
          email,
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
    const email = (url.searchParams.get("email") || "").trim();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("test");
    const doc = await db.collection("schedules").findOne({ email });
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
