"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type {
  Course,
  DetailedScheduleData,
  ScheduleData,
} from "@/lib/schedule-types";
import { NCHU_TIME_SLOTS } from "@/lib/time-slots";
import ImportButton from "./ImportButton";

interface Props {
  bookmarklet: string;
}

export default function StartupClient({ bookmarklet }: Props) {
  const searchParams = useSearchParams();
  const [copySuccess, setCopySuccess] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const firstKey = searchParams.keys().next().value || "";
  const argument = searchParams.get(firstKey) || null;

  const scheduleParam = searchParams.get("schedule");
  let scheduleData: ScheduleData | null = null;

  if (scheduleParam) {
    try {
      const parsed = JSON.parse(decodeURIComponent(scheduleParam));
      if (Array.isArray(parsed) && parsed.every(Array.isArray)) {
        scheduleData = { legacy: true, data: parsed };
      } else {
        scheduleData = parsed;
      }
    } catch (error) {
      console.error("Failed to parse schedule data:", error);
    }
  }

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.animation = "breathe 3s ease-in-out infinite";
    }
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(bookmarklet);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const renderLegacyScheduleTable = (schedule: boolean[][]) => {
    const dayNames = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
    const timeSlots = NCHU_TIME_SLOTS;

    return (
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">
          課表 Schedule (簡化版)
        </h2>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-4 text-center">
          偵測到舊版書籤格式，請更新書籤腳本以匯入到帳號。
        </p>
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-center">時間</th>
              {dayNames.map((day) => (
                <th
                  key={day}
                  className="border border-gray-300 p-2 text-center"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((time, rowIndex) => (
              <tr key={time}>
                <td className="border border-gray-300 p-2 text-center bg-gray-50 font-medium">
                  {time}
                </td>
                {schedule.map((daySchedule, dayIndex) => (
                  <td
                    key={dayNames[dayIndex]}
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
  };

  const renderDetailedScheduleTable = (data: ScheduleData) => {
    const dayNames = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
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

    const scheduleGrid: (Course | null)[][] = Array(timeSlots.length)
      .fill(null)
      .map(() => Array(7).fill(null));

    courses.forEach((course) => {
      if (course.periodIndex >= 0 && course.periodIndex < timeSlots.length) {
        scheduleGrid[course.periodIndex][course.dayOfWeek] = course;
      }
    });

    const getRandomColor = (courseName: string) => {
      const colors = [
        "bg-blue-100 border-blue-300 text-blue-800",
        "bg-green-100 border-green-300 text-green-800",
        "bg-purple-100 border-purple-300 text-purple-800",
        "bg-yellow-100 border-yellow-300 text-yellow-800",
        "bg-pink-100 border-pink-300 text-pink-800",
        "bg-indigo-100 border-indigo-300 text-indigo-800",
        "bg-red-100 border-red-300 text-red-800",
        "bg-cyan-100 border-cyan-300 text-cyan-800",
      ];
      let hash = 0;
      for (let i = 0; i < courseName.length; i++) {
        hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    return (
      <div>
        {courses.length > 0 && <ImportButton schedule={detailed} />}
        <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {semester}
            </h2>
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
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-center font-semibold">
                  時間
                </th>
                {dayNames.map((day) => (
                  <th
                    key={day}
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
                  <td className="border border-gray-300 p-3 text-center bg-gray-50 font-medium whitespace-nowrap">
                    {timeSlot}
                  </td>
                  {scheduleGrid[rowIndex].map((course, dayIndex) => (
                    <td
                      key={dayNames[dayIndex]}
                      className={`border border-gray-300 p-2 text-center ${
                        course
                          ? `${getRandomColor(course.courseName)} border-2`
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
                    className={`p-3 rounded-md border-2 ${getRandomColor(course.courseName)}`}
                  >
                    <div className="font-semibold">{course.courseName}</div>
                    <div className="text-sm mt-1">
                      <div>教師：{course.instructor}</div>
                      <div>教室：{course.room}</div>
                      <div>
                        時間：{dayNames[course.dayOfWeek]} {course.timeSlot}
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
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div
        className={`${scheduleData ? "max-w-4xl" : "max-w-md"} w-full space-y-8`}
      >
        <div className="text-center">
          <h1
            ref={titleRef}
            className="text-3xl font-extrabold text-gray-900 mb-8"
          >
            {scheduleData ? "課表顯示" : "先到興大SSO登入後，進入以下網址："}
          </h1>

          {scheduleData ? (
            scheduleData.legacy && scheduleData.data ? (
              renderLegacyScheduleTable(scheduleData.data)
            ) : (
              renderDetailedScheduleTable(scheduleData)
            )
          ) : argument ? (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Received Argument:
              </h2>
              <p className="text-xl font-mono bg-gray-100 p-3 rounded border break-all">
                {argument}
              </p>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                把網址加入書籤
              </h2>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={bookmarklet}
                  readOnly
                  className="flex-1 p-2 border border-gray-300 rounded text-sm font-mono bg-gray-50"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className={`px-4 py-2 rounded font-semibold transition-colors ${
                    copySuccess
                      ? "bg-green-500 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  {copySuccess ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-md text-gray-900 mt-2">
                然後前往
                <a
                  href="https://cportal.nchu.edu.tw/cofsys/plsql/vocscrd_table"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-700 mx-2 underline"
                >
                  這裡
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
