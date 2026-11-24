import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { collection, getDocs, doc, setDoc, Timestamp, GeoPoint, Bytes } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const COLLECTIONS = [
  "familyCards", "baptisms", "burials", "firstHolyCommunions", "confirmations",
  "marriages", "massIntentions", "churchExpenses", "familySubscriptions"
];
const userEmail = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");
const exportButton = document.getElementById("exportButton");
const importButton = document.getElementById("importButton");
const backupFile = document.getElementById("backupFile");
const backupStatus = document.getElementById("backupStatus");
let signedIn = false;

onAuthStateChanged(auth, user => {
  if (!user) { window.location.href = "../index.html"; return; }
  signedIn = true;
  if (userEmail) userEmail.textContent = user.email || "User";
});
logoutButton?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../index.html";
});

function status(message) {
  backupStatus.style.display = "block";
  backupStatus.textContent = message;
}
function encodeValue(value) {
  if (value instanceof Timestamp) return { __churchRecordsType: "Timestamp", seconds: value.seconds, nanoseconds: value.nanoseconds };
  if (value instanceof GeoPoint) return { __churchRecordsType: "GeoPoint", latitude: value.latitude, longitude: value.longitude };
  if (value instanceof Bytes) return { __churchRecordsType: "Bytes", base64: value.toBase64() };
  if (value instanceof Date) return { __churchRecordsType: "Date", value: value.toISOString() };
  if (Array.isArray(value)) return value.map(encodeValue);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = encodeValue(item);
    return out;
  }
  return value;
}
function decodeValue(value) {
  if (Array.isArray(value)) return value.map(decodeValue);
  if (value && typeof value === "object") {
    if (value.__churchRecordsType === "Timestamp") return new Timestamp(value.seconds, value.nanoseconds || 0);
    if (value.__churchRecordsType === "GeoPoint") return new GeoPoint(value.latitude, value.longitude);
    if (value.__churchRecordsType === "Bytes") return Bytes.fromBase64String(value.base64);
    if (value.__churchRecordsType === "Date") return new Date(value.value);
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = decodeValue(item);
    return out;
  }
  return value;
}

exportButton?.addEventListener("click", async () => {
  if (!signedIn) return status("Please wait until your account is signed in.");
  exportButton.disabled = true;
  status("Preparing backup… Please keep this page open.");
  try {
    const backup = { format: "ChurchRecordsBackup", version: 1, exportedAt: new Date().toISOString(), collections: {} };
    let total = 0;
    for (const name of COLLECTIONS) {
      const snapshot = await getDocs(collection(db, name));
      backup.collections[name] = snapshot.docs.map(item => ({ id: item.id, data: encodeValue(item.data()) }));
      total += snapshot.size;
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ChurchRecords_Backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    status(`Backup downloaded successfully. ${total} records exported from ${COLLECTIONS.length} record groups.`);
  } catch (error) {
    console.error(error);
    status(`Backup failed: ${error.message || error}. Please check your internet connection and database permissions.`);
  } finally { exportButton.disabled = false; }
});

backupFile?.addEventListener("change", () => {
  importButton.disabled = !(backupFile.files && backupFile.files.length);
  if (backupFile.files?.length) status(`Selected file: ${backupFile.files[0].name}`);
});

importButton?.addEventListener("click", async () => {
  if (!signedIn || !backupFile.files?.length) return;
  const file = backupFile.files[0];
  if (!confirm("Import this backup? Documents with matching IDs will be replaced by the backup versions. Please make a fresh backup first. Continue?")) return;
  importButton.disabled = true;
  status("Reading backup file…");
  try {
    const backup = JSON.parse(await file.text());
    if (backup.format !== "ChurchRecordsBackup" || !backup.collections || typeof backup.collections !== "object") {
      throw new Error("This does not look like a ChurchRecords backup JSON file.");
    }
    const available = COLLECTIONS.filter(name => Array.isArray(backup.collections[name]));
    if (!available.length) throw new Error("No supported record groups were found in this backup.");
    const planned = available.reduce((sum, name) => sum + backup.collections[name].length, 0);
    if (!confirm(`Ready to import ${planned} records from ${available.length} record groups. Existing records with the same IDs will be overwritten. Continue?`)) return;
    let imported = 0;
    for (const name of available) {
      const records = backup.collections[name];
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        if (!record || typeof record.id !== "string" || !record.id || !record.data || typeof record.data !== "object" || Array.isArray(record.data)) {
          throw new Error(`Invalid record found in ${name} (item ${i + 1}). Import stopped after ${imported} records.`);
        }
        await setDoc(doc(db, name, record.id), decodeValue(record.data));
        imported++;
        if (imported % 25 === 0) status(`Importing… ${imported} of ${planned} records saved.`);
      }
    }
    status(`Import finished. ${imported} records restored. Please refresh the dashboard or register pages to see the updated data.`);
  } catch (error) {
    console.error(error);
    status(`Import did not complete: ${error.message || error}. Some records may already have been imported; check your data and try again if needed.`);
  } finally {
    importButton.disabled = !(backupFile.files && backupFile.files.length);
  }
});
