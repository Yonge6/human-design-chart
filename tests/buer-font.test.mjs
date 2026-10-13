import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync } from 'node:zlib';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(resolve(root, path));

function sfntTables(font) {
  assert.equal(font.readUInt32BE(0), 0x00010000, 'The .ttf must be a real TrueType font');
  const tables = new Map();
  for (let i = 0; i < font.readUInt16BE(4); i++) {
    const record = 12 + i * 16, offset = font.readUInt32BE(record + 8), length = font.readUInt32BE(record + 12);
    assert.ok(offset + length <= font.length, 'SFNT table must fit the actual font');
    tables.set(font.toString('ascii', record, record + 4), font.subarray(offset, offset + length));
  }
  return tables;
}

function woff2Tables(font) {
  assert.equal(font.toString('ascii', 0, 4), 'wOF2');
  assert.equal(font.readUInt32BE(4), 0x00010000, 'WOFF2 must contain the same TrueType flavor');
  assert.equal(font.readUInt32BE(8), font.length, 'WOFF2 header length must match the file');
  const knownTags = ['cmap','head','hhea','hmtx','maxp','name','OS/2','post','cvt ','fpgm','glyf','loca','prep','CFF ','VORG','EBDT','EBLC','gasp','hdmx','kern','LTSH','PCLT','VDMX','vhea','vmtx','BASE','GDEF','GPOS','GSUB','EBSC','JSTF','MATH','CBDT','CBLC','COLR','CPAL','SVG ','sbix','acnt','avar','bdat','bloc','bsln','cvar','fdsc','feat','fmtx','fvar','gvar','hsty','just','lcar','mort','morx','opbd','prop','trak','Zapf','Silf','Glat','Gloc','Feat','Sill'];
  let cursor = 48;
  const base128 = () => {
    let value = 0;
    for (let i = 0; i < 5; i++) {
      const byte = font[cursor++];
      assert.ok(byte !== undefined && !(i === 0 && byte === 0x80) && !(value & 0xfe000000), 'Valid UIntBase128 required');
      value = value * 128 + (byte & 0x7f);
      if (!(byte & 0x80)) return value;
    }
    assert.fail('Invalid WOFF2 UIntBase128');
  };
  const directory = [];
  for (let i = 0; i < font.readUInt16BE(12); i++) {
    const flags = font[cursor++], index = flags & 0x3f, version = flags >> 6;
    const tag = index === 63 ? font.toString('ascii', cursor, cursor += 4) : knownTags[index];
    const originalLength = base128();
    const transformed = ['glyf', 'loca'].includes(tag) ? version !== 3 : version !== 0;
    directory.push({ tag, transformed, length: transformed ? base128() : originalLength });
  }
  const data = brotliDecompressSync(font.subarray(cursor, cursor + font.readUInt32BE(20)));
  const tables = new Map();
  let offset = 0;
  for (const entry of directory) {
    assert.ok(offset + entry.length <= data.length, 'WOFF2 table must fit the decompressed stream');
    // cmap and fvar have no glyph transform, so they can be checked directly.
    if (['cmap', 'fvar', 'name'].includes(entry.tag)) assert.equal(entry.transformed, false);
    tables.set(entry.tag, data.subarray(offset, offset + entry.length));
    offset += entry.length;
  }
  assert.equal(offset, data.length);
  return tables;
}

function weightAxes(tables) {
  const table = tables.get('fvar');
  assert.ok(table, 'The font must retain actual variable-font axes, not synthetic CSS weights');
  const start = table.readUInt16BE(4), count = table.readUInt16BE(8), size = table.readUInt16BE(10);
  return Array.from({ length: count }, (_, i) => {
    const offset = start + i * size;
    return { tag: table.toString('ascii', offset, offset + 4), min: table.readInt32BE(offset + 4) / 65536,
      default: table.readInt32BE(offset + 8) / 65536, max: table.readInt32BE(offset + 12) / 65536 };
  });
}

function unicodeCmap(tables) {
  const table = tables.get('cmap'), result = new Map();
  assert.ok(table, 'Font must expose its real Unicode cmap');
  for (let i = 0; i < table.readUInt16BE(2); i++) {
    const record = 4 + i * 8, platform = table.readUInt16BE(record), encoding = table.readUInt16BE(record + 2);
    if (!(platform === 0 || platform === 3 && [1, 10].includes(encoding))) continue;
    const data = table.subarray(table.readUInt32BE(record + 4)), format = data.readUInt16BE(0);
    if (format === 12) {
      for (let group = 0; group < data.readUInt32BE(12); group++) {
        const offset = 16 + group * 12, start = data.readUInt32BE(offset), end = data.readUInt32BE(offset + 4), glyph = data.readUInt32BE(offset + 8);
        for (let code = start; code <= end; code++) if (glyph + code - start) result.set(code, glyph + code - start);
      }
    } else if (format === 4) {
      const segments = data.readUInt16BE(6) / 2, startBase = 16 + segments * 2, deltaBase = 16 + segments * 4, rangeBase = 16 + segments * 6;
      for (let segment = 0; segment < segments; segment++) {
        const start = data.readUInt16BE(startBase + segment * 2), end = data.readUInt16BE(14 + segment * 2), delta = data.readInt16BE(deltaBase + segment * 2), range = data.readUInt16BE(rangeBase + segment * 2);
        for (let code = start; code <= end && code !== 0xffff; code++) {
          let glyph = range ? data.readUInt16BE(rangeBase + segment * 2 + range + (code - start) * 2) : code;
          if (glyph) { glyph = (glyph + delta) & 0xffff; if (glyph) result.set(code, glyph); }
        }
      }
    }
  }
  assert.ok(result.size > 3755, 'The UI font must cover more than the previous small title subset');
  return result;
}

const ttfBytes = read('assets/fonts/buer-serif-ui.ttf'), woffBytes = read('assets/fonts/buer-serif-ui.woff2');
const ttf = sfntTables(ttfBytes), woff = woff2Tables(woffBytes), cmap = unicodeCmap(ttf);

test('Buer Serif keeps genuine variable weights 200–900 in both TTF and WOFF2', () => {
  assert.deepEqual(weightAxes(ttf), [{ tag: 'wght', min: 200, default: 200, max: 900 }]);
  assert.deepEqual(weightAxes(woff), weightAxes(ttf));
  assert.equal(woffBytes.readUInt16BE(12), ttfBytes.readUInt16BE(4));
  assert.deepEqual(unicodeCmap(woff), cmap, 'The compressed web font must retain the exact TTF Unicode mappings');
  assert.deepEqual(woff.get('name'), ttf.get('name'), 'Compression must preserve names and copyright metadata');
});

test('every static Chinese UI character and GB2312 level-one nickname character has a real glyph', () => {
  const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(resolve(directory, entry.name)) : entry.name.endsWith('.js') ? [resolve(directory, entry.name)] : []);
  const files = [...readdirSync(root).filter(name => /\.(?:html|js)$/.test(name)).map(name => resolve(root, name)), ...walk(resolve(root, 'src'))];
  const required = new Set();
  for (const file of files) for (const char of readFileSync(file, 'utf8')) if (/\p{Script=Han}|[\u3000-\u303f\uff00-\uffef]/u.test(char)) required.add(char.codePointAt(0));
  assert.ok(required.size > 1100, 'Coverage must include the full static UI, not one screenshot title');
  const decoder = new TextDecoder('gb18030', { fatal: true }), common = new Set();
  for (let lead = 0xb0; lead <= 0xd7; lead++) for (let trail = 0xa1; trail <= (lead === 0xd7 ? 0xf9 : 0xfe); trail++) common.add(decoder.decode(Uint8Array.of(lead, trail)).codePointAt(0));
  assert.equal(common.size, 3755);
  for (const code of common) required.add(code);
  const missing = [...required].filter(code => !cmap.has(code));
  assert.deepEqual(missing.map(code => String.fromCodePoint(code)), [], 'Static UI and common nickname characters must never fall back one character at a time');
  for (const char of '，积累属') assert.ok(cmap.has(char.codePointAt(0)), `The device-reported missing character ${char} must be present`);
});

test('the shared stylesheet uses compressed variable-font weights matching actual metadata and preserves attribution', () => {
  const css = read('buer-paper.css').toString(), face = css.match(/@font-face\s*\{([^}]*)\}/)?.[1];
  assert.ok(face);
  assert.match(face, /font-family:\s*"Buer Serif"/);
  assert.match(face, /src:\s*url\("assets\/fonts\/buer-serif-ui\.woff2"\)\s*format\("woff2"\)/);
  const declared = face.match(/font-weight:\s*(\d+)\s+(\d+)/);
  assert.ok(declared, 'CSS must declare the real variable range');
  const weight = weightAxes(woff).find(axis => axis.tag === 'wght');
  assert.deepEqual(declared.slice(1).map(Number), [weight.min, weight.max]);
  const license = read('assets/fonts/buer-serif-OFL.txt').toString(), notice = read('THIRD_PARTY_NOTICES.md').toString();
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(license, /2017-2024 Adobe/);
  assert.match(notice, /Noto Serif SC UI font/);
  assert.match(notice, /assets\/fonts\/buer-serif-OFL\.txt/);
});
