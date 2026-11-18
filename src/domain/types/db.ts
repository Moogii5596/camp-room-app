// D1 хүснэгтүүдийн мөрийн төрөл — worker/migrations/0001_init.sql-тай 1:1 (PRD §5).
// Энэ файлыг зөвхөн A02-1 өөрчилнө. Цэвэр TS: React / D1 / fetch-ээс хамаарахгүй.
// Конвенц: boolean-ыг D1 дээр 0|1 (INTEGER) гэж хадгална. Огноо 'YYYY-MM-DD', цаг UTC ISO-8601.

export type Bit = 0 | 1;
/** 'YYYY-MM-DD' */
export type IsoDate = string;
/** UTC ISO-8601, жнь '2026-11-18T03:04:05.000Z' */
export type UtcTimestamp = string;

export type OccupantKind = 'үндсэн' | 'туслан' | 'зочин';
export type ShiftKind = OccupantKind;
export type StaySource = 'импорт' | 'ээлж солилцоо' | 'гараар' | 'автомат';
export type ChangeSource = 'app' | 'import' | 'автомат';
export type ShiftChangeKind = 'in' | 'out' | 'overtime';
export type ImportFileKind = 'attendance' | 'shift_change';

/** Өдрийн код (PRD §2.2). Тохиргооноос нэмэгдэж болох тул string-ийг зөвшөөрнө. */
export type StayCodeValue = 'R' | 'R1' | 'R2' | 'R3' | 'D1' | 'D2' | 'D3';
/** Ээлж / ангиллын код (PRD §2.5). Тохиргооноос нэмэгдэж болно. */
export type ShiftCodeValue = 'A' | 'B' | 'C' | 'D' | 'N' | 'NEW' | 'W' | 'S' | 'BUS' | 'Z';

interface Timestamped {
  updated_at: UtcTimestamp;
}

export interface RoomRow extends Timestamped {
  room_no: string;
  block_no: number;
  room_type: string | null;
  room_size: number;
  /** таслалаар: 'A,D'; null = хязгааргүй */
  allowed_shifts: string | null;
  occupant_kind: OccupantKind;
  company: string | null;
  is_new_hire_room: Bit;
  under_repair: Bit;
  active: Bit;
}

export interface ShiftCodeRow extends Timestamped {
  code: string;
  label: string;
  kind: ShiftKind;
  has_schedule: Bit;
  fixed_room: string | null;
  active: Bit;
}

export interface ShiftScheduleRow extends Timestamped {
  shift_code: string;
  anchor_in_date: IsoDate;
  cycle_days: number;
  onsite_days: number;
  /** хос ээлж (A↔D, B↔C) */
  pair_code: string | null;
}

export interface DriverTypeRow extends Timestamped {
  code: string;
  label: string;
  room_no: string;
  /** нэр: «<name_base> 1, 2, …» */
  name_base: string;
  active: Bit;
}

export interface EmployeeRow extends Timestamped {
  id: number;
  /** үргэлж TEXT (PRD §2.8) */
  emp_code: string | null;
  raw_id: string | null;
  surname: string | null;
  name: string;
  job_position: string | null;
  /** null = ээлжгүй */
  shift_code: string | null;
  phone: string | null;
  department: string | null;
  active: Bit;
}

export interface StayCodeRow extends Timestamped {
  code: string;
  label: string;
  breakfast: Bit;
  lunch: Bit;
  dinner: Bit;
  bed_night: Bit;
}

export interface ImportRow extends Timestamped {
  id: number;
  at: UtcTimestamp;
  file_name: string;
  file_kind: ImportFileKind;
  /** 'YYYY-MM' */
  month: string | null;
  rows: number;
  added: number;
  changed: number;
  skipped: number;
}

export interface StayRow extends Timestamped {
  employee_id: number;
  date: IsoDate;
  /** null = өрөөгүй */
  room_no: string | null;
  raw_room: string | null;
  code: string;
  source: StaySource;
  planned: Bit;
}

export interface ShiftChangeRow extends Timestamped {
  id: number;
  date: IsoDate;
  kind: ShiftChangeKind;
  employee_id: number;
  shift_code: string | null;
  note: string | null;
  import_id: number | null;
}

export interface ChangeLogRow extends Timestamped {
  id: number;
  at: UtcTimestamp;
  device: string | null;
  source: ChangeSource;
  action: string;
  employee_id: number | null;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  import_id: number | null;
}

/** INSERT-д ашиглах төрөл: автомат талбарууд (id, updated_at, at) нь заавал биш. */
export type NewRow<T, Auto extends keyof T = never> = Omit<T, 'updated_at' | Auto> & { updated_at?: UtcTimestamp } & Partial<Pick<T, Auto>>;
export type NewEmployee = NewRow<EmployeeRow, 'id'>;
export type NewImport = NewRow<ImportRow, 'id'>;
export type NewShiftChange = NewRow<ShiftChangeRow, 'id'>;
export type NewChangeLog = NewRow<ChangeLogRow, 'id' | 'at'>;

/** Хүснэгтийн нэр → мөрийн төрөл */
export interface DbTables {
  rooms: RoomRow;
  shift_codes: ShiftCodeRow;
  shift_schedule: ShiftScheduleRow;
  driver_types: DriverTypeRow;
  employees: EmployeeRow;
  stay_codes: StayCodeRow;
  imports: ImportRow;
  stays: StayRow;
  shift_changes: ShiftChangeRow;
  change_log: ChangeLogRow;
}
