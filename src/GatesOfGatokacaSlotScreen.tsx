import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import './gatokaca.css';
import GameMenuDropdown from './GameMenuDropdown';
import GatokacaCinematicBackground from './GatokacaCinematicBackground';
import LeaderboardModal from './LeaderboardModal';

interface Props {
  onBack: () => void;
  socket: Socket | null;
}

// Symbol definitions - Gates of Gatotkaca 1000 theme
export const GATO_SYMBOLS: Record<number, {
  name: string; label: string; tier: 'high' | 'mid' | 'low' | 'special';
  color: string; bgColor: string; img?: string;
}> = {
  // ── 4 HIGH-PAYING ITEMS (Pragmatic Play Gatotkaca) ─────────────────────────
  0: { name: 'ruby-ring',  label: 'Cincin Ruby',     tier: 'high',    color: '#ef5350', bgColor: '#7f0000', img: '/assets/gatokaca/sym_ruby_ring.png' },
  1: { name: 'lion',       label: 'Singa Emas',      tier: 'high',    color: '#ffd700', bgColor: '#4a2800', img: '/assets/gatokaca/sym_lion.png' },
  2: { name: 'potion',     label: 'Ramuan Hijau',    tier: 'high',    color: '#26a69a', bgColor: '#004d40', img: '/assets/gatokaca/sym_potion.png' },
  3: { name: 'blu-medal',  label: 'Liontin Biru',    tier: 'high',    color: '#29b6f6', bgColor: '#01579b', img: '/assets/gatokaca/sym_blue_medal.png' },
  // ── 5 GEMSTONES (RED, PURPLE, YELLOW, GREEN, BLUE) ───────────────────────
  4: { name: 'red-gem',    label: 'Permata Merah',   tier: 'mid',     color: '#ef5350', bgColor: '#7f0000', img: '/assets/gatokaca/sym_red_gem.png' },
  5: { name: 'pur-gem',    label: 'Permata Ungu',    tier: 'mid',     color: '#ce93d8', bgColor: '#4a148c', img: '/assets/gatokaca/sym_purple_gem.png' },
  6: { name: 'yel-gem',    label: 'Permata Kuning',  tier: 'mid',     color: '#ffa726', bgColor: '#e65100', img: '/assets/gatokaca/sym_yellow_gem.png' },
  7: { name: 'grn-gem',    label: 'Permata Hijau',   tier: 'low',     color: '#66bb6a', bgColor: '#1b5e20', img: '/assets/gatokaca/sym_green_gem.png' },
  8: { name: 'blu-gem',    label: 'Permata Biru',    tier: 'low',     color: '#29b6f6', bgColor: '#01579b', img: '/assets/gatokaca/sym_blue_gem.png' },
  // ── SPECIAL ───────────────────────────────────────────────────────────────
  9: { name: 'scatter',    label: 'SCATTER',         tier: 'special', color: '#ffd700', bgColor: '#1a237e', img: '/assets/gatokaca/sym_scatter.png' },
  10:{ name: 'multi',      label: 'MULTIPLIER',      tier: 'special', color: '#ffffff', bgColor: '#880e4f' },
};

// Paytable: count -> payout multiplier (per bet unit)
const PAYTABLE: Record<number, Record<string, number>> = {
  0:  { '12': 50, '20': 250, '30': 500  }, // Cincin Ruby (500x)
  1:  { '12': 25, '20': 100, '30': 250  }, // Singa Emas (250x)
  2:  { '12': 15, '20': 60,  '30': 150  }, // Ramuan Hijau (150x)
  3:  { '12': 12, '20': 40,  '30': 120  }, // Liontin Biru (120x)
  4:  { '12': 10, '20': 30,  '30': 100  }, // Permata Merah (100x)
  5:  { '12': 8,  '20': 25,  '30': 80   }, // Permata Ungu (80x)
  6:  { '12': 5,  '20': 20,  '30': 50   }, // Permata Kuning (50x)
  7:  { '12': 4,  '20': 18,  '30': 40   }, // Permata Hijau (40x)
  8:  { '12': 2,  '20': 14,  '30': 20   }, // Permata Biru (20x)
};

const SCATTER_PAY: Record<number, number> = { 4: 3, 5: 5, 6: 100 };
const ROWS = 5, COLS = 6;

export default function GatesOfGatokacaSlotScreen({ onBack, socket }: Props) {
  const [grid, setGrid] = useState<number[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(4))
  );
  const [multGrid, setMultGrid] = useState<number[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(0))
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningCols, setSpinningCols] = useState<boolean[]>(Array(COLS).fill(false));
  const [bouncingCols, setBouncingCols] = useState<boolean[]>(Array(COLS).fill(false));
  const [betAmount, setBetAmount] = useState(10000000);
  const [myCoins, setMyCoins] = useState(8994600);
  const [totalWin, setTotalWin] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [autoSpins, setAutoSpins] = useState(0);
  const [spinSpeed, setSpinSpeed] = useState(1);
  const [anteMode, setAnteMode] = useState(false); // Taruhan Ganda
  const [showRules, setShowRules] = useState(false);
  const [rulesPage, setRulesPage] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [explodingCells, setExplodingCells] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('GOOD LUCK');
  const [winningCells, setWinningCells] = useState<string[]>([]);
  const [scatterCount, setScatterCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(100);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      // rata-rata +1 per 60ms => sekitar 6 detik sampai 100%
      current += Math.random() * 1.4 + 0.3;
      if (current >= 100) {
        current = 100;
        setLoadProgress(100);
        clearInterval(interval);
        setTimeout(() => setLoading(false), 600);
      } else {
        setLoadProgress(Math.floor(current));
      }
    }, 60);
    return () => clearInterval(interval);
  }, []);

  const spinPressTimer = useRef<any>(null);
  const username = localStorage.getItem('domino_username') || '';
  const autoSpinsRef = useRef(autoSpins);
  const freeSpinsLeftRef = useRef(freeSpinsLeft);
  const spinSpeedRef = useRef(spinSpeed);
  const doSpinRef = useRef<any>(null);
  const isStoppingRef = useRef(false);

  useEffect(() => { autoSpinsRef.current = autoSpins; }, [autoSpins]);
  useEffect(() => { freeSpinsLeftRef.current = freeSpinsLeft; }, [freeSpinsLeft]);
  useEffect(() => { spinSpeedRef.current = spinSpeed; }, [spinSpeed]);

  useEffect(() => {
    const coinsStr = localStorage.getItem('domino_coins');
    if (coinsStr) setMyCoins(parseInt(coinsStr));
    // Initial grid matching screenshot layout
    const initGrid = [
      [4, 6, 7, 3, 3, 5],
      [4, 6, 7, 3, 3, 5],
      [2, 2, 1, 7, 1, 2],
      [2, 2, 1, 7, 1, 2],
      [2, 2, 0, 6, 8, 3],
    ];
    setGrid(initGrid);
  }, []);

  // Rapid reel shuffle
  useEffect(() => {
    let interval: any = null;
    if (isSpinning) {
      interval = setInterval(() => {
        setGrid(prev => prev.map((row, r) =>
          row.map((cell, c) => spinningCols[c] ? Math.floor(Math.random() * 10) : cell)
        ));
      }, 70 / spinSpeedRef.current);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isSpinning, spinningCols]);

  useEffect(() => {
    if (!socket) return;

    const handleResult = async (data: any) => {
      const spd = spinSpeedRef.current;
      let stopTime = 150 / spd;
      const delayPerCol = 200 / spd;

      // Staggered reel stop
      for (let c = 0; c < COLS; c++) {
        const col = c;
        setTimeout(() => {
          setSpinningCols(prev => { const n = [...prev]; n[col] = false; return n; });
          // Efek mendarat + pantulan ala Duofu
          setBouncingCols(prev => { const n = [...prev]; n[col] = true; return n; });
          setTimeout(() => setBouncingCols(prev => { const n = [...prev]; n[col] = false; return n; }), 450);
          setGrid(prev => prev.map((row, r) =>
            row.map((cell, ci) => ci === col ? data.initialGrid[r][col] : cell)
          ));
          setMultGrid(prev => prev.map((row, r) =>
            row.map((cell, ci) => ci === col ? (data.initialMultGrid?.[r]?.[col] ?? 0) : cell)
          ));
        }, stopTime);
        stopTime += delayPerCol;
      }

      setTimeout(async () => {
        // Process tumble steps
        if (data.tumbleSteps && data.tumbleSteps.length > 0) {
          for (const step of data.tumbleSteps) {
            // Highlight winning cells
            if (step.winPositions?.length > 0) {
              setWinningCells(step.winPositions);
              setCurrentMultiplier(step.multiplierValue || 1);
              await new Promise(r => setTimeout(r, 500 / spd));
              // Explode
              setExplodingCells(step.winPositions);
              await new Promise(r => setTimeout(r, 400 / spd));
            }
            // Apply tumble
            setGrid(step.newGrid);
            setMultGrid(step.newMultGrid || Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
            setWinningCells([]);
            setExplodingCells([]);
            await new Promise(r => setTimeout(r, 400 / spd));
          }
        }

        setIsSpinning(false);
        setSpinningCols(Array(COLS).fill(false));
        setMyCoins(data.newBalance);
        localStorage.setItem('domino_coins', data.newBalance.toString());
        setTotalWin(data.totalWinAmount || 0);
        setScatterCount(data.scatterCount || 0);

        if (data.totalWinAmount > 0) {
          setStatusText(`MENANG: ${Math.floor(data.totalWinAmount).toLocaleString('id-ID')}`);
        } else {
          setStatusText('GOOD LUCK');
        }

        if (data.triggerFreeSpins) {
          setFreeSpinsLeft(prev => prev + data.freeSpinsAwarded);
        }

        if (autoSpinsRef.current > 1 || freeSpinsLeftRef.current > 0) {
          if (autoSpinsRef.current > 1) setAutoSpins(a => a - 1);
          if (freeSpinsLeftRef.current > 0) setFreeSpinsLeft(f => f - 1);
          setTimeout(() => doSpinRef.current?.(), 1200 / spd);
        } else if (autoSpinsRef.current === 1) {
          setAutoSpins(0);
        }
      }, stopTime + 150);
    };

    const handleError = (data: any) => {
      setIsSpinning(false);
      setSpinningCols(Array(COLS).fill(false));
      setAutoSpins(0);
      setStatusText('GOOD LUCK');
    };

    socket.on('gatokaca_result', handleResult);
    socket.on('gatokaca_error', handleError);
    return () => {
      socket.off('gatokaca_result', handleResult);
      socket.off('gatokaca_error', handleError);
    };
  }, [socket]);

  const doSpin = () => {
    if (isSpinning || !socket) return;
    setIsSpinning(true);
    setSpinningCols(Array(COLS).fill(true));
    setTotalWin(0);
    setCurrentMultiplier(1);
    setExplodingCells([]);
    setWinningCells([]);
    setStatusText('...');

    socket.emit('spin_gatokaca', {
      username,
      betAmount: anteMode ? betAmount * 1.25 : betAmount,
      isFreeSpins: freeSpinsLeftRef.current > 0,
      anteMode,
      clientBalance: myCoins
    });
  };
  doSpinRef.current = doSpin;

  const renderSymbol = (symId: number, multVal: number, isWin: boolean, isExplode: boolean) => {
    const winCls = isWin    ? 'gato-tile-win'    : '';
    const expCls = isExplode? 'gato-tile-explode' : '';
    const sym = GATO_SYMBOLS[symId] || GATO_SYMBOLS[4];

    /* ── MULTIPLIER ORB (Image-based with CSS filters) ──────── */
    if (symId === 10) {
      // Base image is blue gem (sym_blue_gem.png). We use hue-rotate to change the color.
      let filterStyle = 'hue-rotate(0deg)'; // Blue default
      if (multVal >= 2 && multVal <= 4) filterStyle = 'hue-rotate(-90deg) brightness(1.2)'; // Green
      else if (multVal >= 15 && multVal <= 25) filterStyle = 'hue-rotate(70deg)'; // Purple
      else if (multVal >= 50 && multVal <= 100) filterStyle = 'hue-rotate(150deg) brightness(1.1)'; // Red
      else if (multVal >= 500) filterStyle = 'hue-rotate(-160deg) brightness(1.4) sepia(0.5)'; // Gold
      
      const textColor = multVal >= 500 ? '#ffd700' : '#ffffff';

      return (
        <div className={`gato-tile ${winCls} ${expCls}`} style={{background:'none',border:'none',boxShadow:'none'}}>
          <div className="gato-mult-img-wrap" style={{ position: 'relative', width: '90%', height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src="/assets/gatokaca/sym_blue_gem.png" 
              alt="Multiplier" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain', 
                position: 'absolute', 
                filter: `${filterStyle} drop-shadow(0 0 1vh rgba(0,0,0,0.8))`,
                animation: 'multOrbPulse 2s ease-in-out infinite alternate' 
              }} 
            />
            {/* Dark overlay to make text pop */}
            <div style={{ position: 'absolute', inset: '20%', background: 'radial-gradient(circle, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }} />
            <span 
              className="gato-mult-val" 
              style={{ 
                color: textColor, 
                position: 'relative',
                zIndex: 2,
                fontSize: multVal >= 500 ? 'clamp(1rem, 2vh, 2.2vh)' : 'clamp(1rem, 2.4vh, 2.6vh)',
                textShadow: '0 0.2vh 0 #000, 0 -0.2vh 0 #000, 0.2vh 0 0 #000, -0.2vh 0 0 #000, 0 0.4vh 1vh rgba(0,0,0,1)'
              }}
            >
              {multVal > 0 ? `${multVal}x` : '?x'}
            </span>
          </div>
        </div>
      );
    }

    /* ── SCATTER (Gatokaca Face Image) ──────────────────── */
    if (symId === 9) {
      return (
        <div className={`gato-tile gato-sym-img-wrap ${winCls} ${expCls}`}>
          <img
            src="/assets/gatokaca/sym_scatter.png"
            alt="SCATTER"
            className="gato-sym-img"
            draggable={false}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/gatokaca/test_defringed.png';
            }}
          />
        </div>
      );
    }

    /* ── REGULAR SYMBOLS (0-8) ───────────────────────────── */
    if (sym.img) {
      return (
        <div className={`gato-tile gato-sym-img-wrap ${winCls} ${expCls}`}>
          <img
            src={sym.img}
            alt={sym.label}
            className="gato-sym-img"
            draggable={false}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/gatokaca/sym_ruby_ring.png';
            }}
          />
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return <GatokacaCinematicBackground progress={loadProgress} />;
  }

  return (
    <div className="gato-screen">
      {/* TEMPLE BACKGROUND */}
      <div className="gato-bg">
        <div className="gato-bg-sky" />
        <div className="gato-bg-columns-left">
          <div className="gato-pillar gato-pillar-l1" />
          <div className="gato-pillar gato-pillar-l2" />
        </div>
        <div className="gato-bg-columns-right">
          <div className="gato-pillar gato-pillar-r1" />
          <div className="gato-pillar gato-pillar-r2" />
        </div>
        <div className="gato-bg-floor" />
      </div>

      {/* TOP LEFT: Avatar + coins */}
      <div className="gato-topleft">
        <div className="gato-avatar-wrap" onClick={() => alert('Profil VIP')}>
          <img
            className="gato-avatar-img"
            src="https://i.pravatar.cc/100?img=33"
            alt="avatar"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23ffd700"/><circle cx="50" cy="38" r="18" fill="%234a148c"/><path d="M22 84 C22 64 36 58 50 58 C64 58 78 64 78 84 Z" fill="%234a148c"/></svg>';
            }}
          />
          <div className="gato-vip-badge">VIP 1</div>
        </div>
        <div className="gato-coins-row">
          <span className="gato-coin-ico">🪙</span>
          <span className="gato-coins-num">{myCoins.toLocaleString('id-ID')}</span>
          <button className="gato-plus-btn" onClick={() => alert('Top Up Koin')}>+</button>
        </div>
      </div>

      {/* TOP CENTER: Sleek Pragmatic info badge - unblocks middle of the screen */}
      <div className="gato-top-info">
        <div className="gato-top-info-text">SIMBOL MEMBAYAR DI MANA SAJA</div>
      </div>

      {/* TOP RIGHT */}
      <div className="gato-topright">
        <button className="gato-tr-btn" onClick={() => setShowLeaderboard(true)}>🏆</button>
        <button className="gato-tr-btn gato-tr-room" onClick={onBack}>
          <span className="gato-tr-icon">🔄</span>
          <span className="gato-tr-label">Ganti<br/>room</span>
        </button>
        <button className="gato-tr-btn" style={{position:'relative'}} onClick={() => setShowMenu(v => !v)}>≡</button>

        <GameMenuDropdown
          isOpen={showMenu}
          onClose={() => setShowMenu(false)}
          items={[
            { id: 'lobi', icon: '🚪', label: 'Lobi', onClick: () => { setShowMenu(false); onBack(); } },
            { id: 'tabel', icon: '📜', label: 'Tabel Bayaran', onClick: () => { setShowMenu(false); setShowRules(true); setRulesPage(0); } },
            { id: 'speed', icon: '⚡', label: 'Putaran Cepat', badge: spinSpeed > 1 ? 'ON' : 'OFF', onClick: () => setSpinSpeed(s => s === 1 ? 2 : 1) },
            { id: 'suara', icon: '🔊', label: 'Suara', badge: soundOn ? 'ON' : 'OFF', onClick: () => setSoundOn(v => !v) },
            { id: 'musik', icon: '🎵', label: 'Musik', badge: musicOn ? 'ON' : 'OFF', onClick: () => setMusicOn(v => !v) },
            { id: 'bantuan', icon: '❓', label: 'Bantuan', onClick: () => { setShowMenu(false); setShowRules(true); setRulesPage(0); } }
          ]}
        />
      </div>

      {/* MAIN AREA */}
      <div className="gato-main-area">

        {/* LEFT PANEL */}
        <div className="gato-left-panel">
          {/* Buy Spin */}
          <div className="gato-buy-spin" onClick={() => alert('Beli Free Spin: 1B')}>
            <div className="gato-bs-circle">
              <div className="gato-bs-title">BELI<br/>SPIN<br/>GRATIS</div>
              <div className="gato-bs-amount">1B</div>
            </div>
          </div>

          {/* Ransel */}
          <div className="gato-ransel" onClick={() => alert('Ransel')}>
            <div className="gato-ransel-img">🎒</div>
            <div className="gato-ransel-label">RANSEL</div>
          </div>

          {/* Taruhan panel */}
          <div className="gato-taruhan-panel">
            <div className="gato-tp-title">TARUHAN</div>
            <div className="gato-tp-amount">12.5M</div>
            <div className="gato-tp-sub">FITUR</div>
            <div className="gato-tp-sub2">GANDA</div>
            <div className="gato-tp-sub3">PELUANG MENANG</div>
            <div
              className={`gato-toggle ${anteMode ? 'on' : 'off'}`}
              onClick={() => setAnteMode(v => !v)}
            >
              <div className="gato-toggle-knob" />
              <span>{anteMode ? 'ON' : 'OFF'}</span>
            </div>
          </div>

          
        </div>

        {/* GRID */}
        <div className="gato-grid-wrap">
          {/* Free Spins Banner */}
          {freeSpinsLeft > 0 && (
            <div className="gato-fs-banner">🌟 FREE SPIN: {freeSpinsLeft} 🌟</div>
          )}

          <div className="gato-grid-frame">
            <div className="gato-grid-inner">
              {Array.from({length: ROWS}, (_, r) =>
                Array.from({length: COLS}, (_, c) => {
                  const symId = grid[r]?.[c] ?? 4;
                  const multVal = multGrid[r]?.[c] ?? 0;
                  const cellKey = `${r}-${c}`;
                  const isWin = winningCells.includes(cellKey);
                  const isExp = explodingCells.includes(cellKey);
                  return (
                    <div key={cellKey} style={{ ['--r' as any]: r }} className={`gato-cell ${spinningCols[c] ? 'gato-cell-spin' : ''} ${bouncingCols[c] ? 'gato-cell-bounce' : ''}`}>
                      {renderSymbol(symId === 10 && multVal === 0 ? 10 : symId, multVal, isWin, isExp)}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Gatotkaca Hero Character - Video with static fallback */}
        <div className="gato-right-panel">
          <div className="gato-hero-container">
            <video
              className="gato-hero-video"
              autoPlay
              loop
              muted
              playsInline
              poster="/assets/gatokaca/test_defringed.png"
            >
              <source src="/assets/gatokaca/animasi.webm" type="video/webm" />
              <img
                src="/assets/gatokaca/test_defringed.png"
                alt="Gatotkaca Hero"
                className="gato-hero-fallback-img"
              />
            </video>
          </div>
        </div>
      </div>

      {/* PRAGMATIC / HIGGS GOLDEN BOTTOM BAR */}
      <div className="gato-bottom-bar notranslate" translate="no">
        <div className="gato-bot-left">
          <button className="gato-bot-btn" onClick={() => setShowMenu(v => !v)}>
            ≡
          </button>
          <button className="gato-bot-btn" onClick={() => setSoundOn(v => !v)}>
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button className="gato-bot-btn gato-btn-info" onClick={() => { setShowRules(true); setRulesPage(0); }}>
            i
          </button>
          <button className="gato-bot-btn gato-minus" onClick={() => setBetAmount(b => Math.max(200000, b - 200000))}>
            −
          </button>
          <div className="gato-bet-box">
            <div className="gato-bet-label">BET</div>
            <div className="gato-bet-val">{betAmount.toLocaleString('en-US')}</div>
          </div>
          <button className="gato-bot-btn gato-plus-bet" onClick={() => setBetAmount(b => Math.min(10000000, b + 200000))}>
            +
          </button>
        </div>

        <div className="gato-bot-center">
          <div className="gato-win-banner">
            <div className="gato-win-label">WIN</div>
            <div className="gato-win-val">
              {totalWin > 0 ? Math.floor(totalWin).toLocaleString('en-US') : (isSpinning ? '...' : (betAmount * 1.05).toLocaleString('en-US'))}
            </div>
          </div>
        </div>

        <div className="gato-bot-right">
          <button className="gato-maxbet-btn" onClick={() => setBetAmount(10000000)}>
            <span>MAX</span>
            <span>BET</span>
          </button>
          <button className="gato-speed-btn" onClick={() => setSpinSpeed(s => s === 1 ? 2 : s === 2 ? 3 : 1)}>
            X{spinSpeed}
          </button>
          <div style={{ position: 'relative' }}>
            {showAutoMenu && (
              <div className="gato-auto-menu">
                {[10, 50, 100].map(n => (
                  <button key={n} onClick={() => { setAutoSpins(n); setShowAutoMenu(false); doSpin(); }}>{n} SPIN</button>
                ))}
                <button onClick={() => { setAutoSpins(99999); setShowAutoMenu(false); doSpin(); }}>∞</button>
              </div>
            )}
            <button
              className={`gato-spin-btn ${isSpinning ? 'gato-spin-anim' : ''}`}
              onMouseDown={(e) => {
                if (e.button !== 0) return; // Only left click
                if (isSpinning || autoSpins > 0) { 
                  setAutoSpins(0); 
                  isStoppingRef.current = true;
                  return; 
                }
                isStoppingRef.current = false;
                spinPressTimer.current = setTimeout(() => setShowAutoMenu(true), 400);
              }}
              onMouseUp={() => {
                clearTimeout(spinPressTimer.current);
                if (isStoppingRef.current) {
                  isStoppingRef.current = false;
                  return;
                }
                if (!isSpinning && autoSpins === 0 && !showAutoMenu) doSpin();
              }}
              onMouseLeave={() => {
                clearTimeout(spinPressTimer.current);
                isStoppingRef.current = false;
              }}
              onTouchStart={() => {
                if (isSpinning || autoSpins > 0) { 
                  setAutoSpins(0); 
                  isStoppingRef.current = true;
                  return; 
                }
                isStoppingRef.current = false;
                spinPressTimer.current = setTimeout(() => setShowAutoMenu(true), 400);
              }}
              onTouchEnd={(e) => {
                e.preventDefault(); // Prevent ghost clicks
                clearTimeout(spinPressTimer.current);
                if (isStoppingRef.current) {
                  isStoppingRef.current = false;
                  return;
                }
                if (!isSpinning && autoSpins === 0 && !showAutoMenu) doSpin();
              }}
              onContextMenu={e => { e.preventDefault(); setShowAutoMenu(v => !v); }}
            >
              <div className="gato-spin-title">
                {autoSpins > 0 ? (autoSpins > 90000 ? 'AUTO ∞' : `AUTO ${autoSpins}`) : (isSpinning ? 'STOP' : 'SPIN')}
              </div>
              <div className="gato-spin-sub">
                {autoSpins > 0 ? 'STOP' : (isSpinning ? 'BERHENTI' : 'HOLD FOR AUTO')}
              </div>
            </button>
          </div>
        </div>
      </div>

      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}

      {/* RULES MODAL */}
      {showRules && (
        <div className="gato-modal-overlay" onClick={() => setShowRules(false)}>
          <div className="gato-modal" onClick={e => e.stopPropagation()}>
            {rulesPage === 0 && (
              <div className="gato-rules-page">
                <h2>ATURAN GAME</h2>
                <p className="gato-rules-desc">Simbol di mana saja di layar akan terbayar. Jumlah total simbol yang sama pada layar di akhir putaran menentukan jumlah kemenangan.</p>
                <div className="gato-paytable">
                  {[0,1,2,3,4,5,6,7,8].map(sid => {
                    const sym = GATO_SYMBOLS[sid];
                    return (
                      <div key={sid} className="gato-pt-row">
                        <span className="gato-pt-emoji">{sym.emoji}</span>
                        <div className="gato-pt-pays">
                          <div>12-30 {sid === 0 ? '5M' : sid === 1 ? '2.5M' : sid === 2 ? '1.5M' : sid === 3 ? '1.2M' : sid === 4 ? '1M' : sid === 5 ? '800K' : sid === 6 ? '500K' : sid === 7 ? '400K' : '200K'}</div>
                          <div>10-11 {sid === 0 ? '2.5M' : sid === 1 ? '1M' : sid === 2 ? '500K' : sid === 3 ? '200K' : sid === 4 ? '150K' : sid === 5 ? '120K' : sid === 6 ? '100K' : sid === 7 ? '90K' : '75K'}</div>
                          <div>8-9 {sid === 0 ? '1M' : sid === 1 ? '250K' : sid === 2 ? '200K' : sid === 3 ? '150K' : sid === 4 ? '100K' : sid === 5 ? '80K' : sid === 6 ? '50K' : sid === 7 ? '40K' : '25K'}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="gato-pt-row gato-pt-scatter">
                    <span className="gato-pt-emoji">⚡</span>
                    <div className="gato-pt-pays gato-scatter-pays">
                      <div>6 → 10M</div>
                      <div>5 → 500K</div>
                      <div>4 → 300K</div>
                    </div>
                    <div className="gato-pt-scatter-desc">
                      <div>Ini adalah simbol SCATTER.</div>
                      <div>Simbol SCATTER muncul di semua ROL.</div>
                      <div>SCATTER terbayar di posisi apa pun.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {rulesPage === 1 && (
              <div className="gato-rules-page">
                <h2>FITUR TUMBLE</h2>
                <p>FITUR TUMBLE artinya bahwa setelah setiap spin, Kombonasi yang menang di bayar dan semua simbol yang menang menghilang. Simbol tersisa menghilang di bawah layar dan posisi kosong diganti dengan simbol yang berasal dari atas. Tumbling akan berlanjut hingga tak muncul lagi kombinasi kemenangan sebagai hasil dari tumble. Tidak ada batas jumblah tumble yang mungkin. Semua kemenangan ditambahkan ke Koin pemain setelah semua tumble dari spin dasar telah di mainkan.</p>
                <div className="gato-mult-orbs">
                  <div className="gato-orb-grn">⚡</div>
                  <div className="gato-orb-blu">⚡</div>
                  <div className="gato-orb-pur">⚡</div>
                  <div className="gato-orb-red">⚡</div>
                </div>
                <p>Ini adalah simbol multiplier. Muncul di semua rol dan dapat diraih secara acak selama pemutaran dan runtuhan di perminan dasar maupun FREE SPIN. Setiap kali ada simbol MULTIPLIER diraih, Simbol itu membawa nilai multiplier acak dari 2x hingga 500x. Ketika urutan runtuhan berakhir, Nilai semua simbol MULTIPLIER di layar di tambahkan seluruhnya dan total kemenangan urutan di kalikan dengan nilai akhir.</p>
              </div>
            )}
            {rulesPage === 2 && (
              <div className="gato-rules-page">
                <h2>ATURAN FREE SPIN</h2>
                <p>FITUR FREE SPIN di berikan ketika 4 atau lebih simbol SCATTER diraih dimana saja di layar. Ronde itu dimulai dengan 15 free spin. Selama ronde FREE SPIN, Setiap kali ada simbol MULTIPLIER diraih dan pemutaran menghasilkan kemenangan, nilai MULTIPLIER ditambahkan ke total pengali. Untuk seluruh durasi ronde itu, Stiap kali ada simbol MULTIPLIERS baru yang diraih dan menghasilkan kemenangan, Nilai total pengali juga digunakan untuk mengalikan kemenangan. Mendapatkan 3 simbol SCATTER atau lebih saat MODE FREE SPIN. akan di tambahkan 5 free spin. ROL spesial dimainkan saat MODE FREE SPIN. Jumlah kemenangan maksimal dibatasi hingga 5000X taruhan. Jika total bonus putaran gratis mencapai 5000X, putaran segera berakhir dan bonus dibayarkan, dan semua free spin yang tersisa hangus.</p>
              </div>
            )}
            {rulesPage === 3 && (
              <div className="gato-rules-page">
                <h2>TARUHAN ANTE</h2>
                <p>Pemain memiliki opsi untuk memilih pengali taruhan. Tergantung taruhan yang dipilih, game akan berperilaku berbeda. Nilai yang mungkin adalah:</p>
                <p>Pengali taruhan 25x - peluang menang free spun secara alami akan digandakan. Lebih banyak simbol SCATTER muncul pada rol. FITUR BUY FREE SPIN di nonaktifkan.</p>
                <p>Pengali taruhan 20x - memberi kemampuan memberli MODE FREE SPIN dengan membayar nilai yang sama dengan 100x total taruhan.</p>
                <h2 style={{marginTop:'2vh'}}>BUY FREE SPIN</h2>
                <p>MODE FREE SPIN dapat langsung di picu dari permainan dasar dengan membeli sebesar 100x total taruhan saat ini. Ketika fitur 25x taruhan ante diaktifkan, Maka FITUR BUY FREE SPIN dinonaktifkan.</p>
              </div>
            )}

            {/* Pagination */}
            <div className="gato-rules-nav">
              <button className="gato-nav-arrow" onClick={() => setRulesPage(p => Math.max(0, p - 1))}>❮</button>
              <button className="gato-nav-back" onClick={() => setShowRules(false)}>KEMBALI KE GAME</button>
              <button className="gato-nav-arrow" onClick={() => setRulesPage(p => Math.min(3, p + 1))}>❯</button>
            </div>
            <div className="gato-rules-dots">
              {[0,1,2,3].map(i => (
                <div key={i} className={`gato-dot ${i === rulesPage ? 'active' : ''}`} onClick={() => setRulesPage(i)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
