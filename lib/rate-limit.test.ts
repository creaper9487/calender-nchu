import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { _resetBucketsForTest, checkRateLimit, clientKey } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => _resetBucketsForTest());

  it("allows requests up to the limit", () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) {
      const r = checkRateLimit("k", 5, 60_000, t + i);
      assert.equal(r.ok, true);
      assert.equal(r.remaining, 5 - (i + 1));
    }
  });

  it("rejects the 6th request when limit is 5", () => {
    const t = 2_000_000;
    for (let i = 0; i < 5; i++) checkRateLimit("k", 5, 60_000, t);
    const r = checkRateLimit("k", 5, 60_000, t);
    assert.equal(r.ok, false);
    assert.equal(r.remaining, 0);
    assert.equal(r.resetAt, t + 60_000);
  });

  it("prunes old timestamps after the window", () => {
    const t = 3_000_000;
    for (let i = 0; i < 5; i++) checkRateLimit("k", 5, 60_000, t);
    const later = checkRateLimit("k", 5, 60_000, t + 60_001);
    assert.equal(later.ok, true);
    assert.equal(later.remaining, 4);
  });

  it("isolates keys", () => {
    const t = 4_000_000;
    for (let i = 0; i < 5; i++) checkRateLimit("a", 5, 60_000, t);
    const b = checkRateLimit("b", 5, 60_000, t);
    assert.equal(b.ok, true);
  });
});

describe("clientKey", () => {
  it("uses x-forwarded-for first hop", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    assert.equal(clientKey(req, "r"), "r|1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("http://x", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    assert.equal(clientKey(req, "r"), "r|9.9.9.9");
  });

  it("falls back to unknown", () => {
    const req = new Request("http://x");
    assert.equal(clientKey(req, "r"), "r|unknown");
  });
});
