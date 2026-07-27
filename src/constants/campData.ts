export interface Room {
room_no: string;
block_no: number;
room_type: string;
room_size: number;
}

export interface Employee {
id: number;
emp_code: string;
surname: string;
name: string;
job_position: string;
shift: string;
room_no: string;
}

export interface RoomWithOccupancy extends Room {
occupancy: number;
}

// Initial seed data from rooms_master.xlsx
export const INITIAL_ROOMS: Room[] = [
// Block 1
{ room_no: '101', block_no: 1, room_type: 'Эмэгтэй', room_size: 4 },
{ room_no: '102', block_no: 1, room_type: 'Эмэгтэй', room_size: 4 },
{ room_no: '103', block_no: 1, room_type: 'Эмэгтэй', room_size: 4 },
{ room_no: '104', block_no: 1, room_type: 'Эмэгтэй', room_size: 4 },
{ room_no: '105', block_no: 1, room_type: 'Эмэгтэй', room_size: 4 },
{ room_no: '106', block_no: 1, room_type: 'Эмэгтэй', room_size: 4 },
{ room_no: '107', block_no: 1, room_type: 'Эмэгтэй', room_size: 4 },
{ room_no: '108', block_no: 1, room_type: 'Эмэгтэй', room_size: 4 },
{ room_no: '109', block_no: 1, room_type: 'Эмэгтэй', room_size: 4 },
{ room_no: '110', block_no: 1, room_type: 'Эмэгтэй', room_size: 4 },
// Block 7
{ room_no: '701', block_no: 7, room_type: 'Sino', room_size: 4 },
{ room_no: '702', block_no: 7, room_type: 'Sino', room_size: 4 },
{ room_no: '703', block_no: 7, room_type: 'ACCL', room_size: 4 },
{ room_no: '704', block_no: 7, room_type: 'ACCL', room_size: 4 },
{ room_no: '705', block_no: 7, room_type: 'ИТА', room_size: 4 },
{ room_no: '706', block_no: 7, room_type: 'ИТА', room_size: 4 },
{ room_no: '712', block_no: 7, room_type: 'Sino', room_size: 4 },
{ room_no: '716', block_no: 7, room_type: 'Хамгаалагч', room_size: 4 },
{ room_no: '727', block_no: 7, room_type: 'Sino', room_size: 4 },
{ room_no: '736', block_no: 7, room_type: 'Мак Монгол', room_size: 4 },
// Block 8
{ room_no: '801', block_no: 8, room_type: 'Мак Монгол', room_size: 4 },
{ room_no: '802', block_no: 8, room_type: 'Мак Монгол', room_size: 4 },
{ room_no: '805', block_no: 8, room_type: 'Шинэ ажилтан', room_size: 4 },
{ room_no: '810', block_no: 8, room_type: 'ИТА', room_size: 4 },
{ room_no: '821', block_no: 8, room_type: 'Автобус', room_size: 4 },
// Block 9
{ room_no: '901', block_no: 9, room_type: 'Мак Хятад', room_size: 4 },
{ room_no: '902', block_no: 9, room_type: 'Мак Хятад', room_size: 4 },
{ room_no: '923', block_no: 9, room_type: 'Дугуй', room_size: 4 },
{ room_no: '924', block_no: 9, room_type: 'Дугуй', room_size: 4 },
{ room_no: '934', block_no: 9, room_type: 'Мак Монгол', room_size: 4 },
{ room_no: '945', block_no: 9, room_type: 'Эрхэт Түнш ХХК', room_size: 4 },
];

// Initial seed data from employee.xlsx
export const INITIAL_EMPLOYEES: Omit<Employee, 'id'>[] = [
{ emp_code: '14203', surname: 'Алтанцэцэг', name: 'Наранбилэг', job_position: 'Кемп менежер', shift: 'D', room_no: '101' },
{ emp_code: '10107', surname: 'Мөнхжаргал', name: 'Уянга', job_position: 'Тоо бүртгэлийн ажилтан', shift: 'A', room_no: '102' },
{ emp_code: '24212', surname: 'Шаравсамбуу', name: 'Жавзанпагма', job_position: 'Хөдөлмөрийн эрүүл ахуйч', shift: 'B', room_no: '102' },
{ emp_code: '24216', surname: 'Оргоо', name: 'Цагаанцэцэг', job_position: 'Уурхайн эмч', shift: 'B', room_no: '102' },
{ emp_code: '2129', surname: 'Өлзийбат', name: 'Анхцэцэг', job_position: 'Хүний нөөцийн ажилтан', shift: 'B', room_no: '103' },
{ emp_code: '1802', surname: 'Дорж', name: 'Батболд', job_position: 'Инженер', shift: 'A', room_no: '701' },
{ emp_code: '1803', surname: 'Бат', name: 'Ганзориг', job_position: 'Механик', shift: 'A', room_no: '701' },
{ emp_code: '1804', surname: 'Сүхбаатар', name: 'Эрдэнэ', job_position: 'Жолооч', shift: 'A', room_no: '701' },
{ emp_code: '1805', surname: 'Баатар', name: 'Төмөр', job_position: 'Оператор', shift: 'A', room_no: '701' },
{ emp_code: '1901', surname: 'Цэцэг', name: 'Болор', job_position: 'Ахлах инженер', shift: 'C', room_no: '801' },
{ emp_code: '1902', surname: 'Ганбаатар', name: 'Мөнх-Эрдэнэ', job_position: 'Мастер', shift: 'EX', room_no: 'EX' },
];