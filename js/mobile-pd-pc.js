// ============================================================================
// MINAMIDA MOBILE LIFF — PC PARTS REQUEST & PD MACHINE REPAIRS
// ============================================================================
    if (typeof escapeHtml !== 'function') {
      window.escapeHtml = function(str) {
        if (str === null || str === undefined) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      };
    }
    // ==========================================
    // MOBILE PARTS REQUEST CONTROLLER
    // ==========================================
    let mobilePartsProductsList = [];

    function updateMobilePartsShiftBanner() {
      const now = new Date();
      const hour = now.getHours();
      const roundEl = document.getElementById('mobPartsShiftRoundText');
      const deadlineEl = document.getElementById('mobPartsDeadlineText');

      if (hour < 12) {
        if (roundEl) roundEl.textContent = 'รอบที่ 1 (ช่วงเช้า 08:00 - 11:00 น.)';
        if (deadlineEl) deadlineEl.textContent = 'กำหนดเวลาจัดส่ง: 11:30 น.';
      } else {
        if (roundEl) roundEl.textContent = 'รอบที่ 2 (ช่วงบ่าย 13:00 - 16:00 น.)';
        if (deadlineEl) deadlineEl.textContent = 'กำหนดเวลาจัดส่ง: 16:30 น.';
      }
    }

    async function initMobilePartsRequest() {
      updateMobilePartsShiftBanner();

      const user = state.currentUser;
      const reqInput = document.getElementById('mobPartsRequester');
      if (reqInput && user) {
        reqInput.value = user.fullName || user.name || user.employeeCode || '';
      }

      if (!mobilePartsProductsList || mobilePartsProductsList.length === 0) {
        try {
          const res = await postApiRequest({ action: 'getMobilePartsMasterProducts' });
          if (res && res.status === 'success' && res.data && res.data.products) {
            mobilePartsProductsList = res.data.products;
            populateMobilePartsDatalist(mobilePartsProductsList);
          }
        } catch (err) {
          console.error('initMobilePartsRequest products error:', err);
        }
      } else {
        populateMobilePartsDatalist(mobilePartsProductsList);
      }

      loadMobilePartsRequestsHistory();
    }

    function populateMobilePartsDatalist(products) {
      const dl = document.getElementById('mobPartsDatalist');
      if (!dl) return;
      dl.innerHTML = (products || []).map(p => 
        `<option value="${p.partCode}">${p.partCode} - ${p.partName} (PN: ${p.partNo || '-'})</option>`
      ).join('');
    }

    function onMobilePartCodeChange() {
      const codeInput = document.getElementById('mobPartsCode');
      if (!codeInput) return;
      const val = codeInput.value.trim().toLowerCase();

      const item = (mobilePartsProductsList || []).find(p => String(p.partCode).trim().toLowerCase() === val);
      const nameEl = document.getElementById('mobPartsName');
      const noEl = document.getElementById('mobPartsNo');
      const stockEl = document.getElementById('mobPartsStockType');
      const procEl = document.getElementById('mobPartsProcess');
      const areaEl = document.getElementById('mobPartsArea');

      if (item) {
        if (nameEl) nameEl.value = item.partName || '';
        if (noEl) noEl.value = item.partNo || '';
        if (stockEl) stockEl.value = item.stockType || '';
        if (procEl && !procEl.value) procEl.value = item.defaultProcess || '';
        if (areaEl && !areaEl.value) areaEl.value = item.defaultArea || '';
      } else {
        if (nameEl) nameEl.value = '';
        if (noEl) noEl.value = '';
        if (stockEl) stockEl.value = '';
      }
    }

    async function submitMobilePartsRequest(e) {
      if (e) e.preventDefault();
      const code = document.getElementById('mobPartsCode').value.trim();
      const qty = document.getElementById('mobPartsQty').value;
      const name = document.getElementById('mobPartsName').value.trim();
      const partNo = document.getElementById('mobPartsNo').value.trim();
      const stockType = document.getElementById('mobPartsStockType').value.trim();
      const targetProcess = document.getElementById('mobPartsProcess').value.trim();
      const targetArea = document.getElementById('mobPartsArea').value.trim();
      const lotNo = document.getElementById('mobPartsLot').value.trim();
      const requestedBy = document.getElementById('mobPartsRequester').value.trim();

      if (!code || !qty) {
        showToast('กรุณากรอกรหัสสินค้าและจำนวนให้ครบถ้วน');
        return;
      }

      const btn = document.getElementById('btnSubmitMobileParts');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>กำลังบันทึกข้อมูล...</span>';
      }

      try {
        const payload = {
          action: 'submitMobilePartsRequest',
          partCode: code,
          qty: qty,
          partName: name,
          partNo: partNo,
          stockType: stockType,
          targetProcess: targetProcess,
          targetArea: targetArea,
          lotNo: lotNo,
          requestedBy: requestedBy
        };

        const res = await postApiRequest(payload);
        if (res && res.status === 'success') {
          showToast(res.message || 'บันทึกคำขอเบิกสินค้าสำเร็จ');
          document.getElementById('mobPartsRequestForm').reset();
          const user = state.currentUser;
          if (user) {
            document.getElementById('mobPartsRequester').value = user.fullName || user.name || user.employeeCode || '';
          }
          loadMobilePartsRequestsHistory();
        } else {
          showToast(res ? (res.message || res.error) : 'เกิดข้อผิดพลาดในการบันทึก');
        }
      } catch (err) {
        console.error('submitMobilePartsRequest error:', err);
        showToast('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>ส่งคำขอเบิกสินค้าคงคลัง</span>';
        }
      }
    }

    async function loadMobilePartsRequestsHistory() {
      const container = document.getElementById('mobPartsHistoryList');
      if (!container) return;

      const today = new Date().toISOString().split('T')[0];
      try {
        const res = await postApiRequest({ action: 'getMobilePartsRequests', targetDate: today });
        if (res && res.status === 'success' && res.data && res.data.requests) {
          const list = res.data.requests;
          if (list.length === 0) {
            container.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">ยังไม่มีรายการขอเบิกประจำวันนี้</p>';
            return;
          }

          container.innerHTML = list.slice(0, 10).map(item => {
            let badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
            let statusText = 'รอเบิกสินค้า';
            if (item.status === 'Completed' || item.status === 'จ่ายของแล้ว') {
              badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              statusText = 'จ่ายของแล้ว';
            } else if (item.status === 'In Progress' || item.status === 'กำลังจัดส่ง') {
              badgeClass = 'bg-sky-100 text-sky-800 border-sky-300';
              statusText = 'กำลังจัดส่ง';
            }

            const timeOnly = item.timestamp ? (item.timestamp.includes(' ') ? item.timestamp.split(' ')[1] : item.timestamp) : '-';

            return `
              <div class="p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs text-cyan-800">${item.partCode} (${item.partName || '-'})</span>
                  <span class="px-2 py-0.5 rounded-full border text-[10px] font-bold ${badgeClass}">${statusText}</span>
                </div>
                <div class="flex items-center justify-between text-[11px] text-slate-500">
                  <span>จำนวน: <strong class="text-rose-600 font-bold">${item.qty}</strong> | จุดส่ง: ${item.targetProcess || '-'}</span>
                  <span>เวลา: ${timeOnly}</span>
                </div>
              </div>
            `;
          }).join('');
        } else {
          container.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">ไม่สามารถโหลดรายการได้</p>';
        }
      } catch (err) {
        console.error('loadMobilePartsRequestsHistory error:', err);
        container.innerHTML = '<p class="text-xs text-red-400 text-center py-4">เกิดข้อผิดพลาดในการโหลด</p>';
      }
    }

    // ==========================================
    // PD Machine Repair (Mobile LIFF Logic)
    // ==========================================
    let mobilePdMachinesCache = [];
    let mobilePdSparePartsCache = [];
    let mobilePdRepairsCache = [];
    let mobilePdRepairPhotos = {
      abnormal: '',
      cause: '',
      defect: '',
      repair: '',
      makerReport: ''
    };

    function getLocalThaiIso() {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      return (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
    }

    async function loadMobilePdRepairView() {
      // Set default start/end times using Local Thai Time
      const localNow = getLocalThaiIso();
      const startEl = document.getElementById('mobPdStartTime');
      const endEl = document.getElementById('mobPdEndTime');
      if (startEl && !startEl.value) startEl.value = localNow;
      if (endEl && !endEl.value) endEl.value = localNow;
      calculateMobilePdDuration();

      // Load initial data (machines + spare parts + recent repairs)
      try {
        const res = await jsonpRequest({ action: 'getMobilePdInitialData', empId: state.currentUser ? state.currentUser.employeeCode : '' });
        if (res && res.status === 'success' && res.data) {
          mobilePdMachinesCache = res.data.machines || [];
          mobilePdSparePartsCache = res.data.spareParts || [];
          mobilePdRepairsCache = res.data.repairs || [];

          // Populate machines select
          filterMobilePdMachines('');
        }
      } catch (err) {
        console.warn('loadMobilePdRepairView init error:', err);
      }
    }

    function filterMobilePdMachines(searchTerm) {
      const mSelect = document.getElementById('mobPdMachineSelect');
      const countBadge = document.getElementById('mobPdMachineCountBadge');
      if (!mSelect) return;
      const term = (searchTerm || '').toLowerCase().trim();
      const filtered = term
        ? mobilePdMachinesCache.filter(m =>
            (m.MachineNo && m.MachineNo.toLowerCase().includes(term)) ||
            (m.MachineName && m.MachineName.toLowerCase().includes(term)) ||
            (m.Division && m.Division.toLowerCase().includes(term)) ||
            (m.Location && m.Location.toLowerCase().includes(term))
          )
        : mobilePdMachinesCache;

      if (countBadge) {
        countBadge.innerText = `${filtered.length} / ${mobilePdMachinesCache.length} เครื่อง`;
      }

      let opts = `<option value="">-- เลือกเครื่องจักร (${filtered.length} เครื่อง) --</option>`;
      filtered.forEach(m => {
        opts += `<option value="${m.MachineNo}">${m.MachineNo} - ${m.MachineName} (${m.Location || m.Division || ''})</option>`;
      });
      mSelect.innerHTML = opts;

      if (filtered.length === 1) {
        mSelect.value = filtered[0].MachineNo;
        handleMobilePdMachineChange();
      }
    }

    function handleMobilePdMachineChange() {
      const select = document.getElementById('mobPdMachineSelect');
      const customInput = document.getElementById('mobPdCustomMachineName');
      const hintBox = document.getElementById('mobPdMachineLastRepairHint');
      if (!select) return;
      const val = select.value;
      const matched = mobilePdMachinesCache.find(m => m.MachineNo === val);
      if (matched && customInput) {
        customInput.value = matched.MachineName;
      }

      // Quick hint for latest repair on this machine
      if (val && hintBox) {
        const lastRepair = (mobilePdRepairsCache || []).find(r => r.MachineNo === val);
        if (lastRepair) {
          const ab = lastRepair.AbnormalDesc || '-';
          const rep = lastRepair.RepairDesc || '-';
          const dt = lastRepair.StartDateTime || lastRepair.CreatedAt || '-';
          hintBox.innerHTML = `
            <div class="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1 mt-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-amber-900 text-[11px]">💡 ซ่อมล่าสุด: ${escapeHtml(dt)} (${lastRepair.RepairNo})</span>
                <button type="button" onclick="applyMobilePdLastRepair('${lastRepair.RepairNo}')" class="px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-[10px] active:scale-95 transition cursor-pointer">ดึงอาการเดิมมาใช้</button>
              </div>
              <div class="text-[11px] text-slate-700 truncate" title="${escapeHtml(ab)}"><span class="font-semibold text-rose-700">อาการ:</span> ${escapeHtml(ab)}</div>
              <div class="text-[11px] text-slate-700 truncate" title="${escapeHtml(rep)}"><span class="font-semibold text-emerald-700">วิธีซ่อม:</span> ${escapeHtml(rep)}</div>
            </div>
          `;
          hintBox.classList.remove('hidden');
        } else {
          hintBox.innerHTML = '';
          hintBox.classList.add('hidden');
        }
      } else if (hintBox) {
        hintBox.innerHTML = '';
        hintBox.classList.add('hidden');
      }
    }

    function applyMobilePdLastRepair(repairNo) {
      const repair = (mobilePdRepairsCache || []).find(r => r.RepairNo === repairNo);
      if (!repair) return;
      const ab = document.getElementById('mobPdAbnormalDesc');
      const cause = document.getElementById('mobPdCauseDesc');
      const defect = document.getElementById('mobPdDefectDesc');
      const rep = document.getElementById('mobPdRepairDesc');
      if (ab && repair.AbnormalDesc) ab.value = repair.AbnormalDesc;
      if (cause && repair.CauseDesc) cause.value = repair.CauseDesc;
      if (defect && repair.DefectDesc) defect.value = repair.DefectDesc;
      if (rep && repair.RepairDesc) rep.value = repair.RepairDesc;
      if (typeof showToast === 'function') {
        showToast(`ดึงอาการและวิธีซ่อมจาก ${repairNo} เรียบร้อยแล้ว`, 'info');
      }
    }

    function stepMobilePdStartTime(deltaMinutes) {
      const startEl = document.getElementById('mobPdStartTime');
      const endEl = document.getElementById('mobPdEndTime');
      if (!startEl || !endEl) return;

      const now = new Date();
      const endVal = endEl.value ? new Date(endEl.value) : now;
      let startVal = startEl.value ? new Date(startEl.value) : new Date(endVal.getTime());

      let newTime = startVal.getTime() + deltaMinutes * 60000;
      if (newTime > endVal.getTime()) {
        newTime = endVal.getTime();
      }

      const tzOffset = (new Date(newTime)).getTimezoneOffset() * 60000;
      startEl.value = (new Date(newTime - tzOffset)).toISOString().slice(0, 16);
      calculateMobilePdDuration();
    }

    function setMobilePdEndTimeNow() {
      const startEl = document.getElementById('mobPdStartTime');
      const endEl = document.getElementById('mobPdEndTime');
      if (!endEl) return;
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const nowIso = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);

      let prevDuration = 0;
      if (startEl && startEl.value && endEl.value) {
        const s = new Date(startEl.value);
        const e = new Date(endEl.value);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
          prevDuration = Math.round((e - s) / 60000);
        }
      }

      endEl.value = nowIso;
      if (startEl) {
        if (prevDuration > 0) {
          const newStart = new Date(now.getTime() - prevDuration * 60000);
          const startTz = newStart.getTimezoneOffset() * 60000;
          startEl.value = (new Date(newStart.getTime() - startTz)).toISOString().slice(0, 16);
        } else {
          startEl.value = nowIso;
        }
      }
      calculateMobilePdDuration();
    }

    function calculateMobilePdDuration() {
      const startEl = document.getElementById('mobPdStartTime');
      const endEl = document.getElementById('mobPdEndTime');
      const badge = document.getElementById('mobPdDurationBadge');
      const plusBtn = document.getElementById('mobPdStepPlus15Btn');
      if (!startEl || !endEl) return;

      if (startEl.value && endEl.value) {
        const s = new Date(startEl.value);
        const e = new Date(endEl.value);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
          // Rule: cannot step start time into the future beyond end time (s >= e disables +15 button)
          if (plusBtn) {
            plusBtn.disabled = (s.getTime() >= e.getTime());
          }
          const diffMins = Math.max(0, Math.round((e - s) / (1000 * 60)));
          const hrs = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          if (badge) {
            badge.innerText = `⏱️ ระยะเวลาซ่อม (Downtime): ${hrs > 0 ? hrs + ' ชม. ' : ''}${mins} นาที (${diffMins} นาที)`;
          }
          return;
        }
      }
      if (plusBtn) plusBtn.disabled = true;
      if (badge) badge.innerText = '⏱️ ระยะเวลาซ่อม (Downtime): 0 นาที';
    }

    function toggleMobileCustomMachine() {
      const chk = document.getElementById('mobPdCheckCustomMachine');
      const box = document.getElementById('mobPdCustomMachineBox');
      const select = document.getElementById('mobPdMachineSelect');
      if (chk && chk.checked) {
        if (box) box.classList.remove('hidden');
        if (select) select.disabled = true;
      } else {
        if (box) box.classList.add('hidden');
        if (select) select.disabled = false;
      }
    }

    function toggleMobileMakerBox() {
      const rType = document.getElementById('mobPdRepairType');
      const box = document.getElementById('mobPdMakerBox');
      if (rType && box) {
        if (rType.value === 'MAKER') box.classList.remove('hidden');
        else box.classList.add('hidden');
      }
    }

    // Canvas Auto-Compression: Resize to max 1200px at 0.75 JPEG (~100-200KB)
    function compressPdMobileImage(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = new Image();
          img.onload = function() {
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
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
            resolve(compressedBase64);
          };
          img.onerror = reject;
          img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    async function handleMobilePdPhotoSelect(input, targetKey) {
      const file = input.files && input.files[0];
      if (!file) return;

      try {
        const compressedBase64 = await compressPdMobileImage(file);
        mobilePdRepairPhotos[targetKey] = compressedBase64;

        const previewMap = {
          abnormal: 'mobPdPreviewAbnormal',
          cause: 'mobPdPreviewCause',
          defect: 'mobPdPreviewDefect',
          repair: 'mobPdPreviewRepair'
        };
        const prevId = previewMap[targetKey];
        if (prevId) {
          const prevEl = document.getElementById(prevId);
          if (prevEl) {
            prevEl.src = compressedBase64;
            prevEl.classList.remove('hidden');
          }
        }
      } catch (err) {
        console.error('Image compression error:', err);
        showToast('บีบอัดรูปภาพล้มเหลว กรุณาลองใหม่อีกครั้ง', 'error');
      }
    }

    async function handleMobilePdReportFile(input) {
      const file = input.files && input.files[0];
      if (!file) return;

      if (file.type.startsWith('image/')) {
        try {
          const b64 = await compressPdMobileImage(file);
          mobilePdRepairPhotos.makerReport = b64;
        } catch (e) {}
      } else {
        const reader = new FileReader();
        reader.onload = function(e) {
          mobilePdRepairPhotos.makerReport = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    }

    function addMobilePdPartRow() {
      const container = document.getElementById('mobPdPartsList');
      if (!container) return;

      const rowId = 'pd_part_row_' + Date.now();
      let partOpts = '<option value="">-- เลือกอะไหล่หรือพิมพ์ใหม่ --</option>';
      mobilePdSparePartsCache.forEach(p => {
        partOpts += `<option value="${p.PartId}" data-code="${p.PartCode}" data-name="${p.PartName}" data-price="${p.UnitPrice}" data-unit="${p.Unit}">${p.PartCode} - ${p.PartName} (คงเหลือ: ${p.InStockQty})</option>`;
      });

      const rowHtml = `
        <div id="${rowId}" class="p-2.5 bg-white rounded-xl border border-orange-200 space-y-2">
          <div class="flex items-center justify-between">
            <select onchange="handleMobilePdPartSelect('${rowId}', this)" class="part-select flex-1 px-2 py-1 rounded-lg border border-slate-200 text-xs mr-2">
              ${partOpts}
            </select>
            <button type="button" onclick="removeMobilePdPartRow('${rowId}')" class="text-rose-500 font-bold px-2 py-0.5 rounded hover:bg-rose-50">✕</button>
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            <input type="text" placeholder="ชื่อ/รหัสอะไหล่" class="part-custom-name px-2 py-1 rounded-lg border border-slate-200 text-xs">
            <input type="number" step="1" value="1" min="1" placeholder="จำนวน" oninput="calcMobilePdPartsTotal()" class="part-qty px-2 py-1 rounded-lg border border-slate-200 text-xs text-center">
            <input type="number" step="0.01" value="0" placeholder="ราคา/หน่วย" oninput="calcMobilePdPartsTotal()" class="part-price px-2 py-1 rounded-lg border border-slate-200 text-xs text-right">
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', rowHtml);
      return rowId;
    }

    // ==========================================
    // Mobile Spare Part Picker & 4-Slot AI Vision
    // ==========================================
    let mobilePdAiSlots = { 1: null, 2: null, 3: null, 4: null };
    let mobilePdAiLastScanResult = null;

    function openMobilePdSparePartPickerModal(tab) {
      const modal = document.getElementById('mobPdSparePartPickerModal');
      if (!modal) return;
      modal.classList.remove('hidden');
      switchMobilePdSparePartTab(tab || 'catalog');
    }

    function closeMobilePdSparePartPickerModal() {
      const modal = document.getElementById('mobPdSparePartPickerModal');
      if (modal) modal.classList.add('hidden');
    }

    function switchMobilePdSparePartTab(tab) {
      const btnCat = document.getElementById('mobPdPartTabBtnCatalog');
      const btnAi = document.getElementById('mobPdPartTabBtnAi');
      const contentCat = document.getElementById('mobPdPartTabCatalogContent');
      const contentAi = document.getElementById('mobPdPartTabAiContent');

      if (tab === 'ai') {
        if (btnAi) btnAi.className = 'flex-1 py-2 text-xs font-bold rounded-t-xl transition border-b-2 border-orange-600 text-orange-600 bg-white text-center cursor-pointer';
        if (btnCat) btnCat.className = 'flex-1 py-2 text-xs font-bold rounded-t-xl transition border-b-2 border-transparent text-slate-500 hover:text-slate-800 text-center cursor-pointer';
        if (contentAi) contentAi.classList.remove('hidden');
        if (contentCat) contentCat.classList.add('hidden');
      } else {
        if (btnCat) btnCat.className = 'flex-1 py-2 text-xs font-bold rounded-t-xl transition border-b-2 border-orange-600 text-orange-600 bg-white text-center cursor-pointer';
        if (btnAi) btnAi.className = 'flex-1 py-2 text-xs font-bold rounded-t-xl transition border-b-2 border-transparent text-slate-500 hover:text-slate-800 text-center cursor-pointer';
        if (contentCat) contentCat.classList.remove('hidden');
        if (contentAi) contentAi.classList.add('hidden');
        filterMobilePdSparePartCatalog(document.getElementById('mobPdSparePartSearchQuery')?.value || '');
      }
    }

    function filterMobilePdSparePartCatalog(query) {
      const container = document.getElementById('mobPdSparePartCatalogList');
      if (!container) return;
      const q = (query || '').toLowerCase().trim();
      const filtered = q
        ? mobilePdSparePartsCache.filter(p =>
            String(p.PartCode || '').toLowerCase().includes(q) ||
            String(p.PartName || '').toLowerCase().includes(q) ||
            String(p.Spec || '').toLowerCase().includes(q) ||
            String(p.Brand || '').toLowerCase().includes(q)
          )
        : mobilePdSparePartsCache;

      if (filtered.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-slate-400">ไม่พบอะไหล่ที่ค้นหา</div>';
        return;
      }

      container.innerHTML = filtered.map(p => {
        const stock = Number(p.InStockQty || 0);
        let stockBadge = '';
        if (stock > 0) {
          stockBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">คงเหลือ ${stock} ${escapeHtml(p.Unit || 'ชิ้น')}</span>`;
        } else {
          stockBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">สต็อก ${stock} (ติดลบ)</span>`;
        }
        return `
          <div class="p-3 hover:bg-slate-50 transition flex items-center justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="font-bold text-slate-800 truncate">${escapeHtml(p.PartCode || '')} &bull; ${escapeHtml(p.PartName || '')}</div>
              <div class="text-[11px] text-slate-500 truncate">${escapeHtml(p.Spec || '')} ${p.Brand ? `[${escapeHtml(p.Brand)}]` : ''}</div>
              <div class="mt-1 flex items-center gap-2">
                ${stockBadge}
                <span class="text-[11px] text-slate-700 font-semibold font-mono">฿${Number(p.UnitPrice || 0).toLocaleString()}</span>
              </div>
            </div>
            <button type="button" onclick="selectMobilePdCatalogPart('${p.PartId}')" class="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer">
              เลือก
            </button>
          </div>
        `;
      }).join('');
    }

    function selectMobilePdCatalogPart(partId) {
      const part = mobilePdSparePartsCache.find(p => p.PartId === partId);
      if (!part) return;
      const rowId = addMobilePdPartRow();
      const row = document.getElementById(rowId);
      if (row) {
        const sel = row.querySelector('.part-select');
        const customName = row.querySelector('.part-custom-name');
        const price = row.querySelector('.part-price');
        const qty = row.querySelector('.part-qty');
        if (sel) sel.value = part.PartId;
        if (customName) customName.value = `${part.PartCode} ${part.PartName}`.trim();
        if (price) price.value = part.UnitPrice || 0;
        if (qty) qty.value = 1;
        calcMobilePdPartsTotal();
      }
      closeMobilePdSparePartPickerModal();
      if (typeof showToast === 'function') {
        showToast(`เลือกอะไหล่ ${part.PartCode} เรียบร้อยแล้ว`, 'success');
      }
    }

    function triggerMobilePdAiSlotCapture(slot) {
      const input = document.getElementById(`mobPdAiFile${slot}`);
      if (input) input.click();
    }

    async function handleMobilePdAiSlotCapture(slot, input) {
      if (!input || !input.files || !input.files[0]) return;
      const file = input.files[0];
      try {
        const base64 = await compressPdMobileImage(file);
        mobilePdAiSlots[slot] = base64;
        const preview = document.getElementById(`mobPdAiPreview${slot}`);
        const drop = document.getElementById(`mobPdAiDrop${slot}`);
        const img = document.getElementById(`mobPdAiImg${slot}`);
        if (img) img.src = base64;
        if (preview) preview.classList.remove('hidden');
        if (drop) drop.classList.add('hidden');
      } catch (err) {
        console.error('handleMobilePdAiSlotCapture error:', err);
        showToast('บีบอัดรูปภาพล้มเหลว', 'error');
      }
    }

    function clearMobilePdAiSlot(slot) {
      mobilePdAiSlots[slot] = null;
      const preview = document.getElementById(`mobPdAiPreview${slot}`);
      const drop = document.getElementById(`mobPdAiDrop${slot}`);
      const file = document.getElementById(`mobPdAiFile${slot}`);
      if (preview) preview.classList.add('hidden');
      if (drop) drop.classList.remove('hidden');
      if (file) file.value = '';
    }

    async function runMobilePdSparePartAiScan() {
      const activeImages = [1, 2, 3, 4]
        .map(s => mobilePdAiSlots[s])
        .filter(b64 => Boolean(b64));

      if (activeImages.length === 0) {
        showToast('กรุณาถ่ายรูปอะไหล่อย่างน้อย 1 รูปก่อนกดสแกน', 'warning');
        return;
      }

      const statusBox = document.getElementById('mobPdAiScanStatusBox');
      const statusText = document.getElementById('mobPdAiScanStatusText');
      const btn = document.getElementById('mobPdBtnRunAiScan');
      const resultCard = document.getElementById('mobPdAiResultCard');

      if (statusBox) statusBox.classList.remove('hidden');
      if (statusText) statusText.innerText = `กำลังส่ง ${activeImages.length} ภาพให้ Gemini AI วิเคราะห์สเปก...`;
      if (btn) btn.disabled = true;

      try {
        const res = await postApiRequest({
          action: 'scanPdSparePartWithAi',
          images: activeImages,
          callerEmpId: state.currentUser ? state.currentUser.employeeCode : ''
        });

        if (res && res.status === 'success' && res.data) {
          const aiData = res.data;
          mobilePdAiLastScanResult = aiData;

          const banner = document.getElementById('mobPdAiMatchBanner');
          if (banner) {
            const isInternal = (aiData.matchType === 'INTERNAL_MATCH') || Boolean(aiData.matchedPartId) || Boolean(aiData.matchedInternalPart && aiData.matchedInternalPart.partId);
            if (isInternal) {
              const matchedCode = aiData.partCode || (aiData.matchedInternalPart ? aiData.matchedInternalPart.partCode : '');
              const matchedName = aiData.partName || (aiData.matchedInternalPart ? aiData.matchedInternalPart.partName : '');
              banner.className = 'p-2 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5';
              banner.innerHTML = `<span>✅ พบตรงกับอะไหล่ในระบบ:</span> <span class="font-mono">${escapeHtml(matchedCode)} - ${escapeHtml(matchedName)}</span>`;
            } else {
              banner.className = 'p-2 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1.5';
              banner.innerHTML = `<span>✨ อะไหล่ใหม่ (วิเคราะห์สเปกและร้านค้าจากเน็ต)</span>`;
            }
          }

          const codeInput = document.getElementById('mobPdAiPartCode');
          const nameInput = document.getElementById('mobPdAiPartName');
          const specInput = document.getElementById('mobPdAiSpec');
          const brandInput = document.getElementById('mobPdAiBrand');
          const priceInput = document.getElementById('mobPdAiUnitPrice');
          const vendorText = document.getElementById('mobPdAiVendorText');
          const leadTimeText = document.getElementById('mobPdAiLeadTimeText');

          const codeVal = aiData.partCode || aiData.detectedPartCode || (aiData.matchedInternalPart ? aiData.matchedInternalPart.partCode : '') || '';
          const nameVal = aiData.partName || aiData.detectedPartName || (aiData.matchedInternalPart ? aiData.matchedInternalPart.partName : '') || '';
          const specVal = aiData.spec || aiData.detectedSpec || (aiData.matchedInternalPart ? aiData.matchedInternalPart.spec : '') || '';
          const brandVal = aiData.brand || aiData.detectedBrand || (aiData.matchedInternalPart ? aiData.matchedInternalPart.brand : '') || '';
          const priceVal = Number(aiData.unitPrice !== undefined ? aiData.unitPrice : (aiData.estimatedPrice !== undefined ? aiData.estimatedPrice : (aiData.matchedInternalPart ? aiData.matchedInternalPart.unitPrice : 0))) || 0;
          const vendorVal = aiData.recommendedVendor || aiData.vendor || (aiData.matchedInternalPart ? aiData.matchedInternalPart.vendor : '') || '-';
          const leadTimeVal = aiData.estimatedLeadTime || aiData.leadTime || (aiData.matchedInternalPart ? aiData.matchedInternalPart.leadTime : '') || '-';

          if (codeInput) codeInput.value = codeVal;
          if (nameInput) nameInput.value = nameVal;
          if (specInput) specInput.value = specVal;
          if (brandInput) brandInput.value = brandVal;
          if (priceInput) priceInput.value = priceVal;
          if (vendorText) vendorText.innerText = vendorVal;
          if (leadTimeText) leadTimeText.innerText = leadTimeVal;

          if (resultCard) resultCard.classList.remove('hidden');
          showToast(`วิเคราะห์อะไหล่สำเร็จ (${activeImages.length} ภาพ)`, 'success');
        } else {
          showToast((res && res.message) || 'ไม่สามารถวิเคราะห์อะไหล่ได้ กรุณากรอกเอง', 'info');
        }
      } catch (err) {
        console.error('runMobilePdSparePartAiScan error:', err);
        showToast('เกิดข้อผิดพลาดในการวิเคราะห์ภาพ: ' + err.message, 'error');
      } finally {
        if (statusBox) statusBox.classList.add('hidden');
        if (btn) btn.disabled = false;
      }
    }

    function confirmMobilePdAiPart() {
      const codeInput = document.getElementById('mobPdAiPartCode');
      const nameInput = document.getElementById('mobPdAiPartName');
      const priceInput = document.getElementById('mobPdAiUnitPrice');
      const qtyInput = document.getElementById('mobPdAiUsedQty');
      const specInput = document.getElementById('mobPdAiSpec');
      const brandInput = document.getElementById('mobPdAiBrand');

      const codeVal = codeInput ? codeInput.value.trim() : '';
      const nameVal = nameInput ? nameInput.value.trim() : '';
      const priceVal = Number(priceInput ? priceInput.value : 0) || 0;
      const qtyVal = Number(qtyInput ? qtyInput.value : 1) || 1;
      const specVal = specInput ? specInput.value.trim() : '';
      const brandVal = brandInput ? brandInput.value.trim() : '';

      if (!nameVal && !codeVal) {
        showToast('กรุณาระบุรหัสหรือชื่ออะไหล่', 'warning');
        return;
      }

      const rowId = addMobilePdPartRow();
      const row = document.getElementById(rowId);
      if (row) {
        const customName = row.querySelector('.part-custom-name');
        const price = row.querySelector('.part-price');
        const qty = row.querySelector('.part-qty');
        const sel = row.querySelector('.part-select');

        // Check if matched internal catalog
        const internalId = mobilePdAiLastScanResult && (mobilePdAiLastScanResult.matchedPartId || (mobilePdAiLastScanResult.matchedInternalPart && mobilePdAiLastScanResult.matchedInternalPart.partId));
        if (internalId && sel) {
          sel.value = internalId;
        }

        const displayName = (codeVal && nameVal && codeVal !== nameVal) ? `${codeVal} ${nameVal}` : (nameVal || codeVal);
        if (customName) customName.value = displayName;
        if (price) price.value = priceVal;
        if (qty) qty.value = qtyVal;
        calcMobilePdPartsTotal();
      }

      closeMobilePdSparePartPickerModal();
      showToast('เพิ่มอะไหล่ลงในรายการซ่อมเรียบร้อยแล้ว', 'success');
    }

    function removeMobilePdPartRow(rowId) {
      const el = document.getElementById(rowId);
      if (el) el.remove();
      calcMobilePdPartsTotal();
    }

    function handleMobilePdPartSelect(rowId, select) {
      const row = document.getElementById(rowId);
      if (!row) return;
      const opt = select.selectedOptions[0];
      if (opt && opt.value) {
        const nameInput = row.querySelector('.part-custom-name');
        const priceInput = row.querySelector('.part-price');
        if (nameInput) nameInput.value = `${opt.dataset.code} ${opt.dataset.name}`.trim();
        if (priceInput) priceInput.value = opt.dataset.price || '0';
      }
      calcMobilePdPartsTotal();
    }

    function calcMobilePdPartsTotal() {
      let total = 0;
      const rows = document.querySelectorAll('#mobPdPartsList > div');
      rows.forEach(r => {
        const qty = Number(r.querySelector('.part-qty')?.value || 0);
        const price = Number(r.querySelector('.part-price')?.value || 0);
        total += (qty * price);
      });
      const totalEl = document.getElementById('mobPdPartsTotalCost');
      if (totalEl) totalEl.innerText = `฿${total.toLocaleString()}`;
    }

    async function handleMobilePdRepairSubmit(event) {
      event.preventDefault();
      const btn = document.getElementById('mobPdSubmitBtn');
      const machineSelect = document.getElementById('mobPdMachineSelect');
      const customChk = document.getElementById('mobPdCheckCustomMachine');
      const customName = document.getElementById('mobPdCustomMachineName');

      let machineNo = '';
      let machineName = '';

      if (customChk && customChk.checked) {
        machineName = customName ? customName.value.trim() : '';
        machineNo = 'CUSTOM';
        if (!machineName) {
          showToast('กรุณาระบุชื่อเครื่องจักร/อุปกรณ์', 'error');
          return;
        }
      } else {
        machineNo = machineSelect ? machineSelect.value : '';
        if (!machineNo) {
          showToast('กรุณาเลือกเครื่องจักรที่ซ่อม', 'error');
          return;
        }
        const matched = mobilePdMachinesCache.find(m => m.MachineNo === machineNo);
        machineName = matched ? matched.MachineName : machineNo;
      }

      const startTime = document.getElementById('mobPdStartTime').value;
      const endTime = document.getElementById('mobPdEndTime').value;
      if (!startTime || !endTime) {
        showToast('กรุณาระบุวัน-เวลาเริ่มและเสร็จสิ้น', 'error');
        return;
      }

      // Collect parts
      const parts = [];
      const rows = document.querySelectorAll('#mobPdPartsList > div');
      rows.forEach(r => {
        const sel = r.querySelector('.part-select');
        const opt = sel ? sel.selectedOptions[0] : null;
        const customNameVal = r.querySelector('.part-custom-name')?.value.trim() || '';
        const qty = Number(r.querySelector('.part-qty')?.value || 0);
        const price = Number(r.querySelector('.part-price')?.value || 0);

        if (qty > 0 && (customNameVal || (opt && opt.value))) {
          parts.push({
            partId: opt ? opt.value : '',
            partCode: opt ? (opt.dataset.code || '') : '',
            partName: customNameVal || (opt ? opt.dataset.name : ''),
            qty: qty,
            unitPrice: price,
            saveToCatalog: !opt || !opt.value
          });
        }
      });

      const payload = {
        action: 'submitMobileMachineRepair',
        MachineNo: machineNo,
        MachineName: machineName,
        StartDateTime: startTime.replace('T', ' '),
        EndDateTime: endTime.replace('T', ' '),
        RepairType: document.getElementById('mobPdRepairType').value,
        RepairNature: document.getElementById('mobPdRepairNature').value,
        MakerName: document.getElementById('mobPdMakerName')?.value || '',
        MakerServiceReportBase64: mobilePdRepairPhotos.makerReport || '',
        AbnormalDesc: document.getElementById('mobPdAbnormalDesc').value,
        AbnormalPhotoBase64: mobilePdRepairPhotos.abnormal || '',
        CauseDesc: document.getElementById('mobPdCauseDesc').value,
        CausePhotoBase64: mobilePdRepairPhotos.cause || '',
        DefectDesc: document.getElementById('mobPdDefectDesc').value,
        DefectPhotoBase64: mobilePdRepairPhotos.defect || '',
        RepairDesc: document.getElementById('mobPdRepairDesc').value,
        RepairPhotoBase64: mobilePdRepairPhotos.repair || '',
        parts: parts,
        PartsReplaced: parts, // Contract parity with PD.js
        OtherRemarks: document.getElementById('mobPdRemarks')?.value || '',
        ReporterEmpId: state.currentUser ? state.currentUser.employeeCode : '',
        ReporterName: state.currentUser ? state.currentUser.fullName : ''
      };

      try {
        btn.disabled = true;
        btn.innerHTML = '<span class="inline-block animate-spin mr-1">⏳</span> กำลังบันทึกประวัติการซ่อม...';

        const res = await postApiRequest(payload);
        if (res && (res.status === 'success' || res.success)) {
          showToast(`บันทึกประวัติซ่อม ${res.repairNo || ''} สำเร็จเรียบร้อย!`, 'success');
          // Reset Form
          document.getElementById('mobPdRepairForm').reset();
          document.getElementById('mobPdPartsList').innerHTML = '';
          calcMobilePdPartsTotal();
          mobilePdRepairPhotos = { abnormal: '', cause: '', defect: '', repair: '', makerReport: '' };
          ['mobPdPreviewAbnormal', 'mobPdPreviewCause', 'mobPdPreviewDefect', 'mobPdPreviewRepair'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
          });
          const hintBox = document.getElementById('mobPdMachineLastRepairHint');
          if (hintBox) { hintBox.innerHTML = ''; hintBox.classList.add('hidden'); }
          openView('dashboard');
        } else {
          showToast('บันทึกล้มเหลว: ' + ((res && res.message) || (res && res.error) || 'Unknown error'), 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาดในการส่งข้อมูล: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>บันทึกประวัติการซ่อม</span>';
      }
    }

    // Expose PD functions to window
    window.loadMobilePdRepairView = loadMobilePdRepairView;
    window.filterMobilePdMachines = filterMobilePdMachines;
    window.handleMobilePdMachineChange = handleMobilePdMachineChange;
    window.applyMobilePdLastRepair = applyMobilePdLastRepair;
    window.stepMobilePdStartTime = stepMobilePdStartTime;
    window.setMobilePdEndTimeNow = setMobilePdEndTimeNow;
    window.calculateMobilePdDuration = calculateMobilePdDuration;
    window.openMobilePdSparePartPickerModal = openMobilePdSparePartPickerModal;
    window.closeMobilePdSparePartPickerModal = closeMobilePdSparePartPickerModal;
    window.switchMobilePdSparePartTab = switchMobilePdSparePartTab;
    window.filterMobilePdSparePartCatalog = filterMobilePdSparePartCatalog;
    window.selectMobilePdCatalogPart = selectMobilePdCatalogPart;
    window.triggerMobilePdAiSlotCapture = triggerMobilePdAiSlotCapture;
    window.handleMobilePdAiSlotCapture = handleMobilePdAiSlotCapture;
    window.clearMobilePdAiSlot = clearMobilePdAiSlot;
    window.runMobilePdSparePartAiScan = runMobilePdSparePartAiScan;
    window.confirmMobilePdAiPart = confirmMobilePdAiPart;

    // ==========================================
    // MOBILE PC STORE CONTROLLER (Frontline Lean Hub)
    // ==========================================
    let mobilePcCoilsCache = [];
    let mobilePcActiveFilter = 'ALL';
    let mobilePcStagedMtcMatch = null;

    function initMobilePcCoilReceive() {
      const form = document.getElementById('mobPcCoilReceiveForm');
      if (form) form.reset();

      const previewBox = document.getElementById('mobPcCoilImagePreviewBox');
      if (previewBox) previewBox.classList.add('hidden');

      const banner = document.getElementById('mobPcMtcMatchStatusBanner');
      if (banner) {
        banner.className = 'hidden p-3 rounded-xl border text-xs font-semibold animate-in fade-in duration-150';
        banner.innerHTML = '';
      }
      mobilePcStagedMtcMatch = null;
    }

    async function handleMobilePcCoilTagCapture(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const previewBox = document.getElementById('mobPcCoilImagePreviewBox');
      const previewImg = document.getElementById('mobPcCoilImagePreview');
      const scanBox = document.getElementById('mobPcCoilAiScanningBox');

      try {
        if (scanBox) scanBox.classList.remove('hidden');

        const reader = new FileReader();
        reader.onload = function(e) {
          if (previewImg) previewImg.src = e.target.result;
          if (previewBox) previewBox.classList.remove('hidden');
        };
        reader.readAsDataURL(file);

        const compressedBase64 = await compressMobileImage(file, 1200, 0.8);
        const base64Data = compressedBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

        const res = await postApiRequest({
          action: 'extractCoilTagWithAI',
          base64Data: base64Data,
          mimeType: file.type || 'image/jpeg',
          callerEmpId: state.currentUser ? state.currentUser.employeeCode : 'MOBILE_PC'
        });

        if (res && res.status === 'success' && res.data) {
          const d = res.data;
          const lotInput = document.getElementById('mobPcCoilLotNo');
          const heatInput = document.getElementById('mobPcHeatNo');
          const gradeInput = document.getElementById('mobPcMaterialGrade');
          const specInput = document.getElementById('mobPcSpecDimension');
          const weightInput = document.getElementById('mobPcTotalWeight');
          const supInput = document.getElementById('mobPcSupplierName');

          if (lotInput && d.coilLotNo) lotInput.value = d.coilLotNo;
          if (heatInput && d.heatNo) heatInput.value = d.heatNo;
          if (gradeInput && d.materialGrade) gradeInput.value = d.materialGrade;
          if (specInput && d.specDimension) specInput.value = d.specDimension;
          if (weightInput && d.totalWeightKg) weightInput.value = d.totalWeightKg;
          if (supInput && d.supplierName) supInput.value = d.supplierName;

          const banner = document.getElementById('mobPcMtcMatchStatusBanner');
          if (banner) {
            banner.classList.remove('hidden');
            if (d.isMtcAvailable && d.stagedMtc) {
              mobilePcStagedMtcMatch = d.stagedMtc;
              banner.className = 'p-3 rounded-xl border bg-emerald-50 border-emerald-300 text-emerald-900 text-xs font-semibold animate-in fade-in duration-150';
              banner.innerHTML = `
                <div class="flex items-center gap-1.5 font-bold text-emerald-800">
                  <span>✅ พบใบเซอร์ MTC ในระบบแล้ว</span>
                  <span class="text-[10px] bg-emerald-200 px-1.5 py-0.2 rounded font-mono">${d.stagedMtc.HeatNo}</span>
                </div>
                <div class="text-[11px] text-emerald-700 mt-0.5">ม้วนนี้จะปลดล็อคเป็น <strong>AVAILABLE (พร้อมสั่งผลิต)</strong> ทันทีที่กดบันทึก</div>
              `;
            } else {
              mobilePcStagedMtcMatch = null;
              banner.className = 'p-3 rounded-xl border bg-amber-50 border-amber-300 text-amber-900 text-xs font-semibold animate-in fade-in duration-150';
              banner.innerHTML = `
                <div class="flex items-center gap-1.5 font-bold text-amber-800">
                  <span>⚠️ ยังไม่พบใบเซอร์ MTC ในระบบ</span>
                </div>
                <div class="text-[11px] text-amber-700 mt-0.5">ม้วนนี้จะบันทึกเป็น <strong>PENDING_QA_VERIFY</strong> และส่ง LINE แจ้งเตือนฝ่ายคุณภาพให้เข้ามาตรวจปล่อยอัตโนมัติ</div>
              `;
            }
          }
          showToast('สแกนป้ายสำเร็จ กรุณาตรวจสอบตัวเลขก่อนบันทึก', 'success');
        } else {
          showToast('ไม่สามารถอ่านข้อมูลป้ายอัตโนมัติได้ กรุณากรอกข้อมูล', 'warning');
        }
      } catch (err) {
        console.error('Mobile coil tag scan error:', err);
        showToast('เกิดข้อผิดพลาดในการสแกนป้าย: ' + err.message, 'error');
      } finally {
        if (scanBox) scanBox.classList.add('hidden');
      }
    }

    async function handleMobilePcCoilSubmit(event) {
      event.preventDefault();
      const btn = document.getElementById('mobPcBtnSubmitReceive');
      const coilLot = document.getElementById('mobPcCoilLotNo').value.trim();
      const heatNo = document.getElementById('mobPcHeatNo').value.trim();
      const grade = document.getElementById('mobPcMaterialGrade').value.trim();
      const dimension = document.getElementById('mobPcSpecDimension').value.trim();
      const weight = Number(document.getElementById('mobPcTotalWeight').value || 0);
      const location = document.getElementById('mobPcLocation').value.trim();
      const supplier = document.getElementById('mobPcSupplierName').value.trim();

      if (!coilLot) {
        showToast('กรุณาระบุ Coil Lot No.', 'error');
        return;
      }
      if (!grade) {
        showToast('กรุณาระบุเกรดวัตถุดิบ (Grade)', 'error');
        return;
      }
      if (weight <= 0) {
        showToast('กรุณาระบุน้ำหนักรวมให้ถูกต้อง', 'error');
        return;
      }

      try {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳ กำลังบันทึกรับเข้าคลัง...</span>';

        const payload = {
          action: 'saveMesRawMaterial',
          CoilLotNo: coilLot,
          HeatNo: heatNo,
          MaterialGrade: grade,
          SpecDimension: dimension,
          TotalWeightKg: weight,
          RemainingWeightKg: weight,
          Location: location,
          SupplierName: supplier,
          Origin: 'DOMESTIC',
          callerEmpId: state.currentUser ? state.currentUser.employeeCode : 'MOBILE_PC'
        };

        const res = await postApiRequest(payload);
        if (res && res.status === 'success') {
          const status = (res.data && res.data.Status) || '';
          const msg = status === 'AVAILABLE'
            ? `บันทึกม้วน ${coilLot} สำเร็จ (พร้อมผลิต AVAILABLE)`
            : `บันทึกม้วน ${coilLot} สำเร็จ (รอ QA ตรวจ MTC & แจ้งเตือน LINE เรียบร้อย)`;
          showToast(msg, 'success');
          initMobilePcCoilReceive();
          closeCurrentView();
        } else {
          showToast('บันทึกไม่สำเร็จ: ' + ((res && res.message) || 'Unknown error'), 'error');
        }
      } catch (err) {
        console.error('handleMobilePcCoilSubmit error:', err);
        showToast('เกิดข้อผิดพลาดในการบันทึก: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>💾 ยืนยันบันทึกรับเข้าคลัง</span>';
      }
    }

    function compressMobileImage(file, maxDimension = 1200, quality = 0.8) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        const reader = new FileReader();
        reader.onload = e => (img.src = e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    async function initMobilePcCoilCheck() {
      mobilePcActiveFilter = 'ALL';
      const searchInput = document.getElementById('mobPcSearchCoilInput');
      if (searchInput) searchInput.value = '';
      setMobilePcCoilFilter('ALL');
      await loadMobilePcCoilStockList();
    }

    async function loadMobilePcCoilStockList() {
      const container = document.getElementById('mobPcCoilListContainer');
      if (container) {
        container.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs animate-pulse">กำลังโหลดสต็อกขดลวด...</div>';
      }

      try {
        const res = await postApiRequest({ action: 'getMesRawMaterials' });
        if (res && res.status === 'success' && Array.isArray(res.data)) {
          mobilePcCoilsCache = res.data;
          renderMobilePcCoils();
        } else {
          if (container) container.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs">ไม่พบข้อมูลขดลวดในคลัง</div>';
        }
      } catch (err) {
        console.error('loadMobilePcCoilStockList error:', err);
        if (container) container.innerHTML = `<div class="text-center py-8 text-rose-500 text-xs">โหลดไม่สำเร็จ: ${err.message}</div>`;
      }
    }

    function setMobilePcCoilFilter(status) {
      mobilePcActiveFilter = status;
      const pills = ['ALL', 'AVAILABLE', 'PENDING'];
      pills.forEach(p => {
        const el = document.getElementById(`mobPcFilterPill_${p}`);
        if (!el) return;
        if ((p === 'ALL' && status === 'ALL') || (p === 'AVAILABLE' && status === 'AVAILABLE') || (p === 'PENDING' && status === 'PENDING_QA_VERIFY')) {
          el.className = 'px-3 py-1 rounded-full font-bold bg-cyan-600 text-white shrink-0 cursor-pointer';
        } else {
          el.className = 'px-3 py-1 rounded-full font-semibold bg-slate-100 text-slate-600 shrink-0 cursor-pointer';
        }
      });
      renderMobilePcCoils();
    }

    function filterMobilePcCoils() {
      renderMobilePcCoils();
    }

    function renderMobilePcCoils() {
      const container = document.getElementById('mobPcCoilListContainer');
      if (!container) return;

      const searchVal = String(document.getElementById('mobPcSearchCoilInput')?.value || '').toLowerCase().trim();
      const filtered = (mobilePcCoilsCache || []).filter(c => {
        const matchesStatus = mobilePcActiveFilter === 'ALL' || String(c.Status || '').trim() === mobilePcActiveFilter;
        if (!matchesStatus) return false;

        if (!searchVal) return true;
        const lot = String(c.CoilLotNo || '').toLowerCase();
        const heat = String(c.HeatNo || '').toLowerCase();
        const grade = String(c.MaterialGrade || '').toLowerCase();
        const loc = String(c.Location || '').toLowerCase();
        const sup = String(c.SupplierName || '').toLowerCase();
        return lot.includes(searchVal) || heat.includes(searchVal) || grade.includes(searchVal) || loc.includes(searchVal) || sup.includes(searchVal);
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs">ไม่พบขดลวดที่ตรงกับเงื่อนไข</div>';
        return;
      }

      container.innerHTML = filtered.map(c => {
        const isAvailable = String(c.Status).trim() === 'AVAILABLE';
        const statusBadge = isAvailable
          ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">🟢 พร้อมผลิต (AVAILABLE)</span>'
          : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">🟡 รอ QA ตรวจ MTC</span>';

        const weight = Number(c.RemainingWeightKg || c.TotalWeightKg || 0);

        return `
          <div class="p-3 bg-white rounded-2xl border ${isAvailable ? 'border-slate-200' : 'border-amber-200 bg-amber-50/20'} shadow-2xs space-y-2">
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="font-mono font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span>${escapeHtml(c.CoilLotNo || '-')}</span>
                  ${c.HeatNo ? `<span class="text-[10px] font-normal text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">Heat: ${escapeHtml(c.HeatNo)}</span>` : ''}
                </div>
                <div class="text-[11px] font-semibold text-slate-600 mt-0.5">
                  ${escapeHtml(c.MaterialGrade || '-')} &bull; ${escapeHtml(c.SpecDimension || '-')}
                </div>
              </div>
              ${statusBadge}
            </div>

            <div class="flex items-center justify-between text-[11px] border-t border-slate-100 pt-1.5 font-mono text-slate-500">
              <div>คงเหลือ: <strong class="text-slate-800">${weight.toLocaleString()} กก.</strong></div>
              <div>พิกัด: <strong class="text-indigo-700">${escapeHtml(c.Location || 'ไม่ระบุ')}</strong></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Expose PC functions to window
    window.initMobilePcCoilReceive = initMobilePcCoilReceive;
    window.handleMobilePcCoilTagCapture = handleMobilePcCoilTagCapture;
    window.handleMobilePcCoilSubmit = handleMobilePcCoilSubmit;
    window.initMobilePcCoilCheck = initMobilePcCoilCheck;
    window.loadMobilePcCoilStockList = loadMobilePcCoilStockList;
    window.setMobilePcCoilFilter = setMobilePcCoilFilter;
    window.filterMobilePcCoils = filterMobilePcCoils;

    // ==========================================
    // Run on Page Load
    // ==========================================
    window.addEventListener('DOMContentLoaded', initApp);
