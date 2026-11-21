"""Sekali jalan: siapkan folder deploy methaland-site/ dari berkas input.
Pemakaian: python3 tools/build_assets.py <dir_upload> <dir_register> <dir_kartu_jpg> <dir_three_pkg> <dir_paper_img>
"""
import csv, json, os, shutil, sys
from PIL import Image

UP, REG, KARTU, THREE, PIMG = sys.argv[1:6]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'methaland-site')
A = os.path.join(ROOT, 'assets')
for d in ['css', 'js', 'data', 'models', 'img/render', 'img/thumb', 'img/team', 'downloads']:
    os.makedirs(os.path.join(A, d), exist_ok=True)

def up(prefix):
    for f in os.listdir(UP):
        if prefix in f: return os.path.join(UP, f)
    raise FileNotFoundError(prefix)

# --- data 3D (apa adanya) + model
shutil.copy(up('data_2.json'), os.path.join(A, 'data', 'data.json'))
shutil.copy(up('plant.glb'), os.path.join(A, 'models', 'plant.glb'))
shutil.copy(up('konteks.glb'), os.path.join(A, 'models', 'konteks.glb'))

def num(v):
    if v is None or v == '': return None
    try: return float(v)
    except ValueError: return v

def rd(name): return list(csv.DictReader(open(os.path.join(REG, name), encoding='utf-8')))

eq = []
for r in rd('equipment_register.csv'):
    eq.append({k: (num(v) if k in ('x_m','y_m','z_m','rotation_deg','length_m','width_m','height_m','diameter_m') else v) for k, v in r.items()})
json.dump(eq, open(os.path.join(A, 'data', 'equipment.json'), 'w', encoding='utf-8'), ensure_ascii=False)

st = []
for r in rd('stream_register.csv'):
    st.append({k: r[k] for k in ('stream_id','medium','from_tag','to_tag','pfd_name','status','geom','notes')})
json.dump(st, open(os.path.join(A, 'data', 'streams.json'), 'w', encoding='utf-8'), ensure_ascii=False)

ne = [{'id': r['stream_id'], 'q': num(r['laju']), 'u': r['satuan'], 'jenis': r['jenis'], 'status': r['status'], 'basis': r['basis']} for r in rd('neraca_aliran.csv')]
json.dump(ne, open(os.path.join(A, 'data', 'neraca.json'), 'w', encoding='utf-8'), ensure_ascii=False)

pp = [{'id': r['stream_id'], 'fase': r['fase'], 'T': num(r['T_C']), 'P': num(r['P_bara']), 'rho': num(r['rho_kgm3']), 'Q': num(r['Q_m3s']),
       'DN': num(r['DN']), 'OD': num(r['OD_mm']), 'ID': num(r['ID_mm']), 'v': num(r['v_ms']), 'aturan': r['aturan']} for r in rd('ukuran_pipa.csv')]
json.dump(pp, open(os.path.join(A, 'data', 'pipa.json'), 'w', encoding='utf-8'), ensure_ascii=False)

for f in ('equipment_register.csv', 'stream_register.csv', 'neraca_aliran.csv', 'ukuran_pipa.csv'):
    shutil.copy(os.path.join(REG, f), os.path.join(A, 'downloads', f))

# --- three.js r160 (subset yang dipakai)
L = os.path.join(ROOT, 'lib', 'three')
for rel in ['build/three.module.js', 'examples/jsm/controls/OrbitControls.js', 'examples/jsm/loaders/GLTFLoader.js',
            'examples/jsm/libs/meshopt_decoder.module.js', 'examples/jsm/utils/BufferGeometryUtils.js', 'LICENSE']:
    os.makedirs(os.path.dirname(os.path.join(L, rel)), exist_ok=True)
    shutil.copy(os.path.join(THREE, rel), os.path.join(L, rel))

# --- render perhentian (kartu tur: render 1918x1080 di kiri)
data = json.load(open(up('data_2.json'), encoding='utf-8'))
ids = [s['id'] for s in data['tour']['stops']]
for i, sid in enumerate(ids):
    im = Image.open(os.path.join(KARTU, f'k-{i:03d}.jpg')).convert('RGB').crop((0, 0, 1918, 1080))
    im.resize((1600, 900), Image.LANCZOS).save(os.path.join(A, 'img', 'render', f'{i+1:02d}_{sid}.jpg'), quality=80, optimize=True, progressive=True)
    im.resize((400, 225), Image.LANCZOS).save(os.path.join(A, 'img', 'thumb', f'{i+1:02d}_{sid}.jpg'), quality=72, optimize=True)

# --- poster, PFD, gambar paper, foto tim
poster = Image.open(up('6fbbaeef-image.png')).convert('RGB')
shutil.copy(up('6fbbaeef-image.png'), os.path.join(A, 'downloads', 'POSTER_LKTIN_ECOGENERATION.png'))
p2 = poster.copy(); p2.thumbnail((1100, 1600)); p2.save(os.path.join(A, 'img', 'poster.jpg'), quality=80, optimize=True, progressive=True)
for name, box in (('azkia', (2165, 3812, 2301, 3948)), ('bondan', (2350, 3812, 2486, 3948))):
    poster.crop(box).resize((192, 192), Image.LANCZOS).save(os.path.join(A, 'img', 'team', name + '.jpg'), quality=86)
shutil.copy(up('9001331a-image.jpg'), os.path.join(A, 'img', 'pfd.jpg'))
shutil.copy(up('9001331a-image.jpg'), os.path.join(A, 'downloads', 'PFD_eMethanol_Berwarna_FullHD.jpg'))
for src, dst in (('p-016.png', 'gambar4_aksonometri.jpg'), ('p-019.png', 'gambar7_sirkular.jpg'), ('p-000.png', 'gambar1_kerangka.jpg')):
    im = Image.open(os.path.join(PIMG, src)).convert('RGB'); im.thumbnail((1600, 1000)); im.save(os.path.join(A, 'img', dst), quality=82, optimize=True, progressive=True)
shutil.copy(up('LKTIN_EcoGeneration'), os.path.join(A, 'downloads', 'METHALAND_Full_Paper_LKTIN_EcoGeneration_2026.pdf'))
import zipfile
with zipfile.ZipFile(os.path.join(A, 'downloads', 'METHALAND_render_HD.zip'), 'w', zipfile.ZIP_STORED) as z:
    for i, sid in enumerate(ids):
        im = Image.open(os.path.join(KARTU, f'k-{i:03d}.jpg')).convert('RGB').crop((0, 0, 1918, 1080))
        tmp = os.path.join(A, 'downloads', '_tmp.jpg'); im.save(tmp, quality=90, optimize=True)
        z.write(tmp, f'METHALAND_render/{i+1:02d}_{sid}.jpg'); os.remove(tmp)
print('OK', ROOT)
