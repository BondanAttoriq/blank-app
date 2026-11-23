"""Bangun viewer 3D mandiri METHACYCLE dari viewer asli v4 (04_Web/situs/index.html).
Keluaran:
  1) methacycle-3d/            paket mandiri (ZIP kedua): index.html, data.json, model GLB (+ .gz), lib/three
  2) methaland-site/tur3d/     viewer layar penuh di dalam situs (memakai data, model, dan lib situs)
Perubahan terhadap viewer asli (hanya peringan + revisi teks, logika dan tampilan dipertahankan):
  - nama METHALAND -> METHACYCLE; rujukan Tabel/Lampiran & 'LKTIN' dihapus dari teks data
  - pixel ratio maks 1,5 (asli 2); shadow map dirender sekali (scene statis) dan diulang saat lapisan berubah
  - model dimuat dari .glb.gz (DecompressionStream) dengan fallback otomatis ke .glb
Pemakaian: python3 tools/build_tur3d.py <index.html viewer asli>
"""
import json, os, re, shutil, sys

SRC = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.join(HERE, '..'); SITE = os.path.join(REPO, 'methaland-site')
html0 = open(SRC, encoding='utf-8').read()

def clean(t):
    t = re.sub(r'\s*\((?:LKTIN\s+)?(?:Tabel|Lampiran|Gambar|Subbab)\s*[\d.,–-]+\)', '', t)
    t = re.sub(r',\s*(?:Tabel|Lampiran|Gambar|Subbab)\s*[\d.–-]+', '', t)
    return re.sub(r'\bLKTIN\b', 'studi', t).replace('METHALAND', 'METHACYCLE')

def patch(html, data_url, model_dir, lib_dir, back_link):
    h = html.replace('METHALAND', 'METHACYCLE')
    rep = [
        ('<script>window.METHALAND_SRC = \'glb\';</script>'.replace('METHALAND', 'METHACYCLE'), f"<script>window.METHACYCLE_SRC = 'glb'; window.M3D = {{ data: '{data_url}', models: '{model_dir}' }};</script>"),
        ('"three":"./lib/three/build/three.module.js","three/addons/":"./lib/three/examples/jsm/"', f'"three":"{lib_dir}build/three.module.js","three/addons/":"{lib_dir}examples/jsm/"'),
        ('renderer.setPixelRatio(Math.min(devicePixelRatio, 2));', 'renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));'),
        ('renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;',
         'renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;   // scene statis: bayangan dirender sekali'),
        ("const SRC = window.METHACYCLE_SRC || 'txt';", "const SRC = window.METHACYCLE_SRC || 'txt'; const M3D = window.M3D || { data: 'data.json', models: '' };"),
        ("else if (SRC === 'glb') { buf = await readAll(name + '.glb', key); }",
         "else if (SRC === 'glb') { buf = null; if (typeof DecompressionStream !== 'undefined') { try { const raw = await readAll(M3D.models + name + '.glb.gz', key); const b = new Uint8Array(raw, 0, 4); "
         "buf = b[0] === 0x1f && b[1] === 0x8b ? await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer() : raw; "
         "if (new TextDecoder().decode(new Uint8Array(buf, 0, 4)) !== 'glTF') buf = null; } catch (e) { buf = null; } } if (!buf) buf = await readAll(M3D.models + name + '.glb', key); }"),
        ("await (await fetch('data.json')).json(); STOPS = DATA.tour.stops;", "await (await fetch(M3D.data)).json(); STOPS = DATA.tour.stops;"),
        ("  scene.add(plant, ctx);", "  scene.add(plant, ctx); renderer.shadowMap.needsUpdate = true;"),
        ("    else if (UTIL_NAMES.test(o.name)) o.visible = u;\n  });", "    else if (UTIL_NAMES.test(o.name)) o.visible = u;\n  });\n  renderer.shadowMap.needsUpdate = true;"),
    ]
    for a, b in rep:
        assert a in h, a[:70]
        h = h.replace(a, b)
    # tema hijau situs (palet poster): aksen, kartu, tombol, chip, loader, tooltip, label sorotan
    THEME = """<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,600;0,700;0,800;1,700&display=swap" rel="stylesheet">
<style>
  :root{--ink:#17322A;--mute:#4F655D;--line:#CFE6DC;--card:rgba(255,255,255,.96);--acc:#127466;--S:#1F6FB5;--C:#1F7A4D;--A:#A86100;
    --g-chip:linear-gradient(90deg,#127466,#26987C 60%,#4DB585);--g-head:linear-gradient(90deg,#0C5A72 0%,#127E86 50%,#2BA58A 100%)}
  html,body{background:#B9CFDF;color:var(--ink)}
  .panel{border-radius:16px;border:1.5px solid var(--line);box-shadow:0 10px 30px rgba(14,59,46,.16)}
  #brand{background:linear-gradient(135deg,#0B2E23,#14532D);border-color:#1F7A4D;color:#fff;display:flex;flex-direction:column;padding:10px 16px 10px 56px;position:fixed}
  #brand::before{content:"M";position:absolute;left:12px;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:10px;display:grid;place-items:center;
    background:linear-gradient(135deg,#1F7A4D,#0C5A72);box-shadow:inset 0 0 0 2px rgba(140,198,63,.6);color:#B9E58A;font:800 19px Poppins,system-ui,sans-serif}
  #brand b{font-family:Poppins,system-ui,sans-serif;letter-spacing:.04em;color:#fff}#brand div{color:#9FD3B9}#brand a{color:#B9E58A!important}
  #title,#info h3,#flow b{font-family:Poppins,system-ui,sans-serif;color:#0E3B2E}
  #idx{color:var(--acc)} #dur{color:var(--mute)}
  button{border-radius:999px;border:1.5px solid var(--line);font-family:Poppins,system-ui,sans-serif;color:var(--ink)}
  button:hover{border-color:#129B8A;color:#127466}
  button.pri{background:var(--g-chip);border-color:transparent;color:#fff}button.pri:hover{color:#fff;filter:brightness(1.06)}
  button:focus-visible{outline:3px solid #8CC63F;outline-offset:2px}
  #tools input[type=checkbox],#flow input[type=checkbox]{accent-color:#129B8A;width:16px;height:16px}
  #tools button{border-radius:12px}
  .chip{border:1.5px solid var(--line);font-family:Poppins,system-ui,sans-serif}.chip.on{background:var(--g-chip);border-color:transparent;color:#fff}.chip.all{border-color:#129B8A}
  .dot{background:#CFE6DC}.dot.on{background:#129B8A;box-shadow:0 0 0 3px rgba(18,155,138,.25)}.dot.done{background:#8CC6B0}
  #bar{background:#DFF1E6;height:4px}#bar i{background:linear-gradient(90deg,#8CC63F,#5CC6B5)}
  .num{border:1.5px solid var(--line);border-radius:12px;background:linear-gradient(180deg,#fff,#EEF7F1)}.num b{color:#0C5A72;font-family:Poppins,system-ui,sans-serif}
  .lab{border-color:#3c4046}.lab.hl{border-color:#1F7A4D;box-shadow:0 0 0 3px rgba(140,198,63,.45)}
  #tip{background:#0E3B2E;border-radius:10px;box-shadow:0 10px 24px rgba(0,0,0,.25)}#tip .dn{color:#9FE0FF}#tip .q{color:#D8F2B8}
  #info .k{color:var(--mute)} #help b{font-family:Poppins,system-ui,sans-serif;color:#0E3B2E}
  #load{background:radial-gradient(900px 500px at 50% 30%,#14532D,#0B2E23);color:#fff}
  #load b{font-family:Poppins,system-ui,sans-serif;font-size:20px}
  #load .b{background:rgba(255,255,255,.18);height:6px;border-radius:6px}#load .b i{background:linear-gradient(90deg,#8CC63F,#5CC6B5)}
  #load .mk{width:72px;height:72px;border-radius:20px;display:grid;place-items:center;background:linear-gradient(135deg,#1F7A4D,#0C5A72);box-shadow:inset 0 0 0 2px rgba(140,198,63,.6);color:#B9E58A;font:800 40px Poppins,system-ui,sans-serif}
  #load #ltxt{color:#B7D3C7!important}
  #scale .bar{border-color:#17322A}
</style>"""
    h = h.replace('</style>\n<script>window.METHACYCLE_SRC', '</style>\n' + THEME + '\n<script>window.METHACYCLE_SRC', 1)
    assert THEME in h
    h = h.replace('<div id="load"><b>Memuat model 3D METHACYCLE…</b>', '<div id="load"><div class="mk" aria-hidden="true">M</div><b>Memuat model 3D METHACYCLE…</b>')
    h = h.replace("l.hl ? '#e07b12' : '#3c4046'", "l.hl ? '#1F7A4D' : '#3c4046'")
    assert "'#e07b12'" not in h
    # total ukuran gzip untuk progres (content-length tetap dipakai bila ada)
    h = h.replace('<title>METHACYCLE · Tur 3D Plant e-Methanol TPST Bantargebang</title>', '<title>METHACYCLE · Tur 3D Plant e-Methanol TPST Bantargebang</title>\n<meta name="description" content="Tur 3D interaktif METHACYCLE: plant e-methanol dari LPP dan landfill gas di TPST Bantargebang. CARBON Essay Competition 2026, Tim UI x ITB.">')
    if back_link:
        h = h.replace('<div id="brand" class="panel"><b>METHACYCLE · Tur 3D</b>', '<div id="brand" class="panel"><b>METHACYCLE · Tur 3D</b> <a href="../#plant3d" style="font-size:12px;margin-left:8px;color:#1f6fb5">← Kembali ke situs</a>')
    return h

# --- data.json: teks dibersihkan (rujukan dokumen & nama lama)
data = json.load(open(os.path.join(SITE, 'assets', 'data', 'data.json'), encoding='utf-8'))
def walk(o):
    if isinstance(o, str): return clean(o)
    if isinstance(o, list): return [walk(x) for x in o]
    if isinstance(o, dict): return {k: walk(v) for k, v in o.items()}
    return o
data_clean = walk(data)

# 1) paket mandiri
OUT = os.path.join(REPO, 'methacycle-3d')
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(patch(html0, 'data.json', '', './lib/three/', False))
json.dump(data_clean, open(os.path.join(OUT, 'data.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
for f in ('plant.glb', 'konteks.glb', 'plant.glb.gz', 'konteks.glb.gz'):
    shutil.copy(os.path.join(SITE, 'assets', 'models', f), os.path.join(OUT, f))
shutil.copytree(os.path.join(SITE, 'lib'), os.path.join(OUT, 'lib'))
open(os.path.join(OUT, '_headers'), 'w').write('/*.glb\n  Content-Type: model/gltf-binary\n  Cache-Control: public, max-age=31536000, immutable\n/*.gz\n  Cache-Control: public, max-age=31536000, immutable\n/lib/*\n  Cache-Control: public, max-age=31536000, immutable\n')
open(os.path.join(OUT, 'README.md'), 'w', encoding='utf-8').write("""# METHACYCLE: Tur 3D (mandiri)

Viewer 3D layar penuh, ringan, tanpa bagian situs lain. CARBON Essay Competition 2026 · Tim UI x ITB.

- **Netlify Drop:** seret folder ini (atau ZIP-nya) ke https://app.netlify.com/drop.
- **Lokal:** `python -m http.server 8000` di folder ini, lalu buka http://localhost:8000.

Kontrol: Spasi putar/jeda tur · ←/→ perhentian · B mode bebas · P presentasi · L label · F aliran massa & energi. Klik unit atau pipa untuk data register.
Model dimuat dari `*.glb.gz` (6,5 MB) dan otomatis kembali ke `*.glb` (12,2 MB) bila browser tidak mendukung DecompressionStream.
""")

# 2) viewer layar penuh di dalam situs (memakai aset situs, tanpa duplikasi model)
T3 = os.path.join(SITE, 'tur3d'); os.makedirs(T3, exist_ok=True)
open(os.path.join(T3, 'index.html'), 'w', encoding='utf-8').write(patch(html0, 'data.json', '../assets/models/', '../lib/three/', True))
json.dump(data_clean, open(os.path.join(T3, 'data.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('OK', OUT, T3)
