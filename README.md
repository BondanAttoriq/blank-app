# 🎈 Blank app template

A simple Streamlit app template for you to modify!

[![Open in Streamlit](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://blank-app-template.streamlit.app/)

### How to run it on your own machine

1. Install the requirements

   ```
   $ pip install -r requirements.txt
   ```

2. Run the app

   ```
   $ streamlit run streamlit_app.py
   ```

## FERROSCA · Prototipe 3D (folder `site/`)

Duplikat situs statis https://optimize-slow-project.netlify.app — simulator 3D pilot plant
valorisasi residu HPAL (three.js). Semua HTML, JS, library three.js, dan gambar ada di `site/`.

- **Deploy ke Netlify:** hubungkan repo ini; `netlify.toml` sudah mengatur `publish = "site"`.
- **Jalankan lokal:** `npx netlify-cli dev` (gambar memakai Netlify Image CDN `/.netlify/images`,
  jadi server statis biasa tidak akan menampilkan gambar tanpa Netlify).
