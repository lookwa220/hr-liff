// ============================================================================
// MINAMIDA MOBILE LIFF — MNW MAINTENANCE & ISO KAIZEN
// ============================================================================
    // ==========================================
    // MNW Work Order Request Logic (Supervisor Only)
    // ==========================================
    let currentMnwPhotoBase64 = '';
    function handleMnwPhotoSelected(e) {
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
          currentMnwPhotoBase64 = canvas.toDataURL('image/jpeg', 0.7);

          document.getElementById('mnwPhotoPreview').src = currentMnwPhotoBase64;
          document.getElementById('mnwPhotoPreviewContainer').classList.remove('hidden');
          document.getElementById('mnwPhotoName').innerText = file.name;
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }

    function clearMnwPhoto() {
      currentMnwPhotoBase64 = '';
      const inp = document.getElementById('mnwPhotoFile');
      if (inp) inp.value = '';
      const prev = document.getElementById('mnwPhotoPreviewContainer');
      if (prev) prev.classList.add('hidden');
      const name = document.getElementById('mnwPhotoName');
      if (name) name.innerText = 'ยังไม่ได้เลือกรูป';
    }

    async function submitMobileMnw(e) {
      e.preventDefault();
      const title = document.getElementById('mnwTitle').value.trim();
      const area = document.getElementById('mnwArea').value.trim();
      const dueDate = document.getElementById('mnwDueDate') ? document.getElementById('mnwDueDate').value : '';
      const nature = document.getElementById('mnwNature').value;
      const detail = document.getElementById('mnwDetail').value.trim();
      const btn = document.getElementById('btnSubmitMnw');

      if (!title || !area) {
        showToast('กรุณากรอกเรื่องและพื้นที่/เครื่องจักร', 'error');
        return;
      }

      btn.disabled = true;
      btn.innerText = 'กำลังส่งใบแจ้งซ่อม...';

      try {
        const payload = {
          action: 'submitMobileMnwOrder',
          title: title,
          area: area,
          estDueDate: dueDate,
          natureOfWork: nature,
          detail: detail,
          requesterId: state.currentUser ? state.currentUser.employeeCode : '',
          requesterName: state.currentUser ? state.currentUser.fullName : '',
          department: state.currentUser ? state.currentUser.department : '',
          supervisorId: (state.currentUser && state.currentUser.isSupervisor) ? state.currentUser.employeeCode : '',
          base64Image: currentMnwPhotoBase64,
          imageFileName: currentMnwPhotoBase64 ? `repair_${Date.now()}.jpg` : ''
        };

        const res = await postApiRequest(payload);

        if (res && (res.success || res.status === 'success')) {
          showToast('ยื่นแบบฟอร์มแจ้งซ่อมเรียบร้อยแล้ว!');
          document.getElementById('mnwTitle').value = '';
          document.getElementById('mnwArea').value = '';
          if (document.getElementById('mnwDueDate')) document.getElementById('mnwDueDate').value = '';
          document.getElementById('mnwDetail').value = '';
          clearMnwPhoto();
          closeCurrentView();
        } else {
          showToast(res.error || res.message || 'ส่งใบแจ้งซ่อมไม่สำเร็จ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = 'ส่งใบแจ้งซ่อมบำรุง';
      }
    }

    // ==========================================
    // MNW Workbench & Handover Logic (MNW Department)
    // ==========================================
    let cachedMnwOrders = [];
    let currentMnwFilter = 'ALL';
    let activeHandoverOrderNo = null;

    async function loadMobileMnwOrders() {
      const container = document.getElementById('mnwOrdersList');
      if (!container) return;
      container.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">กำลังโหลดรายการงานซ่อม...</p>';

      try {
        const res = await jsonpRequest({ action: 'getMobileMnwOrders' });
        const orders = (res && res.data) ? res.data : [];
        cachedMnwOrders = orders;
        renderFilteredMnwOrders();
      } catch (err) {
        container.innerHTML = '<p class="text-xs text-red-500 text-center py-4">โหลดข้อมูลไม่สำเร็จ: ' + err.message + '</p>';
      }
    }

    function filterMnwOrders(type) {
      currentMnwFilter = type;
      ['tabMnwAll', 'tabMnwActive', 'tabMnwHandover', 'tabMnwDone'].forEach(id => {
        const tab = document.getElementById(id);
        if (!tab) return;
        tab.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:bg-white flex-shrink-0';
      });

      if (type === 'ALL') document.getElementById('tabMnwAll').className = 'px-3 py-1.5 rounded-lg bg-white text-slate-800 shadow-sm flex-shrink-0 font-bold';
      if (type === 'ACTIVE') document.getElementById('tabMnwActive').className = 'px-3 py-1.5 rounded-lg bg-white text-slate-800 shadow-sm flex-shrink-0 font-bold';
      if (type === 'HANDOVER') document.getElementById('tabMnwHandover').className = 'px-3 py-1.5 rounded-lg bg-white text-slate-800 shadow-sm flex-shrink-0 font-bold';
      if (type === 'DONE') document.getElementById('tabMnwDone').className = 'px-3 py-1.5 rounded-lg bg-white text-slate-800 shadow-sm flex-shrink-0 font-bold';

      renderFilteredMnwOrders();
    }

    function renderFilteredMnwOrders() {
      const container = document.getElementById('mnwOrdersList');
      if (!container) return;

      let list = cachedMnwOrders;
      if (currentMnwFilter === 'ACTIVE') {
        list = list.filter(o => ['PENDING_SUPERVISOR', 'PENDING_MNW', 'IN_PROGRESS', 'PENDING_DEPT_MANAGER', 'PENDING_FACTORY_MANAGER'].includes(String(o.Status)));
      } else if (currentMnwFilter === 'HANDOVER') {
        list = list.filter(o => ['READY_FOR_HANDOVER', 'PENDING_HANDOVER', 'IN_PROGRESS'].includes(String(o.Status)));
      } else if (currentMnwFilter === 'DONE') {
        list = list.filter(o => ['COMPLETED', 'HANDED_OVER'].includes(String(o.Status)));
      }

      if (list.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">ไม่มีรายการงานซ่อมในหมวดนี้</p>';
        return;
      }

      container.innerHTML = list.map(o => {
        const st = String(o.Status || 'PENDING');
        let badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
        if (st === 'COMPLETED' || st === 'HANDED_OVER') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
        if (st === 'READY_FOR_HANDOVER') badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
        if (st === 'IN_PROGRESS') badgeColor = 'bg-purple-100 text-purple-800 border-purple-300';

        const photoUrl = o.AttachmentUrl || '';
        let thumbs = [];
        try { thumbs = JSON.parse(o.AttachmentThumbnails || '[]'); } catch (e) { thumbs = []; }
        const thumbUrl = thumbs[0] || photoUrl;
        const estCostNum = parseFloat(o.EstCost) || 0;

        return `
          <div class="glass-card p-3.5 rounded-2xl border border-slate-200 text-left space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800">${o.OrderNo}</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full border ${badgeColor} font-semibold">${st}</span>
            </div>
            <div class="flex gap-2.5">
              ${thumbUrl ? `
                <div class="flex-shrink-0 cursor-pointer" onclick="openMnwImagePreview('${photoUrl || thumbUrl}', '${o.OrderNo}: ${o.Title || ''}')">
                  <img src="${thumbUrl}" class="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-2xs hover:opacity-90 transition" alt="Thumbnail">
                  <span class="text-[9px] text-blue-600 block text-center mt-0.5 font-medium">🔍 ขยาย</span>
                </div>
              ` : ''}
              <div class="flex-1 space-y-0.5">
                <h4 class="text-xs font-bold text-slate-800 leading-snug">${o.Title || 'งานแจ้งซ่อม'}</h4>
                <p class="text-[11px] text-slate-500">จุดติดตั้ง: <b class="text-slate-700">${o.Area || '-'}</b> | แผนก: ${o.Department || '-'}</p>
                ${o.EstDueDate ? `<p class="text-[10px] text-slate-500">กำหนดเสร็จ: <b>${formatCleanDate(o.EstDueDate)}</b></p>` : ''}
                ${estCostNum > 0 ? `<p class="text-[10px] text-amber-700 font-bold">งบประมาณประเมิน: ฿${estCostNum.toLocaleString()}</p>` : ''}
                ${o.Detail ? `<p class="text-[10px] text-slate-400 mt-1 line-clamp-2">${o.Detail}</p>` : ''}
              </div>
            </div>

            <div class="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
              <span>ผู้แจ้ง: ${o.RequesterName || o.RequesterId}</span>
              <div class="flex space-x-1.5">
                ${st === 'PENDING_MNW' ? `
                  <button type="button" onclick="openMnwEstCostModal('${o.OrderNo}', '${encodeURIComponent(o.Title || '')}', ${estCostNum})" class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] shadow-xs flex items-center space-x-1">
                    <span>🛠️ รับงาน & ประเมินงบ</span>
                  </button>
                ` : ''}
                ${st === 'IN_PROGRESS' ? `
                  <button type="button" onclick="finishMnwRepairWork('${o.OrderNo}')" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[10px] shadow-xs flex items-center space-x-1">
                    <span>⚙️ ซ่อมเสร็จ / นัดตรวจรับ</span>
                  </button>
                ` : ''}
                ${['READY_FOR_HANDOVER', 'IN_PROGRESS'].includes(st) ? `
                  <button type="button" onclick="openMnwHandoverModal('${o.OrderNo}', '${encodeURIComponent(o.Title || '')}', '${encodeURIComponent(o.RequesterName || '')}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] shadow-xs flex items-center space-x-1">
                    <span>✍️ เซ็นส่งมอบงาน</span>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function initSignaturePad(canvasId) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0f172a';

      let isDrawing = false;
      let lastX = 0;
      let lastY = 0;

      function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
        };
      }

      function start(e) {
        isDrawing = true;
        const pos = getPos(e);
        lastX = pos.x;
        lastY = pos.y;
      }
      function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastX = pos.x;
        lastY = pos.y;
      }
      function stop() { isDrawing = false; }

      canvas.onmousedown = start;
      canvas.onmousemove = draw;
      window.addEventListener('mouseup', stop);

      canvas.ontouchstart = start;
      canvas.ontouchmove = draw;
      canvas.ontouchend = stop;
    }

    function clearSignatureCanvas(canvasId) {
      const canvas = document.getElementById(canvasId);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    function isCanvasBlank(canvas) {
      if (!canvas) return true;
      const blank = document.createElement('canvas');
      blank.width = canvas.width;
      blank.height = canvas.height;
      return canvas.toDataURL() === blank.toDataURL();
    }

    // --- Handover Photo Logic ---
    let currentMnwHandoverPhotoBase64 = '';
    function handleMnwHandoverPhotoSelected(e) {
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
          currentMnwHandoverPhotoBase64 = canvas.toDataURL('image/jpeg', 0.7);

          document.getElementById('mnwHandoverPhotoPreview').src = currentMnwHandoverPhotoBase64;
          document.getElementById('mnwHandoverPhotoPreviewContainer').classList.remove('hidden');
          document.getElementById('mnwHandoverPhotoName').innerText = file.name;
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }

    function clearMnwHandoverPhoto() {
      currentMnwHandoverPhotoBase64 = '';
      const inp = document.getElementById('mnwHandoverPhotoFile');
      if (inp) inp.value = '';
      const prev = document.getElementById('mnwHandoverPhotoPreviewContainer');
      if (prev) prev.classList.add('hidden');
      const name = document.getElementById('mnwHandoverPhotoName');
      if (name) name.innerText = 'ยังไม่ได้เลือกรูป';
    }

    function openMnwHandoverModal(orderNo, encodedTitle, encodedRequesterName) {
      activeHandoverOrderNo = orderNo;
      const title = decodeURIComponent(encodedTitle || '');
      const reqName = decodeURIComponent(encodedRequesterName || '');
      document.getElementById('handoverOrderInfo').innerText = `เอกสาร: ${orderNo} - ${title}`;
      clearMnwHandoverPhoto();
      document.getElementById('modalMnwHandover').classList.remove('hidden');

      // 1. ช่างผู้ส่งมอบ: ดึงชื่อเจ้าของโทรศัพท์เครื่องนี้ (ช่างที่กำลังดำเนินการส่งมอบงาน)
      document.getElementById('handoverTechName').value = state.currentUser ? (state.currentUser.fullName || '') : '';

      // 2. ผู้ตรวจรับมอบงานหน้างาน: ดึงชื่อผู้แจ้งซ่อมจากใบงาน (สามารถพิมพ์แก้ไขได้หากมีผู้รับมอบแทน)
      const targetOrder = (cachedMnwOrders || []).find(o => String(o.OrderNo).trim() === String(orderNo).trim());
      document.getElementById('handoverRecName').value = reqName || (targetOrder && targetOrder.RequesterName) || '';

      initSignaturePad('canvasTechSig');
      initSignaturePad('canvasRecSig');
      clearSignatureCanvas('canvasTechSig');
      clearSignatureCanvas('canvasRecSig');
    }

    function closeMnwHandoverModal() {
      document.getElementById('modalMnwHandover').classList.add('hidden');
      clearMnwHandoverPhoto();
      activeHandoverOrderNo = null;
    }

    async function submitMnwHandoverSignatures() {
      if (!activeHandoverOrderNo) return;
      const canvasTech = document.getElementById('canvasTechSig');
      const canvasRec = document.getElementById('canvasRecSig');
      const techName = document.getElementById('handoverTechName').value.trim();
      const recName = document.getElementById('handoverRecName').value.trim();
      const notes = document.getElementById('handoverNotes').value.trim();
      const btn = document.getElementById('btnSubmitHandover');

      if (isCanvasBlank(canvasTech)) {
        showToast('กรุณาลงลายเซ็นช่างผู้ส่งมอบ', 'error');
        return;
      }
      if (isCanvasBlank(canvasRec)) {
        showToast('กรุณาลงลายเซ็นผู้ตรวจรับมอบงานหน้างาน', 'error');
        return;
      }
      if (!techName || !recName) {
        showToast('กรุณาระบุชื่อช่างและชื่อผู้รับมอบงาน', 'error');
        return;
      }

      btn.disabled = true;
      btn.innerText = 'กำลังบันทึกลายเซ็นและรูปส่งมอบ...';

      try {
        const payload = {
          action: 'submitMobileMnwHandover',
          orderNo: activeHandoverOrderNo,
          technicianSignatureBase64: canvasTech.toDataURL('image/png'),
          receiverSignatureBase64: canvasRec.toDataURL('image/png'),
          technicianName: techName,
          receiverName: recName,
          handoverNotes: notes,
          handoverImageBase64: currentMnwHandoverPhotoBase64
        };

        const res = await postApiRequest(payload);

        if (res && (res.success || res.status === 'success')) {
          showToast('บันทึกการส่งมอบงานเรียบร้อยแล้ว!');
          closeMnwHandoverModal();
          loadMobileMnwOrders();
        } else {
          showToast(res.error || res.message || 'บันทึกการส่งมอบไม่สำเร็จ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = 'บันทึกการส่งมอบและลายเซ็น';
      }
    }

    // --- MNW Estimate Cost Modal & Actions ---
    let activeEstCostOrderNo = null;
    function openMnwEstCostModal(orderNo, encodedTitle, currentCost) {
      activeEstCostOrderNo = orderNo;
      const title = decodeURIComponent(encodedTitle || '');
      document.getElementById('estCostOrderInfo').innerText = `เอกสาร: ${orderNo} - ${title}`;
      document.getElementById('mnwEstCostInput').value = currentCost || '';
      document.getElementById('mnwEstCostComment').value = '';
      document.getElementById('modalMnwEstCost').classList.remove('hidden');
    }

    function closeMnwEstCostModal() {
      document.getElementById('modalMnwEstCost').classList.add('hidden');
      activeEstCostOrderNo = null;
    }

    async function submitMnwEstCost() {
      if (!activeEstCostOrderNo) return;
      const costInput = document.getElementById('mnwEstCostInput').value;
      const comment = document.getElementById('mnwEstCostComment').value.trim();
      const cost = parseFloat(costInput) || 0;
      const btn = document.getElementById('btnSubmitEstCost');

      btn.disabled = true;
      btn.innerText = 'กำลังบันทึก...';

      try {
        const payload = {
          action: 'processMobileMnwApproval',
          orderNo: activeEstCostOrderNo,
          approvalAction: 'APPROVE',
          estCost: cost,
          approverCode: state.currentUser ? state.currentUser.employeeCode : '',
          approverName: state.currentUser ? state.currentUser.fullName : '',
          comment: comment || `ช่าง MNW ประเมินงบ ${cost.toLocaleString()} บาท`
        };

        const res = await postApiRequest(payload);
        if (res && (res.success || res.status === 'success')) {
          showToast(res.message || 'บันทึกการรับงานและประเมินงบเรียบร้อยแล้ว!');
          closeMnwEstCostModal();
          loadMobileMnwOrders();
        } else {
          showToast(res.error || res.message || 'บันทึกไม่สำเร็จ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = 'ยืนยันรับงาน';
      }
    }

    async function finishMnwRepairWork(orderNo) {
      if (!confirm(`ยืนยันว่าการซ่อมงานเลขที่ ${orderNo} ดำเนินการเสร็จแล้ว พร้อมตรวจรับส่งมอบงานหรือไม่?`)) return;

      try {
        const payload = {
          action: 'processMobileMnwApproval',
          orderNo: orderNo,
          approvalAction: 'APPROVE',
          approverCode: state.currentUser ? state.currentUser.employeeCode : '',
          approverName: state.currentUser ? state.currentUser.fullName : '',
          comment: 'ช่างซ่อมปฏิบัติงานเสร็จสิ้น พร้อมตรวจรับส่งมอบงาน'
        };

        const res = await postApiRequest(payload);
        if (res && (res.success || res.status === 'success')) {
          showToast('บันทึกสถานะพร้อมส่งมอบงานเรียบร้อยแล้ว!');
          loadMobileMnwOrders();
        } else {
          showToast(res.error || res.message || 'บันทึกไม่สำเร็จ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      }
    }

    // --- MNW Image Preview Modal ---
    function openMnwImagePreview(imgUrl, caption) {
      if (!imgUrl) return;
      const img = document.getElementById('mnwFullPreviewImg');
      const cap = document.getElementById('mnwFullPreviewCaption');
      img.src = imgUrl;
      cap.innerText = caption || 'ภาพถ่ายหน้างาน';
      document.getElementById('modalMnwImagePreview').classList.remove('hidden');
    }

    function closeMnwImagePreview() {
      document.getElementById('modalMnwImagePreview').classList.add('hidden');
    }

    // ==========================================
    // MNW ROUTINE WORK (LINE LIFF MOBILE LOGIC)
    // ==========================================
    let mobileMnwRoutineTasks = [];
    let currentMobileRoutineFilter = 'ALL';
    let currentFinishRoutinePhotoBase64 = '';
    let currentFinishRoutinePhotoFileName = '';

    async function loadMobileMnwRoutine(forceReload = false) {
      const container = document.getElementById('mobileMnwRoutineContainer');
      if (container && mobileMnwRoutineTasks.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">กำลังโหลดข้อมูลตารางงาน...</p>';
      }

      try {
        const res = await jsonpRequest({ action: 'getMobileMnwRoutineTasks' });
        if (res && (res.status === 'success' || res.success)) {
          mobileMnwRoutineTasks = res.tasks || [];
          renderMobileMnwRoutineList();
        } else {
          showToast(res ? (res.message || res.error) : 'โหลดข้อมูลตารางงานล้มเหลว', 'error');
        }
      } catch (err) {
        console.error('Error loading mobile MNW routine tasks:', err);
        // Fallback to postApiRequest if jsonp fails
        try {
          const res = await postApiRequest({ action: 'getMobileMnwRoutineTasks' });
          if (res && (res.status === 'success' || res.success)) {
            mobileMnwRoutineTasks = res.tasks || [];
            renderMobileMnwRoutineList();
            return;
          }
        } catch (e2) {}
        if (container) {
          container.innerHTML = '<p class="text-xs text-red-500 text-center py-6">เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message + '</p>';
        }
      }
    }

    function filterMobileMnwRoutine(filterType) {
      currentMobileRoutineFilter = filterType;
      document.querySelectorAll('.mob-routine-filter-btn').forEach(btn => {
        btn.className = 'mob-routine-filter-btn flex-1 py-1.5 px-2.5 rounded-lg text-center text-slate-500 hover:text-slate-800 whitespace-nowrap';
      });
      const idMap = {
        ALL: 'mobFilterRoutineAll',
        MINE: 'mobFilterRoutineMine',
        ROUTINE: 'mobFilterRoutineRoutine',
        EXTRA: 'mobFilterRoutineExtra'
      };
      const activeBtn = document.getElementById(idMap[filterType]);
      if (activeBtn) {
        activeBtn.className = 'mob-routine-filter-btn flex-1 py-1.5 px-2.5 rounded-lg text-center bg-white text-purple-700 shadow-xs whitespace-nowrap';
      }
      renderMobileMnwRoutineList();
    }

    function renderMobileMnwRoutineList() {
      const container = document.getElementById('mobileMnwRoutineContainer');
      if (!container) return;

      const esc = function(str) {
        return String(str || '').replace(/[&<>"']/g, function(m) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
      };

      const myEmpId = state.currentUser ? (state.currentUser.employeeId || state.currentUser.employeeCode || '') : '';
      // On Mobile: Only show tasks that are active (PENDING or IN_PROGRESS), strictly hide COMPLETED tasks
      const activeTasks = (mobileMnwRoutineTasks || []).filter(t => String(t.IsActive).toUpperCase() !== 'FALSE' && t.Status !== 'COMPLETED');

      // Update counters
      const pendingCount = activeTasks.filter(t => !t.Status || t.Status === 'PENDING').length;
      const progressCount = activeTasks.filter(t => t.Status === 'IN_PROGRESS').length;
      const totalActiveCount = activeTasks.length;

      const pCountEl = document.getElementById('mobRoutinePendingCount');
      const prCountEl = document.getElementById('mobRoutineProgressCount');
      const totCountEl = document.getElementById('mobRoutineTotalActiveCount');
      if (pCountEl) pCountEl.innerText = pendingCount;
      if (prCountEl) prCountEl.innerText = progressCount;
      if (totCountEl) totCountEl.innerText = totalActiveCount;

      let list = activeTasks;
      if (currentMobileRoutineFilter === 'MINE') {
        list = activeTasks.filter(t => (t.AssignedEmpId === myEmpId) || (t.ActiveWorkerId === myEmpId));
      } else if (currentMobileRoutineFilter === 'ROUTINE') {
        list = activeTasks.filter(t => (t.Type || 'ROUTINE') === 'ROUTINE');
      } else if (currentMobileRoutineFilter === 'EXTRA') {
        list = activeTasks.filter(t => t.Type === 'EXTRA');
      }

      if (list.length === 0) {
        if (totalActiveCount === 0) {
          container.innerHTML = `
            <div class="p-6 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <span class="text-3xl">🎉</span>
              <h4 class="font-bold text-slate-800 text-sm">ยอดเยี่ยมมาก!</h4>
              <p class="text-xs text-slate-500 leading-relaxed">ขณะนี้ไม่มีรายการงานที่ต้องทำในรอบนี้ (งานทุกรายการได้รับการปฏิบัติเสร็จสิ้นเรียบร้อยแล้ว)</p>
            </div>
          `;
        } else {
          container.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">ไม่มีรายการงานที่ต้องทำในหมวดนี้</p>';
        }
        return;
      }

      container.innerHTML = list.map(t => {
        const isRoutine = (t.Type || 'ROUTINE') === 'ROUTINE';
        const typeBadge = isRoutine
          ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">งานประจำ</span>'
          : '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">งานเสริม</span>';

        const isMine = myEmpId && (t.AssignedEmpId === myEmpId);
        const assignedBadge = t.AssignedEmpName
          ? `<span class="text-[11px] text-slate-600">👤 ผู้รับผิดชอบ: <strong class="${isMine ? 'text-purple-700' : 'text-slate-800'}">${esc(t.AssignedEmpName)}</strong>${isMine ? ' (คุณ)' : ''}</span>`
          : '<span class="text-[11px] text-slate-400 italic">👤 ใครก็ได้ในทีม MNW</span>';

        let statusSection = '';
        let actionButtons = '';

        if (!t.Status || t.Status === 'PENDING') {
          statusSection = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">รอเริ่มงาน</span>';
          actionButtons = `
            <button type="button" onclick="startMobileRoutineTask('${t.TaskId}')"
              class="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 active:scale-95">
              <span>⏱️ เริ่มงาน</span>
            </button>
          `;
        } else if (t.Status === 'IN_PROGRESS') {
          statusSection = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">กำลังทำ</span>';
          actionButtons = `
            <div class="space-y-2">
              <div class="p-2 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-tight">
                <div class="font-bold flex items-center gap-1">
                  <span>👷 ช่าง: ${esc(t.ActiveWorkerName || t.ActiveWorkerId || '')}</span>
                </div>
                <div class="text-[10px] text-amber-700 mt-0.5">เริ่มเมื่อ: ${esc(t.StartedAt || '')}</div>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" onclick="cancelMobileRoutineTask('${t.TaskId}')"
                  class="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition active:scale-95">
                  <span>↩️ ยกเลิก</span>
                </button>
                <button type="button" onclick="openFinishMobileRoutineModal('${t.TaskId}')"
                  class="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs active:scale-95 flex items-center justify-center gap-1">
                  <span>✅ เสร็จสิ้น</span>
                </button>
              </div>
            </div>
          `;
        } else if (t.Status === 'COMPLETED') {
          statusSection = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">เสร็จสิ้น</span>';
          const photoThumb = t.FinishPhotoUrl
            ? `<div class="mt-1 cursor-pointer" onclick="openMnwImagePreview('${t.FinishPhotoUrl}', '${esc(t.Title)}')">
                 <img src="${t.FinishPhotoUrl}" class="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-2xs" alt="Finish Photo">
                 <span class="text-[9px] text-purple-600 block mt-0.5">🔍 ดูรูปขยาย</span>
               </div>`
            : '';
          actionButtons = `
            <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div><b>ผู้ปฏิบัติงาน:</b> ${esc(t.ActiveWorkerName || t.ActiveWorkerId || '')}</div>
              <div><b>เสร็จเมื่อ:</b> ${esc(t.FinishedAt || '')} (${esc(t.DurationHours || 0)} ชม.)</div>
              ${t.FinishNotes ? `<div class="text-slate-700"><b>ผลการตรวจ:</b> ${esc(t.FinishNotes)}</div>` : ''}
              ${photoThumb}
            </div>
          `;
        }

        return `
          <div class="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <div class="flex items-start justify-between gap-2">
              <div class="space-y-1 flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-mono font-bold text-purple-700 text-xs">${esc(t.TaskId)}</span>
                  ${typeBadge}
                </div>
                <h3 class="text-sm font-bold text-slate-800 leading-snug">${esc(t.Title)}</h3>
              </div>
              <div class="flex-shrink-0">${statusSection}</div>
            </div>
            <div>${assignedBadge}</div>
            <div class="pt-1">${actionButtons}</div>
          </div>
        `;
      }).join('');
    }

    async function startMobileRoutineTask(taskId) {
      if (!state.currentUser) {
        showToast('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
      }
      const myEmpId = state.currentUser.employeeId || state.currentUser.employeeCode || '';
      const myName = state.currentUser.fullName || myEmpId;

      try {
        const payload = {
          action: 'startMobileMnwRoutineTask',
          taskId: taskId,
          workerEmpId: myEmpId,
          workerName: myName
        };
        const res = await postApiRequest(payload);
        if (res && (res.status === 'success' || res.success)) {
          showToast(res.message || 'บันทึกเวลาเริ่มงานแล้ว', 'success');
          loadMobileMnwRoutine(true);
        } else {
          showToast(res ? (res.message || res.error) : 'บันทึกเริ่มงานล้มเหลว', 'error');
        }
      } catch (err) {
        console.error('Error starting routine task:', err);
        showToast('เกิดข้อผิดพลาดในการเริ่มงาน: ' + err.message, 'error');
      }
    }

    async function cancelMobileRoutineTask(taskId) {
      if (!confirm('คุณต้องการยกเลิกการเริ่มงานและย้อนกลับสู่สถานะรอเริ่มงานใช่หรือไม่?')) return;

      try {
        const payload = {
          action: 'cancelMobileMnwRoutineTask',
          taskId: taskId
        };
        const res = await postApiRequest(payload);
        if (res && (res.status === 'success' || res.success)) {
          showToast(res.message || 'ยกเลิกการเริ่มงานแล้ว', 'success');
          loadMobileMnwRoutine(true);
        } else {
          showToast(res ? (res.message || res.error) : 'ยกเลิกล้มเหลว', 'error');
        }
      } catch (err) {
        console.error('Error canceling routine task:', err);
        showToast('เกิดข้อผิดพลาดในการยกเลิก: ' + err.message, 'error');
      }
    }

    function openFinishMobileRoutineModal(taskId) {
      const task = (mobileMnwRoutineTasks || []).find(t => t.TaskId === taskId);
      if (!task) return;

      document.getElementById('finishRoutineTaskId').value = task.TaskId;
      const titleEl = document.getElementById('finishRoutineTaskTitle');
      if (titleEl) titleEl.innerText = `${task.TaskId}: ${task.Title}`;

      document.getElementById('finishRoutineNotes').value = '';
      clearFinishRoutinePhoto();

      const modal = document.getElementById('modalFinishMnwRoutine');
      if (modal) modal.classList.remove('hidden');
    }

    function closeFinishMobileRoutineModal() {
      const modal = document.getElementById('modalFinishMnwRoutine');
      if (modal) modal.classList.add('hidden');
    }

    function handleFinishRoutinePhotoSelect(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      currentFinishRoutinePhotoFileName = file.name || 'routine_photo.jpg';

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
          currentFinishRoutinePhotoBase64 = canvas.toDataURL('image/jpeg', 0.7);

          const previewEl = document.getElementById('finishRoutinePhotoPreview');
          const previewBox = document.getElementById('finishRoutinePhotoPreviewBox');
          if (previewEl) previewEl.src = currentFinishRoutinePhotoBase64;
          if (previewBox) previewBox.classList.remove('hidden');
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }

    function clearFinishRoutinePhoto() {
      currentFinishRoutinePhotoBase64 = '';
      currentFinishRoutinePhotoFileName = '';
      const input = document.getElementById('finishRoutinePhotoInput');
      if (input) input.value = '';
      const previewBox = document.getElementById('finishRoutinePhotoPreviewBox');
      if (previewBox) previewBox.classList.add('hidden');
    }

    async function submitFinishMobileRoutine() {
      const taskId = document.getElementById('finishRoutineTaskId')?.value;
      const notes = (document.getElementById('finishRoutineNotes')?.value || '').trim();

      if (!taskId) {
        showToast('ไม่พบรหัสงาน', 'error');
        return;
      }
      if (!notes) {
        showToast('กรุณากรอกรายละเอียดผลการปฏิบัติงานอย่างน้อย 1 บรรทัด', 'warning');
        return;
      }

      const myEmpId = state.currentUser ? (state.currentUser.employeeId || state.currentUser.employeeCode || '') : '';
      const myName = state.currentUser ? (state.currentUser.fullName || myEmpId) : '';

      const btn = document.getElementById('btnSubmitFinishRoutine');
      if (btn) {
        btn.disabled = true;
        btn.innerText = 'กำลังบันทึก...';
      }

      try {
        const payload = {
          action: 'finishMobileMnwRoutineTask',
          taskId: taskId,
          workerEmpId: myEmpId,
          workerName: myName,
          finishNotes: notes,
          finishPhotoBase64: currentFinishRoutinePhotoBase64,
          finishPhotoFileName: currentFinishRoutinePhotoFileName
        };

        const res = await postApiRequest(payload);
        if (btn) {
          btn.disabled = false;
          btn.innerText = 'ยืนยันจบงาน';
        }

        if (res && (res.status === 'success' || res.success)) {
          showToast(res.message || 'บันทึกเสร็จสิ้นงานเรียบร้อยแล้ว', 'success');
          closeFinishMobileRoutineModal();
          loadMobileMnwRoutine(true);
        } else {
          showToast(res ? (res.message || res.error) : 'บันทึกล้มเหลว', 'error');
        }
      } catch (err) {
        if (btn) {
          btn.disabled = false;
          btn.innerText = 'ยืนยันจบงาน';
        }
        console.error('Error finishing routine task:', err);
        showToast('เกิดข้อผิดพลาดในการบันทึกจบงาน: ' + err.message, 'error');
      }
    }



    // ==========================================
    // 9. Kaizen Proposal & Multiple Photo Handling (Up to 4 Photos)
    // ==========================================
    let mobileKaizenBeforePhotos = []; // Array of Base64 strings (max 4)
    let mobileKaizenAfterPhotos = [];  // Array of Base64 strings (max 4)
    let currentMobileKaizenTeam = [];

    function toggleMobileKaizenGroup(isGroup) {
      const box = document.getElementById('mobKzTeamBox');
      if (box) {
        box.classList.toggle('hidden', !isGroup);
      }
    }
    window.toggleMobileKaizenGroup = toggleMobileKaizenGroup;

    function addMobileKaizenMember() {
      const input = document.getElementById('mobKzMemberInput');
      if (!input) return;
      const code = String(input.value || '').trim().toUpperCase();
      if (!code) {
        showToast('กรุณาระบุรหัสพนักงาน', 'warning');
        return;
      }
      if (currentMobileKaizenTeam.length >= 10) {
        showToast('ระบุสมาชิกได้สูงสุด 10 คน', 'warning');
        return;
      }
      if (currentMobileKaizenTeam.some(m => (m.code || '').toUpperCase() === code)) {
        showToast('รหัสพนักงานนี้มีอยู่ในรายชื่อแล้ว', 'warning');
        return;
      }
      currentMobileKaizenTeam.push({ code: code, name: code });
      input.value = '';
      renderMobileKaizenMembers();
    }
    window.addMobileKaizenMember = addMobileKaizenMember;

    function removeMobileKaizenMember(idx) {
      currentMobileKaizenTeam.splice(idx, 1);
      renderMobileKaizenMembers();
    }
    window.removeMobileKaizenMember = removeMobileKaizenMember;

    function renderMobileKaizenMembers() {
      const container = document.getElementById('mobKzMemberList');
      if (!container) return;
      if (currentMobileKaizenTeam.length === 0) {
        container.innerHTML = '<span class="text-[10px] text-slate-400 italic">ยังไม่มีสมาชิกร่วม (ถ้าไม่เพิ่มจะนับผู้ยื่นคนเดียว)</span>';
        return;
      }
      container.innerHTML = currentMobileKaizenTeam.map((m, idx) => `
        <div class="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200 text-xs">
          <span class="font-mono font-bold text-slate-700">${idx + 1}. ${m.code || m.name}</span>
          <button type="button" onclick="removeMobileKaizenMember(${idx})" class="text-rose-500 hover:text-rose-700 px-1 font-bold text-sm leading-none">&times;</button>
        </div>
      `).join('');
    }
    window.renderMobileKaizenMembers = renderMobileKaizenMembers;

    function toggleMobileKaizenCalc() {
      const panel = document.getElementById('mobKzCalcPanel');
      const btn = document.getElementById('mobKzCalcToggleBtn');
      if (!panel) return;
      const isHidden = panel.classList.contains('hidden');
      panel.classList.toggle('hidden', !isHidden);
      if (btn) {
        btn.innerHTML = isHidden ? '<span>✖ ปิดตัวช่วยคำนวณ</span>' : '<span>✨ เปิดตัวช่วยคำนวณ</span>';
      }
      if (isHidden) {
        runMobileKaizenCalc();
      }
    }
    window.toggleMobileKaizenCalc = toggleMobileKaizenCalc;

    function runMobileKaizenCalc() {
      const checkSafety = document.getElementById('mobKzCalcCheckSafety')?.checked || false;
      const checkGross = document.getElementById('mobKzCalcCheckGross')?.checked || false;
      const checkProd = document.getElementById('mobKzCalcCheckProd')?.checked || false;
      const checkSteps = document.getElementById('mobKzCalcCheckSteps')?.checked || false;

      const grossBox = document.getElementById('mobKzCalcGrossBox');
      const prodBox = document.getElementById('mobKzCalcProdBox');
      const stepsBox = document.getElementById('mobKzCalcStepsBox');

      if (grossBox) grossBox.classList.toggle('hidden', !checkGross);
      if (prodBox) prodBox.classList.toggle('hidden', !checkProd);
      if (stepsBox) stepsBox.classList.toggle('hidden', !checkSteps);

      let qtyVal = parseFloat(document.getElementById('mobKzCalcQty')?.value) || 0;
      const qtyUnit = document.getElementById('mobKzCalcQtyUnit')?.value || 'MONTH';
      const monthlyQty = qtyUnit === 'YEAR' ? (qtyVal / 12) : qtyVal;

      const investCost = parseFloat(document.getElementById('mobKzCalcInvest')?.value) || 0;

      // 1. Gross Profit
      let grossSavingsMonthly = 0;
      if (checkGross) {
        const costBefore = parseFloat(document.getElementById('mobKzCalcGrossBefore')?.value) || 0;
        const costAfter = parseFloat(document.getElementById('mobKzCalcGrossAfter')?.value) || 0;
        const unitDiff = Math.max(0, costBefore - costAfter);
        grossSavingsMonthly = unitDiff * monthlyQty;
      }

      // 2. Productivity (210 THB/hr)
      let prodSavingsMonthly = 0;
      if (checkProd) {
        const secBefore = parseFloat(document.getElementById('mobKzCalcProdBefore')?.value) || 0;
        const secAfter = parseFloat(document.getElementById('mobKzCalcProdAfter')?.value) || 0;
        const secDiff = Math.max(0, secBefore - secAfter);
        prodSavingsMonthly = (secDiff / 3600) * 210 * monthlyQty;
      }

      // 3. ลดก้าวเดิน (0.05 THB/step)
      let stepsSavingsMonthly = 0;
      if (checkSteps) {
        const stepsPerDay = parseFloat(document.getElementById('mobKzCalcStepsVal')?.value) || 0;
        const daysPerMonth = parseFloat(document.getElementById('mobKzCalcDaysPerMonth')?.value) || 26;
        stepsSavingsMonthly = stepsPerDay * daysPerMonth * 0.05;
      }

      // Sync into main form inputs
      const grossEl = document.getElementById('mobKzGross');
      const prodEl = document.getElementById('mobKzProd');
      const stepEl = document.getElementById('mobKzSteps');
      const investEl = document.getElementById('mobKzInvest');
      const safetyEl = document.getElementById('mobKzSafety');

      if (grossEl) grossEl.value = Math.round(grossSavingsMonthly);
      if (prodEl) prodEl.value = Math.round(prodSavingsMonthly);
      if (stepEl) stepEl.value = Math.round(stepsSavingsMonthly);
      if (investEl) investEl.value = Math.round(investCost);
      if (safetyEl) safetyEl.checked = checkSafety;

      calcMobileKaizenSavings();
    }
    window.runMobileKaizenCalc = runMobileKaizenCalc;

    function applyMobileKaizenCalcValues() {
      runMobileKaizenCalc();

      const checkSafety = document.getElementById('mobKzCalcCheckSafety')?.checked || false;
      const checkGross = document.getElementById('mobKzCalcCheckGross')?.checked || false;
      const checkProd = document.getElementById('mobKzCalcCheckProd')?.checked || false;
      const checkSteps = document.getElementById('mobKzCalcCheckSteps')?.checked || false;

      let qtyVal = parseFloat(document.getElementById('mobKzCalcQty')?.value) || 0;
      const qtyUnit = document.getElementById('mobKzCalcQtyUnit')?.value || 'MONTH';
      const monthlyQty = qtyUnit === 'YEAR' ? (qtyVal / 12) : qtyVal;
      const unitLabel = qtyUnit === 'YEAR' ? `${qtyVal.toLocaleString()} ชิ้น/ปี (เฉลี่ย ${Math.round(monthlyQty).toLocaleString()} ชิ้น/ด.)` : `${qtyVal.toLocaleString()} ชิ้น/เดือน`;

      const investCost = parseFloat(document.getElementById('mobKzCalcInvest')?.value) || 0;
      const lifespan = parseFloat(document.getElementById('mobKzCalcLifespan')?.value) || 36;
      const monthlyInvestDeprec = lifespan > 0 ? (investCost / lifespan) : 0;

      const lines = [];
      lines.push(`\n[รายละเอียดการคำนวณผลประโยชน์ / ที่มาตัวเลข]`);
      lines.push(`• ปริมาณการผลิต: ${unitLabel}`);
      if (investCost > 0) {
        lines.push(`• เงินลงทุน: ฿${investCost.toLocaleString()} (ตัดค่าเสื่อม ${lifespan} ด. = ฿${Math.round(monthlyInvestDeprec).toLocaleString()}/ด.)`);
      }

      if (checkGross) {
        const costBefore = parseFloat(document.getElementById('mobKzCalcGrossBefore')?.value) || 0;
        const costAfter = parseFloat(document.getElementById('mobKzCalcGrossAfter')?.value) || 0;
        const diff = Math.max(0, costBefore - costAfter);
        const totalG = Math.round(diff * monthlyQty);
        lines.push(`• Gross Profit: (ก่อน ฿${costBefore} - หลัง ฿${costAfter}) = ลดได้ ฿${diff.toFixed(2)}/ชิ้น × ปริมาณงาน = ฿${totalG.toLocaleString()}/ด.`);
      }

      if (checkProd) {
        const secBefore = parseFloat(document.getElementById('mobKzCalcProdBefore')?.value) || 0;
        const secAfter = parseFloat(document.getElementById('mobKzCalcProdAfter')?.value) || 0;
        const secDiff = Math.max(0, secBefore - secAfter);
        const totalP = Math.round((secDiff / 3600) * 210 * monthlyQty);
        lines.push(`• Productivity: (ก่อน ${secBefore}s - หลัง ${secAfter}s) = ลดได้ ${secDiff}s (ค่าแรง ฿210/ชม.) × ปริมาณงาน = ฿${totalP.toLocaleString()}/ด.`);
      }

      if (checkSteps) {
        const stepsPerDay = parseFloat(document.getElementById('mobKzCalcStepsVal')?.value) || 0;
        const days = parseFloat(document.getElementById('mobKzCalcDaysPerMonth')?.value) || 26;
        const totalS = Math.round(stepsPerDay * days * 0.05);
        lines.push(`• ลดก้าวเดิน: ลดได้ ${stepsPerDay.toLocaleString()} ก้าว/วัน × ${days} วัน × ฿0.05 = ฿${totalS.toLocaleString()}/ด.`);
      }

      if (checkSafety) {
        lines.push(`• ด้าน 5ส / ความปลอดภัย: สอดคล้องเกณฑ์ประเมินความปลอดภัย (การันตีรางวัล ฿75)`);
      }

      const dispSavings = document.getElementById('mobKzTotalSavingsText')?.innerText || '';
      const dispAward = document.getElementById('mobKzAwardText')?.innerText || '';
      lines.push(`• สรุปผลประโยชน์สุทธิ: ${dispSavings} (เงินรางวัลคำนวณได้: ${dispAward})`);

      const calcSummaryText = lines.join('\n');

      const effectEl = document.getElementById('mobKzEffect');
      if (effectEl) {
        let currentText = effectEl.value.trim();
        const marker = '[รายละเอียดการคำนวณผลประโยชน์ / ที่มาตัวเลข]';
        if (currentText.includes(marker)) {
          currentText = currentText.split(marker)[0].trim();
        }
        effectEl.value = currentText ? `${currentText}\n${calcSummaryText}` : calcSummaryText.trim();
      }

      toggleMobileKaizenCalc();
      showToast('นำผลลัพธ์และรายละเอียดที่มาตัวเลขลงช่องผลที่ได้รับแล้ว', 'success');
    }
    window.applyMobileKaizenCalcValues = applyMobileKaizenCalcValues;

    function initMobileKaizenForm() {
      const form = document.getElementById('mobileKaizenForm');
      if (form) form.reset();
      mobileKaizenBeforePhotos = [];
      mobileKaizenAfterPhotos = [];
      currentMobileKaizenTeam = [];
      renderMobileKaizenPhotoPreviews('before');
      renderMobileKaizenPhotoPreviews('after');
      renderMobileKaizenMembers();
      const teamBox = document.getElementById('mobKzTeamBox');
      if (teamBox) teamBox.classList.add('hidden');
      const indRadio = document.querySelector('input[name="mobKzType"][value="INDIVIDUAL"]');
      if (indRadio) indRadio.checked = true;
      const calcPanel = document.getElementById('mobKzCalcPanel');
      if (calcPanel) calcPanel.classList.add('hidden');
      const calcBtn = document.getElementById('mobKzCalcToggleBtn');
      if (calcBtn) calcBtn.innerHTML = '<span>✨ เปิดตัวช่วยคำนวณ</span>';
      calcMobileKaizenSavings();
    }

    function calcMobileKaizenSavings() {
      const gross = parseFloat(document.getElementById('mobKzGross')?.value) || 0;
      const prod = parseFloat(document.getElementById('mobKzProd')?.value) || 0;
      const steps = parseFloat(document.getElementById('mobKzSteps')?.value) || 0;
      const invest = parseFloat(document.getElementById('mobKzInvest')?.value) || 0;
      const isSafety = document.getElementById('mobKzSafety')?.checked || false;

      const monthlyDeprec = invest > 0 ? (invest / 36) : 0;
      const totalGross = gross + prod + steps;
      const net = Math.max(0, Math.round(totalGross - monthlyDeprec));

      let award = 75;
      if (totalGross > 0) {
        award = Math.min(Math.max(Math.round(net * 0.20), 75), 15000);
      } else if (isSafety) {
        award = 75;
      }

      const elTotal = document.getElementById('mobKzTotalSavingsText');
      if (elTotal) elTotal.innerText = '฿' + net.toLocaleString('th-TH') + ' / เดือน';

      const elAward = document.getElementById('mobKzAwardText');
      if (elAward) elAward.innerText = '฿' + award.toLocaleString('th-TH');
    }

    /**
     * บีบอัดรูปภาพผ่าน Canvas พร้อมรองรับเลือกหลายรูป (สูงสุด 4 รูปต่อฝั่ง)
     * บีบอัดด้านยาวไม่เกิน 1200px คุณภาพ JPEG 0.75 เพื่อให้ไฟล์ไม่เกิน 200-300KB
     */
    async function handleMobileKaizenPhotoSelect(input, type) {
      const files = Array.from(input.files || []);
      if (!files.length) return;

      const targetList = (type === 'before') ? mobileKaizenBeforePhotos : mobileKaizenAfterPhotos;
      const remainingSlots = 4 - targetList.length;

      if (remainingSlots <= 0) {
        showToast('แนบรูปได้สูงสุด 4 รูปเท่านั้น', 'error');
        input.value = '';
        return;
      }

      const filesToProcess = files.slice(0, remainingSlots);
      if (files.length > remainingSlots) {
        showToast(`เลือกได้อีกเพียง ${remainingSlots} รูป (ระบบตัดรูปส่วนเกินออก)`, 'error');
      }

      for (const file of filesToProcess) {
        try {
          const base64 = await compressKaizenImage(file);
          if (targetList.length < 4) {
            targetList.push(base64);
          }
        } catch (err) {
          console.error('Image compression failed:', err);
          showToast('ไม่สามารถประมวลผลบางรูปภาพได้', 'error');
        }
      }

      input.value = ''; // Reset input to allow re-selection
      renderMobileKaizenPhotoPreviews(type);
    }

    function compressKaizenImage(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = new Image();
          img.onload = function() {
            const maxDim = 1200;
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

    function renderMobileKaizenPhotoPreviews(type) {
      const isBefore = (type === 'before');
      const list = isBefore ? mobileKaizenBeforePhotos : mobileKaizenAfterPhotos;
      const countEl = document.getElementById(isBefore ? 'mobKzBeforeCount' : 'mobKzAfterCount');
      const gridEl = document.getElementById(isBefore ? 'mobKzBeforePreviewGrid' : 'mobKzAfterPreviewGrid');

      if (countEl) {
        countEl.innerText = `${list.length}/4`;
        countEl.className = list.length >= 4 ? 'text-[10px] font-bold text-red-500' : 'text-[10px] font-bold text-slate-400';
      }

      if (!gridEl) return;
      gridEl.innerHTML = '';

      list.forEach((imgData, idx) => {
        const wrap = document.createElement('div');
        wrap.className = 'relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs group';

        const img = document.createElement('img');
        img.src = imgData;
        img.className = 'w-full h-full object-cover cursor-pointer';
        img.onclick = () => openMnwImagePreview(imgData, `${isBefore ? 'ก่อนทำ' : 'หลังทำ'} รูปที่ ${idx + 1}`);

        const btnRemove = document.createElement('button');
        btnRemove.type = 'button';
        btnRemove.innerHTML = '✕';
        btnRemove.className = 'absolute top-1 right-1 bg-red-600/80 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow';
        btnRemove.onclick = (e) => {
          e.stopPropagation();
          removeMobileKaizenPhoto(idx, type);
        };

        wrap.appendChild(img);
        wrap.appendChild(btnRemove);
        gridEl.appendChild(wrap);
      });
    }

    function removeMobileKaizenPhoto(index, type) {
      if (type === 'before') {
        mobileKaizenBeforePhotos.splice(index, 1);
        renderMobileKaizenPhotoPreviews('before');
      } else {
        mobileKaizenAfterPhotos.splice(index, 1);
        renderMobileKaizenPhotoPreviews('after');
      }
    }

    async function handleMobileKaizenSubmit(event) {
      event.preventDefault();
      if (!state.currentUser) {
        showToast('กรุณารอโหลดข้อมูลผู้ใช้ หรือลงทะเบียนก่อน', 'error');
        return;
      }

      const isGroup = document.querySelector('input[name="mobKzType"][value="GROUP"]')?.checked || false;
      const areaVal = document.getElementById('mobKzArea').value.trim();
      const effectVal = document.getElementById('mobKzEffect').value.trim();

      const btn = document.getElementById('btnSubmitMobileKaizen');
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ กำลังบันทึกข้อเสนอ Kaizen...</span>';

      try {
        const payload = {
          action: 'submitKaizen',
          requesterId: state.currentUser.employeeCode || state.currentUser.employeeId,
          requesterName: state.currentUser.fullName || state.currentUser.name,
          department: state.currentUser.department || 'PD-M',
          position: state.currentUser.position || '',
          proposalType: isGroup ? 'GROUP' : 'INDIVIDUAL',
          teamMembers: currentMobileKaizenTeam,
          teamMembersJson: JSON.stringify(currentMobileKaizenTeam),
          subject: document.getElementById('mobKzSubject').value.trim(),
          kaizenArea: areaVal,
          areaOrMachine: areaVal,
          beforeWhat: document.getElementById('mobKzBeforeWhat').value.trim(),
          afterHow: document.getElementById('mobKzAfterHow').value.trim(),
          effectDescription: effectVal,
          effectResult: effectVal,
          grossProfitSavings: parseFloat(document.getElementById('mobKzGross')?.value) || 0,
          productivitySavings: parseFloat(document.getElementById('mobKzProd')?.value) || 0,
          stepSavings: parseFloat(document.getElementById('mobKzSteps')?.value) || 0,
          investmentCost: parseFloat(document.getElementById('mobKzInvest')?.value) || 0,
          isSafety5S: document.getElementById('mobKzSafety')?.checked || false,
          beforePhotoUrls: mobileKaizenBeforePhotos,
          afterPhotoUrls: mobileKaizenAfterPhotos
        };

        const res = await postApiRequest(payload);

        if (res && (res.status === 'success' || res.success)) {
          showToast(`บันทึกข้อเสนอ Kaizen สำเร็จ! เลขที่: ${res.proposalNo || 'สำเร็จ'}`);
          initMobileKaizenForm();
          loadMobileKaizenHistory();
        } else {
          showToast((res && (res.message || res.error)) || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
        }
      } catch (err) {
        console.error('Kaizen submit error:', err);
        showToast('ส่งข้อมูลไม่สำเร็จ: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>ส่งข้อเสนอ Kaizen</span>';
      }
    }

    async function loadMobileKaizenHistory() {
      const container = document.getElementById('mobKaizenHistoryList');
      if (!container) return;

      const empId = state.currentUser ? (state.currentUser.employeeCode || state.currentUser.employeeId) : '';
      if (!empId) {
        container.innerHTML = '<p class="text-slate-400 text-center py-2">กรุณาเข้าสู่ระบบ</p>';
        return;
      }

      container.innerHTML = '<p class="text-slate-400 text-center py-2 animate-pulse">กำลังโหลดประวัติ...</p>';

      try {
        const res = await jsonpRequest({
          action: 'getKaizenHistory',
          empId: empId
        });

        const list = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
        if (!list || list.length === 0) {
          container.innerHTML = '<p class="text-slate-400 text-center py-3">ยังไม่มีประวัติการนำเสนอ Kaizen</p>';
          return;
        }

        let html = '';
        list.forEach(item => {
          const statusBadge = getKaizenStatusBadge(item.Status);
          const totalSav = (parseFloat(item.TotalSavingsAmount) || 0).toLocaleString('th-TH');
          const dateStr = item.CreatedDate ? String(item.CreatedDate).slice(0, 10) : '-';

          html += `
            <div class="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-800 text-xs">${item.ProposalNo || '-'}</span>
                ${statusBadge}
              </div>
              <p class="font-semibold text-slate-700 text-xs">${item.Subject || '-'}</p>
              <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                <span>📍 ${item.AreaOrMachine || '-'}</span>
                <span class="font-bold text-emerald-600">฿${totalSav} / ด.</span>
              </div>
              <div class="text-[10px] text-slate-400 flex justify-between items-center">
                <span>ยื่นเมื่อ: ${dateStr}</span>
                <span>${item.CurrentApproverRole || ''}</span>
              </div>
              ${item.RejectReason ? `<div class="p-1.5 bg-red-50 text-red-600 rounded text-[10px]">เหตุผลที่ปฏิเสธ: ${item.RejectReason}</div>` : ''}
            </div>
          `;
        });
        container.innerHTML = html;
      } catch (err) {
        console.error('loadMobileKaizenHistory error:', err);
        container.innerHTML = '<p class="text-red-500 text-center py-2">โหลดประวัติไม่สำเร็จ</p>';
      }
    }

    function getKaizenStatusBadge(status) {
      const s = String(status || '').toUpperCase();
      if (s === 'APPROVED' || s === 'FINAL_APPROVED') {
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">อนุมัติแล้ว</span>';
      }
      if (s === 'REJECTED') {
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">ส่งกลับแก้ไข</span>';
      }
      if (s === 'HELD') {
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">พักชั่วคราว</span>';
      }
      return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700">กำลังพิจารณา</span>';
    }

