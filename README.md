# 📱 Minamida Mobile Portal (HR-LIFF)

> **Mobile Portal Frontend for Minamida (Thailand) Co., Ltd.**  
> ระบบพอร์ทัลบนสมาร์ตโฟนผ่าน LINE Front-end Framework (LIFF) เชื่อมโยงกับ Google Apps Script Backend และ Google Sheets Multi-DB

[![LINE LIFF](https://img.shields.io/badge/LINE-LIFF%20v2-00C300.svg)](https://developers.line.biz/en/docs/liff/)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-blue.svg)](https://lookwa220.github.io/hr-liff/)
[![Tailwind CSS](https://img.shields.io/badge/UI-Tailwind%20CSS%20CDN-38B2AC.svg)](https://tailwindcss.com/)

---

## 🌐 ลิงก์และข้อมูลประจำระบบ (Endpoints & Identifiers)

| ทรัพยากร | รายละเอียด / URL |
|---|---|
| **🚀 Production URL** | [https://lookwa220.github.io/hr-liff/](https://lookwa220.github.io/hr-liff/) |
| **📱 LINE LIFF ID** | `2011799105-A1YwHp4u` |
| **📦 GitHub Repository** | [https://github.com/lookwa220/hr-liff](https://github.com/lookwa220/hr-liff) |
| **⚙️ Backend API Endpoint** | `https://script.google.com/macros/s/AKfycby6LmtU-GITlnyN4W-P8CR8qqUL9UFiWprbrVkQsgVfGunD64pF5hK4q9BrdYuKLWfz7Q/exec` (ANYONE_ANONYMOUS JSONP) |

---

## 📱 คุณสมบัติและฟังก์ชันหลัก (Core Features & Views)

1. **🔐 One-time Onboarding & Verification:**
   - ผูก LINE User ID เข้ากับฐานข้อมูลพนักงานจริง 163 คน ด้วยรหัสพนักงาน + วันเดือนปีเกิด (DDMMYYYY)
   - จดจำสิทธิ์และความเป็นหัวหน้างาน (Supervisor Status) อัตโนมัติ

2. **🌴 ใบลาออนไลน์ (Online Leave Request - `viewLeave`):**
   - เลือกระยะเวลาการลาแบบ Preset (เต็มวัน 8 ชม., ครึ่งวัน 4 ชม., รายชั่วโมง สเต็ป 15 นาที)
   - รองรับทั้งกะกลางวัน (Day) และกะกลางคืน (Night)
   - อัปโหลดไฟล์แนบใบรับรองแพทย์ตรงเข้าสู่ Google Drive แผนก HR

3. **📊 เช็คโควตาวันลาและประวัติ (Leave Quota & History - `viewQuota`):**
   - แสดงยอดคงเหลือ/ยอดใช้ไปของวันลาทุกประเภทแบบเรียลไทม์
   - ประวัติคำขอลาพร้อมสถานะและความเห็นของผู้อนุมัติ
   - Zero LINE Push Messaging Cost (พนักงานเช็คสถานะเองได้ตลอดเวลา)

4. **⏰ ขอทำงานล่วงเวลา (Overtime Request - `viewOT`):**
   - ยื่นคำขอทำโอทีล่วงหน้า พร้อมคำนวณชั่วโมงสุทธิหักเวลาพักอัตโนมัติ

5. **✍️ ศูนย์อนุมัติสำหรับหัวหน้างาน (Supervisor Approvals - `viewApprovals`):**
   - หัวหน้างานและผู้จัดการในสายอนุมัติสามารถกดอนุมัติ/ปฏิเสธคำขอลาและโอทีได้ทันทีจากมือถือ

6. **💵 สลิปเงินเดือนดิจิทัล (Mobile e-Pay Slip - `viewPaySlip`):**
   - ยืนยันตัวตนด้วย วันเดือนปีเกิด/PIN ก่อนเปิดดูเพื่อความปลอดภัย
   - แจกแจงรายได้ ค่ากะ ค่าล่วงเวลา เบี้ยขยัน รายการหัก และยอดรับสุทธิ พร้อมย้อนดูงวดประวัติ

7. **📅 เช็คกะและเวลาสแกนส่วนบุคคล (Shift & Attendance Self-Check - `viewShiftAtt`):**
   - ตรวจสอบกะปัจจุบัน ปฏิทินวันทำงาน/วันหยุดโรงงานประจำเดือน และประวัติสแกนนิ้ว/บาร์โค้ดล่าสุด

8. **🔄 ขอสลับกะระหว่างเพื่อนร่วมงาน (Peer Shift Swap - `viewSwap`):**
   - เลือกเพื่อนร่วมงานเพื่อขอสลับกะ -> เพื่อนร่วมงานกดยินยอม -> ส่งต่อหัวหน้างานอนุมัติบน My Desk -> อัปเดตตารางกะอัตโนมัติ

9. **🦺 แจ้งเหตุการณ์จุดเสี่ยงความปลอดภัย (Safety & Near-Miss Reporting - `viewSafety`):**
   - ถ่ายรูปเหตุการณ์จุดเสี่ยงหรือ Near-Miss ในโรงงาน ส่งตรงเข้า My Desk ให้เจ้าหน้าที่ จป. และ HR ตรวจสอบทันที

10. **⚡ ทางลัดบริการด่วน (Quick Service Action Cards):**
    - เบิกเงินทดรองจ่าย (Cash Advance)
    - ยื่นคำขอเปลี่ยนแปลงทางวิศวกรรม (ECR)
    - ยื่นกู้ยืม / สวัสดิการ
    - แจ้งซ่อมบำรุงและสร้าง (MN-W)

---

## 🛠️ สถาปัตยกรรมและเทคโนโลยี (Tech Stack)

- **Frontend:** Single-page Application (SPA) เขียนด้วย HTML5, Tailwind CSS (CDN), และ Lucide Icons
- **SDK:** LINE Front-end Framework (LIFF SDK v2)
- **Data Transport:** JSONP Cross-Origin Requests ไปยัง Google Apps Script Web App
- **Hosting & CI/CD:** GitHub Pages + GitHub Actions Deploy on push (`main`)
