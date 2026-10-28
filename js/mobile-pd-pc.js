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
      const file = input && input.files && input.files[0];
      if (!file) return;

      const submitBtn = document.getElementById('mobPdSubmitBtn');
      const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="inline-block animate-spin mr-1">⏳</span> กำลังประมวลผลรูปถ่าย...';
      }

      try {
        const compressedBase64 = await compressPdMobileImage(file);
        mobilePdRepairPhotos[targetKey] = compressedBase64;

        const capitalizedKey = targetKey.charAt(0).toUpperCase() + targetKey.slice(1);
        const box = document.getElementById(`mobPdPreviewBox${capitalizedKey}`);
        const img = document.getElementById(`mobPdPreview${capitalizedKey}`);
        if (img) img.src = compressedBase64;
        if (box) box.classList.remove('hidden');
        showToast('✓ ประมวลผลรูปถ่ายสำเร็จ', 'success');
      } catch (err) {
        console.error('Image compression error:', err);
        showToast('บีบอัดรูปภาพล้มเหลว กรุณาลองใหม่อีกครั้ง', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnHtml || '<span>✓ บันทึกประวัติการซ่อม</span>';
        }
      }
    }

    function removeMobilePdRepairPhoto(targetKey) {
      if (!targetKey) return;
      mobilePdRepairPhotos[targetKey] = '';
      const capitalizedKey = targetKey.charAt(0).toUpperCase() + targetKey.slice(1);
      const box = document.getElementById(`mobPdPreviewBox${capitalizedKey}`);
      const img = document.getElementById(`mobPdPreview${capitalizedKey}`);
      const fileInput = document.getElementById(`mobPdPhotoFile${capitalizedKey}`);
      if (box) box.classList.add('hidden');
      if (img) img.src = '';
      if (fileInput) fileInput.value = '';
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
        const locText = p.Location ? ` [📍 ${p.Location}]` : '';
        partOpts += `<option value="${p.PartId}" data-code="${p.PartCode}" data-name="${p.PartName}" data-price="${p.UnitPrice}" data-unit="${p.Unit}" data-location="${escapeHtml(p.Location || '')}">${p.PartCode} - ${p.PartName}${locText} (คงเหลือ: ${p.InStockQty})</option>`;
      });

      const rowHtml = `
        <div id="${rowId}" class="p-2.5 bg-white rounded-xl border border-orange-200 space-y-2">
          <div class="flex items-center justify-between">
            <select onchange="handleMobilePdPartSelect('${rowId}', this)" class="part-select flex-1 px-2 py-1 rounded-lg border border-slate-200 text-xs mr-2">
              ${partOpts}
            </select>
            <button type="button" onclick="removeMobilePdPartRow('${rowId}')" class="text-rose-500 font-bold px-2 py-0.5 rounded hover:bg-rose-50 cursor-pointer">✕</button>
          </div>
          <div class="part-location-badge text-[10px] text-sky-700 font-semibold pl-1 hidden"></div>
          <div class="grid grid-cols-3 gap-1.5">
            <input type="text" placeholder="ชื่อ/รหัสอะไหล่" class="part-custom-name px-2 py-1 rounded-lg border border-slate-200 text-xs">
            <input type="number" step="1" value="1" min="1" placeholder="จำนวน" oninput="calcMobilePdPartsTotal()" class="part-qty px-2 py-1 rounded-lg border border-slate-200 text-xs text-center font-bold">
            <input type="number" step="0.01" value="0" placeholder="ราคา/หน่วย" oninput="calcMobilePdPartsTotal()" class="part-price px-2 py-1 rounded-lg border border-slate-200 text-xs text-right font-mono">
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
            String(p.Brand || '').toLowerCase().includes(q) ||
            String(p.Location || '').toLowerCase().includes(q)
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
        const locBadge = p.Location
          ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">📍 ${escapeHtml(p.Location)}</span>`
          : `<span class="px-2 py-0.5 rounded-full text-[10px] text-slate-400 bg-slate-100">📍 ไม่ระบุจุดเก็บ</span>`;

        return `
          <div class="p-3 hover:bg-slate-50 transition flex items-center justify-between gap-2 border-b border-slate-100 last:border-b-0">
            <div class="flex-1 min-w-0">
              <div class="font-bold text-slate-800 truncate">${escapeHtml(p.PartCode || '')} &bull; ${escapeHtml(p.PartName || '')}</div>
              <div class="text-[11px] text-slate-500 truncate">${escapeHtml(p.Spec || '')} ${p.Brand ? `[${escapeHtml(p.Brand)}]` : ''}</div>
              <div class="mt-1.5 flex items-center gap-1.5 flex-wrap">
                ${locBadge}
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
        const locBadge = row.querySelector('.part-location-badge');
        if (sel) sel.value = part.PartId;
        if (customName) customName.value = `${part.PartCode} ${part.PartName}`.trim();
        if (price) price.value = part.UnitPrice || 0;
        if (qty) qty.value = 1;
        if (locBadge) {
          if (part.Location) {
            locBadge.innerHTML = `📍 <span class="font-bold">จุดจัดเก็บ:</span> ${escapeHtml(part.Location)}`;
            locBadge.classList.remove('hidden');
          } else {
            locBadge.innerHTML = '';
            locBadge.classList.add('hidden');
          }
        }
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
              const matchedLoc = aiData.location || (aiData.matchedInternalPart ? aiData.matchedInternalPart.location : '');
              banner.className = 'p-2.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-900 flex flex-col gap-1 border border-emerald-200';
              banner.innerHTML = `
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span>✅ พบตรงกับอะไหล่ในระบบ:</span>
                  <span class="font-mono">${escapeHtml(matchedCode)} - ${escapeHtml(matchedName)}</span>
                </div>
                ${matchedLoc ? `<div class="inline-flex items-center gap-1 text-[11px] text-emerald-900 bg-white/80 px-2 py-0.5 rounded-lg border border-emerald-300 w-fit font-bold"><span>📍 จุดจัดเก็บ:</span> <span class="text-rose-700 font-black">${escapeHtml(matchedLoc)}</span></div>` : ''}
              `;
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
          const locText = document.getElementById('mobPdAiLocationText');

          const codeVal = aiData.partCode || aiData.detectedPartCode || (aiData.matchedInternalPart ? aiData.matchedInternalPart.partCode : '') || '';
          const nameVal = aiData.partName || aiData.detectedPartName || (aiData.matchedInternalPart ? aiData.matchedInternalPart.partName : '') || '';
          const specVal = aiData.spec || aiData.detectedSpec || (aiData.matchedInternalPart ? aiData.matchedInternalPart.spec : '') || '';
          const brandVal = aiData.brand || aiData.detectedBrand || (aiData.matchedInternalPart ? aiData.matchedInternalPart.brand : '') || '';
          const priceVal = Number(aiData.unitPrice !== undefined ? aiData.unitPrice : (aiData.estimatedPrice !== undefined ? aiData.estimatedPrice : (aiData.matchedInternalPart ? aiData.matchedInternalPart.unitPrice : 0))) || 0;
          const vendorVal = aiData.recommendedVendor || aiData.vendor || (aiData.matchedInternalPart ? aiData.matchedInternalPart.vendor : '') || '-';
          const leadTimeVal = aiData.estimatedLeadTime || aiData.leadTime || (aiData.matchedInternalPart ? aiData.matchedInternalPart.leadTime : '') || '-';
          const locVal = aiData.location || (aiData.matchedInternalPart ? aiData.matchedInternalPart.location : '') || '';

          if (codeInput) codeInput.value = codeVal;
          if (nameInput) nameInput.value = nameVal;
          if (specInput) specInput.value = specVal;
          if (brandInput) brandInput.value = brandVal;
          if (priceInput) priceInput.value = priceVal;
          if (vendorText) vendorText.innerText = vendorVal;
          if (leadTimeText) leadTimeText.innerText = leadTimeVal;
          if (locText) locText.innerText = locVal ? `${locVal}` : '-';

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

        const locBadge = row.querySelector('.part-location-badge');
        const locVal = (mobilePdAiLastScanResult && (mobilePdAiLastScanResult.location || (mobilePdAiLastScanResult.matchedInternalPart && mobilePdAiLastScanResult.matchedInternalPart.location))) || '';
        if (locBadge) {
          if (locVal) {
            locBadge.innerHTML = `📍 <span class="font-bold">จุดจัดเก็บ:</span> ${escapeHtml(locVal)}`;
            locBadge.classList.remove('hidden');
          } else {
            locBadge.innerHTML = '';
            locBadge.classList.add('hidden');
          }
        }

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
      const locBadge = row.querySelector('.part-location-badge');
      if (opt && opt.value) {
        const nameInput = row.querySelector('.part-custom-name');
        const priceInput = row.querySelector('.part-price');
        if (nameInput) nameInput.value = `${opt.dataset.code} ${opt.dataset.name}`.trim();
        if (priceInput) priceInput.value = opt.dataset.price || '0';
        if (locBadge) {
          const loc = opt.dataset.location;
          if (loc) {
            locBadge.innerHTML = `📍 <span class="font-bold">จุดจัดเก็บ:</span> ${escapeHtml(loc)}`;
            locBadge.classList.remove('hidden');
          } else {
            locBadge.innerHTML = '';
            locBadge.classList.add('hidden');
          }
        }
      } else if (locBadge) {
        locBadge.innerHTML = '';
        locBadge.classList.add('hidden');
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
          ['Abnormal', 'Cause', 'Defect', 'Repair'].forEach(key => {
            const box = document.getElementById(`mobPdPreviewBox${key}`);
            const img = document.getElementById(`mobPdPreview${key}`);
            if (box) box.classList.add('hidden');
            if (img) img.src = '';
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
    window.handleMobilePdPhotoSelect = handleMobilePdPhotoSelect;
    window.removeMobilePdRepairPhoto = removeMobilePdRepairPhoto;
    window.handleMobilePdReportFile = handleMobilePdReportFile;
    window.handleMobilePdRepairSubmit = handleMobilePdRepairSubmit;
    window.compressPdMobileImage = compressPdMobileImage;

    // ==========================================
    // MOBILE PC STORE CONTROLLER (Frontline Lean Hub)
    // ==========================================
    let mobilePcCoilsCache = [];
    let mobilePcActiveFilter = 'ALL';
    let mobilePcStagedMtcMatch = null;
    let mobilePcCurrentTagBase64 = null;
    let mobilePcCurrentViewingTag = null;

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
      mobilePcCurrentTagBase64 = null;
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
        mobilePcCurrentTagBase64 = base64Data;

        const res = await postApiRequest({
          action: 'extractCoilTagWithAI',
          base64Data: base64Data,
          mimeType: 'image/jpeg',
          images: [{ base64Data: base64Data, mimeType: 'image/jpeg' }],
          callerEmpId: state.currentUser ? state.currentUser.employeeCode : 'MOBILE_PC'
        });

        if (res && (res.status === 'success' || res.success) && res.data) {
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
          if (weightInput && (d.totalWeightKg !== undefined && d.totalWeightKg !== null && d.totalWeightKg !== '')) weightInput.value = d.totalWeightKg;
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
          const errMsg = (res && (res.message || res.error)) ? `: ${res.message || res.error}` : '';
          showToast(`ไม่สามารถอ่านข้อมูลป้ายอัตโนมัติได้${errMsg} กรุณากรอกข้อมูล`, 'warning');
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
          tagPhotoBase64: mobilePcCurrentTagBase64 || null,
          callerEmpId: state.currentUser ? state.currentUser.employeeCode : 'MOBILE_PC'
        };

        const res = await postApiRequest(payload);
        if (res && (res.status === 'success' || res.success)) {
          const status = (res.data && res.data.Status) || '';
          const msg = status === 'AVAILABLE'
            ? `บันทึกม้วน ${coilLot} สำเร็จ (พร้อมผลิต AVAILABLE)`
            : `บันทึกม้วน ${coilLot} สำเร็จ (รอ QA ตรวจ MTC & แจ้งเตือน LINE เรียบร้อย)`;
          showToast(msg, 'success');
          initMobilePcCoilReceive();
          closeCurrentView();
          // เปิดป้ายแท็กภายในให้ตรวจสอบ/พิมพ์ทันที
          setTimeout(() => {
            openMobilePcCoilTag(coilLot);
          }, 300);
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
        if (res && (res.status === 'success' || res.success) && Array.isArray(res.data)) {
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

            <div class="flex items-center justify-between pt-1 border-t border-slate-50 text-[10px]">
              <div class="text-slate-400 font-sans truncate max-w-[150px]">
                ${c.SupplierName ? escapeHtml(c.SupplierName) : ''}
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                ${c.MillSheetUrl ? `<a href="${c.MillSheetUrl}" target="_blank" onclick="event.stopPropagation()" class="px-2 py-0.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition">📄 MTC</a>` : ''}
                <button type="button" onclick="event.stopPropagation(); openMobilePcCoilTag('${escapeHtml(c.CoilLotNo || '')}')" class="px-2 py-0.5 rounded-md border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold active:scale-95 transition">🏷️ ป้ายแท็ก</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    async function handleMobilePcBarcodeScan(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      try {
        showToast('กำลังตรวจหาบาร์โค้ดจากภาพ...', 'info');

        // 1. ลองใช้ Native BarcodeDetector API (Android Chrome & iOS 17+)
        if ('BarcodeDetector' in window) {
          try {
            const barcodeDetector = new window.BarcodeDetector({ formats: ['code_128', 'qr_code', 'ean_13', 'code_39', 'data_matrix'] });
            const bitmap = await createImageBitmap(file);
            const barcodes = await barcodeDetector.detect(bitmap);
            if (barcodes && barcodes.length > 0) {
              const code = String(barcodes[0].rawValue || '').trim();
              if (code) {
                const searchInput = document.getElementById('mobPcSearchCoilInput');
                if (searchInput) searchInput.value = code;
                filterMobilePcCoils();
                showToast(`พบบาร์โค้ด: ${code}`, 'success');
                return;
              }
            }
          } catch (bcErr) {
            console.warn('BarcodeDetector error:', bcErr);
          }
        }

        // 2. Fallback: บีบอัดและส่งให้ AI Vision วิเคราะห์รหัสขดลวด
        const compressed = await compressMobileImage(file, 900, 0.7);
        const base64 = compressed.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
        const res = await postApiRequest({
          action: 'extractCoilTagWithAI',
          base64Data: base64,
          mimeType: 'image/jpeg',
          callerEmpId: state.currentUser ? state.currentUser.employeeCode : 'MOBILE_PC'
        });

        if (res && (res.status === 'success' || res.success) && res.data) {
          const found = res.data.coilLotNo || res.data.heatNo || '';
          if (found) {
            const searchInput = document.getElementById('mobPcSearchCoilInput');
            if (searchInput) searchInput.value = found;
            filterMobilePcCoils();
            showToast(`พบข้อมูลขดลวด: ${found}`, 'success');
            return;
          }
        }

        showToast('ไม่พบบาร์โค้ดที่ชัดเจน กรุณาลองถ่ายใหม่อีกครั้งหรือพิมพ์ค้นหา', 'warning');
      } catch (err) {
        console.error('Barcode scan error:', err);
        showToast('เกิดข้อผิดพลาดในการสแกนบาร์โค้ด: ' + err.message, 'error');
      } finally {
        event.target.value = '';
      }
    }

    async function openMobilePcCoilTag(coilLotNo) {
      const modal = document.getElementById('mobPcCoilTagModal');
      const content = document.getElementById('mobPcCoilTagContent');
      if (!modal || !content) return;

      content.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs animate-pulse">กำลังโหลดข้อมูลป้ายแท็ก...</div>';
      modal.classList.remove('hidden');

      try {
        const res = await postApiRequest({
          action: 'getPcCoilTagPrintData',
          coilLotNo: coilLotNo
        });

        if (res && (res.status === 'success' || res.success) && res.data) {
          const t = res.data;
          mobilePcCurrentViewingTag = t;

          const isAvail = String(t.status).trim() === 'AVAILABLE';
          const statusBadge = isAvail
            ? '<span class="px-2 py-0.5 rounded font-black bg-emerald-100 text-emerald-800 text-[10px] border border-emerald-300">AVAILABLE</span>'
            : '<span class="px-2 py-0.5 rounded font-black bg-amber-100 text-amber-800 text-[10px] border border-amber-300">PENDING_QA</span>';

          content.innerHTML = `
            <div class="border-b-2 border-slate-900 pb-2">
              <div class="flex items-start justify-between">
                <div>
                  <div class="text-[11px] font-black uppercase text-slate-900">MINAMIDA (THAILAND)</div>
                  <div class="text-[9px] font-bold text-slate-600">PRODUCTION CONTROL • RAW MATERIAL IQC</div>
                </div>
                <div class="text-right">
                  <span class="px-1.5 py-0.5 bg-slate-900 text-white font-mono font-bold text-[9px] rounded">${escapeHtml(t.tagDocNo || 'FM-PC-RM-001')}</span>
                  <div class="text-[8px] text-slate-500 font-semibold mt-0.5">IATF 16949</div>
                </div>
              </div>
              <div class="text-center mt-1">
                <span class="text-[10px] font-black text-slate-900 uppercase tracking-wide">COIL IDENTIFICATION TAG</span>
              </div>
            </div>

            <div class="space-y-1.5 font-mono text-[11px] pt-1">
              <div class="flex justify-between items-center bg-slate-100 px-2 py-1 rounded">
                <span class="text-slate-500 font-sans text-[10px]">Coil Lot No:</span>
                <strong class="text-slate-900 text-xs">${escapeHtml(t.coilLotNo || '-')}</strong>
              </div>
              <div class="flex justify-between items-center px-1">
                <span class="text-slate-500 font-sans text-[10px]">Heat / Charge No:</span>
                <span class="text-indigo-800 font-bold">${escapeHtml(t.heatNo || '-')}</span>
              </div>
              <div class="flex justify-between items-center px-1">
                <span class="text-slate-500 font-sans text-[10px]">เกรด (Grade):</span>
                <strong class="text-slate-800">${escapeHtml(t.materialGrade || '-')}</strong>
              </div>
              <div class="flex justify-between items-center px-1">
                <span class="text-slate-500 font-sans text-[10px]">สเปกขนาด (Spec):</span>
                <strong class="text-slate-800">${escapeHtml(t.specDimension || '-')}</strong>
              </div>
              <div class="flex justify-between items-center px-1">
                <span class="text-slate-500 font-sans text-[10px]">น้ำหนักสุทธิ:</span>
                <strong class="text-slate-900 font-bold">${Number(t.totalWeightKg || t.remainingWeightKg || 0).toLocaleString()} กก.</strong>
              </div>
              <div class="flex justify-between items-center px-1">
                <span class="text-slate-500 font-sans text-[10px]">ผู้ผลิต / คู่ค้า:</span>
                <span class="text-slate-700 text-[10px] font-sans truncate max-w-[170px]">${escapeHtml(t.supplierName || '-')}</span>
              </div>
              <div class="flex justify-between items-center px-1">
                <span class="text-slate-500 font-sans text-[10px]">วันที่รับเข้า:</span>
                <span class="text-slate-700 text-[10px]">${escapeHtml(t.receivedDate || '-')}</span>
              </div>
              <div class="flex justify-between items-center bg-slate-100 px-2 py-1 rounded">
                <span class="text-slate-500 font-sans text-[10px]">พิกัดจัดเก็บ / สถานะ:</span>
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-slate-800">${escapeHtml(t.location || 'ไม่ระบุ')}</span>
                  ${statusBadge}
                </div>
              </div>
            </div>
          `;
        } else {
          content.innerHTML = '<div class="text-center py-6 text-rose-500 text-xs">ไม่พบข้อมูลป้ายแท็กของม้วนนี้</div>';
        }
      } catch (err) {
        console.error('openMobilePcCoilTag error:', err);
        content.innerHTML = `<div class="text-center py-6 text-rose-500 text-xs">โหลดไม่สำเร็จ: ${err.message}</div>`;
      }
    }

    function closeMobilePcCoilTagModal() {
      const modal = document.getElementById('mobPcCoilTagModal');
      if (modal) modal.classList.add('hidden');
      mobilePcCurrentViewingTag = null;
    }

    function shareOrPrintMobilePcTag() {
      if (!mobilePcCurrentViewingTag) return;
      const t = mobilePcCurrentViewingTag;
      const text = `🏷️ MINAMIDA COIL TAG (${t.tagDocNo || 'FM-PC-RM-001'})\nCoil Lot: ${t.coilLotNo}\nHeat No: ${t.heatNo}\nGrade: ${t.materialGrade}\nSpec: ${t.specDimension}\nWeight: ${t.totalWeightKg} kg\nLocation: ${t.location || '-'}\nStatus: ${t.status}`;

      if (navigator.share) {
        navigator.share({
          title: `Coil Tag - ${t.coilLotNo}`,
          text: text
        }).catch(() => {});
      } else {
        window.print();
      }
    }

    // Expose PC functions to window
    window.initMobilePcCoilReceive = initMobilePcCoilReceive;
    window.handleMobilePcCoilTagCapture = handleMobilePcCoilTagCapture;
    window.handleMobilePcCoilSubmit = handleMobilePcCoilSubmit;
    window.initMobilePcCoilCheck = initMobilePcCoilCheck;
    window.loadMobilePcCoilStockList = loadMobilePcCoilStockList;
    window.setMobilePcCoilFilter = setMobilePcCoilFilter;
    window.filterMobilePcCoils = filterMobilePcCoils;
    window.handleMobilePcBarcodeScan = handleMobilePcBarcodeScan;
    window.openMobilePcCoilTag = openMobilePcCoilTag;
    window.closeMobilePcCoilTagModal = closeMobilePcCoilTagModal;
    window.shareOrPrintMobilePcTag = shareOrPrintMobilePcTag;

    // ==========================================
    // MOBILE DIES & TOOL TRIAL RECORD CONTROLLER (MMT-PD-FM-036)
    // ==========================================
    let mobilePdTrialMachinesCache = [];
    let mobilePdTrialProductsCache = [];
    let mobilePdTrialPhotos = { detail: '', trouble: '', cause: '', solution: '' };

    async function loadMobilePdTrialView() {
      // Set default trial date to today (local Thai date)
      const dateEl = document.getElementById('mobPdTrialDate');
      if (dateEl && !dateEl.value) {
        dateEl.value = new Date().toISOString().slice(0, 10);
      }

      // Reset form & photos
      const form = document.getElementById('mobPdTrialForm');
      if (form) form.reset();
      if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);

      mobilePdTrialPhotos = { detail: '', trouble: '', cause: '', solution: '' };
      ['detail', 'trouble', 'cause', 'solution'].forEach(k => {
        const box = document.getElementById(`mobPdPreviewBox${k.charAt(0).toUpperCase() + k.slice(1)}`);
        const img = document.getElementById(`mobPdPreview${k.charAt(0).toUpperCase() + k.slice(1)}`);
        const file = document.getElementById(`mobPdTrialPhotoFile${k.charAt(0).toUpperCase() + k.slice(1)}`);
        if (box) box.classList.add('hidden');
        if (img) img.src = '';
        if (file) file.value = '';
      });

      // Populate user info
      const user = (state && state.currentUser) || {};
      const empId = user.employeeCode || user.employeeId || user.empId || '';
      const fullName = user.fullName || user.name || '';
      const actionNameEl = document.getElementById('mobPdTrialActionByName');
      const actionEmpIdEl = document.getElementById('mobPdTrialActionByEmpId');
      if (actionNameEl && !actionNameEl.value) {
        actionNameEl.value = fullName ? `${fullName}${empId ? ' (' + empId + ')' : ''}` : '';
      }
      if (actionEmpIdEl) actionEmpIdEl.value = empId;

      // Reset gain badge & results
      calculateMobilePdTrialGain();
      handleMobilePdTrialResultChange('OK');

      // Fetch master machines & products
      try {
        const res = await jsonpRequest({
          action: 'getMobilePdTrialInitialData',
          empId: empId
        });
        if (res && (res.status === 'success' || res.success) && res.data) {
          mobilePdTrialMachinesCache = res.data.machines || [];
          mobilePdTrialProductsCache = res.data.products || [];

          const mBadge = document.getElementById('mobPdTrialMachineCountBadge');
          if (mBadge) mBadge.textContent = `${mobilePdTrialMachinesCache.length} เครื่อง`;
          const pBadge = document.getElementById('mobPdTrialPartCountBadge');
          if (pBadge) pBadge.textContent = `${mobilePdTrialProductsCache.length} รายการ`;
        }
      } catch (err) {
        console.warn('loadMobilePdTrialView initial data error:', err);
      }
    }

    function handleMobilePdTrialDeptChange(dept) {
      const typeSelect = document.getElementById('mobPdTrialType');
      if (typeSelect) {
        if (dept === 'FORGING' && typeSelect.value === 'Tool') typeSelect.value = 'Dies';
        else if (dept === 'PDM' && typeSelect.value === 'Dies') typeSelect.value = 'Tool';
      }
    }

    function filterMobilePdTrialParts(query) {
      const dropdown = document.getElementById('mobPdTrialPartDropdown');
      const clearBtn = document.getElementById('mobPdTrialPartClearBtn');
      const hiddenNo = document.getElementById('mobPdTrialPartNo');
      const hiddenName = document.getElementById('mobPdTrialPartName');
      if (!dropdown) return;

      const q = String(query || '').trim().toLowerCase();
      if (clearBtn) {
        if (q.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
      }

      if (hiddenNo) hiddenNo.value = '';
      if (hiddenName) hiddenName.value = '';

      if (!q) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
        return;
      }

      const filtered = mobilePdTrialProductsCache.filter(p => {
        const no = String(p.PartNo || '').toLowerCase();
        const name = String(p.PartName || '').toLowerCase();
        return no.includes(q) || name.includes(q);
      });

      if (filtered.length === 0) {
        dropdown.innerHTML = `
          <div class="p-2.5 text-center text-xs text-slate-400 italic">
            ไม่พบชิ้นงานในระบบ (ระบบจะใช้ "${escapeHtml(query)}" ตามที่คุณพิมพ์)
          </div>`;
        dropdown.classList.remove('hidden');
        return;
      }

      dropdown.innerHTML = filtered.slice(0, 25).map(p => {
        const safeNo = escapeHtml(p.PartNo || '');
        const safeName = escapeHtml(p.PartName || '');
        return `
          <div class="p-2.5 hover:bg-violet-50 transition cursor-pointer flex items-center justify-between"
               onclick="selectMobilePdTrialPart('${safeNo}', '${safeName}')">
            <div>
              <div class="font-bold text-xs text-slate-800 font-mono">${safeNo}</div>
              <div class="text-[11px] text-slate-500">${safeName}</div>
            </div>
            <span class="text-violet-600 text-xs font-bold">เลือก</span>
          </div>`;
      }).join('');

      dropdown.classList.remove('hidden');
    }

    function selectMobilePdTrialPart(partNo, partName) {
      const input = document.getElementById('mobPdTrialPartSearchInput');
      const hiddenNo = document.getElementById('mobPdTrialPartNo');
      const hiddenName = document.getElementById('mobPdTrialPartName');
      const dropdown = document.getElementById('mobPdTrialPartDropdown');
      const clearBtn = document.getElementById('mobPdTrialPartClearBtn');

      if (input) input.value = partName ? `${partNo} - ${partName}` : partNo;
      if (hiddenNo) hiddenNo.value = partNo;
      if (hiddenName) hiddenName.value = partName;
      if (clearBtn) clearBtn.classList.remove('hidden');
      if (dropdown) dropdown.classList.add('hidden');
    }

    function clearMobilePdTrialPartSelection() {
      const input = document.getElementById('mobPdTrialPartSearchInput');
      const hiddenNo = document.getElementById('mobPdTrialPartNo');
      const hiddenName = document.getElementById('mobPdTrialPartName');
      const dropdown = document.getElementById('mobPdTrialPartDropdown');
      const clearBtn = document.getElementById('mobPdTrialPartClearBtn');

      if (input) {
        input.value = '';
        input.focus();
      }
      if (hiddenNo) hiddenNo.value = '';
      if (hiddenName) hiddenName.value = '';
      if (clearBtn) clearBtn.classList.add('hidden');
      if (dropdown) dropdown.classList.add('hidden');
    }

    function filterMobilePdTrialMachines(query) {
      const dropdown = document.getElementById('mobPdTrialMachineDropdown');
      const clearBtn = document.getElementById('mobPdTrialMachineClearBtn');
      const hiddenNo = document.getElementById('mobPdTrialMachineNo');
      if (!dropdown) return;

      const q = String(query || '').trim().toLowerCase();
      if (clearBtn) {
        if (q.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
      }

      if (hiddenNo) hiddenNo.value = '';

      if (!q) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
        return;
      }

      const filtered = mobilePdTrialMachinesCache.filter(m => {
        const no = String(m.MachineNo || '').toLowerCase();
        const name = String(m.MachineName || '').toLowerCase();
        const div = String(m.Division || '').toLowerCase();
        return no.includes(q) || name.includes(q) || div.includes(q);
      });

      if (filtered.length === 0) {
        dropdown.innerHTML = `
          <div class="p-2.5 text-center text-xs text-slate-400 italic">
            ไม่พบเครื่องจักร (ระบบจะใช้ "${escapeHtml(query)}" ตามที่คุณพิมพ์)
          </div>`;
        dropdown.classList.remove('hidden');
        return;
      }

      dropdown.innerHTML = filtered.slice(0, 25).map(m => {
        const isForging = String(m.Division || '').toLowerCase().includes('forg') || String(m.MachineNo || '').toLowerCase().includes('forg');
        const badgeColor = isForging ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800';
        const badgeText = isForging ? 'Forging' : 'Machining';
        const safeNo = escapeHtml(m.MachineNo || '');
        const safeName = escapeHtml(m.MachineName || '');
        const deptKey = isForging ? 'FORGING' : 'PDM';

        return `
          <div class="p-2.5 hover:bg-violet-50 transition cursor-pointer flex items-center justify-between"
               onclick="selectMobilePdTrialMachine('${safeNo}', '${deptKey}')">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full ${isForging ? 'bg-orange-500' : 'bg-blue-500'} shrink-0"></span>
              <span class="font-bold text-xs text-slate-800 font-mono">${safeNo}</span>
              ${safeName ? `<span class="text-xs text-slate-500">${safeName}</span>` : ''}
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}">${badgeText}</span>
          </div>`;
      }).join('');

      dropdown.classList.remove('hidden');
    }

    function selectMobilePdTrialMachine(machineNo, dept) {
      const input = document.getElementById('mobPdTrialMachineSearchInput');
      const hiddenNo = document.getElementById('mobPdTrialMachineNo');
      const deptSelect = document.getElementById('mobPdTrialDepartment');
      const dropdown = document.getElementById('mobPdTrialMachineDropdown');
      const clearBtn = document.getElementById('mobPdTrialMachineClearBtn');

      if (input) input.value = machineNo;
      if (hiddenNo) hiddenNo.value = machineNo;
      if (deptSelect && dept) {
        deptSelect.value = dept;
        handleMobilePdTrialDeptChange(dept);
      }
      if (clearBtn) clearBtn.classList.remove('hidden');
      if (dropdown) dropdown.classList.add('hidden');
    }

    function clearMobilePdTrialMachineSelection() {
      const input = document.getElementById('mobPdTrialMachineSearchInput');
      const hiddenNo = document.getElementById('mobPdTrialMachineNo');
      const dropdown = document.getElementById('mobPdTrialMachineDropdown');
      const clearBtn = document.getElementById('mobPdTrialMachineClearBtn');

      if (input) {
        input.value = '';
        input.focus();
      }
      if (hiddenNo) hiddenNo.value = '';
      if (clearBtn) clearBtn.classList.add('hidden');
      if (dropdown) dropdown.classList.add('hidden');
    }

    async function handleMobilePdTrialPhotoSelect(input, slotKey) {
      const file = input && input.files && input.files[0];
      if (!file) return;

      try {
        const compressedBase64 = await compressPdMobileImage(file);
        mobilePdTrialPhotos[slotKey] = compressedBase64;

        const capitalizedKey = slotKey.charAt(0).toUpperCase() + slotKey.slice(1);
        const box = document.getElementById(`mobPdPreviewBox${capitalizedKey}`);
        const img = document.getElementById(`mobPdPreview${capitalizedKey}`);
        if (img) img.src = compressedBase64;
        if (box) box.classList.remove('hidden');
      } catch (err) {
        console.error('Trial image compression error:', err);
        showToast('บีบอัดรูปภาพล้มเหลว กรุณาลองใหม่อีกครั้ง', 'error');
      }
    }

    function removeMobilePdTrialPhoto(slotKey) {
      mobilePdTrialPhotos[slotKey] = '';
      const capitalizedKey = slotKey.charAt(0).toUpperCase() + slotKey.slice(1);
      const box = document.getElementById(`mobPdPreviewBox${capitalizedKey}`);
      const img = document.getElementById(`mobPdPreview${capitalizedKey}`);
      const file = document.getElementById(`mobPdTrialPhotoFile${capitalizedKey}`);
      if (box) box.classList.add('hidden');
      if (img) img.src = '';
      if (file) file.value = '';
    }

    function calculateMobilePdTrialGain() {
      const beforeEl = document.getElementById('mobPdTrialLifeBefore');
      const afterEl = document.getElementById('mobPdTrialLifeAfter');
      const badge = document.getElementById('mobPdTrialGainBadge');
      if (!badge) return;

      const b = parseFloat(beforeEl ? beforeEl.value : '0');
      const a = parseFloat(afterEl ? afterEl.value : '0');

      if (b > 0 && a > 0) {
        const diff = a - b;
        const pct = (diff / b) * 100;
        const sign = pct >= 0 ? '+' : '';
        badge.textContent = `Gain: ${sign}${pct.toFixed(1)}%`;
        badge.className = pct >= 0
          ? 'text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800'
          : 'text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-800';
      } else {
        badge.textContent = 'Gain: 0.0%';
        badge.className = 'text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700';
      }
    }

    function handleMobilePdTrialResultChange(val) {
      const okBox = document.getElementById('mobPdTrialOkDrawingBox');
      const ngBox = document.getElementById('mobPdTrialNgReasonBox');
      const otherBox = document.getElementById('mobPdTrialOtherReasonBox');

      if (val === 'OK') {
        if (okBox) okBox.classList.remove('hidden');
        if (ngBox) ngBox.classList.add('hidden');
        if (otherBox) otherBox.classList.add('hidden');
      } else if (val === 'NG') {
        if (okBox) okBox.classList.add('hidden');
        if (ngBox) ngBox.classList.remove('hidden');
        if (otherBox) otherBox.classList.add('hidden');
      } else {
        if (okBox) okBox.classList.add('hidden');
        if (ngBox) ngBox.classList.add('hidden');
        if (otherBox) otherBox.classList.remove('hidden');
      }
    }

    async function handleMobilePdTrialSubmit(e) {
      e.preventDefault();

      // Read Part
      const partSearchInput = document.getElementById('mobPdTrialPartSearchInput');
      const partHiddenNo = document.getElementById('mobPdTrialPartNo');
      const partHiddenName = document.getElementById('mobPdTrialPartName');
      let partNoVal = (partHiddenNo && partHiddenNo.value.trim().toUpperCase()) || '';
      let partNameVal = (partHiddenName && partHiddenName.value.trim()) || '';
      if (!partNoVal && partSearchInput && partSearchInput.value.trim()) {
        const raw = partSearchInput.value.trim();
        if (raw.includes(' - ')) {
          const parts = raw.split(' - ');
          partNoVal = parts[0].trim().toUpperCase();
          partNameVal = parts.slice(1).join(' - ').trim();
        } else {
          partNoVal = raw.toUpperCase();
        }
      }

      // Read Machine
      const machSearchInput = document.getElementById('mobPdTrialMachineSearchInput');
      const machHiddenNo = document.getElementById('mobPdTrialMachineNo');
      let machNoVal = (machHiddenNo && machHiddenNo.value.trim().toUpperCase()) || '';
      if (!machNoVal && machSearchInput && machSearchInput.value.trim()) {
        machNoVal = machSearchInput.value.trim().toUpperCase();
      }

      const detailDesc = (document.getElementById('mobPdTrialDetailDesc')?.value || '').trim();
      const solutionDesc = (document.getElementById('mobPdTrialSolutionDesc')?.value || '').trim();

      if (!partNoVal) {
        showToast('กรุณาระบุรหัสหรือชื่อชิ้นงาน (Part No)', 'warning');
        if (partSearchInput) partSearchInput.focus();
        return;
      }
      if (!machNoVal) {
        showToast('กรุณาระบุเครื่องจักร (Machine No)', 'warning');
        if (machSearchInput) machSearchInput.focus();
        return;
      }
      if (!detailDesc) {
        showToast('กรุณาระบุรายละเอียดการทดลอง/จุดปรับปรุง', 'warning');
        document.getElementById('mobPdTrialDetailDesc')?.focus();
        return;
      }
      if (!solutionDesc) {
        showToast('กรุณาระบุแนวทางแก้ไขหรือข้อสรุป', 'warning');
        document.getElementById('mobPdTrialSolutionDesc')?.focus();
        return;
      }

      const user = (state && state.currentUser) || {};
      const callerEmpId = user.employeeCode || user.employeeId || user.empId || '';

      const resultRadio = document.querySelector('input[name="mobPdTrialResult"]:checked');
      const resultStatus = resultRadio ? resultRadio.value : 'OK';

      const payload = {
        TrialDate: document.getElementById('mobPdTrialDate')?.value || '',
        Department: document.getElementById('mobPdTrialDepartment')?.value || 'FORGING',
        TrialType: document.getElementById('mobPdTrialType')?.value || 'Tool',
        TrialTime: document.getElementById('mobPdTrialTime')?.value || '1',
        PartNo: partNoVal,
        PartName: partNameVal,
        MachineNo: machNoVal,
        LotNo: (document.getElementById('mobPdTrialLotNo')?.value || '').trim(),
        ImplementationPhase: (document.getElementById('mobPdTrialPhase')?.value || '').trim(),
        ActionByEmpId: document.getElementById('mobPdTrialActionByEmpId')?.value || callerEmpId,
        ActionByName: (document.getElementById('mobPdTrialActionByName')?.value || '').trim() || (user.fullName || user.name || ''),

        DetailDesc: detailDesc,
        DetailPhotoBase64: mobilePdTrialPhotos.detail || '',

        TroubleDesc: (document.getElementById('mobPdTrialTroubleDesc')?.value || '').trim(),
        TroublePhotoBase64: mobilePdTrialPhotos.trouble || '',

        CauseDesc: (document.getElementById('mobPdTrialCauseDesc')?.value || '').trim(),
        CausePhotoBase64: mobilePdTrialPhotos.cause || '',

        SolutionDesc: solutionDesc,
        SolutionPhotoBase64: mobilePdTrialPhotos.solution || '',

        ToolLifeBefore: document.getElementById('mobPdTrialLifeBefore')?.value || '',
        ToolLifeAfter: document.getElementById('mobPdTrialLifeAfter')?.value || '',

        ResultStatus: resultStatus,
        DrawingBy: (document.getElementById('mobPdTrialDrawingBy')?.value || '').trim(),
        DrawingDate: document.getElementById('mobPdTrialDrawingDate')?.value || '',
        NgReason: (document.getElementById('mobPdTrialNgReason')?.value || '').trim(),
        OtherReason: (document.getElementById('mobPdTrialOtherReason')?.value || '').trim(),
        Remarks: (document.getElementById('mobPdTrialRemarks')?.value || '').trim()
      };

      const btnSubmit = document.getElementById('mobPdTrialSubmitBtn');
      const originalText = btnSubmit ? btnSubmit.innerHTML : '';
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span>⏳ กำลังบันทึกและอัปโหลดรูป...</span>';
      }

      try {
        const res = await jsonpRequest({
          action: 'submitMobilePdTrialRecord',
          payload: payload,
          empId: callerEmpId
        });

        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = originalText;
        }

        if (res && (res.status === 'success' || res.success)) {
          const trialNo = res.trialNo || (res.data && res.data.TrialNo) || '';
          showToast(`บันทึกข้อมูลการทดลอง ${trialNo} สำเร็จเรียบร้อย`, 'success');
          openView('dashboard');
        } else {
          showToast(`บันทึกไม่สำเร็จ: ${(res && res.message) || 'เกิดข้อผิดพลาด'}`, 'error');
        }
      } catch (err) {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = originalText;
        }
        console.error('Submit Mobile Trial Record error:', err);
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
      }
    }

    // Auto-close trial search dropdowns on outside click
    document.addEventListener('click', function(e) {
      const partDrop = document.getElementById('mobPdTrialPartDropdown');
      const partInput = document.getElementById('mobPdTrialPartSearchInput');
      if (partDrop && !partDrop.classList.contains('hidden')) {
        if (!partDrop.contains(e.target) && e.target !== partInput) {
          partDrop.classList.add('hidden');
        }
      }
      const machDrop = document.getElementById('mobPdTrialMachineDropdown');
      const machInput = document.getElementById('mobPdTrialMachineSearchInput');
      if (machDrop && !machDrop.classList.contains('hidden')) {
        if (!machDrop.contains(e.target) && e.target !== machInput) {
          machDrop.classList.add('hidden');
        }
      }
    });

    window.loadMobilePdTrialView = loadMobilePdTrialView;
    window.handleMobilePdTrialDeptChange = handleMobilePdTrialDeptChange;
    window.filterMobilePdTrialParts = filterMobilePdTrialParts;
    window.selectMobilePdTrialPart = selectMobilePdTrialPart;
    window.clearMobilePdTrialPartSelection = clearMobilePdTrialPartSelection;
    window.filterMobilePdTrialMachines = filterMobilePdTrialMachines;
    window.selectMobilePdTrialMachine = selectMobilePdTrialMachine;
    window.clearMobilePdTrialMachineSelection = clearMobilePdTrialMachineSelection;
    window.handleMobilePdTrialPhotoSelect = handleMobilePdTrialPhotoSelect;
    window.removeMobilePdTrialPhoto = removeMobilePdTrialPhoto;
    window.calculateMobilePdTrialGain = calculateMobilePdTrialGain;
    window.handleMobilePdTrialResultChange = handleMobilePdTrialResultChange;
    window.handleMobilePdTrialSubmit = handleMobilePdTrialSubmit;

    // ==========================================
    // Run on Page Load
    // ==========================================
    window.addEventListener('DOMContentLoaded', initApp);
