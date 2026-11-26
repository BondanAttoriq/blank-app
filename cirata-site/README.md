# CIRATA-RESILIENT Digital Twin

Website statis satu halaman untuk Industrial Case Competition EUREKA! 2026 (Tim UI x ITB: Bondan Attoriq, Jason Lee Wijaya, Inori Sehasaku).
Isi: model 3D (viewer v7.1 tema biru), SCADA/HMI 7 layar dengan mode simulasi, Engineering Dashboard (model arus kas 20 tahun),
neraca massa & energi, analisis 4E, efek lokal EFB di zona intake, ekonomi sirkular, unduhan, dan galeri.

## Deploy ke Netlify Drop
Buka https://app.netlify.com/drop lalu seret folder hasil ekstrak ZIP ini. Tidak ada build step.

## Menjalankan lokal
`python3 -m http.server 8000` di folder ini, lalu buka http://localhost:8000 (modul ES dan GLB tidak dapat dibuka dari file://).

## Struktur
- `index.html`, `assets/` (css, js, data, img, downloads), `_headers`
- `viewer3d/` viewer 3D mandiri (juga dapat dibuka layar penuh di `viewer3d/`), model `data/model.glb.gz` (6,4 MB) dengan cadangan `model.glb`
