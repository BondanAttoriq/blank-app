// Konstanta dari full report CIRATA-RESILIENT (Industrial Case Competition EUREKA! 2026) dan paket revisi pitch deck.
export const P = {
  site: {
    area: 6200, cover: 430, coverPct: 6.94, r: 0.03, doubling: 23.1, tp: 0.24, tn: 1.00, do: 2.0, tsi: 83.18, tsiTN: 54.5, tnTp: 4.2,
    plta: 1008, units: 8, plts: 192, downtime: 17074290, boom: 1.4, kja: 100000, debit: [72.18, 150.80, 243.27], msy: 774, safeHarvest: 540,
  },
  base: {
    cap: 200, cap2: 300, days: 320, ts: 9.5376, efbHa: 2, modules: 40, moduleM2: 500,
    ethYear: 1367931, ethYear2: 2051896, ethNet: 3.183, ethL: 4275, poly: 480, polyDay: 1.5, biogasYear: 802699, biogasDay: 3647, heatYear: 12040,
    nYear: 97.0, pYear: 12.9, nYear2: 145, pYear2: 19.3, nEfb: 1.14, pEfb: 0.105, perTon: { eth: 21.4, biogas: 12.5, steam: 78, kwh: 6.0, n: 1.50, p: 0.20 },
  },
  // Neraca massa D200 (t/hari)
  mass: { feed: 200, pressate: 109.393, cake: 90.607, h2so4: 0.740, naoh: 1.183, slurry: 92.530, beer: 89.142, co2: 3.388, stillage: 85.932, eth: 3.210, ethNet: 3.183,
    efbExt: 1.015, ekstrak: 0.0015, residu: 1.041, wad: 45.829, efbAd: 3.000, adFeed: 135.802, biogas: 4.838, gasBoiler: 3.685, gasEx: 1.063, digestat: 130.964,
    cakeD: 32.663, liqD: 98.301, air: 20.093, flue: 23.778, steam: 15.657, bfw: 2.050 },
  // Panas proses (GJ/hari): [unit, Q masuk, HEN, steam]
  heat: [['Distilasi C-401/C-402', 44.42, 16.94, 27.47], ['Pretreatment R-204/T-205', 23.52, 18.89, 4.63], ['Dehidrasi Z-406', 4.66, 0.64, 4.02], ['Digester TK-502/R-504', 1.79, 1.79, 0], ['Ekstraksi X-701', 1.24, 1.20, 0.04]],
  energy: { demand: 75.62, hen: 39.47, steam: 36.15, steamT: 15.657, biogas: 65.75, boiler: 51.03, ratio: 1.29, surplus: 14.72, ethGJ: 84.39, elec: 1259.01, chp: 1195.60, chpPct: 94.96,
    grid: 63.40, kwhL: 0.313, diesel: 182.70, elec300: 1858.03, chp300: 1652.63, chp300Pct: 88.95, qh: 33.71, qc: 32.05, pinch: 85, henA: 88.02, cw: 34.50, water: 67.34, hx1: 14.22, hx2: 13.45 },
  exergy: { boilerE: 76.2, steamEx: 23.16, prodEx: 29.22, total: 49.56, items: [['Boiler & pembakaran', 38.61], ['Perpindahan panas uap → proses', 4.71], ['Pendinginan proses → lingkungan', 3.87], ['Jaringan HEN', 1.84], ['Lain-lain (dihitung)', 0.53]] },
  env: { fossil: 94, base: 64.79, chp: 52.46, ctrl: 37.68, cons: 133.13, cut: { base: 31.07, chp: 44.19, ctrl: 59.92 }, avoided: [1.2, 1.6] },
  // TEA (Rp miliar)
  capex: [['Armada panen, conveyor, screening', 10.00], ['Staging, pencacahan, screw press', 7.50], ['EFB modular 2 ha & penambatan', 8.00], ['Pretreatment asam & conditioning', 9.50],
    ['Hidrolisis enzimatis & fermentasi', 10.00], ['Distilasi & molecular sieve', 12.00], ['Ekstraksi polifenol', 1.70], ['Anaerobic digester & gas handling', 10.00],
    ['Water reuse & ETP', 4.00], ['Integrasi panas, boiler, utilitas', 2.50], ['Sipil, listrik, bangunan', 4.50], ['Engineering, commissioning, kontingensi', 6.30]],
  capexTotal: 86.00, capexExp: 20.00,
  opex: [['Panen/pengumpulan eceng gondok', 11.52], ['Transportasi & staging feedstock', 4.48], ['Enzim hidrolisis', 4.40], ['Listrik, panas tambahan, utilitas', 3.20], ['Tenaga kerja & supervisi', 3.10],
    ['Asam, alkali, reagen pretreatment', 3.00], ['Maintenance plant', 2.90], ['Operasi digester & gas handling', 1.20], ['Pemeliharaan & panen EFB', 1.20], ['Fermentasi & media nutrisi', 1.00],
    ['Pengolahan air, limbah, residu', 1.00], ['QC, administrasi, perizinan', 1.00], ['Bahan operasi ekstraksi polifenol', 1.00]],
  opexTotal: 39.00, opex2: 54.90,
  rev2: [['Jasa pengangkatan biomassa', 57.60], ['Penjualan bioetanol', 22.43], ['Penjualan ekstrak polifenol', 0.08]], revTotal2: 80.11, ebitda2: 25.21, ebitda1: 14.4,
  ind: { npv: 25.29, irr: 13.15, pi: 1.27, pbp: 9.02, dpbp: 13.78, tarif: 600000, eth: 10933 },
  // Lampiran 11–12: [nilai, revenue II, NPV, IRR, PBP]
  sensTarif: [[500000, 70.51, -22.76, 6.84, 12.33], [550000, 75.31, 1.33, 10.17, 10.31], [600000, 80.11, 25.29, 13.15, 9.02], [650000, 84.91, 49.00, 15.87, 6.85], [700000, 89.71, 72.70, 18.43, 5.96]],
  sensEth: [[9500, 77.17, 10.66, 11.37, 9.74], [10933, 80.11, 25.29, 13.15, 9.02], [12500, 83.32, 41.17, 14.99, 8.39], [14000, 86.40, 56.37, 16.68, 6.54]],
  sensOpex: [[90, 80.11, 53.72, 16.44, 6.60], [95, 80.11, 39.50, 14.82, 8.43], [100, 80.11, 25.29, 13.15, 9.02], [105, 80.11, 10.93, 11.39, 9.74], [110, 80.11, -3.56, 9.53, 10.66]],
  sensSupply: [[70, 67200, -27.89, 6.07], [80, 76800, -10.09, 8.65], [90, 86400, 7.67, 10.99], [100, 96000, 25.29, 13.15]],
  // Lampiran 14: [biaya lama Rp/t, biaya lama, kontrak, downtime, manfaat bersih] (Rp miliar/tahun)
  pln: [[400000, 38.400, 57.600, 2.049, -17.151], [500000, 48.000, 57.600, 2.049, -7.551], [600000, 57.600, 57.600, 2.049, 2.049], [700000, 67.200, 57.600, 2.049, 11.649], [800000, 76.800, 57.600, 2.049, 21.249]],
  // Monte Carlo 20.000 iterasi (skenario kontrak): [indikator, full paper, rekonstruksi, P50, P5, P95]
  mc: [['NPV (Rp miliar)', 25.29, 25.37, 18.7, -4.0, 40.4], ['IRR (%)', 13.15, 13.16, 12.3, 9.5, 14.9], ['Payback (tahun)', 9.02, 9.01, 9.4, 8.4, 10.7]],
  mcProb: [['Tanpa kontrak', 76], ['Tarif jasa terkunci', 87], ['Tarif terkunci + offtake bioetanol', 91], ['Nilai sistem (termasuk downtime PLN)', 99.5]],
  spearman: [['Tarif jasa', 0.76], ['OPEX', -0.44], ['Harga etanol', 0.34]],
  // EFB efek lokal zona intake: [EFB, rezim, TN, ΔTN %, ΔTP %, r, Δr %, waktu ganda]
  intake: [['2 ha', 'Kemarau (72 m³/s)', 0.56, 44, 16, 0.024, 21, 29], ['2 ha', 'Normal (151 m³/s)', 0.76, 24, 8, 0.027, 9, 26], ['2 ha', 'Hujan (243 m³/s)', 0.85, 15, 5, 0.028, 6, 25],
    ['2 ha', 'Rata-rata tahunan', 0.72, 28, 9, 0.026, 12, 26], ['5 ha', 'Rata-rata tahunan', 0.48, 52, 23, 0.021, 29, 34], ['10 ha', 'Rata-rata tahunan', 0.28, 72, 41, 0.016, 48, 50]],
  efbPlant: [['Kangkung (I. aquatica)', 9600, '20×20 cm (25/m²)', 28, 0.28, 0.022, 346, 0.774, 0.061], ['Selada air (O. javanica)', 6400, '25×25 cm (16/m²)', 40, 0.20, 0.024, 184, 0.369, 0.044]],
  mcda: [['CIRATA-RESILIENT', 4.53], ['EFB/FTW saja', 3.30], ['Pembatasan KJA', 3.15], ['Biokontrol Neochetina', 2.65], ['Ekskavator + buang', 2.55], ['Trash boom saja', 2.38],
    ['Herbisida', 2.27], ['Inaktivasi P (alum)', 1.98], ['Aerasi', 1.85], ['Pengerukan', 1.75]],
  roadmap: [['Fase I', '200', 'tahun 1–8', 1.37, 96, 14.4, 86], ['Fase II', '300', 'tahun 9–12', 2.05, 144, 24.1, 110], ['Fase III', '500', 'tahun 13–16', 3.42, 240, 44.3, 149], ['Fase IV', '540 (70% MSY)', 'tahun 17+', 3.69, 259, 48.5, 156]],
  dyn: [['S0 Tanpa pengendalian terarah', 1.00, 240, '0%', 430], ['S1 CIRATA Fase I–II', 1.00, 240, '<1%', 386], ['S2 + EFB 50 ha & Fase III', 0.98, 239, '1%', 346], ['S3 + kontrol KJA −50%', 0.78, 167, '11%', 282], ['S4 Pemulihan penuh', 0.39, 71, '45%', 0]],
  specs: [['Bioetanol 2G', '99,5% v/v (SNI 7390; ASTM D4806)', '4.275 L/hari bersih'], ['Biogas terkondisi', '±73% CH₄; H₂S < 200 ppm setelah scrubber', '2.508 Nm³/hari'],
    ['Uap proses', '10 bar abs (±180 °C)', '15,66 t/hari'], ['Listrik CHP', 'η listrik 33%', '1.196 kWh/hari'], ['Ekstrak polifenol', 'ekstrak kasar; TPC Folin–Ciocalteu', '1,5 kg/hari'],
    ['CO₂ fermentasi', '±99% basis kering; peluang CCU', '3,57 t/hari'], ['Pressate / digestat', 'N+P₂O₅+K₂O 0,39% / 0,78%', '109,4 / 84,3 t/hari']],
};
