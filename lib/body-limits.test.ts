import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readBoundedJson } from "./body-limits";

function req(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://x", { method: "POST", body, headers });
}

describe("readBoundedJson", () => {
  it("parses small valid JSON", async () => {
    const r = await readBoundedJson<{ a: number }>(req('{"a":1}'), 100);
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value, { a: 1 });
  });

  it("rejects content-length over limit before reading body", async () => {
    const r = await readBoundedJson(
      req("x", { "content-length": "9999" }),
      100,
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.status, 413);
      assert.equal(r.error, "Payload too large");
    }
  });

  it("rejects body over limit when no content-length", async () => {
    const big = "x".repeat(200);
    const r = await readBoundedJson(req(big), 100);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 413);
  });

  it("returns empty object on empty body", async () => {
    const r = await readBoundedJson(req(""), 100);
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value, {});
  });

  it("rejects invalid JSON with 400", async () => {
    const r = await readBoundedJson(req("not json"), 100);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.status, 400);
      assert.equal(r.error, "Invalid JSON");
    }
  });
});
