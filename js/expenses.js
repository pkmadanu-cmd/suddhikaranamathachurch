import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const form = document.getElementById("expenseForm");
const userEmail = document.getElementById("userEmail");
const list = document.getElementById("expenseList");
const monthFilter = document.getElementById("monthFilter");
const printMonthLink = document.getElementById("printMonthLink");
const message = document.getElementById("expenseMessage");
const saveBtn = document.getElementById("saveExpenseBtn");
const cancelEditBtn = document.getElementById("cancelExpenseEditBtn");
const formTitle = document.getElementById("expenseFormTitle");
const totalEntries = document.getElementById("totalEntries");
const monthlyTotal = document.getElementById("monthlyTotal");
let editingId = null;
let allExpenses = [];

const fields = ["expenseDate","expenseCategory","expenseDescription","expenseAmount","paymentMode","paidTo","voucherNo"];
const $ = id => document.getElementById(id);
const money = n => `₹${Number(n || 0).toLocaleString("en-IN", {minimumFractionDigits:2, maximumFractionDigits:2})}`;
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));

function localMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function monthLabel(month) { if (!month) return ""; const [y,m] = month.split("-"); return new Date(Number(y), Number(m)-1, 1).toLocaleDateString("en-IN", {month:"long", year:"numeric"}); }

monthFilter.value = localMonth();
printMonthLink.href = `expense-print.html?month=${encodeURIComponent(monthFilter.value)}`;

onAuthStateChanged(auth, async user => {
  if (!user) { window.location.href = "../index.html"; return; }
  userEmail.textContent = user.email || "User";
  await loadExpenses();
});

document.getElementById("logoutButton")?.addEventListener("click", async () => { await signOut(auth); window.location.href = "../index.html"; });
monthFilter.addEventListener("change", render);

form.addEventListener("submit", async e => {
  e.preventDefault();
  const data = {
    expenseDate: $("expenseDate").value,
    month: $("expenseDate").value.slice(0,7),
    category: $("expenseCategory").value,
    description: $("expenseDescription").value.trim(),
    amount: Number($("expenseAmount").value || 0),
    paymentMode: $("paymentMode").value,
    paidTo: $("paidTo").value.trim(),
    voucherNo: $("voucherNo").value.trim()
  };
  if (!(data.amount >= 0)) return setMessage("Please enter a valid amount.", "error");
  saveBtn.disabled = true;
  try {
    if (editingId) await updateDoc(doc(db,"churchExpenses",editingId), data);
    else await addDoc(collection(db,"churchExpenses"), {...data, createdAt: serverTimestamp()});
    setMessage(editingId ? "Expense updated successfully." : "Expense saved successfully.", "success");
    resetForm(); await loadExpenses();
  } catch (err) {
    console.error("Church expense save error:", err);
    if (err?.code === "permission-denied") {
      setMessage("Firebase permission denied. Please add the churchExpenses rule from firestore-expenses-rules.txt to your Firestore Security Rules.", "error");
    } else {
      setMessage(`Could not save the expense: ${err?.message || "Please try again."}`, "error");
    }
  }
  finally { saveBtn.disabled = false; }
});

cancelEditBtn.addEventListener("click", resetForm);
document.getElementById("clearExpenseBtn").addEventListener("click", () => setTimeout(resetForm, 0));

async function loadExpenses() {
  try {
    const snap = await getDocs(collection(db,"churchExpenses"));
    allExpenses = snap.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b) => (b.expenseDate || "").localeCompare(a.expenseDate || ""));
    render();
  } catch (err) {
    console.error("Church expense load error:", err);
    const detail = err?.code === "permission-denied"
      ? "Firebase permission denied. Add the churchExpenses rule from firestore-expenses-rules.txt."
      : "Could not load church expenses.";
    list.innerHTML = `<tr><td colspan="8" class="register-empty">${esc(detail)}</td></tr>`;
  }
}

function render() {
  const month = monthFilter.value;
  const rows = allExpenses.filter(x => (x.month || (x.expenseDate || "").slice(0,7)) === month);
  const total = rows.reduce((sum,x) => sum + Number(x.amount || 0), 0);
  totalEntries.textContent = rows.length;
  monthlyTotal.textContent = money(total);
  printMonthLink.href = `expense-print.html?month=${encodeURIComponent(month)}`;
  list.innerHTML = rows.length ? rows.map(x => `<tr><td>${esc(formatDate(x.expenseDate))}</td><td>${esc(x.category)}</td><td>${esc(x.description)}</td><td>${esc(x.paidTo || "—")}</td><td>${esc(x.paymentMode || "—")}</td><td>${esc(x.voucherNo || "—")}</td><td class="amount-col">${money(x.amount)}</td><td><div class="table-actions"><button class="table-edit" data-edit="${x.id}">Edit</button><button class="table-delete" data-delete="${x.id}">Delete</button></div></td></tr>`).join("") : `<tr><td colspan="8" class="register-empty">No expenses recorded for ${esc(monthLabel(month))}.</td></tr>`;
  list.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => editExpense(b.dataset.edit)));
  list.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => removeExpense(b.dataset.delete)));
}

function editExpense(id) {
  const x = allExpenses.find(e => e.id === id); if (!x) return;
  $("expenseDate").value = x.expenseDate || ""; $("expenseCategory").value = x.category || ""; $("expenseDescription").value = x.description || ""; $("expenseAmount").value = x.amount ?? ""; $("paymentMode").value = x.paymentMode || "Cash"; $("paidTo").value = x.paidTo || ""; $("voucherNo").value = x.voucherNo || "";
  editingId = id; formTitle.textContent = "Edit Expense Entry"; saveBtn.textContent = "Update Expense"; cancelEditBtn.hidden = false; window.scrollTo({top:0,behavior:"smooth"});
}

async function removeExpense(id) {
  const x = allExpenses.find(e => e.id === id); if (!x) return;
  if (!confirm(`Delete this expense of ${money(x.amount)}?`)) return;
  try { await deleteDoc(doc(db,"churchExpenses",id)); await loadExpenses(); setMessage("Expense deleted.", "success"); } catch (err) { console.error(err); setMessage("Could not delete the expense.", "error"); }
}

function resetForm() { form.reset(); const now = new Date(); $("expenseDate").value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`; $("paymentMode").value = "Cash"; editingId = null; formTitle.textContent = "New Expense Entry"; saveBtn.textContent = "Save Expense"; cancelEditBtn.hidden = true; }
function setMessage(text, type) { message.textContent = text; message.className = `expense-message ${type}`; setTimeout(() => { message.textContent = ""; message.className = "expense-message"; }, 3500); }
function formatDate(s) { if (!s) return "—"; const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/); if(m)return `${m[3]}/${m[2]}/${m[1]}`; const d=String(s).match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/); return d?`${d[1]}/${d[2]}/${d[3]}`:String(s); }
resetForm();
