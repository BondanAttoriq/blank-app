import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CanvasSceneRenderer } from 'cirata/software';

const $ = (s) => document.querySelector(s);
const el = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};
const button = (text, cls, fn) => {
  const b = el('button', text, cls);
  b.type = 'button';
  b.addEventListener('click', fn);
  return b;
};
const offline = $('#embedded-design');
const design = offline ? JSON.parse(offline.textContent) : await fetch('./data/design.json').then(r => {
  if (!r.ok) throw Error('Data model tidak dapat diakses');
  return r.json();
});
const { places, route_groups: groups, equipment, routes, area_tags: areaTags, references } = design;
const placeById = Object.fromEntries(places.map(p => [p.id,p]));
const about = (tag) => equipment[tag] || {
  nama: tag, fungsi: 'Peralatan pada tata letak v5. Gunakan PFD atau P&ID untuk identifikasi proses.',
  refs: areaTags[tag] ? ['PID' + areaTags[tag], 'PFD'] : ['PFD'],
  where: {100:'harvest', 200:'prep', 300:'ssf',400:'ssf',500:'ad',600:'rack',700:'poly'}[areaTags[tag]] || 'site',
};
const B = ([x, y, z]) => new THREE.Vector3(x, z, -y);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (x) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(x);
const routeValue = (r) => r.value == null ? 'Laju tidak dicantumkan' : fmt(r.value) + ' ' + (r.unit || '');

let current = placeById.site;
let cameraMode = 'iso';
let tagSelected = null;
let routeSelected = null;
let active = new Set();
let openRoof = false;
let rackOnly = false;
let tourTimer;
let playing = false;
let tourIndex = -1;
let shotStart = 0, hoverRoute = null;
let viewReady = false;
let softwareRenderer = false;

function createInspectorHeader(kicker, title, close) {
  const h = el('div', null, 'panel-heading');
  const d = el('div');
  d.append(el('span', kicker, 'eyebrow'), el('h2', title));
  h.append(d);
  if (close) h.append(button('✕','close',close));
  return h;
}
function setReference(key) {
  const r = references[key];
  if (!r) return;
  const embedded = $('#embedded-ref-' + key);
  $('#refImage').src = embedded ? 'data:image/jpeg;base64,' + embedded.textContent.trim() : r.file;
  $('#refImage').alt = r.name;
  $('#refNote').textContent = r.name + ' · halaman ' + r.page + ' pada PDF sumber';
  for (const b of $('#refList').children) b.setAttribute('aria-pressed', b.dataset.key === key);
}
function openReference(key = 'PFD') {
  setReference(key);
  if (!$('#refDialog').open) $('#refDialog').showModal();
}
for (const [key, item] of Object.entries(references)) {
  const b = button(item.name, 'ref-btn', () => setReference(key));
  b.dataset.key = key;
  $('#refList').append(b);
}
$('#closeRef').onclick = () => $('#refDialog').close();
$('#sources').onclick = () => openReference();

function refsContent(keys) {
  const frag = document.createDocumentFragment();
  const div = el('div', null, 'references');
  for (const key of new Set(keys || [])) {
    if (references[key]) div.append(button(references[key].name, 'ref-btn', () => openReference(key)));
  }
  if (div.childElementCount) frag.append(el('h3','Dokumen rujukan','ref-head'), div);
  return frag;
}
function resetSelection() {
  tagSelected = routeSelected = null;
  updateScene();
  panel();
}
function metricsContent(metrics) {
  const div = el('div', null, 'metrics');
  for (const [v, name] of metrics || []) {
    const m = el('div', null, 'metric');
    m.append(el('strong',v),el('span',name));
    div.append(m);
  }
  return div;
}
function listEntries(entries) {
  const d = el('dl',null,'info-list');
  for (const [title, info] of entries) {
    if (info == null || info === '') continue;
    const row = el('div');
    row.append(el('dt',title),el('dd',String(info)));
    d.append(row);
  }
  return d;
}
function streamRow(key, r) {
  const b = button(null,'stream-entry',() => selectRoute(key));
  b.append(el('b', r.id + ' · ' + (r.uraian || groups[r.group].label)),
    el('span', r.dari + ' → ' + r.ke + ' · ' + routeValue(r) + (r.DN ? ' · ' + r.DN : r.piped===false ? ' · tidak dipipakan' : '')));
  return b;
}
const endpointTags = (s) => String(s || '').match(/[A-Z]+-\d{3}[A-Z]?|EFB-101|EFB-A|EFB-B|EFB-PANEN/g) || [];
function routeMatches(value, tag) {
  return value === tag || endpointTags(value).includes(tag) ||
    (/\d$/.test(tag) && endpointTags(value).some(t => t.length === tag.length + 1 && t.startsWith(tag)));
}
function connected(tag, dir) {
  const seen = new Set();
  return Object.entries(routes).filter(([, r]) => {
    if (!routeMatches(r[dir], tag)) return false;
    const key = r.id + ':' + r[dir === 'ke' ? 'dari' : 'ke'];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function routeList(caption, items, empty) {
  const section = el('section',null,'related');
  section.append(el('h3',caption));
  if (!items.length) section.append(el('p',empty,'hint'));
  for (const [key,r] of items) section.append(streamRow(key,r));
  return section;
}

function energyTxt(r){ return r.energi_GJ_hari==null?null:fmt(r.energi_GJ_hari)+' GJ/hari ≈ '+fmt(Math.round(r.energi_kW))+' kW'; }
function sizeLine(r){
  if(r.piped===false) return 'Tidak dipipakan · '+(r.angkut||'angkut padatan');
  if(!r.DN) return null;
  return r.DN+(r.v_m_s==null?'':' · v '+fmt(r.v_m_s)+' m/s (maks '+fmt(r.v_maks)+')');
}
function sizingBlock(r){
  const sec=el('section',null,'sizing');
  sec.append(el('h3','Ukuran pipa dari neraca massa & energi'));
  if(r.piped===false){ sec.append(el('p','Padatan basah tidak dipipakan. Jalur digambar putus-putus dan berpindah dengan '+(r.angkut||'konveyor')+'.','hint')); return sec; }
  const Q=(r.laju_desain_t_per_hari&&r.rho)?r.laju_desain_t_per_hari*1000/24/r.rho:null;
  sec.append(listEntries([['Ukuran',r.DN?r.DN+' · Sch 40/STD':null],['Ø luar / dalam',r.OD_mm?fmt(r.OD_mm)+' / '+(r.ID_mm?fmt(r.ID_mm):'–')+' mm':null],
    ['Isolasi',r.isolasi_mm?r.isolasi_mm+' mm':null],['Servis',r.servis],['Densitas',r.rho?fmt(r.rho)+' kg/m³':null],
    ['Debit desain',Q==null?null:fmt(Q)+' m³/jam'],['Kecepatan',r.v_m_s==null?null:fmt(r.v_m_s)+' m/s ≤ '+fmt(r.v_maks)+' m/s'],['Basis',r.basis],
    ['Basis energi',r.energi_basis?r.energi_basis+' · '+r.energi_status:null]]));
  sec.append(el('p','Aturan: DN terkecil (ASME B36.10) dengan kecepatan ≤ batas servis; laju desain 1,2 × normal, transfer batch 3 ×. Diameter tabung di model = Ø luar + isolasi.','hint'));
  return sec;
}
function panel() {
  const node = $('#panel');
  node.replaceChildren();
  if (routeSelected) {
    const r = routes[routeSelected];
    const col = routeColor(routeSelected);
    node.append(createInspectorHeader('Aliran · '+ r.id, r.uraian || groups[r.group].label,resetSelection));
    // diagram arah aliran: DARI -> (pipa beranimasi) -> KE
    const fp = el('div', null, 'flowpath'); fp.style.setProperty('--c', col);
    const src = endpointTags(r.dari)[0], dst = endpointTags(r.ke)[0];
    const nA = button(null, 'fp-node from', () => { if (src) selectEquipment(src); });
    nA.append(el('small', 'Dari'), el('b', r.dari)); if (!src) nA.disabled = true;
    const lk = el('div', null, 'fp-link'); lk.append(el('i'), el('span', routeValue(r)));
    const nB = button(null, 'fp-node to', () => { if (dst) selectEquipment(dst); });
    nB.append(el('small', 'Ke'), el('b', r.ke)); if (!dst) nB.disabled = true;
    fp.append(nA, lk, nB); node.append(fp);
    const act = el('div', null, 'fx-actions');
    act.append(button('▶ Putar ulang aliran', 'small-btn', () => { shotStart = performance.now(); }),
      button('◎ Bingkai kamera', 'small-btn', () => frameRoute(routeSelected)));
    node.append(act);
    node.append(listEntries([['Kelompok',groups[r.group].label],['Laju normal',routeValue(r)],
        ['Laju desain',r.laju_desain_t_per_hari==null?null:fmt(r.laju_desain_t_per_hari)+' ton/hari'],
        ['Energi',energyTxt(r)],['Status data',r.status]]));
    node.append(sizingBlock(r));
    if (r.ssid) node.append(el('p','Jejak rute SSF mengikuti model v5. Periksa konfigurasi paralel pada P&ID Area 300.','warning'));
    if (r.kind === 'Alur skematik v6') node.append(el('p','Arah aliran mengacu pada diagram proses. Garis mewakili hubungan antarfungsi.','hint'));
    const up = src ? connected(src, 'ke').filter(([k]) => k !== routeSelected) : [];
    const down = dst ? connected(dst, 'dari').filter(([k]) => k !== routeSelected) : [];
    node.append(routeList('Aliran hulu · masuk ke ' + (src || r.dari), up, 'Tidak ada aliran tercatat yang masuk ke titik asal.'),
      routeList('Aliran hilir · keluar dari ' + (dst || r.ke), down, 'Tidak ada aliran tercatat yang keluar dari titik tujuan.'));
    node.append(refsContent(r.ref));
    return;
  }
  if (tagSelected) {
    const tag = tagSelected, row = about(tag);
    node.append(createInspectorHeader('Peralatan · '+tag,row.nama || tag,resetSelection),
      el('p',row.fungsi,'summary'),
      listEntries([['Ukuran visual',row.size],['Volume',row.V_m3 == null || row.V_m3 === '' ? null : fmt(row.V_m3) + ' m³'],['Basis v5',row.basis]]));
    if (tag.startsWith('R-301')) node.append(el('p','Jumlah bejana pada geometri v5 berbeda dari P&ID Area 300. Gunakan rujukan untuk membandingkan keduanya.','warning'));
    const areaTarget=()=> { const where=row.where||'site'; selectPlace(where,{keep:true}); tagSelected=tag; updateScene(); panel(); };
    if (current.id !== row.where && row.where) node.append(button('Fokus ke area alat','small-btn',areaTarget));
    node.append(routeList('Aliran masuk',connected(tag,'ke'),'Belum tercatat sebagai terminus aliran.'),
      routeList('Aliran keluar',connected(tag,'dari'),'Belum tercatat sebagai asal aliran.'),
      refsContent(row.refs));
    return;
  }
  node.append(createInspectorHeader(current.id === 'section' ? 'Detail EFB' :
    current.area ? 'Area '+current.area : 'Basis desain D200', current.subtitle),
    el('p',current.story,'summary'), metricsContent(current.metrics));
  const actions = el('div',null,'detail-actions');
  if (current.id === 'efb') {
    actions.append(button('Buka potongan melintang EFB','btn accent',()=>selectPlace('section')),
      button('Telusuri jalur biomassa EFB','btn',()=>{ active=new Set(['efb']); routeSelected=null; refresh(); }));
  }
  if (current.id === 'section') actions.append(button('Kembali ke waduk','btn',()=>selectPlace('efb')));
  if (current.id === 'poly') actions.append(button(openRoof ? 'Tutup atap Gedung 700' : 'Buka atap Gedung 700','btn accent',()=>{
    openRoof=!openRoof; updateScene(); panel(); updateFallback(); if(openRoof) moveCamera(); }));
  if (current.id === 'rack') actions.append(button(rackOnly ? 'Kembalikan konteks tapak' : 'Isolasi potongan pipe rack','btn accent',()=>{
    rackOnly=!rackOnly; updateScene(); panel(); moveCamera(); updateFallback(); }));
  if (actions.children.length) node.append(actions);
  if (active.size && current.id !== 'section') {
    let entries = Object.entries(routes).filter(([,r]) => r.groups.some(g=>active.has(g)));
    if (current.area) {
      const relevant=entries.filter(([, r])=>r.areas.includes(current.area));
      if (relevant.length) entries=relevant;
    }
    const seen = new Set();
    entries=entries.filter(([,r])=>{
      const key=r.id+' '+r.dari+' '+r.ke;
      if(seen.has(key)) return false;
      seen.add(key);return true;
    });
    const details=el('details',null,'related');
    const info=el('summary','Aliran yang ditampilkan · '+entries.length,'hint');
    details.append(info);
    for (const [key,r] of entries) details.append(streamRow(key,r));
    node.append(details);
  }
  if(current.area && current.id!=='section') {
    const details=el('details',null,'related');
    details.append(el('summary','Pilih peralatan','hint'));
    const candidates=Object.entries(equipment).filter(([,r])=>r.where===current.id || current.id==='ssf'&&r.area===400);
    for(const [tag,r] of candidates) details.append(button(tag+' · '+(r.nama||'Peralatan'),'stream-entry',()=>selectEquipment(tag)));
    if(candidates.length)node.append(details);
  }
  node.append(refsContent(current.refs));
}

const defaultFlows = {
  efb:['efb'],harvest:['wild','efb'],prep:['wild'],ssf:['wild'],
  tank:['etanol'],poly:['efb','etanol'],ad:['biogas'],rack:['biogas','panas'],
};
function stopTour() {
  clearTimeout(tourTimer);
  playing=false;
  $('#tour').textContent=tourIndex<0?'Mulai tur':'Lanjutkan tur';
}
function selectPlace(id,{keep=false,fromTour=false}={}) {
  if(!fromTour && playing) stopTour();
  $('#tooltip').hidden=true;
  current=placeById[id]||placeById.site;
  if(!keep) {
    tagSelected=routeSelected=null;
    active=new Set(defaultFlows[current.id]||[]);
  }
  openRoof=current.id==='poly';
  rackOnly=false;
  if(current.id==='section') cameraMode='iso';
  if(fromTour) cameraMode='iso';
  $('#viewTitle').textContent=current.name;
  refresh();
  moveCamera();
  updateFallback();
}
function selectEquipment(tag) {
  if(playing) stopTour();
  tagSelected=tag;
  routeSelected=null;
  shotStart=performance.now();
  updateScene();
  panel();
}
function selectRoute(key, frame=true) {
  if(playing) stopTour();
  routeSelected=key;
  tagSelected=null;
  active.add(routes[key].group);
  shotStart=performance.now();
  refresh();
  if(frame) frameRoute(key);
}
const mainPlaces=places.filter(p=>p.id!=='section');
for(const p of mainPlaces) {
  const b=button(null,'nav-choice',()=>selectPlace(p.id));
  b.dataset.place=p.id;
  b.append(el('i',null,'mark'), document.createTextNode(p.name));
  $('#places').append(b);
}
function swatch(group,color) {
  const d=el('i',null,'swatch'); d.style.setProperty('--swatch',color||groups[group].color); return d;
}
for(const [key, item] of Object.entries(groups)) {
  const b=button(null,'filter',()=>{
    if(playing)stopTour();
    if(active.has(key))active.delete(key);else active.add(key);
    if(routeSelected && !routes[routeSelected].groups.some(g=>active.has(g))) routeSelected=null;
    refresh();
  });
  b.dataset.group=key;
  const n=el('span'); n.append(swatch(key),document.createTextNode(item.short));
  b.title=item.label;
  b.append(n,el('b','✓','tick'));
  $('#groups').append(b);
}
$('#clearflows').onclick=()=> { active.clear(); routeSelected=null; refresh(); };
function refresh() {
  for (const b of $('#places').children) {
    const on = b.dataset.place === current.id || (current.id === 'section' && b.dataset.place === 'efb');
    b.classList.toggle('active',on);
    if(on) b.setAttribute('aria-current','true'); else b.removeAttribute('aria-current');
  }
  for (const b of $('#groups').children) b.setAttribute('aria-pressed',active.has(b.dataset.group));
  $('#iso').setAttribute('aria-pressed',cameraMode==='iso');
  $('#top').setAttribute('aria-pressed',cameraMode==='top');
  const legend=$('#legend');
  legend.replaceChildren();
  const show=active.size && current.id!=='section' ? active : current.id==='section'? [] : ['wild','efb'];
  for(const key of show){
    const li=el('span');
    li.append(swatch(key),document.createTextNode(key==='panas'?'Uap':groups[key].label));
    legend.append(li);
    if(key==='panas'){ const c=el('span');c.append(swatch(key,'#889BF2'),document.createTextNode('Kondensat balik'));legend.append(c); }
  }
  if(active.size && current.id!=='section') legend.append(el('span','Kilau bergerak = arah aliran · klik pipa untuk menelusuri','key-arrow'));
  if(current.id==='section') legend.append(el('span','Potongan konseptual · muka air dan akar'));
  for(const b of $('#segments').children) b.classList.toggle('on',Number(b.dataset.index)===tourIndex);
  $('#stepName').textContent=tourIndex<0 ? 'Eksplorasi bebas' : `Tur · ${tourIndex+1} dari ${design.tour.length}`;
  updateScene();
  panel();
}
function tourStage(index) {
  clearTimeout(tourTimer);
  tourIndex = Math.min(Math.max(0,index),design.tour.length-1);
  selectPlace(design.tour[tourIndex],{fromTour:true});
  if(playing) {
    tourTimer=setTimeout(()=>{
      if(tourIndex<design.tour.length-1) tourStage(tourIndex+1);
      else { playing=false; tourIndex=-1; $('#tour').textContent='Ulangi tur';refresh(); }
    }, current.tour_seconds*1000);
  }
}
for(let i=0;i<design.tour.length;i++){
  const b=button(null,'',()=>tourStage(i));
  b.dataset.index=i;
  b.setAttribute('aria-label',placeById[design.tour[i]].name);
  $('#segments').append(b);
}
$('#tour').onclick=()=>{
  if(playing){stopTour();return;}
  playing=true;$('#tour').textContent='Jeda tur';
  tourStage(tourIndex<0?0:tourIndex);
};
function stepBy(n) {
  if(tourIndex>=0) {tourStage(tourIndex+n);return;}
  const ix=mainPlaces.findIndex(p=>p.id===current.id);
  selectPlace(mainPlaces[Math.min(mainPlaces.length-1,Math.max(0,ix+n))].id);
}
$('#prev').onclick=()=>stepBy(-1);
$('#next').onclick=()=>stepBy(1);
$('#iso').onclick=()=>{cameraMode='iso';refresh();moveCamera();updateFallback();};
$('#top').onclick=()=>{cameraMode='top';refresh();moveCamera();updateFallback();};
$('#reset').onclick=()=>moveCamera(true);
$('#full').onclick=async()=>{
  try{ if(document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { $('#full').title='Layar penuh belum tersedia di perangkat ini'; }
};
document.addEventListener('keydown',e=>{
  if($('#refDialog').open || /^(BUTTON|INPUT|TEXTAREA|SUMMARY)$/.test(e.target.tagName))return;
  if(e.key==='ArrowLeft'){ e.preventDefault();stepBy(-1); }
  if(e.key==='ArrowRight'){ e.preventDefault();stepBy(1); }
  if(e.key==='Escape'&&(tagSelected||routeSelected))resetSelection();
});

let renderer, scene, controls, camera, motion, model, sun, pmrem, skyTex;
let world, base, routeRoot, section, efbMesh, polyMesh, rackMesh, fxRoot;
let sourceNodes=[],allPicks=[],labelNodes=[],routeMeshes=new Map();
const ndc=new THREE.Vector2();
const pointer=new THREE.Raycaster();
const segmentGeometry=new THREE.CylinderGeometry(1,1,1,7);
const palette=new Map();
const origin=new THREE.Vector3(0,1,0);
const FLOW={time:{value:0}};
const HL_FROM=new THREE.Color('#47B3D1'), HL_TO=new THREE.Color('#ffae2b');
function material(hex, opacity=1, emissive=false) {
  const k=JSON.stringify([hex,opacity,emissive]);
  if(!palette.has(k)){
    const m=emissive?new THREE.MeshBasicMaterial({color:hex}):new THREE.MeshStandardMaterial({color:hex,roughness:.62,metalness:.04});
    if(opacity<1){m.transparent=true;m.opacity=opacity;m.depthWrite=false;}
    palette.set(k,m);
  }
  return palette.get(k);
}
function joint(a,b,r,m) {
  const d=new THREE.Vector3().subVectors(b,a);
  const mesh=new THREE.Mesh(segmentGeometry,m);
  mesh.position.copy(a).addScaledVector(d,.5);
  mesh.scale.set(r,d.length(),r);
  mesh.quaternion.setFromUnitVectors(origin,d.normalize());
  return mesh;
}
const geometries=new Map();
function partGeometry(x) {
  if(geometries.has(x.t))return geometries.get(x.t);
  let g;
  if(x.t==='box')g=new THREE.BoxGeometry(1,1,1);
  if(x.t==='cyl')g=new THREE.CylinderGeometry(.5,.5,1,40);
  if(x.t==='sphere')g=new THREE.SphereGeometry(.5,28,18);
  geometries.set(x.t,g);
  return g;
}
function solidPart(x) {
  const mesh=new THREE.Mesh(partGeometry(x),material(x.c,x.opacity||1));
  mesh.position.copy(B(x.p));
  mesh.scale.set(...(x.t==='cyl'?[x.s[0],x.s[1],x.s[0]]:[x.s[0],x.s[2],x.s[1]]));
  if(x.rotate) {
    const [rx,ry,rz]=x.rotate.map(v=>THREE.MathUtils.degToRad(v));
    mesh.rotation.set(rx,rz,-ry);
  }
  mesh.castShadow=!(x.opacity<1); mesh.receiveShadow=true;
  return mesh;
}
function addDetails(items, root, instancing=false) {
  const reps=new Map();
  for(const x of items){
    if(instancing && x.t==='box') {
      const k=x.tag+' '+x.c; if(!reps.has(k))reps.set(k,[]);reps.get(k).push(x);continue;
    }
    const tag=x.tag;
    if(x.t==='line'){
      // garis detail kini berupa tabung halus bertikungan, bukan potongan silinder
      const g=tubeGeometry(samplePath(curveFrom(x.p.map(B),'ortho',x.s[0]/2)),x.s[0]/2,softwareRenderer?6:12);
      if(!g)continue;
      const m=new THREE.Mesh(g,material(x.c,x.opacity||1));m.castShadow=true;m.receiveShadow=true;
      m.userData={grp:tag};root.add(m);allPicks.push(m);
    }else{
      const m=solidPart(x);m.userData={grp:tag};root.add(m);allPicks.push(m);
      if(x.opacity && x.opacity<1)m.renderOrder=2;
    }
  }
  for(const list of reps.values()){
    const m=new THREE.InstancedMesh(partGeometry(list[0]),material(list[0].c),list.length);
    for(const [i,x] of list.entries()) { const p=solidPart(x);p.updateMatrix();m.setMatrixAt(i,p.matrix); }
    m.castShadow=true;m.receiveShadow=true;
    m.userData={grp:list[0].tag};root.add(m);allPicks.push(m);
  }
}

// ------------------------------------------------------------------ jalur pipa halus (tikungan long-radius)
function curveFrom(P, mode, rad) {
  const Q=[P[0].clone()];
  for(const p of P.slice(1)) if(p.distanceTo(Q.at(-1))>0.02) Q.push(p.clone());
  if(Q.length<2) return null;
  const path=new THREE.CurvePath();
  let cur=Q[0];
  for(let i=1;i<Q.length-1;i++){
    const a=Q[i-1], b=Q[i], c=Q[i+1];
    const d0=b.clone().sub(a), d1=c.clone().sub(b); const L0=d0.length(), L1=d1.length(); d0.normalize(); d1.normalize();
    const th=Math.acos(THREE.MathUtils.clamp(d0.dot(d1),-1,1));
    if(th<.02) continue;
    const R=Math.max(rad*2.6,.08);   // elbow long-radius ±1,5 × OD, sama dengan geometri pipa model
    const t=Math.min(R*Math.tan(th/2), .45*Math.min(L0,L1), .48*cur.distanceTo(b)+.0001);
    const A=b.clone().addScaledVector(d0,-t), C=b.clone().addScaledVector(d1,t);
    if(A.distanceTo(cur)>1e-3) path.add(new THREE.LineCurve3(cur.clone(),A));
    path.add(new THREE.QuadraticBezierCurve3(A,b.clone(),C));
    cur=C;
  }
  path.add(new THREE.LineCurve3(cur.clone(),Q.at(-1).clone()));
  return path;
}
function samplePath(c) {
  if(!c) return null;
  const out=[];
  const push=(p)=>{ if(!out.length||out.at(-1).distanceTo(p)>1e-4) out.push(p); };
  if(c.isCurvePath){
    for(const s of c.curves){
      if(s.isLineCurve3){ push(s.v1.clone()); push(s.v2.clone()); }
      else for(let k=0;k<=14;k++) push(s.getPoint(k/14));
    }
  } else {
    const n=Math.min(400,Math.max(24,Math.ceil(c.getLength()/.4)));
    for(let k=0;k<=n;k++) push(c.getPoint(k/n));
  }
  return out;
}
// tabung tersapu dengan frame parallel-transport; uv.x = jarak sepanjang jalur (meter) untuk animasi aliran
function tubeGeometry(P, r, radial=14, caps=true) {
  if(!P||P.length<2) return null;
  const n=P.length, pos=[], nor=[], uv=[], idx=[];
  const T=[], N=[], S=[0];
  for(let i=0;i<n;i++){
    const t=(i===0?P[1].clone().sub(P[0]):i===n-1?P[n-1].clone().sub(P[n-2]):P[i+1].clone().sub(P[i]).normalize().add(P[i].clone().sub(P[i-1]).normalize())).normalize();
    T.push(t); if(i) S.push(S[i-1]+P[i].distanceTo(P[i-1]));
  }
  let nv=Math.abs(T[0].y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0);
  nv.sub(T[0].clone().multiplyScalar(nv.dot(T[0]))).normalize();
  for(let i=0;i<n;i++){
    nv.sub(T[i].clone().multiplyScalar(nv.dot(T[i])));
    if(nv.lengthSq()<1e-8) nv=new THREE.Vector3(1,0,0).sub(T[i].clone().multiplyScalar(T[i].x));
    nv.normalize(); N.push(nv.clone());
  }
  for(let i=0;i<n;i++){
    const bn=new THREE.Vector3().crossVectors(T[i],N[i]);
    for(let k=0;k<=radial;k++){
      const a=k/radial*Math.PI*2, cs=Math.cos(a), sn=Math.sin(a);
      const d=N[i].clone().multiplyScalar(cs).addScaledVector(bn,sn);
      pos.push(P[i].x+d.x*r,P[i].y+d.y*r,P[i].z+d.z*r); nor.push(d.x,d.y,d.z); uv.push(S[i],k/radial);
    }
  }
  const row=radial+1;
  for(let i=0;i<n-1;i++) for(let k=0;k<radial;k++){
    const a=i*row+k,b=(i+1)*row+k,c=(i+1)*row+k+1,d=i*row+k+1; idx.push(a,b,d,b,c,d);
  }
  if(caps) for(const [i,sg] of [[0,-1],[n-1,1]]){
    const c0=pos.length/3; pos.push(P[i].x,P[i].y,P[i].z); nor.push(T[i].x*sg,T[i].y*sg,T[i].z*sg); uv.push(S[i],.5);
    const bn=new THREE.Vector3().crossVectors(T[i],N[i]);
    for(let k=0;k<=radial;k++){
      const a=k/radial*Math.PI*2, d=N[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(bn,Math.sin(a));
      pos.push(P[i].x+d.x*r,P[i].y+d.y*r,P[i].z+d.z*r); nor.push(T[i].x*sg,T[i].y*sg,T[i].z*sg); uv.push(S[i],k/radial);
    }
    for(let k=0;k<radial;k++) sg>0?idx.push(c0,c0+1+k,c0+2+k):idx.push(c0,c0+2+k,c0+1+k);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx); g.computeBoundingSphere(); g.computeBoundingBox();
  g.userData.length=S[n-1];
  return g;
}

// ------------------------------------------------------------------ material aliran (kilau bergerak searah aliran)
const FLOW_VS=`varying vec2 vUv; varying vec3 vN; varying vec3 vV;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=-mv.xyz; gl_Position=projectionMatrix*mv;
#include <logdepthbuf_vertex>
}`;
const FLOW_FS=`uniform float uTime,uSpeed,uSpace,uSel,uHover,uDim,uShot,uLen,uDash; uniform vec3 uColor;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
#include <common>
#include <logdepthbuf_pars_fragment>
void main(){
  #include <logdepthbuf_fragment>
  if(uDash>0.5 && fract((vUv.x-uTime*uSpeed*0.5)/1.6)<0.38) discard;   // angkut padatan (tidak dipipakan): garis putus bergerak
  vec3 n=normalize(vN), v=normalize(vV);
  float lam=0.48+0.52*max(dot(n,normalize(vec3(0.35,0.85,0.42))),0.0);
  float spec=pow(max(dot(reflect(-normalize(vec3(0.35,0.85,0.42)),n),v),0.0),24.0)*0.35;
  float ph=fract((vUv.x-uTime*uSpeed)/uSpace);
  float comet=pow(ph,5.0)*(1.0-smoothstep(0.9,1.0,ph));
  float rim=pow(1.0-abs(dot(n,v)),2.4);
  vec3 col=uColor*lam*(0.62+0.2*uSel)+vec3(spec)+uColor*comet*(0.45+1.35*uSel)+vec3(1.0)*comet*0.28*uSel+uColor*rim*(0.22+0.5*uSel+0.7*uHover);
  if(uShot>-0.5){ float s=uShot*uLen; float d=vUv.x-s; float head=exp(-d*d/(2.0*0.8*0.8)); float tail=d<0.0?exp(d/6.0):0.0;
    col+=vec3(1.0,0.97,0.86)*head*2.6+uColor*tail*1.4; }
  gl_FragColor=vec4(col,uDim);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const GLOW_FS=`uniform float uTime; uniform vec3 uColor; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
#include <common>
#include <logdepthbuf_pars_fragment>
void main(){
  #include <logdepthbuf_fragment>
  vec3 n=normalize(vN), v=normalize(vV); float rim=pow(1.0-abs(dot(n,v)),1.5); float p=0.72+0.28*sin(uTime*4.2);
  gl_FragColor=vec4(uColor*(0.35+rim)*p*1.15, (0.18+rim*0.8)*p);
  #include <colorspace_fragment>
}`;
const PICK_MAT=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false});
function flowMat(color, speed, space) {
  return new THREE.ShaderMaterial({
    uniforms:{uTime:FLOW.time,uColor:{value:new THREE.Color(color)},uSpeed:{value:speed},uSpace:{value:space},uSel:{value:0},
      uHover:{value:0},uDim:{value:1},uShot:{value:-1},uLen:{value:1},uDash:{value:0}},
    vertexShader:FLOW_VS,fragmentShader:FLOW_FS,transparent:true,depthWrite:true});
}
function glowMat(color) {
  return new THREE.ShaderMaterial({uniforms:{uTime:FLOW.time,uColor:{value:new THREE.Color(color)}},vertexShader:FLOW_VS,fragmentShader:GLOW_FS,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
}
function routeColor(key) {
  const r=routes[key];
  return r.subcolor || (active.has('wild') && r.groups.includes('wild') && !active.has(r.group) ? groups.wild.color : groups[r.group].color);
}
function routeRadius(r) { return r.piped===false ? .16 : Math.max(.03, (r.r||.03)*1.12+.012); }   // menyelubungi pipa: Ø dari neraca (OD + isolasi)
function createRoute(key) {
  const r=routes[key], set=new THREE.Group();
  const col=routeColor(key), rad=routeRadius(r);
  const q=Math.max(1,r.value||5);
  const speed=1.1+0.8*Math.log10(q), space=Math.max(2.2,4.2-0.6*Math.log10(q));
  set.userData={route:key,mats:[],glows:[],len:0,paths:[]};
  for (const points of r.pts) {
    const P=samplePath(curveFrom(points.map(B), 'ortho', rad));
    const g=tubeGeometry(P, rad, softwareRenderer?6:16);
    if(!g) continue;
    const m=softwareRenderer?material(col,1,true):flowMat(col,speed,space);
    const tube=new THREE.Mesh(g,m); tube.userData={route:key}; tube.renderOrder=3;
    set.add(tube);
    if(!softwareRenderer&&r.piped===false) m.uniforms.uDash.value=1;
    // selubung pilih tak terlihat agar pipa kecil (DN25) tetap mudah diklik dari jauh
    if(!softwareRenderer){ const pg=tubeGeometry(P, Math.max(.28,rad*2.6), 6, false);
    const proxy=new THREE.Mesh(pg,PICK_MAT); proxy.userData={route:key}; set.add(proxy); allPicks.push(proxy); }
    if(!softwareRenderer){
      m.uniforms.uLen.value=g.userData.length; set.userData.mats.push(m);
      const gl=new THREE.Mesh(tubeGeometry(P, rad*2.3, 14, false), glowMat(col)); gl.visible=false; gl.renderOrder=4; gl.raycast=()=>{};
      set.add(gl); set.userData.glows.push(gl);
    }
    set.userData.paths.push(P); set.userData.len=Math.max(set.userData.len,g.userData.length);
  }
  routeRoot.add(set);
  routeMeshes.set(key,set);
  return set;
}

// ------------------------------------------------------------------ penanda asal/tujuan (riak berdenyut)
let markers=null;
const ringGeo=new THREE.RingGeometry(.78,1,48), dotGeo=new THREE.SphereGeometry(1,24,16), headGeo=new THREE.ConeGeometry(1,2.2,24);
function makeMarker(p, color, dir) {
  const g=new THREE.Group(); g.position.copy(p);
  const core=new THREE.Mesh(dotGeo,new THREE.MeshBasicMaterial({color,toneMapped:false})); core.scale.setScalar(.42); g.add(core);
  const rings=[0,1].map(i=>{ const m=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
    m.userData.phase=i*.5; g.add(m); return m; });
  if(dir){ const h=new THREE.Mesh(headGeo,new THREE.MeshBasicMaterial({color,toneMapped:false})); h.scale.setScalar(.34);
    h.quaternion.setFromUnitVectors(origin,dir); h.position.copy(dir.clone().multiplyScalar(-.55)); g.add(h); }
  g.userData.rings=rings; g.renderOrder=6; g.traverse(o=>{o.renderOrder=6; o.raycast=()=>{};});
  return g;
}
function clearMarkers(){ if(markers){ fxRoot.remove(markers); markers=null; } }
function setMarkers(key){
  clearMarkers(); if(!key) return;
  const set=routeMeshes.get(key); if(!set||!set.userData.paths.length) return;
  const P0=set.userData.paths[0], P1=set.userData.paths.at(-1);
  const a=P0[0], b=P1.at(-1), d=b.clone().sub(P1.at(-2)||P1[0]).normalize();
  markers=new THREE.Group(); markers.add(makeMarker(a,HL_FROM), makeMarker(b,HL_TO,d)); fxRoot.add(markers);
}
function frameRoute(key){
  if(!viewReady||!routes[key]) return;
  const box=new THREE.Box3(); for(const pts of routes[key].pts) for(const p of pts) box.expandByPoint(B(p));
  const c=box.getCenter(new THREE.Vector3()), size=Math.max(6,box.getSize(new THREE.Vector3()).length());
  const dir=camera.position.clone().sub(controls.target).normalize();
  if(cameraMode==='top') dir.set(0,1,.045).normalize(); else if(dir.y<.42){dir.y=.62;dir.normalize();}
  const dist=Math.min(900,Math.max(28,size*.5/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*1.18/Math.min(1,camera.aspect*.9)));
  motion={from:camera.position.clone(),to:c.clone().addScaledVector(dir,dist),at:controls.target.clone(),target:c,start:performance.now(),duration:reducedMotion?0:900};
  if(!motion.duration){camera.position.copy(motion.to);controls.target.copy(c);controls.update();motion=null;}
}

const dimMats=new Map();
function dimMat(original,grade) {
  // grade < 1: transparan (fokus area, seperti v6); grade 'mute': pudar tetapi tetap padat (fokus aliran) agar tidak berkabut
  if(!dimMats.has(original.uuid))dimMats.set(original.uuid,new Map());
  const cache=dimMats.get(original.uuid);
  if(!cache.has(grade)){
    const m=original.clone();
    if(grade==='mute'){ if(m.color)m.color.lerp(new THREE.Color('#d3dadd'),.58); if(m.map)m.map=m.map; if('envMapIntensity' in m)m.envMapIntensity=.5; }
    else { if(m.color)m.color.lerp(new THREE.Color('#d0dadc'),.45); m.transparent=true; m.opacity=Math.min(.55,grade*1.6); m.depthWrite=false; }
    cache.set(grade,m);
  }
  return cache.get(grade);
}
const hlMats=new Map(), hlList=[];
function hlMat(original,color) {
  const k=original.uuid+color.getHexString();
  if(!hlMats.has(k)){
    const m=original.clone();
    if('emissive' in m){ m.emissive=color.clone(); m.emissiveIntensity=.35; m.userData.hl=true; hlList.push(m); }
    hlMats.set(k,m);
  }
  return hlMats.get(k);
}
function nodeArea(o) {
  const value=Number((o.userData.area||'').match(/Area (\d+)/)?.[1]||0);
  return areaTags[o.userData.grp]||value;
}
function visibleForPick(o) {
  let p=o;
  while(p){ if(!p.visible)return false;p=p.parent; }
  return true;
}
const grpMatch=(grp,tags)=>tags.some(t=>grp===t||(grp&&grp.startsWith(t)&&/^[A-Z]?$/.test(grp.slice(t.length))));

function updateScene() {
  if(!viewReady)return;
  if(renderer&&renderer.shadowMap)renderer.shadowMap.needsUpdate=true;
  if(softwareRenderer)renderer.dirty=true;
  const isSection=current.id==='section';
  const isPoly=current.id==='poly'&&openRoof;
  const isRack=current.id==='rack'&&rackOnly;
  world.visible=!isSection;
  section.visible=isSection;
  polyMesh.visible=isPoly;
  rackMesh.visible=isRack;
  if(softwareRenderer) scene.background.set(isSection?'#E4EDF6':'#D9E6F2');
  else scene.background=isSection?new THREE.Color('#E4EDF6'):skyTex;
  const focusArea=current.area;
  // titik asal & tujuan aliran terpilih / alat terpilih
  const rs=routeSelected?routes[routeSelected]:null;
  const fromTags=rs?endpointTags(rs.dari):[], toTags=rs?endpointTags(rs.ke):[];
  const tagRoutes=new Set();
  if(tagSelected) for(const dir of ['ke','dari']) for(const [k] of connected(tagSelected,dir)) tagRoutes.add(k);
  for(const o of sourceNodes){
    const u=o.userData;
    const n=nodeArea(o);
    const name=(o.name||'').toLowerCase();
    const scope=focusArea===300?[300,400]:current.id==='rack'?[500,600]:[focusArea];
    o.visible=u.grp!=='EFB-101'&&!(isPoly&&(
      (u.grp==='GEDUNG-700'&&!name.includes('__beton'))||u.grp==='TK-704'));
    const keepRack=isRack&&(/rack/.test(name)||/rack/i.test(u.grp||'')||['R-504','B-601','D-604'].includes(u.grp));
    let dim=0;
    if(n&&focusArea&&!scope.includes(n)&&!keepRack) dim=.28;
    if(isRack&&n&&!keepRack)dim=.14;
    if(tagSelected===u.grp)dim=0;
    let mat=o.userData.originalMaterial;
    if(rs&&u.kind!=='site'){
      if(grpMatch(u.grp,fromTags)) {mat=hlMat(mat,HL_FROM);dim=0;}
      else if(grpMatch(u.grp,toTags)) {mat=hlMat(mat,HL_TO);dim=0;}
      else if(!dim) dim='mute';
    } else if(tagSelected&&u.grp===tagSelected) mat=hlMat(mat,HL_FROM);
    o.material=dim ? dimMat(o.userData.originalMaterial,dim) : mat;
    const ghost=dim&&dim!=='mute';
    o.renderOrder=ghost?1:0;
    o.castShadow=!ghost&&!o.userData.noShadow;
    o.userData.pickable=!ghost||focusArea===0;
  }
  for(const [key,r] of Object.entries(routes)){
    const on=!isSection&&(routeSelected===key||tagRoutes.has(key)||r.groups.some(g=>active.has(g)));
    const linked=focusArea===300?r.areas.some(a=>[300,400].includes(a)):r.areas.includes(focusArea);
    const preview=(!focusArea || linked || r.kind==='Alur skematik v6' || current.id==='rack' || tagRoutes.has(key) ||
      (['biogas','panas'].includes(r.group)&&active.has(r.group)));
    let mesh=routeMeshes.get(key);
    if(on&&(preview||routeSelected===key)&&!mesh)mesh=createRoute(key);
    if(mesh){
      mesh.visible=on&&(preview||routeSelected===key);
      if(mesh.visible){
        const col=new THREE.Color(routeColor(key));
        const sel=routeSelected===key?1:tagRoutes.has(key)?.55:0;
        const dimR=routeSelected&&routeSelected!==key?.22:1;
        if(softwareRenderer){ for(const c of mesh.children)c.material=material('#'+col.getHexString(),1,true); }
        for(const m of mesh.userData.mats){ m.uniforms.uColor.value.copy(col); m.uniforms.uSel.value=sel; m.uniforms.uDim.value=dimR;
          m.uniforms.uHover.value=hoverRoute===key?1:0; m.depthWrite=dimR>=1; m.uniforms.uShot.value=-1; }
        for(const g of mesh.userData.glows){ g.visible=sel>=.5; g.material.uniforms.uColor.value.copy(col); }
      }
    }
  }
  setMarkers(rs?routeSelected:null);
  refreshLabels();
}
function label(text,point,click,selected=false,cls='') {
  const b=button(text,'annotation'+(cls?' '+cls:''),click);
  b.classList.toggle('selected',selected);
  $('#labels').append(b);
  labelNodes.push({b,point:point.isVector3?point:B(point),pin:!!cls});
}
function refreshLabels() {
  $('#labels').replaceChildren();labelNodes=[];
  if(current.id==='section'){
    for(const [n,p] of design.section_labels)label(n,p,()=>selectEquipment('EFB-101'));
    return;
  }
  if(routeSelected){
    const set=routeMeshes.get(routeSelected), r=routes[routeSelected];
    if(set&&set.userData.paths.length){
      const a=set.userData.paths[0][0].clone().add(new THREE.Vector3(0,.9,0)), b=set.userData.paths.at(-1).at(-1).clone().add(new THREE.Vector3(0,.9,0));
      const s=endpointTags(r.dari)[0], d=endpointTags(r.ke)[0];
      label('DARI · '+r.dari,a,()=>s&&selectEquipment(s),false,'from');
      label('KE · '+r.ke,b,()=>d&&selectEquipment(d),false,'to');
    }
    return;
  }
  if(tagSelected && about(tagSelected).pos){
    label(tagSelected,about(tagSelected).pos,()=>selectEquipment(tagSelected),true);
  }
  if(current.id==='site'){
    for(const [n,p,target] of design.overview_labels)label(n,p,()=>selectPlace(target));
    return;
  }
  if(current.id==='efb'){
    label('Zona A',equipment['EFB-A'].pos,()=>selectEquipment('EFB-A'));
    label('Zona B',equipment['EFB-B'].pos,()=>selectEquipment('EFB-B'));
  }
  if(current.id==='poly'&&openRoof){
    for(const t of ['X-701','F-702','EV-703','E-703C','TK-703R','TK-704'])
      if(t!==tagSelected)label(t,equipment[t].pos,()=>selectEquipment(t));
  }
  if(current.id==='rack'){
    for(const t of ['R-504','B-601','D-604'])if(t!==tagSelected)label(t,equipment[t].pos,()=>selectEquipment(t));
  }
}
let labelCameraTick=0;
function updateLabels() {
  if(!viewReady)return;
  const w=renderer.domElement.clientWidth,h=renderer.domElement.clientHeight;
  if(!w||!h)return;
  if(++labelCameraTick%12===0&&!routeSelected&&current.id!=='site'&&current.id!=='section'&&!(current.id==='poly'&&openRoof)){
    const stale=labelNodes.filter(a=>a.extra);
    for(const a of stale)a.b.remove();
    labelNodes=labelNodes.filter(a=>!a.extra);
    if(!tagSelected&&camera.position.distanceTo(controls.target)<64){
      const candidates=Object.entries(equipment)
        .filter(([t,row])=>row.pos && (row.where===current.id || (current.id==='ssf'&&row.area===400)))
        .sort(([,a],[,b])=>B(a.pos).distanceTo(controls.target)-B(b.pos).distanceTo(controls.target)).slice(0,5);
      for(const [t,r] of candidates){
        if(labelNodes.some(a=>a.b.textContent===t))continue;
        label(t,r.pos,()=>selectEquipment(t));labelNodes.at(-1).extra=true;
      }
    }
  }
  const bounds=[];
  for(const v of [...labelNodes].sort((a,b)=>b.pin-a.pin)){
    const p=v.point.clone().project(camera);
    const x=(1+p.x)*w/2, y=(1-p.y)*h/2;
    const width=Math.min(190,v.b.textContent.length*7+12);
    const box=[x-width/2,y-24,x+width/2,y];
    const collides=!v.pin&&bounds.some(q=>box[0]<q[2]+5&&box[2]+5>q[0]&&box[1]<q[3]+4&&box[3]+4>q[1]);
    const show=p.z>=-1&&p.z<=1&&x>14&&x<w-14&&y>(v.pin?40:73)&&y<h-(v.pin?20:47)&&!collides;
    v.b.style.visibility=show?'visible':'hidden';
    if(show){v.b.style.left=x+'px';v.b.style.top=y+'px';bounds.push(box);}
  }
}
function targetCamera() {
  const t=B(current.focus), p=B(current.pos);
  if(current.id==='poly'&&!openRoof) { p.add(new THREE.Vector3(3,4,3)); }
  if(current.id==='rack'&&rackOnly) {p.copy(B([95,3,45]));}
  const aspect=Math.max(.32,camera.aspect);
  const origin= p.clone().sub(t);
  if(cameraMode==='top'){
    p.copy(t).add(new THREE.Vector3(0,(current.id==='site'?470:origin.length()*1.23)*Math.max(1,1.05/aspect),.045));
  } else {
    const mult=current.id==='site'? Math.max(1,1.13/aspect) : Math.max(1,.77/aspect);
    p.copy(t).addScaledVector(origin,mult);
  }
  return {p,t};
}
function moveCamera(now=false) {
  if(!viewReady)return;
  const {p,t}=targetCamera();
  motion={from:camera.position.clone(),to:p,at:controls.target.clone(),target:t,start:performance.now(),
    duration: now||reducedMotion?0:650};
  if(!motion.duration){camera.position.copy(p); controls.target.copy(t);controls.update();motion=null;}
}
function updateFallback() {
  if(viewReady)return;
  const key=cameraMode==='top'&&current.id==='site'?'top':current.id==='poly'&&!openRoof?'poly_closed':current.id==='rack'&&rackOnly?'rack_detail':current.id;
  const img=$('#fallbackImage');
  const ref=$('#embedded-fallback-'+key)||$('#embedded-fallback-site');
  img.src=ref?'data:image/jpeg;base64,'+ref.textContent.trim():'fallback/'+ key + '.jpg';
  img.onerror=()=>{img.onerror=null;img.src=offline?'data:image/jpeg;base64,'+$('#embedded-fallback-site').textContent.trim():'fallback/site.jpg';};
}
function bindCamera() {
  const viewport=$('#viewport');
  new ResizeObserver(()=>{
    const w=viewport.clientWidth,h=viewport.clientHeight;
    if(!w||!h)return;
    renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();
  }).observe(viewport);
  controls.addEventListener('start',()=>{motion=null;});
  let down=null, lastCheck=0;
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];$('#tooltip').hidden=true;});
  function pick(e){
    const r=canvas.getBoundingClientRect();
    ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
    pointer.setFromCamera(ndc,camera);
    pointer.params.Line={threshold:.2};
    const hits=pointer.intersectObjects(allPicks.filter(o=>visibleForPick(o)&&o.userData.pickable!==false),false);
    // utamakan pipa aliran bila tertembak dalam jarak dekat dengan objek pertama
    const rt=hits.find(h=>h.object.userData.route);
    if(rt&&(!hits[0]||rt.distance-hits[0].distance<2.5)) return rt.object.userData;
    return hits[0]?.object?.userData;
  }
  canvas.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5){down=null;return;}
    down=null;
    const hit=pick(e);
    if(hit?.route)selectRoute(hit.route);
    else if(hit?.grp)selectEquipment(hit.grp);
  });
  canvas.addEventListener('pointerleave',()=>{$('#tooltip').hidden=true;setHover(null);});
  canvas.addEventListener('pointermove',e=>{
    if(down||performance.now()-lastCheck<80)return;
    lastCheck=performance.now();
    const hit=pick(e), tip=$('#tooltip');
    if(!hit?.route){tip.hidden=true;setHover(null);canvas.style.cursor='';return;}
    setHover(hit.route); canvas.style.cursor='pointer';
    const r=routes[hit.route], rect=canvas.getBoundingClientRect();
    tip.innerHTML='';
    tip.append(el('b',r.id+' · '+r.dari+' → '+r.ke),el('div',routeValue(r)+(energyTxt(r)?' · '+energyTxt(r):'')),el('div',sizeLine(r)||''),el('small','klik untuk menelusuri'));
    tip.style.left=Math.max(7,Math.min(rect.width-225,e.clientX-rect.left+11))+'px';
    tip.style.top=Math.max(70,Math.min(rect.height-45,e.clientY-rect.top+12))+'px';
    tip.hidden=false;
  });
}
function setHover(key){
  if(hoverRoute===key)return;
  for(const k of [hoverRoute,key]){ const m=routeMeshes.get(k); if(m) for(const x of m.userData.mats) x.uniforms.uHover.value=k===key?1:0; }
  hoverRoute=key; if(softwareRenderer&&renderer)renderer.dirty=true;
}
const clock=new THREE.Clock();
let paused=false;
addEventListener('message',e=>{const d=e.data||{};if(d.cr==='pause')paused=!!d.v;else if(d.cr==='place'&&placeById[d.id])selectPlace(d.id);else if(d.cr==='tag'&&viewReady){const t=Object.keys(design.equipment).find(k=>k===d.id||k===d.id+'A');if(t){selectPlace(about(t).where||'site');selectEquipment(t);}}else if(d.cr==='route'&&viewReady){const k=Object.keys(routes).find(k=>routes[k].id===d.id);if(k)selectRoute(k);}else if(d.cr==='tour')$('#tour').click();});
document.addEventListener('visibilitychange',()=>{});
function animate(t) {
  requestAnimationFrame(animate);
  if(paused||document.hidden){clock.getDelta();return;}
  const dt=Math.min(.05,clock.getDelta());
  FLOW.time.value+=dt;
  if(motion){
    const p=Math.min(1,(t-motion.start)/motion.duration);
    const f=p*p*(3-2*p);
    camera.position.lerpVectors(motion.from,motion.to,f);
    controls.target.lerpVectors(motion.at,motion.target,f);
    if(p>=1)motion=null;
  }
  // denyut sorotan alat asal/tujuan
  const pulse=.22+.22*(.5+.5*Math.sin(FLOW.time.value*4.0));
  for(const m of hlList) m.emissiveIntensity=pulse;
  // cahaya tunggal berjalan dari asal ke tujuan pada aliran terpilih
  if(routeSelected&&!softwareRenderer){
    const set=routeMeshes.get(routeSelected);
    if(set&&set.visible){
      const L=Math.max(1,set.userData.len), dur=Math.min(5.5,Math.max(1.8,L/9))*1000, gap=700;
      const k=((performance.now()-shotStart)%(dur+gap))/dur;
      for(const m of set.userData.mats){ m.uniforms.uShot.value=k<=1?k*(L/m.uniforms.uLen.value):-1; }
    }
  }
  if(markers){
    for(const g of markers.children){
      for(const r of g.userData.rings){
        const ph=(FLOW.time.value*.65+r.userData.phase)%1;
        r.scale.setScalar(.7+ph*2.4); r.material.opacity=(1-ph)*.85; r.quaternion.copy(camera.quaternion);
      }
      const d=camera.position.distanceTo(g.position); g.scale.setScalar(Math.max(1,d/38));
    }
  }
  controls.update();
  renderer.render(scene,camera);
  updateLabels();
}
async function modelBuffer() {
  const mem=$('#embedded-model');
  if(mem) {
    const raw=atob(mem.textContent.trim());
    const binary=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)binary[i]=raw.charCodeAt(i);
    // versi luring ringan: GLB tertanam dalam bentuk gzip (didekompresi oleh browser)
    if(mem.dataset.gz) return new Response(new Blob([binary]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    return Promise.resolve(binary.buffer);
  }
  if('DecompressionStream' in window){
    try{
      const r=await fetch('data/model.glb.gz');
      if(r.ok){
        const total=Number(r.headers.get('content-length'))||6400000, read=r.body.getReader(); let n=0;
        const counted=new ReadableStream({async pull(c){const {done,value}=await read.read(); if(done){c.close();return;} n+=value.length; $('#progress').value=Math.min(95,n/total*100); c.enqueue(value);}});
        const head=new Uint8Array(await new Response(counted).arrayBuffer());
        if(head[0]===0x1f&&head[1]===0x8b) return await new Response(new Blob([head]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
        if(head[0]===0x67&&head[1]===0x6c) return head.buffer;   // server sudah mendekompresi
      }
    }catch(e){console.warn('GLB gzip gagal, memakai .glb',e);}
  }
  return fetch('data/model.glb').then(async r=>{
    if(!r.ok)throw Error('GLB tidak dapat diakses');
    const total=Number(r.headers.get('content-length'))||0;
    if(!r.body||!total)return r.arrayBuffer();
    const read=r.body.getReader();const out=new Uint8Array(total);
    let n=0;
    for(;;){
      const {done,value}=await read.read();
      if(done)break;
      if(n+value.length>total)throw Error('Ukuran data GLB tidak cocok');
      out.set(value,n);n+=value.length;
      $('#progress').value=Math.min(95,n/total*100);
    }
    return out.buffer;
  });
}
// ------------------------------------------------------------------ langit prosedural (HDR) untuk latar & pencahayaan lingkungan
const SUN_DIR=new THREE.Vector3(-.52,.62,.58).normalize();
function vnoise(x,y,seed){ const h=(i,j)=>{const n=Math.sin(i*127.1+j*311.7+seed*74.7)*43758.5453;return n-Math.floor(n);};
  const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  return h(i,j)*(1-u)*(1-v)+h(i+1,j)*u*(1-v)+h(i,j+1)*(1-u)*v+h(i+1,j+1)*u*v; }
function makeSky(W=768,H=384){
  const d=new Uint16Array(W*H*4), sd=SUN_DIR, f16=THREE.DataUtils.toHalfFloat;
  for(let j=0;j<H;j++){
    const th=((j+.5)/H-.5)*Math.PI, sy=Math.sin(th), cy=Math.cos(th);
    for(let i=0;i<W;i++){
      const ph=((i+.5)/W-.5)*2*Math.PI, dx=cy*Math.cos(ph), dz=cy*Math.sin(ph), dy=sy;
      let r,g,b;
      if(dy>=0){ const t=Math.pow(1-dy,4); r=.20+.62*t; g=.40+.48*t; b=.80+.16*t;
        const px=dx/(dy+.12)*1.6, pz=dz/(dy+.12)*1.6; let n=0,a=.5,f=1;
        for(let o=0;o<4;o++){n+=a*vnoise(px*f+11,pz*f+7,o);a*=.5;f*=2.1;}
        const c=Math.max(0,Math.min(1,(n-.55)*3))*Math.min(1,dy*6); r=r*(1-c)+.96*c; g=g*(1-c)+.97*c; b=b*(1-c)+.99*c;
      } else { const t=Math.min(1,-dy*4); r=.58-.22*t; g=.60-.2*t; b=.57-.22*t; }
      const ca=dx*sd.x+dy*sd.y+dz*sd.z;
      const s=ca>.99995?40:Math.pow(Math.max(0,ca),900)*6+Math.pow(Math.max(0,ca),10)*.3;
      const k=(j*W+i)*4, E=1.15; d[k]=f16((r+s)*E); d[k+1]=f16((g+s*.95)*E); d[k+2]=f16((b+s*.85)*E); d[k+3]=f16(1);
    }
  }
  const tex=new THREE.DataTexture(d,W,H,THREE.RGBAFormat,THREE.HalfFloatType);
  tex.mapping=THREE.EquirectangularReflectionMapping; tex.magFilter=tex.minFilter=THREE.LinearFilter; tex.generateMipmaps=false; tex.needsUpdate=true;
  return tex;
}
function fixMaterial(o){
  const m=o.material, n=(m.name||'').toLowerCase(), on=(o.name||'').toLowerCase();
  if(m.map){ m.map.anisotropy=8; }
  if(/grating/.test(n)){ m.alphaTest=.5; m.transparent=false; m.side=THREE.DoubleSide; }
  if(/air_waduk|air_saluran|permukaan_air/.test(n)){ m.roughness=.14; m.metalness=0; m.envMapIntensity=.9; o.userData.noShadow=true; }
  if(/plume|glow|kaca|fx_/.test(n+' '+on)) o.userData.noShadow=true;
  if(m.transparent&&m.opacity<.6) o.userData.noShadow=true;
  if('envMapIntensity' in m && !/air_/.test(n)) m.envMapIntensity=.62;
}
async function initialise() {
  try {
    renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',logarithmicDepthBuffer:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=.92;
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate=false; renderer.shadowMap.needsUpdate=true;
  } catch {
    softwareRenderer=true;
    renderer=new CanvasSceneRenderer();
  }
  $('#viewport').prepend(renderer.domElement);
  const w=$('#viewport').clientWidth,h=$('#viewport').clientHeight;
  camera=new THREE.PerspectiveCamera(39,w/h,.3,4200);
  renderer.setSize(w,h,false);
  camera.position.copy(B(current.pos));
  controls=new OrbitControls(camera,renderer.domElement);
  controls.target.copy(B(current.focus));
  controls.enableDamping=true; controls.dampingFactor=.12;
  controls.minDistance=3; controls.maxDistance=1800;
  controls.maxPolarAngle=Math.PI*.495;
  scene=new THREE.Scene();
  if(softwareRenderer){
    scene.background=new THREE.Color('#D9E6F2');
    const key=new THREE.DirectionalLight('#fff9ef',3.0); key.position.set(-95,165,38);
    scene.add(key,new THREE.HemisphereLight('#eff9ff','#9aaba7',1.8));
  } else {
    skyTex=makeSky(); scene.background=skyTex;
    pmrem=new THREE.PMREMGenerator(renderer); scene.environment=pmrem.fromEquirectangular(skyTex).texture;
    scene.fog=new THREE.Fog('#cfdbe3',1100,4000);
    scene.add(new THREE.HemisphereLight('#eef5ff','#8c8a7a',.3));
    const c=B([60,58,0]);
    sun=new THREE.DirectionalLight('#fff3df',3.3);
    sun.position.copy(c).addScaledVector(SUN_DIR,320); sun.target.position.copy(c);
    sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-135,right:135,top:135,bottom:-135,near:20,far:800});
    sun.shadow.bias=-.00025; sun.shadow.normalBias=.035; sun.shadow.radius=2.2;
    scene.add(sun,sun.target);
  }
  world=new THREE.Group();base=new THREE.Group();routeRoot=new THREE.Group();fxRoot=new THREE.Group();
  efbMesh=new THREE.Group();polyMesh=new THREE.Group();rackMesh=new THREE.Group();section=new THREE.Group();
  world.add(base,efbMesh,polyMesh,rackMesh,routeRoot,fxRoot);scene.add(world,section);
  const glb=await modelBuffer();
  $('#loadText').textContent='Menyiapkan geometri dan interaksi';
  model=await new Promise((resolve,reject)=>new GLTFLoader().parse(glb,'',resolve,reject));
  model.scene.traverse(o=>{
    if(!o.isMesh || Array.isArray(o.material))return;
    if(!softwareRenderer){ fixMaterial(o); o.castShadow=!o.userData.noShadow; o.receiveShadow=true; }
    o.userData.originalMaterial=o.material;
    if(softwareRenderer){
      if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
      const b=o.geometry.boundingBox.getSize(new THREE.Vector3());
      o.userData.largeSurface=b.y<28&&Math.max(b.x,b.z)>280;
    }
    sourceNodes.push(o);
    const u=o.userData;
    if((u.kind==='eq'||u.kind==='pipe')&&u.grp&&u.grp!=='EFB-101'&&u.kind!=='pipe')allPicks.push(o);
  });
  base.add(model.scene);
  if(softwareRenderer){
    for(const [x,width,c] of [[-340,680,'#5196A5'],[340,680,'#ADC4A4']]){
      const plane=new THREE.Mesh(new THREE.PlaneGeometry(width,1260,24,42),material(c,1,true));
      plane.rotation.x=-Math.PI/2;
      plane.position.set(x,-1.02,-42);
      plane.userData.groundProxy=true;
      base.add(plane);
    }
  }
  addDetails(design.geometry.efb,efbMesh,true);
  addDetails(design.geometry.poly,polyMesh);
  addDetails(design.geometry.rack,rackMesh);
  addDetails(design.geometry.section,section);
  bindCamera();
  viewReady=true;
  $('body').dataset.renderer=softwareRenderer?'canvas-3d':'webgl';
  if(softwareRenderer)$('#basis').textContent='D200 · 3D ringan';
  updateScene();
  moveCamera(true);
  $('#load').hidden=true;
  requestAnimationFrame(animate);
}
window.CR={get THREE(){return THREE;},get camera(){return camera;},get controls(){return controls;},routes,selectRoute,selectEquipment,selectPlace,B,
  routeMeshes,get scene(){return scene;}};
refresh();
initialise().catch(e=>{
  console.warn(e.message);
  const canvas=$('#viewport canvas');if(canvas)canvas.remove();
  $('body').dataset.renderer='fallback';
  $('#fallbackImage').style.display='block';
  $('#load').hidden=true;
  $('#basis').textContent='D200 · pratinjau statis';
  updateFallback();
});
