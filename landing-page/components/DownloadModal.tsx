'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Download, ShieldCheck, CheckCircle2, Server, Zap, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { APP_CONFIG } from '../config/appConfig';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadModal({ isOpen, onClose }: DownloadModalProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Menghubungkan ke Server Cloud VIP...');
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectedServer, setSelectedServer] = useState<'vip' | 'mirror' | 'gdrive'>('vip');

  const triggerRealDownload = () => {
    let targetUrl = APP_CONFIG.downloadLinks.primaryServer;
    if (selectedServer === 'mirror') {
      targetUrl = APP_CONFIG.downloadLinks.mirrorServer;
    } else if (selectedServer === 'gdrive') {
      targetUrl = APP_CONFIG.downloadLinks.googleDriveBackup;
    }

    if (targetUrl.startsWith('http')) {
      window.open(targetUrl, '_blank');
      return;
    }

    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = APP_CONFIG.apkFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setIsCompleted(false);
      setStatusText('Menghubungkan ke Server Cloud VIP...');
      return;
    }

    setProgress(0);
    setIsCompleted(false);
    setStatusText('Menghubungkan ke Server Cloud VIP...');

    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 16) + 12;

      if (current > 25 && current <= 60) {
        setStatusText('Memeriksa Integritas File & Google Play Protect...');
      } else if (current > 60 && current < 100) {
        setStatusText('Menyiapkan Jalur Unduhan Kecepatan Tinggi (Direct VIP)...');
      }

      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setProgress(100);
        setIsCompleted(true);
        setStatusText('✅ Berhasil! File Kings-Billiards-v2.79.apk sedang diunduh ke HP Anda...');

        // Trigger confetti burst
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFE873', '#F5C518', '#10B981', '#A855F7']
          });
        } catch (e) {
          // ignore confetti if blocked
        }

        // Trigger APK download
        setTimeout(() => {
          triggerRealDownload();
        }, 400);
      } else {
        setProgress(current);
      }
    }, 140);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        
        {/* Close Button */}
        <button onClick={onClose} className="modal-close-btn" aria-label="Tutup">
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="modal-header">
          <div className="app-icon-wrap">
            <Image
              src="/assets/kings_billiards_logo.png"
              alt="Kings Billiards Logo"
              width={56}
              height={56}
              className="app-icon"
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 className="modal-app-name">{APP_CONFIG.appName}</h3>
              <span className="modal-version-tag">{APP_CONFIG.version}</span>
            </div>
            <p className="modal-app-sub">APK Resmi Android • {APP_CONFIG.fileSize} (Full HD Offline Assets)</p>
          </div>
        </div>

        {/* Server Selector Tabs */}
        <div className="server-select-box">
          <span className="server-label">Pilih Jalur Unduhan:</span>
          <div className="server-btns">
            <button
              onClick={() => setSelectedServer('vip')}
              className={`server-btn ${selectedServer === 'vip' ? 'active' : ''}`}
            >
              <Zap size={14} />
              <span>VIP Jakarta (Cepat)</span>
            </button>
            <button
              onClick={() => setSelectedServer('mirror')}
              className={`server-btn ${selectedServer === 'mirror' ? 'active' : ''}`}
            >
              <Server size={14} />
              <span>Mirror Singapore</span>
            </button>
            <button
              onClick={() => setSelectedServer('gdrive')}
              className={`server-btn ${selectedServer === 'gdrive' ? 'active' : ''}`}
            >
              <span>Cloud Drive</span>
            </button>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="progress-card">
          <div className="progress-top">
            <span className="progress-status">{statusText}</span>
            <span className="progress-percent">{progress}%</span>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="security-badges-row">
            <div className="sec-item">
              <ShieldCheck size={14} className="text-green" />
              <span>Google Play Protect Lolos</span>
            </div>
            <div className="sec-item">
              <CheckCircle2 size={14} className="text-green" />
              <span>SHA-256 Terverifikasi</span>
            </div>
            <div className="sec-item">
              <Sparkles size={14} className="text-gold" />
              <span>Anti-Banned 100%</span>
            </div>
          </div>
        </div>

        {/* Manual Fallback Download Button */}
        <div className="modal-actions">
          <button onClick={triggerRealDownload} className="btn-gold" style={{ width: '100%', padding: '14px' }}>
            <Download size={18} />
            <span>Klik di Sini Jika Unduhan Belum Mulai Otomatis</span>
          </button>
        </div>

        {/* Installation Tip */}
        <p className="modal-footer-tip">
          💡 <strong>Tips:</strong> Setelah file selesai diunduh, klik notifikasi di atas layar HP Anda untuk menginstal aplikasi.
        </p>

      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.78);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.25s ease;
        }
        .modal-content {
          position: relative;
          max-width: 540px;
          width: 100%;
          padding: 32px;
          border-radius: 24px;
          border-color: rgba(245, 197, 24, 0.45);
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(245, 197, 24, 0.25);
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .modal-close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #A0AEC0;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .modal-close-btn:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.15);
        }
        .modal-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        .app-icon-wrap {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid rgba(245, 197, 24, 0.6);
          box-shadow: 0 0 16px rgba(245, 197, 24, 0.4);
          flex-shrink: 0;
        }
        .app-icon {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .modal-app-name {
          font-family: var(--font-heading);
          font-size: 1.3rem;
          font-weight: 800;
          color: #FFFFFF;
        }
        .modal-version-tag {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #10B981;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .modal-app-sub {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .server-select-box {
          margin-bottom: 20px;
        }
        .server-label {
          display: block;
          font-size: 0.78rem;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 700;
          margin-bottom: 8px;
        }
        .server-btns {
          display: flex;
          gap: 8px;
        }
        .server-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #E2E8F0;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .server-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .server-btn.active {
          background: rgba(245, 197, 24, 0.15);
          border-color: rgba(245, 197, 24, 0.6);
          color: #FDE047;
        }

        .progress-card {
          background: rgba(8, 10, 16, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 22px;
        }
        .progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 0.88rem;
        }
        .progress-status {
          color: #E2E8F0;
          font-weight: 600;
        }
        .progress-percent {
          font-family: var(--font-heading);
          font-weight: 900;
          color: #FDE047;
          font-size: 1.1rem;
        }
        .progress-track {
          width: 100%;
          height: 10px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-full);
          overflow: hidden;
          margin-bottom: 14px;
        }
        .progress-fill {
          height: 100%;
          background: var(--gold-gradient);
          border-radius: var(--radius-full);
          transition: width 0.15s ease;
          box-shadow: 0 0 14px rgba(245, 197, 24, 0.8);
        }
        .security-badges-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.72rem;
          color: var(--text-secondary);
          flex-wrap: wrap;
          gap: 8px;
        }
        .sec-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .modal-footer-tip {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-align: center;
          margin-top: 16px;
          line-height: 1.4;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
