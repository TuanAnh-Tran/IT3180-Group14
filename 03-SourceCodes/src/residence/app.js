const STORAGE_KEY = "bluemoon_resident_manager_v1_en";

let households = [];
let residents = [];
let selectedHouseholdId = null;

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  attachEvents();
  renderAll();
});

function attachEvents() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => openTab(btn.dataset.tab));
  });

  $("householdForm").addEventListener("submit", saveHousehold);
  $("residentForm").addEventListener("submit", saveResident);

  $("cancelHouseholdBtn").addEventListener("click", resetHouseholdForm);
  $("cancelResidentBtn").addEventListener("click", resetResidentForm);

  $("householdQuickSearch").addEventListener("input", renderHouseholdTable);
  $("residentQuickSearch").addEventListener("input", renderResidentTable);

  $("globalSearchInput").addEventListener("input", renderSearchResults);
  $("globalSearchType").addEventListener("change", renderSearchResults);

  $("addMemberBtn").addEventListener("click", addMemberToSelectedHousehold);

  $("resetDataBtn").addEventListener("click", () => {
    if (!confirm("Are you sure you want to delete current data and restore sample data?")) return;

    seedData();
    saveData();
    selectedHouseholdId = null;
    renderAll();
    showToast("Sample data has been reset");
  });

  document.body.addEventListener("click", handleActionClick);
}

function openTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    seedData();
    saveData();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    households = parsed.households || [];
    residents = parsed.residents || [];
    syncHouseholdMembers();
  } catch {
    seedData();
    saveData();
  }
}

function saveData() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      households,
      residents,
    })
  );
}

function seedData() {
  households = [
    {
      id: "hh_1",
      code: "HH-A1201",
      apartmentNo: "A1201",
      floor: 12,
      area: 72.5,
      headName: "Nguyen Van An",
      phone: "0987654321",
      status: "Occupied",
      note: "This household has completed permanent residence registration.",
      members: ["rs_1", "rs_2"],
    },
    {
      id: "hh_2",
      code: "HH-B0805",
      apartmentNo: "B0805",
      floor: 8,
      area: 65,
      headName: "Tran Thi Binh",
      phone: "0911222333",
      status: "Occupied",
      note: "This household has one temporary resident.",
      members: ["rs_3", "rs_4"],
    },
  ];

  residents = [
    {
      id: "rs_1",
      fullName: "Nguyen Van An",
      gender: "Male",
      dob: "1985-04-12",
      identityNo: "001085000111",
      phone: "0987654321",
      hometown: "Hanoi",
      occupation: "Engineer",
      status: "Permanent resident",
      householdId: "hh_1",
    },
    {
      id: "rs_2",
      fullName: "Le Thu Ha",
      gender: "Female",
      dob: "1988-08-20",
      identityNo: "001188000222",
      phone: "0977000111",
      hometown: "Hanoi",
      occupation: "Teacher",
      status: "Permanent resident",
      householdId: "hh_1",
    },
    {
      id: "rs_3",
      fullName: "Tran Thi Binh",
      gender: "Female",
      dob: "1979-01-15",
      identityNo: "031079000333",
      phone: "0911222333",
      hometown: "Nam Dinh",
      occupation: "Accountant",
      status: "Permanent resident",
      householdId: "hh_2",
    },
    {
      id: "rs_4",
      fullName: "Pham Minh Duc",
      gender: "Male",
      dob: "1998-11-02",
      identityNo: "022098000444",
      phone: "0909090909",
      hometown: "Hai Phong",
      occupation: "Student",
      status: "Temporary resident",
      householdId: "hh_2",
    },
  ];

  selectedHouseholdId = null;
}

function renderAll() {
  syncHouseholdMembers();
  renderStats();
  renderHouseholdTable();
  renderResidentTable();
  renderHouseholdSelects();
  renderMembers();
  renderSearchResults();
}

function renderStats() {
  $("totalHouseholds").textContent = households.length;
  $("totalResidents").textContent = residents.length;
  $("occupiedApartments").textContent = households.filter((h) => h.status === "Occupied").length;
  $("temporaryResidents").textContent = residents.filter(
    (r) => r.status === "Temporary resident" || r.status === "Temporarily away"
  ).length;
}

function renderHouseholdTable() {
  const keyword = normalize($("householdQuickSearch").value);

  const filtered = households.filter((h) => {
    const text = normalize(`${h.code} ${h.apartmentNo} ${h.headName} ${h.phone} ${h.status}`);
    return text.includes(keyword);
  });

  $("householdTableBody").innerHTML = filtered.length
    ? filtered
        .map((h) => {
          const memberCount = getMembersByHousehold(h.id).length;

          return `
            <tr>
              <td>${escapeHtml(h.code)}</td>
              <td>
                <strong>${escapeHtml(h.apartmentNo)}</strong><br>
                <span class="muted">Floor ${h.floor || "-"}</span>
              </td>
              <td>
                ${escapeHtml(h.headName)}<br>
                <span class="muted">${escapeHtml(h.phone || "-")}</span>
              </td>
              <td>${memberCount}</td>
              <td>${statusBadge(h.status)}</td>
              <td>
                <div class="actions">
                  <button data-action="view-household" data-id="${h.id}">Members</button>
                  <button class="secondary" data-action="edit-household" data-id="${h.id}">Edit</button>
                  <button class="danger" data-action="delete-household" data-id="${h.id}">Delete</button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="6" class="empty">No matching households found</td></tr>`;
}

function renderResidentTable() {
  const keyword = normalize($("residentQuickSearch").value);

  const filtered = residents.filter((r) => {
    const h = findHousehold(r.householdId);
    const text = normalize(
      `${r.fullName} ${r.identityNo} ${r.phone} ${r.status} ${h ? h.apartmentNo : ""}`
    );

    return text.includes(keyword);
  });

  $("residentTableBody").innerHTML = filtered.length
    ? filtered
        .map((r) => {
          const h = findHousehold(r.householdId);

          return `
            <tr>
              <td>
                <strong>${escapeHtml(r.fullName)}</strong><br>
                <span class="muted">${escapeHtml(r.gender)} - ${formatDate(r.dob)}</span>
              </td>
              <td>${escapeHtml(r.identityNo)}</td>
              <td>${h ? escapeHtml(h.apartmentNo) : "<span class='muted'>No household</span>"}</td>
              <td>${statusBadge(r.status)}</td>
              <td>
                <div class="actions">
                  <button class="secondary" data-action="edit-resident" data-id="${r.id}">Edit</button>
                  <button class="danger" data-action="delete-resident" data-id="${r.id}">Delete</button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="5" class="empty">No matching residents found</td></tr>`;
}

function renderHouseholdSelects() {
  const options = [
    `<option value="">-- No household --</option>`,
    ...households.map(
      (h) => `<option value="${h.id}">${escapeHtml(h.apartmentNo)} - ${escapeHtml(h.headName)}</option>`
    ),
  ].join("");

  $("residentHousehold").innerHTML = options;

  if (!selectedHouseholdId) {
    $("residentToAdd").innerHTML = `<option value="">-- Select a household first --</option>`;
    $("residentToAdd").disabled = true;
    $("addMemberBtn").disabled = true;
    return;
  }

  const candidates = residents.filter((r) => r.householdId !== selectedHouseholdId);

  $("residentToAdd").disabled = false;
  $("addMemberBtn").disabled = false;

  $("residentToAdd").innerHTML = candidates.length
    ? [
        `<option value="">-- Select a resident to add --</option>`,
        ...candidates.map((r) => {
          const oldHousehold = findHousehold(r.householdId);
          const note = oldHousehold ? `currently in ${oldHousehold.apartmentNo}` : "no household";

          return `<option value="${r.id}">${escapeHtml(r.fullName)} - ${escapeHtml(note)}</option>`;
        }),
      ].join("")
    : `<option value="">No available residents</option>`;
}

function renderMembers() {
  const title = $("selectedHouseholdTitle");
  const list = $("memberList");

  if (!selectedHouseholdId) {
    title.textContent = "Select a household to view, add or remove members.";
    list.innerHTML = "";
    return;
  }

  const household = findHousehold(selectedHouseholdId);

  if (!household) {
    selectedHouseholdId = null;
    renderMembers();
    return;
  }

  const members = getMembersByHousehold(selectedHouseholdId);

  title.innerHTML = `
    Managing household <strong>${escapeHtml(household.code)}</strong>,
    apartment <strong>${escapeHtml(household.apartmentNo)}</strong>,
    household head <strong>${escapeHtml(household.headName)}</strong>.
  `;

  list.innerHTML = members.length
    ? members
        .map(
          (r) => `
            <div class="member-card">
              <h3>${escapeHtml(r.fullName)}</h3>
              <p>Citizen ID: ${escapeHtml(r.identityNo)}</p>
              <p>Status: ${escapeHtml(r.status)}</p>
              <p>Phone: ${escapeHtml(r.phone || "-")}</p>
              <div class="actions">
                <button class="secondary" data-action="edit-resident" data-id="${r.id}">Edit</button>
                <button class="danger" data-action="remove-member" data-id="${r.id}">Remove</button>
              </div>
            </div>
          `
        )
        .join("")
    : `<p class="empty">This household has no members.</p>`;
}

function renderSearchResults() {
  const keyword = normalize($("globalSearchInput").value);
  const type = $("globalSearchType").value;
  const rows = [];

  if (type === "all" || type === "resident") {
    residents.forEach((r) => {
      const h = findHousehold(r.householdId);

      const text = normalize(
        `${r.fullName} ${r.identityNo} ${r.phone} ${r.hometown} ${r.occupation} ${r.status} ${h ? h.apartmentNo : ""}`
      );

      if (!keyword || text.includes(keyword)) {
        rows.push({
          type: "Resident",
          main: `${r.fullName} - ${r.identityNo}`,
          detail: `Phone: ${r.phone || "-"} | Apartment: ${h ? h.apartmentNo : "No household"} | Status: ${r.status}`,
          action: `<button data-action="edit-resident" data-id="${r.id}">View / Edit</button>`,
        });
      }
    });
  }

  if (type === "all" || type === "apartment") {
    households.forEach((h) => {
      const memberCount = getMembersByHousehold(h.id).length;
      const text = normalize(`${h.code} ${h.apartmentNo} ${h.headName} ${h.phone} ${h.status}`);

      if (!keyword || text.includes(keyword)) {
        rows.push({
          type: "Apartment / Household",
          main: `${h.code} - ${h.apartmentNo}`,
          detail: `Head: ${h.headName} | Floor: ${h.floor || "-"} | Members: ${memberCount} | Status: ${h.status}`,
          action: `<button data-action="view-household" data-id="${h.id}">View household</button>`,
        });
      }
    });
  }

  $("searchResultBody").innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.type)}</td>
              <td><strong>${escapeHtml(row.main)}</strong></td>
              <td>${escapeHtml(row.detail)}</td>
              <td>${row.action}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="4" class="empty">No matching results found</td></tr>`;
}

function saveHousehold(event) {
  event.preventDefault();

  const id = $("householdId").value;
  const code = $("householdCode").value.trim();
  const apartmentNo = $("apartmentNo").value.trim();
  const headName = $("headName").value.trim();

  if (!code || !apartmentNo || !headName) {
    showToast("Please enter household code, apartment number and household head");
    return;
  }

  const duplicateApartment = households.some(
    (h) => normalize(h.apartmentNo) === normalize(apartmentNo) && h.id !== id
  );

  if (duplicateApartment) {
    showToast("Apartment number already exists");
    return;
  }

  const data = {
    code,
    apartmentNo,
    floor: Number($("floor").value) || "",
    area: Number($("area").value) || "",
    headName,
    phone: $("householdPhone").value.trim(),
    status: $("householdStatus").value,
    note: $("householdNote").value.trim(),
  };

  if (id) {
    const index = households.findIndex((h) => h.id === id);

    households[index] = {
      ...households[index],
      ...data,
    };

    showToast("Household has been updated");
  } else {
    households.push({
      id: createId("hh"),
      ...data,
      members: [],
    });

    showToast("Household has been added");
  }

  saveData();
  resetHouseholdForm();
  renderAll();
}

function saveResident(event) {
  event.preventDefault();

  const id = $("residentId").value;
  const fullName = $("fullName").value.trim();
  const identityNo = $("identityNo").value.trim();

  if (!fullName || !identityNo) {
    showToast("Please enter full name and citizen ID");
    return;
  }

  const duplicateIdentity = residents.some(
    (r) => normalize(r.identityNo) === normalize(identityNo) && r.id !== id
  );

  if (duplicateIdentity) {
    showToast("Citizen ID already exists");
    return;
  }

  const data = {
    fullName,
    gender: $("gender").value,
    dob: $("dob").value,
    identityNo,
    phone: $("phone").value.trim(),
    hometown: $("hometown").value.trim(),
    occupation: $("occupation").value.trim(),
    status: $("residentStatus").value,
    householdId: $("residentHousehold").value,
  };

  if (id) {
    const index = residents.findIndex((r) => r.id === id);

    residents[index] = {
      ...residents[index],
      ...data,
    };

    showToast("Resident has been updated");
  } else {
    residents.push({
      id: createId("rs"),
      ...data,
    });

    showToast("Resident has been added");
  }

  syncHouseholdMembers();
  saveData();
  resetResidentForm();
  renderAll();
}

function handleActionClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "edit-household") {
    editHousehold(id);
  }

  if (action === "delete-household") {
    deleteHousehold(id);
  }

  if (action === "view-household") {
    selectedHouseholdId = id;
    openTab("householdTab");
    renderAll();
    document.getElementById("selectedHouseholdTitle").scrollIntoView({ behavior: "smooth" });
  }

  if (action === "edit-resident") {
    editResident(id);
  }

  if (action === "delete-resident") {
    deleteResident(id);
  }

  if (action === "remove-member") {
    removeMember(id);
  }
}

function editHousehold(id) {
  const h = findHousehold(id);
  if (!h) return;

  $("householdId").value = h.id;
  $("householdCode").value = h.code;
  $("apartmentNo").value = h.apartmentNo;
  $("floor").value = h.floor;
  $("area").value = h.area;
  $("headName").value = h.headName;
  $("householdPhone").value = h.phone;
  $("householdStatus").value = h.status;
  $("householdNote").value = h.note;

  $("householdFormTitle").textContent = "Update household";
  openTab("householdTab");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteHousehold(id) {
  const h = findHousehold(id);
  if (!h) return;

  if (
    !confirm(
      `Delete household ${h.code} - apartment ${h.apartmentNo}? All members will be moved to "No household".`
    )
  ) {
    return;
  }

  households = households.filter((item) => item.id !== id);

  residents = residents.map((r) => {
    if (r.householdId === id) {
      return { ...r, householdId: "" };
    }

    return r;
  });

  if (selectedHouseholdId === id) selectedHouseholdId = null;

  saveData();
  resetHouseholdForm();
  renderAll();
  showToast("Household has been deleted");
}

function editResident(id) {
  const r = findResident(id);
  if (!r) return;

  $("residentId").value = r.id;
  $("fullName").value = r.fullName;
  $("gender").value = r.gender;
  $("dob").value = r.dob;
  $("identityNo").value = r.identityNo;
  $("phone").value = r.phone;
  $("hometown").value = r.hometown;
  $("occupation").value = r.occupation;
  $("residentStatus").value = r.status;
  $("residentHousehold").value = r.householdId;

  $("residentFormTitle").textContent = "Update resident";
  openTab("residentTab");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteResident(id) {
  const r = findResident(id);
  if (!r) return;

  if (!confirm(`Delete resident ${r.fullName}?`)) return;

  residents = residents.filter((item) => item.id !== id);

  syncHouseholdMembers();
  saveData();
  resetResidentForm();
  renderAll();
  showToast("Resident has been deleted");
}

function addMemberToSelectedHousehold() {
  if (!selectedHouseholdId) {
    showToast("Please select a household first");
    return;
  }

  const residentId = $("residentToAdd").value;

  if (!residentId) {
    showToast("Please select a resident to add");
    return;
  }

  const resident = findResident(residentId);
  if (!resident) return;

  resident.householdId = selectedHouseholdId;

  syncHouseholdMembers();
  saveData();
  renderAll();
  showToast("Member has been added to household");
}

function removeMember(residentId) {
  const resident = findResident(residentId);
  if (!resident) return;

  if (!confirm(`Remove ${resident.fullName} from this household?`)) return;

  resident.householdId = "";

  syncHouseholdMembers();
  saveData();
  renderAll();
  showToast("Member has been removed from household");
}

function resetHouseholdForm() {
  $("householdForm").reset();
  $("householdId").value = "";
  $("householdFormTitle").textContent = "Add household";
}

function resetResidentForm() {
  $("residentForm").reset();
  $("residentId").value = "";
  $("residentFormTitle").textContent = "Add resident";
}

function syncHouseholdMembers() {
  households = households.map((h) => ({
    ...h,
    members: residents.filter((r) => r.householdId === h.id).map((r) => r.id),
  }));
}

function getMembersByHousehold(householdId) {
  return residents.filter((r) => r.householdId === householdId);
}

function findHousehold(id) {
  return households.find((h) => h.id === id);
}

function findResident(id) {
  return residents.find((r) => r.id === id);
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB");
}

function statusBadge(status) {
  let cls = "";

  if (status === "Temporary resident" || status === "Temporarily away") cls = "warning";
  if (status === "Moved out") cls = "danger";
  if (status === "Vacant") cls = "gray";

  return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

function showToast(message) {
  const toast = $("toast");

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}