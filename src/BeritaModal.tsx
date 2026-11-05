import React, { useState } from 'react';

interface Props {
  onClose: () => void;
  initialCategory?: string;
}

type NewsCategory = 'penipuan' | 'resmi' | 'perjanjian' | 'kebijakan' | 'update';

export default function BeritaModal({ onClose, initialCategory }: Props) {
  const [activeCategory, setActiveCategory] = useState<NewsCategory>(() => {
    if (initialCategory === 'penipuan') return 'penipuan';
    if (initialCategory === 'perjanjian') return 'perjanjian';
    if (initialCategory === 'kebijakan') return 'kebijakan';
    if (initialCategory === 'update') return 'update';
    return 'resmi'; // Default to "Pernyataan Resmi" as seen in HDI screenshot
  });

  const categories: { id: NewsCategory; label: string }[] = [
    { id: 'penipuan',   label: 'Waspada Penipuan' },
    { id: 'resmi',      label: 'Pernyataan Resmi' },
    { id: 'perjanjian', label: 'Perjanjian Pengguna' },
    { id: 'kebijakan',  label: 'Kebijakan Privasi' },
    { id: 'update',     label: 'Pembaruan Game' },
  ];

  return (
    <div className="modal-overlay tm-overlay-fade" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="rm-modal-box tm-box-bounce" onClick={e => e.stopPropagation()}>
        {/* Red 3D glossy circular close button in top right */}
        <button className="rm-close-3d-btn" onClick={onClose} aria-label="Tutup">
          ✕
        </button>

        {/* Royal Crown Arched Top Header with Sunburst Glow */}
        <div className="rm-header">
          <div className="rm-header-content">
            <div className="rm-title-wrap">
              <span className="rm-main-title">Berita</span>
              <span className="rm-sparkle">✨</span>
            </div>
            <div className="rm-beads-row">
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
            </div>
          </div>
        </div>

        {/* Inner Body: Dark Wine Sidebar + Solid Ivory/White Paper Content */}
        <div className="rm-inner-body">
          {/* Left Sidebar */}
          <div className="rm-sidebar-royal">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`rm-side-btn-royal ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Right White Paper Content */}
          <div className="rm-content-royal">
            {/* Authentic Dual Domino Tiles Watermark */}
            <div className="rm-paper-watermark" aria-hidden="true">
              <svg width="115" height="115" viewBox="0 0 100 100" fill="none">
                <g transform="rotate(-18 45 45)">
                  <rect x="20" y="10" width="34" height="64" rx="5" stroke="#701a40" strokeWidth="2.5" fill="none" />
                  <line x1="20" y1="42" x2="54" y2="42" stroke="#701a40" strokeWidth="2" />
                  <circle cx="37" cy="26" r="3" fill="#701a40" />
                  <circle cx="28" cy="50" r="2.8" fill="#701a40" />
                  <circle cx="46" cy="50" r="2.8" fill="#701a40" />
                  <circle cx="37" cy="58" r="2.8" fill="#701a40" />
                  <circle cx="28" cy="66" r="2.8" fill="#701a40" />
                  <circle cx="46" cy="66" r="2.8" fill="#701a40" />
                </g>
                <g transform="rotate(14 65 55)">
                  <rect x="45" y="20" width="34" height="64" rx="5" stroke="#701a40" strokeWidth="2.5" fill="none" />
                  <line x1="45" y1="52" x2="79" y2="52" stroke="#701a40" strokeWidth="2" />
                  <circle cx="53" cy="29" r="2.8" fill="#701a40" />
                  <circle cx="71" cy="43" r="2.8" fill="#701a40" />
                  <circle cx="62" cy="36" r="2.8" fill="#701a40" />
                  <circle cx="53" cy="61" r="2.8" fill="#701a40" />
                  <circle cx="71" cy="75" r="2.8" fill="#701a40" />
                  <circle cx="62" cy="68" r="2.8" fill="#701a40" />
                </g>
              </svg>
            </div>

            <div className="rm-paper-body rm-anim-fade-in" key={activeCategory}>
              {/* 1. PERNYATAAN RESMI (EXACT HDI SCREENSHOT TEXT) */}
              {activeCategory === 'resmi' && (
                <>
                  <div className="rm-paper-title">Pernyataan Resmi</div>
                  <div className="rm-paper-title-divider"></div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">1.</span>
                    <span className="rm-item-text">Permainan ini bersifat hiburan semata dan untuk santai bukan perjudian.</span>
                  </div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">2.</span>
                    <span className="rm-item-text">Koin dan Properti game yang ada hanya untuk di komsumsi dan digunakan di dalam game.</span>
                  </div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">3.</span>
                    <span className="rm-item-text">Unsur yang melakukan perilaku berikut akan di blokir akunnya : memposting hal buruk atau menghina orang lain didalam game.</span>
                  </div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">4.</span>
                    <span className="rm-item-text">Harap bermain dengan bijak dan cerdas.</span>
                  </div>
                  <div className="rm-paper-closing">
                    Terima kasih atas perhatian dan dukungannya.Selamat bermain!
                  </div>
                </>
              )}

              {/* 2. WASPADA PENIPUAN */}
              {activeCategory === 'penipuan' && (
                <>
                  <div className="rm-paper-title">Waspada Penipuan</div>
                  <div className="rm-paper-title-divider"></div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">1.</span>
                    <span className="rm-item-text">Waspada terhadap oknum atau pihak yang mengaku sebagai Admin/Game Master yang menjanjikan koin gratis dengan meminta kata sandi atau data akun.</span>
                  </div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">2.</span>
                    <span className="rm-item-text">Jangan pernah memberikan password, kode keamanan, atau kode verifikasi SMS/OTP kepada siapa pun tanpa kecuali.</span>
                  </div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">3.</span>
                    <span className="rm-item-text">Manajemen game <b>MELARANG KERAS</b> segala bentuk transaksi jual-beli koin/chip dengan uang asli di luar game. Segala transaksi tidak resmi berisiko penipuan.</span>
                  </div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">4.</span>
                    <span className="rm-item-text">Jika Anda menemukan tindakan mencurigakan, segera laporkan melalui fitur Bantuan/CS resmi di dalam aplikasi.</span>
                  </div>
                  <div className="rm-paper-closing">
                    Jaga kerahasiaan akun Anda dan utamakan keamanan setiap saat!
                  </div>
                </>
              )}

              {/* 3. PERJANJIAN PENGGUNA */}
              {activeCategory === 'perjanjian' && (
                <>
                  <div className="rm-paper-title">Perjanjian Pengguna</div>
                  <div className="rm-paper-title-divider"></div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">1.</span>
                    <span className="rm-item-text">Setiap pemain wajib menaati norma etika, kesopanan, dan aturan main yang berlaku di seluruh meja dan ruangan game.</span>
                  </div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">2.</span>
                    <span className="rm-item-text">Akun permainan adalah milik pribadi pemain terdaftar. Dilarang keras memperjualbelikan, menukar, atau menyewakan akun kepada pihak lain.</span>
                  </div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">3.</span>
                    <span className="rm-item-text">Penggunaan aplikasi ilegal pihak ketiga, bot otomatis, script manipulasi, atau eksploitasi celah bug akan ditindak dengan pemblokiran permanen.</span>
                  </div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">4.</span>
                    <span className="rm-item-text">Pihak pengembang berhak memperbarui aturan layanan demi kenyamanan ekosistem bersama tanpa mengurangi hak kenyamanan bermain.</span>
                  </div>
                  <div className="rm-paper-closing">
                    Mari bersama menjaga lingkungan permainan yang sportif dan menyenangkan!
                  </div>
                </>
              )}

              {/* 4. KEBIJAKAN PRIVASI */}
              {activeCategory === 'kebijakan' && (
                <>
                  <div className="rm-paper-title">Kebijakan Privasi</div>
                  <div className="rm-paper-title-divider"></div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">1.</span>
                    <span className="rm-item-text">Kami sangat menghargai privasi dan berkomitmen menjaga kerahasiaan informasi data akun seluruh pengguna.</span>
                  </div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">2.</span>
                    <span className="rm-item-text">Data akun dan preferensi permainan hanya digunakan untuk kelancaran sinkronisasi, progres koin, dan kestabilan server game.</span>
                  </div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">3.</span>
                    <span className="rm-item-text">Kami tidak akan pernah membagikan atau menjual data pribadi Anda kepada pihak ketiga mana pun tanpa persetujuan sah.</span>
                  </div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">4.</span>
                    <span className="rm-item-text">Seluruh transmisi jaringan dilindungi protokol enkripsi modern untuk memastikan pengalaman bermain yang aman.</span>
                  </div>
                  <div className="rm-paper-closing">
                    Keamanan data dan kenyamanan Anda adalah prioritas utama kami.
                  </div>
                </>
              )}

              {/* 5. PEMBARUAN GAME */}
              {activeCategory === 'update' && (
                <>
                  <div className="rm-paper-title">Pembaruan Game</div>
                  <div className="rm-paper-title-divider"></div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">1.</span>
                    <span className="rm-item-text">Optimalisasi server cloud untuk respon bermain yang lebih cepat dan bebas hambatan lag di semua kamar multi-pemain.</span>
                  </div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">2.</span>
                    <span className="rm-item-text">Penyesuaian taruhan kamar Kings Billiard yang seimbang mulai 5K hingga 200K koin untuk kepuasan bermain semua pemain.</span>
                  </div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">3.</span>
                    <span className="rm-item-text">Mesin Slot Simulasi dilengkapi pilihan kecepatan putar hingga 10x dan fitur Beli Spin Gratis dengan animasi Scatter Zeus otentik.</span>
                  </div>
                  <div className="rm-paper-item">
                    <span className="rm-item-num">4.</span>
                    <span className="rm-item-text">Tampilan jendela Rules dan Berita kini didesain ulang dengan standar Royal Crown mewah yang jernih dan nyaman dibaca di layar ponsel.</span>
                  </div>
                  <div className="rm-paper-closing">
                    Terima kasih atas dukungan setia Anda. Selamat menikmati permainan!
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
