import type { Course, FreeBlock, RankedBlock } from "./schedule-types";
import {
  DAYS_PER_WEEK,
  NCHU_TIME_SLOTS,
  PERIODS_PER_DAY,
  periodEnd,
  periodStart,
} from "./time-slots";

export type Mask = boolean[][];

export function emptyMask(): Mask {
  return Array.from({ length: DAYS_PER_WEEK }, () =>
    new Array(PERIODS_PER_DAY).fill(false),
  );
}

export function buildBusyMask(courses: Course[]): Mask {
  const mask = emptyMask();
  for (const course of courses) {
    if (
      course.dayOfWeek >= 0 &&
      course.dayOfWeek < DAYS_PER_WEEK &&
      course.periodIndex >= 0 &&
      course.periodIndex < PERIODS_PER_DAY
    ) {
      mask[course.dayOfWeek][course.periodIndex] = true;
    }
  }
  return mask;
}

export function intersectFree(busyMasks: Mask[]): Mask {
  const common = emptyMask();
  if (busyMasks.length === 0) return common;
  for (let day = 0; day < DAYS_PER_WEEK; day++) {
    for (let p = 0; p < PERIODS_PER_DAY; p++) {
      common[day][p] = busyMasks.every((m) => !m[day][p]);
    }
  }
  return common;
}

export function findBlocks(commonFree: Mask): FreeBlock[] {
  const blocks: FreeBlock[] = [];
  for (let day = 0; day < DAYS_PER_WEEK; day++) {
    let runStart = -1;
    for (let p = 0; p < PERIODS_PER_DAY; p++) {
      if (commonFree[day][p]) {
        if (runStart === -1) runStart = p;
      } else if (runStart !== -1) {
        pushBlock(blocks, day, runStart, p - 1);
        runStart = -1;
      }
    }
    if (runStart !== -1) {
      pushBlock(blocks, day, runStart, PERIODS_PER_DAY - 1);
    }
  }
  return blocks;
}

function pushBlock(
  blocks: FreeBlock[],
  day: number,
  from: number,
  to: number,
): void {
  blocks.push({
    dayOfWeek: day,
    fromPeriod: from,
    toPeriod: to,
    length: to - from + 1,
    fromTime: periodStart(from),
    toTime: periodEnd(to),
  });
}

const WEEKDAY_BONUS = PERIODS_PER_DAY + 1;

export function isWeekday(dayOfWeek: number): boolean {
  return dayOfWeek >= 0 && dayOfWeek < 5;
}

export function scoreBlock(block: FreeBlock): number {
  return block.length + (isWeekday(block.dayOfWeek) ? WEEKDAY_BONUS : 0);
}

export function rankBlocks(blocks: FreeBlock[]): RankedBlock[] {
  return blocks
    .map((b) => ({
      ...b,
      score: scoreBlock(b),
      isWeekday: isWeekday(b.dayOfWeek),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.dayOfWeek - b.dayOfWeek ||
        a.fromPeriod - b.fromPeriod,
    );
}

export { NCHU_TIME_SLOTS };
