'use client';

import { ShieldCheck, CheckCircle2, XCircle, Cpu, HardDrive, Smartphone, Layers, Award } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';

interface SpecsTableProps {
  onOpenDownload: () => void;
}

export default function SpecsTable({ onOpenDownload }: SpecsTableProps) {
  return (
    <section id="spesifikasi" className="section-wrapper" style={{ background: 'rgba(11, 14, 22, 0.45)' }}>
      <div className="container">
        
        {/* Section Header */}
        <div className="section-header">
          <div className="section-tag">
            <Award size={14} />
            <span>Spesifikasi & Keamanan Resmi</span>
          </div>
          <h2 className="section-title">
            Informasi Lengkap <span className="text-gold">File APK {APP_CONFIG.version}</span>
          </h2>
          <p className="section-subtitle">
            Pastikan Anda selalu mendownload file APK resmi langsung dari server terverifikasi untuk menjamin keamanan akun dan koin chip Anda.
          </p>
        </div>

        {/* Top 4 Quick Spec Cards */}
        <div className="spec-cards-grid">
          <div className="glass-panel spec-card">
            <div className="spec-card-icon" style={{ background: 'rgba(245, 197, 24, 0.15)', color: '#F5C518' }}>
              <Layers size={24} />
            </div>
            <div>
              <div className="spec-card-label">Nama Aplikasi</div>
              <div className="spec-card-value">{APP_CONFIG.appName}</div>
              <div className="spec-card-sub">Edisi VIP Casino {APP_CONFIG.releaseYear}</div>
            </div>
          </div>

          <div className="glass-panel spec-card">
            <div className="spec-card-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4' }}>
              <HardDrive size={24} />
            </div>
            <div>
              <div className="spec-card-label">Ukuran Berkas</div>
              <div className="spec-card-value">{APP_CONFIG.fileSize} (Assets Full HD)</div>
              <div className="spec-card-sub">Optimal & Hemat Baterai</div>
            </div>
          </div>

          <div className="glass-panel spec-card">
            <div className="spec-card-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#A855F7' }}>
              <Smartphone size={24} />
            </div>
            <div>
              <div className="spec-card-label">Sistem Operasi</div>
              <div className="spec-card-value">{APP_CONFIG.minAndroid}</div>
              <div className="spec-card-sub">Mendukung Android 14 & 15</div>
            </div>
          </div>

          <div className="glass-panel spec-card">
            <div className="spec-card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="spec-card-label">Status Keamanan</div>
              <div className="spec-card-value text-green">{APP_CONFIG.safetyRating}</div>
              <div className="spec-card-sub">Bebas Trojan & Virus</div>
            </div>
          </div>
        </div>

        {/* Comparison Table: Official vs Unofficial */}
        <div className="comparison-wrap glass-panel">
          <div className="comp-header">
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              Perbandingan: <span className="text-gold">APK Resmi Kami</span> vs APK Bajakan / Mod
            </h3>
            <span className="safe-badge">
              <ShieldCheck size={16} /> Dijamin Anti-Banned
            </span>
          </div>

          <div className="table-responsive">
            <table className="comp-table">
              <thead>
                <tr>
                  <th>Fitur & Keamanan</th>
                  <th className="th-official">👑 APK Resmi Kings Billiards v2.79</th>
                  <th className="th-mod">❌ APK Mod / Pihak Ketiga</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Koneksi Server Resmi</strong></td>
                  <td className="td-official">
                    <CheckCircle2 size={18} className="text-green" />
                    <span>Terhubung langsung ke Cloud VPS Resmi (Real-time)</span>
                  </td>
                  <td className="td-mod">
                    <XCircle size={18} className="text-red" />
                    <span>Server palsu / rentan disconnect</span>
                  </td>
                </tr>
                <tr>
                  <td><strong>Fitur Kirim Koin Bebas Biaya</strong></td>
                  <td className="td-official">
                    <CheckCircle2 size={18} className="text-green" />
                    <span>Aktif 100% (Transfer ke teman tanpa biaya potong)</span>
                  </td>
                  <td className="td-mod">
                    <XCircle size={18} className="text-red" />
                    <span>Tidak bisa transfer koin antar akun</span>
                  </td>
                </tr>
                <tr>
                  <td><strong>Keamanan Akun & Koin</strong></td>
                  <td className="td-official">
                    <CheckCircle2 size={18} className="text-green" />
                    <span>Enkripsi SHA-256 & Login Google Resmi</span>
                  </td>
                  <td className="td-mod">
                    <XCircle size={18} className="text-red" />
                    <span>Rentan pencurian kata sandi & koin chip</span>
                  </td>
                </tr>
                <tr>
                  <td><strong>Risiko Banned Akun</strong></td>
                  <td className="td-official">
                    <CheckCircle2 size={18} className="text-green" />
                    <span><strong>0% (Aman 100% Anti-Banned)</strong></span>
                  </td>
                  <td className="td-mod">
                    <XCircle size={18} className="text-red" />
                    <span>Tinggi (Akun langsung di-blacklist permanen)</span>
                  </td>
                </tr>
                <tr>
                  <td><strong>Iklan Pop-up yang Mengganggu</strong></td>
                  <td className="td-official">
                    <CheckCircle2 size={18} className="text-green" />
                    <span>Bebas Iklan Spam (Gameplay lancar tanpa interupsi)</span>
                  </td>
                  <td className="td-mod">
                    <XCircle size={18} className="text-red" />
                    <span>Banyak adware dan spam pop-up mencurigakan</span>
                  </td>
                </tr>
                <tr>
                  <td><strong>Bonus Harian & Event VIP</strong></td>
                  <td className="td-official">
                    <CheckCircle2 size={18} className="text-green" />
                    <span>Klaim bonus setiap hari hingga miliaran koin</span>
                  </td>
                  <td className="td-mod">
                    <XCircle size={18} className="text-red" />
                    <span>Tidak dapat mengikuti event dan ranking</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="comp-footer">
            <button onClick={onOpenDownload} className="btn-gold" style={{ padding: '14px 28px' }}>
              Unduh Versi Resmi yang Aman Sekarang
            </button>
          </div>
        </div>

      </div>

      <style jsx>{`
        .spec-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }
        .spec-card {
          padding: 24px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .spec-card-icon {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .spec-card-label {
          font-size: 0.78rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .spec-card-value {
          font-size: 1.15rem;
          font-weight: 800;
          color: #FFFFFF;
          margin-bottom: 2px;
        }
        .spec-card-sub {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        /* Comparison Table Styles */
        .comparison-wrap {
          padding: 32px;
        }
        .comp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .safe-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #10B981;
          font-size: 0.82rem;
          font-weight: 800;
          padding: 6px 14px;
          border-radius: var(--radius-full);
        }
        .table-responsive {
          overflow-x: auto;
        }
        .comp-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .comp-table th {
          padding: 16px;
          font-size: 0.95rem;
          font-weight: 800;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }
        .th-official {
          background: rgba(245, 197, 24, 0.1);
          color: #FDE047;
          border-top-left-radius: 10px;
          border-top-right-radius: 10px;
        }
        .th-mod {
          color: #F87171;
        }
        .comp-table td {
          padding: 16px;
          font-size: 0.92rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .td-official {
          background: rgba(245, 197, 24, 0.04);
          display: flex;
          align-items: center;
          gap: 8px;
          color: #E2E8F0;
        }
        .td-mod {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94A3B8;
        }
        .comp-footer {
          margin-top: 24px;
          text-align: center;
        }

        @media (max-width: 992px) {
          .spec-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .spec-cards-grid {
            grid-template-columns: 1fr;
          }
          .comparison-wrap {
            padding: 20px 14px;
          }
        }
      `}</style>
    </section>
  );
}
