/* NIMEX Check-in Performance — แชร์/ส่งออกแบบเลือกหัวข้อ + อินโฟกราฟิก 16:9 (สกิล nimex-export-infographic-169)
   ใช้ตัวกรองบนหน้าทั้งหมด (ช่วงวันที่ / ภาค / โซน / DC / ประเภทรถ / ชนิดการจ้าง / สถานะ / กะ / ค้นหา / โหมดค่าปรับ)
   ไม่เปลี่ยนสูตรเดิม: ใช้ getRows / summ / groupBy / fineOf ของหน้าแดชบอร์ด
   % = จำนวนรายการสถานะนั้น ÷ รายการทั้งหมด × 100 · ช่วงก่อนหน้า = จำนวนวันเท่ากันก่อนหน้า (เหมือนการ์ด KPI บนหน้า) */
(function () {
'use strict';
/* ---------- ค่าคงที่ ---------- */
var KPIS = [
  { id: 'n',    l: 'จำนวนรายการ Check-in', pct: false, dir: 0 },
  { id: 'on',   l: '% ตรงเวลา',            pct: true,  dir: 1 },
  { id: 'late', l: '% สาย',                pct: true,  dir: -1 },
  { id: 'nock', l: '% ไม่ Check in',        pct: true,  dir: -1 },
  { id: 'off',  l: '% Check in ไม่ตรงจุด',  pct: true,  dir: -1 },
  { id: 'fine', l: 'ค่าปรับรวม (บาท)',       pct: false, dir: -1 }
];
var KBY = {}; KPIS.forEach(function (k) { KBY[k.id] = k; });
var DEF = { grade: { A: 90, B: 85, C: 80, D: 70 }, kpis: ['n', 'on', 'late', 'nock', 'off', 'fine'], minRows: 50 };
var GC = { A: '#123f8c', B: '#6e93d6', C: '#d4a72c', D: '#d9822b', F: '#b8334a' };
var GE = { A: '🔵', B: '🟦', C: '🟡', D: '🟠', F: '🔴' }, MD = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
var GOOD = '#1a9e5f', BAD = '#b8334a';           /* ผลต่าง: ดี = เขียว แย่ = แดง (ตามสกิล) */
var BWK = ['on', 'late', 'nock', 'off'];
var SECS = [['kpi', 'KPI หลัก'], ['zone', 'ผลรายโซน'], ['dc', 'DC ที่ % ตรงเวลาต่ำสุด 10 อันดับ'], ['group', 'ชนิดการจ้าง × ประเภทรถ']]
  .concat(BWK.map(function (id) { return ['bw_' + id, 'ดีสุด/แย่สุด · ' + KBY[id].l]; }));
var picked = { kpi: 1, zone: 1, dc: 1, group: 1 };

/* ---------- เครื่องมือเล็ก ---------- */
function $(id) { return document.getElementById(id); }
function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function nf(v) { return Number.isFinite(v) ? Math.round(v).toLocaleString('en-US') : '–'; }
function p1(v) { return Number.isFinite(v) ? v.toFixed(1) + '%' : '–'; }
function fmtK(id, v) { return KBY[id].pct ? p1(v) : nf(v); }
function cfg() { var s = window.CIP_SETTINGS || {}; return { grade: s.grade || DEF.grade, kpis: (s.kpis && s.kpis.length) ? s.kpis : DEF.kpis, minRows: s.minRows || DEF.minRows }; }
function grade(v) { var g = cfg().grade; return !Number.isFinite(v) ? '' : v >= g.A ? 'A' : v >= g.B ? 'B' : v >= g.C ? 'C' : v >= g.D ? 'D' : 'F'; }
function adm() { try { return !!isAdmin; } catch (e) { return false; } }
function shortName(s) { return String(s).replace(/^\d+\s*/, ''); }
function dcShort(d) { return dcName[d].replace(/^\d+\s+/, '').replace(/^C?DC\s*/, ''); }

/* ---------- สถิติ (จาก summ / groupBy ของหน้าแดชบอร์ด) ---------- */
function st(a) {   /* a = ผลจาก summ() หรือ groupBy() */
  var n = a.n, r = function (k) { return n ? a.s[k] / n * 100 : NaN; };
  return { n: n, on: r(0), late: r(1), nock: r(2), off: r(3), fine: a.fine, cars: a.veh ? a.veh.size : NaN };
}
function rowsOf(d0, d1, geo) {   /* geo=false: ไม่กรองภาค/โซน/DC (ใช้กับกราฟรายโซนที่ต้องเห็นครบทุกโซน) */
  if (geo !== false) return getRows(d0, d1);
  var sets = [F.region, F.zone, F.dc], keep = sets.map(function (s) { return Array.from(s); });
  sets.forEach(function (s) { s.clear(); });
  try { return getRows(d0, d1); } finally { sets.forEach(function (s, i) { keep[i].forEach(function (v) { s.add(v); }); }); }
}
function carsBy(rows, f) { var m = new Map(); rows.forEach(function (r) { var k = f(r), s = m.get(k); if (!s) m.set(k, s = new Set()); s.add(r[4]); }); return m; }
function period() {
  var len = F.d1 - F.d0 + 1, p1_ = F.d0 - 1, p0 = p1_ - len + 1, has = p0 >= 0;
  return { cur: getRows(F.d0, F.d1), prev: has ? getRows(p0, p1_) : null,
    curLabel: fmtD(F.d0) + ' – ' + fmtD(F.d1) + ' (' + len + ' วัน)', prevLabel: has ? fmtD(p0) + ' – ' + fmtD(p1_) : '' };
}
function scopeText() {
  var t = [];
  if (F.region.size) t.push('ภาค ' + [].concat(Array.from(F.region)).join(', '));
  if (F.zone.size) t.push('โซน ' + Array.from(F.zone).join(', '));
  if (F.dc.size) t.push(F.dc.size > 2 ? F.dc.size + ' DC' : Array.from(F.dc).map(function (i) { return dcName[i]; }).join(', '));
  return t.length ? t.join(' · ') : 'ทุกภาค';
}
function otherFilters() {
  var t = [];
  if (F.pt.size) t.push('ประเภทรถ: ' + Array.from(F.pt).map(function (i) { return ptShort[i]; }).join(', '));
  if (F.kind.size) t.push('ชนิด: ' + Array.from(F.kind).map(function (i) { return kindShort[i]; }).join(', '));
  if (F.st.size) t.push('สถานะ: ' + Array.from(F.st).map(function (i) { return SHORT[i]; }).join(', '));
  if (F.shift.size) t.push('กะ: ' + Array.from(F.shift).map(function (i) { return D.shifts[i]; }).join(', '));
  if (F.q) t.push('ค้นหา: ' + F.q);
  t.push('ค่าปรับ' + (F.fine === 'rule' ? 'ตามกฎ' : 'ตามไฟล์'));
  return t.join(' · ');
}

/* ---------- ข้อมูลแต่ละหัวข้อ ---------- */
function kpiData(P) {
  var C = st(summ(P.cur)), R = P.prev ? st(summ(P.prev)) : null;
  return cfg().kpis.map(function (id) {
    var k = KBY[id], v = C[id], pv = R ? R[id] : NaN, diff = NaN;
    if (R && Number.isFinite(v) && Number.isFinite(pv)) diff = k.pct ? v - pv : (pv ? (v - pv) / pv * 100 : NaN);
    return { id: id, l: k.l, v: v, prev: pv, diff: diff, cars: C.cars,
      good: (!k.dir || !Number.isFinite(diff) || Math.abs(diff) < 0.05) ? null : (k.dir > 0 ? diff > 0 : diff < 0), gr: id === 'on' ? grade(v) : '' };
  });
}
function zoneData(P) {   /* ทุกโซน เพื่อเทียบ (ไม่กรองภาค/โซน/DC) */
  var rows = rowsOf(F.d0, F.d1, false), g = groupBy(rows, function (r) { return dcZone[r[1]]; }), cars = carsBy(rows, function (r) { return dcZone[r[1]]; });
  var gp = groupBy(rows, function (r) { return dcZone[r[1]] + '|' + r[2]; });
  return D.zoneOrder.concat(Array.from(g.keys()).filter(function (z) { return D.zoneOrder.indexOf(z) < 0; })).filter(function (z) { return g.has(z); }).map(function (z) {
    var s = st(g.get(z)); s.z = z; s.cars = cars.get(z).size; s.gr = grade(s.on);
    s.pt = D.pts.map(function (_, i) { var a = gp.get(z + '|' + i); return a ? st(a) : { n: 0, on: NaN }; });
    return s;
  });
}
function dcData(P) {
  var g = groupBy(P.cur, function (r) { return r[1]; }), cars = carsBy(P.cur, function (r) { return r[1]; });
  return Array.from(g.keys()).filter(function (d) { return !dcHide[d]; }).map(function (d) { var s = st(g.get(d)); s.d = d; s.name = dcShort(d); s.code = D.dcs[d].c; s.z = dcZone[d]; s.cars = cars.get(d).size; s.gr = grade(s.on); return s; });
}
function dcRanked(P) { var mr = cfg().minRows; return dcData(P).filter(function (s) { return s.n >= mr; }); }
function dcWorst10(P) { return dcRanked(P).sort(function (a, b) { return a.on - b.on || b.n - a.n; }).slice(0, 10); }
function groupData(P) {
  var g = groupBy(P.cur, function (r) { return r[3] + '|' + r[2]; }), cars = carsBy(P.cur, function (r) { return r[3] + '|' + r[2]; });
  return Array.from(g.keys()).sort().map(function (k) { var s = st(g.get(k)), p = k.split('|'); s.kind = kindShort[+p[0]]; s.pt = ptShort[+p[1]].replace(/4W$/, ''); s.cars = cars.get(k).size; return s; });
}
function kindData(P) {   /* กราฟ 1: ตามชนิดการจ้าง (กรองตามตัวกรองบนหน้า รวมภาค) */
  var g = groupBy(P.cur, function (r) { return r[3]; }), cars = carsBy(P.cur, function (r) { return r[3]; });
  return D.kinds.map(function (_, i) { return i; }).filter(function (i) { return g.has(i); }).map(function (i) {
    var s = st(g.get(i)); s.name = kindShort[i].replace(/^รถร่วม\s*/, ''); s.cars = cars.get(i).size; return s; });
}
/* ดีสุด/แย่สุด: DC 5+5, โซน 3+3 (ถ้าน้อยกว่า ใช้ครึ่งหนึ่ง ไม่ซ้ำกัน); ตัวที่ต่ำ = ดี เรียงกลับด้าน */
function bw(list, key, n, dir) {
  var arr = list.filter(function (x) { return Number.isFinite(x[key]); }).sort(function (a, b) { return dir > 0 ? b[key] - a[key] : a[key] - b[key]; });
  var k = Math.min(n, Math.floor(arr.length / 2));
  return { best: arr.slice(0, k), worst: arr.slice(arr.length - k).reverse(), all: arr };
}
function bwData(P, id) { var d = KBY[id].dir, mr = cfg().minRows; return { dc: bw(dcRanked(P), id, 5, d), zn: bw(zoneData(P).filter(function (z) { return z.n >= mr; }), id, 3, d) }; }

/* ---------- ข้อความสรุป (อีโมจิ) ---------- */
function diffTxt(t) {
  if (!Number.isFinite(t.diff)) return 'ไม่มีช่วงก่อนหน้า';
  var z = Math.abs(t.diff) < 0.05, s = (z ? '±' : t.diff > 0 ? '+' : '−') + Math.abs(t.diff).toFixed(1) + (KBY[t.id].pct ? ' จุด' : '%');
  return (t.good === null ? '' : t.good ? '🟢 ' : '🔴 ') + s;
}
function summaryText() {
  var P = period(), L = ['📊 NIMEX Check-in Performance', '🗓️ ' + P.curLabel + '  |  📍 ' + scopeText(), P.prevLabel ? '↔️ เทียบ ' + P.prevLabel : '↔️ ไม่มีช่วงก่อนหน้า', '⚙️ ' + otherFilters()];
  var sec = function (t) { L.push(''); L.push(t); }, mr = cfg().minRows;
  if (picked.kpi) { sec('🎯 KPI หลัก'); kpiData(P).forEach(function (t) { L.push((t.gr ? GE[t.gr] + ' ' : '• ') + t.l + ': ' + fmtK(t.id, t.v) + (t.gr ? ' เกรด ' + t.gr : '') + (t.id === 'on' ? ' (เป้า ' + F.target + '%)' : '') + '  (' + diffTxt(t) + ')'); }); }
  if (picked.zone) { sec('🗺️ โซนที่ % ตรงเวลาต่ำสุด'); zoneData(P).filter(function (z) { return z.n >= mr; }).sort(function (a, b) { return a.on - b.on; }).slice(0, 3).forEach(function (s, i) { L.push(MD[i] + ' ' + s.z + ': ' + p1(s.on) + ' (' + nf(s.n) + ' รายการ)'); }); }
  if (picked.dc) { sec('🚨 DC ที่ % ตรงเวลาต่ำสุด (≥ ' + mr + ' รายการ)'); dcWorst10(P).slice(0, 5).forEach(function (s, i) { L.push(MD[i] + ' ' + s.code + ' ' + s.name + ' (' + s.z + '): ' + p1(s.on) + ' · ' + nf(s.n) + ' รายการ'); }); }
  if (picked.group) { sec('🚚 ชนิดการจ้าง × ประเภทรถ'); groupData(P).forEach(function (s) { L.push('• ' + s.kind + ' · ' + s.pt + ': ' + nf(s.n) + ' รายการ · ' + nf(s.cars) + ' คัน · ตรงเวลา ' + p1(s.on)); }); }
  BWK.forEach(function (id) {
    if (!picked['bw_' + id]) return; var B = bwData(P, id);
    sec('🏅 ดีสุด/แย่สุด · ' + KBY[id].l + (KBY[id].dir < 0 ? ' (ต่ำ = ดี)' : ''));
    B.dc.best.forEach(function (s) { L.push('🟢 ' + s.code + ' ' + s.name + ' (' + s.z + '): ' + p1(s[id])); });
    B.dc.worst.forEach(function (s) { L.push('🔴 ' + s.code + ' ' + s.name + ' (' + s.z + '): ' + p1(s[id])); });
    L.push('โซน:'); B.zn.best.forEach(function (s) { L.push('🟢 ' + s.z + ': ' + p1(s[id])); }); B.zn.worst.forEach(function (s) { L.push('🔴 ' + s.z + ': ' + p1(s[id])); });
  });
  return L.join('\n');
}

/* ---------- SVG: ฟอนต์ Prompt + โลโก้ฝังในภาพ (ไม่ใช้ html2canvas) ---------- */
var FONT_CSS = null, LOGO = null;
function fontCss() {
  if (FONT_CSS != null) return FONT_CSS;
  var out = [];
  [].forEach.call(document.querySelectorAll('style'), function (s) { (s.textContent.match(/@font-face\s*\{[^}]*\}/g) || []).forEach(function (f) { if (f.indexOf('Prompt') >= 0) out.push(f); }); });
  return (FONT_CSS = out.join('\n'));
}
function logoData() {
  if (LOGO) return Promise.resolve(LOGO);
  try {   /* ใช้รูปโลโก้ที่โหลดอยู่บนหน้าแล้ว (โดเมนเดียวกัน) */
    var im = document.querySelector('img.nx-logo');
    if (im && im.complete && im.naturalWidth) { var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); LOGO = c.toDataURL('image/png'); return Promise.resolve(LOGO); }
  } catch (e) { LOGO = null; }
  return fetch('logo.png').then(function (r) { return r.blob(); }).then(function (b) { return new Promise(function (res) { var f = new FileReader(); f.onload = function () { LOGO = f.result; res(LOGO); }; f.readAsDataURL(b); }); }).catch(function () { return ''; });
}
function wrapSvg(W, H, body) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" font-family="Prompt, sans-serif"><defs><style>' + fontCss() + ' text{font-family:Prompt,sans-serif}</style></defs>' + body + '</svg>';
}
function toPng(svg, W, H, scale) {
  return new Promise(function (res, rej) {
    var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })), img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas'); c.width = Math.round(W * scale); c.height = Math.round(H * scale);
      var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(function (b) { b ? res(b) : rej(new Error('png')); }, 'image/png');
    };
    img.onerror = function () { rej(new Error('svg')); }; img.src = url;
  });
}
function waitFonts() { return (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve(); }
function T(x, y, s, o) { o = o || {}; return '<text x="' + x + '" y="' + y + '" font-size="' + (o.fs || 16) + '" font-weight="' + (o.fw || 400) + '" fill="' + (o.c || '#0b1f3f') + '"' + (o.a ? ' text-anchor="' + o.a + '"' : '') + '>' + E(s) + '</text>'; }

/* ---------- อินโฟกราฟิก 16:9 (1920×1080 → PNG 3840×2160) ---------- */
function niceAxis(vals) {   /* ช่วงแคบ (เช่น 70–95%) ไม่เริ่มที่ 0 */
  var v = vals.filter(Number.isFinite); if (!v.length) return { lo: 0, hi: 100, note: '' };
  var mn = Math.min.apply(null, v), mx = Math.max.apply(null, v);
  var lo = (v.length >= 2 && mn >= 40 && mx - mn <= 30) ? Math.max(0, Math.floor((mn - 5) / 10) * 10) : 0, top = Math.min(100, mx * 1.08), span = Math.max(1, top - lo), step = [1, 2, 5, 10, 20, 25].filter(function (x) { return x * 4 >= span; })[0] || 25;
  var hi = lo + step * 4; if (hi > 100 && mx <= 100) hi = 100;   /* % ไม่เกิน 100 */
  return { lo: lo, hi: hi, note: lo ? 'แกนเริ่มที่ ' + lo + '%' : '' };
}
function panel(x, y, w, h, title, sub) {
  return '<g transform="translate(' + x + ' ' + y + ')"><rect width="' + w + '" height="' + h + '" rx="16" fill="#fff" stroke="#dbe3f0"/><rect width="' + w + '" height="5" rx="2" fill="#d4af37"/>' +
    T(22, 38, title, { fs: 21, fw: 600, c: '#0a2a5e' }) + (sub ? T(w - 20, 38, sub, { fs: 14, c: '#55657f', a: 'end' }) : '') + '</g>';
}
function hbars(x, y, w, h, items, key, color) {   /* แท่งแนวนอน + จำนวนรายการ/คัน */
  var ax = niceAxis(items.map(function (i) { return i[key]; })), lab = 230, bwd = w - lab - 110, rh = Math.min(72, h / Math.max(1, items.length)), s = '';
  if (!items.length) return { s: T(x + w / 2, y + h / 2, 'ไม่มีข้อมูล', { fs: 16, a: 'middle', c: '#55657f' }), note: '' };
  items.forEach(function (it, i) {
    var yy = y + i * rh, val = it[key], len = Number.isFinite(val) ? Math.max(2, (Math.max(val, ax.lo) - ax.lo) / (ax.hi - ax.lo) * bwd) : 0;
    s += T(x, yy + rh / 2 - 2, it.name, { fs: 17, fw: 600 }) + T(x, yy + rh / 2 + 19, nf(it.n) + ' รายการ · ' + nf(it.cars) + ' คัน', { fs: 13, c: '#55657f' });
    s += '<rect x="' + (x + lab) + '" y="' + (yy + rh * .22) + '" width="' + bwd + '" height="' + rh * .56 + '" rx="8" fill="#eef2f9"/><rect x="' + (x + lab) + '" y="' + (yy + rh * .22) + '" width="' + len + '" height="' + rh * .56 + '" rx="8" fill="' + color + '"/>';
    s += T(x + lab + bwd + 12, yy + rh / 2 + 7, p1(val), { fs: 21, fw: 600, c: '#0a2a5e' });
  });
  return { s: s, note: ax.note };
}
function vpairs(x, y, w, h, rows, k1, k2, c1, c2, l1, l2) {   /* แท่งคู่รายโซน */
  var ax = niceAxis(rows.reduce(function (a, r) { return a.concat([r[k1], r[k2]]); }, [])), n = rows.length, gw = w / Math.max(1, n), bwid = Math.min(24, gw * .32), base = y + h - 40, ch = h - 76, s = '';
  for (var t = 0; t <= 4; t++) { var gv = ax.lo + (ax.hi - ax.lo) * t / 4, gy = base - ch * t / 4; s += '<line x1="' + x + '" x2="' + (x + w) + '" y1="' + gy + '" y2="' + gy + '" stroke="#e4e9f2"/>' + T(x - 6, gy + 5, (Math.round(gv * 10) / 10) + '%', { fs: 12, c: '#8a99b3', a: 'end' }); }
  rows.forEach(function (r, i) {
    var cx = x + gw * i + gw / 2;
    [[k1, c1, -1], [k2, c2, 1]].forEach(function (b) {
      var v = r[b[0]]; if (!Number.isFinite(v)) return; var hh = Math.max(2, (Math.min(Math.max(v, ax.lo), ax.hi) - ax.lo) / (ax.hi - ax.lo) * ch), bx = cx + (b[2] < 0 ? -bwid - 2 : 2);
      s += '<rect x="' + bx + '" y="' + (base - hh) + '" width="' + bwid + '" height="' + hh + '" rx="4" fill="' + b[1] + '"/>' + T(bx + bwid / 2, base - hh - 6, v < 10 ? v.toFixed(1) : Math.round(v), { fs: 11.5, fw: 600, c: '#33445f', a: 'middle' });
    });
    s += T(cx, base + 20, r.z, { fs: 13, fw: 600, a: 'middle' }) + T(cx, base + 36, nf(r.n), { fs: 11, c: '#8a99b3', a: 'middle' });
  });
  s += '<rect x="' + x + '" y="' + (y - 4) + '" width="14" height="14" rx="3" fill="' + c1 + '"/>' + T(x + 20, y + 8, l1, { fs: 14 }) + '<rect x="' + (x + 250) + '" y="' + (y - 4) + '" width="14" height="14" rx="3" fill="' + c2 + '"/>' + T(x + 270, y + 8, l2, { fs: 14 });
  return { s: s, note: ax.note };
}
function donut(cx, cy, r, counts) {
  var tot = 0, s = '', a0 = -Math.PI / 2; ['A','B','C','D','F'].forEach(function (g) { tot += counts[g] || 0; });
  if (!tot) return T(cx, cy, 'ไม่มี DC ที่ถึงเกณฑ์', { fs: 16, a: 'middle', c: '#55657f' });
  ['A','B','C','D','F'].forEach(function (g) {
    var v = counts[g] || 0; if (!v) return; var a1 = a0 + v / tot * Math.PI * 2, big = a1 - a0 > Math.PI ? 1 : 0, ri = r * .6;
    if (v === tot) { s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r + ri) / 2 + '" fill="none" stroke="' + GC[g] + '" stroke-width="' + (r - ri) + '"/>'; }
    else s += '<path d="M' + (cx + r * Math.cos(a0)) + ' ' + (cy + r * Math.sin(a0)) + 'A' + r + ' ' + r + ' 0 ' + big + ' 1 ' + (cx + r * Math.cos(a1)) + ' ' + (cy + r * Math.sin(a1)) + 'L' + (cx + ri * Math.cos(a1)) + ' ' + (cy + ri * Math.sin(a1)) + 'A' + ri + ' ' + ri + ' 0 ' + big + ' 0 ' + (cx + ri * Math.cos(a0)) + ' ' + (cy + ri * Math.sin(a0)) + 'Z" fill="' + GC[g] + '"/>';
    a0 = a1;
  });
  return s + T(cx, cy + 4, nf(tot), { fs: 34, fw: 600, c: '#0a2a5e', a: 'middle' }) + T(cx, cy + 28, 'DC', { fs: 15, c: '#55657f', a: 'middle' });
}
function infographic(logo) {
  var W = 1920, H = 1080, P = period(), K = kpiData(P), s = '';
  s += '<rect width="' + W + '" height="' + H + '" fill="#eef2f9"/>';
  /* แถบหัว 120px */
  s += '<rect width="' + W + '" height="120" fill="#0a2a5e"/><rect y="116" width="' + W + '" height="4" fill="#d4af37"/>';
  s += '<rect x="28" y="22" width="170" height="76" rx="12" fill="#fff"/>' + (logo ? '<image href="' + logo + '" x="38" y="30" width="150" height="60" preserveAspectRatio="xMidYMid meet"/>' : '');
  s += T(226, 60, 'NIMEX Check-in Performance · สรุปผลการ Check-in รถร่วม', { fs: 33, fw: 600, c: '#fff' }) + T(226, 94, P.curLabel + (P.prevLabel ? '  ·  เทียบ ' + P.prevLabel : '  ·  ไม่มีช่วงก่อนหน้า'), { fs: 19, c: '#f0d57a' });
  var sc = scopeText(); if (sc.length > 22) sc = sc.slice(0, 21) + '…';
  s += '<rect x="' + (W - 330) + '" y="34" width="302" height="52" rx="26" fill="#d4af37"/>' + T(W - 179, 68, '📍 ' + sc, { fs: 20, fw: 600, c: '#0a2a5e', a: 'middle' });
  /* การ์ด KPI */
  var gap = 16, n = K.length, cw = (W - 56 - gap * (n - 1)) / n, cy = 140, chh = 170;
  K.forEach(function (t, i) {
    var x = 28 + i * (cw + gap), bar = t.gr ? GC[t.gr] : '#d4af37', dc = t.good === null ? '#cfdcf2' : t.good ? '#5fe0a0' : '#ff8a98';
    s += '<g transform="translate(' + x + ' ' + cy + ')"><rect width="' + cw + '" height="' + chh + '" rx="16" fill="#0a2a5e"/><rect y="' + (chh - 6) + '" width="' + cw + '" height="6" rx="3" fill="' + bar + '"/>';
    s += T(cw / 2, 38, t.l, { fs: n > 5 ? 16 : 17, fw: 500, c: '#f0d57a', a: 'middle' }) + T(cw / 2, 98, fmtK(t.id, t.v), { fs: 44, fw: 600, c: '#fff', a: 'middle' });
    s += T(cw / 2, 132, Number.isFinite(t.diff) ? (Math.abs(t.diff) < 0.05 ? '' : t.diff > 0 ? '▲ ' : '▼ ') + diffTxt(t).replace(/^🟢 |^🔴 /, '') : 'ไม่มีช่วงก่อนหน้า', { fs: 16, fw: 600, c: Number.isFinite(t.diff) ? dc : '#cfdcf2', a: 'middle' });
    if (t.id === 'on') s += T(cw / 2, 153, 'เป้า ' + F.target + '% · ' + (t.v >= F.target ? 'ถึงเป้า' : 'ต่ำกว่าเป้า'), { fs: 13, c: '#cfdcf2', a: 'middle' });
    if (t.id === 'n' && Number.isFinite(t.cars)) s += T(cw / 2, 153, nf(t.cars) + ' คัน', { fs: 13, c: '#cfdcf2', a: 'middle' });
    if (t.gr) s += '<rect x="' + (cw - 50) + '" y="12" width="38" height="38" rx="10" fill="' + bar + '"/>' + T(cw - 31, 39, t.gr, { fs: 22, fw: 600, c: '#fff', a: 'middle' });
    s += '</g>';
  });
  /* กราฟ 2×2 */
  var top = cy + chh + 20, pw = (W - 56 - 20) / 2, ph = (H - top - 52 - 20) / 2, xs = [28, 28 + pw + 20], ys = [top, top + ph + 20];
  var KD = kindData(P), ZD = zoneData(P), DD = dcRanked(P), mr = cfg().minRows, geo = scopeText() !== 'ทุกภาค';
  var g1 = hbars(xs[0] + 24, ys[0] + 64, pw - 48, ph - 84, KD, 'on', '#1d57b8');
  s += panel(xs[0], ys[0], pw, ph, '% ตรงเวลา ตามชนิดการจ้าง', [geo ? scopeText() : '', g1.note].filter(Boolean).join(' · ')) + g1.s;
  var pk = D.pts.map(function (p, i) { return i; }), pl = ptShort.map(function (x) { return x.replace(/^รถ/, '').replace(/4W$/, ''); });
  var g2 = vpairs(xs[1] + 60, ys[0] + 66, pw - 84, ph - 74, ZD.map(function (z) { return { z: z.z, n: z.n, a: z.pt[pk[0]] ? z.pt[pk[0]].on : NaN, b: z.pt[pk[1]] ? z.pt[pk[1]].on : NaN }; }), 'a', 'b', '#1d57b8', '#b8860b', pl[0] || 'ประเภท 1', pl[1] || 'ประเภท 2');
  s += panel(xs[1], ys[0], pw, ph, '% ตรงเวลา รายโซน · ' + (pl[0] || '') + ' vs ' + (pl[1] || ''), g2.note || 'ทุกโซน') + g2.s;
  var g3 = vpairs(xs[0] + 60, ys[1] + 66, pw - 84, ph - 74, ZD, 'late', 'off', '#d4a72c', '#b8334a', '% สาย', '% Check in ไม่ตรงจุด');
  s += panel(xs[0], ys[1], pw, ph, '% สาย และ % ไม่ตรงจุด รายโซน (ต่ำ = ดี)', g3.note || 'ทุกโซน') + g3.s;
  var cnt = {}; DD.forEach(function (d) { cnt[d.gr] = (cnt[d.gr] || 0) + 1; });
  s += panel(xs[1], ys[1], pw, ph, 'สัดส่วนเกรด DC (% ตรงเวลา) + แย่สุด 3 อันดับ', 'DC ≥ ' + nf(mr) + ' รายการ' + (geo ? ' · ' + scopeText() : '')) + donut(xs[1] + 170, ys[1] + ph / 2 + 18, Math.min(120, ph / 2 - 50), cnt);
  var gc = cfg().grade, ly = ys[1] + 70, prevG = { B: 'A', C: 'B', D: 'C' };
  ['A','B','C','D','F'].forEach(function (g, i) { var rng = g === 'A' ? '≥ ' + gc.A + '%' : g === 'F' ? '< ' + gc.D + '%' : gc[g] + '–<' + gc[prevG[g]] + '%'; s += '<rect x="' + (xs[1] + 330) + '" y="' + (ly + i * 30) + '" width="18" height="18" rx="4" fill="' + GC[g] + '"/>' + T(xs[1] + 356, ly + i * 30 + 15, g + '  ' + rng + '  ·  ' + (cnt[g] || 0) + ' DC', { fs: 15 }); });
  var worst = dcWorst10(P).slice(0, 3), wy = ly + 170;
  s += T(xs[1] + 330, wy, 'แย่สุด 3 อันดับ', { fs: 16, fw: 600, c: '#b8334a' });
  worst.forEach(function (d, i) { s += '<circle cx="' + (xs[1] + 342) + '" cy="' + (wy + 26 + i * 30) + '" r="11" fill="#b8334a"/>' + T(xs[1] + 342, wy + 31 + i * 30, i + 1, { fs: 13, fw: 600, c: '#fff', a: 'middle' }) + T(xs[1] + 362, wy + 31 + i * 30, d.code + ' ' + d.name + ' (' + d.z + ')  ' + p1(d.on) + ' · ' + nf(d.n) + ' รายการ', { fs: 15 }); });
  /* แถบท้าย */
  s += '<rect y="' + (H - 40) + '" width="' + W + '" height="40" fill="#0a2a5e"/>' + T(28, H - 14, 'สูตร: % = จำนวนรายการสถานะนั้น ÷ รายการทั้งหมด × 100 · ผลต่างของ % เป็นจุด · ช่วงก่อนหน้า = จำนวนวันเท่ากันก่อนหน้า · เกรดจาก % ตรงเวลา (ตั้งค่าโดยผู้ดูแล) · ' + otherFilters(), { fs: 14, c: '#cfdcf2' }) + T(W - 28, H - 14, 'NIMEX Fleet Hub', { fs: 15, fw: 600, c: '#f0d57a', a: 'end' });
  return wrapSvg(W, H, s);
}

/* ---------- ตาราง (ใช้ทั้ง PNG ยาว, PowerPoint, Excel) ---------- */
function sections(P) {
  var out = [], mr = cfg().minRows;
  if (picked.kpi) out.push({ k: 'kpi', t: 'KPI หลัก', head: ['ตัวชี้วัด', 'ช่วงนี้', 'ช่วงก่อนหน้า', 'ผลต่าง', 'เกรด'], rows: kpiData(P).map(function (t) { return [t.l, fmtK(t.id, t.v), P.prev ? fmtK(t.id, t.prev) : '–', diffTxt(t).replace(/^🟢 |^🔴 /, ''), t.gr || '–']; }) });
  if (picked.zone) out.push({ k: 'zone', t: 'ผลรายโซน (ทุกโซน)', head: ['โซน', 'รายการ', 'คัน', '% ตรงเวลา', '% สาย', '% ไม่ Check in', '% ไม่ตรงจุด', 'ค่าปรับ (บาท)', 'เกรด'], rows: zoneData(P).map(function (s) { return [s.z, nf(s.n), nf(s.cars), p1(s.on), p1(s.late), p1(s.nock), p1(s.off), nf(s.fine), s.gr]; }) });
  if (picked.dc) out.push({ k: 'dc', t: 'DC ที่ % ตรงเวลาต่ำสุด 10 อันดับ (≥ ' + nf(mr) + ' รายการ)', head: ['#', 'DC', 'โซน', 'รายการ', '% ตรงเวลา', '% สาย', '% ไม่ Check in', '% ไม่ตรงจุด', 'เกรด'], rows: dcWorst10(P).map(function (s, i) { return [i + 1, s.code + ' ' + s.name, s.z, nf(s.n), p1(s.on), p1(s.late), p1(s.nock), p1(s.off), s.gr]; }) });
  if (picked.group) out.push({ k: 'group', t: 'ชนิดการจ้าง × ประเภทรถ', head: ['ชนิดการจ้าง', 'ประเภทรถ', 'รายการ', 'คัน', '% ตรงเวลา', '% สาย', '% ไม่ Check in', '% ไม่ตรงจุด', 'ค่าปรับ (บาท)'], rows: groupData(P).map(function (s) { return [s.kind, s.pt, nf(s.n), nf(s.cars), p1(s.on), p1(s.late), p1(s.nock), p1(s.off), nf(s.fine)]; }) });
  BWK.forEach(function (id) {
    if (!picked['bw_' + id]) return; var k = KBY[id], B = bwData(P, id), tag = function (x, grp) { return grp.best.indexOf(x) >= 0 ? 'ดีสุด' : grp.worst.indexOf(x) >= 0 ? 'แย่สุด' : ''; };
    out.push({ k: 'bw_' + id, t: 'ดีสุด/แย่สุด · ' + k.l + (k.dir < 0 ? ' (ต่ำ = ดี)' : ''), head: ['ป้าย', 'ระดับ', 'ชื่อ', 'โซน', 'รายการ', k.l],
      rows: B.dc.best.concat(B.dc.worst).map(function (s) { return [tag(s, B.dc), 'DC', s.code + ' ' + s.name, s.z, nf(s.n), p1(s[id])]; }).concat(B.zn.best.concat(B.zn.worst).map(function (s) { return [tag(s, B.zn), 'โซน', s.z, s.z, nf(s.n), p1(s[id])]; })),
      full: B.dc.all.map(function (s, i) { return [tag(s, B.dc), 'DC', i + 1, s.code + ' ' + s.name, s.z, s.n, +s[id].toFixed(2)]; }).concat(B.zn.all.map(function (s, i) { return [tag(s, B.zn), 'โซน', i + 1, s.z, s.z, s.n, +s[id].toFixed(2)]; })) });
  });
  return out;
}
function tableSvg(sec, W) {
  var rh = 36, n = sec.head.length, first = Math.min(260, W * .24), cw = (W - first) / Math.max(1, n - 1), s = T(0, 26, sec.t, { fs: 22, fw: 600, c: '#0a2a5e' }), y0 = 42;
  var cx = function (i) { return i === 0 ? 10 : first + (i - 1) * cw + 10; };
  if (sec.k === 'dc' || sec.k.indexOf('bw_') === 0) { first = sec.k === 'dc' ? 60 : 90; cw = (W - first) / (n - 1); cx = function (i) { if (i === 0) return 10; if (i === 1) return first + 10; return first + 230 + (i - 2) * (W - first - 230) / (n - 2) + 10; }; }
  s += '<rect y="' + y0 + '" width="' + W + '" height="' + rh + '" rx="6" fill="#0a2a5e"/>';
  sec.head.forEach(function (h, i) { s += T(cx(i), y0 + 24, h, { fs: 14.5, fw: 600, c: '#fff' }); });
  sec.rows.forEach(function (r, j) {
    var y = y0 + (j + 1) * rh; if (j % 2) s += '<rect y="' + y + '" width="' + W + '" height="' + rh + '" fill="#f2f5fb"/>';
    r.forEach(function (c, i) { var col = c === 'แย่สุด' || c === 'F' ? BAD : c === 'ดีสุด' ? GOOD : '#0b1f3f'; s += T(cx(i), y + 24, c, { fs: 14.5, fw: i < 1 ? 600 : 400, c: col }); });
  });
  if (!sec.rows.length) s += T(10, y0 + rh + 24, 'ไม่มีข้อมูลตามตัวกรอง', { fs: 14.5, c: '#55657f' });
  return { s: s, h: y0 + (Math.max(1, sec.rows.length) + 1) * rh };
}
function longSvg(logo) {
  var P = period(), W = 1500, x = 40, y = 160, body = '', secs = sections(P);
  secs.forEach(function (sec) { var t = tableSvg(sec, W - 80); body += '<g transform="translate(' + x + ' ' + y + ')">' + t.s + '</g>'; y += t.h + 40; });
  var H = y + 30, head = '<rect width="' + W + '" height="' + H + '" fill="#fff"/><rect width="' + W + '" height="130" fill="#0a2a5e"/><rect y="126" width="' + W + '" height="4" fill="#d4af37"/><rect x="28" y="22" width="150" height="76" rx="12" fill="#fff"/>' +
    (logo ? '<image href="' + logo + '" x="36" y="30" width="134" height="60" preserveAspectRatio="xMidYMid meet"/>' : '') + T(200, 56, 'NIMEX Check-in Performance', { fs: 32, fw: 600, c: '#fff' }) +
    T(200, 88, P.curLabel + ' · ' + scopeText() + (P.prevLabel ? ' · เทียบ ' + P.prevLabel : ' · ไม่มีช่วงก่อนหน้า'), { fs: 18, c: '#f0d57a' }) + T(200, 114, otherFilters(), { fs: 14, c: '#cfdcf2' });
  return { svg: wrapSvg(W, H, head + body), W: W, H: H };
}

/* ---------- ไฟล์ ---------- */
var SHEET = { kpi: 'KPI หลัก', zone: 'ผลรายโซน', dc: 'DC ต่ำสุด 10 อันดับ', group: 'ชนิดการจ้าง-ประเภทรถ', bw_on: 'ดีสุด-แย่สุด % ตรงเวลา', bw_late: 'ดีสุด-แย่สุด % สาย', bw_nock: 'ดีสุด-แย่สุด % ไม่ Check in', bw_off: 'ดีสุด-แย่สุด % ไม่ตรงจุด' };
var LIBS = { pptx: ['PptxGenJS', 'https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js'], xlsx: ['XLSX', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'] };
function loadLib(k) { return new Promise(function (res, rej) { var g = LIBS[k][0]; if (window[g]) return res(); var s = document.createElement('script'); s.src = LIBS[k][1]; s.onload = res; s.onerror = function () { rej(new Error('lib')); }; document.head.appendChild(s); }); }
function fname() { var a = D.dates[F.d0], b = D.dates[F.d1]; return 'NIMEX-Checkin-' + a + (b !== a ? '_' + b : '') + (scopeText() !== 'ทุกภาค' ? '-Filtered' : ''); }
function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
function say(m) { var x = $('cis-msg'); if (x) x.textContent = m; }
function doInfo() { say('กำลังสร้างอินโฟกราฟิก…'); return waitFonts().then(logoData).then(function (lg) { return toPng(infographic(lg), 1920, 1080, 2); }).then(function (b) { download(b, fname() + '-infographic-16x9.png'); say('✓ ดาวน์โหลดอินโฟกราฟิก 16:9 แล้ว (3840×2160)'); }).catch(function (e) { say('สร้างภาพไม่สำเร็จ: ' + e.message); }); }
function doPng() { if (!sections(period()).length) return say('กรุณาเลือกหัวข้ออย่างน้อย 1 หัวข้อ'); say('กำลังสร้างรูป…'); return waitFonts().then(logoData).then(function (lg) { var L = longSvg(lg); return toPng(L.svg, L.W, L.H, 2); }).then(function (b) { download(b, fname() + '.png'); say('✓ ดาวน์โหลดรูป PNG แล้ว'); }).catch(function (e) { say('สร้างรูปไม่สำเร็จ: ' + e.message); }); }
function doXlsx() {
  var P = period(), secs = sections(P); if (!secs.length) return say('กรุณาเลือกหัวข้ออย่างน้อย 1 หัวข้อ');
  return loadLib('xlsx').then(function () {
    var wb = XLSX.utils.book_new(), used = {};
    secs.forEach(function (sec) {
      var aoa = [[sec.t], [P.curLabel + ' · ' + scopeText() + (P.prevLabel ? ' · เทียบ ' + P.prevLabel : ' · ไม่มีช่วงก่อนหน้า')], [otherFilters()], []];
      if (sec.full) { aoa.push(['ป้าย', 'ระดับ', 'อันดับ', 'ชื่อ', 'โซน', 'รายการ', sec.head[5]]); aoa = aoa.concat(sec.full); }
      else { aoa.push(sec.head); aoa = aoa.concat(sec.rows); }
      var name = SHEET[sec.k] || sec.k, i = 2; while (used[name]) name = name.slice(0, 26) + ' ' + (i++); used[name] = 1;
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
    });
    XLSX.writeFile(wb, fname() + '.xlsx'); say('✓ ดาวน์โหลด Excel แล้ว (' + secs.length + ' ชีต)');
  }).catch(function (e) { say('สร้าง Excel ไม่สำเร็จ: ' + e.message); });
}
function doPptx() {
  var P = period(), secs = sections(P); say('กำลังสร้าง PowerPoint…');
  return Promise.all([loadLib('pptx'), waitFonts().then(logoData)]).then(function (x) {
    var lg = x[1]; return toPng(infographic(lg), 1920, 1080, 1).then(function (b) { return new Promise(function (res) { var f = new FileReader(); f.onload = function () { res(f.result); }; f.readAsDataURL(b); }); });
  }).then(function (img) {
    var pp = new PptxGenJS(); pp.layout = 'LAYOUT_WIDE';
    pp.addSlide().addImage({ data: img, x: 0, y: 0, w: 13.333, h: 7.5 });
    secs.forEach(function (sec) {
      var sl = pp.addSlide(); sl.background = { color: 'FFFFFF' };
      sl.addShape(pp.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.9, fill: { color: '0A2A5E' } });
      sl.addText(sec.t, { x: 0.4, y: 0.12, w: 12.5, h: 0.45, fontFace: 'Prompt', fontSize: 22, bold: true, color: 'FFFFFF' });
      sl.addText(P.curLabel + ' · ' + scopeText(), { x: 0.4, y: 0.52, w: 12.5, h: 0.3, fontFace: 'Prompt', fontSize: 12, color: 'F0D57A' });
      var rows = [sec.head.map(function (h) { return { text: String(h), options: { bold: true, color: 'FFFFFF', fill: { color: '0A2A5E' } } }; })]
        .concat(sec.rows.slice(0, 16).map(function (r) { return r.map(function (c) { return { text: String(c), options: { color: c === 'แย่สุด' || c === 'F' ? 'B8334A' : c === 'ดีสุด' ? '1A9E5F' : '0B1F3F' } }; }); }));
      sl.addTable(rows, { x: 0.4, y: 1.15, w: 12.5, fontFace: 'Prompt', fontSize: 11.5, border: { type: 'solid', color: 'DBE3F0', pt: 0.5 }, autoPage: false });
    });
    return pp.writeFile({ fileName: fname() + '.pptx' });
  }).then(function () { say('✓ ดาวน์โหลด PowerPoint แล้ว (' + (secs.length + 1) + ' สไลด์)'); }).catch(function (e) { say('สร้าง PowerPoint ไม่สำเร็จ: ' + e.message); });
}

/* ---------- หน้าต่างแชร์ ---------- */
function render() {
  var P = period();
  $('cis-body').innerHTML =
    '<p class="cis-note">🗓️ ' + E(P.curLabel) + ' · 📍 ' + E(scopeText()) + '<br>↔️ ' + (P.prevLabel ? 'เทียบ ' + E(P.prevLabel) : 'ไม่มีช่วงก่อนหน้า (ช่วงที่เลือกเริ่มตั้งแต่วันแรกของข้อมูล)') +
    '<br>⚙️ ' + E(otherFilters()) + '<br>ใช้ตัวกรองบนหน้า — เปลี่ยนช่วงวันที่หรือภาค/โซนบนหน้าแล้วเปิดหน้าต่างนี้ใหม่</p>' +
    '<button type="button" class="cis-info" data-act="info">🖼️ อินโฟกราฟิก 16:9</button>' +
    '<div class="cis-h">เลือกหัวข้อสำหรับ Excel / PowerPoint / PNG / ข้อความ</div><div class="cis-checks">' + SECS.map(function (s) { return '<label><input type="checkbox" data-sec="' + s[0] + '"' + (picked[s[0]] ? ' checked' : '') + '> ' + E(s[1]) + '</label>'; }).join('') + '</div>' +
    '<div class="cis-btns"><button type="button" data-act="xlsx">Excel</button><button type="button" data-act="pptx">PowerPoint</button><button type="button" data-act="png">รูป PNG ยาว</button></div>' +
    '<label class="cis-h" for="cis-text">ข้อความสรุป (คัดลอกไปวาง LINE / อีเมล)</label><textarea id="cis-text" rows="9">' + E(summaryText()) + '</textarea>' +
    '<div class="cis-btns"><button type="button" class="alt" data-act="copy">คัดลอกข้อความ</button>' + (adm() ? '<button type="button" class="alt" data-act="settings">⚙️ ตั้งค่าเกรด / KPI</button>' : '') + '</div><p class="cis-msg" id="cis-msg" role="status"></p>';
}
function renderSettings() {
  var c = cfg();
  $('cis-body').innerHTML = '<div class="cis-h">เกณฑ์เกรด DC จาก % ตรงเวลา (ต่ำกว่า D = F)</div><div class="cis-grade">' + ['A','B','C','D'].map(function (g) { return '<label><span style="background:' + GC[g] + '">' + g + '</span> ≥ <input type="number" min="0" max="100" step="0.1" id="cis-g' + g + '" value="' + c.grade[g] + '"> %</label>'; }).join('') + '</div>' +
    '<label class="cis-h">DC ต้องมีอย่างน้อย <input type="number" min="1" max="100000" id="cis-min" value="' + c.minRows + '" style="width:96px"> รายการ จึงนำมาจัดอันดับ / ให้เกรด</label>' +
    '<div class="cis-h">KPI ที่แสดงบนการ์ดและข้อความสรุป</div><div class="cis-checks">' + KPIS.map(function (k) { return '<label><input type="checkbox" data-kpi="' + k.id + '"' + (c.kpis.indexOf(k.id) >= 0 ? ' checked' : '') + '> ' + E(k.l) + (k.dir < 0 ? ' (ต่ำ = ดี)' : k.dir > 0 ? ' (สูง = ดี)' : '') + '</label>'; }).join('') + '</div>' +
    '<div class="cis-btns"><button type="button" data-act="back" class="alt">‹ กลับ</button><button type="button" data-act="save">บันทึกค่าตั้ง</button></div><p class="cis-msg" id="cis-msg" role="status"></p>';
}
function saveSettings() {
  var g = {}; ['A','B','C','D'].forEach(function (k) { g[k] = +$('cis-g' + k).value; });
  if (!(g.A >= g.B && g.B >= g.C && g.C >= g.D) || ['A','B','C','D'].some(function (k) { return !(g[k] >= 0 && g[k] <= 100); })) return say('เกณฑ์ต้องเรียง A ≥ B ≥ C ≥ D และอยู่ระหว่าง 0–100');
  var kp = KPIS.map(function (k) { return k.id; }).filter(function (id) { var e = document.querySelector('[data-kpi="' + id + '"]'); return e && e.checked; }); if (!kp.length) return say('เลือก KPI อย่างน้อย 1 ตัว');
  var mr = Math.round(+$('cis-min').value); if (!(mr >= 1 && mr <= 100000)) return say('จำนวนรายการขั้นต่ำต้องอยู่ระหว่าง 1–100,000');
  var stg = { grade: g, kpis: kp, minRows: mr };
  if (!window.cipApi) return say('บันทึกไม่ได้: ยังไม่ได้เชื่อม Google Sheet');
  say('กำลังบันทึก…');
  window.cipApi({ a: 'settings', settings: stg }).then(function (r) { window.CIP_SETTINGS = r.settings || stg; say('✓ บันทึกแล้ว ทุกคนเห็นค่าตั้งเดียวกัน'); })
    .catch(function (e) { say(e.message === 'unknown' ? 'บันทึกไม่สำเร็จ: Apps Script ของ Check-in Performance ยังเป็นรุ่นเก่า (อัปเดต Code.gs แล้ว Deploy เวอร์ชันใหม่)' : 'บันทึกไม่สำเร็จ: ' + (e.message === 'denied' ? 'รหัสไม่ถูกต้อง' : e.message)); });
}
function open() { if (typeof F === 'undefined') return; $('cis').hidden = false; render(); }
function close() { $('cis').hidden = true; }
function mount() {
  var d = document.createElement('div'); d.id = 'cis'; d.hidden = true; d.className = 'cis';
  d.innerHTML = '<div class="cis-box" role="dialog" aria-modal="true" aria-labelledby="cis-t"><div class="cis-top"><h2 id="cis-t">📤 แชร์และส่งออก</h2><button type="button" class="cis-x" data-act="close" aria-label="ปิด">✕</button></div><div id="cis-body"></div></div>';
  document.body.appendChild(d);
  d.addEventListener('click', function (e) {
    if (e.target === d) return close();
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.dataset.act;
    if (a === 'close') close(); else if (a === 'info') doInfo(); else if (a === 'png') doPng(); else if (a === 'xlsx') doXlsx(); else if (a === 'pptx') doPptx();
    else if (a === 'copy') { var t = $('cis-text'); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(function () { say('✓ คัดลอกข้อความแล้ว'); }).catch(function () { t.select(); document.execCommand('copy'); say('✓ คัดลอกข้อความแล้ว'); }); }
    else if (a === 'settings') renderSettings(); else if (a === 'back') render(); else if (a === 'save') saveSettings();
  });
  d.addEventListener('change', function (e) {
    var k = e.target.dataset && e.target.dataset.sec;
    if (k) { if (e.target.checked) picked[k] = 1; else delete picked[k]; var t = $('cis-text'); if (t) t.value = summaryText(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('cis').hidden) close(); });
  var btn = $('shareBtn'); if (btn) btn.onclick = open;
}
window.cipShare = { open: open, summaryText: summaryText, period: period, kpiData: kpiData, zoneData: zoneData, dcWorst10: dcWorst10, dcRanked: dcRanked, bwData: bwData, groupData: groupData, kindData: kindData, infographic: infographic, sections: sections };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
