// src/assets/rooms_master.xlsx -> SQL INSERT (worker/migrations/0002_seed.sql-ийн «rooms» хэсэг).
// Хамааралгүй (xlsx сангүй): xlsx = zip, зөвхөн node:zlib ашиглана.
// Ашиглах: node scripts/db/gen-rooms-seed.mjs [xlsx] > гаралт.sql
import fs from 'node:fs';
import zlib from 'node:zlib';

function unzip(buf) {
  const files = {};
  let eocd = buf.length - 22;
  while (buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  let p = buf.readUInt32LE(eocd + 16);
  const n = buf.readUInt16LE(eocd + 10);
  for (let i = 0; i < n; i++) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const ds = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    const raw = buf.subarray(ds, ds + csize);
    files[name] = method === 0 ? raw : zlib.inflateRawSync(raw);
    p += 46 + nlen + elen + clen;
  }
  return files;
}
const unesc = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

const f = unzip(fs.readFileSync(process.argv[2] ?? 'src/assets/rooms_master.xlsx'));
const sst = [...f['xl/sharedStrings.xml'].toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
  unesc([...m[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((x) => x[1]).join('')),
);
const rows = [];
for (const r of f['xl/worksheets/sheet1.xml'].toString('utf8').matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)) {
  const o = {};
  for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const v = (c[3] || '').match(/<v>([^<]*)<\/v>/);
    if (v) o[c[1]] = /t="s"/.test(c[2]) ? sst[+v[1]] : v[1];
  }
  rows.push(o);
}
const [h, ...data] = rows;
if (h.A !== 'room_no' || h.B !== 'block_no' || h.C !== 'room_type' || h.D !== 'room_size') {
  throw new Error('rooms_master.xlsx толгой өөр байна: ' + JSON.stringify(h));
}

// room_type -> occupant_kind, allowed_shifts (PRD §2.5), company
const SUPPORT = { Автобус: 'BUS', Дугуй: 'W', Хамгаалагч: 'S' };
const COMPANY = new Set(['Sino', 'ACCL', 'Эрхэт Түнш ХХК', 'Мак Монгол', 'Мак Хятад', 'ИТА']);
const q = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

console.log('INSERT INTO rooms (room_no, block_no, room_type, room_size, allowed_shifts, occupant_kind, company, is_new_hire_room) VALUES');
console.log(
  data
    .map((r) => {
      const t = r.C;
      const kind = SUPPORT[t] ? 'туслан' : 'үндсэн';
      return `(${q(r.A)}, ${+r.B}, ${q(t)}, ${+r.D}, ${q(SUPPORT[t] ?? null)}, ${q(kind)}, ${q(COMPANY.has(t) ? t : null)}, ${t === 'Шинэ ажилтан' ? 1 : 0})`;
    })
    .join(',\n') + ';',
);
