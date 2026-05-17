import { NextResponse } from "next/server";
import { buildIcs } from "@/lib/calendar";
import { getDb } from "@/lib/db";
import { isValidGroupCode } from "@/lib/group-code";
import { checkRateLimit, clientKey, rateLimitResponse } from "@/lib/rate-limit";
import type { ConfirmedMeeting } from "@/lib/schedule-types";

const RL = { limit: 30, windowMs: 60_000, key: "groups:ics" };

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
    const confirmed = group.confirmed as ConfirmedMeeting | null | undefined;
    if (!confirmed) {
      return NextResponse.json(
        { ok: false, error: "No meeting confirmed yet" },
        { status: 404 },
      );
    }

    const ics = buildIcs({
      title: confirmed.title || "夠咪亭",
      date: confirmed.date,
      fromTime: confirmed.fromTime,
      toTime: confirmed.toTime,
      location: confirmed.location,
      details: `中興夠咪亭 — 群組 ${code}`,
      uid: `${code}-${confirmed.blockKey}-${confirmed.date}@gomeeting`,
    });

    return new Response(ics, {
      status: 200,
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": `attachment; filename="gomeeting-${code}.ics"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
