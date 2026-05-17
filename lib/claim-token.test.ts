import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import {
  _setKeyForTest,
  generateClaimToken,
  hashClaim,
  verifyClaim,
} from "./claim-token";

describe("claim-token", () => {
  before(() => _setKeyForTest("a-fixed-test-secret-of-sufficient-length"));

  it("round-trips: token → hash → verify", () => {
    const sid = "s1234567";
    const token = generateClaimToken();
    const hash = hashClaim(sid, token);
    assert.equal(verifyClaim(sid, token, hash), true);
  });

  it("rejects a modified token", () => {
    const sid = "s1234567";
    const token = generateClaimToken();
    const hash = hashClaim(sid, token);
    const tampered = `${token.slice(0, -1)}A`;
    assert.equal(verifyClaim(sid, tampered, hash), false);
  });

  it("rejects a different studentId", () => {
    const token = generateClaimToken();
    const hash = hashClaim("s1234567", token);
    assert.equal(verifyClaim("s7654321", token, hash), false);
  });

  it("rejects a different secret", () => {
    const token = generateClaimToken();
    const hash = hashClaim("s1234567", token);
    _setKeyForTest("a-different-test-secret-of-equal-length");
    assert.equal(verifyClaim("s1234567", token, hash), false);
    _setKeyForTest("a-fixed-test-secret-of-sufficient-length");
  });

  it("rejects empty inputs", () => {
    assert.equal(verifyClaim("", "x", "y"), false);
    assert.equal(verifyClaim("x", "", "y"), false);
    assert.equal(verifyClaim("x", "y", ""), false);
  });

  it("rejects malformed hex hash", () => {
    const sid = "s1234567";
    const token = generateClaimToken();
    assert.equal(verifyClaim(sid, token, "not-hex-at-all"), false);
  });

  it("generated tokens are unique", () => {
    const seen = new Set();
    for (let i = 0; i < 100; i++) seen.add(generateClaimToken());
    assert.equal(seen.size, 100);
  });
});
