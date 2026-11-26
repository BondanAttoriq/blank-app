// Navigasi, scroll progress, reveal, loader, lazy-init modul, viewer 3D (iframe) dan jembatan antarmodul (3D ↔ SCADA ↔ tabel).
import { $, $$, on, emit, scrollToId, reducedMotion } from './util.js';

const state = { scada: null, scadaP: null, frame: null };
window.CIRATA = state;

const pl = $('#pageLoader');
const plSet = (p, txt) => { $('#plBar').style.width = p + '%'; if (txt) $('#plPct').textContent = txt; };
plSet(25, 'Memuat data proses');

// navbar aktif + progress
const links = $$('.nav-links a');
const secs = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
function onScroll() {
  const h = document.documentElement; const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
  $('#scrollBar').style.width = (p * 100).toFixed(1) + '%';
  const y = h.scrollTop + innerHeight * 0.33; let cur = secs[0];
  for (const s of secs) if (s.offsetTop <= y) cur = s;
  links.forEach(a => { const o = a.getAttribute('href') === '#' + cur.id; a.classList.toggle('active', o); o ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'); });
}
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const burger = $('#navBurger'), navL = $('#navLinks');
burger.onclick = () => { const o = !navL.classList.contains('open'); navL.classList.toggle('open', o); burger.setAttribute('aria-expanded', o); };
links.forEach(a => a.addEventListener('click', () => { navL.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }));

// reveal
if ('IntersectionObserver' in window && !reducedMotion()) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => io.observe(el)); window.__reveal = el => io.observe(el);
} else { $$('.reveal').forEach(el => el.classList.add('in')); window.__reveal = el => el.classList.add('in'); }
if ('IntersectionObserver' in window) {
  const ioA = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('anim-off', !e.isIntersecting)), { rootMargin: '100px' });
  $$('main > section').forEach(s => { s.classList.add('anim-off'); ioA.observe(s); });
}

// toast
let toastT = 0;
export function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
on('toast', toast);

function nearViewport(el, fn, margin = '600px') {
  if (!('IntersectionObserver' in window)) return fn();
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: margin });
  io.observe(el);
}

// ---------------------------------------------------------------- viewer 3D (iframe viewer3d/, dijeda saat tidak terlihat)
const PLACES = [['site', 'Ikhtisar tapak'], ['efb', 'Waduk & EFB'], ['harvest', 'Dermaga'], ['prep', 'Prapengolahan'], ['ssf', 'SSF & bioetanol'], ['tank', 'Tangki'], ['poly', 'Polifenol'], ['ad', 'Digester & biogas'], ['rack', 'Boiler & pipe rack']];
$('#v3Chips').innerHTML = PLACES.map(([id, n]) => `<button class="pchip" data-place="${id}">${n}</button>`).join('');
let queue = [];
function ensure3D() {
  if (state.frame) return Promise.resolve(state.frame);
  return new Promise(res => {
    const f = document.createElement('iframe');
    f.src = 'viewer3d/?embed=1'; f.title = 'Model 3D CIRATA-RESILIENT (interaktif)'; f.allow = 'fullscreen'; f.loading = 'eager';
    f.onload = () => { state.frame = f; $('#v3Poster').hidden = true; setTimeout(() => { queue.forEach(m => f.contentWindow.postMessage(m, '*')); queue = []; }, 1800); res(f); };
    $('#v3Frame').appendChild(f);
  });
}
function send3D(msg) { if (state.frame) state.frame.contentWindow.postMessage(msg, '*'); else { queue.push(msg); ensure3D(); } }
nearViewport($('#plant3d'), ensure3D, '500px');
$('#v3Load').onclick = () => ensure3D();
$$('#v3Chips [data-place]').forEach(b => b.onclick = () => send3D({ cr: 'place', id: b.dataset.place }));
if ('IntersectionObserver' in window) new IntersectionObserver(es => { if (state.frame) state.frame.contentWindow.postMessage({ cr: 'pause', v: !es[0].isIntersecting }, '*'); }).observe($('#v3Frame'));

// ---------------------------------------------------------------- SCADA
function ensureSCADA() {
  if (!state.scadaP) state.scadaP = import('./scada.js').then(m => m.init()).then(api => (state.scada = api));
  return state.scadaP;
}
nearViewport($('#scada'), ensureSCADA, '500px');

Promise.all([import('./dashboard.js').then(m => m.init()), import('./sections.js').then(m => m.init())])
  .then(() => { plSet(100, 'Siap'); return import('./anim.js').then(a => { a.watch(); window.__watch = a.watch; }); })
  .catch(e => { console.error(e); plSet(100, 'Sebagian modul gagal dimuat'); })
  .finally(() => setTimeout(() => pl.classList.add('done'), 250));
setTimeout(() => pl.classList.add('done'), 2500);

// tombol hero & alur How?
$$('[data-act]', $('.hero')).forEach(b => b.onclick = () => {
  const a = b.dataset.act;
  if (a === 'tour') { scrollToId('plant3d'); send3D({ cr: 'tour' }); }
  else if (a === 'scada') scrollToId('scada');
  else if (a === 'dash') scrollToId('dashboard');
});
$$('.how-steps [data-place]').forEach(b => b.onclick = () => { scrollToId('plant3d'); send3D({ cr: 'place', id: b.dataset.place }); });

// jembatan antarmodul
on('show-3d', d => { scrollToId('plant3d'); if (d.place) send3D({ cr: 'place', id: d.place }); else if (d.sid) send3D({ cr: 'route', id: d.sid }); else send3D({ cr: 'tag', id: d.tag }); });
on('show-scada', d => { scrollToId('scada'); ensureSCADA().then(s => d.sid ? s.focusStream(d.sid) : s.focusTags(d.tags || [d.tag], d.screen)); });
emit('main-ready');
