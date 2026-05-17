import { verifyClaim } from "./claim-token";
import { getDb } from "./db";
import { parseSessionCookie } from "./session-cookie";

export interface Session {
  studentId: string;
}

export async function getSession(request: Request): Promise<Session | null> {
  const parsed = parseSessionCookie(request);
  if (!parsed) return null;
  const db = await getDb();
  const doc = await db
    .collection("schedules")
    .findOne({ studentId: parsed.studentId }, { projection: { claimHash: 1 } });
  const expected =
    doc && typeof doc.claimHash === "string" ? doc.claimHash : null;
  if (!expected) return null;
  if (!verifyClaim(parsed.studentId, parsed.token, expected)) return null;
  return { studentId: parsed.studentId };
}
