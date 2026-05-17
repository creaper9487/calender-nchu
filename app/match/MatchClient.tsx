"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { RankedBlock } from "@/lib/schedule-types";
import { STUDENT_ID_RE } from "@/lib/student-id";
import { DAY_NAMES_ZH } from "@/lib/time-slots";

const MAX_IDS = 20;

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
  const inputId = useId();
  const abortRef = useRef<AbortController | null>(null);

  const initialIds = useMemo(() => {
    const raw = searchParams.get("ids") || "";
    return Array.from(
      new Set(
        raw
          .split(",")
          .map((s) => s.trim())
          .filter((s) => STUDENT_ID_RE.test(s)),
      ),
    ).slice(0, MAX_IDS);
  }, [searchParams]);

  const [me, setMe] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [ids, setIds] = useState<string[]>(initialIds);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        const id =
          d?.ok && typeof d.studentId === "string" ? d.studentId : null;
        setMe(id);
        if (id) {
          setIds((prev) => (prev.includes(id) ? prev : [id, ...prev]));
        }
      })
      .catch(() => {})
      .finally(() => setSessionReady(true));
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const addDraft = () => {
    const next = draft.trim();
    if (!STUDENT_ID_RE.test(next)) return;
    setDraft("");
    if (ids.includes(next) || ids.length >= MAX_IDS) return;
    setIds([...ids, next]);
  };

  const removeId = (id: string) => {
    if (id === me) return;
    setIds(ids.filter((x) => x !== id));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addDraft();
    } else if (e.key === "Backspace" && !draft && ids.length) {
      const last = ids[ids.length - 1];
      if (last !== me) setIds(ids.slice(0, -1));
    }
  };

  const submit = async () => {
    if (!me || ids.length < 2) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: ids, me }),
        signal: ac.signal,
      });
      const data: MatchResponse = await res.json();
      if (ac.signal.aborted) return;
      if (!res.ok || !data.ok) {
        setStatus({
          kind: "err",
          message: data.error || `HTTP ${res.status}`,
        });
        return;
      }
      setStatus({ kind: "ok", data });
    } catch (err) {
      if (ac.signal.aborted) return;
      setStatus({
        kind: "err",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  };

  const draftValid = STUDENT_ID_RE.test(draft.trim());
  const canSubmit = !!me && ids.length >= 2 && status.kind !== "loading";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            找共同空堂
          </h1>
          <p className="text-gray-600 text-sm">
            輸入要約的人的學號，按 Enter 或逗號加入。或
            <Link
              href="/group/new"
              className="text-blue-600 underline mx-1 hover:text-blue-800"
            >
              建立群組讓對方自己加入
            </Link>
            。
          </p>
        </header>

        {sessionReady && !me && (
          <div
            role="alert"
            className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded text-sm"
          >
            還沒匯入你自己的課表，無法配對。
            <Link href="/startup" className="ml-2 underline font-semibold">
              立即匯入 →
            </Link>
          </div>
        )}

        <section className="bg-white p-4 rounded-lg shadow-md">
          <label htmlFor={inputId} className="sr-only">
            學號清單
          </label>
          <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded bg-gray-50 min-h-[3rem] focus-within:ring-2 focus-within:ring-blue-400">
            {ids.map((id) => {
              const locked = id === me;
              return (
                <span
                  key={id}
                  className={`inline-flex items-center gap-1 text-sm font-mono px-2 py-1 rounded ${
                    locked
                      ? "bg-blue-200 text-blue-900"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {id}
                  {locked && <span className="text-xs">(你)</span>}
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => removeId(id)}
                      className="text-blue-600 hover:text-blue-900 font-bold leading-none focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                      aria-label={`移除 ${id}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            })}
            <input
              id={inputId}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={addDraft}
              placeholder={ids.length ? "" : "學號 (e.g. s1234567)"}
              autoComplete="off"
              disabled={!me}
              className="flex-1 min-w-[8rem] bg-transparent outline-none text-sm font-mono p-1 disabled:opacity-50"
            />
          </div>

          <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-gray-500">
              {ids.length}/{MAX_IDS} 人
              {ids.length < 2 && (
                <span className="text-gray-400 ml-2">（至少 2 人）</span>
              )}
              {draft && !draftValid && (
                <span className="text-red-600 ml-2">學號格式錯誤</span>
              )}
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="px-4 py-2 rounded font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {status.kind === "loading" ? "查詢中..." : "找共同空堂"}
            </button>
          </div>
        </section>

        {status.kind === "err" && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm"
          >
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
    <section className="space-y-4" aria-live="polite">
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
            <caption className="sr-only">
              共同空堂列表，依長度與平日優先排序
            </caption>
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="p-3 text-left font-semibold">
                  星期
                </th>
                <th scope="col" className="p-3 text-left font-semibold">
                  時段
                </th>
                <th scope="col" className="p-3 text-center font-semibold">
                  節數
                </th>
              </tr>
            </thead>
            <tbody>
              {data.blocks.map((b) => (
                <tr
                  key={`${b.dayOfWeek}-${b.fromPeriod}`}
                  className={`border-t border-gray-100 ${
                    b.isWeekday ? "" : "text-gray-500"
                  }`}
                >
                  <td className="p-3 font-semibold">
                    {DAY_NAMES_ZH[b.dayOfWeek]}
                  </td>
                  <td className="p-3 font-mono">
                    {b.fromTime}–{b.toTime}
                    <span className="text-xs text-gray-400 ml-2">
                      第 {b.fromPeriod + 1}
                      {b.length > 1 ? `–${b.toPeriod + 1}` : ""} 節
                    </span>
                  </td>
                  <td className="p-3 text-center">{b.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
