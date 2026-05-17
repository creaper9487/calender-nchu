import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GROUP_CODE_RE,
  GROUP_TTL_HOURS,
  generateGroupCode,
  isValidGroupCode,
  newGroupExpiry,
} from "./group-code";

describe("generateGroupCode", () => {
  it("produces a 6-char code matching the validator", () => {
    for (let i = 0; i < 100; i++) {
      const c = generateGroupCode();
      assert.equal(c.length, 6);
      assert.ok(GROUP_CODE_RE.test(c), `bad code: ${c}`);
      assert.equal(isValidGroupCode(c), true);
    }
  });

  it("excludes ambiguous characters 0,O,1,I,L", () => {
    for (let i = 0; i < 200; i++) {
      const c = generateGroupCode();
      for (const bad of "0O1IL") {
        assert.ok(!c.includes(bad), `${c} contains ambiguous ${bad}`);
      }
    }
  });

  it("rejects malformed input", () => {
    assert.equal(isValidGroupCode("ABC12"), false); // too short
    assert.equal(isValidGroupCode("ABC1234"), false); // too long
    assert.equal(isValidGroupCode("abc123"), false); // lowercase
    assert.equal(isValidGroupCode("ABC0DE"), false); // contains 0
    assert.equal(isValidGroupCode(""), false);
  });
});

describe("newGroupExpiry", () => {
  it("is approximately TTL hours in the future", () => {
    const before = Date.now();
    const e = newGroupExpiry().getTime();
    const after = Date.now();
    const expectedMin = before + (GROUP_TTL_HOURS - 1) * 3600_000;
    const expectedMax = after + (GROUP_TTL_HOURS + 1) * 3600_000;
    assert.ok(e >= expectedMin && e <= expectedMax);
  });
});
