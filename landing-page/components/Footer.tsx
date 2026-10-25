'use client';

import Image from 'next/image';
import { Download, ShieldCheck, ArrowUp } from 'lucide-react';

interface FooterProps {
  onOpenDownload: () => void;
}

export default function Footer({ onOpenDownload }: FooterProps) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer style={{ position: 'relative', background: '#05070b', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '70px', paddingBottom: '40px' }}>
      <div className="container">
        
        {/* Giant Bottom Download Banner */}
        <div className="bottom-cta-banner glass-panel">
          <div className="cta-banner-content">
            <span className="cta-pill">🎉 BONUS AWAL DAFTAR BARU</span>
            <h2 className="cta-banner-title">
              Siap Jadi Sultan Berikutnya? <span className="text-gold">Unduh APK Sekarang!</span>
            </h2>
            <p className="cta-banner-desc">
              Klaim <strong>10.000.000 Chip Gratis</strong> langsung di akun Anda hari ini. Mainkan Domino Gaple, Billiards 8-Ball, dan Slot Kasino favorit tanpa hambatan.
            </p>
          </div>
          <button onClick={onOpenDownload} className="btn-gold cta-banner-btn">
            <Download size={22} />
            <span>DOWNLOAD APK RESMI v2.79</span>
          </button>
        </div>

        {/* Main Footer Info Grid */}
        <div className="footer-grid">
          
          <div className="footer-col-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid rgba(245, 197, 24, 0.7)',
                  boxShadow: '0 0 12px rgba(245, 197, 24, 0.4)'
                }}
              >
                <Image
                  src="/assets/kings_billiards_logo.png"
                  alt="Kings Billiards Logo"
                  width={42}
                  height={42}
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.2rem' }}>
                KINGS <span className="text-gold">BILLIARDS</span>
              </span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              Platform hiburan permainan kartu Domino Gaple, Qiu Qiu, 8-Ball Billiards online dan slot kasino terbaik di Indonesia dengan sistem keamanan canggih dan gameplay 60 FPS ultra-halus.
            </p>
            <div className="security-pills">
              <span className="sec-tag">🛡️ Google Play Protect Safe</span>
              <span className="sec-tag">🔞 Khusus 18+</span>
            </div>
          </div>

          <div className="footer-col-links">
            <h4 className="footer-col-title">Navigasi Cepat</h4>
            <ul className="footer-list">
              <li><a href="#hero">Beranda</a></li>
              <li><a href="#spesifikasi">Spesifikasi APK</a></li>
              <li><a href="#games">Koleksi Game</a></li>
              <li><a href="#fitur">Fitur Unggulan VIP</a></li>
              <li><a href="#panduan">Cara Install APK</a></li>
              <li><a href="#faq">FAQ & Bantuan</a></li>
            </ul>
          </div>

          <div className="footer-col-links">
            <h4 className="footer-col-title">Permainan Populer</h4>
            <ul className="footer-list">
              <li><a href="#games">Gates of Gatotkaca</a></li>
              <li><a href="#games">8-Ball Billiards Classic</a></li>
              <li><a href="#games">Domino Gaple Balak</a></li>
              <li><a href="#games">Domino Qiu Qiu (99)</a></li>
              <li><a href="#games">Mahjong Ways 2</a></li>
              <li><a href="#games">By One 1v1 PvP</a></li>
            </ul>
          </div>

          <div className="footer-col-links">
            <h4 className="footer-col-title">Keamanan & Privasi</h4>
            <ul className="footer-list">
              <li><span style={{ color: '#A0AEC0', fontSize: '0.88rem' }}>Enkripsi SHA-256 Cloud</span></li>
              <li><span style={{ color: '#A0AEC0', fontSize: '0.88rem' }}>Kebijakan Privasi Resmi</span></li>
              <li><span style={{ color: '#A0AEC0', fontSize: '0.88rem' }}>Syarat & Ketentuan Layanan</span></li>
              <li><span style={{ color: '#A0AEC0', fontSize: '0.88rem' }}>Anti-Cheat Engine Terintegrasi</span></li>
            </ul>
          </div>

        </div>

        {/* Legal Disclaimer & Copyright */}
        <div className="footer-bottom">
          <p className="footer-disclaimer">
            <strong>Disclaimer:</strong> Kings Billiards & Domino adalah aplikasi permainan simulasi hiburan virtual untuk pengguna berusia 18 tahun ke atas. Koin chip dalam permainan adalah aset virtual yang ditujukan semata-mata untuk hiburan di dalam game dan tidak memiliki nilai mata uang riil di dunia nyata. Bermainlah secara bijak dan bertanggung jawab.
          </p>
          <div className="copyright-row">
            <span>© 2026 Kings Gaming Studio. Seluruh hak cipta dilindungi undang-undang.</span>
            <button onClick={scrollToTop} className="back-to-top-btn" aria-label="Kembali ke atas">
              <ArrowUp size={16} />
              <span>Kembali ke Atas</span>
            </button>
          </div>
        </div>

      </div>

      <style jsx>{`
        .bottom-cta-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 40px;
          margin-bottom: 60px;
          border-color: rgba(245, 197, 24, 0.4);
          background: radial-gradient(ellipse at top left, rgba(245, 197, 24, 0.12) 0%, rgba(14, 18, 29, 0.95) 70%);
          gap: 30px;
        }
        .cta-pill {
          display: inline-block;
          font-size: 0.78rem;
          font-weight: 800;
          color: #FDE047;
          background: rgba(245, 197, 24, 0.15);
          padding: 4px 12px;
          border-radius: var(--radius-full);
          margin-bottom: 12px;
        }
        .cta-banner-title {
          font-family: var(--font-heading);
          font-size: 2rem;
          font-weight: 900;
          margin-bottom: 10px;
          line-height: 1.2;
        }
        .cta-banner-desc {
          font-size: 1rem;
          color: var(--text-secondary);
          max-width: 620px;
        }
        .cta-banner-btn {
          flex-shrink: 0;
          padding: 18px 32px;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 40px;
          margin-bottom: 50px;
        }
        .footer-col-title {
          font-family: var(--font-heading);
          font-size: 1.05rem;
          font-weight: 800;
          color: #FFFFFF;
          margin-bottom: 18px;
        }
        .footer-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .footer-list a {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.88rem;
          transition: color 0.2s ease;
        }
        .footer-list a:hover {
          color: #F5C518;
        }
        .security-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .sec-tag {
          font-size: 0.72rem;
          font-weight: 700;
          color: #E2E8F0;
          background: rgba(255, 255, 255, 0.06);
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .footer-bottom {
          padding-top: 30px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .footer-disclaimer {
          font-size: 0.76rem;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 20px;
          text-align: justify;
        }
        .copyright-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.84rem;
          color: var(--text-muted);
          flex-wrap: wrap;
          gap: 12px;
        }
        .back-to-top-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #E2E8F0;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .back-to-top-btn:hover {
          background: rgba(245, 197, 24, 0.2);
          color: #FDE047;
          border-color: rgba(245, 197, 24, 0.4);
        }

        @media (max-width: 992px) {
          .bottom-cta-banner {
            flex-direction: column;
            text-align: center;
          }
          .cta-banner-btn {
            width: 100%;
          }
          .footer-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .bottom-cta-banner {
            padding: 24px 18px;
          }
          .footer-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </footer>
  );
}
