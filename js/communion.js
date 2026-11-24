import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const form = document.getElementById('communionForm');
const formTitle = document.getElementById('formTitle');
const message = document.getElementById('formMessage');
const searchInput = document.getElementById('searchCommunion');
const recordsBody = document.getElementById('communionRecordsBody');
const userEmail = document.getElementById('userEmail');
const logoutButton = document.getElementById('logoutButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const saveButton = document.getElementById('saveButton');
const updateButton = document.getElementById('updateButton');
const collectionRef = collection(db, 'firstHolyCommunions');
let editingId = null;
let records = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = '../index.html'; return; }
  userEmail.textContent = user.email || 'User';
  await loadRecords();
});

logoutButton.addEventListener('click', async () => { await signOut(auth); window.location.href = '../index.html'; });

function calculateAge() {
  const dob = document.getElementById('dateOfBirth').value;
  const age = document.getElementById('age');
  if (!dob) { age.value = ''; return; }
  const birth = new Date(dob + 'T00:00:00');
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) years--;
  age.value = years >= 0 ? years : '';
}
document.getElementById('dateOfBirth').addEventListener('change', calculateAge);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;
  const data = {
    recordNo: document.getElementById('recordNo').value.trim(),
    fullName: document.getElementById('fullName').value.trim(),
    dateOfBirth: document.getElementById('dateOfBirth').value,
    age: document.getElementById('age').value,
    gender: document.getElementById('gender').value,
    classStandard: document.getElementById('classStandard').value.trim(),
    dateOfBaptism: document.getElementById('dateOfBaptism').value,
    parishOfBaptism: document.getElementById('parishOfBaptism').value.trim(),
    baptismAddress: document.getElementById('baptismAddress').value.trim(),
    fatherName: document.getElementById('fatherName').value.trim(),
    motherName: document.getElementById('motherName').value.trim(),
    residentialAddress: document.getElementById('residentialAddress').value.trim(),
    pinCode: document.getElementById('pinCode').value.trim(),
    mobileNumber: document.getElementById('mobileNumber').value.trim(),
    alternativeContact: document.getElementById('alternativeContact').value.trim(),
    emailAddress: document.getElementById('emailAddress').value.trim(),
    updatedAt: serverTimestamp()
  };
  try {
    if (editingId) {
      await updateDoc(doc(db, 'firstHolyCommunions', editingId), data);
      showMessage('First Holy Communion record updated successfully.');
    } else {
      await addDoc(collectionRef, { ...data, createdBy: user.uid, createdByEmail: user.email || '', createdAt: serverTimestamp() });
      showMessage('First Holy Communion record saved successfully.');
    }
    resetForm();
    await loadRecords();
  } catch (error) {
    console.error(error);
    showMessage(error.code === 'permission-denied' ? 'Permission denied. Please add Firestore rules for firstHolyCommunions.' : 'Unable to save the record. Please try again.', true);
  }
});

async function loadRecords() {
  try {
    const snap = await getDocs(collectionRef);
    records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderRecords();
  } catch (error) {
    console.error(error);
    recordsBody.innerHTML = '<tr><td colspan="8">Unable to load records. Please check Firestore permissions.</td></tr>';
  }
}

function renderRecords() {
  const q = (searchInput.value || '').trim().toLowerCase();
  const filtered = records.filter(r => [r.recordNo, r.fullName, r.fatherName, r.motherName, r.classStandard].some(v => String(v || '').toLowerCase().includes(q)));
  if (!filtered.length) { recordsBody.innerHTML = '<tr><td colspan="8">No First Holy Communion records found.</td></tr>'; return; }
  recordsBody.innerHTML = filtered.map(r => `
    <tr>
      <td>${escapeHtml(r.recordNo)}</td><td>${escapeHtml(r.fullName)}</td><td>${escapeHtml(formatDateForList(r.dateOfBirth))}</td><td>${escapeHtml(r.age)}</td>
      <td>${escapeHtml(formatDateForList(r.dateOfBaptism))}</td><td>${escapeHtml(r.fatherName)}</td><td>${escapeHtml(r.motherName)}</td>
      <td class="action-cell"><button class="table-action edit" data-id="${r.id}">Edit</button><button class="table-action delete" data-id="${r.id}">Delete</button></td>
    </tr>`).join('');
  recordsBody.querySelectorAll('.edit').forEach(btn => btn.addEventListener('click', () => startEdit(btn.dataset.id)));
  recordsBody.querySelectorAll('.delete').forEach(btn => btn.addEventListener('click', () => deleteRecord(btn.dataset.id)));
}

function startEdit(id) {
  const r = records.find(x => x.id === id); if (!r) return;
  editingId = id; formTitle.textContent = 'Edit First Holy Communion Record';
  for (const [key, value] of Object.entries({recordNo:r.recordNo, fullName:r.fullName, dateOfBirth:r.dateOfBirth, age:r.age, gender:r.gender, classStandard:r.classStandard, dateOfBaptism:r.dateOfBaptism, parishOfBaptism:r.parishOfBaptism, baptismAddress:r.baptismAddress, fatherName:r.fatherName, motherName:r.motherName, residentialAddress:r.residentialAddress, pinCode:r.pinCode, mobileNumber:r.mobileNumber, alternativeContact:r.alternativeContact, emailAddress:r.emailAddress})) {
    const el = document.getElementById(key); if (el) el.value = value || '';
  }
  saveButton.hidden = true; updateButton.hidden = false; cancelEditButton.hidden = false;
  window.scrollTo({top:0, behavior:'smooth'});
}

function resetForm() {
  form.reset(); document.getElementById('age').value = '';
  editingId = null; formTitle.textContent = 'New First Holy Communion Record';
  saveButton.hidden = false; updateButton.hidden = true; cancelEditButton.hidden = true;
}
cancelEditButton.addEventListener('click', resetForm);
document.getElementById('clearButton').addEventListener('click', () => { setTimeout(() => { message.textContent=''; message.className='form-message'; }, 0); });
updateButton.addEventListener('click', () => form.requestSubmit());
searchInput.addEventListener('input', renderRecords);

async function deleteRecord(id) {
  if (!confirm('Delete this First Holy Communion record?')) return;
  try { await deleteDoc(doc(db, 'firstHolyCommunions', id)); showMessage('Record deleted.'); await loadRecords(); }
  catch (error) { console.error(error); showMessage('Unable to delete the record.', true); }
}
function showMessage(text, isError=false) { message.textContent = text; message.className = isError ? 'form-message error' : 'form-message success'; }
function formatDateForList(value) {
  if (!value) return '';
  const raw = String(value).trim();
  // Stored date inputs are normally YYYY-MM-DD; preserve other values if they are not ISO dates.
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const localMatch = raw.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (localMatch) return `${localMatch[1]}/${localMatch[2]}/${localMatch[3]}`;
  return raw;
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
