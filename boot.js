/* NIMEX Check-in Performance — loads the dataset from the Google Sheet (Apps Script), then starts app.js.
   Viewer: read only. Admin: #admin or the "ระบบ" button → key checked by Apps Script → import file → save to Sheet. */
(function () {
  var KEY = 'nimex-admin-key';
  var META_KEYS = ['dates','dcs','pts','kinds','plates','vcode','shifts','st','zoneOrder','zmap'];
  function $(id) { return document.getElementById(id); }
  function ss(v) { try { if (v === undefined) return sessionStorage.getItem(KEY); if (v === null) sessionStorage.removeItem(KEY); else sessionStorage.setItem(KEY, v); } catch (e) { return null; } }
  var wantAdmin = /(^|#)admin\b/.test(location.hash);

  function cover() {
    var c = $('cover'); if (!c) return;
    document.body.style.overflow = 'hidden';
    function close() { c.hidden = true; document.body.style.overflow = ''; }
    c.querySelector('button').onclick = close; c.querySelector('.fg').onclick = close;
    document.addEventListener('keydown', function k(e) { if (e.key === 'Enter' || e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
  }
  function msg(html) { var b = $('boot'); b.innerHTML = '<div class="boot-box">' + html + '</div>'; b.hidden = false; }
  function post(body, key) {
    return fetch(window.CIP_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ key: key || ss() }, body)) })
      .then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error(j.error || 'failed'); return j; });
  }
  /* key check on the Apps Script side; remembered for this tab only */
  window.cipAuth = function (k) { return post({ a: 'auth' }, k).then(function () { ss(k); return true; }).catch(function () { ss(null); return false; }); };
  window.cipLogout = function () { ss(null); };
  window.cipApi = function (body) { return post(body); }; /* ใช้โดย share.js (บันทึกค่าตั้ง) */

  /* whole dataset → Sheet: begin, meta, rows in chunks, finish */
  function pushAll(D, note, step) {
    var meta = {}; META_KEYS.forEach(function (k) { meta[k] = D[k]; });
    var rows = D.rows, i = 0;
    return post({ a: 'begin' }).then(function () { return post({ a: 'meta', meta: meta }); }).then(function next() {
      if (i >= rows.length) return post({ a: 'finish', note: note });
      var part = rows.slice(i, i + 4000); i += part.length; if (step) step(i, rows.length);
      return post({ a: 'append', rows: part }).then(next);
    });
  }
  window.cipSave = function (D) {
    var m = $('upMsg'), say = function (t) { if (m) m.textContent = t; };
    if (!ss()) { say('กรุณาเข้าสู่ระบบผู้ดูแลก่อน'); return; }
    var first = D.dates[0], last = D.dates[D.dates.length - 1];
    if (!window.confirm('บันทึกลง Google Sheet ให้ผู้ชมทุกคนเห็น\n\n• ' + D.rows.length.toLocaleString() + ' รายการ\n• ช่วงวันที่ ' + first + ' ถึง ' + last + '\n• ' + D.dcs.length + ' DC\n\nข้อมูลใน Sheet จะถูกแทนที่ด้วยชุดนี้ทั้งหมด')) return;
    say('กำลังบันทึกลง Google Sheet…');
    pushAll(D, 'save', function (n, all) { say('กำลังบันทึก ' + n.toLocaleString() + ' / ' + all.toLocaleString()); })
      .then(function (r) { say('✓ บันทึกแล้ว ' + r.total.toLocaleString() + ' รายการ · ผู้ชมเห็นข้อมูลใหม่แล้ว'); status(new Date().toISOString()); })
      .catch(function (e) { say('บันทึกไม่สำเร็จ: ' + (e.message === 'denied' ? 'รหัสไม่ถูกต้อง' : e.message)); });
  };
  function status(iso) { var s = $('nx-status'); if (s && iso) s.textContent = 'อัปเดตล่าสุด ' + new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }); }

  function firstRun() {
    msg('<h2>ตั้งค่าครั้งแรก</h2><p>ยังไม่มีข้อมูลใน Google Sheet ใส่รหัสผู้ดูแล แล้วเลือกไฟล์ <b>cip-seed.json</b></p>' +
      '<input id="adm-key" type="password" autocomplete="current-password" aria-label="รหัสผู้ดูแล" placeholder="รหัสผู้ดูแล">' +
      '<input type="file" id="seed-f" accept=".json" aria-label="ไฟล์ข้อมูลเริ่มต้น"><p class="note" id="seed-m"></p>');
    $('seed-f').onchange = function (e) {
      var m = $('seed-m'), f = e.target.files[0];
      m.textContent = 'กำลังตรวจรหัส…';
      window.cipAuth($('adm-key').value).then(function (ok) {
        if (!ok) { m.textContent = 'รหัสไม่ถูกต้อง'; e.target.value = ''; return; }
        return f.text().then(function (t) {
          var D = JSON.parse(t); m.textContent = 'พบ ' + D.rows.length.toLocaleString() + ' รายการ กำลังบันทึก…';
          return pushAll(D, 'seed', function (n, all) { m.textContent = 'กำลังบันทึก ' + n.toLocaleString() + ' / ' + all.toLocaleString(); });
        }).then(function (r) { m.textContent = 'นำเข้าแล้ว ' + r.total.toLocaleString() + ' รายการ'; setTimeout(function () { location.reload(); }, 700); });
      }).catch(function (x) { m.textContent = 'นำเข้าไม่สำเร็จ: ' + x.message; });
    };
  }

  function start() {
    cover();
    if (!window.CIP_API) { msg('<h2>ยังไม่ได้ตั้งค่า</h2><p>ยังไม่ได้ใส่ที่อยู่ระบบข้อมูล (Apps Script) ใน config.js</p>'); return; }
    var key = ss();
    var authP = key ? post({ a: 'auth' }).then(function () { return true; }).catch(function () { ss(null); return false; }) : Promise.resolve(false);
    var dataP = fetch(window.CIP_API + '?v=' + (window.CIP_V || 1)).then(function (r) { return r.json(); });
    Promise.all([authP, dataP]).then(function (x) {
      var isAdm = x[0], R = x[1];
      if (!R.rows || !R.rows.length) { if (wantAdmin || isAdm) firstRun(); else msg('<h2>ยังไม่มีข้อมูล</h2><p>ผู้ดูแลยังไม่ได้นำเข้าข้อมูล</p>'); return; }
      var D = {};
      META_KEYS.forEach(function (k) { D[k] = R.meta[k]; });
      D.rows = R.rows.map(function (r) { return r.map(function (v) { return v === '' ? null : v; }); });
      window.CIP_DATA = D;
      window.CIP_SETTINGS = R.settings || {};
      status(R.updated);
      $('boot').hidden = true;
      var s = document.createElement('script');
      s.src = 'app.js?v=' + (window.CIP_V || 1);
      s.onload = function () {
        if (isAdm && typeof setAdmin === 'function') setAdmin(true);
        else if (wantAdmin && typeof openLogin === 'function') openLogin();
      };
      document.body.appendChild(s);
    }).catch(function () { msg('<h2>โหลดข้อมูลไม่สำเร็จ</h2><p>ลองเปิดหน้านี้ใหม่อีกครั้ง</p>'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
