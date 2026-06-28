// 產生「加到 Google 行事曆」的單次事件連結。

export interface CalEvent {
  title: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  start: string;
  /** "HH:MM" */
  end: string;
  details?: string;
  location?: string;
}

/** 取得「今天起算、下一個指定星期幾」的日期字串 YYYY-MM-DD。dayIdx: 0=星期一 … 6=星期日。 */
export function nextDateForWeekday(dayIdx: number): string {
  const today = new Date();
  const jsTarget = (dayIdx + 1) % 7; // 我們 0=週一 → JS 0=週日
  const diff = (jsTarget - today.getDay() + 7) % 7; // 0 表示就是今天
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Google Calendar 事件時間格式：YYYYMMDDTHHMMSS（本地時間，無時區後綴）。 */
function stamp(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
}

export function googleCalUrl(ev: CalEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${stamp(ev.date, ev.start)}/${stamp(ev.date, ev.end)}`,
  });
  if (ev.details) params.set('details', ev.details);
  if (ev.location) params.set('location', ev.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
