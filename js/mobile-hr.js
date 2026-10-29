// ============================================================================
// MINAMIDA MOBILE LIFF — HR, SUPERVISOR APPROVALS, PAYSLIP, SHIFT, SAFETY
// ============================================================================
    // ==========================================
    // Leave Module Logic
    // ==========================================
    function setLeaveDurationPreset(preset) {
      // Preset buttons removed for cleaner UI, kept as dummy to avoid runtime exceptions
    }

    function calcLeaveHours() {
      const startDate = document.getElementById('leaveStartDate').value;
      const endDate = document.getElementById('leaveEndDate').value;
      const startTime = document.getElementById('leaveStartTime').value || '08:00';
      const endTime = document.getElementById('leaveEndTime').value || '17:00';

      if (!startDate || !endDate) return;

      const overrides = (window.state && window.state.calendarOverrides) ? window.state.calendarOverrides : {};

      function isWorkDay(dateStr) {
        if (overrides[dateStr] !== undefined) {
          return overrides[dateStr] === true || String(overrides[dateStr]).toUpperCase() === 'TRUE';
        }
        const d = new Date(dateStr);
        const day = d.getDay();
        return (day !== 0 && day !== 6); // 0=Sun, 6=Sat
      }

      function calcDayHours(sTime, eTime) {
        const [sH, sM] = (sTime || '08:00').split(':').map(Number);
        const [eH, eM] = (eTime || '17:00').split(':').map(Number);
        let diffMinutes = (eH * 60 + eM) - (sH * 60 + sM);
        if (sH <= 12 && eH >= 13) {
          diffMinutes -= 60;
        }
        if (diffMinutes < 0) diffMinutes = 0;
        return +(diffMinutes / 60).toFixed(2);
      }

      const startD = new Date(startDate);
      const endD = new Date(endDate);

      if (endD < startD) {
        document.getElementById('lblTotalHours').innerText = '0';
        document.getElementById('lblTotalDays').innerText = '0';
        const note = document.getElementById('lblHolidayNote');
        if (note) {
          note.innerText = '⚠️ วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น';
          note.classList.remove('hidden');
        }
        return;
      }

      let totalHours = 0;
      let workDaysCount = 0;
      let holidayCount = 0;

      if (startDate === endDate) {
        if (isWorkDay(startDate)) {
          workDaysCount = 1;
          totalHours = calcDayHours(startTime, endTime);
        } else {
          holidayCount = 1;
          totalHours = 0;
        }
      } else {
        const cur = new Date(startD);
        while (cur <= endD) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, '0');
          const d = String(cur.getDate()).padStart(2, '0');
          const curDateStr = `${y}-${m}-${d}`;

          if (isWorkDay(curDateStr)) {
            workDaysCount++;
            if (curDateStr === startDate) {
              totalHours += calcDayHours(startTime, '17:00');
            } else if (curDateStr === endDate) {
              totalHours += calcDayHours('08:00', endTime);
            } else {
              totalHours += 8;
            }
          } else {
            holidayCount++;
          }
          cur.setDate(cur.getDate() + 1);
        }
      }

      const totalDays = +(totalHours / 8).toFixed(2);
      document.getElementById('lblTotalHours').innerText = totalHours;
      document.getElementById('lblTotalDays').innerText = totalDays;

      const note = document.getElementById('lblHolidayNote');
      if (note) {
        if (holidayCount > 0) {
          note.innerText = `💡 มีวันหยุดตามปฏิทินบริษัท ${holidayCount} วัน (ระบบตัดออก ไม่นับเป็นวันลา)`;
          note.classList.remove('hidden');
        } else {
          note.innerText = '';
          note.classList.add('hidden');
        }
      }
    }

    // Form Attachment State (สำหรับก่อนลา)
    let currentLeaveFormAttachmentBase64 = '';
    let currentLeaveFormAttachmentMimeType = '';
    let currentLeaveFormAttachmentFileName = '';

    function previewLeaveFormAttachment(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      currentLeaveFormAttachmentMimeType = file.type || 'image/jpeg';
      currentLeaveFormAttachmentFileName = file.name;
      document.getElementById('leaveFormAttachmentFileName').innerText = file.name;

      const reader = new FileReader();
      reader.onload = function(e) {
        const rawDataUrl = e.target.result;
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxDim = 1200;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            currentLeaveFormAttachmentBase64 = canvas.toDataURL('image/jpeg', 0.8);
            document.getElementById('leaveFormAttachmentPreviewImg').src = currentLeaveFormAttachmentBase64;
            document.getElementById('leaveFormAttachmentPreviewBox').classList.remove('hidden');
          };
          img.src = rawDataUrl;
        } else {
          currentLeaveFormAttachmentBase64 = rawDataUrl;
          document.getElementById('leaveFormAttachmentPreviewImg').src = 'https://via.placeholder.com/150?text=PDF';
          document.getElementById('leaveFormAttachmentPreviewBox').classList.remove('hidden');
        }
      };
      reader.readAsDataURL(file);
    }

    function clearLeaveFormAttachment() {
      currentLeaveFormAttachmentBase64 = '';
      currentLeaveFormAttachmentMimeType = '';
      currentLeaveFormAttachmentFileName = '';
      document.getElementById('leaveAttachmentInput').value = '';
      document.getElementById('leaveFormAttachmentPreviewBox').classList.add('hidden');
    }

    async function submitLeave(e) {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitLeave');
      const shift = (window.state && window.state.currentUser && window.state.currentUser.shift) ? window.state.currentUser.shift : 'กะกลางวัน (Day)';

      const payload = {
        action: 'requestLeave',
        empId: state.currentUser.employeeCode,
        leaveType: document.getElementById('leaveType').value,
        shift: shift,
        startDate: document.getElementById('leaveStartDate').value,
        startTime: document.getElementById('leaveStartTime').value,
        endDate: document.getElementById('leaveEndDate').value,
        endTime: document.getElementById('leaveEndTime').value,
        totalHours: document.getElementById('lblTotalHours').innerText,
        reason: document.getElementById('leaveReason').value.trim(),
        base64Content: currentLeaveFormAttachmentBase64,
        mimeType: currentLeaveFormAttachmentMimeType,
        fileName: currentLeaveFormAttachmentFileName
      };

      btn.disabled = true;
      btn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> กำลังส่งคำขอ...';

      try {
        let res;
        // หากมีแนบรูป ให้ใช้ POST ตรงไปที่ Apps Script เพื่อรองรับข้อมูลขนาดใหญ่
        if (currentLeaveFormAttachmentBase64) {
          res = await postApiRequest(payload);
        } else {
          res = await jsonpRequest(payload);
        }

        if (res && res.success) {
          showToast(res.message || 'ส่งคำขอลางานสำเร็จแล้ว');
          document.getElementById('formLeave').reset();
          clearLeaveFormAttachment();
          closeCurrentView();
          openView('quota');
        } else {
          showToast(res.error || 'ส่งคำขอไม่สำเร็จ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = 'ส่งคำขอลางาน';
      }
    }

    async function loadLeaveHistory() {
      const container = document.getElementById('leaveHistoryList');
      container.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">กำลังโหลดประวัติ...</p>';

      try {
        const res = await jsonpRequest({
          action: 'getLeaveHistory',
          empId: state.currentUser.employeeCode
        });

        if (res && res.success && res.history && res.history.length > 0) {
          container.innerHTML = res.history.map(item => {
            let statusBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">รออนุมัติ</span>';
            if (item.status === 'APPROVED') statusBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">อนุมัติแล้ว</span>';
            else if (item.status === 'REJECTED') statusBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">ปฏิเสธ</span>';

            const hasAttach = !!(item.attachmentUrl && item.attachmentUrl.trim());
            let certSection = '';
            if (hasAttach) {
              certSection = `
                <div class="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span class="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <span>📎</span><span>มีเอกสารแนบแล้ว</span>
                  </span>
                  <div class="flex items-center gap-1.5">
                    <button type="button" onclick="openLeaveDocViewer('${item.docNo}', '${item.attachmentUrl}')" class="px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition">
                      ดูเอกสาร
                    </button>
                    <button type="button" onclick="openMedicalCertModal('${item.docNo}', '${item.leaveType}')" class="px-2 py-1 rounded text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition" title="แนบเอกสารเพิ่มหลังลา">
                      + แนบเพิ่ม
                    </button>
                  </div>
                </div>
              `;
            } else {
              certSection = `
                <div class="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span class="text-[11px] text-slate-500">เอกสารหลักฐาน:</span>
                  <button type="button" onclick="openMedicalCertModal('${item.docNo}', '${item.leaveType}')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center gap-1 transition">
                    <span>📎</span><span>แนบหลักฐาน (ก่อน/หลังลา)</span>
                  </button>
                </div>
              `;
            }

            return `
              <div class="p-3 bg-white rounded-xl border border-slate-200 shadow-sm text-xs">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="font-bold text-slate-800 text-sm">${item.leaveType}</span>
                  ${statusBadge}
                </div>
                <p class="text-slate-600 mb-1">
                  📅 ${formatCleanDate(item.startDate)} ${formatCleanTime(item.startTime)} ถึง ${formatCleanDate(item.endDate)} ${formatCleanTime(item.endTime)} (${item.totalHours} ชม. ${formatCleanShift(item.shift)})
                </p>
                <p class="text-slate-500 text-[11px]">
                  เหตุผล: ${item.reason || '-'}
                </p>
                ${item.approverName && item.approverName !== '-' ? `<p class="text-[10px] text-slate-400 mt-1 border-t border-slate-100 pt-1">ผู้อนุมัติ: ${item.approverName} (${item.approvedAt})</p>` : ''}
                ${certSection}
              </div>
            `;
          }).join('');
        } else {
          container.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">ยังไม่มีประวัติการยื่นลางาน</p>';
        }
      } catch (err) {
        container.innerHTML = '<p class="text-xs text-red-500 text-center py-4">โหลดประวัติไม่สำเร็จ: ' + err.message + '</p>';
      }
    }

    // ==========================================
    // Leave Attachment Upload & Document Viewer Logic
    // ==========================================
    let currentMedCertDocNo = '';
    let currentMedCertLeaveType = '';
    let currentMedCertBase64 = '';
    let currentMedCertMimeType = '';
    let currentMedCertFileName = '';

    function openMedicalCertModal(docNo, leaveType = 'การลา') {
      currentMedCertDocNo = docNo;
      currentMedCertLeaveType = leaveType;
      currentMedCertBase64 = '';
      currentMedCertMimeType = '';
      currentMedCertFileName = '';

      const titleEl = document.getElementById('modalLeaveAttachmentTitle');
      if (titleEl) titleEl.innerText = `แนบเอกสารหลักฐาน (${leaveType})`;

      document.getElementById('medCertDocNoDisplay').innerText = docNo;
      document.getElementById('medCertFileInput').value = '';
      document.getElementById('medCertRemarks').value = '';
      document.getElementById('medCertPreviewBox').classList.add('hidden');
      document.getElementById('modalMedicalCert').classList.remove('hidden');
    }

    function closeMedicalCertModal() {
      document.getElementById('modalMedicalCert').classList.add('hidden');
      currentMedCertDocNo = '';
      currentMedCertLeaveType = '';
      currentMedCertBase64 = '';
    }

    function previewMedCertFile(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      currentMedCertMimeType = file.type || 'image/jpeg';
      currentMedCertFileName = file.name;
      document.getElementById('medCertFileName').innerText = file.name;

      const reader = new FileReader();
      reader.onload = function(e) {
        const rawDataUrl = e.target.result;

        // Compress image using canvas to ensure swift upload
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxDim = 1200;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            currentMedCertBase64 = canvas.toDataURL('image/jpeg', 0.8);
            document.getElementById('medCertPreviewImg').src = currentMedCertBase64;
            document.getElementById('medCertPreviewBox').classList.remove('hidden');
          };
          img.src = rawDataUrl;
        } else {
          currentMedCertBase64 = rawDataUrl;
          document.getElementById('medCertPreviewImg').src = 'https://via.placeholder.com/150?text=PDF+File';
          document.getElementById('medCertPreviewBox').classList.remove('hidden');
        }
      };
      reader.readAsDataURL(file);
    }

    async function submitMedicalCertUpload() {
      if (!currentMedCertDocNo) {
        showToast('ไม่พบเลขที่เอกสารการลา', 'error');
        return;
      }
      if (!currentMedCertBase64) {
        showToast('กรุณาเลือกไฟล์หรือถ่ายภาพเอกสารหลักฐานก่อน', 'error');
        return;
      }

      const btn = document.getElementById('btnUploadMedCert');
      btn.disabled = true;
      btn.innerHTML = '<span class="inline-block animate-spin mr-1">⏳</span> กำลังอัปโหลด...';

      const payload = {
        action: 'uploadLeaveAttachment',
        docNo: currentMedCertDocNo,
        docType: currentMedCertLeaveType || 'เอกสารหลักฐาน',
        base64Content: currentMedCertBase64,
        mimeType: currentMedCertMimeType || 'image/jpeg',
        fileName: currentMedCertFileName || `LeaveDoc_${currentMedCertDocNo}.jpg`,
        remarks: document.getElementById('medCertRemarks').value.trim()
      };

      try {
        const res = await postApiRequest(payload);

        if (res && res.success) {
          showToast(res.message || 'แนบเอกสารหลักฐานเรียบร้อยแล้ว');
          closeMedicalCertModal();
          loadLeaveHistory();
        } else {
          showToast((res && res.error) || 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาดในการอัปโหลด: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>อัปโหลดเอกสาร</span>';
      }
    }

    // Modal เปิดดูเอกสารหลักฐานการลาก่อนอนุมัติ
    function openLeaveDocViewer(docNo, attachmentUrl) {
      if (!attachmentUrl) {
        showToast('ไม่พบเอกสารแนบ', 'error');
        return;
      }
      document.getElementById('viewerLeaveDocNo').innerText = docNo;
      const contentArea = document.getElementById('viewerLeaveContentArea');
      const downloadBtn = document.getElementById('viewerLeaveDownloadBtn');

      const urls = String(attachmentUrl).split('\n').map(u => u.trim()).filter(Boolean);
      const primaryUrl = urls[0];

      downloadBtn.href = primaryUrl;

      // Preview content
      contentArea.innerHTML = urls.map((u, idx) => {
        const isImg = u.startsWith('data:image/') || u.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);
        if (isImg) {
          return `
            <div class="p-1 bg-slate-50 rounded-xl border border-slate-200">
              <img src="${u}" class="max-h-72 mx-auto rounded-lg object-contain shadow-xs" alt="หลักฐานการลา #${idx+1}">
            </div>
          `;
        } else {
          return `
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2">
              <span class="text-3xl">📄</span>
              <span class="text-xs font-semibold text-slate-700">เอกสารหลักฐานการลา #${idx+1}</span>
              <a href="${u}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition">
                คลิกเพื่อเปิดดูไฟล์ใน Drive / แท็บใหม่
              </a>
            </div>
          `;
        }
      }).join('');

      document.getElementById('modalLeaveDocViewer').classList.remove('hidden');
    }

    function closeLeaveDocViewer() {
      document.getElementById('modalLeaveDocViewer').classList.add('hidden');
    }

    // ==========================================
    // OT Module Logic
    // ==========================================
    function setOtShiftPreset(shift) {
      if (shift === 'DAY') {
        document.getElementById('otStartTime').value = '17:30';
        document.getElementById('otEndTime').value = '20:30';
      } else {
        document.getElementById('otStartTime').value = '05:30';
        document.getElementById('otEndTime').value = '08:30';
      }
      calcOtHours();
    }

    function calcOtHours() {
      const start = document.getElementById('otStartTime').value;
      const end = document.getElementById('otEndTime').value;
      const [sH, sM] = start.split(':').map(Number);
      const [eH, eM] = end.split(':').map(Number);

      let diffMinutes = (eH * 60 + eM) - (sH * 60 + sM);
      if (diffMinutes < 0) diffMinutes += 24 * 60; // ข้ามวัน

      const hours = +(diffMinutes / 60).toFixed(2);
      document.getElementById('lblOtHours').innerText = hours;
    }

    async function submitOT(e) {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitOT');
      const shift = document.querySelector('input[name="otShift"]:checked').value;

      const payload = {
        action: 'requestOT',
        empId: state.currentUser.employeeCode,
        date: document.getElementById('otDate').value,
        shift: shift,
        startTime: document.getElementById('otStartTime').value,
        endTime: document.getElementById('otEndTime').value,
        totalHours: document.getElementById('lblOtHours').innerText,
        taskDescription: document.getElementById('otDescription').value.trim()
      };

      btn.disabled = true;
      btn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> กำลังส่งคำขอโอที...';

      try {
        const res = await jsonpRequest(payload);
        if (res && res.success) {
          showToast(res.message || 'ส่งคำขอทำโอทีเรียบร้อยแล้ว');
          document.getElementById('formOT').reset();
          loadOtHistory();
        } else {
          showToast(res.error || 'ส่งคำขอไม่สำเร็จ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = 'ส่งคำขอทำโอที';
      }
    }

    async function loadOtHistory() {
      const container = document.getElementById('otHistoryList');
      try {
        const res = await jsonpRequest({
          action: 'getOTHistory',
          empId: state.currentUser.employeeCode
        });

        if (res && res.success && res.history && res.history.length > 0) {
          container.innerHTML = res.history.map(item => {
            let badge = item.status === 'APPROVED' ? '<span class="text-emerald-600 font-bold">อนุมัติแล้ว</span>' :
                        item.status === 'REJECTED' ? '<span class="text-red-500 font-bold">ปฏิเสธ</span>' :
                        '<span class="text-amber-600 font-bold">รออนุมัติ</span>';
            return `
              <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div class="flex justify-between items-center mb-1">
                  <span class="font-bold text-slate-800">${item.date} (${item.startTime} - ${item.endTime})</span>
                  <span>${badge}</span>
                </div>
                <p class="text-slate-600 text-[11px]">${item.totalHours} ชม. | งาน: ${item.taskDescription}</p>
              </div>
            `;
          }).join('');
        } else {
          container.innerHTML = '<p class="text-slate-400 text-center py-2">ยังไม่มีประวัติการขอโอที</p>';
        }
      } catch (e) {
        container.innerHTML = '<p class="text-slate-400 text-center py-2">โหลดประวัติไม่สำเร็จ</p>';
      }
    }

    // ==========================================
    // Supervisor Approvals Logic
    // ==========================================
    async function loadPendingApprovalsCount() {
      try {
        const res = await jsonpRequest({
          action: 'getPendingApprovals',
          empId: state.currentUser.employeeCode
        });
        if (res && res.success) {
          const totalCount = (res.leaves ? res.leaves.length : 0) +
                             (res.ot ? res.ot.length : 0) +
                             (res.mnw ? res.mnw.length : 0) +
                             (res.pdRepairs ? res.pdRepairs.length : 0) +
                             (res.vehicles ? res.vehicles.length : 0);
          document.getElementById('pendingBadgeCount').innerText = totalCount;
        }
      } catch (e) {}
    }

    async function loadApprovalsList() {
      const leavesCont = document.getElementById('appLeavesContainer');
      const otCont = document.getElementById('appOtContainer');
      const mnwCont = document.getElementById('appMnwContainer');
      const pdCont = document.getElementById('appPdContainer');
      leavesCont.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">กำลังโหลดรายการรออนุมัติ...</p>';
      otCont.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">กำลังโหลดรายการรออนุมัติ...</p>';
      if (mnwCont) mnwCont.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">กำลังโหลดรายการรออนุมัติ...</p>';
      if (pdCont) pdCont.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">กำลังโหลดรายการรออนุมัติ...</p>';

      try {
        const res = await jsonpRequest({
          action: 'getPendingApprovals',
          empId: state.currentUser.employeeCode
        });

        if (res && res.success) {
          const lCount = res.leaves ? res.leaves.length : 0;
          const oCount = res.ot ? res.ot.length : 0;
          const mCount = res.mnw ? res.mnw.length : 0;
          const pCount = res.pdRepairs ? res.pdRepairs.length : 0;
          const vCount = res.vehicles ? res.vehicles.length : 0;
          document.getElementById('appLeaveCount').innerText = lCount;
          document.getElementById('appOtCount').innerText = oCount;
          if (document.getElementById('appMnwCount')) document.getElementById('appMnwCount').innerText = mCount;
          if (document.getElementById('appPdCount')) document.getElementById('appPdCount').innerText = pCount;
          document.getElementById('pendingBadgeCount').innerText = lCount + oCount + mCount + pCount + vCount;

          // Render leaves
          if (res.leaves.length > 0) {
            leavesCont.innerHTML = res.leaves.map(l => {
              const hasAttachment = !!(l.attachmentUrl && l.attachmentUrl.trim());
              return `
              <div id="card-app-${l.docNo}" class="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm text-xs space-y-2">
                <div class="flex justify-between items-center">
                  <span class="font-bold text-slate-800 text-sm">${l.fullName} (${l.department})</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">${l.leaveType}</span>
                </div>
                <p class="text-slate-600">
                  📅 ${formatCleanDate(l.startDate)} ${formatCleanTime(l.startTime)} ถึง ${formatCleanDate(l.endDate)} ${formatCleanTime(l.endTime)} (${l.totalHours} ชม. ${formatCleanShift(l.shift)})
                </p>
                <p class="text-slate-500 text-[11px]">เหตุผล: ${l.reason || '-'}</p>
                ${hasAttachment ? `
                  <div class="p-2 bg-sky-50/70 border border-sky-200/80 rounded-lg flex items-center justify-between">
                    <span class="text-[11px] text-sky-800 font-semibold flex items-center gap-1">
                      <span>📎</span>
                      <span>มีเอกสารหลักฐานแนบ</span>
                    </span>
                    <button type="button" onclick="openLeaveDocViewer('${l.docNo}', '${l.attachmentUrl}')" class="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white text-sky-700 border border-sky-300 shadow-2xs hover:bg-sky-50 transition">
                      🔍 เปิดดูเอกสารก่อนอนุมัติ
                    </button>
                  </div>
                ` : `
                  <div class="text-[10px] text-slate-400 italic">
                    ℹ️ ยังไม่มีเอกสารแนบก่อนลา (อาจแนบเพิ่มเติมหลังปฏิบัติงาน)
                  </div>
                `}
                <div class="flex space-x-2 pt-2 border-t border-slate-100">
                  <button onclick="handleApproveAction('${l.docNo}', 'APPROVE')" class="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-sm hover:bg-emerald-700">
                    ✅ อนุมัติ
                  </button>
                  <button onclick="handleApproveAction('${l.docNo}', 'REJECT')" class="flex-1 py-1.5 bg-slate-100 text-red-600 border border-red-200 rounded-lg font-bold text-xs hover:bg-red-50">
                    ❌ ปฏิเสธ
                  </button>
                </div>
              </div>
            `;
            }).join('');
          } else {
            leavesCont.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">ไม่มีรายการลารออนุมัติ 🎉</p>';
          }

          // Render OT
          if (res.ot.length > 0) {
            otCont.innerHTML = res.ot.map(o => `
              <div id="card-app-${o.docNo}" class="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm text-xs space-y-2">
                <div class="flex justify-between items-center">
                  <span class="font-bold text-slate-800 text-sm">${o.fullName} (${o.department})</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">OT ${o.totalHours} ชม.</span>
                </div>
                <p class="text-slate-600">
                  ⏱️ วันที่ ${formatCleanDate(o.date)} เวลา ${formatCleanTime(o.startTime)} - ${formatCleanTime(o.endTime)} (${formatCleanShift(o.shift)})
                </p>
                <p class="text-slate-500 text-[11px]">งาน: ${o.taskDescription || '-'}</p>
                <div class="flex space-x-2 pt-2 border-t border-slate-100">
                  <button onclick="handleApproveAction('${o.docNo}', 'APPROVE')" class="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-sm hover:bg-emerald-700">
                    ✅ อนุมัติ
                  </button>
                  <button onclick="handleApproveAction('${o.docNo}', 'REJECT')" class="flex-1 py-1.5 bg-slate-100 text-red-600 border border-red-200 rounded-lg font-bold text-xs hover:bg-red-50">
                    ❌ ปฏิเสธ
                  </button>
                </div>
              </div>
            `).join('');
          } else {
            otCont.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">ไม่มีรายการโอทีรออนุมัติ 🎉</p>';
          }

          // Render MNW
          if (mnwCont) {
            if (res.mnw && res.mnw.length > 0) {
              mnwCont.innerHTML = res.mnw.map(m => {
                const photoUrl = m.attachmentUrl || (m.attachmentUrls && m.attachmentUrls[0]) || '';
                const thumbUrl = (m.attachmentThumbnails && m.attachmentThumbnails[0]) || photoUrl;
                const costDisplay = m.estCost > 0 ? `<span class="text-amber-700 font-bold ml-1">฿${m.estCost.toLocaleString()}</span>` : '';
                return `
                  <div id="card-app-${m.docNo}" class="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm text-xs space-y-2">
                    <div class="flex justify-between items-center">
                      <span class="font-bold text-slate-800 text-sm">${m.fullName} (${m.department})</span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">${m.status}</span>
                    </div>
                    <div class="flex gap-2.5">
                      ${thumbUrl ? `
                        <div class="flex-shrink-0 cursor-pointer" onclick="openMnwImagePreview('${photoUrl || thumbUrl}', '${m.docNo}: ${m.title}')">
                          <img src="${thumbUrl}" class="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-2xs hover:opacity-90 transition" alt="Thumbnail">
                          <span class="text-[9px] text-blue-600 block text-center mt-0.5 font-medium">🔍 ขยาย</span>
                        </div>
                      ` : ''}
                      <div class="flex-1 space-y-1">
                        <p class="font-semibold text-slate-800 text-xs">🛠️ ${m.title}</p>
                        <p class="text-slate-600 text-[11px]">📍 จุดซ่อม: <b>${m.area || '-'}</b> (${m.natureOfWork || 'ซ่อมเครื่องจักร'})</p>
                        ${m.estDueDate ? `<p class="text-slate-500 text-[10px]">📅 กำหนดเสร็จที่ต้องการ: <b>${formatCleanDate(m.estDueDate)}</b></p>` : ''}
                        ${costDisplay ? `<p class="text-[11px] text-slate-600">💰 ประเมินงบ: ${costDisplay}</p>` : ''}
                        ${m.detail ? `<p class="text-slate-500 text-[10px] line-clamp-2">อาการ: ${m.detail}</p>` : ''}
                      </div>
                    </div>
                    <div class="flex space-x-2 pt-2 border-t border-slate-100">
                      <button onclick="handleApproveAction('${m.docNo}', 'APPROVE')" class="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-sm hover:bg-emerald-700">
                        ✅ อนุมัติ
                      </button>
                      <button onclick="handleApproveAction('${m.docNo}', 'REJECT')" class="flex-1 py-1.5 bg-slate-100 text-red-600 border border-red-200 rounded-lg font-bold text-xs hover:bg-red-50">
                        ❌ ปฏิเสธ
                      </button>
                    </div>
                  </div>
                `;
              }).join('');
            } else {
              mnwCont.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">ไม่มีรายการแจ้งซ่อมรออนุมัติ 🎉</p>';
            }
          }

          // Render PD Machine Repairs (ใบซ่อมเครื่องจักรฝ่ายผลิต)
          if (pdCont) {
            const pList = res.pdRepairs || [];
            if (pList.length > 0) {
              pdCont.innerHTML = pList.map(p => {
                const costTxt = p.totalCost > 0 ? `<span class="text-amber-700 font-bold">฿${Number(p.totalCost).toLocaleString()}</span>` : '<span class="text-slate-500">฿0</span>';
                return `
                  <div id="card-app-${p.docNo}" class="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm text-xs space-y-2">
                    <div class="flex justify-between items-center">
                      <span class="font-bold text-slate-800 text-sm">${p.docNo} (${p.deptType || p.department})</span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">ซ่อมเสร็จรออนุมัติ</span>
                    </div>
                    <div class="space-y-1">
                      <p class="font-semibold text-slate-800 text-xs">⚙️ เครื่องจักร: <b>${p.machineCode || '-'}</b> ${p.machineName ? '(' + p.machineName + ')' : ''}</p>
                      <p class="text-slate-600 text-[11px]">🧑‍🔧 ผู้บันทึกซ่อม: <b>${p.fullName || p.employeeCode || '-'}</b></p>
                      <p class="text-slate-600 text-[11px]">⚠️ อาการเสีย: ${p.symptom || '-'}</p>
                      ${p.correctiveAction ? `<p class="text-emerald-700 text-[11px]">🔧 การแก้ไข: ${p.correctiveAction}</p>` : ''}
                      <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>⏱️ Downtime: <b>${p.downtimeMinutes || 0} นาที</b></span>
                        <span>💰 ค่าอะไหล่: ${costTxt}</span>
                      </div>
                    </div>
                    <div class="flex space-x-2 pt-2 border-t border-slate-100">
                      <button onclick="handleApproveAction('${p.docNo}', 'APPROVE')" class="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-sm hover:bg-emerald-700">
                        ✅ อนุมัติใบซ่อม
                      </button>
                      <button onclick="handleApproveAction('${p.docNo}', 'REJECT')" class="flex-1 py-1.5 bg-slate-100 text-amber-700 border border-amber-300 rounded-lg font-bold text-xs hover:bg-amber-50">
                        ↩️ ส่งกลับแก้ไข
                      </button>
                    </div>
                  </div>
                `;
              }).join('');
            } else {
              pdCont.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">ไม่มีใบแจ้งซ่อมเครื่องจักรฝ่ายผลิตรออนุมัติ 🎉</p>';
            }
          }

          // Render Vehicles
          const vehCont = document.getElementById('appVehicleContainer');
          if (vehCont) {
            const vList = res.vehicles || [];
            if (document.getElementById('appVehicleCount')) document.getElementById('appVehicleCount').innerText = vList.length;
            if (vList.length > 0) {
              vehCont.innerHTML = vList.map(v => `
                <div id="card-app-${v.docNo}" class="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm text-xs space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="font-bold text-slate-800 text-sm">${v.fullName} (${v.department})</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">จองรถผู้บริหาร</span>
                  </div>
                  <div class="space-y-1">
                    <p class="font-semibold text-slate-800 text-xs">🚗 ${v.vehicleName}</p>
                    <p class="text-slate-600 text-[11px]">📍 จุดหมาย: <b>${v.destination || '-'}</b></p>
                    <p class="text-slate-500 text-[10px]">🕒 เวลา: <b>${v.startDateTime ? v.startDateTime.replace('T', ' ') : '-'}</b> ถึง <b>${v.endDateTime ? v.endDateTime.replace('T', ' ') : '-'}</b></p>
                    <p class="text-slate-500 text-[10px]">วัตถุประสงค์: ${v.purpose || '-'}</p>
                  </div>
                  <div class="flex space-x-2 pt-2 border-t border-slate-100">
                    <button onclick="handleApproveAction('${v.docNo}', 'APPROVE')" class="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-sm hover:bg-emerald-700">
                      ✅ อนุมัติ
                    </button>
                    <button onclick="handleApproveAction('${v.docNo}', 'REJECT')" class="flex-1 py-1.5 bg-slate-100 text-red-600 border border-red-200 rounded-lg font-bold text-xs hover:bg-red-50">
                      ❌ ปฏิเสธ
                    </button>
                  </div>
                </div>
              `).join('');
            } else {
              vehCont.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">ไม่มีรายการจองรถรออนุมัติ 🎉</p>';
            }
          }
        }
      } catch (err) {
        leavesCont.innerHTML = '<p class="text-xs text-red-500 text-center py-4">โหลดข้อมูลล้มเหลว</p>';
      }
    }

    async function handleApproveAction(docNo, action) {
      if (!confirm(`ยืนยันการ${action === 'APPROVE' ? 'อนุมัติ' : 'ปฏิเสธ'}คำขอเลขที่ ${docNo} หรือไม่?`)) return;

      const card = document.getElementById(`card-app-${docNo}`);
      if (card) {
        card.style.opacity = '0.5';
        card.style.pointerEvents = 'none';
      }

      try {
        const res = await jsonpRequest({
          action: 'processApproval',
          docNo: docNo,
          decision: action,
          approvalAction: action,
          approverCode: state.currentUser.employeeCode,
          approverName: state.currentUser.fullName
        });

        if (res && res.success) {
          showToast(res.message || 'บันทึกเรียบร้อย');
          // In-place removal
          if (card) {
            card.remove();
          }
          loadPendingApprovalsCount();
        } else {
          showToast(res.error || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
          if (card) {
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
          }
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
        if (card) {
          card.style.opacity = '1';
          card.style.pointerEvents = 'auto';
        }
      }
    }

    function switchApprovalTab(tab) {
      const leavesCont = document.getElementById('appLeavesContainer');
      const otCont = document.getElementById('appOtContainer');
      const mnwCont = document.getElementById('appMnwContainer');
      const pdCont = document.getElementById('appPdContainer');
      const vehCont = document.getElementById('appVehicleContainer');
      const tabLeave = document.getElementById('tabAppLeave');
      const tabOT = document.getElementById('tabAppOT');
      const tabMnw = document.getElementById('tabAppMnw');
      const tabPd = document.getElementById('tabAppPd');
      const tabVehicle = document.getElementById('tabAppVehicle');

      const activeClass = 'flex-1 py-2 text-xs font-bold text-emerald-700 border-b-2 border-emerald-600 text-center whitespace-nowrap px-1';
      const inactiveClass = 'flex-1 py-2 text-xs font-medium text-slate-500 border-b-2 border-transparent text-center whitespace-nowrap px-1';

      if (leavesCont) leavesCont.classList.toggle('hidden', tab !== 'leaves');
      if (otCont) otCont.classList.toggle('hidden', tab !== 'ot');
      if (mnwCont) mnwCont.classList.toggle('hidden', tab !== 'mnw');
      if (pdCont) pdCont.classList.toggle('hidden', tab !== 'pd');
      if (vehCont) vehCont.classList.toggle('hidden', tab !== 'vehicle');

      if (tabLeave) tabLeave.className = (tab === 'leaves') ? activeClass : inactiveClass;
      if (tabOT) tabOT.className = (tab === 'ot') ? activeClass : inactiveClass;
      if (tabMnw) tabMnw.className = (tab === 'mnw') ? activeClass : inactiveClass;
      if (tabPd) tabPd.className = (tab === 'pd') ? activeClass : inactiveClass;
      if (tabVehicle) tabVehicle.className = (tab === 'vehicle') ? activeClass : inactiveClass;
    }

    // ==========================================
    // 5. Mobile e-Pay Slip Logic
    // ==========================================
    let paySlipAuthKey = '';

    async function loadPaySlip(targetCycleId = null) {
      if (!state.currentUser) return;
      const authBox = document.getElementById('slipAuthBox');
      const contentBox = document.getElementById('slipContent');

      try {
        const payload = {
          action: 'getMobilePaySlip',
          empId: state.currentUser.employeeCode,
          lineUserId: state.lineUserId,
          pinOrBirthdate: paySlipAuthKey
        };
        if (targetCycleId) payload.cycleId = targetCycleId;

        const res = await jsonpRequest(payload);
        if (res && res.success && res.data && res.data.slip) {
          authBox.classList.add('hidden');
          contentBox.classList.remove('hidden');
          renderPaySlipData(res.data);
        } else {
          // If auth required
          authBox.classList.remove('hidden');
          contentBox.classList.add('hidden');
          if (res && res.error && !res.error.includes('PIN')) {
            showToast(res.error, 'error');
          }
        }
      } catch (err) {
        showToast('ไม่สามารถโหลดสลิปเงินเดือน: ' + err.message, 'error');
      }
    }

    function submitPaySlipAuth() {
      const input = document.getElementById('slipAuthInput');
      const val = input.value.trim();
      if (!val) {
        showToast('กรุณาระบุวันเกิดหรือ PIN', 'error');
        return;
      }
      paySlipAuthKey = val;
      loadPaySlip();
    }

    function changePaySlipCycle(cycleId) {
      if (cycleId) loadPaySlip(cycleId);
    }

    function renderPaySlipData(data) {
      const s = data.slip;
      document.getElementById('slipCycleTitle').innerText = data.cycleName || s.CycleId || 'รอบเงินเดือน';
      document.getElementById('slipPayoutDate').innerText = data.payoutDate ? 'จ่าย: ' + formatCleanDate(data.payoutDate) : 'สถานะ: ' + (s.Status || 'CONFIRMED');
      document.getElementById('slipNetPay').innerText = parseFloat(s.NetPay || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      document.getElementById('slipGrossPay').innerText = parseFloat(s.GrossPay || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      document.getElementById('slipTotalDeductions').innerText = parseFloat(s.TotalDeductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      document.getElementById('slipGrossPaySub').innerText = parseFloat(s.GrossPay || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      document.getElementById('slipBaseSalary').innerText = parseFloat(s.BaseSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      document.getElementById('slipOtHrs15').innerText = s.OtHours15 || 0;
      document.getElementById('slipOtPay15').innerText = parseFloat(s.OtPay15 || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      document.getElementById('slipOtHrs20').innerText = s.OtHours20 || 0;
      document.getElementById('slipOtPay20').innerText = parseFloat(s.OtPay20 || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      document.getElementById('slipOtHrs30').innerText = s.OtHours30 || 0;
      document.getElementById('slipOtPay30').innerText = parseFloat(s.OtPay30 || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

      document.getElementById('slipDiligentStep').innerText = s.DiligentStep || '-';
      document.getElementById('slipDiligentAmt').innerText = parseFloat(s.DiligentAllowance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      document.getElementById('slipOtherEarnings').innerText = parseFloat(parseFloat(s.ShiftAllowance || 0) + parseFloat(s.OtherEarnings || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 });

      document.getElementById('slipTotalDeductSub').innerText = parseFloat(s.TotalDeductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      document.getElementById('slipSsoDeduct').innerText = parseFloat(s.SocialSecurityDeduct || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      document.getElementById('slipTaxDeduct').innerText = parseFloat(s.TaxDeduct || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      document.getElementById('slipUnpaidDeduct').innerText = parseFloat(s.UnpaidLeaveDeduct || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

      const advDeduct = parseFloat(s.AdvanceSalaryDeduct || s.advanceSalaryDeduct || 0);
      const advRow = document.getElementById('slipAdvDeductRow');
      const advAmt = document.getElementById('slipAdvDeduct');
      if (advRow && advAmt) {
        if (advDeduct > 0) {
          advRow.classList.remove('hidden');
          advAmt.innerText = advDeduct.toLocaleString('en-US', { minimumFractionDigits: 2 });
        } else {
          advRow.classList.add('hidden');
        }
      }

      document.getElementById('slipWorkDays').innerText = s.ActualWorkDays || 0;
      document.getElementById('slipWorkHours').innerText = s.TotalWorkHours || 0;

      // Populate cycle dropdown if available
      const select = document.getElementById('slipCycleSelect');
      if (data.availableCycles && data.availableCycles.length > 0) {
        select.innerHTML = data.availableCycles.map(c => `
          <option value="${c.cycleId}" ${c.cycleId === s.CycleId ? 'selected' : ''}>${c.cycleId} (${c.status})</option>
        `).join('');
      } else {
        select.innerHTML = `<option value="${s.CycleId}">${s.CycleId}</option>`;
      }
    }

    // ==========================================
    // 6. Shift & Attendance Logic
    // ==========================================
    async function loadShiftAndAttendance(targetYear = null, targetMonth = null) {
      if (!state.currentUser) return;
      try {
        const payload = {
          action: 'getMobileShiftAndAttendance',
          empId: state.currentUser.employeeCode
        };
        if (targetYear) payload.year = targetYear;
        if (targetMonth) payload.month = targetMonth;

        const res = await jsonpRequest(payload);
        if (res && res.success && res.data) {
          renderShiftAndAttendanceData(res.data);
        } else {
          showToast(res.error || 'ไม่สามารถโหลดข้อมูลกะและเวลาได้', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      }
    }

    function renderShiftAndAttendanceData(data) {
      const emp = data.employee;
      const curShift = (emp.currentShift === 'Night' || String(emp.currentShift).includes('กลางคืน')) ? '🌙 กะกลางคืน (20:00 - 05:00)' : '☀️ กะกลางวัน (08:00 - 17:00)';
      document.getElementById('shiftCurrentTitle').innerText = curShift;

      // Calendar
      const cal = data.calendar;
      document.getElementById('shiftCalendarMonth').innerText = `เดือน ${cal.month || '-'}/${cal.year || '-'}`;
      document.getElementById('calWorkDaysCnt').innerText = cal.workDaysCount || 0;
      document.getElementById('calHolidayCnt').innerText = cal.holidaysCount || 0;

      const daysGrid = document.getElementById('calDaysGrid');
      if (cal.days && cal.days.length > 0) {
        // หัวตารางวัน 7 วัน (อาทิตย์ - เสาร์)
        const dayHeaders = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
        const headerHtml = dayHeaders.map((dh, hIdx) => {
          const hColor = (hIdx === 0) ? 'text-red-500 font-bold' : (hIdx === 6 ? 'text-blue-500 font-bold' : 'text-slate-500 font-semibold');
          return '<div class="py-1 ' + hColor + ' text-[10px] bg-slate-100/80 rounded-md border border-slate-200">' + dh + '</div>';
        }).join('');

        // คำนวณช่องว่างต้นเดือน (Day of Week ของวันที่ 1: 0=อาทิตย์ ... 6=เสาร์)
        const firstDayOfWeek = parseInt(cal.days[0].dayOfWeek, 10);
        let blankCellsHtml = '';
        for (let b = 0; b < firstDayOfWeek; b++) {
          blankCellsHtml += '<div class="p-1 rounded border border-transparent bg-slate-50/20 opacity-30 h-10"></div>';
        }

        const daysHtml = cal.days.map(d => {
          const isWork = d.isWorkDay;
          const isSunday = d.dayOfWeek === 0;
          const isSaturday = d.dayOfWeek === 6;
          let bgClass = isWork ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-400' : 'bg-red-50 text-red-600 border-red-200 font-bold hover:border-red-400';
          if (!isWork && isSunday) bgClass = 'bg-red-50 text-red-600 border-red-200 font-bold';
          if (isWork && isSaturday) bgClass = 'bg-blue-50 text-blue-700 border-blue-200 font-bold';

          const tagLabel = isWork ? (isSaturday ? 'ทำงาน' : 'ปกติ') : (d.dayType === 'HOLIDAY' ? 'วันหยุด' : 'หยุด');

          return `
            <div class="p-1 rounded-lg border ${bgClass} flex flex-col justify-between h-10 transition shadow-2xs">
              <div class="flex items-center justify-between">
                <span class="font-bold text-xs leading-none">${d.day}</span>
                <span class="text-[8px] opacity-75 font-normal">${tagLabel}</span>
              </div>
              <div class="text-[8px] truncate leading-tight opacity-80" title="${d.title || ''}">${d.title ? d.title.replace('วันหยุดประจำสัปดาห์ (วันอาทิตย์)', 'หยุดอาทิตย์').replace('วันเสาร์หยุดประจำงวด', 'หยุดเสาร์').replace('วันทำงานปกติ', '') : ''}</div>
            </div>
          `;
        }).join('');

        daysGrid.innerHTML = headerHtml + blankCellsHtml + daysHtml;
      } else {
        daysGrid.innerHTML = '<p class="col-span-7 text-slate-400 py-2">ไม่มีข้อมูลปฏิทิน</p>';
      }

      // Recent Kiosk Scans
      const scansList = document.getElementById('shiftRecentScansList');
      if (data.recentScans && data.recentScans.length > 0) {
        scansList.innerHTML = data.recentScans.slice(0, 15).map(s => {
          return `
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span class="font-bold text-slate-800">${formatCleanDate(s.Date)}</span>
                <span class="text-[10px] text-slate-500 ml-1">(${formatCleanShift(s.Shift || 'กลางวัน')})</span>
              </div>
              <div class="text-right">
                <span class="font-mono font-bold text-emerald-700">${formatCleanTime(s.CheckInTime || s.ScanTime)}</span>
                ${s.CheckOutTime ? `<span class="text-slate-400 text-[10px] mx-1">-</span><span class="font-mono font-bold text-blue-700">${formatCleanTime(s.CheckOutTime)}</span>` : '<span class="text-[10px] text-amber-600 ml-1">(ยังไม่สแกนออก)</span>'}
              </div>
            </div>
          `;
        }).join('');
      } else {
        scansList.innerHTML = '<p class="text-slate-400 py-3 text-center">ยังไม่มีประวัติการสแกนนิ้ว/บาร์โค้ด</p>';
      }
    }

    // ==========================================
    // 7. Peer Shift Swap Logic
    // ==========================================
    async function loadShiftSwaps() {
      if (!state.currentUser) return;
      try {
        const res = await jsonpRequest({
          action: 'getMobileShiftSwaps',
          empId: state.currentUser.employeeCode
        });

        if (res && res.success && res.data) {
          renderShiftSwapsData(res.data);
        }
      } catch (err) {
        showToast('ไม่สามารถโหลดข้อมูลสลับกะ: ' + err.message, 'error');
      }
    }

    function switchSwapTab(tab) {
      const incomingCont = document.getElementById('swapIncomingContainer');
      const formSwap = document.getElementById('formShiftSwap');
      const histCont = document.getElementById('swapHistoryContainer');
      const tabInc = document.getElementById('tabSwapIncoming');
      const tabNew = document.getElementById('tabSwapNew');
      const tabHist = document.getElementById('tabSwapHistory');

      [incomingCont, formSwap, histCont].forEach(el => el.classList.add('hidden'));
      [tabInc, tabNew, tabHist].forEach(el => {
        el.className = 'flex-1 py-2 font-medium text-slate-500 border-b-2 border-transparent text-center';
      });

      if (tab === 'incoming') {
        incomingCont.classList.remove('hidden');
        tabInc.className = 'flex-1 py-2 font-bold text-cyan-700 border-b-2 border-cyan-600 text-center relative';
      } else if (tab === 'new') {
        formSwap.classList.remove('hidden');
        tabNew.className = 'flex-1 py-2 font-bold text-cyan-700 border-b-2 border-cyan-600 text-center';
      } else {
        histCont.classList.remove('hidden');
        tabHist.className = 'flex-1 py-2 font-bold text-cyan-700 border-b-2 border-cyan-600 text-center';
      }
    }

    function renderShiftSwapsData(data) {
      // 1. Incoming badge & list
      const incomingList = document.getElementById('swapIncomingList');
      const badge = document.getElementById('tabSwapIncomingBadge');
      const topBadge = document.getElementById('swapBadgeCount');
      const inc = data.incoming || [];

      if (inc.length > 0) {
        badge.innerText = inc.length;
        badge.classList.remove('hidden');
        if (topBadge) {
          topBadge.innerText = inc.length;
          topBadge.classList.remove('hidden');
        }

        incomingList.innerHTML = inc.map(s => `
          <div class="p-3 bg-white rounded-xl border border-cyan-200 shadow-xs space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-800">${s.RequesterName} (${s.RequesterDept})</span>
              <span class="text-[10px] bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-full font-bold">รอคุณยืนยัน</span>
            </div>
            <p class="text-slate-600 text-[11px]">
              ขอสลับกะ <b>${s.RequesterShift}</b> (${formatCleanDate(s.RequesterDate)}) ➔ กับกะของคุณ <b>${s.TargetShift}</b> (${formatCleanDate(s.TargetDate)})
            </p>
            <p class="text-slate-500 text-[10px] italic">เหตุผล: "${s.Reason || '-'}"</p>
            <div class="flex space-x-2 pt-2 border-t border-slate-100">
              <button onclick="processSwapAction('${s.SwapId}', 'PEER_ACCEPT')" class="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition">
                ยินยอม (Accept)
              </button>
              <button onclick="processSwapAction('${s.SwapId}', 'PEER_REJECT')" class="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-semibold text-xs transition">
                ปฏิเสธ (Reject)
              </button>
            </div>
          </div>
        `).join('');
      } else {
        badge.classList.add('hidden');
        if (topBadge) topBadge.classList.add('hidden');
        incomingList.innerHTML = '<p class="text-slate-400 py-6 text-center text-xs">ไม่มีคำขอสลับกะที่รอคุณยืนยันในขณะนี้</p>';
      }

      // 2. History list
      const histCont = document.getElementById('swapHistoryContainer');
      const myReqs = data.myRequests || [];
      if (myReqs.length > 0) {
        histCont.innerHTML = myReqs.map(s => {
          let stColor = 'bg-amber-50 text-amber-800 border-amber-200';
          let stText = 'รอเพื่อนยืนยัน';
          if (s.OverallStatus === 'PENDING_SUPERVISOR') {
            stColor = 'bg-blue-50 text-blue-800 border-blue-200';
            stText = 'รอหัวหน้าอนุมัติ';
          } else if (s.OverallStatus === 'APPROVED') {
            stColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            stText = 'อนุมัติแล้ว';
          } else if (s.OverallStatus === 'REJECTED') {
            stColor = 'bg-red-50 text-red-700 border-red-200';
            stText = 'ไม่อนุมัติ / ปฏิเสธ';
          }

          return `
            <div class="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-800 text-xs">กับคุณ ${s.TargetName}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-bold border ${stColor}">${stText}</span>
              </div>
              <p class="text-[11px] text-slate-600">
                สลับกะ ${s.RequesterShift} (${formatCleanDate(s.RequesterDate)}) ➔ กะ ${s.TargetShift}
              </p>
              <p class="text-[10px] text-slate-400">เลขที่: ${s.SwapId}</p>
            </div>
          `;
        }).join('');
      } else {
        histCont.innerHTML = '<p class="text-slate-400 py-6 text-center text-xs">คุณยังไม่เคยยื่นคำขอสลับกะ</p>';
      }
    }

    async function submitShiftSwap(e) {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitSwap');
      btn.disabled = true;
      btn.innerText = 'กำลังส่งคำขอ...';

      try {
        const res = await jsonpRequest({
          action: 'submitMobileShiftSwap',
          requesterEmpId: state.currentUser.employeeCode,
          targetEmpId: document.getElementById('swapTargetEmpId').value.trim(),
          requesterDate: document.getElementById('swapDate').value,
          targetDate: document.getElementById('swapDate').value,
          targetShift: document.getElementById('swapTargetShift').value,
          reason: document.getElementById('swapReason').value.trim()
        });

        if (res && res.success) {
          showToast(res.message || 'ส่งคำขอสลับกะเรียบร้อยแล้ว');
          document.getElementById('formShiftSwap').reset();
          loadShiftSwaps();
          switchSwapTab('history');
        } else {
          showToast(res.error || 'เกิดข้อผิดพลาดในการส่งคำขอ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = 'ส่งคำขอสลับกะ';
      }
    }

    async function processSwapAction(swapId, action) {
      try {
        const res = await jsonpRequest({
          action: 'processMobileShiftSwap',
          swapId: swapId,
          action: action,
          callerEmpId: state.currentUser.employeeCode
        });

        if (res && res.success) {
          showToast(res.message || 'ดำเนินการเรียบร้อยแล้ว');
          loadShiftSwaps();
        } else {
          showToast(res.error || 'ไม่สามารถดำเนินการได้', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      }
    }

    // ==========================================
    // 8. Safety & Near-Miss Incident Logic
    // ==========================================
    let safetyPhotoBase64 = '';

    function previewSafetyPhoto(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        const img = new Image();
        img.onload = function() {
          const maxDim = 1000;
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
          safetyPhotoBase64 = canvas.toDataURL('image/jpeg', 0.7);

          document.getElementById('safetyPhotoPreviewImg').src = safetyPhotoBase64;
          document.getElementById('safetyPhotoPreviewBox').classList.remove('hidden');
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }

    function initSafetyForm() {
      document.getElementById('formSafety').reset();
      safetyPhotoBase64 = '';
      document.getElementById('safetyPhotoPreviewBox').classList.add('hidden');
    }

    async function submitSafetyReport(e) {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitSafety');
      btn.disabled = true;
      btn.innerText = 'กำลังส่งรายงาน...';

      const isAnon = document.getElementById('safetyIsAnon').checked;

      try {
        const payload = {
          action: 'submitMobileSafetyReport',
          reporterEmpId: isAnon ? 'ANONYMOUS' : state.currentUser.employeeCode,
          reporterName: isAnon ? 'ไม่ประสงค์ออกนาม' : state.currentUser.fullName,
          reporterDept: state.currentUser ? state.currentUser.department : '',
          incidentType: document.getElementById('safetyType').value,
          location: document.getElementById('safetyLocation').value.trim(),
          machineId: document.getElementById('safetyMachine').value.trim(),
          urgency: document.querySelector('input[name="safetyUrgency"]:checked').value,
          description: document.getElementById('safetyDesc').value.trim(),
          immediateAction: document.getElementById('safetyAction').value.trim(),
          fileBase64: safetyPhotoBase64
        };

        const res = await postApiRequest(payload);

        if (res && res.success) {
          showToast(res.message || 'บันทึกรายงานความปลอดภัยเรียบร้อยแล้ว');
          closeCurrentView();
        } else {
          showToast(res.error || 'เกิดข้อผิดพลาดในการบันทึกรายงาน', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = 'ส่งรายงานความปลอดภัยถึง จป. / HR';
      }
    }


    // ==========================================
    // 7. Mobile Advance Salary (เบิกเงินเดือนล่วงหน้า)
    // ==========================================
    let cachedAdvanceQuota = null;

    async function loadMobileAdvanceSalary() {
      if (!state.currentUser) return;
      const empId = state.currentUser.employeeCode || state.currentUser.employeeId || state.currentUser.code || '';
      const blockedBox = document.getElementById('mobAdvBlockedBox');
      const blockedReason = document.getElementById('mobAdvBlockedReason');
      const formBox = document.getElementById('formMobileAdvanceSalary');
      const submitBtn = document.getElementById('mobAdvSubmitBtn');

      // Set initial loading state in UI
      const maxEl = document.getElementById('mobAdvMaxQuota');
      const baseEl = document.getElementById('mobAdvBaseSalary');
      const daysEl = document.getElementById('mobAdvWorkDays');
      const monthEl = document.getElementById('mobAdvCycleMonth');

      if (maxEl) maxEl.classList.add('animate-pulse');

      try {
        const res = await jsonpRequest({
          action: 'getAdvanceSalaryQuota',
          empId: empId
        });

        if (res && (res.status === 'success' || res.success) && res.data) {
          cachedAdvanceQuota = res.data;
          const q = res.data;

          if (monthEl) monthEl.innerText = 'ประจำเดือน ' + (q.currentMonth || '-');

          if (maxEl) {
            maxEl.classList.remove('animate-pulse');
            maxEl.innerText = parseFloat(q.maxEligibleAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }

          if (baseEl) baseEl.innerText = parseFloat(q.baseSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          if (daysEl) daysEl.innerText = q.actualWorkDays || 0;

          const amtInput = document.getElementById('mobAdvAmount');
          if (amtInput) {
            amtInput.max = q.maxEligibleAmount || 0;
            amtInput.placeholder = `สูงสุด ฿${(q.maxEligibleAmount || 0).toLocaleString('en-US')}`;
          }

          if (q.canSubmit) {
            if (blockedBox) blockedBox.classList.add('hidden');
            if (formBox) formBox.classList.remove('opacity-50', 'pointer-events-none');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<span>🚀 ส่งคำขอถึงฝ่ายบุคคล (HR)</span>';
            }
          } else {
            if (blockedBox) {
              blockedBox.classList.remove('hidden');
              blockedReason.innerText = q.reasonBlocked || 'ไม่สามารถยื่นคำขอในรอบนี้ได้';
            }
            if (formBox) formBox.classList.add('opacity-50', 'pointer-events-none');
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.innerHTML = '<span>🔒 ' + (q.reasonBlocked || 'ไม่อยู่ในช่วงเวลายื่น หรือใช้สิทธิ์แล้ว') + '</span>';
            }
          }
        } else {
          if (maxEl) {
            maxEl.classList.remove('animate-pulse');
            maxEl.innerText = '0.00';
          }
          if (blockedBox) {
            blockedBox.classList.remove('hidden');
            blockedReason.innerText = (res && res.message) || (res && res.error) || 'ไม่พบสิทธิ์หรือเกิดข้อผิดพลาดในการโหลดข้อมูล';
          }
        }
      } catch (err) {
        console.warn('loadMobileAdvanceSalary quota error:', err);
        if (maxEl) {
          maxEl.classList.remove('animate-pulse');
          maxEl.innerText = '0.00';
        }
        showToast('โหลดข้อมูลสิทธิ์ไม่สำเร็จ: ' + err.message, 'error');
      }

      await loadMobileAdvanceSalaryHistory();
    }

    async function loadMobileAdvanceSalaryHistory() {
      if (!state.currentUser) return;
      const empId = state.currentUser.employeeCode || state.currentUser.employeeId || state.currentUser.code || '';
      const listContainer = document.getElementById('mobAdvHistoryList');
      if (!listContainer) return;

      listContainer.innerHTML = '<div class="text-center text-xs text-slate-400 py-3">กำลังโหลดประวัติ...</div>';

      try {
        const res = await jsonpRequest({
          action: 'getAdvanceSalaryHistory',
          empId: empId
        });

        const items = (res && res.data) ? res.data : [];
        if (items.length === 0) {
          listContainer.innerHTML = `
            <div class="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              ไม่มีประวัติการขอเบิกเงินเดือนล่วงหน้า
            </div>
          `;
          return;
        }

        listContainer.innerHTML = items.map(item => {
          let statusBadge = '';
          switch (item.Status) {
            case 'PENDING_HR':
              statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">⏳ รอ HR ตรวจสอบ</span>';
              break;
            case 'HR_APPROVED':
              statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">✓ HR อนุมัติแล้ว</span>';
              break;
            case 'BATCH_LOCKED':
              statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">📦 รอบัญชีจ่ายเงิน</span>';
              break;
            case 'PAID':
              statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">💵 โอนเงินสำเร็จ</span>';
              break;
            case 'REJECTED':
              statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">❌ ไม่อนุมัติ</span>';
              break;
            default:
              statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">${item.Status || '-'}</span>`;
          }

          const reqAmt = parseFloat(item.RequestedAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
          const appAmt = item.ApprovedAmount ? parseFloat(item.ApprovedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : null;

          return `
            <div class="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5 text-xs text-left">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-800">${item.RequestId || '-'}</span>
                ${statusBadge}
              </div>
              <div class="flex items-center justify-between text-slate-600">
                <span>วันที่ขอ: ${formatCleanDate(item.RequestDate || item.CreatedAt)}</span>
                <span class="font-bold text-slate-800">ขอเบิก: ฿${reqAmt}</span>
              </div>
              ${appAmt && item.Status !== 'REJECTED' ? `
                <div class="flex items-center justify-between text-[11px] text-blue-700 bg-blue-50/70 px-2 py-1 rounded-lg">
                  <span>ยอดอนุมัติ:</span>
                  <span class="font-bold">฿${appAmt}</span>
                </div>
              ` : ''}
              ${item.PayDate && item.Status === 'PAID' ? `
                <div class="text-[10px] text-emerald-700 font-medium">
                  โอนวันที่: ${formatCleanDate(item.PayDate)} ${item.PaymentRef ? `(อ้างอิง: ${item.PaymentRef})` : ''}
                </div>
              ` : ''}
              ${item.RejectReason ? `
                <div class="text-[10px] text-red-600 bg-red-50 p-1.5 rounded">
                  เหตุผล: ${item.RejectReason}
                </div>
              ` : ''}
              <div class="text-[10px] text-slate-500 truncate">
                เหตุผล: ${item.Reason || '-'}
              </div>
            </div>
          `;
        }).join('');

      } catch (err) {
        listContainer.innerHTML = '<div class="p-3 text-center text-xs text-red-500">โหลดข้อมูลไม่สำเร็จ</div>';
      }
    }

    async function submitMobileAdvanceSalary(event) {
      event.preventDefault();
      if (!state.currentUser) {
        showToast('ไม่พบข้อมูลพนักงาน กรุณาลงชื่อเข้าใช้ใหม่', 'error');
        return;
      }

      const amtInput = document.getElementById('mobAdvAmount');
      const reasonInput = document.getElementById('mobAdvReason');
      const agreedInput = document.getElementById('mobAdvAgreed');
      const submitBtn = document.getElementById('mobAdvSubmitBtn');

      const amount = parseFloat(amtInput.value || 0);
      const reason = (reasonInput.value || '').trim();

      if (amount <= 0) {
        showToast('กรุณาระบุจำนวนเงินที่ต้องการเบิก', 'error');
        return;
      }

      if (cachedAdvanceQuota && amount > cachedAdvanceQuota.maxEligibleAmount) {
        showToast(`จำนวนเงินเกินสิทธิ์สูงสุด (฿${cachedAdvanceQuota.maxEligibleAmount.toLocaleString()})`, 'error');
        return;
      }

      if (!reason) {
        showToast('กรุณาระบุเหตุผลความจำเป็น', 'error');
        return;
      }

      if (!agreedInput.checked) {
        showToast('กรุณายินยอมเงื่อนไขการหักเงินจากเงินเดือน', 'error');
        return;
      }

      if (!confirm(`ยืนยันการยื่นขอเบิกเงินเดือนล่วงหน้า ฿${amount.toLocaleString()} หรือไม่?\n(ยอดนี้จะถูกหักชำระในรอบเงินเดือนของเดือนนี้)`)) {
        return;
      }

      submitBtn.disabled = true;
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span>⏳ กำลังส่งคำขอ...</span>';

      try {
        const empCode = state.currentUser.employeeCode || state.currentUser.employeeId || state.currentUser.code || '';
        const payload = {
          action: 'submitAdvanceSalary',
          employeeCode: empCode,
          requestedAmount: amount,
          reason: reason,
          agreedToDeduct: true
        };

        const res = await postApiRequest(payload);
        if (res && res.status === 'success') {
          showToast('ยื่นขอเบิกเงินเดือนล่วงหน้าสำเร็จแล้ว ข้อมูลถูกส่งถึง HR', 'success');
          amtInput.value = '';
          reasonInput.value = '';
          agreedInput.checked = false;
          await loadMobileAdvanceSalary();
        } else {
          showToast((res && res.message) ? res.message : 'เกิดข้อผิดพลาดในการยื่นคำขอ', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาดในการส่งข้อมูล: ' + err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }

