import { API, cleanApiErrorMessage } from '../api.js';

const API_ROOT = window.RESIDENTS_API_ROOT || 'http://localhost:8080/api/residents';
let residentMemoryStore = null;

const HOUSEHOLD_STATUSES = ['OCCUPIED', 'TEMPORARILY_AWAY', 'MOVED_OUT', 'VACANT'];
const RESIDENT_STATUSES = ['PERMANENT', 'TEMPORARY', 'TEMPORARILY_AWAY', 'MOVED_OUT', 'DECEASED'];
const GENDERS = ['Male', 'Female', 'Other'];
const VN_CITIZEN_ID_RE = /^(001|002|004|006|008|010|011|012|014|015|017|019|020|022|024|025|026|027|030|031|033|034|035|036|037|038|040|042|044|045|046|048|049|051|052|054|056|058|060|062|064|066|067|068|070|072|074|075|077|079|080|082|083|084|086|087|089|091|092|093|094|095|096)\d{9}$/;
const VN_MOBILE_RE = /^0[35789]\d{8}$/;
const VN_PLATE_RE = /^\d{2}[A-Z][0-9A-Z]?-\d{3}\.\d{2}$/;

const state = {
  apiMode: true,
  activeTab: 'households',
  selectedHouseholdId: null,
  editingHouseholdId: null,
  editingResidentId: null,
  editingVehicleId: null, // ID xe đang sửa đổi
  householdsPage: 0,
  residentsPage: 0,
  vehiclesPage: 0, // Trang xe hiện tại
  householdsSize: 8,
  residentsSize: 8,
  vehiclesSize: 8, // Số lượng xe mỗi trang
  householdsSearch: '',
  residentsSearch: '',
  vehiclesSearchPlate: '', // Tìm kiếm theo biển số xe
  vehiclesSearchType: 'ALL', // Bộ lọc loại xe
  vehiclesSearchHouseholdId: '', // Bộ lọc hộ gia đình
  householdStatus: 'ALL',
  residentStatus: 'ALL',
  residentGender: '',
  residentHouseholdId: '',
  globalSearch: '',
  globalType: 'all',
  stats: null,
  households: [],
  residents: [],
  vehicles: [], // Danh sách xe cộ
  householdPageData: emptyPage(),
  residentPageData: emptyPage(),
  vehiclePageData: emptyPage(), // Phân trang dữ liệu xe cộ
  searchResults: [],
  activityLogs: [],
  allHouseholdsForSelect: [],
  allResidentsForSelect: []
};

function emptyPage() {
  return { content: [], number: 0, totalPages: 1, totalElements: 0, first: true, last: true };
}

function isFutureDate(value) {
  return Boolean(value) && value > new Date().toISOString().slice(0, 10);
}

function requireCitizenId(value, label = 'Citizen ID') {
  const normalized = String(value || '').trim();
  if (!VN_CITIZEN_ID_RE.test(normalized)) {
    throw new Error(`${label} must contain exactly 12 digits and start with a valid Vietnamese province/city code.`);
  }
  return normalized;
}

function optionalCitizenId(value, label = 'Citizen ID') {
  const normalized = String(value || '').trim();
  return normalized ? requireCitizenId(normalized, label) : '';
}

function optionalVietnamMobile(value, label = 'Phone') {
  const normalized = String(value || '').trim();
  if (normalized && !VN_MOBILE_RE.test(normalized)) {
    throw new Error(`${label} must be a Vietnamese mobile number with 10 digits starting with 03, 05, 07, 08 or 09.`);
  }
  return normalized;
}

function validateHouseholdPayload(payload) {
  optionalVietnamMobile(payload.phone, 'Phone');
  optionalCitizenId(payload.headIdentityNo, 'Head Citizen ID');
  if (payload.status === 'VACANT' && payload.headIdentityNo) {
    throw new Error('Vacant households cannot have a household head.');
  }
  if (Number(payload.floor || 0) < 0) throw new Error('Floor must be zero or greater.');
  if (Number(payload.area || 0) <= 0) throw new Error('Area must be greater than 0.');
  if (Number(payload.motorcycleCount || 0) < 0 || Number(payload.carCount || 0) < 0) {
    throw new Error('Vehicle counts must be zero or greater.');
  }
  if (isFutureDate(payload.registrationDate)) throw new Error('Registration date cannot be in the future.');
}

function validateResidentPayload(payload) {
  requireCitizenId(payload.identityNo);
  optionalVietnamMobile(payload.phone, 'Phone');
  if (isFutureDate(payload.dateOfBirth)) throw new Error('Date of birth cannot be in the future.');
  if (isFutureDate(payload.issueDate)) throw new Error('Citizen ID issue date cannot be in the future.');
  if (isFutureDate(payload.dateOfDeath)) throw new Error('Date of death cannot be in the future.');
  const alive = payload.alive !== false && payload.status !== 'DECEASED';
  if (alive && payload.dateOfDeath) throw new Error('Alive residents cannot have a date of death.');
  if (!alive && !payload.dateOfDeath) throw new Error('Date of death is required when resident is not alive.');
}

function validateVehiclePayload(payload) {
  const plate = String(payload.plateNumber || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!VN_PLATE_RE.test(plate)) throw new Error('Vehicle plate number must use Vietnamese format, for example 29A1-123.45.');
  if (payload.registrationDate && isFutureDate(payload.registrationDate)) {
    throw new Error('Vehicle registration date cannot be in the future.');
  }
}

function findResidentByIdentityNo(identityNo) {
  const identity = norm(identityNo);
  if (!identity) return null;
  const pools = [
    state.allResidentsForSelect || [],
    state.residents || [],
    loadStore().residents || []
  ];
  for (const pool of pools) {
    const resident = pool.find(r => norm(r.identityNo) === identity);
    if (resident) return resident;
  }
  return null;
}

function seedStore() {
  const households = [
    {
      id: 'HH-A1201',
      code: 'HH-A1201',
      apartmentNo: 'A1201',
      floor: 12,
      area: 72.5,
      headName: 'Nguyen Van An',
      headIdentityNo: '001085000111',
      phone: '0987654321',
      houseNo: '12',
      street: 'Tran Duy Hung',
      ward: 'Trung Hoa',
      district: 'Cau Giay',
      registrationDate: '2024-01-10',
      status: 'OCCUPIED',
      note: 'Completed permanent residence registration.',
      memberCount: 2,
      activeMemberCount: 2,
      motorcycleCount: 2,
      carCount: 0
    },
    {
      id: 'HH-B0805',
      code: 'HH-B0805',
      apartmentNo: 'B0805',
      floor: 8,
      area: 65,
      headName: 'Tran Thi Binh',
      headIdentityNo: '031079000333',
      phone: '0911222333',
      houseNo: '8',
      street: 'Pham Hung',
      ward: 'My Dinh 1',
      district: 'Nam Tu Liem',
      registrationDate: '2024-03-15',
      status: 'OCCUPIED',
      note: 'One temporary resident.',
      memberCount: 2,
      activeMemberCount: 2,
      motorcycleCount: 1,
      carCount: 1
    },
    {
      id: 'HH-C0302',
      code: 'HH-C0302',
      apartmentNo: 'C0302',
      floor: 3,
      area: 58,
      headName: 'Le Hoang Nam',
      phone: '0901111222',
      houseNo: '',
      street: '',
      ward: '',
      district: '',
      registrationDate: '',
      status: 'VACANT',
      note: 'Ready for handover.',
      memberCount: 0,
      activeMemberCount: 0,
      motorcycleCount: 0,
      carCount: 0
    }
  ];

  const residents = [
    {
      id: 'RES-AN001',
      fullName: 'Nguyen Van An',
      gender: 'Male',
      dateOfBirth: '1985-04-12',
      identityNo: '001085000111',
      phone: '0987654321',
      alias: '',
      birthPlace: 'Hanoi',
      hometown: 'Hanoi',
      ethnicity: 'Kinh',
      religion: 'None',
      occupation: 'Engineer',
      workplace: 'Tech Company',
      issueDate: '2021-05-20',
      issuePlace: 'Police Department',
      previousResidence: 'Cau Giay, Hanoi',
      relationshipToHead: 'Head',
      status: 'PERMANENT',
      alive: true,
      householdId: 'HH-A1201'
    },
    {
      id: 'RES-HA002',
      fullName: 'Le Thu Ha',
      gender: 'Female',
      dateOfBirth: '1988-08-20',
      identityNo: '001188000222',
      phone: '0977000111',
      alias: '',
      birthPlace: 'Hanoi',
      hometown: 'Hanoi',
      ethnicity: 'Kinh',
      religion: 'None',
      occupation: 'Teacher',
      workplace: 'Secondary School',
      issueDate: '2021-06-11',
      issuePlace: 'Police Department',
      previousResidence: 'Cau Giay, Hanoi',
      relationshipToHead: 'Spouse',
      status: 'PERMANENT',
      alive: true,
      householdId: 'HH-A1201'
    },
    {
      id: 'RES-BINH003',
      fullName: 'Tran Thi Binh',
      gender: 'Female',
      dateOfBirth: '1979-01-15',
      identityNo: '031079000333',
      phone: '0911222333',
      alias: '',
      birthPlace: 'Nam Dinh',
      hometown: 'Nam Dinh',
      ethnicity: 'Kinh',
      religion: 'None',
      occupation: 'Accountant',
      workplace: 'Finance Office',
      issueDate: '2020-09-09',
      issuePlace: 'Police Department',
      previousResidence: 'Nam Dinh',
      relationshipToHead: 'Head',
      status: 'PERMANENT',
      alive: true,
      householdId: 'HH-B0805'
    },
    {
      id: 'RES-DUC004',
      fullName: 'Pham Minh Duc',
      gender: 'Male',
      dateOfBirth: '1998-11-02',
      identityNo: '022098000444',
      phone: '0909090909',
      alias: '',
      birthPlace: 'Hai Phong',
      hometown: 'Hai Phong',
      ethnicity: 'Kinh',
      religion: 'None',
      occupation: 'Student',
      workplace: 'University',
      issueDate: '2022-02-15',
      issuePlace: 'Police Department',
      previousResidence: 'Hai Phong',
      relationshipToHead: 'Tenant',
      status: 'TEMPORARY',
      alive: true,
      householdId: 'HH-B0805'
    }
  ];

  return {
    households,
    residents,
    vehicles: [
      { id: 'VEH-001', plateNumber: '29A-12345', type: 'MOTORCYCLE', ownerName: 'Nguyen Van An', registrationDate: '2024-01-10', householdId: 'HH-A1201' },
      { id: 'VEH-002', plateNumber: '29A-67890', type: 'MOTORCYCLE', ownerName: 'Le Thu Ha', registrationDate: '2024-02-15', householdId: 'HH-A1201' },
      { id: 'VEH-003', plateNumber: '30B-99999', type: 'MOTORCYCLE', ownerName: 'Tran Thi Binh', registrationDate: '2024-03-01', householdId: 'HH-B0805' },
      { id: 'VEH-004', plateNumber: '30A-88888', type: 'CAR', ownerName: 'Tran Thi Binh', registrationDate: '2024-03-20', householdId: 'HH-B0805' }
    ],
    activityLogs: []
  };
}

function loadStore() {
  if (!residentMemoryStore) {
    residentMemoryStore = seedStore();
  }
  return residentMemoryStore;
}

function saveStore(store) {
  store.vehicles = store.vehicles || [];
  syncHouseholdVehicleCounts(store);
  syncMemberCounts(store);
  residentMemoryStore = store;
}
function syncHouseholdVehicleCounts(store) {
  store.vehicles = store.vehicles || [];
  store.households = store.households.map(h => {
    const householdVehicles = store.vehicles.filter(v => v.householdId === h.id);
    return {
      ...h,
      motorcycleCount: householdVehicles.filter(v => v.type === 'MOTORCYCLE').length,
      carCount: householdVehicles.filter(v => v.type === 'CAR').length
    };
  });
}
function syncMemberCounts(store) {
  store.households = store.households.map(h => ({
    ...h,
    memberCount: store.residents.filter(r => r.householdId === h.id && isActiveResident(r)).length,
    activeMemberCount: store.residents.filter(r => r.householdId === h.id && isActiveResident(r)).length
  }));
}

function bmSeedData() {
  households = [
    { id: 'hh_1', code: 'HH-A1201', apartmentNo: 'A1201', floor: 12, area: 72.5, headName: 'Michael Scott', phone: '0912345678', status: 'Occupied', note: 'Completed permanent residence registration.', members: ['rs_1', 'rs_2'] },
    { id: 'hh_2', code: 'HH-B0805', apartmentNo: 'B0805', floor: 8, area: 65, headName: 'Jim Halpert', phone: '0987654321', status: 'Occupied', note: 'One temporary resident.', members: ['rs_3', 'rs_4'] },
  ];
  residents = [
    { id: 'rs_1', fullName: 'Michael Scott', gender: 'Male', dob: '1985-04-12', identityNo: '001085000111', phone: '0912345678', hometown: 'Scranton', occupation: 'Manager', status: 'Permanent resident', householdId: 'hh_1' },
    { id: 'rs_2', fullName: 'Pam Beesly', gender: 'Female', dob: '1988-08-20', identityNo: '001188000222', phone: '0977000111', hometown: 'Scranton', occupation: 'Receptionist', status: 'Permanent resident', householdId: 'hh_1' },
    { id: 'rs_3', fullName: 'Jim Halpert', gender: 'Male', dob: '1979-01-15', identityNo: '031079000333', phone: '0987654321', hometown: 'Philadelphia', occupation: 'Sales', status: 'Permanent resident', householdId: 'hh_2' },
    { id: 'rs_4', fullName: 'Dwight Schrute', gender: 'Male', dob: '1998-11-02', identityNo: '022098000444', phone: '0909090909', hometown: 'Scranton', occupation: 'Assistant Manager', status: 'Temporary resident', householdId: 'hh_2' },
  ];
  selectedHouseholdId = null;
}

function syncSmartFeeHouseholds(_households) {
  // Fee/resident synchronization is handled by backend APIs.
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
    TEMPORARY: 'Temporary',
    DECEASED: 'Deceased'
  };
  return labels[value] || value || '-';
}

function statusClass(value) {
  if (value === 'VACANT') return 'gray';
  if (value === 'MOVED_OUT' || value === 'DECEASED') return 'danger';
  if (value === 'TEMPORARY' || value === 'TEMPORARILY_AWAY') return 'warning';
  return 'success';
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB');
}

function isActiveResident(resident) {
  return resident
    && !resident.archived
    && resident.alive !== false
    && resident.status !== 'MOVED_OUT'
    && resident.status !== 'DECEASED';
}

function formatAddress(source = {}) {
  return [source.houseNo, source.street, source.ward, source.district]
    .filter(Boolean)
    .join(', ');
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

function safePageNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function safePageSize(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 8;
}

function clampResidentPages() {
  state.householdsPage = safePageNumber(state.householdsPage);
  state.residentsPage = safePageNumber(state.residentsPage);
  state.vehiclesPage = safePageNumber(state.vehiclesPage);
  state.householdsSize = safePageSize(state.householdsSize);
  state.residentsSize = safePageSize(state.residentsSize);
  state.vehiclesSize = safePageSize(state.vehiclesSize);
}

function syncPageState(pageData, stateKey) {
  if (pageData && Number.isFinite(Number(pageData.number))) {
    state[stateKey] = safePageNumber(pageData.number);
  } else {
    state[stateKey] = safePageNumber(state[stateKey]);
  }
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
  // Include JWT token if available
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
      ...(options.headers || {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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
  try {
    const result = await apiJson(path, options);
    state.apiMode = true;
    return result;
  } catch (error) {
    const message = cleanApiErrorMessage(error, 'Request failed. Please try again.');
    const networkFailure = error instanceof TypeError
      || /failed to fetch|networkerror|load failed|err_connection|aborterror/i.test(String(error?.message || ''));
    if (networkFailure) {
      console.warn('Resident API is unavailable, using local fallback:', message);
      state.apiMode = false;
      return null;
    }
    state.apiMode = true;
    throw new Error(message);
  }
}

function localLog(store, action, targetType, targetId, detail) {
  store.activityLogs = store.activityLogs || [];
  store.activityLogs.unshift({
    id: `RAL-${Date.now().toString(36)}`,
    actor: 'local',
    action,
    targetType,
    targetId,
    detail,
    createdAt: new Date().toISOString()
  });
  store.activityLogs = store.activityLogs.slice(0, 100);
}

const DataService = {
  async loadStats() {
    const api = await tryApi('/stats');
    if (api) return api;
    const store = loadStore();
    return {
      totalHouseholds: store.households.filter(h => !h.archived).length,
      totalResidents: store.residents.filter(r => !r.archived).length,
      occupiedHouseholds: store.households.filter(h => !h.archived && h.status === 'OCCUPIED').length,
      vacantHouseholds: store.households.filter(h => !h.archived && h.status === 'VACANT').length,
      permanentResidents: store.residents.filter(r => !r.archived && r.status === 'PERMANENT').length,
      temporaryResidents: store.residents.filter(r => !r.archived && r.status === 'TEMPORARY').length,
      temporarilyAwayResidents: store.residents.filter(r => !r.archived && r.status === 'TEMPORARILY_AWAY').length,
      movedOutResidents: store.residents.filter(r => !r.archived && r.status === 'MOVED_OUT').length,
      deceasedResidents: store.residents.filter(r => !r.archived && r.status === 'DECEASED').length,
      archivedResidents: store.residents.filter(r => r.archived).length
    };
  },

  async loadHouseholds() {
    clampResidentPages();
    const url = appendQuery(`${API_ROOT}/households`, {
      search: state.householdsSearch,
      status: state.householdStatus,
      page: state.householdsPage,
      size: state.householdsSize
    });
    const api = await tryApi(url.replace(API_ROOT, ''));
    if (api) {
      syncSmartFeeHouseholds(api.content || []);
      return api;
    }
    const store = loadStore();
    const filtered = store.households.filter(h => {
      if (h.archived) return false;
      const haystack = norm(`${h.id} ${h.apartmentNo} ${h.headName} ${h.headIdentityNo} ${h.phone} ${h.status} ${formatAddress(h)}`);
      const statusOk = state.householdStatus === 'ALL' || h.status === state.householdStatus;
      return statusOk && haystack.includes(norm(state.householdsSearch));
    });
    return makePage(filtered, state.householdsPage, state.householdsSize);
  },

  async loadResidents() {
    clampResidentPages();
    const url = appendQuery(`${API_ROOT}/residents`, {
      search: state.residentsSearch,
      status: state.residentStatus,
      gender: state.residentGender,
      householdId: state.residentHouseholdId,
      page: state.residentsPage,
      size: state.residentsSize
    });
    const api = await tryApi(url.replace(API_ROOT, ''));
    if (api) return api;
    const store = loadStore();
    const filtered = store.residents.filter(r => {
      if (r.archived) return false;
      const household = store.households.find(h => h.id === r.householdId);
      const haystack = norm(`${r.fullName} ${r.identityNo} ${r.phone} ${r.alias} ${r.birthPlace} ${r.hometown} ${r.ethnicity} ${r.occupation} ${r.workplace} ${household?.apartmentNo || ''}`);
      const statusOk = state.residentStatus === 'ALL' || r.status === state.residentStatus;
      const genderOk = !state.residentGender || r.gender === state.residentGender;
      const householdOk = !state.residentHouseholdId || r.householdId === state.residentHouseholdId;
      return statusOk && genderOk && householdOk && haystack.includes(norm(state.residentsSearch));
    });
    return makePage(filtered, state.residentsPage, state.residentsSize);
  },

  async getHousehold(id) {
    if (!id) return null;
    const api = await tryApi(`/households/${encodeURIComponent(id)}`);
    if (api) return api;
    const store = loadStore();
    const household = store.households.find(h => h.id === id && !h.archived);
    if (!household) return null;
    return {
      ...household,
      members: store.residents
        .filter(r => r.householdId === id && !r.archived)
        .map(r => enrichResident(r, store.households))
    };
  },

  async getResident(id) {
    if (!id) return null;
    const api = await tryApi(`/residents/${encodeURIComponent(id)}`);
    if (api) return api;
    const store = loadStore();
    const resident = store.residents.find(r => r.id === id && !r.archived);
    return resident ? enrichResident(resident, store.households) : null;
  },

  async saveHousehold(payload, actor) {
    validateHouseholdPayload(payload);
    const isEdit = Boolean(state.editingHouseholdId);
    const path = isEdit
      ? `/households/${encodeURIComponent(state.editingHouseholdId)}?actor=${encodeURIComponent(actor)}`
      : `/households?actor=${encodeURIComponent(actor)}`;
    const api = await tryApi(path, {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    if (api) return api;

    const store = loadStore();
    const code = String(payload.code || '').trim().toUpperCase().replace(/\s+/g, '-');
    if (!isEdit && store.households.some(h => h.id === code)) throw new Error('Household code already exists.');
    if (store.households.some(h => norm(h.apartmentNo) === norm(payload.apartmentNo) && h.id !== state.editingHouseholdId)) {
      throw new Error('Apartment number already exists.');
    }
    if (payload.status === 'VACANT') {
      const activeMembers = store.residents.filter(r => r.householdId === state.editingHouseholdId && isActiveResident(r)).length;
      if (activeMembers > 0) {
        throw new Error('Cannot mark a household as vacant while it still has active residents.');
      }
    }
    const next = {
      id: isEdit ? state.editingHouseholdId : code,
      code: isEdit ? state.editingHouseholdId : code,
      apartmentNo: payload.apartmentNo,
      floor: Number(payload.floor) || 0,
      area: Number(payload.area) || 0,
      headName: payload.headName,
      headIdentityNo: payload.headIdentityNo || '',
      phone: payload.phone || '',
      houseNo: payload.houseNo || '',
      street: payload.street || '',
      ward: payload.ward || '',
      district: payload.district || '',
      registrationDate: payload.registrationDate || '',
      status: payload.status || 'OCCUPIED',
      note: payload.note || '',
      memberCount: 0,
      activeMemberCount: 0,
      motorcycleCount: Number(payload.motorcycleCount) || 0,
      carCount: Number(payload.carCount) || 0
    };
    if (next.headIdentityNo) {
      const head = store.residents.find(r => norm(r.identityNo) === norm(next.headIdentityNo));
      if (!head) throw new Error('Household head was not found by Citizen ID.');
      if (!isActiveResident(head)) throw new Error('Moved-out, inactive or deceased residents cannot be household head.');
      head.householdId = next.id;
      head.relationshipToHead = 'Head';
      head.archived = false;
      store.residents.forEach(r => {
        if (r.id !== head.id && r.householdId === next.id && norm(r.relationshipToHead) === 'head') {
          r.relationshipToHead = 'Member';
        }
      });
      next.headName = head.fullName;
    }
    const index = store.households.findIndex(h => h.id === next.id);
    if (index >= 0) store.households[index] = { ...store.households[index], ...next };
    else store.households.push(next);
    localLog(store, isEdit ? 'UPDATE' : 'CREATE', 'HOUSEHOLD', next.id, `${isEdit ? 'Updated' : 'Created'} household ${next.id}`);
    saveStore(store);
    return next;
  },

  async deleteHousehold(id, actor) {
    const api = await tryApi(`/households/${encodeURIComponent(id)}?actor=${encodeURIComponent(actor)}`, { method: 'DELETE' });
    if (api !== null) return true;
    const store = loadStore();
    if (store.residents.some(r => r.householdId === id && isActiveResident(r))) {
      throw new Error('Cannot archive a household that still has active residents.');
    }
    const household = store.households.find(h => h.id === id);
    if (household) {
      household.archived = true;
      household.archivedAt = new Date().toISOString();
      household.status = 'VACANT';
    }
    localLog(store, 'ARCHIVE', 'HOUSEHOLD', id, `Archived household ${id}`);
    saveStore(store);
    return true;
  },

  async saveResident(payload, actor) {
    validateResidentPayload(payload);
    const isEdit = Boolean(state.editingResidentId);
    const path = isEdit
      ? `/residents/${encodeURIComponent(state.editingResidentId)}?actor=${encodeURIComponent(actor)}`
      : `/residents?actor=${encodeURIComponent(actor)}`;
    const api = await tryApi(path, {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    if (api) return api;

    const store = loadStore();
    if (store.residents.some(r => norm(r.identityNo) === norm(payload.identityNo) && r.id !== state.editingResidentId)) {
      throw new Error('Citizen ID already exists.');
    }
    const id = isEdit ? state.editingResidentId : `RES-${Date.now().toString(36).toUpperCase()}`;
    const next = {
      id,
      ...payload,
      householdId: payload.householdId || '',
      alive: payload.alive !== false && payload.status !== 'DECEASED',
      dateOfDeath: payload.status === 'DECEASED' ? (payload.dateOfDeath || new Date().toISOString().slice(0, 10)) : (payload.dateOfDeath || ''),
      archived: false
    };
    const index = store.residents.findIndex(r => r.id === id);
    if (index >= 0) store.residents[index] = { ...store.residents[index], ...next };
    else store.residents.push(next);
    if (next.householdId && norm(next.relationshipToHead) === 'head' && isActiveResident(next)) {
      const household = store.households.find(h => h.id === next.householdId);
      if (household) {
        household.headName = next.fullName;
        household.headIdentityNo = next.identityNo;
      }
      store.residents.forEach(r => {
        if (r.id !== next.id && r.householdId === next.householdId && norm(r.relationshipToHead) === 'head') {
          r.relationshipToHead = 'Member';
        }
      });
    }
    localLog(store, isEdit ? 'UPDATE' : 'CREATE', 'RESIDENT', id, `${isEdit ? 'Updated' : 'Created'} resident ${payload.fullName}`);
    saveStore(store);
    return next;
  },

  async deleteResident(id, actor) {
    const api = await tryApi(`/residents/${encodeURIComponent(id)}?actor=${encodeURIComponent(actor)}`, { method: 'DELETE' });
    if (api !== null) return true;
    const store = loadStore();
    const resident = store.residents.find(r => r.id === id);
    if (resident) {
      const household = store.households.find(h => h.id === resident.householdId);
      resident.archived = true;
      resident.archivedAt = new Date().toISOString();
      resident.status = 'MOVED_OUT';
      resident.householdId = '';
      if (household && norm(resident.relationshipToHead) === 'head') {
        household.headIdentityNo = '';
        household.note = `${household.note || ''} | Household head archived; choose a new head.`.trim();
      }
    }
    localLog(store, 'ARCHIVE', 'RESIDENT', id, `Archived resident ${resident?.fullName || id}`);
    saveStore(store);
    return true;
  },

  async addMember(householdId, residentId, actor) {
    const api = await tryApi(`/households/${encodeURIComponent(householdId)}/members/${encodeURIComponent(residentId)}?actor=${encodeURIComponent(actor)}`, { method: 'POST' });
    if (api) return api;
    const store = loadStore();
    const resident = store.residents.find(r => r.id === residentId);
    if (!resident) throw new Error('Resident not found.');
    const household = store.households.find(h => h.id === householdId && !h.archived);
    if (household?.status === 'VACANT') {
      throw new Error('Cannot add members to a vacant household. Update the household status first.');
    }
    resident.householdId = householdId;
    localLog(store, 'ADD_MEMBER', 'HOUSEHOLD', householdId, `Added ${resident.fullName} to ${householdId}`);
    saveStore(store);
    return resident;
  },

  async removeMember(householdId, residentId, actor) {
    const api = await tryApi(`/households/${encodeURIComponent(householdId)}/members/${encodeURIComponent(residentId)}?actor=${encodeURIComponent(actor)}`, { method: 'DELETE' });
    if (api) return api;
    const store = loadStore();
    const resident = store.residents.find(r => r.id === residentId);
    if (!resident || resident.householdId !== householdId) throw new Error('Resident is not a member of this household.');
    resident.householdId = '';
    localLog(store, 'REMOVE_MEMBER', 'HOUSEHOLD', householdId, `Removed ${resident.fullName} from ${householdId}`);
    saveStore(store);
    return resident;
  },

  async changeHouseholdHead(householdId, identityNo, reason, actor) {
    const normalizedIdentityNo = requireCitizenId(identityNo);
    const api = await tryApi(`/households/${encodeURIComponent(householdId)}/head?actor=${encodeURIComponent(actor)}`, {
      method: 'POST',
      body: JSON.stringify({ identityNo: normalizedIdentityNo, reason })
    });
    if (api) return api;

    const store = loadStore();
    const household = store.households.find(h => h.id === householdId && !h.archived);
    const head = store.residents.find(r => norm(r.identityNo) === norm(normalizedIdentityNo) && !r.archived);
    if (!household) throw new Error('Household not found.');
    if (!head) throw new Error('Resident with the given Citizen ID was not found.');
    if (head.householdId !== householdId) throw new Error('New household head must already be a member of this household.');
    if (!isActiveResident(head)) throw new Error('Inactive or deceased residents cannot be household head.');

    store.residents.forEach(r => {
      if (r.householdId === householdId && norm(r.relationshipToHead) === 'head') r.relationshipToHead = 'Member';
    });
    head.relationshipToHead = 'Head';
    household.headName = head.fullName;
    household.headIdentityNo = head.identityNo;
    localLog(store, 'CHANGE_HEAD', 'HOUSEHOLD', householdId, `Changed household head to ${head.fullName}`);
    saveStore(store);
    return household;
  },

  async transferOwnership(householdId, payload, actor) {
    payload.newOwnerIdentityNo = optionalCitizenId(payload.newOwnerIdentityNo, 'New owner Citizen ID');
    payload.newOwnerPhone = optionalVietnamMobile(payload.newOwnerPhone, 'New owner phone');
    const api = await tryApi(`/households/${encodeURIComponent(householdId)}/ownership-transfer?actor=${encodeURIComponent(actor)}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (api) return api;

    const store = loadStore();
    const household = store.households.find(h => h.id === householdId && !h.archived);
    if (!household) throw new Error('Household not found.');
    household.previousOwnerName = household.headName || household.ownerName || '';
    household.headName = payload.newOwnerName;
    household.phone = payload.newOwnerPhone || household.phone || '';
    household.ownershipTransferredAt = new Date().toISOString();
    household.ownershipNote = payload.note || '';

    if (payload.newOwnerIdentityNo) {
      let owner = store.residents.find(r => norm(r.identityNo) === norm(payload.newOwnerIdentityNo));
      if (!owner) {
        owner = {
          id: `RES-${Date.now().toString(36).toUpperCase()}`,
          fullName: payload.newOwnerName,
          gender: 'Other',
          dateOfBirth: '',
          identityNo: payload.newOwnerIdentityNo,
          phone: payload.newOwnerPhone || '',
          relationshipToHead: 'Head',
          status: 'PERMANENT',
          alive: true,
          householdId
        };
        store.residents.push(owner);
      }
      owner.householdId = householdId;
      owner.fullName = payload.newOwnerName || owner.fullName;
      owner.phone = payload.newOwnerPhone || owner.phone || '';
      owner.relationshipToHead = 'Head';
      owner.status = owner.status === 'MOVED_OUT' ? 'PERMANENT' : owner.status;
      owner.alive = true;
      owner.archived = false;
      household.headIdentityNo = owner.identityNo;
      store.residents.forEach(r => {
        if (r.id !== owner.id && r.householdId === householdId && norm(r.relationshipToHead) === 'head') {
          r.relationshipToHead = 'Member';
        }
      });
    }
    localLog(store, 'TRANSFER_OWNERSHIP', 'HOUSEHOLD', householdId, `Transferred ownership to ${payload.newOwnerName}`);
    saveStore(store);
    return household;
  },

  async splitHousehold(sourceHouseholdId, payload, actor) {
    validateHouseholdPayload(payload.newHousehold || {});
    payload.headIdentityNo = optionalCitizenId(payload.headIdentityNo, 'New household head Citizen ID');
    const api = await tryApi(`/households/${encodeURIComponent(sourceHouseholdId)}/split?actor=${encodeURIComponent(actor)}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (api) return api;

    const store = loadStore();
    const source = store.households.find(h => h.id === sourceHouseholdId && !h.archived);
    if (!source) throw new Error('Source household not found.');
    const moving = (payload.residentIds || []).map(id => store.residents.find(r => r.id === id)).filter(Boolean);
    if (!moving.length) throw new Error('Select at least one resident to move.');
    if (moving.some(r => r.householdId !== sourceHouseholdId)) throw new Error('All selected residents must belong to the source household.');
    const activeSource = store.residents.filter(r => r.householdId === sourceHouseholdId && isActiveResident(r)).length;
    const activeMoving = moving.filter(isActiveResident).length;
    if (activeSource - activeMoving < 1) throw new Error('The source household must keep at least one active resident after split.');

    const newHousehold = {
      ...payload.newHousehold,
      id: payload.newHousehold.code,
      code: payload.newHousehold.code,
      headName: payload.newHousehold.headName || '',
      memberCount: 0,
      activeMemberCount: 0
    };
    if (store.households.some(h => h.id === newHousehold.id)) throw new Error('New household code already exists.');
    store.households.push(newHousehold);
    moving.forEach(r => { r.householdId = newHousehold.id; });
    const head = payload.headIdentityNo
      ? moving.find(r => norm(r.identityNo) === norm(payload.headIdentityNo))
      : moving.find(r => norm(r.relationshipToHead) === 'head') || moving.find(isActiveResident);
    if (head) {
      moving.forEach(r => { if (norm(r.relationshipToHead) === 'head') r.relationshipToHead = 'Member'; });
      head.relationshipToHead = 'Head';
      newHousehold.headName = head.fullName;
      newHousehold.headIdentityNo = head.identityNo;
    }
    localLog(store, 'SPLIT_HOUSEHOLD', 'HOUSEHOLD', sourceHouseholdId, `Split ${moving.length} resident(s) to ${newHousehold.id}`);
    saveStore(store);
    return newHousehold;
  },

  async reportDeath(residentId, payload, actor) {
    if (isFutureDate(payload.dateOfDeath)) throw new Error('Date of death cannot be in the future.');
    payload.replacementHeadIdentityNo = optionalCitizenId(payload.replacementHeadIdentityNo, 'Replacement head Citizen ID');
    const api = await tryApi(`/residents/${encodeURIComponent(residentId)}/death?actor=${encodeURIComponent(actor)}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (api) return api;

    const store = loadStore();
    const resident = store.residents.find(r => r.id === residentId && !r.archived);
    if (!resident) throw new Error('Resident not found.');
    resident.alive = false;
    resident.status = 'DECEASED';
    resident.dateOfDeath = payload.dateOfDeath || new Date().toISOString().slice(0, 10);
    const household = store.households.find(h => h.id === resident.householdId);
    if (household && norm(resident.relationshipToHead) === 'head') {
      resident.relationshipToHead = 'Former Head (Deceased)';
      household.headIdentityNo = '';
      household.note = `${household.note || ''} | Household head deceased; choose a new head.`.trim();
      if (payload.replacementHeadIdentityNo) {
        const replacement = store.residents.find(r =>
          r.householdId === household.id
          && norm(r.identityNo) === norm(payload.replacementHeadIdentityNo)
          && isActiveResident(r)
        );
        if (!replacement) throw new Error('Replacement head must be an active member of the same household.');
        store.residents.forEach(r => {
          if (r.householdId === household.id && norm(r.relationshipToHead) === 'head') r.relationshipToHead = 'Member';
        });
        replacement.relationshipToHead = 'Head';
        household.headName = replacement.fullName;
        household.headIdentityNo = replacement.identityNo;
      }
    }
    localLog(store, 'MARK_DECEASED', 'RESIDENT', residentId, `Marked resident deceased: ${resident.fullName}`);
    saveStore(store);
    return resident;
  },

  async createTemporaryRecord(residentId, payload, actor) {
    const api = await tryApi(`/residents/${encodeURIComponent(residentId)}/temporary-records?actor=${encodeURIComponent(actor)}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (api) return api;

    const store = loadStore();
    store.temporaryResidenceRecords = store.temporaryResidenceRecords || [];
    const resident = store.residents.find(r => r.id === residentId && !r.archived);
    if (!resident) throw new Error('Resident not found.');
    const record = {
      id: `TRR-${Date.now().toString(36).toUpperCase()}`,
      residentId,
      residentName: resident.fullName,
      ...payload,
      actor,
      createdAt: new Date().toISOString()
    };
    store.temporaryResidenceRecords.unshift(record);
    if (payload.type === 'TEMPORARY_RESIDENCE') resident.status = 'TEMPORARY';
    if (payload.type === 'TEMPORARY_ABSENCE') resident.status = 'TEMPORARILY_AWAY';
    if (payload.type === 'PERMANENT_REGISTRATION') resident.status = 'PERMANENT';
    localLog(store, payload.type, 'RESIDENT', residentId, `Created residence record for ${resident.fullName}`);
    saveStore(store);
    return record;
  },

  async globalSearch() {
    const url = appendQuery(`${API_ROOT}/search`, { q: state.globalSearch, type: state.globalType });
    const api = await tryApi(url.replace(API_ROOT, ''));
    if (api) return api;
    const store = loadStore();
    const rows = [];
    const query = norm(state.globalSearch);
    if (state.globalType === 'all' || state.globalType === 'resident') {
      store.residents.filter(r => !r.archived).forEach(r => {
        const household = store.households.find(h => h.id === r.householdId);
        const text = norm(`${r.fullName} ${r.identityNo} ${r.phone} ${r.alias} ${r.birthPlace} ${r.hometown} ${r.ethnicity} ${r.occupation} ${r.workplace} ${household?.apartmentNo || ''}`);
        if (!query || text.includes(query)) {
          rows.push({
            type: 'Resident',
            id: r.id,
            mainInfo: `${r.fullName} - ${r.identityNo}`,
            detail: `Phone: ${r.phone || '-'} | Apartment: ${household?.apartmentNo || 'No household'} | ${statusLabel(r.status)}`
          });
        }
      });
    }
    if (state.globalType === 'all' || state.globalType === 'household') {
      store.households.filter(h => !h.archived).forEach(h => {
        const text = norm(`${h.id} ${h.apartmentNo} ${h.headName} ${h.headIdentityNo} ${h.phone} ${h.status} ${formatAddress(h)}`);
        if (!query || text.includes(query)) {
          rows.push({
            type: 'Household',
            id: h.id,
            mainInfo: `${h.id} - ${h.apartmentNo}`,
            detail: `Head: ${h.headName} | Members: ${h.memberCount || 0} | ${statusLabel(h.status)}`
          });
        }
      });
    }
    return rows.slice(0, 20);
  },

  async loadActivity() {
    const api = await tryApi('/activity?limit=50');
    if (api) return api;
    return (loadStore().activityLogs || []).slice(0, 50);
  },

  async resetLocal() {
    const seeded = seedStore();
    saveStore(seeded);
    state.apiMode = false;
    return true;
  },

  async export(kind) {
    if (state.apiMode) {
      window.open(`${API_ROOT}/export/${kind}`, '_blank');
      return;
    }
    const store = loadStore();
    const rows = kind === 'households'
      ? [
          ['Code', 'Apartment', 'Floor', 'Area', 'Head', 'Head Citizen ID', 'Phone', 'Address', 'Registration Date', 'Status', 'Active Members', 'Motorcycles', 'Cars', 'Note'],
          ...store.households
            .filter(h => !h.archived)
            .map(h => [h.id, h.apartmentNo, h.floor, h.area, h.headName, h.headIdentityNo, h.phone, formatAddress(h), h.registrationDate, statusLabel(h.status), h.memberCount, h.motorcycleCount, h.carCount, h.note])
        ]
      : [
          ['ID', 'Full Name', 'Alias', 'Gender', 'Date of Birth', 'Citizen ID', 'Issue Date', 'Issue Place', 'Phone', 'Birth Place', 'Hometown', 'Ethnicity', 'Religion', 'Occupation', 'Workplace', 'Previous Residence', 'Relationship', 'Status', 'Alive', 'Date of Death', 'Household'],
          ...store.residents
            .filter(r => !r.archived)
            .map(r => [r.id, r.fullName, r.alias, r.gender, r.dateOfBirth, r.identityNo, r.issueDate, r.issuePlace, r.phone, r.birthPlace, r.hometown, r.ethnicity, r.religion, r.occupation, r.workplace, r.previousResidence, r.relationshipToHead, statusLabel(r.status), r.alive !== false ? 'Yes' : 'No', r.dateOfDeath, r.householdId])
        ];
    const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${kind}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  async loadVehicles() {
    clampResidentPages();
    try {
      const apiVehiclesPage = await API.searchVehicles(
        state.vehiclesSearchPlate,
        state.vehiclesSearchType,
        state.vehiclesSearchHouseholdId,
        state.vehiclesPage,
        state.vehiclesSize
      );
      if (apiVehiclesPage) {
        return apiVehiclesPage;
      }
    } catch (e) {
      console.warn("Backend vehicles API is offline, using memory fallback:", e.message);
    }

    const store = loadStore();
    store.vehicles = store.vehicles || [];
    const filtered = store.vehicles.filter(v => {
      const plateOk = !state.vehiclesSearchPlate || norm(v.plateNumber).includes(norm(state.vehiclesSearchPlate));
      const typeOk = state.vehiclesSearchType === 'ALL' || v.type === state.vehiclesSearchType;
      const hhOk = !state.vehiclesSearchHouseholdId || v.householdId === state.vehiclesSearchHouseholdId;
      return plateOk && typeOk && hhOk;
    });

    filtered.sort((a, b) => a.plateNumber.localeCompare(b.plateNumber));

    const page = makePage(filtered, state.vehiclesPage, state.vehiclesSize);
    page.content = page.content.map(v => {
      const hh = store.households.find(h => h.id === v.householdId);
      return {
        ...v,
        apartmentNo: hh?.apartmentNo || v.householdId,
        ownerName: v.ownerName || hh?.headName || ''
      };
    });
    return page;
  },

  async getVehiclesByHousehold(householdId) {
    if (!householdId) return [];
    try {
      const list = await API.getVehiclesByHousehold(householdId);
      if (list) return list;
    } catch (e) {
      console.warn("Backend vehicles API by household is offline:", e.message);
    }
    const store = loadStore();
    store.vehicles = store.vehicles || [];
    return store.vehicles
      .filter(v => v.householdId === householdId)
      .map(v => {
        const hh = store.households.find(h => h.id === v.householdId);
        return {
          ...v,
          apartmentNo: hh?.apartmentNo || v.householdId
        };
      });
  },

  async getVehicle(id) {
    if (!id) return null;
    const store = loadStore();
    return (store.vehicles || []).find(v => v.id === id);
  },

  async saveVehicle(payload, actor) {
    validateVehiclePayload(payload);
    let savedApiDto = null;
    let backendOnline = false;
    try {
      savedApiDto = await API.saveVehicle(payload);
      backendOnline = true;
    } catch (e) {
      console.warn("Failed to save vehicle to backend, falling back to memory fallback:", e.message);
      if (e.message && (e.message.includes("đã được đăng ký") || e.message.includes("Không tìm thấy hộ gia đình") || e.message.includes("Biển số xe"))) {
        throw e;
      }
    }

    const store = loadStore();
    store.vehicles = store.vehicles || [];
    const isEdit = Boolean(payload.id);
    const id = payload.id || `VEH-${Date.now().toString(36).toUpperCase()}`;

    if (!backendOnline) {
      const exists = store.vehicles.some(v => norm(v.plateNumber) === norm(payload.plateNumber) && v.id !== id);
      if (exists) {
        throw new Error(`Biển số xe "${payload.plateNumber}" đã được đăng ký trong hệ thống.`);
      }
    }

    const next = {
      id,
      plateNumber: payload.plateNumber.toUpperCase().trim(),
      type: payload.type.toUpperCase(),
      ownerName: payload.ownerName,
      registrationDate: payload.registrationDate || new Date().toISOString().split('T')[0],
      householdId: payload.householdId
    };

    const index = store.vehicles.findIndex(v => v.id === id);
    if (index >= 0) store.vehicles[index] = next;
    else store.vehicles.push(next);

    localLog(store, isEdit ? 'UPDATE' : 'CREATE', 'VEHICLE', id, `${isEdit ? 'Updated' : 'Registered'} vehicle ${next.plateNumber} for household ${next.householdId}`);
    saveStore(store);

    return savedApiDto || next;
  },

  async deleteVehicle(id, actor) {
    try {
      await API.deleteVehicle(id);
    } catch (e) {
      console.warn("Failed to delete vehicle on backend, falling back to memory fallback:", e.message);
    }

    const store = loadStore();
    store.vehicles = store.vehicles || [];
    const vehicle = store.vehicles.find(v => v.id === id);
    if (vehicle) {
      store.vehicles = store.vehicles.filter(v => v.id !== id);
      localLog(store, 'DELETE', 'VEHICLE', id, `Deleted vehicle ${vehicle.plateNumber}`);
      saveStore(store);
    }
    return true;
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
    headIdentityNo: container.querySelector('#rm-hh-head-identity').value.trim(),
    phone: container.querySelector('#rm-hh-phone').value.trim(),
    houseNo: container.querySelector('#rm-hh-house-no').value.trim(),
    street: container.querySelector('#rm-hh-street').value.trim(),
    ward: container.querySelector('#rm-hh-ward').value.trim(),
    district: container.querySelector('#rm-hh-district').value.trim(),
    registrationDate: container.querySelector('#rm-hh-registration').value || null,
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
    alias: container.querySelector('#rm-res-alias').value.trim(),
    birthPlace: container.querySelector('#rm-res-birth-place').value.trim(),
    hometown: container.querySelector('#rm-res-hometown').value.trim(),
    ethnicity: container.querySelector('#rm-res-ethnicity').value.trim(),
    religion: container.querySelector('#rm-res-religion').value.trim(),
    occupation: container.querySelector('#rm-res-occupation').value.trim(),
    workplace: container.querySelector('#rm-res-workplace').value.trim(),
    issueDate: container.querySelector('#rm-res-issue-date').value || null,
    issuePlace: container.querySelector('#rm-res-issue-place').value.trim(),
    previousResidence: container.querySelector('#rm-res-previous').value.trim(),
    relationshipToHead: container.querySelector('#rm-res-relationship').value.trim(),
    status: container.querySelector('#rm-res-status').value,
    alive: container.querySelector('#rm-res-status').value !== 'DECEASED',
    dateOfDeath: container.querySelector('#rm-res-death-date').value || null,
    householdId: container.querySelector('#rm-res-household').value
  };
}

function syncHouseholdHeadFromIdentity(container) {
  const headInput = container.querySelector('#rm-hh-head');
  const identityInput = container.querySelector('#rm-hh-head-identity');
  const statusInput = container.querySelector('#rm-hh-status');
  if (!headInput || !identityInput || !statusInput) return;

  if (statusInput.value === 'VACANT') {
    identityInput.value = '';
    identityInput.disabled = true;
    identityInput.setCustomValidity('');
    headInput.readOnly = false;
    if (!headInput.value.trim()) headInput.value = 'Vacant Unit';
    return;
  }

  identityInput.disabled = false;
  const identityNo = identityInput.value.trim();
  if (!identityNo) {
    identityInput.setCustomValidity('');
    headInput.readOnly = false;
    return;
  }

  const resident = findResidentByIdentityNo(identityNo);
  if (!resident) {
    identityInput.setCustomValidity('No resident found with this Citizen ID.');
    headInput.readOnly = false;
    return;
  }
  if (!isActiveResident(resident)) {
    identityInput.setCustomValidity('Moved-out, inactive or deceased residents cannot be household head.');
    headInput.value = resident.fullName || headInput.value;
    headInput.readOnly = true;
    return;
  }

  identityInput.setCustomValidity('');
  headInput.value = resident.fullName || headInput.value;
  headInput.readOnly = true;
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
  container.querySelector('#rm-hh-head-identity').value = household?.headIdentityNo || '';
  container.querySelector('#rm-hh-phone').value = household?.phone || '';
  container.querySelector('#rm-hh-house-no').value = household?.houseNo || '';
  container.querySelector('#rm-hh-street').value = household?.street || '';
  container.querySelector('#rm-hh-ward').value = household?.ward || '';
  container.querySelector('#rm-hh-district').value = household?.district || '';
  container.querySelector('#rm-hh-registration').value = household?.registrationDate || '';
  container.querySelector('#rm-hh-status').value = household?.status || 'OCCUPIED';
  container.querySelector('#rm-hh-note').value = household?.note || '';
  container.querySelector('#rm-hh-motos').value = household?.motorcycleCount ?? 0;
  container.querySelector('#rm-hh-motos').disabled = true;
  container.querySelector('#rm-hh-motos').style.opacity = '0.7';
  container.querySelector('#rm-hh-motos').style.cursor = 'not-allowed';
  container.querySelector('#rm-hh-cars').value = household?.carCount ?? 0;
  container.querySelector('#rm-hh-cars').disabled = true;
  container.querySelector('#rm-hh-cars').style.opacity = '0.7';
  container.querySelector('#rm-hh-cars').style.cursor = 'not-allowed';
  syncHouseholdHeadFromIdentity(container);
}

function fillResidentForm(container, resident) {
  state.editingResidentId = resident?.id || null;
  container.querySelector('#rm-res-title').textContent = resident ? 'Update resident' : 'Add resident';
  container.querySelector('#rm-res-name').value = resident?.fullName || '';
  container.querySelector('#rm-res-gender').value = resident?.gender || 'Male';
  container.querySelector('#rm-res-dob').value = resident?.dateOfBirth || '';
  container.querySelector('#rm-res-identity').value = resident?.identityNo || '';
  container.querySelector('#rm-res-phone').value = resident?.phone || '';
  container.querySelector('#rm-res-alias').value = resident?.alias || '';
  container.querySelector('#rm-res-birth-place').value = resident?.birthPlace || '';
  container.querySelector('#rm-res-hometown').value = resident?.hometown || '';
  container.querySelector('#rm-res-ethnicity').value = resident?.ethnicity || '';
  container.querySelector('#rm-res-religion').value = resident?.religion || '';
  container.querySelector('#rm-res-occupation').value = resident?.occupation || '';
  container.querySelector('#rm-res-workplace').value = resident?.workplace || '';
  container.querySelector('#rm-res-issue-date').value = resident?.issueDate || '';
  container.querySelector('#rm-res-issue-place').value = resident?.issuePlace || '';
  container.querySelector('#rm-res-previous').value = resident?.previousResidence || '';
  container.querySelector('#rm-res-relationship').value = resident?.relationshipToHead || '';
  container.querySelector('#rm-res-status').value = resident?.status || 'PERMANENT';
  container.querySelector('#rm-res-death-date').value = resident?.dateOfDeath || '';
  container.querySelector('#rm-res-household').value = resident?.householdId || '';
}

function fillVehicleForm(container, vehicle) {
  state.editingVehicleId = vehicle?.id || null;
  const form = container.querySelector('#rm-vh-form');
  if (!form) return;
  container.querySelector('#rm-vh-title').textContent = vehicle ? 'Update Vehicle' : 'Register Vehicle';
  container.querySelector('#rm-vh-plate').value = vehicle?.plateNumber || '';
  container.querySelector('#rm-vh-type').value = vehicle?.type || 'MOTORCYCLE';
  container.querySelector('#rm-vh-owner').value = vehicle?.ownerName || '';
  
  const regDateInput = container.querySelector('#rm-vh-regdate');
  if (regDateInput) {
    regDateInput.value = vehicle?.registrationDate || new Date().toISOString().split('T')[0];
  }
  
  container.querySelector('#rm-vh-household').value = vehicle?.householdId || '';
}

function readVehicleForm(container) {
  return {
    id: state.editingVehicleId || null,
    plateNumber: container.querySelector('#rm-vh-plate').value.trim(),
    type: container.querySelector('#rm-vh-type').value,
    ownerName: container.querySelector('#rm-vh-owner').value.trim(),
    registrationDate: container.querySelector('#rm-vh-regdate').value,
    householdId: container.querySelector('#rm-vh-household').value
  };
}

export class ResidentsManager {
  static async render(container, currentUser, showToast) {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'accountant') {
      container.innerHTML = '<div class="rm-empty">Loading household info...</div>';
      try {
        let household = null;
        let members = [];
        
        let roomCode = '';
        if (currentUser.room) {
          let r = currentUser.room.trim().toUpperCase().replace('-', '');
          if (r.startsWith('HH')) {
            roomCode = r;
          } else if (/^\d+$/.test(r)) {
            roomCode = 'HH' + r.padStart(3, '0');
          } else {
            roomCode = 'HH' + r;
          }
        }

        if (roomCode) {
          try {
            household = await DataService.getHousehold(roomCode);
          } catch (e) {
            console.warn("Household lookup by roomCode failed, trying fallback:", e);
          }
        }

        if (!household && currentUser.identityNo) {
          try {
            const resPage = await DataService.loadResidents();
            if (resPage && resPage.content) {
              const resident = resPage.content.find(r => r.identityNo === currentUser.identityNo);
              if (resident && resident.householdId) {
                household = await DataService.getHousehold(resident.householdId);
              }
            }
          } catch (e) {
            console.warn("Household lookup by identityNo failed:", e);
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
        .rm-alert { background:var(--color-warning-light); color:var(--color-warning); border:1px solid var(--color-warning); border-radius:10px; padding:10px 12px; font-size:12px; font-weight:700; margin-bottom:14px; }
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
            <span class="rm-mode" id="rm-mode">Checking API</span>
            <button class="rm-btn sec" data-action="export-households">Export Households</button>
            <button class="rm-btn sec" data-action="export-residents">Export Residents</button>
            <button class="rm-btn dan" data-action="reset-local">Reset Local Demo</button>
          </div>
        </div>
        <div class="rm-stats" id="rm-stats"></div>
        <div class="rm-tabs">
          <button class="rm-tab active" data-tab="households">Households</button>
          <button class="rm-tab" data-tab="residents">Residents</button>
          <button class="rm-tab" data-tab="vehicles">Vehicles</button>
          <button class="rm-tab" data-tab="search">Search</button>
          <button class="rm-tab" data-tab="activity">Activity</button>
        </div>
        <div class="rm-panel active" id="rm-panel-households"></div>
        <div class="rm-panel" id="rm-panel-residents"></div>
        <div class="rm-panel" id="rm-panel-vehicles"></div>
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
        clampResidentPages();
        state.stats = await DataService.loadStats();
        state.householdPageData = await DataService.loadHouseholds();
        syncPageState(state.householdPageData, 'householdsPage');
        state.residentPageData = await DataService.loadResidents();
        syncPageState(state.residentPageData, 'residentsPage');
        state.households = state.householdPageData.content || [];
        state.residents = state.residentPageData.content || [];
        
        if (state.apiMode) {
          try {
            const allHhData = await apiJson('/households?page=0&size=1000');
            state.allHouseholdsForSelect = allHhData.content || [];
            const allResData = await apiJson('/residents?page=0&size=1000');
            state.allResidentsForSelect = allResData.content || [];
          } catch (e) {
            console.warn("Failed to prefetch dropdown data:", e);
          }
        }
        
        // Tải danh sách xe cộ
        state.vehiclePageData = await DataService.loadVehicles();
        syncPageState(state.vehiclePageData, 'vehiclesPage');
        state.vehicles = state.vehiclePageData.content || [];

        state.searchResults = await DataService.globalSearch();
        state.activityLogs = await DataService.loadActivity();
        renderAll();
      } catch (error) {
        showToast(error.message || 'Unable to load resident data', 'error');
        renderAll();
      }
    };

    const safeRefresh = () => {
      refresh().catch(error => {
        console.error('Resident Manager refresh failed:', error);
        showToast(cleanApiErrorMessage(error, 'Unable to load resident data'), 'error');
      });
    };

    const renderStats = () => {
      const stats = state.stats || {};
      container.querySelector('#rm-stats').innerHTML = `
        <div class="rm-stat"><span>${stats.totalHouseholds ?? 0}</span><p>Households</p></div>
        <div class="rm-stat"><span>${stats.totalResidents ?? 0}</span><p>Residents</p></div>
        <div class="rm-stat"><span>${stats.occupiedHouseholds ?? 0}</span><p>Occupied</p></div>
        <div class="rm-stat"><span>${(stats.temporaryResidents ?? 0) + (stats.temporarilyAwayResidents ?? 0)}</span><p>Temporary / Away</p></div>
        <div class="rm-stat"><span>${stats.deceasedResidents ?? 0}</span><p>Deceased</p></div>
        <div class="rm-stat"><span>${stats.archivedResidents ?? 0}</span><p>Archived</p></div>
      `;
      const badge = container.querySelector('#rm-mode');
      badge.textContent = state.apiMode ? 'Backend API' : 'Local Demo';
      badge.classList.toggle('live', state.apiMode);
    };

    const householdOptions = (selected = '') => {
      const allHouseholds = state.apiMode ? state.allHouseholdsForSelect : loadStore().households;
      return `<option value="">No household</option>` + allHouseholds
        .map(h => `<option value="${esc(h.id)}" ${h.id === selected ? 'selected' : ''}>${esc(h.apartmentNo || h.id)} - ${esc(h.headName || h.ownerName || '')}</option>`)
        .join('');
    };

    const renderHouseholds = async () => {
      const panel = container.querySelector('#rm-panel-households');
      const page = state.householdPageData || emptyPage();
      const selected = await DataService.getHousehold(state.selectedHouseholdId);
      const householdVehicles = selected ? await DataService.getVehiclesByHousehold(selected.id) : [];
      const rows = page.content?.map(h => `
        <tr>
          <td><strong>${esc(h.id)}</strong><br><span class="rm-muted">${esc(h.apartmentNo || '-')}</span></td>
          <td>${esc(h.headName || h.ownerName || '-')}<br><span class="rm-muted">${esc(h.phone || '-')}</span></td>
          <td>${h.floor ?? '-'} / ${esc(h.area ?? '-')} m2</td>
          <td>${h.activeMemberCount ?? h.memberCount ?? h.membersCount ?? 0}${h.headChangeRequired ? '<br><span class="rm-muted">Head change required</span>' : ''}</td>
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
                <div class="rm-field"><label>Area (m2)</label><input id="rm-hh-area" type="number" min="0.1" step="0.1"></div>
              </div>
              <div class="rm-2">
                <div class="rm-field"><label>Household head</label><input id="rm-hh-head" required></div>
                <div class="rm-field"><label>Head Citizen ID</label><input id="rm-hh-head-identity" placeholder="12 digits" pattern="(001|002|004|006|008|010|011|012|014|015|017|019|020|022|024|025|026|027|030|031|033|034|035|036|037|038|040|042|044|045|046|048|049|051|052|054|056|058|060|062|064|066|067|068|070|072|074|075|077|079|080|082|083|084|086|087|089|091|092|093|094|095|096)\\d{9}" maxlength="12"></div>
              </div>
              <div class="rm-2">
                <div class="rm-field"><label>Phone</label><input id="rm-hh-phone" pattern="0[35789]\\d{8}" maxlength="10" placeholder="0987654321"></div>
                <div class="rm-field"><label>Status</label><select id="rm-hh-status">${HOUSEHOLD_STATUSES.map(s => `<option value="${s}">${statusLabel(s)}</option>`).join('')}</select></div>
              </div>
              <div class="rm-2">
                <div class="rm-field"><label>House number</label><input id="rm-hh-house-no"></div>
                <div class="rm-field"><label>Street</label><input id="rm-hh-street"></div>
              </div>
              <div class="rm-2">
                <div class="rm-field"><label>Ward / Commune</label><input id="rm-hh-ward"></div>
                <div class="rm-field"><label>District</label><input id="rm-hh-district"></div>
              </div>
              <div class="rm-field"><label>Registration date</label><input id="rm-hh-registration" type="date"></div>
              <div class="rm-2">
                <div class="rm-field"><label>Motorcycles</label><input id="rm-hh-motos" type="number" min="0" value="0" disabled style="opacity: 0.7; cursor: not-allowed;"></div>
                <div class="rm-field"><label>Cars</label><input id="rm-hh-cars" type="number" min="0" value="0" disabled style="opacity: 0.7; cursor: not-allowed;"></div>
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
        ${renderHouseholdDetail(selected, householdVehicles)}
      `;
      fillHouseholdForm(panel, null);
    };

    const renderHouseholdDetail = (selected, householdVehicles = []) => {
      if (!selected) {
        return `<div class="rm-card rm-empty">Select a household to review members and apartment details.</div>`;
      }
      const isVacant = selected.status === 'VACANT';
      const members = isVacant ? [] : (selected.members || []);
      const store = loadStore();
      const available = state.apiMode 
        ? (state.allResidentsForSelect || []).filter(r => !isVacant && r.householdId !== selected.id && isActiveResident(r))
        : store.residents.filter(r => !isVacant && r.householdId !== selected.id && isActiveResident(r));
      return `
        <div class="rm-card">
          <div class="rm-toolbar">
            <div>
              <h2 style="margin:0;">${esc(selected.apartmentNo || selected.id)}</h2>
              <p class="rm-muted" style="margin-top:4px;">${esc(selected.id)} - ${esc(selected.headName || selected.ownerName || '')}</p>
            </div>
            <div class="rm-actions">
              ${renderBadge(selected.status)}
              <button class="rm-btn sec" data-action="change-head" data-id="${esc(selected.id)}">Change Head</button>
              <button class="rm-btn sec" data-action="transfer-ownership" data-id="${esc(selected.id)}">Transfer Owner</button>
              <button class="rm-btn sec" data-action="split-household" data-id="${esc(selected.id)}">Split</button>
            </div>
          </div>
          ${selected.headChangeRequired ? '<div class="rm-alert">Household head is missing or inactive. Choose a new head by Citizen ID.</div>' : ''}
          <div class="rm-detail-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));">
            <div>
              <h3>Apartment Details</h3>
              <p class="rm-muted">Floor ${selected.floor ?? '-'} | ${selected.area ?? 0} m2 | ${selected.motorcycleCount ?? 0} motorcycles | ${selected.carCount ?? 0} cars</p>
              <p class="rm-muted">Address: ${esc(formatAddress(selected) || '-')}</p>
              <p class="rm-muted">Registration date: ${formatDate(selected.registrationDate)} | Head CCCD: ${esc(selected.headIdentityNo || '-')}</p>
              ${selected.previousOwnerName ? `<p class="rm-muted">Previous owner: ${esc(selected.previousOwnerName)} | ${formatDate(selected.ownershipTransferredAt)}</p>` : ''}
              <p class="rm-muted">${esc(selected.note || '')}</p>
              <div class="rm-actions" style="margin-top:12px;">
                <select class="rm-select" id="rm-add-member-select" style="max-width:200px;">
                  <option value="">${isVacant ? 'Vacant household' : 'Add existing resident'}</option>
                  ${available.map(r => `<option value="${esc(r.id)}">${esc(r.fullName)} - ${esc(r.identityNo)}</option>`).join('')}
                </select>
                <button class="rm-btn pri" data-action="add-member" data-id="${esc(selected.id)}" ${isVacant ? 'disabled aria-disabled="true"' : ''}>Add</button>
              </div>
            </div>
            <div>
              <h3>Members (${members.length})</h3>
              <div class="rm-member-grid" style="grid-template-columns: 1fr;">
                ${members.length ? members.map(member => `
                  <div class="rm-member">
                    <h4>${esc(member.fullName)}</h4>
                    <p>ID: ${esc(member.id)}</p>
                    <p>${esc(member.identityNo)}</p>
                    <p>${esc(member.relationshipToHead || '-')} | ${statusLabel(member.status)} | ${member.alive === false ? 'Deceased' : 'Alive'}</p>
                    <div class="rm-actions" style="margin-top:8px;">
                      <button class="rm-btn sec" data-action="edit-resident" data-id="${esc(member.id)}">Edit</button>
                      <button class="rm-btn sec" data-action="residence-record" data-id="${esc(member.id)}">Residence</button>
                      <button class="rm-btn dan" data-action="mark-deceased" data-id="${esc(member.id)}">Deceased</button>
                      <button class="rm-btn dan" data-action="remove-member" data-household="${esc(selected.id)}" data-id="${esc(member.id)}">Remove</button>
                    </div>
                  </div>
                `).join('') : '<div class="rm-empty">No members assigned.</div>'}
              </div>
            </div>
            <div>
              <h3>Registered Vehicles (${householdVehicles.length})</h3>
              <div class="rm-member-grid" style="grid-template-columns: 1fr;">
                ${householdVehicles.length ? householdVehicles.map(v => `
                  <div class="rm-member">
                    <h4>${esc(v.plateNumber)}</h4>
                    <p>Type: <strong>${esc(v.type === 'CAR' ? 'Car' : 'Motorcycle')}</strong></p>
                    <p>Owner: <strong>${esc(v.ownerName || '-')}</strong></p>
                    <p>Reg Date: <strong>${formatDate(v.registrationDate)}</strong></p>
                    <div class="rm-actions" style="margin-top:8px;">
                      <button class="rm-btn sec" data-action="edit-vehicle" data-id="${esc(v.id)}">Edit</button>
                      <button class="rm-btn dan" data-action="delete-vehicle" data-id="${esc(v.id)}">Delete</button>
                    </div>
                  </div>
                `).join('') : '<div class="rm-empty">No vehicles registered.</div>'}
                <div style="margin-top:12px;">
                  <button class="rm-btn pri" style="width:100%;" data-action="add-vehicle-quick" data-household="${esc(selected.id)}">+ Register Vehicle</button>
                </div>
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
          <td><strong>${esc(r.fullName)}</strong><br><span class="rm-muted">${esc(r.gender || '-')} - ${formatDate(r.dateOfBirth)} - ${r.alive === false ? 'Deceased' : 'Alive'}</span></td>
          <td>${esc(r.identityNo)}<br><span class="rm-muted">${esc(r.issuePlace || '-')} ${formatDate(r.issueDate)}</span></td>
          <td>${esc(r.apartmentNo || r.householdId || 'No household')}</td>
          <td>${renderBadge(r.status)}</td>
          <td><div class="rm-actions">
            <button class="rm-btn sec" data-action="edit-resident" data-id="${esc(r.id)}">Edit</button>
            <button class="rm-btn sec" data-action="residence-record" data-id="${esc(r.id)}">Residence</button>
            <button class="rm-btn dan" data-action="mark-deceased" data-id="${esc(r.id)}">Deceased</button>
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
              <div class="rm-field"><label>Citizen ID</label><input id="rm-res-identity" required pattern="(001|002|004|006|008|010|011|012|014|015|017|019|020|022|024|025|026|027|030|031|033|034|035|036|037|038|040|042|044|045|046|048|049|051|052|054|056|058|060|062|064|066|067|068|070|072|074|075|077|079|080|082|083|084|086|087|089|091|092|093|094|095|096)\\d{9}" maxlength="12" placeholder="12 digits"></div>
              <div class="rm-2">
                <div class="rm-field"><label>Phone</label><input id="rm-res-phone" pattern="0[35789]\\d{8}" maxlength="10" placeholder="0987654321"></div>
                <div class="rm-field"><label>Status</label><select id="rm-res-status">${RESIDENT_STATUSES.map(s => `<option value="${s}">${statusLabel(s)}</option>`).join('')}</select></div>
              </div>
              <div class="rm-2">
                <div class="rm-field"><label>Alias</label><input id="rm-res-alias"></div>
                <div class="rm-field"><label>Birth place</label><input id="rm-res-birth-place"></div>
              </div>
              <div class="rm-2">
                <div class="rm-field"><label>Hometown</label><input id="rm-res-hometown"></div>
                <div class="rm-field"><label>Ethnicity</label><input id="rm-res-ethnicity"></div>
              </div>
              <div class="rm-2">
                <div class="rm-field"><label>Religion</label><input id="rm-res-religion"></div>
                <div class="rm-field"><label>Occupation</label><input id="rm-res-occupation"></div>
              </div>
              <div class="rm-2">
                <div class="rm-field"><label>Workplace</label><input id="rm-res-workplace"></div>
                <div class="rm-field"><label>Date of death</label><input id="rm-res-death-date" type="date"></div>
              </div>
              <div class="rm-2">
                <div class="rm-field"><label>CCCD issue date</label><input id="rm-res-issue-date" type="date"></div>
                <div class="rm-field"><label>CCCD issue place</label><input id="rm-res-issue-place"></div>
              </div>
              <div class="rm-field"><label>Previous residence</label><input id="rm-res-previous"></div>
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

    const renderVehicles = async () => {
      const panel = container.querySelector('#rm-panel-vehicles');
      const page = state.vehiclePageData || emptyPage();
      const rows = page.content?.map(v => `
        <tr>
          <td><strong>${esc(v.plateNumber)}</strong></td>
          <td>${esc(v.type === 'CAR' ? 'Car (Ô tô)' : 'Motorcycle (Xe máy)')}</td>
          <td>${esc(v.ownerName || '-')}</td>
          <td>${formatDate(v.registrationDate)}</td>
          <td>${esc(v.apartmentNo || v.householdId || '-')}</td>
          <td><div class="rm-actions">
            <button class="rm-btn sec" data-action="edit-vehicle" data-id="${esc(v.id)}">Edit</button>
            <button class="rm-btn dan" data-action="delete-vehicle" data-id="${esc(v.id)}">Delete</button>
          </div></td>
        </tr>
      `).join('') || `<tr><td colspan="6" class="rm-empty">No vehicles found.</td></tr>`;

      panel.innerHTML = `
        <div class="rm-grid">
          <div class="rm-card">
            <h2 id="rm-vh-title">Register Vehicle</h2>
            <form class="rm-form" id="rm-vh-form">
              <div class="rm-field">
                <label>License Plate (Biển số xe)</label>
                <input id="rm-vh-plate" required placeholder="e.g. 29A1-123.45" pattern="\\d{2}[A-Za-z][0-9A-Za-z]?-\\d{3}\\.\\d{2}">
              </div>
              <div class="rm-field">
                <label>Vehicle Type (Loại xe)</label>
                <select id="rm-vh-type">
                  <option value="MOTORCYCLE">Motorcycle (Xe máy)</option>
                  <option value="CAR">Car (Ô tô)</option>
                </select>
              </div>
              <div class="rm-field">
                <label>Owner Name (Chủ xe)</label>
                <input id="rm-vh-owner" required placeholder="Chủ sở hữu xe">
              </div>
              <div class="rm-field">
                <label>Registration Date (Ngày đăng ký)</label>
                <input id="rm-vh-regdate" type="date" required>
              </div>
              <div class="rm-field">
                <label>Household (Căn hộ)</label>
                <select id="rm-vh-household" required>${householdOptions()}</select>
              </div>
              <div class="rm-actions">
                <button class="rm-btn pri" type="submit">Save Vehicle</button>
                <button class="rm-btn sec" type="button" data-action="clear-vehicle-form">Clear</button>
              </div>
            </form>
          </div>
          <div class="rm-card">
            <div class="rm-toolbar">
              <h2 style="margin:0;">Vehicle List</h2>
              <div class="rm-filter">
                <input class="rm-search" id="rm-vh-search" placeholder="Search plates..." value="${esc(state.vehiclesSearchPlate)}">
                <select class="rm-select" id="rm-vh-type-filter">
                  <option value="ALL">All types</option>
                  <option value="MOTORCYCLE" ${state.vehiclesSearchType === 'MOTORCYCLE' ? 'selected' : ''}>Motorcycle</option>
                  <option value="CAR" ${state.vehiclesSearchType === 'CAR' ? 'selected' : ''}>Car</option>
                </select>
              </div>
            </div>
            <div class="rm-table-wrap">
              <table class="rm-table">
                <thead><tr><th>Plate Number</th><th>Type</th><th>Owner</th><th>Reg Date</th><th>Apartment / Household</th><th>Actions</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
            ${renderPager(page, 'vehicles')}
          </div>
        </div>
      `;
      fillVehicleForm(panel, null);
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
                    <td>${formatDate(log.createdAt)}<br><span class="rm-muted">${new Date(log.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span></td>
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
      if (state.activeTab === 'vehicles') await renderVehicles();
      if (state.activeTab === 'search') renderSearch();
      if (state.activeTab === 'activity') renderActivity();
    };

    container.addEventListener('click', async event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      const id = button.dataset.id;
      try {
        if (button.disabled || button.getAttribute('aria-disabled') === 'true') return;
        if (action === 'households-prev') state.householdsPage = Math.max(0, state.householdsPage - 1);
        if (action === 'households-next') state.householdsPage = Math.min((state.householdPageData?.totalPages || 1) - 1, state.householdsPage + 1);
        if (action === 'residents-prev') state.residentsPage = Math.max(0, state.residentsPage - 1);
        if (action === 'residents-next') state.residentsPage = Math.min((state.residentPageData?.totalPages || 1) - 1, state.residentsPage + 1);
        if (action === 'vehicles-prev') state.vehiclesPage = Math.max(0, state.vehiclesPage - 1);
        if (action === 'vehicles-next') state.vehiclesPage = Math.min((state.vehiclePageData?.totalPages || 1) - 1, state.vehiclesPage + 1);
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
        
        if (action === 'edit-vehicle') {
          const vehicle = await DataService.getVehicle(id);
          state.activeTab = 'vehicles';
          await renderAll();
          const vhPanel = container.querySelector('#rm-panel-vehicles');
          fillVehicleForm(vhPanel, vehicle);
          return;
        }
        if (action === 'delete-vehicle') {
          if (!confirm(`Delete vehicle ${id}?`)) return;
          await DataService.deleteVehicle(id, actor());
          showToast('Vehicle deleted successfully', 'success');
        }
        if (action === 'clear-vehicle-form') {
          const vhPanel = container.querySelector('#rm-panel-vehicles');
          fillVehicleForm(vhPanel, null);
          return;
        }
        if (action === 'add-vehicle-quick') {
          const hhId = button.dataset.household;
          state.activeTab = 'vehicles';
          await renderAll();
          const vhPanel = container.querySelector('#rm-panel-vehicles');
          if (vhPanel) {
            fillVehicleForm(vhPanel, null);
            const hhSelect = vhPanel.querySelector('#rm-vh-household');
            if (hhSelect) hhSelect.value = hhId;
          }
          return;
        }

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
        if (action === 'change-head') {
          const identityNo = prompt('New household head Citizen ID (CCCD):');
          if (!identityNo) return;
          const reason = prompt('Reason for head change (optional):') || '';
          await DataService.changeHouseholdHead(id, identityNo.trim(), reason.trim(), actor());
          showToast('Household head changed', 'success');
        }
        if (action === 'transfer-ownership') {
          const newOwnerName = prompt('New owner full name:');
          if (!newOwnerName) return;
          const newOwnerIdentityNo = prompt('New owner Citizen ID (CCCD, optional):') || '';
          const newOwnerPhone = prompt('New owner phone (optional):') || '';
          const note = prompt('Ownership transfer note (optional):') || '';
          await DataService.transferOwnership(id, {
            newOwnerName: newOwnerName.trim(),
            newOwnerIdentityNo: newOwnerIdentityNo.trim(),
            newOwnerPhone: newOwnerPhone.trim(),
            note: note.trim()
          }, actor());
          showToast('Ownership transferred', 'success');
        }
        if (action === 'split-household') {
          const code = prompt('New household code:');
          if (!code) return;
          const apartmentNo = prompt('New apartment number:');
          if (!apartmentNo) return;
          const residentIds = (prompt('Resident IDs to move, separated by commas:') || '')
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
          if (!residentIds.length) { showToast('Enter at least one resident ID', 'warning'); return; }
          const headIdentityNo = prompt('New household head Citizen ID (optional):') || '';
          const headName = prompt('New household head name (optional):') || '';
          await DataService.splitHousehold(id, {
            newHousehold: {
              code: code.trim(),
              apartmentNo: apartmentNo.trim(),
              floor: 0,
              area: 50,
              headName: headName.trim() || 'Pending head',
              phone: '',
              status: 'OCCUPIED',
              note: 'Created from household split.',
              motorcycleCount: 0,
              carCount: 0
            },
            residentIds,
            headIdentityNo: headIdentityNo.trim(),
            reason: 'Household split'
          }, actor());
          showToast('Household split created', 'success');
        }
        if (action === 'mark-deceased') {
          const dateOfDeath = prompt('Date of death (YYYY-MM-DD, leave blank for today):') || '';
          const replacementHeadIdentityNo = prompt('Replacement head Citizen ID if this resident is household head (optional):') || '';
          const note = prompt('Note (optional):') || '';
          await DataService.reportDeath(id, {
            dateOfDeath: dateOfDeath.trim() || null,
            replacementHeadIdentityNo: replacementHeadIdentityNo.trim(),
            note: note.trim()
          }, actor());
          showToast('Resident marked deceased', 'success');
        }
        if (action === 'residence-record') {
          const type = prompt('Record type: PERMANENT_REGISTRATION, TEMPORARY_RESIDENCE, or TEMPORARY_ABSENCE');
          if (!type) return;
          const address = prompt('Residence address (optional):') || '';
          const startDate = prompt('Start date (YYYY-MM-DD, optional):') || '';
          const endDate = prompt('End date (YYYY-MM-DD, optional):') || '';
          const reason = prompt('Reason (optional):') || '';
          await DataService.createTemporaryRecord(id, {
            type: type.trim().toUpperCase(),
            address: address.trim(),
            startDate: startDate.trim() || null,
            endDate: endDate.trim() || null,
            reason: reason.trim()
          }, actor());
          showToast('Residence record saved', 'success');
        }
        if (action === 'reset-local') {
          if (!confirm('Reset local demo data? Backend data will not be changed.')) return;
          await DataService.resetLocal();
          showToast('Local demo data reset', 'info');
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
        if (event.target.id === 'rm-vh-form') {
          await DataService.saveVehicle(readVehicleForm(container), actor());
          const vhPanel = container.querySelector('#rm-panel-vehicles');
          fillVehicleForm(vhPanel, null);
          showToast('Vehicle registration saved', 'success');
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
        safeRefresh();
      }
      if (event.target.id === 'rm-res-search') {
        state.residentsSearch = event.target.value;
        state.residentsPage = 0;
        safeRefresh();
      }
      if (event.target.id === 'rm-vh-search') {
        state.vehiclesSearchPlate = event.target.value;
        state.vehiclesPage = 0;
        safeRefresh();
      }
      if (event.target.id === 'rm-global-search') {
        state.globalSearch = event.target.value;
        safeRefresh();
      }
      if (event.target.id === 'rm-hh-head-identity') {
        syncHouseholdHeadFromIdentity(container);
      }
    });

    container.addEventListener('change', event => {
      if (event.target.id === 'rm-hh-status-filter') {
        state.householdStatus = event.target.value;
        state.householdsPage = 0;
        safeRefresh();
      }
      if (event.target.id === 'rm-res-status-filter') {
        state.residentStatus = event.target.value;
        state.residentsPage = 0;
        safeRefresh();
      }
      if (event.target.id === 'rm-res-gender-filter') {
        state.residentGender = event.target.value;
        state.residentsPage = 0;
        safeRefresh();
      }
      if (event.target.id === 'rm-vh-type-filter') {
        state.vehiclesSearchType = event.target.value;
        state.vehiclesPage = 0;
        safeRefresh();
      }
      if (event.target.id === 'rm-global-type') {
        state.globalType = event.target.value;
        safeRefresh();
      }
      if (event.target.id === 'rm-hh-status') {
        syncHouseholdHeadFromIdentity(container);
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
    safeRefresh();
  }
}
