---
title: "PLAN — явц ба зогссон цэг"
type: Roadmap
status: Active
last_updated: 2026-11-18
tags: [plan, progress]
---

# PLAN — вэб апп (v2)
> Хүрээ, дүрэм → `docs/PRD.md` §7. Энд зөвхөн **явц, Зогссон цэг, техник шийдвэр**. Блок дуусах бүрт шинэчилнэ.

## Зогссон цэг
2026-11-18: **Үе 1 дууссан** (салбар `a01-1`, commit хийгдээгүй). verify ногоон, `wrangler dev` /api/health 200, static 200. Дараагийнх — **Үе 2 (DB + импорт)**: A02-1, A04-1 (давалгаа 0) зэрэг.
A04-1: `src/domain/types/api.ts` — бүх endpoint, DTO, 409 `ConflictBody`, `device` + `expected_updated_at`, `/api/sync`. Дараа: A02-1 `db.ts`-тэй нэр тулгах; A04-2/3 хэрэгжүүлнэ.

**A02-1 (2026-11-18):** `worker/migrations/0001_init.sql`, `0002_seed.sql`, `src/domain/types/db.ts`, `scripts/db/gen-rooms-seed.mjs` (a02-1 салбар). Шийдвэр: PRD-д байхгүй `driver_types` хүснэгт нэмсэн; хос ээлж = `shift_schedule.pair_code`; 824/826 = `rooms.is_new_hire_room`; `allowed_shifts` BUS/W/S өрөөнд л (бусад NULL); Sino/ACCL/Мак/ИТА/Эрхэт Түнш = `үндсэн` + company (хэрэглэгч тохиргооноос засна). `wrangler.toml` A01-1-ийнх.

## Үе шат
- [x] **1. Бэлтгэл** — `web` салбар; `npm install`; `npm run verify` ажиллаж байгаа эсэх; wrangler суулгах; `expo export --platform web` туршиж вэбд ажиллахгүй сангуудыг жагсаах (доорх «Шийдвэр»-т)
- [ ] **2. DB + ирцийн импорт** — migration + seed (stay_codes, shift_codes, shift_schedule, rooms); `src/domain/import` (таних, хэвшүүлэх, дутуу төлөв, зөрчил); ноябрийн файлаар тулгалт
- [ ] **3. Хуваарь + автомат бөглөлт** — `src/domain/schedule` + бодит датаар тест
- [ ] **4. API (Worker)** — endpoint-ууд, change_log batch
- [ ] **5. Вэб UI** — API клиент, дэлгэцүүд, вэбийн confirm/toast
- [ ] **6. Ээлж солилцооны импорт, жолооч** — эхлэхээс өмнө хэрэглэгчтэй нарийвчлалыг харна (PRD §8)
- [ ] **7. Түүх, тайлан** — 3 хуудастай .xlsx
- [ ] **8. PWA** — SW, IndexedDB, засварын дараалал, зөрчил
- [ ] **9. Байршуулалт, тест** — ⚠ deploy, домэйн, secret — хэрэглэгчийн зөвшөөрөлтэй

## Агентуудын явц (AGENTS.md §8)
Төлөв: — эхлээгүй · ▶ хийгдэж байна · ✔ дууссан (A09 шалгасан). Давалгаа дуусахад хэрэглэгч хүлээн авна.

| ID | Даалгавар | Хавтас | Давалгаа | Хамаарал | Төлөв / зогссон цэг |
|---|---|---|---|---|---|
| A01-1 | Бэлтгэл: `web`, npm install, verify, wrangler, web export, `src/constants/theme.ts` сэргээх, вэбд ажиллахгүй сан | root, `src/constants` | 0 | — | ✔ (A09 шалгаагүй) · Үе 1 дууссан, салбар a01-1 |
| A02-1 | Migration + seed (stay_codes, shift_codes, shift_schedule, driver_types, rooms) + DB төрөл | `worker/migrations`, `src/domain/types` | 0 | — | ✔ (шалгагдаагүй: A09) · салбар a02-1 · 0001_init, 0002_seed, db.ts. local migration OK (147 өрөө, 7 stay_codes, 10 shift_codes, 4 schedule, 2 driver_types) |
| A04-1 | API гэрээ: замууд, request/response DTO | `src/domain/types/api.ts` | 0 | A02-1-тэй зэрэг | ✔ гэрээ бичсэн (салбар a04-1, worktree `camp-a04-1`, commit хийгээгүй); A09 шалгана |
| A01-2 | Түр нэвтрэлт, Turnstile, оролдлогын хязгаар, noindex | `worker/auth` | 1 | A01-1 | — |
| A02-2 | Ирцийн файл уншигч, ID хэвшүүлэх, дутуу төлөв (+тест бодит файлаар) | `src/domain/import` | 1 | A02-1 | — |
| A03-1 | Хуваарь, автомат бөглөлт, явалтаар хасах (+тест) | `src/domain/schedule` | 1 | A02-1 | — |
| A03-2 | Хоол / ор хоног, дүүргэлт (хос ээлж), өрөө санал болгох, overtime, жолооч | `src/domain/rules` | 1 | A02-1 | — |
| A05-1 | UI бүрхүүл: навигаци, API клиент (mock), confirm/toast | `src/app/_layout`, `src/api`, `src/components` | 1 | A04-1 | — |
| A06-1 | Ээлж солилцооны файл уншигч ба дүрэм (PRD §8 хэрэглэгчтэй тулгасны дараа) | `src/domain/shiftchange` | 1 | A02-1 | — |
| A07-1 | Excel тайлан бичигч (одоогийн загвар, 3 хуудас) | `src/domain/report` | 1 | A02-1 | — |
| A08-1 | PWA manifest, Service Worker, суулгах заавар | `public`, `src/offline` | 1 | A01-1 | — |
| A02-3 | Импорт: dry-run, зөрүү, зөрчил, баталгаажуулах, бичих | `worker/api/import` | 2 | A02-2, A03-1 | — |
| A04-2 | Endpoint: өрөө, ажилтан, stays, ирэлт / явалт (бөөнөөр), өрөө солих | `worker/api` | 2 | A04-1, A03 | — |
| A04-3 | Endpoint: түүх, undo, тохиргоо, тайлан, зэрэг засварын шалгалт | `worker/api` | 2 | A04-1, A02-3 | — |
| A05-2 | Самбар (өнгөт), ээлж солих өдрийн самбар | `src/app/(board)` | 2 | A05-1 | — |
| A05-3 | Ажилтан, хайлт, ирэлт / явалт, туслан гүйцэтгэгч, өрөөгүй, сарын харагдац | `src/app/(employees)` | 2 | A05-1 | — |
| A06-2 | Импортын дараах: сунгалтын шийдвэр, жолооч | `src/domain/shiftchange`, `worker/api` | 2 | A06-1, A03-2 | — |
| A07-2 | Сарын хоол, хураангуй, хугацаагаар тайлан | `src/domain/report`, `src/app/(reports)` | 2 | A07-1, A03-2 | — |
| A08-2 | Офлайн дараалал, синк, зөрчлийн мэдэгдэл | `src/offline` | 2 | A08-1, A04-2 | — |
| A09-1 | Domain тест ноябрийн бодит датаар (Excel-ийн нийт дүнтэй тулгах) | `tests` | 2 | A02-3, A03 | — |
| A05-4 | Импорт, түүх, тайлан, тохиргоо (өрөөний тохиргоо) дэлгэц | `src/app/(admin)` | 3 | A04-3 | — |
| A09-2 | E2E: хөтөч, 2 төхөөрөмж, офлайн | `tests` | 3 | A05, A08 | — |
| A09-3 | Хамгаалалтын хяналт | — | 3 | A01-2 | — |
| A01-3 | ⚠ Байршуулалт `camp.gobiverse.website`, нөөцлөлт, заавар (хэрэглэгчийн зөвшөөрөлтэй) | `worker` | 3 | Бүгд | — |

## Техник шийдвэр (PRD-д нийцсэн, агент гаргасан)
- 2026-11-18: Domain логик `src/domain/` цэвэр TS (браузер + Worker хуваалцана); Worker `worker/`, migration `worker/migrations/`. Тест — vitest (domain).

- 2026-11-18 (A01-1): Worker `worker/wrangler.toml` (assets = `../dist`, SPA fallback, `/api/*` Worker-ээр түрүүлж), `worker/src/index.ts` (/api/health, бусад нь static). Скрипт: `npm run worker:dev`, `npm run build:web`. D1 `database_id` placeholder (local-д хангалттай) — remote үүсгэхэд (зөвшөөрөлтэй) солино. Root `tsconfig` `worker`-ийг хасч, `src/types/css.d.ts` нэмсэн (`animated-icon.module.css` алдаа засагдсан).
- **Вэбд ажиллахгүй сангууд** (`expo export --platform web` туршсан):
  - `expo-sqlite` — **бүтэц унана**: `wa-sqlite.wasm` resolve хийгдэхгүй. `src/services/database.ts`-ийг түр stub-аар (commit хийгээгүй, сэргээсэн) сольход бусад нь **бүтсэн** (3 статик route, 2.1MB). → Үе 5-д `database.ts`-ийг API клиентээр солино; `app.json`-ийн `expo-sqlite` plugin-ийг тэр үед хасна.
  - `expo-file-system/legacy` (database.ts, excelService.ts) — вэбд файл систем алга → `Blob` + `<a download>`, файл сонгоход `<input type=file>`.
  - `expo-sharing` (excelService.ts) — вэбд найдваргүй → дээрх Blob татаалт.
  - `expo-asset` (seed `src/assets/rooms_master.xlsx`) — seed = migration болсноор хэрэггүй.
  - `Alert.alert` (src/app/index.tsx, ~20 газар) — вэбд товч/callback ажиллахгүй → нийтлэг confirm/toast (A05-1).
  - `Platform.select({android})` (themed-text, theme.ts) — вэбд аюулгүй.
  - `xlsx` — вэбд ажиллана (цэвэр JS).
  - `expo-glass-effect`, `expo-symbols`, `expo-device`, `expo-web-browser` — export алдаагүй; ажиллагааг UI үед шалгана.

## Нээлттэй / хэрэглэгчээс асуух
- A04-1: `driver_types` PRD §5-ын 9 хүснэгтэд алга, гэвч AGENTS §2 / PLAN A02-1 шаардана → PRD §5-д нэмэх үү?
- A04-1: `change_log`-д undo-д хэрэгтэй талбар алга (`undone`, мөрийн date) → A02-1 migration-д нэмэх үү?
- A04-1: `employees.id`, `imports.id`-г `number` (INTEGER PK) гэж авсан; A02-1 өөр бол DTO тааруулна.
- A04-1: PLAN-д хавтас `src/domain/api-types` байсан, даалгаварт `src/domain/types/api.ts` → сүүлийнхийг мөрдсөн.
- A04-1: Тайлан endpoint JSON буцаана (.xlsx-г браузер бичнэ, PRD §4). Сарын хоол = `reports/summary`.
