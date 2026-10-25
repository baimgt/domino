'use client';

import Image from 'next/image';
import { Download, ShieldCheck, Zap, Star, Users, Smartphone, HardDrive, CheckCircle2 } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';

interface HeroSectionProps {
  onOpenDownload: () => void;
}

export default function HeroSection({ onOpenDownload }: HeroSectionProps) {
  return (
    <section id="hero" style={{ paddingTop: '130px', paddingBottom: '70px', position: 'relative' }}>
      <div className="container">
        <div className="hero-grid">
          
          {/* Left Text & CTA Column */}
          <div className="hero-text-col">
            
            {/* Live Online & Pre-release Badge */}
            <div className="badge-row">
              <div className="live-badge">
                <span className="pulsing-dot" />
                <span>{APP_CONFIG.stats.activeOnlinePlayers} Pemain Online</span>
              </div>
              <div className="prerelease-badge">
                <Zap size={14} className="text-gold" />
                <span>UPDATE RESMI {APP_CONFIG.releaseYear} • PRA-RILIS VIP</span>
              </div>
            </div>

            {/* Main Title */}
            <h1 className="hero-title">
              Download <span className="text-gold">{APP_CONFIG.appName}</span> APK Versi Terbaru
            </h1>

            {/* Description */}
            <p className="hero-desc">
              Nikmati sensasi bermain <strong>Domino Gaple</strong>, <strong>Qiu Qiu (99)</strong>, <strong>8-Ball Billiards Multiplayer</strong>, dan <strong>Slot Kasino Populer</strong> dalam satu aplikasi ringan, aman, dan tanpa iklan mengganggu. Rasakan keseruan bermain bersama jutaan pemain se-Indonesia!
            </p>

            {/* Quick Spec Pills */}
            <div className="spec-pills-grid">
              <div className="spec-pill">
                <HardDrive size={18} className="text-gold" />
                <div>
                  <div className="spec-label">Ukuran APK</div>
                  <div className="spec-val">{APP_CONFIG.fileSize} (Full HD)</div>
                </div>
              </div>

              <div className="spec-pill">
                <Smartphone size={18} className="text-gold" />
                <div>
                  <div className="spec-label">Kompatibilitas</div>
                  <div className="spec-val">{APP_CONFIG.minAndroid}</div>
                </div>
              </div>

              <div className="spec-pill">
                <Zap size={18} className="text-gold" />
                <div>
                  <div className="spec-label">Versi Terkini</div>
                  <div className="spec-val">{APP_CONFIG.version} (Terbaru)</div>
                </div>
              </div>

              <div className="spec-pill verified">
                <ShieldCheck size={18} className="text-green" />
                <div>
                  <div className="spec-label">Keamanan</div>
                  <div className="spec-val text-green">{APP_CONFIG.safetyRating}</div>
                </div>
              </div>
            </div>

            {/* Download Action Buttons */}
            <div className="cta-group" id="download-zone">
              <button onClick={onOpenDownload} className="btn-gold btn-download-hero">
                <div className="btn-icon-box">
                  <Download size={26} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, lineHeight: 1.1 }}>DOWNLOAD APK RESMI</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 600 }}>
                    Server VIP Kecepatan Tinggi (Langsung Unduh)
                  </div>
                </div>
                <span className="speed-tag">⚡ Super Cepat</span>
              </button>

              <button onClick={onOpenDownload} className="btn-secondary">
                <Zap size={18} className="text-gold" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700 }}>Server Alternatif (Mirror)</div>
                  <div style={{ fontSize: '0.75rem', color: '#A0AEC0' }}>Google Drive / Direct Cloud</div>
                </div>
              </button>
            </div>

            {/* Trust Proof Bar */}
            <div className="trust-proof">
              <div className="trust-item">
                <div style={{ display: 'flex', color: '#F5C518', gap: '2px' }}>
                  <Star size={15} fill="#F5C518" />
                  <Star size={15} fill="#F5C518" />
                  <Star size={15} fill="#F5C518" />
                  <Star size={15} fill="#F5C518" />
                  <Star size={15} fill="#F5C518" />
                </div>
                <span style={{ fontSize: '0.86rem', color: '#E2E8F0' }}>
                  <strong>4.9 / 5</strong> (58.400+ Ulasan)
                </span>
              </div>

              <div className="trust-divider" />

              <div className="trust-item">
                <Users size={16} className="text-gold" />
                <span style={{ fontSize: '0.86rem', color: '#E2E8F0' }}>
                  <strong>750.000+</strong> Pengunduh
                </span>
              </div>

              <div className="trust-divider" />

              <div className="trust-item">
                <CheckCircle2 size={16} className="text-green" />
                <span style={{ fontSize: '0.86rem', color: '#10B981', fontWeight: 600 }}>
                  Play Protect Safe
                </span>
              </div>
            </div>

          </div>

          {/* Right Visual 3D Showcase Column */}
          <div className="hero-visual-col">
            <div className="visual-wrapper">
              
              {/* Glowing Aura Ring */}
              <div className="aura-ring" />

              {/* Main Showcase Image Card */}
              <div className="hero-image-card">
                <Image
                  src="/assets/hero_showcase.jpg"
                  alt="Kings Billiards & Domino App Gameplay"
                  width={560}
                  height={560}
                  className="hero-img"
                  priority
                />

                {/* Floating 3D Badges */}
                <div className="floating-badge badge-top-left">
                  <div className="badge-icon-wrap" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                    🎱
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#A0AEC0', textTransform: 'uppercase' }}>Mode Multiplayer</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800 }}>8-Ball & Gaple Real-Time</div>
                  </div>
                </div>

                <div className="floating-badge badge-bottom-right">
                  <div className="badge-icon-wrap" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                    ⚡
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#A0AEC0', textTransform: 'uppercase' }}>Jackpot Sensational</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FDE047' }}>Gatotkaca & Mahjong Ways</div>
                  </div>
                </div>

                <div className="floating-badge badge-bottom-left">
                  <div className="badge-icon-wrap" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
                    🎁
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#A0AEC0', textTransform: 'uppercase' }}>Bonus Pendaftar Baru</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#38BDF8' }}>Gratis 10M Chip Login</div>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        .hero-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 48px;
          align-items: center;
        }
        .badge-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .live-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.35);
          font-size: 0.82rem;
          font-weight: 700;
          color: #34D399;
        }
        .prerelease-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          background: rgba(245, 197, 24, 0.1);
          border: 1px solid rgba(245, 197, 24, 0.3);
          font-size: 0.82rem;
          font-weight: 700;
          color: #FDE047;
          letter-spacing: 0.5px;
        }
        .hero-title {
          font-family: var(--font-heading);
          font-size: 3.1rem;
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -0.5px;
          margin-bottom: 20px;
        }
        .hero-desc {
          font-size: 1.1rem;
          color: var(--text-secondary);
          line-height: 1.65;
          margin-bottom: 28px;
        }
        .hero-desc strong {
          color: #FFFFFF;
        }
        .spec-pills-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 32px;
        }
        .spec-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-md);
          backdrop-filter: blur(10px);
          transition: all 0.25s ease;
        }
        .spec-pill:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(245, 197, 24, 0.3);
          transform: translateY(-2px);
        }
        .spec-pill.verified {
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.05);
        }
        .spec-label {
          font-size: 0.72rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }
        .spec-val {
          font-size: 0.95rem;
          font-weight: 800;
          color: #FFFFFF;
        }
        .cta-group {
          display: flex;
          align-items: stretch;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }
        .btn-download-hero {
          flex: 1;
          min-width: 280px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
        }
        .btn-icon-box {
          background: rgba(0, 0, 0, 0.2);
          padding: 10px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .speed-tag {
          background: rgba(0, 0, 0, 0.3);
          color: #1a1000;
          font-size: 0.72rem;
          font-weight: 900;
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }
        .trust-proof {
          display: flex;
          align-items: center;
          gap: 18px;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          flex-wrap: wrap;
        }
        .trust-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .trust-divider {
          width: 1px;
          height: 18px;
          background: rgba(255, 255, 255, 0.15);
        }

        /* 3D Visual Column Styles */
        .visual-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
        }
        .aura-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 36px;
          background: radial-gradient(circle, rgba(245, 197, 24, 0.25) 0%, rgba(168, 85, 247, 0.15) 50%, transparent 70%);
          filter: blur(40px);
          z-index: 1;
        }
        .hero-image-card {
          position: relative;
          z-index: 2;
          border-radius: 28px;
          overflow: visible;
          border: 2px solid rgba(255, 215, 0, 0.35);
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(245, 197, 24, 0.25);
          background: #0f1422;
          max-width: 520px;
          width: 100%;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hero-image-card:hover {
          transform: translateY(-6px) scale(1.01);
          border-color: rgba(255, 215, 0, 0.6);
        }
        .hero-img {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 26px;
          object-fit: cover;
        }
        .floating-badge {
          position: absolute;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: rgba(14, 18, 29, 0.92);
          border: 1px solid rgba(255, 215, 0, 0.35);
          border-radius: 16px;
          backdrop-filter: blur(16px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
          animation: floatItem 4s ease-in-out infinite;
        }
        .badge-top-left {
          top: -20px;
          left: -20px;
          animation-delay: 0s;
        }
        .badge-bottom-right {
          bottom: -22px;
          right: -18px;
          animation-delay: 1.5s;
        }
        .badge-bottom-left {
          bottom: 45px;
          left: -25px;
          animation-delay: 2.5s;
        }
        .badge-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        @media (max-width: 1100px) {
          .hero-grid {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .badge-row {
            justify-content: center;
          }
          .spec-pills-grid {
            max-width: 600px;
            margin: 0 auto 32px auto;
          }
          .cta-group {
            justify-content: center;
            max-width: 550px;
            margin: 0 auto 28px auto;
          }
          .trust-proof {
            justify-content: center;
          }
          .hero-visual-col {
            margin-top: 30px;
          }
        }
        @media (max-width: 640px) {
          .hero-title {
            font-size: 2.2rem;
          }
          .spec-pills-grid {
            grid-template-columns: 1fr;
          }
          .floating-badge {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
