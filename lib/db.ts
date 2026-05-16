import type { Db } from "mongodb";
import clientPromise from "./mongodb";

let indexesEnsured = false;

export async function getDb(): Promise<Db> {
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
