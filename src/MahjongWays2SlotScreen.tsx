import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import './mahjong2.css';
import GameMenuDropdown from './GameMenuDropdown';

interface Props {
  onBack: () => void;
  socket: Socket | null;
}

interface TileItem {
  symId: number;
  isGold?: boolean;
}

// MAHJONG WAYS 2 SYMBOLS
const MAHJONG_SYMBOLS: Record<number, { name: string; label: string; img: string }> = {
  0: { name: 'scatter', label: 'Scatter (BELI SPIN GRATIS)', img: '/assets/mahjong2/sym_scatter.png' },
  1: { name: 'wild', label: 'WILD Ingot', img: '/assets/mahjong2/sym_wild.png' },
  2: { name: 'fa', label: 'Fa (發)', img: '/assets/mahjong2/sym_fa.png' },
  3: { name: 'zhong', label: 'Zhong (中)', img: '/assets/mahjong2/sym_zhong.png' },
  4: { name: 'ba-wan', label: '8 Wan (八萬)', img: '/assets/mahjong2/sym_8wan.png' },
  5: { name: 'dot-5', label: '5 Dots', img: '/assets/mahjong2/sym_5dots.png' },
  6: { name: 'dot-3', label: '3 Dots', img: '/assets/mahjong2/sym_3dots.png' },
  7: { name: 'dot-2', label: '2 Dots', img: '/assets/mahjong2/sym_2dots.png' },
  8: { name: 'bam-2', label: '2 Bamboo', img: '/assets/mahjong2/sym_2bam.png' },
  9: { name: 'bai', label: 'White Board (白)', img: '/assets/mahjong2/sym_bai.png' },
  10: { name: 'bam-5', label: '5 Bamboo', img: '/assets/mahjong2/sym_5bam.png' },
};

// Initial grid layout for Mahjong Ways 2 (5 reels: 4, 5, 5, 5, 4 rows)
const INITIAL_MAHJONG_GRID: TileItem[][] = [
  // Reel 1 (4 rows)
  [{ symId: 4 }, { symId: 7 }, { symId: 5 }, { symId: 3 }],
  // Reel 2 (5 rows, row 0 is gold top)
  [{ symId: 5, isGold: true }, { symId: 5 }, { symId: 2 }, { symId: 5 }, { symId: 3 }],
  // Reel 3 (5 rows, row 0 is gold top)
  [{ symId: 2, isGold: true }, { symId: 4 }, { symId: 5 }, { symId: 3 }, { symId: 6 }],
  // Reel 4 (5 rows, row 0 is gold top)
  [{ symId: 7, isGold: true }, { symId: 9 }, { symId: 2 }, { symId: 3 }, { symId: 4 }],
  // Reel 5 (4 rows)
  [{ symId: 2 }, { symId: 5 }, { symId: 2 }, { symId: 4 }],
];

export default function MahjongWays2SlotScreen({ onBack, socket }: Props) {
  const [gridCols, setGridCols] = useState<TileItem[][]>(INITIAL_MAHJONG_GRID);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningCols, setSpinningCols] = useState<boolean[]>([false, false, false, false, false]);
  const [betAmount, setBetAmount] = useState(10000);
  const [myCoins, setMyCoins] = useState(8994600);
  const [totalWin, setTotalWin] = useState(0);
  const [multiplierIdx, setMultiplierIdx] = useState(0);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [autoSpins, setAutoSpins] = useState(0);
  const autoSpinsRef = useRef<number>(0);
  const [spinSpeed, setSpinSpeed] = useState(1);
  const [winningCells, setWinningCells] = useState<{ col: number; row: number }[]>([]);

  // Overlays & Modals
  const [showRules, setShowRules] = useState(false);
  const [rulesPage, setRulesPage] = useState(1);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Long press refs
  const spinPressTimer = useRef<any>(null);
  const spinDownTime = useRef<number>(0);
  const isSpinLongPress = useRef<boolean>(false);

  const speedPressTimer = useRef<any>(null);
  const speedDownTime = useRef<number>(0);
  const isSpeedLongPress = useRef<boolean>(false);

  const username = localStorage.getItem('domino_username') || '';

  useEffect(() => {
    autoSpinsRef.current = autoSpins;
  }, [autoSpins]);

  useEffect(() => {
    const coinsStr = localStorage.getItem('domino_coins');
    if (coinsStr) setMyCoins(parseInt(coinsStr));
  }, []);

  // Helper to generate a random column for reel cIdx (Reels 0 & 4 have 4 rows, Reels 1, 2, 3 have 5 rows)
  const generateCol = (colIdx: number): TileItem[] => {
    const rowCount = (colIdx === 0 || colIdx === 4) ? 4 : 5;
    const regularIds = [2, 3, 4, 5, 6, 7, 8, 9, 10];
    const items: TileItem[] = [];

    for (let r = 0; r < rowCount; r++) {
      const roll = Math.random();
      let symId = regularIds[Math.floor(Math.random() * regularIds.length)];
      if (roll < 0.04) {
        symId = 0; // Scatter
      } else if (roll < 0.09 && colIdx >= 1 && colIdx <= 3) {
        symId = 1; // Wild
      }
      
      // Top cell on middle reels or ~20% of middle reel tiles can be Golden framed!
      const isGold = (colIdx >= 1 && colIdx <= 3 && symId >= 2) ? (r === 0 || Math.random() < 0.25) : false;
      items.push({ symId, isGold });
    }
    return items;
  };

  const doSpin = (overrideAutoCount?: number) => {
    if (isSpinning) return;
    const currentAuto = overrideAutoCount ?? autoSpinsRef.current;

    const cost = betAmount;
    if (myCoins < cost && freeSpinsLeft === 0) {
      alert('Koin Anda tidak mencukupi!');
      autoSpinsRef.current = 0;
      setAutoSpins(0);
      return;
    }

    // Pre-generate target grid
    const targetGrid: TileItem[][] = [0, 1, 2, 3, 4].map(cIdx => generateCol(cIdx));
    setGridCols(targetGrid);

    setIsSpinning(true);
    setSpinningCols([true, true, true, true, true]);
    setWinningCells([]);
    setTotalWin(0);
    setMultiplierIdx(0);

    if (freeSpinsLeft === 0) {
      setMyCoins(c => {
        const next = Math.max(0, c - cost);
        localStorage.setItem('domino_coins', next.toString());
        return next;
      });
    }

    const spd = spinSpeed;
    let stopTime = 250 / spd;
    const delayPerCol = 180 / spd;

    // Staggered reel stop (Reels 1..5)
    for (let c = 0; c < 5; c++) {
      const col = c;
      setTimeout(() => {
        setSpinningCols(prev => {
          const next = [...prev];
          next[col] = false;
          return next;
        });
      }, stopTime);
      stopTime += delayPerCol;
    }

    // Processing win & tumble sequence after reels stop
    setTimeout(() => {
      setIsSpinning(false);

      const winOccurred = Math.random() > 0.45;
      if (winOccurred) {
        const winAmt = Math.floor(cost * (1.8 + Math.random() * 8));
        setTotalWin(winAmt);
        setMyCoins(c => {
          const next = c + winAmt;
          localStorage.setItem('domino_coins', next.toString());
          return next;
        });
        setWinningCells([
          { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 3, row: 1 },
          { col: 1, row: 2 }, { col: 2, row: 2 }
        ]);
        setMultiplierIdx(1); // Advance multiplier to x2
      }

      // Scatter trigger check
      const scatterCount = targetGrid.flat().filter(t => t.symId === 0).length;
      if (scatterCount >= 3 && freeSpinsLeft === 0) {
        setTimeout(() => {
          alert('SELAMAT! 3 SCATTER MEMICU 10 PUTARAN GRATIS!');
          setFreeSpinsLeft(10);
        }, 500);
      } else if (freeSpinsLeft > 0) {
        setFreeSpinsLeft(f => f - 1);
      }

      // Auto spin continuation
      const remainingAuto = autoSpinsRef.current > 0 ? autoSpinsRef.current : currentAuto;
      if (remainingAuto > 1) {
        const nextCount = remainingAuto - 1;
        autoSpinsRef.current = nextCount;
        setAutoSpins(nextCount);
        setTimeout(() => doSpin(), 600 / spd);
      } else {
        autoSpinsRef.current = 0;
        setAutoSpins(0);
      }
    }, stopTime + 100);
  };

  // Multipliers for Normal vs Free Game mode
  const multipliers = freeSpinsLeft > 0 ? ['x2', 'x4', 'x6', 'x10'] : ['x1', 'x2', 'x3', 'x5'];

  return (
    <div className="mj-screen">
      {/* JADE GREEN DRAGON PATTERN BACKGROUND */}
      <div className="mj-bg">
        <div className="mj-bg-left-dragon"></div>
        <div className="mj-bg-right-dragon"></div>
        <div className="mj-bg-glow"></div>
        <div className="mj-cloud mj-cloud-1"></div>
        <div className="mj-cloud mj-cloud-2"></div>
        <div className="mj-cloud mj-cloud-3"></div>
      </div>

      {/* TOP LEFT (Profile Avatar, VIP Badge, Coins) */}
      <div className="mj-topleft">
        <div className="mj-avatar-wrap" onClick={() => alert('Profil VIP Player')}>
          <img className="mj-avatar-img" src="https://i.pravatar.cc/100?img=33" alt="avatar" />
          <div className="mj-vip-badge">VIP 9</div>
          <div className="mj-bar-icon">📊</div>
        </div>
        <div className="mj-coins-wrap">
          <span className="mj-coin-icon">🪙</span>
          <span className="mj-coins-num">{myCoins.toLocaleString('id-ID')}</span>
          <button className="mj-plus-btn" onClick={() => alert('Top Up Koin')}>+</button>
        </div>
      </div>

      {/* TOP RIGHT (Ganti Room & Menu Dropdown) */}
      <div className="mj-topright">
        <button className="mj-tr-btn" onClick={onBack}>
          <div className="mj-tr-icon">🔄</div>
          <div className="mj-tr-label">Ganti<br/>room</div>
        </button>
        <button className="mj-tr-btn mj-tr-menu" onClick={() => setShowMenu(v => !v)}>≡</button>

        <GameMenuDropdown
          isOpen={showMenu}
          onClose={() => setShowMenu(false)}
          items={[
            { id: 'lobi', icon: '🚪', label: 'Lobi', onClick: () => { setShowMenu(false); onBack(); } },
            { id: 'tabel', icon: '📜', label: 'Tabel Bayaran', onClick: () => { setShowMenu(false); setShowRules(true); } },
            { id: 'speed', icon: '⚡', label: 'Putaran Cepat', badge: spinSpeed > 1 ? 'ON' : 'OFF', onClick: () => setSpinSpeed(s => s === 1 ? 2 : 1) },
            { id: 'bantuan', icon: '❓', label: 'Bantuan', onClick: () => { setShowMenu(false); setShowRules(true); } }
          ]}
        />
      </div>

      {/* TOP CENTER MULTIPLIER BAR (Teal Header Ribbon) */}
      <div className="mj-mult-bar-wrapper">
        <div className="mj-mult-ribbon">
          {multipliers.map((m, idx) => (
            <div key={m} className={`mj-mult-step ${idx === multiplierIdx ? 'mj-mult-active' : ''}`}>
              {m}
            </div>
          ))}
        </div>
      </div>

      {/* LEFT SIDE BADGES (BELI SPIN GRATIS & RANSEL) */}
      <div className="mj-side-left">
        <div className="mj-side-scatter-badge" onClick={() => alert('Fitur Beli Spin Gratis')}>
          <div className="mj-scatter-icon-wrap">
            <img src="/assets/mahjong2/sym_scatter.png" alt="Scatter Hu" className="mj-scatter-badge-img" />
          </div>
          <div className="mj-scatter-label">BELI SPIN<br/>GRATIS</div>
        </div>

        <div className="mj-side-ransel" onClick={() => alert('Ransel Item')}>
          <div className="mj-ransel-icon">🎒</div>
          <div className="mj-ransel-label">RANSEL</div>
        </div>
      </div>

      {/* RIGHT SIDE ARROW BUTTON */}
      <div className="mj-side-right">
        <button className="mj-arrow-right-btn" onClick={() => alert('Menu Fitur Kanan')}>❯</button>
      </div>

      {/* MAIN MAHJONG SLOT MACHINE AREA (5 REELS: 4-5-5-5-4) */}
      <div className="mj-main-container">
        {freeSpinsLeft > 0 && (
          <div className="mj-freespin-banner">
            PUTARAN GRATIS BERLANGSUNG: {freeSpinsLeft} SPIN TERSISA!
          </div>
        )}

        <div className="mj-machine-frame">
          {/* Left Pillar with vertical 2000 CARA */}
          <div className="mj-pillar mj-pillar-left">
            <div className="mj-pillar-badge">
              <span className="mj-pillar-text">2000 CARA</span>
            </div>
          </div>

          {/* 5 REELS GRID */}
          <div className="mj-grid-frame">
            <div className="mj-grid">
              {[0, 1, 2, 3, 4].map(cIdx => {
                const isColSpinning = spinningCols[cIdx];
                const items = gridCols[cIdx] || [];

                // Extra loop symbols during spin for realistic long downward cascade
                const regLoopIds = [2, 3, 4, 5, 6, 7, 8, 9, 10];
                const stripItems = isColSpinning ? [
                  ...items,
                  { symId: regLoopIds[(cIdx * 2 + 1) % 9], isGold: false },
                  { symId: regLoopIds[(cIdx * 2 + 3) % 9], isGold: false },
                  { symId: regLoopIds[(cIdx * 2 + 5) % 9], isGold: false },
                  { symId: regLoopIds[(cIdx * 2 + 7) % 9], isGold: false },
                  { symId: regLoopIds[(cIdx * 2 + 2) % 9], isGold: false }
                ] : items;

                const spinDurationSec = Math.max(0.08, 0.30 / spinSpeed);

                return (
                  <div
                    key={`col-${cIdx}`}
                    className={`mj-col col-${cIdx} ${isColSpinning ? 'is-spinning' : 'is-stopped'}`}
                    style={{ '--spin-duration': `${spinDurationSec}s` } as React.CSSProperties}
                  >
                    <div className="mj-reel-track">
                      {stripItems.map((item, rIdx) => {
                        const sym = MAHJONG_SYMBOLS[item.symId] || MAHJONG_SYMBOLS[4];
                        const isWin = !isColSpinning && winningCells.some(w => w.col === cIdx && w.row === rIdx);
                        const isTopGoldRow = (cIdx >= 1 && cIdx <= 3 && rIdx === 0);

                        return (
                          <div
                            key={`cell-${cIdx}-${rIdx}`}
                            className={`mj-cell ${isTopGoldRow ? 'is-top-gold' : ''} ${item.isGold ? 'is-golden-tile' : ''} ${isWin ? 'is-winning' : ''}`}
                          >
                            <div className="mj-tile-container">
                              {sym.img ? (
                                <img
                                  src={sym.img}
                                  alt={sym.label}
                                  className={`mj-tile-img sym-${sym.name}`}
                                  draggable={false}
                                />
                              ) : (
                                <div className="mj-tile-text-render" style={{ color: sym.color }}>
                                  <span className="mj-tile-txt">{sym.text}</span>
                                </div>
                              )}
                              {item.isGold && <div className="mj-tile-gold-overlay" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Pillar with vertical 2000 CARA */}
          <div className="mj-pillar mj-pillar-right">
            <div className="mj-pillar-badge">
              <span className="mj-pillar-text">2000 CARA</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROL BAR (HIGGS DOMINO 3D SCROLL BAR) */}
      <div className="mj-bottombar-wrapper">
        <div className="mj-scroll-handle left">
          <svg viewBox="0 0 40 100" className="scroll-svg">
            <path d="M 35 5 C 10 5, 5 30, 5 50 C 5 70, 10 95, 35 95 C 15 95, 12 70, 12 50 C 12 30, 15 5, 35 5 Z" fill="url(#scrollGoldGrad)" />
            <defs>
              <linearGradient id="scrollGoldGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fff3b0" />
                <stop offset="40%" stopColor="#ffc107" />
                <stop offset="80%" stopColor="#b76e00" />
                <stop offset="100%" stopColor="#5e3000" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="mj-bottombar">
          {/* Left: Chat, Info, Minus, BET Box, Plus */}
          <div className="mjbot-left">
            <button className="mjbot-gold-btn mjbot-chat-btn" onClick={() => alert('Obrolan Segera Hadir')} title="Obrolan">
              <svg viewBox="0 0 24 24" className="mjbot-chat-icon">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" fill="#4a1c00"/>
              </svg>
            </button>
            <button className="mjbot-gold-btn mjbot-info-btn" onClick={() => setShowRules(true)} title="Aturan & Tabel Bayaran">
              i
            </button>
            <button className="mjbot-gold-btn mjbot-step-btn" onClick={() => setBetAmount(b => Math.max(10000, b - 10000))}>-</button>
            <div className="mjbot-bet-display">
              <div className="mjbot-bet-label">BET 🔒</div>
              <div className="mjbot-bet-val">{betAmount.toLocaleString('id-ID')}</div>
            </div>
            <button className="mjbot-gold-btn mjbot-step-btn" onClick={() => setBetAmount(b => Math.min(10000000, b + 10000))}>+</button>
          </div>

          {/* Center: Purple Pill Message */}
          <div className="mjbot-center">
           
            <div className="mjbot-purple-pill">
              <span className="mjbot-purple-text">
                {totalWin > 0 ? (
                  <span className="mjbot-win-glow">MENANG: {totalWin.toLocaleString('id-ID')}</span>
                ) : isSpinning ? (
                  <span>Memutar...</span>
                ) : (
                  <span>GOOD LUCK</span>
                )}
              </span>
            </div>
          </div>

          {/* Right: MAX BET, Speed, SPIN / TUTUP */}
          <div className="mjbot-right">
            <button className="mjbot-gold-btn mjbot-maxbet-btn" onClick={() => setBetAmount(10000000)}>
              <span>MAX</span>
              <span>BET</span>
            </button>

            {/* SPEED BUTTON */}
            <div style={{ position: 'relative' }}>
              {showSpeedMenu && (
                <div className="mj-speed-menu">
                  <div className="mj-menu-header">KECEPATAN PUTAR</div>
                  <div className="mj-speed-grid">
                    <button className={spinSpeed === 1 ? 'active' : ''} onClick={() => { setSpinSpeed(1); setShowSpeedMenu(false); }}>
                      X1 <small>Normal</small>
                    </button>
                    <button className={spinSpeed === 2 ? 'active' : ''} onClick={() => { setSpinSpeed(2); setShowSpeedMenu(false); }}>
                      X2 <small>Cepat</small>
                    </button>
                    <button className={spinSpeed === 3 ? 'active' : ''} onClick={() => { setSpinSpeed(3); setShowSpeedMenu(false); }}>
                      X3 <small>Kilat</small>
                    </button>
                  </div>
                </div>
              )}
              <button
                className="mjbot-gold-btn mjbot-speed-btn"
                onMouseDown={() => {
                  isSpeedLongPress.current = false;
                  speedDownTime.current = Date.now();
                  speedPressTimer.current = setTimeout(() => {
                    isSpeedLongPress.current = true;
                    setShowSpeedMenu(v => !v);
                  }, 400);
                }}
                onMouseUp={() => {
                  clearTimeout(speedPressTimer.current);
                  if (!isSpeedLongPress.current && (Date.now() - speedDownTime.current < 400)) {
                    setSpinSpeed(s => s === 1 ? 2 : s === 2 ? 3 : 1);
                  }
                }}
                onMouseLeave={() => clearTimeout(speedPressTimer.current)}
                onTouchStart={() => {
                  isSpeedLongPress.current = false;
                  speedDownTime.current = Date.now();
                  speedPressTimer.current = setTimeout(() => {
                    isSpeedLongPress.current = true;
                    setShowSpeedMenu(v => !v);
                  }, 400);
                }}
                onTouchEnd={() => {
                  clearTimeout(speedPressTimer.current);
                  if (!isSpeedLongPress.current && (Date.now() - speedDownTime.current < 400)) {
                    setSpinSpeed(s => s === 1 ? 2 : s === 2 ? 3 : 1);
                  }
                }}
                onContextMenu={e => { e.preventDefault(); setShowSpeedMenu(v => !v); }}
              >
                x{spinSpeed}
              </button>
            </div>

            {/* SPIN / TUTUP BUTTON WITH LONG-PRESS AUTO MENU */}
            <div style={{ position: 'relative' }}>
              {showAutoMenu && (
                <div className="mj-auto-menu">
                  <div className="mj-menu-header">AUTOSPIN</div>
                  <div className="mj-auto-grid">
                    {[10, 50, 100, 500].map(n => (
                      <button key={n} onClick={() => {
                        autoSpinsRef.current = n;
                        setAutoSpins(n);
                        setShowAutoMenu(false);
                        doSpin(n);
                      }}>
                        {n}X
                      </button>
                    ))}
                    <button className="inf-btn" onClick={() => {
                      autoSpinsRef.current = 999999;
                      setAutoSpins(999999);
                      setShowAutoMenu(false);
                      doSpin(999999);
                    }}>
                      ∞ <small>Tak Terbatas</small>
                    </button>
                  </div>
                </div>
              )}

              <button
                className={`mjbot-spin-btn ${autoSpins > 0 ? 'is-autospin' : ''}`}
                onMouseDown={() => {
                  isSpinLongPress.current = false;
                  spinDownTime.current = Date.now();
                  spinPressTimer.current = setTimeout(() => {
                    isSpinLongPress.current = true;
                    setShowAutoMenu(v => !v);
                  }, 400);
                }}
                onMouseUp={() => {
                  clearTimeout(spinPressTimer.current);
                  if (!isSpinLongPress.current && (Date.now() - spinDownTime.current < 400)) {
                    if (autoSpins > 0) {
                      autoSpinsRef.current = 0;
                      setAutoSpins(0);
                    } else {
                      doSpin();
                    }
                  }
                }}
                onMouseLeave={() => clearTimeout(spinPressTimer.current)}
                onTouchStart={() => {
                  isSpinLongPress.current = false;
                  spinDownTime.current = Date.now();
                  spinPressTimer.current = setTimeout(() => {
                    isSpinLongPress.current = true;
                    setShowAutoMenu(v => !v);
                  }, 400);
                }}
                onTouchEnd={() => {
                  clearTimeout(spinPressTimer.current);
                  if (!isSpinLongPress.current && (Date.now() - spinDownTime.current < 400)) {
                    if (autoSpins > 0) {
                      autoSpinsRef.current = 0;
                      setAutoSpins(0);
                    } else {
                      doSpin();
                    }
                  }
                }}
                onContextMenu={e => { e.preventDefault(); setShowAutoMenu(v => !v); }}
              >
                <div className="spin-btn-inner">
                  {autoSpins > 0 ? (
                    <>
                      <span className="spin-txt-main">TUTUP</span>
                      <span className="spin-txt-sub">{autoSpins > 90000 ? '∞' : `${autoSpins} Spin`}</span>
                    </>
                  ) : (
                    <>
                      <span className="spin-txt-main">SPIN</span>
                      <span className="spin-txt-sub">PUTAR</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="mj-scroll-handle right">
          <svg viewBox="0 0 40 100" className="scroll-svg">
            <path d="M 5 5 C 30 5, 35 30, 35 50 C 35 70, 30 95, 5 95 C 25 95, 28 70, 28 50 C 28 30, 25 5, 5 5 Z" fill="url(#scrollGoldGrad)" />
          </svg>
        </div>
      </div>

      {/* RULES MODAL (AUTHENTIC MAHJONG WAYS 2 5-PAGE RULES & PAYTABLE) */}
      {showRules && (
        <div className="mj-rules-overlay" onClick={() => setShowRules(false)}>
          <div className="mj-rules-modal" onClick={e => e.stopPropagation()}>
            <button className="mj-rules-close" onClick={() => setShowRules(false)}>✕</button>

            <div className="mj-rules-body">
              {/* PAGE 1: NILAI BAYARAN SIMBOL */}
              {rulesPage === 1 && (
                <div className="mj-rules-page mj-page-1">
                  <h2 className="mj-rules-title">NILAI BAYARAN SIMBOL</h2>

                  <div className="mj-p1-top-header">
                    <div className="mj-p1-header-item">
                      <img src="/assets/mahjong2/sym_scatter.png" alt="Scatter" className="mj-p1-hdr-img" />
                      <div className="mj-p1-hdr-txt">
                        <strong>Simbol Scatter</strong>
                      </div>
                    </div>
                    <div className="mj-p1-header-item">
                      <img src="/assets/mahjong2/sym_wild.png" alt="Wild" className="mj-p1-hdr-img" />
                      <div className="mj-p1-hdr-txt">
                        <strong>Simbol Wild</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mj-p1-grid">
                    {/* Row 1: Fa, Zhong, Bai, 8Wan, 5Dots */}
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_fa.png" alt="Fa" />
                      <div className="mj-p1-val"><span>5</span> 25K<br/><span>4</span> 12K<br/><span>3</span> 5K</div>
                    </div>
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_zhong.png" alt="Zhong" />
                      <div className="mj-p1-val"><span>5</span> 20K<br/><span>4</span> 10K<br/><span>3</span> 4K</div>
                    </div>
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_bai.png" alt="Bai" />
                      <div className="mj-p1-val"><span>5</span> 15K<br/><span>4</span> 7K<br/><span>3</span> 3K</div>
                    </div>
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_8wan.png" alt="8 Wan" />
                      <div className="mj-p1-val"><span>5</span> 7K<br/><span>4</span> 5K<br/><span>3</span> 2K</div>
                    </div>
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_5dots.png" alt="5 Dots" />
                      <div className="mj-p1-val"><span>5</span> 6K<br/><span>4</span> 2K<br/><span>3</span> 1K</div>
                    </div>

                    {/* Row 2: 5Bam, 3Dots, 2Bam, 2Dots */}
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_5bam.png" alt="5 Bamboo" />
                      <div className="mj-p1-val"><span>5</span> 6K<br/><span>4</span> 2K<br/><span>3</span> 1K</div>
                    </div>
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_3dots.png" alt="3 Dots" />
                      <div className="mj-p1-val"><span>5</span> 5K<br/><span>4</span> 2K<br/><span>3</span> 1K</div>
                    </div>
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_2bam.png" alt="2 Bamboo" />
                      <div className="mj-p1-val"><span>5</span> 3K<br/><span>4</span> 1K<br/><span>3</span> 500</div>
                    </div>
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_2dots.png" alt="2 Dots" />
                      <div className="mj-p1-val"><span>5</span> 3K<br/><span>4</span> 1K<br/><span>3</span> 500</div>
                    </div>
                  </div>

                  <div className="mj-p1-notes">
                    <p>Simbol Wild menggantikan semua simbol kecuali simbol Scatter.</p>
                    <p>Simbol berwarna emas hanya muncul di rol 2, 3 dan 4.</p>
                  </div>
                </div>
              )}

              {/* PAGE 2: SIMBOL BERWARNA EMAS */}
              {rulesPage === 2 && (
                <div className="mj-rules-page mj-page-2">
                  <h2 className="mj-rules-title">SIMBOL BERWARNA EMAS</h2>
                  <div className="mj-p2-split">
                    <div className="mj-p2-left-diag">
                      <div className="mj-p2-mini-grid">
                        <div className="mj-p2-grid-row">
                          <img src="/assets/mahjong2/sym_2bam.png" alt="" />
                          <img src="/assets/mahjong2/sym_zhong.png" alt="" />
                          <img src="/assets/mahjong2/sym_zhong.png" alt="" />
                          <img src="/assets/mahjong2/sym_5dots.png" alt="" />
                          <img src="/assets/mahjong2/sym_2bam.png" alt="" />
                        </div>
                        <div className="mj-p2-grid-row">
                          <img src="/assets/mahjong2/sym_3dots.png" alt="" />
                          <img src="/assets/mahjong2/sym_2bam.png" alt="" />
                          <img src="/assets/mahjong2/sym_2bam.png" alt="" />
                          <img src="/assets/mahjong2/sym_wild.png" alt="" />
                          <img src="/assets/mahjong2/sym_2bam.png" alt="" />
                        </div>
                        <div className="mj-p2-grid-row">
                          <img src="/assets/mahjong2/sym_3dots.png" alt="" />
                          <img src="/assets/mahjong2/sym_fa.png" alt="" />
                          <img src="/assets/mahjong2/sym_scatter.png" alt="" />
                          <img src="/assets/mahjong2/sym_fa.png" alt="" />
                          <img src="/assets/mahjong2/sym_fa.png" alt="" />
                        </div>
                        <div className="mj-p2-grid-row">
                          <img src="/assets/mahjong2/sym_3dots.png" alt="" />
                          <img src="/assets/mahjong2/sym_8wan.png" alt="" />
                          <img src="/assets/mahjong2/sym_3dots.png" alt="" />
                          <img src="/assets/mahjong2/sym_3dots.png" alt="" className="gold-highlight" />
                          <img src="/assets/mahjong2/sym_3dots.png" alt="" />
                        </div>
                        <div className="mj-p2-grid-row">
                          <img src="/assets/mahjong2/sym_5dots.png" alt="" />
                          <img src="/assets/mahjong2/sym_3dots.png" alt="" className="gold-highlight" />
                          <img src="/assets/mahjong2/sym_2bam.png" alt="" />
                          <img src="/assets/mahjong2/sym_bai.png" alt="" />
                          <img src="/assets/mahjong2/sym_bai.png" alt="" />
                        </div>
                      </div>
                    </div>
                    <div className="mj-p2-right-text">
                      <p>• Selama putaran apa pun, beberapa simbol (kecuali simbol Wild dan simbol Scatter) di rol 2, 3 dan atau 4 bisa saja berwarna emas.</p>
                      <p>• Di setiap babak baru setelah simbol baru berjatuhan, simbol apa pun yang berpelat emas yang terlibat dalam sebuah kemenangan di babak sebelumnya akan diubah menjadi simbol Wild.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 3: PENGALI */}
              {rulesPage === 3 && (
                <div className="mj-rules-page mj-page-3">
                  <h2 className="mj-rules-title">PENGALI</h2>
                  <div className="mj-p3-ribbon-wrap">
                    <div className="mj-p3-ribbon">
                      <span>x1</span>
                      <span className="active">x2</span>
                      <span>x3</span>
                      <span>x5</span>
                    </div>
                  </div>
                  <div className="mj-p3-bullets">
                    <p>• Selama putaran apa pun, semua kemenangan akan dikalikan dengan pengali yang ditunjukkan di atas rol, dimulai dengan x1 di babak pertama.</p>
                    <p>• Kemenangan apa pun di babak pertama akan meningkatkan pengali putaran kedua menjadi x2.</p>
                    <p>• Kemenangan apa pun di babak kedua akan meningkatkan pengali putaran ketiga menjadi x3.</p>
                    <p>• Kemenangan apa pun di babak ketiga akan meningkatkan pengali putaran keempat (dan seterusnya) menjadi x5.</p>
                  </div>
                </div>
              )}

              {/* PAGE 4: FITUR PUTARAN GRATIS */}
              {rulesPage === 4 && (
                <div className="mj-rules-page mj-page-4">
                  <h2 className="mj-rules-title">FITUR PUTARAN GRATIS</h2>
                  <div className="mj-p4-split">
                    <div className="mj-p4-left-col">
                      <div className="mj-p4-scatters">
                        <img src="/assets/mahjong2/sym_scatter.png" alt="Scatter" />
                        <img src="/assets/mahjong2/sym_scatter.png" alt="Scatter" />
                        <img src="/assets/mahjong2/sym_scatter.png" alt="Scatter" />
                      </div>
                      <p>• Fitur Putaran Gratis</p>
                      <p>• 3 simbol Scatter yang muncul di mana saja akan memicu Fitur Putaran Gratis dengan 10 putaran gratis. Setiap simbol Scatter tambahan akan memicu 2 putaran gratis lagi.</p>
                      <p>• Jumlah kemenangan maksimal dibatasi hingga 2000X taruhan. Jika total bonus putaran gratis mencapai 2000X, putaran segera berakhir dan bonus dibayarkan, dan semua free spin yang tersisa hangus.</p>
                    </div>

                    <div className="mj-p4-right-col">
                      <div className="mj-p4-mini-grid">
                        <img src="/assets/mahjong2/ref_mahjong2.jpg" alt="Free Spins Reel" className="mj-p4-reel-img" />
                      </div>
                      <p>• Selama Fitur Putaran Gratis, semua simbol (kecuali simbol Wild dan simbol Scatter) di rol 3 akan berwarna emas.</p>
                      <p>• Pengali di atas rol masing-masing akan ditingkatkan menjadi x2, x4, x6 dan x10.</p>
                      <p>• Putaran gratis bisa dipicu ulang.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 5: 2,000 CARA (BAGIAN 1) */}
              {rulesPage === 5 && (
                <div className="mj-rules-page mj-page-5">
                  <h2 className="mj-rules-title">2,000 CARA</h2>
                  <div className="mj-p5-split">
                    <div className="mj-p5-left-col">
                      <p>• Garis taruhan dimenangkan jika simbol-simbol kemenangan berada pada posisi berurutan dari rol paling kiri ke rol paling kanan.</p>
                      <div className="mj-p5-diags">
                        <div className="mj-p5-diag-box">
                          <div className="mj-p5-grid-demo win">
                            <span className="c c1">?</span><span className="c c2">?</span><span className="c"></span><span className="c"></span><span className="c"></span>
                            <span className="c"></span><span className="c c3">?</span><span className="c c4">?</span><span className="c"></span><span className="c"></span>
                            <span className="c"></span><span className="c"></span><span className="c"></span><span className="c"></span><span className="c"></span>
                            <span className="c"></span><span className="c c5">?</span><span className="c c6">?</span><span className="c"></span><span className="c"></span>
                          </div>
                          <div className="mj-p5-check">✔</div>
                        </div>

                        <div className="mj-p5-diag-box">
                          <div className="mj-p5-grid-demo loss">
                            <span className="c c1">?</span><span className="c c2">?</span><span className="c"></span><span className="c"></span><span className="c"></span>
                            <span className="c"></span><span className="c c3">?</span><span className="c"></span><span className="c c4">?</span><span className="c"></span>
                            <span className="c"></span><span className="c"></span><span className="c"></span><span className="c"></span><span className="c"></span>
                            <span className="c"></span><span className="c c5">?</span><span className="c"></span><span className="c c6">?</span><span className="c"></span>
                          </div>
                          <div className="mj-p5-cross">✖</div>
                        </div>
                      </div>
                    </div>

                    <div className="mj-p5-right-col">
                      <p>• Jumlah total kemenangan taruhan untuk setiap simbol akan dihitung dengan mengalikan jumlah simbol pemenang yang berdekatan pada setiap simbol dari rol paling kiri ke kanan.</p>
                      
                      <div className="mj-p5-math-box">
                        <div className="mj-p5-math-sub">Dari Contoh di Atas:</div>
                        <div className="mj-p5-math-formula">1x3x2 = 6</div>
                      </div>

                      <p>• Pembayaran simbol pemenang dikalikan dengan jumlah kemenangan jalan taruhan.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 6: 2,000 CARA (BAGIAN 2) */}
              {rulesPage === 6 && (
                <div className="mj-rules-page mj-page-6">
                  <h2 className="mj-rules-title">2,000 CARA</h2>
                  <div className="mj-p6-top-calc">
                    <div className="mj-p6-tile-demo">
                      <div className="mj-p6-q-sphere">?</div>
                      <div className="mj-p6-tile-payout">
                        <div><span>5</span> 500</div>
                        <div><span>4</span> 100</div>
                        <div className="gold-row"><span className="gold-txt">3</span> <span className="gold-txt">10</span></div>
                      </div>
                    </div>
                    <div className="mj-p6-math-box">
                      <div className="mj-p6-math-sub">Total Kemenangan di Contoh ini:</div>
                      <div className="mj-p6-math-formula">10x6 = 60</div>
                    </div>
                  </div>

                  <div className="mj-p6-bullets">
                    <p>• Setelah bayaran setiap babak dibayarkan , maka semua simbol yang menang akan meledak dan simbol di atas akan berjatuhan dan memulai babak baru.</p>
                    <p>• Tambahan kombinasi yang menang akan dihitung di setiap babak hingga tidak ada lagi kombinasi yang menang untuk dihitung.</p>
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER PAGINATION & BACK BUTTON */}
            <div className="mj-rules-footer">
              {/* Indicator dots (6 pages) */}
              <div className="mj-rules-dots">
                {[1, 2, 3, 4, 5, 6].map(d => (
                  <span key={d} className={`dot ${d === rulesPage ? 'active' : ''}`} onClick={() => setRulesPage(d)} />
                ))}
              </div>

              {/* Navigation controls */}
              <div className="mj-rules-controls">
                <button className="mj-rules-nav-btn prev" onClick={() => setRulesPage(p => Math.max(1, p - 1))} disabled={rulesPage === 1}>
                  ◄
                </button>
                <button className="mj-rules-back-btn" onClick={() => setShowRules(false)}>
                  KEMBALI KE GAME
                </button>
                <button className="mj-rules-nav-btn next" onClick={() => setRulesPage(p => Math.min(6, p + 1))} disabled={rulesPage === 6}>
                  ►
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
