// ============================================================================
// MINAMIDA MOBILE LIFF — GENERAL SERVICES (Meeting Rooms, Vehicles, Business Cards AI)
// ============================================================================
    // ==========================================
    // Meeting Room Module Logic (Supervisor Only)
    // ==========================================
    let cachedMeetingRooms = [];
    async function loadMobileMeetingRooms() {
      const container = document.getElementById('mobileRoomList');
      if (!container) return;
      container.innerHTML = '<div class="col-span-2 text-center text-xs text-slate-400 py-3">กำลังโหลดห้องประชุม...</div>';
      try {
        const res = await jsonpRequest({ action: 'getMobileMeetingRooms' });
        const rooms = (res && res.data) ? res.data : [];
        cachedMeetingRooms = rooms;
        if (rooms.length === 0) {
          container.innerHTML = '<div class="col-span-2 text-center text-xs text-slate-400 py-3">ไม่พบข้อมูลห้องประชุม</div>';
          return;
        }
        container.innerHTML = rooms.map((r, idx) => {
          const isSelected = idx === 0;
          if (isSelected) {
            document.getElementById('selectedRoomId').value = r.RoomId;
          }
          return `
            <div id="roomCard_${r.RoomId}" onclick="selectMobileRoom('${r.RoomId}')" class="cursor-pointer p-3 rounded-2xl border ${isSelected ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-200 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'} text-left transition flex flex-col justify-between overflow-hidden">
              <div>
                ${r.ImageUrl ? `
                  <div class="w-full h-24 mb-2 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60">
                    <img src="${r.ImageUrl}" alt="${r.RoomName || ''}" class="w-full h-full ${r.ImageFit === 'contain' ? 'object-contain bg-slate-900' : 'object-cover'} ${r.ImageFocus === 'top' ? 'object-top' : (r.ImageFocus === 'bottom' ? 'object-bottom' : 'object-center')}">
                  </div>
                ` : ''}
                <div class="flex items-center justify-between gap-1">
                  <span class="text-xs font-bold text-slate-800 truncate">${r.RoomName || r.RoomId}</span>
                  <span class="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-md font-bold shrink-0">${r.Capacity || '-'} ที่นั่ง</span>
                </div>
                <p class="text-[10px] text-slate-500 mt-1 truncate">${r.Floor ? '📍 ' + r.Floor : ''} ${r.Facilities || r.Equipment ? '• ' + (r.Facilities || r.Equipment) : ''}</p>
              </div>
            </div>
          `;
        }).join('');
      } catch (err) {
        container.innerHTML = '<div class="col-span-2 text-center text-xs text-red-500 py-3">โหลดข้อมูลไม่สำเร็จ: ' + err.message + '</div>';
      }
      loadMobileRoomBookings();
    }

    function selectMobileRoom(roomId) {
      document.getElementById('selectedRoomId').value = roomId;
      cachedMeetingRooms.forEach(r => {
        const card = document.getElementById(`roomCard_${r.RoomId}`);
        if (!card) return;
        if (r.RoomId === roomId) {
          card.className = 'cursor-pointer p-3 rounded-xl border border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-200 text-left transition';
        } else {
          card.className = 'cursor-pointer p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-left transition';
        }
      });
    }

    function toggleMobileHRSection(show) {
      const el = document.getElementById('mobileHRDetails');
      if (el) {
        if (show) el.classList.remove('hidden');
        else el.classList.add('hidden');
      }
    }

    async function submitMobileRoom(e) {
      e.preventDefault();
      const roomId = document.getElementById('selectedRoomId').value;
      const title = document.getElementById('roomMeetingTitle').value.trim();
      const date = document.getElementById('roomBookingDate').value;
      const startTime = document.getElementById('roomStartTime').value;
      const endTime = document.getElementById('roomEndTime').value;
      const count = document.getElementById('roomAttendeeCount').value;
      const notes = document.getElementById('roomNotes').value.trim();
      const btn = document.getElementById('btnSubmitRoom');

      if (!roomId) {
        showToast('กรุณาเลือกห้องประชุม', 'error');
        return;
      }
      if (!title || !date || !startTime || !endTime) {
        showToast('กรุณากรอกข้อมูลการจองให้ครบถ้วน', 'error');
        return;
      }

      const startDateTime = `${date}T${startTime}:00`;
      const endDateTime = `${date}T${endTime}:00`;

      if (new Date(endDateTime).getTime() <= new Date(startDateTime).getTime()) {
        showToast('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น', 'error');
        return;
      }

      const reqHR = document.getElementById('mobileRequireHR') ? document.getElementById('mobileRequireHR').checked : false;
      const hrServices = [];
      if (reqHR) {
        document.querySelectorAll('input[name="mobileHRService"]:checked').forEach(cb => {
          hrServices.push(cb.value);
        });
      }
      const guestCount = reqHR && document.getElementById('mobileHRGuestCount') ? Number(document.getElementById('mobileHRGuestCount').value) || 0 : 0;
      const hrNotes = reqHR && document.getElementById('mobileHRNotes') ? document.getElementById('mobileHRNotes').value.trim() : '';

      btn.disabled = true;
      btn.innerText = 'กำลังตรวจสอบและบันทึกการจอง...';

      try {
        const res = await jsonpRequest({
          action: 'submitMobileRoomBooking',
          employeeId: state.currentUser ? state.currentUser.employeeCode : '',
          employeeName: state.currentUser ? state.currentUser.fullName : '',
          department: state.currentUser ? state.currentUser.department : '',
          roomId: roomId,
          meetingTitle: title,
          startDateTime: startDateTime,
          endDateTime: endDateTime,
          attendeeCount: count,
          notes: notes,
          requireHRService: reqHR,
          hrServices: hrServices,
          guestCount: guestCount,
          hrNotes: hrNotes
        });

        if (res && (res.success || res.status === 'success')) {
          showToast(reqHR ? 'จองห้องสำเร็จ และแจ้งประสานงาน HR เรียบร้อย!' : 'จองห้องประชุมสำเร็จเรียบร้อย!');
          document.getElementById('roomMeetingTitle').value = '';
          document.getElementById('roomNotes').value = '';
          const chkHR = document.getElementById('mobileRequireHR');
          if (chkHR) chkHR.checked = false;
          toggleMobileHRSection(false);
          loadMobileRoomBookings();
        } else {
          showToast(res.error || res.message || 'การจองล้มเหลว หรือมีเวลาซ้อนทับ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = 'ยืนยันการจองห้องประชุม';
      }
    }

    async function loadMobileRoomBookings() {
      const container = document.getElementById('mobileRoomBookingsList');
      if (!container) return;
      try {
        const res = await jsonpRequest({ action: 'getMobileRoomBookings' });
        const list = (res && res.data) ? res.data : [];
        if (list.length === 0) {
          container.innerHTML = '<p class="text-slate-400 text-center py-2 text-xs">ยังไม่มีรายการจองห้องประชุม</p>';
          return;
        }
        container.innerHTML = list.slice(0, 5).map(b => {
          const st = String(b.Status || 'APPROVED').toUpperCase();
          const badgeClass = st === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200';
          const hasHR = String(b.RequireHRService).toUpperCase() === 'TRUE' || b.RequireHRService === true;
          return `
            <div class="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-800 text-xs">${b.MeetingTitle || 'การประชุม'}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full border ${badgeClass} font-semibold">${st}</span>
              </div>
              <p class="text-[11px] text-slate-600">ห้อง: <b class="text-slate-700">${b.RoomName || b.RoomId}</b> | ผู้จอง: ${b.EmployeeName || b.EmployeeId}</p>
              <p class="text-[10px] text-slate-400">🕒 ${b.StartDateTime ? b.StartDateTime.replace('T', ' ') : '-'} ถึง ${b.EndDateTime ? b.EndDateTime.replace('T', ' ') : '-'}</p>
              ${hasHR ? `
                <div class="pt-0.5">
                  <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                    🤝 รับรองแขก: ${b.HRServices || 'บริการ HR'} ${b.GuestCount ? `(${b.GuestCount} ท่าน)` : ''}
                  </span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');
      } catch (err) {
        container.innerHTML = '<p class="text-slate-400 text-center py-2 text-xs">โหลดรายการจองไม่สำเร็จ</p>';
      }
    }

    // ==========================================
    // Vehicle Booking Module Logic (Supervisor Only)
    // ==========================================
    let cachedVehicles = [];
    async function loadMobileVehicles() {
      const container = document.getElementById('mobileVehicleList');
      if (!container) return;
      container.innerHTML = '<div class="col-span-2 text-center text-xs text-slate-400 py-3">กำลังโหลดข้อมูลรถ...</div>';
      try {
        const res = await jsonpRequest({ action: 'getMobileVehicles' });
        const vehicles = (res && res.data) ? res.data : [];
        cachedVehicles = vehicles;
        if (vehicles.length === 0) {
          container.innerHTML = '<div class="col-span-2 text-center text-xs text-slate-400 py-3">ไม่พบข้อมูลรถยนต์</div>';
          return;
        }
        container.innerHTML = vehicles.map((v, idx) => {
          const isSelected = idx === 0;
          if (isSelected) {
            document.getElementById('selectedVehicleId').value = v.VehicleId;
          }
          return `
            <div id="vehCard_${v.VehicleId}" onclick="selectMobileVehicle('${v.VehicleId}')" class="cursor-pointer p-3 rounded-2xl border ${isSelected ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-200 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'} text-left transition flex flex-col justify-between overflow-hidden">
              <div>
                ${v.ImageUrl ? `
                  <div class="w-full h-24 mb-2 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60">
                    <img src="${v.ImageUrl}" alt="${v.BrandModel || v.Brand || ''}" class="w-full h-full ${v.ImageFit === 'contain' ? 'object-contain bg-slate-900' : 'object-cover'} ${v.ImageFocus === 'top' ? 'object-top' : (v.ImageFocus === 'bottom' ? 'object-bottom' : 'object-center')}">
                  </div>
                ` : ''}
                <div class="flex items-center justify-between gap-1">
                  <span class="text-xs font-bold text-slate-800 truncate">${v.BrandModel || v.Brand || v.VehicleId}</span>
                  <span class="text-[10px] text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded-md font-bold shrink-0">${v.SeatCapacity || v.Capacity || 4} ที่นั่ง</span>
                </div>
                <div class="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[10px] border border-slate-200">
                  <span>${v.PlateNumber || v.LicensePlate || v.VehicleId}</span>
                </div>
              </div>
              <div class="mt-1 text-[10px] text-slate-400 flex items-center justify-between">
                <span>${v.Type || v.Model || 'รถส่วนกลาง'}</span>
                ${v.RequireApproval ? '<span class="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded">🇯🇵 รออนุมัติ</span>' : '<span class="text-[9px] font-bold text-emerald-600">อนุมัติทันที</span>'}
              </div>
            </div>
          `;
        }).join('');
      } catch (err) {
        container.innerHTML = '<div class="col-span-2 text-center text-xs text-red-500 py-3">โหลดข้อมูลไม่สำเร็จ: ' + err.message + '</div>';
      }
      loadMobileVehicleBookings();
    }

    function selectMobileVehicle(vehId) {
      document.getElementById('selectedVehicleId').value = vehId;
      cachedVehicles.forEach(v => {
        const card = document.getElementById(`vehCard_${v.VehicleId}`);
        if (!card) return;
        if (v.VehicleId === vehId) {
          card.className = 'cursor-pointer p-3 rounded-xl border border-blue-500 bg-blue-50/70 ring-2 ring-blue-200 text-left transition';
        } else {
          card.className = 'cursor-pointer p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-left transition';
        }
      });
    }

    async function submitMobileVehicle(e) {
      e.preventDefault();
      const vehId = document.getElementById('selectedVehicleId').value;
      const dest = document.getElementById('vehDestination').value.trim();
      const purpose = document.getElementById('vehPurpose').value.trim();
      const startDateTime = document.getElementById('vehStartDateTime').value;
      const endDateTime = document.getElementById('vehEndDateTime').value;
      const passengers = document.getElementById('vehPassengers').value;
      const driver = document.getElementById('vehDriverName').value.trim();
      const btn = document.getElementById('btnSubmitVehicle');

      if (!vehId) {
        showToast('กรุณาเลือกรถยนต์', 'error');
        return;
      }
      if (!dest || !purpose || !startDateTime || !endDateTime) {
        showToast('กรุณากรอกข้อมูลการจองรถให้ครบถ้วน', 'error');
        return;
      }

      if (new Date(endDateTime).getTime() <= new Date(startDateTime).getTime()) {
        showToast('วันเวลาสิ้นสุดต้องอยู่หลังวันเวลาเริ่มต้น', 'error');
        return;
      }

      btn.disabled = true;
      btn.innerText = 'กำลังตรวจสอบและส่งคำขอ...';

      try {
        const res = await jsonpRequest({
          action: 'submitMobileVehicleBooking',
          employeeId: state.currentUser ? state.currentUser.employeeCode : '',
          employeeName: state.currentUser ? state.currentUser.fullName : '',
          department: state.currentUser ? state.currentUser.department : '',
          vehicleId: vehId,
          destination: dest,
          purpose: purpose,
          startDateTime: startDateTime,
          endDateTime: endDateTime,
          passengerCount: passengers,
          driverName: driver || (state.currentUser ? state.currentUser.fullName : '')
        });

        if (res && (res.success || res.status === 'success')) {
          showToast('ยื่นคำขอจองรถยนต์สำเร็จ!');
          document.getElementById('vehDestination').value = '';
          document.getElementById('vehPurpose').value = '';
          loadMobileVehicleBookings();
        } else {
          showToast(res.error || res.message || 'การจองรถล้มเหลว หรือมีเวลาซ้อนทับ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = 'ยื่นคำขอจองรถยนต์';
      }
    }

    async function loadMobileVehicleBookings() {
      const container = document.getElementById('mobileVehicleBookingsList');
      if (!container) return;
      try {
        const res = await jsonpRequest({ action: 'getMobileVehicleBookings' });
        const list = (res && res.data) ? res.data : [];
        if (list.length === 0) {
          container.innerHTML = '<p class="text-slate-400 text-center py-2 text-xs">ยังไม่มีรายการจองรถยนต์</p>';
          return;
        }
        container.innerHTML = list.slice(0, 5).map(b => {
          const st = String(b.Status || 'PENDING').toUpperCase();
          const badgeClass = st === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (st === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200');
          return `
            <div class="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-800 text-xs">${b.Destination || 'เดินทาง'}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full border ${badgeClass} font-semibold">${st}</span>
              </div>
              <p class="text-[11px] text-slate-600">รถ: <b class="text-slate-700">${b.VehicleLicensePlate || b.VehicleId}</b> | ผู้จอง: ${b.EmployeeName || b.EmployeeId}</p>
              <p class="text-[10px] text-slate-400">🕒 ${b.StartDateTime ? b.StartDateTime.replace('T', ' ') : '-'} ถึง ${b.EndDateTime ? b.EndDateTime.replace('T', ' ') : '-'}</p>
            </div>
          `;
        }).join('');
      } catch (err) {
        container.innerHTML = '<p class="text-slate-400 text-center py-2 text-xs">โหลดรายการจองไม่สำเร็จ</p>';
      }
    }


    // ==========================================
    // 17. MOBILE BUSINESS CARDS MODULE (คลังนามบัตรส่วนกลาง)
    // ==========================================
    let mobileBusinessCards = [];
    let currentMobileBcTag = '';
    let currentMobileBcQuery = '';
    let currentMobileBcFrontBase64 = '';
    let currentMobileBcBackBase64 = '';
    let currentMobileBcFrontExistingUrl = '';
    let currentMobileBcBackExistingUrl = '';
    let mobileBcFormTags = [];
    let currentEditingMobileBcId = null;
    let currentMobileBcViewingCard = null;

    /**
     * จัดลำดับและแปลงรูปแบบเบอร์โทรศัพท์ (เน้นเบอร์มือถือเป็นอันดับแรกเพื่อพร้อมโทร)
     */
    function normalizeAndPrioritizePhones(rawPhones) {
      if (!rawPhones) return [];
      let flatList = [];
      if (Array.isArray(rawPhones)) {
        rawPhones.forEach(item => {
          if (typeof item === 'string') {
            flatList.push(...item.split(/[,\n;/]+/));
          } else if (item) {
            flatList.push(String(item));
          }
        });
      } else {
        flatList = String(rawPhones).split(/[,\n;/]+/);
      }
      
      const parsed = [];
      flatList.forEach(p => {
        let s = String(p).trim();
        if (!s) return;
        
        // แปลงรหัสประเทศ +66 เป็น 0
        s = s.replace(/\+66\s*\(?0\)?\s*/g, '0');
        s = s.replace(/^\+66\s*/g, '0');
        
        const digits = s.replace(/\D/g, '');
        
        // เบอร์มือถือ 10 หลัก (06, 08, 09)
        if (digits.length === 10 && (digits.startsWith('06') || digits.startsWith('08') || digits.startsWith('09'))) {
          const formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
          parsed.push({ original: s, formatted: formatted, digits: digits, isMobile: true, priority: 1 });
        }
        // เบอร์มือถือ 9 หลักที่ไม่มีเลข 0 นำหน้า (เช่น 81xxxxxxx)
        else if (digits.length === 9 && (digits.startsWith('6') || digits.startsWith('8') || digits.startsWith('9'))) {
          const d10 = '0' + digits;
          const formatted = `${d10.slice(0, 3)}-${d10.slice(3, 6)}-${d10.slice(6)}`;
          parsed.push({ original: s, formatted: formatted, digits: d10, isMobile: true, priority: 1 });
        }
        // เบอร์สำนักงาน กทม. (02-xxx-xxxx)
        else if (digits.length === 9 && digits.startsWith('02')) {
          const formatted = `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
          parsed.push({ original: s, formatted: formatted, digits: digits, isMobile: false, priority: 2 });
        }
        // เบอร์สำนักงานต่างจังหวัด (03x, 04x, 05x, 07x)
        else if (digits.length === 9 && digits.startsWith('0')) {
          const formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
          parsed.push({ original: s, formatted: formatted, digits: digits, isMobile: false, priority: 2 });
        }
        // เบอร์ กทม. ขาดเลข 0 (2-xxx-xxxx)
        else if (digits.length === 8 && digits.startsWith('2')) {
          const d9 = '0' + digits;
          const formatted = `${d9.slice(0, 2)}-${d9.slice(2, 5)}-${d9.slice(5)}`;
          parsed.push({ original: s, formatted: formatted, digits: d9, isMobile: false, priority: 2 });
        }
        // เบอร์อื่นๆ หรือต่างประเทศ (เช่น +81)
        else if (digits.length >= 8) {
          parsed.push({ original: s, formatted: s, digits: digits, isMobile: false, priority: 3 });
        }
      });

      // เรียงลำดับ: มือถือมาก่อน (priority 1), เบอร์สำนักงานตามมา (priority 2), อื่นๆ (priority 3)
      parsed.sort((a, b) => a.priority - b.priority);

      const seen = new Set();
      const results = [];
      for (const item of parsed) {
        const key = item.digits || item.formatted;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(item.formatted);
        }
      }
      return results;
    }

    function cleanDialNumber(phoneStr) {
      if (!phoneStr) return '';
      const s = String(phoneStr).trim();
      if (s.startsWith('+')) {
        return '+' + s.slice(1).replace(/\D/g, '');
      }
      return s.replace(/\D/g, '');
    }

    async function loadMobileBusinessCards(silent = false) {
      const container = document.getElementById('mobBcListContainer');
      const countEl = document.getElementById('mobBcCount');

      // 1. Instant Cache-First: โหลดข้อมูลจาก LocalStorage ขึ้นมาแสดงทันทีใน 0.05 วินาที
      if (!silent && (!mobileBusinessCards || mobileBusinessCards.length === 0)) {
        try {
          const cachedStr = localStorage.getItem('MINAMIDA_BC_CACHE');
          if (cachedStr) {
            const cachedCards = JSON.parse(cachedStr);
            if (Array.isArray(cachedCards) && cachedCards.length > 0) {
              mobileBusinessCards = cachedCards;
              renderMobileBusinessCards();
            }
          }
        } catch(e) {
          console.warn('Load BC cache warning:', e);
        }
      }

      if (container && (!mobileBusinessCards || mobileBusinessCards.length === 0)) {
        container.innerHTML = '<p class="text-xs text-slate-400 text-center py-8">⏳ กำลังโหลดข้อมูลนามบัตร...</p>';
      }

      const myEmpId = state.currentUser ? (state.currentUser.employeeId || state.currentUser.employeeCode || '') : '';
      try {
        const res = await postApiRequest({
          action: 'getMobileBusinessCards',
          empId: myEmpId,
          query: currentMobileBcQuery,
          tags: currentMobileBcTag ? [currentMobileBcTag] : []
        });

        if (res && res.status === 'success') {
          mobileBusinessCards = Array.isArray(res.cards) ? res.cards : [];
          try {
            if (!currentMobileBcQuery && !currentMobileBcTag) {
              localStorage.setItem('MINAMIDA_BC_CACHE', JSON.stringify(mobileBusinessCards));
            }
          } catch(e) {}
          renderMobileBusinessCards();
        } else {
          if (container && (!mobileBusinessCards || mobileBusinessCards.length === 0)) {
            container.innerHTML = `<p class="text-xs text-rose-500 text-center py-6">${(res && res.message) || 'ไม่สามารถโหลดข้อมูลนามบัตรได้'}</p>`;
          }
        }
      } catch (err) {
        console.error('loadMobileBusinessCards error:', err);
        if (container && (!mobileBusinessCards || mobileBusinessCards.length === 0)) {
          container.innerHTML = '<p class="text-xs text-rose-500 text-center py-6">เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์</p>';
        }
      }
    }

    function renderMobileBusinessCards() {
      const container = document.getElementById('mobBcListContainer');
      const countEl = document.getElementById('mobBcCount');
      const activeFilterTextEl = document.getElementById('mobBcActiveFilterText');
      if (!container) return;

      // Filter local cards if needed
      let list = mobileBusinessCards;
      if (currentMobileBcQuery) {
        const tokens = currentMobileBcQuery.toLowerCase().split(/[\s#]+/).filter(Boolean);
        if (tokens.length > 0) {
          list = list.filter(c => {
            const fullText = [
              c.contactName || '',
              c.companyName || '',
              c.position || '',
              c.department || '',
              Array.isArray(c.phones) ? c.phones.join(' ') : (c.phone || ''),
              Array.isArray(c.emails) ? c.emails.join(' ') : (c.email || ''),
              Array.isArray(c.tags) ? c.tags.join(' ') : '',
              c.notes || ''
            ].join(' ').toLowerCase();

            return tokens.every(token => fullText.includes(token));
          });
        }
      }

      if (currentMobileBcTag) {
        const targetTag = currentMobileBcTag.toLowerCase().replace(/^#/, '');
        list = list.filter(c => Array.isArray(c.tags) && c.tags.some(t => String(t).toLowerCase().replace(/^#/, '') === targetTag));
      }

      if (countEl) countEl.innerText = list.length;
      if (activeFilterTextEl) {
        if (currentMobileBcTag) {
          activeFilterTextEl.innerText = `กรอง: #${currentMobileBcTag}`;
        } else if (currentMobileBcQuery) {
          activeFilterTextEl.innerText = `ค้น: "${currentMobileBcQuery}"`;
        } else {
          activeFilterTextEl.innerText = '';
        }
      }

      if (list.length === 0) {
        container.innerHTML = `
          <div class="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <span class="text-3xl">🔍</span>
            <h4 class="font-bold text-slate-700 text-sm">ไม่พบนามบัตร</h4>
            <p class="text-xs text-slate-400">ลองเปลี่ยนคำค้นหา หรือแตะแท็กอื่น</p>
          </div>
        `;
        return;
      }

      let html = '';
      list.forEach(c => {
        const cardId = c.cardId || '';
        const contactName = c.contactName || 'ไม่ระบุชื่อ';
        const compName = c.companyName || '-';
        const position = c.position || c.department || '-';
        const rawPhones = (Array.isArray(c.phones) && c.phones.length > 0) ? c.phones : (c.phone ? [c.phone] : []);
        const sortedPhones = normalizeAndPrioritizePhones(rawPhones);
        const firstPhone = sortedPhones[0] || '';
        const cleanFirstPhone = cleanDialNumber(firstPhone);
        const frontImg = c.imgFrontRef || '';
        const tags = Array.isArray(c.tags) ? c.tags : [];
        const initials = ((contactName !== 'ไม่ระบุชื่อ' ? contactName : compName).trim().slice(0, 2)).toUpperCase();

        let tagChipsHtml = '';
        tags.forEach(t => {
          tagChipsHtml += `<span onclick="event.stopPropagation(); filterMobileBcTag('${t}')" class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 cursor-pointer">#${t}</span>`;
        });

        html += `
          <div onclick="openMobileBcDetailModal('${cardId}')" class="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-violet-300 transition cursor-pointer space-y-2.5">
            <div class="flex items-start gap-3">
              <!-- Thumbnail or Initials Avatar -->
              ${frontImg ? `
                <div class="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center relative">
                  <img src="${frontImg.replace('sz=w1200', 'sz=w200')}" loading="lazy" class="w-full h-full object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-full h-full bg-violet-600 text-white font-bold text-xs flex items-center justify-center\\'>${initials}</div>'">
                  ${c.hasBackImage ? `<span class="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-black/60 text-[8px] text-white rounded font-bold">2 หน้า</span>` : ''}
                </div>
              ` : `
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
                  ${initials}
                </div>
              `}

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1">
                  <h4 class="font-bold text-slate-800 text-xs truncate leading-tight">${contactName}</h4>
                  <span class="text-[9px] font-mono text-slate-400 flex-shrink-0">${cardId}</span>
                </div>
                <div class="text-[11px] text-slate-500 truncate mt-0.5">${position}</div>
                <div class="text-xs font-semibold text-violet-700 truncate mt-0.5">${compName}</div>
              </div>
            </div>

            <!-- Tags -->
            ${tagChipsHtml ? `<div class="flex flex-wrap gap-1 pt-0.5">${tagChipsHtml}</div>` : ''}

            <!-- Bottom Action Row: Call Button & Detail -->
            <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              ${firstPhone ? `
                <a href="tel:${cleanFirstPhone}" onclick="event.stopPropagation()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-2xs active:scale-95 transition">
                  <span>📞 โทร ${firstPhone}</span>
                </a>
              ` : `<span class="text-[10px] text-slate-400">ไม่มีเบอร์โทรศัพท์</span>`}

              <div class="flex items-center gap-1.5">
                <button type="button" onclick="event.stopPropagation(); openEditMobileBcModal('${cardId}')" class="inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-2 py-1 rounded-lg border border-violet-200 shadow-2xs active:scale-95 transition">
                  <span>✏️ แก้ไข</span>
                </button>
                <button type="button" onclick="event.stopPropagation(); openMobileBcDetailModal('${cardId}')" class="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-600 hover:text-slate-800 px-1.5 py-1">
                  <span>ดูเต็ม ›</span>
                </button>
              </div>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    function handleMobileBcSearch(val) {
      currentMobileBcQuery = (val || '').trim();
      const clearBtn = document.getElementById('mobBcClearSearchBtn');
      if (clearBtn) {
        if (currentMobileBcQuery) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
      }
      renderMobileBusinessCards();
    }

    function clearMobileBcSearch() {
      const input = document.getElementById('mobBcSearchInput');
      if (input) input.value = '';
      handleMobileBcSearch('');
    }

    function filterMobileBcTag(tag) {
      currentMobileBcTag = (tag || '').trim();

      // Update chip styling
      const buttons = document.querySelectorAll('.mob-bc-tag-btn');
      buttons.forEach(btn => {
        btn.className = 'mob-bc-tag-btn px-2.5 py-1 rounded-lg font-medium text-[11px] bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700 whitespace-nowrap';
      });

      if (!currentMobileBcTag) {
        const allBtn = document.getElementById('mobBcTag_ALL');
        if (allBtn) allBtn.className = 'mob-bc-tag-btn px-2.5 py-1 rounded-lg font-medium text-[11px] bg-violet-600 text-white shadow-2xs whitespace-nowrap';
      } else {
        buttons.forEach(btn => {
          if (btn.innerText.includes(currentMobileBcTag)) {
            btn.className = 'mob-bc-tag-btn px-2.5 py-1 rounded-lg font-medium text-[11px] bg-violet-600 text-white shadow-2xs whitespace-nowrap';
          }
        });
      }

      renderMobileBusinessCards();
    }

    // Modal: Add Business Card
    function openAddMobileBcModal() {
      const modal = document.getElementById('modalAddMobileBc');
      if (!modal) return;
      currentEditingMobileBcId = null;
      currentMobileBcFrontExistingUrl = '';
      currentMobileBcBackExistingUrl = '';
      const titleEl = document.getElementById('mobAddBcModalTitle');
      if (titleEl) titleEl.innerText = 'เพิ่มนามบัตรใหม่';
      const submitBtn = document.getElementById('mobBcSubmitBtn');
      if (submitBtn) submitBtn.innerHTML = '<span>บันทึกนามบัตร</span>';

      document.getElementById('formAddMobileBc').reset();
      clearMobileBcPhoto('front');
      clearMobileBcPhoto('back');
      mobileBcFormTags = [];
      renderMobileBcFormTags();
      modal.classList.remove('hidden');
    }

    function closeAddMobileBcModal() {
      const modal = document.getElementById('modalAddMobileBc');
      if (modal) modal.classList.add('hidden');
      currentEditingMobileBcId = null;
    }

    // Modal: Edit Business Card on Mobile
    function openEditMobileBcModal(cardId) {
      const card = mobileBusinessCards.find(c => c.cardId === cardId);
      if (!card) {
        showToast('ไม่พบนามบัตรที่ต้องการแก้ไข', 'error');
        return;
      }

      const modal = document.getElementById('modalAddMobileBc');
      if (!modal) return;

      currentEditingMobileBcId = card.cardId;
      const titleEl = document.getElementById('mobAddBcModalTitle');
      if (titleEl) titleEl.innerHTML = `<span class="text-violet-700 font-bold">✏️ แก้ไขนามบัตร (${card.cardId})</span>`;
      const submitBtn = document.getElementById('mobBcSubmitBtn');
      if (submitBtn) submitBtn.innerHTML = '<span>บันทึกการแก้ไข</span>';

      document.getElementById('formAddMobileBc').reset();

      // กรอกข้อมูลเดิมลงในฟอร์ม
      const companyInput = document.getElementById('mobBcFormCompanyName');
      if (companyInput) companyInput.value = card.companyName || '';

      const contactInput = document.getElementById('mobBcFormContactName');
      if (contactInput) contactInput.value = card.contactName || '';

      const positionInput = document.getElementById('mobBcFormPosition');
      if (positionInput) positionInput.value = card.position || card.department || '';

      const phoneInput = document.getElementById('mobBcFormPhone');
      if (phoneInput) {
        const rawPhones = Array.isArray(card.phones) ? card.phones : (card.phone ? [card.phone] : []);
        const sorted = normalizeAndPrioritizePhones(rawPhones);
        phoneInput.value = sorted.join(', ');
      }

      const emailInput = document.getElementById('mobBcFormEmail');
      if (emailInput) {
        const rawEmails = Array.isArray(card.emails) ? card.emails : (card.email ? [card.email] : []);
        emailInput.value = rawEmails.join(', ');
      }

      const webInput = document.getElementById('mobBcFormWebsite');
      if (webInput) webInput.value = card.website || card.lineId || '';

      const addressInput = document.getElementById('mobBcFormAddress');
      if (addressInput) addressInput.value = card.address || '';

      const notesInput = document.getElementById('mobBcFormNotes');
      if (notesInput) notesInput.value = card.notes || '';

      // แท็กเดิม
      mobileBcFormTags = Array.isArray(card.tags) ? [...card.tags] : [];
      renderMobileBcFormTags();

      // จัดการรูปภาพเดิม
      currentMobileBcFrontBase64 = '';
      currentMobileBcBackBase64 = '';
      currentMobileBcFrontExistingUrl = card.imgFrontRef || '';
      currentMobileBcBackExistingUrl = card.imgBackRef || '';

      const frontPreviewBox = document.getElementById('mobBcFrontPreviewBox');
      const frontPreviewEl = document.getElementById('mobBcFrontPreview');
      const scanBtn = document.getElementById('mobBtnScanCardFrontOcr');
      if (currentMobileBcFrontExistingUrl) {
        if (frontPreviewEl) frontPreviewEl.src = currentMobileBcFrontExistingUrl;
        if (frontPreviewBox) frontPreviewBox.classList.remove('hidden');
        if (scanBtn) scanBtn.classList.remove('hidden');
      } else {
        if (frontPreviewBox) frontPreviewBox.classList.add('hidden');
        if (scanBtn) scanBtn.classList.add('hidden');
      }

      const backPreviewBox = document.getElementById('mobBcBackPreviewBox');
      const backPreviewEl = document.getElementById('mobBcBackPreview');
      if (currentMobileBcBackExistingUrl) {
        if (backPreviewEl) backPreviewEl.src = currentMobileBcBackExistingUrl;
        if (backPreviewBox) backPreviewBox.classList.remove('hidden');
      } else {
        if (backPreviewBox) backPreviewBox.classList.add('hidden');
      }

      closeMobileBcDetailModal();
      modal.classList.remove('hidden');
    }

    function openEditMobileBcModalFromDetail() {
      if (currentMobileBcViewingCard && currentMobileBcViewingCard.cardId) {
        openEditMobileBcModal(currentMobileBcViewingCard.cardId);
      }
    }

    function addMobileBcFormTag(rawInput) {
      if (!rawInput) return;
      const str = String(rawInput).trim();
      if (!str) return;

      let tokens = [];
      if (str.includes('#')) {
        tokens = str.split(/[#,\n\r\t]+/).map(t => t.trim()).filter(Boolean);
      } else if (str.includes(',')) {
        tokens = str.split(/[,]+/).map(t => t.trim()).filter(Boolean);
      } else {
        tokens = str.split(/\s+/).map(t => t.trim()).filter(Boolean);
      }

      tokens.forEach(clean => {
        clean = clean.replace(/#/g, '').trim();
        if (clean && !mobileBcFormTags.includes(clean)) {
          mobileBcFormTags.push(clean);
        }
      });
      renderMobileBcFormTags();
    }

    function removeMobileBcFormTag(tag) {
      mobileBcFormTags = mobileBcFormTags.filter(t => t !== tag);
      renderMobileBcFormTags();
    }

    function renderMobileBcFormTags() {
      const container = document.getElementById('mobBcFormTagsBadgeList');
      if (!container) return;
      if (mobileBcFormTags.length === 0) {
        container.innerHTML = '<span class="text-[10px] text-slate-400 italic">ยังไม่มีแฮชแท็ก</span>';
        return;
      }
      let html = '';
      mobileBcFormTags.forEach(t => {
        html += `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-violet-100 text-violet-800">
            #${t}
            <button type="button" onclick="removeMobileBcFormTag('${t}')" class="text-violet-500 hover:text-rose-600 transition ml-0.5">✕</button>
          </span>
        `;
      });
      container.innerHTML = html;
    }

    function handleMobileBcPhotoSelect(e, side) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        const img = new Image();
        img.onload = function() {
          const maxDim = 1024;
          let width = img.width;
          let height = img.height;
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.72);

          if (side === 'front') {
            currentMobileBcFrontBase64 = base64;
            const previewEl = document.getElementById('mobBcFrontPreview');
            const previewBox = document.getElementById('mobBcFrontPreviewBox');
            if (previewEl) previewEl.src = base64;
            if (previewBox) previewBox.classList.remove('hidden');
            const scanBtn = document.getElementById('mobBtnScanCardFrontOcr');
            if (scanBtn) scanBtn.classList.remove('hidden');
          } else {
            currentMobileBcBackBase64 = base64;
            const previewEl = document.getElementById('mobBcBackPreview');
            const previewBox = document.getElementById('mobBcBackPreviewBox');
            if (previewEl) previewEl.src = base64;
            if (previewBox) previewBox.classList.remove('hidden');
          }
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }

    function clearMobileBcPhoto(side) {
      if (side === 'front') {
        currentMobileBcFrontBase64 = '';
        currentMobileBcFrontExistingUrl = '';
        const previewBox = document.getElementById('mobBcFrontPreviewBox');
        if (previewBox) previewBox.classList.add('hidden');
        const scanBtn = document.getElementById('mobBtnScanCardFrontOcr');
        if (scanBtn) scanBtn.classList.add('hidden');
      } else {
        currentMobileBcBackBase64 = '';
        currentMobileBcBackExistingUrl = '';
        const previewBox = document.getElementById('mobBcBackPreviewBox');
        if (previewBox) previewBox.classList.add('hidden');
      }
    }

    // Dynamic loader for Tesseract.js (Client-side free OCR on Mobile)
    let _mobTesseractLoaderPromise = null;
    function loadMobileTesseractJs() {
      if (window.Tesseract) return Promise.resolve(window.Tesseract);
      if (_mobTesseractLoaderPromise) return _mobTesseractLoaderPromise;

      _mobTesseractLoaderPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        script.async = true;
        script.onload = () => {
          if (window.Tesseract) resolve(window.Tesseract);
          else reject(new Error('Tesseract script loaded but window.Tesseract not found'));
        };
        script.onerror = () => {
          _mobTesseractLoaderPromise = null;
          reject(new Error('ไม่สามารถโหลดระบบอ่านตัวอักษรได้ กรุณาตรวจสอบสัญญาณอินเทอร์เน็ต'));
        };
        document.head.appendChild(script);
      });
      return _mobTesseractLoaderPromise;
    }

    // Client-side text parser for 3 languages (Thai / English / Japanese)
    function parseMobileBcText(rawText) {
      const text = String(rawText || '').trim();
      if (!text) {
        return { companyName: '', contactName: '', position: '', phones: [], emails: [], lineId: '', website: '', address: '', suggestedTags: [] };
      }

      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

      // 1. Phone Numbers (Thai mobile 08x, 09x, 06x, landline 02, 03x, or international +66 / +81)
      const phoneRegex = /(?:\+?66|0)[-.\s]?\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
      const rawPhones = text.match(phoneRegex) || [];
      const phones = [...new Set(rawPhones.map(p => p.trim().replace(/\s+/g, '-')))];

      // 2. Email addresses
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
      const rawEmails = text.match(emailRegex) || [];
      const emails = [...new Set(rawEmails.map(e => e.toLowerCase()))];

      // 3. Website
      const urlRegex = /(?:https?:\/\/|www\.)[^\s,;\"'<>]+/gi;
      const rawWebs = text.match(urlRegex) || [];
      const website = rawWebs.length > 0 ? rawWebs[0] : '';

      // 4. LINE ID
      const lineMatch = text.match(/(?:LINE(?:\s*ID)?|Line)\s*[:]?\s*([@a-zA-Z0-9._-]+)/i);
      const lineId = lineMatch ? lineMatch[1] : '';

      // 5. Position (Thai, English, Japanese)
      const positionKeywords = [
        'Managing Director', 'General Manager', 'Director', 'President', 'Vice President', 'CEO', 'COO', 'CTO',
        'Manager', 'Supervisor', 'Engineer', 'Specialist', 'Consultant', 'Officer', 'Leader',
        'กรรมการผู้จัดการ', 'ผู้จัดการทั่วไป', 'ผู้จัดการฝ่าย', 'ผู้จัดการ', 'หัวหน้างาน', 'หัวหน้าฝ่าย', 'วิศวกร', 'เจ้าหน้าที่',
        '代表取締役社長', '代表取締役', '取締役', '工場長', '支店長', '部長', '次長', '課長', '係長', '主任', 'リーダー', 'マネージャー', '担当'
      ];
      let position = '';
      for (const l of lines) {
        for (const kw of positionKeywords) {
          if (l.toLowerCase().includes(kw.toLowerCase())) {
            position = l;
            break;
          }
        }
        if (position) break;
      }

      // 6. Company Name
      const companyKeywords = ['co., ltd', 'co.,ltd', 'limited', 'inc.', 'corp.', 'บริษัท', 'บจก.', 'หจก.', '株式会社', '有限会社', '合同会社'];
      const companyLines = [];
      for (const l of lines) {
        for (const kw of companyKeywords) {
          if (l.toLowerCase().includes(kw)) {
            companyLines.push(l);
            break;
          }
        }
      }
      const companyName = companyLines.join(' / ');

      // 7. Address
      const addressKeywords = ['estate', 'industrial', 'road', 'rd.', 'นิคม', 'ถนน', 'ถ.', 'ตำบล', 'ต.', 'อำเภอ', 'อ.', 'จังหวัด', 'จ.', 'อาคาร', 'bangpa-in', 'ayutthaya', 'rayong', 'chonburi', 'bangkok', '〒'];
      const addressLines = [];
      for (const l of lines) {
        if (companyLines.includes(l) || l === position || l.includes('@') || phoneRegex.test(l) || urlRegex.test(l)) continue;
        for (const kw of addressKeywords) {
          if (l.toLowerCase().includes(kw)) {
            addressLines.push(l);
            break;
          }
        }
      }
      const address = addressLines.join(' ');

      // 8. Contact Name
      let contactName = '';
      for (const l of lines) {
        if (companyLines.includes(l) || addressLines.includes(l) || l === position) continue;
        if (l.includes('@') || phoneRegex.test(l) || urlRegex.test(l) || /line/i.test(l) || /tel/i.test(l) || /fax/i.test(l)) continue;
        if (l.length >= 3 && l.length <= 40) {
          contactName = l;
          break;
        }
      }

      // 9. Smart Suggested Tags
      const suggestedTags = [];
      if (/japan|ญี่ปุ่น|co\.,\s*ltd|株式会社|有限会社|tokyo|osaka|nagoya/i.test(text)) suggestedTags.push('คู่ค้าญี่ปุ่น');
      if (/mold|die|แม่พิมพ์/i.test(text)) suggestedTags.push('ผู้ผลิตแม่พิมพ์');
      if (/cnc|machining|กลึง|มิลลิ่ง/i.test(text)) suggestedTags.push('งานกลึงCNC');
      if (/plastic|injection|ฉีดพลาสติก/i.test(text)) suggestedTags.push('งานฉีดพลาสติก');
      if (/logistics|transport|ขนส่ง|โลจิสติกส์/i.test(text)) suggestedTags.push('ขนส่งโลจิสติกส์');
      if (/packaging|กล่อง|บรรจุภัณฑ์/i.test(text)) suggestedTags.push('บรรจุภัณฑ์');
      if (/steel|metal|iron|เหล็ก|โลหะ/i.test(text)) suggestedTags.push('เหล็กและโลหะ');
      if (/tooling|cutting|เครื่องมือช่าง/i.test(text)) suggestedTags.push('ทูลลิ่ง');
      if (/chemical|oil|หล่อลื่น|เคมี/i.test(text)) suggestedTags.push('เคมีภัณฑ์');
      if (/bangpa-in|บางปะอิน/i.test(text)) suggestedTags.push('นิคมบางปะอิน');
      if (/amata|อมตะ/i.test(text)) suggestedTags.push('นิคมอมตะ');

      return { companyName, contactName, position, phones, emails, lineId, website, address, suggestedTags };
    }

    // ดึง API Key จาก localStorage หรือจาก Script Properties หลังบ้าน
    async function getEffectiveMobileGeminiApiKey() {
      let key = localStorage.getItem('MINAMIDA_GEMINI_API_KEY');
      if (key && key.trim()) return key.trim();

      const myEmpId = state.currentUser ? (state.currentUser.employeeId || state.currentUser.employeeCode || '') : '';
      try {
        const res = await postApiRequest({
          action: 'getGeminiApiKey',
          callerEmpId: myEmpId
        });
        if (res && res.status === 'success' && res.apiKey) {
          key = res.apiKey.trim();
          localStorage.setItem('MINAMIDA_GEMINI_API_KEY', key);
          return key;
        }
      } catch (e) {
        console.warn('getGeminiApiKey mobile fetch failed:', e);
      }

      const entered = prompt('ระบบสแกนนามบัตรทำงานด้วย Gemini AI (ฟรี 100%)\nกรุณาวาง API Key ที่ได้รับจาก Google AI Studio (aistudio.google.com):');
      if (entered && entered.trim()) {
        key = entered.trim();
        localStorage.setItem('MINAMIDA_GEMINI_API_KEY', key);
        postApiRequest({
          action: 'saveGeminiApiKey',
          apiKey: key,
          callerEmpId: myEmpId
        }).catch(() => {});
        return key;
      }
      return null;
    }

    // เรียก Gemini REST API ตรงจากเบราว์เซอร์มือถือ (ผ่าน CORS ได้ 100% โดยไม่ต้องขอ Scope Apps Script)
    async function callMobileGeminiApiDirectly(apiKey, base64Image) {
      const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim();
      const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      const prompt = `You are an expert OCR and data extraction AI specializing in business cards (Thai, English, Japanese).
Analyze this business card image with high precision:
1. Note that the image might be rotated (90 degrees, 180 degrees, sideways, or upside down) or taken at an angle. Mentally rotate and orient it properly before extracting.
2. Extract all contact and company details strictly into the JSON format specified below.

JSON Format:
{
  "contactName": "string",
  "companyName": "string",
  "position": "string",
  "phones": ["string"],
  "emails": ["string"],
  "website": "string",
  "lineId": "string",
  "address": "string",
  "suggestedTags": ["string"],
  "notes": "string"
}

Strict Rules:
- contactName: The person's personal name only. (CRITICAL: Do NOT put company name or company logo text here).
- companyName: The full legal company name (e.g. Minamida (Thailand) Co., Ltd., บริษัท ... จำกัด, 株式会社...).
- position: Job title / department (e.g. Manager Sales, Managing Director, 代表取締役, ผู้จัดการ).
- phones: CRITICAL PHONE EXTRACTION RULE:
  1. PRIORITIZE MOBILE PHONE: If a personal mobile phone (เบอร์มือถือ เช่น 08x, 09x, 06x) is found on the card, place the mobile phone number FIRST in the array.
  2. OFFICE / LANDLINE FALLBACK: Only include the office/company landline (e.g. 02-xxx-xxxx, 038-xxx-xxxx) if NO mobile phone is present, or put it after mobile phones. Do NOT include fax numbers.
  3. READY-TO-CALL FORMAT: Convert international country codes (+66) to standard ready-to-call local format (e.g. convert '+66 81 234 5678' or '+66(0)81-234-5678' into '081-234-5678', and '+66 2 123 4567' into '02-123-4567'). For international cards outside Thailand (e.g. Japan +81), keep in '+81-xx-xxx-xxxx'.
  4. CRITICAL: Do NOT include Tax ID / Tax number / เลขประจำตัวผู้เสียภาษี.
- emails: Email address(es).
- website: Company website URL.
- lineId: LINE ID if present (e.g. "@company" or "line_id").
- address: Factory, office, or industrial estate address.
- suggestedTags: 3 to 4 relevant industrial hashtags starting with # (e.g. #ลูกค้า, #ซัพพลายเออร์, #คู่ค้าญี่ปุ่น, #ชิ้นส่วน/ทูลลิ่ง, #นิคมปิ่นทอง, #นิคมบางปะอิน, #งานกลึงCNC, etc.).
- notes: 1-sentence executive summary in Thai describing this business/contact (e.g. 'ผู้ติดต่อฝ่ายขาย บริษัท... ผลิตชิ้นส่วนยานยนต์ นิคมปิ่นทอง').
`;

      const payload = {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: cleanBase64
                }
              },
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
          max_output_tokens: 800,
          temperature: 0.1
        }
      };

      const models = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
      let lastErr = null;

      for (const model of models) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const resJson = await response.json();
          if (response.ok) {
            const rawText = resJson.candidates &&
                            resJson.candidates[0] &&
                            resJson.candidates[0].content &&
                            resJson.candidates[0].content.parts &&
                            resJson.candidates[0].content.parts[0] &&
                            resJson.candidates[0].content.parts[0].text;
            if (rawText) {
              const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
              return JSON.parse(cleanJson);
            }
          } else {
            lastErr = resJson.error && resJson.error.message ? resJson.error.message : `HTTP ${response.status}`;
          }
        } catch (e) {
          lastErr = e.message || e.toString();
        }
      }

      throw new Error(lastErr || 'ไม่สามารถวิเคราะห์ข้อมูลจากภาพได้');
    }

    // ⚡ Instant Photo Auto-Scan using Gemini 2.5 Flash (Mobile LIFF)
    async function triggerMobileCardAutoScan() {
      const imageSrc = currentMobileBcFrontBase64;
      if (!imageSrc) {
        showToast('กรุณาถ่ายรูปหรือเลือกรูปหน้าบัตรก่อนกดสแกน', 'warning');
        return;
      }

      const btn = document.getElementById('mobBtnScanCardFrontOcr');
      const btnText = document.getElementById('mobBtnScanCardFrontOcrText');
      const origHtml = btnText ? btnText.innerHTML : '';

      try {
        if (btn) btn.disabled = true;
        if (btnText) btnText.innerHTML = '⚡ กำลังเชื่อมต่อระบบ AI...';

        const apiKey = await getEffectiveMobileGeminiApiKey();
        if (!apiKey) {
          showToast('กรุณาระบุ Gemini API Key เพื่อเริ่มการสแกน', 'warning');
          return;
        }

        if (btnText) btnText.innerHTML = '⚡ Gemini AI กำลังวิเคราะห์รูปภาพนามบัตร...';

        const parsed = await callMobileGeminiApiDirectly(apiKey, imageSrc);

        if (parsed) {
          if (parsed.companyName) document.getElementById('mobBcFormCompanyName').value = parsed.companyName;
          if (parsed.contactName) document.getElementById('mobBcFormContactName').value = parsed.contactName;
          if (parsed.position) document.getElementById('mobBcFormPosition').value = parsed.position;
          if (parsed.phones && parsed.phones.length > 0) {
            const sortedPhones = normalizeAndPrioritizePhones(parsed.phones);
            document.getElementById('mobBcFormPhone').value = sortedPhones.join(', ');
          }
          if (parsed.emails && parsed.emails.length > 0) document.getElementById('mobBcFormEmail').value = parsed.emails.join(', ');
          if (parsed.website) {
            document.getElementById('mobBcFormWebsite').value = parsed.website;
          } else if (parsed.lineId) {
            document.getElementById('mobBcFormWebsite').value = 'Line: ' + parsed.lineId;
          }
          if (parsed.address) document.getElementById('mobBcFormAddress').value = parsed.address;
          if (parsed.notes && !document.getElementById('mobBcFormNotes').value) {
            document.getElementById('mobBcFormNotes').value = parsed.notes;
          }
          if (parsed.suggestedTags && Array.isArray(parsed.suggestedTags)) {
            parsed.suggestedTags.forEach(t => addMobileBcFormTag(t));
          }

          // ตรวจสอบนามบัตรซ้ำทันทีหลัง AI สแกน (Instant Duplicate Check on Mobile)
          if (!mobileBusinessCards || mobileBusinessCards.length === 0) {
            try {
              const myEmpId = state.currentUser ? (state.currentUser.employeeId || state.currentUser.employeeCode || '') : '';
              const fetchRes = await postApiRequest({
                action: 'getMobileBusinessCards',
                empId: myEmpId,
                query: '',
                tags: []
              });
              if (fetchRes && fetchRes.status === 'success' && Array.isArray(fetchRes.cards)) {
                mobileBusinessCards = fetchRes.cards;
              }
            } catch (fetchErr) {
              console.warn('Pre-fetch mobileBusinessCards error:', fetchErr);
            }
          }

          const normName = (parsed.contactName || '').trim().toLowerCase();
          const normComp = (parsed.companyName || '').trim().toLowerCase();
          const rawPhones = Array.isArray(parsed.phones) ? parsed.phones : [];
          const normPhones = rawPhones.map(p => String(p).replace(/\D/g, '')).filter(p => p.length >= 8);
          const rawEmails = Array.isArray(parsed.emails) ? parsed.emails : (parsed.email ? [parsed.email] : []);
          const normEmails = rawEmails.map(e => String(e).trim().toLowerCase()).filter(Boolean);

          const duplicate = (mobileBusinessCards || []).find(c => {
            const cName = (c.contactName || '').trim().toLowerCase();
            const cComp = (c.companyName || '').trim().toLowerCase();
            // 1. Phone match (>= 8 digits)
            if (normPhones.length > 0) {
              const cPhones = (c.phones || []).map(p => String(p).replace(/\D/g, '')).filter(p => p.length >= 8);
              if (normPhones.some(np => cPhones.includes(np))) return true;
            }
            // 2. Email match
            if (normEmails.length > 0) {
              const cEmails = (c.emails || []).map(e => String(e).trim().toLowerCase()).filter(Boolean);
              if (normEmails.some(ne => cEmails.includes(ne))) return true;
            }
            // 3. Name & Company match (exact or partial)
            if (normName && cName) {
              const isNameMatch = (normName === cName) || 
                (normName.length >= 4 && cName.includes(normName)) || 
                (cName.length >= 4 && normName.includes(cName));
              if (isNameMatch) {
                if (!normComp || !cComp || normComp === cComp || normComp.includes(cComp) || cComp.includes(normComp)) return true;
              }
            }
            return false;
          });

          if (duplicate) {
            currentEditingMobileBcId = duplicate.cardId;
            const titleEl = document.getElementById('mobAddBcModalTitle');
            if (titleEl) titleEl.innerHTML = `<span class="text-amber-600 font-bold">⚡ พบนามบัตรเดิม (${duplicate.cardId})</span>`;
            const submitBtn = document.getElementById('mobBcSubmitBtn');
            if (submitBtn) submitBtn.innerHTML = `<span>อัปเดตนามบัตรเดิม (${duplicate.cardId})</span>`;

            // ดึงแฮชแท็กเดิมมารวมให้เรียบร้อย
            const existingTags = Array.isArray(duplicate.tags) ? duplicate.tags : [];
            existingTags.forEach(t => addMobileBcFormTag(t));

            // ดึงโน้ตเดิมมารวม (ไม่ต่อท้าย [AI สรุป] ซ้ำซ้อน)
            if (duplicate.notes) {
              const notesEl = document.getElementById('mobBcFormNotes');
              if (notesEl) {
                notesEl.value = duplicate.notes;
              }
            }

            showToast(`พบนามบัตรของ "${duplicate.contactName || duplicate.companyName}" ในระบบแล้ว (${duplicate.cardId}) ระบบสลับเป็นโหมดอัปเดตและรวมแท็กให้แล้ว สามารถพิมพ์เพิ่มแท็กใหม่ได้ทันที`, 'info');

            setTimeout(() => {
              const tagInput = document.getElementById('mobBcTagInput');
              if (tagInput) tagInput.focus();
            }, 300);
          } else {
            showToast('⚡ AI Gemini สแกนและกรอกข้อมูลเรียบร้อยแล้ว!', 'success');
          }
        }
      } catch (err) {
        console.error('triggerMobileCardAutoScan error:', err);
        if (String(err.message || '').includes('API_KEY_INVALID') || String(err.message || '').includes('400')) {
          localStorage.removeItem('MINAMIDA_GEMINI_API_KEY');
          showToast('API Key ไม่ถูกต้อง กรุณากดสแกนอีกครั้งเพื่อระบุ Key ใหม่', 'error');
        } else {
          showToast('เกิดข้อผิดพลาดในการสแกนรูปภาพ: ' + (err.message || err), 'error');
        }
      } finally {
        if (btn) btn.disabled = false;
        if (btnText) btnText.innerHTML = origHtml || '⚡ สแกนอ่านข้อมูลด้วย AI (Gemini Flash)';
      }
    }

    async function submitMobileBusinessCard(e) {
      e.preventDefault();
      const submitBtn = document.getElementById('mobBcSubmitBtn');
      const contactName = document.getElementById('mobBcFormContactName').value.trim();
      const companyName = document.getElementById('mobBcFormCompanyName').value.trim();
      const phone = document.getElementById('mobBcFormPhone').value.trim();
      const position = document.getElementById('mobBcFormPosition').value.trim();
      const email = document.getElementById('mobBcFormEmail').value.trim();
      const website = document.getElementById('mobBcFormWebsite').value.trim();
      const address = document.getElementById('mobBcFormAddress').value.trim();
      const notes = document.getElementById('mobBcFormNotes').value.trim();

      if (!contactName || !companyName) {
        showToast('กรุณากรอกชื่อผู้ติดต่อและชื่อบริษัท', 'warning');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>⏳ กำลังบันทึก...</span>';
      }

      const myEmpId = state.currentUser ? (state.currentUser.employeeId || state.currentUser.employeeCode || '') : '';
      const myEmpName = state.currentUser ? (state.currentUser.name || state.currentUser.fullName || '') : '';

      try {
        const payload = {
          action: 'saveMobileBusinessCard',
          cardId: currentEditingMobileBcId || null,
          callerEmpId: myEmpId,
          createdByName: myEmpName,
          contactName: contactName,
          companyName: companyName,
          position: position,
          phone: phone,
          email: email,
          website: website,
          address: address,
          notes: notes,
          tags: mobileBcFormTags,
          frontImageBase64: currentMobileBcFrontBase64,
          backImageBase64: currentMobileBcBackBase64,
          imgFrontRef: currentMobileBcFrontExistingUrl,
          imgBackRef: currentMobileBcBackExistingUrl,
          hasBackImage: Boolean(currentMobileBcBackBase64 || currentMobileBcBackExistingUrl)
        };

        const res = await postApiRequest(payload);
        if (res && res.status === 'duplicate_found') {
          handleMobileBcDuplicateFound(payload, res.existingCard);
          return;
        }

        if (res && res.status === 'success') {
          const isEdit = Boolean(currentEditingMobileBcId);
          showToast(isEdit ? 'อัปเดตข้อมูลนามบัตรเรียบร้อยแล้ว' : 'บันทึกนามบัตรเรียบร้อยแล้ว', 'success');
          closeAddMobileBcModal();

          // อัปเดตในหน่วยความจำทันทีโดยไม่ต้องรอเครือข่าย
          if (res.card && isEdit) {
            const idx = mobileBusinessCards.findIndex(c => c.cardId === payload.cardId);
            if (idx !== -1) {
              mobileBusinessCards[idx] = res.card;
            } else {
              mobileBusinessCards.unshift(res.card);
            }
          } else if (res.card) {
            mobileBusinessCards.unshift(res.card);
          }

          try {
            localStorage.setItem('MINAMIDA_BC_CACHE', JSON.stringify(mobileBusinessCards));
          } catch(e) {}

          renderMobileBusinessCards();
          loadMobileBusinessCards(true);
        } else {
          showToast((res && res.message) ? res.message : 'เกิดข้อผิดพลาดในการบันทึก', 'error');
        }
      } catch (err) {
        console.error('submitMobileBusinessCard error:', err);
        showToast('บันทึกล้มเหลว: ' + err.message, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>บันทึกนามบัตร</span>';
        }
      }
    }

    function handleMobileBcDuplicateFound(payload, existingCard) {
      let modal = document.getElementById('modalMobileBcDuplicate');
      if (!modal) {
        const div = document.createElement('div');
        div.id = 'modalMobileBcDuplicate';
        div.className = 'fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4';
        div.innerHTML = `
          <div class="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-3.5 animate-in slide-in-from-bottom duration-200">
            <div class="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl mx-auto">
              ⚠️
            </div>
            <div class="text-center space-y-0.5">
              <h3 class="text-sm font-bold text-slate-800">พบนามบัตรบุคคลนี้ในระบบแล้ว</h3>
              <p id="mobBcDupMsg" class="text-[11px] text-slate-500"></p>
            </div>
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div class="flex justify-between items-center">
                <span class="font-bold text-slate-800 text-xs" id="mobBcDupCardName">-</span>
                <span class="font-mono text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-bold" id="mobBcDupCardId">-</span>
              </div>
              <div class="text-violet-700 font-semibold text-[11px]" id="mobBcDupCardCompany">-</div>
              <div class="pt-1.5 border-t border-slate-200">
                <div class="text-[9px] font-bold text-slate-400">แฮชแท็กเดิม:</div>
                <div id="mobBcDupExistingTags" class="flex flex-wrap gap-1 mt-0.5"></div>
              </div>
              <div class="pt-1">
                <div class="text-[9px] font-bold text-violet-600">แฮชแท็กที่จะเพิ่มใหม่:</div>
                <div id="mobBcDupNewTags" class="flex flex-wrap gap-1 mt-0.5"></div>
              </div>
            </div>
            <div class="space-y-2 pt-1">
              <button type="button" id="btnMobBcMergeTags" class="w-full py-2.5 px-4 rounded-xl bg-violet-600 text-white font-bold text-xs shadow-sm active:scale-95 transition">
                รวมและเพิ่มแฮชแท็กใหม่ (แนะนำ)
              </button>
              <button type="button" id="btnMobBcForceSave" class="w-full py-2 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 active:scale-95 transition">
                บันทึกแยกเป็นใบใหม่
              </button>
              <button type="button" onclick="closeMobileBcDuplicateModal()" class="w-full py-1.5 text-slate-400 text-xs font-semibold">
                ยกเลิก
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(div);
        modal = div;
      }

      modal.classList.remove('hidden');
      const msgEl = document.getElementById('mobBcDupMsg');
      const nameEl = document.getElementById('mobBcDupCardName');
      const compEl = document.getElementById('mobBcDupCardCompany');
      const idEl = document.getElementById('mobBcDupCardId');
      const exTagsEl = document.getElementById('mobBcDupExistingTags');
      const newTagsEl = document.getElementById('mobBcDupNewTags');

      if (msgEl) msgEl.innerText = `รหัส ${existingCard.cardId} มีอยู่ในคลังส่วนกลางแล้ว ต้องการรวมแฮชแท็กหรือไม่?`;
      if (nameEl) nameEl.innerText = existingCard.contactName || 'ไม่ระบุชื่อ';
      if (compEl) compEl.innerText = existingCard.companyName || '-';
      if (idEl) idEl.innerText = existingCard.cardId;

      if (exTagsEl) {
        const exTags = Array.isArray(existingCard.tags) ? existingCard.tags : [];
        exTagsEl.innerHTML = exTags.length > 0 
          ? exTags.map(t => `<span class="px-1.5 py-0.5 rounded text-[9px] bg-slate-200 text-slate-700 font-medium">#${t}</span>`).join('') 
          : '<span class="text-[9px] text-slate-400 italic">ไม่มี</span>';
      }

      if (newTagsEl) {
        const newTags = Array.isArray(payload.tags) ? payload.tags : [];
        newTagsEl.innerHTML = newTags.length > 0 
          ? newTags.map(t => `<span class="px-1.5 py-0.5 rounded text-[9px] bg-violet-100 text-violet-700 font-bold">#${t}</span>`).join('') 
          : '<span class="text-[9px] text-slate-400 italic">ไม่มี</span>';
      }

      const mergeBtn = document.getElementById('btnMobBcMergeTags');
      if (mergeBtn) {
        mergeBtn.onclick = async function() {
          mergeBtn.disabled = true;
          mergeBtn.innerText = 'กำลังรวมแฮชแท็ก...';
          try {
            const res = await postApiRequest({
              action: 'mergeMobileBusinessCardTags',
              cardId: existingCard.cardId,
              tags: payload.tags,
              notes: payload.notes,
              callerEmpId: payload.callerEmpId
            });
            closeMobileBcDuplicateModal();
            if (res && res.status === 'success') {
              showToast(res.message || 'รวมแฮชแท็กสำเร็จ', 'success');
              closeAddMobileBcModal();
              await loadMobileBusinessCards();
            } else {
              showToast((res && res.message) || 'รวมแฮชแท็กล้มเหลว', 'error');
            }
          } catch(err) {
            closeMobileBcDuplicateModal();
            showToast('เกิดข้อผิดพลาดในการรวมแฮชแท็ก', 'error');
          }
        };
      }

      const forceBtn = document.getElementById('btnMobBcForceSave');
      if (forceBtn) {
        forceBtn.onclick = async function() {
          closeMobileBcDuplicateModal();
          payload.forceSave = true;
          const submitBtn = document.getElementById('btnSubmitMobileBc');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>⏳ กำลังบันทึก...</span>';
          }
          try {
            const res = await postApiRequest(payload);
            if (res && res.status === 'success') {
              showToast('บันทึกนามบัตรเรียบร้อยแล้ว', 'success');
              closeAddMobileBcModal();
              await loadMobileBusinessCards();
            } else {
              showToast((res && res.message) ? res.message : 'เกิดข้อผิดพลาดในการบันทึก', 'error');
            }
          } catch(err) {
            showToast('บันทึกล้มเหลว: ' + err.message, 'error');
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<span>บันทึกนามบัตร</span>';
            }
          }
        };
      }
    }

    function closeMobileBcDuplicateModal() {
      const modal = document.getElementById('modalMobileBcDuplicate');
      if (modal) modal.classList.add('hidden');
    }

    // Modal: View Business Card Detail
    function openMobileBcDetailModal(cardId) {
      const card = mobileBusinessCards.find(c => c.cardId === cardId);
      if (!card) return;
      currentMobileBcViewingCard = card;

      const modal = document.getElementById('modalViewMobileBcDetail');
      const titleEl = document.getElementById('mobBcDetailTitle');
      const subtitleEl = document.getElementById('mobBcDetailSubtitle');
      const contactEl = document.getElementById('mobBcDetailContact');
      const positionEl = document.getElementById('mobBcDetailPosition');
      const companyEl = document.getElementById('mobBcDetailCompany');
      const addressEl = document.getElementById('mobBcDetailAddress');
      const webEl = document.getElementById('mobBcDetailWeb');
      const notesEl = document.getElementById('mobBcDetailNotes');
      const tagsEl = document.getElementById('mobBcDetailTags');
      const actionRowEl = document.getElementById('mobBcDetailActionRow');
      const imageBoxEl = document.getElementById('mobBcDetailImageBox');
      const createdByEl = document.getElementById('mobBcDetailCreatedBy');
      const dateEl = document.getElementById('mobBcDetailDate');

      if (titleEl) titleEl.innerText = card.contactName || 'นามบัตร';
      if (subtitleEl) subtitleEl.innerText = card.companyName || '-';
      if (contactEl) contactEl.innerText = card.contactName || '-';
      if (positionEl) positionEl.innerText = card.position || card.department || '-';
      if (companyEl) companyEl.innerText = card.companyName || '-';
      if (addressEl) addressEl.innerText = card.address || '-';

      const webRow = document.getElementById('mobBcDetailWebRow');
      if (webRow) {
        if (card.website || card.lineId) {
          webRow.classList.remove('hidden');
          webEl.innerText = card.website || card.lineId || '';
        } else {
          webRow.classList.add('hidden');
        }
      }

      const notesRow = document.getElementById('mobBcDetailNotesRow');
      if (notesRow) {
        if (card.notes) {
          notesRow.classList.remove('hidden');
          notesEl.innerText = card.notes;
        } else {
          notesRow.classList.add('hidden');
        }
      }

      // Actions (Call & Email)
      if (actionRowEl) {
        let actHtml = '';
        const rawModalPhones = Array.isArray(card.phones) ? card.phones : (card.phone ? [card.phone] : []);
        const phones = normalizeAndPrioritizePhones(rawModalPhones);
        const emails = Array.isArray(card.emails) ? card.emails : (card.email ? [card.email] : []);

        if (phones.length > 0) {
          const dialNum = cleanDialNumber(phones[0]);
          actHtml += `
            <a href="tel:${dialNum}" class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs active:scale-95 transition">
              <span>📞 โทร ${phones[0]}</span>
            </a>
          `;
        }
        if (emails.length > 0) {
          actHtml += `
            <a href="mailto:${emails[0]}" class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-violet-600 text-white font-bold text-xs shadow-xs active:scale-95 transition">
              <span>✉️ ส่งอีเมล</span>
            </a>
          `;
        }
        actionRowEl.innerHTML = actHtml;
      }

      // Images
      if (imageBoxEl) {
        if (card.imgFrontRef) {
          imageBoxEl.classList.remove('hidden');
          switchMobileBcSide('front');
          const backBtn = document.getElementById('mobBcSideBackBtn');
          if (backBtn) {
            if (card.imgBackRef) backBtn.classList.remove('hidden');
            else backBtn.classList.add('hidden');
          }
        } else {
          imageBoxEl.classList.add('hidden');
        }
      }

      // Tags
      if (tagsEl) {
        const tags = Array.isArray(card.tags) ? card.tags : [];
        if (tags.length === 0) {
          tagsEl.innerHTML = '<span class="text-[10px] text-slate-400 italic">ไม่มีแฮชแท็ก</span>';
        } else {
          let tHtml = '';
          tags.forEach(t => {
            tHtml += `<span class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-violet-100 text-violet-800">#${t}</span>`;
          });
          tagsEl.innerHTML = tHtml;
        }
      }

      if (createdByEl) createdByEl.innerText = 'ผู้บันทึก: ' + (card.createdByName || card.createdBy || '-');
      if (dateEl) dateEl.innerText = 'วันที่: ' + (card.createdAt ? card.createdAt.slice(0, 10) : '-');

      if (modal) modal.classList.remove('hidden');
    }

    function switchMobileBcSide(side) {
      if (!currentMobileBcViewingCard) return;
      const imgEl = document.getElementById('mobBcDetailImg');
      const frontBtn = document.getElementById('mobBcSideFrontBtn');
      const backBtn = document.getElementById('mobBcSideBackBtn');
      if (side === 'front') {
        if (imgEl) imgEl.src = currentMobileBcViewingCard.imgFrontRef || '';
        if (frontBtn) { frontBtn.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-violet-600 text-white'; }
        if (backBtn) { backBtn.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600'; }
      } else {
        if (imgEl) imgEl.src = currentMobileBcViewingCard.imgBackRef || '';
        if (frontBtn) { frontBtn.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600'; }
        if (backBtn) { backBtn.className = 'px-3 py-1 rounded-lg text-xs font-bold bg-violet-600 text-white'; }
      }
    }

    function closeMobileBcDetailModal() {
      const modal = document.getElementById('modalViewMobileBcDetail');
      if (modal) modal.classList.add('hidden');
    }

