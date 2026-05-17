// Date/time helpers and calendar URL builders for the confirmed meeting flow.

export interface MeetingDraft {
  title: string;
  date: string; // YYYY-MM-DD (Asia/Taipei local)
  fromTime: string; // "HH:mm"
  toTime: string; // "HH:mm"
  details?: string;
  location?: string;
  uid?: string;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function fmtLocal(date: string, time: string): string {
  const [Y, M, D] = date.split("-");
  const [h, m] = time.split(":");
  return `${Y}${M}${D}T${pad2(Number(h))}${pad2(Number(m))}00`;
}

// dayOfWeek in app: 0=Mon..6=Sun. JS getDay(): 0=Sun..6=Sat.
export function nextDateForDayOfWeek(
  dayOfWeek: number,
  today: Date = new Date(),
): string {
  const jsTarget = (dayOfWeek + 1) % 7;
  const jsToday = today.getDay();
  const daysAhead = (jsTarget - jsToday + 7) % 7 || 7;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  t.setDate(t.getDate() + daysAhead);
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
}

export function buildGoogleCalendarUrl(m: MeetingDraft): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: m.title,
    dates: `${fmtLocal(m.date, m.fromTime)}/${fmtLocal(m.date, m.toTime)}`,
    ctz: "Asia/Taipei",
  });
  if (m.details) params.set("details", m.details);
  if (m.location) params.set("location", m.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function nowUtcStamp(): string {
  const d = new Date();
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

// Asia/Taipei VTIMEZONE block. Taiwan has not observed DST since 1979 — UTC+8 fixed.
const TAIPEI_VTZ = [
  "BEGIN:VTIMEZONE",
  "TZID:Asia/Taipei",
  "X-LIC-LOCATION:Asia/Taipei",
  "BEGIN:STANDARD",
  "DTSTART:19790101T000000",
  "TZOFFSETFROM:+0800",
  "TZOFFSETTO:+0800",
  "TZNAME:CST",
  "END:STANDARD",
  "END:VTIMEZONE",
].join("\r\n");

export function buildIcs(m: MeetingDraft): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//gomeeting//calender-nchu//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    TAIPEI_VTZ,
    "BEGIN:VEVENT",
    `UID:${m.uid || `${Date.now()}@gomeeting`}`,
    `DTSTAMP:${nowUtcStamp()}`,
    `DTSTART;TZID=Asia/Taipei:${fmtLocal(m.date, m.fromTime)}`,
    `DTEND;TZID=Asia/Taipei:${fmtLocal(m.date, m.toTime)}`,
    `SUMMARY:${escapeIcsText(m.title)}`,
  ];
  if (m.details) lines.push(`DESCRIPTION:${escapeIcsText(m.details)}`);
  if (m.location) lines.push(`LOCATION:${escapeIcsText(m.location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function blockKey(
  dayOfWeek: number,
  fromPeriod: number,
  toPeriod: number,
): string {
  return `${dayOfWeek}-${fromPeriod}-${toPeriod}`;
}
