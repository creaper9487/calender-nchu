export const NCHU_TIME_SLOTS = [
  "08:10-09:00",
  "09:10-10:00",
  "10:10-11:00",
  "11:10-12:00",
  "12:10-13:00",
  "13:10-14:00",
  "14:10-15:00",
  "15:10-16:00",
  "16:10-17:00",
  "17:10-18:00",
  "18:10-19:00",
  "19:10-20:00",
  "20:10-21:00",
] as const;

export const PERIODS_PER_DAY = NCHU_TIME_SLOTS.length;
export const DAYS_PER_WEEK = 7;

export function periodStart(periodIndex: number): string {
  return NCHU_TIME_SLOTS[periodIndex].split("-")[0];
}

export function periodEnd(periodIndex: number): string {
  return NCHU_TIME_SLOTS[periodIndex].split("-")[1];
}
