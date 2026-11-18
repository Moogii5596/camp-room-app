---
title: "CONTEXT — юу хаана байна"
type: Guide
status: Active
last_updated: 2026-11-18
tags: [context, moc]
---

# CONTEXT — юу хаана байна
> Дүрэм → `AGENTS.md`. Энэ файл зөвхөн зураглал: даалгаварт **аль файл, аль §**-ийг унших.

## 1. Даалгавар → унших
| Даалгавар | PRD § | Код |
|---|---|---|
| Ирцийн файлын импорт | §2.1–2.6, §2.8 | `src/domain/import/` |
| Ээлж солилцооны импорт, жолооч | §2.7–2.9, §3 (жолооч) | `src/domain/import/`, `src/domain/schedule/` |
| Хуваарь, автомат бөглөлт, overtime | §3 | `src/domain/schedule/` |
| Хоол, ор хоног, дүүргэлт | §2.2, §6.2 (дүүргэлтийн дүрэм) | `src/domain/stats/` |
| DB / migration | §5 | `worker/migrations/` |
| API | §4, §5, §6 (# мөр) | `worker/src/` |
| Нэвтрэлт, хамгаалалт | §4.1 | `worker/src/auth*` |
| Дэлгэц (UI) | §6 (тухайн #), §6.2 | `src/app/`, `src/components/` |
| Тайлан Excel | §6.1 | `src/domain/report/` |
| PWA / офлайн, 2 хэрэглэгчийн зөрчил | §6 #14, §6.1 (сүүлийн догол), §8 | `src/offline/`, `public/sw.js` |
| Deploy | §4, §7 үе 9 | `worker/wrangler.toml` |
| Тест өгөгдөл | §2.3 (хүлээгдэх тоо) | `docs/Өрөө бүртгэл.xlsx`, `docs/ShiftChange.xlsx`, `src/assets/rooms_master.xlsx` |

> Хавтас үүсгэх үед энэ хүснэгтийн «Код» баганыг бодит замаар шинэчилнэ.

## 2. Одоогийн код (хуучин Expo, `main`)
| Файл | Агуулга |
|---|---|
| `src/app/index.tsx` (828 мөр) | Бүх дэлгэц: самбар, шүүлт, хайлт, модалууд (нэмэх, өрөө солих, буулгах) — хуваагдана |
| `src/services/database.ts` | expo-sqlite схем (rooms, employees), Excel seed, CRUD → API клиентээр солигдоно |
| `src/services/excelService.ts` | Ажилтны жагсаалт экспорт (expo-sharing) |
| `src/constants/campData.ts` | `Room`, `Employee`, `RoomWithOccupancy` төрөл |

## 3. Уншихгүй
`node_modules/`, `package-lock.json`, `assets/`, `dist/`, `.expo/`, `src/assets/employee.xlsx` (хэрэглэхгүй), `.xlsx`-ийг түүхийгээр, `docs/PRD.md`-ийг бүтнээр.
