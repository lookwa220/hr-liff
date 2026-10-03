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

## 📱 คุณสมบัติและฟังก์ชันหลักตามบทบาท (Role & Department Segmentation)

### หมวดที่ 1: บริการตนเองสำหรับพนักงานทุกคน (Self-Service)
1. **🔐 One-time Onboarding & Verification:**
   - ผูก LINE User ID เข้ากับฐานข้อมูลพนักงานจริง 163 คน ด้วยรหัสพนักงาน + วันเดือนปีเกิด (DDMMYYYY)
   - จดจำสิทธิ์และความเป็นหัวหน้างาน (Supervisor Status) อัตโนมัติ
2. **📅 ระบบลางานแบบเบ็ดเสร็จ (Unified Leave Portal - `viewLeave`):**
   - รวมการ์ดเช็คสิทธิ์คงเหลือ (พักร้อน, ลาป่วย, ลากิจ) ไว้ด้านบนสุด
   - แบบฟอร์มยื่นคำขอลางานแบบ Preset (เต็มวัน, ครึ่งวัน, รายชั่วโมง สเต็ป 15 นาที) พร้อมแนบใบรับรองแพทย์
   - ระบบ Anti-Overlap Collision Gate ป้องกันการยื่นใบลาซ้อนวัน/เวลาเดิม
   - รายการประวัติคำขอยื่นลาพร้อมติดตามสถานะได้ทันที
3. **⏱️ ขอทำงานล่วงเวลา (Overtime Request - `viewOT`):**
   - ยื่นคำขอทำโอทีล่วงหน้า พร้อมคำนวณชั่วโมงสุทธิหักเวลาพักอัตโนมัติ และประวัติคำขอ
4. **👤 ศูนย์ข้อมูลส่วนบุคคล (Personal Records Hub - `viewPersonal`):**
   - **แท็บ 1: 💵 สลิปเงินเดือนดิจิทัล (e-Pay Slip):** ยืนยันตัวตนด้วย PIN/วันเกิด ก่อนเปิดดู แจกแจงรายได้ โอที เบี้ยขยัน และรายการหัก
   - **แท็บ 2: 🕒 กะ & เวลาทำงาน (Shift & Attendance):** ตรวจสอบกะปัจจุบัน ปฏิทินวันทำงาน/วันหยุดโรงงาน และประวัติสแกนเวลา

---

### หมวดที่ 2: บริการสำหรับหัวหน้างาน (Supervisor Only - `isSupervisor`)
5. **✅ ศูนย์อนุมัติงาน (Supervisor Approvals - `viewApprovals`):**
   - อนุมัติ/ปฏิเสธคำขอลา โอที และงานซ่อมบำรุงของลูกทีม พร้อมแจ้งเตือนแบบเรียลไทม์
6. **🛠️ แจ้งซ่อมบำรุงหน้างาน (MNW Work Order - `viewMnwRequest`):**
   - เปิดใบแจ้งซ่อมเครื่องจักร/สถานที่หน้างาน พร้อมถ่ายภาพจุดชำรุดด้วยกล้องมือถือ (`capture="environment"`) บีบอัด Canvas Base64 อัตโนมัติ
7. **🏢 จองห้องประชุม (Meeting Room Booking - `viewRoomBooking`):**
   - ตรวจสอบห้องว่าง สิ่งอำนวยความสะดวก พร้อมระบบตรวจเวลาชนกัน (Anti-Collision)
8. **🚗 จองรถยนต์โรงงาน (Vehicle Booking - `viewVehicleBooking`):**
   - ตรวจสอบคิวรถยนต์ส่วนกลางและยื่นขอใช้รถได้ทันที

---

### หมวดที่ 3: สำหรับฝ่ายซ่อมบำรุง (MNW Department Only)
9. **🔧 กระดานงานช่าง MNW (Maintenance Workbench - `viewMnwWorkbench`):**
   - ติดตามใบงานซ่อมที่รอรับงาน/กำลังดำเนินการ พร้อมระบบกรองสถานะ
10. **✍️ ตรวจรับและเซ็นส่งมอบงานหน้างาน (On-site Handover - `viewMnwHandover`):**
    - ถ่ายภาพผลงานหลังซ่อมเสร็จจริงหน้างาน
    - ระบบเซ็นชื่อดิจิทัล Dual Touch Canvas:
      - **ช่างผู้ส่งมอบ (`handoverTechName`):** ดึงชื่อช่างเจ้าของมือถือที่ล็อกอินอยู่อัตโนมัติ
      - **ผู้รับมอบงาน (`handoverRecName`):** ดึงชื่อผู้แจ้งซ่อมจากใบงานมาให้ตรวจรับงานอัตโนมัติ

---

## 🛠️ สถาปัตยกรรมและเทคโนโลยี (Tech Stack)

- **Frontend:** Single-page Application (SPA) เขียนด้วย HTML5, Tailwind CSS (CDN), และ Lucide Icons
- **SDK:** LINE Front-end Framework (LIFF SDK v2)
- **Data Transport:**
  - **JSONP:** สำหรับการ Query ข้อมูลปกติ
  - **HTTP POST (`doPost`):** สำหรับการส่งข้อมูลขนาดใหญ่ (รูปภาพความละเอียดสูง Base64 และลายเซ็นดิจิทัล) เพื่อไม่ให้ติดข้อจำกัด URL Length Limit
- **Hosting & CI/CD:** GitHub Pages + Deploy อัตโนมัติเมื่อ Push ขึ้นสาขา `main` (`https://github.com/lookwa220/hr-liff`)
- **Parity Standard:** สอดคล้องตาม Rule 17 (Cross-Platform & LIFF Parity Invariant) กับ Desktop Hub 100%
