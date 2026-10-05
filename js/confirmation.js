import { auth, db } from "./firebase.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const form = document.getElementById("confirmationForm");
const userEmail = document.getElementById("userEmail");
const list = document.getElementById("confirmationList");
const search = document.getElementById("confirmationSearch");
const saveBtn = document.getElementById("saveConfirmationBtn");
const updateBtn = document.getElementById("updateConfirmationBtn");
const cancelBtn = document.getElementById("cancelEditBtn");
const resetBtn = document.getElementById("resetButton");
const message = document.getElementById("formMessage");
const formTitle = document.getElementById("formTitle");
let currentUser = null, editingId = null, allRecords = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../index.html"; return; }
  currentUser = user; userEmail.textContent = user.email || "User"; await loadRecords();
});
document.getElementById("logoutButton")?.addEventListener("click", async () => { await signOut(auth); window.location.href = "../index.html"; });
function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch])); }
function value(id) { return document.getElementById(id)?.value.trim() || ""; }
function getFormData() { return { refNo: `CONF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, name:value("name"), dateOfBirth:document.getElementById("dateOfBirth").value, dateOfBaptism:document.getElementById("dateOfBaptism").value, placeOfBaptism:value("placeOfBaptism"), fatherName:value("fatherName"), motherName:value("motherName"), dateOfConfirmation:document.getElementById("dateOfConfirmation").value, placeOfConfirmation:value("placeOfConfirmation"), minister:value("minister"), createdBy:currentUser.uid, createdByEmail:currentUser.email || "" }; }
function populateForm(data, id) { editingId=id; formTitle.textContent="Edit Confirmation Record"; ["name","placeOfBaptism","fatherName","motherName","placeOfConfirmation","minister"].forEach(k => document.getElementById(k).value=data[k]||""); ["dateOfBirth","dateOfBaptism","dateOfConfirmation"].forEach(k => document.getElementById(k).value=data[k]||""); saveBtn.hidden=true; updateBtn.hidden=false; cancelBtn.hidden=false; window.scrollTo({top:0,behavior:"smooth"}); }
function resetForm() { editingId=null; form.reset(); formTitle.textContent="New Confirmation Record"; document.getElementById("placeOfBaptism").value="Suddhikarana Matha Church, Dharmaram"; saveBtn.hidden=false; updateBtn.hidden=true; cancelBtn.hidden=true; message.textContent=""; message.className="baptism-message"; }
cancelBtn.addEventListener("click", resetForm); resetBtn.addEventListener("click", () => setTimeout(resetForm,0));
form.addEventListener("submit", async e => { e.preventDefault(); if(!currentUser)return; const data=getFormData(); if(!data.name||!data.dateOfConfirmation){ message.textContent="Please enter Name and Date of Confirmation."; message.className="baptism-message error"; return; } try { saveBtn.disabled=true; updateBtn.disabled=true; if(editingId){ await updateDoc(doc(db,"confirmations",editingId),{...data,updatedBy:currentUser.uid,updatedByEmail:currentUser.email||"",updatedAt:serverTimestamp()}); message.textContent="Confirmation record updated successfully."; } else { await addDoc(collection(db,"confirmations"),{...data,createdAt:serverTimestamp()}); message.textContent="Confirmation record saved successfully."; } message.className="baptism-message success"; await loadRecords(); resetForm(); } catch(error) { console.error(error); message.textContent=error.code==="permission-denied"?"Firestore permission denied. Please add the Confirmation collection to your Security Rules.":"Could not save the Confirmation record: "+error.message; message.className="baptism-message error"; } finally { saveBtn.disabled=false; updateBtn.disabled=false; } });
updateBtn.addEventListener("click", () => form.requestSubmit());
async function deleteRecord(id,name){ if(!confirm(`Delete the Confirmation record for "${name}"?\n\nThis action cannot be undone.`))return; try{await deleteDoc(doc(db,"confirmations",id));await loadRecords();}catch(error){alert("Could not delete the Confirmation record: "+error.message);} }
function renderRecords(records){ if(!records.length){list.innerHTML='<tr><td colspan="8" class="register-empty">No confirmation records found.</td></tr>';return;} list.innerHTML=records.map(({id,data})=>`<tr><td class="ref-cell">${escapeHtml(data.refNo || "-")}</td><td class="name-cell">${escapeHtml(data.name)}</td><td>${escapeHtml(data.dateOfBirth)}</td><td>${escapeHtml(data.dateOfBaptism)}</td><td>${escapeHtml(data.placeOfBaptism)}</td><td>${escapeHtml(data.dateOfConfirmation)}</td><td>${escapeHtml(data.minister)}</td><td><div class="table-actions"><button type="button" class="table-btn edit-record" data-id="${escapeHtml(id)}">Edit</button><button type="button" class="table-btn delete-record" data-id="${escapeHtml(id)}">Delete</button></div></td></tr>`).join(""); list.querySelectorAll(".edit-record").forEach(btn=>btn.addEventListener("click",()=>{const r=allRecords.find(x=>x.id===btn.dataset.id);if(r)populateForm(r.data,r.id);})); list.querySelectorAll(".delete-record").forEach(btn=>btn.addEventListener("click",()=>{const r=allRecords.find(x=>x.id===btn.dataset.id);if(r)deleteRecord(r.id,r.data.name||"this person");})); }
async function loadRecords(){ if(!currentUser)return; list.innerHTML='<tr><td colspan="8" class="register-empty">Loading confirmation records...</td></tr>'; try{const snapshot=await getDocs(collection(db,"confirmations")); allRecords=snapshot.docs.map(d=>({id:d.id,data:d.data()})).sort((a,b)=>(b.data.createdAt?.seconds||0)-(a.data.createdAt?.seconds||0));renderRecords(allRecords);}catch(error){console.error(error);list.innerHTML='<tr><td colspan="8" class="register-empty">Could not load confirmation records. Check Firestore rules.</td></tr>';}}
search.addEventListener("input",()=>{const term=search.value.trim().toLowerCase();renderRecords(allRecords.filter(({data})=>[data.name,data.fatherName,data.motherName,data.placeOfBaptism,data.placeOfConfirmation,data.minister].some(v=>String(v||"").toLowerCase().includes(term))));});
