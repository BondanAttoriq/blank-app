"""Menyusun aset cirata-site dari paket CIRATA-RESILIENT:
  - viewer3d/  : viewer 3D v7.1 (three r170) bertema biru, GLB gzip + fallback, render hemat (shadow statis, DPR 1,5,
                 jeda render saat tidak terlihat), jembatan postMessage dengan halaman induk
  - assets/img : hero, OG, render 3D, figur analisis (JPG), rujukan (PFD, neraca, P&ID), avatar tim
  - assets/downloads : figur PNG (ZIP), data XLSX, PFD & neraca JPG, P&ID (ZIP), register CSV
Pemakaian: python3 tools/build_cirata.py <folder CIRATA_RESILIENT_Web_v7/01_Viewer_Web> <folder CIRATA-RESILIENT_Revisi>
"""
import gzip, json, os, re, shutil, sys, zipfile, csv
from PIL import Image, ImageDraw, ImageFont

SRC, REV = sys.argv[1], sys.argv[2]
SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cirata-site')
V = os.path.join(SITE, 'viewer3d')
os.makedirs(V, exist_ok=True)

# ------------------------------------------------------------------ viewer 3D
for d in ['lib', 'fallback', 'references']:
    shutil.copytree(os.path.join(SRC, d), os.path.join(V, d), dirs_exist_ok=True)
os.makedirs(os.path.join(V, 'data'), exist_ok=True)
shutil.copy(os.path.join(SRC, 'data', 'design.json'), os.path.join(V, 'data', 'design.json'))
shutil.copy(os.path.join(SRC, 'software.js'), os.path.join(V, 'software.js'))
glb = open(os.path.join(SRC, 'data', 'model.glb'), 'rb').read()
shutil.copy(os.path.join(SRC, 'data', 'model.glb'), os.path.join(V, 'data', 'model.glb'))
with open(os.path.join(V, 'data', 'model.glb.gz'), 'wb') as f: f.write(gzip.compress(glb, 9))

PAL = {  # teal/hijau viewer v7 → biru CIRATA (Canva)
 '#16343c': '#0F2B50', '#4b656b': '#4A6078', '#d8e4e4': '#D6E2EE', '#eaf5ef': '#E8F1FA', '#0b6d60': '#1F5FA8', '#15373d': '#0F2B50', '#edf3f2': '#EEF3F8', '#b1c6cc': '#B6C9DB',
 '#087a6d': '#2C76AD', '#123c40': '#0F2B50', '#aff2cc': '#9FD8F0', '#c6d8d8': '#C6D6E6', '#379689': '#2C76AD', '#eef9f5': '#EEF5FC', '#084b43': '#123E70', '#4f686c': '#4A6078',
 '#f0f7f5': '#F0F6FC', '#e6f4ed': '#E3EEF9', '#065446': '#184F8E', '#d0eae0': '#C7DCF0', '#adc1bd': '#AEBFD0', '#0c8a62': '#1F6FB5', '#095b50': '#164E80', '#143c40': '#0F2B50',
 '#dceae7': '#DCE7F2', '#25d39a': '#47B3D1', '#14685c': '#1F5FA8', '#168171': '#2C76AD', '#1d5e53': '#184F8E', '#84bfae': '#8FB8DA', '#c1d6cf': '#C1D3E4', '#e3eeea': '#E3EBF4',
 '#e0ebe6': '#E0E9F3', '#dae9e3': '#DAE6F2', '#dae8e4': '#DAE5F1', '#dae8e3': '#DAE5F1', '#dae6e3': '#DAE4EF', '#d6e7e1': '#D6E4F1', '#d6e6e1': '#D6E3F0', '#d5e9e3': '#D5E5F2',
 '#d5e8e1': '#D5E4F1', '#d4e0df': '#D4DFEA', '#cee0dc': '#CEDCEA', '#eef8f3': '#EEF5FC', '#eff6f3': '#EFF4FA', '#f0f6f4': '#F0F5FA', '#f1f6f4': '#F1F5FA', '#f2f8f5': '#F2F6FB',
 '#f6fbf8': '#F6F9FD', '#f7fbf9': '#F7FAFD', '#f8fcfa': '#F8FAFD', '#f9fcf8': '#F9FBFD', '#f9fcf9': '#F9FBFD', '#ebf5f1': '#EBF2FA', '#edf1ef': '#EDF1F6', '#466269': '#46607A',
 '#44636b': '#44607C', '#3b5b61': '#3B5876', '#37555c': '#375472', '#315052': '#314E6C', '#244950': '#24476C', '#18333b': '#132E4E', '#163942': '#16365A', '#143b3b': '#14375A', '#123943': '#12365C',
 '#e4efed': '#E4EDF6', '#d9e8e7': '#D9E6F2',
}
def recolor(s): return re.sub(r'#[0-9a-fA-F]{6}\b', lambda m: PAL.get(m.group(0).lower(), m.group(0)), s)

css = recolor(open(os.path.join(SRC, 'style.css'), encoding='utf-8').read())
css += '''
/* tema CIRATA-RESILIENT + mode sematan */
:root{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
.project{font-family:Poppins,system-ui,sans-serif;letter-spacing:.04em}
.brand{background:linear-gradient(135deg,#0F2B50,#1F5FA8)!important;color:#9FD8F0!important}
.btn.accent{background:linear-gradient(90deg,#1F5FA8,#2C76AD 60%,#3692BD);border-color:transparent}
.top .back{font-size:.84rem;font-weight:700;color:#1F5FA8;text-decoration:none;margin-right:.4rem}
body.embed .top .back{display:none}
body.embed #shell{height:calc(100dvh - 137px);min-height:0;max-height:none}
'''
open(os.path.join(V, 'style.css'), 'w', encoding='utf-8').write(css)

html = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
html = html.replace('<link rel="stylesheet" href="style.css">', '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Poppins:wght@700;800&display=swap">\n<link rel="stylesheet" href="style.css">')
html = html.replace('<div class="nav-controls">', '<div class="nav-controls"><a class="back" href="../#plant3d">← Situs utama</a>')
html = html.replace('<meta name="color-scheme" content="light">', '<meta name="color-scheme" content="light">\n<script>if(new URLSearchParams(location.search).has("embed"))document.documentElement.classList.add("embed")</script>')
html = html.replace('<body>', '<body>\n<script>if(document.documentElement.classList.contains("embed"))document.body.classList.add("embed")</script>', 1)
open(os.path.join(V, 'index.html'), 'w', encoding='utf-8').write(html)

js = recolor(open(os.path.join(SRC, 'app.js'), encoding='utf-8').read())
def rep(a, b):
    global js
    assert a in js, a[:70]; js = js.replace(a, b, 1)
# GLB gzip (DecompressionStream) dengan fallback .glb
rep("  return fetch('data/model.glb').then(async r=>{", """  if('DecompressionStream' in window){
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
  return fetch('data/model.glb').then(async r=>{""")
rep('function modelBuffer() {', 'async function modelBuffer() {')
# render hemat: DPR ≤ 1,5, peta bayangan 2048 statis (diperbarui saat scene berubah), jeda saat tidak terlihat
rep("renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));", "renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));")
rep("renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;", "renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate=false; renderer.shadowMap.needsUpdate=true;")
rep("const big=innerWidth>900; sun.shadow.mapSize.set(big?4096:2048,big?4096:2048);", "sun.shadow.mapSize.set(2048,2048);")
rep("function updateScene() {\n  if(!viewReady)return;", "function updateScene() {\n  if(!viewReady)return;\n  if(renderer&&renderer.shadowMap)renderer.shadowMap.needsUpdate=true;")
rep("function animate(t) {\n  requestAnimationFrame(animate);", "let paused=false;\naddEventListener('message',e=>{const d=e.data||{};if(d.cr==='pause')paused=!!d.v;else if(d.cr==='place'&&placeById[d.id])selectPlace(d.id);else if(d.cr==='tag'&&viewReady){const t=Object.keys(design.equipment).find(k=>k===d.id||k===d.id+'A');if(t){selectPlace(about(t).where||'site');selectEquipment(t);}}else if(d.cr==='route'&&viewReady){const k=Object.keys(routes).find(k=>routes[k].id===d.id);if(k)selectRoute(k);}else if(d.cr==='tour')$('#tour').click();});\ndocument.addEventListener('visibilitychange',()=>{});\nfunction animate(t) {\n  requestAnimationFrame(animate);\n  if(paused||document.hidden){clock.getDelta();return;}")
open(os.path.join(V, 'app.js'), 'w', encoding='utf-8').write(js)
open(os.path.join(V, '_headers'), 'w').write('/viewer3d/data/*.glb\n  Content-Type: model/gltf-binary\n')

# ------------------------------------------------------------------ gambar
IMG = os.path.join(SITE, 'assets', 'img'); os.makedirs(os.path.join(IMG, 'render'), exist_ok=True); os.makedirs(os.path.join(IMG, 'fig'), exist_ok=True); os.makedirs(os.path.join(IMG, 'ref'), exist_ok=True)
for f in os.listdir(os.path.join(SRC, 'fallback')):
    im = Image.open(os.path.join(SRC, 'fallback', f)).convert('RGB'); im.save(os.path.join(IMG, 'render', f), quality=84, optimize=True, progressive=True)
    im.thumbnail((420, 252)); im.save(os.path.join(IMG, 'render', 't_' + f), quality=80, optimize=True)
hero = Image.open(os.path.join(SRC, 'fallback', 'site.jpg')).convert('RGB')
hero.resize((1920, 1152), Image.LANCZOS).save(os.path.join(IMG, 'hero.jpg'), quality=82, optimize=True, progressive=True)
for f in sorted(os.listdir(os.path.join(SRC, 'references'))):
    im = Image.open(os.path.join(SRC, 'references', f)).convert('RGB'); im.save(os.path.join(IMG, 'ref', f), quality=86, optimize=True)
FIG = os.path.join(REV, 'figs'); figs = sorted(f for f in os.listdir(FIG) if f.endswith('.png'))
for f in figs:
    im = Image.open(os.path.join(FIG, f)).convert('RGB'); im.thumbnail((1600, 1000), Image.LANCZOS)
    im.save(os.path.join(IMG, 'fig', f[:-4] + '.jpg'), quality=84, optimize=True, progressive=True)
    im.thumbnail((420, 260)); im.save(os.path.join(IMG, 'fig', 't_' + f[:-4] + '.jpg'), quality=78, optimize=True)
json.dump(figs, open(os.path.join(SITE, 'assets', 'data', 'figs.json'), 'w'), ensure_ascii=False)

# avatar inisial (foto belum tersedia)
def avatar(path, txt):
    S = 256; im = Image.new('RGB', (S, S), '#0F2B50'); d = ImageDraw.Draw(im)
    for r in range(S // 2, 0, -1):
        t = r / (S / 2); c = (int(15 + (44 - 15) * (1 - t)), int(43 + (118 - 43) * (1 - t)), int(80 + (173 - 80) * (1 - t))); d.ellipse([S / 2 - r, S / 2 - r, S / 2 + r, S / 2 + r], fill=c)
    try: fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 96)
    except Exception: fnt = ImageFont.load_default()
    w = d.textlength(txt, font=fnt); d.text(((S - w) / 2, S / 2 - 58), txt, font=fnt, fill='#CDE7F7'); im.save(path, quality=90)
avatar(os.path.join(IMG, 'team', 'inori.jpg'), 'IS')

# OG 1200×630
og = hero.resize((1200, 720), Image.LANCZOS).crop((0, 45, 1200, 675)).convert('RGBA')
ov = Image.new('RGBA', og.size, (10, 31, 61, 0)); d = ImageDraw.Draw(ov)
for x in range(1200): d.line([(x, 0), (x, 630)], fill=(10, 31, 61, int(235 - 120 * x / 1200)))
og = Image.alpha_composite(og, ov); d = ImageDraw.Draw(og)
try:
    fb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 78); fm = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 30); fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
except Exception: fb = fm = fs = ImageFont.load_default()
d.text((70, 120), 'Industrial Case Competition EUREKA! 2026', font=fs, fill='#9FD8F0')
d.text((70, 170), 'CIRATA-RESILIENT', font=fb, fill='#FFFFFF')
for i, line in enumerate(['Ecological Floating Bed + Circular Multi-Feedstock', 'Biorefinery untuk mitigasi eutrofikasi dan', 'ketahanan operasional PLTA Cirata']):
    d.text((70, 290 + i * 44), line, font=fm, fill='#E3EEF9')
d.text((70, 470), 'Bioetanol 1,37 juta L/tahun · NPV Rp25,29 M · IRR 13,15% · Tim UI x ITB', font=fs, fill='#CDE7F7')
og.convert('RGB').save(os.path.join(IMG, 'og.jpg'), quality=86)

# ------------------------------------------------------------------ unduhan
DL = os.path.join(SITE, 'assets', 'downloads'); os.makedirs(DL, exist_ok=True)
with zipfile.ZipFile(os.path.join(DL, 'CIRATA_Grafik_Analisis_31.zip'), 'w', zipfile.ZIP_STORED) as z:
    for f in figs: z.write(os.path.join(FIG, f), f)
shutil.copy(os.path.join(REV, 'CIRATA_Revisi_Data_Tabel.xlsx'), os.path.join(DL, 'CIRATA_Data_Tabel.xlsx'))
shutil.copy(os.path.join(SRC, 'references', 'PFD.jpg'), os.path.join(DL, 'CIRATA_PFD_Biorefinery.jpg'))
shutil.copy(os.path.join(SRC, 'references', 'MASS.jpg'), os.path.join(DL, 'CIRATA_Neraca_Massa_Panas.jpg'))
with zipfile.ZipFile(os.path.join(DL, 'CIRATA_PID_Area100-700.zip'), 'w', zipfile.ZIP_STORED) as z:
    for f in sorted(os.listdir(os.path.join(SRC, 'references'))):
        if f.startswith('PID'): z.write(os.path.join(SRC, 'references', f), f)
DATA = os.path.join(SITE, 'assets', 'data')
eq = json.load(open(os.path.join(DATA, 'equipment.json'), encoding='utf-8'))
with open(os.path.join(DL, 'equipment_register.csv'), 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f); w.writerow(['tag', 'area', 'nama', 'tipe', 'ukuran', 'basis'])
    for e in eq: w.writerow([e['tag'], e['area'], e['name'], e['equipment_type'], e.get('size') or '', e.get('sizing_basis') or ''])
st = json.load(open(os.path.join(DATA, 'streams.json'), encoding='utf-8')); ne = {n['id']: n for n in json.load(open(os.path.join(DATA, 'neraca.json'), encoding='utf-8'))}
pp = {p['id']: p for p in json.load(open(os.path.join(DATA, 'pipa.json'), encoding='utf-8'))}
with open(os.path.join(DL, 'stream_register.csv'), 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f); w.writerow(['id', 'nama', 'medium', 'dari', 'ke', 'laju', 'satuan', 'status', 'T_C', 'P_bar_a', 'DN', 'v_m_s'])
    for s in st:
        n = ne[s['stream_id']]; p = pp[s['stream_id']]
        w.writerow([s['stream_id'], s['pfd_name'], s['medium'], s['from_tag'], s['to_tag'], '' if n['q'] is None else n['q'], n['u'], n['status'], p['T'] or '', p['P'] or '', p['DN'] or '', p['v'] or ''])
print('selesai', len(figs), 'figur')
