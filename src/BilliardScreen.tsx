import { useEffect, useRef, useState, useCallback } from 'react';
import { API_URL } from './config';
import './billiard.css';
import GameMenuDropdown from './GameMenuDropdown';

// ═══════════════════════════════════════════════════════════════
//  CONSTANTS & DIMENSIONS
// ═══════════════════════════════════════════════════════════════
const TABLE_W  = 900;
const TABLE_H  = 460;
const BALL_R   = 14;
const FRICTION = 0.9880;
const POCKET_R = 32;
const MIN_SPEED = 0.10;
const RAIL_W   = 46;

const PLAY_LEFT   = RAIL_W;
const PLAY_RIGHT  = TABLE_W - RAIL_W;
const PLAY_TOP    = RAIL_W;
const PLAY_BOTTOM = TABLE_H - RAIL_W;

const POCKETS = [
  { x: RAIL_W - 2,           y: RAIL_W - 2,           id: 'tl' },
  { x: TABLE_W / 2,          y: RAIL_W - 14,          id: 'tc' },
  { x: TABLE_W - RAIL_W + 2, y: RAIL_W - 2,           id: 'tr' },
  { x: RAIL_W - 2,           y: TABLE_H - RAIL_W + 2, id: 'bl' },
  { x: TABLE_W / 2,          y: TABLE_H - RAIL_W + 14, id: 'bc' },
  { x: TABLE_W - RAIL_W + 2, y: TABLE_H - RAIL_W + 2, id: 'br' },
];

const BALL_COLORS: Record<number, string> = {
  0: '#f8fafc',
  1: '#f59e0b',  2: '#2563eb',  3: '#dc2626',  4: '#9333ea',
  5: '#ea580c',  6: '#16a34a',  7: '#991b1b',
  8: '#18181b',
  9: '#f59e0b', 10: '#2563eb', 11: '#dc2626', 12: '#9333ea',
  13: '#ea580c', 14: '#16a34a', 15: '#991b1b',
};

const STRIPE_SET = new Set([9, 10, 11, 12, 13, 14, 15]);

// ═══════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════
interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pocketed: boolean;
  angle: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  r: number;
}

interface SpinState {
  x: number;
  y: number;
}

interface SinkingBall {
  id: number;
  x: number;
  y: number;
  px: number;
  py: number;
  progress: number;
  color: string;
  rollAngle: number;
  orbitR: number;
  orbitAngle: number;
}

interface AimTrajectory {
  ghostX: number;
  ghostY: number;
  hitPointX: number;
  hitPointY: number;
  targetBall: Ball | null;
  targetDirX: number;
  targetDirY: number;
  deflectDirX: number;
  deflectDirY: number;
  targetPocket: { x: number; y: number } | null;
}

export interface PoolRoom {
  id: string;
  name: string;
  entry: number;
  prize: number;
  city: string;
  flag: string;
  tier: 'Pemula' | 'Menengah' | 'Pro' | 'Master' | 'Raja';
  tierCategory: 'pemula' | 'menengah' | 'pro' | 'sultan';
  minLevel: number;
  ringName: string;
  feltColor: string;
  feltName: string;
  accentColor: string;
  onlineCount: number;
  badge: string;
  bg: string;
}

export const POOL_ROOMS: PoolRoom[] = [
  {
    id: 'london',
    name: 'London Pub',
    entry: 5000,
    prize: 10000,
    city: 'London',
    flag: '🇬🇧',
    tier: 'Pemula',
    tierCategory: 'pemula',
    minLevel: 1,
    ringName: 'London Crown Ring',
    feltColor: '#1d4ed8',
    feltName: 'Simonis Royal Blue',
    accentColor: '#3b82f6',
    onlineCount: 3840,
    badge: '⭐ FAVORIT PEMULA',
    bg: 'linear-gradient(135deg, #0f1f3d 0%, #1e3a8a 50%, #0a1324 100%)',
  },
  {
    id: 'sydney',
    name: 'Sydney Marina',
    entry: 20000,
    prize: 40000,
    city: 'Sydney',
    flag: '🇦🇺',
    tier: 'Menengah',
    tierCategory: 'menengah',
    minLevel: 2,
    ringName: 'Sydney Harbour Ring',
    feltColor: '#059669',
    feltName: 'Emerald Marina Cloth',
    accentColor: '#10b981',
    onlineCount: 2450,
    badge: '⚓ POPULER',
    bg: 'linear-gradient(135deg, #062b1d 0%, #065f46 50%, #03150e 100%)',
  },
  {
    id: 'jakarta',
    name: 'Jakarta Club',
    entry: 50000,
    prize: 100000,
    city: 'Jakarta',
    flag: '🇮🇩',
    tier: 'Pro',
    tierCategory: 'pro',
    minLevel: 3,
    ringName: 'Monas Gold Ring',
    feltColor: '#b45309',
    feltName: 'Amber Velvet Cloth',
    accentColor: '#f59e0b',
    onlineCount: 4620,
    badge: '🔥 HOT MATCH',
    bg: 'linear-gradient(135deg, #3d1b06 0%, #7c2d12 50%, #1a0b02 100%)',
  },
  {
    id: 'tokyo',
    name: 'Tokyo Arena',
    entry: 100000,
    prize: 200000,
    city: 'Tokyo',
    flag: '🇯🇵',
    tier: 'Master',
    tierCategory: 'pro',
    minLevel: 5,
    ringName: 'Tokyo Shogun Ring',
    feltColor: '#7e22ce',
    feltName: 'Shogun Cyber Cloth',
    accentColor: '#a855f7',
    onlineCount: 1280,
    badge: '⚡ MASTER ARENA',
    bg: 'linear-gradient(135deg, #2b0c45 0%, #581c87 50%, #13051f 100%)',
  },
  {
    id: 'vegas',
    name: 'Las Vegas VIP',
    entry: 200000,
    prize: 400000,
    city: 'Las Vegas',
    flag: '🇺🇸',
    tier: 'Raja',
    tierCategory: 'sultan',
    minLevel: 8,
    ringName: 'Vegas Royale Ring',
    feltColor: '#be185d',
    feltName: 'Royale Ruby Cloth',
    accentColor: '#ec4899',
    onlineCount: 650,
    badge: '👑 HIGH ROLLER SULTAN',
    bg: 'linear-gradient(135deg, #3d091e 0%, #831843 50%, #1a030c 100%)',
  },
];

const OPPONENT_LIST = [
  { name: 'Mike Champion', level: 46, avatar: 'https://i.pravatar.cc/100?img=68' },
  { name: 'Sarah Queen',   level: 52, avatar: 'https://i.pravatar.cc/100?img=44' },
  { name: 'Budi Pool Master', level: 39, avatar: 'https://i.pravatar.cc/100?img=12' },
  { name: 'Alex Trickshot', level: 61, avatar: 'https://i.pravatar.cc/100?img=60' },
  { name: 'David Hustler', level: 48, avatar: 'https://i.pravatar.cc/100?img=33' },
  { name: 'Jessica Miller', level: 55, avatar: 'https://i.pravatar.cc/100?img=47' },
  { name: 'Rian Sultan 8', level: 42, avatar: 'https://i.pravatar.cc/100?img=11' },
  { name: 'Farhan Snooker', level: 50, avatar: 'https://i.pravatar.cc/100?img=53' }
];

// ═══════════════════════════════════════════════════════════════
//  PROCEDURAL WEB AUDIO SYNTHESIZER (ZERO ASSET DEPENDENCY)
// ═══════════════════════════════════════════════════════════════
class BilliardSoundManager {
  private ctx: AudioContext | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private unlocked = false;
  private lastClackMs = 0;
  private lastCushionMs = 0;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (!this.unlocked) {
      try {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        this.unlocked = true;
      } catch {
        // Ignore unlock errors on restricted contexts
      }
    }
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuf && this.noiseBuf.sampleRate === ctx.sampleRate) {
      return this.noiseBuf;
    }
    const len = Math.floor(ctx.sampleRate * 0.15);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuf = buffer;
    return buffer;
  }

  playCueHit(power: number) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const p = Math.min(1, Math.max(0.12, power));

    // Layer 1: Maple cue shaft resonance thud
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(250 + p * 90, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(52, now + 0.095);

    const bodyVol = Math.min(0.95, 0.32 + p * 0.6);
    bodyGain.gain.setValueAtTime(bodyVol, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.105);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.11);

    // Layer 2: Crisp phenolic cue ball click
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(1150 + p * 650, now);
    clickOsc.frequency.exponentialRampToValueAtTime(260, now + 0.036);

    clickGain.gain.setValueAtTime(Math.min(0.85, 0.25 + p * 0.55), now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.045);

    // Layer 3: Leather tip chalk strike transient noise
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = this.getNoiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1850 + p * 1100, now);
    bp.Q.setValueAtTime(2.2, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(Math.min(0.75, 0.2 + p * 0.5), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

    noiseSrc.connect(bp);
    bp.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSrc.start(now);
    noiseSrc.stop(now + 0.032);
  }

  playBallClack(speed = 6) {
    if (!this.enabled) return;
    const perfNow = performance.now();
    if (perfNow - this.lastClackMs < 14) return;
    this.lastClackMs = perfNow;

    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const norm = Math.min(1, Math.max(0.15, speed / 15));
    const vol = Math.min(0.9, 0.22 + norm * 0.68);

    // Layer 1: Primary phenolic resin ring mode (~2450Hz -> 920Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    const pitch1 = 2350 + Math.random() * 380;
    osc1.frequency.setValueAtTime(pitch1, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.042);

    gain1.gain.setValueAtTime(vol, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.048);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.052);

    // Layer 2: Upper enharmonic overtone (~3800Hz -> 1650Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(pitch1 * 1.58, now);
    osc2.frequency.exponentialRampToValueAtTime(1500, now + 0.024);

    gain2.gain.setValueAtTime(vol * 0.55, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.03);

    // Layer 3: Solid core knock (~680Hz -> 195Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(680 + norm * 160, now);
    osc3.frequency.exponentialRampToValueAtTime(185, now + 0.032);

    gain3.gain.setValueAtTime(vol * 0.72, now);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.036);

    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now);
    osc3.stop(now + 0.04);
  }

  playCushionBounce(speed = 5) {
    if (!this.enabled) return;
    const perfNow = performance.now();
    if (perfNow - this.lastCushionMs < 22) return;
    this.lastCushionMs = perfNow;

    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.088);

    const vol = Math.min(0.55, Math.max(0.14, (speed / 13) * 0.48));
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  playPocketDrop() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Stage 1: Deep leather pocket throat thump (t = 0)
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(295, now);
    thudOsc.frequency.exponentialRampToValueAtTime(58, now + 0.19);

    thudGain.gain.setValueAtTime(0.78, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.23);

    // Stage 2: Pocket chute drop rattle & rail knocks (t = +70ms and +145ms)
    const knocks = [
      { delay: 0.07, freqStart: 1080, freqEnd: 290, dur: 0.055, vol: 0.52 },
      { delay: 0.145, freqStart: 820, freqEnd: 215, dur: 0.065, vol: 0.42 },
    ];
    knocks.forEach(k => {
      const kTime = now + k.delay;
      const kOsc = ctx.createOscillator();
      const kGain = ctx.createGain();
      kOsc.type = 'sine';
      kOsc.frequency.setValueAtTime(k.freqStart, kTime);
      kOsc.frequency.exponentialRampToValueAtTime(k.freqEnd, kTime + k.dur);

      kGain.gain.setValueAtTime(k.vol, kTime);
      kGain.gain.exponentialRampToValueAtTime(0.001, kTime + k.dur + 0.01);

      kOsc.connect(kGain);
      kGain.connect(ctx.destination);
      kOsc.start(kTime);
      kOsc.stop(kTime + k.dur + 0.015);
    });

    // Stage 3: Subtle satisfying pocket chime (t = +35ms & +110ms)
    const chimeNotes = [
      { delay: 0.035, freq: 587.33, vol: 0.22, dur: 0.18 },
      { delay: 0.11, freq: 880.0, vol: 0.26, dur: 0.26 },
    ];
    chimeNotes.forEach(c => {
      const cTime = now + c.delay;
      const cOsc = ctx.createOscillator();
      const cGain = ctx.createGain();
      cOsc.type = 'triangle';
      cOsc.frequency.setValueAtTime(c.freq, cTime);

      cGain.gain.setValueAtTime(c.vol, cTime);
      cGain.gain.exponentialRampToValueAtTime(0.001, cTime + c.dur);

      cOsc.connect(cGain);
      cGain.connect(ctx.destination);
      cOsc.start(cTime);
      cOsc.stop(cTime + c.dur + 0.01);
    });
  }

  playWinFanfare() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    });
  }
}

const poolSound = new BilliardSoundManager();

// ═══════════════════════════════════════════════════════════════
//  RACK POSITIONS
// ═══════════════════════════════════════════════════════════════
function createBalls(): Ball[] {
  const balls: Ball[] = [];
  balls.push({ id: 0, x: TABLE_W * 0.26, y: TABLE_H / 2, vx: 0, vy: 0, pocketed: false, angle: 0 });
  const rack = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  const sx = TABLE_W * 0.68, sy = TABLE_H / 2, sp = BALL_R * 2.06;
  let i = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      balls.push({
        id: rack[i++],
        x: sx + row * sp * 0.866,
        y: sy + (col - row / 2) * sp,
        vx: 0, vy: 0, pocketed: false, angle: 0,
      });
    }
  }
  return balls;
}

// ═══════════════════════════════════════════════════════════════
//  PHYSICS ENGINE
// ═══════════════════════════════════════════════════════════════
function spawnParticles(arr: Particle[], x: number, y: number, color: string, n: number) {
  // Cap max active particles to avoid memory churn and GPU draw lag
  if (arr.length > 30) arr.splice(0, arr.length - 20);
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = Math.random() * 3 + 0.6;
    arr.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 0.8, life: 1, color, r: Math.random() * 2.8 + 1 });
  }
}

function physicsStep(
  balls: Ball[],
  pocketedSet: Set<number>,
  particles: Particle[],
  sinkingBalls: SinkingBall[],
  spin: SpinState,
  cueBallJustShot: { current: boolean },
  firstHitBallRef?: { current: number | null }
): boolean {
  let moving = false;
  const SUB_STEPS = 4;
  const SUB_FRICTION = Math.pow(FRICTION, 1 / SUB_STEPS);
  const restitution = 0.80;

  for (let step = 0; step < SUB_STEPS; step++) {
    // 1. Move & damp balls
    for (let bi = 0; bi < balls.length; bi++) {
      const b = balls[bi];
      if (b.pocketed) continue;

      b.x += b.vx / SUB_STEPS;
      b.y += b.vy / SUB_STEPS;
      b.vx *= SUB_FRICTION;
      b.vy *= SUB_FRICTION;

      const spd = Math.hypot(b.vx, b.vy);
      // Soft gentle glide stop curve (prevents abrupt jerky halting)
      if (spd < 0.6) {
        b.vx *= 0.988;
        b.vy *= 0.988;
      }
      if (spd < 0.02) {
        b.vx = 0;
        b.vy = 0;
      } else {
        moving = true;
        b.angle += (spd / BALL_R) / SUB_STEPS;
      }

      // Cushion collisions with elastic response
      let bounced = false;
      if (b.x - BALL_R < PLAY_LEFT) {
        b.x = PLAY_LEFT + BALL_R;
        b.vx = Math.abs(b.vx) * restitution;
        bounced = true;
      } else if (b.x + BALL_R > PLAY_RIGHT) {
        b.x = PLAY_RIGHT - BALL_R;
        b.vx = -Math.abs(b.vx) * restitution;
        bounced = true;
      }
      if (b.y - BALL_R < PLAY_TOP) {
        b.y = PLAY_TOP + BALL_R;
        b.vy = Math.abs(b.vy) * restitution;
        bounced = true;
      } else if (b.y + BALL_R > PLAY_BOTTOM) {
        b.y = PLAY_BOTTOM - BALL_R;
        b.vy = -Math.abs(b.vy) * restitution;
        bounced = true;
      }
      if (bounced && spd > 0.85) {
        poolSound.playCushionBounce(spd);
        spawnParticles(particles, b.x, b.y, '#ffd27d', 3);
      }

      // Pocket sink check
      for (let pi = 0; pi < POCKETS.length; pi++) {
        const p = POCKETS[pi];
        if (Math.hypot(b.x - p.x, b.y - p.y) < POCKET_R) {
          b.pocketed = true;
          b.vx = 0;
          b.vy = 0;
          pocketedSet.add(b.id);
          const entryAngle = Math.atan2(b.y - p.y, b.x - p.x);
          const entryDist  = Math.hypot(b.x - p.x, b.y - p.y);
          sinkingBalls.push({
            id: b.id,
            x: b.x,
            y: b.y,
            px: p.x,
            py: p.y,
            progress: 0,
            color: BALL_COLORS[b.id] ?? '#aaa',
            rollAngle: b.angle,
            orbitR: Math.min(entryDist, POCKET_R * 0.85),
            orbitAngle: entryAngle,
          });
          spawnParticles(particles, b.x, b.y, BALL_COLORS[b.id] ?? '#fff', 12);
          poolSound.playPocketDrop();
          break;
        }
      }
    }

    // 2. Continuous ball-to-ball collisions (direct loop without array allocation)
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      if (a.pocketed) continue;
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        if (b.pocketed) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist < BALL_R * 2 && dist > 0) {
          const nx = dx / dist, ny = dy / dist;
          const overlap = (BALL_R * 2 - dist) * 0.5;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
          const dot = dvx * nx + dvy * ny;
          if (dot > 0) {
            const e = 0.96;
            const imp = dot * (1 + e) * 0.5;
            const wasA = (a.id === 0 && cueBallJustShot.current);
            const wasB = (b.id === 0 && cueBallJustShot.current);

            a.vx -= imp * nx;
            a.vy -= imp * ny;
            b.vx += imp * nx;
            b.vy += imp * ny;

            if (wasA || wasB) {
              cueBallJustShot.current = false;
              if (firstHitBallRef && firstHitBallRef.current === null) {
                firstHitBallRef.current = wasA ? b.id : a.id;
              }
              const spinEffect = -spin.y;
              const cue = wasA ? a : b;
              cue.vx += nx * spinEffect * imp * 0.55;
              cue.vy += ny * spinEffect * imp * 0.55;
              cue.vx += -ny * spin.x * imp * 0.3;
              cue.vy +=  nx * spin.x * imp * 0.3;
            }

            const hitSpeed = Math.hypot(dvx, dvy);
            if (hitSpeed > 0.35) {
              poolSound.playBallClack(hitSpeed);
              spawnParticles(particles, (a.x + b.x) / 2, (a.y + b.y) / 2, '#ffffff', 4);
            }
          }
        }
      }
    }
  }

  // Update particles (once per frame)
  for (let k = particles.length - 1; k >= 0; k--) {
    const p = particles[k];
    p.x += p.vx; p.y += p.vy; p.vy += 0.04;
    p.life -= 0.032;
    if (p.life <= 0) particles.splice(k, 1);
  }

  // Update sinking balls (smooth vortex drainage)
  for (let k = sinkingBalls.length - 1; k >= 0; k--) {
    const s = sinkingBalls[k];
    const accel = 0.026 + s.progress * 0.035;
    s.progress += accel;
    const orbitSpeed = 0.08 + s.progress * 0.22;
    s.orbitAngle  += orbitSpeed;
    s.orbitR      *= (1 - 0.05 - s.progress * 0.04);
    s.rollAngle   += 0.18 + s.progress * 0.35;
    s.x = s.px + Math.cos(s.orbitAngle) * s.orbitR;
    s.y = s.py + Math.sin(s.orbitAngle) * s.orbitR;
    if (s.progress >= 1 || s.orbitR < 0.5) sinkingBalls.splice(k, 1);
  }

  return moving;
}

// ═══════════════════════════════════════════════════════════════
//  RAYCAST COLLISION & TRAJECTORY PREDICTION
// ═══════════════════════════════════════════════════════════════
function calculateAimTrajectory(
  cueBall: Ball,
  dirX: number,
  dirY: number,
  activeBalls: Ball[]
): AimTrajectory {
  const nx = dirX, ny = dirY;
  let closestDist = 99999;
  let hitBall: Ball | null = null;

  for (const b of activeBalls) {
    if (b.id === 0 || b.pocketed) continue;
    const vx = b.x - cueBall.x;
    const vy = b.y - cueBall.y;
    const proj = vx * nx + vy * ny;
    if (proj <= 0) continue;

    const perpSq = (vx * vx + vy * vy) - (proj * proj);
    const radSum = BALL_R * 2;
    if (perpSq < radSum * radSum) {
      const d = proj - Math.sqrt(radSum * radSum - perpSq);
      if (d > 0 && d < closestDist) {
        closestDist = d;
        hitBall = b;
      }
    }
  }

  let ghostX = cueBall.x + nx * closestDist;
  let ghostY = cueBall.y + ny * closestDist;
  let hitPointX = ghostX;
  let hitPointY = ghostY;

  let targetDirX = 0, targetDirY = 0;
  let deflectDirX = 0, deflectDirY = 0;
  let targetPocket: { x: number; y: number } | null = null;

  if (hitBall) {
    // Normal from ghost cue ball center to hit ball center
    const tdx = hitBall.x - ghostX;
    const tdy = hitBall.y - ghostY;
    const tlen = Math.hypot(tdx, tdy) || 1;
    targetDirX = tdx / tlen;
    targetDirY = tdy / tlen;

    // Cue deflection direction is tangent perpendicular to normal
    const perpDot = nx * targetDirY - ny * targetDirX;
    const sign = perpDot > 0 ? 1 : -1;
    deflectDirX = -targetDirY * sign;
    deflectDirY =  targetDirX * sign;

    // Check if target ball trajectory points toward a pocket
    for (const p of POCKETS) {
      const pdirX = p.x - hitBall.x;
      const pdirY = p.y - hitBall.y;
      const plen = Math.hypot(pdirX, pdirY);
      if (plen > 5) {
        const dot = targetDirX * (pdirX / plen) + targetDirY * (pdirY / plen);
        if (dot > 0.96) {
          targetPocket = p;
          break;
        }
      }
    }
  } else {
    // Clamp to cushion bounds
    let tMin = 600;
    if (nx > 0) tMin = Math.min(tMin, (PLAY_RIGHT - BALL_R - cueBall.x) / nx);
    if (nx < 0) tMin = Math.min(tMin, (PLAY_LEFT + BALL_R - cueBall.x) / nx);
    if (ny > 0) tMin = Math.min(tMin, (PLAY_BOTTOM - BALL_R - cueBall.y) / ny);
    if (ny < 0) tMin = Math.min(tMin, (PLAY_TOP + BALL_R - cueBall.y) / ny);

    closestDist = Math.max(0, tMin);
    ghostX = cueBall.x + nx * closestDist;
    ghostY = cueBall.y + ny * closestDist;
    hitPointX = ghostX;
    hitPointY = ghostY;
  }

  return {
    ghostX,
    ghostY,
    hitPointX,
    hitPointY,
    targetBall: hitBall,
    targetDirX,
    targetDirY,
    deflectDirX,
    deflectDirY,
    targetPocket,
  };
}

// ═══════════════════════════════════════════════════════════════
//  COLOR HELPERS
// ═══════════════════════════════════════════════════════════════
function darken(hex: string, amt = 50): string {
  const n = parseInt(hex.replace('#',''), 16);
  return `rgb(${Math.max(0,(n>>16)-amt)},${Math.max(0,((n>>8)&0xFF)-amt)},${Math.max(0,(n&0xFF)-amt)})`;
}
function lighten(hex: string, amt = 60): string {
  const n = parseInt(hex.replace('#',''), 16);
  return `rgb(${Math.min(255,(n>>16)+amt)},${Math.min(255,((n>>8)&0xFF)+amt)},${Math.min(255,(n&0xFF)+amt)})`;
}

// ═══════════════════════════════════════════════════════════════
//  HARDWARE-ACCELERATED PRE-RENDERED TABLE CACHE
// ═══════════════════════════════════════════════════════════════
let cachedTableBg: HTMLCanvasElement | null = null;
let cachedFeltColor: string | null = null;

function getCachedTableBackground(tableFeltColor = '#2472a4'): HTMLCanvasElement {
  if (cachedTableBg && cachedFeltColor === tableFeltColor) {
    return cachedTableBg;
  }
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width  = TABLE_W;
  bgCanvas.height = TABLE_H;
  const ctx = bgCanvas.getContext('2d')!;
  const W = TABLE_W, H = TABLE_H;

  // 1. Lightweight table shadow (zero shadowBlur GPU overhead)
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(4, 4, W - 8, H - 8);
  ctx.restore();

  // 2. Rich Burgundy / Crimson Mahogany Wood Frame & Rails
  const woodGrad = ctx.createLinearGradient(0, 0, W, H);
  woodGrad.addColorStop(0,    '#3d0c12');
  woodGrad.addColorStop(0.25, '#661620');
  woodGrad.addColorStop(0.5,  '#85202d');
  woodGrad.addColorStop(0.75, '#58131b');
  woodGrad.addColorStop(1,    '#28070b');
  ctx.fillStyle = woodGrad;
  ctx.fillRect(0, 0, W, H);

  // Lacquered wood grain effect
  ctx.save();
  ctx.globalAlpha = 0.055;
  for (let i = 0; i < 45; i++) {
    const x = (i / 45) * W;
    ctx.strokeStyle = i % 2 === 0 ? '#ffffff' : '#000000';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 50, H);
    ctx.stroke();
  }
  ctx.restore();

  // Outer silver/white bevel line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  // Inner dark wood rail bevel
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.lineWidth = 3;
  ctx.strokeRect(RAIL_W - 2, RAIL_W - 2, W - RAIL_W * 2 + 4, H - RAIL_W * 2 + 4);

  // 3. Simonis Tournament Cloth Baize
  const baseFelt = tableFeltColor || '#2472a4';
  const feltGrad = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.62);
  feltGrad.addColorStop(0,    lighten(baseFelt, 28));
  feltGrad.addColorStop(0.45, baseFelt);
  feltGrad.addColorStop(0.85, darken(baseFelt, 30));
  feltGrad.addColorStop(1,    darken(baseFelt, 55));
  ctx.fillStyle = feltGrad;
  ctx.fillRect(RAIL_W, RAIL_W, W - RAIL_W * 2, H - RAIL_W * 2);

  // Dual Overhead Spotlight Pools
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const spot1 = ctx.createRadialGradient(W * 0.33, H * 0.5, 10, W * 0.33, H * 0.5, 240);
  spot1.addColorStop(0,   'rgba(255, 245, 210, 0.16)');
  spot1.addColorStop(0.6, 'rgba(80, 220, 140, 0.07)');
  spot1.addColorStop(1,   'rgba(0, 0, 0, 0)');
  ctx.fillStyle = spot1;
  ctx.fillRect(RAIL_W, RAIL_W, W - RAIL_W * 2, H - RAIL_W * 2);

  const spot2 = ctx.createRadialGradient(W * 0.67, H * 0.5, 10, W * 0.67, H * 0.5, 240);
  spot2.addColorStop(0,   'rgba(255, 245, 210, 0.16)');
  spot2.addColorStop(0.6, 'rgba(80, 220, 140, 0.07)');
  spot2.addColorStop(1,   'rgba(0, 0, 0, 0)');
  ctx.fillStyle = spot2;
  ctx.fillRect(RAIL_W, RAIL_W, W - RAIL_W * 2, H - RAIL_W * 2);
  ctx.restore();

  // Cushion drop-shadows on felt
  ctx.save();
  const shTop = ctx.createLinearGradient(0, RAIL_W, 0, RAIL_W + 16);
  shTop.addColorStop(0, 'rgba(0,0,0,0.55)');
  shTop.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shTop;
  ctx.fillRect(RAIL_W, RAIL_W, W - RAIL_W * 2, 16);

  const shBot = ctx.createLinearGradient(0, H - RAIL_W, 0, H - RAIL_W - 16);
  shBot.addColorStop(0, 'rgba(0,0,0,0.55)');
  shBot.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shBot;
  ctx.fillRect(RAIL_W, H - RAIL_W - 16, W - RAIL_W * 2, 16);

  const shLeft = ctx.createLinearGradient(RAIL_W, 0, RAIL_W + 16, 0);
  shLeft.addColorStop(0, 'rgba(0,0,0,0.55)');
  shLeft.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shLeft;
  ctx.fillRect(RAIL_W, RAIL_W, 16, H - RAIL_W * 2);

  const shRight = ctx.createLinearGradient(W - RAIL_W, 0, W - RAIL_W - 16, 0);
  shRight.addColorStop(0, 'rgba(0,0,0,0.55)');
  shRight.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shRight;
  ctx.fillRect(W - RAIL_W - 16, RAIL_W, 16, H - RAIL_W * 2);
  ctx.restore();

  // Rubber Cushion Strips
  ctx.fillStyle = '#4c0f16';
  ctx.fillRect(RAIL_W, RAIL_W - 6, W - RAIL_W * 2, 7);
  ctx.fillRect(RAIL_W, H - RAIL_W - 1, W - RAIL_W * 2, 7);
  ctx.fillRect(RAIL_W - 6, RAIL_W, 7, H - RAIL_W * 2);
  ctx.fillRect(W - RAIL_W - 1, RAIL_W, 7, H - RAIL_W * 2);

  // Mother-of-Pearl Diamond Sights
  const dPos = [0.25, 0.5, 0.75];
  for (const t of dPos) {
    const mx = RAIL_W + t * (W - RAIL_W * 2);
    const my = RAIL_W + t * (H - RAIL_W * 2);

    const drawDiamond = (cx: number, cy: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 3.8, 0, Math.PI * 2);
      const pearl = ctx.createRadialGradient(cx - 1, cy - 1, 0.5, cx, cy, 4);
      pearl.addColorStop(0,    '#ffffff');
      pearl.addColorStop(0.4,  '#e2e8f0');
      pearl.addColorStop(0.85, '#cbd5e1');
      pearl.addColorStop(1,    '#94a3b8');
      ctx.fillStyle = pearl;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    };

    drawDiamond(mx, RAIL_W - 15);
    drawDiamond(mx, H - RAIL_W + 15);
    drawDiamond(RAIL_W - 15, my);
    drawDiamond(W - RAIL_W + 15, my);
  }

  // Baulk line, D-semicircle, and spots
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(TABLE_W * 0.26, RAIL_W + 14);
  ctx.lineTo(TABLE_W * 0.26, H - RAIL_W - 14);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(TABLE_W * 0.26, H / 2, 38, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // Head spot & Foot spot
  [{ x: W / 2, y: H / 2 }, { x: TABLE_W * 0.68, y: H / 2 }].forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
  });
  ctx.restore();

  // 4. Polished Chrome Metallic Corner & Side Pocket Plates
  for (const p of POCKETS) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, POCKET_R + 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fill();

    const plateGrad = ctx.createRadialGradient(p.x - 3, p.y - 3, 2, p.x, p.y, POCKET_R + 9);
    plateGrad.addColorStop(0,    '#ffffff');
    plateGrad.addColorStop(0.35, '#cbd5e1');
    plateGrad.addColorStop(0.7,  '#64748b');
    plateGrad.addColorStop(1,    '#334155');
    ctx.beginPath();
    ctx.arc(p.x, p.y, POCKET_R + 8, 0, Math.PI * 2);
    ctx.fillStyle = plateGrad;
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const voidGrad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, POCKET_R);
    voidGrad.addColorStop(0,    '#000000');
    voidGrad.addColorStop(0.85, '#05070a');
    voidGrad.addColorStop(1,    '#0f172a');
    ctx.beginPath();
    ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2);
    ctx.fillStyle = voidGrad;
    ctx.fill();

    const rivetAngles = [0.2, 0.5, 0.8].map(a => a * Math.PI * 2);
    rivetAngles.forEach(ang => {
      const rx = p.x + Math.cos(ang) * (POCKET_R + 5);
      const ry = p.y + Math.sin(ang) * (POCKET_R + 5);
      ctx.beginPath();
      ctx.arc(rx, ry, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    ctx.restore();
  }

  cachedTableBg = bgCanvas;
  cachedFeltColor = tableFeltColor;
  return bgCanvas;
}

// ═══════════════════════════════════════════════════════════════
//  HARDWARE-ACCELERATED BALL SPRITE CACHE (ZERO FPS DROP)
// ═══════════════════════════════════════════════════════════════
const BALL_SPRITE_SIZE = Math.ceil((BALL_R + 3) * 2);
const ballSpriteCache: Record<number, HTMLCanvasElement> = {};
let ballShadowSprite: HTMLCanvasElement | null = null;

function getBallShadowSprite(): HTMLCanvasElement {
  if (ballShadowSprite) return ballShadowSprite;
  const c = document.createElement('canvas');
  const w = Math.ceil(BALL_R * 2.3);
  const h = Math.ceil(BALL_R * 1.5);
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const cx = w / 2, cy = h / 2;
  ctx.save();
  ctx.scale(1, 0.60);
  const shGrad = ctx.createRadialGradient(cx, cy / 0.6, BALL_R * 0.15, cx, cy / 0.6, BALL_R * 1.05);
  shGrad.addColorStop(0,    'rgba(0, 0, 0, 0.45)');
  shGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.16)');
  shGrad.addColorStop(1,    'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shGrad;
  ctx.beginPath();
  ctx.arc(cx, cy / 0.6, BALL_R * 1.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ballShadowSprite = c;
  return c;
}

function getBallSprite(id: number): HTMLCanvasElement {
  if (ballSpriteCache[id]) return ballSpriteCache[id];
  const c = document.createElement('canvas');
  const size = BALL_SPRITE_SIZE;
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size / 2, cy = size / 2;
  const col = BALL_COLORS[id] ?? '#aaa';
  const isStr = STRIPE_SET.has(id);

  ctx.translate(cx, cy);

  // Ball Base Sphere
  const bg = ctx.createRadialGradient(-BALL_R * 0.35, -BALL_R * 0.4, BALL_R * 0.1, 0, 0, BALL_R);
  bg.addColorStop(0,    lighten(col, 85));
  bg.addColorStop(0.35, col);
  bg.addColorStop(1,    darken(col, 75));
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(0, 0, BALL_R, 0, Math.PI * 2);
  ctx.fill();

  // Stripe pattern
  if (isStr) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, BALL_R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(-BALL_R, -BALL_R, BALL_R * 2, BALL_R * 2);
    ctx.fillStyle = col;
    ctx.fillRect(-BALL_R, -BALL_R * 0.44, BALL_R * 2, BALL_R * 0.88);

    const sg2 = ctx.createRadialGradient(-BALL_R * 0.35, -BALL_R * 0.4, BALL_R * 0.1, 0, 0, BALL_R);
    sg2.addColorStop(0,   'rgba(255,255,255,0)');
    sg2.addColorStop(0.7, 'rgba(0,0,0,0.1)');
    sg2.addColorStop(1,   'rgba(0,0,0,0.4)');
    ctx.fillStyle = sg2;
    ctx.beginPath();
    ctx.arc(0, 0, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Upright Number Patch
  if (id > 0) {
    const nr = id < 10 ? 5.8 : 5.2;
    ctx.beginPath();
    ctx.arc(0, 0, nr, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    ctx.fillStyle = id === 8 ? '#111827' : darken(col, 40);
    ctx.font = `900 ${id < 10 ? '8.5' : '7'}px Outfit, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(id), 0, 0.4);
  }

  // Specular Gloss Highlights
  const gs = ctx.createRadialGradient(-BALL_R * 0.4, -BALL_R * 0.45, 0.5, -BALL_R * 0.25, -BALL_R * 0.3, BALL_R * 0.65);
  gs.addColorStop(0,   'rgba(255,255,255,0.75)');
  gs.addColorStop(0.4, 'rgba(255,255,255,0.18)');
  gs.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(0, 0, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = gs;
  ctx.fill();

  // Edge definition
  ctx.beginPath();
  ctx.arc(0, 0, BALL_R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ballSpriteCache[id] = c;
  return c;
}

// ═══════════════════════════════════════════════════════════════
//  CANVAS RENDERER (ULTRA-REALISTIC 3D TOURNAMENT TABLE)
// ═══════════════════════════════════════════════════════════════
function drawScene(
  ctx: CanvasRenderingContext2D,
  balls: Ball[],
  aimTarget: { x: number; y: number } | null,
  power: number,
  isAimMode: boolean,
  particles: Particle[],
  sinkingBalls: SinkingBall[],
  tableFeltColor?: string,
  cueSkin: 'maple' | 'carbon' | 'dragon' | 'sultan' = 'maple',
  strikeProgress = 0,
  isBallInHand = false
) {
  // 1. Draw pre-rendered hardware-cached tournament table in 1 single GPU drawImage
  ctx.drawImage(getCachedTableBackground(tableFeltColor), 0, 0);

  const cueBall = balls.find(b => b.id === 0 && !b.pocketed);

  // Ball in Hand placement halo around cue ball
  if (isBallInHand && cueBall) {
    ctx.save();
    const pulse = Math.sin(Date.now() / 150) * 3;
    ctx.beginPath();
    ctx.arc(cueBall.x, cueBall.y, BALL_R + 8 + pulse, 0, Math.PI * 2);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cueBall.x, cueBall.y, BALL_R + 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const arrowDist = BALL_R + 18 + pulse;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    ctx.fillStyle = '#38bdf8';
    for (const [adx, ady] of dirs) {
      ctx.beginPath();
      ctx.arc(cueBall.x + adx * arrowDist, cueBall.y + ady * arrowDist, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 5. Aim System (Solid White Laser Guide & Ghost Ball matching 8-Ball Pool)
  if (!isBallInHand && isAimMode && cueBall && aimTarget) {
    const dx = aimTarget.x - cueBall.x;
    const dy = aimTarget.y - cueBall.y;
    const len = Math.hypot(dx, dy);

    if (len > 5) {
      const nx = dx / len, ny = dy / len;
      const trajectory = calculateAimTrajectory(cueBall, nx, ny, balls);

      // Laser trajectory line (only when not in strike animation thrust)
      if (strikeProgress <= 0.05) {
        ctx.save();
        // Highlight target pocket if aligned (hardware accelerated clean dual stroke)
        if (trajectory.targetPocket) {
          ctx.beginPath();
          ctx.arc(trajectory.targetPocket.x, trajectory.targetPocket.y, POCKET_R + 10, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
          ctx.lineWidth = 6;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(trajectory.targetPocket.x, trajectory.targetPocket.y, POCKET_R + 10, 0, Math.PI * 2);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2.4;
          ctx.stroke();
        }

        // Solid White Laser Guide line from cue ball to ghost cue ball
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.4;
        ctx.moveTo(cueBall.x + nx * (BALL_R + 2), cueBall.y + ny * (BALL_R + 2));
        ctx.lineTo(trajectory.ghostX, trajectory.ghostY);
        ctx.stroke();

        // Ghost Cue Ball (Open white ring with inner crosshair circle)
        ctx.beginPath();
        ctx.arc(trajectory.ghostX, trajectory.ghostY, BALL_R, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.4;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        ctx.stroke();

        // Concentric inner ring / crosshair
        ctx.beginPath();
        ctx.arc(trajectory.ghostX, trajectory.ghostY, 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.stroke();

        // Target ball trajectory line (solid white)
        if (trajectory.targetBall) {
          const tb = trajectory.targetBall;
          const arrowLen = 95;
          const tx = tb.x + trajectory.targetDirX * arrowLen;
          const ty = tb.y + trajectory.targetDirY * arrowLen;

          ctx.beginPath();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.4;
          ctx.moveTo(tb.x, tb.y);
          ctx.lineTo(tx, ty);
          ctx.stroke();

          // Tangent deflection line (solid white)
          const defLen = 55;
          ctx.beginPath();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.0;
          ctx.moveTo(trajectory.ghostX, trajectory.ghostY);
          ctx.lineTo(trajectory.ghostX + trajectory.deflectDirX * defLen, trajectory.ghostY + trajectory.deflectDirY * defLen);
          ctx.stroke();
        }

        ctx.restore();
      }

      // ── ARTISAN POOL CUE STICK (SNAPPY STRIKE FORWARD THRUST) ──
      const pullBack = power * 75 * (1 - strikeProgress);
      const cueLen   = 290;
      const tipOffset = BALL_R + 5 + pullBack;

      const tipX = cueBall.x - nx * tipOffset;
      const tipY = cueBall.y - ny * tipOffset;
      const buttX = tipX - nx * cueLen;
      const buttY = tipY - ny * cueLen;

      const perpX = -ny, perpY = nx;
      const TIP_W  = 2.8;
      const BUTT_W = 8.5;

      ctx.save();

      // Cue cast shadow on felt (0 software blur penalty, 100% GPU accelerated)
      ctx.beginPath();
      ctx.moveTo(tipX + 6  + perpX * (TIP_W + 1),  tipY + 8  + perpY * (TIP_W + 1));
      ctx.lineTo(buttX + 6 + perpX * (BUTT_W + 1), buttY + 8 + perpY * (BUTT_W + 1));
      ctx.lineTo(buttX + 6 - perpX * (BUTT_W + 1), buttY + 8 - perpY * (BUTT_W + 1));
      ctx.lineTo(tipX + 6  - perpX * (TIP_W + 1),  tipY + 8  - perpY * (TIP_W + 1));
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.fill();

      // Cue shaft gradient customized by selected cue stick
      const cueGrad = ctx.createLinearGradient(tipX, tipY, buttX, buttY);
      if (cueSkin === 'carbon') {
        cueGrad.addColorStop(0,    '#e0f2fe');
        cueGrad.addColorStop(0.15, '#38bdf8');
        cueGrad.addColorStop(0.55, '#0284c7');
        cueGrad.addColorStop(0.75, '#0f172a');
        cueGrad.addColorStop(1,    '#020617');
      } else if (cueSkin === 'dragon') {
        cueGrad.addColorStop(0,    '#fee2e2');
        cueGrad.addColorStop(0.18, '#ef4444');
        cueGrad.addColorStop(0.55, '#b91c1c');
        cueGrad.addColorStop(0.75, '#7f1d1d');
        cueGrad.addColorStop(1,    '#450a0a');
      } else if (cueSkin === 'sultan') {
        cueGrad.addColorStop(0,    '#fef9c3');
        cueGrad.addColorStop(0.2,  '#facc15');
        cueGrad.addColorStop(0.55, '#ca8a04');
        cueGrad.addColorStop(0.75, '#854d0e');
        cueGrad.addColorStop(1,    '#451a03');
      } else {
        // Maple
        cueGrad.addColorStop(0,    '#fef3c7'); // maple tip
        cueGrad.addColorStop(0.12, '#fde68a');
        cueGrad.addColorStop(0.45, '#d97706'); // honey maple
        cueGrad.addColorStop(0.65, '#92400e');
        cueGrad.addColorStop(0.75, '#1e293b'); // black Irish linen wrap
        cueGrad.addColorStop(0.90, '#0f172a');
        cueGrad.addColorStop(1,    '#451a03'); // rosewood butt sleeve
      }

      ctx.beginPath();
      ctx.moveTo(tipX  + perpX * TIP_W,  tipY  + perpY * TIP_W);
      ctx.lineTo(buttX + perpX * BUTT_W, buttY + perpY * BUTT_W);
      ctx.lineTo(buttX - perpX * BUTT_W, buttY - perpY * BUTT_W);
      ctx.lineTo(tipX  - perpX * TIP_W,  tipY  - perpY * TIP_W);
      ctx.closePath();
      ctx.fillStyle = cueGrad;
      ctx.fill();

      // Shaft gloss shine
      const shineGrad = ctx.createLinearGradient(
        tipX  + perpX * TIP_W,  tipY  + perpY * TIP_W,
        tipX  - perpX * TIP_W,  tipY  - perpY * TIP_W
      );
      shineGrad.addColorStop(0,   'rgba(255,255,255,0)');
      shineGrad.addColorStop(0.4, 'rgba(255,255,255,0.4)');
      shineGrad.addColorStop(0.7, 'rgba(255,255,255,0.08)');
      shineGrad.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = shineGrad;
      ctx.fill();

      // Wrap rings
      const wrapStart = 0.68;
      for (let r = 0; r < 7; r++) {
        const t = wrapStart + r * 0.032;
        const wx = tipX + (buttX - tipX) * t;
        const wy = tipY + (buttY - tipY) * t;
        const hw = TIP_W + (BUTT_W - TIP_W) * t;
        ctx.beginPath();
        ctx.moveTo(wx + perpX * hw, wy + perpY * hw);
        ctx.lineTo(wx - perpX * hw, wy - perpY * hw);
        if (cueSkin === 'carbon') {
          ctx.strokeStyle = r % 2 === 0 ? '#38bdf8' : 'rgba(15,23,42,0.8)';
        } else if (cueSkin === 'dragon') {
          ctx.strokeStyle = r % 2 === 0 ? '#facc15' : 'rgba(185,28,28,0.8)';
        } else if (cueSkin === 'sultan') {
          ctx.strokeStyle = r % 2 === 0 ? '#ffffff' : '#ca8a04';
        } else {
          ctx.strokeStyle = r % 2 === 0 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.3)';
        }
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // White phenolic ferrule
      const ferruleT = 0.055;
      const ferruleX = tipX + (buttX - tipX) * ferruleT;
      const ferruleY = tipY + (buttY - tipY) * ferruleT;
      const ferruleHW = TIP_W + (BUTT_W - TIP_W) * ferruleT;
      ctx.beginPath();
      ctx.moveTo(ferruleX + perpX * ferruleHW, ferruleY + perpY * ferruleHW);
      ctx.lineTo(ferruleX - perpX * ferruleHW, ferruleY - perpY * ferruleHW);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Master chalk blue cue tip
      ctx.beginPath();
      ctx.arc(tipX, tipY, TIP_W + 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#0284c7';
      ctx.fill();
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();

      // Power Arc around cue ball (clean fast vector)
      if (power > 0.04 && strikeProgress <= 0.05) {
        const startAngle = Math.atan2(ny, nx) - Math.PI / 2.2;
        const endAngle   = startAngle + (Math.PI / 1.1) * power;
        const pColor     = power < 0.38 ? '#4ade80' : power < 0.72 ? '#facc15' : '#ef4444';
        ctx.beginPath();
        ctx.arc(cueBall.x, cueBall.y, BALL_R + 8, startAngle, endAngle);
        ctx.strokeStyle = pColor;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
  }

  // 6. Particles (Chalk bursts & sparks)
  for (let pi = 0; pi < particles.length; pi++) {
    const p = particles[pi];
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color + Math.round(p.life * 230).toString(16).padStart(2, '0');
    ctx.fill();
  }

  // 7. 3D Phenolic Resin Billiard Balls (Using ultra-fast GPU sprites)
  const shadowSprite = getBallShadowSprite();
  const halfShadowW = shadowSprite.width / 2;
  const halfShadowH = shadowSprite.height / 2;
  const halfSprite = BALL_SPRITE_SIZE / 2;

  for (let bi = 0; bi < balls.length; bi++) {
    const ball = balls[bi];
    if (ball.pocketed) continue;

    // Contact drop-shadow: 1 simple drawImage
    ctx.drawImage(shadowSprite, ball.x - halfShadowW + 2, ball.y - halfShadowH + 3.5);

    // Ball Base Sphere (Rotates with rolling angle)
    ctx.save();
    ctx.translate(ball.x, ball.y);
    const isRolling = Math.hypot(ball.vx, ball.vy) > 0.25;
    if (isRolling) {
      ctx.rotate(ball.angle);
    }
    ctx.drawImage(getBallSprite(ball.id), -halfSprite, -halfSprite);

    // Dynamic rolling spin line
    if (isRolling) {
      ctx.beginPath();
      ctx.arc(0, 0, BALL_R * 0.88, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-BALL_R * 0.88, 0);
      ctx.lineTo(BALL_R * 0.88, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 8. Sinking Balls (Spiral Vortex Drainage Animation)
  for (const s of sinkingBalls) {
    const ease = Math.min(1, s.progress);
    const r = BALL_R * (1 - ease * 0.92);
    const alpha = 1 - ease * 0.95;
    if (r < 0.5 || alpha < 0.02) continue;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rollAngle);

    const bg = ctx.createRadialGradient(-r * 0.36, -r * 0.4, r * 0.05, 0, 0, r);
    bg.addColorStop(0,    lighten(s.color, 80));
    bg.addColorStop(0.35, s.color);
    bg.addColorStop(1,    darken(s.color, 70));
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.fill();

    if (STRIPE_SET.has(s.id)) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.fillStyle = s.color;
      ctx.fillRect(-r, -r * 0.42, r * 2, r * 0.84);
      ctx.restore();
    }

    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════
//  SMART PRO AI DECISION ENGINE
// ═══════════════════════════════════════════════════════════════
function computeSmartAIShot(
  balls: Ball[],
  playerGroup: 'solid' | 'stripe' | null,
  isBallInHand = false
): { tx: number; ty: number; power: number; placeCue?: { x: number; y: number } } {
  const cue = balls.find(b => b.id === 0 && !b.pocketed);
  const aiGroup: 'solid' | 'stripe' | null =
    playerGroup === 'solid' ? 'stripe' : playerGroup === 'stripe' ? 'solid' : null;

  // 1. Identify legal target balls
  const myGroupBalls = balls.filter(b => {
    if (b.pocketed || b.id === 0 || b.id === 8) return false;
    if (aiGroup === 'solid')  return !STRIPE_SET.has(b.id);
    if (aiGroup === 'stripe') return  STRIPE_SET.has(b.id);
    return true; // open table
  });

  const targets = myGroupBalls.length > 0
    ? myGroupBalls
    : balls.filter(b => b.id === 8 && !b.pocketed);

  if (targets.length === 0) {
    return { tx: TABLE_W / 2, ty: TABLE_H / 2, power: 0.5 };
  }

  // 2. Helper to test if a ray between two points is blocked by any obstacle ball
  const isLineBlocked = (x1: number, y1: number, x2: number, y2: number, ignoreIds: number[]): boolean => {
    const rx = x2 - x1, ry = y2 - y1;
    const rLen = Math.hypot(rx, ry);
    if (rLen < 2) return false;
    const rnx = rx / rLen, rny = ry / rLen;

    for (const b of balls) {
      if (b.pocketed || ignoreIds.includes(b.id)) continue;
      const vx = b.x - x1, vy = b.y - y1;
      const proj = vx * rnx + vy * rny;
      if (proj <= 0 || proj >= rLen) continue;
      const perpSq = (vx * vx + vy * vy) - (proj * proj);
      if (perpSq < (BALL_R * 1.85) * (BALL_R * 1.85)) {
        return true;
      }
    }
    return false;
  };

  let bestShot: {
    target: Ball;
    pocket: { x: number; y: number };
    ghostX: number;
    ghostY: number;
    score: number;
    power: number;
    placeCue?: { x: number; y: number };
  } | null = null;

  // 3. If AI has Ball in Hand: pick best target and place cue ball in line!
  if (isBallInHand || !cue) {
    for (const t of targets) {
      for (const p of POCKETS) {
        const pdx = p.x - t.x, pdy = p.y - t.y;
        const pDist = Math.hypot(pdx, pdy);
        if (pDist < 2) continue;
        const pnx = pdx / pDist, pny = pdy / pDist;

        if (isLineBlocked(t.x, t.y, p.x, p.y, [t.id, 0])) continue;

        const ghostX = t.x - pnx * (BALL_R * 2.05);
        const ghostY = t.y - pny * (BALL_R * 2.05);

        const placeDist = Math.min(130, Math.max(80, pDist * 0.4));
        const placeX = ghostX - pnx * placeDist;
        const placeY = ghostY - pny * placeDist;

        if (placeX < PLAY_LEFT + BALL_R + 5 || placeX > PLAY_RIGHT - BALL_R - 5 ||
            placeY < PLAY_TOP + BALL_R + 5 || placeY > PLAY_BOTTOM - BALL_R - 5) {
          continue;
        }

        if (balls.some(b => !b.pocketed && b.id !== 0 && Math.hypot(placeX - b.x, placeY - b.y) < BALL_R * 2.2)) {
          continue;
        }

        const score = 500 - pDist * 0.5;
        if (!bestShot || score > bestShot.score) {
          bestShot = {
            target: t,
            pocket: p,
            ghostX,
            ghostY,
            score,
            power: Math.min(0.75, Math.max(0.4, pDist / 800 + 0.3)),
            placeCue: { x: placeX, y: placeY }
          };
        }
      }
    }
  }

  // 4. Normal Shot Search (with existing cue ball position)
  if (!bestShot) {
    const cuePos = cue || { x: TABLE_W * 0.26, y: TABLE_H / 2 };

    for (const t of targets) {
      for (const p of POCKETS) {
        const pdx = p.x - t.x, pdy = p.y - t.y;
        const pDist = Math.hypot(pdx, pdy);
        if (pDist < 2) continue;
        const pnx = pdx / pDist, pny = pdy / pDist;

        if (isLineBlocked(t.x, t.y, p.x, p.y, [t.id, 0])) continue;

        const ghostX = t.x - pnx * (BALL_R * 2.0);
        const ghostY = t.y - pny * (BALL_R * 2.0);

        if (ghostX < PLAY_LEFT + BALL_R || ghostX > PLAY_RIGHT - BALL_R ||
            ghostY < PLAY_TOP + BALL_R || ghostY > PLAY_BOTTOM - BALL_R) continue;

        const cdx = ghostX - cuePos.x, cdy = ghostY - cuePos.y;
        const cDist = Math.hypot(cdx, cdy);
        if (cDist < 1) continue;
        const cnx = cdx / cDist, cny = cdy / cDist;

        const cutDot = cnx * pnx + cny * pny;
        if (cutDot <= 0.08) continue; // Allow sharp pro cut angles

        if (isLineBlocked(cuePos.x, cuePos.y, ghostX, ghostY, [0, t.id])) continue;

        const isCenterPocket = (p.x > TABLE_W * 0.4 && p.x < TABLE_W * 0.6);
        if (isCenterPocket && cutDot < 0.40) continue;

        let score = (cutDot * 180) - (pDist * 0.06) - (cDist * 0.04);
        if (pDist < 180) score += 40;

        if (!bestShot || score > bestShot.score) {
          const power = Math.min(0.85, Math.max(0.35, (cDist + pDist) * 0.00065 + 0.32));
          bestShot = {
            target: t,
            pocket: p,
            ghostX,
            ghostY,
            score,
            power,
          };
        }
      }
    }
  }

  // 5. If high quality pot found: return ghost with pro accuracy
  if (bestShot) {
    const jitter = (Math.random() - 0.5) * 0.12; // Pro level tournament precision
    return {
      tx: bestShot.ghostX + jitter,
      ty: bestShot.ghostY + jitter,
      power: bestShot.power,
      placeCue: bestShot.placeCue,
    };
  }

  // 6. Intelligent Fallback: Hit clearest legal target ball towards closest pocket
  const cuePos = cue || { x: TABLE_W * 0.26, y: TABLE_H / 2 };
  let fallbackTarget = targets[0] || balls[1];
  let fallbackPocket = POCKETS[0];
  let minFallDist = 99999;
  for (const t of targets) {
    for (const p of POCKETS) {
      const d = Math.hypot(p.x - t.x, p.y - t.y);
      if (d < minFallDist) {
        minFallDist = d;
        fallbackTarget = t;
        fallbackPocket = p;
      }
    }
  }
  const fdx = fallbackPocket.x - fallbackTarget.x, fdy = fallbackPocket.y - fallbackTarget.y;
  const fDist = Math.hypot(fdx, fdy) || 1;
  const fGhostX = fallbackTarget.x - (fdx / fDist) * (BALL_R * 2.0);
  const fGhostY = fallbackTarget.y - (fdy / fDist) * (BALL_R * 2.0);

  return {
    tx: fGhostX,
    ty: fGhostY,
    power: 0.55,
  };
}

// ═══════════════════════════════════════════════════════════════
//  SPIN BALL MODAL COMPONENT (CENTERED FULLSCREEN OVERLAY)
// ═══════════════════════════════════════════════════════════════
function SpinBallModal({
  isOpen,
  onClose,
  spin,
  onChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  spin: SpinState;
  onChange: (s: SpinState) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const SIZE = 180;
  const R    = 76;

  const drawBall = (dot: SpinState) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);
    const cx = SIZE / 2, cy = SIZE / 2;

    // Contact drop-shadow
    ctx.beginPath();
    ctx.arc(cx + 4, cy + 6, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();

    // Ball sphere gradient
    const bg = ctx.createRadialGradient(cx - 24, cy - 28, 4, cx, cy, R);
    bg.addColorStop(0,   '#ffffff');
    bg.addColorStop(0.3, '#f1f5f9');
    bg.addColorStop(0.7, '#cbd5e1');
    bg.addColorStop(1,   '#64748b');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.fill();

    // Crosshairs
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Hit point marker
    const dotX = cx + dot.x * (R - 14);
    const dotY = cy + dot.y * (R - 14);
    ctx.beginPath();
    ctx.arc(dotX, dotY, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Gloss
    const gs = ctx.createRadialGradient(cx - 22, cy - 26, 2, cx - 12, cy - 14, R * 0.7);
    gs.addColorStop(0,   'rgba(255,255,255,0.85)');
    gs.addColorStop(0.4, 'rgba(255,255,255,0.18)');
    gs.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = gs;
    ctx.fill();
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => drawBall(spin), 35);
      return () => clearTimeout(timer);
    }
  }, [isOpen, spin]);

  const handleCanvas = (clientX: number, clientY: number) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const cx = SIZE / 2, cy = SIZE / 2;
    let dx = (clientX - rect.left) - cx;
    let dy = (clientY - rect.top)  - cy;
    const maxR = SIZE / 2 - 16;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    const ns = { x: parseFloat((dx / maxR).toFixed(2)), y: parseFloat((dy / maxR).toFixed(2)) };
    onChange(ns);
    drawBall(ns);
  };

  if (!isOpen) return null;

  const spinDesc =
    spin.x === 0 && spin.y === 0 ? 'Tengah (Pukulan Normal)' :
    spin.y < -0.35 ? (spin.x > 0.35 ? 'Top Spin + Right English' : spin.x < -0.35 ? 'Top Spin + Left English' : 'Top Spin (Follow / Dorong Maju)') :
    spin.y > 0.35 ? (spin.x > 0.35 ? 'Back Spin + Right English' : spin.x < -0.35 ? 'Back Spin + Left English' : 'Back Spin (Draw / Tarik Mundur)') :
    spin.x > 0.35 ? 'Side Spin Kanan (Right English)' :
    spin.x < -0.35 ? 'Side Spin Kiri (Left English)' : 'Custom Spin';

  return (
    <div className="bl-spin-overlay" onClick={onClose}>
      <div className="bl-spin-popup" onClick={e => e.stopPropagation()}>
        <div className="bl-spin-popup-header-mobile">
          <div className="bl-spin-popup-title">🎯 Titik Pukul Cue Ball</div>
          <button className="bl-spin-close-btn" onClick={onClose} title="Tutup">✕</button>
        </div>

        <div className="bl-spin-popup-split">
          <div className="bl-spin-left-col">
            <div className="bl-spin-canvas-box">
              <canvas
                ref={canvasRef}
                width={SIZE}
                height={SIZE}
                className="bl-spin-ball-canvas"
                onMouseDown={e => handleCanvas(e.clientX, e.clientY)}
                onMouseMove={e => { if (e.buttons === 1) handleCanvas(e.clientX, e.clientY); }}
                onTouchStart={e => { e.preventDefault(); handleCanvas(e.touches[0].clientX, e.touches[0].clientY); }}
                onTouchMove={e => { e.preventDefault(); handleCanvas(e.touches[0].clientX, e.touches[0].clientY); }}
              />
            </div>
            <div className="bl-spin-canvas-hint">Tarik titik merah untuk atur spin</div>
          </div>

          <div className="bl-spin-right-col">
            <div className="bl-spin-popup-header-desktop">
              <div className="bl-spin-popup-title">🎯 Titik Pukul Cue Ball</div>
              <button className="bl-spin-close-btn" onClick={onClose} title="Tutup">✕</button>
            </div>

            <div className="bl-spin-popup-sub">
              Geser titik merah pada bola putih untuk efek Top, Back, atau Side spin
            </div>

            <div className="bl-spin-current-badge">
              Efek: <span>{spinDesc}</span>
            </div>

            <div className="bl-spin-popup-tags">
              {[
                ['Tengah', 0, 0],
                ['Top Spin', 0, -0.8],
                ['Back Spin', 0, 0.8],
                ['Kiri', -0.8, 0],
                ['Kanan', 0.8, 0]
              ].map(([lbl, x, y]) => {
                const isSelected = spin.x === x && spin.y === y;
                return (
                  <button
                    key={lbl as string}
                    className={`bl-spin-tag ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      const ns = { x: x as number, y: y as number };
                      onChange(ns);
                      drawBall(ns);
                    }}
                  >
                    {lbl as string}
                  </button>
                );
              })}
            </div>

            <button className="bl-spin-popup-ok" onClick={onClose}>
              ✓ Terapkan Spin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  POWER SLIDER & SEGMENTED LED METER
// ═══════════════════════════════════════════════════════════════
function PowerSlider({ power, onChange }: { power: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const update = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const v = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onChange(parseFloat(v.toFixed(2)));
  };

  const pColor = power < 0.35 ? '#4ade80' : power < 0.7 ? '#facc15' : '#f87171';
  const label  = power < 0.25 ? 'Lemah' : power < 0.5 ? 'Sedang' : power < 0.8 ? 'Kuat' : 'POWER MAX!';

  return (
    <div className="bl-power-wrapper">
      <div className="bl-power-label-row">
        <span className="bl-power-title">⚡ POWER PUKULAN</span>
        <span className="bl-power-pct" style={{ color: pColor }}>{Math.round(power * 100)}% — {label}</span>
      </div>
      <div
        ref={trackRef}
        className="bl-power-track"
        onMouseDown={e => { e.preventDefault(); update(e.clientX); }}
        onMouseMove={e => { if (e.buttons === 1) update(e.clientX); }}
        onTouchStart={e => { e.preventDefault(); update(e.touches[0].clientX); }}
        onTouchMove={e => { e.preventDefault(); update(e.touches[0].clientX); }}
        onClick={e => update(e.clientX)}
      >
        <div className="bl-power-fill" style={{ width: `${power * 100}%`, background: pColor }} />
        {[0.25, 0.5, 0.75].map(t => (
          <div key={t} className="bl-power-tick" style={{ left: `${t * 100}%` }} />
        ))}
        <div className="bl-power-thumb" style={{ left: `calc(${power * 100}% - 11px)`, borderColor: pColor }} />
      </div>
      <div className="bl-power-presets">
        {[
          ['🟢 25%', 0.25],
          ['🟡 50%', 0.50],
          ['🟠 75%', 0.75],
          ['🔴 MAX', 1.00]
        ].map(([lbl, v]) => (
          <button
            key={v as number}
            className={`bl-preset-btn ${Math.abs(power - (v as number)) < 0.04 ? 'sel' : ''}`}
            onClick={() => onChange(v as number)}
          >
            {lbl as string}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface CueStickOption {
  id: 'maple' | 'carbon' | 'dragon' | 'sultan';
  name: string;
  badge: string;
  desc: string;
  gradient: string;
  wrapStyle: string;
}

export const CUE_STICK_OPTIONS: CueStickOption[] = [
  {
    id: 'maple',
    name: 'Canadian Maple',
    badge: 'Classic 🍁',
    desc: 'Kayu Maple Kanada pilihan dengan lilitan benang Irish Linen.',
    gradient: 'linear-gradient(90deg, #fef3c7 0%, #d97706 60%, #451a03 100%)',
    wrapStyle: 'Irish Linen Wrap',
  },
  {
    id: 'carbon',
    name: 'Predator Carbon',
    badge: 'Pro Cyber ⚡',
    desc: 'Batang carbon graphite matte dengan cincin aksen neon cyan.',
    gradient: 'linear-gradient(90deg, #38bdf8 0%, #0284c7 40%, #0f172a 100%)',
    wrapStyle: 'Carbon Grip',
  },
  {
    id: 'dragon',
    name: 'Dragon Fire',
    badge: 'VIP Flame 🔥',
    desc: 'Kayu Crimson Mahogany dengan tatahan kobaran api naga emas.',
    gradient: 'linear-gradient(90deg, #f87171 0%, #dc2626 50%, #450a0a 100%)',
    wrapStyle: 'Dragon Scales',
  },
  {
    id: 'sultan',
    name: 'Sultan 24K Gold',
    badge: 'Royale 👑',
    desc: 'Batang sepuhan emas murni 24 karat bertahtakan mutiara mewah.',
    gradient: 'linear-gradient(90deg, #fef08a 0%, #eab308 50%, #713f12 100%)',
    wrapStyle: 'Mother-of-Pearl',
  },
];

export const QUICK_CHATS = [
  'Halo! 👋',
  'Bidikan mantap! 🎯',
  'Semoga beruntung! 🍀',
  'Waduh nyaris! 😅',
  'Terima kasih! 🙏',
  'Permainan seru! 🔥',
  'Siap-siap kalah! 😎',
  'GG WP! 🤝',
];

// ═══════════════════════════════════════════════════════════════
//  MAIN BILLIARD COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function BilliardScreen({
  onBack,
  socket,
  roomCode,
  players,
  opponent: propOpponent,
  betAmount,
}: {
  onBack: () => void;
  socket?: any;
  roomCode?: string | null;
  players?: any[] | null;
  opponent?: string | null;
  betAmount?: number | null;
}) {
  const username = localStorage.getItem('domino_username') || 'Pemain';
  const userAvatar = localStorage.getItem('domino_avatar') || '👑';
  const userLevel = localStorage.getItem('domino_level') || '45';

  const isMultiplayer = Boolean(roomCode || propOpponent || (players && players.length >= 2));
  const realOpponentData = (players || []).find(p => p.username !== username);
  const realOpponentName = realOpponentData?.username || propOpponent || 'Teman';

  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const ballsRef         = useRef<Ball[]>(createBalls());
  const isMovingRef      = useRef(false);
  const pocketedThisTurnRef = useRef<Set<number>>(new Set());
  const particlesRef     = useRef<Particle[]>([]);
  const sinkingBallsRef  = useRef<SinkingBall[]>([]);
  const cueBallJustShot  = useRef(false);
  const firstHitBallRef  = useRef<number | null>(null);

  const [aimTarget, setAimTarget]     = useState<{ x: number; y: number } | null>(null);
  const [power, setPower]             = useState(0.5);
  const [spin, setSpin]               = useState<SpinState>({ x: 0, y: 0 });
  const [isAimMode, setIsAimMode]     = useState(false);
  const [canvasScale, setCanvasScale] = useState(1);

  const [turn, setTurn]               = useState<'player' | 'ai'>('player');
  const [turnTimer, setTurnTimer]     = useState(25);
  const [turnCount, setTurnCount]     = useState(0);
  const [playerGroup, setPlayerGroup] = useState<'solid' | 'stripe' | null>(null);
  const [pocketedBalls, setPocketedBalls] = useState<number[]>([]);
  const [winner, setWinner]           = useState<'player' | 'ai' | null>(null);
  const [message, setMessage]         = useState('🎱 Klik meja untuk mengarahkan tembakan');
  const [coins, setCoins]             = useState(10000000);
  const [bonusCoins, setBonusCoins]   = useState(0);
  const [showHelp, setShowHelp]       = useState(false);
  const [showMenu, setShowMenu]       = useState(false);
  const [soundOn, setSoundOn]         = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isBallInHand, setIsBallInHand]       = useState(false);
  const isBallInHandRef                       = useRef(false);
  const isDraggingCueBallRef                  = useRef(false);
  const aiScheduleTimeoutRef                  = useRef<any>(null);
  useEffect(() => { isBallInHandRef.current = isBallInHand; }, [isBallInHand]);

  // Cue Stick Customization
  const [cueSkin, setCueSkin]                 = useState<'maple' | 'carbon' | 'dragon' | 'sultan'>('maple');
  const cueSkinRef                            = useRef(cueSkin);
  useEffect(() => { cueSkinRef.current = cueSkin; }, [cueSkin]);
  const [showCueModal, setShowCueModal]       = useState(false);
  const [showSpinModal, setShowSpinModal]     = useState(false);

  // Quick Chat System
  const [showChatMenu, setShowChatMenu]       = useState(false);
  const [activeChat, setActiveChat]           = useState<{ sender: 'player' | 'opponent'; text: string } | null>(null);
  const chatTimeoutRef                        = useRef<any>(null);

  const handleSendChat = (text: string) => {
    setShowChatMenu(false);
    if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current);
    setActiveChat({ sender: 'player', text });
    chatTimeoutRef.current = setTimeout(() => {
      setActiveChat(null);
    }, 3200);

    if (Math.random() < 0.65) {
      setTimeout(() => {
        const aiReplies = [
          'Semoga beruntung! 🍀',
          'Bidikan mantap! 🎯',
          'Terima kasih! 🙏',
          'Permainan seru! 🔥',
          'Waduh nyaris! 😅',
          'Siap-siap kalah! 😎'
        ];
        const reply = aiReplies[Math.floor(Math.random() * aiReplies.length)];
        setActiveChat({ sender: 'opponent', text: reply });
        setTimeout(() => {
          setActiveChat(null);
        }, 3000);
      }, 1300);
    }
  };

  const moveCueBallTo = (pos: { x: number; y: number }) => {
    const cue = ballsRef.current.find(b => b.id === 0);
    if (!cue) return;

    let targetX = Math.max(PLAY_LEFT + BALL_R + 3, Math.min(PLAY_RIGHT - BALL_R - 3, pos.x));
    let targetY = Math.max(PLAY_TOP + BALL_R + 3, Math.min(PLAY_BOTTOM - BALL_R - 3, pos.y));

    // Prevent placing directly on top of another ball
    for (const b of ballsRef.current) {
      if (b.id === 0 || b.pocketed) continue;
      const d = Math.hypot(targetX - b.x, targetY - b.y);
      if (d < BALL_R * 2 + 3) {
        const angle = Math.atan2(targetY - b.y, targetX - b.x);
        targetX = b.x + Math.cos(angle) * (BALL_R * 2 + 4);
        targetY = b.y + Math.sin(angle) * (BALL_R * 2 + 4);
      }
    }

    cue.x = Math.max(PLAY_LEFT + BALL_R + 3, Math.min(PLAY_RIGHT - BALL_R - 3, targetX));
    cue.y = Math.max(PLAY_TOP + BALL_R + 3, Math.min(PLAY_BOTTOM - BALL_R - 3, targetY));
    cue.pocketed = false;
    cue.vx = 0;
    cue.vy = 0;
  };

  const confirmBallInHand = () => {
    setIsBallInHand(false);
    isBallInHandRef.current = false;
    const cue = ballsRef.current.find(b => b.id === 0 && !b.pocketed);
    if (cue) {
      const curGroup = playerGroupRef.current;
      const legalBalls = ballsRef.current.filter(b => {
        if (b.pocketed || b.id === 0 || b.id === 8) return false;
        if (curGroup === 'solid') return !STRIPE_SET.has(b.id);
        if (curGroup === 'stripe') return STRIPE_SET.has(b.id);
        return true;
      });
      const tBall = legalBalls[0] || ballsRef.current.find(b => b.id === 8 && !b.pocketed) || { x: TABLE_W * 0.72, y: TABLE_H / 2 };
      const ang = Math.atan2(tBall.y - cue.y, tBall.x - cue.x);
      const defAim = {
        x: cue.x + Math.cos(ang) * 150,
        y: cue.y + Math.sin(ang) * 150
      };
      setAimTarget(defAim);
      aimTargetRef.current = defAim;
      smoothAimRef.current = defAim;
      setIsAimMode(true);
      isAimModeRef.current = true;
    }
    setMessage('🎯 Posisi bola putih diset! Arahkan stik dan tarik untuk menembak.');
  };

  // Left Vertical Cue Power Slider Interactions (Authentic 8 Ball Pool Pull-and-Release)
  const verticalCueTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingCueRef    = useRef(false);
  const [isDraggingCue, setIsDraggingCue] = useState(false);
  const handleShootRef      = useRef<() => void>(() => {});

  const updateVCuePower = (clientY: number) => {
    if (!verticalCueTrackRef.current) return;
    const rect = verticalCueTrackRef.current.getBoundingClientRect();
    const relY = clientY - rect.top;
    const p = Math.min(1, Math.max(0, relY / (rect.height * 0.88)));
    const rounded = parseFloat(p.toFixed(2));
    setPower(rounded);
    powerRef.current = rounded;
  };

  const onVCueMouseDown = (e: React.MouseEvent) => {
    poolSound.unlock();
    if (turn !== 'player' || isMovingRef.current || winner) return;
    e.preventDefault();
    if (isBallInHandRef.current) {
      confirmBallInHand();
    }
    setIsDraggingCue(true);
    isDraggingCueRef.current = true;
    updateVCuePower(e.clientY);

    const onMouseMove = (ev: MouseEvent) => {
      if (isDraggingCueRef.current) updateVCuePower(ev.clientY);
    };
    const onMouseUp = () => {
      setIsDraggingCue(false);
      if (isDraggingCueRef.current) {
        isDraggingCueRef.current = false;
        // Release to shoot if pulled back sufficiently!
        if (powerRef.current >= 0.08) {
          handleShootRef.current();
        } else {
          setPower(0);
          powerRef.current = 0;
        }
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onVCueTouchStart = (e: React.TouchEvent) => {
    poolSound.unlock();
    if (turn !== 'player' || isMovingRef.current || winner) return;
    if (e.cancelable) e.preventDefault();
    if (isBallInHandRef.current) {
      confirmBallInHand();
    }
    setIsDraggingCue(true);
    isDraggingCueRef.current = true;
    updateVCuePower(e.touches[0].clientY);

    const onTouchMove = (ev: TouchEvent) => {
      if (ev.cancelable) ev.preventDefault();
      if (isDraggingCueRef.current) updateVCuePower(ev.touches[0].clientY);
    };
    const onTouchEnd = () => {
      setIsDraggingCue(false);
      if (isDraggingCueRef.current) {
        isDraggingCueRef.current = false;
        // Release to shoot if pulled back sufficiently!
        if (powerRef.current >= 0.08) {
          handleShootRef.current();
        } else {
          setPower(0);
          powerRef.current = 0;
        }
      }
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  };

  const [gameStep, setGameStep]         = useState<'room_select' | 'matching' | 'playing'>('room_select');
  const [selectedRoom, setSelectedRoom] = useState<PoolRoom>(POOL_ROOMS[0]);
  const [roomFilter, setRoomFilter]     = useState<'all' | 'pemula' | 'menengah' | 'pro' | 'sultan'>('all');
  const selectedRoomRef                 = useRef(selectedRoom);
  useEffect(() => { selectedRoomRef.current = selectedRoom; }, [selectedRoom]);

  const [opponent, setOpponent]         = useState(OPPONENT_LIST[0]);
  const opponentRef                     = useRef(opponent);
  useEffect(() => { opponentRef.current = opponent; }, [opponent]);
  const oppDisplayName                 = isMultiplayer ? realOpponentName : (opponent?.name || 'Lawan');
  const [matchStatus, setMatchStatus]   = useState('🔍 Mencari Lawan Berdasarkan Skill...');
  const [matchCountdown, setMatchCountdown] = useState<number | null>(null);
  const [matchingAvatar, setMatchingAvatar] = useState(OPPONENT_LIST[0].avatar);
  const matchIntervalRef                = useRef<any>(null);
  const matchCountIntervalRef           = useRef<any>(null);
  const aiAnimRef                       = useRef<number | null>(null);

  // Sync sound settings with audio manager & unlock Web Audio on any user gesture
  useEffect(() => {
    poolSound.enabled = soundOn;
  }, [soundOn]);

  useEffect(() => {
    const unlockAudio = () => poolSound.unlock();
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('mousedown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('mousedown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Cleanup timers & animation frame on unmount
  useEffect(() => {
    return () => {
      if (matchIntervalRef.current) clearInterval(matchIntervalRef.current);
      if (matchCountIntervalRef.current) clearInterval(matchCountIntervalRef.current);
      if (aiScheduleTimeoutRef.current) clearTimeout(aiScheduleTimeoutRef.current);
      if (aiAnimRef.current) cancelAnimationFrame(aiAnimRef.current);
    };
  }, []);



  // Responsive scale
  useEffect(() => {
    const update = () => {
      const mw = Math.min(window.innerWidth - 8, TABLE_W);
      setCanvasScale(mw / TABLE_W);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Load coins from backend / localStorage
  useEffect(() => {
    const u = localStorage.getItem('domino_username');
    if (!u) return;
    const stored = localStorage.getItem('domino_coins');
    if (stored) setCoins(parseInt(stored));
    fetch(`${API_URL}/profile/${u}`)
      .then(r => r.json())
      .then(d => {
        if (d.coins != null) setCoins(d.coins);
        if (d.bonusCoins != null) setBonusCoins(d.bonusCoins);
      })
      .catch(() => {});
  }, []);

  // Handle direct By One multiplayer duel initialization
  useEffect(() => {
    if (isMultiplayer) {
      setOpponent({
        name: realOpponentName,
        avatar: realOpponentData?.avatar || '👑',
        level: Number(realOpponentData?.vipLevel || 45),
      });
      if (betAmount) {
        setSelectedRoom({
          id: 'byone',
          name: 'Duel By One 1v1',
          entry: betAmount,
          prize: betAmount * 2,
          city: 'Jakarta',
          flag: '🇮🇩',
          tier: 'Pro',
          tierCategory: 'pro',
          minLevel: 1,
          ringName: 'Duel Champion Ring',
          feltColor: '#1d4ed8',
          feltName: 'Simonis Royal Blue',
          accentColor: '#e74c3c',
          onlineCount: 2,
          badge: '1V1 DUEL',
          bg: 'linear-gradient(135deg,#c0392b,#e74c3c)',
        });
      }
      const isHostPlayer = !players || players.length === 0 || players[0].username === username;
      setGameStep('playing');
      setTurn(isHostPlayer ? 'player' : 'ai');
      turnRef.current = isHostPlayer ? 'player' : 'ai';
      setMessage(
        isHostPlayer
          ? `⚔️ Duel 1v1 melawan ${realOpponentName}! Giliran Anda sodok pertama.`
          : `⚔️ Duel 1v1 melawan ${realOpponentName}! Giliran ${realOpponentName} sodok pertama.`
      );

      if (socket && roomCode) {
        socket.emit('billiard_join_room', { roomCode });

        const handleOpponentShot = ({ angle, power: oppPower, spin: oppSpin, cueX, cueY }: any) => {
          const cue = ballsRef.current.find(b => b.id === 0);
          if (!cue) return;
          cue.pocketed = false;
          if (typeof cueX === 'number' && typeof cueY === 'number') {
            cue.x = cueX;
            cue.y = cueY;
          }
          firstHitBallRef.current = null;
          cueBallJustShot.current = true;
          cue.vx = Math.cos(angle) * oppPower * 23;
          cue.vy = Math.sin(angle) * oppPower * 23;
          if (oppSpin) spinRef.current = oppSpin;
          isMovingRef.current = true;
          poolSound.playCueHit(oppPower);
          setMessage(`💥 ${realOpponentName} melepaskan tembakan!`);
        };

        socket.on('billiard_opponent_shot', handleOpponentShot);
        return () => {
          socket.off('billiard_opponent_shot', handleOpponentShot);
        };
      }
    }
  }, [isMultiplayer, realOpponentName, realOpponentData, betAmount, roomCode, socket]);

  // Cancel Matchmaking
  const cancelMatchmaking = () => {
    if (matchIntervalRef.current) {
      clearInterval(matchIntervalRef.current);
      matchIntervalRef.current = null;
    }
    if (matchCountIntervalRef.current) {
      clearInterval(matchCountIntervalRef.current);
      matchCountIntervalRef.current = null;
    }
    setGameStep('room_select');
    setMatchCountdown(null);
    setMatchStatus('🔍 Mencari Lawan Berdasarkan Skill...');
  };

  // Room Select & Matchmaking (10 detik pencarian di server, lalu pasangkan dengan bot)
  const handleSelectRoom = (room: typeof POOL_ROOMS[0]) => {
    poolSound.unlock();
    const usableCoins = Math.max(0, coins - bonusCoins);
    if (usableCoins < room.entry) {
      if (bonusCoins > 0 && coins >= room.entry) {
        alert(`⚠️ Koin bonus harian (${bonusCoins.toLocaleString('id-ID')} koin) hanya dapat digunakan untuk game SLOT!\n\nKoin biliar Anda: ${usableCoins.toLocaleString('id-ID')} koin (Butuh: ${room.entry.toLocaleString('id-ID')} koin).`);
      } else {
        alert('Koin Anda tidak cukup untuk masuk ke room ini!');
      }
      return;
    }
    setSelectedRoom(room);
    setGameStep('matching');
    setMatchCountdown(null);

    if (matchIntervalRef.current) clearInterval(matchIntervalRef.current);
    if (matchCountIntervalRef.current) clearInterval(matchCountIntervalRef.current);

    let searchSeconds = 10;
    setMatchStatus(`🔍 Mencari pemain lawan di server... (${searchSeconds}s)`);

    // Avatar roulette shuffle with 10-second timer
    let cycleCount = 0;
    matchIntervalRef.current = setInterval(() => {
      cycleCount++;
      const randomOpp = OPPONENT_LIST[Math.floor(Math.random() * OPPONENT_LIST.length)];
      setMatchingAvatar(randomOpp.avatar);

      // Setiap 1 detik (8 cycle @ 125ms = 1000ms)
      if (cycleCount % 8 === 0) {
        searchSeconds--;
        if (searchSeconds > 0) {
          setMatchStatus(`🔍 Mencari pemain lawan di server... (${searchSeconds}s)`);
        }
      }

      // Setelah 10 detik belum ada lawan manusia, pasangkan dengan bot berlevel sesuai
      if (cycleCount >= 80 || searchSeconds <= 0) {
        clearInterval(matchIntervalRef.current);
        matchIntervalRef.current = null;

        const finalOpp = OPPONENT_LIST[Math.floor(Math.random() * OPPONENT_LIST.length)];
        setOpponent(finalOpp);
        opponentRef.current = finalOpp;
        setMatchingAvatar(finalOpp.avatar);
        setMatchStatus(`⚡ MUSUH DITEMUKAN: ${finalOpp.name} (Lvl ${finalOpp.level})!`);

        let count = 3;
        setMatchCountdown(count);
        matchCountIntervalRef.current = setInterval(() => {
          count--;
          if (count <= 0) {
            clearInterval(matchCountIntervalRef.current);
            matchCountIntervalRef.current = null;
            setCoins(c => Math.max(0, c - room.entry));
            fetch(`${API_URL}/users/update-coins`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, amount: -room.entry, gameType: 'billiard' })
            }).catch(() => {});
            ballsRef.current = createBalls();
            setPocketedBalls([]);
            setWinner(null);
            setIsBallInHand(false);
            isBallInHandRef.current = false;
            firstHitBallRef.current = null;
            cueBallJustShot.current = false;
            setTurn('player');
            turnRef.current = 'player';
            setTurnTimer(25);
            setPlayerGroup(null);
            setMessage(`🎱 Permainan Dimulai! Taruhan: 🪙 ${room.entry.toLocaleString('id-ID')}`);
            setGameStep('playing');
          } else {
            setMatchCountdown(count);
          }
        }, 800);
      }
    }, 125);
  };

  // Turn refs for loop
  const turnRef        = useRef(turn);
  const playerGroupRef = useRef(playerGroup);
  const spinRef        = useRef(spin);
  const aimTargetRef   = useRef(aimTarget);
  const powerRef       = useRef(power);
  const isAimModeRef   = useRef(isAimMode);
  const smoothAimRef   = useRef<{ x: number; y: number } | null>(null);
  const cueStrikeRef   = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    power: number;
    cueBall: Ball;
    targetX: number;
    targetY: number;
    progress: number;
  } | null>(null);

  useEffect(() => { turnRef.current        = turn;        }, [turn]);
  useEffect(() => { playerGroupRef.current = playerGroup; }, [playerGroup]);
  useEffect(() => { spinRef.current        = spin;        }, [spin]);
  useEffect(() => { aimTargetRef.current   = aimTarget;   }, [aimTarget]);
  useEffect(() => { powerRef.current       = power;       }, [power]);
  useEffect(() => { isAimModeRef.current   = isAimMode;   }, [isAimMode]);

  // Robust Smart Human-like AI Execution with Smooth Aim Sweep & Power Pullback
  const scheduleAI = useCallback((hasBallInHand = false) => {
    if (aiScheduleTimeoutRef.current) {
      clearTimeout(aiScheduleTimeoutRef.current);
      aiScheduleTimeoutRef.current = null;
    }
    if (aiAnimRef.current) {
      cancelAnimationFrame(aiAnimRef.current);
      aiAnimRef.current = null;
    }

    const oppName = opponentRef.current?.name || oppDisplayName;
    setMessage(`🎯 ${oppName} sedang mengamati meja & memikirkan sudut...`);

    const attemptAIShot = () => {
      // If balls are still rolling or sinking, wait and retry
      if (isMovingRef.current) {
        aiScheduleTimeoutRef.current = setTimeout(attemptAIShot, 250);
        return;
      }

      const cue = ballsRef.current.find(b => b.id === 0);
      if (!cue) return;

      const shot = computeSmartAIShot(
        ballsRef.current,
        playerGroupRef.current,
        hasBallInHand || isBallInHandRef.current
      );

      // Step 1: If bot had Ball in Hand, place cue ball in prime position!
      if (shot.placeCue) {
        cue.x = shot.placeCue.x;
        cue.y = shot.placeCue.y;
        cue.pocketed = false;
        cue.vx = 0;
        cue.vy = 0;
        setIsBallInHand(false);
        isBallInHandRef.current = false;
        setMessage(`🎯 ${oppName} memposisikan bola putih di tempat strategis...`);
      } else if (cue.pocketed) {
        cue.pocketed = false;
        cue.x = TABLE_W * 0.26;
        cue.y = TABLE_H / 2;
        cue.vx = 0;
        cue.vy = 0;
      }

      // Target position and final angle
      const targetAngle = Math.atan2(shot.ty - cue.y, shot.tx - cue.x);
      const aimDist = 280;

      // Start aiming from an offset angle (+/- 35 to 60 degrees) so it smoothly sweeps to the target!
      const angleOffset = (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.4);
      const startAngle = targetAngle + angleOffset;

      // Step 2: Smooth Aim Sweep Animation using requestAnimationFrame over ~1350ms
      setMessage(`🎯 ${oppName} sedang membidik sasaran...`);
      setIsAimMode(true);
      isAimModeRef.current = true;
      setPower(0);
      powerRef.current = 0;

      const aimDuration = 1350; // ms
      const aimStartTime = performance.now();

      const animateAim = (now: number) => {
        const elapsed = now - aimStartTime;
        const rawProgress = Math.min(1, elapsed / aimDuration);
        // Smooth ease-out cubic curve
        const ease = 1 - Math.pow(1 - rawProgress, 3);
        const curAngle = startAngle + (targetAngle - startAngle) * ease;

        const curAimX = cue.x + Math.cos(curAngle) * aimDist;
        const curAimY = cue.y + Math.sin(curAngle) * aimDist;
        const aimPos = { x: curAimX, y: curAimY };

        setAimTarget(aimPos);
        aimTargetRef.current = aimPos;
        smoothAimRef.current = aimPos;

        if (rawProgress < 1) {
          aiAnimRef.current = requestAnimationFrame(animateAim);
        } else {
          // Lock precisely onto the shot target point
          const finalAimPos = { x: shot.tx, y: shot.ty };
          setAimTarget(finalAimPos);
          aimTargetRef.current = finalAimPos;
          smoothAimRef.current = finalAimPos;

          // Step 3: Brief micro-pause (250ms), then smoothly pull back cue stick
          aiScheduleTimeoutRef.current = setTimeout(() => {
            setMessage(`🎯 ${oppName} menarik stik biliar...`);
            const powerDuration = 700; // ms
            const targetPower = Math.max(0.35, shot.power);
            const powerStartTime = performance.now();

            const animatePower = (pNow: number) => {
              const pElapsed = pNow - powerStartTime;
              const pProgress = Math.min(1, pElapsed / powerDuration);
              // Ease-in-out quad
              const pEase = pProgress < 0.5 
                ? 2 * pProgress * pProgress 
                : 1 - Math.pow(-2 * pProgress + 2, 2) / 2;
              const curPow = pEase * targetPower;

              setPower(curPow);
              powerRef.current = curPow;

              if (pProgress < 1) {
                aiAnimRef.current = requestAnimationFrame(animatePower);
              } else {
                // Step 4: Brief tension pause (180ms) then STRIKE!
                aiScheduleTimeoutRef.current = setTimeout(() => {
                  if (isMovingRef.current) {
                    aiScheduleTimeoutRef.current = setTimeout(attemptAIShot, 250);
                    return;
                  }

                  const dx = shot.tx - cue.x, dy = shot.ty - cue.y;
                  const len = Math.hypot(dx, dy) || 1;
                  const shotPower = targetPower;

                  firstHitBallRef.current = null;
                  cueBallJustShot.current = true;
                  cue.vx = (dx / len) * shotPower * 23;
                  cue.vy = (dy / len) * shotPower * 23;
                  isMovingRef.current = true;

                  setIsAimMode(false);
                  isAimModeRef.current = false;
                  setAimTarget(null);
                  aimTargetRef.current = null;
                  smoothAimRef.current = null;
                  setPower(0);
                  powerRef.current = 0;
                  poolSound.playCueHit(shotPower);
                  setMessage(`💥 ${oppName} melepaskan tembakan!`);
                }, 180);
              }
            };

            aiAnimRef.current = requestAnimationFrame(animatePower);
          }, 250);
        }
      };

      aiAnimRef.current = requestAnimationFrame(animateAim);
    };

    // Human-like hesitation before starting to aim: 850ms
    aiScheduleTimeoutRef.current = setTimeout(attemptAIShot, 850);
  }, [oppDisplayName]);

  // Handle Timeout (Shot clock violation foul)
  const handleTimeout = useCallback(() => {
    if (gameStep !== 'playing' || winner) return;
    const oppName = opponentRef.current?.name || oppDisplayName;

    if (turnRef.current === 'player') {
      // Player timeout -> Foul! Opponent gets Ball in Hand
      setMessage(`⏳ Waktu Anda habis! FOUL! Giliran ${oppName} dengan Ball in Hand.`);
      setIsAimMode(false);
      isAimModeRef.current = false;
      setAimTarget(null);
      aimTargetRef.current = null;
      smoothAimRef.current = null;
      setIsDraggingCue(false);
      isDraggingCueRef.current = false;
      isDraggingRef.current = false;
      isDraggingCueBallRef.current = false;
      setPower(0);
      powerRef.current = 0;
      setIsBallInHand(false);
      isBallInHandRef.current = false;

      setTurn('ai');
      turnRef.current = 'ai';
      setTurnTimer(25);
      setTurnCount(c => c + 1);

      if (!isMultiplayer) {
        scheduleAI(true);
      }
    } else {
      // Opponent timeout -> Foul! Player gets Ball in Hand
      setMessage(`⏳ Waktu ${oppName} habis! FOUL! Anda mendapat Ball in Hand.`);
      setIsBallInHand(true);
      isBallInHandRef.current = true;
      setTurn('player');
      turnRef.current = 'player';
      setTurnTimer(25);
      setTurnCount(c => c + 1);
    }
  }, [gameStep, winner, isMultiplayer, scheduleAI, oppDisplayName]);

  // Turn timer countdown (pauses when balls move)
  useEffect(() => {
    if (gameStep !== 'playing' || winner) return;
    const interval = setInterval(() => {
      if (isMovingRef.current) return;
      setTurnTimer(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStep, winner]);

  // Trigger timeout cleanly outside of state updater
  useEffect(() => {
    if (gameStep === 'playing' && !winner && turnTimer === 0) {
      handleTimeout();
    }
  }, [turnTimer, gameStep, winner, handleTimeout]);

  // Reset timer on turn or shot continuation
  useEffect(() => {
    setTurnTimer(25);
  }, [turn, turnCount]);

  // Guarantee AI fires whenever turn becomes 'ai'
  useEffect(() => {
    if (gameStep !== 'playing' || winner || isMultiplayer) return;
    if (turn === 'ai') {
      scheduleAI(isBallInHandRef.current);
    }
  }, [turn, gameStep, winner, isMultiplayer, scheduleAI]);

  // Turn resolution with full 8-Ball Pool Foul rules
  const handleTurnEnd = useCallback(() => {
    const oppName = opponentRef.current?.name || oppDisplayName;
    const balls   = ballsRef.current;
    const pNow    = Array.from(pocketedThisTurnRef.current);
    pocketedThisTurnRef.current = new Set();
    const curTurn = turnRef.current;
    let curGroup  = playerGroupRef.current;
    const firstHit = firstHitBallRef.current;
    firstHitBallRef.current = null;

    // 1. Foul check: Cue ball sunk (Scratch)
    const isScratch = pNow.includes(0);

    // 2. Foul check: No contact with any ball
    const isNoContact = firstHit === null;

    // 3. Foul check: Wrong ball hit first
    let isWrongBallFirst = false;
    if (!isScratch && !isNoContact) {
      if (curGroup === null) {
        // Open table: Can hit any ball 1-15 first EXCEPT ball 8
        if (firstHit === 8) {
          isWrongBallFirst = true;
        }
      } else {
        const ownGroup = curTurn === 'player' ? curGroup : (curGroup === 'solid' ? 'stripe' : 'solid');
        // Include balls pocketed this turn (pNow) to accurately evaluate table state at shot start
        const hadOwnRemaining = balls.some(
          b => (!b.pocketed || pNow.includes(b.id)) && b.id !== 0 && b.id !== 8 && (ownGroup === 'solid' ? !STRIPE_SET.has(b.id) : STRIPE_SET.has(b.id))
        );
        if (hadOwnRemaining) {
          const isOwn = (ownGroup === 'solid' ? !STRIPE_SET.has(firstHit) : STRIPE_SET.has(firstHit));
          if (!isOwn || firstHit === 8) {
            isWrongBallFirst = true;
          }
        } else {
          // All group balls were cleared before this shot; must hit 8-ball first
          if (firstHit !== 8) {
            isWrongBallFirst = true;
          }
        }
      }
    }

    const isFoul = isScratch || isNoContact || isWrongBallFirst;

    if (isFoul) {
      if (isScratch) {
        const cue = balls.find(b => b.id === 0);
        if (cue) {
          cue.pocketed = false;
          cue.x = TABLE_W * 0.26;
          cue.y = TABLE_H / 2;
          cue.vx = 0; cue.vy = 0;
        }
      }

      // Sinking 8-ball during foul is instant loss
      if (pNow.includes(8)) {
        const winResult = curTurn === 'player' ? 'ai' : 'player';
        setWinner(winResult);
        if (winResult === 'player') poolSound.playWinFanfare();
        return;
      }

      const next = curTurn === 'player' ? 'ai' : 'player';
      let reason = 'Bola putih masuk kantong';
      if (isNoContact) reason = 'Tidak mengenai bola apapun';
      else if (isWrongBallFirst) reason = 'Menyodok bola yang salah terlebih dahulu';

      if (next === 'player') {
        setMessage(`⚠️ FOUL ${oppName} (${reason})! Anda mendapat Ball in Hand.`);
        setIsBallInHand(true);
        isBallInHandRef.current = true;
        setTurn('player');
        setTurnTimer(25);
        setTurnCount(c => c + 1);
      } else {
        setMessage(`⚠️ FOUL (${reason})! Giliran ${oppName} dengan Ball in Hand.`);
        setIsBallInHand(false);
        isBallInHandRef.current = false;
        setTurn('ai');
        setTurnTimer(25);
        setTurnCount(c => c + 1);
        if (!isMultiplayer) scheduleAI(true);
      }
      return;
    }

    // 8-Ball sink check (clean shot)
    if (pNow.includes(8)) {
      const solidsDone  = !balls.some(b => !b.pocketed && !STRIPE_SET.has(b.id) && b.id !== 0 && b.id !== 8);
      const stripesDone = !balls.some(b => !b.pocketed && STRIPE_SET.has(b.id));
      const playerClear = curTurn === 'player' && ((curGroup === 'solid' && solidsDone) || (curGroup === 'stripe' && stripesDone));
      const aiClear     = curTurn === 'ai' && ((curGroup === 'solid' && stripesDone) || (curGroup === 'stripe' && solidsDone));
      const winResult   = playerClear ? 'player' : (aiClear ? 'ai' : (curTurn === 'player' ? 'ai' : 'player'));
      setWinner(winResult);
      if (winResult === 'player') poolSound.playWinFanfare();
      return;
    }

    // Assign group on first legal pot
    const newPocketed = pNow.filter(id => id !== 0 && id !== 8);
    if (curGroup === null && newPocketed.length > 0) {
      const first = newPocketed[0];
      const ng: 'solid' | 'stripe' = curTurn === 'player'
        ? (STRIPE_SET.has(first) ? 'stripe' : 'solid')
        : (STRIPE_SET.has(first) ? 'solid'  : 'stripe');
      setPlayerGroup(ng);
      curGroup = ng;
      setMessage(curTurn === 'player'
        ? `🎯 Anda: ${ng === 'solid' ? 'Solid (● Bola 1-7)' : 'Stripe (◑ Bola 9-15)'}!`
        : `${oppName}: ${ng === 'solid' ? 'Stripe (◑ Bola 9-15)' : 'Solid (● Bola 1-7)'}.`);
    }

    const own = newPocketed.filter(id => {
      const isSt = STRIPE_SET.has(id);
      return curTurn === 'player'
        ? (curGroup === 'stripe' ? isSt : !isSt)
        : (curGroup === 'stripe' ? !isSt : isSt);
    });

    if (own.length === 0) {
      // Normal missed pot or no legal balls sunk -> Turn passes to opponent WITHOUT Ball in Hand
      const next = curTurn === 'player' ? 'ai' : 'player';
      setIsBallInHand(false);
      isBallInHandRef.current = false;
      setMessage(next === 'player' ? '🎯 Giliran Anda!' : `🎯 Giliran ${oppName}...`);
      setTurn(next);
      setTurnTimer(25);
      setTurnCount(c => c + 1);
      if (next === 'ai' && !isMultiplayer) scheduleAI();
    } else {
      // Legal pot -> Turn continues! (NO Ball in Hand)
      setIsBallInHand(false);
      isBallInHandRef.current = false;

      const ownGroup = curTurn === 'player' ? curGroup : (curGroup === 'solid' ? 'stripe' : 'solid');
      const allOwnCleared = !balls.some(
        b => !b.pocketed && b.id !== 0 && b.id !== 8 && (ownGroup === 'solid' ? !STRIPE_SET.has(b.id) : STRIPE_SET.has(b.id))
      );

      if (allOwnCleared) {
        setMessage(curTurn === 'player'
          ? '🔥 Tembakan Sempurna! Semua bola grup Anda bersih, sekarang masukkan Bola 8 (Hitam) untuk MENANG!'
          : `🔥 ${oppName} membersihkan semua bola grupnya! Sekarang mengincar Bola 8...`
        );
      } else {
        setMessage(curTurn === 'player'
          ? '✨ Tembakan Bagus! Lanjut tembak lagi!'
          : `✨ ${oppName} memasukkan bola! Lanjut tembak...`
        );
      }
      setTurnTimer(25);
      setTurnCount(c => c + 1);
      if (curTurn === 'ai' && !isMultiplayer) scheduleAI();
    }
  }, [scheduleAI, isMultiplayer, realOpponentName, oppDisplayName]);

  // Unified Single Animation & Render Loop (Hardware Optimized)
  useEffect(() => {
    if (gameStep !== 'playing') return;
    let animId: number;
    const loop = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const balls = ballsRef.current;
          const wasMoving = isMovingRef.current;
          const stillMoving = physicsStep(
            balls,
            pocketedThisTurnRef.current,
            particlesRef.current,
            sinkingBallsRef.current,
            spinRef.current,
            cueBallJustShot,
            firstHitBallRef
          );
          const hasSinking = sinkingBallsRef.current.length > 0;
          isMovingRef.current = stillMoving || hasSinking;

          // Only update pocketed balls state when physics was active (avoids idle GC churn)
          if (wasMoving || isMovingRef.current) {
            const currentlyPocketed = balls.filter(b => b.pocketed).map(b => b.id);
            setPocketedBalls(prev => {
              if (prev.length !== currentlyPocketed.length || prev.some((v, i) => v !== currentlyPocketed[i])) {
                return currentlyPocketed;
              }
              return prev;
            });
          }

          if (wasMoving && !isMovingRef.current) {
            handleTurnEnd();
          }

          // ── SMOOTH AIM LERP (Eliminates touch/mouse jitter) ──
          if (aimTargetRef.current) {
            if (!smoothAimRef.current) {
              smoothAimRef.current = { ...aimTargetRef.current };
            } else {
              smoothAimRef.current.x += (aimTargetRef.current.x - smoothAimRef.current.x) * 0.35;
              smoothAimRef.current.y += (aimTargetRef.current.y - smoothAimRef.current.y) * 0.35;
            }
          } else {
            smoothAimRef.current = null;
          }

          // ── SNAPPY CUE STRIKE FORWARD THRUST ANIMATION ──
          let strikeProgress = 0;
          if (cueStrikeRef.current && cueStrikeRef.current.active) {
            const strike = cueStrikeRef.current;
            const elapsed = performance.now() - strike.startTime;
            strikeProgress = Math.min(1, elapsed / strike.duration);
            strike.progress = strikeProgress;

            if (strikeProgress >= 1) {
              // Impact moment! Cue tip strikes the cue ball
              strike.active = false;
              cueStrikeRef.current = null;
              strikeProgress = 1;

              const cue = strike.cueBall;
              const dx = strike.targetX - cue.x;
              const dy = strike.targetY - cue.y;
              const len = Math.hypot(dx, dy) || 1;

              cueBallJustShot.current = true;
              cue.vx = (dx / len) * strike.power * 23;
              cue.vy = (dy / len) * strike.power * 23;
              isMovingRef.current = true;
              setIsAimMode(false);
              isAimModeRef.current = false;
              setAimTarget(null);
              aimTargetRef.current = null;
              smoothAimRef.current = null;
              poolSound.playCueHit(strike.power);
              setMessage('💥 Tembakan dilepaskan!');

              if (socket && roomCode) {
                const angle = Math.atan2(cue.vy, cue.vx);
                socket.emit('billiard_shot', { roomCode, angle, power: strike.power, spin: spinRef.current, cueX: cue.x, cueY: cue.y });
              }

              setTimeout(() => {
                setPower(0);
                powerRef.current = 0;
              }, 60);
            }
          }

          const targetForDraw = smoothAimRef.current || aimTargetRef.current;
          const showAim = (isAimModeRef.current || (cueStrikeRef.current?.active ?? false)) && !isMovingRef.current;

          drawScene(
            ctx,
            balls,
            targetForDraw,
            powerRef.current,
            showAim,
            particlesRef.current,
            sinkingBallsRef.current,
            selectedRoomRef.current?.feltColor,
            cueSkinRef.current,
            strikeProgress,
            isBallInHandRef.current
          );
        }
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameStep, handleTurnEnd, socket, roomCode]);

  // Coordinate helper (exact scale independent)
  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: ((cx - rect.left) / rect.width) * TABLE_W,
      y: ((cy - rect.top) / rect.height) * TABLE_H,
    };
  };

  const isDraggingRef = useRef(false);

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    poolSound.unlock();
    if (turn !== 'player' || isMovingRef.current || winner || cueStrikeRef.current?.active) return;
    e.preventDefault();
    const pos = getCanvasPos(e);

    const onWindowMouseUp = () => {
      onCanvasMouseUp();
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
    window.addEventListener('mouseup', onWindowMouseUp);

    if (isBallInHandRef.current) {
      isDraggingCueBallRef.current = true;
      moveCueBallTo(pos);
      return;
    }

    isDraggingRef.current = true;
    aimTargetRef.current = pos;
    if (!smoothAimRef.current) {
      smoothAimRef.current = { ...pos };
    }
    setIsAimMode(true);
    isAimModeRef.current = true;
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (turn !== 'player' || isMovingRef.current || winner || cueStrikeRef.current?.active) return;
    const pos = getCanvasPos(e);

    if (isBallInHandRef.current && isDraggingCueBallRef.current) {
      moveCueBallTo(pos);
      return;
    }

    if (!isDraggingRef.current) return;
    aimTargetRef.current = pos;
  };

  const onCanvasMouseUp = () => {
    isDraggingRef.current = false;
    isDraggingCueBallRef.current = false;
    if (!isBallInHandRef.current && aimTargetRef.current) {
      setAimTarget(aimTargetRef.current);
    }
  };

  const onCanvasTouchStart = (e: React.TouchEvent) => {
    poolSound.unlock();
    if (e.cancelable) e.preventDefault();
    if (turn !== 'player' || isMovingRef.current || winner || cueStrikeRef.current?.active) return;
    const pos = getCanvasPos(e);

    if (isBallInHandRef.current) {
      isDraggingCueBallRef.current = true;
      moveCueBallTo(pos);
      return;
    }

    isDraggingRef.current = true;
    aimTargetRef.current = pos;
    if (!smoothAimRef.current) {
      smoothAimRef.current = { ...pos };
    }
    setIsAimMode(true);
    isAimModeRef.current = true;
  };

  const onCanvasTouchMove = (e: React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    if (turn !== 'player' || isMovingRef.current || winner || cueStrikeRef.current?.active) return;
    const pos = getCanvasPos(e);

    if (isBallInHandRef.current && isDraggingCueBallRef.current) {
      moveCueBallTo(pos);
      return;
    }

    if (!isDraggingRef.current) return;
    aimTargetRef.current = pos;
  };

  const onCanvasTouchEnd = () => {
    isDraggingRef.current = false;
    isDraggingCueBallRef.current = false;
    if (!isBallInHandRef.current && aimTargetRef.current) {
      setAimTarget(aimTargetRef.current);
    }
  };

  // 8 Ball Pool Shoot execution (Initiates 52ms Snappy Strike Plunge)
  const handleShoot = useCallback(() => {
    if (turn !== 'player' || isMovingRef.current || winner || cueStrikeRef.current?.active) return;
    const cue = ballsRef.current.find(b => b.id === 0 && !b.pocketed);
    if (!cue) return;

    let target = aimTargetRef.current || smoothAimRef.current;
    if (!target) {
      const curGroup = playerGroupRef.current;
      const legalBalls = ballsRef.current.filter(b => {
        if (b.pocketed || b.id === 0 || b.id === 8) return false;
        if (curGroup === 'solid') return !STRIPE_SET.has(b.id);
        if (curGroup === 'stripe') return STRIPE_SET.has(b.id);
        return true;
      });
      const tBall = legalBalls[0] || ballsRef.current.find(b => b.id === 8 && !b.pocketed) || { x: TABLE_W * 0.72, y: TABLE_H / 2 };
      const ang = Math.atan2(tBall.y - cue.y, tBall.x - cue.x);
      target = {
        x: cue.x + Math.cos(ang) * 150,
        y: cue.y + Math.sin(ang) * 150
      };
      setAimTarget(target);
      aimTargetRef.current = target;
      smoothAimRef.current = target;
    }

    const dx = target.x - cue.x, dy = target.y - cue.y;
    const len = Math.hypot(dx, dy);
    if (len < 5) return;

    const currentPower = Math.max(0.12, Math.min(1, powerRef.current));

    firstHitBallRef.current = null;
    if (isBallInHandRef.current) {
      setIsBallInHand(false);
      isBallInHandRef.current = false;
    }

    // Initiate Snappy Cue Strike Animation
    cueStrikeRef.current = {
      active: true,
      startTime: performance.now(),
      duration: 52, // 52ms forward thrust
      power: currentPower,
      cueBall: cue,
      targetX: target.x,
      targetY: target.y,
      progress: 0,
    };
  }, [turn, winner]);

  useEffect(() => {
    handleShootRef.current = handleShoot;
  }, [handleShoot]);

  // Auto-align aimTarget at beginning of player turn (8 Ball Pool style)
  useEffect(() => {
    if (turn === 'player' && gameStep === 'playing' && !isMovingRef.current && !winner) {
      if (isBallInHand) return; // Do not auto-aim while user is placing Ball in Hand
      const cue = ballsRef.current.find(b => b.id === 0 && !b.pocketed);
      if (cue && !aimTargetRef.current) {
        const curGroup = playerGroupRef.current;
        const legalBalls = ballsRef.current.filter(b => {
          if (b.pocketed || b.id === 0 || b.id === 8) return false;
          if (curGroup === 'solid') return !STRIPE_SET.has(b.id);
          if (curGroup === 'stripe') return STRIPE_SET.has(b.id);
          return true;
        });
        const tBall = legalBalls[0] || ballsRef.current.find(b => b.id === 8 && !b.pocketed) || { x: TABLE_W * 0.72, y: TABLE_H / 2 };
        const ang = Math.atan2(tBall.y - cue.y, tBall.x - cue.x);
        const defAim = {
          x: cue.x + Math.cos(ang) * 150,
          y: cue.y + Math.sin(ang) * 150
        };
        setAimTarget(defAim);
        aimTargetRef.current = defAim;
        smoothAimRef.current = defAim;
        setIsAimMode(true);
        isAimModeRef.current = true;
      }
    }
  }, [turn, gameStep, winner, pocketedBalls, isBallInHand]);

  const restart = () => {
    ballsRef.current = createBalls();
    pocketedThisTurnRef.current = new Set();
    particlesRef.current = [];
    sinkingBallsRef.current = [];
    isMovingRef.current  = false;
    cueBallJustShot.current = false;
    firstHitBallRef.current = null;
    smoothAimRef.current = null;
    cueStrikeRef.current = null;
    setIsBallInHand(false);
    isBallInHandRef.current = false;
    isDraggingCueBallRef.current = false;
    if (aiScheduleTimeoutRef.current) {
      clearTimeout(aiScheduleTimeoutRef.current);
      aiScheduleTimeoutRef.current = null;
    }
    setTurn('player');
    setTurnTimer(25);
    setTurnCount(c => c + 1);
    setPlayerGroup(null);
    setPocketedBalls([]);
    setWinner(null);
    setAimTarget(null);
    setIsAimMode(false);
    setPower(0);
    setSpin({ x: 0, y: 0 });
    setMessage('🎱 Arahkan bidikan lalu tarik stik ke bawah!');
  };

  const saveCoinsResult = () => {
    const u = localStorage.getItem('domino_username');
    const nc = winner === 'player' ? coins + selectedRoom.prize : Math.max(0, coins - selectedRoom.entry);
    localStorage.setItem('domino_coins', String(nc));
    if (!u) { onBack(); return; }
    fetch(`${API_URL}/users/${u}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coins: nc }),
    }).catch(() => {});
    onBack();
  };

  // ═══════════════════════════════════════════════════════════════
  //  STEP 1: ROOM SELECTION SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (gameStep === 'room_select') {
    const recommendedRoom = [...POOL_ROOMS]
      .filter(r => coins >= r.entry)
      .sort((a, b) => b.entry - a.entry)[0] || POOL_ROOMS[0];

    const filteredRooms = roomFilter === 'all'
      ? POOL_ROOMS
      : POOL_ROOMS.filter(r => r.tierCategory === roomFilter);

    return (
      <div className="billiard-screen pool8-room-screen">
        {/* Top Header */}
        <div className="pool8-room-header">
          <button className="bl-back-btn-rich" onClick={onBack}>
            <span className="btn-back-ico">«</span>
            <span>Lobi Utama</span>
          </button>
          
          <div className="pool8-room-header-center">
            <div className="pool8-room-title">🎱 PILIH ARENA TURNAMEN 1 ON 1</div>
            <div className="pool8-room-sub">Taklukkan 5 kota dunia, kumpulkan Cincin Juara & raih koin puluhan juta!</div>
          </div>

          <div className="pool8-room-user-chip">
            <div className="user-chip-avatar">
              {userAvatar && userAvatar.length <= 4 ? userAvatar : '👑'}
            </div>
            <div className="user-chip-info">
              <span className="user-chip-name">{username}</span>
              <span className="user-chip-coins">🪙 {coins.toLocaleString('id-ID')}</span>
            </div>
            <div className="user-chip-lvl">★ {userLevel}</div>
          </div>
        </div>

        {/* Filter Category Tabs */}
        <div className="pool8-room-tabs">
          {[
            { id: 'all', label: '🌐 Semua Arena' },
            { id: 'pemula', label: '⭐ Pemula (5K - 20K)' },
            { id: 'pro', label: '🔥 Pro Club (50K - 100K)' },
            { id: 'sultan', label: '👑 Sultan VIP (200K)' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`pool8-tab-btn ${roomFilter === tab.id ? 'active' : ''}`}
              onClick={() => setRoomFilter(tab.id as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Showcase Grid of Arena Cards */}
        <div className="pool8-room-showcase">
          {filteredRooms.map(room => {
            const canAfford = coins >= room.entry;
            const isRec = room.id === recommendedRoom.id;

            return (
              <div
                key={room.id}
                className={`pool8-arena-card ${!canAfford ? 'locked' : ''} ${isRec ? 'is-recommended' : ''}`}
                style={{
                  '--arena-accent': room.accentColor,
                  '--arena-bg': room.bg,
                } as React.CSSProperties}
                onClick={() => handleSelectRoom(room)}
              >
                {/* Background ambient lighting */}
                <div className="arena-card-ambient" style={{ background: room.bg }} />

                {/* Recommendation ribbon */}
                {isRec && (
                  <div className="arena-rec-ribbon">
                    <span>🔥 REKOMENDASI TERBAIK</span>
                  </div>
                )}

                {/* Top Row: Flag & Badges */}
                <div className="arena-card-header">
                  <div className="arena-city-badge">
                    <span className="arena-flag">{room.flag}</span>
                    <span className="arena-city-name">{room.city}</span>
                  </div>
                  <div className="arena-badge-group">
                    <span className="arena-badge-pill">{room.badge}</span>
                    <span className={`arena-tier-pill tier-${room.tier.toLowerCase()}`}>{room.tier}</span>
                  </div>
                </div>

                {/* 3D Tournament Ring Medallion */}
                <div className="arena-medallion-container">
                  <div className="arena-cue-left" />
                  <div className="arena-cue-right" />
                  <div
                    className="arena-ring-outer"
                    style={{
                      borderColor: room.accentColor,
                      boxShadow: `0 0 25px ${room.accentColor}55`
                    }}
                  >
                    <div
                      className="arena-ring-felt"
                      style={{
                        background: `radial-gradient(circle, ${room.feltColor} 0%, #030708 90%)`
                      }}
                    >
                      <div className="arena-8ball">
                        <span className="arena-8ball-num">8</span>
                      </div>
                      <span className="arena-center-flag">{room.flag}</span>
                    </div>
                  </div>
                  <div className="arena-ring-title-badge">
                    <span>🏆 {room.ringName}</span>
                  </div>
                </div>

                {/* Arena Title & Cloth info */}
                <div className="arena-title-section">
                  <div className="arena-title">{room.name}</div>
                  <div className="arena-cloth-tag">
                    <span className="cloth-dot" style={{ background: room.feltColor }} />
                    <span>Laken: {room.feltName}</span>
                  </div>
                </div>

                {/* Prize Pot Showcase Box */}
                <div className="arena-prize-box">
                  <div className="arena-prize-header">
                    <span className="arena-trophy-ico">🏆</span>
                    <span>TOTAL HADIAH JUARA</span>
                  </div>
                  <div className="arena-prize-amount">
                    <span className="arena-coin-ico">🪙</span>
                    <span className="arena-amount-num">{room.prize.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Entry fee & online stats */}
                <div className="arena-meta-box">
                  <div className="arena-meta-item">
                    <span className="arena-meta-label">Biaya Masuk:</span>
                    <span className="arena-meta-val entry">🪙 {room.entry.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="arena-meta-sep">•</div>
                  <div className="arena-meta-item">
                    <span className="arena-meta-label">Pemain Online:</span>
                    <span className="arena-meta-val online">
                      <span className="pulse-green-dot" />
                      {room.onlineCount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Action CTA Button */}
                <button
                  className={`arena-cta-btn ${!canAfford ? 'disabled' : ''}`}
                  disabled={!canAfford}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectRoom(room);
                  }}
                >
                  {canAfford ? (
                    <>
                      <span className="arena-cta-icon">▶</span>
                      <span>TANDING SEKARANG</span>
                    </>
                  ) : (
                    <>
                      <span className="arena-cta-icon">🔒</span>
                      <span>KOIN KURANG</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  STEP 2: MATCHMAKING SCREEN
  // ═══════════════════════════════════════════════════════════════
  if (gameStep === 'matching') {
    return (
      <div className="billiard-screen pool8-matching-screen">
        <div className="pool8-matching-overlay">
          <div className="pool8-matching-title">🎱 8-BALL POOL MATCHMAKING</div>
          <div className="pool8-vs-animation">
            <div className="pool8-match-player">
              <div className="pool8-match-avatar gold-border">
                {userAvatar && userAvatar.length <= 4 ? (
                  <div className="pool8-emoji-avatar">{userAvatar}</div>
                ) : (
                  <img src={userAvatar || 'https://i.pravatar.cc/100?img=33'} alt="Player" />
                )}
              </div>
              <div className="pool8-match-name">{username}</div>
              <div className="pool8-match-lvl purple-star">★ {userLevel}</div>
            </div>

            <div className="pool8-match-vs-wheel">
              <div className="pool8-vs-glow" />
              <div className="pool8-vs-txt">VS</div>
            </div>

            <div className="pool8-match-player">
              <div className="pool8-match-avatar purple-border">
                <img src={matchingAvatar} alt="Opponent" />
              </div>
              <div className="pool8-match-name">
                {matchStatus.includes('MUSUH DITEMUKAN') ? opponent.name : 'Mencari Lawan...'}
              </div>
              <div className="pool8-match-lvl blue-star">
                ★ {matchStatus.includes('MUSUH DITEMUKAN') ? opponent.level : '??'}
              </div>
            </div>
          </div>

          <div className="pool8-matching-status">{matchStatus}</div>
          {matchCountdown !== null ? (
            <div className="pool8-match-countdown">
              PERTANDINGAN DIMULAI DALAM: <span>{matchCountdown}</span>
            </div>
          ) : (
            <button className="pool8-match-cancel-btn" onClick={cancelMatchmaking}>
              ✖ Batalkan Pencarian
            </button>
          )}

          <div className="pool8-match-prize-info">
            Arena: <b>{selectedRoom.name}</b> • Hadiah Pemenang: <b>🪙 {selectedRoom.prize.toLocaleString('id-ID')}</b>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  STEP 3: PLAYING GAMEPLAY SCREEN
  // ═══════════════════════════════════════════════════════════════
  const myBalls = playerGroup === 'stripe' ? [9,10,11,12,13,14,15] : [1,2,3,4,5,6,7];
  const oppBalls = playerGroup === 'solid' ? [9,10,11,12,13,14,15] : [1,2,3,4,5,6,7];

  return (
    <div className="billiard-screen billiard-fullscreen">
      {/* ── TOP SCOREBOARD HUD (AUTHENTIC 8-BALL POOL) ── */}
      <div className="bl-header-overlay pool8-header">
        {/* Far Left: Green Square Menu Button */}
        <button
          className="pool8-green-menu-btn"
          onClick={() => setShowMenu(v => !v)}
          title="Menu Game"
        >
          <span>☰</span>
        </button>

        {/* Player 1 Box (Left - Susan / User) */}
        <div className="pool8-player-unit left">
          {/* Green Star Level Badge */}
          <div className="pool8-level-star green-star" title={`Level ${userLevel}`}>
            <span className="star-icon">★</span>
            <span className="star-text">{userLevel}</span>
          </div>

          {/* Yellow Chat Bubble Button */}
          <button
            className="pool8-chat-bubble-btn"
            onClick={() => setShowChatMenu(v => !v)}
            title="Kirim Obrolan Cepat"
          >
            <span className="chat-icon">💬</span>
          </button>

          {/* Player Metadata (Name, Timer Track, 7 Ball Sockets) */}
          <div className="pool8-player-meta">
            <div className="pool8-meta-name-row">
              <span className="pool8-meta-name">{username}</span>
              {playerGroup && (
                <span className="pool8-role-badge">
                  {playerGroup === 'solid' ? '● Solid (1-7)' : '◑ Stripe (9-15)'}
                </span>
              )}
            </div>

            {/* Turn Progress Timer Bar */}
            <div className="pool8-timer-track">
              <div
                className={`pool8-timer-fill green ${turn === 'player' ? 'active' : ''}`}
                style={{ width: turn === 'player' ? `${(turnTimer / 25) * 100}%` : '0%' }}
              />
            </div>

            {/* 7 Circular Ball Sockets */}
            <div className="pool8-sockets-row">
              {myBalls.map(id => {
                const isPocketed = pocketedBalls.includes(id);
                const isStripe = STRIPE_SET.has(id);
                const col = BALL_COLORS[id] || '#cbd5e1';
                if (isPocketed || playerGroup === null) {
                  return (
                    <div
                      key={id}
                      className="pool8-socket empty-socket"
                      title={playerGroup ? `Bola ${id} sudah masuk` : 'Tentukan grup bola'}
                    >
                      <div className="socket-inner-shadow" />
                    </div>
                  );
                }
                return (
                  <div
                    key={id}
                    className={`pool8-socket filled-ball ball-${id} ${isStripe ? 'stripe' : 'solid'}`}
                    style={{ backgroundColor: col }}
                    title={`Bola ${id} (${isStripe ? 'Stripe' : 'Solid'})`}
                  >
                    {isStripe && <div className="socket-stripe-white" />}
                    <div className="socket-num-patch">
                      <span className="socket-num-val">{id}</span>
                    </div>
                    <div className="socket-ball-glint" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Player Avatar with Turn Glow */}
          <div className="pool8-avatar-wrap">
            <div className={`pool8-avatar-square ${turn === 'player' ? 'active-player-glow' : ''}`}>
              {userAvatar && userAvatar.length <= 4 ? (
                <div className="pool8-emoji-avatar">{userAvatar}</div>
              ) : (
                <img src={userAvatar || 'https://i.pravatar.cc/100?img=33'} alt="Player" />
              )}
            </div>
            {/* Comic Floating Speech Bubble */}
            {activeChat?.sender === 'player' && (
              <div className="pool8-speech-bubble left-bubble">
                {activeChat.text}
                <div className="speech-tail-left" />
              </div>
            )}
          </div>
        </div>

        {/* Center Pot Box (Black Plaque with Gold Metallic Frame & Stacked Coins) */}
        <div className="pool8-center-pot">
          <div className="pool8-pot-frame">
            <div className="pool8-pot-coins-stack">🪙🪙🪙</div>
            <div className="pool8-pot-amount">
              {selectedRoom.prize.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        {/* Player 2 Box (Right - Brian / AI) */}
        <div className="pool8-player-unit right">
          {/* Opponent Avatar with Turn Glow */}
          <div className="pool8-avatar-wrap">
            <div className={`pool8-avatar-square ${turn === 'ai' ? 'active-ai-glow' : ''}`}>
              <img src={opponent.avatar} alt="Opponent" />
            </div>
            {/* Comic Floating Speech Bubble */}
            {activeChat?.sender === 'opponent' && (
              <div className="pool8-speech-bubble right-bubble">
                {activeChat.text}
                <div className="speech-tail-right" />
              </div>
            )}
          </div>

          {/* Opponent Metadata */}
          <div className="pool8-player-meta align-right">
            <div className="pool8-meta-name-row justify-end">
              {playerGroup && (
                <span className="pool8-role-badge">
                  {playerGroup === 'solid' ? '◑ Stripe (9-15)' : '● Solid (1-7)'}
                </span>
              )}
              <span className="pool8-meta-name">{oppDisplayName}</span>
            </div>

            {/* Turn Progress Timer Bar */}
            <div className="pool8-timer-track">
              <div
                className={`pool8-timer-fill red ${turn === 'ai' ? 'active' : ''}`}
                style={{ width: turn === 'ai' ? `${(turnTimer / 25) * 100}%` : '0%' }}
              />
            </div>

            {/* 7 Circular Ball Sockets for Opponent */}
            <div className="pool8-sockets-row justify-end">
              {oppBalls.map(id => {
                const isPocketed = pocketedBalls.includes(id);
                const isStripe = STRIPE_SET.has(id);
                const col = BALL_COLORS[id] || '#cbd5e1';
                if (isPocketed || playerGroup === null) {
                  return (
                    <div
                      key={id}
                      className="pool8-socket empty-socket"
                      title={playerGroup ? `Bola ${id} sudah masuk` : 'Tentukan grup bola'}
                    >
                      <div className="socket-inner-shadow" />
                    </div>
                  );
                }
                return (
                  <div
                    key={id}
                    className={`pool8-socket filled-ball ball-${id} ${isStripe ? 'stripe' : 'solid'}`}
                    style={{ backgroundColor: col }}
                    title={`Bola ${id} (${isStripe ? 'Stripe' : 'Solid'})`}
                  >
                    {isStripe && <div className="socket-stripe-white" />}
                    <div className="socket-num-patch">
                      <span className="socket-num-val">{id}</span>
                    </div>
                    <div className="socket-ball-glint" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Red Star Level Badge */}
          <div className="pool8-level-star red-star" title={`Level ${opponent.level}`}>
            <span className="star-icon">★</span>
            <span className="star-text">{opponent.level}</span>
          </div>
        </div>
      </div>

      {/* ── FLOATING 3D CUE BALL SPIN & STICK SWITCHER WIDGET (8 BALL POOL STYLE) ── */}
      <div className="pool8-floating-spin-widget">
        <button
          className="pool8-spin-btn-3d"
          onClick={() => setShowSpinModal(true)}
          title="Atur Titik Pukul Cue Ball (Top/Back/Side Spin)"
        >
          <div className="spin-sphere-3d">
            <div
              className="spin-red-hit-dot"
              style={{
                left: `calc(50% + ${spin.x * 14}px)`,
                top:  `calc(50% + ${spin.y * 14}px)`,
              }}
            />
          </div>
          <span className="spin-btn-badge">SPIN</span>
        </button>

        <button
          className="pool8-cue-switcher-btn"
          onClick={() => setShowCueModal(true)}
          title="Ganti Stik Biliar"
        >
          <span className="cue-btn-icon">🥢</span>
        </button>
      </div>

      {/* ── GAME MENU DROPDOWN (ALIGNED UNDER GREEN HAMBURGER BUTTON ON LEFT) ── */}
      <GameMenuDropdown
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        align="left"
        className="pool8-menu"
        items={[
          { id: 'lobi', icon: '🚪', label: 'Keluar ke Lobi', onClick: () => { setShowMenu(false); setShowExitConfirm(true); } },
          { id: 'restart', icon: '🔄', label: 'Mulai Ulang', onClick: () => { setShowMenu(false); restart(); } },
          { id: 'stik', icon: '🥢', label: 'Ganti Stik Biliar', onClick: () => { setShowMenu(false); setShowCueModal(true); } },
          { id: 'suara', icon: '🔊', label: 'Suara Meja', badge: soundOn ? 'ON' : 'OFF', onClick: () => setSoundOn(v => !v) },
          { id: 'bantuan', icon: '📖', label: 'Panduan Main', onClick: () => { setShowMenu(false); setShowHelp(true); } }
        ]}
      />

      {/* ── QUICK CHAT DROPDOWN MENU ── */}
      {showChatMenu && (
        <div className="pool8-chat-dropdown-overlay" onClick={() => setShowChatMenu(false)}>
          <div className="pool8-chat-dropdown" onClick={e => e.stopPropagation()}>
            <div className="pool8-chat-dropdown-header">
              <span>💬 Pesan Cepat</span>
              <button onClick={() => setShowChatMenu(false)}>✕</button>
            </div>
            <div className="pool8-chat-options-grid">
              {QUICK_CHATS.map((msg) => (
                <button
                  key={msg}
                  className="pool8-chat-option-btn"
                  onClick={() => handleSendChat(msg)}
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CUE STICK SELECTION MODAL ── */}
      {showCueModal && (
        <div className="pool8-modal-overlay" onClick={() => setShowCueModal(false)}>
          <div className="pool8-cue-modal" onClick={e => e.stopPropagation()}>
            <div className="pool8-cue-modal-header">
              <h3>🥢 Koleksi Stik Biliar Juara</h3>
              <button className="pool8-modal-close-btn" onClick={() => setShowCueModal(false)}>✕</button>
            </div>
            <div className="pool8-cue-grid">
              {CUE_STICK_OPTIONS.map((cue) => {
                const isSelected = cueSkin === cue.id;
                return (
                  <div
                    key={cue.id}
                    className={`pool8-cue-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setCueSkin(cue.id);
                      setShowCueModal(false);
                      setMessage(`Stik ${cue.name} siap digunakan! 🥢`);
                    }}
                  >
                    <div className="pool8-cue-card-top">
                      <span className="pool8-cue-name">{cue.name}</span>
                      <span className="pool8-cue-badge">{cue.badge}</span>
                    </div>
                    {/* Visual Cue Graphic Representation */}
                    <div className="pool8-cue-preview-bar">
                      <div className="cue-bar-tip" />
                      <div className="cue-bar-shaft" style={{ background: cue.gradient }} />
                      <div className="cue-bar-wrap" />
                      <div className="cue-bar-butt" />
                    </div>
                    <div className="pool8-cue-desc">{cue.desc}</div>
                    <button className={`pool8-cue-select-btn ${isSelected ? 'active' : ''}`}>
                      {isSelected ? '✓ Terpasang' : 'Pilih Stik'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CUE BALL SPIN SELECTION MODAL (CENTERED FULLSCREEN OVERLAY) ── */}
      <SpinBallModal
        isOpen={showSpinModal}
        onClose={() => setShowSpinModal(false)}
        spin={spin}
        onChange={setSpin}
      />

      {/* ── CANVAS FILL & ARENA VIEWPORT (VERTICAL CUE + TABLE + CHROME TRACK) ── */}
      <div className="bl-canvas-fill pool8-arena-wrap">
        {/* Left Side: Vertical Cue Stick Power Slider (8 Ball Pool Pull-to-Charge & Release) */}
        <div className="pool8-vertical-cue-wrap">
          {/* Power LED Meter */}
          <div className="pool8-vcue-gauge">
            <div
              className={`pool8-vcue-gauge-fill ${isDraggingCue ? 'dragging' : ''}`}
              style={{
                height: `${power * 100}%`,
                background: power < 0.38
                  ? 'linear-gradient(0deg, #22c55e, #4ade80)'
                  : power < 0.72
                  ? 'linear-gradient(0deg, #22c55e, #facc15)'
                  : 'linear-gradient(0deg, #22c55e, #facc15 60%, #ef4444 100%)',
              }}
            />
            {/* Graduated Power Ticks */}
            <div className="pool8-vcue-ticks">
              <span className="vcue-tick" style={{ bottom: '20%' }} />
              <span className="vcue-tick" style={{ bottom: '40%' }} />
              <span className="vcue-tick" style={{ bottom: '60%' }} />
              <span className="vcue-tick" style={{ bottom: '80%' }} />
            </div>
            <div className="pool8-vcue-gauge-pct">{Math.round(power * 100)}%</div>
          </div>

          {/* Vertical Cue Track (Pull Down to Charge, Release to Shoot) */}
          <div
            className="pool8-vcue-track"
            ref={verticalCueTrackRef}
            onMouseDown={onVCueMouseDown}
            onTouchStart={onVCueTouchStart}
            title="Tarik stik ke bawah lalu lepaskan untuk memukul bola"
          >
            {/* White cue ball target at top of track */}
            <div className="pool8-vcue-ball-target" />

            <div
              className={`pool8-vcue-stick ${isDraggingCue ? 'dragging' : ''}`}
              style={{
                transform: `translateY(${power * 130}px)`,
              }}
            >
              <div className="vcue-tip" />
              <div className="vcue-ferrule" />
              <div className={`vcue-shaft ${cueSkin}`} />
              <div className="vcue-wrap" />
              <div className="vcue-butt" />
            </div>

            {/* Subtle pull guide prompt */}
            {turn === 'player' && !isMovingRef.current && (
              <div className="pool8-vcue-pull-hint">
                <span className="pull-hint-arrow">▼</span>
                <span className="pull-hint-text">TARIK</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Pool Table Canvas & Lamp */}
        <div className="pool8-table-holder">
          {/* Ball in Hand Banner on top of table */}
          {isBallInHand && turn === 'player' && (
            <div className="pool8-ball-in-hand-banner">
              <span className="bih-icon">🎱</span>
              <div className="bih-text">
                <b>BALL IN HAND AKTIF!</b>
                <span>Geser bola putih ke posisi mana saja di meja</span>
              </div>
              <button
                className="bih-confirm-btn"
                onClick={confirmBallInHand}
              >
                ✓ Siap Membidik
              </button>
            </div>
          )}

          <div className="pool8-hanging-lamp">
            <div className="lamp-chain chain-left" />
            <div className="lamp-shade shade-left" />
            <div className="lamp-bar" />
            <div className="lamp-shade shade-right" />
            <div className="lamp-chain chain-right" />
            <div className="lamp-cone cone-left" />
            <div className="lamp-cone cone-right" />
          </div>

          <canvas
            ref={canvasRef}
            width={TABLE_W}
            height={TABLE_H}
            className="bl-canvas-fs"
            style={{ cursor: isBallInHand ? 'grab' : turn === 'player' && !isMovingRef.current ? 'crosshair' : 'default', touchAction: 'none' }}
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
            onTouchStart={onCanvasTouchStart}
            onTouchMove={onCanvasTouchMove}
            onTouchEnd={onCanvasTouchEnd}
          />
        </div>

        {/* Right Side: Curved Tubular Chrome Ball Return Track */}
        <div className="pool8-ball-return-rail" title="Jalur Kembali Bola Masuk">
          <div className="chrome-inlet-curve" />
          <div className="chrome-twin-pipes">
            <div className="pipe-line left-pipe" />
            <div className="pipe-line right-pipe" />

            {/* Vertically Stacked Pocketed Balls */}
            <div className="chrome-balls-stack">
              {pocketedBalls.filter(id => id !== 0).map((id) => {
                const isStripe = STRIPE_SET.has(id);
                const col = BALL_COLORS[id] || '#cbd5e1';
                return (
                  <div
                    key={id}
                    className={`chrome-ball ball-${id} ${isStripe ? 'stripe-ball' : 'solid-ball'}`}
                    style={{ backgroundColor: col }}
                    title={`Bola ${id} (${isStripe ? 'Stripe' : 'Solid'})`}
                  >
                    {isStripe && <div className="chrome-stripe-band" />}
                    <div className="chrome-ball-patch">
                      <span className="chrome-ball-num">{id}</span>
                    </div>
                    <div className="chrome-ball-glint" />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="chrome-bottom-cup" />
        </div>
      </div>

      {/* ── FLOATING STATUS PILL & QUICK ACTIONS AT BOTTOM ── */}
      <div className="pool8-bottom-bar">
        <button
          className={`pool8-quick-btn ${soundOn ? 'active' : ''}`}
          onClick={() => setSoundOn(v => !v)}
          title="Toggle Suara Meja"
        >
          {soundOn ? '🔊' : '🔇'}
        </button>

        <div className="pool8-bottom-status-pill">
          {message}
        </div>

        <button
          className="pool8-quick-btn"
          onClick={() => setShowHelp(true)}
          title="Panduan Bermain"
        >
          ❓
        </button>
      </div>

      {/* ── EXIT CONFIRMATION MODAL ── */}
      {showExitConfirm && (
        <div className="bl-overlay" onClick={() => setShowExitConfirm(false)}>
          <div className="bl-modal" onClick={e => e.stopPropagation()}>
            <div className="bl-modal-icon">⚠️</div>
            <h2 className="bl-modal-title">Keluar dari Meja?</h2>
            <p className="bl-modal-sub">
              Pertandingan sedang berlangsung. Jika Anda keluar sekarang, taruhan <b>🪙 {selectedRoom.entry.toLocaleString('id-ID')}</b> tidak dapat dikembalikan!
            </p>
            <button className="bl-btn-cancel" onClick={() => setShowExitConfirm(false)}>
              Tetap Main
            </button>
            <button
              className="bl-btn-start"
              style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
              onClick={() => { setShowExitConfirm(false); onBack(); }}
            >
              Ya, Keluar ke Lobi
            </button>
          </div>
        </div>
      )}

      {/* ── HELP / RULES MODAL ── */}
      {showHelp && (
        <div className="bl-overlay" onClick={() => setShowHelp(false)}>
          <div className="bl-help-box" onClick={e => e.stopPropagation()}>
            <h3>📖 Panduan Bermain 8-Ball Pool VIP</h3>
            <ul>
              <li>🖱️ <b>Arahkan Stik:</b> Klik atau geser mouse/jari di atas meja untuk memutar stik ke sasaran (otomatis membidik saat giliran dimulai).</li>
              <li>⚡ <b>Tarik Stik (8 Ball Pool):</b> Tarik stik di sebelah kiri ke bawah untuk mengisi daya kekuatan pukulan.</li>
              <li>💥 <b>Lepaskan untuk Menembak:</b> Lepaskan tarikan stik (kekuatan &gt; 8%) untuk memukul bola putih secara otomatis!</li>
              <li>🎯 <b>Titik Pukul &amp; Spin:</b> Tekan bola putih di kanan atas untuk memberi efek Top spin (maju), Back spin (tarik mundur), atau Side spin.</li>
              <li>🎱 <b>Aturan Menang:</b> Masukkan seluruh 7 bola grup Anda (Solid 1-7 atau Stripe 9-15), kemudian masukkan bola hitam <b>8</b> ke kantong.</li>
              <li>⚠️ <b>Foul:</b> Jangan biarkan bola putih masuk ke kantong karena giliran akan berpindah ke lawan!</li>
            </ul>
            <button className="bl-btn-cancel" onClick={() => setShowHelp(false)}>Tutup Panduan</button>
          </div>
        </div>
      )}

      {/* ── GAME OVER RESULT MODAL ── */}
      {winner && (
        <div className="bl-overlay">
          <div className={`bl-modal ${winner === 'player' ? 'win' : 'lose'}`}>
            <div className="bl-modal-icon">{winner === 'player' ? '🏆' : '😢'}</div>
            <h2 className="bl-modal-title">{winner === 'player' ? 'KEMENANGAN TELAK!' : 'ANDA KALAH!'}</h2>
            <p className="bl-modal-sub">
              {winner === 'player'
                ? `Selamat! Anda berhasil memenangkan hadiah 🪙 +${selectedRoom.prize.toLocaleString('id-ID')}!`
                : `Sayang sekali! Anda kehilangan taruhan 🪙 -${selectedRoom.entry.toLocaleString('id-ID')}.`}
            </p>
            <div className="bl-coins-row">
              Saldo Baru: 🪙 {(winner === 'player' ? coins + selectedRoom.prize : Math.max(0, coins - selectedRoom.entry)).toLocaleString('id-ID')}
            </div>
            <button className="bl-btn-start" onClick={saveCoinsResult}>
              {winner === 'player' ? '🎁 Klaim Hadiah &amp; Kembali' : '🔙 Kembali ke Lobi'}
            </button>
            <button className="bl-btn-cancel" onClick={restart}>🔄 Tanding Ulang</button>
          </div>
        </div>
      )}
    </div>
  );
}
