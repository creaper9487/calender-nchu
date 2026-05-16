import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isValidGroupCode } from "@/lib/group-code";
import { STUDENT_ID_RE } from "@/lib/student-id";

const MAX_MEMBERS = 20;

interface Params {
  params: Promise<{ code: string }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { code } = await params;
    if (!isValidGroupCode(code)) {
      return NextResponse.json(
        { ok: false, error: "Invalid group code" },
        { status: 400 },
      );
    }
    const body = (await request.json().catch(() => ({}))) as {
      studentId?: unknown;
    };
    const studentId =
      typeof body.studentId === "string" ? body.studentId.trim() : "";
    if (!STUDENT_ID_RE.test(studentId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid studentId" },
        { status: 400 },
      );
    }

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
