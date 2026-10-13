// Print-only correction for parish village names. Does not modify Firebase or form inputs.
function normalizePrintPlaceNames(){
  const root=document.body; if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); const nodes=[];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  for(const node of nodes){node.nodeValue=node.nodeValue.replace(/Chirra\s+Guduru/gi,'Chirraguduru').replace(/Gattu\s+Singaram/gi,'Gattusingaram');}
}
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const config = [
 {id:"familyCards",title:"Family Cards",label:"Family Cards"},
 {id:"baptisms",title:"Baptism",label:"Baptism"},
 {id:"burials",title:"Burial",label:"Burial"},
 {id:"firstHolyCommunions",title:"First Holy Communion",label:"First Holy Communion"},
 {id:"confirmations",title:"Confirmation",label:"Confirmation"},
 {id:"marriages",title:"Marriage",label:"Marriage"}
];
const cache = {}; let signedIn = false; let shown = [];
const statusEl=document.getElementById("loadStatus"), reportsEl=document.getElementById("reports"), searchEl=document.getElementById("recordSearch"), searchStatus=document.getElementById("searchStatus"), printBtn=document.getElementById("printSelected");
const escapeHtml = v => String(v ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const FIELD_LABELS = {
 registrationDate:"Registration Date", familyCardNo:"Family Card No.", name:"Name", spouseName:"Spouse Name", dob:"Date of Birth", memberAge:"Age", mobile:"Mobile No.", address:"Address", memberPhoto:"Whole Family Photo", fatherName:"Father’s Name", motherName:"Mother’s Name", numberOfChildren:"Number of Children’s",
 refNo:"Ref No.", placeOfBaptism:"Place of Baptism", dateOfBirth:"Date of Birth", dateOfBaptism:"Date of Baptism", gender:"Gender", occupation:"Occupation", residence:"Residence", godFather:"God Father", godMother:"God Mother", minister:"Minister", confirmed:"Confirmed", married:"Married",
 relationship:"Parents Names or Spouse Name", locality:"Place of Death", causeOfDeath:"Cause of Death", placeOfBurial:"Place of Burial", dateOfDeath:"Date of Death", dateOfBurial:"Date of Burial",
 recordNo:"Ref No.", fullName:"Full Name (As in Birth/Baptism Certificate)", age:"Age", classStandard:"Class / Standard", parishOfBaptism:"Parish/Church of Baptism", baptismAddress:"Address", residentialAddress:"Residential Address", pinCode:"Pin Code", mobileNumber:"Mobile Number", alternativeContact:"Alternative Contact Number", emailAddress:"Email Address",
 godFatherName:"God Father’s Name", godMotherName:"God Mother’s Name", dateOfConfirmation:"Date of Confirmation", placeOfConfirmation:"Place of Confirmation", dateOfMarriage:"Date of Marriage", placeOfMarriage:"Place of Marriage", blessedBy:"Blessed By", bridegroomMinister:"Bridegroom Minister", bridegroomWitness:"Bridegroom Witness", brideWitness:"Bride Witness", bridegroomName:"Name", bridegroomSurname:"Surname", bridegroomDob:"Date of Birth", bridegroomOccupation:"Occupation", bridegroomAddress:"Address", bridegroomFatherName:"Father’s Name", bridegroomMotherName:"Mother’s Name", bridegroomWitness:"Witness", brideName:"Name", brideSurname:"Surname", brideDob:"Date of Birth", brideOccupation:"Occupation", brideAddress:"Address", brideFatherName:"Father’s Name", brideMotherName:"Mother’s Name", brideWitness:"Witness", groomName:"Groom Name"
};
const FIELD_ORDER = {
 familyCards:["registrationDate","familyCardNo","name","spouseName","dob","memberAge","mobile","address","fatherName","motherName","numberOfChildren"],
 baptisms:["refNo","placeOfBaptism","dateOfBirth","dateOfBaptism","name","gender","fatherName","motherName","occupation","residence","godFather","godMother","minister","confirmed","married"],
 burials:["refNo","name","relationship","age","gender","occupation","locality","causeOfDeath","placeOfBurial","dateOfDeath","dateOfBurial","minister"],
 firstHolyCommunions:["recordNo","fullName","dateOfBirth","age","gender","classStandard","dateOfBaptism","parishOfBaptism","baptismAddress","fatherName","motherName","residentialAddress","pinCode","mobileNumber","alternativeContact","emailAddress"],
 confirmations:["refNo","name","dateOfBirth","dateOfBaptism","placeOfBaptism","fatherName","motherName","godFatherName","godMotherName","dateOfConfirmation","placeOfConfirmation","minister"],
 marriages:["refNo","dateOfMarriage","placeOfMarriage","bridegroomName","bridegroomSurname","bridegroomDob","bridegroomOccupation","bridegroomAddress","bridegroomFatherName","bridegroomMotherName","brideName","brideSurname","brideDob","brideOccupation","brideAddress","brideFatherName","brideMotherName","bridegroomWitness","brideWitness","blessedBy"]
};
const nice = s => FIELD_LABELS[s] || String(s).replace(/([a-z0-9])([A-Z])/g,"$1 $2").replace(/[_-]+/g," ").replace(/^./,c=>c.toUpperCase());
function sortRef(a,b){const av=String(a.refNo??a.recordNo??a.familyCardNo??a.ref??"").trim(),bv=String(b.refNo??b.recordNo??b.familyCardNo??b.ref??"").trim();const an=av.match(/\d+(?:\.\d+)?/),bn=bv.match(/\d+(?:\.\d+)?/);if(an&&bn){const d=Number(an[0])-Number(bn[0]);if(d)return d;}return av.localeCompare(bv,undefined,{numeric:true,sensitivity:"base"});}
function formatDateDMY(v){let d=null;if(v&&typeof v==="object"&&typeof v.toDate==="function")d=v.toDate();else if(v&&typeof v==="object"&&typeof v.seconds==="number")d=new Date(v.seconds*1000);else if(v instanceof Date)d=v;else if(typeof v==="string"){const x=v.trim();let m=x.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));else if((m=x.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)))d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));else return null;}if(!d||Number.isNaN(d.getTime()))return null;return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;}
const DATE_KEYS = /^(dob|dateOfBirth|dateOfBaptism|dateOfDeath|dateOfBurial|dateOfConfirmation|dateOfMarriage|registrationDate)$/i;
function normalizeBaptismPlace(v){return String(v??"").replace(/Chirra\s+Guduru/gi,"Chirraguduru").replace(/Gattu\s+Singaram/gi,"Gattusingaram");}
function formatValue(v,key=""){ if(v===null||v===undefined||v==="") return "—"; if(DATE_KEYS.test(key)){const formatted=formatDateDMY(v);if(formatted)return formatted;} if(v?.seconds) return formatDateDMY(v) || "—"; if(v instanceof Date) return formatDateDMY(v) || "—"; if(Array.isArray(v)) return v.map(x=>typeof x==="object"?Object.entries(x||{}).filter(([k])=>!isHidden(k)).map(([k,val])=>`${nice(k)}: ${formatValue(val)}`).join(", "):String(x)).join("; ")||"—"; if(typeof v==="object") return Object.entries(v).filter(([k])=>!isHidden(k)).map(([k,val])=>`${nice(k)}: ${formatValue(val)}`).join("; ")||"—"; return key==="placeOfBaptism"?normalizeBaptismPlace(v):String(v); }
function isHidden(k){return /photo|image|base64|createdBy|updatedBy|updatedAt|createdAt|password|uid/i.test(k)}
function getColumns(rows,id){if(id==="marriages"){const order=FIELD_ORDER.marriages;const keys=order.filter(k=>k!=="blessedBy").filter(k=>rows.some(r=>r[k]!==undefined));if(rows.some(r=>r.blessedBy!==undefined||r.minister!==undefined))keys.push("blessedBy");return keys;}const keys=[]; rows.forEach(r=>Object.keys(r).forEach(k=>{if(k!=="id"&&!isHidden(k)&&!keys.includes(k))keys.push(k)}));const order=FIELD_ORDER[id]||[];keys.sort((a,b)=>{const ai=order.indexOf(a),bi=order.indexOf(b);if(ai<0&&bi<0)return 0;if(ai<0)return 1;if(bi<0)return -1;return ai-bi});return keys}
function checkedIds(){return [...document.querySelectorAll('.register-choice input:checked')].map(x=>x.value)}
function render(){const q=searchEl.value.trim().toLowerCase();let total=0;const blocks=[];shown.forEach(id=>{const meta=config.find(c=>c.id===id),all=cache[id]||[];const loadError=cache[id+"Error"];const cols=getColumns(all,id);const rows=all.filter(r=>!q||[r.id,...Object.entries(r).filter(([k])=>!isHidden(k)).map(([,v])=>formatValue(v))].join(" ").toLowerCase().includes(q));total+=rows.length;let body="";if(loadError){body=`<tr><td colspan="${Math.max(cols.length,1)}">Could not load this register (${escapeHtml(loadError.code||loadError.message||"Firestore error")}). Check Firestore rules and the browser console.</td></tr>`}else if(!cols.length){body='<tr><td>No printable fields found in this register.</td></tr>'}else if(!rows.length){body=`<tr><td class="no-results" colspan="${cols.length}">No matching records.</td></tr>`}else{body=rows.slice().sort(sortRef).map((r,i)=>`<tr><td>${i+1}</td>${cols.map(k=>`<td>${escapeHtml(formatValue(id==="marriages"&&k==="blessedBy"?(r.blessedBy||r.minister):r[k],k))}</td>`).join("")}</tr>`).join("")};blocks.push(`<section class="report-card"><div class="church-print-header">
  <div class="church-print-title">SUDDIKARANA MATHA CHURCH</div>
  <div class="church-print-subtitle">OUR LADY OF PURIFICATION CHURCH</div>
  <div class="church-print-diocese">DHARMARAM PARISH, DIOCESE OF NALGONDA</div>
  <div class="church-print-address">Dharmaram Village &amp; Post, Addaguduru Mandal, Yadadri Bhuvanagiri Dist. Telangana -508277, INDIA.</div>
</div><div class="report-card-head"><h2>${escapeHtml(meta.title)}</h2><span>${rows.length} ${rows.length===1?'record':'records'}${q?` (of ${all.length})`:''}</span></div><div class="table-wrap"><table class="report-table"><thead>${id === "marriages" ? `<tr><th rowspan="2">S. No.</th>${cols.slice(0,3).map(k=>`<th rowspan="2">${escapeHtml(nice(k))}</th>`).join("")}${cols.filter(k=>k.startsWith("bridegroom")&&!k.toLowerCase().includes("witness")&&k!=="bridegroomMinister").length?`<th colspan="${cols.filter(k=>k.startsWith("bridegroom")&&!k.toLowerCase().includes("witness")&&k!=="bridegroomMinister").length}">BRIDEGROOM DETAILS</th>`:""}${cols.filter(k=>k.startsWith("bride")&&!k.startsWith("bridegroom")&&!k.toLowerCase().includes("witness")).length?`<th colspan="${cols.filter(k=>k.startsWith("bride")&&!k.startsWith("bridegroom")&&!k.toLowerCase().includes("witness")).length}">BRIDE DETAILS</th>`:""}${cols.some(k=>k.toLowerCase().includes("witness"))?`<th colspan="${cols.filter(k=>k.toLowerCase().includes("witness")).length}">WITNESSES</th>`:""}${cols.some(k=>k==="blessedBy")?`<th colspan="1">BLESSED BY</th>`:""}</tr><tr>${cols.slice(3).map(k=>`<th>${escapeHtml(k==="blessedBy"?"Blessed By":nice(k))}</th>`).join("")}</tr>`:`<tr>${`<th>S. No.</th>${cols.map(k=>`<th>${escapeHtml(nice(k))}</th>`).join("")}`}</tr>`}</thead><tbody>${body}</tbody></table></div></section>`)});reportsEl.innerHTML=blocks.length?blocks.join(""):'<div class="empty-reports">Choose one or more registers above, then click <strong>Show Selected Reports</strong>.</div>';document.getElementById("searchStatus").textContent=shown.length?`${total} matching records across ${shown.length} register${shown.length===1?'':'s'}`:"Choose reports above";printBtn.disabled=!shown.length||!total;}
async function loadAll(){
  statusEl.textContent="Loading parish registers…";
  statusEl.classList.remove("load-error");
  const outcomes = await Promise.all(config.map(async c => {
    try {
      const snap = await getDocs(collection(db, c.id));
      return {id:c.id, rows:snap.docs.map(d=>({id:d.id,...d.data()})), error:null};
    } catch (e) {
      console.error(`Could not load ${c.title} (${c.id})`, e);
      return {id:c.id, rows:[], error:e};
    }
  }));
  outcomes.forEach(({id,rows,error}) => { cache[id]=rows; cache[id+"Error"]=error; });
  const total=outcomes.reduce((n,x)=>n+x.rows.length,0);
  const failed=outcomes.filter(x=>x.error);
  if(failed.length){
    statusEl.classList.add("load-error");
    statusEl.textContent=`Loaded ${total} records. Could not access: ${failed.map(x=>config.find(c=>c.id===x.id).title).join(", ")}. Check the browser console / Firestore rules.`;
  } else {
    statusEl.textContent=`Loaded ${total} records across all 6 registers.`;
  }
  if(shown.length) render();
}
onAuthStateChanged(auth,async user=>{if(!user){window.location.href="../index.html";return;}signedIn=true;document.getElementById("userEmail").textContent=user.email||"User";await loadAll()});
document.getElementById("logoutButton").addEventListener("click",async()=>{await signOut(auth);window.location.href="../index.html"});
document.getElementById("selectAll").addEventListener("click",()=>document.querySelectorAll('.register-choice input').forEach(x=>x.checked=true));
document.getElementById("clearSelection").addEventListener("click",()=>{document.querySelectorAll('.register-choice input').forEach(x=>x.checked=false);shown=[];render()});
document.getElementById("showReports").addEventListener("click",()=>{shown=checkedIds();if(!shown.length){reportsEl.innerHTML='<div class="empty-reports">Please select at least one register above.</div>';printBtn.disabled=true;document.getElementById("searchStatus").textContent="Choose reports above";return;}render();reportsEl.scrollIntoView({behavior:"smooth",block:"start"})});
printBtn.addEventListener("click",()=>{if(shown.length)normalizePrintPlaceNames();window.print()});searchEl.addEventListener("input",()=>{if(shown.length)render()});document.getElementById("refreshRecords")?.addEventListener("click",loadAll);
