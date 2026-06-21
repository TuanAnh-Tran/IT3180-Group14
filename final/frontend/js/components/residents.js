/**
 * Residents Management module.
 * Interacts exclusively with Spring Boot API backed by MySQL.
 */

const API_ROOT = window.RESIDENTS_API_ROOT || 'http://localhost:8080/api/residents';

const HOUSEHOLD_STATUSES = ['OCCUPIED', 'TEMPORARILY_AWAY', 'MOVED_OUT', 'VACANT'];
const RESIDENT_STATUSES = ['PERMANENT', 'TEMPORARY', 'TEMPORARILY_AWAY', 'MOVED_OUT'];
const GENDERS = ['Male', 'Female', 'Other'];

const state = {
  apiMode: true,
  activeTab: 'households',
  selectedHouseholdId: null,
  editingHouseholdId: null,
  editingResidentId: null,
  householdsPage: 0,
  residentsPage: 0,
  householdsSize: 8,
  residentsSize: 8,
  householdsSearch: '',
  residentsSearch: '',
  householdStatus: 'ALL',
  residentStatus: 'ALL',
  residentGender: '',
  residentHouseholdId: '',
  globalSearch: '',
  globalType: 'all',
  stats: null,
  households: [],
  residents: [],
  householdPageData: emptyPage(),
  residentPageData: emptyPage(),
  searchResults: [],
  activityLogs: []
};

function emptyPage() {
  return { content: [], number: 0, totalPages: 1, totalElements: 0, first: true, last: true };
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function norm(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function statusLabel(value) {
  const labels = {
    OCCUPIED: 'Occupied',
    TEMPORARILY_AWAY: 'Temporarily away',
    MOVED_OUT: 'Moved out',
    VACANT: 'Vacant',
    PERMANENT: 'Permanent',
    TEMPORARY: 'Temporary'
  };
  return labels[value] || value || '-';
}

function statusClass(value) {
  if (value === 'VACANT') return 'gray';
  if (value === 'MOVED_OUT') return 'danger';
  if (value === 'TEMPORARY' || value === 'TEMPORARILY_AWAY') return 'warning';
  return 'success';
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB');
}

function makePage(content, page, size) {
  const totalElements = content.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * size;
  return {
    content: content.slice(start, start + size),
    number: safePage,
    totalPages,
    totalElements,
    first: safePage === 0,
    last: safePage >= totalPages - 1
  };
}

function appendQuery(url, params) {
  const target = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'ALL') {
      target.searchParams.set(key, value);
    }
  });
  return target.toString();
}

async function apiJson(path, options = {}) {
  const tokenStr = sessionStorage.getItem('apartment_mgmt_session');
  let token = null;
  if (tokenStr) {
    try {
      const sessionObj = JSON.parse(tokenStr);
      token = sessionObj.token || sessionObj;
      if (typeof token === 'object') token = token.token;
    } catch (e) { }
  }

  const response = await fetch(`${API_ROOT}${path}`, {
    headers: { 
      'Content-Type': 'application/json', 
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}) 
    },
    ...options
  });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const parsed = await response.json();
      message = parsed.message || message;
    } catch {
      // Keep status message.
    }
    throw new Error(message);
  }
  const payload = await response.json();
  if (payload && payload.success === false) {
    throw new Error(payload.message || 'Request failed');
  }
  return payload?.data ?? payload;
}

async function tryApi(path, options) {
  state.apiMode = true;
  return await apiJson(path, options);
}

const DataService = {
  async loadStats() {
    return await tryApi('/stats');
  },

  async loadHouseholds() {
    const url = appendQuery(`${API_ROOT}/households`, {
      search: state.householdsSearch,
      status: state.householdStatus,
      page: state.householdsPage,
      size: state.householdsSize
    });
    return await tryApi(url.replace(API_ROOT, ''));
  },

  async loadResidents() {
    const url = appendQuery(`${API_ROOT}/residents`, {
      search: state.residentsSearch,
      status: state.residentStatus,
      gender: state.residentGender,
      householdId: state.residentHouseholdId,
      page: state.residentsPage,
      size: state.residentsSize
    });
    return await tryApi(url.replace(API_ROOT, ''));
  },

  async getHousehold(id) {
    if (!id) return null;
    return await tryApi(`/households/${encodeURIComponent(id)}`);
  },

  async getResident(id) {
    if (!id) return null;
    return await tryApi(`/residents/${encodeURIComponent(id)}`);
  },

  async saveHousehold(payload, actor) {
    const isEdit = Boolean(state.editingHouseholdId);
    const path = isEdit
      ? `/households/${encodeURIComponent(state.editingHouseholdId)}?actor=${encodeURIComponent(actor)}`
      : `/households?actor=${encodeURIComponent(actor)}`;
    return await tryApi(path, {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteHousehold(id, actor) {
    return await tryApi(`/households/${encodeURIComponent(id)}?actor=${encodeURIComponent(actor)}`, { method: 'DELETE' });
  },

  async saveResident(payload, actor) {
    const isEdit = Boolean(state.editingResidentId);
    const path = isEdit
      ? `/residents/${encodeURIComponent(state.editingResidentId)}?actor=${encodeURIComponent(actor)}`
      : `/residents?actor=${encodeURIComponent(actor)}`;
    return await tryApi(path, {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteResident(id, actor) {
    return await tryApi(`/residents/${encodeURIComponent(id)}?actor=${encodeURIComponent(actor)}`, { method: 'DELETE' });
  },

  async addMember(householdId, residentId, actor) {
    return await tryApi(`/households/${encodeURIComponent(householdId)}/members/${encodeURIComponent(residentId)}?actor=${encodeURIComponent(actor)}`, { method: 'POST' });
  },

  async removeMember(householdId, residentId, actor) {
    return await tryApi(`/households/${encodeURIComponent(householdId)}/members/${encodeURIComponent(residentId)}?actor=${encodeURIComponent(actor)}`, { method: 'DELETE' });
  },

  async globalSearch() {
    const url = appendQuery(`${API_ROOT}/search`, { q: state.globalSearch, type: state.globalType });
    return await tryApi(url.replace(API_ROOT, ''));
  },

  async loadActivity() {
    return await tryApi('/activity?limit=50');
  },

  async resetLocal() {
    throw new Error('Reset local is disabled in MySQL-only mode.');
  },

  async export(kind) {
    window.open(`${API_ROOT}/export/${kind}`, '_blank');
  }
};

function enrichResident(resident, households) {
  const household = households.find(h => h.id === resident.householdId);
  return {
    ...resident,
    apartmentNo: household?.apartmentNo || '',
    householdHeadName: household?.headName || ''
  };
}

function renderBadge(status) {
  return `<span class="rm-badge ${statusClass(status)}">${esc(statusLabel(status))}</span>`;
}

function renderPager(page, prefix) {
  const current = (page.number || 0) + 1;
  const total = page.totalPages || 1;
  return `
    <div class="rm-pager">
      <button class="rm-btn sec" data-action="${prefix}-prev" ${page.first ? 'disabled' : ''}>Previous</button>
      <span>${current} / ${total} (${page.totalElements || 0})</span>
      <button class="rm-btn sec" data-action="${prefix}-next" ${page.last ? 'disabled' : ''}>Next</button>
    </div>
  `;
}

function readHouseholdForm(container) {
  return {
    code: container.querySelector('#rm-hh-code').value.trim(),
    apartmentNo: container.querySelector('#rm-hh-apartment').value.trim(),
    floor: Number(container.querySelector('#rm-hh-floor').value) || 0,
    area: Number(container.querySelector('#rm-hh-area').value) || 0,
    headName: container.querySelector('#rm-hh-head').value.trim(),
    phone: container.querySelector('#rm-hh-phone').value.trim(),
    status: container.querySelector('#rm-hh-status').value,
    note: container.querySelector('#rm-hh-note').value.trim(),
    motorcycleCount: Number(container.querySelector('#rm-hh-motos').value) || 0,
    carCount: Number(container.querySelector('#rm-hh-cars').value) || 0
  };
}

function readResidentForm(container) {
  return {
    fullName: container.querySelector('#rm-res-name').value.trim(),
    gender: container.querySelector('#rm-res-gender').value,
    dateOfBirth: container.querySelector('#rm-res-dob').value || null,
    identityNo: container.querySelector('#rm-res-identity').value.trim(),
    phone: container.querySelector('#rm-res-phone').value.trim(),
    hometown: container.querySelector('#rm-res-hometown').value.trim(),
    occupation: container.querySelector('#rm-res-occupation').value.trim(),
    relationshipToHead: container.querySelector('#rm-res-relationship').value.trim(),
    status: container.querySelector('#rm-res-status').value,
    householdId: container.querySelector('#rm-res-household').value
  };
}

function fillHouseholdForm(container, household) {
  state.editingHouseholdId = household?.id || null;
  container.querySelector('#rm-hh-title').textContent = household ? 'Update household' : 'Add household';
  container.querySelector('#rm-hh-code').value = household?.id || '';
  container.querySelector('#rm-hh-code').disabled = Boolean(household);
  container.querySelector('#rm-hh-apartment').value = household?.apartmentNo || '';
  container.querySelector('#rm-hh-floor').value = household?.floor ?? '';
  container.querySelector('#rm-hh-area').value = household?.area ?? '';
  container.querySelector('#rm-hh-head').value = household?.headName || '';
  container.querySelector('#rm-hh-phone').value = household?.phone || '';
  container.querySelector('#rm-hh-status').value = household?.status || 'OCCUPIED';
  container.querySelector('#rm-hh-note').value = household?.note || '';
  container.querySelector('#rm-hh-motos').value = household?.motorcycleCount ?? 0;
  container.querySelector('#rm-hh-cars').value = household?.carCount ?? 0;
}

function fillResidentForm(container, resident) {
  state.editingResidentId = resident?.id || null;
  container.querySelector('#rm-res-title').textContent = resident ? 'Update resident' : 'Add resident';
  container.querySelector('#rm-res-name').value = resident?.fullName || '';
  container.querySelector('#rm-res-gender').value = resident?.gender || 'Male';
  container.querySelector('#rm-res-dob').value = resident?.dateOfBirth || '';
  container.querySelector('#rm-res-identity').value = resident?.identityNo || '';
  container.querySelector('#rm-res-phone').value = resident?.phone || '';
  container.querySelector('#rm-res-hometown').value = resident?.hometown || '';
  container.querySelector('#rm-res-occupation').value = resident?.occupation || '';
  container.querySelector('#rm-res-relationship').value = resident?.relationshipToHead || '';
  container.querySelector('#rm-res-status').value = resident?.status || 'PERMANENT';
  container.querySelector('#rm-res-household').value = resident?.householdId || '';
}

export class ResidentsManager {
  static async render(container, currentUser, showToast) {
    if (currentUser && currentUser.role !== 'admin') {
      container.innerHTML = '<div class="rm-empty">Loading household info...</div>';
      try {
        let household = null;
        let members = [];
        const roomCode = currentUser.room ? (currentUser.room.startsWith('HH-') ? currentUser.room : 'HH-' + currentUser.room) : '';
        if (roomCode) {
          household = await DataService.getHousehold(roomCode);
        }
        if (!household && currentUser.identityNo) {
          const resPage = await DataService.loadResidents();
          const resident = resPage.content.find(r => r.identityNo === currentUser.identityNo);
          if (resident && resident.householdId) {
            household = await DataService.getHousehold(resident.householdId);
          }
        }
        if (household) {
          members = household.members || [];
          container.innerHTML = `
            <style>
              .bm-wrap { font-family: var(--font-family); color: var(--text-primary); }
              .bm-card { background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:18px; padding:20px; margin-bottom:20px; }
              .bm-card h2 { margin:0 0 16px; font-size:18px; color:var(--text-primary); }
              .bm-badge { display:inline-block; padding:4px 9px; border-radius:999px; background:var(--color-accent-light); color:var(--color-accent); font-size:12px; font-weight:700; }
              .bm-member-card { border:1px solid var(--border-glass); border-radius:14px; padding:14px; background:var(--bg-tertiary); }
              .bm-member-card p { margin:3px 0; color:var(--text-secondary); font-size:13px; }
              .bm-grid2 { display:grid; grid-template-columns:1fr 1.5fr; gap:20px; align-items:start; }
              @media(max-width:900px){ .bm-grid2{ grid-template-columns:1fr; } }
            </style>
            <div class="bm-wrap">
              <div class="chart-card" style="margin-bottom:20px; padding:16px 20px;">
                <h2 class="card-title" style="margin-bottom:4px;">My Household Information</h2>
                <p class="card-title-muted">Household details registered for unit ${esc(household.apartmentNo)}</p>
              </div>
              <div class="bm-grid2">
                <div class="bm-card">
                  <h2>Household Registry Details</h2>
                  <div style="display:flex; flex-direction:column; gap:12px;">
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                      <span style="color:var(--text-secondary); font-size:14px;">Household Code:</span>
                      <strong style="color:var(--color-primary); font-size:14px;">${esc(household.code || household.id)}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                      <span style="color:var(--text-secondary); font-size:14px;">Apartment:</span>
                      <strong style="color:var(--text-primary); font-size:14px;">${esc(household.apartmentNo)}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                      <span style="color:var(--text-secondary); font-size:14px;">Floor:</span>
                      <strong style="color:var(--text-primary); font-size:14px;">${household.floor || '-'}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                      <span style="color:var(--text-secondary); font-size:14px;">Area:</span>
                      <strong style="color:var(--text-primary); font-size:14px;">${household.area || '-'} m²</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                      <span style="color:var(--text-secondary); font-size:14px;">Head of Household:</span>
                      <strong style="color:var(--text-primary); font-size:14px;">${esc(household.headName)}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                      <span style="color:var(--text-secondary); font-size:14px;">Phone:</span>
                      <strong style="color:var(--text-primary); font-size:14px;">${esc(household.phone || '-')}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding-bottom:8px;">
                      <span style="color:var(--text-secondary); font-size:14px;">Status:</span>
                      <strong>${renderBadge(household.status)}</strong>
                    </div>
                  </div>
                </div>
                <div class="bm-card">
                  <h2>Household Members (${members.length})</h2>
                  <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:12px;">
                    ${members.map(r => `
                      <div class="bm-member-card">
                        <h3 style="margin:0 0 6px; font-size:15px; color:var(--text-primary);">${esc(r.fullName)}</h3>
                        <p>Gender: <strong>${esc(r.gender)}</strong></p>
                        <p>Citizen ID: <strong>${esc(r.identityNo)}</strong></p>
                        <p>Phone: <strong>${esc(r.phone || '-')}</strong></p>
                        <p>Occupation: <strong>${esc(r.occupation || '-')}</strong></p>
                        <p>Status: <strong>${esc(statusLabel(r.status))}</strong></p>
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
              .bm-wrap { font-family: var(--font-family); color: var(--text-primary); }
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
                      <strong style="color:var(--color-primary); font-size:14px;">${esc(currentUser.householdCode || '-')}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                      <span style="color:var(--text-secondary); font-size:14px;">Head of Household:</span>
                      <strong style="color:var(--text-primary); font-size:14px;">${esc(currentUser.householdHeadName || '-')}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                      <span style="color:var(--text-secondary); font-size:14px;">House Number:</span>
                      <strong style="color:var(--text-primary); font-size:14px;">${esc(currentUser.houseNo || '-')}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                      <span style="color:var(--text-secondary); font-size:14px;">Street:</span>
                      <strong style="color:var(--text-primary); font-size:14px;">${esc(currentUser.street || '-')}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                      <span style="color:var(--text-secondary); font-size:14px;">Ward / Commune:</span>
                      <strong style="color:var(--text-primary); font-size:14px;">${esc(currentUser.ward || '-')}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                      <span style="color:var(--text-secondary); font-size:14px;">District:</span>
                      <strong style="color:var(--text-primary); font-size:14px;">${esc(currentUser.district || '-')}</strong>
                    </div>
                  </div>
                </div>
                <div class="bm-card">
                  <h2>My Identity Details</h2>
                  <div style="display:grid; grid-template-columns:1fr; gap:12px;">
                    <div class="bm-member-card">
                      <h3 style="margin:0 0 6px; font-size:15px; color:var(--text-primary);">${esc(currentUser.fullname)}</h3>
                      <p>Alias (Bí danh): <strong>${esc(currentUser.alias || '-')}</strong></p>
                      <p>Citizen ID: <strong>${esc(currentUser.identityNo)}</strong></p>
                      <p>Phone: <strong>${esc(currentUser.phone)}</strong></p>
                      <p>Date of Birth: <strong>${esc(currentUser.dob)}</strong></p>
                      <p>Place of Birth: <strong>${esc(currentUser.birthPlace)}</strong></p>
                      <p>Hometown (Nguyên quán): <strong>${esc(currentUser.hometown)}</strong></p>
                      <p>Ethnicity: <strong>${esc(currentUser.ethnicity)}</strong></p>
                      <p>Occupation: <strong>${esc(currentUser.occupation)}</strong></p>
                      <p>Workplace: <strong>${esc(currentUser.workplace)}</strong></p>
                      <p>CCCD Issue Date: <strong>${esc(currentUser.issueDate)}</strong></p>
                      <p>CCCD Issue Place: <strong>${esc(currentUser.issuePlace)}</strong></p>
                      <p>Previous Residence: <strong>${esc(currentUser.previousResidence)}</strong></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
        }
      } catch (e) {
        container.innerHTML = `<div class="rm-empty" style="color:var(--color-danger);">Error loading household details: ${e.message}</div>`;
      }
      return;
    }

    container.innerHTML = `
      <style>
        .rm-wrap { font-family: var(--font-family); }
        .rm-header { display:flex; justify-content:space-between; gap:12px; align-items:center; flex-wrap:wrap; }
        .rm-header-actions { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .rm-mode { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.5px; padding:5px 9px; border-radius:999px; border:1px solid var(--border-glass); color:var(--text-secondary); background:var(--bg-tertiary); }
        .rm-mode.live { color:var(--color-success); background:var(--color-success-light); }
        .rm-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin:20px 0; }
        .rm-stat { background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:16px; padding:18px; }
        .rm-stat span { display:block; font-size:28px; font-weight:800; color:var(--text-primary); }
        .rm-stat p { margin:6px 0 0; color:var(--text-muted); font-size:12px; text-transform:uppercase; font-weight:700; }
        .rm-tabs { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
        .rm-tab { border:none; background:var(--bg-tertiary); color:var(--text-secondary); padding:10px 16px; border-radius:999px; cursor:pointer; font-weight:700; font-size:13px; }
        .rm-tab.active { background:var(--color-primary); color:#fff; }
        .rm-panel { display:none; } .rm-panel.active { display:block; }
        .rm-grid { display:grid; grid-template-columns:minmax(300px,380px) 1fr; gap:20px; align-items:start; }
        .rm-card { background:var(--bg-secondary); border:1px solid var(--border-glass); border-radius:16px; padding:20px; margin-bottom:20px; }
        .rm-card h2,.rm-card h3 { margin:0 0 14px; color:var(--text-primary); }
        .rm-card h2 { font-size:17px; } .rm-card h3 { font-size:15px; }
        .rm-form { display:flex; flex-direction:column; gap:11px; }
        .rm-field { display:flex; flex-direction:column; gap:5px; }
        .rm-field label { font-size:12px; color:var(--text-secondary); font-weight:700; }
        .rm-field input,.rm-field select,.rm-field textarea { background:var(--bg-tertiary); border:1px solid var(--border-glass); border-radius:10px; color:var(--text-primary); padding:9px 11px; font-size:13px; outline:none; font-family:var(--font-family); width:100%; }
        .rm-field input:focus,.rm-field select:focus,.rm-field textarea:focus { border-color:var(--color-primary); box-shadow:0 0 0 2px var(--color-primary-light); }
        .rm-2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .rm-actions { display:flex; gap:8px; flex-wrap:wrap; }
        .rm-btn { border:none; border-radius:10px; cursor:pointer; font-weight:700; font-family:var(--font-family); font-size:12px; padding:8px 12px; transition:var(--transition-fast); }
        .rm-btn:disabled { opacity:.5; cursor:not-allowed; }
        .rm-btn.pri { background:var(--color-primary); color:#fff; }
        .rm-btn.sec { background:var(--bg-tertiary); color:var(--text-secondary); }
        .rm-btn.dan { background:var(--color-danger-light); color:var(--color-danger); }
        .rm-btn.suc { background:var(--color-success-light); color:var(--color-success); }
        .rm-btn:hover:not(:disabled).pri { background:var(--color-primary-hover); }
        .rm-btn:hover:not(:disabled).sec { color:var(--text-primary); background:var(--border-glass-hover); }
        .rm-btn:hover:not(:disabled).dan { background:var(--color-danger); color:#fff; }
        .rm-toolbar { display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px; }
        .rm-filter { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .rm-search,.rm-select { background:var(--bg-tertiary); border:1px solid var(--border-glass); border-radius:10px; color:var(--text-primary); padding:9px 11px; font-size:13px; outline:none; font-family:var(--font-family); }
        .rm-search { min-width:240px; }
        .rm-table-wrap { overflow-x:auto; }
        .rm-table { width:100%; border-collapse:collapse; min-width:760px; }
        .rm-table th { background:var(--bg-tertiary); color:var(--text-muted); font-size:11px; text-transform:uppercase; padding:10px 12px; text-align:left; }
        .rm-table td { border-bottom:1px solid var(--border-glass); color:var(--text-primary); font-size:13px; padding:11px 12px; vertical-align:middle; }
        .rm-muted { color:var(--text-muted); font-size:12px; }
        .rm-badge { display:inline-flex; padding:4px 9px; border-radius:999px; font-size:11px; font-weight:800; }
        .rm-badge.success { background:var(--color-success-light); color:var(--color-success); }
        .rm-badge.warning { background:var(--color-warning-light); color:var(--color-warning); }
        .rm-badge.danger { background:var(--color-danger-light); color:var(--color-danger); }
        .rm-badge.gray { background:var(--bg-tertiary); color:var(--text-muted); }
        .rm-pager { display:flex; justify-content:flex-end; align-items:center; gap:10px; margin-top:12px; color:var(--text-secondary); font-size:12px; }
        .rm-detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .rm-member-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:10px; }
        .rm-member { background:var(--bg-tertiary); border:1px solid var(--border-glass); border-radius:12px; padding:12px; }
        .rm-member h4 { margin:0 0 6px; font-size:14px; color:var(--text-primary); }
        .rm-member p { margin:3px 0; color:var(--text-secondary); font-size:12px; }
        .rm-empty { color:var(--text-muted); text-align:center; padding:22px; }
        @media(max-width:1000px){ .rm-grid,.rm-detail-grid{ grid-template-columns:1fr; } .rm-stats{ grid-template-columns:repeat(2,1fr); } }
        @media(max-width:560px){ .rm-stats{ grid-template-columns:1fr; } .rm-search{ min-width:0; width:100%; } }
      </style>
      <div class="rm-wrap">
        <div class="chart-card rm-header">
          <div>
            <h2 class="card-title" style="margin-bottom:4px;">Resident Management</h2>
            <p class="card-title-muted">Households, residents, apartments, and registry audit trail</p>
          </div>
          <div class="rm-header-actions">
            <span class="rm-mode live" id="rm-mode">MySQL Database</span>
            <button class="rm-btn sec" data-action="export-households">Export Households</button>
            <button class="rm-btn sec" data-action="export-residents">Export Residents</button>
          </div>
        </div>
        <div class="rm-stats" id="rm-stats"></div>
        <div class="rm-tabs">
          <button class="rm-tab active" data-tab="households">Households</button>
          <button class="rm-tab" data-tab="residents">Residents</button>
          <button class="rm-tab" data-tab="search">Search</button>
          <button class="rm-tab" data-tab="activity">Activity</button>
        </div>
        <div class="rm-panel active" id="rm-panel-households"></div>
        <div class="rm-panel" id="rm-panel-residents"></div>
        <div class="rm-panel" id="rm-panel-search"></div>
        <div class="rm-panel" id="rm-panel-activity"></div>
      </div>
    `;

    const actor = () => window.sessionStorage?.getItem('apartment_mgmt_session')
      ? JSON.parse(window.sessionStorage.getItem('apartment_mgmt_session')).username
      : 'admin';

    const setLoading = (message = 'Loading...') => {
      container.querySelector(`#rm-panel-${state.activeTab}`).innerHTML = `<div class="rm-card rm-empty">${message}</div>`;
    };

    const refresh = async () => {
      try {
        state.stats = await DataService.loadStats();
        state.householdPageData = await DataService.loadHouseholds();
        state.residentPageData = await DataService.loadResidents();
        state.households = state.householdPageData.content || [];
        state.residents = state.residentPageData.content || [];
        state.searchResults = await DataService.globalSearch();
        state.activityLogs = await DataService.loadActivity();
        renderAll();
      } catch (error) {
        showToast(error.message || 'Unable to load resident data', 'error');
        renderAll();
      }
    };

    const renderStats = () => {
      const stats = state.stats || {};
      container.querySelector('#rm-stats').innerHTML = `
        <div class="rm-stat"><span>${stats.totalHouseholds ?? 0}</span><p>Households</p></div>
        <div class="rm-stat"><span>${stats.totalResidents ?? 0}</span><p>Residents</p></div>
        <div class="rm-stat"><span>${stats.occupiedHouseholds ?? 0}</span><p>Occupied</p></div>
        <div class="rm-stat"><span>${(stats.temporaryResidents ?? 0) + (stats.temporarilyAwayResidents ?? 0)}</span><p>Temporary / Away</p></div>
      `;
      const badge = container.querySelector('#rm-mode');
      badge.textContent = 'MySQL Database';
      badge.classList.add('live');
    };

    const householdOptions = (selected = '') => {
      const allHouseholds = [...state.households];
      return `<option value="">No household</option>` + allHouseholds
        .map(h => `<option value="${esc(h.id)}" ${h.id === selected ? 'selected' : ''}>${esc(h.apartmentNo || h.id)} - ${esc(h.headName || h.ownerName || '')}</option>`)
        .join('');
    };

    const renderHouseholds = async () => {
      const panel = container.querySelector('#rm-panel-households');
      const page = state.householdPageData || emptyPage();
      const selected = await DataService.getHousehold(state.selectedHouseholdId);
      const rows = page.content?.map(h => `
        <tr>
          <td><strong>${esc(h.id)}</strong><br><span class="rm-muted">${esc(h.apartmentNo || '-')}</span></td>
          <td>${esc(h.headName || h.ownerName || '-')}<br><span class="rm-muted">${esc(h.phone || '-')}</span></td>
          <td>${h.floor ?? '-'} / ${esc(h.area ?? '-')} m2</td>
          <td>${h.memberCount ?? h.membersCount ?? 0}</td>
          <td>${renderBadge(h.status)}</td>
          <td><div class="rm-actions">
            <button class="rm-btn pri" data-action="select-household" data-id="${esc(h.id)}">Open</button>
            <button class="rm-btn sec" data-action="edit-household" data-id="${esc(h.id)}">Edit</button>
            <button class="rm-btn dan" data-action="delete-household" data-id="${esc(h.id)}">Delete</button>
          </div></td>
        </tr>
      `).join('') || `<tr><td colspan="6" class="rm-empty">No households found.</td></tr>`;

      panel.innerHTML = `
        <div class="rm-grid">
          <div class="rm-card">
            <h2 id="rm-hh-title">Add household</h2>
            <form class="rm-form" id="rm-hh-form">
              <div class="rm-2">
                <div class="rm-field"><label>Household code</label><input id="rm-hh-code" required placeholder="HH-A1201"></div>
                <div class="rm-field"><label>Apartment</label><input id="rm-hh-apartment" required placeholder="A1201"></div>
              </div>
              <div class="rm-2">
                <div class="rm-field"><label>Floor</label><input id="rm-hh-floor" type="number" min="0"></div>
                <div class="rm-field"><label>Area (m2)</label><input id="rm-hh-area" type="number" min="0" step="0.1"></div>
              </div>
              <div class="rm-field"><label>Household head</label><input id="rm-hh-head" required></div>
              <div class="rm-2">
                <div class="rm-field"><label>Phone</label><input id="rm-hh-phone"></div>
                <div class="rm-field"><label>Status</label><select id="rm-hh-status">${HOUSEHOLD_STATUSES.map(s => `<option value="${s}">${statusLabel(s)}</option>`).join('')}</select></div>
              </div>
              <div class="rm-2">
                <div class="rm-field"><label>Motorcycles</label><input id="rm-hh-motos" type="number" min="0" value="0"></div>
                <div class="rm-field"><label>Cars</label><input id="rm-hh-cars" type="number" min="0" value="0"></div>
              </div>
              <div class="rm-field"><label>Note</label><textarea id="rm-hh-note" rows="3"></textarea></div>
              <div class="rm-actions">
                <button class="rm-btn pri" type="submit">Save Household</button>
                <button class="rm-btn sec" type="button" data-action="clear-household-form">Clear</button>
              </div>
            </form>
          </div>
          <div class="rm-card">
            <div class="rm-toolbar">
              <h2 style="margin:0;">Household List</h2>
              <div class="rm-filter">
                <input class="rm-search" id="rm-hh-search" placeholder="Search households..." value="${esc(state.householdsSearch)}">
                <select class="rm-select" id="rm-hh-status-filter">
                  <option value="ALL">All statuses</option>
                  ${HOUSEHOLD_STATUSES.map(s => `<option value="${s}" ${state.householdStatus === s ? 'selected' : ''}>${statusLabel(s)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="rm-table-wrap">
              <table class="rm-table">
                <thead><tr><th>Code / Apartment</th><th>Head</th><th>Floor / Area</th><th>Members</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
            ${renderPager(page, 'households')}
          </div>
        </div>
        ${renderHouseholdDetail(selected)}
      `;
      fillHouseholdForm(panel, null);
    };

    const renderHouseholdDetail = selected => {
      if (!selected) {
        return `<div class="rm-card rm-empty">Select a household to review members and apartment details.</div>`;
      }
      const members = selected.members || [];
      const available = state.residents.filter(r => r.householdId !== selected.id);
      return `
        <div class="rm-card">
          <div class="rm-toolbar">
            <div>
              <h2 style="margin:0;">${esc(selected.apartmentNo || selected.id)}</h2>
              <p class="rm-muted" style="margin-top:4px;">${esc(selected.id)} - ${esc(selected.headName || selected.ownerName || '')}</p>
            </div>
            ${renderBadge(selected.status)}
          </div>
          <div class="rm-detail-grid">
            <div>
              <h3>Apartment Details</h3>
              <p class="rm-muted">Floor ${selected.floor ?? '-'} | ${selected.area ?? 0} m2 | ${selected.motorcycleCount ?? 0} motorcycles | ${selected.carCount ?? 0} cars</p>
              <p class="rm-muted">${esc(selected.note || '')}</p>
              <div class="rm-actions" style="margin-top:12px;">
                <select class="rm-select" id="rm-add-member-select">
                  <option value="">Add existing resident</option>
                  ${available.map(r => `<option value="${esc(r.id)}">${esc(r.fullName)} - ${esc(r.identityNo)}</option>`).join('')}
                </select>
                <button class="rm-btn pri" data-action="add-member" data-id="${esc(selected.id)}">Add</button>
              </div>
            </div>
            <div>
              <h3>Members</h3>
              <div class="rm-member-grid">
                ${members.length ? members.map(member => `
                  <div class="rm-member">
                    <h4>${esc(member.fullName)}</h4>
                    <p>${esc(member.identityNo)}</p>
                    <p>${esc(member.relationshipToHead || '-')} | ${statusLabel(member.status)}</p>
                    <div class="rm-actions" style="margin-top:8px;">
                      <button class="rm-btn sec" data-action="edit-resident" data-id="${esc(member.id)}">Edit</button>
                      <button class="rm-btn dan" data-action="remove-member" data-household="${esc(selected.id)}" data-id="${esc(member.id)}">Remove</button>
                    </div>
                  </div>
                `).join('') : '<div class="rm-empty">No members assigned.</div>'}
              </div>
            </div>
          </div>
        </div>
      `;
    };

    const renderResidents = () => {
      const panel = container.querySelector('#rm-panel-residents');
      const page = state.residentPageData || emptyPage();
      const rows = page.content?.map(r => `
        <tr>
          <td><strong>${esc(r.fullName)}</strong><br><span class="rm-muted">${esc(r.gender || '-')} - ${formatDate(r.dateOfBirth)}</span></td>
          <td>${esc(r.identityNo)}</td>
          <td>${esc(r.apartmentNo || r.householdId || 'No household')}</td>
          <td>${renderBadge(r.status)}</td>
          <td><div class="rm-actions">
            <button class="rm-btn sec" data-action="edit-resident" data-id="${esc(r.id)}">Edit</button>
            <button class="rm-btn dan" data-action="delete-resident" data-id="${esc(r.id)}">Delete</button>
          </div></td>
        </tr>
      `).join('') || `<tr><td colspan="5" class="rm-empty">No residents found.</td></tr>`;

      panel.innerHTML = `
        <div class="rm-grid">
          <div class="rm-card">
            <h2 id="rm-res-title">Add resident</h2>
            <form class="rm-form" id="rm-res-form">
              <div class="rm-field"><label>Full name</label><input id="rm-res-name" required></div>
              <div class="rm-2">
                <div class="rm-field"><label>Gender</label><select id="rm-res-gender">${GENDERS.map(g => `<option>${g}</option>`).join('')}</select></div>
                <div class="rm-field"><label>Date of birth</label><input id="rm-res-dob" type="date"></div>
              </div>
              <div class="rm-field"><label>Citizen ID</label><input id="rm-res-identity" required></div>
              <div class="rm-2">
                <div class="rm-field"><label>Phone</label><input id="rm-res-phone"></div>
                <div class="rm-field"><label>Status</label><select id="rm-res-status">${RESIDENT_STATUSES.map(s => `<option value="${s}">${statusLabel(s)}</option>`).join('')}</select></div>
              </div>
              <div class="rm-2">
                <div class="rm-field"><label>Hometown</label><input id="rm-res-hometown"></div>
                <div class="rm-field"><label>Occupation</label><input id="rm-res-occupation"></div>
              </div>
              <div class="rm-2">
                <div class="rm-field"><label>Relationship</label><input id="rm-res-relationship"></div>
                <div class="rm-field"><label>Household</label><select id="rm-res-household">${householdOptions()}</select></div>
              </div>
              <div class="rm-actions">
                <button class="rm-btn pri" type="submit">Save Resident</button>
                <button class="rm-btn sec" type="button" data-action="clear-resident-form">Clear</button>
              </div>
            </form>
          </div>
          <div class="rm-card">
            <div class="rm-toolbar">
              <h2 style="margin:0;">Resident List</h2>
              <div class="rm-filter">
                <input class="rm-search" id="rm-res-search" placeholder="Search residents..." value="${esc(state.residentsSearch)}">
                <select class="rm-select" id="rm-res-status-filter">
                  <option value="ALL">All statuses</option>
                  ${RESIDENT_STATUSES.map(s => `<option value="${s}" ${state.residentStatus === s ? 'selected' : ''}>${statusLabel(s)}</option>`).join('')}
                </select>
                <select class="rm-select" id="rm-res-gender-filter">
                  <option value="">All genders</option>
                  ${GENDERS.map(g => `<option value="${g}" ${state.residentGender === g ? 'selected' : ''}>${g}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="rm-table-wrap">
              <table class="rm-table">
                <thead><tr><th>Resident</th><th>Citizen ID</th><th>Apartment</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
            ${renderPager(page, 'residents')}
          </div>
        </div>
      `;
      fillResidentForm(panel, null);
    };

    const renderSearch = () => {
      const panel = container.querySelector('#rm-panel-search');
      panel.innerHTML = `
        <div class="rm-card">
          <div class="rm-toolbar">
            <h2 style="margin:0;">Global Search</h2>
            <div class="rm-filter">
              <input class="rm-search" id="rm-global-search" placeholder="Name, citizen ID, phone, apartment..." value="${esc(state.globalSearch)}">
              <select class="rm-select" id="rm-global-type">
                <option value="all" ${state.globalType === 'all' ? 'selected' : ''}>All</option>
                <option value="resident" ${state.globalType === 'resident' ? 'selected' : ''}>Residents</option>
                <option value="household" ${state.globalType === 'household' ? 'selected' : ''}>Households</option>
              </select>
            </div>
          </div>
          <div class="rm-table-wrap">
            <table class="rm-table">
              <thead><tr><th>Type</th><th>Main Info</th><th>Details</th><th>Action</th></tr></thead>
              <tbody>
                ${state.searchResults.length ? state.searchResults.map(row => `
                  <tr>
                    <td>${esc(row.type)}</td>
                    <td><strong>${esc(row.mainInfo)}</strong></td>
                    <td>${esc(row.detail)}</td>
                    <td><button class="rm-btn sec" data-action="${row.type === 'Household' ? 'select-household' : 'edit-resident'}" data-id="${esc(row.id)}">Open</button></td>
                  </tr>
                `).join('') : '<tr><td colspan="4" class="rm-empty">No matching results.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
    };

    const renderActivity = () => {
      const panel = container.querySelector('#rm-panel-activity');
      panel.innerHTML = `
        <div class="rm-card">
          <h2>Activity Log</h2>
          <div class="rm-table-wrap">
            <table class="rm-table">
              <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead>
              <tbody>
                ${state.activityLogs.length ? state.activityLogs.map(log => `
                  <tr>
                    <td>${formatDate(log.createdAt)}<br><span class="rm-muted">${new Date(log.createdAt).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}</span></td>
                    <td>${esc(log.actor || 'system')}</td>
                    <td>${esc(log.action)}</td>
                    <td>${esc(log.targetType)} / ${esc(log.targetId)}</td>
                    <td>${esc(log.detail)}</td>
                  </tr>
                `).join('') : '<tr><td colspan="5" class="rm-empty">No recent activity.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
    };

    const renderAll = async () => {
      renderStats();
      container.querySelectorAll('.rm-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === state.activeTab));
      container.querySelectorAll('.rm-panel').forEach(panel => panel.classList.toggle('active', panel.id === `rm-panel-${state.activeTab}`));
      if (state.activeTab === 'households') await renderHouseholds();
      if (state.activeTab === 'residents') renderResidents();
      if (state.activeTab === 'search') renderSearch();
      if (state.activeTab === 'activity') renderActivity();
    };

    container.addEventListener('click', async event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      const id = button.dataset.id;
      try {
        if (action === 'households-prev') state.householdsPage -= 1;
        if (action === 'households-next') state.householdsPage += 1;
        if (action === 'residents-prev') state.residentsPage -= 1;
        if (action === 'residents-next') state.residentsPage += 1;
        if (action === 'select-household') { state.selectedHouseholdId = id; state.activeTab = 'households'; }
        if (action === 'edit-household') {
          const household = await DataService.getHousehold(id);
          fillHouseholdForm(container, household);
          return;
        }
        if (action === 'delete-household') {
          if (!confirm(`Delete household ${id}?`)) return;
          await DataService.deleteHousehold(id, actor());
          if (state.selectedHouseholdId === id) state.selectedHouseholdId = null;
          showToast('Household deleted', 'success');
        }
        if (action === 'clear-household-form') { fillHouseholdForm(container, null); return; }
        if (action === 'edit-resident') {
          const resident = await DataService.getResident(id);
          state.activeTab = 'residents';
          await renderAll();
          fillResidentForm(container, resident);
          return;
        }
        if (action === 'delete-resident') {
          if (!confirm(`Delete resident ${id}?`)) return;
          await DataService.deleteResident(id, actor());
          showToast('Resident deleted', 'success');
        }
        if (action === 'clear-resident-form') { fillResidentForm(container, null); return; }
        if (action === 'add-member') {
          const select = container.querySelector('#rm-add-member-select');
          if (!select?.value) { showToast('Select a resident first', 'warning'); return; }
          await DataService.addMember(id, select.value, actor());
          showToast('Member added', 'success');
        }
        if (action === 'remove-member') {
          await DataService.removeMember(button.dataset.household, id, actor());
          showToast('Member removed', 'success');
        }

        if (action === 'export-households') { await DataService.export('households'); return; }
        if (action === 'export-residents') { await DataService.export('residents'); return; }
        await refresh();
      } catch (error) {
        showToast(error.message || 'Action failed', 'error');
      }
    });

    container.addEventListener('submit', async event => {
      event.preventDefault();
      try {
        if (event.target.id === 'rm-hh-form') {
          await DataService.saveHousehold(readHouseholdForm(container), actor());
          fillHouseholdForm(container, null);
          showToast('Household saved', 'success');
          await refresh();
        }
        if (event.target.id === 'rm-res-form') {
          await DataService.saveResident(readResidentForm(container), actor());
          fillResidentForm(container, null);
          showToast('Resident saved', 'success');
          await refresh();
        }
      } catch (error) {
        showToast(error.message || 'Save failed', 'error');
      }
    });

    container.addEventListener('input', event => {
      if (event.target.id === 'rm-hh-search') {
        state.householdsSearch = event.target.value;
        state.householdsPage = 0;
        refresh();
      }
      if (event.target.id === 'rm-res-search') {
        state.residentsSearch = event.target.value;
        state.residentsPage = 0;
        refresh();
      }
      if (event.target.id === 'rm-global-search') {
        state.globalSearch = event.target.value;
        refresh();
      }
    });

    container.addEventListener('change', event => {
      if (event.target.id === 'rm-hh-status-filter') {
        state.householdStatus = event.target.value;
        state.householdsPage = 0;
        refresh();
      }
      if (event.target.id === 'rm-res-status-filter') {
        state.residentStatus = event.target.value;
        state.residentsPage = 0;
        refresh();
      }
      if (event.target.id === 'rm-res-gender-filter') {
        state.residentGender = event.target.value;
        state.residentsPage = 0;
        refresh();
      }
      if (event.target.id === 'rm-global-type') {
        state.globalType = event.target.value;
        refresh();
      }
    });

    container.querySelectorAll('.rm-tab').forEach(tab => {
      tab.addEventListener('click', async () => {
        state.activeTab = tab.dataset.tab;
        setLoading();
        await refresh();
      });
    });

    setLoading();
    refresh();
  }
}
