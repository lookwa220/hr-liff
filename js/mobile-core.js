// ============================================================================
// MINAMIDA MOBILE LIFF — CORE ENGINE (Config, API, Auth, Dashboard, Router)
// ============================================================================
    // ==========================================
    // Configuration & State
    // ==========================================
    const LIFF_ID = "2011799105-A1YwHp4u";
    const API_URL = "https://script.google.com/macros/s/AKfycby6LmtU-GITlnyN4W-P8CR8qqUL9UFiWprbrVkQsgVfGunD64pF5hK4q9BrdYuKLWfz7Q/exec";

    let state = {
      lineUserId: '',
      lineProfile: null,
      currentUser: null,
      config: null,
      currentView: 'dashboard'
    };

    // ==========================================
    // Utility: JSONP Requester (Bypasses CORS & Google 302 Redirects)
    // ==========================================
    function jsonpRequest(params) {
      return new Promise((resolve, reject) => {
        const callbackName = 'liff_cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        params.callback = callbackName;
        params._t = Date.now(); // Cache buster

        const queryString = Object.keys(params)
          .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
          .join('&');

        const script = document.createElement('script');
        script.src = API_URL + '?' + queryString;
        script.async = true;

        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('การเชื่อมต่อเซิร์ฟเวอร์หมดเวลา (Timeout)'));
        }, 30000);

        function cleanup() {
          clearTimeout(timeout);
          if (window[callbackName]) delete window[callbackName];
          if (script.parentNode) script.parentNode.removeChild(script);
        }

        window[callbackName] = function(data) {
          cleanup();
          resolve(data);
        };

        script.onerror = function() {
          cleanup();
          reject(new Error('ไม่สามารถเชื่อมต่อ Google Apps Script API ได้'));
        };

        document.body.appendChild(script);
      });
    }

    // ==========================================
    // Utility: POST Requester (For Large Payloads, Images & Signatures)
    // ==========================================
    async function postApiRequest(payload) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          throw new Error('HTTP Status ' + response.status);
        }
        return await response.json();
      } catch (err) {
        console.error('postApiRequest error:', err);
        throw err;
      }
    }

    function formatCleanDate(str) {
      if (!str) return '-';
      const s = String(str).trim();
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[3]}/${m[2]}/${m[1]}`;
      const mDmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (mDmy) return `${mDmy[1]}/${mDmy[2]}/${mDmy[3]}`;
      return s.slice(0, 10);
    }

    function formatCleanTime(str) {
      if (!str) return '';
      const s = String(str).trim();
      const m = s.match(/(\d{2}:\d{2})(?::\d{2})?/);
      return m ? m[1] : s.slice(0, 5);
    }

    function formatCleanShift(str) {
      if (!str) return '';
      let s = String(str).trim();
      s = s.replace(/^กะ+/, '');
      return 'กะ' + s;
    }

    function showToast(message, type = 'success') {
      const t = document.getElementById('toast');
      t.innerText = message;
      t.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transition-all max-w-[90%] text-center ' +
        (type === 'success' ? 'bg-emerald-600 text-white' : type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white');
      t.classList.remove('hidden');
      setTimeout(() => t.classList.add('hidden'), 3500);
    }

    // ==========================================
    // App Initialization (LIFF Setup)
    // ==========================================
    async function initApp() {
      try {
        await liff.init({ liffId: LIFF_ID });

        if (!liff.isLoggedIn()) {
          document.getElementById('loadingTitle').innerText = 'กำลังเข้าสู่ระบบ LINE...';
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        state.lineProfile = profile;
        state.lineUserId = profile.userId;

        document.getElementById('loadingTitle').innerText = 'กำลังเชื่อมต่อฐานข้อมูลโรงงาน...';

        // โหลด System Config และตรวจสอบพนักงานไปพร้อมกัน
        await Promise.all([
          loadConfig(),
          checkEmployeeRegistration(profile.userId)
        ]);

      } catch (err) {
        console.error(err);
        document.getElementById('loadingTitle').innerText = '❌ เกิดข้อผิดพลาดในการเชื่อมต่อ';
        document.getElementById('loadingDetail').innerHTML = err.message + '<br><button onclick="location.reload()" class="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold">ลองใหม่อีกครั้ง</button>';
      }
    }

    async function loadConfig() {
      try {
        const res = await jsonpRequest({ action: 'getConfig' });
        if (res && res.success) {
          state.config = res;
          populateTimeOptions();
          populateLeaveTypes(res.leaveTypes);
        }
      } catch (e) {
        console.warn('Failed to load config', e);
      }
    }

    function populateTimeOptions() {
      const startSelect = document.getElementById('leaveStartTime');
      const endSelect = document.getElementById('leaveEndTime');
      const otStart = document.getElementById('otStartTime');
      const otEnd = document.getElementById('otEndTime');

      let options = '';
      for (let h = 0; h < 24; h++) {
        const hh = String(h).padStart(2, '0');
        ['00', '15', '30', '45'].forEach(mm => {
          const time = `${hh}:${mm}`;
          options += `<option value="${time}">${time} น.</option>`;
        });
      }

      startSelect.innerHTML = options;
      endSelect.innerHTML = options;
      otStart.innerHTML = options;
      otEnd.innerHTML = options;

      // Default values
      startSelect.value = '08:00';
      endSelect.value = '17:00';
      otStart.value = '17:30';
      otEnd.value = '20:30';
    }

    function populateLeaveTypes(types) {
      const select = document.getElementById('leaveType');
      if (!types || types.length === 0) return;
      select.innerHTML = '<option value="">-- เลือกประเภทการลา --</option>' +
        types.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
    }

    // ==========================================
    // Employee Check & Registration Flow
    // ==========================================
    async function checkEmployeeRegistration(lineUid) {
      try {
        const res = await jsonpRequest({ action: 'checkEmployee', lineUserId: lineUid });
        document.getElementById('loadingScreen').classList.add('hidden');

        if (res && res.success && res.found && res.data) {
          state.currentUser = res.data;
          renderDashboard(res.data);
        } else {
          // ไม่พบพนักงาน -> แสดงหน้าจอ Onboarding
          showRegisterScreen();
        }
      } catch (err) {
        showToast('เชื่อมต่อฐานข้อมูลล้มเหลว: ' + err.message, 'error');
        showRegisterScreen();
      }
    }

    function showRegisterScreen() {
      document.getElementById('loadingScreen').classList.add('hidden');
      document.getElementById('mainDashboard').classList.add('hidden');
      document.getElementById('registerScreen').classList.remove('hidden');

      if (state.lineProfile) {
        document.getElementById('regLineName').innerText = state.lineProfile.displayName || 'พนักงาน';
        if (state.lineProfile.pictureUrl) {
          document.getElementById('regLineAvatar').src = state.lineProfile.pictureUrl;
        }
      }
    }

    async function handleRegister() {
      const empId = document.getElementById('inputEmpId').value.trim();
      const birth = document.getElementById('inputBirthdate').value.trim();
      const btn = document.getElementById('btnRegister');

      if (!empId) {
        showToast('กรุณากรอกรหัสพนักงาน', 'error');
        return;
      }
      if (!birth || birth.length !== 8) {
        showToast('กรุณากรอกวันเดือนปีเกิดตัวเลข 8 หลัก (เช่น 01012535)', 'error');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> กำลังยืนยันข้อมูล...';

      try {
        const res = await jsonpRequest({
          action: 'registerEmployee',
          empId: empId,
          birthdate: birth,
          lineUserId: state.lineUserId
        });

        if (res && res.success && res.found) {
          showToast('ยืนยันตัวตนสำเร็จ! ยินดีต้อนรับสู่ระบบ');
          state.currentUser = res.data;
          document.getElementById('registerScreen').classList.add('hidden');
          renderDashboard(res.data);
        } else {
          showToast(res.error || 'ไม่พบข้อมูลที่ตรงกัน กรุณาตรวจสอบรหัสพนักงานและวันเกิด', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = 'ยืนยันข้อมูลและเริ่มใช้งาน';
      }
    }

    // ==========================================
    // Dashboard Rendering
    // ==========================================
    function renderDashboard(user) {
      document.getElementById('mainDashboard').classList.remove('hidden');
      history.replaceState({ view: 'dashboard' }, '', window.location.pathname + window.location.search);

      // Profile details
      document.getElementById('dashEmpName').innerText = user.fullName || 'พนักงาน';
      document.getElementById('dashEmpId').innerText = user.employeeCode || '-';
      document.getElementById('dashDept').innerText = user.department || '-';
      document.getElementById('dashShift').innerText = user.shift && user.shift.includes('คืน') ? '🌙 กะกลางคืน' : '☀️ กะกลางวัน';

      if (state.lineProfile && state.lineProfile.pictureUrl) {
        document.getElementById('dashAvatar').src = state.lineProfile.pictureUrl;
      }

      // Check Supervisor Section
      if (user.isSupervisor) {
        const roleBadge = document.getElementById('dashRoleBadge');
        if (roleBadge) roleBadge.classList.remove('hidden');
        const secSupervisor = document.getElementById('sectionSupervisor');
        if (secSupervisor) secSupervisor.classList.remove('hidden');
        loadPendingApprovalsCount();
      }

      // Check MNW Department Section (เฉพาะสมาชิกแผนก MNW และ Super Admin เท่านั้น - ปราศจากฮาร์ดโค้ด)
      const userDeptClean = String(user.department || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
      const isMnwMember = userDeptClean === 'MNW' || String(user.department || '').toUpperCase().includes('MAINTENANCE') || user.isMnwMember;
      const isSuperAdmin = user.role === 'SUPER_ADMIN' || user.isSuperAdmin;
      const canViewMnw = isMnwMember || isSuperAdmin;

      if (canViewMnw) {
        const secMnw = document.getElementById('sectionMnwWorkbench');
        if (secMnw) secMnw.classList.remove('hidden');
      }

      // Check PD Department Section (สำหรับสมาชิกฝ่ายผลิต Forging, PD-M หรือผู้ได้รับสิทธิ์ และ Super Admin)
      const userDeptUpper = String(user.department || '').trim().toUpperCase();
      const isPdMember = userDeptUpper.includes('PD') || userDeptUpper.includes('FORG') || userDeptUpper.includes('MACH') || user.isPdMember;
      const canViewPd = isPdMember || user.canAccessPd || user.isPd || (user.allowedModules && user.allowedModules.includes('pd')) || isSuperAdmin;
      if (canViewPd) {
        const secPd = document.getElementById('sectionPdWorkbench');
        if (secPd) secPd.classList.remove('hidden');
      }

      // Check PC Department Section (สำหรับสมาชิกฝ่ายสโตร์/วางแผน PC หรือผู้ได้รับสิทธิ์ และ Super Admin)
      const isPcMember = userDeptUpper.includes('PC') || userDeptUpper.includes('STORE') || userDeptUpper.includes('PLAN') || user.isPcMember;
      const canViewPc = isPcMember || user.canAccessPc || user.isPc || (user.allowedModules && (user.allowedModules.includes('pc') || user.allowedModules.includes('pc_raw_materials'))) || isSuperAdmin;
      if (canViewPc) {
        const secPc = document.getElementById('sectionPcWorkbench');
        if (secPc) secPc.classList.remove('hidden');
      }

      // Pre-fill default dates
      const todayStr = new Date().toISOString().split('T')[0];
      document.getElementById('leaveStartDate').value = todayStr;
      document.getElementById('leaveEndDate').value = todayStr;
      document.getElementById('otDate').value = todayStr;

      // Update Quotas
      if (user.quota) {
        renderQuotas(user.quota);
      }

      // Render Host Visitors & Announcements
      renderHostVisitors(user.pendingVisitors || []);
      renderAnnouncements(user.announcements || []);
    }

    function renderQuotas(quota) {
      const sick = quota.sickRemaining ?? '30';
      const annual = quota.annualRemaining ?? '6';
      const paid = quota.personalPaidRemaining ?? '3';
      const unpaid = quota.personalUnpaidRemaining ?? (quota.personalUnpaidUsedDays ?? '0');

      const s1 = document.getElementById('quotaSickRemain');
      if (s1) s1.innerText = sick;
      const a1 = document.getElementById('quotaAnnualRemain');
      if (a1) a1.innerText = annual;
      const p1 = document.getElementById('quotaPaidRemain');
      if (p1) p1.innerText = paid;
      const u1 = document.getElementById('quotaUnpaidUsed');
      if (u1) u1.innerText = unpaid;

      const s2 = document.getElementById('quotaSickRemainUnified');
      if (s2) s2.innerText = sick;
      const a2 = document.getElementById('quotaAnnualRemainUnified');
      if (a2) a2.innerText = annual;
      const p2 = document.getElementById('quotaPaidRemainUnified');
      if (p2) p2.innerText = paid;
    }

    function renderHostVisitors(visitors) {
      const card = document.getElementById('cardHostVisitors');
      const countEl = document.getElementById('hostVisitorsCount');
      const listEl = document.getElementById('hostVisitorsList');
      if (!card || !countEl || !listEl) return;

      if (!visitors || visitors.length === 0) {
        card.classList.add('hidden');
        countEl.innerText = '0';
        listEl.innerHTML = '';
        return;
      }

      card.classList.remove('hidden');
      countEl.innerText = visitors.length;
      listEl.innerHTML = visitors.map(v => `
        <div id="host-vis-${v.docNo}" class="p-3 bg-white rounded-xl border border-amber-200 shadow-xs text-xs space-y-1.5">
          <div class="flex justify-between items-center">
            <span class="font-bold text-slate-800 text-sm">${v.visitorName}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">บัตร: ${v.badgeNo || '-'}</span>
          </div>
          <p class="text-slate-600">🏢 ${v.company || 'บุคคลภายนอก'} | 🕒 เข้าเวลา ${v.checkInTime || '-'}</p>
          <p class="text-slate-500 text-[11px]">วัตถุประสงค์: ${v.purpose || '-'}</p>
          <div class="pt-2 border-t border-slate-100 flex justify-end">
            <button type="button" onclick="handleHostAcknowledge('${v.docNo}', '${v.visitorName}')" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm flex items-center space-x-1 transition">
              <span>✅ ยืนยันการเข้าพบ</span>
            </button>
          </div>
        </div>
      `).join('');
    }

    async function handleHostAcknowledge(docNo, visitorName) {
      const remarks = prompt(`ยืนยันการเข้าพบกับคุณ "${visitorName}"\nระบุข้อความหรือหมายเหตุ (ถ้ามี):`, 'พบและสนทนาเรียบร้อย');
      if (remarks === null) return;

      const itemEl = document.getElementById(`host-vis-${docNo}`);
      if (itemEl) {
        itemEl.style.opacity = '0.5';
        itemEl.style.pointerEvents = 'none';
      }

      try {
        const res = await jsonpRequest({
          action: 'acknowledgeVisitor',
          docNo: docNo,
          empId: state.currentUser.employeeCode,
          remarks: remarks
        });

        if (res && res.status === 'success') {
          showToast(res.message || 'ยืนยันการเข้าพบสำเร็จ ป้อมยามสามารถดำเนินการเช็คเอาท์ได้');
          if (itemEl) itemEl.remove();
          const countEl = document.getElementById('hostVisitorsCount');
          if (countEl) {
            let current = parseInt(countEl.innerText, 10) || 1;
            current = Math.max(0, current - 1);
            countEl.innerText = current;
            if (current === 0) {
              document.getElementById('cardHostVisitors').classList.add('hidden');
            }
          }
        } else {
          showToast(res ? res.message : 'เกิดข้อผิดพลาดในการยืนยัน', 'error');
          if (itemEl) {
            itemEl.style.opacity = '1';
            itemEl.style.pointerEvents = 'auto';
          }
        }
      } catch (e) {
        showToast('เชื่อมต่อล้มเหลว: ' + e.message, 'error');
        if (itemEl) {
          itemEl.style.opacity = '1';
          itemEl.style.pointerEvents = 'auto';
        }
      }
    }

    let mobileAnnouncementsCache = [];

    function renderAnnouncements(announcements) {
      const container = document.getElementById('announcementsContainer');
      if (!container) return;

      mobileAnnouncementsCache = Array.isArray(announcements) ? announcements : [];

      if (!announcements || announcements.length === 0) {
        container.innerHTML = `
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 leading-relaxed text-[11px] w-full">
            • ยื่นคำขอลางานล่วงหน้าอย่างน้อย 1 วัน (ยกเว้นกรณีลาป่วยฉุกเฉิน)<br>
            • ระบบคิดช่วงเวลาทีละ 15 นาที เพื่อความถูกต้องในการคำนวณเบี้ยขยันและค่าจ้าง<br>
            • ตรวจสอบผลการอนุมัติได้ที่เมนู <b>"วันลาคงเหลือ"</b> ระบบจะปรับสถานะให้ทันทีเมื่อหัวหน้างานอนุมัติ
          </div>
        `;
        return;
      }

      const isSingle = announcements.length === 1;
      container.innerHTML = announcements.map((a, idx) => {
        const isUrgent = a.priority === 'HIGH' || a.priority === 'URGENT';
        const badgeColor = isUrgent ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200';
        const cardWidth = isSingle ? 'w-full' : 'min-w-[85%] max-w-[90%] snap-center';
        return `
          <div onclick="openMobileAnnouncementDetail(${idx})" class="${cardWidth} p-3 bg-white rounded-xl border border-slate-200 hover:border-amber-300 shadow-xs space-y-1.5 cursor-pointer active:scale-98 transition flex-shrink-0">
            <div class="flex items-center justify-between gap-1">
              <span class="font-bold text-slate-800 text-xs truncate max-w-[70%]">${a.title}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor} flex-shrink-0">${a.category || 'ทั่วไป'}</span>
            </div>
            <p class="text-slate-600 text-[11px] leading-relaxed line-clamp-2">${a.content}</p>
            <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
              <span class="truncate">ผู้ประกาศ: ${a.author || 'ฝ่ายบริหาร'}</span>
              <span class="text-amber-600 font-semibold flex-shrink-0">อ่านต่อ &raquo;</span>
            </div>
          </div>
        `;
      }).join('');
    }

    function openMobileAnnouncementDetail(idx) {
      const a = mobileAnnouncementsCache[idx];
      if (!a) return;

      const modal = document.getElementById('modalMobileAnnouncement');
      if (!modal) return;

      document.getElementById('mobAnnTitle').innerText = a.title || '';
      document.getElementById('mobAnnCategory').innerText = a.category || 'ทั่วไป';
      document.getElementById('mobAnnAuthor').innerText = a.author || 'ฝ่ายบริหาร';
      const dateDisplay = a.startDate ? (a.endDate ? `${a.startDate} ถึง ${a.endDate}` : `ตั้งแต่ ${a.startDate}`) : (a.timestamp ? String(a.timestamp).slice(0, 10) : '');
      document.getElementById('mobAnnDate').innerText = dateDisplay;
      document.getElementById('mobAnnContent').innerText = a.content || '';

      const prioEl = document.getElementById('mobAnnPriority');
      if (prioEl) {
        if (a.priority === 'URGENT') {
          prioEl.innerText = 'ด่วนมาก';
          prioEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse';
          prioEl.classList.remove('hidden');
        } else if (a.priority === 'HIGH') {
          prioEl.innerText = 'สำคัญ';
          prioEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200';
          prioEl.classList.remove('hidden');
        } else {
          prioEl.classList.add('hidden');
        }
      }

      const attBox = document.getElementById('mobAnnAttachmentBox');
      const attLink = document.getElementById('mobAnnAttachmentLink');
      const attImgWrapper = document.getElementById('mobAnnImgWrapper');
      const attImg = document.getElementById('mobAnnAttachmentImg');
      const attText = document.getElementById('mobAnnAttachmentText');

      if (attBox && attLink) {
        if (a.attachmentUrl) {
          attBox.classList.remove('hidden');
          attLink.href = a.attachmentUrl;

          const isImg = a.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || a.attachmentUrl.includes('export=view') || a.attachmentUrl.includes('drive.google.com') || a.attachmentUrl.startsWith('data:image/');
          if (isImg && attImg && attImgWrapper) {
            let displayUrl = a.attachmentUrl;
            const m = a.attachmentUrl.match(/id=([a-zA-Z0-9_-]+)/) || a.attachmentUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (m && m[1]) displayUrl = `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800`;
            attImg.src = displayUrl;
            attImgWrapper.classList.remove('hidden');
            if (attText) attText.innerText = '📎 เปิดดูรูปภาพขนาดเต็ม';
          } else {
            if (attImgWrapper) attImgWrapper.classList.add('hidden');
            if (attText) attText.innerText = '📎 เปิดอ่านเอกสารแนบ';
          }
        } else {
          attBox.classList.add('hidden');
          if (attImgWrapper) attImgWrapper.classList.add('hidden');
        }
      }

      modal.classList.remove('hidden');
    }

    function closeMobileAnnouncementModal() {
      const modal = document.getElementById('modalMobileAnnouncement');
      if (modal) modal.classList.add('hidden');
    }

    // ==========================================
    // View Switcher (Hub & Spoke Pattern)
    // ==========================================
    // ==========================================
    // View Switcher (Hub & Spoke Pattern with Popstate History)
    // ==========================================
    function openView(viewName, pushHistory = true) {
      document.getElementById('mainDashboard').classList.add('hidden');
      const allViewIds = [
        'viewLeave', 'viewQuota', 'viewOT', 'viewApprovals',
        'viewPaySlip', 'viewShiftAtt', 'viewSwap', 'viewSafety',
        'viewPersonal', 'viewRoomBooking', 'viewVehicleBooking',
        'viewMnwRequest', 'viewMnwWorkbench', 'viewMnwRoutine', 'viewKaizen',
        'viewBusinessCards', 'viewPartsRequest', 'viewPdRepair', 'viewPdTrial',
        'viewPcCoilReceive', 'viewPcCoilCheck'
      ];
      allViewIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });

      if (viewName === 'leave' || viewName === 'quota') {
        const vl = document.getElementById('viewLeave');
        if (vl) vl.classList.remove('hidden');
        loadLeaveHistory();
      } else if (viewName === 'ot') {
        const vo = document.getElementById('viewOT');
        if (vo) vo.classList.remove('hidden');
        loadOtHistory();
      } else if (viewName === 'approvals') {
        const va = document.getElementById('viewApprovals');
        if (va) va.classList.remove('hidden');
        loadApprovalsList();
      } else if (viewName === 'personal' || viewName === 'shiftAtt') {
        const vp = document.getElementById('viewPersonal');
        if (vp) vp.classList.remove('hidden');
        switchPersonalTab('shiftAtt');
      } else if (viewName === 'payslip') {
        const vp = document.getElementById('viewPersonal');
        if (vp) vp.classList.remove('hidden');
        switchPersonalTab('payslip');
      } else if (viewName === 'advance' || viewName === 'advanceSalary') {
        const vp = document.getElementById('viewPersonal');
        if (vp) vp.classList.remove('hidden');
        switchPersonalTab('advance');
      } else if (viewName === 'roomBooking') {
        const vr = document.getElementById('viewRoomBooking');
        if (vr) vr.classList.remove('hidden');
        const todayStr = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('roomBookingDate');
        if (dateInput && !dateInput.value) dateInput.value = todayStr;
        loadMobileMeetingRooms();
      } else if (viewName === 'vehicleBooking') {
        const vv = document.getElementById('viewVehicleBooking');
        if (vv) vv.classList.remove('hidden');
        const now = new Date();
        const startStr = now.toISOString().slice(0, 16);
        const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const endStr = end.toISOString().slice(0, 16);
        const sInput = document.getElementById('vehStartDateTime');
        if (sInput && !sInput.value) sInput.value = startStr;
        const eInput = document.getElementById('vehEndDateTime');
        if (eInput && !eInput.value) eInput.value = endStr;
        loadMobileVehicles();
      } else if (viewName === 'mnwRequest') {
        const vm = document.getElementById('viewMnwRequest');
        if (vm) vm.classList.remove('hidden');
      } else if (viewName === 'mnwWorkbench') {
        const vw = document.getElementById('viewMnwWorkbench');
        if (vw) vw.classList.remove('hidden');
        loadMobileMnwOrders();
      } else if (viewName === 'swap') {
        const vs = document.getElementById('viewSwap');
        if (vs) vs.classList.remove('hidden');
        loadShiftSwaps();
      } else if (viewName === 'safety') {
        const vsaf = document.getElementById('viewSafety');
        if (vsaf) vsaf.classList.remove('hidden');
        initSafetyForm();
      } else if (viewName === 'kaizen') {
        const vkz = document.getElementById('viewKaizen');
        if (vkz) vkz.classList.remove('hidden');
        initMobileKaizenForm();
        loadMobileKaizenHistory();
      } else if (viewName === 'mnwRoutine') {
        const vr = document.getElementById('viewMnwRoutine');
        if (vr) vr.classList.remove('hidden');
        loadMobileMnwRoutine();
      } else if (viewName === 'businessCards') {
        const vbc = document.getElementById('viewBusinessCards');
        if (vbc) vbc.classList.remove('hidden');
        loadMobileBusinessCards();
      } else if (viewName === 'partsRequest') {
        const vp = document.getElementById('viewPartsRequest');
        if (vp) vp.classList.remove('hidden');
        initMobilePartsRequest();
      } else if (viewName === 'pdRepair') {
        const vpd = document.getElementById('viewPdRepair');
        if (vpd) vpd.classList.remove('hidden');
        loadMobilePdRepairView();
      } else if (viewName === 'pdTrial') {
        const vpt = document.getElementById('viewPdTrial');
        if (vpt) vpt.classList.remove('hidden');
        if (typeof loadMobilePdTrialView === 'function') loadMobilePdTrialView();
      } else if (viewName === 'pcCoilReceive') {
        const vcr = document.getElementById('viewPcCoilReceive');
        if (vcr) vcr.classList.remove('hidden');
        if (typeof initMobilePcCoilReceive === 'function') initMobilePcCoilReceive();
      } else if (viewName === 'pcCoilCheck') {
        const vcc = document.getElementById('viewPcCoilCheck');
        if (vcc) vcc.classList.remove('hidden');
        if (typeof initMobilePcCoilCheck === 'function') initMobilePcCoilCheck();
      }
      state.currentView = viewName;
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (pushHistory) {
        history.pushState({ view: viewName }, '', '#view=' + viewName);
      }
    }

    function closeCurrentView(syncHistory = true) {
      const allViewIds = [
        'viewLeave', 'viewQuota', 'viewOT', 'viewApprovals',
        'viewPaySlip', 'viewShiftAtt', 'viewSwap', 'viewSafety',
        'viewPersonal', 'viewRoomBooking', 'viewVehicleBooking',
        'viewMnwRequest', 'viewMnwWorkbench', 'viewMnwRoutine', 'viewKaizen',
        'viewBusinessCards', 'viewPartsRequest', 'viewPdRepair', 'viewPdTrial',
        'viewPcCoilReceive', 'viewPcCoilCheck'
      ];
      allViewIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });
      const dash = document.getElementById('mainDashboard');
      if (dash) dash.classList.remove('hidden');
      state.currentView = 'dashboard';
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (syncHistory) {
        if (window.location.hash) {
          history.back();
        } else {
          history.replaceState({ view: 'dashboard' }, '', window.location.pathname + window.location.search);
        }
      }
    }

    // ==========================================
    // Browser History Popstate Navigation (Mobile Back Button Support)
    // ==========================================
    window.addEventListener('popstate', function(event) {
      if (event.state && event.state.view && event.state.view !== 'dashboard') {
        openView(event.state.view, false);
      } else {
        closeCurrentView(false);
      }
    });

    function switchPersonalTab(tabName) {
      const btnPay = document.getElementById('btnTabPersonalPayslip');
      const btnShift = document.getElementById('btnTabPersonalShiftAtt');
      const btnAdv = document.getElementById('btnTabPersonalAdvance');
      const panelPay = document.getElementById('panelPersonalPayslip');
      const panelShift = document.getElementById('panelPersonalShiftAtt');
      const panelAdv = document.getElementById('panelPersonalAdvance');

      if (btnPay) btnPay.className = 'py-2 rounded-lg text-slate-600 hover:bg-white transition font-medium text-center';
      if (btnShift) btnShift.className = 'py-2 rounded-lg text-slate-600 hover:bg-white transition font-medium text-center';
      if (btnAdv) btnAdv.className = 'py-2 rounded-lg text-slate-600 hover:bg-white transition font-medium text-center';

      if (panelPay) panelPay.classList.add('hidden');
      if (panelShift) panelShift.classList.add('hidden');
      if (panelAdv) panelAdv.classList.add('hidden');

      if (tabName === 'payslip') {
        if (btnPay) btnPay.className = 'py-2 rounded-lg bg-white text-emerald-700 shadow-sm transition font-bold text-center';
        if (panelPay) panelPay.classList.remove('hidden');
        loadPaySlip();
      } else if (tabName === 'advance') {
        if (btnAdv) btnAdv.className = 'py-2 rounded-lg bg-white text-blue-700 shadow-sm transition font-bold text-center';
        if (panelAdv) panelAdv.classList.remove('hidden');
        loadMobileAdvanceSalary();
      } else {
        if (btnShift) btnShift.className = 'py-2 rounded-lg bg-white text-purple-700 shadow-sm transition font-bold text-center';
        if (panelShift) panelShift.classList.remove('hidden');
        loadShiftAndAttendance();
      }
    }

