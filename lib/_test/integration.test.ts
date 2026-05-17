import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { Db } from "mongodb";
import { POST as JOIN } from "../../app/api/groups/[code]/join/route";
import { POST as GROUPS_POST } from "../../app/api/groups/route";
import { POST as MATCH } from "../../app/api/match/route";
import { GET as ME } from "../../app/api/me/route";
import { DELETE, POST } from "../../app/api/schedules/route";
import { _setKeyForTest } from "../claim-token";
import { _setDbForTest } from "../db";
import { _resetBucketsForTest } from "../rate-limit";
import { FakeDb } from "./fake-db";

const VALID_SCHEDULE = {
  semester: "114-1",
  studentId: "",
  studentName: "Test",
  timeSlots: ["08:10-09:00"],
  courses: [
    {
      courseName: "CS",
      instructor: "T",
      room: "A1",
      courseCode: "CS101",
      dayOfWeek: 0,
      timeSlot: "08:10-09:00",
      periodIndex: 0,
    },
  ],
};

function makeReq(
  url: string,
  init: { method?: string; body?: unknown; cookie?: string } = {},
): Request {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (init.cookie) headers.cookie = init.cookie;
  return new Request(`http://localhost:3000${url}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? null : JSON.stringify(init.body),
  });
}

function getSetCookie(res: Response): string | null {
  return res.headers.get("set-cookie");
}

function nameValueOnly(setCookie: string): string {
  // "name=value; Path=/; HttpOnly; ..." → "name=value"
  return setCookie.split(";")[0];
}

let db: FakeDb;

beforeEach(() => {
  db = new FakeDb();
  _setDbForTest(db as unknown as Db);
  _setKeyForTest("integration-test-secret-1234567890");
  _resetBucketsForTest();
});

afterEach(() => {
  _setDbForTest(null);
});

describe("Claim token flow on /api/schedules", () => {
  it("first POST issues a Set-Cookie and stores claimHash", async () => {
    const res = await POST(
      makeReq("/api/schedules", {
        method: "POST",
        body: { studentId: "s1234567", schedule: VALID_SCHEDULE },
      }),
    );
    assert.equal(res.status, 200);
    const setCookie = getSetCookie(res);
    assert.ok(setCookie, "expected set-cookie");
    assert.ok(setCookie.includes("gomeeting_session="));
    assert.ok(setCookie.includes("HttpOnly"));

    const doc = await db
      .collection("schedules")
      .findOne({ studentId: "s1234567" });
    assert.ok(doc);
    assert.equal(typeof doc.claimHash, "string");
  });

  it("second POST without cookie is rejected with claim_required", async () => {
    await POST(
      makeReq("/api/schedules", {
        method: "POST",
        body: { studentId: "s1234567", schedule: VALID_SCHEDULE },
      }),
    );
    const res = await POST(
      makeReq("/api/schedules", {
        method: "POST",
        body: { studentId: "s1234567", schedule: VALID_SCHEDULE },
      }),
    );
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.code, "claim_required");
  });

  it("second POST with valid cookie succeeds", async () => {
    const first = await POST(
      makeReq("/api/schedules", {
        method: "POST",
        body: { studentId: "s1234567", schedule: VALID_SCHEDULE },
      }),
    );
    const cookie = nameValueOnly(getSetCookie(first) ?? "");
    const res = await POST(
      makeReq("/api/schedules", {
        method: "POST",
        cookie,
        body: { studentId: "s1234567", schedule: VALID_SCHEDULE },
      }),
    );
    assert.equal(res.status, 200);
  });

  it("second POST with cookie for a different studentId is rejected", async () => {
    const first = await POST(
      makeReq("/api/schedules", {
        method: "POST",
        body: { studentId: "alice123", schedule: VALID_SCHEDULE },
      }),
    );
    const aliceCookie = nameValueOnly(getSetCookie(first) ?? "");
    await POST(
      makeReq("/api/schedules", {
        method: "POST",
        body: { studentId: "bob12345", schedule: VALID_SCHEDULE },
      }),
    );
    const res = await POST(
      makeReq("/api/schedules", {
        method: "POST",
        cookie: aliceCookie,
        body: { studentId: "bob12345", schedule: VALID_SCHEDULE },
      }),
    );
    assert.equal(res.status, 401);
  });

  it("tampered cookie token fails verification", async () => {
    const first = await POST(
      makeReq("/api/schedules", {
        method: "POST",
        body: { studentId: "s1234567", schedule: VALID_SCHEDULE },
      }),
    );
    const cookie = nameValueOnly(getSetCookie(first) ?? "");
    const bad = `${cookie.slice(0, -2)}XX`;
    const res = await POST(
      makeReq("/api/schedules", {
        method: "POST",
        cookie: bad,
        body: { studentId: "s1234567", schedule: VALID_SCHEDULE },
      }),
    );
    assert.equal(res.status, 401);
  });
});

describe("/api/me", () => {
  it("returns null studentId without cookie", async () => {
    const res = await ME(makeReq("/api/me"));
    const body = await res.json();
    assert.equal(body.studentId, null);
  });

  it("returns studentId with valid cookie", async () => {
    const first = await POST(
      makeReq("/api/schedules", {
        method: "POST",
        body: { studentId: "s1234567", schedule: VALID_SCHEDULE },
      }),
    );
    const cookie = nameValueOnly(getSetCookie(first) ?? "");
    const res = await ME(makeReq("/api/me", { cookie }));
    const body = await res.json();
    assert.equal(body.studentId, "s1234567");
  });
});

describe("DELETE /api/schedules", () => {
  it("requires authentication", async () => {
    const res = await DELETE(makeReq("/api/schedules", { method: "DELETE" }));
    assert.equal(res.status, 401);
  });

  it("deletes own schedule and clears cookie", async () => {
    const first = await POST(
      makeReq("/api/schedules", {
        method: "POST",
        body: { studentId: "s1234567", schedule: VALID_SCHEDULE },
      }),
    );
    const cookie = nameValueOnly(getSetCookie(first) ?? "");
    const res = await DELETE(
      makeReq("/api/schedules", { method: "DELETE", cookie }),
    );
    assert.equal(res.status, 200);
    const setCookie = getSetCookie(res);
    assert.ok(setCookie?.includes("Max-Age=0"));

    const doc = await db
      .collection("schedules")
      .findOne({ studentId: "s1234567" });
    assert.equal(doc, null);
  });
});

describe("/api/match auth", () => {
  it("rejects unauthenticated request with auth_required", async () => {
    const res = await MATCH(
      makeReq("/api/match", {
        method: "POST",
        body: { studentIds: ["s1234567", "s7654321"], me: "s1234567" },
      }),
    );
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.code, "auth_required");
  });

  it("rejects when me does not match session", async () => {
    const first = await POST(
      makeReq("/api/schedules", {
        method: "POST",
        body: { studentId: "s1234567", schedule: VALID_SCHEDULE },
      }),
    );
    const cookie = nameValueOnly(getSetCookie(first) ?? "");
    const res = await MATCH(
      makeReq("/api/match", {
        method: "POST",
        cookie,
        body: { studentIds: ["other123"], me: "other123" },
      }),
    );
    assert.equal(res.status, 403);
  });

  it("rejects when me is not in studentIds", async () => {
    const first = await POST(
      makeReq("/api/schedules", {
        method: "POST",
        body: { studentId: "s1234567", schedule: VALID_SCHEDULE },
      }),
    );
    const cookie = nameValueOnly(getSetCookie(first) ?? "");
    const res = await MATCH(
      makeReq("/api/match", {
        method: "POST",
        cookie,
        body: { studentIds: ["other123"], me: "s1234567" },
      }),
    );
    assert.equal(res.status, 403);
  });

  it("succeeds with valid session and self in studentIds", async () => {
    const first = await POST(
      makeReq("/api/schedules", {
        method: "POST",
        body: { studentId: "s1234567", schedule: VALID_SCHEDULE },
      }),
    );
    const cookie = nameValueOnly(getSetCookie(first) ?? "");
    const res = await MATCH(
      makeReq("/api/match", {
        method: "POST",
        cookie,
        body: { studentIds: ["s1234567", "absent123"], me: "s1234567" },
      }),
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.found, ["s1234567"]);
    assert.deepEqual(body.missing, ["absent123"]);
  });
});

describe("Group join: cookie overrides body studentId", () => {
  async function makeUser(id: string): Promise<string> {
    const r = await POST(
      makeReq("/api/schedules", {
        method: "POST",
        body: { studentId: id, schedule: VALID_SCHEDULE },
      }),
    );
    return nameValueOnly(getSetCookie(r) ?? "");
  }

  it("rejects unauthenticated join", async () => {
    // create a group anonymously
    const created = await GROUPS_POST(
      makeReq("/api/groups", { method: "POST", body: {} }),
    );
    const { code } = await created.json();

    const res = await JOIN(
      makeReq(`/api/groups/${code}/join`, {
        method: "POST",
        body: { studentId: "evil123" },
      }),
      { params: Promise.resolve({ code }) },
    );
    assert.equal(res.status, 401);
  });

  it("uses session.studentId, not body.studentId, when joining", async () => {
    const aliceCookie = await makeUser("alice123");
    const created = await GROUPS_POST(
      makeReq("/api/groups", { method: "POST", body: {}, cookie: aliceCookie }),
    );
    const { code } = await created.json();

    // Alice attempts to maliciously add bob via body.studentId
    const res = await JOIN(
      makeReq(`/api/groups/${code}/join`, {
        method: "POST",
        cookie: aliceCookie,
        body: { studentId: "bob12345" },
      }),
      { params: Promise.resolve({ code }) },
    );
    assert.equal(res.status, 200);

    const group = await db.collection("groups").findOne({ code });
    const members = group?.members as string[];
    assert.deepEqual(members, ["alice123"]);
    assert.ok(!members.includes("bob12345"));
  });
});

describe("Body size cap", () => {
  it("rejects oversized POST /api/schedules with 413", async () => {
    const huge = "X".repeat(200 * 1024);
    const res = await POST(
      makeReq("/api/schedules", {
        method: "POST",
        body: { studentId: "s1234567", schedule: VALID_SCHEDULE, pad: huge },
      }),
    );
    assert.equal(res.status, 413);
  });
});

describe("GET /api/schedules in production", () => {
  it("returns 404 when NODE_ENV=production", async () => {
    const env = process.env as Record<string, string | undefined>;
    const original = env.NODE_ENV;
    env.NODE_ENV = "production";
    try {
      const { GET } = await import("../../app/api/schedules/route");
      const res = await GET(makeReq("/api/schedules?studentId=s1234567"));
      assert.equal(res.status, 404);
    } finally {
      if (original === undefined) {
        delete env.NODE_ENV;
      } else {
        env.NODE_ENV = original;
      }
    }
  });
});
