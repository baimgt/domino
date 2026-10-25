'use client';

import { useState, useEffect } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';

export default function LiveDownloadTicker() {
  const [currentNotification, setCurrentNotification] = useState<{
    name: string;
    city: string;
    timeAgo: string;
    server: string;
  } | null>(null);

  const notifications = [
    { name: 'Rian P.', city: 'Surabaya', timeAgo: 'Baru saja', server: 'Server VIP Jakarta' },
    { name: 'Bagus S.', city: 'Bandung', timeAgo: '12 detik lalu', server: 'Server Cepat #1' },
    { name: 'Fikri A.', city: 'Medan', timeAgo: '28 detik lalu', server: 'Server VIP Cloud' },
    { name: 'Doni K.', city: 'Jakarta Selatan', timeAgo: '45 detik lalu', server: 'Server VIP Jakarta' },
    { name: 'Wahyu T.', city: 'Makassar', timeAgo: '1 menit lalu', server: 'Server Cepat #2' },
    { name: 'Arief M.', city: 'Semarang', timeAgo: '2 menit lalu', server: 'Server VIP Cloud' }
  ];

  useEffect(() => {
    let index = 0;
    const showNext = () => {
      setCurrentNotification(notifications[index]);
      index = (index + 1) % notifications.length;

      // Hide after 4.5s
      setTimeout(() => {
        setCurrentNotification(null);
      }, 4500);
    };

    // Initial delay then loop every 8 seconds
    const initialTimer = setTimeout(showNext, 2500);
    const interval = setInterval(showNext, 8500);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  if (!currentNotification) return null;

  return (
    <div className="live-ticker-wrap">
      <div className="ticker-card glass-panel">
        <div className="ticker-icon">
          <Download size={16} />
        </div>
        <div>
          <div className="ticker-title">
            <strong>{currentNotification.name}</strong> ({currentNotification.city})
          </div>
          <div className="ticker-sub">
            Mendownload APK v2.79 • <span style={{ color: '#34D399' }}>{currentNotification.timeAgo}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .live-ticker-wrap {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 40;
          animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ticker-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          background: rgba(14, 18, 29, 0.94);
          border: 1px solid rgba(245, 197, 24, 0.35);
          border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
        }
        .ticker-icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--gold-gradient);
          color: #1a1000;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ticker-title {
          font-size: 0.86rem;
          color: #FFFFFF;
        }
        .ticker-sub {
          font-size: 0.74rem;
          color: var(--text-secondary);
        }
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 640px) {
          .live-ticker-wrap {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
