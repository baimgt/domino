import React, { useState, useRef, useEffect } from 'react';
import './slot-speed-button.css';

export const SPEED_OPTIONS = [
  { value: 1, label: 'Normal' },
  { value: 2, label: 'Cepat' },
  { value: 3, label: 'Turbo' },
  { value: 5, label: 'Super' },
  { value: 10, label: 'Ultra ⚡' },
];

export const CYCLE_SPEEDS: Record<number, number> = {
  1: 2,
  2: 3,
  3: 5,
  5: 10,
  10: 1,
};

interface SlotSpeedButtonProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
  className?: string;
  buttonText?: string;
  theme?: 'gold' | 'western' | 'candy' | 'red';
  popupAlign?: 'left' | 'center' | 'right';
  style?: React.CSSProperties;
}

export default function SlotSpeedButton({
  speed,
  onSpeedChange,
  className = '',
  buttonText,
  theme = 'gold',
  popupAlign = 'center',
  style,
}: SlotSpeedButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const pressTimer = useRef<any>(null);
  const isLongPress = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking or tapping outside
  useEffect(() => {
    if (!showMenu) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('touchstart', handleOutsideClick);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showMenu]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isLongPress.current = false;
    if (pressTimer.current) clearTimeout(pressTimer.current);

    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowMenu(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(35); } catch (_) {}
      }
    }, 300);
  };

  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }

    if (isLongPress.current) {
      setTimeout(() => { isLongPress.current = false; }, 200);
      return;
    }

    if (showMenu) {
      setShowMenu(false);
      return;
    }

    // Normal click: cycle to next speed (1 -> 2 -> 3 -> 5 -> 10 -> 1)
    const next = CYCLE_SPEEDS[speed] || 1;
    onSpeedChange(next);
  };

  return (
    <div
      ref={containerRef}
      className={`slot-speed-btn-container theme-${theme} align-${popupAlign}`}
      style={style}
    >
      {showMenu && (
        <div className="slot-speed-popup" onClick={e => e.stopPropagation()}>
          <div className="slot-speed-popup-header">
            <span className="slot-speed-popup-title">⚡ PILIH KECEPATAN</span>
            <button
              type="button"
              className="slot-speed-popup-close"
              onClick={() => setShowMenu(false)}
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
          <div className="slot-speed-grid">
            {SPEED_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`slot-speed-choice-btn ${speed === opt.value ? 'active' : ''}`}
                onClick={() => {
                  onSpeedChange(opt.value);
                  setShowMenu(false);
                }}
              >
                <span className="slot-speed-val">X{opt.value}</span>
                <span className="slot-speed-lbl">{opt.label}</span>
              </button>
            ))}
          </div>
          <div className="slot-speed-arrow-down" />
        </div>
      )}

      <button
        type="button"
        className={className}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={e => {
          e.preventDefault();
          setShowMenu(v => !v);
        }}
        title="Klik: Ganti kecepatan | Tekan lama: Buka pilihan kecepatan (sampai 10x)"
      >
        {buttonText || `X${speed}`}
      </button>
    </div>
  );
}
