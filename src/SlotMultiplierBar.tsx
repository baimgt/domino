import React from 'react';
import './slot-multiplier.css';

interface SlotMultiplierBarProps {
  /** Tangga pengali, default x1 x2 x3 x5 */
  steps?: number[];
  /** Index tangga yang sedang menyala */
  idx?: number;
  /** Sedang free spin? Jika ya, tampilkan pengali menumpuk */
  isFree?: boolean;
  /** Nilai pengali free spin yang menumpuk */
  freeMult?: number;
  /** Posisi custom (mis. '8vh' atau '5vh') */
  top?: string;
  /** Tampilkan inline langsung di atas grid rol */
  inline?: boolean;
  /** Label judul di samping pengali */
  label?: string;
}

const DEFAULT_STEPS = [1, 2, 3, 5];

/**
 * Bar pengali universal ala slot asli:
 *  - Game biasa : PENGALI: [ x1 ] > [ x2 ] > [ x3 ] > [ x5 ] naik tiap kemenangan beruntun
 *  - Free spin  : [ x2 ] > [ x4 ] > [ x6 ] > [ x10 ] atau satu angka besar yang MENUMPUK sampai free spin habis
 */
export default function SlotMultiplierBar({
  steps = DEFAULT_STEPS,
  idx = 0,
  isFree = false,
  freeMult = 1,
  top,
  inline = false,
  label,
}: SlotMultiplierBarProps) {
  const style = top ? { top } : undefined;
  const wrapCls = `smb-wrap ${inline ? 'smb-inline' : ''}`;

  if (isFree && (!steps || steps.length === 0 || steps.every((s, i) => s === DEFAULT_STEPS[i]))) {
    const val = Math.max(1, Math.floor(freeMult));
    return (
      <div className={wrapCls} style={style}>
        <div className="smb-free" key={val}>
          <span className="smb-free-label">{label || 'TOTAL PENGALI'}</span>
          <span className="smb-free-val">x{val}</span>
        </div>
      </div>
    );
  }

  // Tampilkan tangga langkah (ladder)
  const activeIdx = Math.min(Math.max(0, idx), steps.length - 1);
  return (
    <div className={wrapCls} style={style}>
      <div className="smb-bar">
        <span className="smb-title">{label || (isFree ? 'PENGALI FREE SPIN' : 'PENGALI')}</span>
        {steps.map((s, i) => (
          <div
            key={i}
            className={`smb-step ${i === activeIdx ? 'smb-active' : ''} ${i < activeIdx ? 'smb-passed' : ''}`}
          >
            x{s}
          </div>
        ))}
      </div>
    </div>
  );
}
