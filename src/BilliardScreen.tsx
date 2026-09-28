import { useEffect, useRef, useState, useCallback } from 'react';
import './billiard.css';
import GameMenuDropdown from './GameMenuDropdown';

// ═══════════════════════════════════════════════════════════════
//  CONSTANTS
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
  { x: RAIL_W - 2,           y: RAIL_W - 2 },
  { x: TABLE_W / 2,          y: RAIL_W - 14 },
  { x: TABLE_W - RAIL_W + 2, y: RAIL_W - 2 },
  { x: RAIL_W - 2,           y: TABLE_H - RAIL_W + 2 },
  { x: TABLE_W / 2,          y: TABLE_H - RAIL_W + 14 },
  { x: TABLE_W - RAIL_W + 2, y: TABLE_H - RAIL_W + 2 },
];

const BALL_COLORS: Record<number, string> = {
  0: '#f5f0e8',
  1: '#e6b800', 2: '#1a5cb5', 3: '#d63030', 4: '#7b2fbe',
  5: '#d45a00', 6: '#1a6e1a', 7: '#8b1a34',
  8: '#1a1a1a',
  9: '#e6b800', 10: '#1a5cb5', 11: '#d63030', 12: '#7b2fbe',
  13: '#d45a00', 14: '#1a6e1a', 15: '#8b1a34',
};
const STRIPE_SET = new Set([9, 10, 11, 12, 13, 14, 15]);

// ═══════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════
interface Ball { id: number; x: number; y: number; vx: number; vy: number; pocketed: boolean; angle: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; r: number; }
interface SpinState { x: number; y: number; }
// orbitR = current spiral distance from pocket center; orbitAngle = current orbit angle
interface SinkingBall { id: number; x: number; y: number; px: number; py: number; progress: number; color: string; rollAngle: number; orbitR: number; orbitAngle: number; }

export const POOL_ROOMS = [
  { id: 'london',  name: 'London Pub',      entry: 50000,   prize: 100000,   city: 'London',    flag: '🇬🇧', tier: 'Pemula', minLevel: 1,  bg: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)' },
  { id: 'sydney',  name: 'Sydney Marina',   entry: 250000,  prize: 500000,   city: 'Sydney',    flag: '🇦🇺', tier: 'Menengah', minLevel: 3, bg: 'linear-gradient(135deg, #065f46, #059669)' },
  { id: 'jakarta', name: 'Jakarta Club',    entry: 1000000, prize: 2000000,  city: 'Jakarta',   flag: '🇮🇩', tier: 'Pro', minLevel: 5,      bg: 'linear-gradient(135deg, #7c2d12, #ea580c)' },
  { id: 'tokyo',   name: 'Tokyo Arena',     entry: 5000000, prize: 10000000, city: 'Tokyo',     flag: '🇯🇵', tier: 'Master', minLevel: 10,  bg: 'linear-gradient(135deg, #581c87, #9333ea)' },
  { id: 'vegas',   name: 'Las Vegas VIP',   entry: 25000000,prize: 50000000, city: 'Las Vegas', flag: '🇺🇸', tier: 'Raja', minLevel: 20,    bg: 'linear-gradient(135deg, #831843, #db2777)' },
];

const OPPONENT_LIST = [
  { name: 'Mike', level: 46, avatar: 'https://i.pravatar.cc/100?img=68' },
  { name: 'Sarah', level: 52, avatar: 'https://i.pravatar.cc/100?img=44' },
  { name: 'Budi_Pro', level: 39, avatar: 'https://i.pravatar.cc/100?img=12' },
  { name: 'Alex_8Ball', level: 61, avatar: 'https://i.pravatar.cc/100?img=60' },
  { name: 'David_Pool', level: 48, avatar: 'https://i.pravatar.cc/100?img=33' }
];

// ═══════════════════════════════════════════════════════════════
//  RACK POSITIONS
// ═══════════════════════════════════════════════════════════════
function createBalls(): Ball[] {
  const balls: Ball[] = [];
  balls.push({ id: 0, x: TABLE_W * 0.26, y: TABLE_H / 2, vx: 0, vy: 0, pocketed: false, angle: 0 });
  const rack = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  const sx = TABLE_W * 0.68, sy = TABLE_H / 2, sp = BALL_R * 2.08;
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
//  PHYSICS
// ═══════════════════════════════════════════════════════════════
function spawnParticles(arr: Particle[], x: number, y: number, color: string, n: number) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = Math.random() * 3 + 0.5;
    arr.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 1, life: 1, color, r: Math.random() * 2.5 + 1 });
  }
}

function physicsStep(
  balls: Ball[],
  pocketedSet: Set<number>,
  particles: Particle[],
  sinkingBalls: SinkingBall[],
  spin: SpinState,
  cueBallJustShot: { current: boolean }
): boolean {
  let moving = false;

  for (const b of balls) {
    if (b.pocketed) continue;
    b.x += b.vx; b.y += b.vy;
    b.vx *= FRICTION; b.vy *= FRICTION;
    // Rolling rotation: angle accumulates based on speed & direction (circumference = 2πR)
    const spd = Math.hypot(b.vx, b.vy);
    if (spd < MIN_SPEED) { b.vx = 0; b.vy = 0; } else {
      moving = true;
      // Rotate in the direction of travel (right = +angle, left = -angle)
      b.angle += spd / BALL_R * Math.sign(b.vx || 1);
    }

    // Cushion collisions
    const restitution = 0.74;
    if (b.x - BALL_R < PLAY_LEFT)   { b.x = PLAY_LEFT  + BALL_R; b.vx =  Math.abs(b.vx) * restitution; spawnParticles(particles, b.x, b.y, '#c8883a', 3); }
    if (b.x + BALL_R > PLAY_RIGHT)  { b.x = PLAY_RIGHT - BALL_R; b.vx = -Math.abs(b.vx) * restitution; spawnParticles(particles, b.x, b.y, '#c8883a', 3); }
    if (b.y - BALL_R < PLAY_TOP)    { b.y = PLAY_TOP   + BALL_R; b.vy =  Math.abs(b.vy) * restitution; spawnParticles(particles, b.x, b.y, '#c8883a', 3); }
    if (b.y + BALL_R > PLAY_BOTTOM) { b.y = PLAY_BOTTOM - BALL_R; b.vy = -Math.abs(b.vy) * restitution; spawnParticles(particles, b.x, b.y, '#c8883a', 3); }

    // Pocket check → start sinking animation
    for (const p of POCKETS) {
      if (Math.hypot(b.x - p.x, b.y - p.y) < POCKET_R) {
        b.pocketed = true; b.vx = 0; b.vy = 0;
        pocketedSet.add(b.id);
        // Compute entry angle relative to pocket center
        const entryAngle = Math.atan2(b.y - p.y, b.x - p.x);
        const entryDist  = Math.hypot(b.x - p.x, b.y - p.y);
        // Start realistic spiral-drain animation
        sinkingBalls.push({
          id: b.id, x: b.x, y: b.y, px: p.x, py: p.y,
          progress: 0, color: BALL_COLORS[b.id] ?? '#aaa',
          rollAngle: b.angle,
          orbitR: Math.min(entryDist, POCKET_R * 0.85),
          orbitAngle: entryAngle,
        });
        // Sparks burst
        spawnParticles(particles, b.x, b.y, BALL_COLORS[b.id] ?? '#fff', 14);
        break;
      }
    }
  }

  // Ball-ball collisions
  const active = balls.filter(b => !b.pocketed);
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist < BALL_R * 2 && dist > 0) {
        const nx = dx / dist, ny = dy / dist;
        const overlap = (BALL_R * 2 - dist) / 2;
        a.x -= nx * overlap; a.y -= ny * overlap;
        b.x += nx * overlap; b.y += ny * overlap;

        const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
        const dot = dvx * nx + dvy * ny;
        if (dot > 0) {
          const e   = 0.97;
          const imp = dot * (1 + e) * 0.5;
          const wasA = (a.id === 0 && cueBallJustShot.current);

          a.vx -= imp * nx; a.vy -= imp * ny;
          b.vx += imp * nx; b.vy += imp * ny;

          if (wasA) {
            cueBallJustShot.current = false;
            const spinEffect = -spin.y;
            a.vx += nx * spinEffect * imp * 0.5;
            a.vy += ny * spinEffect * imp * 0.5;
            a.vx += -ny * spin.x * imp * 0.25;
            a.vy +=  nx * spin.x * imp * 0.25;
          }
          spawnParticles(particles, (a.x + b.x) / 2, (a.y + b.y) / 2, '#ffffffcc', 5);
        }
      }
    }
  }

  // Update particles
  for (let k = particles.length - 1; k >= 0; k--) {
    const p = particles[k];
    p.x += p.vx; p.y += p.vy; p.vy += 0.06;
    p.life -= 0.035;
    if (p.life <= 0) particles.splice(k, 1);
  }

  // Update sinking balls with realistic spiral-drain physics
  for (let k = sinkingBalls.length - 1; k >= 0; k--) {
    const s = sinkingBalls[k];
    // Accelerate progress (faster near end = sucked in)
    const accel = 0.028 + s.progress * 0.035;
    s.progress += accel;
    // Orbit: spin faster and tighter as it sinks
    const orbitSpeed = 0.08 + s.progress * 0.25;  // rad/frame, speeds up
    s.orbitAngle  += orbitSpeed;
    s.orbitR      *= (1 - 0.055 - s.progress * 0.04); // shrinks toward 0
    // Roll angle continues spinning fast
    s.rollAngle += 0.22 + s.progress * 0.4;
    // Recompute x,y from orbit
    s.x = s.px + Math.cos(s.orbitAngle) * s.orbitR;
    s.y = s.py + Math.sin(s.orbitAngle) * s.orbitR;
    if (s.progress >= 1 || s.orbitR < 0.5) sinkingBalls.splice(k, 1);
  }

  return moving;
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
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
//  DRAW
// ═══════════════════════════════════════════════════════════════
function drawScene(
  ctx: CanvasRenderingContext2D,
  balls: Ball[],
  aimTarget: { x: number; y: number } | null,
  power: number,
  isAimMode: boolean,
  particles: Particle[],
  sinkingBalls: SinkingBall[]
) {
  const W = TABLE_W, H = TABLE_H;

  // ── Wood frame / outer border ────────────────────────
  const woodGrad = ctx.createLinearGradient(0, 0, W, H);
  woodGrad.addColorStop(0,   '#8B4513');
  woodGrad.addColorStop(0.3, '#A0522D');
  woodGrad.addColorStop(0.5, '#6B3010');
  woodGrad.addColorStop(0.7, '#A0522D');
  woodGrad.addColorStop(1,   '#5C2A0A');
  ctx.fillStyle = woodGrad;
  ctx.fillRect(0, 0, W, H);

  // Wood grain texture
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 20; i++) {
    const x = (i / 20) * W;
    ctx.strokeStyle = i % 3 === 0 ? '#000' : '#fff';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 30, H); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Frame bevel outer
  ctx.strokeStyle = '#ffd080';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, W-4, H-4);

  // Frame bevel inner
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(RAIL_W-1, RAIL_W-1, W-RAIL_W*2+2, H-RAIL_W*2+2);

  // ── Felt surface ─────────────────────────────────────
  const feltGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.6);
  feltGrad.addColorStop(0,   '#1e7a40');
  feltGrad.addColorStop(0.5, '#1a6a35');
  feltGrad.addColorStop(1,   '#134f28');
  ctx.fillStyle = feltGrad;
  ctx.fillRect(RAIL_W, RAIL_W, W-RAIL_W*2, H-RAIL_W*2);

  // Felt cloth texture weave
  ctx.save();
  ctx.beginPath();
  ctx.rect(RAIL_W, RAIL_W, W-RAIL_W*2, H-RAIL_W*2);
  ctx.clip();
  for (let tx = RAIL_W; tx < W-RAIL_W; tx += 6) {
    ctx.strokeStyle = 'rgba(0,0,0,0.022)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tx, RAIL_W); ctx.lineTo(tx, H-RAIL_W); ctx.stroke();
  }
  for (let ty = RAIL_W; ty < H-RAIL_W; ty += 6) {
    ctx.strokeStyle = 'rgba(255,255,255,0.015)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(RAIL_W, ty); ctx.lineTo(W-RAIL_W, ty); ctx.stroke();
  }
  ctx.restore();

  // Felt radial highlight centre
  const fh = ctx.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2.2);
  fh.addColorStop(0, 'rgba(80,220,120,0.12)');
  fh.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.fillStyle = fh;
  ctx.fillRect(RAIL_W, RAIL_W, W-RAIL_W*2, H-RAIL_W*2);

  // ── Rubber cushion strips ────────────────────────────
  ctx.fillStyle = '#1f8045';
  // top
  ctx.fillRect(RAIL_W+2, RAIL_W-5, W-RAIL_W*2-4, 6);
  // bottom
  ctx.fillRect(RAIL_W+2, H-RAIL_W-1, W-RAIL_W*2-4, 6);
  // left
  ctx.fillRect(RAIL_W-5, RAIL_W+2, 6, H-RAIL_W*2-4);
  // right
  ctx.fillRect(W-RAIL_W-1, RAIL_W+2, 6, H-RAIL_W*2-4);

  // ── Diamond rail markers ─────────────────────────────
  const dPositions = [0.25, 0.5, 0.75];
  for (const t of dPositions) {
    // top
    const mx1 = RAIL_W + t * (W - RAIL_W*2);
    ctx.beginPath(); ctx.arc(mx1, RAIL_W - 14, 3.5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,220,120,0.85)'; ctx.fill();
    ctx.strokeStyle = 'rgba(180,140,60,0.8)'; ctx.lineWidth = 0.8; ctx.stroke();
    // bottom
    ctx.beginPath(); ctx.arc(mx1, H - RAIL_W + 14, 3.5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,220,120,0.85)'; ctx.fill(); ctx.stroke();
    // left
    const my1 = RAIL_W + t * (H - RAIL_W*2);
    ctx.beginPath(); ctx.arc(RAIL_W - 14, my1, 3.5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,220,120,0.85)'; ctx.fill(); ctx.stroke();
    // right
    ctx.beginPath(); ctx.arc(W - RAIL_W + 14, my1, 3.5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,220,120,0.85)'; ctx.fill(); ctx.stroke();
  }

  // ── Reference markers ───────────────────────────────
  const mColor = 'rgba(255,255,255,0.2)';
  // Head string
  ctx.strokeStyle = mColor; ctx.lineWidth = 0.8; ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.moveTo(TABLE_W * 0.26, RAIL_W + 14);
  ctx.lineTo(TABLE_W * 0.26, H - RAIL_W - 14);
  ctx.stroke();
  ctx.setLineDash([]);
  // D semi-circle
  ctx.beginPath();
  ctx.arc(TABLE_W * 0.26, H / 2, 36, -Math.PI/2, Math.PI/2);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 0.8; ctx.stroke();
  // Spots
  [{ x: W/2, y: H/2 }, { x: TABLE_W * 0.68, y: H/2 }].forEach(pt => {
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI*2);
    ctx.fillStyle = mColor; ctx.fill();
  });

  // ── Pockets ──────────────────────────────────────────
  for (const p of POCKETS) {
    // Shadow
    ctx.beginPath(); ctx.arc(p.x, p.y, POCKET_R + 6, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
    // Leather cup
    const pg = ctx.createRadialGradient(p.x-3, p.y-3, 1, p.x, p.y, POCKET_R+4);
    pg.addColorStop(0,   '#1a0800');
    pg.addColorStop(0.65,'#100500');
    pg.addColorStop(0.85,'#2d1800');
    pg.addColorStop(1,   '#4a2500');
    ctx.beginPath(); ctx.arc(p.x, p.y, POCKET_R+4, 0, Math.PI*2);
    ctx.fillStyle = pg; ctx.fill();
    // Pocket void center
    ctx.beginPath(); ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI*2);
    ctx.fillStyle = '#000'; ctx.fill();
    // Leather edge ring
    ctx.beginPath(); ctx.arc(p.x, p.y, POCKET_R+4, 0, Math.PI*2);
    ctx.strokeStyle = '#5a3008'; ctx.lineWidth = 2.5; ctx.stroke();
    // Subtle shine
    ctx.beginPath(); ctx.arc(p.x-5, p.y-5, 5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,180,80,0.07)'; ctx.fill();
  }

  // ── Aim system ───────────────────────────────────────
  const cueBall = balls.find(b => b.id === 0 && !b.pocketed);
  if (isAimMode && cueBall && aimTarget) {
    const dx = cueBall.x - aimTarget.x, dy = cueBall.y - aimTarget.y;
    const len = Math.hypot(dx, dy);
    if (len > 5) {
      const nx = dx / len, ny = dy / len;

      // ── Aim line (two-tone dashed) ───────────────────
      ctx.save();
      // Shadow behind the line
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur  = 4;
      ctx.setLineDash([9, 7]);
      ctx.strokeStyle = 'rgba(255,255,220,0.30)';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(cueBall.x + nx * (BALL_R + 2), cueBall.y + ny * (BALL_R + 2));
      ctx.lineTo(cueBall.x + nx * 320, cueBall.y + ny * 320);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Ghost cue ball at projected position
      const ghostX = cueBall.x + nx * Math.min(len * 0.55, 160);
      const ghostY = cueBall.y + ny * Math.min(len * 0.55, 160);
      ctx.beginPath(); ctx.arc(ghostX, ghostY, BALL_R, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth   = 1.5; ctx.stroke();
      ctx.fillStyle   = 'rgba(255,255,255,0.07)'; ctx.fill();

      ctx.restore();

      // ── CUE STICK (realistic tapered billiard cue) ───
      const pullBack = 20 + power * 60;          // How far cue is pulled back
      const cueLen   = 260;                       // Visible cue length (pixels)
      const tipOffset = BALL_R + 3 + pullBack;    // Distance of cue tip from cue ball center

      // Cue tip position (behind cue ball in aiming direction)
      const tipX = cueBall.x - nx * tipOffset;
      const tipY = cueBall.y - ny * tipOffset;
      // Cue butt position
      const buttX = tipX - nx * cueLen;
      const buttY = tipY - ny * cueLen;

      // Tapering the cue (tip is narrow, butt is wider)
      // We draw the cue as a polygon with 4 vertices
      const perpX = -ny, perpY = nx; // perpendicular unit vector
      const TIP_W  = 2.5;  // half-width at tip
      const BUTT_W = 8;    // half-width at butt

      ctx.save();

      // Shadow for cue
      ctx.shadowColor  = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur   = 8;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      // Cue body gradient along shaft
      const cueGrad = ctx.createLinearGradient(tipX, tipY, buttX, buttY);
      cueGrad.addColorStop(0,    '#dfc88a');  // pale tip
      cueGrad.addColorStop(0.05, '#c8a462');
      cueGrad.addColorStop(0.35, '#a07830');  // mid maple
      cueGrad.addColorStop(0.60, '#8b5e20');
      cueGrad.addColorStop(0.72, '#c8a050');  // wrap area
      cueGrad.addColorStop(0.80, '#5c3010');  // butt
      cueGrad.addColorStop(1,    '#2a1006');

      // Draw tapered shaft
      ctx.beginPath();
      ctx.moveTo(tipX  + perpX * TIP_W,  tipY  + perpY * TIP_W);
      ctx.lineTo(buttX + perpX * BUTT_W, buttY + perpY * BUTT_W);
      ctx.lineTo(buttX - perpX * BUTT_W, buttY - perpY * BUTT_W);
      ctx.lineTo(tipX  - perpX * TIP_W,  tipY  - perpY * TIP_W);
      ctx.closePath();
      ctx.fillStyle = cueGrad;
      ctx.fill();

      // Shaft highlight stripe (sheen along the cue)
      const shineGrad = ctx.createLinearGradient(
        tipX  + perpX * TIP_W,  tipY  + perpY * TIP_W,
        tipX  - perpX * TIP_W,  tipY  - perpY * TIP_W
      );
      shineGrad.addColorStop(0,    'rgba(255,255,255,0)');
      shineGrad.addColorStop(0.35, 'rgba(255,255,255,0.22)');
      shineGrad.addColorStop(0.5,  'rgba(255,255,255,0.32)');
      shineGrad.addColorStop(0.65, 'rgba(255,255,255,0.10)');
      shineGrad.addColorStop(1,    'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.moveTo(tipX  + perpX * TIP_W,  tipY  + perpY * TIP_W);
      ctx.lineTo(buttX + perpX * BUTT_W, buttY + perpY * BUTT_W);
      ctx.lineTo(buttX - perpX * BUTT_W, buttY - perpY * BUTT_W);
      ctx.lineTo(tipX  - perpX * TIP_W,  tipY  - perpY * TIP_W);
      ctx.closePath();
      ctx.fillStyle = shineGrad;
      ctx.fill();

      // Wrap / collar rings (3 dark bands near butt)
      const wrapStart = 0.66;
      for (let r = 0; r < 5; r++) {
        const t = wrapStart + r * 0.045;
        const wx = tipX + (buttX - tipX) * t;
        const wy = tipY + (buttY - tipY) * t;
        const hw = TIP_W + (BUTT_W - TIP_W) * t;
        ctx.beginPath();
        ctx.moveTo(wx + perpX * hw, wy + perpY * hw);
        ctx.lineTo(wx - perpX * hw, wy - perpY * hw);
        ctx.strokeStyle = r % 2 === 0 ? 'rgba(0,0,0,0.55)' : 'rgba(255,220,100,0.35)';
        ctx.lineWidth = 1.2; ctx.stroke();
      }

      // Ferrule (white ring just behind tip)
      const ferruleT  = 0.06;
      const ferruleX  = tipX + (buttX - tipX) * ferruleT;
      const ferruleY  = tipY + (buttY - tipY) * ferruleT;
      const ferruleHW = TIP_W + (BUTT_W - TIP_W) * ferruleT;
      ctx.beginPath();
      ctx.moveTo(ferruleX + perpX * ferruleHW, ferruleY + perpY * ferruleHW);
      ctx.lineTo(ferruleX - perpX * ferruleHW, ferruleY - perpY * ferruleHW);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.stroke();

      // Cue tip (chalk blue rounded cap)
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(tipX, tipY, TIP_W + 1.2, 0, Math.PI*2);
      ctx.fillStyle = '#5899c5'; ctx.fill();
      ctx.strokeStyle = '#3a70a0'; ctx.lineWidth = 0.8; ctx.stroke();
      // tip shine
      ctx.beginPath(); ctx.arc(tipX - 0.5, tipY - 0.8, 1.2, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();

      ctx.restore();

      // ── Power indicator arc around cue ball ──────────
      if (power > 0.04) {
        const startAngle = Math.atan2(ny, nx) - Math.PI / 2.2;
        const endAngle   = startAngle + (Math.PI / 1.1) * power;
        const pColor     = power < 0.38 ? '#4ade80' : power < 0.72 ? '#facc15' : '#f87171';
        ctx.beginPath();
        ctx.arc(cueBall.x, cueBall.y, BALL_R + 8, startAngle, endAngle);
        ctx.strokeStyle = pColor; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.stroke();
        ctx.lineCap = 'butt';
      }
    }
  }

  // ── Particles ────────────────────────────────────────
  for (const p of particles) {
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI*2);
    ctx.fillStyle = p.color + Math.round(p.life * 220).toString(16).padStart(2,'0');
    ctx.fill();
  }

  // ── Balls ────────────────────────────────────
  for (const ball of balls) {
    if (ball.pocketed) continue;
    const col    = BALL_COLORS[ball.id] ?? '#aaa';
    const isStr  = STRIPE_SET.has(ball.id);
    const isRolling = Math.hypot(ball.vx, ball.vy) > 0.3;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur  = 12; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 5;
    ctx.translate(ball.x, ball.y);

    // Base sphere (drawn at origin)
    ctx.save();
    ctx.rotate(ball.angle);
    const bg = ctx.createRadialGradient(-5, -6, 1, 0, 0, BALL_R);
    bg.addColorStop(0,    lighten(col, 90));
    bg.addColorStop(0.35, col);
    bg.addColorStop(1,    darken(col, 70));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI*2); ctx.fill();

    // Stripe overlay (rotates with ball.angle = rolling effect!)
    if (isStr) {
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI*2); ctx.clip();
      ctx.fillStyle = '#ede8e0';
      ctx.fillRect(-BALL_R, -BALL_R, BALL_R*2, BALL_R*2);
      ctx.fillStyle = col;
      ctx.fillRect(-BALL_R, -BALL_R * 0.42, BALL_R * 2, BALL_R * 0.84);
      const sg2 = ctx.createRadialGradient(-5, -6, 1, 0, 0, BALL_R);
      sg2.addColorStop(0,   'rgba(255,255,255,0)');
      sg2.addColorStop(0.6, 'rgba(0,0,0,0.05)');
      sg2.addColorStop(1,   'rgba(0,0,0,0.3)');
      ctx.fillStyle = sg2;
      ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // Rolling motion mark: horizontal line that rotates = visible spin on all balls
    if (isRolling) {
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, BALL_R * 0.88, 0, Math.PI*2); ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-BALL_R * 0.88, 0); ctx.lineTo(BALL_R * 0.88, 0); ctx.stroke();
      ctx.restore();
    }
    ctx.restore(); // end rotate(ball.angle)

    // Number (always upright — no rotation)
    ctx.shadowColor = 'transparent';
    if (ball.id > 0) {
      const nr = ball.id < 10 ? 5.5 : 5;
      ctx.beginPath(); ctx.arc(0, 0, nr, 0, Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.fillStyle = ball.id === 8 ? '#333' : darken(col, 30);
      ctx.font = `bold ${ball.id < 10 ? '8' : '6.5'}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(ball.id), 0, 0.5);
    }

    // Gloss specular (always top-left, no rotation)
    const gs = ctx.createRadialGradient(-5, -6.5, 0.5, -3, -4, BALL_R * 0.75);
    gs.addColorStop(0,   'rgba(255,255,255,0.55)');
    gs.addColorStop(0.5, 'rgba(255,255,255,0.10)');
    gs.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI*2);
    ctx.fillStyle = gs; ctx.fill();

    // Rim
    ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.8; ctx.stroke();

    ctx.restore(); // end translate
  }

  // ── Sinking balls (realistic spiral-drain into pocket) ─────
  for (const s of sinkingBalls) {
    const ease   = Math.min(1, s.progress);           // 0→1 clamp
    const r      = BALL_R * (1 - ease * 0.92);        // shrink almost to 0
    const alpha  = 1 - ease * 0.95;                   // fade to ~5%
    if (r < 0.5 || alpha < 0.02) continue;

    // ── Vortex / dark hole glow at pocket center ──────────
    if (ease < 0.8) {
      const vortexAlpha = (1 - ease / 0.8) * 0.75;
      ctx.save();
      // Dark funnel
      const vg = ctx.createRadialGradient(s.px, s.py, 0, s.px, s.py, POCKET_R + 4);
      vg.addColorStop(0,   `rgba(0,0,0,${vortexAlpha})`);
      vg.addColorStop(0.5, `rgba(0,0,0,${vortexAlpha * 0.4})`);
      vg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(s.px, s.py, POCKET_R + 4, 0, Math.PI*2);
      ctx.fillStyle = vg; ctx.fill();
      // Color glow ring (ball color)
      ctx.globalAlpha = vortexAlpha * 0.5;
      ctx.beginPath(); ctx.arc(s.px, s.py, POCKET_R - 2, 0, Math.PI*2);
      ctx.strokeStyle = s.color; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    }

    // ── Draw the sinking ball ──────────────────────────
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rollAngle);

    // Shadow (shrinks with ball)
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur  = 8 * (1 - ease);
    ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;

    // Ball sphere
    const bg = ctx.createRadialGradient(-r*0.36, -r*0.4, r*0.05, 0, 0, r);
    bg.addColorStop(0,    lighten(s.color, 80));
    bg.addColorStop(0.35, s.color);
    bg.addColorStop(1,    darken(s.color, 70));
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.fillStyle = bg; ctx.fill();

    // Stripe
    if (STRIPE_SET.has(s.id)) {
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.clip();
      ctx.fillStyle = '#ede8e0'; ctx.fillRect(-r, -r, r*2, r*2);
      ctx.fillStyle = s.color; ctx.fillRect(-r, -r*0.42, r*2, r*0.84);
      ctx.restore();
    }

    // Rolling mark (spinning fast = visible spin)
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r*0.88, 0, Math.PI*2); ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-r*0.88, 0); ctx.lineTo(r*0.88, 0); ctx.stroke();
    ctx.restore();

    // Gloss
    ctx.shadowColor = 'transparent';
    const gs2 = ctx.createRadialGradient(-r*0.35, -r*0.45, r*0.04, -r*0.2, -r*0.28, r*0.7);
    gs2.addColorStop(0, 'rgba(255,255,255,0.55)');
    gs2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.fillStyle = gs2; ctx.fill();

    // Rim
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.7; ctx.stroke();

    // Number (un-rotate so it faces up while spinning)
    ctx.rotate(-s.rollAngle);
    if (s.id > 0 && r > 4) {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = `bold ${Math.max(5, r * 0.52)}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(s.id), 0, 0.5);
    }

    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════
//  AI LOGIC
// ═══════════════════════════════════════════════════════════════
function computeAIShot(balls: Ball[], playerGroup: 'solid' | 'stripe' | null) {
  const cue = balls.find(b => b.id === 0);
  if (!cue) return { tx: TABLE_W/2, ty: TABLE_H/2, power: 0.5 };
  const aiGroup: 'solid'|'stripe'|null = playerGroup === 'solid' ? 'stripe' : playerGroup === 'stripe' ? 'solid' : null;
  const targets = balls.filter(b => {
    if (b.pocketed || b.id === 0 || b.id === 8) return false;
    if (aiGroup === 'solid')  return !STRIPE_SET.has(b.id);
    if (aiGroup === 'stripe') return  STRIPE_SET.has(b.id);
    return true;
  });
  const target = targets.length > 0
    ? targets[Math.floor(Math.random() * targets.length)]
    : balls.find(b => b.id === 8 && !b.pocketed);
  if (!target) return { tx: TABLE_W/2, ty: TABLE_H/2, power: 0.55 };
  const pocket = POCKETS[Math.floor(Math.random() * POCKETS.length)];
  const dx = target.x - pocket.x, dy = target.y - pocket.y;
  const len = Math.hypot(dx, dy);
  return {
    tx: target.x + (dx/len)*BALL_R*2.1 + (Math.random()-0.5)*18,
    ty: target.y + (dy/len)*BALL_R*2.1 + (Math.random()-0.5)*18,
    power: 0.42 + Math.random() * 0.38,
  };
}

// ═══════════════════════════════════════════════════════════════
//  SPIN BALL POPUP COMPONENT
// ═══════════════════════════════════════════════════════════════
function SpinPopup({ spin, onChange }: { spin: SpinState; onChange: (s: SpinState) => void }) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const SIZE = 180;
  const R    = 78;

  // Draw cue ball with crosshair + dot
  const drawBall = (dot: SpinState) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);
    const cx = SIZE / 2, cy = SIZE / 2;

    // Shadow
    ctx.beginPath(); ctx.arc(cx + 5, cy + 7, R, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();

    // Ball sphere gradient
    const bg = ctx.createRadialGradient(cx - 24, cy - 28, 4, cx, cy, R);
    bg.addColorStop(0,   '#ffffff');
    bg.addColorStop(0.2, '#f0ece0');
    bg.addColorStop(0.65,'#d8d0b8');
    bg.addColorStop(1,   '#9a9080');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
    ctx.fillStyle = bg; ctx.fill();

    // Ball rim
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();

    // Crosshair lines (inside ball)
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.clip();
    ctx.strokeStyle = 'rgba(80,160,255,0.35)'; ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    ctx.setLineDash([]);

    // Specular gloss
    const gs = ctx.createRadialGradient(cx - 22, cy - 26, 2, cx - 14, cy - 16, R * 0.7);
    gs.addColorStop(0,   'rgba(255,255,255,0.72)');
    gs.addColorStop(0.45,'rgba(255,255,255,0.15)');
    gs.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
    ctx.fillStyle = gs; ctx.fill();
    ctx.restore();

    // Hit point dot
    const dotX = cx + dot.x * (R - 14);
    const dotY = cy + dot.y * (R - 14);
    ctx.beginPath(); ctx.arc(dotX, dotY, 9, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(220,30,30,0.9)'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    // dot shine
    ctx.beginPath(); ctx.arc(dotX - 3, dotY - 3, 3.5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();

    // Labels
    ctx.fillStyle = 'rgba(80,160,255,0.7)'; ctx.font = 'bold 11px Outfit, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TOP', cx, cy - R + 14);
    ctx.fillText('BACK', cx, cy + R - 5);
    ctx.textAlign = 'left';  ctx.fillText('L', cx - R + 5, cy + 4);
    ctx.textAlign = 'right'; ctx.fillText('R', cx + R - 5, cy + 4);
  };

  useEffect(() => { if (open) setTimeout(() => drawBall(spin), 20); }, [open]);

  const handleCanvas = (clientX: number, clientY: number) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const cx = SIZE / 2, cy = SIZE / 2;
    let dx = (clientX - rect.left) - cx;
    let dy = (clientY - rect.top)  - cy;
    const dist = Math.hypot(dx, dy);
    const maxR = SIZE / 2 - 16;
    if (dist > maxR) { dx = dx / dist * maxR; dy = dy / dist * maxR; }
    const ns = { x: parseFloat((dx / maxR).toFixed(2)), y: parseFloat((dy / maxR).toFixed(2)) };
    onChange(ns);
    drawBall(ns);
  };

  const spinLabel =
    spin.x === 0 && spin.y === 0 ? 'Tengah' :
    spin.y < -0.4 ? 'Top Spin' :
    spin.y >  0.4 ? 'Back Spin' :
    spin.x >  0.4 ? 'English-R' :
    spin.x < -0.4 ? 'English-L' : 'English';

  return (
    <>
      {/* Trigger button */}
      <button className="bl-spin-trigger" onClick={() => setOpen(true)}>
        <div className="bl-spin-trigger-ball">
          <div className="bl-spin-trigger-dot" style={{
            left: `calc(50% + ${spin.x * 12}px)`,
            top:  `calc(50% + ${spin.y * 12}px)`,
          }}/>
        </div>
        <div className="bl-spin-trigger-label">
          <span>🎯 Titik Pukul</span>
          <span className="bl-spin-trigger-sub">{spinLabel}</span>
        </div>
      </button>

      {/* Popup */}
      {open && (
        <div className="bl-spin-overlay" onClick={() => setOpen(false)}>
          <div className="bl-spin-popup" onClick={e => e.stopPropagation()}>
            <div className="bl-spin-popup-title">🎯 Pilih Titik Pukul</div>
            <div className="bl-spin-popup-sub">Klik / geser pada bola untuk menentukan efek spin</div>
            <canvas
              ref={canvasRef} width={SIZE} height={SIZE}
              className="bl-spin-ball-canvas"
              onMouseDown={e => handleCanvas(e.clientX, e.clientY)}
              onMouseMove={e => { if (e.buttons !== 1) return; handleCanvas(e.clientX, e.clientY); }}
              onTouchStart={e => { e.preventDefault(); handleCanvas(e.touches[0].clientX, e.touches[0].clientY); }}
              onTouchMove={e => { e.preventDefault(); handleCanvas(e.touches[0].clientX, e.touches[0].clientY); }}
            />
            <div className="bl-spin-popup-tags">
              {[['Tengah',0,0],['Top Spin',0,-0.8],['Back Spin',0,0.8],['English-L',-0.8,0],['English-R',0.8,0]].map(([l,x,y]) => (
                <button key={l as string} className={`bl-spin-tag ${spin.x===(x as number)&&spin.y===(y as number)?'active':''}`}
                  onClick={() => { const ns={x:x as number,y:y as number}; onChange(ns); drawBall(ns); }}
                >{l as string}</button>
              ))}
            </div>
            <button className="bl-spin-popup-ok" onClick={() => setOpen(false)}>✓ Terapkan</button>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  POWER SLIDER COMPONENT
// ═══════════════════════════════════════════════════════════════
function PowerSlider({ power, onChange }: { power: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const update = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const v = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onChange(v);
  };
  const pColor = power < 0.35 ? '#4ade80' : power < 0.7 ? '#facc15' : '#f87171';
  const label  = power < 0.25 ? 'Lemah' : power < 0.5 ? 'Sedang' : power < 0.8 ? 'Kuat' : 'MAX!';
  return (
    <div className="bl-power-wrapper">
      <div className="bl-power-label-row">
        <span className="bl-power-title">⚡ Power</span>
        <span className="bl-power-pct" style={{ color: pColor }}>{Math.round(power*100)}% — {label}</span>
      </div>
      <div ref={trackRef} className="bl-power-track"
        onMouseDown={e => { e.preventDefault(); update(e.clientX); }}
        onMouseMove={e => { if (e.buttons !== 1) return; update(e.clientX); }}
        onTouchStart={e => { e.preventDefault(); update(e.touches[0].clientX); }}
        onTouchMove={e => { e.preventDefault(); update(e.touches[0].clientX); }}
        onClick={e => update(e.clientX)}
      >
        <div className="bl-power-fill" style={{ width: `${power*100}%`, background: pColor }}/>
        {[0.25, 0.5, 0.75].map(t => <div key={t} className="bl-power-tick" style={{ left: `${t*100}%` }}/>)}
        <div className="bl-power-thumb" style={{ left: `calc(${power*100}% - 10px)`, borderColor: pColor }}/>
      </div>
      <div className="bl-power-presets">
        {[['🟢 25%', 0.25], ['🟡 50%', 0.5], ['🟠 75%', 0.75], ['🔴 MAX', 1.0]].map(([lbl, v]) => (
          <button key={v as number} className={`bl-preset-btn ${Math.abs(power-(v as number))<0.05?'sel':''}`}
            onClick={() => onChange(v as number)}
          >{lbl as string}</button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════════════════════
export default function BilliardScreen({ onBack }: { onBack: () => void }) {
  const username         = localStorage.getItem('domino_username') || '';
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const ballsRef         = useRef<Ball[]>(createBalls());
  const animRef          = useRef(0);
  const isMovingRef      = useRef(false);
  const pocketedThisTurnRef = useRef<Set<number>>(new Set());
  const particlesRef     = useRef<Particle[]>([]);
  const sinkingBallsRef  = useRef<SinkingBall[]>([]);
  const cueBallJustShot  = useRef(false);

  // aimTarget is set ONLY on click (not continuous mouse-move)
  const [aimTarget, setAimTarget]     = useState<{ x: number; y: number } | null>(null);
  const [power, setPower]             = useState(0.5);
  const [spin, setSpin]               = useState<SpinState>({ x: 0, y: 0 });
  const [isAimMode, setIsAimMode]     = useState(false);
  const [canvasScale, setCanvasScale] = useState(1);

  const [turn, setTurn]               = useState<'player'|'ai'>('player');
  const [playerGroup, setPlayerGroup] = useState<'solid'|'stripe'|null>(null);
  const [pocketedBalls, setPocketedBalls] = useState<number[]>([]);
  const [winner, setWinner]           = useState<'player'|'ai'|null>(null);
  const [message, setMessage]         = useState('🎱 Klik meja untuk mengarahkan tembakan');
  const [showBet, setShowBet]         = useState(false);
  const [bet, setBet]                 = useState(50000);
  const [coins, setCoins]             = useState(10000000);
  const [showHelp, setShowHelp]       = useState(false);
  const [showMenu, setShowMenu]       = useState(false);
  const [soundOn, setSoundOn]         = useState(true);
  const [effectOn, setEffectOn]       = useState(true);
  const [gameStep, setGameStep]         = useState<'room_select' | 'matching' | 'playing'>('room_select');
  const [selectedRoom, setSelectedRoom] = useState(POOL_ROOMS[0]);
  const [opponent, setOpponent]         = useState(OPPONENT_LIST[0]);
  const [matchStatus, setMatchStatus]   = useState('🔍 Mencari Lawan Berdasarkan Skill...');
  const [matchCountdown, setMatchCountdown] = useState<number | null>(null);
  const [matchingAvatar, setMatchingAvatar] = useState(OPPONENT_LIST[0].avatar);

  const handleSelectRoom = (room: typeof POOL_ROOMS[0]) => {
    if (coins < room.entry) {
      alert('Koin Anda tidak cukup untuk masuk room ini!');
      return;
    }
    setSelectedRoom(room);
    setBet(room.entry);
    setGameStep('matching');
    setMatchStatus('🔍 Mencari Lawan Berdasarkan Skill...');
    setMatchCountdown(null);

    let cycleCount = 0;
    const interval = setInterval(() => {
      cycleCount++;
      const randomOpp = OPPONENT_LIST[Math.floor(Math.random() * OPPONENT_LIST.length)];
      setMatchingAvatar(randomOpp.avatar);
      if (cycleCount >= 14) {
        clearInterval(interval);
        const finalOpp = OPPONENT_LIST[Math.floor(Math.random() * OPPONENT_LIST.length)];
        setOpponent(finalOpp);
        setMatchingAvatar(finalOpp.avatar);
        setMatchStatus(`⚡ MUSUH DITEMUKAN: ${finalOpp.name} (Lvl ${finalOpp.level})!`);

        let count = 3;
        setMatchCountdown(count);
        const countInterval = setInterval(() => {
          count--;
          if (count <= 0) {
            clearInterval(countInterval);
            setCoins(c => Math.max(0, c - room.entry));
            ballsRef.current = createBalls();
            setPocketedBalls([]);
            setWinner(null);
            setTurn('player');
            setPlayerGroup(null);
            setMessage(`🎱 Permainan Dimulai! Taruhan: 🪙 ${room.entry.toLocaleString('id-ID')}`);
            setGameStep('playing');
          } else {
            setMatchCountdown(count);
          }
        }, 800);
      }
    }, 120);
  };

  // Refs for closures
  const turnRef        = useRef(turn);
  const playerGroupRef = useRef(playerGroup);
  const spinRef        = useRef(spin);
  const aimTargetRef   = useRef(aimTarget);
  const powerRef       = useRef(power);
  const isAimModeRef   = useRef(isAimMode);

  useEffect(() => { turnRef.current        = turn;        }, [turn]);
  useEffect(() => { playerGroupRef.current = playerGroup; }, [playerGroup]);
  useEffect(() => { spinRef.current        = spin;        }, [spin]);
  useEffect(() => { aimTargetRef.current   = aimTarget;   }, [aimTarget]);
  useEffect(() => { powerRef.current       = power;       }, [power]);
  useEffect(() => { isAimModeRef.current   = isAimMode;   }, [isAimMode]);

  // ── Responsive ───────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const mw = Math.min(window.innerWidth - 8, TABLE_W);
      setCanvasScale(mw / TABLE_W);
    };
    update(); window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Load coins ───────────────────────────────────────
  useEffect(() => {
    const u = localStorage.getItem('domino_username');
    if (!u) return;
    const stored = localStorage.getItem('domino_coins');
    if (stored) setCoins(parseInt(stored));
    fetch(`http://localhost:8080/api/profile/${u}`)
      .then(r => r.json()).then(d => { if (d.coins != null) setCoins(d.coins); }).catch(() => {});
  }, []);

  // ── AI Scheduling ────────────────────────────────────
  const scheduleAI = useCallback(() => {
    setMessage('🤖 AI sedang menghitung...');
    setTimeout(() => {
      if (isMovingRef.current) return;
      const { tx, ty, power: ap } = computeAIShot(ballsRef.current, playerGroupRef.current);
      const cue = ballsRef.current.find(b => b.id === 0 && !b.pocketed);
      if (!cue) return;
      const dx = cue.x - tx, dy = cue.y - ty;
      const len = Math.hypot(dx, dy);
      if (len < 1) return;
      cueBallJustShot.current = true;
      cue.vx = (dx / len) * ap * 22;
      cue.vy = (dy / len) * ap * 22;
      isMovingRef.current = true;
      setMessage('🤖 AI menembak...');
    }, 1800);
  }, []);

  // ── Turn End ─────────────────────────────────────────
  const handleTurnEnd = useCallback(() => {
    const balls   = ballsRef.current;
    const pNow    = Array.from(pocketedThisTurnRef.current);
    pocketedThisTurnRef.current = new Set();
    const curTurn = turnRef.current;
    let curGroup  = playerGroupRef.current;

    if (pNow.includes(0)) {
      const cue = balls.find(b => b.id === 0);
      if (cue) { cue.pocketed = false; cue.x = TABLE_W * 0.22; cue.y = TABLE_H / 2; cue.vx = 0; cue.vy = 0; }
      const next = curTurn === 'player' ? 'ai' : 'player';
      setMessage(`⚠️ Foul! Bola putih masuk. Giliran ${next === 'player' ? 'Anda' : 'AI'}!`);
      setTurn(next);
      if (next === 'ai') scheduleAI();
      return;
    }

    if (pNow.includes(8)) {
      const solidsDone  = !balls.some(b => !b.pocketed && !STRIPE_SET.has(b.id) && b.id !== 0 && b.id !== 8);
      const stripesDone = !balls.some(b => !b.pocketed && STRIPE_SET.has(b.id));
      const playerClear = curTurn === 'player' && ((curGroup === 'solid' && solidsDone) || (curGroup === 'stripe' && stripesDone));
      setWinner(playerClear ? 'player' : 'ai');
      return;
    }

    const newPocketed = pNow.filter(id => id !== 0 && id !== 8);
    if (curGroup === null && newPocketed.length > 0) {
      const first = newPocketed[0];
      const ng: 'solid'|'stripe' = curTurn === 'player'
        ? (STRIPE_SET.has(first) ? 'stripe' : 'solid')
        : (STRIPE_SET.has(first) ? 'solid'  : 'stripe');
      setPlayerGroup(ng); curGroup = ng;
      setMessage(curTurn === 'player'
        ? `🎯 Anda: ${ng === 'solid' ? 'Solid (●)' : 'Stripe (◑)'}!`
        : `Anda: ${ng === 'solid' ? 'Solid (●)' : 'Stripe (◑)'}.`);
    }

    const own = newPocketed.filter(id => {
      const isSt = STRIPE_SET.has(id);
      return curTurn === 'player'
        ? (curGroup === 'stripe' ? isSt : !isSt)
        : (curGroup === 'stripe' ? !isSt : isSt);
    });

    if (own.length === 0) {
      const next = curTurn === 'player' ? 'ai' : 'player';
      setMessage(next === 'player' ? '🎯 Giliran Anda!' : '🤖 Giliran AI...');
      setTurn(next);
      if (next === 'ai') scheduleAI();
    } else {
      setMessage(curTurn === 'player' ? '✨ Bagus! Tembak lagi!' : '🤖 AI Lanjut...');
      if (curTurn === 'ai') scheduleAI();
    }
  }, [scheduleAI]);

  // ── Render / Game Loop ───────────────────────────────
  useEffect(() => {
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
            cueBallJustShot
          );
          isMovingRef.current = stillMoving;

          if (wasMoving && !stillMoving) {
            handleTurnEnd();
          }

          drawScene(
            ctx,
            balls,
            aimTargetRef.current,
            powerRef.current,
            isAimModeRef.current,
            particlesRef.current,
            sinkingBallsRef.current
          );
        }
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [handleTurnEnd]);

  // ── Draw loop ────────────────────────────────────────
  const drawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prevPocketed = new Set(ballsRef.current.filter(b => b.pocketed).map(b => b.id));
    const wasMoving    = isMovingRef.current;
    isMovingRef.current = physicsStep(
      ballsRef.current, pocketedThisTurnRef.current, particlesRef.current, sinkingBallsRef.current, spinRef.current, cueBallJustShot
    );
    // Keep "moving" flag true while sinking animations play
    if (sinkingBallsRef.current.length > 0) isMovingRef.current = true;

    const newly = ballsRef.current.filter(b => b.pocketed && !prevPocketed.has(b.id));
    if (newly.length > 0) setPocketedBalls(p => [...p, ...newly.map(b => b.id)]);

    drawScene(ctx, ballsRef.current, aimTargetRef.current, powerRef.current, isAimModeRef.current && !isMovingRef.current, particlesRef.current, sinkingBallsRef.current);
    if (wasMoving && !isMovingRef.current) handleTurnEnd();
    animRef.current = requestAnimationFrame(drawLoop);
  }, [handleTurnEnd]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(drawLoop);
    return () => cancelAnimationFrame(animRef.current);
  }, [drawLoop]);

  // ── Canvas coordinate helper ─────────────────────────
  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return { x: (cx - rect.left) / canvasScale, y: (cy - rect.top) / canvasScale };
  };

  // ── Drag to aim: tahan mouse + geser untuk putar stik, lepas untuk kunci ──
  const isDraggingRef = useRef(false);

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (turn !== 'player' || isMovingRef.current || winner || showBet) return;
    e.preventDefault();
    isDraggingRef.current = true;
    const pos = getCanvasPos(e);
    setAimTarget(pos);
    setIsAimMode(true);
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    if (turn !== 'player' || isMovingRef.current || winner || showBet) return;
    const pos = getCanvasPos(e);
    aimTargetRef.current = pos;
    setAimTarget(pos);
  };

  const onCanvasMouseUp = () => {
    isDraggingRef.current = false;
    // aim stays locked at last position
  };

  // Touch: geser jari untuk aiming
  const onCanvasTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (turn !== 'player' || isMovingRef.current || winner || showBet) return;
    isDraggingRef.current = true;
    const pos = getCanvasPos(e);
    setAimTarget(pos);
    setIsAimMode(true);
  };

  const onCanvasTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDraggingRef.current) return;
    if (turn !== 'player' || isMovingRef.current || winner || showBet) return;
    const pos = getCanvasPos(e);
    aimTargetRef.current = pos;
    setAimTarget(pos);
  };

  const onCanvasTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // ── SHOOT ────────────────────────────────────────────
  const handleShoot = () => {
    if (turn !== 'player' || isMovingRef.current || !aimTarget || winner || showBet) return;
    const cue = ballsRef.current.find(b => b.id === 0 && !b.pocketed);
    if (!cue) return;
    const dx = cue.x - aimTarget.x, dy = cue.y - aimTarget.y;
    const len = Math.hypot(dx, dy);
    if (len < 5) { setMessage('⚠️ Klik di meja untuk mengarahkan dulu!'); return; }
    cueBallJustShot.current = true;
    cue.vx = (dx / len) * power * 22;
    cue.vy = (dy / len) * power * 22;
    isMovingRef.current = true;
    setIsAimMode(false);
    setAimTarget(null);
    setMessage('💨 Menembak...');
  };

  // ── Reset/Restart helpers ────────────────────────────
  const restart = () => {
    ballsRef.current = createBalls();
    pocketedThisTurnRef.current = new Set();
    particlesRef.current = [];
    sinkingBallsRef.current = [];
    isMovingRef.current  = false;
    cueBallJustShot.current = false;
    setTurn('player'); setPlayerGroup(null); setPocketedBalls([]);
    setWinner(null); setAimTarget(null); setIsAimMode(false);
    setPower(0.5); setSpin({ x:0, y:0 });
    setMessage('🎱 Klik meja untuk mengarahkan!');
    setShowBet(true);
  };

  const startGame = () => {
    if (coins < bet) return;
    setShowBet(false);
    setMessage('🎱 Klik meja untuk mengarahkan tembakan!');
  };

  const saveCoinsResult = () => {
    const u = localStorage.getItem('domino_username');
    const nc = winner === 'player' ? coins + bet : Math.max(0, coins - bet);
    localStorage.setItem('domino_coins', String(nc));
    if (!u) { onBack(); return; }
    fetch(`http://localhost:8080/api/users/${u}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coins: nc }),
    }).catch(() => {});
    onBack();
  };

  const aiGroup: 'solid'|'stripe'|null = playerGroup === 'solid' ? 'stripe' : playerGroup === 'stripe' ? 'solid' : null;
  const getPocketedByGroup = (owner: 'player'|'ai') => {
    const grp = owner === 'player' ? playerGroup : aiGroup;
    if (!grp) return [];
    return pocketedBalls.filter(id => id !== 0 && id !== 8 &&
      (grp === 'stripe' ? STRIPE_SET.has(id) : !STRIPE_SET.has(id)));
  };

  if (gameStep === 'room_select') {
    return (
      <div className="billiard-screen pool8-room-screen">
        <div className="pool8-room-header">
          <button className="bl-back-btn-rich" onClick={onBack}>« Lobi</button>
          <div className="pool8-room-title">🎱 PILIH ROOM TARUHAN 8-BALL POOL</div>
          <div className="bl-coins-badge">🪙 {coins.toLocaleString('id-ID')}</div>
        </div>

        <div className="pool8-room-grid">
          {POOL_ROOMS.map(room => (
            <div
              key={room.id}
              className={`pool8-room-card ${coins < room.entry ? 'disabled' : ''}`}
              style={{ '--card-bg': room.bg } as React.CSSProperties}
              onClick={() => handleSelectRoom(room)}
            >
              {/* Background gradient */}
              <div className="pool8-rc-bg" style={{ background: room.bg }} />

              {/* Top Row: Flag badge + Tier badge */}
              <div className="pool8-rc-top-row">
                <span className="pool8-rc-flag-badge">{room.flag}</span>
                <span className={`pool8-rc-tier-badge tier-${room.tier.toLowerCase()}`}>{room.tier}</span>
              </div>

              {/* Room Name */}
              <div className="pool8-rc-name">{room.name}</div>
              <div className="pool8-rc-city">📍 {room.city} • Min Lvl {room.minLevel}</div>

              {/* Divider */}
              <div className="pool8-rc-divider" />

              {/* Prize Info */}
              <div className="pool8-rc-stats">
                <div className="pool8-rc-stat-item">
                  <span className="pool8-rc-stat-label">Biaya</span>
                  <span className="pool8-rc-stat-val entry">🪙 {room.entry.toLocaleString('id-ID')}</span>
                </div>
                <div className="pool8-rc-stat-sep">|</div>
                <div className="pool8-rc-stat-item">
                  <span className="pool8-rc-stat-label">Hadiah</span>
                  <span className="pool8-rc-stat-val prize">🪙 {room.prize.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                className={`pool8-rc-btn ${coins < room.entry ? 'locked' : ''}`}
                disabled={coins < room.entry}
              >
                {coins < room.entry ? '🔒 Koin Kurang' : '▶ MASUK'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (gameStep === 'matching') {
    return (
      <div className="billiard-screen pool8-matching-screen">
        <div className="pool8-matching-overlay">
          <div className="pool8-matching-title">🎱 8-BALL POOL MATCHMAKING</div>

          <div className="pool8-vs-animation">
            <div className="pool8-match-player">
              <div className="pool8-match-avatar gold-border">
                <img src="https://i.pravatar.cc/100?img=33" alt="Player 1" />
              </div>
              <div className="pool8-match-name">{username || 'Emely'}</div>
              <div className="pool8-match-lvl purple-star">★ 43</div>
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
                {matchStatus.includes('MUSUH DITEMUKAN') ? opponent.name : '???'}
              </div>
              <div className="pool8-match-lvl blue-star">
                ★ {matchStatus.includes('MUSUH DITEMUKAN') ? opponent.level : '??'}
              </div>
            </div>
          </div>

          <div className="pool8-matching-status">{matchStatus}</div>
          {matchCountdown !== null && (
            <div className="pool8-match-countdown">
              MATCH START IN: <span>{matchCountdown}</span>
            </div>
          )}

          <div className="pool8-match-prize-info">
            Tabel: <b>{selectedRoom.name}</b> • Total Hadiah: <b>🪙 {selectedRoom.prize.toLocaleString('id-ID')}</b>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="billiard-screen billiard-fullscreen">
      {/* ── 8 BALL POOL TOP VERSUS HEADER ── */}
      <div className="bl-header-overlay pool8-header">
        {/* Left Menu Button */}
        <button className="pool8-menu-btn" onClick={() => setShowMenu(v => !v)}>
          <span>☰</span>
        </button>

        {/* Player 1 Box (Left) */}
        <div className={`pool8-player-box left ${turn === 'player' ? 'active-turn' : ''}`}>
          <div className="pool8-star-badge purple-star">
            <span className="star-ico">★</span>
            <span className="star-num">43</span>
          </div>
          <div className="pool8-player-info">
            <div className="pool8-name-row">
              <span className="pool8-chat-btn" onClick={() => alert('Fitur Chat')}>💬</span>
              <span className="pool8-player-name">{username || 'Emely'}</span>
            </div>
            <div className="pool8-pocketed-balls">
              {(playerGroup === 'stripe' ? [9,10,11,12,13,14,15] : [1,2,3,4,5,6,7]).map(id => {
                const isPocketed = pocketedBalls.includes(id);
                return (
                  <div key={id} className={`pool8-mini-ball ball-${id} ${isPocketed ? 'pocketed' : ''}`}>
                    <span>{id}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center VS & Coins Box */}
        <div className="pool8-vs-box">
          <div className="pool8-avatar gold-border">
            <img src="https://i.pravatar.cc/100?img=33" alt="Player 1" />
          </div>
          <div className="pool8-coins-box">
            <div className="pool8-coins-icon">🪙🪙</div>
            <div className="pool8-coins-val">{selectedRoom.prize.toLocaleString('id-ID')}</div>
          </div>
          <div className="pool8-avatar purple-border">
            <img src={opponent.avatar} alt="Player 2" />
          </div>
        </div>

        {/* Player 2 Box (Right - AI) */}
        <div className={`pool8-player-box right ${turn === 'ai' ? 'active-turn' : ''}`}>
          <div className="pool8-player-info align-right">
            <div className="pool8-name-row">
              <span className="pool8-player-name">{opponent.name} (AI)</span>
            </div>
            <div className="pool8-pocketed-balls">
              {(playerGroup === 'solid' ? [9,10,11,12,13,14,15] : [1,2,3,4,5,6,7]).map(id => {
                const isPocketed = pocketedBalls.includes(id);
                return (
                  <div key={id} className={`pool8-mini-ball ball-${id} ${isPocketed ? 'pocketed' : ''}`}>
                    <span>{id}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="pool8-star-badge blue-star">
            <span className="star-ico">★</span>
            <span className="star-num">{opponent.level}</span>
          </div>
        </div>

        {/* Top Right Cue Spin Target Control Button */}
        <div className="pool8-cue-spin-target" onClick={() => setShowSpinPopup(v => !v)}>
          <div className="pool8-cs-circle">
            <div
              className="pool8-cs-dot"
              style={{
                left: `${50 + spin.x * 38}%`,
                top: `${50 - spin.y * 38}%`
              }}
            />
          </div>
        </div>

        {/* Game Menu Dropdown */}
        <GameMenuDropdown
          isOpen={showMenu}
          onClose={() => setShowMenu(false)}
          items={[
            { id: 'lobi', icon: '🚪', label: 'Lobi', onClick: () => { setShowMenu(false); onBack(); } },
            { id: 'restart', icon: '🔄', label: 'Mulai Ulang', onClick: () => { setShowMenu(false); ballsRef.current = createBalls(); setPocketedBalls([]); setWinner(null); setTurn('player'); setPlayerGroup(null); setMessage('🎱 Permainan baru dimulai!'); } },
            { id: 'suara', icon: '🔊', label: 'Suara', badge: soundOn ? 'ON' : 'OFF', onClick: () => setSoundOn(v => !v) },
            { id: 'efek', icon: '✨', label: 'Efek', badge: effectOn ? 'ON' : 'OFF', onClick: () => setEffectOn(v => !v) },
            { id: 'bantuan', icon: '❓', label: 'Bantuan', onClick: () => { setShowMenu(false); setShowHelp(true); } }
          ]}
        />
      </div>

      {/* ── CANVAS (fills full screen) ── */}
      <div className="bl-canvas-fill">
        <canvas
          ref={canvasRef} width={TABLE_W} height={TABLE_H}
          className="bl-canvas-fs"
          style={{ cursor: turn === 'player' && !isMovingRef.current ? 'crosshair' : 'default', touchAction: 'none' }}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
          onTouchStart={onCanvasTouchStart}
          onTouchMove={onCanvasTouchMove}
          onTouchEnd={onCanvasTouchEnd}
        />
      </div>

      {/* ── CONTROLS BOTTOM OVERLAY ── */}
      {!showBet && !winner && (
        <div className="bl-controls bl-controls-overlay">
          {/* LEFT: Spin popup */}
          <SpinPopup spin={spin} onChange={setSpin}/>

          {/* CENTER: Power + Shoot */}
          <div className="bl-center-controls">
            <PowerSlider power={power} onChange={setPower}/>
            <div className="bl-shoot-row">
              <button
                className={`bl-shoot-btn ${turn !== 'player' || isMovingRef.current || !aimTarget ? 'disabled' : ''}`}
                onClick={handleShoot}
                disabled={turn !== 'player' || isMovingRef.current || !aimTarget}
              >
                🔴 TEMBAK!
              </button>
              {aimTarget && turn === 'player' && !isMovingRef.current && (
                <button className="bl-reset-aim-btn" onClick={() => { setAimTarget(null); setIsAimMode(false); }}>
                  ↺
                </button>
              )}
            </div>
            {!aimTarget && turn === 'player' && !isMovingRef.current && (
              <div className="bl-aim-hint">👆 Tahan &amp; geser di meja untuk arahkan stik</div>
            )}
          </div>

          {/* RIGHT: Pocketed tray */}
          <div className="bl-tray">
            <div className="bl-tray-section">
              <div className="bl-tray-lbl">😊 {playerGroup ?? '?'}</div>
              <div className="bl-tray-balls">
                {Array.from({length:7},(_,i) => {
                  const pb  = getPocketedByGroup('player');
                  const bid = pb[i];
                  return <div key={i} className="bl-tball" style={{ background: bid ? BALL_COLORS[bid] : undefined }}>
                    {bid ? <span>{bid}</span> : null}
                  </div>;
                })}
              </div>
            </div>
            <div className="bl-tray-8">🎱</div>
            <div className="bl-tray-section">
              <div className="bl-tray-lbl">🤖 {aiGroup ?? '?'}</div>
              <div className="bl-tray-balls">
                {Array.from({length:7},(_,i) => {
                  const pb  = getPocketedByGroup('ai');
                  const bid = pb[i];
                  return <div key={i} className="bl-tball" style={{ background: bid ? BALL_COLORS[bid] : undefined }}>
                    {bid ? <span>{bid}</span> : null}
                  </div>;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HELP ── */}
      {showHelp && (
        <div className="bl-overlay" onClick={() => setShowHelp(false)}>
          <div className="bl-help-box" onClick={e => e.stopPropagation()}>
            <h3>📖 Cara Main</h3>
            <ul>
              <li>🖱️ <b>Klik meja</b> → arahkan stik (stik langsung mengikuti posisi mouse / sentuhan)</li>
              <li>🖱️ <b>Gerakkan mouse</b> di atas meja → stik berputar mengikuti arah kursor</li>
              <li>⚡ <b>Power Slider</b> → geser untuk atur kekuatan tembakan</li>
              <li>🎯 <b>Titik Pukul</b> → klik bagian bola putih untuk memberi spin:<br/>
                  Atas = Top Spin, Bawah = Back Spin, Kiri/Kanan = English</li>
              <li>🔴 <b>TEMBAK!</b> → tekan untuk menembak</li>
              <li>🎱 Masukkan 7 bola grupmu lalu masukkan bola <b>8</b></li>
              <li>⚠️ Jangan masukkan bola putih (foul!)</li>
            </ul>
            <button className="bl-btn-cancel" onClick={() => setShowHelp(false)}>Tutup</button>
          </div>
        </div>
      )}

      {/* ── BET MODAL ── */}
      {showBet && (
        <div className="bl-overlay">
          <div className="bl-modal">
            <div className="bl-modal-icon">🎱</div>
            <h2 className="bl-modal-title">8-Ball Pool</h2>
            <p className="bl-modal-sub">Kalahkan AI dan raih kemenangan!</p>
            <div className="bl-coins-row">🪙 {coins.toLocaleString('id-ID')}</div>
            <p className="bl-bet-row-lbl">Pilih Taruhan:</p>
            <div className="bl-bet-grid">
              {[50000, 100000, 250000, 500000, 1000000].map(b => (
                <button key={b} className={`bl-bet-opt ${bet===b?'sel':''}`} onClick={() => setBet(b)}>
                  {b>=1000000?`${b/1000000}Jt`:`${b/1000}K`}
                </button>
              ))}
            </div>
            <div className="bl-modal-reward">Menang: 🪙 +{bet.toLocaleString('id-ID')}</div>
            <button className="bl-btn-start" onClick={startGame} disabled={coins<bet}>
              {coins<bet ? '❌ Koin Tidak Cukup' : '🚀 Mulai!'}
            </button>
            <button className="bl-btn-cancel" onClick={onBack}>Kembali</button>
          </div>
        </div>
      )}

      {/* ── GAME OVER ── */}
      {winner && (
        <div className="bl-overlay">
          <div className={`bl-modal ${winner==='player'?'win':'lose'}`}>
            <div className="bl-modal-icon">{winner==='player'?'🏆':'😢'}</div>
            <h2 className="bl-modal-title">{winner==='player'?'MENANG!':'KALAH!'}</h2>
            <p className="bl-modal-sub">{winner==='player'?`+${bet.toLocaleString('id-ID')} koin!`:`-${bet.toLocaleString('id-ID')} koin`}</p>
            <div className="bl-coins-row">
              Koin baru: 🪙 {(winner==='player'?coins+bet:Math.max(0,coins-bet)).toLocaleString('id-ID')}
            </div>
            <button className="bl-btn-start" onClick={saveCoinsResult}>
              {winner==='player'?'🎁 Ambil Hadiah!':'🔙 Kembali'}
            </button>
            <button className="bl-btn-cancel" onClick={restart}>🔄 Main Lagi</button>
          </div>
        </div>
      )}
    </div>
  );
}
