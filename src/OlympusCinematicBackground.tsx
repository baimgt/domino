import React, { useEffect, useRef } from 'react';
import './olympus-cinematic.css';

interface OlympusCinematicBackgroundProps {
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
  wobbleSpeed: number;
}

interface LightningBolt {
  segments: { x1: number; y1: number; x2: number; y2: number }[];
  life: number;
  maxLife: number;
  color: string;
}

export const OlympusCinematicBackground: React.FC<OlympusCinematicBackgroundProps> = ({ children }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const skyFlashRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle pool for golden embers
    const particles: Particle[] = [];
    const maxParticles = 45;

    const createParticle = (): Particle => {
      const maxLife = 120 + Math.random() * 100;
      return {
        x: Math.random() * width,
        y: height * 0.75 + Math.random() * (height * 0.3),
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(0.8 + Math.random() * 1.6),
        size: 1.5 + Math.random() * 2.8,
        alpha: 0,
        maxAlpha: 0.4 + Math.random() * 0.6,
        life: 0,
        maxLife,
        wobbleSpeed: 0.02 + Math.random() * 0.04
      };
    };

    for (let i = 0; i < maxParticles; i++) {
      const p = createParticle();
      p.life = Math.random() * p.maxLife; // Stagger initial lifetime
      particles.push(p);
    }

    // Lightning bolt system
    const activeBolts: LightningBolt[] = [];
    let nextLightningTime = Date.now() + 1200 + Math.random() * 1500;

    const generateLightningBranch = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      displace: number,
      depth: number,
      segments: { x1: number; y1: number; x2: number; y2: number }[]
    ) => {
      if (depth <= 0 || displace < 3) {
        segments.push({ x1, y1, x2, y2 });
        return;
      }
      const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * displace;
      const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * displace;
      generateLightningBranch(x1, y1, midX, midY, displace / 1.8, depth - 1, segments);
      generateLightningBranch(midX, midY, x2, y2, displace / 1.8, depth - 1, segments);

      // Chance of fork
      if (Math.random() < 0.35 && depth > 2) {
        const forkEndX = midX + (Math.random() - 0.5) * displace * 2;
        const forkEndY = midY + Math.random() * displace * 2;
        generateLightningBranch(midX, midY, forkEndX, forkEndY, displace / 2, depth - 2, segments);
      }
    };

    const triggerLightning = () => {
      const now = Date.now();
      nextLightningTime = now + 2000 + Math.random() * 2800;

      // Sky flash trigger
      if (skyFlashRef.current) {
        skyFlashRef.current.classList.add('active');
        setTimeout(() => {
          if (skyFlashRef.current) skyFlashRef.current.classList.remove('active');
        }, 80);

        // Occasional double flash
        if (Math.random() < 0.6) {
          setTimeout(() => {
            if (skyFlashRef.current) {
              skyFlashRef.current.classList.add('active');
              setTimeout(() => {
                if (skyFlashRef.current) skyFlashRef.current.classList.remove('active');
              }, 60);
            }
          }, 140);
        }
      }

      // Origin point: near Zeus's raised hand (x: 41%, y: 19%) or stormy clouds (x: 22% or x: 84%)
      const isFromHand = Math.random() < 0.7;
      const startX = isFromHand
        ? width * (0.41 + (Math.random() - 0.5) * 0.04)
        : (Math.random() < 0.5 ? width * (0.22 + (Math.random() - 0.5) * 0.08) : width * (0.84 + (Math.random() - 0.5) * 0.08));
      const startY = isFromHand
        ? height * (0.19 + (Math.random() - 0.5) * 0.03)
        : height * (0.12 + Math.random() * 0.08);

      const endX = startX + (Math.random() - 0.5) * width * 0.4;
      const endY = height * (0.52 + Math.random() * 0.35);

      const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
      generateLightningBranch(startX, startY, endX, endY, width * 0.08, 5, segments);

      activeBolts.push({
        segments,
        life: 0,
        maxLife: 7, // frames
        color: Math.random() < 0.8 ? '#00f0ff' : '#70d6ff'
      });
    };

    // Constant micro-spark electric arcs around Zeus's hand
    let arcTimer = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();
      if (now > nextLightningTime) {
        triggerLightning();
      }

      // 1. Draw Golden Floating Embers
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;
        p.x += p.vx + Math.sin(p.life * p.wobbleSpeed) * 0.6;
        p.y += p.vy;

        // Fade in and fade out curve
        const progress = p.life / p.maxLife;
        if (progress < 0.2) {
          p.alpha = (progress / 0.2) * p.maxAlpha;
        } else if (progress > 0.7) {
          p.alpha = (1 - (progress - 0.7) / 0.3) * p.maxAlpha;
        } else {
          p.alpha = p.maxAlpha;
        }

        if (p.life >= p.maxLife || p.y < -10) {
          particles[i] = createParticle();
          continue;
        }

        // Draw glowing ember
        const rad = Math.max(0.5, p.size);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 3);
        grad.addColorStop(0, `rgba(255, 255, 240, ${p.alpha})`);
        grad.addColorStop(0.3, `rgba(255, 215, 0, ${p.alpha * 0.8})`);
        grad.addColorStop(0.8, `rgba(255, 120, 0, ${p.alpha * 0.3})`);
        grad.addColorStop(1, 'rgba(255, 120, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Draw Hand Micro-Electric Arcs
      arcTimer++;
      if (arcTimer % 4 === 0) {
        const handX = width * 0.41;
        const handY = height * 0.19;
        const arcCount = 2 + Math.floor(Math.random() * 3);

        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.2;

        for (let a = 0; a < arcCount; a++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 10 + Math.random() * 32;
          const targetX = handX + Math.cos(angle) * dist;
          const targetY = handY + Math.sin(angle) * dist;

          ctx.beginPath();
          ctx.moveTo(handX, handY);
          const midX = (handX + targetX) / 2 + (Math.random() - 0.5) * 12;
          const midY = (handY + targetY) / 2 + (Math.random() - 0.5) * 12;
          ctx.lineTo(midX, midY);
          ctx.lineTo(targetX, targetY);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 3. Draw Active Lightning Bolts
      for (let b = activeBolts.length - 1; b >= 0; b--) {
        const bolt = activeBolts[b];
        bolt.life++;

        if (bolt.life > bolt.maxLife) {
          activeBolts.splice(b, 1);
          continue;
        }

        const boltAlpha = 1 - bolt.life / bolt.maxLife;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'miter';

        // Outer glow
        ctx.strokeStyle = bolt.color;
        ctx.shadowColor = bolt.color;
        ctx.shadowBlur = 18;
        ctx.lineWidth = 3.5;
        ctx.globalAlpha = boltAlpha * 0.7;

        ctx.beginPath();
        for (const seg of bolt.segments) {
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.stroke();

        // Inner bright white core
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = boltAlpha;

        ctx.beginPath();
        for (const seg of bolt.segments) {
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.stroke();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="olympus-cinematic-container">
      {/* 1. Cinematic Ken Burns Artwork */}
      <div className="olympus-cinematic-art" />

      {/* 2. Zeus Divine Aura & Hand Lightning Glow */}
      <div className="olympus-divine-aura" />
      <div className="olympus-hand-energy" />

      {/* 3. Realtime procedural lightning & ember canvas */}
      <canvas ref={canvasRef} className="olympus-cinematic-canvas" />

      {/* 4. Full-screen lightning sky flash */}
      <div ref={skyFlashRef} className="olympus-cinematic-skyflash" />

      {/* 5. Subtle edge vignette */}
      <div className="olympus-cinematic-vignette" />

      {/* 7. Foreground Content (Loading bar, login controls, etc.) */}
      {children}
    </div>
  );
};

export default OlympusCinematicBackground;
