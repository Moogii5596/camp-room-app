import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { Room, Employee, RoomWithOccupancy } from '../constants/campData';

const DB_NAME = 'camp_master_v1.db';
let db: SQLite.SQLiteDatabase;

const getDbInstance = () => {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
  }
  return db;
};

export const initDatabase = async () => {
  db = getDbInstance();

  db.execSync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS rooms (
      room_no TEXT PRIMARY KEY,
      block_no INTEGER NOT NULL,
      room_type TEXT DEFAULT 'Sino',
      room_size INTEGER DEFAULT 4
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_code TEXT,
      surname TEXT NOT NULL,
      name TEXT NOT NULL,
      job_position TEXT NOT NULL,
      shift TEXT NOT NULL,
      room_no TEXT NOT NULL,
      FOREIGN KEY (room_no) REFERENCES rooms (room_no) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_rooms_block ON rooms(block_no);
    CREATE INDEX IF NOT EXISTS idx_emp_room_shift ON employees(room_no, shift);
    CREATE INDEX IF NOT EXISTS idx_emp_search ON employees(emp_code, name, surname);
  `);

  const roomCountResult = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM rooms;');
  
  if (!roomCountResult || roomCountResult.count === 0) {
    try {
      console.log('Өгөгдлийн бааз хоосон байна. Excel файлуудаас дата уншиж байна...');

      // 1. Rooms Excel файл унших
      const roomAsset = Asset.fromModule(require('../assets/rooms_master.xlsx'));
      await roomAsset.downloadAsync();
      const roomFileUri = roomAsset.localUri || roomAsset.uri;
      const roomBase64 = await FileSystem.readAsStringAsync(roomFileUri, { encoding: FileSystem.EncodingType.Base64 });
      
      const roomWorkbook = XLSX.read(roomBase64, { type: 'base64' });
      const roomSheetName = roomWorkbook.SheetNames[0];
      const roomsData: any[] = XLSX.utils.sheet_to_json(roomWorkbook.Sheets[roomSheetName]);

      for (const r of roomsData) {
        if (r.room_no != null) {
          db.runSync(
            'INSERT OR IGNORE INTO rooms (room_no, block_no, room_type, room_size) VALUES (?, ?, ?, ?);',
            [
              String(r.room_no),
              r.block_no != null ? Number(r.block_no) : 0,
              r.room_type != null ? String(r.room_type) : 'Sino',
              r.room_size != null ? Number(r.room_size) : 4
            ]
          );
        }
      }

      db.runSync(
        'INSERT OR IGNORE INTO rooms (room_no, block_no, room_type, room_size) VALUES (?, ?, ?, ?);',
        ['EX', 0, 'System', 0]
      );

      // 2. Employees Excel файл унших
      const empAsset = Asset.fromModule(require('../assets/employee.xlsx'));
      await empAsset.downloadAsync();
      const empFileUri = empAsset.localUri || empAsset.uri;
      const empBase64 = await FileSystem.readAsStringAsync(empFileUri, { encoding: FileSystem.EncodingType.Base64 });
      
      const empWorkbook = XLSX.read(empBase64, { type: 'base64' });
      const empSheetName = empWorkbook.SheetNames[0];
      const employeesData: any[] = XLSX.utils.sheet_to_json(empWorkbook.Sheets[empSheetName]);

      for (const e of employeesData) {
        let roomNo = e.room_no != null ? String(e.room_no).trim() : 'EX';
        
        const checkRoom = db.getFirstSync<{ room_no: string }>('SELECT room_no FROM rooms WHERE room_no = ?;', [roomNo]);
        if (!checkRoom) {
          roomNo = 'EX';
        }

        db.runSync(
          'INSERT INTO employees (emp_code, surname, name, job_position, shift, room_no) VALUES (?, ?, ?, ?, ?, ?);',
          [
            e.Id != null ? String(e.Id) : (e.emp_code != null ? String(e.emp_code) : null), 
            e.surname != null ? String(e.surname) : 'Тодорхойгүй', 
            e.name != null ? String(e.name) : 'Тодорхойгүй', 
            e.job_position != null ? String(e.job_position) : 'Албан тушаалгүй', 
            e.shift != null ? String(e.shift) : 'A', 
            roomNo
          ]
        );
      }

      console.log('Excel дата амжилттай SQLite базад орлоо.');
    } catch (error) {
      console.error('Excel дата уншихад алдаа гарлаа:', error);
      throw error;
    }
  }
};

// 💡 БҮХ ДАТАГ ЦЭВЭРЛЭЭД EXCEL-ЭЭС ДАХИН ТАТАХ ФУНКЦ
export const resetDatabase = async () => {
  const database = getDbInstance();
  try {
    database.execSync(`
      PRAGMA foreign_keys = OFF;
      DELETE FROM employees;
      DELETE FROM rooms;
      PRAGMA foreign_keys = ON;
    `);
    
    // Датаг цэвэрлэсний дараа initDatabase дуудагдаж Excel-ээс анхны утгыг дахин оруулна
    await initDatabase();
  } catch (error) {
    console.error('Датаг шинэчлэхэд алдаа гарлаа:', error);
    throw error;
  }
};

export const fetchRoomsWithOccupancy = (selectedShift: string): RoomWithOccupancy[] => {
  const database = getDbInstance();
  const roomRows = (database.getAllSync('SELECT * FROM rooms ORDER BY room_no ASC;') || []) as Room[];
  const empRows = (database.getAllSync('SELECT * FROM employees;') || []) as Employee[];

  return roomRows.map((rm: Room) => {
    const occ = empRows.filter((e: Employee) => e.room_no === rm.room_no && e.shift === selectedShift).length;
    return { ...rm, occupancy: occ };
  });
};

export const fetchAllEmployees = (): Employee[] => {
  const database = getDbInstance();
  return (database.getAllSync('SELECT * FROM employees ORDER BY surname ASC;') || []) as Employee[];
};

export const addEmployee = (emp: Omit<Employee, 'id'>) => {
  const database = getDbInstance();
  database.runSync(
    'INSERT INTO employees (emp_code, surname, name, job_position, shift, room_no) VALUES (?, ?, ?, ?, ?, ?);',
    [emp.emp_code, emp.surname, emp.name, emp.job_position, emp.shift, emp.room_no]
  );
};

export const updateEmployeeRoom = (id: number, roomNo: string, shift?: string) => {
  const database = getDbInstance();
  if (shift) {
    database.runSync('UPDATE employees SET room_no = ?, shift = ? WHERE id = ?;', [roomNo, shift, id]);
  } else {
    database.runSync('UPDATE employees SET room_no = ? WHERE id = ?;', [roomNo, id]);
  }
};

export const checkoutEmployeeEX = (id: number) => {
  const database = getDbInstance();
  database.runSync('UPDATE employees SET room_no = "EX" WHERE id = ?;', [id]);
};