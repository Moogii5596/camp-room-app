import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { fetchAllEmployees } from './database';

export const exportEmployeesToExcel = async () => {
try {
const employees = fetchAllEmployees();

const exportData = employees.map((e) => ({
  'Код / ID': e.emp_code || '-',
  'Овог': e.surname || '',
  'Нэр': e.name || '',
  'Албан тушаал': e.job_position || '',
  'Ээлж': e.shift || '',
  'Өрөөний No': e.room_no || '',
  'Төлөв': e.room_no === 'EX' ? 'Кемпээс буусан' : 'Байрлаж байгаа',
}));

const worksheet = XLSX.utils.json_to_sheet(exportData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Кемп_Бүртгэл');

const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
const fsAny = FileSystem as any;
const dir = fsAny.documentDirectory || fsAny.cacheDirectory || '';
const filename = dir + 'Camp_Report_' + new Date().toISOString().slice(0, 10) + '.xlsx';

await FileSystem.writeAsStringAsync(filename, base64, {
  encoding: FileSystem.EncodingType.Base64,
});

if (await Sharing.isAvailableAsync()) {
  await Sharing.shareAsync(filename, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Кемпийн өрөөний тайлан экспортлох',
  });
}


} catch (error) {
console.error('Excel Export Error:', error);
}
};