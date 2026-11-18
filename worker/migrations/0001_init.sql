-- 0001_init: PRD §5 — 9 хүснэгт + driver_types (PRD §3 «Автобусны жолооч»).
-- Цаг: UTC ISO-8601 (TEXT). Мөр бүр updated_at. Огноо: 'YYYY-MM-DD' (TEXT).

CREATE TABLE rooms (
  room_no          TEXT PRIMARY KEY,
  block_no         INTEGER NOT NULL,
  room_type        TEXT,                       -- rooms_master.xlsx-ийн room_type (хэн байрлах ангилал)
  room_size        INTEGER NOT NULL DEFAULT 4, -- багтаамж (ор)
  allowed_shifts   TEXT,                       -- таслалаар: 'A,D'; NULL = хязгааргүй
  occupant_kind    TEXT NOT NULL DEFAULT 'үндсэн' CHECK (occupant_kind IN ('үндсэн','туслан','зочин')),
  company          TEXT,
  is_new_hire_room INTEGER NOT NULL DEFAULT 0 CHECK (is_new_hire_room IN (0,1)),
  under_repair     INTEGER NOT NULL DEFAULT 0 CHECK (under_repair IN (0,1)),
  active           INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE shift_codes (
  code         TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('үндсэн','туслан','зочин')),
  has_schedule INTEGER NOT NULL DEFAULT 0 CHECK (has_schedule IN (0,1)),
  fixed_room   TEXT,
  active       INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE shift_schedule (
  shift_code     TEXT PRIMARY KEY REFERENCES shift_codes(code),
  anchor_in_date TEXT NOT NULL,                -- нэг ирэх огноо (anchor)
  cycle_days     INTEGER NOT NULL DEFAULT 28,
  onsite_days    INTEGER NOT NULL DEFAULT 14,
  pair_code      TEXT REFERENCES shift_codes(code), -- хос ээлж (A↔D, B↔C), дүүргэлтэд
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE driver_types (
  code       TEXT PRIMARY KEY,                 -- 'UB', 'BH'
  label      TEXT NOT NULL,                    -- 'УБ жолооч'
  room_no    TEXT NOT NULL,                    -- 912 / 913
  name_base  TEXT NOT NULL,                    -- нэр: «<name_base> 1, 2, …»
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE employees (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  emp_code     TEXT,                           -- үргэлж TEXT; харьцуулахдаа эхний тэггүй (PRD §2.8)
  raw_id       TEXT,
  surname      TEXT,
  name         TEXT NOT NULL,
  job_position TEXT,
  shift_code   TEXT REFERENCES shift_codes(code), -- NULL = ээлжгүй
  phone        TEXT,
  department   TEXT,
  active       INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_employees_emp_code ON employees(emp_code);
CREATE INDEX idx_employees_name ON employees(surname, name);

CREATE TABLE stay_codes (
  code       TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  breakfast  INTEGER NOT NULL CHECK (breakfast IN (0,1)),
  lunch      INTEGER NOT NULL CHECK (lunch IN (0,1)),
  dinner     INTEGER NOT NULL CHECK (dinner IN (0,1)),
  bed_night  INTEGER NOT NULL CHECK (bed_night IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE imports (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  at         TEXT NOT NULL,
  file_name  TEXT NOT NULL,
  file_kind  TEXT NOT NULL,                    -- 'attendance' | 'shift_change'
  month      TEXT,                             -- 'YYYY-MM'
  rows       INTEGER NOT NULL DEFAULT 0,
  added      INTEGER NOT NULL DEFAULT 0,
  changed    INTEGER NOT NULL DEFAULT 0,
  skipped    INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE stays (
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  date        TEXT NOT NULL,
  room_no     TEXT,                            -- NULL = өрөөгүй
  raw_room    TEXT,
  code        TEXT NOT NULL REFERENCES stay_codes(code),
  source      TEXT NOT NULL CHECK (source IN ('импорт','ээлж солилцоо','гараар','автомат')),
  planned     INTEGER NOT NULL DEFAULT 0 CHECK (planned IN (0,1)),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (employee_id, date)
) WITHOUT ROWID;
CREATE INDEX idx_stays_date ON stays(date);
CREATE INDEX idx_stays_room_date ON stays(room_no, date);

CREATE TABLE shift_changes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('in','out','overtime')),
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  shift_code  TEXT REFERENCES shift_codes(code),
  note        TEXT,
  import_id   INTEGER REFERENCES imports(id),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_shift_changes_date ON shift_changes(date);
CREATE INDEX idx_shift_changes_employee ON shift_changes(employee_id);

CREATE TABLE change_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  device      TEXT,                            -- төхөөрөмжийн нэр
  source      TEXT NOT NULL CHECK (source IN ('app','import','автомат')),
  action      TEXT NOT NULL,
  employee_id INTEGER,                         -- FK биш: түүх ажилтан устсан ч үлдэнэ
  field       TEXT,
  old_value   TEXT,
  new_value   TEXT,
  import_id   INTEGER,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_change_log_at ON change_log(at);
CREATE INDEX idx_change_log_employee ON change_log(employee_id);
