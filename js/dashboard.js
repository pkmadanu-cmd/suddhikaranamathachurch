import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const userEmail = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");
const dashboardFamilyList = document.getElementById("dashboardFamilyList");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  if (userEmail) userEmail.textContent = user.email || "User";
  await loadDashboardFamilies();
});

logoutButton?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[ch]));
}

async function loadDashboardFamilies() {
  if (!dashboardFamilyList) return;

  try {
    const snapshot = await getDocs(collection(db, "familyCards"));
    const families = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      .slice(0, 8);

    if (!families.length) {
      dashboardFamilyList.innerHTML = `<div class="empty-state">No Family Cards created yet.</div>`;
      return;
    }

    dashboardFamilyList.innerHTML = families.map(f => `
      <div class="family-record-card">
        <div class="record-photo">
          ${f.memberPhoto
            ? `<img src="${f.memberPhoto}" alt="${escapeHtml(f.name)}">`
            : `<span>👤</span>`}
        </div>
        <div class="record-main">
          <div class="record-title">${escapeHtml(f.name || "Unnamed Family")}</div>
          <div class="record-meta">
            <span><strong>Card No:</strong> ${escapeHtml(f.familyCardNo || "-")}</span>
            <span><strong>Mobile:</strong> ${escapeHtml(f.mobileNo || "-")}</span>
            <span><strong>Children:</strong> ${f.numberOfChildren ?? 0}</span>
          </div>
          <div class="record-address">${escapeHtml(f.address || "No address entered")}</div>
        </div>
        <div class="record-actions">
          <a href="pages/family-card.html" class="btn btn-secondary">View / Edit</a>
        </div>
      </div>
    `).join("");
  } catch (error) {
    console.error(error);
    dashboardFamilyList.innerHTML = `<div class="empty-state">Could not load Family Cards.</div>`;
  }
}


