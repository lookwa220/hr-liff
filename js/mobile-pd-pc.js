// ============================================================================
// MINAMIDA MOBILE LIFF — PC PARTS REQUEST & PD MACHINE REPAIRS
// ============================================================================
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
    let mobilePdRepairPhotos = {
      abnormal: '',
      cause: '',
      defect: '',
      repair: '',
      makerReport: ''
    };

    async function loadMobilePdRepairView() {
      // Set default start/end times
      const now = new Date();
      const nowStr = now.toISOString().slice(0, 16);
      const startEl = document.getElementById('mobPdStartTime');
      const endEl = document.getElementById('mobPdEndTime');
      if (startEl && !startEl.value) startEl.value = nowStr;
      if (endEl && !endEl.value) endEl.value = nowStr;

      // Load initial data (machines + spare parts)
      try {
        const res = await jsonpRequest({ action: 'getMobilePdInitialData', empId: state.currentUser ? state.currentUser.employeeCode : '' });
        if (res && res.status === 'success' && res.data) {
          mobilePdMachinesCache = res.data.machines || [];
          mobilePdSparePartsCache = res.data.spareParts || [];

          // Populate machines select
          const mSelect = document.getElementById('mobPdMachineSelect');
          if (mSelect) {
            let opts = '<option value="">-- เลือกเครื่องจักร (110 เครื่อง) --</option>';
            mobilePdMachinesCache.forEach(m => {
              opts += `<option value="${m.MachineNo}">${m.MachineNo} - ${m.MachineName} (${m.Location || m.Division || ''})</option>`;
            });
            mSelect.innerHTML = opts;
          }
        }
      } catch (err) {
        console.warn('loadMobilePdRepairView init error:', err);
      }
    }

    function handleMobilePdMachineChange() {
      const select = document.getElementById('mobPdMachineSelect');
      const customInput = document.getElementById('mobPdCustomMachineName');
      if (!select) return;
      const val = select.value;
      const matched = mobilePdMachinesCache.find(m => m.MachineNo === val);
      if (matched && customInput) {
        customInput.value = matched.MachineName;
      }
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

    // ==========================================
    // Run on Page Load
    // ==========================================
    window.addEventListener('DOMContentLoaded', initApp);
