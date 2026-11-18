/**
 * API гэрээ (A04-1) — Worker ба вэб клиент хоёрын хуваалцах төрлүүд. Зөвхөн төрөл, runtime код алга.
 * Эх сурвалж: docs/PRD.md §4–§6. DB-ийн мөрийн төрөл → `./db.ts` (A02-1); энд DB төрлөөс хамаарахгүй
 * (DTO нь API-ийн хэлбэр). Гэрээ өөрчлөх → A00-д мэдэгдэнэ.
 *
 * Дүрэм:
 *  - Огноо `YYYY-MM-DD` (УБ-ийн хуанлийн өдөр), цаг `at` = UTC ISO-8601, UI-д УБ (UTC+8).
 *  - `emp_code` үргэлж string (TEXT); харьцуулахдаа эхний тэггүй (PRD §2.8).
 *  - Бичдэг endpoint бүр `device` авна; нэг мөрийг засдаг бол `expected_updated_at` авна.
 *    Серверийн мөр түүнээс шинэ бол **409** + `ConflictBody` (PRD §6.1). `force: true` = шинэ утгыг мэдсээр дарна.
 *  - Бичдэг endpoint бүр өгөгдөл + change_log-ийг нэг db.batch()-аар бичнэ.
 *  - Нэвтрэлтийн endpoint (A01-2) энд ороогүй; бүх `/api/*` cookie шаардана, эс бөгөөс 401.
 */

// ───────────────────────── Нийтлэг ─────────────────────────

export type IsoDate = string; // 'YYYY-MM-DD'
export type IsoMonth = string; // 'YYYY-MM'
export type IsoDateTimeUtc = string; // 'YYYY-MM-DDTHH:mm:ss.sssZ'

export type StaySource = 'импорт' | 'ээлж солилцоо' | 'гараар' | 'автомат';
export type ChangeSource = 'app' | 'import' | 'автомат';
export type OccupantKind = 'үндсэн' | 'туслан' | 'зочин';
export type ShiftChangeKind = 'in' | 'out' | 'overtime';

/** Бичдэг хүсэлт бүрийн нийтлэг талбар. */
export interface WriteMeta {
  /** Төхөөрөмжийн нэр (тохиргооноос) → change_log.device */
  device: string;
}

/** Нэг мөрийг засдаг хүсэлт. */
export interface OptimisticMeta extends WriteMeta {
  /** Клиентийн харсан `updated_at`. Серверийнх шинэ бол 409. */
  expected_updated_at: IsoDateTimeUtc | null;
  /** true = зөрчлийг мэдсээр шинэ утгаар дарна (хэрэглэгч анхааруулгыг харсны дараа). */
  force?: boolean;
}

export type ApiErrorCode =
  | 'unauthorized'
  | 'validation'
  | 'not_found'
  | 'conflict' // 409 — ConflictBody
  | 'over_capacity' // 422 — allow_over_capacity=false үед
  | 'rate_limited'
  | 'internal';

export interface ApiErrorBody {
  error: { code: Exclude<ApiErrorCode, 'conflict'>; message: string; details?: Record<string, unknown> };
}

export interface ConflictItem {
  /** Зөрчилтэй мөр: stays → employee_id+date, employees → employee_id, rooms → room_no */
  employee_id?: number;
  date?: IsoDate;
  room_no?: string;
  field: string;
  server_value: string | null;
  your_value: string | null;
  server_updated_at: IsoDateTimeUtc;
  /** Хэн/аль төхөөрөмж саяхан өөрчилсөн (change_log.device) */
  server_device: string | null;
}

/** 409 хариуны бие: UI шинэ утгыг харуулж «дарах / болих» асууна. Юу ч бичигдээгүй. */
export interface ConflictBody {
  error: { code: 'conflict'; message: string };
  conflicts: ConflictItem[];
}

export interface Page<T> {
  items: T[];
  /** Дараагийн хуудасны cursor; null = дууссан */
  next_cursor: string | null;
}

/** Бичилтийн нийтлэг хариу. */
export interface WriteResult {
  ok: true;
  /** Энэ үйлдлээр үүссэн change_log id-ууд (undo-д) */
  change_ids: number[];
  /** Шинэчлэгдсэн мөрийн updated_at (клиент кэшээ шинэчилнэ) */
  updated_at: IsoDateTimeUtc;
}

// ───────────────────────── DTO ─────────────────────────

export interface RoomDto {
  room_no: string;
  block_no: string;
  room_type: string | null;
  room_size: number; // багтаамж
  allowed_shifts: string[]; // жнь ['A','D']
  occupant_kind: OccupantKind;
  company: string | null;
  is_new_hire_room: boolean;
  under_repair: boolean;
  active: boolean;
  updated_at: IsoDateTimeUtc;
}

export type OccupancyLevel = 'сул' | 'дүүрсэн' | 'хэтэрсэн' | 'засвартай';

export interface RoomOccupant {
  employee_id: number;
  emp_code: string | null;
  surname: string;
  name: string;
  shift_code: string | null;
  code: string; // тухайн өдрийн stay код (R1, D1, …)
}

/** Самбарын өрөө: сонгосон өдөр+ээлжээр. */
export interface RoomOccupancyDto extends RoomDto {
  /** Тухайн шөнө байгаа ээлжээр тооцсон хүний тоо (PRD §6.2 дүүргэлтийн дүрэм) */
  occupied: number;
  level: OccupancyLevel;
  occupants: RoomOccupant[];
}

export interface EmployeeDto {
  id: number;
  /** Харуулах бүтэн хэлбэр (02103); ID-гүй бол null */
  emp_code: string | null;
  raw_id: string | null;
  surname: string;
  name: string;
  job_position: string | null;
  shift_code: string | null; // null = ээлжгүй
  phone: string | null;
  department: string | null;
  active: boolean;
  /** Тухайн өдрийн өрөө (хайлт/самбарт) */
  current_room_no?: string | null;
  updated_at: IsoDateTimeUtc;
}

export interface StayDto {
  employee_id: number;
  date: IsoDate;
  room_no: string | null;
  raw_room: string | null;
  code: string;
  source: StaySource;
  planned: boolean;
  updated_at: IsoDateTimeUtc;
}

/** Өдрийн код + хоол/ор хоног (stay_codes). */
export interface StayCodeDto {
  code: string;
  label: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  bed_night: number;
}

export interface ShiftCodeDto {
  code: string;
  label: string;
  kind: string;
  has_schedule: boolean;
  fixed_room: string | null;
  active: boolean;
}

export interface ShiftScheduleDto {
  shift_code: string;
  anchor_in_date: IsoDate;
  cycle_days: number; // 28
  onsite_days: number; // 14
}

export interface DriverTypeDto {
  id: number;
  label: string; // УБ, Баянхонгор
  room_no: string; // 912, 913
  active: boolean;
}

export interface ChangeLogDto {
  id: number;
  at: IsoDateTimeUtc;
  device: string | null;
  source: ChangeSource;
  action: string;
  employee_id: number | null;
  employee_label: string | null; // «02103 Овог Нэр» — харуулахад
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  import_id: number | null;
  /** Буцаагдсан эсэх (буцаалт ч түүхэнд мөр болно) */
  undone: boolean;
}

export interface ImportDto {
  id: number;
  at: IsoDateTimeUtc;
  file_name: string;
  file_kind: ImportFileKind;
  month: IsoMonth | null;
  rows: number;
  added: number;
  changed: number;
  skipped: number;
  undone: boolean;
}

// ───────────────────────── Өрөө ─────────────────────────

/** GET /api/rooms?date&shift_code&block_no — самбар (анхны date = өнөөдөр) */
export interface ListRoomsQuery {
  date?: IsoDate;
  shift_code?: string;
  block_no?: string;
}
export interface ListRoomsResponse {
  date: IsoDate;
  rooms: RoomOccupancyDto[];
  /** Өдрийн хоол, ор хоног (PRD §6 #2) */
  totals: { breakfast: number; lunch: number; dinner: number; bed_night: number; occupied: number; capacity: number };
}

/** GET /api/rooms/:room_no?date */
export interface GetRoomResponse {
  room: RoomOccupancyDto;
}

/** PATCH /api/rooms/:room_no — өрөөний тохиргоо (PRD §6.2) */
export interface UpdateRoomRequest extends OptimisticMeta {
  room_size?: number;
  allowed_shifts?: string[];
  under_repair?: boolean;
  occupant_kind?: OccupantKind;
  company?: string | null;
  is_new_hire_room?: boolean;
  active?: boolean;
}
export interface UpdateRoomResponse extends WriteResult {
  room: RoomDto;
}

/** GET /api/rooms/suggest?employee_id=&kind=&shift_code=&date= — өрөө санал болгох (засвартай/дүүрсэнийг оруулахгүй) */
export interface SuggestRoomsQuery {
  date: IsoDate;
  /** Бүртгэлтэй ажилтан эсвэл (шинэ ажилтны) ээлж/төрөл */
  employee_id?: number;
  shift_code?: string;
  new_hire?: boolean;
}
export interface SuggestRoomsResponse {
  rooms: Array<{ room_no: string; free_beds: number; block_no: string }>;
}

// ───────────────────────── Ажилтан ─────────────────────────

/** GET /api/employees?q&room_no&shift_code&active&limit&cursor — ухаалгай хайлт (ID/нэр/өрөө) */
export interface ListEmployeesQuery {
  q?: string;
  room_no?: string;
  shift_code?: string;
  active?: boolean;
  date?: IsoDate; // current_room_no-г энэ өдрөөр
  limit?: number;
  cursor?: string;
}
export type ListEmployeesResponse = Page<EmployeeDto>;

/** POST /api/employees/lookup — олон ID буулгаж олох (Viber/Excel). Эхний тэггүй тулгана. */
export interface LookupEmployeesRequest {
  /** Түүхий мөрүүд (ID эсвэл «овог нэр») */
  tokens: string[];
}
export interface LookupEmployeesResponse {
  found: Array<{ token: string; employee: EmployeeDto }>;
  not_found: string[];
  /** Нэг token олон хүнтэй таарсан */
  ambiguous: Array<{ token: string; candidates: EmployeeDto[] }>;
}

/** GET /api/employees/:id */
export interface GetEmployeeResponse {
  employee: EmployeeDto;
}

/** POST /api/employees — ID-гүй шинэ ажилтан боломжтой. */
export interface CreateEmployeeRequest extends WriteMeta {
  emp_code?: string | null;
  surname: string;
  name: string;
  job_position?: string | null;
  shift_code?: string | null;
  phone?: string | null;
  department?: string | null;
}
export interface CreateEmployeeResponse extends WriteResult {
  employee: EmployeeDto;
}

/** PATCH /api/employees/:id */
export interface UpdateEmployeeRequest extends OptimisticMeta {
  emp_code?: string | null;
  surname?: string;
  name?: string;
  job_position?: string | null;
  shift_code?: string | null;
  phone?: string | null;
  department?: string | null;
  active?: boolean;
}
export interface UpdateEmployeeResponse extends WriteResult {
  employee: EmployeeDto;
}

/** GET /api/employees/unassigned?date — «Өрөөгүй ажилтан» */
export interface UnassignedQuery {
  date: IsoDate;
}
export interface UnassignedResponse {
  employees: EmployeeDto[];
}

/** GET /api/contractors?date — туслан гүйцэтгэгч (W, S) компаниар бүлэглэсэн */
export interface ContractorsQuery {
  date: IsoDate;
}
export interface ContractorsResponse {
  companies: Array<{ company: string; employees: EmployeeDto[]; rooms: string[] }>;
}

// ───────────────────────── Stays ─────────────────────────

/** GET /api/employees/:id/stays?month=YYYY-MM — сарын харагдац */
export interface GetStaysQuery {
  month: IsoMonth;
}
export interface GetStaysResponse {
  employee: EmployeeDto;
  stays: StayDto[];
  /** Сарын код/хоол/ор хоногийн дүн */
  totals: { breakfast: number; lunch: number; dinner: number; bed_night: number; by_code: Record<string, number> };
}

/**
 * PUT /api/employees/:id/stays — өдрийн код засах (PRD §6 #8). source='гараар' болно.
 * `code: null` = өдрийг хоосон болгох (мөр устна).
 */
export interface SetStaysRequest extends OptimisticMeta {
  days: Array<{
    date: IsoDate;
    code: string | null;
    room_no?: string | null;
    /** Энэ өдрийн клиентийн харсан updated_at (өдөр бүрээр шалгана) */
    expected_updated_at?: IsoDateTimeUtc | null;
  }>;
}
export interface SetStaysResponse extends WriteResult {
  stays: StayDto[];
}

/** Нэг ажилтны ирэлт/явалт (бөөнөөр = employees олон). */
export interface MovementEmployee {
  employee_id: number;
  /** Өрөө (ирэлтэд). Хоосон → саналаар/«Өрөөгүй» */
  room_no?: string | null;
  /** Өдөр өөрийн ээлжээс өөр код (R1/R2/R3, D1/D2/D3) */
  code?: string;
  expected_updated_at?: IsoDateTimeUtc | null;
}

/** POST /api/stays/arrivals — ээлжийн бусаар ирсэн (бөөнөөр). R-ийг автоматаар бөглөнө. */
export interface BulkArrivalRequest extends WriteMeta {
  date: IsoDate;
  /** Ирэх өдрийн хоолны цагаар код: R1 | R2 | R3 */
  code: 'R1' | 'R2' | 'R3';
  employees: MovementEmployee[];
  /** Дүүрсэн өрөөнд ч оноох (анхааруулга харсны дараа) */
  allow_over_capacity?: boolean;
  force?: boolean;
}
export interface MovementResult {
  employee_id: number;
  ok: boolean;
  /** ok=false шалтгаан; зарим нь бусдыг тасалдуулахгүй (хэсэгчлэн амжилттай) */
  reason?: 'conflict' | 'over_capacity' | 'not_found' | 'validation';
  stays_written?: number;
}
export interface BulkMovementResponse extends WriteResult {
  results: MovementResult[];
  /** Дүүрсэн өрөөний анхааруулга (UI toast) */
  warnings: Array<{ room_no: string; occupied: number; capacity: number }>;
}

/** POST /api/stays/departures — ээлжийн бусаар явсан (бөөнөөр). Хойших R-ийг хасна (гараар зассанг дарахгүй). */
export interface BulkDepartureRequest extends WriteMeta {
  date: IsoDate;
  /** D1 | D2 | D3 */
  code: 'D1' | 'D2' | 'D3';
  employees: MovementEmployee[];
  force?: boolean;
}
// Хариу: BulkMovementResponse

/** POST /api/stays/room-move — өрөө солих: from_date-аас хойших stays.room_no (өмнөх өдрүүд хэвээр). */
export interface RoomMoveRequest extends OptimisticMeta {
  employee_id: number;
  new_room_no: string;
  from_date: IsoDate;
  allow_over_capacity?: boolean;
}
export interface RoomMoveResponse extends WriteResult {
  stays_changed: number;
  /** Дүүрсэн бол анхааруулга; allow_over_capacity=false үед 422 over_capacity */
  warning?: { room_no: string; occupied: number; capacity: number };
}

// ───────────────────────── Импорт ─────────────────────────

export type ImportFileKind = 'attendance' | 'shiftchange';

/** Браузерт SheetJS-ээр уншиж, §2.8-аар хэвшүүлсэн ирцийн мөр. */
export interface ParsedAttendanceRow {
  src_row: number;
  room_no: string | null;
  shift_code: string | null;
  emp_code: string | null; // хэвшүүлсэн, null = ID-гүй
  raw_id: string | null;
  surname: string;
  name: string;
  job_position: string | null;
  /** date → түүхий код (хоосон өдөр оруулахгүй) */
  days: Record<IsoDate, string>;
  /** Файлын сүүлийн мөрийн нийт ор хоног зэрэг (тулгалтад) */
  raw_room: string | null;
}

export interface ParsedShiftChangeRow {
  src_row: number;
  shift_code: string | null;
  emp_code: string | null;
  raw_id: string | null;
  surname: string;
  name: string;
  job_position: string | null;
  phone: string | null;
  department: string | null;
  note: string; // R1..R3 | D1..D3 | OVERTIME
  date: IsoDate;
  room_no: string | null;
}

export type ImportRowStatus = 'шинэ' | 'өөрчлөгдсөн' | 'өөрчлөлтгүй' | 'зөрчилтэй';

export type ImportConflictKind =
  | 'unknown_code' // танигдаагүй код
  | 'duplicate_id' // нэг ID хоёр өөр нэртэй
  | 'manual_edit_differs' // гараар зассан өдөртэй зөрсөн
  | 'unknown_room'; // rooms-д байхгүй (автоматаар нэмэх санал)

export interface ImportConflict {
  src_row: number;
  kind: ImportConflictKind;
  message: string;
  date?: IsoDate;
  employee_id?: number;
  /** Нэг мөрөнд хамаарах хэд хэдэн мөр (duplicate_id) */
  related_rows?: number[];
}

/** Зөрчлийг баталгаажуулахдаа хэрэглэгчийн шийдвэр. */
export type ImportResolution =
  | { src_row: number; action: 'skip' }
  | { src_row: number; action: 'overwrite' } // гараар зассаныг дарна
  | { src_row: number; action: 'keep' }
  | { src_row: number; action: 'edit'; patch: Partial<ParsedAttendanceRow & ParsedShiftChangeRow> }
  | { src_row: number; action: 'add_room' };

export interface ImportDiffRow {
  src_row: number;
  status: ImportRowStatus;
  employee_id: number | null; // null = шинэ ажилтан
  label: string;
  /** Өөрчлөгдсөн өдрүүд (ирц) */
  changed_dates?: Array<{ date: IsoDate; old: string | null; new: string | null }>;
}

/** POST /api/import/dry-run — юу ч бичихгүй. */
export interface ImportDryRunRequest {
  file_name: string;
  file_kind: ImportFileKind;
  month: IsoMonth | null; // ирцэд
  attendance_rows?: ParsedAttendanceRow[];
  shiftchange_rows?: ParsedShiftChangeRow[];
}
export interface ImportDryRunResponse {
  file_kind: ImportFileKind;
  month: IsoMonth | null;
  summary: { rows: number; added: number; changed: number; unchanged: number; conflicts: number };
  diff: ImportDiffRow[];
  conflicts: ImportConflict[];
  /** Хазайсан өрөөний анхааруулга (A+D / B+C-ээс өөр) */
  warnings: string[];
}

/** POST /api/import/commit — dry-run-ийн мөрүүд + шийдвэр. Нэг db.batch(); imports мөр + change_log (source='import'). */
export interface ImportCommitRequest extends WriteMeta, ImportDryRunRequest {
  resolutions: ImportResolution[];
}
export interface ImportCommitResponse {
  ok: true;
  import_id: number;
  added: number;
  changed: number;
  skipped: number;
  /** Ээлж солилцоо: өмнөх импортоос сунгагдсан, одоо явах/OVERTIME-д байхгүй ажилтнууд (шийдвэр асуух) */
  pending_overtime_decisions: Array<{ employee_id: number; label: string; since: IsoDate }>;
  /** Ээлж солилцоо: жолоочийн тоо асуух эсэх */
  ask_drivers: boolean;
}

/** POST /api/import/overtime-decisions — дахин сунгах / буух */
export interface OvertimeDecisionsRequest extends WriteMeta {
  decisions: Array<{ employee_id: number; decision: 'extend' | 'leave'; until?: IsoDate }>;
}
// Хариу: WriteResult

/** POST /api/import/drivers — жолоочийн тоо (УБ 912, Баянхонгор 913): ирсэн өдөр R1, маргааш D1 */
export interface DriversRequest extends WriteMeta {
  date: IsoDate;
  counts: Array<{ driver_type_id: number; count: number }>;
}
// Хариу: WriteResult

/** GET /api/imports */
export type ListImportsResponse = { imports: ImportDto[] };

// ───────────────────────── Ээлж солих өдрийн самбар ─────────────────────────

/** GET /api/shift-day?date — Лхагвад нэг дэлгэцэнд (PRD §6.2) */
export interface ShiftDayQuery {
  date: IsoDate;
}
export interface ShiftDayResponse {
  date: IsoDate;
  arriving_today: EmployeeDto[];
  leaving_tomorrow: EmployeeDto[];
  extended: EmployeeDto[]; // сунгасан — шийдвэр хүлээж буй
  drivers: Array<{ driver_type: DriverTypeDto; count: number }>;
  unassigned: EmployeeDto[];
  freed_rooms: Array<{ room_no: string; free_beds: number }>;
}

// ───────────────────────── Түүх, undo ─────────────────────────

/** GET /api/history?from&to&employee_id&import_id&cursor&limit */
export interface HistoryQuery {
  from?: IsoDate;
  to?: IsoDate;
  employee_id?: number;
  import_id?: number;
  source?: ChangeSource;
  limit?: number;
  cursor?: string;
}
export type HistoryResponse = Page<ChangeLogDto>;

/**
 * POST /api/undo — сүүлийн засвар (change_id) эсвэл бүхэл импорт (import_id). Яг нэгийг өгнө.
 * Буцаалт өөрөө change_log-д мөр бичнэ. Буцаах мөр хойно өөрчлөгдсөн бол 409 (ConflictBody).
 */
export type UndoRequest = WriteMeta & ({ change_id: number; import_id?: never } | { import_id: number; change_id?: never }) & {
  force?: boolean;
};
export interface UndoResponse extends WriteResult {
  reverted: number; // буцаасан мөрийн тоо
}

// ───────────────────────── Тохиргоо ─────────────────────────

/** GET /api/settings — бүх тохиргоо нэг дор (төхөөрөмжийн нэр клиентэд хадгалагдана). */
export interface SettingsResponse {
  shift_codes: ShiftCodeDto[];
  shift_schedule: ShiftScheduleDto[];
  stay_codes: StayCodeDto[];
  driver_types: DriverTypeDto[];
  /** Шинэ ажилтны өрөөнүүд (824, 826) — rooms.is_new_hire_room */
  new_hire_rooms: string[];
}

/** PUT /api/settings/shift-schedule/:shift_code */
export interface UpdateShiftScheduleRequest extends WriteMeta {
  anchor_in_date: IsoDate;
  cycle_days: number;
  onsite_days: number;
  /** true → гараар зассан өдрийг хэвээр үлдээж ирээдүйн автомат мөрийг дахин бодно */
  recompute_future?: boolean;
}
/** PUT /api/settings/shift-codes/:code */
export interface UpdateShiftCodeRequest extends WriteMeta {
  label?: string;
  kind?: string;
  has_schedule?: boolean;
  fixed_room?: string | null;
  active?: boolean;
}
/** PUT /api/settings/stay-codes/:code */
export interface UpdateStayCodeRequest extends WriteMeta {
  label?: string;
  breakfast?: number;
  lunch?: number;
  dinner?: number;
  bed_night?: number;
}
/** PUT /api/settings/driver-types/:id */
export interface UpdateDriverTypeRequest extends WriteMeta {
  label?: string;
  room_no?: string;
  active?: boolean;
}
// Settings PUT-ийн хариу: WriteResult

// ───────────────────────── Тайлан (JSON; .xlsx-ийг браузер бичнэ) ─────────────────────────

/** GET /api/reports/attendance?month — «Ирц» хуудас (эх файлтай ижил бүтэц) */
export interface AttendanceReportResponse {
  month: IsoMonth;
  rows: Array<{
    room_no: string | null;
    shift_code: string | null;
    emp_code: string | null;
    surname: string;
    name: string;
    job_position: string | null;
    days: Record<IsoDate, string>;
    code_counts: Record<string, number>;
    bed_nights: number;
    breakfast: number;
    lunch: number;
    dinner: number;
  }>;
}

/** GET /api/reports/changes?from&to — «Өөрчлөлт» хуудас */
export interface ChangesReportResponse {
  from: IsoDate;
  to: IsoDate;
  rows: ChangeLogDto[];
}

/** GET /api/reports/summary?from&to — «Хураангуй»; сарын хоол ч эндээс (PRD §6.2) */
export interface SummaryReportResponse {
  from: IsoDate;
  to: IsoDate;
  days: Array<{
    date: IsoDate;
    code_counts: Record<string, number>;
    shift_counts: Record<string, number>;
    bed_nights: number;
    breakfast: number;
    lunch: number;
    dinner: number;
  }>;
  totals: { bed_nights: number; breakfast: number; lunch: number; dinner: number };
}

// ───────────────────────── Офлайн синк (PRD §6 #14) ─────────────────────────

/** Офлайн дараалал дахь нэг засвар = дээрх бичдэг endpoint-ийн нэг дуудлага. */
export type SyncOp = {
  /** Клиентийн local id (хариуг тааруулах) */
  op_id: string;
  /** Дарааллын үед засвар хийсэн цаг (УТС); change_log.at биш, зөвхөн мэдээлэл */
  queued_at: IsoDateTimeUtc;
} & (
  | { route: 'PATCH /api/employees/:id'; params: { id: number }; body: UpdateEmployeeRequest }
  | { route: 'POST /api/employees'; body: CreateEmployeeRequest }
  | { route: 'PUT /api/employees/:id/stays'; params: { id: number }; body: SetStaysRequest }
  | { route: 'POST /api/stays/arrivals'; body: BulkArrivalRequest }
  | { route: 'POST /api/stays/departures'; body: BulkDepartureRequest }
  | { route: 'POST /api/stays/room-move'; body: RoomMoveRequest }
);

/** POST /api/sync — дарааллыг дарааллаар нь оруулна; op бүр тусдаа (нэг нь 409 бол бусад үргэлжилнэ). Импорт офлайн ✖. */
export interface SyncRequest extends WriteMeta {
  ops: SyncOp[];
}
export interface SyncOpResult {
  op_id: string;
  status: 'ok' | 'conflict' | 'error';
  conflict?: ConflictBody;
  error?: ApiErrorBody['error'];
  result?: WriteResult;
}
export interface SyncResponse {
  results: SyncOpResult[];
}

// ───────────────────────── Endpoint-ийн бүртгэл ─────────────────────────

/**
 * Бүх endpoint: `'METHOD /зам'` → { query?, body?, res }. Клиент/Worker энэхүү map-аар төрөл авна.
 * Алдааны хариу: 400/401/404/422/429/500 → ApiErrorBody; 409 → ConflictBody (бичдэг endpoint бүрт).
 */
export interface ApiRoutes {
  'GET /api/rooms': { query: ListRoomsQuery; res: ListRoomsResponse };
  'GET /api/rooms/suggest': { query: SuggestRoomsQuery; res: SuggestRoomsResponse };
  'GET /api/rooms/:room_no': { query: { date?: IsoDate }; res: GetRoomResponse };
  'PATCH /api/rooms/:room_no': { body: UpdateRoomRequest; res: UpdateRoomResponse };

  'GET /api/employees': { query: ListEmployeesQuery; res: ListEmployeesResponse };
  'POST /api/employees': { body: CreateEmployeeRequest; res: CreateEmployeeResponse };
  'POST /api/employees/lookup': { body: LookupEmployeesRequest; res: LookupEmployeesResponse };
  'GET /api/employees/unassigned': { query: UnassignedQuery; res: UnassignedResponse };
  'GET /api/employees/:id': { res: GetEmployeeResponse };
  'PATCH /api/employees/:id': { body: UpdateEmployeeRequest; res: UpdateEmployeeResponse };
  'GET /api/contractors': { query: ContractorsQuery; res: ContractorsResponse };

  'GET /api/employees/:id/stays': { query: GetStaysQuery; res: GetStaysResponse };
  'PUT /api/employees/:id/stays': { body: SetStaysRequest; res: SetStaysResponse };
  'POST /api/stays/arrivals': { body: BulkArrivalRequest; res: BulkMovementResponse };
  'POST /api/stays/departures': { body: BulkDepartureRequest; res: BulkMovementResponse };
  'POST /api/stays/room-move': { body: RoomMoveRequest; res: RoomMoveResponse };

  'POST /api/import/dry-run': { body: ImportDryRunRequest; res: ImportDryRunResponse };
  'POST /api/import/commit': { body: ImportCommitRequest; res: ImportCommitResponse };
  'POST /api/import/overtime-decisions': { body: OvertimeDecisionsRequest; res: WriteResult };
  'POST /api/import/drivers': { body: DriversRequest; res: WriteResult };
  'GET /api/imports': { res: ListImportsResponse };

  'GET /api/shift-day': { query: ShiftDayQuery; res: ShiftDayResponse };

  'GET /api/history': { query: HistoryQuery; res: HistoryResponse };
  'POST /api/undo': { body: UndoRequest; res: UndoResponse };

  'GET /api/settings': { res: SettingsResponse };
  'PUT /api/settings/shift-schedule/:shift_code': { body: UpdateShiftScheduleRequest; res: WriteResult };
  'PUT /api/settings/shift-codes/:code': { body: UpdateShiftCodeRequest; res: WriteResult };
  'PUT /api/settings/stay-codes/:code': { body: UpdateStayCodeRequest; res: WriteResult };
  'PUT /api/settings/driver-types/:id': { body: UpdateDriverTypeRequest; res: WriteResult };

  'GET /api/reports/attendance': { query: { month: IsoMonth }; res: AttendanceReportResponse };
  'GET /api/reports/changes': { query: { from: IsoDate; to: IsoDate }; res: ChangesReportResponse };
  'GET /api/reports/summary': { query: { from: IsoDate; to: IsoDate }; res: SummaryReportResponse };

  'POST /api/sync': { body: SyncRequest; res: SyncResponse };
}

export type ApiRoute = keyof ApiRoutes;
