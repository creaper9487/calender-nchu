import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  GROUP_TTL_HOURS,
  generateGroupCode,
  newGroupExpiry,
} from "@/lib/group-code";
import { STUDENT_ID_RE } from "@/lib/student-id";

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      studentId?: unknown;
    };
    const creatorId =
      typeof body.studentId === "string" ? body.studentId.trim() : "";
    if (creatorId && !STUDENT_ID_RE.test(creatorId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid studentId" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const now = new Date();
    const expiresAt = newGroupExpiry();

    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const code = generateGroupCode();
      try {
        await db.collection("groups").insertOne({
          code,
          creatorId: creatorId || null,
          members: creatorId ? [creatorId] : [],
          createdAt: now,
          expiresAt,
        });
        return NextResponse.json({
          ok: true,
          code,
          expiresAt: expiresAt.toISOString(),
          ttlHours: GROUP_TTL_HOURS,
        });
      } catch (e) {
        // Likely duplicate key — retry with new code
        lastErr = e;
      }
    }
    console.error("Failed to create group after retries:", lastErr);
    return NextResponse.json(
      { ok: false, error: "Could not allocate group code" },
      { status: 500 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
