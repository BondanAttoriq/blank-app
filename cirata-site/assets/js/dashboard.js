// Engineering Dashboard CIRATA-RESILIENT: model arus kas 20 tahun (direkonstruksi dari TEA full report) yang dijalankan ulang tiap perubahan input.
// Asumsi model: PPh badan 22%, depresiasi garis lurus (CAPEX awal 20 tahun, ekspansi 12 tahun), utilisasi 60/80/90/100%, ekspansi Rp20 M akhir tahun ke-8,
// kapasitas 200 → 300 t/hari mulai tahun ke-9, 320 hari/tahun. Hasil basis mereplikasi Lampiran 11–12 (selisih ≤ 0,06).
import { $, $$, fmt, emit } from './util.js';
import { P } from './paper-data.js';
import { cartesian, hbar, C } from './charts.js';

const BASE = { tarif: 600000, eth: 10933, opex: 100, supply: 100, capex: 100, dt: 120, old: 600000 };
const PRESETS = [
  ['Basis paper', {}], ['Tarif Rp500 rb/t', { tarif: 500000 }], ['Tarif Rp700 rb/t', { tarif: 700000 }], ['Etanol Rp14.000/L', { eth: 14000 }],
  ['Kontrak offtake Rp10.500/L', { eth: 10500 }], ['OPEX +10%', { opex: 110 }], ['Pasokan 80%', { supply: 80 }], ['CAPEX +25%', { capex: 125 }]];
const FIELDS = [['dTarif', 'tarif', 500000, 700000, 10000], ['dEth', 'eth', 9500, 14000, 100], ['dOpex', 'opex', 90, 110, 1], ['dSupply', 'supply', 70, 100, 1], ['dCapex', 'capex', 95, 125, 1], ['dDt', 'dt', 0, 240, 40], ['dOld', 'old', 400000, 800000, 50000]];
const NPV_CAL = 25.29 - 25.24;   // kalibrasi kecil agar basis = NPV full report

// ---------------------------------------------------------------- model (murni, dapat diuji)
export function cash(s) {
  const sp = s.supply / 100, op = s.opex / 100, cx = s.capex / 100;
  const tI = 64000 * sp, tII = 96000 * sp, LI = 1367931 * sp, LII = 2051896 * sp;
  const dep1 = 86 * cx / 20, dep2 = 20 * cx / 12;
  const fcf = [-86 * cx], rev = [0], opx = [0], ebitda = [0];
  for (let t = 1; t <= 20; t++) {
    let r, o, dep;
    if (t <= 8) { const u = t === 1 ? 0.6 : t === 2 ? 0.8 : t === 3 ? 0.9 : 1; r = ((tI * s.tarif + LI * s.eth) / 1e9 + 0.08 * 2 / 3) * u; o = (9.2 + 29.8 * sp * u) * op; dep = dep1; }
    else { r = (tII * s.tarif + LII * s.eth) / 1e9 + 0.08; o = (10.2 + 44.7 * sp) * op; dep = dep1 + dep2; }
    const e = r - o, f = e - 0.22 * Math.max(0, e - dep) - (t === 8 ? 20 * cx : 0);
    fcf.push(f); rev.push(r); opx.push(o); ebitda.push(e);
  }
  return { fcf, rev, opx, ebitda };
}
const npvOf = (fcf, d = 0.1) => fcf.reduce((a, f, i) => a + f / Math.pow(1 + d, i), 0);
function irrOf(fcf) { let lo = -0.5, hi = 1; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; npvOf(fcf, m) > 0 ? lo = m : hi = m; } return lo * 100; }
function pbpOf(fcf, d = 0) { let cum = 0; for (let i = 0; i < fcf.length; i++) { const f = fcf[i] / Math.pow(1 + d, i), prev = cum; cum += f; if (i > 0 && prev < 0 && cum >= 0) return i - 1 + (-prev) / f; } return null; }
export function model(s) {
  const c = cash(s), npv = npvOf(c.fcf) + NPV_CAL, cx = s.capex / 100, pvCap = 86 * cx + 20 * cx / Math.pow(1.1, 8);
  const cum = []; c.fcf.reduce((a, v, i) => (cum[i] = a + v), 0);
  // tarif impas (NPV = 0) dengan bisection
  let lo = 300000, hi = 1000000; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; npvOf(cash({ ...s, tarif: m }).fcf) + NPV_CAL > 0 ? hi = m : lo = m; }
  const pln = ((s.old - s.tarif) * 96000 + s.dt * P.site.downtime) / 1e9;
  return { ...c, cum, npv, irr: irrOf(c.fcf), pbp: pbpOf(c.fcf), dpbp: pbpOf(c.fcf, 0.1), pi: (npv + pvCap) / pvCap, be: (lo + hi) / 2, pln, rev2: c.rev[20], ebitda2: c.ebitda[20], ebitda1: c.ebitda[5] };
}

// ---------------------------------------------------------------- UI
export function init() {
  const s = { ...BASE };
  const pres = $('#dPresets');
  pres.innerHTML = PRESETS.map(([n], i) => `<button class="pchip" data-p="${i}" aria-pressed="false">${n}</button>`).join('');
  $$('.pchip', pres).forEach(b => b.onclick = () => { Object.assign(s, BASE, { dt: s.dt, old: s.old }, PRESETS[+b.dataset.p][1]); sync(); });
  for (const [id, k, lo, hi, st] of FIELDS) {
    const r = $('#' + id), n = $('#' + id + 'N');
    const set = v => { v = Math.round(Math.max(lo, Math.min(hi, +v)) / st) * st; s[k] = v; sync(); };
    r.oninput = () => set(r.value); n.onchange = () => set(n.value);
  }
  $('#dReset').onclick = () => { Object.assign(s, BASE); sync(); };
  $('#dCopy').onclick = async () => {
    const txt = summary(s, model(s));
    try { await navigator.clipboard.writeText(txt); emit('toast', 'Ringkasan skenario disalin ke clipboard.'); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); emit('toast', 'Ringkasan skenario disalin.'); } catch (_) { emit('toast', 'Clipboard tidak tersedia.'); } ta.remove(); }
  };
  function sync() {
    for (const [id, k] of FIELDS) { $('#' + id).value = s[k]; $('#' + id + 'N').value = s[k]; $('#' + id).closest('.field').classList.toggle('changed', s[k] !== BASE[k]); }
    $$('.pchip', pres).forEach((b, i) => { const p = { ...BASE, dt: s.dt, old: s.old, ...PRESETS[i][1] }; const on = ['tarif', 'eth', 'opex', 'supply', 'capex'].every(k => p[k] === s[k]); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    render(s);
  }
  sync();
}

function delta(v, b, d, goodUp, unit = '') {
  if (typeof v !== 'number' || typeof b !== 'number') return `<div class="kd flat">tidak balik modal</div>`;
  const dv = v - b; if (Math.abs(dv) < Math.pow(10, -d) / 2) return `<div class="kd flat">= basis</div>`;
  const good = goodUp ? dv > 0 : dv < 0;
  return `<div class="kd ${good ? 'up' : 'down'}"><span aria-hidden="true">${dv > 0 ? '▲' : '▼'}</span>${dv > 0 ? '+' : '−'}${fmt(Math.abs(dv), d)}${unit} vs basis</div>`;
}
const rp = v => fmt(v, 2);
function render(s) {
  const m = model(s), b = model(BASE);
  const k = [
    ['NPV (diskonto 10%)', `<small>Rp</small>${rp(m.npv)}<small> miliar</small>`, delta(m.npv, b.npv, 2, true), m.npv < 0],
    ['IRR', `${fmt(m.irr, 2)}<small>%</small>`, delta(m.irr, b.irr, 2, true, ' poin'), m.irr < 10],
    ['Simple payback', m.pbp === null ? '>20<small> tahun</small>' : `${fmt(m.pbp, 2)}<small> tahun</small>`, delta(m.pbp, b.pbp, 2, false)],
    ['Profitability index', fmt(m.pi, 2), delta(m.pi, b.pi, 2, true), m.pi < 1],
    ['EBITDA tahap II', `<small>Rp</small>${rp(m.ebitda2)}<small> M/th</small>`, delta(m.ebitda2, b.ebitda2, 2, true)],
    ['Pendapatan tahap II', `<small>Rp</small>${rp(m.rev2)}<small> M/th</small>`, delta(m.rev2, b.rev2, 2, true)],
    ['Tarif jasa impas (NPV = 0)', `<small>Rp</small>${fmt(m.be / 1000, 0)}<small> rb/t</small>`, delta(m.be / 1000, b.be / 1000, 0, false, ' rb')],
    ['Manfaat bersih PLTA', `<small>Rp</small>${rp(m.pln)}<small> M/th</small>`, delta(m.pln, b.pln, 2, true), m.pln < 0],
  ];
  $('#dKpi').innerHTML = k.map(([l, v, d, neg]) => `<div class="kt${neg ? ' neg' : ''}"><div class="kl">${l}</div><div class="kv2">${v}</div>${d}</div>`).join('');

  // arus kas
  const yrs = [...Array(21).keys()], changed = ['tarif', 'eth', 'opex', 'supply', 'capex'].some(x => s[x] !== BASE[x]);
  const be = m.pbp;
  cartesian($('#chCash'), {
    title: 'Arus kas bebas 20 tahun', w: 900, h: 320, sub: 'Utilisasi 60/80/90/100% · ekspansi Rp20 M akhir tahun ke-8 · 300 t/hari mulai tahun ke-9', unit: 'Rp miliar',
    x: { type: 'cat', cats: yrs.map(String), label: 'Tahun' }, y: { label: 'Rp miliar', fmt: v => fmt(v, 0) },
    bars: [{ name: 'FCF tahunan', color: v => v < 0 ? C.red : C.teal, values: m.fcf }],
    lines: [...(changed ? [{ name: 'Kumulatif basis', color: C.gray, dash: true, marker: 'none', points: b.cum.map((v, i) => [i, v]) }] : []),
      { name: 'Kumulatif skenario', color: C.orange, marker: 'square', points: m.cum.map((v, i) => [i, v]), label: fmt(m.cum[20], 1), labelDx: -4, labelDy: -10, labelAnchor: 'end' }],
    marks: be !== null ? [{ x: be, y: 0, color: C.blue, shape: 'diamond', label: `Payback ±${fmt(be, 1)} th`, tip: `Simple payback: tahun ±${fmt(be, 2)}` }] : [],
    hlines: [{ y: 0 }], m: { b: 46 },
    legend: [{ name: 'FCF tahunan', color: C.teal, kind: 'bar' }, { name: 'Kumulatif skenario', color: C.orange, marker: 'square' }, ...(changed ? [{ name: 'Kumulatif basis', color: C.gray, dash: true }] : []), ...(be !== null ? [{ name: 'Titik payback', color: C.blue, marker: 'diamond' }] : [])],
    table: { head: ['Tahun', 'Pendapatan', 'OPEX', 'EBITDA', 'FCF', 'Kumulatif'], rows: yrs.map(t => [t, fmt(m.rev[t], 2), fmt(m.opx[t], 2), fmt(m.ebitda[t], 2), fmt(m.fcf[t], 2), fmt(m.cum[t], 2)]) },
  });
  // tornado: rentang tabel sensitivitas full report, terhadap skenario saat ini
  const vars = [['Tarif jasa (Rp500–700 rb/t)', 'tarif', 500000, 700000], ['OPEX (90–110%)', 'opex', 110, 90], ['Pasokan biomassa (70–100%)', 'supply', 70, 100], ['Harga bioetanol (Rp9.500–14.000/L)', 'eth', 9500, 14000], ['CAPEX (95–125%)', 'capex', 125, 95]];
  const tor = vars.map(([n, key, lo, hi]) => [n, model({ ...s, [key]: lo }).npv, model({ ...s, [key]: hi }).npv]);
  const lim = Math.max(...tor.flatMap(r => [Math.abs(r[1]), Math.abs(r[2])]), Math.abs(m.npv)) * 1.1;
  const rows = tor.map(([n, a, z], i) => { const W = 560, x0 = 250, iw = W - x0 - 20, sx = v => x0 + (v + lim) / (2 * lim) * iw, y = 14 + i * 40;
    return `<text x="${x0 - 10}" y="${y + 18}" text-anchor="end" class="ax">${n}</text><rect class="barh" x="${Math.min(sx(a), sx(m.npv))}" y="${y + 6}" width="${Math.abs(sx(a) - sx(m.npv))}" height="20" rx="4" fill="${C.red}"/>
      <rect class="barh" x="${Math.min(sx(z), sx(m.npv))}" y="${y + 6}" width="${Math.abs(sx(z) - sx(m.npv))}" height="20" rx="4" fill="${C.teal}"/>
      <text x="${sx(Math.min(a, z)) - 5}" y="${y + 21}" text-anchor="end" class="dl">${fmt(Math.min(a, z), 1)}</text><text x="${sx(Math.max(a, z)) + 5}" y="${y + 21}" class="dl">${fmt(Math.max(a, z), 1)}</text>`; }).join('');
  const W = 560, x0 = 250, iw = W - x0 - 20, sx = v => x0 + (v + lim) / (2 * lim) * iw;
  $('#chTornado').classList.add('chart');
  $('#chTornado').innerHTML = `<div class="ch-head"><div><h4 class="ch-title">Tornado NPV</h4><div class="ch-sub">Rentang uji full report, dihitung ulang dari skenario saat ini (Rp miliar)</div></div></div>
    <div class="ch-body"><svg viewBox="0 0 ${W} ${tor.length * 40 + 44}" role="img" aria-label="Tornado sensitivitas NPV">${rows}
    <line x1="${sx(m.npv)}" x2="${sx(m.npv)}" y1="6" y2="${tor.length * 40 + 14}" stroke="${C.ink}" stroke-width="1.5"/><line x1="${sx(0)}" x2="${sx(0)}" y1="6" y2="${tor.length * 40 + 14}" stroke="${C.red}" stroke-dasharray="4 4"/>
    <text x="${sx(0)}" y="${tor.length * 40 + 30}" text-anchor="middle" class="ax">NPV = 0</text><text x="${sx(m.npv)}" y="${tor.length * 40 + 42}" text-anchor="middle" class="ax" style="font-weight:700">skenario ${fmt(m.npv, 1)}</text></svg></div>
    <div class="ch-legend"><span class="lg"><svg width="16" height="12"><rect width="16" height="12" rx="3" fill="${C.red}"/></svg>Batas pesimis</span><span class="lg"><svg width="16" height="12"><rect width="16" height="12" rx="3" fill="${C.teal}"/></svg>Batas optimis</span></div>
    <p class="ch-note">Monte Carlo (tanpa kontrak): tarif jasa ρ = +0,76, OPEX ρ = −0,44, harga etanol ρ = +0,34.</p>`;
  // pendapatan vs OPEX tahap II
  const sp = s.supply / 100, jasa = 96000 * sp * s.tarif / 1e9, etn = 2051896 * sp * s.eth / 1e9, opV = 44.7 * sp * s.opex / 100, opF = 10.2 * s.opex / 100;
  cartesian($('#chRevOp'), {
    title: 'Pendapatan vs OPEX tahap II', sub: 'Kapasitas 300 t/hari (96.000 t/tahun)', unit: 'Rp miliar/tahun',
    x: { type: 'cat', cats: ['Pendapatan', 'OPEX'] }, y: { min: 0, max: Math.max(100, Math.ceil((jasa + etn) / 20) * 20), label: 'Rp miliar/tahun', fmt: v => fmt(v, 0) },
    bars: [{ name: 'Jasa pengangkatan biomassa', color: C.blue, stack: 'a', values: [jasa, null] }, { name: 'Bioetanol 2G', color: C.orange, stack: 'a', values: [etn, null] },
      { name: 'Ekstrak polifenol', color: C.lime, stack: 'a', values: [0.08, null] }, { name: 'OPEX variabel', color: C.purple, stack: 'a', values: [null, opV] }, { name: 'OPEX tetap', color: C.gray, stack: 'a', values: [null, opF] }],
    texts: [{ x: 0, y: jasa + etn + 0.08, dy: -8, t: fmt(jasa + etn + 0.08, 2) }, { x: 1, y: opV + opF, dy: -8, t: fmt(opV + opF, 2) }],
    legend: [{ name: 'Jasa biomassa', color: C.blue, kind: 'bar' }, { name: 'Bioetanol', color: C.orange, kind: 'bar' }, { name: 'Polifenol', color: C.lime, kind: 'bar' }, { name: 'OPEX variabel', color: C.purple, kind: 'bar' }, { name: 'OPEX tetap', color: C.gray, kind: 'bar' }],
    table: { head: ['Komponen', 'Rp miliar/tahun'], rows: [['Jasa pengangkatan biomassa', fmt(jasa, 2)], ['Bioetanol', fmt(etn, 2)], ['Ekstrak polifenol', '0,08'], ['OPEX variabel', fmt(opV, 2)], ['OPEX tetap', fmt(opF, 2)], ['EBITDA', fmt(jasa + etn + 0.08 - opV - opF, 2)]] },
    note: 'Jasa pengangkatan ±72% pendapatan; panen dan logistik ±41% OPEX tahap I.',
  });
  // manfaat bersih PLTA
  const olds = [400000, 500000, 600000, 700000, 800000];
  cartesian($('#chPln'), {
    title: 'Manfaat bersih bagi pengelola PLTA', sub: `Biaya penanganan lama − kontrak jasa + downtime terhindarkan ${s.dt} jam-unit/tahun`, unit: 'Rp miliar/tahun',
    x: { type: 'num', min: 400, max: 800, ticks: [400, 500, 600, 700, 800], fmt: v => fmt(v, 0), label: 'Biaya penanganan lama (Rp ribu/t)' }, y: { label: 'Rp miliar/tahun', fmt: v => fmt(v, 0) },
    lines: [{ name: 'Manfaat bersih', color: C.blue, marker: 'circle', points: olds.map(o => [o / 1000, ((o - s.tarif) * 96000 + s.dt * P.site.downtime) / 1e9]) }],
    marks: [{ x: s.old / 1000, y: m.pln, color: C.orange, shape: 'diamond', label: `${fmt(m.pln, 2)}`, dy: -14, tip: `Biaya lama Rp${fmt(s.old / 1000, 0)} rb/t → manfaat bersih Rp${fmt(m.pln, 2)} M/tahun` }],
    hlines: [{ y: 0, label: 'impas' }],
    table: { head: ['Biaya lama (Rp/t)', 'Biaya lama', 'Kontrak jasa', 'Downtime terhindarkan', 'Manfaat bersih'], rows: olds.map(o => [fmt(o, 0), fmt(o * 96000 / 1e9, 2), fmt(s.tarif * 96000 / 1e9, 2), fmt(s.dt * P.site.downtime / 1e9, 3), fmt(((o - s.tarif) * 96000 + s.dt * P.site.downtime) / 1e9, 2)]) },
    note: 'Kerugian downtime Rp17,07 juta/jam-unit; manfaat dicatat terpisah dari pendapatan operator biorefinery.',
  });
  // Monte Carlo (hasil studi, statis)
  hbar($('#chMc'), { title: 'Peluang NPV > 0 (Monte Carlo 20.000 iterasi)', sub: 'Distribusi PERT: rendemen, pasokan, OPEX, CAPEX', unit: '%', labelW: 250, max: 100,
    rows: P.mcProb.map((r, i) => [r[0], r[1], [C.gray, C.teal, C.blue, '#184F8E'][i]]), vfmt: v => fmt(v, v % 1 ? 1 : 0) + '%',
    table: { head: ['Skenario', 'P(NPV > 0)'], rows: P.mcProb.map(r => [r[0], fmt(r[1], 1) + '%']) } });
  $('#dMcCard').innerHTML = `<div class="ch-head"><div><h4>Rentang hasil Monte Carlo</h4><div class="ch-sub">Skenario kontrak: tarif Rp600.000/t terkunci + offtake etanol Rp10.500/L</div></div></div>
    <div class="mc-list">${P.mc.map(r => { const lo = r[4], hi = r[5], span = hi - lo || 1, p = (r[3] - lo) / span * 100, q = (r[1] - lo) / span * 100;
      return `<div class="mc-row"><span>${r[0]}</span><div class="mc-bar"><i style="left:0;width:100%"></i><b style="left:${p}%"></b><em style="left:${Math.max(0, Math.min(100, q))}%" title="full report"></em></div><small>P5 ${fmt(lo, 1)} · <b>P50 ${fmt(r[3], 1)}</b> · P95 ${fmt(hi, 1)}</small></div>`; }).join('')}</div>
    <p class="ch-note">Garis tipis oranye = nilai deterministik full report. 81% iterasi balik modal ≤ 10 tahun.</p>`;
}
function summary(s, m) {
  return [`CIRATA-RESILIENT · Ringkasan skenario dashboard`,
    `Tarif jasa: Rp${fmt(s.tarif, 0)}/t · Harga bioetanol: Rp${fmt(s.eth, 0)}/L · OPEX: ${s.opex}% · Pasokan: ${s.supply}% · CAPEX: ${s.capex}%`,
    `NPV (10%): Rp${fmt(m.npv, 2)} miliar · IRR: ${fmt(m.irr, 2)}% · Simple PBP: ${m.pbp === null ? '>20' : fmt(m.pbp, 2)} tahun · PI: ${fmt(m.pi, 2)}`,
    `Pendapatan tahap II: Rp${fmt(m.rev2, 2)} M/tahun · EBITDA tahap II: Rp${fmt(m.ebitda2, 2)} M/tahun · Tarif impas: Rp${fmt(m.be, 0)}/t`,
    `Manfaat bersih PLTA (biaya lama Rp${fmt(s.old, 0)}/t, downtime ${s.dt} jam-unit): Rp${fmt(m.pln, 2)} M/tahun`].join('\n');
}
