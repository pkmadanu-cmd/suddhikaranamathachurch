import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const monthInput = document.getElementById("printMonth");
const sheetMonth = document.getElementById("sheetMonth");
const list = document.getElementById("printExpenseList");
const total = document.getElementById("printTotal");
let allExpenses = [];
const money = n => `₹${Number(n || 0).toLocaleString("en-IN", {minimumFractionDigits:2, maximumFractionDigits:2})}`;
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
const localMonth = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const monthLabel = m => { const [y,mm]=m.split("-"); return new Date(Number(y),Number(mm)-1,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"}); };
const formatDate = s => { if (!s) return "—"; const [y,m,d]=s.split("-"); return `${d}-${m}-${y}`; };

const params = new URLSearchParams(location.search);
monthInput.value = params.get("month") || localMonth();

onAuthStateChanged(auth, async user => {
  if (!user) { location.href = "../index.html"; return; }
  document.getElementById("userEmail").textContent = user.email || "User";
  await load();
});

document.getElementById("logoutButton")?.addEventListener("click", async () => { await signOut(auth); location.href = "../index.html"; });
document.getElementById("loadPrintBtn").addEventListener("click", render);
document.getElementById("printBtn").addEventListener("click", () => {
  const sheet = document.getElementById("expenseSheet");
  if (!sheet) return;
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) { alert("Please allow pop-ups for printing the expense sheet."); return; }
  const styles = Array.from(document.querySelectorAll("link[rel=stylesheet]")).map(l => `<link rel="stylesheet" href="${new URL(l.href, location.href).href}">`).join("\n");
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Monthly Church Expense Sheet</title>${styles}<style>
@page{size:A4 portrait;margin:8mm}
html,body{margin:0!important;padding:0!important;background:#fff!important}
body{font-family:Inter,Arial,sans-serif}
.expense-sheet{display:block!important;width:100%!important;padding:0!important;margin:0!important;box-shadow:none!important;background:#fff!important}
.expense-sheet-border{width:100%!important;border:0!important;padding:9mm;min-height:0!important;box-sizing:border-box}
.print-expense-table{width:100%!important;table-layout:fixed;border-collapse:collapse;margin-top:11px}
.print-expense-table thead{display:table-header-group}
.print-expense-table tr{page-break-inside:avoid;break-inside:avoid}
.print-expense-table th{font-size:12px;padding:5px 3px;line-height:1.2;white-space:normal;word-break:break-word;border:1px solid #cbb997}
.print-expense-table td{font-size:12px;padding:5px 3px;line-height:1.25;word-break:break-word;overflow-wrap:anywhere;vertical-align:top;border:1px solid #d7cbb7}
.print-expense-table th:nth-child(1),.print-expense-table td:nth-child(1){width:6%}.print-expense-table th:nth-child(2),.print-expense-table td:nth-child(2){width:10%}.print-expense-table th:nth-child(3),.print-expense-table td:nth-child(3){width:11%}.print-expense-table th:nth-child(4),.print-expense-table td:nth-child(4){width:24%}.print-expense-table th:nth-child(5),.print-expense-table td:nth-child(5){width:13%}.print-expense-table th:nth-child(6),.print-expense-table td:nth-child(6){width:11%}.print-expense-table th:nth-child(7),.print-expense-table td:nth-child(7){width:11%}.print-expense-table th:nth-child(8),.print-expense-table td:nth-child(8){width:14%}
.print-expense-table tfoot{display:table-row-group}.print-expense-table tfoot td{padding:6px 3px;font-size:12px}.sheet-note{margin-top:10px;padding:7px 9px;font-size:12px}.signature-row{gap:12px;margin-top:22px}.signature-row div{gap:13px;font-size:12px}.signature-row strong{font-size:12px}.sheet-footer{margin-top:16px;padding-top:5px;font-size:11px}
</style></head><body>${sheet.outerHTML}<script>window.onload=()=>setTimeout(()=>window.print(),250);window.onafterprint=()=>window.close();<\/script></body></html>`);
  w.document.close();
});
monthInput.addEventListener("change", render);

async function load() {
  try { const snap=await getDocs(collection(db,"churchExpenses")); allExpenses=snap.docs.map(d=>({id:d.id,...d.data()})); render(); }
  catch(err) { console.error(err); list.innerHTML='<tr><td colspan="8" class="print-empty">Could not load expenses.</td></tr>'; }
}
function render() {
  const month=monthInput.value || localMonth();
  const rows=allExpenses.filter(x => (x.month || (x.expenseDate||"").slice(0,7))===month).sort((a,b)=>(a.expenseDate||"").localeCompare(b.expenseDate||""));
  sheetMonth.textContent=monthLabel(month);
  let sum=0;
  list.innerHTML=rows.length ? rows.map((x,i)=>{sum+=Number(x.amount||0); return `<tr><td>${i+1}</td><td>${esc(formatDate(x.expenseDate))}</td><td>${esc(x.category)}</td><td>${esc(x.description)}</td><td>${esc(x.paidTo||"—")}</td><td>${esc(x.paymentMode||"—")}</td><td>${esc(x.voucherNo||"—")}</td><td class="print-amount">${money(x.amount)}</td></tr>`;}).join("") : '<tr><td colspan="8" class="print-empty">No expenses recorded for this month.</td></tr>';
  total.textContent=money(sum);
}
