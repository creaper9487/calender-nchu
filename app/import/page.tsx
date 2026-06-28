'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import ScheduleGrid from '../components/ScheduleGrid';
import { decodeParam, encodeAvailability } from '../../lib/qrcodec';
import { buildBookmarklet, NCHU_TIMETABLE_URL } from '../../lib/bookmarklet';

function GenerateQR({ free }: { free: ReturnType<typeof decodeParam> }) {
  const [name, setName] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const grid = free!;
  const freeCount = useMemo(() => grid.flat().filter(Boolean).length, [grid]);

  async function makeQr() {
    const text = encodeAvailability(name.trim() || '匿名', grid);
    setQr(await QRCode.toDataURL(text, { margin: 2, width: 320 }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">你的空檔（綠色 = 沒課）</h2>
        <p className="text-sm text-gray-500 mb-3">
          本週有空 <span className="font-bold text-emerald-600">{freeCount}</span> 個時段
        </p>
        <ScheduleGrid free={grid} mode="self" />
      </div>

      <div className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="輸入你的名字"
          className="w-full p-3 border border-gray-300 rounded-lg"
          maxLength={20}
        />
        <button
          onClick={makeQr}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
        >
          產生我的空檔 QR
        </button>
      </div>

      {qr && (
        <div className="text-center space-y-2 pt-2">
          <p className="text-sm text-gray-600">把這張 QR 給組長掃 👇</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="我的空檔 QR" className="mx-auto rounded-lg shadow" width={320} height={320} />
        </div>
      )}
    </div>
  );
}

function ImportInner() {
  const params = useSearchParams();
  const d = params.get('d');
  const free = useMemo(() => (d ? decodeParam(d) : null), [d]);

  const [origin, setOrigin] = useState('');
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const bookmarklet = useMemo(() => (origin ? buildBookmarklet(origin) : ''), [origin]);

  // 直接設 href，避開 React 對 javascript: URL 的處理（才能拖曳成書籤）。
  useEffect(() => {
    if (linkRef.current && bookmarklet) linkRef.current.setAttribute('href', bookmarklet);
  }, [bookmarklet]);

  async function copyBookmarklet() {
    await navigator.clipboard.writeText(bookmarklet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (free) return <GenerateQR free={free} />;
  if (d) {
    return (
      <p className="text-center text-red-600">課表資料解析失敗，請重新從書籤擷取一次。</p>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">匯入你的興大課表</h2>
      <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside">
        <li>
          把下面這顆按鈕<strong>拖曳</strong>到瀏覽器書籤列（或按「複製」自己新增書籤）：
          <div className="my-2">
            {/* href 由 effect 設定 */}
            <a
              ref={linkRef}
              className="inline-block px-4 py-2 bg-amber-400 text-black rounded-lg font-bold cursor-move shadow"
              onClick={(e) => e.preventDefault()}
            >
              📅 擷取課表
            </a>
            <button
              onClick={copyBookmarklet}
              className="ml-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {copied ? '已複製' : '複製'}
            </button>
          </div>
        </li>
        <li>
          登入興大入口後，前往{' '}
          <a
            href={NCHU_TIMETABLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            一週課表
          </a>{' '}
          頁面。
        </li>
        <li>點一下剛剛加入的「擷取課表」書籤，會自動帶你回來並產生空檔 QR。</li>
      </ol>
      <p className="text-xs text-gray-400">
        擷取只在你的瀏覽器進行，課表內容不會上傳；只有「哪些時段沒課」會被編進 QR。
      </p>
    </div>
  );
}

export default function ImportPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 flex justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">中興夠咪亭</h1>
        <p className="text-sm text-gray-400 mb-6">成員 · 匯入課表</p>
        <Suspense fallback={<p className="text-gray-400">載入中…</p>}>
          <ImportInner />
        </Suspense>
      </div>
    </main>
  );
}
