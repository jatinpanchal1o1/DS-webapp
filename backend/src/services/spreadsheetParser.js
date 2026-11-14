import { inflateRawSync } from 'node:zlib';

function zipEntries(buffer) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65558); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Invalid XLSX archive');
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    const localName = buffer.readUInt16LE(localOffset + 26);
    const localExtra = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localName + localExtra;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null;
    if (data) files.set(name, data.toString('utf8'));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function xmlText(value) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}
function columnIndex(reference) {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() || 'A';
  return [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
}

export function parseXlsx(buffer) {
  const files = zipEntries(buffer);
  const sheetPath = [...files.keys()].find(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  if (!sheetPath) throw new Error('No worksheet found in XLSX file');
  const shared = files.get('xl/sharedStrings.xml') || '';
  const strings = [...shared.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(match => xmlText([...match[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(x => x[1]).join('')));
  const xml = files.get(sheetPath);
  const rows = [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map(match => {
    const cells = [];
    for (const cell of match[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const ref = cell[1].match(/\br="([A-Z]+\d+)"/i)?.[1] || 'A1';
      const type = cell[1].match(/\bt="([^"]+)"/)?.[1];
      const value = cell[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
      const inline = [...cell[2].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(x => x[1]).join('');
      let text = type === 's' ? strings[Number(value)] ?? '' : type === 'inlineStr' ? xmlText(inline) : value === undefined ? '' : xmlText(value);
      cells[columnIndex(ref)] = text;
    }
    return cells;
  });
  if (rows.length < 2) return [];
  const headers = rows.shift().map(value => String(value || '').trim());
  return rows.filter(row => row.some(value => String(value ?? '').trim())).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

export function parseMultipart(buffer, contentType) {
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.slice(1).find(Boolean);
  if (!boundary) throw new Error('Multipart boundary is missing');
  const raw = buffer.toString('latin1');
  const parts = raw.split(`--${boundary}`);
  const fields = {};
  let file = null;
  for (const part of parts) {
    const split = part.indexOf('\r\n\r\n');
    if (split < 0) continue;
    const headers = part.slice(0, split);
    let body = part.slice(split + 4).replace(/\r\n--?\s*$/, '').replace(/\r\n$/, '');
    const disposition = headers.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] || '';
    const name = disposition.match(/name="([^"]+)"/)?.[1];
    const filename = disposition.match(/filename="([^"]*)"/)?.[1];
    if (!name) continue;
    if (filename) file = { originalname: filename, buffer: Buffer.from(body, 'latin1') };
    else fields[name] = Buffer.from(body, 'latin1').toString('utf8');
  }
  return { fields, file };
}
