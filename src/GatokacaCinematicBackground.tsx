import React, { useEffect, useState } from 'react';
import './gatokaca-cinematic.css';

interface Props {
  progress: number;
}

export default function GatokacaCinematicBackground({ progress }: Props) {
  const [particles, setParticles] = useState<{id:number, x:number, y:number, size:number, dur:number, delay:number}[]>([]);

  useEffect(() => {
    // Generate 40 fire/gold embers
    const newParticles = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: 100 + Math.random() * 20, // start below screen
      size: Math.random() * 0.5 + 0.2, // 0.2 to 0.7 vh
      dur: Math.random() * 3 + 2.5, // 2.5 to 5.5 seconds
      delay: Math.random() * 2, // 0 to 2 seconds delay
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="gato-cine-wrapper">
      {/* Background with slow zoom/pan */}
      <div className="gato-cine-bg" />

      {/* Lightning flashes */}
      <div className="gato-cine-lightning" />
      <div className="gato-cine-lightning gato-cine-lightning-2" />

      {/* Floating Gatotkaca Hero cutout */}
      <div className="gato-cine-hero-wrap">
        <img src="/assets/gatokaca/test_defringed.png" alt="Hero" className="gato-cine-hero" />
        {/* Glow behind hero */}
        <div className="gato-cine-hero-glow" />
      </div>

      {/* Floating sparks/embers */}
      <div className="gato-cine-particles">
        {particles.map(p => (
          <div 
            key={p.id}
            className="gato-cine-ember"
            style={{
              left: `${p.x}%`,
              bottom: `-${p.y}%`,
              width: `${p.size}vh`,
              height: `${p.size}vh`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`
            }}
          />
        ))}
      </div>

      {/* Dark overlay at bottom for contrast */}
      <div className="gato-cine-vignette" />

      {/* Progress UI */}
      <div className="gato-cine-ui">
        <div className="gato-cine-title">GATES OF GATOTKACA</div>
        <div className="gato-cine-subtitle">1000</div>
        
        <div className="gato-cine-bar-wrap">
          <div className="gato-cine-bar-track">
            <div className="gato-cine-bar-fill" style={{ width: `${progress}%` }} />
            {/* Sparkle on the leading edge */}
            {progress > 0 && progress < 100 && (
              <div className="gato-cine-bar-spark" style={{ left: `${progress}%` }} />
            )}
          </div>
          <div className="gato-cine-loading-text">
            MEMUAT... {progress}%
          </div>
        </div>
      </div>
    </div>
  );
}
