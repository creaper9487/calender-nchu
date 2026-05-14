"use client";

import { useState } from "react";
import type { DetailedScheduleData } from "@/lib/schedule-types";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

interface Props {
  schedule: DetailedScheduleData;
}

type Status =
  | { kind: "idle" }
  | { kind: "posting" }
  | { kind: "success"; email: string }
  | { kind: "error"; message: string };

export default function ImportButton({ schedule }: Props) {
  const defaultEmail =
    schedule.studentName && /^[a-z0-9]+$/i.test(schedule.studentName)
      ? `${schedule.studentName}@nchu.edu.tw`
      : "";
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const emailValid = EMAIL_RE.test(email.trim());
  const posting = status.kind === "posting";

  const submit = async () => {
    if (!emailValid) return;
    setStatus({ kind: "posting" });
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), schedule }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setStatus({
          kind: "error",
          message: data.error || `HTTP ${res.status}`,
        });
        return;
      }
      setStatus({ kind: "success", email: email.trim() });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4">
      <h3 className="text-md font-semibold text-gray-700 mb-3">
        匯入到我的帳號
      </h3>
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={(e) => setEmail(e.target.value.trim())}
          placeholder="your@email.com"
          disabled={posting}
          className="flex-1 p-2 border border-gray-300 rounded text-sm font-mono bg-gray-50 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={
            status.kind === "success"
              ? () => setStatus({ kind: "idle" })
              : submit
          }
          disabled={!emailValid && status.kind !== "success"}
          className={`px-4 py-2 rounded font-semibold transition-colors text-white ${
            posting
              ? "bg-blue-400 cursor-wait"
              : status.kind === "success"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          }`}
        >
          {posting
            ? "匯入中..."
            : status.kind === "success"
              ? "再次匯入"
              : "匯入到我的帳號"}
        </button>
      </div>

      {status.kind === "success" && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 text-green-800 rounded text-sm">
          已匯入 ✓ ({status.email})
        </div>
      )}
      {status.kind === "error" && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
          匯入失敗：{status.message}
        </div>
      )}
    </div>
  );
}
