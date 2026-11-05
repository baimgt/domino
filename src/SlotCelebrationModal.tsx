import React, { useEffect, useState, useRef } from 'react';
import './slot-celebration.css';

export type CelebrationType = 'win' | 'big_win' | 'mega_win' | 'super_win' | 'scatter' | 'free_spins_total';

export interface SlotCelebrationData {
  type: CelebrationType;
  amount?: number;
  freeSpinsCount?: number;
  title?: string;
  subtext?: string;
}
export const SlotCelebrationData = {};

interface Props {
  data: SlotCelebrationData | null;
  onClose: () => void;
  autoCloseMs?: number;
}

interface ParticleSpec {
  id: number;
  type: 'coin' | 'star' | 'diamond';
  left: number;
  size: number;
  duration: number;
  delay: number;
}

const STATIC_PARTICLES: ParticleSpec[] = [
  { id: 1,  type: 'coin',    left: 8,  size: 26, duration: 1.8, delay: 0 },
  { id: 2,  type: 'star',    left: 16, size: 18, duration: 1.6, delay: 0.15 },
  { id: 3,  type: 'coin',    left: 24, size: 30, duration: 2.0, delay: 0.05 },
  { id: 4,  type: 'diamond', left: 32, size: 20, duration: 1.7, delay: 0.25 },
  { id: 5,  type: 'coin',    left: 42, size: 28, duration: 1.9, delay: 0.1 },
  { id: 6,  type: 'star',    left: 52, size: 22, duration: 1.6, delay: 0.2 },
  { id: 7,  type: 'coin',    left: 60, size: 32, duration: 2.1, delay: 0.05 },
  { id: 8,  type: 'diamond', left: 70, size: 20, duration: 1.7, delay: 0.3 },
  { id: 9,  type: 'coin',    left: 78, size: 26, duration: 1.8, delay: 0.15 },
  { id: 10, type: 'star',    left: 86, size: 24, duration: 1.9, delay: 0.1 },
  { id: 11, type: 'coin',    left: 92, size: 28, duration: 2.0, delay: 0.25 },
];

// Native Web Audio Synth for celebration chime, chord & fanfare
function playCelebrationSound(type: CelebrationType) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'scatter') {
      const freqs = [440, 554.37, 659.25, 880, 1108.7];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.07);
        gain.gain.setValueAtTime(0.18, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.9);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.95);
      });
    } else if (type === 'free_spins_total') {
      // Grand celebratory victory fanfare
      const chords = [
        [523.25, 659.25, 783.99],          // C major
        [587.33, 698.46, 880.00],          // D minor
        [659.25, 783.99, 987.77],          // E minor
        [783.99, 987.77, 1174.66],         // G major
        [1046.50, 1318.51, 1567.98, 2093]  // High C Grand Chord
      ];
      chords.forEach((chord, cIdx) => {
        chord.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + cIdx * 0.13);
          gain.gain.setValueAtTime(0.18, now + cIdx * 0.13);
          gain.gain.exponentialRampToValueAtTime(0.001, now + cIdx * 0.13 + 1.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + cIdx * 0.13);
          osc.stop(now + cIdx * 0.13 + 1.35);
        });
      });
    } else {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.08);
        gain.gain.setValueAtTime(0.18, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.7);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.75);
      });
    }
  } catch (e) {
    // Ignore audio autoplay restrictions gracefully
  }
}

export default function SlotCelebrationModal({ data, onClose, autoCloseMs = 2400 }: Props) {
  const [displayAmount, setDisplayAmount] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const animRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const exitTimerRef = useRef<any>(null);

  const effectiveAutoCloseMs = data?.type === 'free_spins_total' ? Math.max(autoCloseMs, 4600) : autoCloseMs;

  const handleDismiss = () => {
    if (isExiting) return;
    setIsExiting(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    exitTimerRef.current = setTimeout(() => {
      onClose();
    }, 240);
  };

  useEffect(() => {
    if (!data) return;
    setIsExiting(false);

    // Audio SFX
    playCelebrationSound(data.type);

    // Dynamic numeric rolling odometer in 750ms
    if (data.amount && data.amount > 0) {
      const target = Math.floor(data.amount);
      const startTime = performance.now();
      const duration = data.type === 'free_spins_total' ? 950 : 650; // ms

      const updateCount = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.floor(target * easeOut);
        setDisplayAmount(currentVal);

        if (progress < 1) {
          animRef.current = requestAnimationFrame(updateCount);
        } else {
          setDisplayAmount(target);
        }
      };

      animRef.current = requestAnimationFrame(updateCount);
    } else {
      setDisplayAmount(0);
    }

    // Hands-free auto-dismiss timer
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, effectiveAutoCloseMs);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [data, effectiveAutoCloseMs]);

  if (!data) return null;

  const isScatter = data.type === 'scatter';
  const isFSTotal = data.type === 'free_spins_total';
  const defaultTitle = isFSTotal
    ? 'TOTAL KEMENANGAN'
    : isScatter
    ? 'SCATTER BONUS'
    : data.type === 'super_win'
    ? 'SUPER WIN'
    : data.type === 'mega_win'
    ? 'MEGA WIN'
    : 'BIG WIN';

  const defaultSubtext = isFSTotal
    ? 'SELAMAT! TOTAL KEMENANGAN PUTARAN GRATIS!'
    : isScatter
    ? 'PUTARAN GRATIS BERHASIL DIAKTIFKAN!'
    : data.type === 'super_win'
    ? 'KEMENANGAN SULTAN FANTASTIS!'
    : data.type === 'mega_win'
    ? 'KEMENANGAN MEGA SPEKTAKULER!'
    : 'SELAMAT ATAS KEMENANGAN BESARMU!';

  const title = data.title || defaultTitle;
  const subtext = data.subtext || defaultSubtext;

  return (
    <div
      className={`slot-cel-overlay theme-${data.type} ${isExiting ? 'is-exiting' : ''}`}
      onClick={handleDismiss}
      style={{ '--auto-duration': `${autoCloseMs}ms` } as React.CSSProperties}
    >
      {/* Ambient Radial Spotlight */}
      <div className="slot-cel-spotlight" />

      {/* Expanding Soft Light Shockwaves */}
      <div className="slot-cel-shockwave-wrap">
        <div className="slot-cel-shockwave" />
        <div className="slot-cel-shockwave" />
      </div>

      {/* Radiant Sunburst Beams */}
      <div className="slot-cel-sunburst" />

      {/* Modern High-End Particles (3D Coins, Stars, Diamonds) */}
      <div className="slot-cel-particles">
        {STATIC_PARTICLES.map(p => (
          <div
            key={p.id}
            className={`slot-cel-particle particle-${p.type}`}
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          >
            {p.type === 'coin' && <div className="slot-cel-coin-inner" />}
            {p.type === 'star' && <span className="slot-cel-star-symbol">✦</span>}
            {p.type === 'diamond' && <span className="slot-cel-diamond-symbol">◆</span>}
          </div>
        ))}
      </div>

      {/* Center Cinematic Shield */}
      <div className="slot-cel-center">
        {/* Modern Vector Icon Emblem */}
        <div className="slot-cel-emblem-wrap">
          <div className="slot-cel-emblem-halo" />
          <div className="slot-cel-emblem-icon">
            {isScatter ? (
              <svg viewBox="0 0 24 24" fill="none" className="slot-cel-svg-icon" stroke="#ffd700" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#boltGrad)" />
                <defs>
                  <linearGradient id="boltGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fff9c4" />
                    <stop offset="60%" stopColor="#ffd700" />
                    <stop offset="100%" stopColor="#ff8f00" />
                  </linearGradient>
                </defs>
              </svg>
            ) : data.type === 'super_win' ? (
              <svg viewBox="0 0 24 24" fill="none" className="slot-cel-svg-icon">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" fill="url(#crownGrad)" />
                <defs>
                  <linearGradient id="crownGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="50%" stopColor="#ffd700" />
                    <stop offset="100%" stopColor="#ff1744" />
                  </linearGradient>
                </defs>
              </svg>
            ) : data.type === 'mega_win' ? (
              <svg viewBox="0 0 24 24" fill="none" className="slot-cel-svg-icon">
                <path d="M6 3h12l4 7-10 11L2 10l4-7z" fill="url(#diaGrad)" stroke="#fff" strokeWidth="0.8" />
                <defs>
                  <linearGradient id="diaGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="45%" stopColor="#ea80fc" />
                    <stop offset="100%" stopColor="#7b1fa2" />
                  </linearGradient>
                </defs>
              </svg>
            ) : isFSTotal ? (
              <svg viewBox="0 0 24 24" fill="none" className="slot-cel-svg-icon">
                <path d="M6 3h12v4a6 6 0 01-12 0V3z" fill="url(#trophyGrad)" stroke="#ffd700" strokeWidth="1" />
                <path d="M6 5H3a2 2 0 00-2 2v1a4 4 0 004 4h1M18 5h3a2 2 0 012 2v1a4 4 0 01-4 4h-1" stroke="#ffd700" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M12 11v5m-4 5h8m-4-5v5" stroke="#ffd700" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="12" cy="7" r="1.5" fill="#ffffff" />
                <defs>
                  <linearGradient id="trophyGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="35%" stopColor="#ffd700" />
                    <stop offset="75%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                </defs>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="slot-cel-svg-icon">
                <circle cx="12" cy="12" r="10" fill="url(#coinGrad)" stroke="#fff" strokeWidth="1" />
                <path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5c0 2-3 2.2-3 3.5v.5" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
                <defs>
                  <linearGradient id="coinGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fff9c4" />
                    <stop offset="50%" stopColor="#ffd700" />
                    <stop offset="100%" stopColor="#f57f17" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </div>
        </div>

        {/* Modern Headline */}
        <div className="slot-cel-headline-wrap">
          <h1 className="slot-cel-headline">{title}</h1>
        </div>

        {/* Subtitle Pill */}
        <div className="slot-cel-subtext-pill">
          <span>{subtext}</span>
        </div>

        {/* Modern Prize Glassmorphic Capsule */}
        {isScatter ? (
          <div className="slot-cel-prize-capsule">
            <div className="slot-cel-scatter-num">+{data.freeSpinsCount || 10}</div>
            <div className="slot-cel-scatter-lbl">PUTARAN GRATIS</div>
          </div>
        ) : (
          <div className="slot-cel-prize-capsule">
            <span className="slot-cel-currency-tag">Rp</span>
            <span className="slot-cel-number">{displayAmount.toLocaleString('id-ID')}</span>
          </div>
        )}

        {/* Sleek Auto-Dismiss Progress Indicator */}
        <div className="slot-cel-auto-bar-wrap" title="Menghilang otomatis">
          <div className="slot-cel-auto-bar" />
        </div>

        <div className="slot-cel-tap-hint">KLIK DI MANA SAJA UNTUK MELANJUTKAN ❯</div>
      </div>
    </div>
  );
}
