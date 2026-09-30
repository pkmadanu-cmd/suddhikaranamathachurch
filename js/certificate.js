import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const type = document.body.dataset.certificateType;
const configs = {
  baptism:{collection:'baptisms',title:'Certificate of Baptism',search:'refNo',label:'Ref No.'},
  communion:{collection:'firstHolyCommunions',title:'Certificate of First Holy Communion',search:'recordNo',label:'Ref No.'},
  confirmation:{collection:'confirmations',title:'Certificate of Confirmation',search:'refNo',label:'Ref No.'},
  marriage:{collection:'marriages',title:'Certificate of Marriage',search:'refNo',label:'Ref No.'}
};
const cfg=configs[type];
let records=[]; let selected=null;
const userEmail=document.getElementById('userEmail');
const searchInput=document.getElementById('certificateSearch');
const searchButton=document.getElementById('searchCertificate');
const message=document.getElementById('certificateMessage');
const paper=document.getElementById('certificatePaper');
const printButton=document.getElementById('printCertificate');
const clearButton=document.getElementById('clearCertificate');

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function fmt(v){if(!v)return ''; const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?`${m[3]}-${m[2]}-${m[1]}`:String(v);}
function line(label,value){return `<div class="certificate-line"><span class="label">${esc(label)}</span><span class="colon">:</span><span class="value">${esc(value||'')}</span></div>`;}
function header(title,intro=''){return `<h1 class="certificate-title">${esc(title)}</h1><div class="certificate-church">SUDDHIKARANA MATHA CHURCH</div><div class="certificate-subtitle">(Our Lady of Purification)</div><div class="certificate-address">Dharmaram (Village), Addagudur (Mandal), Nalgonda (District), Telangana, - 508 277, INDIA.</div><div class="certificate-ornament"></div>${intro?`<div class="certificate-intro">${esc(intro)}</div>`:''}`;}
function footer(){return `<div class="certificate-footnote">(A true extract from the ${esc(cfg.title.replace('Certificate of ','').replace('First Holy Communion','First Holy Communion'))} Register of Suddhikarana Matha Church, Dharmaram – Telangana, India)</div><div class="certificate-signatures"><div class="certificate-signature">Date of Issue</div><div class="certificate-signature">Parish Seal</div><div class="certificate-signature">Catholic Minister</div></div>`;}
function render(data){
  let html='';
  if(type==='baptism'){
    html=header('Certificate of Baptism')+`<div class="certificate-grid">${line('Ref No.',data.refNo)}${line('Place of Baptism',data.placeOfBaptism)}${line('Date of Birth',fmt(data.dateOfBirth))}${line('Date of Baptism',fmt(data.dateOfBaptism))}${line('Name',data.name)}${line("Father’s Name",data.fatherName)}${line("Mother’s Name",data.motherName)}${line('Occupation',data.occupation)}${line('Residence',data.residence)}${line('God Father',data.godFather)}${line('God Mother',data.godMother)}${line('Minister',data.minister)}${line('Confirmed',data.confirmed)}${line('Married',data.married)}</div>${footer()}`;
  } else if(type==='marriage'){
    const groom=`${data.bridegroomName||''} ${data.bridegroomSurname||''}`.trim(); const bride=`${data.brideName||''} ${data.brideSurname||''}`.trim(); const minister=data.minister||data.bridegroomMinister||data.brideMinister||'';
    html=header('Certificate of Marriage','This Marriage is a Registered Civil Marriage under the provisions of the Indian Christian Marriage Act XV of 1872, solemnized in accordance with section 5 (1) and registered with the Government of India under Section 30 of the said Act.')+line('Ref No.',data.refNo)+line('Date of Marriage',fmt(data.dateOfMarriage))+line('Place of Marriage',data.placeOfMarriage)+`
<table class="marriage-certificate-table">
<tr><th></th><th>BRIDEGROOM</th><th>BRIDE</th></tr>
<tr><td>Name</td><td>${esc(data.bridegroomName||'')}</td><td>${esc(data.brideName||'')}</td></tr>
<tr><td>Surname</td><td>${esc(data.bridegroomSurname||'')}</td><td>${esc(data.brideSurname||'')}</td></tr>
<tr><td>Date of Birth</td><td>${esc(fmt(data.bridegroomDob))}</td><td>${esc(fmt(data.brideDob))}</td></tr>
<tr><td>Occupation</td><td>${esc(data.bridegroomOccupation||'')}</td><td>${esc(data.brideOccupation||'')}</td></tr>
<tr><td>Address</td><td>${esc(data.bridegroomAddress||'')}</td><td>${esc(data.brideAddress||'')}</td></tr>
<tr><td>Father’s Name</td><td>${esc(data.bridegroomFatherName||'')}</td><td>${esc(data.brideFatherName||'')}</td></tr>
<tr><td>Mother’s Name</td><td>${esc(data.bridegroomMotherName||'')}</td><td>${esc(data.brideMotherName||'')}</td></tr>
<tr><td>Witness</td><td>${esc(data.bridegroomWitness||'')}</td><td>${esc(data.brideWitness||'')}</td></tr>
</table>${line('Minister',minister)}${footer()}`;
  } else if(type==='confirmation'){
    html=header('Certificate of Confirmation')+`<div class="certificate-grid">${line('Ref No.',data.refNo||'')}${line('Name',data.name)}${line('Date of Birth',fmt(data.dateOfBirth))}${line('Date of Baptism',fmt(data.dateOfBaptism))}${line('Place of Baptism',data.placeOfBaptism)}${line("Father’s Name",data.fatherName)}${line("Mother’s Name",data.motherName)}${line('Date of Confirmation',fmt(data.dateOfConfirmation))}${line('Place of Confirmation',data.placeOfConfirmation)}${line('Minister',data.minister)}</div>${footer()}`;
  } else {
    html=header('Certificate of First Holy Communion')+`<div class="certificate-grid">${line('Ref No.',data.recordNo)}${line('Full Name',data.fullName)}${line('Date of Birth',fmt(data.dateOfBirth))}${line('Age',data.age)}${line('Gender',data.gender)}${line('Class / Standard',data.classStandard)}${line('Date of Baptism',fmt(data.dateOfBaptism))}${line('Parish/Church of Baptism',data.parishOfBaptism)}${line('Baptism Address',data.baptismAddress)}${line("Father’s Full Name",data.fatherName)}${line("Mother’s Full Name",data.motherName)}${line('Residential Address',data.residentialAddress)}${line('Pin Code',data.pinCode)}${line('Mobile Number',data.mobileNumber)}${line('Alternative Contact Number',data.alternativeContactNumber)}${line('Email Address',data.emailAddress)}</div>${footer()}`;
  }
  paper.innerHTML=html;
}
function findRecord(){const term=searchInput.value.trim().toLowerCase(); if(!term){message.textContent='Please enter a Ref No.';return;} let found=records.find(r=>String(r.data[cfg.search]||'').toLowerCase()===term); if(!found && type==='confirmation') found=records.find(r=>String(r.data.name||'').toLowerCase()===term); if(!found){message.textContent=type==='confirmation'?'No Confirmation record found by that Ref No. Existing older Confirmation records may not have a Ref No. yet.':'No record found for that Ref No.'; return;} selected=found; render(found.data); message.textContent=`${cfg.title} loaded successfully.`;}
async function load(){const snap=await getDocs(collection(db,cfg.collection)); records=snap.docs.map(d=>({id:d.id,data:d.data()}));}
onAuthStateChanged(auth,async user=>{if(!user){location.href='../index.html';return;} userEmail.textContent=user.email||'User'; try{await load();}catch(e){message.textContent='Could not load records. Please check Firestore rules.';}});
document.getElementById('logoutButton')?.addEventListener('click',async()=>{await signOut(auth);location.href='../index.html';});
searchButton.addEventListener('click',findRecord); searchInput.addEventListener('keydown',e=>{if(e.key==='Enter')findRecord();}); printButton.addEventListener('click',()=>{if(!selected){message.textContent='Please search and load a certificate first.';return;} window.print();}); clearButton.addEventListener('click',()=>{selected=null;searchInput.value='';message.textContent='';paper.innerHTML='<div class="certificate-empty">Search by Ref No. to load the certificate.</div>';});
