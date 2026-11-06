import { auth, db } from "./firebase.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const form = document.getElementById("marriageForm");
const userEmail = document.getElementById("userEmail");
const list = document.getElementById("marriageList");
const search = document.getElementById("marriageSearch");
const saveBtn = document.getElementById("saveMarriageBtn");
const updateBtn = document.getElementById("updateMarriageBtn");
const cancelBtn = document.getElementById("cancelEditBtn");
const resetBtn = document.getElementById("resetButton");
const message = document.getElementById("formMessage");
const formTitle = document.getElementById("formTitle");
let currentUser = null, editingId = null, allRecords = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../index.html"; return; }
  currentUser = user;
  userEmail.textContent = user.email || "User";
  await loadRecords();
});

document.getElementById("logoutButton")?.addEventListener("click", async () => { await signOut(auth); window.location.href = "../index.html"; });

function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch])); }
function value(id) { return document.getElementById(id)?.value.trim() || ""; }
function getFormData() {
  return {
    refNo: value("refNo"), dateOfMarriage: document.getElementById("dateOfMarriage").value, placeOfMarriage: value("placeOfMarriage"),
    bridegroomName: value("bridegroomName"), bridegroomSurname: value("bridegroomSurname"), bridegroomDob: document.getElementById("bridegroomDob").value,
    bridegroomOccupation: value("bridegroomOccupation"), bridegroomAddress: value("bridegroomAddress"), bridegroomFatherName: value("bridegroomFatherName"), bridegroomMotherName: value("bridegroomMotherName"),
    bridegroomWitness: value("bridegroomWitness"),
    brideName: value("brideName"), brideSurname: value("brideSurname"), brideDob: document.getElementById("brideDob").value,
    brideOccupation: value("brideOccupation"), brideAddress: value("brideAddress"), brideFatherName: value("brideFatherName"), brideMotherName: value("brideMotherName"),
    brideWitness: value("brideWitness"), minister: value("minister"), createdBy: currentUser.uid, createdByEmail: currentUser.email || ""
  };
}

const textFields = ["refNo","placeOfMarriage","bridegroomName","bridegroomSurname","bridegroomOccupation","bridegroomAddress","bridegroomFatherName","bridegroomMotherName","bridegroomWitness","brideName","brideSurname","brideOccupation","brideAddress","brideFatherName","brideMotherName","brideWitness","minister"];
const dateFields = ["dateOfMarriage","bridegroomDob","brideDob"];

function populateForm(data, id) {
  editingId = id;
  textFields.forEach(k => { document.getElementById(k).value = data[k] || ""; });
  document.getElementById("minister").value = data.minister || data.bridegroomMinister || data.brideMinister || "";
  dateFields.forEach(k => { document.getElementById(k).value = data[k] || ""; });
  formTitle.textContent = "Edit Marriage Record";
  saveBtn.hidden = true; updateBtn.hidden = false; cancelBtn.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  editingId = null;
  form.reset();
  formTitle.textContent = "New Marriage Record";
  saveBtn.hidden = false; updateBtn.hidden = true; cancelBtn.hidden = true;
  message.textContent = ""; message.className = "marriage-message";
}

cancelBtn.addEventListener("click", resetForm);
resetBtn.addEventListener("click", () => setTimeout(resetForm, 0));

form.addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser) return;
  const data = getFormData();
  if (!data.refNo || !data.dateOfMarriage || !data.bridegroomName || !data.brideName) {
    message.textContent = "Please enter Ref No., Date of Marriage, Bridegroom Name and Bride Name.";
    message.className = "marriage-message error"; return;
  }
  try {
    saveBtn.disabled = true; updateBtn.disabled = true;
    if (editingId) {
      await updateDoc(doc(db, "marriages", editingId), { ...data, updatedBy: currentUser.uid, updatedByEmail: currentUser.email || "", updatedAt: serverTimestamp() });
      message.textContent = "Marriage record updated successfully.";
    } else {
      await addDoc(collection(db, "marriages"), { ...data, createdAt: serverTimestamp() });
      message.textContent = "Marriage record saved successfully.";
    }
    message.className = "marriage-message success";
    await loadRecords();
    const success = message.textContent;
    resetForm(); message.textContent = success; message.className = "marriage-message success";
  } catch (error) {
    console.error(error);
    message.textContent = error.code === "permission-denied" ? "Firestore permission denied. Please add the Marriage collection to your Security Rules." : "Could not save the Marriage record: " + error.message;
    message.className = "marriage-message error";
  } finally { saveBtn.disabled = false; updateBtn.disabled = false; }
});

updateBtn.addEventListener("click", () => form.requestSubmit());

async function deleteRecord(id, label) {
  if (!confirm(`Delete the Marriage record for "${label}"?\n\nThis action cannot be undone.`)) return;
  try { await deleteDoc(doc(db, "marriages", id)); await loadRecords(); }
  catch (error) { alert("Could not delete the Marriage record: " + error.message); }
}

function formatMarriageDate(dateValue) {
  if (!dateValue) return "";
  // Saved HTML date inputs use YYYY-MM-DD; display as DD/MM/YYYY without changing stored data.
  const match = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const parsed = new Date(dateValue);
  if (!Number.isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${parsed.getFullYear()}`;
  }
  return String(dateValue);
}

function renderRecords(records) {
  if (!records.length) { list.innerHTML = '<tr><td colspan="7" class="register-empty">No marriage records found.</td></tr>'; return; }
  list.innerHTML = records.map(({id,data}) => {
    const groom = `${data.bridegroomName || ""} ${data.bridegroomSurname || ""}`.trim();
    const bride = `${data.brideName || ""} ${data.brideSurname || ""}`.trim();
    const minister = data.minister || data.bridegroomMinister || data.brideMinister || "";
    return `<tr><td class="ref-cell">${escapeHtml(data.refNo)}</td><td>${escapeHtml(formatMarriageDate(data.dateOfMarriage))}</td><td>${escapeHtml(data.placeOfMarriage)}</td><td class="name-cell">${escapeHtml(groom)}</td><td class="name-cell">${escapeHtml(bride)}</td><td>${escapeHtml(minister)}</td><td><div class="table-actions"><button type="button" class="table-btn edit-record" data-id="${escapeHtml(id)}">Edit</button><button type="button" class="table-btn delete-record" data-id="${escapeHtml(id)}">Delete</button></div></td></tr>`;
  }).join("");
  list.querySelectorAll(".edit-record").forEach(btn => btn.addEventListener("click", () => { const r = allRecords.find(x => x.id === btn.dataset.id); if (r) populateForm(r.data, r.id); }));
  list.querySelectorAll(".delete-record").forEach(btn => btn.addEventListener("click", () => { const r = allRecords.find(x => x.id === btn.dataset.id); if (r) deleteRecord(r.id, `${r.data.bridegroomName || ""} & ${r.data.brideName || ""}`); }));
}

async function loadRecords() {
  if (!currentUser) return;
  list.innerHTML = '<tr><td colspan="7" class="register-empty">Loading marriage records...</td></tr>';
  try {
    const snapshot = await getDocs(collection(db, "marriages"));
    allRecords = snapshot.docs.map(d => ({ id: d.id, data: d.data() })).sort((a,b) => (b.data.createdAt?.seconds || 0) - (a.data.createdAt?.seconds || 0));
    renderRecords(allRecords);
  } catch (error) {
    console.error(error);
    list.innerHTML = '<tr><td colspan="7" class="register-empty">Could not load marriage records. Check Firestore rules.</td></tr>';
  }
}

search.addEventListener("input", () => {
  const term = search.value.trim().toLowerCase();
  renderRecords(allRecords.filter(({data}) => [data.refNo,data.bridegroomName,data.bridegroomSurname,data.brideName,data.brideSurname,data.placeOfMarriage,data.minister,data.bridegroomMinister,data.brideMinister].some(v => String(v || "").toLowerCase().includes(term))));
});
