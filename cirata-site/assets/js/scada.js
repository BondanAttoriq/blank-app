// SCADA/HMI CIRATA-RESILIENT: 7 layar dari PFD biorefinery (Area 100–700), mode DESIGN (neraca D200) dan SIMULASI.
// Topologi & nilai: streams.json (dari/ke), neraca.json (laju), pipa.json (T, P, DN). Tata letak: scada-layout.json.
import { $, $$, fmt, fmtAuto, esc, emit, getJSON, loadRegister, MEDIUM, isMobile } from './util.js';
import { defs, symbol, meshPattern, hexConn, diamond, valve } from './scada-symbols.js';

const NS = 'http://www.w3.org/2000/svg';
const KEY_UNITS = new Set(['EFB-101', 'H-103', 'CV-104', 'HP-105', 'S-201', 'M-202', 'E-203', 'R-204', 'T-205', 'P-206', 'P-207', 'P-209', 'E-302', 'R-301A', 'R-301B', 'P-304', 'E-401',
  'C-401', 'E-402', 'V-403', 'Z-406', 'TK-408', 'E-405', 'E-501', 'TK-502', 'P-503', 'R-504', 'V-505', 'D-506', 'K-507', 'FL-508', 'X-509', 'B-601', 'K-602', 'P-605', 'D-604',
  'X-701', 'F-702', 'EV-703', 'TK-704', 'U-705', 'TK-208']);
const HOT_U = new Set(['B-601', 'EV-703', 'E-405', 'FL-508']);   // unit panas: badan merah seperti HMI klasik
const ALARM_KEYS = ['S-01', 'S-10', 'S-12', 'S-13E', 'S-14C', 'S-16', 'S-17', 'S-21'];

export async function init() {
  const [L, REG] = await Promise.all([getJSON('assets/data/scada-layout.json'), loadRegister()]);
  const svg = $('#scSvg'), screenEl = $('#scScreen'), pop = $('#scPop'), face = $('#scFace');
  const UNITS = L.units, STREAMS = L.streams;
  const D = {};      // nilai desain (neraca) per aliran
  for (const sid of Object.keys(STREAMS)) { const s = REG.ST[sid]; D[sid] = s && s.q !== null && s.qst !== 'SIAGA' ? s.q : null; }
  const UNIT_STREAMS = {}; for (const sid of Object.keys(STREAMS)) { const s = REG.ST[sid]; if (!s) continue; (UNIT_STREAMS[s.from_tag] ||= { i: [], o: [] }).o.push(sid); (UNIT_STREAMS[s.to_tag] ||= { i: [], o: [] }).i.push(sid); }

  // ------------------------------------------------ state simulasi
  const S = { mode: 'design', speed: 1, paused: false, t: Date.now(), feed: 1, yld: 1, efb: true, boiler: true, run: {}, man: {} };
  const V = {}, N = {}, HIST = {};
  const resetValues = () => { for (const sid in D) { V[sid] = D[sid] ?? 0; N[sid] = 0; HIST[sid] = []; } V['FUEL'] = 0; };
  resetValues();
  const R = t => S.run[t] !== false;
  const all = a => a.every(R) ? 1 : 0;
  // model proses berantai: panen → pretreatment → SSF → distilasi → AD → boiler (faktor 0..1 terhadap desain D200)
  function targets() {
    const fd = S.feed * all(['H-103', 'CV-104', 'HP-105']);
    const press = fd * (R('S-201') ? 1 : 0);
    const steam = S.boiler && all(['B-601', 'K-602', 'P-605', 'D-604']) ? 1 : 0;
    const slurry = press * all(['M-202', 'E-203', 'R-204', 'P-206', 'T-205', 'P-207', 'P-209', 'E-302']) * steam;
    const beer = slurry * all(['R-301A', 'R-301B']);
    const dist = all(['P-304', 'E-401', 'C-401', 'E-402', 'V-403', 'E-405']) * steam;
    const eth = beer * dist * S.yld * (R('Z-406') ? 1 : 0);
    const still = beer * dist, st1 = still * (R('E-501') ? 1 : 0);
    const efb = S.efb && R('EFB-101') ? 1 : 0;
    const poly = efb * all(['X-701', 'F-702']), polyE = poly * (R('EV-703') ? 1 : 0);
    const ad = all(['TK-502', 'P-503', 'R-504']);
    const gas = ad * (0.985 * st1 + 0.015 * efb);
    const gasOK = gas * all(['V-505', 'D-506', 'K-507']);
    const toBoiler = steam ? Math.min(gasOK, 1) : 0;
    const fuel = steam ? Math.max(0, 1 - gasOK) : 0;                        // defisit bahan bakar ditutup BBM cadangan
    const dem = steam ? Math.max(0.05, 0.128 * slurry + 0.76 * beer * dist + 0.111 * eth / Math.max(S.yld, 1e-6) + 0.001 * polyE) : 0;
    const f = {
      'S-00': S.feed * (R('H-103') ? 1 : 0), 'S-00b': S.feed * all(['H-103']), 'S-00c': S.feed * all(['H-103', 'CV-104']), 'S-01': fd,
      'B-1': efb * 1, 'B-2': efb * (R('X-701') ? 1 : 0), 'S-02': press, 'P-1': press * (R('TK-208') ? 1 : 0), 'S-02P': press * all(['TK-208', 'U-705']),
      'S-03': press, 'S-04': press * (R('M-202') ? 1 : 0), 'S-05': press * all(['M-202', 'E-203']), 'S-06': slurry, 'S-07': slurry, 'S-08': slurry, 'S-09': slurry,
      'S-10': slurry, 'S-10b': slurry, 'S-10c': slurry, 'S-12A': beer, 'S-11': beer * S.yld, 'S-12': beer, 'S-12b': beer, 'S-12c': beer * (R('P-304') ? 1 : 0),
      'S-14': still, 'ST-1': still, 'S-14C': st1, 'V-401': beer * dist, 'L-402': beer * dist, 'L-403': beer * dist, 'S-13': eth, 'S-13E': eth, 'E-1': eth > 0 && poly ? 1 : 0,
      'L-405': beer * dist, 'V-405': beer * dist, 'B-3': poly, 'W-AD': ad, 'S-23P': poly, 'S-23F': poly, 'S-23': polyE, 'S-24': polyE,
      'S-17': gas, 'S-17b': gas * (R('V-505') ? 1 : 0), 'S-17c': gasOK, 'S-17C': toBoiler, 'G-EX': gasOK * (steam ? 1 : 4.47) * (R('FL-508') ? 1 : 0),
      'S-18': ad * (0.633 * st1 + 0.022 * efb + 0.008 * poly + 0.337), 'S-18A': 0, 'S-18B': 0,
      'S-19': steam * dem, 'S-20': steam * dem, 'S-21': steam * dem, 'W-BFW': steam * dem, 'W-BFW+RET': steam * dem, 'W-1': steam * dem,
      'H-01': steam * slurry, 'H-02': steam * beer * dist, 'H-04': steam * polyE, 'H-05': steam * eth,
      'EL-00': Math.max(0.15, 0.35 * fd + 0.45 * ad + 0.2 * steam),
    };
    f['S-18A'] = f['S-18'] * (R('X-509') ? 1 : 0); f['S-18B'] = f['S-18A'];
    const T = {};
    for (const sid in D) { if (D[sid] === null) continue; T[sid] = D[sid] * (f[sid] ?? 1); }
    T['S-16'] = (D['S-14C'] * st1 + D['B-1'] * efb + D['B-3'] * poly + D['W-AD'] * ad) * (R('TK-502') ? 1 : 0); T['S-16b'] = T['S-16'] * (R('P-503') ? 1 : 0);
    T['FUEL'] = 51.03 * fuel;
    return { T, meta: { fd, slurry, beer, eth, gas, steam, fuel, efb, poly } };
  }
  const tau = sid => /^EL/.test(sid) ? 3 : /^(S-1[78]|G-EX|S-17)/.test(sid) ? 12 : /^(S-2|H-|W-|FUEL)/.test(sid) ? 6 : /^S-0/.test(sid) ? 5 : 8;
  let META = targets().meta;
  function stepSim(dt) {
    const { T, meta } = targets(); META = meta;
    for (const sid in T) { if (V[sid] === undefined) V[sid] = 0; const k = 1 - Math.exp(-dt / tau(sid)); V[sid] += (T[sid] - V[sid]) * k; if (Math.abs(V[sid]) < 1e-5) V[sid] = 0; }
    for (const sid in N) { const s = REG.ST[sid]; if (s && S.man[s.from_tag]) continue; N[sid] = Math.max(-0.02, Math.min(0.02, N[sid] + (Math.random() - 0.5) * 0.006 * Math.sqrt(dt))); }
  }
  const val = sid => S.mode === 'design' ? D[sid] : (D[sid] === null && sid !== 'FUEL' ? null : (V[sid] ?? 0) * (1 + (N[sid] || 0)));
  const ratio = sid => { const d = D[sid]; if (S.mode === 'design') return 1; if (sid === 'FUEL') return V['FUEL'] > 0.5 ? 1 : 0; if (!d) return 1; return V[sid] / d; };

  // ------------------------------------------------ KPI
  const NM3 = 3647 / 4.838;   // Nm³ biogas per t biogas mentah (neraca D200)
  function kpis() {
    const g = sid => val(sid) ?? 0;
    const heat = S.mode === 'design' ? 100 : (g('S-21') > 0.01 ? 100 * Math.min(1, g('S-17C') / Math.max(1e-6, D['S-17C'] * g('S-21') / D['S-21'])) : 0);
    return [['Eceng gondok', g('S-01'), 't/hari', 200], ['Bioetanol 2G', g('S-13E'), 't/hari', 3.183], ['Biogas', g('S-17') * NM3, 'Nm³/hari', 3647],
      ['Steam 10 bar', g('S-21'), 't/hari', 15.657], ['Panas dari biogas', heat, '%', 100], ['N terangkut', 1.5 * g('S-01'), 'kg/hari', 300], ['Digestat', g('S-18'), 't/hari', 130.964]];
  }
  const kpiEl = $('#scKpi');
  kpiEl.innerHTML = kpis().map((k, i) => `<div class="sk" data-k="${i}"><span>${k[0]}</span><b class="num">0</b><small>${k[2]}</small></div>`).join('');
  function drawKpi() {
    kpis().forEach((k, i) => { const el = kpiEl.children[i]; el.querySelector('b').textContent = fmt(k[1], k[1] >= 1000 ? 0 : k[1] >= 100 ? 1 : 2); const r = k[3] ? k[1] / k[3] : 1; el.className = 'sk' + (r < 0.5 ? ' alarm' : r < 0.9 ? ' warn' : ''); });
  }
  // ------------------------------------------------ alarm
  const AL = new Map(); let alarmSeq = 0;
  const alarmList = $('#scAlarmList');
  function raise(key, cond, text, pr, tag) {
    const a = AL.get(key);
    if (cond) { if (!a || !a.active) AL.set(key, { key, text, pr, tag, t: S.t, active: true, ack: false, seq: ++alarmSeq }); else a.text = text; }
    else if (a && a.active) { a.active = false; a.tc = S.t; }
  }
  function evalAlarms() {
    if (S.mode !== 'sim') return;
    for (const t of Object.keys(S.run)) raise('stop:' + t, S.run[t] === false, `${t} dihentikan operator (Stop)`, 'lo', t);
    for (const sid of ALARM_KEYS) {
      const r = ratio(sid), s = REG.ST[sid];
      raise('lo:' + sid, r < 0.5 && r >= 0.1, `Aliran ${sid} rendah: ${fmt(r * 100, 0)}% desain (${s.pfd_name})`, 'md', s.to_tag);
      raise('ll:' + sid, r < 0.1, `Aliran ${sid} terhenti (${s.pfd_name})`, 'hi', s.to_tag);
    }
    raise('boiler', !S.boiler, 'Boiler biogas B-601 offline: steam 10 bar hilang, pretreatment & distilasi berhenti', 'hi', 'B-601');
    raise('fuel', META.fuel > 0.02 && META.steam, `Biogas kurang: BBM cadangan menutup ${fmt(META.fuel * 100, 0)}% bahan bakar boiler`, 'md', 'B-601');
    raise('efb', !S.efb, 'Panen EFB dihentikan: ekstraksi polifenol & co-feed EFB berhenti, serapan N/P EFB tertunda', 'lo', 'EFB-101');
    raise('yld', S.yld < 0.9, `Rendemen SSF rendah: ${fmt(S.yld * 100, 0)}% desain (periksa enzim, pH, suhu 35 °C)`, 'md', 'R-301B');
    raise('feed', S.feed > 1.05, 'Laju panen eceng gondok di atas desain (>105%)', 'md', 'HP-105');
    raise('feedlo', S.feed < 0.8, `Pasokan eceng gondok ${fmt(S.feed * 100, 0)}%: NPV turun tajam di bawah 80% kapasitas`, 'md', 'H-103');
  }
  const timeStr = t => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':');
  function drawAlarms() {
    const arr = [...AL.values()].sort((a, b) => (b.active - a.active) || (a.ack - b.ack) || ({ hi: 0, md: 1, lo: 2 }[a.pr] - { hi: 0, md: 1, lo: 2 }[b.pr]) || b.seq - a.seq).slice(0, 40);
    const act = arr.filter(a => a.active).length; $('#scAlarmCount').textContent = `${act} aktif · ${arr.filter(a => a.active && !a.ack).length} belum di-acknowledge`;
    alarmList.innerHTML = arr.length ? arr.map(a => `<li class="${a.pr} ${a.active ? 'active' : 'cleared'} ${a.ack ? 'ack' : 'unack'}"><span>${timeStr(a.t)}</span><span class="pr">${{ hi: 'TINGGI', md: 'SEDANG', lo: 'RENDAH' }[a.pr]}</span><span>${esc(a.text)}${a.active ? '' : ' · normal kembali'}</span>${a.active && !a.ack ? `<button data-ack="${esc(a.key)}">ACK</button>` : `<span>${a.ack ? 'ACK' : ''}</span>`}</li>`).join('')
      : `<li class="sa-empty">${S.mode === 'design' ? 'Mode DESIGN: tidak ada alarm. Aktifkan SIMULASI untuk menguji gangguan.' : 'Tidak ada alarm aktif.'}</li>`;
    alarmList.querySelectorAll('[data-ack]').forEach(b => b.onclick = () => { const a = AL.get(b.dataset.ack); if (a) a.ack = true; drawAlarms(); });
    // tanda status tab
    $$('#scTabs button').forEach(b => { const sc = SCREENS.find(s => s.id === b.dataset.id); const tags = sc.unitSet; let lv = '';
      for (const a of AL.values()) if (a.active && tags.has(a.tag)) { if (a.pr === 'hi') lv = 'alarm'; else if (!lv && a.pr === 'md') lv = 'warn'; }
      b.querySelector('.tdot').className = 'tdot ' + lv; });
  }
  $('#scAckAll').onclick = () => { for (const a of AL.values()) a.ack = true; drawAlarms(); };

  // ------------------------------------------------ layar
  const SCREENS = L.screens.map(sc => {
    const inPane = (x, y, m = 4) => sc.panes.some(([px, py, pw, ph]) => x >= px - m && x <= px + pw + m && y >= py - m && y <= py + ph + m);
    const units = Object.keys(UNITS).filter(t => inPane(UNITS[t].x, UNITS[t].y, -2));
    const streams = Object.keys(STREAMS).filter(sid => STREAMS[sid].s.some(seg => seg.some(p => inPane(p[0], p[1], 0))));
    const tableIds = streams.filter(sid => { const st = STREAMS[sid]; const pts = st.d ? [st.d] : (st.hex || []).concat(st.s.flat()); return pts.some(p => inPane(p[0], p[1], 0)); });
    return { ...sc, units, streams, tableIds, unitSet: new Set(units) };
  });
  $('#scTabs').innerHTML = SCREENS.map((s, i) => `<button role="tab" aria-selected="${i === 0}" data-id="${s.id}"><span class="tdot"></span>${esc(s.t)}</button>`).join('');
  $$('#scTabs button').forEach(b => b.onclick = () => show(b.dataset.id));
  let cur = null, refs = null;
  // warna medium digelapkan agar kontras di latar putih
  const dk = (hex, f = 0.74) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
  const colOf = sid => dk((MEDIUM[REG.ST[sid]?.medium] || ['#9FB5AC'])[0]);

  function paneTransforms(sc) {
    const reg = sc.table ? [16, 24, 1368, 1032] : [16, 16, 1888, 1048];
    const n = sc.panes.length, gap = 24, hEach = (reg[3] - gap * (n - 1)) / n;
    const fits = sc.panes.map(([x, y, w, h]) => { const s = Math.min(reg[2] / w, hEach / h); return { x, y, w, h, s, W: w * s, H: h * s }; });
    const tot = fits.reduce((a, f) => a + f.H, 0) + gap * (n - 1); let yy = reg[1] + (reg[3] - tot) / 2;
    return fits.map(f => { const o = { ...f, dx: reg[0] + (reg[2] - f.W) / 2, dy: yy }; yy += f.H + gap; return o; });
  }
  function render(sc) {
    const P = paneTransforms(sc); let g = `<defs>${defs()}${meshPattern}${P.map((p, i) => `<clipPath id="clip${i}"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}"/></clipPath>`).join('')}</defs>`;
    g += `<g class="hmi">`;
    P.forEach((p, pi) => {
      const inP = (x, y, m) => x >= p.x - m && x <= p.x + p.w + m && y >= p.y - m && y <= p.y + p.h + m;   // hanya isi milik pane ini (tanpa salinan tersembunyi)
      const paneStreams = sc.streams.filter(sid => STREAMS[sid].s.some(seg => seg.some(q => inP(q[0], q[1], 0))));
      const paneUnits = sc.units.filter(t => inP(UNITS[t].x, UNITS[t].y, -2));
      const k = 1 / Math.sqrt(p.s), fs = 12 * k;
      g += `<g transform="translate(${p.dx} ${p.dy}) scale(${p.s}) translate(${-p.x} ${-p.y})"><g clip-path="url(#clip${pi})">`;
      if (P.length > 1 || sc.table) g += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="none" stroke="#B9C3CA" stroke-width="${1.5 * k}" rx="${8 * k}"/>`;
      for (const a of L.areas || []) g += `<rect class="areab" x="${a[0]}" y="${a[1]}" width="${a[2]}" height="${a[3]}" rx="${6 * k}" stroke-width="${1.2 * k}"/><text class="areal" x="${a[0] + 10 * k}" y="${a[1] + a[3] - 10 * k}" font-size="${fs * 1.05}">${esc(a[4])}</text>`;
      for (const b of L.boxes) g += `<rect class="boxd" x="${b.r[0]}" y="${b.r[1]}" width="${b.r[2]}" height="${b.r[3]}" stroke-width="${1.2 * k}"/><text class="boxl" x="${b.lp[0]}" y="${b.lp[1]}" font-size="${fs * .95}">${esc(b.l)}</text>`;
      // aliran: pipa bergaris ganda (bingkai gelap + isi terang) dengan garis alir berwarna medium di tengah.
      // Lapisan digambar terpisah (bingkai → isi → alir → aksesori) agar sambungan pipa menyatu rapi.
      let gO = '', gI = '', gF = '', gT = '', gV = '';
      for (const sid of paneStreams) {
        const st = STREAMS[sid], col = colOf(sid), sig = /^EL-|^H-03$/.test(sid);
        for (const seg of st.s) {
          const pts = seg.map(q => q.join(',')).join(' ');
          if (sig) {   // listrik / sinyal: garis tunggal putus-putus
            gF += `<polyline class="sline sig" data-sid="${sid}" points="${pts}" stroke="${col}" stroke-opacity=".55" stroke-width="${1.8 * k}" stroke-dasharray="${6 * k} ${3 * k} ${1.5 * k} ${3 * k}"/>`;
            gF += `<polyline class="sflow" data-flow="${sid}" points="${pts}" stroke="${col}" stroke-width="${1.8 * k}" style="stroke-dasharray:${9 * k} ${5 * k}"/>`;
          } else {
            gO += `<polyline class="sline pipe-o" data-sid="${sid}" points="${pts}" stroke-width="${6.6 * k}"/>`;
            gI += `<polyline class="sline pipe-i" data-sid="${sid}" points="${pts}" stroke-width="${4 * k}"/>`;
            gF += `<polyline class="sflow" data-flow="${sid}" points="${pts}" stroke="${col}" stroke-width="${1.9 * k}" style="stroke-dasharray:${9 * k} ${5 * k}"/>`;
          }
          gT += `<polyline data-hit="${sid}" points="${pts}" stroke="transparent" stroke-width="${12 * k}" fill="none" style="cursor:pointer"/>`;
          const a = seg[seg.length - 2], b = seg[seg.length - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
          gT += `<polygon class="parw" points="0,0 ${-9 * k},${-5 * k} ${-9 * k},${5 * k}" transform="translate(${b[0]} ${b[1]}) rotate(${ang})"/>`;
        }
      }
      for (const sid of paneStreams) {
        const st = STREAMS[sid], col = colOf(sid);
        if (st.v) gT += `<g transform="translate(${st.v[0]} ${st.v[1]}) scale(${k}) translate(${-st.v[0]} ${-st.v[1]})">${valve(st.v[0], st.v[1], st.v[2])}</g>`;
        for (const h of st.hex || []) gT += `<g class="dia" data-sid="${sid}" transform="translate(${h[0]} ${h[1]}) scale(${k})" tabindex="0" role="button" aria-label="Aliran ${sid}">${hexConn(0, 0, h[2], col).replace(/translate\([^)]*\)/, 'translate(0 0)')}</g>`;
        if (st.d) gT += `<g class="dia" data-sid="${sid}" transform="translate(${st.d[0]} ${st.d[1]}) scale(${k})" tabindex="0" role="button" aria-label="Aliran ${sid}">${diamond(0, 0, /^S-\d/.test(sid) ? sid.slice(2) : sid, col)}</g>`;
        if (sc.table && st.d && D[sid] !== null) {   // kotak nilai putih (angka + satuan) seperti indikator HMI
          const vs = fmtAuto(D[sid]), u = REG.ST[sid]?.u || '', bw = Math.max(5, vs.length + 1) * 6.3 + u.length * 4.9 + 12;
          const vx = st.d[0] + 12 * k + bw * k > p.x + p.w - 4 ? st.d[0] - 12 * k - bw * k : st.d[0] + 12 * k;   // balik ke kiri bila terpotong tepi panel
          gV += `<g class="vbox" transform="translate(${vx} ${Math.max(p.y + 2, st.d[1] - 25 * k)}) scale(${k})"><rect width="${bw}" height="16" rx="1.5"/><text class="vtag" data-v="${sid}" x="5" y="11.6" font-size="10.5">${vs}</text><text class="vunit" x="${bw - 4}" y="11.6" text-anchor="end" font-size="8.6">${esc(u)}</text></g>`;
        }
      }
      g += gO + gI + gF + gT;
      // unit
      for (const tag of paneUnits) {
        const u = UNITS[tag]; const e = REG.EQ[tag];
        if (u.t === 'label') { g += `<text x="${u.x}" y="${u.y}" text-anchor="middle" font-size="${fs}" font-style="italic" fill="#4B5862">${esc(u.n)}</text>`; continue; }
        if (u.t === 'term') { g += `<g class="term" transform="translate(${u.x} ${u.y})">${symbol('term', u.w, u.h, u.c)}<text y="${4 * Math.min(1.25, 1 / k * .75)}" text-anchor="middle" font-size="${Math.min(13, fs * 1.05)}" font-weight="700">${esc(u.n)}</text></g>`; continue; }
        if (u.t === 'node') { g += `<g transform="translate(${u.x} ${u.y})">${symbol('node', 6, 6, 'gray')}</g>`; continue; }
        const isEq = !!e && u.t !== 'bus';
        g += `<g class="unit" data-tag="${tag}" transform="translate(${u.x} ${u.y})" ${isEq ? `tabindex="0" role="button" aria-label="${esc(tag)} ${esc(e.name)}"` : ''}>`;
        g += `<rect class="ring" x="${-u.w / 2 - 6}" y="${-u.h / 2 - 6}" width="${u.w + 12}" height="${u.h + 12}" rx="8" stroke-width="${2.4 * k}"/>`;
        g += `<g class="ubody">${symbol(u.t, u.w, u.h, HOT_U.has(tag) ? 'hot' : u.c)}</g>`;
        if (u.t === 'header') g += `<text y="-4" text-anchor="middle" class="tagt" font-size="${fs * 1.1}" style="fill:#fff">${tag}</text><text y="${14 * k + 4}" text-anchor="middle" font-size="${fs}" style="fill:#FFE9E6">${esc(u.n || '')}</text>`;
        if (u.t === 'intake') g += (u.n || '').split('|').map((t, i, arr) => `<text y="${(i - (arr.length - 1) / 2) * 14 + 4}" text-anchor="middle" font-size="${i ? 11 : 12}" font-weight="${i ? 500 : 700}">${esc(t)}</text>`).join('');
        else if (u.lab && u.nt) { const [dx, dy, an] = u.lab; g += `<text x="${dx}" y="${dy}" text-anchor="${an}" class="namet" font-size="${fs}" font-style="italic">${esc(u.n || '')}</text>`; }
        else if (u.lab) { const [dx, dy, an] = u.lab; g += `<text x="${dx}" y="${dy}" text-anchor="${an}" class="tagt" font-size="${fs * 1.08}">${tag}</text><text x="${dx}" y="${dy + 14 * k}" text-anchor="${an}" class="namet" font-size="${fs}">${esc(u.n || e?.name || '')}</text>`; }
        if (KEY_UNITS.has(tag)) g += `<rect class="lamp run" data-lamp="${tag}" x="${u.w / 2 - 2 - 5 * k}" y="${-u.h / 2 + 2 - 5 * k}" width="${10 * k}" height="${10 * k}" rx="${1.5 * k}"/>`;
        g += `</g>`;
      }
      g += gV + `</g></g>`;
    });
    // tabel aliran layar
    if (sc.table) {
      const ids = sc.tableIds, x0 = 1400, y0 = 24, w = 504, rh = Math.min(38, (1032 - 60) / Math.max(1, ids.length));
      g += `<rect class="panelbg" x="${x0}" y="${y0}" width="${w}" height="1032" rx="12"/><rect class="ptbar" x="${x0}" y="${y0}" width="${w}" height="44" rx="12"/><rect class="ptbar" x="${x0}" y="${y0 + 24}" width="${w}" height="20"/><text class="ptitle" x="${x0 + 16}" y="${y0 + 28}">ALIRAN PADA LAYAR INI</text>`;
      g += `<text x="${x0 + 16}" y="${y0 + 52}" font-size="12" class="thd">No</text><text x="${x0 + 240}" y="${y0 + 52}" font-size="12" class="thd" text-anchor="end">Laju</text><text x="${x0 + 250}" y="${y0 + 52}" font-size="12" class="thd">Satuan</text><text x="${x0 + 390}" y="${y0 + 52}" font-size="12" class="thd" text-anchor="end">T °C</text><text x="${x0 + 480}" y="${y0 + 52}" font-size="12" class="thd" text-anchor="end">P bar a</text>`;
      ids.forEach((sid, i) => {
        const y = y0 + 62 + i * rh, s = REG.ST[sid], p = s.pipe || {}, fz = Math.min(15, rh * 0.46);
        g += `<g class="prow" data-sid="${sid}" style="cursor:pointer"><rect x="${x0 + 6}" y="${y}" width="${w - 12}" height="${rh - 3}" rx="6" fill="transparent"/>
          <rect x="${x0 + 14}" y="${y + rh / 2 - 5}" width="10" height="8" rx="2" fill="${colOf(sid)}"/><text x="${x0 + 32}" y="${y + rh / 2 + 4}" font-size="${fz}" font-weight="700">${sid}</text>
          <text x="${x0 + 240}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="${fz}" data-t="${sid}" class="tval">${D[sid] === null ? 'n/a' : fmtAuto(D[sid])}</text>
          <text x="${x0 + 250}" y="${y + rh / 2 + 4}" font-size="${fz * .85}" class="tmut">${esc(s.u || '')}</text>
          <text x="${x0 + 390}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="${fz}">${p.T ?? '·'}</text><text x="${x0 + 480}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="${fz}">${p.P !== null && p.P !== undefined ? fmt(p.P, 1) : '·'}</text></g>`;
      });
    }
    g += `</g>`;
    svg.innerHTML = g;
    refs = { flows: $$('[data-flow]', svg), lines: $$('.sline', svg), vtags: $$('[data-v]', svg), cells: $$('[data-t]', svg), lamps: $$('[data-lamp]', svg), units: $$('.unit', svg) };
    wireSvg(); update();
  }
  function show(id, keepView) {
    const sc = SCREENS.find(s => s.id === id) || SCREENS[0]; cur = sc;
    $$('#scTabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.id === sc.id));
    hidePop(); face.hidden = true; if (!keepView) resetView(); render(sc); drawAlarms();
  }

  // ------------------------------------------------ pembaruan nilai
  function update() {
    if (!refs) return;
    for (const el of refs.flows) {
      const sid = el.dataset.flow, r = ratio(sid);
      const stop = r < 0.05; el.classList.toggle('stop', stop); el.classList.toggle('slow', !stop && r < 0.6); el.classList.toggle('fast', r > 1.05);
      if (S.paused && S.mode === 'sim') el.style.animationPlayState = 'paused'; else el.style.animationPlayState = '';
    }
    for (const el of refs.lines) el.classList.toggle('dim', ratio(el.dataset.sid) < 0.05);
    for (const el of refs.vtags) { const v = val(el.dataset.v); el.textContent = v === null ? 'n/a' : fmtAuto(v); }
    for (const el of refs.cells) { const v = val(el.dataset.t); el.textContent = v === null ? 'n/a' : fmtAuto(v); }
    for (const el of refs.lamps) {
      const t = el.dataset.lamp; let c = 'run';
      if (!R(t)) c = 'stop';
      else if (S.mode === 'sim') { for (const a of AL.values()) if (a.active && a.tag === t && a.pr !== 'lo') { c = a.pr === 'hi' ? 'alarm' : 'warn'; if (c === 'alarm') break; } }
      el.setAttribute('class', 'lamp ' + c);
    }
    for (const el of refs.units) el.classList.toggle('stopped', !R(el.dataset.tag));
    drawKpi(); if (!face.hidden) drawFace(); if (popSid) drawPop();
    $('#scClock').textContent = timeStr(S.mode === 'sim' ? S.t : Date.now());
  }

  // ------------------------------------------------ popover aliran & faceplate
  let popSid = null, popPin = false;
  function popHTML(sid) {
    const s = REG.ST[sid], p = s.pipe || {}, v = val(sid);
    return `<b>Aliran ${esc(sid)}</b> · ${esc(s.pfd_name)}<div class="r"><span>${esc(s.medium)}</span><span>${esc(s.from_tag)} → ${esc(s.to_tag)}</span></div>
      <div class="q">${v === null ? (s.qst === 'SIAGA' ? 'siaga' : 'n/a') : fmtAuto(v) + ' ' + esc(s.u)}</div>
      ${S.mode === 'sim' && D[sid] !== null ? `<div class="r"><span>Desain</span><span>${fmtAuto(D[sid])} ${esc(s.u)}</span></div>` : ''}
      <div class="r"><span>T</span><span>${p.T !== null && p.T !== undefined ? fmt(p.T, 0) + ' °C' : 'n/a'}</span></div><div class="r"><span>P</span><span>${p.P !== null && p.P !== undefined ? fmt(p.P, 2) + ' bar a' : 'n/a'}</span></div>
      <div class="r"><span>DN</span><span>${p.DN ? 'DN' + p.DN + (p.v !== null ? ' · ' + fmt(p.v, 1) + ' m/s' : '') : 'n/a'}</span></div><div class="r"><span>Status neraca</span><span>${esc(s.qst || 'n/a')}</span></div>`;
  }
  function drawPop() { if (popSid) pop.innerHTML = popHTML(popSid); }
  function showPop(sid, cx, cy, pin = false) {
    popSid = sid; popPin = pin; drawPop(); pop.hidden = false;
    const r = screenEl.getBoundingClientRect(); const x = cx - r.left, y = cy - r.top;
    pop.style.left = Math.max(6, Math.min(r.width - pop.offsetWidth - 6, x + 14)) + 'px'; pop.style.top = Math.max(6, Math.min(r.height - pop.offsetHeight - 6, y + 14)) + 'px';
    $$('.dia', svg).forEach(d => d.classList.toggle('sel', d.dataset.sid === sid && pin));
  }
  function hidePop() { popSid = null; popPin = false; pop.hidden = true; $$('.dia.sel', svg).forEach(d => d.classList.remove('sel')); }
  let faceTag = null;
  function faceVals(tag) {
    const us = UNIT_STREAMS[tag] || { i: [], o: [] }; const out = [];
    if (tag === 'EL-501') out.push(['Beban PEME', fmt((S.mode === 'sim' ? S.load : 1) * 100, 0) + ' %', null]);
    for (const sid of [...us.i, ...us.o]) { if (out.length >= 6) break; if (!STREAMS[sid]) continue; const v = val(sid); if (v === null) continue;
      out.push([`${us.i.includes(sid) ? 'Masuk' : 'Keluar'} ${sid}`, `${fmtAuto(v)} ${REG.ST[sid].u}`, sid]); }
    const mo = us.o.find(s => REG.ST[s]?.pipe?.T !== null && REG.ST[s]?.pipe?.T !== undefined);
    if (mo && out.length < 6) { const p = REG.ST[mo].pipe; out.push([`T / P keluar (${mo})`, `${fmt(p.T, 0)} °C · ${fmt(p.P, 1)} bar a`, null]); }
    return out;
  }
  function drawFace() {
    const tag = faceTag, e = REG.EQ[tag]; if (!e) return;
    const vals = faceVals(tag), tsid = (vals.find(v => v[2]) || [])[2];
    const running = R(tag), alarm = [...AL.values()].some(a => a.active && a.tag === tag && a.pr === 'hi');
    let trend = ''; if (tsid) { const h = HIST[tsid].length ? HIST[tsid] : [val(tsid)]; const d = D[tsid] || 1, mx = Math.max(d * 1.1, ...h), mn = Math.min(0, ...h);
      const pts = h.map((v, i) => `${(i / 59) * 300},${64 - (v - mn) / (mx - mn || 1) * 56}`).join(' ');
      trend = `<div class="fp-trend"><span>Trend 60 s · aliran ${tsid}</span><svg viewBox="0 0 300 70" preserveAspectRatio="none"><line x1="0" x2="300" y1="${64 - (d - mn) / (mx - mn || 1) * 56}" y2="${64 - (d - mn) / (mx - mn || 1) * 56}" stroke="#9AA3AA" stroke-dasharray="4 4"/><polyline points="${pts}" fill="none" stroke="#1F7A4D" stroke-width="2" vector-effect="non-scaling-stroke"/></svg></div>`; }
    face.innerHTML = `<div class="fp-h"><b>${esc(tag)}</b><small>${esc(e.name)}</small><button aria-label="Tutup faceplate" data-x><svg><use href="#i-close"/></svg></button></div>
      <div class="fp-b"><div class="fp-st"><span class="fp-pill ${alarm ? 'alarm' : running ? 'run' : 'stop'}">${alarm ? 'ALARM' : running ? 'RUNNING' : 'STOPPED'}</span>
      <button class="fp-pill mode" data-mode title="Ubah mode kendali">${S.man[tag] ? 'MAN' : 'AUTO'}</button><span class="fp-pill">${esc(e.status)}</span></div>
      <div class="fp-vals">${vals.map(v => `<span>${esc(v[0])}</span><b>${esc(v[1])}</b>`).join('') || '<span>Tidak ada aliran terkuantifikasi</span><b></b>'}</div>${trend}
      <div class="fp-act">${S.mode === 'sim' ? `<button class="sc-btn ${running ? 'danger' : 'go'}" data-ss>${running ? 'Stop' : 'Start'}</button>` : ''}<button class="sc-btn" data-3d><svg width="14" height="14" style="vertical-align:-2px"><use href="#i-cube"/></svg> Lihat di 3D</button></div></div>`;
    face.querySelector('[data-x]').onclick = () => { face.hidden = true; faceTag = null; $$('.unit.sel', svg).forEach(u => u.classList.remove('sel')); };
    face.querySelector('[data-mode]').onclick = () => { S.man[tag] = !S.man[tag]; drawFace(); };
    const ss = face.querySelector('[data-ss]'); if (ss) ss.onclick = () => { S.run[tag] = !running; evalAlarms(); drawAlarms(); update(); };
    face.querySelector('[data-3d]').onclick = () => emit('show-3d', { tag });
  }
  function openFace(tag, cx, cy) {
    if (!REG.EQ[tag]) return; faceTag = tag; face.hidden = false; drawFace(); hidePop();
    $$('.unit', svg).forEach(u => u.classList.toggle('sel', u.dataset.tag === tag));
    const r = screenEl.getBoundingClientRect(); let x = cx - r.left + 16, y = cy - r.top - 40;
    if (x + face.offsetWidth > r.width - 8) x = cx - r.left - face.offsetWidth - 16;
    face.style.left = Math.max(8, x) + 'px'; face.style.top = Math.max(8, Math.min(r.height - face.offsetHeight - 8, y)) + 'px';
  }

  // ------------------------------------------------ interaksi SVG + pan/zoom
  let VB = { x: 0, y: 0, w: 1920, h: 1080 }, panMode = false;
  const setVB = () => svg.setAttribute('viewBox', `${VB.x} ${VB.y} ${VB.w} ${VB.h}`);
  function resetView() { VB = { x: 0, y: 0, w: 1920, h: 1080 }; setVB(); }
  function zoom(f, cx = VB.x + VB.w / 2, cy = VB.y + VB.h / 2) {
    const w = Math.max(240, Math.min(1920, VB.w / f)), h = w * 1080 / 1920;
    VB.x = cx - (cx - VB.x) * (w / VB.w); VB.y = cy - (cy - VB.y) * (h / VB.h); VB.w = w; VB.h = h; clampVB(); setVB();
  }
  function clampVB() { VB.x = Math.max(0, Math.min(1920 - VB.w, VB.x)); VB.y = Math.max(0, Math.min(1080 - VB.h, VB.y)); }
  const toSvg = (cx, cy) => { const r = svg.getBoundingClientRect(); const s = Math.max(VB.w / r.width, VB.h / r.height); const ox = (r.width - VB.w / s) / 2, oy = (r.height - VB.h / s) / 2; return [VB.x + (cx - r.left - ox) * s, VB.y + (cy - r.top - oy) * s, s]; };
  $$('.sc-zoom [data-z]').forEach(b => b.onclick = () => {
    const z = b.dataset.z; if (z === 'in') zoom(1.4); else if (z === 'out') zoom(1 / 1.4); else if (z === 'reset') resetView();
    else { panMode = !panMode; svg.classList.toggle('pan', panMode); b.setAttribute('aria-pressed', panMode); emit('toast', panMode ? 'Mode geser & cubit aktif' : 'Mode geser nonaktif: halaman dapat digulir'); }
  });
  svg.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey) && !panMode) return; e.preventDefault(); const [x, y] = toSvg(e.clientX, e.clientY); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, x, y); }, { passive: false });
  const ptrs = new Map(); let drag = null, pinch = null, moved = false;
  svg.addEventListener('pointerdown', e => {
    ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = false;
    if (ptrs.size === 2 && panMode) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), w: VB.w }; drag = null; }
    else if (ptrs.size === 1 && (e.pointerType === 'mouse' ? VB.w < 1920 : panMode)) { drag = { x: e.clientX, y: e.clientY, vx: VB.x, vy: VB.y }; }
  });
  svg.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const [cx, cy] = toSvg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); const tw = pinch.w * pinch.d / Math.max(10, d); zoom(VB.w / tw, cx, cy); moved = true; }
    else if (drag) { const [, , s] = toSvg(0, 0); const dx = (e.clientX - drag.x) * s, dy = (e.clientY - drag.y) * s; if (Math.abs(dx) + Math.abs(dy) > 4) moved = true; VB.x = drag.vx - dx; VB.y = drag.vy - dy; clampVB(); setVB(); }
  });
  const endPtr = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) drag = null; };
  svg.addEventListener('pointerup', endPtr); svg.addEventListener('pointercancel', endPtr);
  function wireSvg() {
    $$('.dia, .prow, [data-hit]', svg).forEach(d => {
      const sid = d.dataset.sid || d.dataset.hit;
      d.addEventListener('pointerenter', e => { if (!popPin && e.pointerType === 'mouse') showPop(sid, e.clientX, e.clientY); });
      d.addEventListener('pointerleave', () => { if (!popPin) hidePop(); });
      d.addEventListener('click', e => { if (moved) return; e.stopPropagation(); showPop(sid, e.clientX, e.clientY, true); });
      d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const r = d.getBoundingClientRect(); showPop(sid, r.right, r.top, true); } });
    });
    $$('.unit[tabindex]', svg).forEach(u => {
      u.addEventListener('click', e => { if (moved) return; e.stopPropagation(); openFace(u.dataset.tag, e.clientX, e.clientY); });
      u.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const r = u.getBoundingClientRect(); openFace(u.dataset.tag, r.right, r.top); } });
    });
  }
  svg.addEventListener('click', () => { if (!moved) hidePop(); });

  // ------------------------------------------------ header & panel samping
  const side = $('#scSide');
  side.innerHTML = `<h4>Gangguan (mode simulasi)</h4>
    <div class="sl-field"><label for="sgFeed">Pasokan eceng gondok <output id="sgFeedO">100%</output></label><input type="range" id="sgFeed" min="50" max="110" step="1" value="100"></div>
    <div class="sl-field"><label for="sgYld">Rendemen SSF <output id="sgYldO">100%</output></label><input type="range" id="sgYld" min="80" max="110" step="1" value="100"></div>
    <div class="sl-field sl-tog"><label class="switch"><input type="checkbox" id="sgEfb" checked><span></span>Panen EFB</label></div>
    <div class="sl-field sl-tog"><label class="switch"><input type="checkbox" id="sgBoiler" checked><span></span>Boiler biogas</label></div>
    <button class="sc-btn" id="scReset"><svg width="14" height="14" style="vertical-align:-2px"><use href="#i-reset"/></svg> Reset ke desain</button>
    <p class="sc-hint" id="scHint">Mode DESIGN menampilkan neraca massa & panas D200 (steady state). Pilih <b>SIMULASI</b> untuk menggerakkan nilai, menghentikan unit lewat faceplate, dan memberi gangguan.</p>
    <div><h4>Legenda medium</h4><div class="sc-legend">${['Biomassa / slurry', 'Cairan proses', 'Air / pressate', 'Etanol / pelarut', 'Biogas', 'CO₂ / gas buang', 'Reagen', 'Biomassa EFB / udara', 'Steam / panas', 'Listrik'].map(k => `<span><i style="background:${dk(MEDIUM[k][0])}"></i>${MEDIUM[k][1]}</span>`).join('')}</div></div>
    <div><h4>Status unit</h4><div class="sc-legend"><span><i class="lg-lamp" style="background:#22B14C"></i>Jalan</span><span><i class="lg-lamp" style="background:#9AA3AA"></i>Berhenti</span><span><i class="lg-lamp" style="background:#F08C1A"></i>Peringatan</span><span><i class="lg-lamp" style="background:#E0251B"></i>Alarm</span></div></div>`;
  const bindSl = (id, key) => { const el = $('#' + id), o = $('#' + id + 'O'); el.oninput = () => { S[key] = el.value / 100; o.textContent = el.value + '%'; if (S.mode !== 'sim') setMode('sim'); }; };
  bindSl('sgFeed', 'feed'); bindSl('sgYld', 'yld');
  $('#sgEfb').onchange = e => { S.efb = e.target.checked; if (S.mode !== 'sim') setMode('sim'); };
  $('#sgBoiler').onchange = e => { S.boiler = e.target.checked; if (S.mode !== 'sim') setMode('sim'); };
  function resetDesign() {
    Object.assign(S, { feed: 1, yld: 1, efb: true, boiler: true, run: {}, man: {} }); resetValues(); AL.clear();
    ['sgFeed', 'sgYld'].forEach(id => { $('#' + id).value = 100; $('#' + id + 'O').textContent = '100%'; }); $('#sgEfb').checked = true; $('#sgBoiler').checked = true;
    drawAlarms(); update();
  }
  $('#scReset').onclick = () => { resetDesign(); emit('toast', 'Simulasi dikembalikan ke nilai desain.'); };
  function setMode(m) {
    S.mode = m; $$('.sc-modes [data-mode]').forEach(b => b.setAttribute('aria-checked', b.dataset.mode === m));
    const lab = $('#scModeLabel'); lab.textContent = m === 'design' ? 'Nilai desain (steady state)' : 'SIMULASI'; lab.classList.toggle('sim', m === 'sim');
    $('#scHint').innerHTML = m === 'design' ? 'Mode DESIGN menampilkan neraca massa & panas D200 (steady state). Pilih <b>SIMULASI</b> untuk menggerakkan nilai, menghentikan unit lewat faceplate, dan memberi gangguan.'
      : 'SIMULASI aktif: nilai bergerak dengan derau ±2%, unit dapat di-Start/Stop lewat faceplate, aliran hilir turun bertahap (time constant 3–12 s). Boiler mati menghentikan pretreatment dan distilasi.';
    if (m === 'design') resetDesign(); else S.t = Date.now();
    if (!face.hidden) drawFace(); update(); drawAlarms();
  }
  $$('.sc-modes [data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
  $$('.sc-speed [data-speed]').forEach(b => b.onclick = () => { S.speed = +b.dataset.speed; $$('.sc-speed [data-speed]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('#scPause').onclick = () => { S.paused = !S.paused; $('#scPause').innerHTML = `<svg><use href="#i-${S.paused ? 'play' : 'pause'}"/></svg>`; $('#scPause').setAttribute('aria-label', S.paused ? 'Lanjutkan simulasi' : 'Jeda simulasi'); update(); };

  // ------------------------------------------------ loop (aktif hanya saat SCADA terlihat)
  let visible = false, acc = 0, last = performance.now();
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe($('#scadaApp'));
  setInterval(() => {
    const now = performance.now(), rdt = Math.min(1, (now - last) / 1000); last = now;
    if (!visible || document.hidden) return;
    if (S.mode === 'sim' && !S.paused) {
      const dt = rdt * S.speed; const n = Math.ceil(dt / 0.5); for (let i = 0; i < n; i++) stepSim(dt / n);
      S.t += dt * 1000; acc += dt;
      while (acc >= 1) { acc -= 1; for (const sid in HIST) { const v = val(sid); if (v === null) continue; HIST[sid].push(v); if (HIST[sid].length > 60) HIST[sid].shift(); } evalAlarms(); drawAlarms(); }
    }
    update();
  }, 250);

  show('overview'); drawAlarms();

  // ------------------------------------------------ API untuk modul lain
  function screenFor(tags) {
    for (const sc of SCREENS.slice(1)) if (tags.some(t => sc.unitSet.has(t))) return sc.id;
    return 'overview';
  }
  function flash(tags) {
    $$('.unit', svg).forEach(u => u.classList.toggle('hl', tags.includes(u.dataset.tag)));
    setTimeout(() => $$('.unit.hl', svg).forEach(u => u.classList.remove('hl')), 6000);
  }
  return {
    focusTags(tags, screen) {
      tags = (tags || []).filter(Boolean); const vis = tags.filter(t => UNITS[t]);
      show(screen && screen !== 'overview' ? screen : vis.length ? screenFor(vis) : (screen || 'overview'));
      flash(vis);
      if (vis.length === 1) { const el = svg.querySelector(`.unit[data-tag="${CSS.escape(vis[0])}"]`); if (el) { const r = el.getBoundingClientRect(); setTimeout(() => openFace(vis[0], r.right, r.top + r.height / 2), 50); } }
      else if (tags.length && !vis.length) emit('toast', `${tags[0]} adalah unit pendukung/utilitas yang tidak ada di PFD; menampilkan Overview.`);
    },
    focusStream(sid) {
      const sc = SCREENS.slice(1).find(s => s.tableIds.includes(sid)) || SCREENS[0]; show(sc.id);
      const d = svg.querySelector(`.dia[data-sid="${CSS.escape(sid)}"]`) || svg.querySelector(`[data-hit="${CSS.escape(sid)}"]`);
      if (d) { const r = d.getBoundingClientRect(); setTimeout(() => showPop(sid, r.right, r.top, true), 50); }
      else emit('toast', `Aliran ${sid} adalah utilitas pendukung yang tidak ada di PFD.`);
    },
  };
}
