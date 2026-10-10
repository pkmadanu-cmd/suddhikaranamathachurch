import { auth, db } from "./firebase.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const $ = id => document.getElementById(id);
const form = $("massForm"), list = $("massList"), search = $("massSearch");
const saveBtn=$("saveMassButton"), updateBtn=$("updateMassButton"), cancelEditBtn=$("cancelEditButton"), msg=$("massMessage");
let currentUser=null, editingId=null, records=[];
const LOCAL_KEY="church_mass_intentions_v1";
function nextReceiptNo(){
  const nums = records.map(r=>parseInt(r.data?.receiptNo||"0",10)).filter(n=>!isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return String(next).padStart(2,"0");
}
function loadLocal(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||"[]").map(x=>({id:String(x.id),data:x.data||{}}));}catch(e){console.error(e);return[];}}
function saveLocal(){try{localStorage.setItem(LOCAL_KEY,JSON.stringify(records));return true;}catch(e){console.error(e);return false;}}
function setMessage(text,type=""){msg.textContent=text;msg.className=`save-message ${type}`;}

$("logoutButton")?.addEventListener("click", async()=>{await signOut(auth);window.location.href="../index.html";});
const today=()=>new Date().toISOString().split("T")[0];
$("requestDate").value=today(); $("massDate").value=today();
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function formatDate(v){if(!v)return "—";const months=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];const m=String(v).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m){const mo=Number(m[2]);if(mo>=1&&mo<=12)return `${m[3]}-${months[mo-1]}-${m[1]}`;}const d=String(v).trim().match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);if(d){const mo=Number(d[2]);if(mo>=1&&mo<=12)return `${d[1]}-${months[mo-1]}-${d[3]}`;}return String(v);}
function formatMoney(v){if(v===""||v==null)return "—";return "₹"+Number(v||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});}
function dataFromForm(){return {requestDate:$("requestDate").value,massDate:$("massDate").value,massTime:$("massTime").value,intentionType:$("intentionType").value,intentionFor:$("intentionFor").value.trim(),intentionDetails:$("intentionDetails").value.trim(),requesterName:$("requesterName").value.trim(),requesterMobile:$("requesterMobile").value.trim(),familyCardNo:$("familyCardNo").value.trim(),relationship:$("relationship").value.trim(),requesterAddress:$("requesterAddress").value.trim(),offeringAmount:$("offeringAmount").value, paymentMode:$("paymentMode").value,receiptNo:$("receiptNo").value.trim(),status:$("status").value,officeRemarks:$("officeRemarks").value.trim()};}
function fillForm(d,id){editingId=id;Object.keys(dataFromForm()).forEach(k=>{const el=$(k);if(el)el.value=d[k]??"";});saveBtn.hidden=true;updateBtn.hidden=false;cancelEditBtn.hidden=false;window.scrollTo({top:0,behavior:"smooth"});}
function clearForm(){editingId=null;form.reset();$("requestDate").value=today();$("massDate").value=today();$("status").value="Requested";saveBtn.hidden=false;updateBtn.hidden=true;cancelEditBtn.hidden=true;msg.textContent="";}
function badge(status){return `<span class="mass-badge ${String(status||'').toLowerCase()}">${esc(status||"Requested")}</span>`;}
function render(){const term=(search.value||"").trim().toLowerCase();const rows=records.filter(r=>!term||[r.data.requesterName,r.data.intentionFor,r.data.massDate,r.data.requesterMobile,r.data.familyCardNo,r.data.receiptNo,r.data.intentionType,r.data.status].some(v=>String(v||"").toLowerCase().includes(term)));if(!rows.length){list.innerHTML='<div class="mass-empty">No Mass Intention requests found.</div>';return;}list.innerHTML=rows.map(({id,data})=>`<article class="mass-row"><div><div class="mass-row-title">${esc(data.intentionFor||"Mass Intention")}</div><div class="mass-row-meta"><span><strong>Date:</strong> ${esc(formatDate(data.massDate))}</span><span><strong>Requester:</strong> ${esc(data.requesterName||"—")}</span><span><strong>Mobile:</strong> ${esc(data.requesterMobile||"—")}</span><span><strong>Family Card:</strong> ${esc(data.familyCardNo||"—")}</span><span><strong>Offering:</strong> ${esc(formatMoney(data.offeringAmount))}</span>${badge(data.status)}</div></div><div class="mass-row-actions"><button class="secondary-button edit-mass" data-id="${esc(id)}">Edit</button><button class="btn btn-gold print-mass" data-id="${esc(id)}">Print</button><button class="btn btn-danger delete-mass" data-id="${esc(id)}">Delete</button></div></article>`).join("");list.querySelectorAll(".edit-mass").forEach(b=>b.onclick=()=>{const r=records.find(x=>x.id===b.dataset.id);if(r)fillForm(r.data,r.id);});list.querySelectorAll(".delete-mass").forEach(b=>b.onclick=async()=>{const r=records.find(x=>x.id===b.dataset.id);if(!r||!confirm("Delete this Mass Intention request?"))return;try{if(!String(r.id).startsWith("local-"))await deleteDoc(doc(db,"massIntentions",r.id));}catch(e){console.warn("Cloud delete unavailable; removing from local register.",e);}records=records.filter(x=>x.id!==r.id);saveLocal();render();});}
function printRecord(d){const area=$("printArea");area.innerHTML=`<div class="print-sheet"><div class="print-border"><div class="print-header"><div class="print-cross">✝</div><div class="print-church">SUDDIKARANA MATHA CHURCH</div><div class="print-sub">OUR LADY OF PURIFICATION CHURCH</div><div class="print-sub">DHARMARAM PARISH, DIOCESE OF NALGONDA</div><div class="print-sub">Dharmaram Village & Post, Addaguduru Mandal, Yadadri Bhuvanagiri Dist. Telangana -508277, INDIA.</div></div><div class="print-title">Mass Intention Request</div><div class="print-ref"><span><strong>Request Date:</strong> ${esc(formatDate(d.requestDate))}</span><span><strong>Status:</strong> ${esc(d.status||"Requested")}</span></div><div class="print-grid"><div class="print-cell"><div class="print-label">Requested Mass Date</div><div class="print-value">${esc(formatDate(d.massDate))}</div></div><div class="print-cell"><div class="print-label">Preferred Mass Time</div><div class="print-value">${esc(d.massTime||"—")}</div></div><div class="print-cell"><div class="print-label">Intention Type</div><div class="print-value">${esc(d.intentionType||"—")}</div></div><div class="print-cell"><div class="print-label">Family Card No.</div><div class="print-value">${esc(d.familyCardNo||"—")}</div></div><div class="print-cell full"><div class="print-label">Mass Offered For</div><div class="print-value">${esc(d.intentionFor||"—")}</div></div><div class="print-cell"><div class="print-label">Requester Name</div><div class="print-value">${esc(d.requesterName||"—")}</div></div><div class="print-cell"><div class="print-label">Mobile Number</div><div class="print-value">${esc(d.requesterMobile||"—")}</div></div><div class="print-cell"><div class="print-label">Relationship / Role</div><div class="print-value">${esc(d.relationship||"—")}</div></div><div class="print-cell"><div class="print-label">Receipt No.</div><div class="print-value">${esc(d.receiptNo||"—")}</div></div><div class="print-cell"><div class="print-label">Mass Offering</div><div class="print-value">${esc(formatMoney(d.offeringAmount))}</div></div><div class="print-cell"><div class="print-label">Payment Mode</div><div class="print-value">${esc(d.paymentMode||"—")}</div></div></div><div class="print-note"><div class="print-label">Intention Details / Prayer Request</div><div class="print-value">${esc(d.intentionDetails||"No additional details.")}</div></div><div class="print-note"><div class="print-label">Office Remarks</div><div class="print-value">${esc(d.officeRemarks||"—")}</div></div><div class="print-signatures"><div class="print-sign">Requester Signature</div><div class="print-sign">Parish Office / Priest</div></div><div class="print-footer">Mass Intention Request • Parish Office Copy</div></div></div>`;window.print();setTimeout(()=>area.innerHTML="",500);}
function printDailyList(date){
 const day=date||$("dailyPrintDate")?.value||today();
 const rows=records.filter(r=>String(r.data.massDate||"")===day).sort((a,b)=>String(a.data.massTime||"").localeCompare(String(b.data.massTime||"")));
 const area=$("printArea");
 const body=rows.length?rows.map((r,i)=>{
   const d=r.data;
   return `<tr><td class="no">${i+1}</td><td class="time">${esc(d.massTime||"—")}</td><td class="type">${esc(d.intentionType||"—")}</td><td><strong>${esc(d.intentionFor||"—")}</strong>${d.intentionDetails?`<br><small>${esc(d.intentionDetails)}</small>`:""}</td><td>${esc(d.requesterName||"—")}</td><td class="family">${esc(d.familyCardNo||"—")}</td></tr>`;
 }).join(""):`<tr><td colspan="6" style="text-align:center;padding:25px">No Mass Intentions were requested for this date.</td></tr>`;
 area.innerHTML=`<div class="daily-print-sheet"><div class="daily-print-border"><div class="daily-print-header"><div class="cross">✝</div><div class="church">SUDDIKARANA MATHA CHURCH</div><div class="sub">OUR LADY OF PURIFICATION CHURCH</div><div class="sub">DHARMARAM PARISH, DIOCESE OF NALGONDA</div><div class="sub">Dharmaram Village & Post, Addaguduru Mandal, Yadadri Bhuvanagiri Dist. Telangana -508277, INDIA.</div></div><div class="daily-print-title">Daily Mass Intentions</div><div class="daily-print-date"><strong>Date:</strong> ${esc(formatDate(day))} &nbsp; | &nbsp; <strong>Total Intentions:</strong> ${rows.length}</div><table class="daily-print-table"><thead><tr><th>No.</th><th>Mass Time</th><th>Intention</th><th>Mass Offered For / Details</th><th>Requested By</th><th>Family Card</th></tr></thead><tbody>${body}</tbody></table><div class="daily-print-total">Total Mass Intentions for the day: ${rows.length}</div><div class="daily-print-notes"><div class="daily-print-sign">Prepared by Parish Office</div><div class="daily-print-sign">Priest / Minister</div></div><div class="daily-print-footer">Daily Mass Intention List • Parish Office Use Only</div></div></div>`;
 window.print();
 setTimeout(()=>area.innerHTML="",700);
}
$("dailyPrintDate").value=today();
$("printDailyButton").addEventListener("click",()=>printDailyList());

form.addEventListener("submit",async e=>{
 e.preventDefault();
 if(!currentUser){setMessage("Please wait for the parish office login to finish loading.","error");return;}
 const data=dataFromForm();
 if(!data.massDate||!data.intentionType||!data.intentionFor||!data.requesterName){setMessage("Please complete the required Mass Intention details.","error");return;}
 try{
  saveBtn.disabled=true;
  if(editingId){
   try{
    await updateDoc(doc(db,"massIntentions",editingId),{...data,updatedAt:serverTimestamp(),updatedBy:currentUser.uid});
   }catch(cloudErr){console.warn("Cloud update unavailable; updating local register.",cloudErr);}
   const i=records.findIndex(x=>x.id===editingId);
   if(i>=0) records[i]={id:editingId,data}; else records.unshift({id:editingId,data});
   saveLocal();
   setMessage("Mass Intention updated successfully.","success");
  }else{
   let savedId="local-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);
   try{
    const ref=await addDoc(collection(db,"massIntentions"),{...data,createdAt:serverTimestamp(),createdBy:currentUser.uid,createdByEmail:currentUser.email||""});
    savedId=ref.id;
    records.unshift({id:savedId,data});
    saveLocal();
    setMessage("Mass Intention saved successfully.","success");
   }catch(cloudErr){
    console.warn("Cloud save unavailable; saving to this office browser.",cloudErr);
    records.unshift({id:savedId,data});
    saveLocal();
    setMessage("Mass Intention saved on this computer. Firebase permission needs to be enabled for cloud saving.","success");
   }
  }
  clearForm();render();
 }catch(err){console.error(err);setMessage("Could not save the Mass Intention. Please try again.","error");}
 finally{saveBtn.disabled=false;}
});
updateBtn.addEventListener("click",()=>form.requestSubmit());cancelEditBtn.addEventListener("click",clearForm);$("clearFormButton").addEventListener("click",clearForm);$("newRequestButton").addEventListener("click",clearForm);search.addEventListener("input",render);

onAuthStateChanged(auth,async user=>{
 if(!user){window.location.href="../index.html";return;}
 currentUser=user;$("userEmail").textContent=user.email||"User";
 const localRecords=loadLocal();
 try{
  const snap=await getDocs(collection(db,"massIntentions"));
  const cloud=snap.docs.map(d=>({id:d.id,data:d.data()}));
  const cloudIds=new Set(cloud.map(x=>x.id));
  records=[...cloud,...localRecords.filter(x=>!cloudIds.has(x.id))].sort((a,b)=>String(b.data.massDate||"").localeCompare(String(a.data.massDate||"")));
  saveLocal();
 }catch(e){
  console.warn("Could not load Mass Intentions from Firebase; using local register.",e);
  records=localRecords.sort((a,b)=>String(b.data.massDate||"").localeCompare(String(a.data.massDate||"")));
  setMessage("Firebase is unavailable, so this office is using its local Mass Intention register.","error");
 }
 render();
});
