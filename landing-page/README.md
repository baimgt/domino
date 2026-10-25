# 🌐 Website Promosi & Download APK Kings Billiards & Domino (Next.js Edition)

Website resmi promosi dan unduh file APK untuk **Kings Billiards & Domino** (Edisi Modern Next.js 14 App Router, TypeScript, dan Tailwind-free Vanilla CSS Design System).

---

## 🌟 Fitur Unggulan Versi Next.js

1. **⚡ Next.js 14 App Router**: Rendering super cepat, SEO server-side metadata lengkap (OpenGraph, Twitter Cards, Google JSON-LD schema, metadataBase).
2. **👑 Desain Mewah VIP Casino**:
   - Tema gelap *Obsidian Dark* dengan aksen emas kerajaan (*gold gradient*), glassmorphism `backdrop-blur(16px)`, border glowing, dan animasi interaktif.
   - Tipografi elegan menggunakan Google Fonts resmi (**Outfit** & **Plus Jakarta Sans**).
3. **✨ Golden Embers Canvas Particles**: Mesin partikel canvas ringan yang menyimulasikan debu emas kasino mengambang di latar belakang.
4. **📊 Spesifikasi Resmi & Tabel Perbandingan**:
   - Kartu spesifikasi lengkap (Versi v2.79, Ukuran 160 MB Full HD, OS Android 5.0+, 100% Bebas Virus).
   - Tabel komparasi transparan: **APK Resmi Kami (0% Ban Risk)** vs **APK Mod Bajakan**.
5. **🎮 Showcase Permainan Interaktif dengan Filter Kategori**:
   - Filter tab: *Semua*, *Billiard & Domino*, *Slot Kasino VIP*, dan *1v1 By One PvP*.
   - Kartu game HD: Gates of Gatotkaca, 8-Ball Billiards, Domino Gaple, Qiu Qiu 99, Mahjong Ways 2, By One Duel.
   - Info win rate, status RTP gacor (98.8%), dan jumlah pemain online real-time.
6. **📱 Panduan Install Android dengan Brand Switcher (HP Spesifik)**:
   - Pilih merek HP Anda (**Samsung One UI**, **Xiaomi/POCO HyperOS**, **Oppo/Realme ColorOS**, **Vivo/Lainnya**) untuk melihat panduan khusus mengaktifkan *"Instal dari Sumber Tidak Dikenal"*.
7. **🔔 Live Real-Time Download Ticker**:
   - Notifikasi mengambang yang menampilkan unduhan terbaru dari berbagai kota di Indonesia (*social proof* konversi tinggi).
8. **💬 Testimoni Pemain & Akordion FAQ**:
   - Ulasan pemain VIP terverifikasi dan akordion FAQ yang menjawab pertanyaan seputar keamanan file, bonus pendaftaran baru, dan transfer koin.
9. **🚀 Modal Download VIP dengan Confetti**:
   - Pemilih server unduhan (*Server VIP Jakarta*, *Mirror Singapore*, *Cloud Drive*).
   - Progress bar animasi (0% hingga 100%) dengan ledakan efek konfeti saat unduhan selesai.
   - Pemicu unduhan langsung file APK asli `Kings-Billiards-v2.79.apk` (160 MB).

---

## 📂 Struktur Direktori Proyek

```
landing-page/
├── app/
│   ├── globals.css              # Sistem desain lengkap VIP Casino (CSS Variables, Glassmorphism)
│   ├── layout.tsx               # Root Layout, Fonts, SEO Metadata & OpenGraph
│   └── page.tsx                 # Halaman utama Next.js
├── components/
│   ├── Navbar.tsx               # Navigation bar transparan/sticky + mobile menu drawer
│   ├── ParticlesCanvas.tsx      # Canvas partikel bokeh emas
│   ├── HeroSection.tsx          # Hero banner, 3D card floating mockup, spec pills, CTA
│   ├── SpecsTable.tsx           # Spesifikasi APK & tabel komparasi resmi vs mod
│   ├── GameShowcase.tsx         # Tab filter & kartu game interaktif
│   ├── FeatureHighlights.tsx    # 6 Kartu 3D fitur unggulan VIP
│   ├── InstallationGuide.tsx    # Panduan install 5 langkah dengan switcher merek HP
│   ├── LiveDownloadTicker.tsx   # Notifikasi download mengambang real-time
│   ├── TestimonialsFaq.tsx      # Testimoni & FAQ akordion
│   ├── DownloadModal.tsx        # Modal download interaktif, progress bar, & pemicu APK
│   └── Footer.tsx               # Banner CTA bawah, legal disclaimer, & tombol ke atas
├── public/
│   └── assets/
│       ├── kings-billiards-v2.79.apk   # File APK asli (160 MB)
│       ├── hero_showcase.jpg           # Render promosi 3D utama
│       ├── kings_billiards_logo.png    # Logo resmi game
│       ├── billiard_lounge_bg.jpg      # Preview arena billiard
│       ├── slot_loading_bg.jpg         # Preview slot kasino
│       ├── zeus_real.png               # Banner Gates of Gatotkaca
│       └── byone_banner.jpg            # Banner By One 1v1 Billiards
├── next.config.mjs              # Konfigurasi Next.js
├── tsconfig.json                # Konfigurasi TypeScript
└── package.json                 # Skrip & dependensi
```

---

## 💻 Cara Menjalankan Secara Lokal

```bash
# Masuk ke folder landing-page
cd landing-page

# Jalankan server pengembangan Next.js
npm run dev
```

Buka browser dan buka: **`http://localhost:3000`**

Untuk menjalankan versi produksi:
```bash
npm run build
npm start
```

---

## 🌐 Panduan Deployment

### 1. Deploy ke Vercel (Paling Mudah & Gratis)
1. Buat repositori baru di GitHub atau push folder ini.
2. Buka [Vercel](https://vercel.com) dan impor repositori.
3. Vercel secara otomatis mendeteksi proyek Next.js dan langsung deploy dalam 1 menit dengan HTTPS gratis dan CDN global!

### 2. Deploy di VPS Ubuntu (Menggunakan PM2 / Docker)
```bash
# Build aplikasi
npm run build

# Jalankan dengan PM2 agar berjalan di latar belakang
npm install -g pm2
pm2 start npm --name "kings-download-web" -- start -- -p 3000
```
