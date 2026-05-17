import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blockKey,
  buildGoogleCalendarUrl,
  buildIcs,
  nextDateForDayOfWeek,
} from "./calendar";

describe("nextDateForDayOfWeek", () => {
  it("returns next week's same day if today is the target", () => {
    // 2025-05-19 is a Monday; our dayOfWeek 0 = Monday
    const today = new Date(2025, 4, 19);
    const r = nextDateForDayOfWeek(0, today);
    assert.equal(r, "2025-05-26");
  });

  it("returns next Wednesday from a Monday", () => {
    const today = new Date(2025, 4, 19); // Mon
    const r = nextDateForDayOfWeek(2, today); // our 2 = Wed
    assert.equal(r, "2025-05-21");
  });

  it("returns next Sunday from a Saturday", () => {
    const today = new Date(2025, 4, 24); // Sat
    const r = nextDateForDayOfWeek(6, today); // our 6 = Sun
    assert.equal(r, "2025-05-25");
  });
});

describe("blockKey", () => {
  it("formats day-from-to", () => {
    assert.equal(blockKey(1, 2, 5), "1-2-5");
  });
});

describe("buildGoogleCalendarUrl", () => {
  it("includes title, dates with Taipei timezone, location, details", () => {
    const url = buildGoogleCalendarUrl({
      title: "夠咪亭",
      date: "2025-05-21",
      fromTime: "13:10",
      toTime: "15:00",
      details: "中興夠咪亭",
      location: "圖資 3F",
    });
    assert.ok(url.startsWith("https://calendar.google.com/calendar/render?"));
    const params = new URL(url).searchParams;
    assert.equal(params.get("action"), "TEMPLATE");
    assert.equal(params.get("text"), "夠咪亭");
    assert.equal(params.get("dates"), "20250521T131000/20250521T150000");
    assert.equal(params.get("ctz"), "Asia/Taipei");
    assert.equal(params.get("location"), "圖資 3F");
    assert.equal(params.get("details"), "中興夠咪亭");
  });
});

describe("buildIcs", () => {
  const ics = buildIcs({
    title: "夠咪亭",
    date: "2025-05-21",
    fromTime: "08:10",
    toTime: "09:00",
    details: "test, with comma; and semicolon",
    location: "A1",
    uid: "abc@gomeeting",
  });

  it("uses CRLF line endings", () => {
    assert.ok(ics.includes("\r\n"));
    assert.ok(!ics.includes("\n\n"));
  });

  it("contains VCALENDAR + VEVENT", () => {
    assert.ok(ics.includes("BEGIN:VCALENDAR"));
    assert.ok(ics.includes("END:VCALENDAR"));
    assert.ok(ics.includes("BEGIN:VEVENT"));
    assert.ok(ics.includes("END:VEVENT"));
  });

  it("declares Asia/Taipei VTIMEZONE", () => {
    assert.ok(ics.includes("BEGIN:VTIMEZONE"));
    assert.ok(ics.includes("TZID:Asia/Taipei"));
    assert.ok(ics.includes("TZOFFSETTO:+0800"));
  });

  it("emits DTSTART/DTEND in local Taipei time with TZID", () => {
    assert.ok(ics.includes("DTSTART;TZID=Asia/Taipei:20250521T081000"));
    assert.ok(ics.includes("DTEND;TZID=Asia/Taipei:20250521T090000"));
  });

  it("escapes commas and semicolons in description", () => {
    assert.ok(ics.includes("DESCRIPTION:test\\, with comma\\; and semicolon"));
  });

  it("uses the provided UID", () => {
    assert.ok(ics.includes("UID:abc@gomeeting"));
  });
});
