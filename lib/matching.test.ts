import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBusyMask,
  emptyMask,
  findBlocks,
  intersectFree,
  isWeekday,
  rankBlocks,
  scoreBlock,
} from "./matching";
import type { Course, FreeBlock } from "./schedule-types";

function course(day: number, period: number, name = "X"): Course {
  return {
    courseName: name,
    instructor: "",
    room: "",
    courseCode: "",
    dayOfWeek: day,
    timeSlot: "",
    periodIndex: period,
  };
}

describe("emptyMask", () => {
  it("is 7×13 false", () => {
    const m = emptyMask();
    assert.equal(m.length, 7);
    assert.equal(m[0].length, 13);
    assert.equal(
      m.flat().every((v) => v === false),
      true,
    );
  });
});

describe("buildBusyMask", () => {
  it("marks each course cell true", () => {
    const m = buildBusyMask([course(0, 0), course(3, 5)]);
    assert.equal(m[0][0], true);
    assert.equal(m[3][5], true);
    assert.equal(m[0][1], false);
  });

  it("skips out-of-range cells", () => {
    const m = buildBusyMask([course(-1, 0), course(99, 0), course(0, 99)]);
    assert.equal(
      m.flat().every((v) => v === false),
      true,
    );
  });
});

describe("intersectFree", () => {
  it("with no masks returns all-false (no one free)", () => {
    const r = intersectFree([]);
    assert.equal(
      r.flat().every((v) => v === false),
      true,
    );
  });

  it("returns true only where ALL inputs are free", () => {
    const a = buildBusyMask([course(0, 0)]);
    const b = buildBusyMask([course(0, 1)]);
    const f = intersectFree([a, b]);
    assert.equal(f[0][0], false);
    assert.equal(f[0][1], false);
    assert.equal(f[0][2], true);
  });
});

describe("findBlocks", () => {
  it("merges contiguous free cells into one block", () => {
    const m = emptyMask();
    for (let p = 2; p <= 5; p++) m[1][p] = true;
    const blocks = findBlocks(m);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].dayOfWeek, 1);
    assert.equal(blocks[0].fromPeriod, 2);
    assert.equal(blocks[0].toPeriod, 5);
    assert.equal(blocks[0].length, 4);
  });

  it("splits non-contiguous free cells", () => {
    const m = emptyMask();
    m[2][0] = true;
    m[2][2] = true;
    m[2][3] = true;
    const blocks = findBlocks(m).filter((b) => b.dayOfWeek === 2);
    assert.equal(blocks.length, 2);
    assert.deepEqual(
      blocks.map((b) => [b.fromPeriod, b.toPeriod]),
      [
        [0, 0],
        [2, 3],
      ],
    );
  });

  it("emits a block that runs to the last period", () => {
    const m = emptyMask();
    m[0][12] = true;
    const blocks = findBlocks(m);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].toPeriod, 12);
  });
});

describe("scoreBlock + rankBlocks", () => {
  function b(day: number, from: number, to: number): FreeBlock {
    return {
      dayOfWeek: day,
      fromPeriod: from,
      toPeriod: to,
      length: to - from + 1,
      fromTime: "",
      toTime: "",
    };
  }

  it("weekday beats weekend regardless of length", () => {
    const wkdayShort = b(0, 0, 0); // mon, len 1
    const wkendLong = b(5, 0, 12); // sat, len 13
    assert.ok(scoreBlock(wkdayShort) > scoreBlock(wkendLong));
  });

  it("longer wins within the same weekday/weekend class", () => {
    const short = b(2, 0, 0);
    const long = b(2, 0, 3);
    assert.ok(scoreBlock(long) > scoreBlock(short));
  });

  it("ranked output puts all weekday blocks before any weekend block", () => {
    const ranked = rankBlocks([b(5, 0, 12), b(4, 0, 0), b(0, 1, 1)]);
    assert.equal(ranked[0].isWeekday, true);
    assert.equal(ranked[1].isWeekday, true);
    assert.equal(ranked[2].isWeekday, false);
  });

  it("isWeekday flag matches isWeekday()", () => {
    for (let d = 0; d < 7; d++) {
      assert.equal(isWeekday(d), d < 5);
    }
  });
});
