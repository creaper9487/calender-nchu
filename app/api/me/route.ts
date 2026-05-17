import { NextResponse } from "next/server";
import { checkRateLimit, clientKey, rateLimitResponse } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";

const RL = { limit: 60, windowMs: 60_000, key: "me:GET" };

export async function GET(request: Request) {
  const rl = checkRateLimit(clientKey(request, RL.key), RL.limit, RL.windowMs);
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ ok: true, studentId: null });
    }
    return NextResponse.json({ ok: true, studentId: session.studentId });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
