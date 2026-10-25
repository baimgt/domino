'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Gamepad2, Play, Flame, Trophy, Sparkles, Download } from 'lucide-react';

interface GameShowcaseProps {
  onOpenDownload: () => void;
}

interface GameItem {
  id: string;
  name: string;
  category: 'billiards' | 'slots' | 'pvp';
  categoryLabel: string;
  image: string;
  badge: string;
  badgeColor: string;
  activePlayers: string;
  rtpOrWinRate: string;
  description: string;
}

export default function GameShowcase({ onOpenDownload }: GameShowcaseProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'billiards' | 'slots' | 'pvp'>('all');

  const games: GameItem[] = [
    {
      id: 'gatotkaca',
      name: 'Gates of Gatotkaca',
      category: 'slots',
      categoryLabel: 'Slot Kasino VIP',
      image: '/assets/zeus_real.png',
      badge: 'JACKPOT x5000',
      badgeColor: '#EF4444',
      activePlayers: '5.240 Pemain',
      rtpOrWinRate: '98.8% RTP Gacor',
      description: 'Rasakan sambaran petir pengali hingga 5000x dengan simbol scatters melimpah!'
    },
    {
      id: 'billiard-8ball',
      name: '8-Ball Billiards Classic',
      category: 'billiards',
      categoryLabel: 'Billiard Multiplayer',
      image: '/assets/billiard_lounge_bg.jpg',
      badge: 'TERPOPULER',
      badgeColor: '#10B981',
      activePlayers: '4.890 Pemain',
      rtpOrWinRate: 'Real Fisika 60 FPS',
      description: 'Pertarungan stik billiard online dengan grafis meja 3D dan garis bidik akurat.'
    },
    {
      id: 'byone',
      name: 'By One 1v1 Billiards Duel',
      category: 'pvp',
      categoryLabel: '1v1 Taruhan Koin',
      image: '/assets/byone_banner.jpg',
      badge: 'TARUHAN VIP',
      badgeColor: '#F59E0B',
      activePlayers: '3.120 Pemain',
      rtpOrWinRate: 'Hadiah 2x Lipat',
      description: 'Adu keahlian satu lawan satu dengan pemain lain untuk memperebutkan koin chip besar.'
    },
    {
      id: 'mahjong-ways',
      name: 'Mahjong Ways 2',
      category: 'slots',
      categoryLabel: 'Slot Kasino VIP',
      image: '/assets/slot_loading_bg.jpg',
      badge: 'MULTI-WAYS',
      badgeColor: '#A855F7',
      activePlayers: '4.150 Pemain',
      rtpOrWinRate: '98.5% RTP Maxwin',
      description: 'Fitur spin gratis bertingkat dengan simbol emas beruntun yang mudah menang.'
    },
    {
      id: 'domino-gaple',
      name: 'Domino Gaple Tradisional',
      category: 'billiards',
      categoryLabel: 'Kartu Domino',
      image: '/assets/lobby_bg.jpg',
      badge: 'FAVORIT INDO',
      badgeColor: '#06B6D4',
      activePlayers: '6.700 Pemain',
      rtpOrWinRate: 'Multiplayer 4 Orang',
      description: 'Game kartu balak Domino Gaple paling digemari dengan room santai dan VIP.'
    },
    {
      id: 'qiuqiu',
      name: 'Domino Qiu Qiu (99)',
      category: 'billiards',
      categoryLabel: 'Kartu Domino',
      image: '/assets/hero_showcase.jpg',
      badge: 'HIGH ROLLER',
      badgeColor: '#EC4899',
      activePlayers: '3.800 Pemain',
      rtpOrWinRate: 'Kombinasi 6 Dewa',
      description: 'Trik dan strategi kartu Domino 99 untuk memenangkan chip lawan di meja taruhan.'
    }
  ];

  const filteredGames = activeTab === 'all' ? games : games.filter(g => g.category === activeTab);

  return (
    <section id="games" className="section-wrapper">
      <div className="container">
        
        {/* Section Header */}
        <div className="section-header">
          <div className="section-tag">
            <Gamepad2 size={14} />
            <span>Koleksi Permainan Lengkap</span>
          </div>
          <h2 className="section-title">
            Satu Aplikasi, <span className="text-gold">Semua Game Favorit</span>
          </h2>
          <p className="section-subtitle">
            Pilih dari puluhan permainan kartu tradisional, arena billiard online, hingga slot kasino berhadiah jackpot melimpah.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="tabs-container">
          <button
            onClick={() => setActiveTab('all')}
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          >
            🔥 Semua Permainan
          </button>
          <button
            onClick={() => setActiveTab('billiards')}
            className={`tab-btn ${activeTab === 'billiards' ? 'active' : ''}`}
          >
            🎱 Billiard & Domino
          </button>
          <button
            onClick={() => setActiveTab('slots')}
            className={`tab-btn ${activeTab === 'slots' ? 'active' : ''}`}
          >
            🎰 Slot Kasino VIP
          </button>
          <button
            onClick={() => setActiveTab('pvp')}
            className={`tab-btn ${activeTab === 'pvp' ? 'active' : ''}`}
          >
            ⚔️ 1v1 By One PvP
          </button>
        </div>

        {/* Games Grid */}
        <div className="games-grid">
          {filteredGames.map((game) => (
            <div key={game.id} className="game-card glass-panel">
              
              {/* Card Image Container */}
              <div className="game-thumb-box">
                <Image
                  src={game.image}
                  alt={game.name}
                  width={380}
                  height={220}
                  className="game-thumb"
                />
                <div className="game-thumb-overlay">
                  <button onClick={onOpenDownload} className="play-overlay-btn">
                    <Play size={20} fill="#000" />
                  </button>
                </div>

                {/* Badge Overlay */}
                <span className="game-badge" style={{ backgroundColor: game.badgeColor }}>
                  {game.badge}
                </span>

                {/* Category Tag */}
                <span className="game-cat-tag">
                  {game.categoryLabel}
                </span>
              </div>

              {/* Card Content */}
              <div className="game-content">
                <h3 className="game-name">{game.name}</h3>
                <p className="game-desc">{game.description}</p>

                {/* Game Stats */}
                <div className="game-stats">
                  <div className="stat-pill">
                    <Flame size={14} className="text-gold" />
                    <span>{game.activePlayers}</span>
                  </div>
                  <div className="stat-pill" style={{ color: '#34D399' }}>
                    <Sparkles size={14} />
                    <span>{game.rtpOrWinRate}</span>
                  </div>
                </div>

                {/* Play / Download CTA */}
                <button onClick={onOpenDownload} className="btn-game-download">
                  <Download size={16} />
                  <span>Mainkan Sekarang</span>
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>

      <style jsx>{`
        .tabs-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 44px;
          flex-wrap: wrap;
        }
        .tab-btn {
          padding: 12px 24px;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #A0AEC0;
          font-family: var(--font-heading);
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
          border-color: rgba(245, 197, 24, 0.4);
        }
        .tab-btn.active {
          background: var(--gold-gradient);
          color: #1a1000;
          border-color: transparent;
          box-shadow: 0 4px 20px rgba(245, 197, 24, 0.4);
        }

        .games-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }
        .game-card {
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .game-card:hover {
          transform: translateY(-8px);
          border-color: rgba(245, 197, 24, 0.5);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(245, 197, 24, 0.2);
        }
        .game-thumb-box {
          position: relative;
          width: 100%;
          height: 200px;
          overflow: hidden;
          background: #0d111a;
        }
        .game-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .game-card:hover .game-thumb {
          transform: scale(1.08);
        }
        .game-thumb-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          opacity: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.3s ease;
        }
        .game-card:hover .game-thumb-overlay {
          opacity: 1;
        }
        .play-overlay-btn {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: var(--gold-gradient);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transform: scale(0.85);
          transition: transform 0.3s ease;
          box-shadow: 0 0 20px rgba(245, 197, 24, 0.8);
        }
        .game-card:hover .play-overlay-btn {
          transform: scale(1);
        }
        .game-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          color: #FFF;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 6px;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }
        .game-cat-tag {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: rgba(8, 10, 16, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #E2E8F0;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
        }
        .game-content {
          padding: 22px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .game-name {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          margin-bottom: 8px;
          color: #FFFFFF;
        }
        .game-desc {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 16px;
          flex: 1;
        }
        .game-stats {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }
        .stat-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.05);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          color: #E2E8F0;
        }
        .btn-game-download {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px;
          background: rgba(245, 197, 24, 0.12);
          border: 1px solid rgba(245, 197, 24, 0.35);
          border-radius: 10px;
          color: #FDE047;
          font-family: var(--font-heading);
          font-size: 0.92rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .btn-game-download:hover {
          background: var(--gold-gradient);
          color: #1a1000;
          border-color: transparent;
          box-shadow: 0 4px 16px rgba(245, 197, 24, 0.4);
        }

        @media (max-width: 992px) {
          .games-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .games-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
