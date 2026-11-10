# NIMEX Check-in Performance Dashboard

ผล Check-in ของรถ (% ตรงเวลา / สาย / ไม่ Check in / ไม่ตรงจุด / ค่าปรับ) ราย DC รายโซน และรายวัน หน้าตาตาม NIMEX Design Kit
หน้าเว็บอ่านข้อมูลจาก Google Sheet ผ่าน Apps Script — **repo นี้ไม่มีตัวเลขจริง** ห้ามนำ cip-seed.json หรือไฟล์ Excel ขึ้น repo

## ไฟล์
| ไฟล์ | หน้าที่ |
|---|---|
| index.html | โครงหน้า สไตล์ ฟอนต์ Prompt |
| app.js | โค้ดแดชบอร์ดเดิม (การคำนวณเหมือนเดิมทุกอย่าง ปรับเฉพาะที่มาของข้อมูลและการตรวจรหัส) |
| boot.js | โหลดข้อมูลจาก Sheet, ตรวจรหัสผู้ดูแลที่ Apps Script, นำเข้าครั้งแรก, บันทึกลง Sheet |
| config.js | ที่อยู่ Apps Script (`CIP_API`) และเลขเวอร์ชัน (`CIP_V`) |
| Code.gs.txt | โค้ดฝั่ง Apps Script (แท็บ Rows / Meta / Log) |

## ติดตั้งครั้งแรก
1. สร้าง Google Sheet ใหม่ → Extensions > Apps Script → วางเนื้อหา `Code.gs.txt` บันทึกเป็น Code.gs
2. Project Settings > Script Properties → เพิ่ม `ADMIN_KEY` = รหัสผู้ดูแล
3. Deploy > New deployment > Web app > Execute as: **Me**, Who has access: **Anyone** → คัดลอก URL ที่ลงท้าย `/exec`
4. แก้ `config.js` ใส่ URL ที่ `CIP_API` แล้วอัปโหลดไฟล์ทั้งหมดขึ้น repo
5. เปิดลิงก์เว็บต่อท้าย `#admin` → หน้า "ตั้งค่าครั้งแรก" → ใส่รหัส → เลือกไฟล์ `cip-seed.json`

## ใช้งาน
- ผู้ชมทั่วไป: เปิดลิงก์ปกติ
- ผู้ดูแล: กดปุ่ม "🔒 ระบบ" (หรือเปิดลิงก์ต่อท้าย `#admin`) → ใส่รหัส → "📂 เติมไฟล์" → นำเข้า → ตรวจผล → กด "💾 บันทึกลง Google Sheet"
- รหัสตรวจที่ Apps Script เท่านั้น (ไม่มีรหัสหรือ hash ในหน้าเว็บแล้ว)
- แก้หน้าเว็บแล้วผู้ชมยังเห็นของเก่า ให้เพิ่มเลข `CIP_V` ใน config.js

## ความเป็นส่วนตัว
repo เป็นสาธารณะ และ Apps Script เปิดให้ทุกคนที่มีลิงก์อ่านได้ ใครมีลิงก์เว็บก็เห็นข้อมูลบนแดชบอร์ด
