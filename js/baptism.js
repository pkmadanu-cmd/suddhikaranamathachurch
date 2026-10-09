import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const form = document.getElementById("baptismForm");
const userEmail = document.getElementById("userEmail");
const list = document.getElementById("baptismList");
const search = document.getElementById("baptismSearch");
const saveBtn = document.getElementById("saveBaptismBtn");
const updateBtn = document.getElementById("updateBaptismBtn");
const cancelBtn = document.getElementById("cancelEditBtn");
const resetBtn = document.getElementById("resetButton");
const message = document.getElementById("formMessage");
const formTitle = document.getElementById("formTitle");

let currentUser = null;
let editingId = null;
let allRecords = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }
  currentUser = user;
  userEmail.textContent = user.email || "User";
  await loadRecords();
});

document.getElementById("logoutButton")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../index.html";
});

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[ch]));
}

function value(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function getFormData() {
  return {
    refNo: value("refNo"),
    placeOfBaptism: value("placeOfBaptism"),
    dateOfBirth: document.getElementById("dateOfBirth").value,
    dateOfBaptism: document.getElementById("dateOfBaptism").value,
    name: value("name"),
    fatherName: value("fatherName"),
    motherName: value("motherName"),
    occupation: value("occupation"),
    residence: value("residence"),
    godFather: value("godFather"),
    godMother: value("godMother"),
    minister: value("minister"),
    confirmed: document.getElementById("confirmed").value,
    married: document.getElementById("married").value,
    createdBy: currentUser.uid,
    createdByEmail: currentUser.email || ""
  };
}

function populateForm(data, id) {
  editingId = id;
  if (formTitle) formTitle.textContent = "Edit Baptism Record";

  document.getElementById("refNo").value = data.refNo || "";
  document.getElementById("placeOfBaptism").value = data.placeOfBaptism || "";
  document.getElementById("dateOfBirth").value = data.dateOfBirth || "";
  document.getElementById("dateOfBaptism").value = data.dateOfBaptism || "";
  document.getElementById("name").value = data.name || "";
  document.getElementById("fatherName").value = data.fatherName || "";
  document.getElementById("motherName").value = data.motherName || "";
  document.getElementById("occupation").value = data.occupation || "";
  document.getElementById("residence").value = data.residence || "";
  document.getElementById("godFather").value = data.godFather || "";
  document.getElementById("godMother").value = data.godMother || "";
  document.getElementById("minister").value = data.minister || "";
  document.getElementById("confirmed").value = data.confirmed || "No";
  document.getElementById("married").value = data.married || "No";

  saveBtn.hidden = true;
  updateBtn.hidden = false;
  cancelBtn.hidden = false;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  editingId = null;
  form.reset();
  if (formTitle) formTitle.textContent = "New Baptism Record";
  document.getElementById("placeOfBaptism").value = "Our Lady of Purification Church, Dharmaram";
  saveBtn.hidden = false;
  updateBtn.hidden = true;
  cancelBtn.hidden = true;
  message.textContent = "";
}

cancelBtn.addEventListener("click", resetForm);

resetBtn.addEventListener("click", () => {
  setTimeout(resetForm, 0);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const data = getFormData();

  if (!data.refNo || !data.name || !data.dateOfBaptism) {
    message.textContent = "Please enter Ref No., Name, and Date of Baptism.";
    message.className = "form-message error";
    return;
  }

  try {
    saveBtn.disabled = true;
    updateBtn.disabled = true;

    if (editingId) {
      await updateDoc(doc(db, "baptisms", editingId), {
        ...data,
        updatedBy: currentUser.uid,
        updatedByEmail: currentUser.email || "",
        updatedAt: serverTimestamp()
      });
      message.textContent = "Baptism record updated successfully.";
    } else {
      await addDoc(collection(db, "baptisms"), {
        ...data,
        createdAt: serverTimestamp()
      });
      message.textContent = "Baptism record saved successfully.";
    }

    message.className = "form-message success";
    resetForm();
    await loadRecords();
  } catch (error) {
    console.error(error);
    message.textContent = error.code === "permission-denied"
      ? "Firestore permission denied. Please add the Baptism collection to your Security Rules."
      : "Could not save the Baptism record: " + error.message;
    message.className = "form-message error";
  } finally {
    saveBtn.disabled = false;
    updateBtn.disabled = false;
  }
});

updateBtn.addEventListener("click", () => form.requestSubmit());

async function deleteRecord(id, name) {
  if (!confirm(`Delete the Baptism record for "${name}"?\n\nThis action cannot be undone.`)) {
    return;
  }

  try {
    await deleteDoc(doc(db, "baptisms", id));
    await loadRecords();
  } catch (error) {
    console.error(error);
    alert("Could not delete the Baptism record: " + error.message);
  }
}

function renderRecords(records) {
  if (!records.length) {
    list.innerHTML = `<tr><td colspan="8" class="register-empty">No baptism records found.</td></tr>`;
    return;
  }

  list.innerHTML = records.map(({ id, data }) => `
    <tr>
      <td class="ref-cell">${escapeHtml(data.refNo)}</td>
      <td class="name-cell">${escapeHtml(data.name)}</td>
      <td>${escapeHtml(data.dateOfBaptism)}</td>
      <td>${escapeHtml(data.dateOfBirth)}</td>
      <td>${escapeHtml(data.fatherName)}</td>
      <td>${escapeHtml(data.motherName)}</td>
      <td>${escapeHtml(data.minister)}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="table-btn edit-record" data-id="${escapeHtml(id)}">Edit</button>
          <button type="button" class="table-btn delete-record" data-id="${escapeHtml(id)}">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");

  list.querySelectorAll(".edit-record").forEach(btn => {
    btn.addEventListener("click", () => {
      const record = allRecords.find(r => r.id === btn.dataset.id);
      if (record) populateForm(record.data, record.id);
    });
  });

  list.querySelectorAll(".delete-record").forEach(btn => {
    btn.addEventListener("click", () => {
      const record = allRecords.find(r => r.id === btn.dataset.id);
      if (record) deleteRecord(record.id, record.data.name || "this person");
    });
  });
}

async function loadRecords() {
  if (!currentUser) return;

  list.innerHTML = `<div class="empty-state">Loading baptism records...</div>`;

  try {
    const snapshot = await getDocs(collection(db, "baptisms"));
    allRecords = snapshot.docs
      .map(d => ({ id: d.id, data: d.data() }))
      .sort((a, b) => (b.data.createdAt?.seconds || 0) - (a.data.createdAt?.seconds || 0));

    renderRecords(allRecords);
  } catch (error) {
    console.error(error);
    list.innerHTML = `<div class="empty-state">Could not load baptism records.</div>`;
  }
}

search.addEventListener("input", () => {
  const term = search.value.trim().toLowerCase();

  const filtered = allRecords.filter(({ data }) =>
    [
      data.refNo,
      data.name,
      data.fatherName,
      data.motherName,
      data.godFather,
      data.godMother,
      data.residence
    ].some(v => String(v || "").toLowerCase().includes(term))
  );

  renderRecords(filtered);
});
