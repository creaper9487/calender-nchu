// 中興夠咪亭 — 課表 / 空檔核心邏輯（純函式，無副作用、可單獨測試）

export const DAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
export const DAYS_SHORT = ['一', '二', '三', '四', '五', '六', '日'];

export interface Period {
  /** 0-based 節次索引 */
  idx: number;
  /** 顯示用節次標籤（第 N 節） */
  label: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

// 興大一週課表的真實節次時間（從 cportal vocscrd_table 第一欄擷取，2026 確認）。
// 注意：中午無午休節（第4節 11:10-12:00 直接跳第5節 13:10-14:00），晚上為 18:20 / 19:15 / 20:10 / 21:05。
export const PERIODS: Period[] = [
  { idx: 0, label: '第1節', start: '08:10', end: '09:00' },
  { idx: 1, label: '第2節', start: '09:10', end: '10:00' },
  { idx: 2, label: '第3節', start: '10:10', end: '11:00' },
  { idx: 3, label: '第4節', start: '11:10', end: '12:00' },
  { idx: 4, label: '第5節', start: '13:10', end: '14:00' },
  { idx: 5, label: '第6節', start: '14:10', end: '15:00' },
  { idx: 6, label: '第7節', start: '15:10', end: '16:00' },
  { idx: 7, label: '第8節', start: '16:10', end: '17:00' },
  { idx: 8, label: '第9節', start: '17:10', end: '18:00' },
  { idx: 9, label: '第10節', start: '18:20', end: '19:10' },
  { idx: 10, label: '第11節', start: '19:15', end: '20:05' },
  { idx: 11, label: '第12節', start: '20:10', end: '21:00' },
  { idx: 12, label: '第13節', start: '21:05', end: '21:55' },
];

export const N_DAYS = 7;
export const N_PERIODS = PERIODS.length; // 13

/** 可用時間網格：grid[day][period] === true 表示「該成員此時段有空（無課）」。 */
export type Grid = boolean[][];

export function emptyGrid(fill = false): Grid {
  return Array.from({ length: N_DAYS }, () => Array(N_PERIODS).fill(fill));
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** 硬交集：所有成員都有空，該時段才算共同空檔。空陣列回傳全 false。 */
export function intersect(grids: Grid[]): Grid {
  if (grids.length === 0) return emptyGrid(false);
  const out = emptyGrid(true);
  for (let d = 0; d < N_DAYS; d++) {
    for (let p = 0; p < N_PERIODS; p++) {
      out[d][p] = grids.every((g) => g[d]?.[p]);
    }
  }
  return out;
}

export interface Block {
  day: number; // 0 = 星期一
  startP: number;
  endP: number;
  startTime: string;
  endTime: string;
  durationMin: number;
  periodCount: number;
}

export interface FindBlocksOptions {
  /** 兩節之間間隔 <= 此分鐘數才視為連續（過濾掉午休等大斷點）。預設 15。 */
  maxGapMin?: number;
  /** 區塊至少要幾節才收。預設 1（一節 = 一個 1 小時單位）。 */
  minPeriods?: number;
}

/**
 * 把共同空檔網格切成連續區塊。
 * 連續定義：下一節開始與本節結束相差 <= maxGapMin（預設 15 分），
 * 因此第1→2節（差 10 分）會合併，第4→5節（午休 70 分）不會合併。
 * 排序：區塊越長越前、其次越早（天 → 起始節）。
 */
export function findBlocks(common: Grid, opts: FindBlocksOptions = {}): Block[] {
  const maxGap = opts.maxGapMin ?? 15;
  const minPeriods = opts.minPeriods ?? 1;
  const blocks: Block[] = [];

  for (let d = 0; d < N_DAYS; d++) {
    let p = 0;
    while (p < N_PERIODS) {
      if (!common[d]?.[p]) {
        p++;
        continue;
      }
      const startP = p;
      while (
        p + 1 < N_PERIODS &&
        common[d][p + 1] &&
        toMinutes(PERIODS[p + 1].start) - toMinutes(PERIODS[p].end) <= maxGap
      ) {
        p++;
      }
      const endP = p;
      const periodCount = endP - startP + 1;
      if (periodCount >= minPeriods) {
        blocks.push({
          day: d,
          startP,
          endP,
          startTime: PERIODS[startP].start,
          endTime: PERIODS[endP].end,
          durationMin: toMinutes(PERIODS[endP].end) - toMinutes(PERIODS[startP].start),
          periodCount,
        });
      }
      p++;
    }
  }

  blocks.sort(
    (a, b) => b.durationMin - a.durationMin || a.day - b.day || a.startP - b.startP,
  );
  return blocks;
}
