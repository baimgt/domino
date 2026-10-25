'use client';

import { Send, Server, Gift, Crown, ShieldAlert, MessageSquare, Sparkles } from 'lucide-react';

export default function FeatureHighlights() {
  const features = [
    {
      icon: <Send size={26} />,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.12)',
      title: 'Kirim Koin Bebas Biaya',
      desc: 'Kirim dan terima chip koin ke teman sesama ID pemain secara instan tanpa potongan komisi yang rumit.'
    },
    {
      icon: <Server size={26} />,
      color: '#06B6D4',
      bg: 'rgba(6, 182, 212, 0.12)',
      title: 'Server Cloud VPS Super Cepat',
      desc: 'Didukung infrastruktur server cloud berlatensi rendah (<25ms) sehingga pertandingan billiard dan gaple anti-lag.'
    },
    {
      icon: <Gift size={26} />,
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.12)',
      title: 'Bonus Chip Harian Melimpah',
      desc: 'Klaim hadiah login setiap hari, putar roda keberuntungan, dan raih miliaran chip tambahan dari event mingguan.'
    },
    {
      icon: <Crown size={26} />,
      color: '#F5C518',
      bg: 'rgba(245, 197, 24, 0.12)',
      title: 'Kustomisasi Avatar & Bingkai VIP',
      desc: 'Pamerkan status sultan dengan bingkai mahkota emas, sayap bercahaya, dan efek aura khusus di profil Anda.'
    },
    {
      icon: <ShieldAlert size={26} />,
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.12)',
      title: 'Sistem Anti-Cheat & Fair Play',
      desc: 'Dilindungi teknologi keamanan canggih anti-bot dan enkripsi database yang menjaga akun dari kecurangan.'
    },
    {
      icon: <MessageSquare size={26} />,
      color: '#EC4899',
      bg: 'rgba(236, 72, 153, 0.12)',
      title: 'Fitur Pesan Inbox & Emote Interaktif',
      desc: 'Kirim pesan inbox pribadi ke teman, bagikan emotikon lucu saat pertandingan berlangsung di meja taruhan.'
    }
  ];

  return (
    <section id="fitur" className="section-wrapper" style={{ background: 'rgba(9, 12, 19, 0.5)' }}>
      <div className="container">
        
        {/* Section Header */}
        <div className="section-header">
          <div className="section-tag">
            <Sparkles size={14} />
            <span>Fitur Unggulan Terbaik</span>
          </div>
          <h2 className="section-title">
            Mengapa Memilih <span className="text-gold">Kings Billiards & Domino?</span>
          </h2>
          <p className="section-subtitle">
            Kombinasi sempurna antara keseruan bermain kartu gaple, kompetisi billiard online, dan keuntungan slot kasino tanpa batas.
          </p>
        </div>

        {/* Feature 6-Grid */}
        <div className="features-grid">
          {features.map((item, index) => (
            <div key={index} className="feature-card glass-panel">
              <div className="feature-icon-box" style={{ background: item.bg, color: item.color }}>
                {item.icon}
              </div>
              <h3 className="feature-title">{item.title}</h3>
              <p className="feature-desc">{item.desc}</p>
            </div>
          ))}
        </div>

      </div>

      <style jsx>{`
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .feature-card {
          padding: 32px 26px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .feature-card:hover {
          transform: translateY(-6px);
          border-color: rgba(245, 197, 24, 0.4);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
        }
        .feature-icon-box {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }
        .feature-title {
          font-family: var(--font-heading);
          font-size: 1.22rem;
          font-weight: 800;
          color: #FFFFFF;
          margin-bottom: 10px;
        }
        .feature-desc {
          font-size: 0.92rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        @media (max-width: 992px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
