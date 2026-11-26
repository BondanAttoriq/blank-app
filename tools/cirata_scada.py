"""Menyusun data SCADA CIRATA-RESILIENT: scada-layout.json + register (equipment, streams, neraca, pipa).
Tata letak mengikuti PFD Gambar 3.3 (references/PFD.jpg, 2048×841 px) yang dipetakan ke kanvas HMI 1920×1080:
  X = x·0,9375 ; baris atas Y = 30 + y·1,3 ; baris bawah Y = 545 + (y − 382)·1,37
Nilai aliran: neraca massa & panas Gambar 3.5 (references/MASS.jpg) + design.json viewer v7 (DN, kecepatan, servis).
Pemakaian: python3 tools/cirata_scada.py <design.json>
"""
import json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cirata-site', 'assets', 'data')
DESIGN = json.load(open(sys.argv[1], encoding='utf-8'))

def T(x, y):
    return [round(x * 0.9375), round(30 + y * 1.3) if y < 375 else round(545 + (y - 382) * 1.37)]

# tag: [tipe, x_pfd, y_pfd, w, h, warna, [dx, dy, anchor] | None, nama tampilan | None, opsi]
U = {
  # ---------------- Area 100: in-situ waduk & pemanenan
  'T-MAT':   ['mat', 92, 92, 150, 66, 'green', None, 'Tikar eceng gondok'],
  'L-MAT':   ['label', 92, 128, 0, 0, 'gray', None, '430 ha · r = 0,03/hari'],
  'TB-102':  ['boom', 182, 128, 8, 176, 'gold', [10, 92, 'start'], 'Trash boom 1,4 km'],
  'INTAKE':  ['intake', 247, 128, 78, 58, 'gray', None, 'Intake PLTA|8 × 126 MW'],
  'EFB-101': ['efb', 95, 205, 158, 96, 'green', [-79, 66, 'start'], 'Ecological Floating Bed 2 ha'],
  'H-103':   ['boat', 372, 158, 88, 46, 'gray', [0, 44, 'middle'], 'Harvester boat'],
  'CV-104':  ['conveyor', 477, 150, 70, 24, 'gray', [0, -24, 'middle'], 'Belt conveyor'],
  'HP-105':  ['hopper', 472, 258, 60, 62, 'gray', [0, 48, 'middle'], 'Hopper umpan'],
  # ---------------- Area 200: penyiapan biomassa & pretreatment asam
  'S-201':   ['screw', 622, 260, 100, 30, 'gray', [0, -28, 'middle'], 'Screw press'],
  'TK-208':  ['tank', 622, 318, 40, 32, 'gray', [-30, 4, 'end'], 'Tangki pressate'],
  'M-202':   ['mill', 740, 247, 72, 46, 'gray', [0, 42, 'middle'], 'Hammer mill'],
  'E-203':   ['hxs', 867, 290, 50, 50, 'gray', [-38, 46, 'middle'], 'HX slurry–slurry'],
  'R-204':   ['agit', 985, 210, 76, 110, 'gray', [52, -18, 'start'], 'Reaktor pretreatment'],
  'TK-206':  ['tank', 875, 64, 50, 42, 'gray', [-32, -4, 'end'], 'Tangki H₂SO₄'],
  'P-206':   ['pump', 912, 118, 30, 30, 'gray', [0, 32, 'middle']],
  'TK-207':  ['tank', 1112, 64, 50, 42, 'gray', [-32, -4, 'end'], 'Tangki NaOH'],
  'P-207':   ['pump', 1154, 122, 30, 30, 'gray', [0, 32, 'middle']],
  'T-205':   ['cone', 1220, 222, 60, 96, 'gray', [-36, 64, 'end'], 'Tangki netralisasi'],
  'P-209':   ['pump', 1292, 280, 30, 30, 'gray', [-4, 32, 'end'], 'Pompa slurry'],
  # ---------------- Area 300–400: SSF, distilasi & dehidrasi
  'E-302':   ['hx', 1362, 280, 40, 40, 'gray', [0, 36, 'middle'], 'Cooler'],
  'TK-303':  ['hdrum', 1420, 60, 74, 24, 'gray', [44, -2, 'start'], 'Enzim + ragi'],
  'R-301A':  ['agit', 1452, 200, 60, 92, 'gray', [0, 62, 'middle'], 'Fermentor SSF'],
  'R-301B':  ['agit', 1532, 200, 60, 92, 'gray', [0, 90, 'middle'], 'Fermentor SSF'],
  'T-VENT':  ['stack', 1587, 55, 18, 40, 'gray', [16, -6, 'start'], 'Vent CO₂ biogenik', 'nt'],
  'P-304':   ['pump', 1610, 275, 30, 30, 'gray', [0, 32, 'middle']],
  'E-401':   ['hx', 1674, 277, 42, 42, 'gray', [-24, -30, 'end'], 'F/B HX'],
  'C-401':   ['column', 1762, 175, 52, 300, 'gray', [-34, -70, 'end'], 'Beer column'],
  'E-402':   ['hx', 1835, 48, 36, 36, 'gray', [24, 4, 'start'], 'Kondensor'],
  'V-403':   ['hdrum', 1849, 118, 76, 24, 'gray', [0, 30, 'middle'], 'Reflux drum'],
  'Z-406':   ['adsorber', 1937, 129, 38, 80, 'gray', [-24, 54, 'end'], 'Mol. sieve'],
  'TK-408':  ['tank', 1965, 262, 62, 60, 'gray', [0, 46, 'middle'], 'Bioetanol 99,5%'],
  'E-405':   ['heater', 1844, 255, 62, 22, 'hot', [0, 28, 'middle'], 'Reboiler'],
  # ---------------- Area 500: anaerobic co-digestion & biogas
  'E-501':   ['hx', 57, 492, 44, 44, 'gray', [0, 40, 'middle'], 'Stillage cooler'],
  'TK-502':  ['cone', 182, 507, 60, 90, 'gray', [-8, 66, 'end'], 'Tangki ekualisasi'],
  'P-503':   ['pump', 259, 516, 30, 30, 'gray', [0, 32, 'middle'], 'Pompa umpan'],
  'R-504':   ['agit', 360, 515, 100, 160, 'gray', [0, 100, 'middle'], 'Digester mesofilik'],
  'V-505':   ['gasholder', 500, 470, 64, 84, 'gray', [0, -54, 'middle'], 'Gas holder'],
  'D-506':   ['adsorber', 625, 452, 40, 80, 'gray', [0, -52, 'middle'], 'Desulfurizer H₂S'],
  'K-507':   ['compressor', 710, 452, 50, 40, 'gray', [0, 36, 'middle'], 'Biogas blower'],
  'FL-508':  ['flare', 565, 575, 16, 56, 'hot', [16, 4, 'start'], 'Flare darurat'],
  'X-509':   ['decanter', 382, 667, 60, 50, 'gray', [0, 44, 'middle'], 'Decanter digestat'],
  'BN-511':  ['hopper', 517, 645, 50, 44, 'gray', [34, -4, 'start'], 'Digestat padat'],
  'TK-510':  ['tank', 632, 675, 54, 40, 'gray', [0, 36, 'middle'], 'Digestat cair (POC)'],
  # ---------------- Area 600: utilitas steam, integrasi panas & listrik
  'B-601':   ['boiler', 940, 520, 96, 100, 'hot', [0, -68, 'middle'], 'Boiler biogas'],
  'ST-603':  ['stack', 1038, 430, 18, 52, 'gray', [16, -10, 'start'], 'Stack'],
  'K-602':   ['compressor', 824, 560, 46, 38, 'gray', [0, 34, 'middle'], 'FD fan'],
  'HDR-S21': ['steamhdr', 1167, 536, 220, 8, 'gray', [0, -12, 'middle'], 'Steam header 10 bar', 'nt'],
  'P-605':   ['pump', 1068, 656, 30, 30, 'gray', [0, 32, 'middle'], 'BFW pump'],
  'D-604':   ['hdrum', 1198, 653, 84, 28, 'gray', [0, 32, 'middle'], 'Deaerator / BFW'],
  'BUS':     ['bus', 1160, 696, 290, 6, 'gray', [-60, -10, 'middle'], 'Bus listrik internal', 'nt'],
  'T-FUEL':  ['term', 840, 662, 132, 24, 'gray', None, 'BBM cadangan'],
  'T-CHP':   ['term', 900, 696, 118, 24, 'gray', None, 'CHP + jaringan'],
  # ---------------- Area 700: polifenol & pressate
  'X-701':   ['agit', 1572, 495, 62, 84, 'gray', [0, 58, 'middle'], 'Ekstraktor polifenol'],
  'F-702':   ['filterpress', 1700, 495, 78, 40, 'gray', [0, -30, 'middle'], 'Filter press'],
  'EV-703':  ['evap', 1820, 495, 56, 76, 'hot', [0, 54, 'middle'], 'Thin-film evaporator'],
  'TK-704':  ['tank', 1959, 495, 56, 44, 'gray', [0, 38, 'middle'], 'Ekstrak polifenol'],
  'U-705':   ['hopper', 1602, 647, 62, 62, 'gray', [0, 48, 'middle'], 'Pengolahan pressate'],
  'T-POC':   ['term', 1815, 620, 160, 24, 'gray', None, 'POC / pupuk cair'],
  'T-W2':    ['term', 1817, 669, 170, 24, 'gray', None, 'Air proses daur ulang'],
}
POS = {k: T(v[1], v[2]) for k, v in U.items()}

def A(tag, side='c', d=0):
    """Titik jangkar unit di kanvas HMI: l/r/t/b/c, d = geser sepanjang sisi."""
    x, y = POS[tag]; w, h = U[tag][3], U[tag][4]
    if U[tag][0] in ('hx', 'compressor', 'pump'):
        r = min(w, h) / 2
        w = h = 2 * r
    return {'l': [x - w / 2, y + d], 'r': [x + w / 2, y + d], 't': [x + d, y - h / 2], 'b': [x + d, y + h / 2], 'c': [x, y]}[side]

def PO(tag):   # nozzle keluar pompa/kompresor (kanan atas)
    x, y = POS[tag]; w, h = U[tag][3], U[tag][4]; r = min(w, h) / 2
    return [x + r + (4 if U[tag][0] == 'pump' else w / 2 - r), y - r * 0.7]

R = lambda p: [round(p[0]), round(p[1])]
def path(*pts): return [R(p) for p in pts]
def mid(seg):
    best, bl = None, -1
    for a, b in zip(seg, seg[1:]):
        L = abs(a[0] - b[0]) + abs(a[1] - b[1])
        if L > bl: bl, best = L, [round((a[0] + b[0]) / 2), round((a[1] + b[1]) / 2)]
    return best

# hex konektor (posisi di kanvas)
HX = {'B-1@100': [199, 443], 'B-2@100': [248, 443], 'P-1@200': [690, 443], 'H-01@200': [848, 323], 'ST-1@300': [1606, 495], 'E-1@400': [1889, 495],
      'H-02@400': [1800, 432], 'H-05@400': [1866, 236], 'ST-1@500': [39, 604], 'B-3@500': [98, 604], 'B-1@500': [145, 604], 'W-AD@500': [194, 604], 'H-03@500': [428, 770],
      'B-2@700': [1380, 700], 'E-1@700': [1380, 728], 'B-3@700': [1594, 784], 'P-1@700': [1380, 908], 'H-04@700': [1752, 770], 'W-1@600': [1214, 916]}
HDR_X = [1022, 1073, 1125, 1177]   # turunan H-01..H-04 dari steam header
HDR_Y = 756
EL_X = [1080, 1136, 1192, 1248]
BUS_Y = 975

S = {}
def st(sid, segs, d='auto', hexes=(), v=None):
    S[sid] = {'s': segs, 'd': (mid(max(segs, key=lambda s: sum(abs(a[0] - b[0]) + abs(a[1] - b[1]) for a, b in zip(s, s[1:])))) if d == 'auto' else d), 'hex': [list(h) for h in hexes] or None}
    if v: S[sid]['v'] = v
    if not S[sid]['hex']: del S[sid]['hex']

mx, my = POS['T-MAT']; bx, by = POS['H-103']
st('S-00', [path(A('T-MAT', 'r'), [291, my], [291, by], A('H-103', 'l'))], d=[250, my])
st('S-00b', [path(A('H-103', 'r'), A('CV-104', 'l', 0))], d=None)
cx, cy = POS['CV-104']; hx, hy = POS['HP-105']
st('S-00c', [path(A('CV-104', 'r'), [cx + 52, cy], [cx + 52, hy - 54], [hx, hy - 54], A('HP-105', 't'))], d=None)
sx_, sy_ = POS['S-201']
st('S-01', [path(A('HP-105', 'r', -10), [506, POS['HP-105'][1] - 10], [506, sy_], A('S-201', 'l'))], d=[506, round((sy_ + POS['HP-105'][1]) / 2)])
ex, ey = POS['EFB-101']
st('B-1', [path([ex - 30, ey + 48], [ex - 30, 443], [HX['B-1@100'][0] - 22, 443]),
           path([HX['B-1@500'][0], 616], [HX['B-1@500'][0], 632], [POS['TK-502'][0], 632], A('TK-502', 't'))],
   d=[ex - 30, 410], hexes=[HX['B-1@100'] + ['B-1'], HX['B-1@500'] + ['B-1']])
st('B-2', [path([ex + 20, ey + 48], [ex + 20, 478], [HX['B-2@100'][0], 478], [HX['B-2@100'][0], 452]),
           path([HX['B-2@700'][0] + 22, 700], A('X-701', 'l'))],
   d=[ex + 74, 478], hexes=[HX['B-2@100'] + ['B-2'], HX['B-2@700'] + ['B-2']])
# Area 200
st('S-02', [path(A('S-201', 'b'), A('TK-208', 't'))])
st('P-1', [path(A('TK-208', 'r'), [HX['P-1@200'][0] - 22, 443]), path([HX['P-1@700'][0] + 22, 908], A('U-705', 'l'))],
   d=None, hexes=[HX['P-1@200'] + ['P-1'], HX['P-1@700'] + ['P-1']])
m2 = POS['M-202']
st('S-03', [path(A('S-201', 'r'), [654, sy_], [654, m2[1]], A('M-202', 'l'))], d=[654, round((sy_ + m2[1]) / 2)])
e3 = POS['E-203']
st('S-04', [path(A('M-202', 'r'), [752, m2[1]], [752, e3[1]], A('E-203', 'l'))], d=[752, round((m2[1] + e3[1]) / 2)])
r4 = POS['R-204']
st('S-05', [path(A('E-203', 't'), [e3[0], r4[1] - 30], A('R-204', 'l', -30))])
st('S-07', [path(A('R-204', 'b'), [r4[0], e3[1]], A('E-203', 'r'))])
t5 = POS['T-205']
st('S-08', [path(A('E-203', 'b'), [e3[0], 470], [t5[0], 470], A('T-205', 'b'))], d=[990, 470])
p6 = POS['P-206']; k6 = POS['TK-206']
st('S-06', [path(A('TK-206', 'b'), [k6[0], p6[1]], A('P-206', 'l')), path(PO('P-206'), [r4[0] - 20, PO('P-206')[1]], A('R-204', 't', -20))], d=[r4[0] - 20, 214])
p7 = POS['P-207']; k7 = POS['TK-207']
st('S-09', [path(A('TK-207', 'b'), [k7[0], p7[1]], A('P-207', 'l')), path(PO('P-207'), [1106, PO('P-207')[1]], [1106, t5[1] - 20], A('T-205', 'l', -20))], d=[1106, 250])
p9 = POS['P-209']; e2 = POS['E-302']
st('S-10', [path(A('T-205', 'r', -20), [1188, t5[1] - 20], [1188, p9[1]], A('P-209', 'l'))], d=[1188, 350])
st('S-10b', [path(PO('P-209'), [A('E-302', 'l')[0], PO('P-209')[1]])], d=None)
# Area 300–400
ra, rb = POS['R-301A'], POS['R-301B']
st('S-10c', [path(A('E-302', 't'), [e2[0], ra[1]], A('R-301A', 'l'))])
st('S-12A', [path(A('R-301A', 'r'), A('R-301B', 'l'))], d=None)
tk3 = POS['TK-303']
st('ENZ', [path(A('TK-303', 'b'), [tk3[0], 214], [ra[0], 214], A('R-301A', 't'))], d=None)
vt = POS['T-VENT']
st('S-11', [path(A('R-301B', 't'), [rb[0], 160], [vt[0], 160], A('T-VENT', 'b'))])
p4 = POS['P-304']; e4 = POS['E-401']; c4 = POS['C-401']
st('S-12', [path(A('R-301B', 'r', 20), [1480, rb[1] + 20], [1480, p4[1]], A('P-304', 'l'))], d=[1480, 350])
st('S-12b', [path(PO('P-304'), [A('E-401', 'l')[0], PO('P-304')[1]])], d=None)
st('S-12c', [path(A('E-401', 't'), [e4[0], 290], A('C-401', 'l', 290 - c4[1]))])
st('S-14', [path(A('C-401', 'b'), [c4[0], 462], [1606, 462], [1606, e4[1] + 8], [A('E-401', 'r')[0], e4[1] + 8])], d=[1630, 462])
st('ST-1', [path(A('E-401', 'b'), [e4[0], 495], [HX['ST-1@300'][0] - 22, 495]),
            path([HX['ST-1@500'][0], 616], [HX['ST-1@500'][0], 640], [POS['E-501'][0], 640], A('E-501', 't'))],
   d=None, hexes=[HX['ST-1@300'] + ['ST-1'], HX['ST-1@500'] + ['ST-1']])
e42 = POS['E-402']; v3 = POS['V-403']; z6 = POS['Z-406']; t8 = POS['TK-408']; e5 = POS['E-405']
st('V-401', [path(A('C-401', 't'), [c4[0], e42[1]], A('E-402', 'l'))], d=None)
st('L-402', [path(A('E-402', 'b'), A('V-403', 't', -14))], d=None)
st('L-403', [path(A('V-403', 'l'), [A('C-401', 'r')[0], v3[1]])], d=None)
st('S-13', [path(A('V-403', 'r'), A('Z-406', 'l', v3[1] - z6[1]))])
st('S-13E', [path(A('Z-406', 'b'), [z6[0], 300], [t8[0], 300], A('TK-408', 't'))], d=[1829, 300])
st('E-1', [path(A('TK-408', 'r'), [HX['E-1@400'][0], t8[1]], [HX['E-1@400'][0], 483]), path([HX['E-1@700'][0] + 22, 728], A('X-701', 'l', 28))],
   d=None, hexes=[HX['E-1@400'] + ['E-1'], HX['E-1@700'] + ['E-1']])
st('L-405', [path([A('C-401', 'r')[0], 394], [e5[0], 394], A('E-405', 'b'))], d=None)
st('V-405', [path(A('E-405', 't'), [e5[0], 336], [A('C-401', 'r')[0], 336])], d=None)
# Area 500
e51 = POS['E-501']; t52 = POS['TK-502']; p53 = POS['P-503']; r54 = POS['R-504']; v55 = POS['V-505']; d56 = POS['D-506']; k57 = POS['K-507']
st('S-14C', [path(A('E-501', 'r'), A('TK-502', 'l', e51[1] - t52[1]))])
st('B-3', [path([HX['B-3@700'][0], 772], [HX['B-3@700'][0], 760]), path([HX['B-3@500'][0], 616], [HX['B-3@500'][0], 645], [t52[0] - 15, 645], A('TK-502', 't', -15))],
   d=None, hexes=[HX['B-3@500'] + ['B-3'], HX['B-3@700'] + ['B-3']])
st('W-AD', [path([HX['W-AD@500'][0], 616], [HX['W-AD@500'][0], 632], [t52[0] + 15, 632], A('TK-502', 't', 15))], d=None, hexes=[HX['W-AD@500'] + ['W-AD']])
st('S-16', [path(A('TK-502', 'r', p53[1] - t52[1]), A('P-503', 'l'))], d=None)
st('S-16b', [path(PO('P-503'), [A('R-504', 'l')[0], PO('P-503')[1]])])
st('S-17', [path(A('R-504', 't'), [r54[0], 618], [420, 618], [420, v55[1]], A('V-505', 'l'))], d=[380, 618])
st('S-17b', [path(A('V-505', 'r', d56[1] - v55[1]), A('D-506', 'l'))], d=None)
st('S-17c', [path(A('D-506', 'r'), A('K-507', 'l'))], d=None)
b6 = POS['B-601']
st('S-17C', [path(PO('K-507'), [760, PO('K-507')[1]], [760, b6[1] - 34], A('B-601', 'l', -34))], d=[760, 660])
fl = POS['FL-508']
st('G-EX', [path(A('V-505', 'b'), [v55[0], 755], [fl[0], 755], A('FL-508', 't'))], d=[500, 755])
st('S-18', [path(A('R-504', 'l', 50), [268, r54[1] + 50], [268, POS['X-509'][1]], A('X-509', 'l'))], d=[268, 860])
x9 = POS['X-509']
st('S-18A', [path(A('X-509', 'r', -10), [424, x9[1] - 10], [424, POS['BN-511'][1]], A('BN-511', 'l'))], d=None)
st('S-18B', [path(A('X-509', 'r', 10), A('TK-510', 'l', x9[1] + 10 - POS['TK-510'][1]))], d=[480, x9[1] + 10])
# Area 600
k62 = POS['K-602']
st('S-19', [path(PO('K-602'), [810, PO('K-602')[1]], [810, b6[1] + 26], A('B-601', 'l', 26))], d=None)
s63 = POS['ST-603']
st('S-20', [path(A('B-601', 't', 30), [b6[0] + 30, 660], [s63[0], 660], A('ST-603', 'b'))], d=[940, 660])
st('S-21', [path(A('B-601', 'r'), [HDR_X[0] - 40, HDR_Y])], d=[958, HDR_Y])
dp = POS['D-604']; p65 = POS['P-605']
st('W-BFW', [path(A('D-604', 'l'), A('P-605', 'r', dp[1] - p65[1]))], d=None)
st('W-BFW+RET', [path(A('P-605', 'l'), [900, p65[1]], [900, A('B-601', 'b')[1]])], d=[900, 850])
st('W-1', [path([HX['W-1@600'][0] - 22, dp[1]], A('D-604', 'r'))], d=None, hexes=[HX['W-1@600'] + ['W-1']])
st('FUEL', [path(A('T-FUEL', 'r'), [866, POS['T-FUEL'][1]], [866, A('B-601', 'b')[1]])], d=None)
st('EL-00', [path(A('T-CHP', 'r'), [EL_X[0] - 125, BUS_Y])], d=None)
for i, (h, cons) in enumerate(zip(['H-01', 'H-02', 'H-03', 'H-04'], ['H-01@200', 'H-02@400', 'H-03@500', 'H-04@700'])):
    segs = [path([HDR_X[i], HDR_Y + 4], [HDR_X[i], 800])]
    c = HX[cons]
    if h == 'H-01': segs.append(path([c[0] + 22, c[1]], A('R-204', 'l', c[1] - r4[1])))
    if h == 'H-02': segs.append(path([c[0], c[1] - 12], [c[0], e5[1]], A('E-405', 'r')))
    if h == 'H-03': segs.append(path([c[0] - 22, c[1]], A('R-504', 'r', c[1] - r54[1])))
    if h == 'H-04': segs.append(path([c[0], c[1] - 12], [c[0], POS['EV-703'][1] + 20], A('EV-703', 'r', 20)))
    st(h, segs, d=None, hexes=[[HDR_X[i], 812, h], c + [h]])
st('H-05', [path([HX['H-05@400'][0] - 22, HX['H-05@400'][1]], [z6[0] + 2, HX['H-05@400'][1]])], d=None, hexes=[HX['H-05@400'] + ['H-05']])
for i, e in enumerate(['EL-01', 'EL-02', 'EL-03', 'EL-04']):
    st(e, [path([EL_X[i], BUS_Y + 3], [EL_X[i], 996])], d=None, hexes=[[EL_X[i], 1008, e]])
# Area 700
x71 = POS['X-701']; f72 = POS['F-702']; e73 = POS['EV-703']; t74 = POS['TK-704']; u75 = POS['U-705']
st('S-23P', [path(A('X-701', 'r'), A('F-702', 'l'))], d=None)
st('S-23F', [path(A('F-702', 'r'), A('EV-703', 'l'))], d=None)
st('S-23', [path(A('EV-703', 'r'), A('TK-704', 'l'))])
st('S-24', [path(A('EV-703', 't'), [e73[0], 626], [x71[0], 626], A('X-701', 't'))], d=[1590, 626])
st('B-3x', [path(A('F-702', 'b'), [f72[0], 772])], d=None)
S['B-3']['s'].append(S.pop('B-3x')['s'][0])
st('S-02P', [path(A('U-705', 'r', -10), [1580, u75[1] - 10], [1580, POS['T-POC'][1]], A('T-POC', 'l'))], d=None)
st('W-2', [path(A('U-705', 'r', 10), [1580, u75[1] + 10], [1580, POS['T-W2'][1]], A('T-W2', 'l'))], d=None)

BOXES = [
  {'r': [10, 46, 340, 330], 'l': 'Waduk Cirata · 6.200 ha · TP 0,24 mg/L · DO 2 mg/L', 'lp': [16, 64]},
  {'r': [1238, 560, 0, 0], 'l': '', 'lp': [0, 0]},
  {'r': [1220, 584, 188, 88], 'l': 'HRN-606 · integrasi panas', 'lp': [1226, 602]},
  {'r': [1332, 572, 576, 228], 'l': '7A · Ekstraksi polifenol', 'lp': [1338, 590]},
  {'r': [1332, 808, 576, 238], 'l': '7B · Pengolahan pressate & air proses', 'lp': [1338, 826]},
]
BOXES = [b for b in BOXES if b['r'][2] > 0]
AREAS = [  # bingkai area + judul (seperti PFD)
  [6, 40, 500, 482, 'Area 100 · In-situ Waduk & Pemanenan'], [510, 40, 718, 482, 'Area 200 · Penyiapan Biomassa & Pretreatment Asam'],
  [1232, 40, 682, 482, 'Area 300–400 · SSF, Distilasi & Dehidrasi'], [6, 560, 700, 500, 'Area 500 · Anaerobic Co-Digestion & Biogas'],
  [712, 560, 604, 500, 'Area 600 · Utilitas Steam, Integrasi Panas & Listrik'], [1320, 560, 594, 500, 'Area 700 · Ekstraksi Polifenol & Pengolahan Pressate'],
]
SCREENS = [
  {'id': 'overview', 't': 'Overview Plant', 'panes': [[4, 36, 1912, 1030]], 'table': False},
  {'id': 'a100', 't': 'Area 100: Waduk & Panen', 'panes': [[6, 40, 500, 482]], 'table': True},
  {'id': 'a200', 't': 'Area 200: Pretreatment', 'panes': [[510, 40, 718, 482]], 'table': True},
  {'id': 'a300', 't': 'Area 300–400: SSF & Distilasi', 'panes': [[1232, 40, 682, 482]], 'table': True},
  {'id': 'a500', 't': 'Area 500: Digester & Biogas', 'panes': [[6, 560, 700, 500]], 'table': True},
  {'id': 'a600', 't': 'Area 600: Steam & Listrik', 'panes': [[712, 560, 604, 500]], 'table': True},
  {'id': 'a700', 't': 'Area 700: Polifenol & Pressate', 'panes': [[1320, 560, 594, 500]], 'table': True},
]
units = {}
for k, v in U.items():
    x, y = POS[k]
    units[k] = {'t': v[0], 'x': x, 'y': y, 'w': v[3], 'h': v[4], 'c': v[5], 'lab': v[6], 'n': v[7] if len(v) > 7 else None}
    if len(v) > 8 and v[8] == 'nt': units[k]['nt'] = True
layout = {'grid': [1920, 1080], 'units': units, 'streams': S, 'boxes': BOXES, 'areas': AREAS, 'screens': SCREENS}
json.dump(layout, open(os.path.join(ROOT, 'scada-layout.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ======================================================================== register aliran
# sid: [medium, dari, ke, nama PFD, q, satuan, status, T °C, P bar a, rute design.json (untuk DN/v)]
BM, CP, AP, ET, BG, FG, RG, EF, PN, EL = 'Biomassa / slurry', 'Cairan proses', 'Air / pressate', 'Etanol / pelarut', 'Biogas', 'CO₂ / gas buang', 'Reagen', 'Biomassa EFB / udara', 'Steam / panas', 'Listrik'
REG = {
 'S-00': [BM, 'T-MAT', 'H-103', 'Eceng gondok liar dipanen', 200.0, 't/hari', 'SOURCE', 28, None, None],
 'S-00b': [BM, 'H-103', 'CV-104', 'Bongkar kapal panen ke conveyor', 200.0, 't/hari', 'SOURCE', 28, None, None],
 'S-00c': [BM, 'CV-104', 'HP-105', 'Conveyor ke hopper umpan', 200.0, 't/hari', 'SOURCE', 28, None, None],
 'S-01': [BM, 'HP-105', 'S-201', 'Eceng gondok basah (TS 9,54%)', 200.0, 't/hari', 'SOURCE', 28, None, None],
 'B-1': [EF, 'EFB-101', 'TK-502', 'Biomassa EFB ke co-digestion (S-15)', 3.0, 't/hari', 'SOURCE', 28, None, None],
 'B-2': [EF, 'EFB-101', 'X-701', 'Biomassa EFB ke ekstraksi (S-22)', 1.0, 't/hari', 'SOURCE', 28, None, None],
 'S-02': [AP, 'S-201', 'TK-208', 'Pressate dari screw press', 109.393, 't/hari', 'SOURCE', 28, 1.0, ('S-02', 'S-201')],
 'P-1': [AP, 'TK-208', 'U-705', 'Pressate ke pengolahan', 109.393, 't/hari', 'SOURCE', 28, 1.5, ('S-02', 'TK-208')],
 'S-03': [BM, 'S-201', 'M-202', 'Cake TS 20%', 90.607, 't/hari', 'SOURCE', 28, None, None],
 'S-04': [BM, 'M-202', 'E-203', 'Biomassa giling < 2 mm', 90.607, 't/hari', 'CALCULATED', 28, None, None],
 'S-05': [BM, 'E-203', 'R-204', 'Umpan pretreatment terpanaskan', 91.347, 't/hari', 'CALCULATED', 74, 1.0, None],
 'S-06': [RG, 'TK-206', 'R-204', 'H₂SO₄ 98%', 0.740, 't/hari', 'SOURCE', 30, 2.0, ('S-06', 'TK-206')],
 'S-07': [BM, 'R-204', 'E-203', 'Slurry pretreatment 100 °C', 91.347, 't/hari', 'CALCULATED', 100, 1.0, ('S-10A', 'R-204')],
 'S-08': [BM, 'E-203', 'T-205', 'Slurry terdinginkan', 91.347, 't/hari', 'CALCULATED', 55, 1.0, ('S-10A', 'R-204')],
 'S-09': [RG, 'TK-207', 'T-205', 'NaOH 50%', 1.183, 't/hari', 'SOURCE', 30, 2.0, ('S-09', 'TK-207')],
 'S-10': [BM, 'T-205', 'P-209', 'Slurry ternetralisasi (pH 4,8–5,5)', 92.530, 't/hari', 'CALCULATED', 50, 1.0, ('S-10', 'T-205')],
 'S-10b': [BM, 'P-209', 'E-302', 'Slurry ke cooler', 92.530, 't/hari', 'CALCULATED', 50, 3.0, ('S-10', 'P-209')],
 'S-10c': [BM, 'E-302', 'R-301A', 'Slurry 35 °C ke SSF', 92.530, 't/hari', 'CALCULATED', 35, 2.5, ('S-10', 'rack')],
 'ENZ': [RG, 'TK-303', 'R-301A', 'Enzim + ragi + nutrien', None, 't/hari', 'ASSUMED', 30, 1.5, ('ENZ', 'TK-303')],
 'S-12A': [CP, 'R-301A', 'R-301B', 'Broth fermentasi antar-fermentor', 90.836, 't/hari', 'ASSUMED', 35, 1.2, ('S-12A', 'R-301A')],
 'S-11': [FG, 'R-301B', 'T-VENT', 'CO₂ biogenik fermentasi', 3.388, 't/hari', 'SOURCE', 35, 1.0, ('S-11', 'R-301A/B')],
 'S-12': [CP, 'R-301B', 'P-304', 'Beer 3,8% b/b', 89.142, 't/hari', 'CALCULATED', 35, 1.2, ('S-12', 'R-301B')],
 'S-12b': [CP, 'P-304', 'E-401', 'Beer ke F/B HX', 89.142, 't/hari', 'CALCULATED', 35, 3.0, ('S-12', 'P-304')],
 'S-12c': [CP, 'E-401', 'C-401', 'Beer terpanaskan ke beer column', 89.142, 't/hari', 'CALCULATED', 85, 2.0, ('S-12', 'E-401')],
 'S-14': [CP, 'C-401', 'E-401', 'Stillage', 85.932, 't/hari', 'CALCULATED', 100, 1.5, ('S-14', 'C-401')],
 'ST-1': [CP, 'E-401', 'E-501', 'Stillage ke Area 500', 85.932, 't/hari', 'CALCULATED', 60, 2.0, ('S-14', 'rack')],
 'V-401': [ET, 'C-401', 'E-402', 'Uap etanol–air overhead', 12.841, 't/hari', 'ASSUMED', 92, 1.0, ('V-402', 'C-402')],
 'L-402': [ET, 'E-402', 'V-403', 'Kondensat etanol–air', 12.841, 't/hari', 'ASSUMED', 78, 1.0, ('L-402', 'E-402')],
 'L-403': [ET, 'V-403', 'C-401', 'Reflux', 9.631, 't/hari', 'ASSUMED', 78, 1.2, ('L-403', 'V-403')],
 'S-13': [ET, 'V-403', 'Z-406', 'Etanol 92–94% ke molecular sieve', 3.210, 't/hari', 'CALCULATED', 78, 1.5, ('S-13', 'V-403')],
 'S-13E': [ET, 'Z-406', 'TK-408', 'Bioetanol 2G 99,5% v/v', 3.183, 't/hari', 'SOURCE', 40, 1.2, ('S-13E', 'Z-406')],
 'E-1': [ET, 'TK-408', 'X-701', 'Make-up pelarut etanol (35,18 L/hari)', 0.0278, 't/hari', 'SOURCE', 30, 1.5, ('E-1', 'TK-408A')],
 'L-405': [CP, 'C-401', 'E-405', 'Bottoms ke reboiler', 17.166, 't/hari', 'ASSUMED', 100, 1.2, ('L-405', 'C-401')],
 'V-405': [CP, 'E-405', 'C-401', 'Uap reboiler (dua fase)', 17.166, 't/hari', 'ASSUMED', 101, 1.2, ('V-405', 'E-405')],
 'S-14C': [CP, 'E-501', 'TK-502', 'Stillage terdinginkan 35 °C', 85.932, 't/hari', 'CALCULATED', 35, 1.5, ('S-14', 'rack')],
 'B-3': [EF, 'F-702', 'TK-502', 'Residu ekstraksi ke co-feed AD', 1.041, 't/hari', 'SOURCE', 30, None, ('B-3', 'F-702')],
 'W-AD': [AP, 'T-WAD', 'TK-502', 'Air pengencer AD (opsi pressate P-1)', 45.829, 't/hari', 'CALCULATED', 28, 1.5, None],
 'S-16': [BM, 'TK-502', 'P-503', 'Umpan AD (TS 10%, C/N 20–30)', 135.802, 't/hari', 'SOURCE', 35, 1.2, ('S-16', 'P-503')],
 'S-16b': [BM, 'P-503', 'R-504', 'Umpan digester', 135.802, 't/hari', 'SOURCE', 35, 2.5, ('S-16', 'E-501')],
 'S-17': [BG, 'R-504', 'V-505', 'Biogas mentah 3.647 Nm³/hari', 4.838, 't/hari', 'SOURCE', 35, 1.05, ('S-17', 'R-504')],
 'S-17b': [BG, 'V-505', 'D-506', 'Biogas ke desulfurizer', 4.838, 't/hari', 'SOURCE', 35, 1.05, ('S-17', 'V-505')],
 'S-17c': [BG, 'D-506', 'K-507', 'Biogas bebas H₂S', 4.748, 't/hari', 'SOURCE', 35, 1.05, ('S-17C', 'D-506B')],
 'S-17C': [BG, 'K-507', 'B-601', 'Biogas bersih ke boiler', 3.685, 't/hari', 'CALCULATED', 40, 1.3, ('S-17C', 'rack')],
 'G-EX': [BG, 'V-505', 'FL-508', 'Gas surplus (CHP / flare darurat)', 1.063, 't/hari', 'SOURCE', 35, 1.05, ('G-EX', 'V-505')],
 'S-18': [BM, 'R-504', 'X-509', 'Digestat', 130.964, 't/hari', 'SOURCE', 35, 1.5, ('S-18', 'R-504')],
 'S-18A': [BM, 'X-509', 'BN-511', 'Cake digestat (pupuk organik padat)', 32.663, 't/hari', 'SOURCE', 35, None, None],
 'S-18B': [AP, 'X-509', 'TK-510', 'Digestat cair (POC)', 98.301, 't/hari', 'SOURCE', 35, 1.5, ('S-18B', 'X-509')],
 'S-19': [EF, 'K-602', 'B-601', 'Udara pembakaran', 20.093, 't/hari', 'SOURCE', 30, 1.05, None],
 'S-20': [FG, 'B-601', 'ST-603', 'Gas buang 180 °C', 23.778, 't/hari', 'SOURCE', 180, 1.0, ('S-20', 'B-601')],
 'S-21': [PN, 'B-601', 'HDR-S21', 'Steam jenuh 10 bar a (36,15 GJ/hari)', 15.657, 't/hari', 'SOURCE', 180, 10.0, ('S-21', 'B-601')],
 'H-01': [PN, 'HDR-S21', 'R-204', 'Steam ke pretreatment R-204/T-205', 4.63, 'GJ/hari', 'CALCULATED', 180, 10.0, ('S-21a', 'rack')],
 'H-02': [PN, 'HDR-S21', 'E-405', 'Steam ke reboiler distilasi C-401/C-402', 27.47, 'GJ/hari', 'CALCULATED', 180, 10.0, ('S-21b', 'rack')],
 'H-03': [PN, 'HDR-S21', 'R-504', 'Pemanas digester (via HEN E-501)', None, 'GJ/hari', 'SIAGA', 180, 10.0, ('S-21f', 'rack')],
 'H-04': [PN, 'HDR-S21', 'EV-703', 'Steam ke evaporator pelarut', 0.04, 'GJ/hari', 'CALCULATED', 180, 10.0, ('S-21e', 'rack')],
 'H-05': [PN, 'HDR-S21', 'Z-406', 'Steam ke dehidrasi (vaporizer E-407)', 4.02, 'GJ/hari', 'CALCULATED', 180, 10.0, ('S-21d', 'rack')],
 'W-BFW': [AP, 'D-604', 'P-605', 'Air umpan boiler', 16.141, 't/hari', 'CALCULATED', 105, 1.2, None],
 'W-BFW+RET': [AP, 'P-605', 'B-601', 'BFW ke boiler', 16.141, 't/hari', 'CALCULATED', 105, 11.0, ('W-BFW+RET', 'P-605')],
 'W-1': [AP, 'T-W1', 'D-604', 'Kondensat balik + make-up BFW', 16.141, 't/hari', 'CALCULATED', 80, 1.2, ('W-RET', 'rack')],
 'FUEL': [FG, 'T-FUEL', 'B-601', 'Bahan bakar cadangan (siaga)', None, 'GJ/hari', 'SIAGA', None, None, None],
 'EL-00': [EL, 'T-CHP', 'BUS', 'Listrik CHP 1.195,6 + jaringan 63,4 kWh/hari', 1259.01, 'kWh/hari', 'CALCULATED', None, None, None],
 'EL-01': [EL, 'BUS', 'S-201', 'Listrik screw press & hammer mill', None, 'kWh/hari', 'ASSUMED', None, None, None],
 'EL-02': [EL, 'BUS', 'R-504', 'Listrik pompa & agitator', None, 'kWh/hari', 'ASSUMED', None, None, None],
 'EL-03': [EL, 'BUS', 'K-507', 'Listrik blower K-507/K-602', None, 'kWh/hari', 'ASSUMED', None, None, None],
 'EL-04': [EL, 'BUS', 'CONTROL', 'Listrik kontrol & penerangan', None, 'kWh/hari', 'ASSUMED', None, None, None],
 'S-23P': [ET, 'X-701', 'F-702', 'Slurry ekstraksi (etanol 70% + biomassa)', 1.808, 't/hari', 'CALCULATED', 40, 1.2, ('S-23P', 'X-701')],
 'S-23F': [ET, 'F-702', 'EV-703', 'Filtrat ekstrak', 0.808, 't/hari', 'CALCULATED', 40, 1.2, ('S-23P', 'F-702')],
 'S-23': [ET, 'EV-703', 'TK-704', 'Ekstrak kaya polifenol (1,5 kg/hari)', 0.0015, 't/hari', 'SOURCE', 40, 1.0, ('S-23', 'EV-703')],
 'S-24': [ET, 'EV-703', 'X-701', 'Pelarut pulih (recovery 95%)', 0.808, 't/hari', 'CALCULATED', 40, 1.2, ('S-24', 'TK-703R')],
 'S-02P': [AP, 'U-705', 'T-POC', 'Pressate terolah → POC / pupuk cair', 109.393, 't/hari', 'CALCULATED', 28, None, None],
 'W-2': [AP, 'U-705', 'T-W2', 'Air proses daur ulang ke S-201 / X-701', None, 't/hari', 'SIAGA', 28, None, None],
}
missing = [k for k in S if k not in REG]
assert not missing, missing

routes = list(DESIGN['routes'].values())
def route(key):
    if not key: return None
    rid, frm = key
    for r in routes:
        if r.get('id') == rid and (frm is None or r.get('dari') == frm): return r
    for r in routes:
        if r.get('id') == rid: return r
    return None

streams, neraca, pipa = [], [], []
for sid, (med, f, t, nm, q, u, stt, Tc, Pb, rk) in REG.items():
    streams.append({'stream_id': sid, 'medium': med, 'from_tag': f, 'to_tag': t, 'pfd_name': nm, 'status': stt})
    neraca.append({'id': sid, 'q': q, 'u': u, 'jenis': 'energi' if u in ('GJ/hari', 'kWh/hari') else 'massa', 'status': stt, 'basis': 'Neraca massa & panas D200'})
    r = route(rk)
    dn = r.get('DN') if r else None
    dnv = int(dn[2:]) if dn and dn.startswith('DN') else None
    pipa.append({'id': sid, 'T': Tc, 'P': Pb, 'DN': dnv, 'v': r.get('v_m_s') if r and dnv else None, 'servis': r.get('servis') if r else None})

# ======================================================================== register peralatan
AREA_OF = {}
for k, v in U.items():
    x = v[1]; y = v[2]
    if y < 375: AREA_OF[k] = '100' if x < 540 else '200' if x < 1300 else ('300' if x < 1700 else '400')
    else: AREA_OF[k] = '500' if x < 770 else '600' if x < 1420 else '700'
EQX = DESIGN['equipment']
NAMES = {'T-MAT': 'Tikar eceng gondok (430 ha)', 'INTAKE': 'Intake PLTA Cirata', 'TB-102': 'Trash boom 1,4 km', 'H-103': 'Kapal panen (harvester boat)', 'CV-104': 'Belt conveyor darat',
         'EFB-101': 'Ecological Floating Bed 2 ha (40 modul × 500 m²)', 'S-201': 'Screw press (dewatering)', 'M-202': 'Hammer mill < 2 mm', 'E-203': 'HX slurry–slurry (HR 80%, 17,17 GJ/hari)',
         'P-206': 'Pompa dosis H₂SO₄', 'P-207': 'Pompa dosis NaOH', 'P-209': 'Pompa slurry', 'E-302': 'Plate cooler ke 35 °C', 'P-304': 'Pompa beer', 'E-401': 'Feed/bottoms HX beer–stillage',
         'C-401': 'Beer column + rectifier', 'E-402': 'Kondensor overhead', 'V-403': 'Reflux drum', 'Z-406': 'Molecular sieve 3Å (2 bed)', 'TK-408': 'Tangki bioetanol 99,5% v/v',
         'E-405': 'Reboiler C-401', 'E-501': 'Stillage cooler / pemanas umpan AD', 'P-503': 'Pompa umpan digester', 'R-504': 'Digester mesofilik CSTR 35 °C', 'D-506': 'Desulfurizer Fe-oxide (lead-lag)',
         'K-507': 'Blower biogas', 'X-509': 'Decanter digestat', 'B-601': 'Fired steam boiler biogas (η 76,2%)', 'K-602': 'FD fan boiler', 'P-605': 'Pompa BFW', 'D-604': 'Deaerator & penerimaan kondensat',
         'X-701': 'Ekstraktor polifenol (EtOH 70%)', 'F-702': 'Filter press ekstrak', 'EV-703': 'Thin-film evaporator pelarut', 'U-705': 'Pengolahan pressate (sedimentasi + stabilisasi)',
         'R-301A': 'Fermentor SSF A (171 m³)', 'R-301B': 'Fermentor SSF B (171 m³)'}
BASIS = {'T-MAT': 'tutupan 430 ha (6,94% waduk), r 0,03/hari, waktu ganda 23 hari', 'EFB-101': 'kangkung 9.600 m² + selada air 6.400 m²; panen 28/40 hari',
         'TB-102': 'penahan pasif 1,4 km; jebol pada debit 243 m³/s', 'INTAKE': '8 × 126 MW (PLTA 1.008 MW); kerugian Rp17,07 juta/jam-unit',
         'H-103': '±160 t/trip', 'S-201': '200 t/hari basah → cake TS 20%', 'R-204': 'H₂SO₄ 1% b/v, 100 °C, 30 menit', 'R-301A': 'SSF 35 °C, 48–72 jam, pH 4,8–5,0',
         'R-301B': 'SSF 35 °C, 48–72 jam, pH 4,8–5,0', 'C-401': 'beer 3,8% b/b → ±45% → 92–94% b/b', 'Z-406': '95 → 99,5% v/v', 'R-504': 'HRT ±25 hari, C/N 20–30, ±2.785 m³',
         'B-601': '15,67 t/hari uap 10 bar abs; 100% dari biogas (rasio 1,29)', 'X-701': '1 t/hari biomassa EFB, 10 L/kg DM, recovery 95%'}
eq = []
for k, v in U.items():
    if v[0] in ('label', 'term', 'node') or k.startswith('T-') and k not in ('T-MAT', 'T-205'): continue
    if k in ('BUS', 'HDR-S21'): continue
    d = EQX.get(k, {})
    name = NAMES.get(k) or d.get('nama') or v[7] or k
    eq.append({'tag': k, 'area': AREA_OF[k], 'name': name, 'equipment_type': v[0], 'status': 'DESAIN D200', 'size': d.get('size'), 'sizing_basis': BASIS.get(k) or d.get('basis')})
json.dump(eq, open(os.path.join(ROOT, 'equipment.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(streams, open(os.path.join(ROOT, 'streams.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(neraca, open(os.path.join(ROOT, 'neraca.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(pipa, open(os.path.join(ROOT, 'pipa.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('unit', len(units), 'aliran', len(S), 'register', len(streams), 'alat', len(eq), 'pipa DN', sum(1 for p in pipa if p['DN']))
