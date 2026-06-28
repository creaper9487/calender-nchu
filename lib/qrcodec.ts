// 空檔資料的精簡編碼：7×13 = 91 bits → 12 bytes → base64url。
// QR 內容用 JSON {v,n,a}（含名字）；bookmarklet 回傳只帶 a（base64url 空檔）。

import { type Grid, emptyGrid, N_DAYS, N_PERIODS } from './schedule';

const VERSION = 1;
const N_BYTES = Math.ceil((N_DAYS * N_PERIODS) / 8); // 12

export function packGrid(free: Grid): Uint8Array {
  const bytes = new Uint8Array(N_BYTES);
  for (let d = 0; d < N_DAYS; d++) {
    for (let p = 0; p < N_PERIODS; p++) {
      if (free[d]?.[p]) {
        const idx = d * N_PERIODS + p;
        bytes[idx >> 3] |= 1 << (idx & 7);
      }
    }
  }
  return bytes;
}

export function unpackGrid(bytes: Uint8Array): Grid {
  const free = emptyGrid(false);
  for (let d = 0; d < N_DAYS; d++) {
    for (let p = 0; p < N_PERIODS; p++) {
      const idx = d * N_PERIODS + p;
      free[d][p] = (bytes[idx >> 3] & (1 << (idx & 7))) !== 0;
    }
  }
  return free;
}

export function toB64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** bookmarklet 回傳的 ?d= 參數 → 空檔網格。失敗回 null。 */
export function decodeParam(d: string): Grid | null {
  try {
    return unpackGrid(fromB64url(d));
  } catch {
    return null;
  }
}

export interface Availability {
  name: string;
  free: Grid;
}

/** 產生 QR 文字內容（成員端）。 */
export function encodeAvailability(name: string, free: Grid): string {
  return JSON.stringify({ v: VERSION, n: name, a: toB64url(packGrid(free)) });
}

/** 解析掃到的 QR 文字（組長端）。非本格式或損毀回 null。 */
export function decodeAvailability(text: string): Availability | null {
  try {
    const obj = JSON.parse(text);
    if (obj?.v !== VERSION || typeof obj.n !== 'string' || typeof obj.a !== 'string') {
      return null;
    }
    return { name: obj.n, free: unpackGrid(fromB64url(obj.a)) };
  } catch {
    return null;
  }
}
