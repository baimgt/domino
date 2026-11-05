import React, { useEffect, useState } from 'react';
import './gatokaca-cinematic.css';

interface Props {
  progress: number;
}

// Gambar loading: public/assets/gatokaca/loading_art.jpg
const LOADING_ART = '/assets/gatokaca/loading_art.jpg';
const FALLBACK_ART = '/assets/gatokaca/bg-gato-new.png';

const TIPS = [
  'SATU JIWA, JUTA KEMENANGAN',
  'LEGENDA TAK PERNAH BERAKHIR',
  'KUMPULKAN 4 SCATTER UNTUK FREE SPIN',
  'SIMBOL MEMBAYAR DI MANA SAJA',
];

export default function GatokacaCinematicBackground({ progress }: Props) {
  const [particles, setParticles] = useState<{id:number, x:number, size:number, dur:number, delay:number, drift:number}[]>([]);
  const [art, setArt] = useState(LOADING_ART);

  useEffect(() => {
    const newParticles = Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 0.6 + 0.2,
      dur: Math.random() * 3 + 2.5,
      delay: Math.random() * 3,
      drift: (Math.random() - 0.5) * 16,
    }));
    setParticles(newParticles);
  }, []);

  const tip = TIPS[Math.min(TIPS.length - 1, Math.floor(progress / (100 / TIPS.length)))];

  return (
    <div className={`gato-cine-wrapper ${progress >= 100 ? 'gato-cine-exit' : ''}`}>
      {/* Gambar utama dengan zoom sinematik */}
      <div className="gato-cine-bg" style={{ backgroundImage: `url('${art}')` }} />
      <img
        src={LOADING_ART}
        alt=""
        style={{ display: 'none' }}
        onError={() => setArt(FALLBACK_ART)}
      />

      {/* Sinar cahaya berputar */}
      <div className="gato-cine-rays" />

      {/* Aura emas berdenyut */}
      <div className="gato-cine-aura" />

      {/* Kilat */}
      <div className="gato-cine-lightning" />
      <div className="gato-cine-lightning gato-cine-lightning-2" />

      {/* Kilau emas menyapu layar */}
      <div className="gato-cine-shine" />

      {/* Ember / percikan emas */}
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

      <div className="gato-cine-vignette" />

      {/* Progress UI */}
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
            MEMUAT<span className="gato-cine-dots" /> {progress}%
          </div>
        </div>
      </div>
    </div>
  );
}
