import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import './fivelions.css';
import GameMenuDropdown from './GameMenuDropdown';

interface Props {
  onBack: () => void;
  socket: Socket | null;
}

// 5 LIONS MEGAWAYS SYMBOLS
const FIVES_SYMBOLS: Record<number, { name: string; label: string; img: string; payout5: number; payout4: number; payout3: number }> = {
  0: { name: 'phoenix', label: 'Burung Hong', img: '/assets/fivelions/sym_phoenix.png', payout5: 500, payout4: 100, payout3: 25 },
  1: { name: 'dragon', label: 'Naga Emas', img: '/assets/fivelions/sym_dragon.png', payout5: 250, payout4: 50, payout3: 15 },
  2: { name: 'frog', label: 'Katak Emas', img: '/assets/fivelions/sym_frog.png', payout5: 150, payout4: 30, payout3: 10 },
  3: { name: 'fish', label: 'Ikan Koi', img: '/assets/fivelions/sym_fish.png', payout5: 100, payout4: 20, payout3: 8 },
  4: { name: 'turtle', label: 'Kura-kura Emas', img: '/assets/fivelions/sym_turtle.png', payout5: 80, payout4: 15, payout3: 5 },
  5: { name: 'wild', label: 'Singa Wild', img: '/assets/fivelions/sym_wild.png', payout5: 1000, payout4: 200, payout3: 50 },
  6: { name: 'scatter', label: 'Yin Yang Scatter', img: '/assets/fafafa2/sym_scatter.png', payout5: 500, payout4: 100, payout3: 20 },
  7: { name: 'sym-a', label: 'Huruf A', img: '/assets/fivelions/sym_a.png', payout5: 25, payout4: 8, payout3: 3 },
  8: { name: 'sym-k', label: 'Huruf K', img: '/assets/fivelions/sym_k.png', payout5: 20, payout4: 6, payout3: 2 },
  9: { name: 'sym-q', label: 'Huruf Q', img: '/assets/fivelions/sym_q.png', payout5: 15, payout4: 5, payout3: 2 },
  10: { name: 'sym-j', label: 'Huruf J', img: '/assets/fivelions/sym_j.png', payout5: 12, payout4: 4, payout3: 1 },
  11: { name: 'sym-10', label: 'Angka 10', img: '/assets/fivelions/sym_10.png', payout5: 10, payout4: 3, payout3: 1 },
};

interface CellItem {
  symId: number;
  span: number;
}

// 10 Simbol Utama 5 Lions: Phoenix, Dragon, Frog, Fish, Turtle, A, K, Q, J, 10
const REGULAR_SYM_IDS = [0, 1, 2, 3, 4, 7, 8, 9, 10, 11];

// Helper: generate a random column layout strictly from the 10 main symbols (+ optional Wild on middle reels)
function randomCol(cIdx: number = 0): CellItem[] {
  const getSym = () => {
    const r = Math.random();
    if (r < 0.05 && cIdx >= 1 && cIdx <= 4) return 5; // Singa Wild (reels 2-5)
    return REGULAR_SYM_IDS[Math.floor(Math.random() * REGULAR_SYM_IDS.length)];
  };

  const rnd = Math.random();
  if (rnd < 0.35) {
    return [{ symId: getSym(), span: 2 }, { symId: getSym(), span: 1 }];
  } else if (rnd < 0.7) {
    return [{ symId: getSym(), span: 1 }, { symId: getSym(), span: 2 }];
  } else {
    return [
      { symId: getSym(), span: 1 },
      { symId: getSym(), span: 1 },
      { symId: getSym(), span: 1 }
    ];
  }
}

// 5 Extra symbols per reel strip for realistic long downward scrolling animation (5 cell heights)
const SPIN_EXTRA_SYMBOLS: Record<number, CellItem[]> = {
  0: [{ symId: 0, span: 1 }, { symId: 7, span: 1 }, { symId: 2, span: 1 }, { symId: 9, span: 1 }, { symId: 4, span: 1 }],
  1: [{ symId: 1, span: 1 }, { symId: 8, span: 1 }, { symId: 3, span: 1 }, { symId: 10, span: 1 }, { symId: 0, span: 1 }],
  2: [{ symId: 2, span: 1 }, { symId: 9, span: 1 }, { symId: 4, span: 1 }, { symId: 11, span: 1 }, { symId: 1, span: 1 }],
  3: [{ symId: 3, span: 1 }, { symId: 10, span: 1 }, { symId: 0, span: 1 }, { symId: 7, span: 1 }, { symId: 2, span: 1 }],
  4: [{ symId: 4, span: 1 }, { symId: 11, span: 1 }, { symId: 1, span: 1 }, { symId: 8, span: 1 }, { symId: 3, span: 1 }],
  5: [{ symId: 7, span: 1 }, { symId: 0, span: 1 }, { symId: 8, span: 1 }, { symId: 2, span: 1 }, { symId: 9, span: 1 }],
};

const INITIAL_GRID_COLS: CellItem[][] = [
  // Col 0 (Reel 1): Phoenix (2x tall), 10 (1x)
  [{ symId: 0, span: 2 }, { symId: 11, span: 1 }],
  // Col 1 (Reel 2): Turtle, Turtle, Turtle (all 1x)
  [{ symId: 4, span: 1 }, { symId: 4, span: 1 }, { symId: 4, span: 1 }],
  // Col 2 (Reel 3): Frog, Fish, Dragon (all 1x)
  [{ symId: 2, span: 1 }, { symId: 3, span: 1 }, { symId: 1, span: 1 }],
  // Col 3 (Reel 4): Fish (2x tall), K (1x)
  [{ symId: 3, span: 2 }, { symId: 8, span: 1 }],
  // Col 4 (Reel 5): J (2x tall), K (1x) — letter juga bisa tinggi!
  [{ symId: 10, span: 2 }, { symId: 8, span: 1 }],
  // Col 5 (Reel 6): A (2x tall), K (1x) — letter juga bisa tinggi!
  [{ symId: 7, span: 2 }, { symId: 9, span: 1 }],
];

export default function FiveLionsSlotScreen({ onBack, socket }: Props) {
  const [gridCols, setGridCols] = useState<CellItem[][]>(INITIAL_GRID_COLS);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningCols, setSpinningCols] = useState<boolean[]>([false, false, false, false, false, false]);
  const [betAmount, setBetAmount] = useState(10000);
  const [myCoins, setMyCoins] = useState(8994600);
  const [totalWin, setTotalWin] = useState(0);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [autoSpins, setAutoSpins] = useState(0);
  const autoSpinsRef = useRef<number>(0);
  const [spinSpeed, setSpinSpeed] = useState(1);
  
  // Megaways Counter & Features
  const [megawaysCount, setMegawaysCount] = useState(144);
  const [anteBetActive, setAnteBetActive] = useState(false);
  const [showVipToast, setShowVipToast] = useState(true);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [selectedLionMode, setSelectedLionMode] = useState<string | null>(null);

  // Overlays & Rules
  const [showRules, setShowRules] = useState(false);
  const [rulesPage, setRulesPage] = useState(1);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [winningCells, setWinningCells] = useState<{ row: number; col: number }[]>([]);

  // Long press timers & timestamps
  const spinPressTimer = useRef<any>(null);
  const spinDownTime = useRef<number>(0);
  const isSpinLongPress = useRef<boolean>(false);

  const speedPressTimer = useRef<any>(null);
  const speedDownTime = useRef<number>(0);
  const isSpeedLongPress = useRef<boolean>(false);

  const username = localStorage.getItem('domino_username') || '';

  // Auto Spin Helper Functions
  const startAutoSpin = (count: number) => {
    autoSpinsRef.current = count;
    setAutoSpins(count);
    setShowAutoMenu(false);
    doSpin(count);
  };

  const cancelAutoSpin = () => {
    autoSpinsRef.current = 0;
    setAutoSpins(0);
  };

  // Spin long-press & click handlers
  const handleSpinPointerDown = (e: React.PointerEvent) => {
    spinDownTime.current = Date.now();
    isSpinLongPress.current = false;
    if (spinPressTimer.current) clearTimeout(spinPressTimer.current);
    spinPressTimer.current = setTimeout(() => {
      isSpinLongPress.current = true;
      setShowAutoMenu(true);
      setShowSpeedMenu(false);
    }, 300);
  };

  const handleSpinPointerUp = () => {
    if (spinPressTimer.current) {
      clearTimeout(spinPressTimer.current);
      spinPressTimer.current = null;
    }
    const elapsed = Date.now() - spinDownTime.current;
    if (elapsed >= 300) {
      isSpinLongPress.current = true;
    }
  };

  const handleSpinClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isSpinLongPress.current) {
      setTimeout(() => { isSpinLongPress.current = false; }, 200);
      return;
    }
    // If auto-spin is running, click stops it
    if (autoSpinsRef.current > 0 || autoSpins > 0) {
      cancelAutoSpin();
      return;
    }
    // Normal single spin
    doSpin();
  };

  // Speed long-press & click handlers
  const handleSpeedPointerDown = (e: React.PointerEvent) => {
    speedDownTime.current = Date.now();
    isSpeedLongPress.current = false;
    if (speedPressTimer.current) clearTimeout(speedPressTimer.current);
    speedPressTimer.current = setTimeout(() => {
      isSpeedLongPress.current = true;
      setShowSpeedMenu(true);
      setShowAutoMenu(false);
    }, 300);
  };

  const handleSpeedPointerUp = () => {
    if (speedPressTimer.current) {
      clearTimeout(speedPressTimer.current);
      speedPressTimer.current = null;
    }
    const elapsed = Date.now() - speedDownTime.current;
    if (elapsed >= 300) {
      isSpeedLongPress.current = true;
    }
  };

  const handleSpeedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isSpeedLongPress.current) {
      setTimeout(() => { isSpeedLongPress.current = false; }, 200);
      return;
    }
    // Tapping the speed button opens the speed selection menu
    setShowSpeedMenu(prev => !prev);
    setShowAutoMenu(false);
  };

  useEffect(() => {
    const coinsStr = localStorage.getItem('domino_coins');
    if (coinsStr) setMyCoins(parseInt(coinsStr));
    else localStorage.setItem('domino_coins', '8994600');
  }, []);

  // Smooth Megaways counter update during spin
  useEffect(() => {
    let interval: any = null;
    if (isSpinning) {
      interval = setInterval(() => {
        setMegawaysCount(Math.floor(Math.random() * 3000) + 144);
      }, 120);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isSpinning]);

  const doSpin = (overrideAutoCount?: number) => {
    if (isSpinning) return;
    const currentAuto = overrideAutoCount ?? autoSpinsRef.current;

    const cost = anteBetActive ? Math.floor(betAmount * 1.25) : betAmount;
    if (myCoins < cost && freeSpinsLeft === 0) {
      alert('Koin Anda tidak mencukupi!');
      autoSpinsRef.current = 0;
      setAutoSpins(0);
      return;
    }

    // Generate target result immediately at start of spin so reels land on exact symbols
    const newCols: CellItem[][] = [0, 1, 2, 3, 4, 5].map(cIdx => randomCol(cIdx));
    setGridCols(newCols);

    setIsSpinning(true);
    setSpinningCols([true, true, true, true, true, true]);
    setWinningCells([]);
    setTotalWin(0);

    if (freeSpinsLeft === 0) {
      setMyCoins(c => {
        const next = Math.max(0, c - cost);
        localStorage.setItem('domino_coins', next.toString());
        return next;
      });
    }

    const spd = spinSpeed;
    let stopTime = 300 / spd;

    // Staggered Reel Stops 1..6
    for (let c = 0; c < 6; c++) {
      const col = c;
      setTimeout(() => {
        setSpinningCols(prev => {
          const next = [...prev];
          next[col] = false;
          return next;
        });
      }, stopTime);
      stopTime += 180 / spd;
    }

    // Final result calculation after reels stop
    setTimeout(() => {
      setIsSpinning(false);
      setMegawaysCount(144 + Math.floor(Math.random() * 2000));

      // Calculate win
      const winOccurred = Math.random() > 0.45;
      if (winOccurred) {
        const winAmt = Math.floor(cost * (1.5 + Math.random() * 6));
        setTotalWin(winAmt);
        setMyCoins(c => {
          const next = c + winAmt;
          localStorage.setItem('domino_coins', next.toString());
          return next;
        });
        // Highlight winning cells
        setWinningCells([
          { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
          { row: 1, col: 1 }, { row: 1, col: 2 }
        ]);
      }

      // Scatter Trigger Free Game Picker
      const isScatterTrigger = Math.random() > 0.85;
      if (isScatterTrigger && freeSpinsLeft === 0) {
        setTimeout(() => setShowPickerModal(true), 600);
      } else if (freeSpinsLeft > 0) {
        setFreeSpinsLeft(f => f - 1);
      }

      // Auto Spin Continuation using autoSpinsRef
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

  const handleSelectLionMode = (mode: string, spins: number) => {
    setSelectedLionMode(mode);
    setFreeSpinsLeft(spins);
    setShowPickerModal(false);
  };

  return (
    <div className="fivelions-screen">
      {/* ROYAL BLUE CHINESE CLOUD BACKGROUND */}
      <div className="fivelions-bg"></div>

      {/* TOP LEFT (Profile Avatar, Signal, Coins, Plus) */}
      <div className="fivelions-top-left">
        <div className="fivelions-avatar" onClick={() => alert('Profil VIP Player')}>
          <img src="https://i.pravatar.cc/100?img=33" alt="Avatar" />
        </div>
        <div className="fivelions-signal">
          <span className="sig-bar b1"></span>
          <span className="sig-bar b2"></span>
          <span className="sig-bar b3"></span>
        </div>
        <div className="fivelions-coins-display">
          {myCoins.toLocaleString('id-ID')}
        </div>
        <div className="fivelions-plus-btn" onClick={() => alert('Menu Top Up Koin')}>+</div>
      </div>

      {/* TOP CENTER ROOF PLAQUE "5 LIONS MEGAWAYS™" */}
      <div className="fivelions-header-plaque-container">
        {/* Left Megaways Counter Box */}
        <div className="fivelions-megaways-box">
          <div className="mw-label">MEGAWAYS™</div>
          <div className="mw-val">{megawaysCount}</div>
        </div>

        {/* Center Plaque Title */}
        <div className="fivelions-title-plaque">
          <span className="lion-statue left">🦁</span>
          <div className="title-text-wrap">
            <h1 className="main-title">5 LIONS</h1>
            <div className="sub-title">MEGAWAYS™</div>
          </div>
          <span className="lion-statue right">🦁</span>
        </div>

        {/* Right Yin-Yang Sun Orb */}
        <div className="fivelions-sun-orb">
          <span className="sun-orb-inner">☯️</span>
        </div>
      </div>

      {/* TOP RIGHT CORNER (Ganti room, Menu) */}
      <div className="fivelions-top-right">
        <button className="fivelions-tr-btn room-btn" onClick={onBack} title="Ganti Room">
          <div className="room-refresh-icon">🔄</div>
          <small>Ganti<br/>room</small>
        </button>
        <button className="fivelions-tr-btn menu-btn" onClick={() => setShowMenu(v => !v)} title="Menu">
          <div className="menu-burger-bars">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>

        <GameMenuDropdown
          isOpen={showMenu}
          onClose={() => setShowMenu(false)}
          items={[
            { id: 'lobi', icon: '🚪', label: 'Lobi', onClick: () => { setShowMenu(false); onBack(); } },
            { id: 'tabel', icon: '📜', label: 'Tabel Bayaran', onClick: () => { setShowMenu(false); setShowRules(true); } },
            { id: 'speed', icon: '⚡', label: 'Putaran Cepat', badge: spinSpeed > 1 ? 'ON' : 'OFF', onClick: () => setSpinSpeed(s => s === 1 ? 2 : 1) },
            { id: 'bantuan', icon: '❓', label: 'Bantuan', onClick: () => { setShowMenu(false); setShowRules(true); } }
          ]}
          style={{ top: '6.5vh', right: 0 }}
        />
      </div>

      {/* LEFT SIDE FLOATING BADGES (BELI SPIN GRATIS & TARUHAN GANDA & RANSEL) */}
      <div className="fivelions-side-left">
        <div className="fivelions-side-badge buy-spin-card" onClick={() => alert('Beli Spin Gratis 1M Koin!')}>
          <div className="badge-hdr">BELI SPIN GRATIS</div>
          <div className="badge-val">1M</div>
        </div>

        <div className="fivelions-side-badge double-chance-card" onClick={() => setAnteBetActive(v => !v)}>
          <div className="badge-hdr">TARUHAN 12.5K GANDA</div>
          <div className="badge-sub">PELUANG MENANG FITUR</div>
          <div className={`ante-switch ${anteBetActive ? 'on' : 'off'}`}>
            <span className="switch-knob"></span>
            <span className="switch-txt">{anteBetActive ? 'ON' : 'OFF'}</span>
          </div>
        </div>

        <div className="fivelions-side-badge ransel-badge" onClick={() => alert('Ransel Item')}>
          <div className="ransel-icon">🎒</div>
          <small>RANSEL</small>
        </div>
      </div>

      {/* SLOT MACHINE CONTAINER (6 REELS) */}
      <div className="fivelions-machine-container">
        {freeSpinsLeft > 0 && (
          <div className="fivelions-freespin-banner">
            FREE GAME: {freeSpinsLeft} PUTARAN ({selectedLionMode || '5 LIONS'})
          </div>
        )}

        <div className={`fivelions-machine-frame ${isSpinning ? 'spinning' : ''}`}>
          <div className="fivelions-pillar-left"></div>
          <div className="fivelions-pillar-right"></div>
          <div className="fivelions-grid">
            {[0, 1, 2, 3, 4, 5].map(cIdx => {
              const isColSpinning = spinningCols[cIdx];
              const items = gridCols[cIdx] || [];
              // Combine items with 5 extra symbols for long realistic downward reel scrolling (5 cell heights)
              const stripItems = isColSpinning ? [
                ...items,
                ...(SPIN_EXTRA_SYMBOLS[cIdx] || [])
              ] : items;

              const spinDurationSec = Math.max(0.08, 0.32 / spinSpeed);

              return (
                <div 
                  key={`col-${cIdx}`} 
                  className={`fivelions-col ${isColSpinning ? 'is-spinning' : 'is-stopped'}`}
                  style={{ '--spin-duration': `${spinDurationSec}s` } as React.CSSProperties}
                >
                  <div className="fivelions-reel-track">
                    {stripItems.map((item, rIdx) => {
                      const sym = FIVES_SYMBOLS[item.symId] || FIVES_SYMBOLS[0];
                      const isWin = !isColSpinning && winningCells.some(w => w.row === rIdx && w.col === cIdx);

                      return (
                        <div 
                          key={`cell-${cIdx}-${rIdx}`} 
                          className={`fivelions-cell span-${item.span} ${isWin ? 'is-winning' : ''}`}
                        >
                          <div className="fivelions-cell-inner">
                            <img 
                              src={sym.img} 
                              alt={sym.label} 
                              className={`fivelions-sym-img sym-${sym.name.replace(/^sym-/, '')}`} 
                              draggable={false}
                            />
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
      </div>

      

      {/* BOTTOM CONTROL BAR (HIGGS DOMINO / 5 LIONS AUTHENTIC) */}
      <div className="fivelions-bottombar-wrapper">
        <div className="fbot-scroll-handle left">
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

        <div className="fivelions-bottombar">
          {/* Left: Chat, Info, Minus, BET Box, Plus */}
          <div className="fbot-left">
            <button className="fbot-gold-btn fbot-chat-btn" onClick={() => alert('Obrolan Segera Hadir')} title="Obrolan">
              <svg viewBox="0 0 24 24" className="fbot-chat-icon">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" fill="#4a1c00"/>
              </svg>
            </button>
            <button className="fbot-gold-btn fbot-info-btn" onClick={() => setShowRules(true)} title="Aturan & Tabel Bayaran">
              i
            </button>
            <button className="fbot-gold-btn fbot-step-btn" onClick={() => setBetAmount(b => Math.max(10000, b - 10000))}>-</button>
            <div className="fbot-bet-display">
              <div className="fbot-bet-label">BET 🔒</div>
              <div className="fbot-bet-val">{betAmount.toLocaleString('id-ID')}</div>
            </div>
            <button className="fbot-gold-btn fbot-step-btn" onClick={() => setBetAmount(b => Math.min(10000000, b + 10000))}>+</button>
          </div>

          {/* Center: Purple Pill Message */}
          <div className="fbot-center">
            <div className="fbot-purple-pill">
              <span className="fbot-purple-text">
                {totalWin > 0 ? (
                  <span className="fbot-win-glow">MENANG: {totalWin.toLocaleString('id-ID')}</span>
                ) : isSpinning ? (
                  <span>Memutar...</span>
                ) : (
                  <span>GOOD LUCK</span>
                )}
              </span>
            </div>
          </div>

          {/* Right: MAX BET, Speed, SPIN / TUTUP */}
          <div className="fbot-right">
            <button className="fbot-gold-btn fbot-maxbet-btn" onClick={() => setBetAmount(10000000)}>
              <span>MAX</span>
              <span>BET</span>
            </button>

            {/* SPEED BUTTON WITH POPUP & LONG PRESS */}
            <div style={{ position: 'relative' }}>
              {showSpeedMenu && (
                <div className="fivelions-speed-menu">
                  <div className="fivelions-menu-header">KECEPATAN PUTAR</div>
                  <div className="fivelions-speed-grid">
                    <button 
                      className={spinSpeed === 1 ? 'active' : ''} 
                      onClick={() => { setSpinSpeed(1); setShowSpeedMenu(false); }}
                    >
                      X1 <small>Normal</small>
                    </button>
                    <button 
                      className={spinSpeed === 2 ? 'active' : ''} 
                      onClick={() => { setSpinSpeed(2); setShowSpeedMenu(false); }}
                    >
                      X2 <small>Cepat</small>
                    </button>
                    <button 
                      className={spinSpeed === 3 ? 'active' : ''} 
                      onClick={() => { setSpinSpeed(3); setShowSpeedMenu(false); }}
                    >
                      X3 <small>Turbo</small>
                    </button>
                    <button 
                      className={spinSpeed === 5 ? 'active' : ''} 
                      onClick={() => { setSpinSpeed(5); setShowSpeedMenu(false); }}
                    >
                      X5 <small>Kilat</small>
                    </button>
                  </div>
                </div>
              )}

              <button 
                className="fbot-gold-btn fbot-speed-btn"
                onClick={handleSpeedClick}
                onPointerDown={handleSpeedPointerDown}
                onPointerUp={handleSpeedPointerUp}
                onPointerLeave={handleSpeedPointerUp}
                onPointerCancel={handleSpeedPointerUp}
                onContextMenu={(e) => { e.preventDefault(); setShowSpeedMenu(v => !v); }}
                title="Klik untuk memilih kecepatan putar"
              >
                X{spinSpeed}
              </button>
            </div>

            {/* SPIN BUTTON WITH AUTO SPIN POPUP & LONG PRESS */}
            <div style={{ position: 'relative' }}>
              {showAutoMenu && (
                <div className="fivelions-auto-menu">
                  <div className="fivelions-menu-header">PUTARAN OTOMATIS</div>
                  <div className="fivelions-auto-grid">
                    <button onClick={() => startAutoSpin(10)}>10</button>
                    <button onClick={() => startAutoSpin(30)}>30</button>
                    <button onClick={() => startAutoSpin(50)}>50</button>
                    <button onClick={() => startAutoSpin(100)}>100</button>
                    <button onClick={() => startAutoSpin(500)}>500</button>
                    <button onClick={() => startAutoSpin(99999)}>∞</button>
                  </div>
                </div>
              )}

              {showRules ? (
                <button className="fbot-tutup-btn" onClick={() => setShowRules(false)}>
                  TUTUP
                </button>
              ) : (
                <button 
                  className={`fbot-spin-btn ${isSpinning ? 'spinning' : ''} ${autoSpins > 0 ? 'auto-active' : ''}`}
                  onClick={handleSpinClick}
                  onPointerDown={handleSpinPointerDown}
                  onPointerUp={handleSpinPointerUp}
                  onPointerLeave={handleSpinPointerUp}
                  onPointerCancel={handleSpinPointerUp}
                  onContextMenu={(e) => { e.preventDefault(); setShowAutoMenu(v => !v); }}
                  title="Tekan lama untuk Auto Spin"
                >
                  <span className="fbot-spin-title">
                    {autoSpins > 0 ? `AUTO ${autoSpins > 90000 ? '∞' : autoSpins}` : 'SPIN'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* INVISIBLE BACKDROP TO CLOSE POPUPS ON CLICK OUTSIDE */}
        {(showAutoMenu || showSpeedMenu) && (
          <div 
            className="fivelions-menu-backdrop" 
            onClick={() => { setShowAutoMenu(false); setShowSpeedMenu(false); }} 
          />
        )}

        <div className="fbot-scroll-handle right">
          <svg viewBox="0 0 40 100" className="scroll-svg">
            <path d="M 5 5 C 30 5, 35 30, 35 50 C 35 70, 30 95, 5 95 C 25 95, 28 70, 28 50 C 28 30, 25 5, 5 5 Z" fill="url(#scrollGoldGradRight)" />
            <defs>
              <linearGradient id="scrollGoldGradRight" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff3b0" />
                <stop offset="40%" stopColor="#ffc107" />
                <stop offset="80%" stopColor="#b76e00" />
                <stop offset="100%" stopColor="#5e3000" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* =====================================================
          5 LIONS FREE GAME PICKER MODAL
          ===================================================== */}
      {showPickerModal && (
        <div className="fivelions-picker-overlay">
          <div className="fivelions-picker-box">
            <h2 className="picker-title">PILIH FITUR 5 LIONS FREE GAME</h2>
            <div className="picker-grid">
              <div className="picker-card red" onClick={() => handleSelectLionMode('Red Lion', 25)}>
                <div className="card-lion-icon">🔴</div>
                <div className="card-spins">25 FREE SPINS</div>
                <div className="card-mults">Wild 2x, 3x, 5x</div>
              </div>

              <div className="picker-card blue" onClick={() => handleSelectLionMode('Blue Lion', 20)}>
                <div className="card-lion-icon">🔵</div>
                <div className="card-spins">20 FREE SPINS</div>
                <div className="card-mults">Wild 3x, 5x, 8x</div>
              </div>

              <div className="picker-card green" onClick={() => handleSelectLionMode('Green Lion', 15)}>
                <div className="card-lion-icon">🟢</div>
                <div className="card-spins">15 FREE SPINS</div>
                <div className="card-mults">Wild 5x, 8x, 10x</div>
              </div>

              <div className="picker-card purple" onClick={() => handleSelectLionMode('Purple Lion', 10)}>
                <div className="card-lion-icon">🟣</div>
                <div className="card-spins">10 FREE SPINS</div>
                <div className="card-mults">Wild 10x, 15x, 30x</div>
              </div>

              <div className="picker-card gold" onClick={() => handleSelectLionMode('Gold Lion', 6)}>
                <div className="card-lion-icon">🟡</div>
                <div className="card-spins">6 FREE SPINS</div>
                <div className="card-mults">Wild 15x, 30x, 40x</div>
              </div>

              <div className="picker-card mystery" onClick={() => handleSelectLionMode('Mystery Lion', 15)}>
                <div className="card-lion-icon">🎲</div>
                <div className="card-spins">MYSTERY SPINS</div>
                <div className="card-mults">Wild Multiplier Acak</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ATURAN & TABEL BAYARAN MODAL (5 PAGES)
          ===================================================== */}
      {showRules && (
        <div className="fivelions-rules-modal" onClick={() => setShowRules(false)}>
          <div className="fivelions-rules-content" onClick={(e) => e.stopPropagation()}>
            {/* TOP HEADER */}
            <h2 className="fivelions-rules-title">ATURAN GAME</h2>

            {/* PAGE CONTENT CONTAINER */}
            <div className="fivelions-rules-body">
              {/* PAGE 1: SYMBOL PAYOUTS */}
              {rulesPage === 1 && (
                <div className="fivelions-rules-page page-1">
                  <div className="rules-subheader">
                    Semua simbol dibayar dari kiri ke kanan di reel sebelahnya mulai dari reel paling kiri.
                  </div>

                  <div className="rules-syms-row">
                    {/* Naga (Red Dragon) */}
                    <div className="rules-sym-card">
                      <div className="sym-frame border-red">
                        <img src="/assets/fivelions/sym_dragon.png" alt="Naga" />
                      </div>
                      <div className="sym-payouts">
                        <div>6-250K</div>
                        <div>5-40K</div>
                        <div>4-20K</div>
                        <div>3-10K</div>
                      </div>
                    </div>

                    {/* Burung (Phoenix) */}
                    <div className="rules-sym-card">
                      <div className="sym-frame border-red">
                        <img src="/assets/fivelions/sym_phoenix.png" alt="Burung" />
                      </div>
                      <div className="sym-payouts">
                        <div>6-50K</div>
                        <div>5-25K</div>
                        <div>4-12.5K</div>
                        <div>3-7.5K</div>
                      </div>
                    </div>

                    {/* Katak (Frog) */}
                    <div className="rules-sym-card">
                      <div className="sym-frame border-green">
                        <img src="/assets/fivelions/sym_frog.png" alt="Katak" />
                      </div>
                      <div className="sym-payouts">
                        <div>6-50K</div>
                        <div>5-15K</div>
                        <div>4-7.5K</div>
                        <div>3-5K</div>
                      </div>
                    </div>

                    {/* Ikan (Fish) */}
                    <div className="rules-sym-card">
                      <div className="sym-frame border-blue">
                        <img src="/assets/fivelions/sym_fish.png" alt="Ikan" />
                      </div>
                      <div className="sym-payouts">
                        <div>6-25K</div>
                        <div>5-12.5K</div>
                        <div>4-5K</div>
                        <div>3-3K</div>
                      </div>
                    </div>

                    {/* Kura-kura (Turtle) */}
                    <div className="rules-sym-card">
                      <div className="sym-frame border-purple">
                        <img src="/assets/fivelions/sym_turtle.png" alt="Kura-kura" />
                      </div>
                      <div className="sym-payouts">
                        <div>6-25K</div>
                        <div>5-10K</div>
                        <div>4-5K</div>
                        <div>3-3K</div>
                      </div>
                    </div>
                  </div>

                  <div className="rules-syms-row">
                    {/* A */}
                    <div className="rules-sym-card">
                      <img src="/assets/fivelions/sym_a.png" alt="A" className="sym-letter-img" />
                      <div className="sym-payouts">
                        <div>6-12.5K</div>
                        <div>5-5K</div>
                        <div>4-3K</div>
                        <div>3-2K</div>
                      </div>
                    </div>

                    {/* K */}
                    <div className="rules-sym-card">
                      <img src="/assets/fivelions/sym_k.png" alt="K" className="sym-letter-img" />
                      <div className="sym-payouts">
                        <div>6-12.5K</div>
                        <div>5-5K</div>
                        <div>4-3K</div>
                        <div>3-2K</div>
                      </div>
                    </div>

                    {/* Q */}
                    <div className="rules-sym-card">
                      <img src="/assets/fivelions/sym_q.png" alt="Q" className="sym-letter-img" />
                      <div className="sym-payouts">
                        <div>6-10K</div>
                        <div>5-4K</div>
                        <div>4-2K</div>
                        <div>3-1K</div>
                      </div>
                    </div>

                    {/* J */}
                    <div className="rules-sym-card">
                      <img src="/assets/fivelions/sym_j.png" alt="J" className="sym-letter-img" />
                      <div className="sym-payouts">
                        <div>6-10K</div>
                        <div>5-4K</div>
                        <div>4-2K</div>
                        <div>3-1K</div>
                      </div>
                    </div>

                    {/* 10 */}
                    <div className="rules-sym-card">
                      <img src="/assets/fivelions/sym_10.png" alt="10" className="sym-letter-img" />
                      <div className="sym-payouts">
                        <div>6-10K</div>
                        <div>5-4K</div>
                        <div>4-2K</div>
                        <div>3-1K</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 2: WILD & CARA MENANG */}
              {rulesPage === 2 && (
                <div className="fivelions-rules-page page-2">
                  <div className="p2-left-col">
                    <div className="sym-frame border-gold wild-box">
                      <img src="/assets/fivelions/sym_wild.png" alt="WILD Lion" className="rules-wild-img" />
                    </div>
                    <div className="p2-desc">
                      Simbol ini adalah WILD dan mengganti<br />
                      semua simbol kecuali untuk ☯<br />
                      Simbol WILD hanya muncul di reel 2, 3, 4<br />
                      dan 5.
                    </div>
                  </div>

                  <div className="p2-right-col">
                    <h3 className="p2-right-title">Cara menang</h3>
                    <div className="p2-diagrams">
                      {/* Checkmark Diagram */}
                      <div className="p2-diag-item">
                        <div className="grid-diagram">
                          {[0, 1, 2, 3, 4, 5].map(c => (
                            <div key={c} className="diag-col">
                              {[0, 1, 2, 3, 4, 5, 6].map(r => (
                                <div key={r} className="diag-cell">
                                  {((c===0 && r===3) || (c===1 && r===2) || (c===2 && r===1) || (c===3 && r===2) || (c===4 && r===3)) && <span className="diag-dot"></span>}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                        <span className="diag-icon check">✔</span>
                      </div>

                      {/* Cross Diagram */}
                      <div className="p2-diag-item">
                        <div className="grid-diagram">
                          {[0, 1, 2, 3, 4, 5].map(c => (
                            <div key={c} className={`diag-col ${c===2 ? 'highlight-red' : ''}`}>
                              {[0, 1, 2, 3, 4, 5, 6].map(r => (
                                <div key={r} className="diag-cell">
                                  {((c===0 && r===3) || (c===1 && r===2) || (c===3 && r===2) || (c===4 && r===3)) && <span className="diag-dot"></span>}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                        <span className="diag-icon cross">✖</span>
                      </div>
                    </div>
                    <div className="p2-desc p2-desc-ways">
                      Kemenangan diberikan untuk kombinasi simbol<br />
                      bersebelahan dari kiri ke kanan ukuran apapun.<br />
                      Reel 1 hingga 6 bisa memiliki 7 simbol. Totalnya,<br />
                      Jumlah maksimal menang adalah 117649.
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 3: FITUR TUMBLE, PENGALI WILD, ATURAN SPIN GRATIS */}
              {rulesPage === 3 && (
                <div className="fivelions-rules-page page-3">
                  <div className="p3-section">
                    <h3 className="gold-sec-title">FITUR TUMBLE</h3>
                    <p className="p3-text">
                      FITUR TUMBLE artinya setelah setiap spin, kombinasi yang menang dibayarkan dan semua simbol kemenangan menghilang. Simbol yang tersisa akan turun dan posisi yang kosong akan di gantikan dengan simbol baru yang muncul dari atas.
                    </p>
                  </div>

                  <div className="p3-section">
                    <h3 className="gold-sec-title">PENGALI WILD</h3>
                    <p className="p3-text">
                      Setiap kali minimal 1 simbol WILD diraih dan jadi bagian kombinasi kemenangan, pengalian secara acak ke semua kombinasi kemenangan yang menggunakan WILD selama putaran dan tumble dasar. Di permainan dasar kemungkinan nilai pengalinya adalah: 1x, 2x, 3x, 5x, 8x, 10x, 15x, 30x, dan 40x.
                    </p>
                  </div>

                  <div className="p3-section">
                    <h3 className="gold-sec-title">ATURAN SPIN GRATIS</h3>
                    <div className="p3-bonus-split">
                      <div className="p3-bonus-left">
                        <div>6x simbol BONUS membayar 100x total taruhan.</div>
                        <div>5x simbol BONUS membayar 25x total taruhan.</div>
                        <div>4x simbol BONUS membayar 5x total taruhan.</div>
                        <div>3x simbol BONUS membayar 3x total taruhan.</div>
                      </div>

                      <div className="p3-bonus-right">
                        <div className="sym-frame border-gold">
                          <img src="/assets/fafafa2/sym_scatter.png" alt="Scatter Yin Yang" className="p3-scatter-img" />
                        </div>
                        <div className="p3-bonus-txt">
                          Ini adalah simbol BONUS.<br />
                          Akan muncul di setiap reel.<br />
                          Raih 3 simbol BONUS atau lebih di reel<br />
                          untuk memicu MODE FREE SPIN.<br />
                          Simbol BONUS tidak meledak selama<br />
                          tumble berlangsung.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 4: 7 OPSI PUTARAN GRATIS */}
              {rulesPage === 4 && (
                <div className="fivelions-rules-page page-4">
                  <div className="p4-top-hdr">
                    Sebelum ronde dimulai, pilih satu dari 7 opsi putaran gratis:
                  </div>

                  <div className="p4-lion-grid">
                    {/* Option 1: Silver */}
                    <div className="p4-lion-item">
                      <div className="lion-statue-box silver">
                        <img src="/assets/fivelions/sym_wild.png" alt="Silver Lion" className="lion-filter silver-f" />
                      </div>
                      <div className="lion-txt">
                        <div className="l-spins">25 SPIN GRATIS</div>
                        <div className="l-mults">2X, 3X, 5X PENGALI WILD</div>
                      </div>
                    </div>

                    {/* Option 2: Red */}
                    <div className="p4-lion-item">
                      <div className="lion-statue-box red">
                        <img src="/assets/fivelions/sym_wild.png" alt="Red Lion" className="lion-filter red-f" />
                      </div>
                      <div className="lion-txt">
                        <div className="l-spins">20 SPIN GRATIS</div>
                        <div className="l-mults">3X, 5X, 8X PENGALI WILD</div>
                      </div>
                    </div>

                    {/* Option 3: Bronze */}
                    <div className="p4-lion-item">
                      <div className="lion-statue-box bronze">
                        <img src="/assets/fivelions/sym_wild.png" alt="Bronze Lion" className="lion-filter bronze-f" />
                      </div>
                      <div className="lion-txt">
                        <div className="l-spins">15 SPIN GRATIS</div>
                        <div className="l-mults">5X, 8X, 10X PENGALI WILD</div>
                      </div>
                    </div>

                    {/* Option 4: Blue */}
                    <div className="p4-lion-item">
                      <div className="lion-statue-box blue">
                        <img src="/assets/fivelions/sym_wild.png" alt="Blue Lion" className="lion-filter blue-f" />
                      </div>
                      <div className="lion-txt">
                        <div className="l-spins">13 SPIN GRATIS</div>
                        <div className="l-mults">8X, 10X, 15X PENGALI WILD</div>
                      </div>
                    </div>

                    {/* Option 5: Gold */}
                    <div className="p4-lion-item">
                      <div className="lion-statue-box gold">
                        <img src="/assets/fivelions/sym_wild.png" alt="Gold Lion" className="lion-filter gold-f" />
                      </div>
                      <div className="lion-txt">
                        <div className="l-spins">10 SPIN GRATIS</div>
                        <div className="l-mults">10X, 15X, 30X PENGALI WILD</div>
                      </div>
                    </div>

                    {/* Option 6: Green */}
                    <div className="p4-lion-item">
                      <div className="lion-statue-box green">
                        <img src="/assets/fivelions/sym_wild.png" alt="Green Lion" className="lion-filter green-f" />
                      </div>
                      <div className="lion-txt">
                        <div className="l-spins">6 SPIN GRATIS</div>
                        <div className="l-mults">15X, 30X, 40X PENGALI WILD</div>
                      </div>
                    </div>

                    {/* Option 7: Mystery */}
                    <div className="p4-lion-item mystery-item">
                      <div className="lion-statue-box purple">
                        <img src="/assets/fivelions/sym_wild.png" alt="Mystery Lion" className="lion-filter purple-f" />
                      </div>
                      <div className="lion-txt">
                        <div className="l-spins">Jumlah MISTERIUS spin gratis, dipilih dari opsi lainnya</div>
                        <div className="l-mults">Rentang pengali MISTERIUS, dipilih dari opsi lainnya</div>
                      </div>
                    </div>
                  </div>

                  <div className="p4-bottom-desc">
                    Selama mode free spin, setiap kali simbol WILD diraih dan jadi bagian dari kombinasi pemenang, pengali acak dari rentang yang dipilih akan diterapkan ke semua kombinasi pemenang yang menggunakan WILD.<br />
                    Raih 3 atau lebih simbol BONUS selama free spin berputar akan memicu lebih banyak free spin, jumlah yang sama seperti opsi yang dipilih.
                  </div>
                </div>
              )}

              {/* PAGE 5: TARUHAN ANTE & BELI SPIN GRATIS */}
              {rulesPage === 5 && (
                <div className="fivelions-rules-page page-5">
                  <div className="p5-section">
                    <h3 className="gold-sec-title">TARUHAN ANTE</h3>
                    <p className="p5-text">
                      Pemain memiliki opsi untuk memilih pengali taruhan. Tergantung taruhan yang dipilih, game akan berperilaku beda. Nilai yang mungkin adalah:
                    </p>
                    <div className="p5-sublist">
                      <div><b>Pengali taruhan 20x</b> - Permainan normal</div>
                      <div>
                        <b>Pengali taruhan 25x</b> - Peluang mendapatkan FREE SPIN secara wajar naik dua kali lipat, lebih banyak simbol BONUS muncul di reel tapi garis perhitungan simbol tidak terpengaruh dan membayar untuk pengali taruhan 20x
                      </div>
                    </div>
                    <p className="p5-text p5-maxwin">
                      Jumlah kemenangan maksimal dibatasi hingga 5000x taruhan. Jika total bonus putaran gratis mencapai 5000x, putaran segera berakhir dan bonus dibayarkan, dan semua free spin yang tersisa hangus.
                    </p>
                  </div>

                  <div className="p5-section">
                    <h3 className="gold-sec-title">BELI SPIN GRATIS</h3>
                    <p className="p5-text">
                      Pembelian 100x total taruhan Anda saat ini di permainan dasar langsung memicu fitur free spin serta opsi free spin. Fitur Beli Free Spins dinonaktifkan jika fitur 25x Ante diaktifkan.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* BOTTOM NAVIGATION BAR */}
            <div className="fivelions-rules-bottomnav">
              <button 
                className="rules-arrow-btn left" 
                onClick={() => setRulesPage(p => Math.max(1, p - 1))}
              >
                ‹
              </button>

              <button className="rules-kembali-btn" onClick={() => setShowRules(false)}>
                KEMBALI KE GAME
              </button>

              <button 
                className="rules-arrow-btn right" 
                onClick={() => setRulesPage(p => Math.min(5, p + 1))}
              >
                ›
              </button>

              <div className="rules-pagination-dots">
                {[1, 2, 3, 4, 5].map(p => (
                  <span 
                    key={p} 
                    className={`dot ${rulesPage === p ? 'active' : ''}`}
                    onClick={() => setRulesPage(p)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
