import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const form = document.getElementById("familyForm");
const userEmail = document.getElementById("userEmail");
const registrationDate = document.getElementById("registrationDate");
const numberOfChildren = document.getElementById("numberOfChildren");
const childrenContainer = document.getElementById("childrenContainer");
const memberPhoto = document.getElementById("memberPhoto");
const photoPreview = document.getElementById("photoPreview");
const familyCardList = document.getElementById("familyCardList");
const familySearch = document.getElementById("familySearch");
const saveBtn = document.getElementById("saveFamilyCardBtn");
const updateBtn = document.getElementById("updateFamilyCardBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let currentUser = null;
let editingId = null;
let currentPhotoData = "";
document.getElementById("logoutButton")?.addEventListener("click", async () => {
  await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js")
    .then(({ signOut }) => signOut(auth));
  window.location.href = "../index.html";
});


registrationDate.value = new Date().toISOString().split("T")[0];

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }
  currentUser = user;
  if (userEmail) userEmail.textContent = user.email || "User";
  loadFamilyCards();
});

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[ch]));
}

function calculateAge(dateValue) {
  if (!dateValue) return "";
  const birth = new Date(dateValue + "T00:00:00");
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday = today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age--;
  return age >= 0 ? String(age) : "";
}

function updateMemberAge() {
  const age = document.getElementById("memberAge");
  if (age) age.value = calculateAge(document.getElementById("dob")?.value || "");
}

function updateChildAge(row) {
  const age = row.querySelector(".child-age");
  if (age) age.value = calculateAge(row.querySelector(".child-dob")?.value || "");
}

function addChildRow(child = {}) {
  const row = document.createElement("div");
  row.className = "child-row";
  row.innerHTML = `
    <div class="child-number">${childrenContainer.querySelectorAll(".child-row").length + 1}</div>
    <div class="field"><label>Child Name</label><input type="text" class="child-name" value="${escapeHtml(child.name || "")}" required></div>
    <div class="field"><label>Date of Birth</label><input type="date" class="child-dob" value="${escapeHtml(child.dateOfBirth || "")}"></div>
    <div class="field"><label>Age</label><input type="number" class="child-age" min="0" readonly placeholder="Auto"></div>
    <div class="field"><label>Gender</label><select class="child-gender"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
    <button type="button" class="remove-child" aria-label="Remove child">×</button>
  `;
  childrenContainer.appendChild(row);
  row.querySelector(".child-gender").value = child.gender || "";
  updateChildAge(row);
  row.querySelector(".child-dob").addEventListener("change", () => updateChildAge(row));
}

function renumberChildren() {
  [...childrenContainer.querySelectorAll(".child-row")].forEach((row, i) => {
    row.querySelector(".child-number").textContent = i + 1;
  });
  numberOfChildren.value = String(childrenContainer.querySelectorAll(".child-row").length);
}

function createChildren() {
  const count = Math.max(0, parseInt(numberOfChildren?.value || "0", 10));
  const existing = getChildrenData();
  childrenContainer.innerHTML = "";
  for (let i = 0; i < count; i++) addChildRow(existing[i] || {});
  renumberChildren();
}

numberOfChildren?.addEventListener("change", createChildren);
document.getElementById("addChildButton")?.addEventListener("click", () => {
  addChildRow();
  renumberChildren();
});

document.getElementById("dob")?.addEventListener("change", updateMemberAge);
updateMemberAge();

memberPhoto?.addEventListener("change", () => {
  const file = memberPhoto.files?.[0];
  if (!file) {
    currentPhotoData = "";
    photoPreview.innerHTML = "";
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("Please select an image file.");
    memberPhoto.value = "";
    return;
  }

  // Keep Firestore document size safe. Resize/compress in browser.
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 600;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      currentPhotoData = canvas.toDataURL("image/jpeg", 0.78);
      photoPreview.innerHTML = `<img src="${currentPhotoData}" alt="Member photo preview">`;
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

function getChildrenData() {
  return [...document.querySelectorAll(".child-row")].map((row) => ({
    name: row.querySelector(".child-name")?.value.trim() || "",
    dateOfBirth: row.querySelector(".child-dob")?.value || "",
    age: row.querySelector(".child-age")?.value || "",
    gender: row.querySelector(".child-gender")?.value || ""
  }));
}

function getFormData() {
  return {
    registrationDate: registrationDate.value,
    familyCardNo: document.getElementById("familyCardNo")?.value.trim() || "",
    name: document.getElementById("name")?.value.trim() || "",
    dateOfBirth: document.getElementById("dob")?.value || "",
    age: document.getElementById("memberAge")?.value || "",
    mobileNo: document.getElementById("mobile")?.value.trim() || "",
    spouseName: document.getElementById("spouseName")?.value.trim() || "",
    address: document.getElementById("address")?.value.trim() || "",
    fatherName: document.getElementById("fatherName")?.value.trim() || "",
    motherName: document.getElementById("motherName")?.value.trim() || "",
    numberOfChildren: getChildrenData().length,
    children: getChildrenData(),
    memberPhoto: currentPhotoData || "",
    createdBy: currentUser.uid,
    createdByEmail: currentUser.email || ""
  };
}

function populateForm(data, id) {
  editingId = id;
  registrationDate.value = data.registrationDate || "";
  document.getElementById("familyCardNo").value = data.familyCardNo || "";
  document.getElementById("name").value = data.name || "";
  document.getElementById("dob").value = data.dateOfBirth || "";
  document.getElementById("memberAge").value = data.age ?? calculateAge(data.dateOfBirth || "");
  document.getElementById("mobile").value = data.mobileNo || "";
  document.getElementById("spouseName").value = data.spouseName || "";
  document.getElementById("address").value = data.address || "";
  document.getElementById("fatherName").value = data.fatherName || "";
  document.getElementById("motherName").value = data.motherName || "";

  const children = Array.isArray(data.children) ? data.children : [];
  numberOfChildren.value = String(children.length);
  createChildren();
  [...document.querySelectorAll(".child-row")].forEach((row, i) => {
    const child = children[i] || {};
    row.querySelector(".child-name").value = child.name || "";
    row.querySelector(".child-dob").value = child.dateOfBirth || "";
    row.querySelector(".child-age").value = child.age ?? calculateAge(child.dateOfBirth || "");
    row.querySelector(".child-gender").value = child.gender || "";
  });

  currentPhotoData = data.memberPhoto || "";
  photoPreview.innerHTML = currentPhotoData
    ? `<img src="${currentPhotoData}" alt="Member photo">`
    : "";

  saveBtn.hidden = true;
  updateBtn.hidden = false;
  cancelEditBtn.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  editingId = null;
  form.reset();
  registrationDate.value = new Date().toISOString().split("T")[0];
  currentPhotoData = "";
  photoPreview.innerHTML = "";
  childrenContainer.innerHTML = "";
  saveBtn.hidden = false;
  updateBtn.hidden = true;
  cancelEditBtn.hidden = true;
}

cancelEditBtn?.addEventListener("click", resetForm);
document.getElementById("resetButton")?.addEventListener("click", () => {
  setTimeout(resetForm, 0);
});

form?.addEventListener("click", (event) => {
  if (!event.target.classList.contains("remove-child")) return;
  event.target.closest(".child-row")?.remove();
  renumberChildren();
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const data = getFormData();
  if (!data.familyCardNo || !data.name) {
    alert("Please enter Family Card No. and Name.");
    return;
  }

  try {
    saveBtn.disabled = true;
    if (editingId) {
      await updateDoc(doc(db, "familyCards", editingId), {
        ...data,
        updatedBy: currentUser.uid,
        updatedByEmail: currentUser.email || "",
        updatedAt: serverTimestamp()
      });
      alert("Family Card updated successfully.");
    } else {
      await addDoc(collection(db, "familyCards"), {
        ...data,
        createdAt: serverTimestamp()
      });
      alert("Family Card saved successfully.");
    }

    resetForm();
    await loadFamilyCards();
  } catch (error) {
    console.error(error);
    if (error.code === "permission-denied") {
      alert("Firestore permission denied. Please check Firestore Security Rules.");
    } else {
      alert("Could not save the Family Card: " + error.message);
    }
  } finally {
    saveBtn.disabled = false;
  }
});

updateBtn?.addEventListener("click", () => form?.requestSubmit());

async function deleteFamilyCard(id, name) {
  const ok = confirm(`Delete Family Card for "${name}"?\n\nThis action cannot be undone.`);
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "familyCards", id));
    if (editingId === id) resetForm();
    await loadFamilyCards();
    alert("Family Card deleted.");
  } catch (error) {
    console.error(error);
    alert("Could not delete the Family Card: " + error.message);
  }
}

function renderCards(cards) {
  if (!cards.length) {
    familyCardList.innerHTML = `<div class="empty-state">No family cards found.</div>`;
    return;
  }

  familyCardList.innerHTML = cards.map(({ id, data }) => `
    <div class="family-record-card">
      <div class="record-photo">
        ${data.memberPhoto
          ? `<img src="${data.memberPhoto}" alt="${escapeHtml(data.name)}">`
          : `<span>👤</span>`}
      </div>
      <div class="record-main">
        <div class="record-title">${escapeHtml(data.name || "Unnamed Family")}</div>
        <div class="record-meta">
          <span><strong>Card No:</strong> ${escapeHtml(data.familyCardNo)}</span>
          <span><strong>Mobile:</strong> ${escapeHtml(data.mobileNo)}</span>
          <span><strong>Children:</strong> ${data.numberOfChildren ?? 0}</span>
        </div>
        <div class="record-address">${escapeHtml(data.address || "No address entered")}</div>
      </div>
      <div class="record-actions">
        <button type="button" class="btn btn-secondary edit-record">Edit</button>
        <button type="button" class="btn btn-danger delete-record">Delete</button>
      </div>
    </div>
  `).join("");

  familyCardList.querySelectorAll(".edit-record").forEach((btn, index) => {
    btn.addEventListener("click", () => {
      const card = cards[index];
      populateForm(card.data, card.id);
    });
  });

  familyCardList.querySelectorAll(".delete-record").forEach((btn, index) => {
    btn.addEventListener("click", () => {
      const card = cards[index];
      deleteFamilyCard(card.id, card.data.name || "this family");
    });
  });
}

async function loadFamilyCards() {
  if (!familyCardList || !currentUser) return;
  familyCardList.innerHTML = `<div class="empty-state">Loading family cards...</div>`;

  try {
    const snapshot = await getDocs(collection(db, "familyCards"));
    const cards = snapshot.docs
      .map(d => ({ id: d.id, data: d.data() }))
      .sort((a, b) => {
        const da = a.data.createdAt?.seconds || 0;
        const dbb = b.data.createdAt?.seconds || 0;
        return dbb - da;
      });
    renderCards(cards);
    window.allFamilyCards = cards;
  } catch (error) {
    console.error(error);
    familyCardList.innerHTML = `<div class="empty-state">Could not load family cards.</div>`;
  }
}

familySearch?.addEventListener("input", () => {
  const term = familySearch.value.trim().toLowerCase();
  const cards = (window.allFamilyCards || []).filter(({ data }) =>
    [data.familyCardNo, data.name, data.mobileNo, data.address]
      .some(v => String(v || "").toLowerCase().includes(term))
  );
  renderCards(cards);
});
