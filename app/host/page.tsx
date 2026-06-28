'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import ScheduleGrid from '../components/ScheduleGrid';
import { type Availability, decodeAvailability } from '../../lib/qrcodec';
import { DAYS, type Block, findBlocks, intersect } from '../../lib/schedule';
import { googleCalUrl, nextDateForWeekday } from '../../lib/calendar';

export default function HostPage() {
  const [members, setMembers] = useState<Availability[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const lastTextRef = useRef('');

  const common = useMemo(() => intersect(members.map((m) => m.free)), [members]);
  const blocks = useMemo(
    () => (members.length ? findBlocks(common) : []),
    [common, members.length],
  );

  async function startScan() {
    setError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const inst = new Html5Qrcode('reader');
      scannerRef.current = inst as unknown as typeof scannerRef.current;
      await inst.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        (text: string) => {
          if (text === lastTextRef.current) return;
          lastTextRef.current = text;
          const a = decodeAvailability(text);
          if (!a) {
            setError('掃到的 QR 不是有效的空檔資料');
            return;
          }
          setError('');
          setMembers((prev) => [...prev.filter((m) => m.name !== a.name), a]);
        },
        () => {},
      );
      setScanning(true);
    } catch (e) {
      setError('無法開啟相機：' + (e as Error).message);
    }
  }

  async function stopScan() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
    lastTextRef.current = '';
    setScanning(false);
  }

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 flex justify-center">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">中興夠咪亭</h1>
          <p className="text-sm text-gray-400">組長 · 掃描大家的空檔</p>
        </div>

        {/* 掃描區 */}
        <section className="space-y-3">
          <div
            id="reader"
            className={`overflow-hidden rounded-xl ${scanning ? 'block' : 'hidden'}`}
          />
          {!scanning ? (
            <button
              onClick={startScan}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              📷 開始掃描成員 QR
            </button>
          ) : (
            <button
              onClick={stopScan}
              className="w-full py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-semibold"
            >
              停止掃描
            </button>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </section>

        {/* 成員清單 */}
        {members.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              已加入 {members.length} 人
            </h2>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <span
                  key={m.name}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-sm"
                >
                  {m.name}
                  <button
                    onClick={() => setMembers((prev) => prev.filter((x) => x.name !== m.name))}
                    className="text-emerald-500 hover:text-emerald-700"
                    aria-label={`移除 ${m.name}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* 共同空檔 + 推薦區塊 */}
        {members.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">
                共同空檔（深綠 = 全員都有空）
              </h2>
              <ScheduleGrid free={common} mode="common" />
            </div>
            <BlockPicker blocks={blocks} />
          </section>
        )}
      </div>
    </main>
  );
}

function BlockPicker({ blocks }: { blocks: Block[] }) {
  const [selected, setSelected] = useState<Block | null>(null);

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
        目前沒有「全員都有空且 ≥1 節」的共同時段，請確認成員或調整人選。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">推薦時段（越長越前）</h2>
      <div className="space-y-2">
        {blocks.map((b) => {
          const isSel = selected === b;
          return (
            <button
              key={`${b.day}-${b.startP}`}
              onClick={() => setSelected(b)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border text-left ${
                isSel ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="font-semibold text-gray-800">
                {DAYS[b.day]} {b.startTime}–{b.endTime}
              </span>
              <span className="text-xs text-gray-500">
                {b.periodCount} 節 / {b.durationMin} 分
              </span>
            </button>
          );
        })}
      </div>
      {selected && <CalendarMaker block={selected} />}
    </div>
  );
}

function CalendarMaker({ block }: { block: Block }) {
  const [title, setTitle] = useState('中興夠咪亭會議');
  const [date, setDate] = useState(() => nextDateForWeekday(block.day));
  const [qr, setQr] = useState<string | null>(null);

  // 換時段時把日期帶到該星期幾的下一次
  useEffect(() => {
    setDate(nextDateForWeekday(block.day));
    setQr(null);
  }, [block]);

  const url = useMemo(
    () =>
      googleCalUrl({
        title,
        date,
        start: block.startTime,
        end: block.endTime,
        details: '由「中興夠咪亭」產生',
      }),
    [title, date, block],
  );

  async function makeQr() {
    setQr(await QRCode.toDataURL(url, { margin: 2, width: 300 }));
  }

  return (
    <div className="mt-3 p-4 rounded-xl bg-gray-50 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">產生行事曆事件</h3>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
        placeholder="會議標題"
      />
      <label className="block text-xs text-gray-500">
        日期（{DAYS[block.day]}）
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full p-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <p className="text-xs text-gray-500">
        時間：{block.startTime}–{block.endTime}
      </p>
      <button
        onClick={makeQr}
        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
      >
        產生行事曆 QR / 連結
      </button>
      {qr && (
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">成員掃這張即可加入 Google 行事曆 👇</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="行事曆 QR" className="mx-auto rounded-lg shadow" width={300} height={300} />
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm break-all">
            或點此開啟連結
          </a>
        </div>
      )}
    </div>
  );
}
