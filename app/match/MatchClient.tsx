"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { RankedBlock } from "@/lib/schedule-types";

const STUDENT_ID_RE = /^[A-Za-z0-9]{4,12}$/;
const DAY_NAMES = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];

interface MatchResponse {
  ok: boolean;
  requested: string[];
  found: string[];
  missing: string[];
  blocks: RankedBlock[];
  error?: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: MatchResponse }
  | { kind: "err"; message: string };

export default function MatchClient() {
  const searchParams = useSearchParams();
  const initialIds = useMemo(() => {
    const raw = searchParams.get("ids") || "";
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => STUDENT_ID_RE.test(s));
  }, [searchParams]);

  const [ids, setIds] = useState<string[]>(initialIds);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const addDraft = () => {
    const next = draft.trim();
    if (!STUDENT_ID_RE.test(next)) return;
    if (ids.includes(next)) {
      setDraft("");
      return;
    }
    if (ids.length >= 20) return;
    setIds([...ids, next]);
    setDraft("");
  };

  const removeId = (id: string) => {
    setIds(ids.filter((x) => x !== id));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addDraft();
    } else if (e.key === "Backspace" && !draft && ids.length) {
      setIds(ids.slice(0, -1));
    }
  };

  const submit = async () => {
    if (ids.length < 1) return;
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: ids }),
      });
      const data: MatchResponse = await res.json();
      if (!res.ok || !data.ok) {
        setStatus({
          kind: "err",
          message: data.error || `HTTP ${res.status}`,
        });
        return;
      }
      setStatus({ kind: "ok", data });
    } catch (err) {
      setStatus({
        kind: "err",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  };

  const draftValid = STUDENT_ID_RE.test(draft.trim());

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            找共同空堂
          </h1>
          <p className="text-gray-600 text-sm">
            輸入要約的人的學號（含自己），按 Enter 或逗號加入。
          </p>
        </header>

        <section className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded bg-gray-50 min-h-[3rem]">
            {ids.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-sm font-mono px-2 py-1 rounded"
              >
                {id}
                <button
                  type="button"
                  onClick={() => removeId(id)}
                  className="text-blue-600 hover:text-blue-900 font-bold leading-none"
                  aria-label={`移除 ${id}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={addDraft}
              placeholder={ids.length ? "" : "學號 (e.g. s1234567)"}
              className="flex-1 min-w-[8rem] bg-transparent outline-none text-sm font-mono p-1"
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {ids.length}/20 人
              {draft && !draftValid && (
                <span className="text-red-600 ml-2">學號格式錯誤</span>
              )}
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={ids.length < 1 || status.kind === "loading"}
              className="px-4 py-2 rounded font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {status.kind === "loading" ? "查詢中..." : "找共同空堂"}
            </button>
          </div>
        </section>

        {status.kind === "err" && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
            查詢失敗：{status.message}
          </div>
        )}

        {status.kind === "ok" && <Result data={status.data} />}
      </div>
    </div>
  );
}

function Result({ data }: { data: MatchResponse }) {
  return (
    <section className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-md text-sm">
        <div>
          找到{" "}
          <span className="font-semibold text-green-700">
            {data.found.length}
          </span>
          /{data.requested.length} 人
          {data.found.length > 0 && (
            <span className="text-gray-500 ml-2 font-mono">
              [{data.found.join(", ")}]
            </span>
          )}
        </div>
        {data.missing.length > 0 && (
          <div className="text-amber-700 mt-1">
            查無資料：
            <span className="font-mono">{data.missing.join(", ")}</span>
            <span className="text-gray-500 ml-2">
              （請對方先到 /startup 匯入課表）
            </span>
          </div>
        )}
      </div>

      {data.blocks.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-600">
          {data.found.length === 0
            ? "沒有任何人有匯入課表"
            : "這群人沒有共同空堂 😢"}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left font-semibold">星期</th>
                <th className="p-3 text-left font-semibold">時段</th>
                <th className="p-3 text-center font-semibold">節數</th>
                <th className="p-3 text-center font-semibold">類型</th>
                <th className="p-3 text-right font-semibold">分數</th>
              </tr>
            </thead>
            <tbody>
              {data.blocks.map((b) => (
                <tr
                  key={`${b.dayOfWeek}-${b.fromPeriod}`}
                  className="border-t border-gray-100"
                >
                  <td className="p-3 font-semibold text-gray-700">
                    {DAY_NAMES[b.dayOfWeek]}
                  </td>
                  <td className="p-3 font-mono text-gray-700">
                    {b.fromTime}–{b.toTime}
                    <span className="text-xs text-gray-400 ml-2">
                      第 {b.fromPeriod + 1}
                      {b.length > 1 ? `–${b.toPeriod + 1}` : ""} 節
                    </span>
                  </td>
                  <td className="p-3 text-center">{b.length}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        b.isWeekday
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {b.isWeekday ? "平日" : "週末"}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono text-gray-500">
                    {b.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
