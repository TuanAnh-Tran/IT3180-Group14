/**
 * RESIDENT MANAGER COMPONENT (residents.js)
 * Quản lý hộ khẩu / cư dân / căn hộ — được chuyển đổi từ BlueMoon app (phần 2)
 * thành ES6 module tích hợp vào Cyberspace Portal SPA.
 */

const BM_KEY = 'bluemoon_resident_manager_v1_en';

let households = [];
let residents = [];
let selectedHouseholdId = null;

/* ===== LocalStorage helpers ===== */
function bmLoadData() {
  const raw = localStorage.getItem(BM_KEY);
  if (!raw) { bmSeedData(); bmSaveData(); return; }
  try {
    const parsed = JSON.parse(raw);
    households = parsed.households || [];
    residents  = parsed.residents  || [];
    bmSyncMembers();
  } catch { bmSeedData(); bmSaveData(); }
}

function bmSaveData() {
  localStorage.setItem(BM_KEY, JSON.stringify({ households, residents }));
}

function bmSeedData() {
  households = [
    { id:'hh_1', code:'HH-A1201', apartmentNo:'A1201', floor:12, area:72.5, headName:'Nguyen Van An', phone:'0987654321', status:'Occupied', note:'Completed permanent residence registration.', members:['rs_1','rs_2'] },
    { id:'hh_2', code:'HH-B0805', apartmentNo:'B0805', floor:8,  area:65,   headName:'Tran Thi Binh', phone:'0911222333', status:'Occupied', note:'One temporary resident.', members:['rs_3','rs_4'] },
  ];
  residents = [
    { id:'rs_1', fullName:'Nguyen Van An',  gender:'Male',   dob:'1985-04-12', identityNo:'001085000111', phone:'0987654321', hometown:'Hanoi',     occupation:'Engineer',   status:'Permanent resident', householdId:'hh_1' },
    { id:'rs_2', fullName:'Le Thu Ha',      gender:'Female', dob:'1988-08-20', identityNo:'001188000222', phone:'0977000111', hometown:'Hanoi',     occupation:'Teacher',    status:'Permanent resident', householdId:'hh_1' },
    { id:'rs_3', fullName:'Tran Thi Binh',  gender:'Female', dob:'1979-01-15', identityNo:'031079000333', phone:'0911222333', hometown:'Nam Dinh',  occupation:'Accountant', status:'Permanent resident', householdId:'hh_2' },
    { id:'rs_4', fullName:'Pham Minh Duc',  gender:'Male',   dob:'1998-11-02', identityNo:'022098000444', phone:'0909090909', hometown:'Hai Phong', occupation:'Student',    status:'Temporary resident', householdId:'hh_2' },
  ];
  selectedHouseholdId = null;
}

/* ===== Utility helpers ===== */
function bmNorm(v) {
  return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
}
function bmEsc(v) {
  return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}
function bmFmtDate(v) {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-GB');
}
function bmCreateId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}
function bmStatusBadge(status) {
  let cls = '';
  if (status === 'Temporary resident' || status === 'Temporarily away') cls = 'bm-warning';
  if (status === 'Moved out') cls = 'bm-danger';
  if (status === 'Vacant') cls = 'bm-gray';
  return `<span class="bm-badge ${cls}">${bmEsc(status)}</span>`;
}
function bmSyncMembers() {
  households = households.map(h => ({ ...h, members: residents.filter(r=>r.householdId===h.id).map(r=>r.id) }));
}
function bmFindHH(id) { return households.find(h=>h.id===id); }
function bmFindRes(id) { return residents.find(r=>r.id===id); }
function bmGetMembers(hhId) { return residents.filter(r=>r.householdId===hhId); }

/* ===== Main render ===== */
export class ResidentsManager {
  static render(container, currentUser, showToast) {
    bmLoadData();

    if (currentUser && currentUser.role !== 'admin') {
      let userHousehold = null;
      let userResident = null;
      
      if (currentUser.identityNo) {
        userResident = residents.find(r => r.identityNo === currentUser.identityNo);
      }
      if (!userResident && currentUser.fullname) {
        userResident = residents.find(r => bmNorm(r.fullName) === bmNorm(currentUser.fullname));
      }
      if (userResident && userResident.householdId) {
        userHousehold = bmFindHH(userResident.householdId);
      }
      if (!userHousehold && currentUser.room) {
        const normRoom = bmNorm(currentUser.room);
        userHousehold = households.find(h => normRoom.includes(bmNorm(h.apartmentNo)) || bmNorm(h.apartmentNo).includes(normRoom));
      }
      if (!userHousehold && currentUser.fullname) {
        userHousehold = households.find(h => bmNorm(h.headName) === bmNorm(currentUser.fullname));
      }

      if (userHousehold) {
        container.innerHTML = `
          <style>
            .bm-wrap { font-family: Arial, sans-serif; color: #1f2937; }
            .bm-card { background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:18px; padding:20px; margin-bottom:20px; }
            .bm-card h2 { margin:0 0 16px; font-size:18px; color:var(--text-primary); }
            .bm-badge { display:inline-block; padding:4px 9px; border-radius:999px; background:var(--color-accent-light); color:var(--color-accent); font-size:12px; font-weight:700; }
            .bm-badge.bm-warning { background:var(--color-warning-light); color:var(--color-warning); }
            .bm-badge.bm-gray { background:var(--bg-tertiary); color:var(--text-muted); }
            .bm-member-card { border:1px solid var(--border-glass); border-radius:14px; padding:14px; background:var(--bg-tertiary); }
            .bm-member-card p { margin:3px 0; color:var(--text-secondary); font-size:13px; }
            .bm-grid2 { display:grid; grid-template-columns:1fr 1.5fr; gap:20px; align-items:start; }
            @media(max-width:900px){ .bm-grid2{ grid-template-columns:1fr; } }
          </style>
          <div class="bm-wrap">
            <div class="chart-card" style="margin-bottom:20px; padding:16px 20px;">
              <h2 class="card-title" style="margin-bottom:4px;">My Household Information</h2>
              <p class="card-title-muted">Household details registered for unit ${bmEsc(userHousehold.apartmentNo)}</p>
            </div>
            <div class="bm-grid2">
              <div class="bm-card">
                <h2>Household Registry Details</h2>
                <div style="display:flex; flex-direction:column; gap:12px;">
                  <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                    <span style="color:var(--text-secondary); font-size:14px;">Household Code:</span>
                    <strong style="color:var(--color-primary); font-size:14px;">${bmEsc(userHousehold.code)}</strong>
                  </div>
                  <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                    <span style="color:var(--text-secondary); font-size:14px;">Apartment:</span>
                    <strong style="color:var(--text-primary); font-size:14px;">${bmEsc(userHousehold.apartmentNo)}</strong>
                  </div>
                  <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                    <span style="color:var(--text-secondary); font-size:14px;">Floor:</span>
                    <strong style="color:var(--text-primary); font-size:14px;">${userHousehold.floor || '-'}</strong>
                  </div>
                  <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                    <span style="color:var(--text-secondary); font-size:14px;">Area:</span>
                    <strong style="color:var(--text-primary); font-size:14px;">${userHousehold.area || '-'} m²</strong>
                  </div>
                  <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                    <span style="color:var(--text-secondary); font-size:14px;">Head of Household:</span>
                    <strong style="color:var(--text-primary); font-size:14px;">${bmEsc(userHousehold.headName)}</strong>
                  </div>
                  <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                    <span style="color:var(--text-secondary); font-size:14px;">Phone:</span>
                    <strong style="color:var(--text-primary); font-size:14px;">${bmEsc(userHousehold.phone || '-')}</strong>
                  </div>
                  <div style="display:flex; justify-content:space-between; padding-bottom:8px;">
                    <span style="color:var(--text-secondary); font-size:14px;">Status:</span>
                    <strong>${bmStatusBadge(userHousehold.status)}</strong>
                  </div>
                </div>
              </div>
              <div class="bm-card">
                <h2>Household Members (${bmGetMembers(userHousehold.id).length})</h2>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:12px;">
                  ${bmGetMembers(userHousehold.id).map(r => `
                    <div class="bm-member-card">
                      <h3 style="margin:0 0 6px; font-size:15px; color:var(--text-primary);">${bmEsc(r.fullName)}</h3>
                      <p>Gender: <strong>${bmEsc(r.gender)}</strong></p>
                      <p>Citizen ID: <strong>${bmEsc(r.identityNo)}</strong></p>
                      <p>Phone: <strong>${bmEsc(r.phone || '-')}</strong></p>
                      <p>Occupation: <strong>${bmEsc(r.occupation || '-')}</strong></p>
                      <p>Status: <strong>${bmEsc(r.status)}</strong></p>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        container.innerHTML = `
          <style>
            .bm-wrap { font-family: Arial, sans-serif; color: #1f2937; }
            .bm-card { background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:18px; padding:20px; margin-bottom:20px; }
            .bm-card h2 { margin:0 0 16px; font-size:18px; color:var(--text-primary); }
            .bm-member-card { border:1px solid var(--border-glass); border-radius:14px; padding:14px; background:var(--bg-tertiary); }
            .bm-member-card p { margin:3px 0; color:var(--text-secondary); font-size:13px; }
            .bm-grid2 { display:grid; grid-template-columns:1fr 1.2fr; gap:20px; align-items:start; }
            @media(max-width:900px){ .bm-grid2{ grid-template-columns:1fr; } }
          </style>
          <div class="bm-wrap">
            <div class="chart-card" style="margin-bottom:20px; padding:16px 20px;">
              <h2 class="card-title" style="margin-bottom:4px;">My Household (Account Registry)</h2>
              <p class="card-title-muted">Household and personal details registered with your account</p>
            </div>
            <div class="bm-grid2">
              <div class="bm-card">
                <h2>Household Details</h2>
                <div style="display:flex; flex-direction:column; gap:12px;">
                  <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                    <span style="color:var(--text-secondary); font-size:14px;">Household Code:</span>
                    <strong style="color:var(--color-primary); font-size:14px;">${bmEsc(currentUser.householdCode || '-')}</strong>
                  </div>
                  <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                    <span style="color:var(--text-secondary); font-size:14px;">Head of Household:</span>
                    <strong style="color:var(--text-primary); font-size:14px;">${bmEsc(currentUser.householdHeadName || '-')}</strong>
                  </div>
                  <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                    <span style="color:var(--text-secondary); font-size:14px;">House Number:</span>
                    <strong style="color:var(--text-primary); font-size:14px;">${bmEsc(currentUser.houseNo || '-')}</strong>
                  </div>
                  <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                    <span style="color:var(--text-secondary); font-size:14px;">Street:</span>
                    <strong style="color:var(--text-primary); font-size:14px;">${bmEsc(currentUser.street || '-')}</strong>
                  </div>
                  <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                    <span style="color:var(--text-secondary); font-size:14px;">Ward / Commune:</span>
                    <strong style="color:var(--text-primary); font-size:14px;">${bmEsc(currentUser.ward || '-')}</strong>
                  </div>
                  <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                    <span style="color:var(--text-secondary); font-size:14px;">District:</span>
                    <strong style="color:var(--text-primary); font-size:14px;">${bmEsc(currentUser.district || '-')}</strong>
                  </div>
                </div>
              </div>
              <div class="bm-card">
                <h2>My Identity Details</h2>
                <div style="display:grid; grid-template-columns:1fr; gap:12px;">
                  <div class="bm-member-card">
                    <h3 style="margin:0 0 6px; font-size:15px; color:var(--text-primary);">${bmEsc(currentUser.fullname)}</h3>
                    <p>Alias (Bí danh): <strong>${bmEsc(currentUser.alias || '-')}</strong></p>
                    <p>Citizen ID: <strong>${bmEsc(currentUser.identityNo)}</strong></p>
                    <p>Phone: <strong>${bmEsc(currentUser.phone)}</strong></p>
                    <p>Date of Birth: <strong>${bmEsc(currentUser.dob)}</strong></p>
                    <p>Place of Birth: <strong>${bmEsc(currentUser.birthPlace)}</strong></p>
                    <p>Hometown (Nguyên quán): <strong>${bmEsc(currentUser.hometown)}</strong></p>
                    <p>Ethnicity: <strong>${bmEsc(currentUser.ethnicity)}</strong></p>
                    <p>Occupation: <strong>${bmEsc(currentUser.occupation)}</strong></p>
                    <p>Workplace: <strong>${bmEsc(currentUser.workplace)}</strong></p>
                    <p>CCCD Issue Date: <strong>${bmEsc(currentUser.issueDate)}</strong></p>
                    <p>CCCD Issue Place: <strong>${bmEsc(currentUser.issuePlace)}</strong></p>
                    <p>Previous Residence: <strong>${bmEsc(currentUser.previousResidence)}</strong></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      return;
    }

    container.innerHTML = `
      <style>
        /* ---- BlueMoon scoped styles ---- */
        .bm-wrap { font-family: Arial, sans-serif; color: #1f2937; }
        .bm-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:20px; }
        .bm-stat { background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:16px; padding:20px; }
        .bm-stat span { display:block; font-size:32px; font-weight:bold; color:var(--color-primary); }
        .bm-stat p { margin:6px 0 0; color:var(--text-secondary); font-size:14px; }
        .bm-tabs { display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; }
        .bm-tab { border:none; background:var(--bg-tertiary); color:var(--text-secondary); padding:10px 18px; border-radius:999px; cursor:pointer; font-weight:600; font-size:14px; transition:var(--transition-fast); }
        .bm-tab.active { background:var(--color-primary); color:#fff; }
        .bm-panel { display:none; } .bm-panel.active { display:block; }
        .bm-grid2 { display:grid; grid-template-columns:400px 1fr; gap:20px; align-items:start; }
        .bm-card { background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:18px; padding:20px; margin-bottom:20px; }
        .bm-card h2 { margin:0 0 16px; font-size:18px; color:var(--text-primary); }
        .bm-card-header { display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:12px; }
        .bm-card-header h2 { margin:0; }
        .bm-label { display:block; font-size:13px; font-weight:600; margin:10px 0 4px; color:var(--text-secondary); }
        .bm-input, .bm-select, .bm-textarea { width:100%; border:1px solid var(--border-glass); border-radius:10px; padding:10px 12px; font-size:14px; outline:none; background:var(--bg-tertiary); color:var(--text-primary); }
        .bm-input:focus, .bm-select:focus, .bm-textarea:focus { border-color:var(--color-primary); box-shadow:0 0 0 3px var(--color-primary-light); }
        .bm-input-sm { max-width:260px; }
        .bm-btn { border:none; background:var(--color-primary); color:#fff; padding:9px 14px; border-radius:10px; cursor:pointer; font-weight:600; font-size:14px; transition:var(--transition-fast); }
        .bm-btn:hover { background:var(--color-primary-hover); }
        .bm-btn.sec { background:var(--bg-tertiary); color:var(--text-secondary); }
        .bm-btn.sec:hover { background:var(--border-glass-hover); }
        .bm-btn.danger { background:var(--color-danger); }
        .bm-btn.danger:hover { opacity:.85; }
        .bm-form-actions { display:flex; gap:10px; margin-top:16px; }
        .bm-tbl-wrap { overflow-x:auto; }
        .bm-tbl { width:100%; border-collapse:collapse; min-width:640px; }
        .bm-tbl th, .bm-tbl td { padding:11px 12px; border-bottom:1px solid var(--border-glass); text-align:left; vertical-align:middle; }
        .bm-tbl th { background:var(--bg-tertiary); color:var(--text-secondary); font-size:12px; text-transform:uppercase; }
        .bm-tbl td { font-size:14px; color:var(--text-primary); }
        .bm-actions { display:flex; gap:6px; flex-wrap:wrap; }
        .bm-actions .bm-btn { padding:6px 10px; font-size:12px; }
        .bm-badge { display:inline-block; padding:4px 9px; border-radius:999px; background:var(--color-accent-light); color:var(--color-accent); font-size:12px; font-weight:700; }
        .bm-badge.bm-warning { background:var(--color-warning-light); color:var(--color-warning); }
        .bm-badge.bm-danger  { background:var(--color-danger-light);  color:var(--color-danger); }
        .bm-badge.bm-gray    { background:var(--bg-tertiary); color:var(--text-muted); }
        .bm-muted { color:var(--text-muted); font-size:13px; }
        .bm-member-toolbar { display:grid; grid-template-columns:1fr auto; gap:12px; margin-bottom:16px; }
        .bm-member-list { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
        .bm-member-card { border:1px solid var(--border-glass); border-radius:14px; padding:14px; background:var(--bg-tertiary); }
        .bm-member-card h3 { margin:0 0 6px; font-size:15px; color:var(--text-primary); }
        .bm-member-card p { margin:3px 0; color:var(--text-secondary); font-size:13px; }
        .bm-search-box { display:grid; grid-template-columns:1fr 200px; gap:12px; margin-bottom:16px; }
        .bm-empty { text-align:center; color:var(--text-muted); padding:24px; }
        .bm-reset { background:transparent; border:1px solid var(--color-danger); color:var(--color-danger); padding:8px 14px; border-radius:10px; cursor:pointer; font-size:13px; font-weight:600; }
        .bm-reset:hover { background:var(--color-danger-light); }
        @media(max-width:900px){ .bm-grid2{ grid-template-columns:1fr; } .bm-stats{ grid-template-columns:repeat(2,1fr); } }
      </style>

      <div class="bm-wrap">
        <!-- Header -->
        <div class="chart-card" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; padding:16px 20px;">
          <div>
            <h2 class="card-title" style="margin-bottom:4px;">BlueMoon Resident Manager</h2>
            <p class="card-title-muted">Household, resident and apartment management</p>
          </div>
          <button class="bm-reset" id="bm-resetBtn">Reset sample data</button>
        </div>

        <!-- Stats -->
        <div class="bm-stats" id="bm-stats">
          <div class="bm-stat"><span id="bm-totalHH">0</span><p>Households</p></div>
          <div class="bm-stat"><span id="bm-totalRes">0</span><p>Residents</p></div>
          <div class="bm-stat"><span id="bm-occupied">0</span><p>Occupied apartments</p></div>
          <div class="bm-stat"><span id="bm-temporary">0</span><p>Temporary residents</p></div>
        </div>

        <!-- Tabs -->
        <div class="bm-tabs">
          <button class="bm-tab active" data-bm-tab="bm-hhTab">Households / Apartments</button>
          <button class="bm-tab" data-bm-tab="bm-resTab">Residents</button>
          <button class="bm-tab" data-bm-tab="bm-searchTab">Search</button>
        </div>

        <!-- HOUSEHOLD TAB -->
        <div class="bm-panel active" id="bm-hhTab">
          <div class="bm-grid2">
            <!-- Form -->
            <div class="bm-card">
              <h2 id="bm-hhFormTitle">Add household</h2>
              <form id="bm-hhForm">
                <input type="hidden" id="bm-hhId" />
                <label class="bm-label">Household code</label>
                <input class="bm-input" id="bm-hhCode" placeholder="e.g. HH-A1201" required />
                <label class="bm-label">Apartment number</label>
                <input class="bm-input" id="bm-apartmentNo" placeholder="e.g. A1201" required />
                <label class="bm-label">Floor</label>
                <input class="bm-input" id="bm-floor" type="number" min="1" placeholder="e.g. 12" />
                <label class="bm-label">Area m²</label>
                <input class="bm-input" id="bm-area" type="number" min="1" step="0.1" placeholder="e.g. 72.5" />
                <label class="bm-label">Household head</label>
                <input class="bm-input" id="bm-headName" placeholder="e.g. Nguyen Van An" required />
                <label class="bm-label">Phone number</label>
                <input class="bm-input" id="bm-hhPhone" placeholder="e.g. 0987654321" />
                <label class="bm-label">Status</label>
                <select class="bm-select" id="bm-hhStatus">
                  <option>Occupied</option>
                  <option>Temporarily away</option>
                  <option>Moved out</option>
                  <option>Vacant</option>
                </select>
                <label class="bm-label">Note</label>
                <textarea class="bm-textarea" id="bm-hhNote" rows="3" placeholder="Additional info..."></textarea>
                <div class="bm-form-actions">
                  <button type="submit" class="bm-btn">Save household</button>
                  <button type="button" class="bm-btn sec" id="bm-cancelHH">Cancel</button>
                </div>
              </form>
            </div>
            <!-- Table -->
            <div class="bm-card">
              <div class="bm-card-header">
                <h2>Household list</h2>
                <input class="bm-input bm-input-sm" id="bm-hhSearch" placeholder="Filter..." />
              </div>
              <div class="bm-tbl-wrap">
                <table class="bm-tbl">
                  <thead><tr><th>Code</th><th>Apartment</th><th>Head</th><th>Members</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody id="bm-hhTbody"></tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Member management -->
          <div class="bm-card">
            <h2>Household member management</h2>
            <p id="bm-memberTitle" class="bm-muted">Select a household to view, add or remove members.</p>
            <div class="bm-member-toolbar">
              <select class="bm-select" id="bm-residentToAdd"></select>
              <button class="bm-btn" id="bm-addMemberBtn">Add to household</button>
            </div>
            <div class="bm-member-list" id="bm-memberList"></div>
          </div>
        </div>

        <!-- RESIDENT TAB -->
        <div class="bm-panel" id="bm-resTab">
          <div class="bm-grid2">
            <div class="bm-card">
              <h2 id="bm-resFormTitle">Add resident</h2>
              <form id="bm-resForm">
                <input type="hidden" id="bm-resId" />
                <label class="bm-label">Full name</label>
                <input class="bm-input" id="bm-fullName" placeholder="e.g. Tran Minh Anh" required />
                <label class="bm-label">Gender</label>
                <select class="bm-select" id="bm-gender">
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
                <label class="bm-label">Date of birth</label>
                <input class="bm-input" id="bm-dob" type="date" />
                <label class="bm-label">Citizen ID</label>
                <input class="bm-input" id="bm-identityNo" placeholder="e.g. 001203000999" required />
                <label class="bm-label">Phone number</label>
                <input class="bm-input" id="bm-phone" placeholder="e.g. 0912345678" />
                <label class="bm-label">Hometown</label>
                <input class="bm-input" id="bm-hometown" placeholder="e.g. Hanoi" />
                <label class="bm-label">Occupation</label>
                <input class="bm-input" id="bm-occupation" placeholder="e.g. Engineer" />
                <label class="bm-label">Status</label>
                <select class="bm-select" id="bm-resStatus">
                  <option>Permanent resident</option>
                  <option>Temporary resident</option>
                  <option>Temporarily away</option>
                  <option>Moved out</option>
                </select>
                <label class="bm-label">Household</label>
                <select class="bm-select" id="bm-resHousehold"></select>
                <div class="bm-form-actions">
                  <button type="submit" class="bm-btn">Save resident</button>
                  <button type="button" class="bm-btn sec" id="bm-cancelRes">Cancel</button>
                </div>
              </form>
            </div>
            <div class="bm-card">
              <div class="bm-card-header">
                <h2>Resident list</h2>
                <input class="bm-input bm-input-sm" id="bm-resSearch" placeholder="Filter..." />
              </div>
              <div class="bm-tbl-wrap">
                <table class="bm-tbl">
                  <thead><tr><th>Full name</th><th>Citizen ID</th><th>Apartment</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody id="bm-resTbody"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- SEARCH TAB -->
        <div class="bm-panel" id="bm-searchTab">
          <div class="bm-card">
            <h2>Search residents / apartments</h2>
            <div class="bm-search-box">
              <input class="bm-input" id="bm-globalSearch" placeholder="Name, citizen ID, phone, apartment, head..." />
              <select class="bm-select" id="bm-searchType">
                <option value="all">All</option>
                <option value="resident">Residents</option>
                <option value="apartment">Apartments / Households</option>
              </select>
            </div>
            <div class="bm-tbl-wrap">
              <table class="bm-tbl">
                <thead><tr><th>Type</th><th>Main info</th><th>Details</th><th>Action</th></tr></thead>
                <tbody id="bm-searchTbody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    /* --- wire up all events --- */
    const q = (id) => container.querySelector('#' + id);

    // Tabs
    container.querySelectorAll('.bm-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.bm-tab').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.bm-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        container.querySelector('#' + btn.dataset.bmTab).classList.add('active');
      });
    });

    // Reset
    q('bm-resetBtn').addEventListener('click', () => {
      if (!confirm('Delete current data and restore sample data?')) return;
      bmSeedData(); bmSaveData(); selectedHouseholdId = null;
      renderAll(); showToast('Sample data has been reset', 'info');
    });

    // Forms
    q('bm-hhForm').addEventListener('submit', saveHousehold);
    q('bm-resForm').addEventListener('submit', saveResident);
    q('bm-cancelHH').addEventListener('click', resetHHForm);
    q('bm-cancelRes').addEventListener('click', resetResForm);

    // Quick search
    q('bm-hhSearch').addEventListener('input', renderHHTable);
    q('bm-resSearch').addEventListener('input', renderResTable);
    q('bm-globalSearch').addEventListener('input', renderSearch);
    q('bm-searchType').addEventListener('change', renderSearch);

    // Add member
    q('bm-addMemberBtn').addEventListener('click', addMember);

    // Delegated action clicks
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-bm-action]');
      if (!btn) return;
      const action = btn.dataset.bmAction;
      const id = btn.dataset.bmId;
      if (action === 'edit-hh')     editHH(id);
      if (action === 'delete-hh')   deleteHH(id);
      if (action === 'view-hh') {
        selectedHouseholdId = id;
        container.querySelectorAll('.bm-tab').forEach(b=>b.classList.remove('active'));
        container.querySelectorAll('.bm-panel').forEach(p=>p.classList.remove('active'));
        container.querySelector('[data-bm-tab="bm-hhTab"]').classList.add('active');
        container.querySelector('#bm-hhTab').classList.add('active');
        renderAll();
        q('bm-memberTitle').scrollIntoView({ behavior:'smooth' });
      }
      if (action === 'edit-res')    editRes(id);
      if (action === 'delete-res')  deleteRes(id);
      if (action === 'remove-member') removeMember(id);
    });

    renderAll();

    /* ---- render functions ---- */
    function renderAll() {
      bmSyncMembers();
      renderStats();
      renderHHTable();
      renderResTable();
      renderHHSelects();
      renderMembers();
      renderSearch();
    }

    function renderStats() {
      q('bm-totalHH').textContent = households.length;
      q('bm-totalRes').textContent = residents.length;
      q('bm-occupied').textContent = households.filter(h=>h.status==='Occupied').length;
      q('bm-temporary').textContent = residents.filter(r=>r.status==='Temporary resident'||r.status==='Temporarily away').length;
    }

    function renderHHTable() {
      const kw = bmNorm(q('bm-hhSearch').value);
      const filtered = households.filter(h => bmNorm(`${h.code} ${h.apartmentNo} ${h.headName} ${h.phone} ${h.status}`).includes(kw));
      q('bm-hhTbody').innerHTML = filtered.length
        ? filtered.map(h => {
            const mc = bmGetMembers(h.id).length;
            return `<tr>
              <td>${bmEsc(h.code)}</td>
              <td><strong>${bmEsc(h.apartmentNo)}</strong><br><span class="bm-muted">Floor ${h.floor||'-'}</span></td>
              <td>${bmEsc(h.headName)}<br><span class="bm-muted">${bmEsc(h.phone||'-')}</span></td>
              <td>${mc}</td>
              <td>${bmStatusBadge(h.status)}</td>
              <td><div class="bm-actions">
                <button class="bm-btn" data-bm-action="view-hh" data-bm-id="${h.id}">Members</button>
                <button class="bm-btn sec" data-bm-action="edit-hh" data-bm-id="${h.id}">Edit</button>
                <button class="bm-btn danger" data-bm-action="delete-hh" data-bm-id="${h.id}">Delete</button>
              </div></td>
            </tr>`;
          }).join('')
        : `<tr><td colspan="6" class="bm-empty">No matching households found</td></tr>`;
    }

    function renderResTable() {
      const kw = bmNorm(q('bm-resSearch').value);
      const filtered = residents.filter(r => {
        const h = bmFindHH(r.householdId);
        return bmNorm(`${r.fullName} ${r.identityNo} ${r.phone} ${r.status} ${h?h.apartmentNo:''}`).includes(kw);
      });
      q('bm-resTbody').innerHTML = filtered.length
        ? filtered.map(r => {
            const h = bmFindHH(r.householdId);
            return `<tr>
              <td><strong>${bmEsc(r.fullName)}</strong><br><span class="bm-muted">${bmEsc(r.gender)} - ${bmFmtDate(r.dob)}</span></td>
              <td>${bmEsc(r.identityNo)}</td>
              <td>${h ? bmEsc(h.apartmentNo) : "<span class='bm-muted'>No household</span>"}</td>
              <td>${bmStatusBadge(r.status)}</td>
              <td><div class="bm-actions">
                <button class="bm-btn sec" data-bm-action="edit-res" data-bm-id="${r.id}">Edit</button>
                <button class="bm-btn danger" data-bm-action="delete-res" data-bm-id="${r.id}">Delete</button>
              </div></td>
            </tr>`;
          }).join('')
        : `<tr><td colspan="5" class="bm-empty">No matching residents found</td></tr>`;
    }

    function renderHHSelects() {
      const opts = [
        `<option value="">-- No household --</option>`,
        ...households.map(h=>`<option value="${h.id}">${bmEsc(h.apartmentNo)} - ${bmEsc(h.headName)}</option>`)
      ].join('');
      q('bm-resHousehold').innerHTML = opts;

      if (!selectedHouseholdId) {
        q('bm-residentToAdd').innerHTML = `<option value="">-- Select a household first --</option>`;
        q('bm-residentToAdd').disabled = true;
        q('bm-addMemberBtn').disabled = true;
        return;
      }
      const candidates = residents.filter(r=>r.householdId!==selectedHouseholdId);
      q('bm-residentToAdd').disabled = false;
      q('bm-addMemberBtn').disabled = false;
      q('bm-residentToAdd').innerHTML = candidates.length
        ? [`<option value="">-- Select a resident --</option>`,
            ...candidates.map(r=>{
              const oh = bmFindHH(r.householdId);
              return `<option value="${r.id}">${bmEsc(r.fullName)} - ${oh?'in '+oh.apartmentNo:'no household'}</option>`;
            })].join('')
        : `<option value="">No available residents</option>`;
    }

    function renderMembers() {
      const title = q('bm-memberTitle');
      const list  = q('bm-memberList');
      if (!selectedHouseholdId) {
        title.textContent = 'Select a household to view, add or remove members.';
        list.innerHTML = ''; return;
      }
      const hh = bmFindHH(selectedHouseholdId);
      if (!hh) { selectedHouseholdId = null; renderMembers(); return; }
      const members = bmGetMembers(selectedHouseholdId);
      title.innerHTML = `Managing household <strong>${bmEsc(hh.code)}</strong>, apartment <strong>${bmEsc(hh.apartmentNo)}</strong>, head <strong>${bmEsc(hh.headName)}</strong>.`;
      list.innerHTML = members.length
        ? members.map(r=>`
            <div class="bm-member-card">
              <h3>${bmEsc(r.fullName)}</h3>
              <p>Citizen ID: ${bmEsc(r.identityNo)}</p>
              <p>Status: ${bmEsc(r.status)}</p>
              <p>Phone: ${bmEsc(r.phone||'-')}</p>
              <div class="bm-actions" style="margin-top:10px;">
                <button class="bm-btn sec" data-bm-action="edit-res" data-bm-id="${r.id}">Edit</button>
                <button class="bm-btn danger" data-bm-action="remove-member" data-bm-id="${r.id}">Remove</button>
              </div>
            </div>`).join('')
        : `<p class="bm-empty">This household has no members.</p>`;
    }

    function renderSearch() {
      const kw   = bmNorm(q('bm-globalSearch').value);
      const type = q('bm-searchType').value;
      const rows = [];

      if (type==='all'||type==='resident') {
        residents.forEach(r => {
          const h = bmFindHH(r.householdId);
          if (!kw || bmNorm(`${r.fullName} ${r.identityNo} ${r.phone} ${r.hometown} ${r.occupation} ${r.status} ${h?h.apartmentNo:''}`).includes(kw)) {
            rows.push({ type:'Resident', main:`${r.fullName} - ${r.identityNo}`,
              detail:`Phone: ${r.phone||'-'} | Apt: ${h?h.apartmentNo:'No household'} | ${r.status}`,
              action:`<button class="bm-btn sec" data-bm-action="edit-res" data-bm-id="${r.id}">View / Edit</button>` });
          }
        });
      }
      if (type==='all'||type==='apartment') {
        households.forEach(h => {
          const mc = bmGetMembers(h.id).length;
          if (!kw || bmNorm(`${h.code} ${h.apartmentNo} ${h.headName} ${h.phone} ${h.status}`).includes(kw)) {
            rows.push({ type:'Apartment / Household', main:`${h.code} - ${h.apartmentNo}`,
              detail:`Head: ${h.headName} | Floor: ${h.floor||'-'} | Members: ${mc} | ${h.status}`,
              action:`<button class="bm-btn" data-bm-action="view-hh" data-bm-id="${h.id}">View household</button>` });
          }
        });
      }
      q('bm-searchTbody').innerHTML = rows.length
        ? rows.map(row=>`<tr><td>${bmEsc(row.type)}</td><td><strong>${bmEsc(row.main)}</strong></td><td>${bmEsc(row.detail)}</td><td>${row.action}</td></tr>`).join('')
        : `<tr><td colspan="4" class="bm-empty">No matching results found</td></tr>`;
    }

    /* ---- CRUD ---- */
    function saveHousehold(e) {
      e.preventDefault();
      const id = q('bm-hhId').value;
      const code = q('bm-hhCode').value.trim();
      const apartmentNo = q('bm-apartmentNo').value.trim();
      const headName = q('bm-headName').value.trim();
      if (!code||!apartmentNo||!headName) { showToast('Please fill in required fields','warning'); return; }
      if (households.some(h=>bmNorm(h.apartmentNo)===bmNorm(apartmentNo)&&h.id!==id)) { showToast('Apartment number already exists','warning'); return; }
      const data = { code, apartmentNo, floor:Number(q('bm-floor').value)||'', area:Number(q('bm-area').value)||'', headName, phone:q('bm-hhPhone').value.trim(), status:q('bm-hhStatus').value, note:q('bm-hhNote').value.trim() };
      if (id) {
        const idx = households.findIndex(h=>h.id===id);
        households[idx] = {...households[idx],...data};
        showToast('Household updated','success');
      } else {
        households.push({id:bmCreateId('hh'),...data,members:[]});
        showToast('Household added','success');
      }
      bmSaveData(); resetHHForm(); renderAll();
    }

    function saveResident(e) {
      e.preventDefault();
      const id = q('bm-resId').value;
      const fullName = q('bm-fullName').value.trim();
      const identityNo = q('bm-identityNo').value.trim();
      if (!fullName||!identityNo) { showToast('Please fill in required fields','warning'); return; }
      if (residents.some(r=>bmNorm(r.identityNo)===bmNorm(identityNo)&&r.id!==id)) { showToast('Citizen ID already exists','warning'); return; }
      const data = { fullName, gender:q('bm-gender').value, dob:q('bm-dob').value, identityNo, phone:q('bm-phone').value.trim(), hometown:q('bm-hometown').value.trim(), occupation:q('bm-occupation').value.trim(), status:q('bm-resStatus').value, householdId:q('bm-resHousehold').value };
      if (id) {
        const idx = residents.findIndex(r=>r.id===id);
        residents[idx] = {...residents[idx],...data};
        showToast('Resident updated','success');
      } else {
        residents.push({id:bmCreateId('rs'),...data});
        showToast('Resident added','success');
      }
      bmSyncMembers(); bmSaveData(); resetResForm(); renderAll();
    }

    function editHH(id) {
      const h = bmFindHH(id); if (!h) return;
      q('bm-hhId').value=h.id; q('bm-hhCode').value=h.code; q('bm-apartmentNo').value=h.apartmentNo;
      q('bm-floor').value=h.floor; q('bm-area').value=h.area; q('bm-headName').value=h.headName;
      q('bm-hhPhone').value=h.phone; q('bm-hhStatus').value=h.status; q('bm-hhNote').value=h.note;
      q('bm-hhFormTitle').textContent='Update household';
      container.querySelectorAll('.bm-tab').forEach(b=>b.classList.remove('active'));
      container.querySelectorAll('.bm-panel').forEach(p=>p.classList.remove('active'));
      container.querySelector('[data-bm-tab="bm-hhTab"]').classList.add('active');
      container.querySelector('#bm-hhTab').classList.add('active');
      q('bm-hhForm').scrollIntoView({behavior:'smooth'});
    }

    function deleteHH(id) {
      const h = bmFindHH(id); if (!h) return;
      if (!confirm(`Delete household ${h.code} - ${h.apartmentNo}? Members will be unassigned.`)) return;
      households = households.filter(item=>item.id!==id);
      residents  = residents.map(r=>r.householdId===id?{...r,householdId:''}:r);
      if (selectedHouseholdId===id) selectedHouseholdId=null;
      bmSaveData(); resetHHForm(); renderAll(); showToast('Household deleted','info');
    }

    function editRes(id) {
      const r = bmFindRes(id); if (!r) return;
      q('bm-resId').value=r.id; q('bm-fullName').value=r.fullName; q('bm-gender').value=r.gender;
      q('bm-dob').value=r.dob; q('bm-identityNo').value=r.identityNo; q('bm-phone').value=r.phone;
      q('bm-hometown').value=r.hometown; q('bm-occupation').value=r.occupation;
      q('bm-resStatus').value=r.status; q('bm-resHousehold').value=r.householdId;
      q('bm-resFormTitle').textContent='Update resident';
      container.querySelectorAll('.bm-tab').forEach(b=>b.classList.remove('active'));
      container.querySelectorAll('.bm-panel').forEach(p=>p.classList.remove('active'));
      container.querySelector('[data-bm-tab="bm-resTab"]').classList.add('active');
      container.querySelector('#bm-resTab').classList.add('active');
      q('bm-resForm').scrollIntoView({behavior:'smooth'});
    }

    function deleteRes(id) {
      const r = bmFindRes(id); if (!r) return;
      if (!confirm(`Delete resident ${r.fullName}?`)) return;
      residents = residents.filter(item=>item.id!==id);
      bmSyncMembers(); bmSaveData(); resetResForm(); renderAll(); showToast('Resident deleted','info');
    }

    function addMember() {
      if (!selectedHouseholdId) { showToast('Select a household first','warning'); return; }
      const resId = q('bm-residentToAdd').value;
      if (!resId) { showToast('Select a resident to add','warning'); return; }
      const r = bmFindRes(resId); if (!r) return;
      r.householdId = selectedHouseholdId;
      bmSyncMembers(); bmSaveData(); renderAll(); showToast('Member added to household','success');
    }

    function removeMember(resId) {
      const r = bmFindRes(resId); if (!r) return;
      if (!confirm(`Remove ${r.fullName} from this household?`)) return;
      r.householdId='';
      bmSyncMembers(); bmSaveData(); renderAll(); showToast('Member removed','info');
    }

    function resetHHForm() {
      q('bm-hhForm').reset(); q('bm-hhId').value=''; q('bm-hhFormTitle').textContent='Add household';
    }
    function resetResForm() {
      q('bm-resForm').reset(); q('bm-resId').value=''; q('bm-resFormTitle').textContent='Add resident';
    }
  }
}
