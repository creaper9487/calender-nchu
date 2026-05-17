"use client";

import { useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import type {
  Course,
  DetailedScheduleData,
  ScheduleData,
} from "@/lib/schedule-types";
import { DAY_NAMES_ZH, NCHU_TIME_SLOTS } from "@/lib/time-slots";
import ImportButton from "./ImportButton";

interface Props {
  bookmarklet: string;
}

const COURSE_COLORS = [
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-green-100 border-green-300 text-green-800",
  "bg-purple-100 border-purple-300 text-purple-800",
  "bg-yellow-100 border-yellow-300 text-yellow-800",
  "bg-pink-100 border-pink-300 text-pink-800",
  "bg-indigo-100 border-indigo-300 text-indigo-800",
  "bg-red-100 border-red-300 text-red-800",
  "bg-cyan-100 border-cyan-300 text-cyan-800",
];

function colorFor(courseName: string): string {
  let hash = 0;
  for (let i = 0; i < courseName.length; i++) {
    hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
}

function parseScheduleParam(raw: string | null): ScheduleData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (Array.isArray(parsed) && parsed.every(Array.isArray)) {
      return { legacy: true, data: parsed };
    }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.courses)) {
      return parsed;
    }
    return null;
  } catch (e) {
    console.error("Failed to parse schedule data:", e);
    return null;
  }
}

export default function StartupClient({ bookmarklet }: Props) {
  const searchParams = useSearchParams();
  const inputId = useId();
  const [copySuccess, setCopySuccess] = useState(false);

  const scheduleData = useMemo(
    () => parseScheduleParam(searchParams.get("schedule")),
    [searchParams],
  );

  const copyToClipboard = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopySuccess(false);
      return;
    }
    try {
      await navigator.clipboard.writeText(bookmarklet);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      window.prompt("複製失敗，請手動複製：", bookmarklet);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div
        className={`${scheduleData ? "max-w-4xl" : "max-w-md"} w-full space-y-8`}
      >
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-8">
            {scheduleData ? "課表顯示" : "把書籤加入瀏覽器，再到興大課表頁執行"}
          </h1>

          {scheduleData ? (
            scheduleData.legacy && scheduleData.data ? (
              <LegacyScheduleTable schedule={scheduleData.data} />
            ) : (
              <DetailedScheduleTable data={scheduleData} />
            )
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md space-y-4 text-left">
              <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                <li>
                  把下面這段 <strong>整段</strong>{" "}
                  拖到書籤列，或顯示書籤列後新增書籤、把網址貼進去
                </li>
                <li>
                  登入{" "}
                  <a
                    href="https://cportal.nchu.edu.tw/cofsys/plsql/vocscrd_table"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-700 underline"
                  >
                    興大課表頁
                  </a>
                </li>
                <li>點剛剛存的書籤 → 自動回到本站</li>
              </ol>
              <div className="flex items-center space-x-2">
                <label htmlFor={inputId} className="sr-only">
                  書籤腳本
                </label>
                <input
                  id={inputId}
                  type="text"
                  value={bookmarklet}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 p-2 border border-gray-300 rounded text-sm font-mono bg-gray-50"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className={`px-4 py-2 rounded font-semibold transition-colors ${
                    copySuccess
                      ? "bg-green-500 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {copySuccess ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                ⚠️ 不要把書籤腳本貼到瀏覽器網址列 —
                現代瀏覽器會擋掉。要存成書籤。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LegacyScheduleTable({ schedule }: { schedule: boolean[][] }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
      <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">
        課表 (簡化版)
      </h2>
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-4 text-center">
        偵測到舊版書籤格式，請更新書籤腳本以匯入到帳號。
      </p>
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <caption className="sr-only">每週各時段是否有課</caption>
        <thead>
          <tr className="bg-gray-100">
            <th scope="col" className="border border-gray-300 p-2 text-center">
              時間
            </th>
            {DAY_NAMES_ZH.map((day) => (
              <th
                key={day}
                scope="col"
                className="border border-gray-300 p-2 text-center"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {NCHU_TIME_SLOTS.map((time, rowIndex) => (
            <tr key={time}>
              <th
                scope="row"
                className="border border-gray-300 p-2 text-center bg-gray-50 font-medium"
              >
                {time}
              </th>
              {schedule.map((daySchedule, dayIndex) => (
                <td
                  key={DAY_NAMES_ZH[dayIndex]}
                  className={`border border-gray-300 p-2 text-center ${
                    daySchedule[rowIndex]
                      ? "bg-blue-100 text-blue-800 font-semibold"
                      : "bg-white"
                  }`}
                >
                  {daySchedule[rowIndex] ? "有課" : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailedScheduleTable({ data }: { data: ScheduleData }) {
  const {
    semester = "",
    studentId = "",
    studentName = "",
    courses = [],
    timeSlots = [],
  } = data;

  const detailed: DetailedScheduleData = {
    semester,
    studentId,
    studentName,
    courses,
    timeSlots,
  };

  const scheduleGrid: (Course | null)[][] = useMemo(() => {
    const grid: (Course | null)[][] = Array(timeSlots.length)
      .fill(null)
      .map(() => Array(7).fill(null));
    courses.forEach((course) => {
      if (course.periodIndex >= 0 && course.periodIndex < timeSlots.length) {
        grid[course.periodIndex][course.dayOfWeek] = course;
      }
    });
    return grid;
  }, [courses, timeSlots.length]);

  return (
    <div>
      {courses.length > 0 && <ImportButton schedule={detailed} />}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{semester}</h2>
          <h3 className="text-lg font-semibold text-gray-600">
            {studentName || studentId} 的課表
            {studentId && studentName && (
              <span className="text-sm text-gray-400 ml-2 font-mono">
                ({studentId})
              </span>
            )}
          </h3>
        </div>

        <table className="w-full border-collapse border border-gray-300 text-sm">
          <caption className="sr-only">每週各時段的課程</caption>
          <thead>
            <tr className="bg-gray-100">
              <th
                scope="col"
                className="border border-gray-300 p-3 text-center font-semibold"
              >
                時間
              </th>
              {DAY_NAMES_ZH.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className="border border-gray-300 p-3 text-center font-semibold min-w-[120px]"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((timeSlot, rowIndex) => (
              <tr key={timeSlot}>
                <th
                  scope="row"
                  className="border border-gray-300 p-3 text-center bg-gray-50 font-medium whitespace-nowrap"
                >
                  {timeSlot}
                </th>
                {scheduleGrid[rowIndex].map((course, dayIndex) => (
                  <td
                    key={DAY_NAMES_ZH[dayIndex]}
                    className={`border border-gray-300 p-2 text-center ${
                      course
                        ? `${colorFor(course.courseName)} border-2`
                        : "bg-white"
                    }`}
                  >
                    {course ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-xs leading-tight">
                          {course.courseName}
                        </div>
                        <div className="text-xs opacity-80">
                          {course.instructor}
                        </div>
                        <div className="text-xs font-mono">
                          {course.room !== "Unknown" && course.room !== "*"
                            ? course.room
                            : ""}
                        </div>
                      </div>
                    ) : (
                      <div className="h-12" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {courses.length > 0 && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">
              課程清單
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {courses.map((course) => (
                <div
                  key={`${course.courseCode}-${course.dayOfWeek}-${course.periodIndex}`}
                  className={`p-3 rounded-md border-2 ${colorFor(course.courseName)}`}
                >
                  <div className="font-semibold">{course.courseName}</div>
                  <div className="text-sm mt-1">
                    <div>教師：{course.instructor}</div>
                    <div>教室：{course.room}</div>
                    <div>
                      時間：{DAY_NAMES_ZH[course.dayOfWeek]} {course.timeSlot}
                    </div>
                    {course.courseCode && (
                      <div className="text-xs mt-1 font-mono">
                        代碼：{course.courseCode}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
