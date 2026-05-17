"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildGoogleCalendarUrl,
  blockKey as makeBlockKey,
  nextDateForDayOfWeek,
} from "@/lib/calendar";
import type { ConfirmedMeeting, RankedBlock } from "@/lib/schedule-types";
import { DAY_NAMES_ZH } from "@/lib/time-slots";

interface Props {
  code: string;
}

interface GroupState {
  ok: boolean;
  code: string;
  creatorId: string | null;
  members: string[];
  found: string[];
  missing: string[];
  blocks: RankedBlock[];
  votes: Record<string, string[]>;
  confirmed: ConfirmedMeeting | null;
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
  const isHost =
    !!studentId &&
    !!state &&
    (state.creatorId === studentId || (state.creatorId === null && isMember));

  const vote = async (key: string) => {
    if (!isMember) return;
    await fetch(`/api/groups/${encodeURIComponent(code)}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockKey: key }),
    });
    await fetchGroup();
  };

  const confirm = async (args: {
    blockKey: string;
    date: string;
    title: string;
    location?: string;
  }) => {
    const res = await fetch(`/api/groups/${encodeURIComponent(code)}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    await fetchGroup();
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
  };

  const unconfirm = async () => {
    await fetch(`/api/groups/${encodeURIComponent(code)}/confirm`, {
      method: "DELETE",
    });
    await fetchGroup();
  };

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

        {state?.confirmed && (
          <ConfirmedPanel
            code={code}
            confirmed={state.confirmed}
            isHost={!!isHost}
            onUnconfirm={unconfirm}
          />
        )}

        {state && (
          <>
            <Members
              state={state}
              myId={studentId}
              reveal={reveal}
              onToggleReveal={() => setReveal((v) => !v)}
            />
            <Blocks
              state={state}
              myId={studentId}
              isMember={!!isMember}
              isHost={!!isHost}
              onVote={vote}
              onConfirm={confirm}
            />
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

function Blocks({
  state,
  myId,
  isMember,
  isHost,
  onVote,
  onConfirm,
}: {
  state: GroupState;
  myId: string | null;
  isMember: boolean;
  isHost: boolean;
  onVote: (key: string) => Promise<void>;
  onConfirm: (args: {
    blockKey: string;
    date: string;
    title: string;
    location?: string;
  }) => Promise<void>;
}) {
  const [pickerFor, setPickerFor] = useState<string | null>(null);

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
  if (state.confirmed) return null;

  return (
    <section
      className="bg-white rounded-lg shadow-md overflow-hidden"
      aria-live="polite"
    >
      <table className="w-full text-sm">
        <caption className="sr-only">共同空堂列表 — 可投票</caption>
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
            <th scope="col" className="p-3 text-center font-semibold">
              票數
            </th>
            <th scope="col" className="p-3 text-right font-semibold">
              動作
            </th>
          </tr>
        </thead>
        <tbody>
          {state.blocks.map((b) => {
            const key = makeBlockKey(b.dayOfWeek, b.fromPeriod, b.toPeriod);
            const voters = state.votes[key] ?? [];
            const iVoted = !!myId && voters.includes(myId);
            return (
              <tr
                key={key}
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
                <td className="p-3 text-center font-semibold text-blue-700">
                  {voters.length}
                </td>
                <td className="p-3 text-right space-x-1 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onVote(key)}
                    disabled={!isMember}
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      iVoted
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "border border-blue-600 text-blue-600 hover:bg-blue-50"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={isMember ? "" : "需要先加入群組"}
                  >
                    {iVoted ? "已投" : "投票"}
                  </button>
                  {isHost && (
                    <button
                      type="button"
                      onClick={() =>
                        setPickerFor((cur) => (cur === key ? null : key))
                      }
                      className="px-2 py-1 rounded text-xs font-semibold border border-green-600 text-green-700 hover:bg-green-50"
                    >
                      確認 →
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {pickerFor && isHost && (
        <ConfirmPicker
          blockKey={pickerFor}
          block={
            state.blocks.find(
              (b) =>
                makeBlockKey(b.dayOfWeek, b.fromPeriod, b.toPeriod) ===
                pickerFor,
            ) ?? null
          }
          onCancel={() => setPickerFor(null)}
          onConfirm={async (args) => {
            try {
              await onConfirm(args);
              setPickerFor(null);
            } catch (e) {
              alert(`確認失敗：${e instanceof Error ? e.message : "未知錯誤"}`);
            }
          }}
        />
      )}
    </section>
  );
}

function ConfirmPicker({
  blockKey,
  block,
  onCancel,
  onConfirm,
}: {
  blockKey: string;
  block: RankedBlock | null;
  onCancel: () => void;
  onConfirm: (args: {
    blockKey: string;
    date: string;
    title: string;
    location?: string;
  }) => Promise<void>;
}) {
  const defaultDate = block ? nextDateForDayOfWeek(block.dayOfWeek) : "";
  const [date, setDate] = useState(defaultDate);
  const [title, setTitle] = useState("夠咪亭");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!block) return null;

  return (
    <div className="p-4 bg-green-50 border-t border-green-200 space-y-3">
      <div className="text-sm text-gray-700">
        確認{" "}
        <strong>
          {DAY_NAMES_ZH[block.dayOfWeek]} {block.fromTime}–{block.toTime}
        </strong>{" "}
        的會議
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="text-xs text-gray-600">
          日期
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 rounded text-sm"
          />
        </label>
        <label className="text-xs text-gray-600">
          標題
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className="mt-1 w-full p-2 border border-gray-300 rounded text-sm"
          />
        </label>
        <label className="text-xs text-gray-600">
          地點（選填）
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={200}
            placeholder="例：圖資 3F"
            className="mt-1 w-full p-2 border border-gray-300 rounded text-sm"
          />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
        >
          取消
        </button>
        <button
          type="button"
          disabled={!date || !title.trim() || submitting}
          onClick={async () => {
            setSubmitting(true);
            try {
              await onConfirm({
                blockKey,
                date,
                title: title.trim(),
                location: location.trim() || undefined,
              });
            } finally {
              setSubmitting(false);
            }
          }}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded text-sm font-semibold"
        >
          {submitting ? "確認中..." : "確認並鎖定"}
        </button>
      </div>
    </div>
  );
}

function ConfirmedPanel({
  code,
  confirmed,
  isHost,
  onUnconfirm,
}: {
  code: string;
  confirmed: ConfirmedMeeting;
  isHost: boolean;
  onUnconfirm: () => Promise<void>;
}) {
  const googleUrl = buildGoogleCalendarUrl({
    title: confirmed.title || "夠咪亭",
    date: confirmed.date,
    fromTime: confirmed.fromTime,
    toTime: confirmed.toTime,
    location: confirmed.location,
    details: `中興夠咪亭 — 群組 ${code}`,
  });
  const icsUrl = `/api/groups/${encodeURIComponent(code)}/ics`;

  const dateLabel = new Date(`${confirmed.date}T00:00:00`).toLocaleDateString(
    "zh-TW",
    { year: "numeric", month: "long", day: "numeric", weekday: "long" },
  );

  return (
    <section className="bg-green-50 border-2 border-green-300 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-green-700 font-semibold uppercase tracking-wide">
            ✓ 已確認
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-1">
            {confirmed.title || "夠咪亭"}
          </h2>
          <p className="text-sm text-gray-700 mt-1">
            {dateLabel}
            <span className="font-mono ml-2">
              {confirmed.fromTime}–{confirmed.toTime}
            </span>
          </p>
          {confirmed.location && (
            <p className="text-sm text-gray-600 mt-1">
              📍 {confirmed.location}
            </p>
          )}
        </div>
        {isHost && (
          <button
            type="button"
            onClick={onUnconfirm}
            className="text-xs text-gray-500 underline hover:text-gray-700"
          >
            取消鎖定
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-green-200">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold"
        >
          加到 Google Calendar
        </a>
        <a
          href={icsUrl}
          className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-sm font-semibold"
        >
          下載 .ics（TimeTree / Apple / Outlook）
        </a>
      </div>
      <p className="text-xs text-gray-500">
        💡 TimeTree：下載 .ics 後在 app 內「設定 → 行事曆匯入 → 從檔案匯入」。
      </p>
    </section>
  );
}
