// Print-only correction for parish village names. Does not modify Firebase or form inputs.
function normalizePrintPlaceNames(){
  const root=document.body; if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); const nodes=[];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  for(const node of nodes){node.nodeValue=node.nodeValue.replace(/Chirra\s+Guduru/gi,'Chirraguduru').replace(/Gattu\s+Singaram/gi,'Gattusingaram');}
}
import { auth, db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const $ = (id) => document.getElementById(id);
const searchInput = $("idSearch");
const results = $("searchResults");
const previewWrap = $("idPreviewWrap");
const cardPreview = $("familyIdCard");
const backCardPreview = $("familyIdCardBack");
let allCards = [];
let selectedCard = null;

$("logoutButton")?.addEventListener("click", async () => { await signOut(auth); window.location.href = "../index.html"; });

function esc(v = "") { return String(v).replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
function cardMatches(data, term) {
  if (!term) return true;
  return [data.familyCardNo, data.name, data.spouseName, data.mobileNo, data.address]
    .some(v => String(v || "").toLowerCase().includes(term));
}
function initials(name = "Family") { return name.trim().split(/\s+/).slice(0,2).map(x => x[0]).join("").toUpperCase() || "F"; }
function formatAddress(address = "") { return String(address).replace(/\s+/g, " ").trim(); }
function formatChildDateOfBirth(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let date;
  if (match) date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  else {
    date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][date.getMonth()];
  return `${day}-${month}-${date.getFullYear()}`;
}

function renderResults(cards) {
  if (!cards.length) { results.innerHTML = `<div class="id-empty">No Family Card found. Please check the Card No., family name or mobile number.</div>`; return; }
  results.innerHTML = cards.map(({id, data}) => `
    <article class="id-result">
      <div class="id-result-photo">${data.memberPhoto ? `<img src="${data.memberPhoto}" alt="Whole family photo for ${esc(data.name)}">` : `<span>${esc(initials(data.name))}</span>`}</div>
      <div><div class="id-result-name">${esc(data.name || "Unnamed Family")}</div><div class="id-result-meta"><span><strong>Card No:</strong> ${esc(data.familyCardNo || "—")}</span><span><strong>Mobile:</strong> ${esc(data.mobileNo || "—")}</span><span><strong>Spouse:</strong> ${esc(data.spouseName || "—")}</span><span><strong>Children:</strong> ${esc(data.numberOfChildren ?? (data.children?.length || 0))}</span></div></div>
      <div class="id-result-actions"><button type="button" class="btn btn-gold select-id" data-id="${esc(id)}">View / Print ID</button></div>
    </article>`).join("");
  results.querySelectorAll(".select-id").forEach(btn => btn.addEventListener("click", () => {
    const found = allCards.find(x => x.id === btn.dataset.id); if (found) selectCard(found);
  }));
}

function buildCard(data) {
  const children = Array.isArray(data.children) ? data.children : [];
  const childCount = Number.isFinite(Number(data.numberOfChildren)) ? Number(data.numberOfChildren) : children.length;
  const address = formatAddress(data.address || "");
  return `<div class="id-card-top"><div class="id-card-church">SUDDIKARANA MATHA CHURCH</div><div class="id-card-subtitle">OUR LADY OF PURIFICATION CHURCH</div><div class="id-card-diocese">DHARMARAM PARISH, DIOCESE OF NALGONDA</div><div class="id-card-address">Dharmaram Village &amp; Post, Addaguduru Mandal, Yadadri Bhuvanagiri Dist. Telangana -508277, INDIA.</div><div class="id-card-label">FAMILY ID</div></div>
  <div class="id-card-body"><div class="id-card-photo">${data.memberPhoto ? `<img src="${data.memberPhoto}" alt="Whole family photo for ${esc(data.name)}">` : `<span>${esc(initials(data.name))}</span>`}</div><div class="id-card-info"><div class="id-card-name">${esc(data.name || "Family")}</div><div class="id-card-id">CARD NO: ${esc(data.familyCardNo || "—")}</div><div class="id-card-line spouse-line"><strong>Spouse:</strong> <span class="id-card-value spouse-value">${esc(data.spouseName || "—")}</span></div><div class="id-card-line"><strong>Mobile:</strong> <span class="id-card-value mobile-value">${esc(data.mobileNo || "—")}</span></div><div class="id-card-line"><strong>Children:</strong> <span class="id-card-value children-value">${esc(childCount)}</span></div></div></div>
  <div class="id-card-bottom"><span>${esc(address || "Parish Family Record")}</span><span>Issued by Parish Office</span></div>`;
}
function buildBackCard(data) {
  const children = Array.isArray(data.children) ? data.children : [];
  const rows = children.length ? children.map((child, i) => `<tr><td>${i + 1}</td><td>${esc(child.name || "—")}</td><td>${esc(formatChildDateOfBirth(child.dateOfBirth))}</td><td>${esc(child.age ?? "—")}</td><td>${esc(child.gender || "—")}</td></tr>`).join("") : `<tr><td colspan="5">No children recorded</td></tr>`;
  return `<div class="back-parent-row"><strong>Father's Name:</strong> ${esc(data.fatherName || data.name || "—")}</div>
    <div class="back-parent-row"><strong>Mother's Name:</strong> ${esc(data.motherName || data.spouseName || "—")}</div>
    <div class="back-children-title">CHILDREN'S DETAILS</div>
    <table class="back-children-table"><thead><tr><th>No.</th><th>Child Name</th><th>Date of Birth</th><th>Age</th><th>Gender</th></tr></thead><tbody>${rows}</tbody></table>
    `;
}
function selectCard(card) { selectedCard = card; cardPreview.innerHTML = buildCard(card.data); backCardPreview.innerHTML = buildBackCard(card.data); previewWrap.hidden = false; previewWrap.scrollIntoView({behavior:"smooth",block:"center"}); }

searchInput?.addEventListener("input", () => renderResults(allCards.filter(x => cardMatches(x.data, searchInput.value.trim().toLowerCase()))));
$("clearSearch")?.addEventListener("click", () => { searchInput.value = ""; renderResults(allCards); searchInput.focus(); });
$("printIdCard")?.addEventListener("click", () => { if (!selectedCard) return; normalizePrintPlaceNames();window.print(); });

onAuthStateChanged(auth, async user => {
  if (!user) { window.location.href = "../index.html"; return; }
  $("userEmail").textContent = user.email || "User";
  try {
    const snap = await getDocs(collection(db, "familyCards"));
    allCards = snap.docs.map(d => ({id:d.id, data:d.data()})).sort((a,b) => String(a.data.familyCardNo||"").localeCompare(String(b.data.familyCardNo||"")));
    renderResults(allCards);
  } catch (e) {
    console.error(e); results.innerHTML = `<div class="id-empty">Could not load Family Cards. ${e?.code === "permission-denied" ? "Please check the Firestore permission rules." : "Please try again."}</div>`;
  }
});
