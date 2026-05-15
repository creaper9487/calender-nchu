# 中興夠咪亭

從興大課表找出和朋友的共同空堂，一起夠咪亭。

Next.js 15 (App Router) + React 19 + TypeScript + MongoDB。

## 開發

```bash
pnpm install
cp .env.example .env.local   # 然後填 MONGODB_URI
pnpm dev
```

開 [http://localhost:3000](http://localhost:3000)。

### 環境變數

| 名稱 | 必要 | 說明 |
| --- | --- | --- |
| `MONGODB_URI` | ✅ | 連線字串，使用 `test` database 的 `schedules` collection |
| `NEXT_PUBLIC_APP_URL` | 部署時 | bookmarklet 會把使用者導回這個 URL（例：`https://calender-nchu.example.com`），未設定時 fallback 到 `http://localhost:3000` |

## 流程

1. **匯入課表** — `/startup` 頁複製 bookmarklet 為書籤
2. 登入興大 SSO 後到 [課表頁](https://cportal.nchu.edu.tw/cofsys/plsql/vocscrd_table)
3. 點書籤 → 自動開新分頁回 `/startup?schedule=...` 顯示 detailed 課表
4. 輸入學號 → 「匯入到我的帳號」→ upsert 進 MongoDB
5. **找空堂** — `/match` 輸入多個學號 → 顯示共同空堂 ranked blocks

## API

| Method | Path | Body / Query | 說明 |
| --- | --- | --- | --- |
| POST | `/api/schedules` | `{ studentId, schedule }` | upsert 一份課表 |
| GET | `/api/schedules?studentId=...` | — | 開發用：查單筆 |
| POST | `/api/match` | `{ studentIds: string[] }` | 多人共同空堂，回 ranked blocks |

`schedules` collection 在第一次 API 呼叫時會自動建 `{ studentId: 1 }` unique index。

## 排序啟發

`score = length + (isWeekday ? 14 : 0)`
平日永遠優先於週末，同類內以連續長度排序。`lib/matching.ts`。

## 指令

| Command | 說明 |
| --- | --- |
| `pnpm dev` | dev server (turbopack) |
| `pnpm build` | production build |
| `pnpm lint` | biome check |
| `pnpm format` | biome format |
