import React, { useEffect, useState, useRef } from 'react';
import './gatokaca-cinematic.css';
import { preloadSlotGame } from './slotAssetPreloader';

export interface SlotCinematicConfig {
  id: string;
  art: string;
  fallbackArt?: string;
  hasBakedTitle?: boolean;
  title?: string;
  provider?: string;
  subtitle?: string;
  themeClass?: string;
  tips: string[];
}

const SLOT_CONFIGS: Record<string, SlotCinematicConfig> = {
  gatotkaca: {
    id: 'gatotkaca',
    art: '/assets/gatokaca/loading_art.jpg',
    fallbackArt: '/assets/gatokaca/bg-gato-new.png',
    hasBakedTitle: true,
    themeClass: 'gato-theme-gatotkaca',
    tips: [
      'SATU JIWA, JUTA KEMENANGAN',
      'LEGENDA TAK PERNAH BERAKHIR',
      'KUMPULKAN 4 SCATTER UNTUK FREE SPIN',
      'SIMBOL MEMBAYAR DI MANA SAJA'
    ]
  },
  zeus: {
    id: 'zeus',
    art: '/assets/zeus/bg_olympus_hd.jpg',
    fallbackArt: '/assets/zeus/bg_olympus.jpg',
    hasBakedTitle: true,
    themeClass: 'gato-theme-zeus',
    tips: [
      'KEMURKAAN SANG DEWA PETIR OLYMPUS',
      'RAIH MULTIPLIER HINGGA 500X DALAM SATU SAMBARAN',
      'KUMPULKAN 4 KEPALA ZEUS UNTUK 15 FREE SPINS',
      'SEMOGA DEWA ZEUS MEMBAWA MAXWIN HARI INI'
    ]
  },
  duofuduocai: {
    id: 'duofuduocai',
    art: '/assets/duofuduocai/loading_art.jpg',
    fallbackArt: '/duofu_loading_art.jpg',
    hasBakedTitle: true,
    themeClass: 'gato-theme-duofu',
    tips: [
      'KEMAKMURAN DAN HOKI BERLIPAT GANDA',
      'PILIH VAS FU KEBERUNTUNGAN UNTUK JACKPOT GRAND',
      'GENTONG EMAS SIAP MELEDAK KAPAN SAJA',
      'SEMOGA BERUNTUNG MERAIH 99 MILYAR KOIN'
    ]
  },
  fafafa2: {
    id: 'fafafa2',
    art: '/assets/fafafa2/loading.jpg',
    fallbackArt: '/assets/fafafa2/bg_temple_clean.jpg',
    hasBakedTitle: true,
    themeClass: 'gato-theme-fafafa',
    tips: [
      'SENSASI KLASIK 3 GULUNGAN TERBAIK',
      'KAKEK MERAH & WILD LIPAT GANDAKAN KEMENANGAN',
      'PUTARAN CEPAT DENGAN VOLATILITAS TINGGI',
      'JEBOLKAN MEGA WIN 10 MILYAR SEKARANG'
    ]
  },
  jinjibaoxi: {
    id: 'jinjibaoxi',
    art: '/assets/jinji/loading.jpg',
    fallbackArt: '/assets/jinji/loading.jpg',
    hasBakedTitle: true,
    themeClass: 'gato-theme-jinji',
    tips: [
      'NAGA EMAS PEMBAWA KEMAKMURAN ABADI',
      'KUMPULKAN KOIN UNTUK MEMICU PIRING KEBERUNTUNGAN',
      'SEMUA SIMBOL EMAS MEMBAWA PEMBAYARAN MAKSIMAL',
      'JACKPOT GRAND SIAP MENJADI MILIKMU'
    ]
  },
  '5lions': {
    id: '5lions',
    art: '/assets/fivelions/loading.jpg',
    hasBakedTitle: true,
    themeClass: 'gato-theme-5lions',
    tips: [
      'SINGA MISTIS PENJAGA HARTA KARUN ASIA',
      '200.704 CARA MENANG DENGAN SISTEM MEGAWAYS',
      'PILIH PUTARAN GRATIS DENGAN MULTIPLIER HINGGA 40X',
      'SIMBOL YIN-YANG MEMBUKA RAHASIA KEMENANGAN'
    ]
  },
  mahjong2: {
    id: 'mahjong2',
    art: '/assets/mahjong2/loading.jpg',
    fallbackArt: '/assets/fafafa2/bg_temple_clean.jpg',
    hasBakedTitle: true,
    themeClass: 'gato-theme-mahjong',
    tips: [
      'GULUNGAN EMAS DENGAN PERKALIAN LIAR BERTINGKAT',
      'SIMBOL EMAS BERUBAH MENJADI WILD SAAT PECAH',
      'PENGALI TERUS NAIK HINGGA 10X DI FREE SPINS',
      'MAXWIN 100.000X MENANTI PEMAIN SEJATI'
    ]
  },
  wildwest: {
    id: 'wildwest',
    art: '/assets/wildwest/loading.jpg',
    fallbackArt: '/assets/wildwest/outlaw.jpg',
    hasBakedTitle: true,
    themeClass: 'gato-theme-wildwest',
    tips: [
      'PETUALANGAN KOBOI BERBURU KARUNG EMAS',
      'BINTANG SHERIFF WILD MENETAP SELAMA FREE SPINS',
      'MULTIPLIER HINGGA 5X DI SETIAP WILD YANG MUNCUL',
      'AMBIL HADIAH BURONAN TERTINGGI KOTA BARAT'
    ]
  },
  candyrush: {
    id: 'candyrush',
    art: '/assets/candyrush/loading.jpg',
    fallbackArt: '/assets/slot_loading_bg.jpg',
    hasBakedTitle: true,
    themeClass: 'gato-theme-candy',
    tips: [
      'LEDAKAN PERMEN MANIS BERHADIAH RAKSASA',
      'BOM PERMEN MENGALIKAN SEMUA KEMENANGAN RUNTUHAN',
      'KUMPULKAN 4 LOLLIPOP UNTUK 10 SPIN GRATIS',
      'TUMBLE BERUNTUN MENGHASILKAN BAYARAN MAKSIMAL'
    ]
  }
};

interface Props {
  gameId: string;
  onFinish: () => void;
  durationMs?: number;
}

export default function SlotLoadingScreen({ gameId, onFinish, durationMs = 2600 }: Props) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('MENGHUBUNGKAN KE SERVER PERMAINAN...');
  const [particles, setParticles] = useState<{ id: number; x: number; size: number; dur: number; delay: number; drift: number }[]>([]);
  const hasFinishedRef = useRef(false);
  const realPreloadDoneRef = useRef(false);
  const targetPercentRef = useRef(15);

  const cfg: SlotCinematicConfig = SLOT_CONFIGS[gameId] || {
    id: gameId,
    art: '/assets/slot_loading_bg.jpg',
    hasBakedTitle: false,
    title: 'VIP CASINO SLOT',
    provider: 'PREMIUM GAMING',
    subtitle: 'SENSASI PUTARAN KELAS DUNIA',
    tips: [
      'SEMOGA BERUNTUNG MENDAPATKAN MAXWIN HARI INI',
      'SIMBOL SCATTER MEMICU BABAK PUTARAN GRATIS',
      'RAIH JACKPOT BESAR DI SETIAP PUTARAN TARUHAN'
    ]
  };

  const [currentArt, setCurrentArt] = useState(cfg.art);

  // Generate 60 floating golden embers matching Gatotkaca cinematic
  useEffect(() => {
    const newParticles = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 0.6 + 0.2,
      dur: Math.random() * 3 + 2.5,
      delay: Math.random() * 3,
      drift: (Math.random() - 0.5) * 16,
    }));
    setParticles(newParticles);
  }, []);

  // Update background when gameId changes
  useEffect(() => {
    setCurrentArt(cfg.art);
  }, [cfg.art]);

  // Real-time Asset Preloader & Texture Decoder
  useEffect(() => {
    let isMounted = true;
    preloadSlotGame(gameId, (info) => {
      if (!isMounted) return;
      targetPercentRef.current = Math.max(targetPercentRef.current, info.percent);
      setStatusText(info.statusText);
    }).then(() => {
      if (!isMounted) return;
      realPreloadDoneRef.current = true;
      targetPercentRef.current = 100;
      setStatusText('SEMUA ASET TERMUAT LENGKAP!');
    });

    return () => {
      isMounted = false;
    };
  }, [gameId]);

  // Synchronized Progress Animation
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const timeRatio = Math.min(1, elapsed / durationMs);

      // Smooth time-based curve up to 92%
      const timeP = Math.floor(timeRatio * 92);
      const assetP = targetPercentRef.current;

      let nextP = Math.max(timeP, Math.min(assetP, 92));

      // Once all assets are 100% preloaded & decoded and minimum cinematic time has elapsed:
      if (realPreloadDoneRef.current && elapsed >= Math.min(1800, durationMs * 0.7)) {
        nextP = Math.min(100, Math.max(nextP + 4, 96));
        if (elapsed >= durationMs || nextP >= 100) {
          nextP = 100;
        }
      }

      setProgress(prev => {
        const val = Math.min(100, Math.max(prev, nextP));
        return val;
      });

      if (nextP >= 100 && realPreloadDoneRef.current && !hasFinishedRef.current) {
        hasFinishedRef.current = true;
        clearInterval(interval);
        setTimeout(() => {
          onFinish();
        }, 400);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [durationMs, onFinish]);

  const tip = cfg.tips[Math.min(cfg.tips.length - 1, Math.floor(progress / (100 / cfg.tips.length)))];

  return (
    <div className={`gato-cine-wrapper ${cfg.themeClass || ''} ${progress >= 100 ? 'gato-cine-exit' : ''}`}>
      {/* Gambar utama dengan zoom & pan sinematik pelan */}
      <div 
        className="gato-cine-bg" 
        style={{ backgroundImage: `url('${currentArt}')` }} 
      />

      {/* Fallback image loader */}
      {cfg.fallbackArt && (
        <img
          src={cfg.art}
          alt=""
          style={{ display: 'none' }}
          onError={() => setCurrentArt(cfg.fallbackArt!)}
        />
      )}

      {/* Sinar cahaya berputar dari tengah */}
      <div className="gato-cine-rays" />

      {/* Aura bercahaya berdenyut */}
      <div className="gato-cine-aura" />

      {/* Efek kilat dramatis */}
      <div className="gato-cine-lightning" />
      <div className="gato-cine-lightning gato-cine-lightning-2" />

      {/* Kilau cahaya menyapu layar */}
      <div className="gato-cine-shine" />

      {/* 60 Ember / percikan emas melayang */}
      <div className="gato-cine-particles">
        {particles.map(p => (
          <div
            key={p.id}
            className="gato-cine-ember"
            style={{
              left: `${p.x}%`,
              width: `${p.size}vh`,
              height: `${p.size}vh`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              ['--drift' as any]: `${p.drift}vw`,
            }}
          />
        ))}
      </div>

      {/* Vignette gelap sinematik */}
      <div className="gato-cine-vignette" />

      {/* Center title overlay for games without baked text in background */}
      {!cfg.hasBakedTitle && cfg.title && (
        <div className="gato-cine-title-overlay">
          {cfg.provider && (
            <div className="gato-cine-title-badge">
              <span>★</span>
              <span>{cfg.provider}</span>
              <span>★</span>
            </div>
          )}
          <h1 className="gato-cine-title-text">{cfg.title}</h1>
          {cfg.subtitle && <div className="gato-cine-title-sub">{cfg.subtitle}</div>}
        </div>
      )}

      {/* Bottom Progress UI */}
      <div className="gato-cine-ui">
        <div className="gato-cine-tip" key={tip}>{tip}</div>

        <div className="gato-cine-bar-wrap">
          <div className="gato-cine-bar-track">
            <div className="gato-cine-bar-fill" style={{ width: `${progress}%` }}>
              <div className="gato-cine-bar-shimmer" />
            </div>
            {progress > 0 && progress < 100 && (
              <div className="gato-cine-bar-spark" style={{ left: `${progress}%` }} />
            )}
          </div>
          <div className="gato-cine-loading-text">
            {progress >= 100 ? (
              <span style={{ color: '#00e676' }}>SEMUA ASET SIAP 100% ✓</span>
            ) : (
              <span>{statusText} ({progress}%)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
