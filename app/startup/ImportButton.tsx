"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import type { DetailedScheduleData } from "@/lib/schedule-types";
import { STUDENT_ID_RE } from "@/lib/student-id";

interface Props {
  schedule: DetailedScheduleData;
}

type Status =
  | { kind: "idle" }
  | { kind: "posting" }
  | { kind: "success"; studentId: string }
  | { kind: "error"; message: string; code?: string };

export default function ImportButton({ schedule }: Props) {
  const searchParams = useSearchParams();
  const groupCode = searchParams.get("group") || "";
  const inputId = useId();
  const [studentId, setStudentId] = useState(schedule.studentId || "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const idValid = STUDENT_ID_RE.test(studentId.trim());
  const posting = status.kind === "posting";

  const submit = async () => {
    if (!idValid) return;
    setStatus({ kind: "posting" });
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ studentId: studentId.trim(), schedule }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setStatus({
          kind: "error",
          message: data.error || `HTTP ${res.status}`,
          code: data.code,
        });
        return;
      }
      const id = studentId.trim();
      if (groupCode) {
        await fetch(`/api/groups/${encodeURIComponent(groupCode)}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: "{}",
        }).catch(() => {});
      }
      setStatus({ kind: "success", studentId: id });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  };

  const nextHref = groupCode
    ? `/group/${encodeURIComponent(groupCode)}`
    : `/match?ids=${encodeURIComponent(status.kind === "success" ? status.studentId : studentId)}`;
  const nextLabel = groupCode ? "回到群組 →" : "去找共同空堂 →";

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4">
      <h3 className="text-md font-semibold text-gray-700 mb-3">
        匯入到我的帳號
      </h3>
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <label htmlFor={inputId} className="sr-only">
          學號
        </label>
        <input
          id={inputId}
          type="text"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          onBlur={(e) => setStudentId(e.target.value.trim())}
          placeholder="學號 (e.g. s1234567)"
          disabled={posting}
          autoComplete="off"
          className="flex-1 p-2 border border-gray-300 rounded text-sm font-mono bg-gray-50 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={
            status.kind === "success"
              ? () => setStatus({ kind: "idle" })
              : submit
          }
          disabled={!idValid && status.kind !== "success"}
          className={`px-4 py-2 rounded font-semibold transition-colors text-white ${
            posting
              ? "bg-blue-500 cursor-wait"
              : status.kind === "success"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          }`}
        >
          {posting
            ? "匯入中..."
            : status.kind === "success"
              ? "更新匯入"
              : "匯入到我的帳號"}
        </button>
      </div>

      {status.kind === "success" && (
        <output className="mt-3 p-2 bg-green-50 border border-green-200 text-green-800 rounded text-sm flex items-center justify-between gap-2 flex-wrap">
          <span>已匯入 ✓ (學號 {status.studentId})</span>
          <Link
            href={nextHref}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-xs"
          >
            {nextLabel}
          </Link>
        </output>
      )}
      {status.kind === "error" && (
        <div
          role="alert"
          className="mt-3 p-2 bg-red-50 border border-red-200 text-red-800 rounded text-sm"
        >
          {status.code === "claim_required" ? (
            <span>
              此學號已被其他裝置認領。請使用當初匯入的同一個瀏覽器，或聯絡管理員協助。
            </span>
          ) : (
            <span>匯入失敗：{status.message}</span>
          )}
        </div>
      )}
    </div>
  );
}
