import React, { useEffect, useRef } from 'react';
import './royal-loading.css';

interface RoyalLoadingBackgroundProps {
  children?: React.ReactNode;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
}

export const RoyalLoadingBackground: React.FC<RoyalLoadingBackgroundProps> = ({ children }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Floating gold bokeh / embers
    const particles: Particle[] = [];
    const maxParticles = 40;

    const createParticle = (): Particle => {
      const maxLife = 120 + Math.random() * 120;
      return {
        x: Math.random() * width,
        y: height * 0.8 + Math.random() * (height * 0.25),
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(0.5 + Math.random() * 1.2),
        size: 1.2 + Math.random() * 2.6,
        alpha: 0,
        maxAlpha: 0.35 + Math.random() * 0.55,
        life: 0,
        maxLife,
      };
    };

    for (let i = 0; i < maxParticles; i++) {
      const p = createParticle();
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        // Fade in and out smoothly
        const halfLife = p.maxLife / 2;
        if (p.life < halfLife) {
          p.alpha = (p.life / halfLife) * p.maxAlpha;
        } else {
          p.alpha = (1 - (p.life - halfLife) / halfLife) * p.maxAlpha;
        }

        if (p.life >= p.maxLife || p.y < -10) {
          particles[i] = createParticle();
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${p.alpha})`;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="royal-loading-screen">
      <div className="royal-crest-aura" />
      <canvas ref={canvasRef} className="royal-particle-canvas" />
      {children}
    </div>
  );
};

export default RoyalLoadingBackground;
