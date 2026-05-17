import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSessionCookie,
  COOKIE_NAME,
  clearSessionCookie,
  parseSessionCookie,
} from "./session-cookie";

function reqWithCookie(value: string): Request {
  return new Request("http://x", { headers: { cookie: value } });
}

describe("parseSessionCookie", () => {
  it("returns null when no cookie header", () => {
    assert.equal(parseSessionCookie(new Request("http://x")), null);
  });

  it("returns null when cookie name absent", () => {
    assert.equal(parseSessionCookie(reqWithCookie("other=v")), null);
  });

  it("parses studentId.token", () => {
    const cookie = `${COOKIE_NAME}=${encodeURIComponent("s1234567.abc.def")}`;
    const r = parseSessionCookie(reqWithCookie(cookie));
    assert.deepEqual(r, { studentId: "s1234567", token: "abc.def" });
  });

  it("ignores leading whitespace and other cookies", () => {
    const r = parseSessionCookie(
      reqWithCookie(`a=1; ${COOKIE_NAME}=s1.tok; b=2`),
    );
    assert.deepEqual(r, { studentId: "s1", token: "tok" });
  });

  it("rejects malformed (no dot)", () => {
    assert.equal(
      parseSessionCookie(reqWithCookie(`${COOKIE_NAME}=nodot`)),
      null,
    );
  });

  it("rejects malformed (leading dot)", () => {
    assert.equal(
      parseSessionCookie(reqWithCookie(`${COOKIE_NAME}=.token`)),
      null,
    );
  });

  it("rejects malformed (trailing dot)", () => {
    assert.equal(
      parseSessionCookie(reqWithCookie(`${COOKIE_NAME}=sid.`)),
      null,
    );
  });
});

describe("buildSessionCookie", () => {
  it("includes HttpOnly, SameSite=Lax, Path=/, Max-Age", () => {
    const c = buildSessionCookie("s1", "tok");
    assert.ok(c.includes("HttpOnly"));
    assert.ok(c.includes("SameSite=Lax"));
    assert.ok(c.includes("Path=/"));
    assert.ok(c.includes("Max-Age="));
  });

  it("round-trips through parseSessionCookie", () => {
    const raw = buildSessionCookie("s1234567", "abc.def");
    // simulate browser sending back just the name=value
    const nameValue = raw.split(";")[0];
    const parsed = parseSessionCookie(reqWithCookie(nameValue));
    assert.deepEqual(parsed, { studentId: "s1234567", token: "abc.def" });
  });
});

describe("clearSessionCookie", () => {
  it("uses Max-Age=0", () => {
    assert.ok(clearSessionCookie().includes("Max-Age=0"));
  });
});
