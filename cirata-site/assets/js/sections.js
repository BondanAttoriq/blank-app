// Bagian Neraca, 4E, EFB, Ekonomi Sirkular, Unduhan & galeri (CIRATA-RESILIENT).
import { $, $$, fmt, fmtAuto, esc, emit, getJSON, loadRegister, streamArea, MEDIUM, statusBadge } from './util.js';
import { P } from './paper-data.js';
import { cartesian, hbar, donut, tableHTML, showTip, hideTip, C, SEQ } from './charts.js';

export async function init() {
  neracaSankeys(); t4(); e4(); efb(); analisis(); circ(); downloads();
  const reg = await loadRegister(); streamTable(reg);
}
// ================================================================ Sankey mini
function sankey(el, spec) {
  const W = spec.w || 640, H = spec.h || 330, cols = Math.max(...spec.nodes.map(n => n.col)) + 1, nw = 14, gap = spec.gap || 16;
  const byCol = [...Array(cols)].map((_, c) => spec.nodes.filter(n => n.col === c));
  const nodeVal = n => Math.max(spec.links.filter(l => l.t === n.id).reduce((s, l) => s + l.v, 0), spec.links.filter(l => l.s === n.id).reduce((s, l) => s + l.v, 0));
  const maxCol = Math.max(...byCol.map(ns => ns.reduce((s, n) => s + nodeVal(n), 0) + gap * (ns.length - 1)));
  const k = (H - 40) / maxCol; const N = {};
  byCol.forEach((ns, c) => { const tot = ns.reduce((s, n) => s + nodeVal(n) * k, 0) + gap * (ns.length - 1); let y = (H - tot) / 2;
    const x = 10 + c * (W - 20 - nw) / (cols - 1); ns.forEach(n => { const h = Math.max(3, nodeVal(n) * k); N[n.id] = { ...n, x, y, h, oi: 0, ii: 0 }; y += h + gap; }); });
  let g = '', hits = [];
  spec.links.forEach((l, i) => {
    const a = N[l.s], b = N[l.t], w = Math.max(1.5, l.v * k), y0 = a.y + a.oi + w / 2, y1 = b.y + b.ii + w / 2; a.oi += w; b.ii += w;
    const x0 = a.x + nw, x1 = b.x, mx = (x0 + x1) / 2;
    g += `<path class="flowp" data-i="${i}" data-col="${a.col}" d="M${x0},${y0}C${mx},${y0} ${mx},${y1} ${x1},${y1}" stroke="${l.c}" stroke-width="${w}" fill="none" stroke-opacity=".55"/>`;
    hits.push(`<b>${esc(a.label)} → ${esc(b.label)}</b><br>${fmt(l.v, 2)} ${spec.unit}`);
  });
  for (const n of Object.values(N)) {
    const right = n.col === cols - 1, mid = !right && n.col > 0;
    g += `<rect x="${n.x}" y="${n.y}" width="${nw}" height="${n.h}" rx="3" fill="${n.c}"/>`;
    const tx = right ? n.x - 8 : n.x + nw + 8, an = right ? 'end' : 'start', ty = n.y + n.h / 2;
    g += `<text x="${tx}" y="${ty - 3}" text-anchor="${an}" class="sv">${n.vt || fmt(nodeVal(n), 2)}</text><text x="${tx}" y="${ty + 13}" text-anchor="${an}">${esc(n.label)}</text>`;
  }
  el.innerHTML = `<div class="ch-head"><div><h4 class="ch-title">${spec.title}</h4><div class="ch-sub">${spec.sub || ''}</div></div><button class="btn-mini" data-tbl aria-expanded="false">Lihat data</button></div>
    <div class="ch-body sankey"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.title)}">${g}</svg></div><div class="ch-table" hidden>${tableHTML(spec.table)}</div>${spec.note ? `<p class="ch-note">${spec.note}</p>` : ''}`;
  el.classList.add('chart');
  const b = el.querySelector('[data-tbl]'), t = el.querySelector('.ch-table'); b.onclick = () => { t.hidden = !t.hidden; b.setAttribute('aria-expanded', !t.hidden); b.textContent = t.hidden ? 'Lihat data' : 'Sembunyikan data'; };
  el.querySelectorAll('.flowp').forEach(p => { p.addEventListener('pointermove', e => showTip(hits[+p.dataset.i], e)); p.addEventListener('pointerleave', hideTip); });
}
function neracaSankeys() {
  const bm = '#B87333', rg = '#C9A21E', ap = '#1FA5A5', cp = '#2F7FD8', et = '#F08A24', co = '#7F8C99', M = P.mass;
  sankey($('#sankeyC'), {
    title: 'Sankey neraca massa biorefinery', sub: 'Basis D200: 200 t eceng gondok basah per hari (t/hari)', unit: 't/hari', h: 380, gap: 30,
    nodes: [{ id: 'f', col: 0, label: 'Eceng gondok basah', c: bm }, { id: 'c', col: 1, label: 'Cake TS 20%', c: bm }, { id: 'r', col: 1, label: 'H₂SO₄ + NaOH', c: rg },
      { id: 's', col: 2, label: 'Slurry pretreatment', c: bm }, { id: 'b', col: 3, label: 'Beer (SSF)', c: cp }, { id: 'p', col: 4, label: 'Pressate → POC', c: ap },
      { id: 'st', col: 4, label: 'Stillage → digester', c: cp }, { id: 'co2', col: 4, label: 'CO₂ fermentasi', c: co }, { id: 'e', col: 4, label: 'Bioetanol 99,5%', c: et }],
    links: [{ s: 'f', t: 'p', v: M.pressate, c: ap }, { s: 'f', t: 'c', v: M.cake, c: bm }, { s: 'c', t: 's', v: M.cake, c: bm }, { s: 'r', t: 's', v: M.h2so4 + M.naoh, c: rg },
      { s: 's', t: 'b', v: M.beer, c: cp }, { s: 's', t: 'co2', v: M.co2, c: co }, { s: 'b', t: 'st', v: M.stillage, c: cp }, { s: 'b', t: 'e', v: M.eth, c: et }],
    table: { head: ['Aliran', 't/hari'], rows: [['S-01 Eceng gondok basah', '200,000'], ['S-02 Pressate', '109,393'], ['S-03 Cake', '90,607'], ['S-06 H₂SO₄ 98%', '0,740'], ['S-09 NaOH 50%', '1,183'], ['S-10 Slurry', '92,530'], ['S-11 CO₂', '3,388'], ['S-12 Beer', '89,142'], ['S-13 Etanol', '3,210'], ['S-14 Stillage', '85,932']] },
    note: 'Bioetanol bersih 3,183 t/hari setelah 0,0278 t/hari dipakai sebagai make-up pelarut ekstraksi polifenol.',
  });
  const E = P.energy, bg = '#8E44C9', hn = '#2C76AD', stc = '#E5484D', el = '#B39B16', ls = '#C9D3DE';
  sankey($('#sankeyE'), {
    title: 'Sankey energi panas & listrik', sub: 'Biogas menutup 100% uap proses (rasio ketersediaan 1,29) · GJ/hari', unit: 'GJ/hari', h: 380, gap: 26,
    nodes: [{ id: 'g', col: 0, label: 'Metana biogas', c: bg }, { id: 'h', col: 0, label: 'Pemulihan panas HEN', c: hn }, { id: 'b', col: 1, label: 'Boiler B-601', c: stc }, { id: 'chp', col: 1, label: 'Surplus ke CHP', c: el },
      { id: 's', col: 2, label: 'Uap 10 bar', c: stc }, { id: 'bl', col: 3, label: 'Rugi boiler & stack (dihitung)', c: ls }, { id: 'el', col: 3, label: 'Listrik CHP (1.196 kWh)', c: el },
      { id: 'cl', col: 3, label: 'Rugi CHP (dihitung)', c: ls }, { id: 'q', col: 3, label: 'Kebutuhan panas proses', c: '#184F8E', vt: '75,62' }],
    links: [{ s: 'g', t: 'b', v: E.boiler, c: bg }, { s: 'g', t: 'chp', v: E.surplus, c: bg }, { s: 'b', t: 's', v: E.steam, c: stc }, { s: 'b', t: 'bl', v: E.boiler - E.steam, c: ls },
      { s: 's', t: 'q', v: E.steam, c: stc }, { s: 'h', t: 'q', v: E.hen, c: hn }, { s: 'chp', t: 'el', v: E.chp * 0.0036, c: el }, { s: 'chp', t: 'cl', v: E.surplus - E.chp * 0.0036, c: ls }],
    table: { head: ['Komponen', 'GJ/hari'], rows: [['Metana dalam biogas', '65,75'], ['Bahan bakar boiler', '51,03'], ['Surplus ke CHP', '14,72'], ['Uap proses (S-21)', '36,15'], ['Pemulihan panas HEN', '39,47'], ['Kebutuhan panas proses', '75,62'], ['Listrik CHP neto', fmt(E.chp * 0.0036, 2) + ' (1.195,6 kWh/hari)']] },
  });
}
function t4() {
  const it = [['Bioetanol bersih', '3,183', 't/hari', '4.275 L/hari · 99,5% v/v'], ['Biogas', '3.647', 'Nm³/hari', '±73% CH₄ setara energi'], ['Uap 10 bar', '15,66', 't/hari', '100% dari biogas'],
    ['Listrik CHP', '1.196', 'kWh/hari', '94,96% kebutuhan fasilitas'], ['Ekstrak polifenol', '1,5', 'kg/hari', '480 kg/tahun'], ['Nutrien terangkut', '97,0', 't N/tahun', '12,9 t P/tahun (tahap I)']];
  const cnt = v => { const d = (v.split(',')[1] || '').length; return `<span data-count="${v.replace(/\./g, '').replace(',', '.')}" data-dec="${d}">${v}</span>`; };
  $('#t4').innerHTML = it.map(([l, v, u, s]) => `<div class="kt"><div class="kl">${l}</div><div class="kv2">${cnt(v)}<small> ${u}</small></div><div class="kd flat">${s}</div></div>`).join('');
}
// ================================================================ tabel aliran
function streamTable(reg) {
  const el = $('#streamTable'); const meds = [...new Set(reg.list.map(s => s.medium))];
  const areas = [...new Set(reg.list.map(s => streamArea(s, reg.EQ)).filter(Boolean))].sort();
  el.innerHTML = `<div class="ch-head"><div><h4 class="ch-title">Tabel aliran (neraca D200 + ukuran pipa)</h4><div class="ch-sub">Klik baris untuk menyorot aliran di SCADA, atau tombol 3D untuk model</div></div><span class="st-count" id="stCount"></span></div>
    <div class="st-tools"><label class="sr-only" for="stQ" style="position:absolute;left:-9999px">Cari aliran</label><input id="stQ" type="search" placeholder="Cari ID, nama PFD, atau tag unit…" aria-label="Cari aliran">
    <select id="stMed" aria-label="Filter medium"><option value="">Semua medium</option>${meds.map(m => `<option>${esc(m)}</option>`).join('')}</select>
    <select id="stArea" aria-label="Filter area"><option value="">Semua area</option>${areas.map(a => `<option value="${a}">Area ${a}</option>`).join('')}</select></div>
    <div class="st-wrap"><table class="st-tbl"><thead><tr><th>ID</th><th>Nama PFD</th><th>Medium</th><th>Dari → Ke</th><th>Area</th><th>Laju</th><th>Satuan</th><th>Status</th><th>T (°C)</th><th>P (bar a)</th><th>DN</th><th>v (m/s)</th><th></th></tr></thead><tbody id="stBody"></tbody></table></div>`;
  const draw = () => {
    const q = $('#stQ').value.toLowerCase(), m = $('#stMed').value, a = $('#stArea').value;
    const rows = reg.list.filter(s => (!m || s.medium === m) && (!a || streamArea(s, reg.EQ) === a) && (!q || [s.stream_id, s.pfd_name, s.from_tag, s.to_tag].join(' ').toLowerCase().includes(q)));
    $('#stCount').textContent = `${rows.length} dari ${reg.list.length} aliran`;
    $('#stBody').innerHTML = rows.map(s => { const p = s.pipe || {}; return `<tr tabindex="0" data-sid="${esc(s.stream_id)}"><td class="n"><b>${esc(s.stream_id)}</b></td><td>${esc(s.pfd_name)}</td>
      <td><span class="med"><i style="background:${(MEDIUM[s.medium] || ['#999'])[0]}"></i>${esc(s.medium)}</span></td><td>${esc(s.from_tag)} → ${esc(s.to_tag)}</td><td>${streamArea(s, reg.EQ) || '·'}</td>
      <td class="n">${s.qst === 'SIAGA' ? 'siaga' : s.q === null ? 'n/a' : fmtAuto(s.q)}</td><td>${esc(s.u)}</td><td>${statusBadge(s.qst)}</td><td class="n">${p.T ?? '·'}</td><td class="n">${p.P !== null && p.P !== undefined ? fmt(p.P, 2) : '·'}</td>
      <td class="n">${p.DN ?? '·'}</td><td class="n">${p.v !== null && p.v !== undefined ? fmt(p.v, 2) : '·'}</td><td class="acts"><button data-3d="${esc(s.stream_id)}" aria-label="Lihat aliran ${esc(s.stream_id)} di 3D">3D</button></td></tr>`; }).join('');
    $$('#stBody tr').forEach(tr => { const go = () => emit('show-scada', { sid: tr.dataset.sid }); tr.onclick = e => { if (!e.target.closest('[data-3d]')) go(); }; tr.onkeydown = e => { if (e.key === 'Enter') go(); }; });
    $$('#stBody [data-3d]').forEach(b => b.onclick = () => emit('show-3d', { sid: b.dataset['3d'] }));
  };
  ['stQ', 'stMed', 'stArea'].forEach(id => $('#' + id).addEventListener('input', draw)); draw();
}

function e4() {
  $$('.e4-tabs [data-e4]').forEach(b => b.onclick = () => { $$('.e4-tabs [data-e4]').forEach(x => x.setAttribute('aria-selected', x === b)); $$('.e4-pane').forEach(p => p.hidden = p.dataset.e4p !== b.dataset.e4); });
  const E = P.energy, tile = (l, v, s) => `<div class="kt"><div class="kl">${l}</div><div class="kv2">${v}</div><div class="kd flat">${s}</div></div>`;
  // Energi
  $('#e4Energi').innerHTML = `<div class="tiles">${tile('Kebutuhan panas', '<span data-count="75.62" data-dec="2">75,62</span><small> GJ/hari</small>', 'distilasi 44,42 · pretreatment 23,52')}${tile('Pemulihan HEN', '<span data-count="39.47" data-dec="2">39,47</span><small> GJ/hari</small>', 'ΔTmin 10 K · pinch 85 °C')}${tile('Uap utilitas', '<span data-count="36.15" data-dec="2">36,15</span><small> GJ/hari</small>', '15,66 t/hari uap 10 bar')}${tile('Biogas / boiler', '<span data-count="1.29" data-dec="2">1,29</span><small> ×</small>', '65,75 vs 51,03 GJ/hari')}${tile('Listrik CHP', '<span data-count="94.96" data-dec="2" data-suffix="%">94,96%</span>', '1.195,6 dari 1.259 kWh/hari')}${tile('Intensitas listrik', '<span data-count="0.313" data-dec="3">0,313</span><small> kWh/L</small>', 'diesel logistik 182,7 L/hari')}</div>
    <div class="e4-grid"><div class="card" id="e4Heat"></div><div class="card" id="e4Elec"></div></div>`;
  cartesian($('#e4Heat'), { title: 'Distribusi kebutuhan panas proses', sub: 'Kontribusi panas internal (HEN) dan uap utilitas per unit', unit: 'GJ/hari',
    x: { type: 'cat', cats: P.heat.map(h => h[0].split(' ')[0]) }, y: { min: 0, label: 'GJ/hari', fmt: v => fmt(v, 0) },
    bars: [{ name: 'HEN (panas internal)', color: C.teal, stack: 'a', values: P.heat.map(h => h[2]) }, { name: 'Uap utilitas', color: C.red, stack: 'a', values: P.heat.map(h => h[3]) }],
    legend: [{ name: 'HEN (panas internal)', color: C.teal, kind: 'bar' }, { name: 'Uap utilitas', color: C.red, kind: 'bar' }],
    table: { head: ['Unit', 'Q masuk', 'HEN', 'Steam'], rows: P.heat.map(h => [h[0], fmt(h[1], 2), fmt(h[2], 2), fmt(h[3], 2)]) },
    note: 'Pertukaran utama: slurry → umpan pretreatment 14,22 GJ/hari dan stillage → umpan distilasi 13,45 GJ/hari (luas ekuivalen 88,02 m²).' });
  cartesian($('#e4Elec'), { title: 'Kecukupan listrik dari CHP', sub: 'Efisiensi listrik 33%, konsumsi internal 5%, kebocoran gas 1,5%', unit: 'kWh/hari',
    x: { type: 'cat', cats: ['Tahap I · 200 t/hari', 'Tahap II · 300 t/hari'] }, y: { min: 0, label: 'kWh/hari', fmt: v => fmt(v, 0) },
    bars: [{ name: 'Kebutuhan listrik', color: C.gray, values: [E.elec, E.elec300] }, { name: 'Listrik CHP neto', color: C.orange, values: [E.chp, E.chp300] }],
    texts: [{ x: 0, y: E.chp, dy: -26, t: '94,96%' }, { x: 1, y: E.chp300, dy: -26, t: '88,95%' }],
    legend: [{ name: 'Kebutuhan', color: C.gray, kind: 'bar' }, { name: 'CHP neto', color: C.orange, kind: 'bar' }],
    table: { head: ['Kapasitas', 'Kebutuhan', 'CHP neto', 'Cakupan'], rows: [['200 t/hari', '1.259,01', '1.195,60', '94,96%'], ['300 t/hari', '1.858,03', '1.652,63', '88,95%']] } });
  // Eksergi
  const X = P.exergy;
  $('#e4Eksergi').innerHTML = `<div class="e4-grid"><div class="card"><h3 class="h-sm">Efisiensi energi & eksergi</h3>
    <div class="tiles" style="grid-template-columns:repeat(3,1fr)">${tile('Energi boiler', '76,2<small>%</small>', 'η termal')}${tile('Eksergi uap neto', '23,16<small>%</small>', 'boiler → uap')}${tile('Eksergi produk', '29,22<small>%</small>', 'berbasis bioetanol')}</div>
    <ul class="ticks"><li>Total destruksi eksergi subsistem termal 49,56 GJ/hari; boiler dan pembakaran 38,61 GJ/hari (77,9%).</li><li>Prioritas peningkatan kinerja: pembakaran dan penyediaan panas utilitas (preheat udara, ekonomizer).</li><li>Kondisi acuan 25 °C dan 101,325 kPa.</li></ul></div><div class="card" id="e4Ex"></div></div>`;
  hbar($('#e4Ex'), { title: 'Destruksi eksergi subsistem termal', sub: 'GJ/hari, total 49,56', unit: 'GJ/hari', labelW: 230, rows: X.items.map((r, i) => [r[0], r[1], i ? C.orange : C.red]), vfmt: v => `${fmt(v, 2)} · ${fmt(v / X.total * 100, 1)}%`,
    table: { head: ['Komponen', 'GJ/hari', '%'], rows: X.items.map(r => [r[0], fmt(r[1], 2), fmt(r[1] / X.total * 100, 1)]) } });
  // Lingkungan
  const V = P.env;
  $('#e4Ling').innerHTML = `<div class="e4-grid"><div class="card" id="e4Ci"></div><div class="card"><h3 class="h-sm">Kualitas air &amp; pengangkutan nutrien</h3>
    <div class="tiles" style="grid-template-columns:repeat(2,1fr)">${tile('Total P baseline', '0,24<small> mg/L</small>', 'TSI-P 83,18')}${tile('Total N baseline', '1,00<small> mg/L</small>', 'TSI-TN 54,5')}${tile('N keluar permanen', '97,0<small> t/tahun</small>', '145 t pada tahap II')}${tile('P keluar permanen', '12,9<small> t/tahun</small>', '19,3 t pada tahap II')}</div>
    <ul class="ticks"><li>Emisi terhindarkan 1,2–1,6 kt CO₂e/tahun; ≥98% massa keluaran masuk jalur produk, energi, atau pupuk.</li><li>Pemantauan TP, TN, klorofil-a, transparansi, dan DO pada titik masuk, keluar modul EFB, dan lokasi kontrol.</li><li>Digestat dipakai sebagai pupuk hanya setelah lolos uji mutu (POC Kepmentan 261/2019).</li></ul></div></div>`;
  cartesian($('#e4Ci'), { title: 'Intensitas karbon bioetanol', sub: 'Pembanding bahan bakar fosil 94 g CO₂e/MJ (Annex V Directive (EU) 2018/2001)', unit: 'g CO₂e/MJ',
    x: { type: 'cat', cats: ['Fosil', 'Dasar', 'Dengan CHP', 'CHP + kendali emisi'] }, y: { min: 0, max: 100, label: 'g CO₂e/MJ', fmt: v => fmt(v, 0) },
    bars: [{ name: 'Intensitas karbon', color: (v, i) => [C.gray, C.teal, C.blue, C.lime][i], values: [V.fossil, V.base, V.chp, V.ctrl] }],
    texts: [{ x: 0, y: 94, dy: -8, t: '94' }, { x: 1, y: V.base, dy: -8, t: '−31,07%' }, { x: 2, y: V.chp, dy: -8, t: '−44,19%' }, { x: 3, y: V.ctrl, dy: -8, t: '−59,92%', cls: 'strong' }],
    table: { head: ['Konfigurasi', 'g CO₂e/MJ', 'Penurunan'], rows: [['Fosil', '94', '-'], ['Dasar', fmt(V.base, 2), '31,07%'], ['Dengan CHP', '52,46', '44,19%'], ['CHP + kendali emisi', '37,68', '59,92%'], ['Konversi konservatif', '133,13', '-']] },
    note: 'Pada konversi konservatif 200 t/hari, intensitas naik ke 133,13 g CO₂e/MJ karena produksi bioetanol lebih rendah.' });
  // Ekonomi
  $('#e4Eko').innerHTML = `<div class="tiles">${tile('CAPEX awal', '<small>Rp</small><span data-count="86" data-dec="2">86,00</span><small> M</small>', '+ ekspansi Rp20 M (akhir tahun ke-8)')}${tile('OPEX', '<small>Rp</small><span data-count="39" data-dec="2">39,00</span><small> M/th</small>', 'Rp54,90 M/th setelah ekspansi')}${tile('Pendapatan II', '<small>Rp</small><span data-count="80.11" data-dec="2">80,11</span><small> M/th</small>', 'EBITDA Rp25,21 M/th')}${tile('NPV 10%', '<small>Rp</small><span data-count="25.29" data-dec="2">25,29</span><small> M</small>', 'umur 20 tahun')}${tile('IRR', '<span data-count="13.15" data-dec="2" data-suffix="%">13,15%</span>', 'PI 1,27')}${tile('Payback', '<span data-count="9.02" data-dec="2">9,02</span><small> th</small>', 'discounted 13,78 tahun')}</div>
    <div class="e4-grid"><div class="card" id="e4Capex"></div><div class="card" id="e4Opex"></div></div>`;
  donut($('#e4Capex'), { title: 'Rincian CAPEX tahap I', sub: 'Rp miliar, total 86,00', items: P.capex.map((r, i) => [r[0], r[1], SEQ[i]]), center: ['86,00', 'Rp miliar'],
    table: { head: ['Komponen', 'Rp miliar'], rows: [...P.capex.map(r => [r[0], fmt(r[1], 2)]), ['Total', '86,00']] } });
  hbar($('#e4Opex'), { title: 'Rincian OPEX tahap I', sub: 'Rp miliar/tahun, total 39,00', unit: 'Rp miliar/tahun', labelW: 260, rows: P.opex.map(r => [r[0], r[1], r[1] > 4 ? C.orange : C.teal]), vfmt: v => fmt(v, 2),
    table: { head: ['Komponen', 'Rp miliar/tahun'], rows: [...P.opex.map(r => [r[0], fmt(r[1], 2)]), ['Total', '39,00']] } });
}

// ================================================================ EFB: efek lokal zona intake (interaktif)
function efb() {
  const st = { ha: '2 ha', rz: 'Rata-rata tahunan' };
  const host = $('#efbSim');
  const draw = () => {
    const row = P.intake.find(r => r[0] === st.ha && r[1] === st.rz) || P.intake.find(r => r[0] === st.ha);
    st.rz = row[1];
    const rezim = P.intake.filter(r => r[0] === st.ha).map(r => r[1]);
    host.innerHTML = `<div class="ch-head"><div><h4 class="ch-title">Simulasi efek lokal EFB di zona intake</h4><div class="ch-sub">Penyisihan areal model Monod; perairan cenderung N-limited (TN:TP 4,2)</div></div></div>
      <div class="efb-ctl"><div class="seg" role="radiogroup" aria-label="Luas EFB">${['2 ha', '5 ha', '10 ha'].map(h => `<label><input type="radio" name="efbHa" value="${h}" ${h === st.ha ? 'checked' : ''}><span>EFB ${h}</span></label>`).join('')}</div>
      <div class="seg" role="radiogroup" aria-label="Rezim debit">${rezim.map(z => `<label><input type="radio" name="efbRz" value="${z}" ${z === st.rz ? 'checked' : ''}><span>${z}</span></label>`).join('')}</div></div>
      <div class="efb-out">
        <div class="efb-g"><span>TN zona intake</span><b>${fmt(row[2], 2)} <small>mg/L</small></b><div class="efb-bar"><i style="width:${row[2] / 1 * 100}%"></i><em style="left:100%"></em></div><small>baseline 1,00 mg/L · turun ${row[3]}%</small></div>
        <div class="efb-g"><span>Penurunan TP</span><b>${row[4]}<small>%</small></b><div class="efb-bar"><i style="width:${row[4]}%"></i></div><small>fosfor zona intake</small></div>
        <div class="efb-g"><span>Laju tumbuh eceng gondok</span><b>${fmt(row[5], 3)} <small>/hari</small></b><div class="efb-bar"><i style="width:${row[5] / 0.03 * 100}%"></i><em style="left:100%"></em></div><small>baseline 0,030 · turun ${row[6]}%</small></div>
        <div class="efb-g"><span>Waktu ganda tikar</span><b>${row[7]} <small>hari</small></b><div class="efb-bar"><i style="width:${Math.min(100, row[7] / 50 * 100)}%"></i></div><small>baseline 23,1 hari</small></div>
      </div>
      <p class="ch-note">Trash boom hanya menahan tikar yang sudah tumbuh; EFB menekan laju tumbuh di sumbernya, tepat di area yang menentukan downtime. Efek terbesar saat kemarau, ketika waktu tinggal air paling lama.</p>
      <div class="efb-tbl">${tableHTML({ head: ['Tanaman', 'Luas (m²)', 'Jarak tanam', 'Siklus panen', 'Serapan N (g/m²/hari)', 'Biomassa (t/tahun)', 'N terangkut (t/tahun)'], rows: P.efbPlant.map(r => [r[0], fmt(r[1], 0), r[2], r[3] + ' hari', fmt(r[4], 2), fmt(r[6], 0), fmt(r[7], 3)]) })}</div>`;
    $$('input[name=efbHa]', host).forEach(i => i.onchange = () => { st.ha = i.value; draw(); });
    $$('input[name=efbRz]', host).forEach(i => i.onchange = () => { st.rz = i.value; draw(); });
  };
  draw();
  hbar($('#mcda'), { title: 'MCDA 10 pendekatan pengendalian', sub: 'Delapan kriteria: proteksi intake 20%, kecepatan kendali, ekspor N/P, keamanan biota 15%, dst.', unit: 'skor', labelW: 200, max: 5,
    rows: P.mcda.map((r, i) => [r[0], r[1], i ? '#9FB1C4' : C.blue]), vfmt: v => fmt(v, 2), table: { head: ['Pendekatan', 'Skor'], rows: P.mcda.map(r => [r[0], fmt(r[1], 2)]) } });
  $('#roadmap').innerHTML = `<div class="ch-head"><div><h4 class="ch-title">Roadmap kapasitas modular</h4><div class="ch-sub">Train 100 t/hari; batas panen aman 70% MSY ≈ 540 t/hari</div></div></div>
    <ol class="rm">${P.roadmap.map((r, i) => `<li><span class="rm-n">${r[0]}</span><b>${r[1]} t/hari</b><small>${r[2]}</small><div class="rm-k"><span>Bioetanol <b>${fmt(r[3], 2)}</b> juta L/th</span><span>N keluar <b>${r[4]}</b> t/th</span><span>EBITDA <b>Rp${fmt(r[5], 1)} M</b></span><span>CAPEX kumulatif <b>Rp${r[6]} M</b></span></div></li>`).join('')}</ol>
    <p class="ch-note">Skenario pemulihan penuh (KJA −90%, DAS −40%): TP keluar dari status hipereutrof sekitar tahun ke-13 dan tikar eceng gondok habis.</p>`;
}

// ================================================================ Ekonomi sirkular
function circ() {
  $('#pillars').innerHTML = [['i-leaf', '#1F5FA8', 'Bioremediasi ramah lingkungan', '97,0 t N dan 12,9 t P/tahun keluar permanen; TN zona intake −28% rata-rata tahunan dengan EFB 2 ha; tanpa bahan kimia, spesies native.'],
    ['i-recycle', '#2C76AD', 'Upcycling biomassa', '64.000 t/tahun eceng gondok menjadi 1,37 juta L bioetanol 99,5% v/v, biogas untuk 100% uap dan ±95% listrik, 480 kg polifenol, serta pupuk organik.'],
    ['i-bolt', '#3692BD', 'Nilai & keandalan PLTA', 'EBITDA Rp14,4 → 25,2 M/tahun, P(NPV > 0) 91%, downtime terhindarkan Rp0,68–4,10 M/tahun, emisi terhindarkan 1,2–1,6 kt CO₂e/tahun.']]
    .map(p => `<article class="card pillar"><span class="ico-c" style="--c:${p[1]}"><svg><use href="#${p[0]}"/></svg></span><h3>${p[2]}</h3><p>${p[3]}</p></article>`).join('');
  const S = [
    ['01', 'EFB|Fitoremediasi', 'kangkung + selada air 2 ha', 'Modul apung HDPE 40 × 500 m² menyerap N dan P di hulu trash boom; panen bergilir 40 blok memberi 1,66 t/hari biomassa.', 'efb', '#3FA34D', 'i-leaf'],
    ['02', 'Panen|Eceng Gondok', '200 t/hari basah', 'Kapal panen dan conveyor mengangkat tikar dari zona intake; nutrien ikut keluar dari waduk bersama biomassa.', 'harvest', '#184F8E', 'i-ship'],
    ['03', 'Pengepresan &|Pretreatment', 'H₂SO₄ 1% · 100 °C · 30 menit', 'Screw press memisahkan pressate 109,4 t/hari; cake digiling < 2 mm lalu dihidrolisis asam encer dan dinetralkan.', 'prep', '#C9A21E', 'i-gear'],
    ['04', 'SSF &|Distilasi', 'bioetanol 99,5% v/v', 'Sakarifikasi dan fermentasi simultan 35 °C 48–72 jam, distilasi, dan molecular sieve menghasilkan bioetanol 2G.', 'ssf', '#F08A24', 'i-flask'],
    ['05', 'Co-Digestion|& Biogas', '3.647 Nm³/hari', 'Stillage dan residu EFB dicerna anaerob; biogas membangkitkan 100% uap proses dan surplusnya ke CHP.', 'ad', '#8E44C9', 'i-fuel'],
    ['06', 'Pupuk &|Air Daur Ulang', 'POC · pupuk padat', 'Digestat dan pressate dipekatkan menjadi pupuk organik; air proses didaur ulang ke screw press dan ekstraksi.', 'poly', '#1FA5A5', 'i-recycle']];
  const R = 190, cx = 300, cy = 260, pos = S.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
  let g = `<defs><marker id="cArr" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0L10,5L0,10z" fill="#2C76AD"/></marker></defs>`;
  for (let i = 0; i < 6; i++) { const a0 = -Math.PI / 2 + i * Math.PI / 3 + 0.27, a1 = -Math.PI / 2 + (i + 1) * Math.PI / 3 - 0.27;
    g += `<path class="cflow" d="M${cx + R * Math.cos(a0)},${cy + R * Math.sin(a0)} A${R},${R} 0 0 1 ${cx + R * Math.cos(a1)},${cy + R * Math.sin(a1)}" stroke="${S[i][5]}" marker-end="url(#cArr)"/>`; }
  const loop = (i, j, c, lbl) => { const [x0, y0] = pos[i], [x1, y1] = pos[j]; const mx = (x0 + x1) / 2 * 0.55 + cx * 0.45, my = (y0 + y1) / 2 * 0.55 + cy * 0.45;
    return `<path class="cflow loop" d="M${x0 + (cx - x0) * .28},${y0 + (cy - y0) * .28} Q${mx},${my} ${x1 + (cx - x1) * .28},${y1 + (cy - y1) * .28}" stroke="${c}" marker-end="url(#cArr)"/><text x="${mx}" y="${my}" text-anchor="middle" class="ax" style="font-weight:700;fill:${c};font-size:12px">${lbl}</text>`; };
  g += loop(4, 2, '#E5484D', 'uap → proses') + loop(3, 0, '#F08A24', 'etanol → ekstraksi');
  g += `<circle cx="${cx}" cy="${cy}" r="70" fill="#F0F6FC" stroke="#D5E3EC" stroke-width="2"/><text x="${cx}" y="${cy - 8}" text-anchor="middle" style="font:italic 800 18px Poppins,sans-serif;fill:#1F5FA8">Ekonomi</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" style="font:italic 800 18px Poppins,sans-serif;fill:#1F5FA8">Sirkular</text><text x="${cx}" y="${cy + 34}" text-anchor="middle" style="font:700 11px Poppins,sans-serif;fill:#4A6078">CIRATA-RESILIENT</text>`;
  S.forEach((s, i) => { const [x, y] = pos[i];
    g += `<g class="stage" data-i="${i}" tabindex="0" role="button" aria-label="Tahap ${s[0]}: ${esc(s[1].replace('|', ' '))}"><g class="sbg"><circle cx="${x}" cy="${y}" r="54" fill="#fff" stroke="${s[5]}" stroke-width="3"/>
      <circle cx="${x - 40}" cy="${y - 40}" r="17" fill="${s[5]}"/><text x="${x - 40}" y="${y - 35}" text-anchor="middle" style="font:800 13px Poppins,sans-serif;fill:#fff">${s[0]}</text>
      <svg x="${x - 16}" y="${y - 30}" width="32" height="32" viewBox="0 0 24 24" style="color:${s[5]}"><use href="#${s[6]}"/></svg>
      <text x="${x}" y="${y + 14}" text-anchor="middle" style="font:700 11px Poppins,sans-serif;fill:#13294B">${esc(s[1].split('|')[0])}</text>
      <text x="${x}" y="${y + 28}" text-anchor="middle" style="font:700 11px Poppins,sans-serif;fill:#13294B">${esc(s[1].split('|')[1])}</text></g></g>`; });
  $('#circ').innerHTML = `<div class="card"><svg viewBox="40 0 520 520" role="img" aria-label="Siklus enam tahap ekonomi sirkular CIRATA-RESILIENT">${g}</svg></div><div class="card circ-detail" id="circD" aria-live="polite"></div>`;
  const det = i => { const s = S[i]; $('#circD').style.borderLeftColor = s[5];
    $('#circD').innerHTML = `<span class="cd-num" style="background:${s[5]}">${s[0]}</span><h3>${esc(s[1].replace('|', ' ').trim())}</h3><div class="big">${esc(s[2])}</div><p>${esc(s[3])}</p><button class="btn btn-teal sm" data-place="${s[4]}"><svg><use href="#i-cube"/></svg>Lihat di model 3D</button>`;
    $('#circD [data-place]').onclick = () => emit('show-3d', { place: s[4] }); $$('#circ .stage').forEach(n => n.classList.toggle('on', +n.dataset.i === i)); };
  $$('#circ .stage').forEach(n => { const i = +n.dataset.i; n.addEventListener('pointerenter', () => det(i)); n.addEventListener('click', () => det(i)); n.addEventListener('focus', () => det(i)); });
  det(0);
}

// ================================================================ Unduhan + galeri + lightbox
async function downloads() {
  const d = 'assets/downloads/';
  const card = (ico, c, t, s, href) => `<a class="dl" href="${href}" download><span class="ico-c" style="--c:${c}"><svg><use href="#${ico}"/></svg></span><b>${t}</b><small>${s}</small><span class="dlb"><svg><use href="#i-down"/></svg>Unduh</span></a>`;
  $('#dlGrid').innerHTML = card('i-chart', '#184F8E', 'Grafik analisis', '31 grafik PNG 300 dpi (ZIP)', d + 'CIRATA_Grafik_Analisis_31.zip')
    + card('i-panel', '#1F5FA8', 'Data & tabel', '18 sheet angka analisis (XLSX)', d + 'CIRATA_Data_Tabel.xlsx')
    + card('i-flow', '#2C76AD', 'PFD biorefinery', 'Area 100–700 (JPG)', d + 'CIRATA_PFD_Biorefinery.jpg')
    + card('i-flask', '#3692BD', 'Neraca massa & panas', 'Basis D200 (JPG)', d + 'CIRATA_Neraca_Massa_Panas.jpg')
    + card('i-pipe', '#47B3D1', 'P&ID', 'Area 100–700, 7 lembar (ZIP)', d + 'CIRATA_PID_Area100-700.zip')
    + `<div class="dl"><span class="ico-c" style="--c:#164E80"><svg><use href="#i-scada"/></svg></span><b>Register (CSV)</b><small>Data SCADA CIRATA-RESILIENT</small><div class="dl-sub">
      ${[['equipment_register.csv', 'Peralatan'], ['stream_register.csv', 'Aliran & pipa']].map(([f, n]) => `<a href="${d + f}" download><svg><use href="#i-down"/></svg>${n}</a>`).join('')}</div></div>`;
  const figs = await getJSON('assets/data/figs.json');
  const R = [['site', 'Ikhtisar tapak'], ['top', 'Tampak atas'], ['efb', 'Waduk & EFB'], ['section', 'Potongan EFB'], ['harvest', 'Dermaga & penerimaan'], ['prep', 'Prapengolahan'], ['ssf', 'SSF & bioetanol'], ['tank', 'Tangki & pengiriman'], ['poly', 'Ekstraksi polifenol'], ['ad', 'Digester & biogas'], ['rack', 'Boiler & pipe rack']];
  const sets = {
    render: R.map(([f, n]) => [`assets/img/render/${f}.jpg`, `assets/img/render/t_${f}.jpg`, n]),
    grafik: figs.map(f => { const b = f.replace('.png', ''); return [`assets/img/fig/${b}.jpg`, `assets/img/fig/t_${b}.jpg`, figCap(b)]; }),
    rujukan: [['PFD', 'PFD biorefinery'], ['MASS', 'Neraca massa & panas'], ['EFB', 'Skema EFB'], ...[100, 200, 300, 400, 500, 600, 700].map(a => ['PID' + a, 'P&ID Area ' + a])].map(([f, n]) => [`assets/img/ref/${f}.jpg`, `assets/img/ref/${f}.jpg`, n]),
  };
  const names = { render: 'Render 3D', grafik: 'Grafik analisis', rujukan: 'PFD & P&ID' };
  $('#galTabs').innerHTML = Object.keys(sets).map((k, i) => `<button role="tab" aria-selected="${!i}" data-g="${k}">${names[k]} <small>${sets[k].length}</small></button>`).join('');
  let items = sets.render;
  const show = k => { items = sets[k];
    $('#gallery').innerHTML = items.map((it, i) => `<button data-i="${i}" aria-label="Buka ${esc(it[2])}"><img src="${it[1]}" alt="${esc(it[2])}" loading="lazy" width="400" height="240"><span>${esc(it[2])}</span></button>`).join('');
    $$('#gallery button').forEach(b => b.onclick = () => lightbox(items, +b.dataset.i));
    $$('#galTabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.g === k)); };
  $$('#galTabs button').forEach(b => b.onclick = () => show(b.dataset.g)); show('render');
}

// ================================================================ Analisis mendalam (R1–R7)
const AN = [
  { id: 'efb', t: 'EFB & serapan nutrien', ico: 'i-leaf', figs: ['R1_1_EFB_kinetika_siklus_panen', 'R1_2_EFB_kanopi_jarak_tanam', 'R1_3_EFB_serapan_nutrien', 'R1_4_EFB_kontra_pertumbuhan', 'R1_5_EFB_seleksi_tanaman_MCDA', 'R1_6_EFB_panen_bergilir', 'R1_7_Simulasi_pengurangan_nutrien', 'R1_8_Zona_intake_efek_lokal'],
    lead: 'Model logistik terkalibrasi menempatkan siklus panen 28 hari (kangkung) dan 40 hari (selada air) tepat di puncak laju panen rata-rata, sehingga serapan nutrien maksimum tanpa self-shading.',
    kpi: [['28 / 40', 'hari', 'siklus panen optimum'], ['20×20 / 25×25', 'cm', 'jarak tanam = diameter kanopi'], ['0,25', 'g N/m²/hari', '0,023 g P/m²/hari'], ['530', 't/tahun', 'biomassa EFB (1,66 t/hari)']],
    pts: ['MCDA tujuh kandidat: kangkung (4,50) dan selada air (4,05) teratas; eceng gondok (3,90) dan M. aquaticum (3,30) gugur karena invasif.',
      'Panen pada 2×T* menurunkan ekspor N bersih 67–75% karena senesens; SOP panen paling lambat T* + 3 hari.',
      'Modul 20 × 25 m: rangka HDPE PE100 Ø200 SDR26, 151 blok apung 100 L, faktor keamanan apung 2,0, freeboard ±20 cm.',
      'Tambat: gaya desain 9,0 kN/modul (FS 2,5) terhadap angin 15 m/s, arus 0,3 m/s, gelombang 0,3 m; biaya Rp401 ribu/m².'],
    table: () => ({ head: ['Parameter', 'Kangkung', 'Selada air', 'Total'], rows: [['Luas efektif (m²)', '9.600', '6.400', '16.000'], ['Jarak tanam', '20×20 cm (25/m²)', '25×25 cm (16/m²)', '342.400 posisi'], ['Siklus panen', '28 hari', '40 hari', 'bergilir 40 blok'], ['Biomassa (t basah/tahun)', '346', '184', '530'], ['N terangkut (t/tahun)', '0,774', '0,369', '1,14'], ['P terangkut (t/tahun)', '0,061', '0,044', '0,105']] }) },
  { id: 'tree', t: 'Issue tree', ico: 'i-link', figs: ['R2_1_Dinamika_eceng_gondok_vs_panen', 'R2_2_Issue_tree_terintegrasi', 'R2_3_Matriks_keselarasan_kasus'],
    lead: 'Akar masalah dirumuskan kuantitatif: regrowth eceng gondok (MSY ±774 t basah/hari pada r = 0,03/hari dan tikar 430 ha × 24 kg/m²) melebihi kapasitas kendali, sementara biomassa terpanen diperlakukan sebagai limbah.',
    kpi: [['±774', 't/hari', 'regrowth maksimum (MSY)'], ['83', 'TSI-P', 'hipereutrofik'], ['23', 'hari', 'waktu ganda tikar'], ['±90%', 'kadar air', 'beban pengolahan awal']],
    cards: [['A · Sumber', 'Mengapa terus tumbuh: beban N/P KJA 100.000 petak, TSI-P 83, waktu ganda 23 hari.', 'EFB di zona intake', 't N/P terangkut, TN & TSI zona, DO'],
      ['B · Pengendalian', 'Mengapa penanganan tidak efektif: ekskavator reaktif, trash boom 1,4 km jebol pada 243 m³/s, downtime Rp17,07 juta/jam-unit.', 'Panen terarah 200 → 300 t/hari', 'jam-unit downtime dihindari, Rp/ton'],
      ['C · Hilir', 'Mengapa biomassa menjadi beban: kadar air ±90%, belum ada rantai nilai, risiko pelepasan ulang nutrien.', 'Multi-feedstock biorefinery', 'L etanol, % energi mandiri, % massa tervalorisasi']] },
  { id: 'bio', t: 'Biorefinery & plant', ico: 'i-factory', figs: ['R3_1_Sankey_neraca_massa_biorefinery', 'R3_2_Energi_mandiri_biorefinery', 'R3_3_Dari_biaya_ke_nilai_PLN', 'R3_4_Area_plant_design', 'R3_5_Kandungan_pressate_digestat', 'R3_6_Parameter_proses_kemurnian_produk'],
    lead: 'Alih-alih ekskavasi terus-menerus lalu dibuang, eceng gondok diolah menjadi bioetanol 2G, sementara panas dan listrik pabrik dibangkitkan mandiri dari residu prosesnya.',
    kpi: [['21,4', 'L/t', 'bioetanol 99,5% v/v per ton basah'], ['12,5', 'Nm³/t', 'biogas per ton basah'], ['1,50 / 0,20', 'kg/t', 'N / P keluar dari waduk'], ['95%', 'listrik', 'dari CHP; 100% uap dari biogas']],
    pts: ['HEN memulihkan 39,47 dari 75,62 GJ/hari; biogas 65,75 GJ/hari menutup bahan bakar boiler 51,03 GJ/hari; surplus 14,72 GJ/hari ke CHP.',
      'Energi berasal dari biogas stillage SSF (98,5%) dan residu biomassa EFB (1,5%) melalui rantai biogas, boiler, dan CHP.',
      'Bagi PLN (300 t/hari): kontrak jasa Rp57,6 M/tahun menggantikan biaya lama; manfaat bersih positif bila biaya lama ≥ ±Rp580.000/t, ditambah Rp0,68–4,10 M/tahun downtime terhindarkan.',
      'Pressate dan digestat perlu dipekatkan ±5× dan ±3× untuk memenuhi POC (N+P₂O₅+K₂O 2–6%); mengganti NaOH dengan NH₄OH/Ca(OH)₂ menambah N pupuk dan mengendapkan sulfat.'],
    table: () => ({ head: ['Produk', 'Kemurnian / spesifikasi', 'Laju'], rows: P.specs }) },
  { id: 'sota', t: 'State-of-the-art', ico: 'i-chart', figs: ['R4_1_SOTA_EFB_benchmark', 'R4_2_SOTA_biorefinery_benchmark', 'R4_3_SOTA_vs_konvensional'],
    lead: 'MCDA delapan kriteria atas sepuluh pendekatan menempatkan CIRATA-RESILIENT (4,53) jauh di atas EFB/FTW saja (3,30), pembatasan KJA (3,15), biokontrol (2,65), dan cara eksisting ekskavator (2,55) maupun trash boom (2,38).',
    kpi: [['4,53', 'skor MCDA', 'tertinggi dari 10 pendekatan'], ['226', 'L/t DM', 'rendemen etanol (56% teoretis)'], ['±US$22', '/m²', 'modul EFB vs FTW US$38–377/m²'], ['−72%', 'TN', 'zona intake dengan EFB 10 ha']],
    pts: ['Trash boom dan ekskavator hanya menahan atau memindahkan gulma: tidak mengurangi nutrien dan biomassa menjadi limbah.',
      'Herbisida membuat tikar membusuk, menurunkan DO, dan mengembalikan nutrien; biokontrol Neochetina efektif setelah 3–5 tahun dan dapat resurgen.',
      'Aerasi, alum, dan pengerukan mahal per hektare, efeknya sementara, dan tidak menghasilkan pendapatan.'],
    table: () => ({ head: ['Aspek', 'Teknologi eksisting', 'CIRATA-RESILIENT'], rows: [['Penanganan gulma', 'Trash boom & ekskavator; herbisida; biokontrol 3–5 tahun', 'Panen terarah 200 → 540 t/hari + EFB di zona intake'], ['Kinerja EFB', 'EFB zeolit: TN 63,5%, TP 59,3%; Dianchi 555 ha: TN −45%', 'TN zona intake −28%/tahun (2 ha), −72% (10 ha)'], ['Biaya modul', 'Beemat US$38/m²; Biohaven US$377/m²', 'Rp400.000/m² ≈ US$22/m²'], ['Rendemen etanol', 'NREL ±330 L/t DM; eceng gondok 210–254 L/t', '226 L/t DM'], ['Skala 2G', 'Raízen 82 juta L/tahun; IOCL Panipat 100 kL/hari', '1,37 → 3,69 juta L/tahun'], ['Energi proses', 'Lignin dibakar di boiler', 'Biogas: 100% uap, 95% listrik'], ['Bahan baku', 'Dibeli, musiman', 'Dibayar sebagai jasa (Rp600.000/t)']] }) },
  { id: 'fin', t: 'Proyeksi finansial', ico: 'i-chart', figs: ['R5_1_Asumsi_dan_utilitas', 'R5_2_Diagram_arus_kas', 'R5_3_Struktur_pendapatan_OPEX', 'R5_4_MonteCarlo_NPV_IRR_PBP', 'R5_5_Tornado_Spearman', 'R5_6_Fan_chart_kumulatif'],
    lead: 'Model keuangan direkonstruksi (PPh badan 22%, depresiasi garis lurus 20 tahun, ekspansi 12 tahun) dan diuji Monte Carlo 20.000 iterasi dengan distribusi PERT pada rendemen, pasokan, OPEX, dan CAPEX.',
    kpi: [['91%', 'P(NPV > 0)', 'skenario kontrak'], ['Rp18,7 M', 'NPV P50', 'P5 −4,0 · P95 40,4'], ['12,3%', 'IRR P50', 'P5 9,5 · P95 14,9'], ['81%', 'iterasi', 'balik modal ≤ 10 tahun']],
    pts: ['Skenario kontrak: tarif jasa Rp600.000/t terkunci dan offtake bioetanol dengan harga dasar Rp10.500/L.',
      'Tanpa kontrak, variabel paling menentukan adalah tarif jasa (ρ = +0,76), OPEX (ρ = −0,44), dan harga etanol (ρ = +0,34).',
      'P(NPV > 0) naik dari 76% (tanpa kontrak) ke 87% (tarif terkunci) dan 91% (tarif + offtake); nilai sistem termasuk downtime PLN 99,5%.',
      'Struktur: jasa pengangkatan 72% pendapatan; panen dan logistik 41% OPEX tahap I.'],
    table: () => ({ head: ['Indikator', 'Full report', 'Rekonstruksi', 'P50 (P5–P95)'], rows: P.mc.map(r => [r[0], fmt(r[1], 2), fmt(r[2], 2), `${fmt(r[3], 1)} (${fmt(r[4], 1)} s.d. ${fmt(r[5], 1)})`]) }) },
  { id: 'impact', t: 'Dampak', ico: 'i-recycle', figs: ['R6_1_Tiga_pilar_dampak', 'R6_2_Nol_limbah_sebelum_sesudah'],
    lead: 'Dampak dikerucutkan menjadi tiga pilar: bioremediasi ramah lingkungan, upcycling biomassa, serta nilai dan keandalan bagi PLTA, dengan ≥98% massa keluaran masuk jalur produk, energi, atau pupuk.',
    kpi: [['97,0', 't N/tahun', '12,9 t P/tahun keluar permanen'], ['64.000', 't/tahun', 'eceng gondok menjadi produk'], ['Rp0,68–4,10 M', '/tahun', 'downtime PLTA terhindarkan'], ['1,2–1,6', 'kt CO₂e/tahun', 'emisi terhindarkan']],
    pts: ['Bioremediasi: TN zona intake turun 28% rata-rata tahunan dengan EFB 2 ha, tanpa bahan kimia dan dengan spesies native.',
      'Upcycling: 1,37 juta L bioetanol 99,5% v/v (2,05 juta L tahap II; 3,4 juta L Fase III), 480 kg polifenol/tahun, pupuk organik padat dan cair.',
      'Nilai: EBITDA Rp14,4 → 25,2 M/tahun dan intensitas karbon −44% s.d. −60% dibanding bahan bakar fosil.'] },
  { id: 'road', t: 'Roadmap & dinamika', ico: 'i-rotate', figs: ['R7_1_Kapasitas_maksimum_roadmap', 'R7_2_Penurunan_laju_tumbuh_eceng_gondok', 'R7_3_Titik_selesai_dan_feed_alternatif'],
    lead: 'Kapasitas berkelanjutan dibatasi regrowth: batas panen aman 70% MSY ≈ 540 t/hari, sehingga plant dapat tumbuh hingga ±2,7× kapasitas tahap I tanpa menghabiskan stok.',
    kpi: [['540', 't/hari', 'batas panen aman (70% MSY)'], ['±333', 'ha', 'tutupan setimbang pada 540 t/hari'], ['−45%', 'laju tumbuh', 'skenario pemulihan penuh'], ['Tahun ke-13', '', 'TP < 100 µg/L (S4)']],
    pts: ['Eutrofikasi teratasi bila: TP < 100 µg/L dan TN ≤ 1.900 µg/L; tutupan < 62 ha selama dua musim hujan; nol downtime akibat gulma 12 bulan; pasokan < 50% kapasitas.',
      'Di skala waduk, EFB dan panen saja menurunkan r < 1% karena beban eksternal ±5.380 t N dan ±1.290 t P/tahun; kontrol sumber KJA tetap diperlukan.',
      'Feed alternatif saat gulma berkurang: kebun biomassa EFB 50 ha (±0,24 juta L/tahun), gulma kaskade Saguling–Jatiluhur, jerami padi Cianjur–Purwakarta–Bandung Barat, dan rumput gajah.'],
    table: () => ({ head: ['Skenario 25 tahun', 'TN akhir (mg/L)', 'TP akhir (µg/L)', 'Penurunan r', 'Tutupan akhir (ha)'], rows: P.dyn.map(r => [r[0], fmt(r[1], 2), r[2], r[3], r[4] ? r[4] : '±0']) }) },
];
let LB = null;
export function lightbox(items, i) {
  const lb = $('#lightbox'), img = lb.querySelector('img'), cap = lb.querySelector('figcaption');
  if (!LB) {
    LB = { items: [], cur: 0, last: document.activeElement };
    const open = k => { LB.cur = (k + LB.items.length) % LB.items.length; img.src = LB.items[LB.cur][0]; img.alt = LB.items[LB.cur][2]; cap.textContent = LB.items[LB.cur][2]; lb.hidden = false; lb.querySelector('.lb-x').focus(); };
    LB.open = open;
    const close = () => { lb.hidden = true; if (LB.last) LB.last.focus(); };
    lb.querySelector('.lb-x').onclick = close; lb.querySelector('.lb-p').onclick = () => open(LB.cur - 1); lb.querySelector('.lb-n').onclick = () => open(LB.cur + 1);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') open(LB.cur + 1); if (e.key === 'ArrowLeft') open(LB.cur - 1); e.stopPropagation(); }, true);
  }
  LB.items = items; LB.last = document.activeElement; LB.open(i);
}
const figCap = b => b.replace(/^R(\d)_(\d+)_/, '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
function analisis() {
  const host = $('#analisisTabs'); if (!host) return;
  host.innerHTML = AN.map((a, i) => `<button role="tab" aria-selected="${!i}" data-an="${a.id}"><svg><use href="#${a.ico}"/></svg>${a.t}</button>`).join('');
  const show = id => {
    const a = AN.find(x => x.id === id);
    $$('#analisisTabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.an === id));
    const items = a.figs.map(f => [`assets/img/fig/${f}.jpg`, `assets/img/fig/t_${f}.jpg`, figCap(f)]);
    $('#analisisBody').innerHTML = `<p class="an-lead">${a.lead}</p>
      <div class="tiles an-kpi">${a.kpi.map(k => `<div class="kt"><div class="kl">${k[2]}</div><div class="kv2">${k[0]}<small> ${k[1]}</small></div></div>`).join('')}</div>
      ${a.cards ? `<div class="an-cards">${a.cards.map(c => `<article class="card"><h4>${c[0]}</h4><p>${c[1]}</p><div class="an-mod"><span>Modul</span><b>${c[2]}</b></div><div class="an-mod"><span>KPI</span><b>${c[3]}</b></div></article>`).join('')}</div>` : ''}
      <div class="an-grid"><div>${a.pts ? `<ul class="ticks">${a.pts.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}${a.table ? `<div class="an-tbl">${tableHTML(a.table())}</div>` : ''}</div>
      <div class="an-figs">${items.map((it, i) => `<button data-i="${i}" aria-label="Perbesar ${esc(it[2])}"><img src="${it[1]}" alt="${esc(it[2])}" loading="lazy" width="420" height="230"><span>${esc(it[2])}</span></button>`).join('')}</div></div>`;
    $$('#analisisBody .an-figs button').forEach(b => b.onclick = () => lightbox(items, +b.dataset.i));
  };
  $$('#analisisTabs button').forEach(b => b.onclick = () => show(b.dataset.an));
  show(AN[0].id);
}
