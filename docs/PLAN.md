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
2026-11-18 (A00): Давалгаа 0 — A01-1, A02-1 `web`-д нэгтгэгдсэн (verify ногоон, local D1 migration OK). A04-1 commit хүлээгдэж байна. Дараагийнх — **давалгаа 1** (A05-1 нь A04-1 нэгтгэсний дараа; A06-1 нь PRD §2.9-ийг хэрэглэгч баталсны дараа).

**A02-1 (2026-11-18):** `worker/migrations/0001_init.sql`, `0002_seed.sql`, `src/domain/types/db.ts`, `scripts/db/gen-rooms-seed.mjs` (a02-1 салбар). Шийдвэр: PRD-д байхгүй `driver_types` хүснэгт нэмсэн; хос ээлж = `shift_schedule.pair_code`; 824/826 = `rooms.is_new_hire_room`; `allowed_shifts` BUS/W/S өрөөнд л (бусад NULL); Sino/ACCL/Мак/ИТА/Эрхэт Түнш = `үндсэн` + company (хэрэглэгч тохиргооноос засна). `wrangler.toml` A01-1-ийнх.

