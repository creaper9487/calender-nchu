import { NextResponse } from "next/server";
import {
  buildBusyMask,
  findBlocks,
  intersectFree,
  rankBlocks,
} from "@/lib/matching";
import clientPromise from "@/lib/mongodb";
import type { Course } from "@/lib/schedule-types";

const STUDENT_ID_RE = /^[A-Za-z0-9]{4,12}$/;
const MAX_STUDENTS = 20;
const MAX_BODY_BYTES = 16 * 1024;

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

    const body = parsed as { studentIds?: unknown };
    if (!Array.isArray(body.studentIds)) {
      return NextResponse.json(
        { ok: false, error: "studentIds must be an array" },
        { status: 400 },
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

    const client = await clientPromise;
    const db = client.db("test");
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
