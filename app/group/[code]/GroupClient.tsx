"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RankedBlock } from "@/lib/schedule-types";
import { DAY_NAMES_ZH } from "@/lib/time-slots";

interface Props {
  code: string;
}

interface GroupState {
  ok: boolean;
  code: string;
  members: string[];
  found: string[];
  missing: string[];
  blocks: RankedBlock[];
  expiresAt?: string;
  error?: string;
}

const POLL_INTERVAL_MS = 5000;

export default function GroupClient({ code }: Props) {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [state, setState] = useState<GroupState | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [extending, setExtending] = useState(false);
  const joinAttempted = useRef(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        setStudentId(
          d?.ok && typeof d.studentId === "string" ? d.studentId : null,
        );
      })
      .catch(() => setStudentId(null))
      .finally(() => setSessionReady(true));
  }, []);

  const fetchGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(code)}`);
      const data: GroupState = await res.json();
      if (!res.ok || !data.ok) {
        setFetchError(data.error || `HTTP ${res.status}`);
        return null;
      }
      setFetchError(null);
      setState(data);
      return data;
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Network error");
      return null;
    }
  }, [code]);

  useEffect(() => {
    fetchGroup();
    const t = setInterval(fetchGroup, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchGroup]);

  useEffect(() => {
    if (!sessionReady || !studentId || !state || joinAttempted.current) return;
    if (state.members.includes(studentId)) return;
    joinAttempted.current = true;
    fetch(`/api/groups/${encodeURIComponent(code)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then(() => fetchGroup())
      .catch(() => {
        joinAttempted.current = false;
      });
  }, [sessionReady, studentId, state, code, fetchGroup]);

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : `/group/${code}`;

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "一起夠咪亭",
          text: `加入群組 ${code}，找共同空堂`,
          url: shareUrl,
        });
        return;
      } catch {
        /* user cancelled or unsupported */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("複製連結：", shareUrl);
    }
  };

  const extend = async () => {
    setExtending(true);
    try {
      const res = await fetch(
        `/api/groups/${encodeURIComponent(code)}/extend`,
        { method: "POST" },
      );
      if (res.ok) {
        await fetchGroup();
      }
    } finally {
      setExtending(false);
    }
  };

  const isMember = !!studentId && state?.members.includes(studentId);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            群組 <span className="font-mono">{code}</span>
          </h1>
          <p className="text-gray-600 text-sm">
            把這個頁面分享給朋友，他們進來後會自動加入。
          </p>
          {state?.expiresAt && (
            <p className="text-xs text-gray-500 mt-1">
              到期：{new Date(state.expiresAt).toLocaleString("zh-TW")}
              {isMember && (
                <button
                  type="button"
                  onClick={extend}
                  disabled={extending}
                  className="ml-2 text-blue-600 underline disabled:opacity-50"
                >
                  {extending ? "延長中..." : "延長 24 小時"}
                </button>
              )}
            </p>
          )}
        </header>

        <section className="bg-white p-4 rounded-lg shadow-md flex flex-wrap gap-2 items-center justify-between">
          <code className="text-sm text-gray-700 break-all">{shareUrl}</code>
          <button
            type="button"
            onClick={share}
            className={`px-4 py-2 rounded font-semibold text-white text-sm transition-colors ${
              copied ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {copied ? "已複製" : "分享 / 複製連結"}
          </button>
        </section>

        {fetchError && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm"
          >
            無法載入群組：{fetchError}
          </div>
        )}

        {sessionReady && !studentId && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded">
            還沒匯入你自己的課表。
            <Link
              href={`/startup?group=${encodeURIComponent(code)}`}
              className="ml-2 underline font-semibold"
            >
              立即匯入 →
            </Link>
          </div>
        )}

        {state && (
          <>
            <Members
              state={state}
              myId={studentId}
              reveal={reveal}
              onToggleReveal={() => setReveal((v) => !v)}
            />
            <Blocks state={state} />
          </>
        )}
      </div>
    </div>
  );
}

function Members({
  state,
  myId,
  reveal,
  onToggleReveal,
}: {
  state: GroupState;
  myId: string | null;
  reveal: boolean;
  onToggleReveal: () => void;
}) {
  return (
    <section className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-md font-semibold text-gray-700">
          成員 ({state.members.length})
        </h2>
        {state.members.length > 0 && (
          <button
            type="button"
            onClick={onToggleReveal}
            className="text-xs text-gray-500 underline hover:text-gray-700"
          >
            {reveal ? "隱藏學號" : "顯示學號"}
          </button>
        )}
      </div>
      {state.members.length === 0 ? (
        <p className="text-sm text-gray-500">還沒有人加入。</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {state.members.map((id, idx) => {
            const isMe = id === myId;
            const missing = state.missing.includes(id);
            const label = reveal || isMe ? id : `成員 ${idx + 1}`;
            return (
              <li
                key={id}
                className={`text-sm font-mono px-2 py-1 rounded ${
                  isMe
                    ? "bg-blue-100 text-blue-800 ring-2 ring-blue-400"
                    : missing
                      ? "bg-amber-100 text-amber-800"
                      : "bg-gray-100 text-gray-700"
                }`}
                title={missing ? "未匯入課表" : ""}
              >
                {label}
                {isMe && <span className="ml-1 text-xs">(你)</span>}
                {missing && <span className="ml-1 text-xs">⚠</span>}
              </li>
            );
          })}
        </ul>
      )}
      {state.missing.length > 0 && (
        <p className="text-xs text-amber-700 mt-2">
          ⚠ 標黃的成員還沒匯入課表，他們不會被算進共同空堂。
        </p>
      )}
    </section>
  );
}

function Blocks({ state }: { state: GroupState }) {
  if (state.found.length < 2) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-600 text-sm">
        等更多人匯入課表（目前 {state.found.length} 人，至少需要 2 人）。
      </div>
    );
  }
  if (state.blocks.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-600">
        這群人沒有共同空堂 😢
      </div>
    );
  }
  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden"
      aria-live="polite"
    >
      <table className="w-full text-sm">
        <caption className="sr-only">共同空堂列表</caption>
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
          {state.blocks.map((b) => (
            <tr
              key={`${b.dayOfWeek}-${b.fromPeriod}`}
              className={`border-t border-gray-100 ${
                b.isWeekday ? "" : "text-gray-500"
              }`}
            >
              <td className="p-3 font-semibold">{DAY_NAMES_ZH[b.dayOfWeek]}</td>
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
  );
}
