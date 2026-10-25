'use client';

import { useEffect, useRef } from 'react';

export default function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    const particles: Particle[] = [];
    const maxParticles = window.innerWidth < 768 ? 22 : 48;

    class Particle {
      x: number = 0;
      y: number = 0;
      vx: number = 0;
      vy: number = 0;
      size: number = 0;
      life: number = 0;
      maxLife: number = 0;
      maxAlpha: number = 0;
      alpha: number = 0;
      color: string = '';

      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : height + 15;
        this.vx = (Math.random() - 0.5) * 0.45;
        this.vy = -(0.35 + Math.random() * 0.9);
        this.size = 1.2 + Math.random() * 2.2;
        this.life = 0;
        this.maxLife = 100 + Math.random() * 120;
        this.maxAlpha = 0.25 + Math.random() * 0.45;
        this.alpha = 0;
        this.color = Math.random() > 0.35 ? '255, 215, 0' : '192, 132, 252';
      }

      update() {
        this.life++;
        this.x += this.vx;
        this.y += this.vy;

        const half = this.maxLife / 2;
        if (this.life < half) {
          this.alpha = (this.life / half) * this.maxAlpha;
        } else {
          this.alpha = (1 - (this.life - half) / half) * this.maxAlpha;
        }

        if (this.life >= this.maxLife || this.y < -20) {
          this.reset();
        }
      }

      draw(context: CanvasRenderingContext2D) {
        context.save();
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        context.fillStyle = `rgba(${this.color}, ${Math.max(0, this.alpha)})`;
        context.shadowBlur = this.size * 3;
        context.shadowColor = `rgba(${this.color}, 0.6)`;
        context.fill();
        context.restore();
      }
    }

    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle());
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw(ctx);
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} id="particles-canvas" aria-hidden="true" />;
}
