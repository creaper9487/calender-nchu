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
| `CLAIM_TOKEN_SECRET` | production 必要 | HMAC 金鑰，至少 16 字。用來簽認領 token；dev 沒設會用一次性隨機值（重啟即失效） |
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
| POST | `/api/schedules` | `{ studentId, schedule }` | upsert 一份課表；第一次成功會在 response 設 cookie，之後寫入同學號必須帶該 cookie |
| GET | `/api/schedules?studentId=...` | — | **僅 dev**；production 回 404 |
| DELETE | `/api/schedules` | — | 刪除自己的課表（需 session） |
| GET | `/api/me` | — | `{ studentId | null }`，從 session cookie 解 |
| POST | `/api/match` | `{ studentIds: string[], me }` | 多人共同空堂；必須有 session，`me` 必須等於 session.studentId 且 ∈ studentIds |
| POST | `/api/groups` | `{}` | 建立群組；若有 session，創建者自動加入 |
| GET | `/api/groups/[code]` | — | 群組狀態（成員、共同空堂） |
| POST | `/api/groups/[code]/join` | `{}` | 加入群組（需 session，studentId 取自 session） |
| POST | `/api/groups/[code]/extend` | `{}` | 延長 24 小時（需 session 且為成員） |

`schedules` collection 在第一次 API 呼叫時會自動建 `{ studentId: 1 }` unique index。

## 安全模型（Tier 0 + Tier 1）

- **Claim token**：第一次 `POST /api/schedules` 為該學號發 HMAC-bound HttpOnly
  cookie；之後寫入該學號必須帶 cookie，否則回 401 `claim_required`。先到先得。
- **Match / join 認證**：`POST /api/match` 與 `POST /api/groups/[code]/join`
  必須有 session cookie，且 body 中的 `me` / `studentId` 會被 server 用 session
  的 studentId 覆蓋（無法強拉他人入群）。
- **Rate limit**：每個 mutating route 都有 sliding-window IP 配額（記憶體版，
  serverless 部署需改用 Redis）。
- **Body cap**：每個路由都有獨立的 body size 上限（`lib/body-limits.ts`）。
- **GET /api/schedules 僅 dev**：production 回 404，避免列舉學號是否存在。
- **群組到期**：建立後 24h TTL（MongoDB TTL index），成員可 `POST /api/groups/[code]/extend`
  延長。
- **群組成員顯示**：UI 預設顯示為「成員 1、成員 2」，按下「顯示學號」才揭露。
- **刪除自己的資料**：`DELETE /api/schedules`（需 session）。

## 排序啟發

`score = length + (isWeekday ? 14 : 0)`
平日永遠優先於週末，同類內以連續長度排序。`lib/matching.ts`。

## 行動版（Flutter）

`mobile/` 子資料夾為 iOS/Android 客戶端，重用同一個 backend，只負責 match 與
group 互通，不做課表擷取（仍走桌機 bookmarklet）。詳見
[`mobile/README.md`](./mobile/README.md)。

## 指令

| Command | 說明 |
| --- | --- |
| `pnpm dev` | dev server (turbopack) |
| `pnpm build` | production build |
| `pnpm lint` | biome check |
| `pnpm format` | biome format |
