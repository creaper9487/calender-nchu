import type { Db } from "mongodb";

let indexesEnsured = false;
let dbOverride: Db | null = null;

export async function getDb(): Promise<Db> {
  if (dbOverride) return dbOverride;
  // Dynamic import so tests that inject a fake db never load the real
  // mongodb client module (which would attempt to connect at load time).
  const { default: clientPromise } = await import("./mongodb");
  const client = await clientPromise;
  const db = client.db("test");
  if (!indexesEnsured) {
    indexesEnsured = true;
    try {
      await db
        .collection("schedules")
        .createIndex({ studentId: 1 }, { unique: true });
      await db.collection("groups").createIndex({ code: 1 }, { unique: true });
      await db
        .collection("groups")
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    } catch (e) {
      indexesEnsured = false;
      throw e;
    }
  }
  return db;
}

export function _setDbForTest(db: Db | null): void {
  dbOverride = db;
  indexesEnsured = true;
}
