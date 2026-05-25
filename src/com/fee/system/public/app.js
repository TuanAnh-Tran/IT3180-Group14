/**
 * FRONTEND CONTROLLER (app.js) - Tác vụ gọi REST API của Java Backend
 * Phụ trách kết nối UI, gửi yêu cầu fetch() lên Java Server và hiển thị nhật ký API
 */

// Biến trạng thái toàn cục
let selectedPeriodId = '';

// DOM Elements
const sidebarNavs = document.querySelectorAll('.nav-item');
const tabPanels = document.querySelectorAll('.tab-panel');
const pageTitleEl = document.getElementById('page-title');
const pageSubtitleEl = document.getElementById('page-subtitle');
const periodSelectEl = document.getElementById('active-period-select');

// Modals
const modalFee = document.getElementById('modal-fee');
const modalHousehold = document.getElementById('modal-household');
const modalBill = document.getElementById('modal-bill');

// Forms
const formFee = document.getElementById('form-fee');
const formHousehold = document.getElementById('form-household');
const formCreatePeriod = document.getElementById('form-create-period');
const formAssignOptionalFee = document.getElementById('form-assign-optional-fee');

// Code Explainer Elements
const codeSnippetBox = document.getElementById('code-snippet-box');
const codeActionLabel = document.getElementById('code-action-label');
const btnCopyCode = document.getElementById('btn-copy-code');

// Khởi động
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  // Lắng nghe Tab
  sidebarNavs.forEach(nav => {
    nav.addEventListener('click', () => {
      const clickedTab = nav.getAttribute('data-tab');
      switchTab(clickedTab);
    });
  });

  // Lắng nghe đổi đợt thu
  periodSelectEl.addEventListener('change', (e) => {
    selectedPeriodId = e.target.value;
    updateAllViews();
  });

  // Đóng modals
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllModals();
    });
  });

  // Gắn sự kiện CRUD
  document.getElementById('btn-open-add-fee-modal').addEventListener('click', () => {
    openFeeModal();
  });
  formFee.addEventListener('submit', handleFeeSubmit);

  document.getElementById('btn-open-add-household-modal').addEventListener('click', () => {
    openHouseholdModal();
  });
  formHousehold.addEventListener('submit', handleHouseholdSubmit);

  formCreatePeriod.addEventListener('submit', handleCreatePeriodSubmit);
  formAssignOptionalFee.addEventListener('submit', handleAssignOptionalFeeSubmit);

  btnCopyCode.addEventListener('click', copyEndpointToClipboard);

  // Tải dữ liệu ban đầu từ Java Server
  logAPICall('GET', '/api/periods', null, 'Đang tải danh sách các đợt thu phi...');
  await refreshPeriodSelect();
  await loadBuildingInfo();
  updateAllViews();
}

async function loadBuildingInfo() {
  try {
    const building = await apiCall('GET', '/api/building');
    
    // Cập nhật DOM
    const uiName = document.getElementById('ui-building-name');
    const uiYears = document.getElementById('ui-building-years');
    const uiDescription = document.getElementById('ui-building-description');
    const uiLocation = document.getElementById('ui-building-location');
    const uiArea = document.getElementById('ui-building-area');
    const uiStructure = document.getElementById('ui-building-structure');

    // Cập nhật thương hiệu sidebar hoặc tiêu đề trang phụ
    const brandTextEl = document.querySelector('.brand-text h1');
    if (brandTextEl) {
      brandTextEl.innerHTML = `${building.name || 'SmartFee'}`;
      brandTextEl.style.fontSize = '16px';
    }
  } catch (err) {
    console.error('Không thể nạp thông tin chung cư:', err);
  }
}

// --- HÀM GỌI API & GHI NHẬT KÝ ĐỂ HỌC TẬP ---
async function apiCall(method, url, body = null) {
  const options = { method };
  if (body) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  const startTime = performance.now();
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    const duration = Math.round(performance.now() - startTime);

    logAPICall(method, url, body, `Phản hồi từ Java Server (${duration}ms):\nHTTP Status: ${res.status}\nResponse JSON:\n${JSON.stringify(data, null, 2)}`);
    return data;
  } catch (err) {
    logAPICall(method, url, body, `LỖI KẾT NỐI SERVER JAVA:\n${err.message}`);
    showNotification('Lỗi kết nối tới máy chủ !');
    throw err;
  }
}

function logAPICall(method, url, requestBody, logDetails) {
  codeActionLabel.textContent = `${method} ${url}`;
  
  let codeText = `<span class="code-comment">// Khởi tạo HTTP Request gửi lên Java Web Server</span>\n`;
  codeText += `<span class="code-keyword">fetch</span>(<span class="code-string">"${url}"</span>, {\n`;
  codeText += `  method: <span class="code-string">"${method}"</span>,\n`;
  if (requestBody) {
    codeText += `  headers: { <span class="code-string">"Content-Type"</span>: <span class="code-string">"application/json"</span> },\n`;
    codeText += `  body: <span class="code-keyword">JSON</span>.<span class="code-function">stringify</span>(${JSON.stringify(requestBody, null, 2)})\n`;
  } else {
    codeText += `  body: <span class="code-keyword">null</span>\n`;
  }
  codeText += `});\n\n`;
  codeText += `<span class="code-comment">// ==========================================</span>\n`;
  codeText += `<span class="code-comment">// ${logDetails.replace(/\n/g, '\n// ')}</span>`;

  codeSnippetBox.innerHTML = codeText;
}

function copyEndpointToClipboard() {
  const text = codeActionLabel.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const originalText = btnCopyCode.innerHTML;
    btnCopyCode.innerHTML = 'Đã copy!';
    setTimeout(() => { btnCopyCode.innerHTML = originalText; }, 2000);
  });
}

// --- ROUTING TABS ---
function switchTab(tabId) {
  sidebarNavs.forEach(nav => {
    if (nav.getAttribute('data-tab') === tabId) nav.classList.add('active');
    else nav.classList.remove('active');
  });

  tabPanels.forEach(panel => {
    if (panel.id === `tab-${tabId}`) panel.classList.add('active');
    else panel.classList.remove('active');
  });

  const tabTitles = {
    dashboard: { title: 'Bảng Điều Khiển', subtitle: 'Thống kê tiến độ thu và dữ liệu hiện tại' },
    fees: { title: 'Quản Lý Khoản Thu', subtitle: 'Tạo, sửa và cấu hình các loại phí đóng góp' },
    periods: { title: 'Quản Lý Đợt Thu', subtitle: 'Tạo đợt thu tiền định kỳ và gán danh sách phí áp dụng' },
    households: { title: 'Danh Sách Hộ Dân & Hóa Đơn', subtitle: 'Quản lý căn hộ, đo lường tiêu dùng và thanh toán' }
  };

  pageTitleEl.textContent = tabTitles[tabId].title;
  pageSubtitleEl.textContent = tabTitles[tabId].subtitle;

  updateAllViews();
}

// --- ĐỒNG BỘ TOÀN BỘ GIAO DIỆN ---
function updateAllViews() {
  renderDashboardStats();
  renderFeesList();
  renderPeriodCheckboxes();
  renderPeriodsTable();
  renderHouseholdsTable();
}

// --- RENDER DỮ LIỆU ĐỘNG ---

// 1. Dashboard
async function renderDashboardStats() {
  if (!selectedPeriodId) return;
  const stats = await apiCall('GET', `/api/stats?periodId=${selectedPeriodId}`);
  
  document.getElementById('stat-total-expected').innerHTML = formatVND(stats.totalExpected);
  document.getElementById('stat-total-collected').innerHTML = formatVND(stats.totalCollected);
  document.getElementById('stat-total-remaining').innerHTML = formatVND(stats.totalRemaining);
  document.getElementById('stat-completion-rate').innerHTML = `${stats.completionRate}%`;
  document.getElementById('stat-progress-fill').style.width = `${stats.completionRate}%`;

  const badgeStatus = document.getElementById('badge-period-status');
  document.getElementById('summary-period-id').textContent = stats.periodId;
  document.getElementById('summary-period-assignments').textContent = `${stats.totalAssignments} lượt`;
  document.getElementById('summary-period-paid-count').textContent = `${stats.paidAssignments} lượt`;
}

// 2. Danh sách khoản thu
async function renderFeesList() {
  const fees = await apiCall('GET', '/api/fees');
  const tbody = document.getElementById('tbody-fees-list');
  tbody.innerHTML = '';

  if (fees.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary">Chưa có khoản thu nào. Hãy thêm khoản thu mới!</td></tr>';
    return;
  }

  fees.forEach(fee => {
    const tr = document.createElement('tr');
    const typeBadge = fee.type === 'COMPULSORY' 
      ? '<span class="badge bg-primary-light text-primary">Bắt buộc</span>' 
      : '<span class="badge bg-info-light text-info">Tự nguyện</span>';

    const calcMethods = { FIXED: 'Cố định', PER_MEMBER: 'Theo nhân khẩu', PER_AREA: 'Theo diện tích', CONSUMPTION: 'Số điện/nước' };
    const calcText = calcMethods[fee.calcMethod] || fee.calcMethod;

    let unitLabel = '';
    if (fee.calcMethod === 'PER_MEMBER') unitLabel = ' / người';
    else if (fee.calcMethod === 'PER_AREA') unitLabel = ' / m²';
    else if (fee.calcMethod === 'CONSUMPTION') unitLabel = ' / khối (m³)';

    tr.innerHTML = `
      <td><strong>${fee.id}</strong></td>
      <td>${fee.name}</td>
      <td>${typeBadge}</td>
      <td>${calcText}</td>
      <td><strong>${formatVND(fee.price)}</strong>${unitLabel}</td>
      <td class="text-right">
        <div class="btn-group">
          <button class="btn btn-secondary btn-xs btn-edit-fee" data-id="${fee.id}">Sửa</button>
          <button class="btn btn-danger btn-xs btn-delete-fee" data-id="${fee.id}">Xóa</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-delete-fee').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm(`Bạn có chắc chắn muốn xóa khoản thu "${id}"? Hành động này sẽ được Java xử lý cascade.`)) {
        await apiCall('DELETE', `/api/fees?id=${id}`);
        updateAllViews();
        showNotification('Đã xóa khoản thu!');
      }
    });
  });

  tbody.querySelectorAll('.btn-edit-fee').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openFeeModal(id);
    });
  });
}

// 3. Checkboxes cho đợt thu mới
async function renderPeriodCheckboxes() {
  const fees = await apiCall('GET', '/api/fees');
  const container = document.getElementById('period-fees-checkboxes');
  container.innerHTML = '';

  fees.forEach(fee => {
    const label = document.createElement('label');
    label.className = 'checkbox-item';
    const checked = fee.type === 'COMPULSORY' ? 'checked' : '';
    
    label.innerHTML = `
      <input type="checkbox" name="period-fees" value="${fee.id}" ${checked}>
      <span>${fee.name} ${fee.type === 'COMPULSORY' ? '<strong>(Bắt buộc)</strong>' : '(Tự nguyện)'}</span>
    `;
    container.appendChild(label);
  });
}

// 4. Bảng các đợt thu
async function renderPeriodsTable() {
  const periods = await apiCall('GET', '/api/periods');
  const tbody = document.getElementById('tbody-periods-list');
  tbody.innerHTML = '';

  if (periods.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary">Chưa có đợt thu nào.</td></tr>';
    return;
  }

  periods.forEach(p => {
    const tr = document.createElement('tr');
    const statusBadge = p.status === 'ACTIVE'
      ? '<span class="badge bg-success-light text-success">Đang hoạt động</span>'
      : '<span class="badge bg-danger-light text-danger">Đã đóng</span>';

    const feeCount = p.feeIds.length;
    const actionBtn = p.status === 'ACTIVE'
      ? `<button class="btn btn-danger btn-xs btn-close-period" data-id="${p.id}">Đóng Đợt Thu</button>`
      : `<span class="text-secondary" style="font-size: 11px;">Không có thao tác</span>`;

    tr.innerHTML = `
      <td><strong>${p.name}</strong><br><small class="text-secondary">Mã: ${p.id}</small></td>
      <td><span class="badge bg-primary-light text-primary">${feeCount} khoản phí áp dụng</span></td>
      <td>${statusBadge}</td>
      <td>${actionBtn}</td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-close-period').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Bạn có muốn ĐÓNG đợt thu này không?')) {
        await apiCall('POST', `/api/periods/close`, { id });
        updateAllViews();
        showNotification('Đã đóng đợt thu thành công!');
      }
    });
  });
}

// 5. Danh sách các hộ dân
async function renderHouseholdsTable() {
  if (!selectedPeriodId) {
    document.getElementById('tbody-households-list').innerHTML = '<tr><td colspan="9" class="text-center text-secondary">Vui lòng tạo đợt thu trước để quản lý hộ dân!</td></tr>';
    return;
  }
  
  const households = await apiCall('GET', `/api/households?periodId=${selectedPeriodId}`);
  const tbody = document.getElementById('tbody-households-list');
  tbody.innerHTML = '';

  document.getElementById('lbl-hh-period-name').textContent = 
    document.querySelector(`#active-period-select option[value="${selectedPeriodId}"]`)?.textContent || 'Không có';

  if (households.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-secondary">Chưa có hộ gia đình nào.</td></tr>';
    return;
  }

  households.forEach(hh => {
    const bill = hh.calculatedBill;
    let statusBadge = '';
    if (bill.items.length === 0) {
      statusBadge = '<span class="badge bg-secondary text-secondary" style="background-color: #f1f5f9; color: #64748b;">Không nợ phí</span>';
    } else if (bill.totalUnpaid === 0) {
      statusBadge = '<span class="badge bg-success-light text-success">Đã hoàn thành</span>';
    } else if (bill.totalPaid > 0 && bill.totalUnpaid > 0) {
      statusBadge = '<span class="badge bg-warning-light text-warning">Đang đóng dở dang</span>';
    } else {
      statusBadge = '<span class="badge bg-danger-light text-danger">Chưa đóng đồng nào</span>';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${hh.id}</strong></td>
      <td>${hh.ownerName}</td>
      <td>${hh.membersCount} người</td>
      <td>${hh.area} m²</td>
      <td><strong>${formatVND(bill.totalAmount)}</strong></td>
      <td class="text-success">${formatVND(bill.totalPaid)}</td>
      <td class="text-warning">${formatVND(bill.totalUnpaid)}</td>
      <td>${statusBadge}</td>
      <td class="text-center">
        <button class="btn btn-primary btn-xs btn-view-bill" data-id="${hh.id}">
          Xem Hóa Đơn & Gán
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-view-bill').forEach(btn => {
    btn.addEventListener('click', () => {
      const hhId = btn.getAttribute('data-id');
      openBillModal(hhId);
    });
  });
}

// --- ĐỒNG BỘ DROPDOWN ĐỢT THU ---
async function refreshPeriodSelect() {
  const periods = await apiCall('GET', '/api/periods');
  periodSelectEl.innerHTML = '';
  
  if (periods.length === 0) {
    periodSelectEl.innerHTML = '<option value="">(Chưa có đợt thu nào)</option>';
    selectedPeriodId = '';
    return;
  }
  
  periods.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    periodSelectEl.appendChild(opt);
  });

  if (!selectedPeriodId && periods.length > 0) {
    selectedPeriodId = periods[0].id;
  }
  periodSelectEl.value = selectedPeriodId;
}

// --- XỬ LÝ SUBMIT CỦA CÁC FORM ---

// Form Khoản Thu
async function handleFeeSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('fee-edit-id').value;
  const name = document.getElementById('fee-name').value;
  const type = document.getElementById('fee-type').value;
  const calcMethod = document.getElementById('fee-calc-method').value;
  const price = Number(document.getElementById('fee-price').value);

  if (id) {
    // Sửa
    await apiCall('PUT', `/api/fees`, { id, name, type, calcMethod, price });
    showNotification(`Đã sửa khoản thu "${name}" thành công!`);
  } else {
    // Tạo mới
    await apiCall('POST', `/api/fees`, { name, type, calcMethod, price });
    showNotification(`Đã tạo khoản thu "${name}" thành công!`);
  }

  closeAllModals();
  updateAllViews();
}

// Form Hộ Gia Đình
async function handleHouseholdSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('hh-id').value.trim().toUpperCase();
  const ownerName = document.getElementById('hh-owner').value.trim();
  const members = Number(document.getElementById('hh-members').value);
  const area = Number(document.getElementById('hh-area').value);
  const motorcycles = Number(document.getElementById('hh-motorcycles').value);
  const cars = Number(document.getElementById('hh-cars').value);

  try {
    const res = await apiCall('POST', `/api/households`, { 
      id, 
      ownerName, 
      membersCount: members, 
      area,
      motorcycleCount: motorcycles,
      carCount: cars
    });
    if (res.error) {
      alert(res.error);
      return;
    }
    showNotification(`Đã thêm hộ dân "${id} - ${ownerName}" thành công!`);
    closeAllModals();
    updateAllViews();
  } catch (err) {
    console.error(err);
  }
}

// Form Tạo Đợt Thu
async function handleCreatePeriodSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('period-new-name').value.trim();
  const checkboxes = document.querySelectorAll('input[name="period-fees"]:checked');
  const feeIds = Array.from(checkboxes).map(cb => cb.value);

  if (feeIds.length === 0) {
    alert('Vui lòng chọn ít nhất một khoản thu áp dụng cho đợt này!');
    return;
  }

  const newPeriod = await apiCall('POST', `/api/periods`, { name, feeIds });
  selectedPeriodId = newPeriod.id;
  
  document.getElementById('period-new-name').value = '';
  await refreshPeriodSelect();
  updateAllViews();
  showNotification(`Khởi tạo đợt thu "${name}" thành công!`);
}

// Form Gán/Đăng ký thêm khoản thu tự nguyện
async function handleAssignOptionalFeeSubmit(e) {
  e.preventDefault();
  
  const hhId = formAssignOptionalFee.getAttribute('data-hh-id');
  const feeId = document.getElementById('assign-fee-select').value;
  const quantity = Number(document.getElementById('assign-fee-qty').value);

  if (!feeId) {
    alert('Vui lòng chọn khoản thu để đăng ký.');
    return;
  }

  await apiCall('POST', `/api/assign`, { householdId: hhId, periodId: selectedPeriodId, feeId, quantity });
  showNotification('Đăng ký khoản thu tự nguyện thành công!');
  
  // Tải lại
  openBillModal(hhId);
  updateAllViews();
}

// --- MODALS DIALOGS CONTROLLER ---

function closeAllModals() {
  modalFee.classList.remove('active');
  modalHousehold.classList.remove('active');
  modalBill.classList.remove('active');
}

async function openFeeModal(feeId = null) {
  closeAllModals();
  formFee.reset();

  const titleEl = document.getElementById('modal-fee-title');
  const editIdField = document.getElementById('fee-edit-id');
  const calcSelect = document.getElementById('fee-calc-method');

  if (feeId) {
    titleEl.textContent = 'Chỉnh Sửa Khoản Thu';
    const fees = await apiCall('GET', '/api/fees');
    const fee = fees.find(f => f.id === feeId);
    if (fee) {
      editIdField.value = fee.id;
      document.getElementById('fee-name').value = fee.name;
      document.getElementById('fee-type').value = fee.type;
      document.getElementById('fee-calc-method').value = fee.calcMethod;
      document.getElementById('fee-price').value = fee.price;
      calcSelect.dispatchEvent(new Event('change'));
    }
  } else {
    titleEl.textContent = 'Tạo Khoản Thu Mới';
    editIdField.value = '';
    calcSelect.dispatchEvent(new Event('change'));
  }

  modalFee.classList.add('active');
}

function openHouseholdModal() {
  closeAllModals();
  formHousehold.reset();
  modalHousehold.classList.add('active');
}

// MỞ MODAL XEM HÓA ĐƠN CHI TIẾT (TÍNH TOÁN JAVA)
async function openBillModal(hhId) {
  closeAllModals();
  
  const bill = await apiCall('GET', `/api/bill?householdId=${hhId}&periodId=${selectedPeriodId}`);
  
  document.getElementById('bill-modal-title').textContent = `Chi Tiết Hóa Đơn Hộ ${bill.householdId}`;
  document.getElementById('bill-modal-subtitle').textContent = `Chủ hộ: ${bill.ownerName} | Quy mô: ${bill.membersCount} nhân khẩu | Diện tích: ${bill.area} m²`;

  formAssignOptionalFee.setAttribute('data-hh-id', hhId);

  const tbody = document.getElementById('tbody-bill-items');
  tbody.innerHTML = '';

  if (bill.items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary">Hộ gia đình này chưa được gán bất cứ khoản phí nào trong đợt này!</td></tr>';
  } else {
    bill.items.forEach(item => {
      const tr = document.createElement('tr');
      let formulaText = '';
      let qtyInputHtml = '';

      if (item.calcMethod === 'FIXED') {
        formulaText = 'Số tiền cố định';
        qtyInputHtml = `<span class="text-secondary">${item.quantity} phần</span>`;
      } else if (item.calcMethod === 'PER_MEMBER') {
        formulaText = `Nhân khẩu (${item.quantity} người) × Đơn giá`;
        qtyInputHtml = `<span class="text-secondary">${item.quantity} người</span>`;
      } else if (item.calcMethod === 'PER_AREA') {
        formulaText = `Diện tích (${item.quantity} m²) × Đơn giá`;
        qtyInputHtml = `<span class="text-secondary">${item.quantity} m²</span>`;
      } else if (item.calcMethod === 'CONSUMPTION') {
        formulaText = `Số khối m³ tiêu thụ × Đơn giá`;
        qtyInputHtml = `
          <input type="number" 
                 class="qty-input-field" 
                 value="${item.quantity}" 
                 min="0" 
                 data-fee-id="${item.feeId}" 
                 data-hh-id="${hhId}"
                 title="Nhập lượng tiêu thụ và nhấn Enter để tính toán lại"> m³
        `;
      }

      const statusBadge = item.status === 'PAID'
        ? '<span class="badge bg-success-light text-success">Đã Thanh Toán</span>'
        : '<span class="badge bg-danger-light text-danger">Chưa Thanh Toán</span>';

      let actionsHtml = '';
      if (item.status === 'UNPAID') {
        actionsHtml = `
          <button class="btn btn-primary btn-xs btn-pay-item" data-asf-id="${item.assignedFeeId}">Đóng tiền</button>
          <button class="btn btn-danger btn-xs btn-remove-assigned" data-fee-id="${item.feeId}" data-hh-id="${hhId}">Hủy gán</button>
        `;
      } else {
        actionsHtml = `
          <button class="btn btn-secondary btn-xs btn-unpay-item" data-asf-id="${item.assignedFeeId}">Hoàn tác</button>
        `;
      }

      tr.innerHTML = `
        <td><strong>${item.feeName}</strong><br><small class="text-secondary">${item.feeType === 'COMPULSORY' ? 'Bắt buộc' : 'Tự nguyện'}</small></td>
        <td><small class="text-secondary">${formulaText}</small></td>
        <td>${qtyInputHtml} <br><small class="text-secondary">Đơn giá: ${formatVND(item.price)}</small></td>
        <td><strong>${formatVND(item.amount)}</strong></td>
        <td>${statusBadge}</td>
        <td class="text-right"><div class="btn-group">${actionsHtml}</div></td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById('bill-total-amount').textContent = formatVND(bill.totalAmount);
  document.getElementById('bill-total-paid').textContent = formatVND(bill.totalPaid);
  document.getElementById('bill-total-unpaid').textContent = formatVND(bill.totalUnpaid);

  // Dropdown gán phí tự nguyện
  const fees = await apiCall('GET', '/api/fees');
  const period = (await apiCall('GET', '/api/periods')).find(p => p.id === selectedPeriodId);
  const selectOptional = document.getElementById('assign-fee-select');
  selectOptional.innerHTML = '<option value="">-- Chọn khoản thu tự nguyện --</option>';

  if (period) {
    const assignedFeeIds = bill.items.map(i => i.feeId);
    const unassignedFees = fees.filter(f => period.feeIds.includes(f.id) && !assignedFeeIds.includes(f.id));

    if (unassignedFees.length === 0) {
      const opt = document.createElement('option');
      opt.disabled = true;
      opt.textContent = '(Hộ đã được gán toàn bộ khoản thu của đợt)';
      selectOptional.appendChild(opt);
    } else {
      unassignedFees.forEach(fee => {
        const opt = document.createElement('option');
        opt.value = fee.id;
        opt.textContent = `${fee.name} [Đơn giá: ${formatVND(fee.price)}]`;
        selectOptional.appendChild(opt);
      });
    }
  }

  // --- LẮNG NGHE SỰ KIỆN TƯƠNG TÁC GIAO DIỆN HÓA ĐƠN ---
  
  // 1. Nhập đổi số nước tiêu thụ m3 và nhấn Enter
  tbody.querySelectorAll('.qty-input-field').forEach(input => {
    input.addEventListener('change', async () => {
      const feeId = input.getAttribute('data-fee-id');
      const newQty = Number(input.value);
      await apiCall('POST', `/api/assign`, { householdId: hhId, periodId: selectedPeriodId, feeId, quantity: newQty });
      
      openBillModal(hhId);
      updateAllViews();
      showNotification('Đã lưu lượng đo đạc mới và tự động tính toán lại hóa đơn!');
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });
  });

  // 2. Nhấn nút đóng tiền (Thanh toán)
  tbody.querySelectorAll('.btn-pay-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      const asfId = btn.getAttribute('data-asf-id');
      await apiCall('POST', `/api/pay`, { assignedFeeId: asfId });
      openBillModal(hhId);
      updateAllViews();
      showNotification('Hệ thống đã xác nhận thanh toán thành công!');
    });
  });

  // 3. Hoàn tác đóng tiền
  tbody.querySelectorAll('.btn-unpay-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      const asfId = btn.getAttribute('data-asf-id');
      await apiCall('POST', `/api/unpay`, { assignedFeeId: asfId });
      openBillModal(hhId);
      updateAllViews();
      showNotification('Đã hoàn tác trạng thái thanh toán!');
    });
  });

  // 4. Hủy gán phí
  tbody.querySelectorAll('.btn-remove-assigned').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fId = btn.getAttribute('data-fee-id');
      if (confirm('Bạn có thực sự muốn hủy gán khoản thu này?')) {
        await apiCall('POST', `/api/unassign`, { householdId: hhId, periodId: selectedPeriodId, feeId: fId });
        openBillModal(hhId);
        updateAllViews();
        showNotification('Đã hủy lượt gán phí.');
      }
    });
  });

  modalBill.classList.add('active');
}

// --- UTILITIES ---
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function showNotification(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  
  toast.style.position = 'fixed';
  toast.style.bottom = 'calc(var(--code-panel-height) + 20px)';
  toast.style.right = '20px';
  toast.style.backgroundColor = 'var(--dark-slate)';
  toast.style.color = 'var(--white)';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = 'var(--radius-sm)';
  toast.style.boxShadow = 'var(--shadow-lg)';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '10px';
  toast.style.zIndex = '1000';
  toast.style.fontSize = '13px';
  toast.style.fontWeight = '500';
  toast.style.animation = 'toastIn 0.3s ease forwards';

  if (!document.getElementById('toast-styles')) {
    const styleSheet = document.createElement("style");
    styleSheet.id = 'toast-styles';
    styleSheet.type = "text/css";
    styleSheet.innerText = `
      @keyframes toastIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes toastOut { from { transform: translateY(0); opacity: 1; } to { transform: translateY(20px); opacity: 0; } }
      .toast-icon { width: 16px; height: 16px; color: var(--success); }
    `;
    document.head.appendChild(styleSheet);
  }

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => { toast.remove(); }, 300);
  }, 3000);
}
