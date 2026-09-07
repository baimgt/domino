import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import './gatokaca.css';
import GameMenuDropdown from './GameMenuDropdown';

interface Props {
  onBack: () => void;
  socket: Socket | null;
}

// Symbol definitions matching paytable from screenshots
export const GATO_SYMBOLS: Record<number, {
  emoji: string; name: string; label: string; tier: 'high' | 'mid' | 'low' | 'special';
  color: string; bgColor: string;
}> = {
  0: { emoji: '🪔', name: 'lamp',    label: 'Lampu Emas',   tier: 'high',    color: '#ffd700', bgColor: '#7b1fa2' },
  1: { emoji: '🦁', name: 'lion',    label: 'Singa Emas',   tier: 'high',    color: '#ffd700', bgColor: '#6a1b9a' },
  2: { emoji: '🪆', name: 'figure',  label: 'Pejuang Emas', tier: 'high',    color: '#ffa726', bgColor: '#4a148c' },
  3: { emoji: '💠', name: 'blue-gem',label: 'Permata Biru', tier: 'mid',     color: '#29b6f6', bgColor: '#0d47a1' },
  4: { emoji: '💚', name: 'grn-gem', label: 'Permata Hijau',tier: 'mid',     color: '#66bb6a', bgColor: '#1b5e20' },
  5: { emoji: '💙', name: 'blu-dia', label: 'Berlian Biru', tier: 'mid',     color: '#42a5f5', bgColor: '#1565c0' },
  6: { emoji: '💜', name: 'pur-gem', label: 'Permata Ungu', tier: 'mid',     color: '#ab47bc', bgColor: '#4a148c' },
  7: { emoji: '🟠', name: 'ora-gem', label: 'Permata Oranye',tier: 'low',   color: '#ffa726', bgColor: '#e65100' },
  8: { emoji: '🔴', name: 'red-gem', label: 'Permata Merah',tier: 'low',     color: '#ef5350', bgColor: '#b71c1c' },
  9: { emoji: '⚡', name: 'scatter', label: 'SCATTER',       tier: 'special', color: '#ffd700', bgColor: '#1a237e' },
  10:{ emoji: '🌀', name: 'multi',   label: 'MULTIPLIER',   tier: 'special', color: '#ffffff', bgColor: '#880e4f' },
};

// Paytable: count -> payout multiplier (per bet unit)
const PAYTABLE: Record<number, Record<string, number>> = {
  0:  { '12': 50, '20': 250, '30': 500  }, // Lampu Emas
  1:  { '12': 25, '20': 100, '30': 250  }, // Singa Emas
  2:  { '12': 15, '20': 50,  '30': 150  }, // Pejuang Emas
  3:  { '12': 12, '20': 20,  '30': 120  }, // Permata Biru
  4:  { '12': 10, '20': 15,  '30': 100  }, // Permata Hijau
  5:  { '12': 8,  '20': 12,  '30': 80   }, // Berlian Biru
  6:  { '12': 5,  '20': 10,  '30': 50   }, // Permata Ungu
  7:  { '12': 4,  '20': 9,   '30': 40   }, // Permata Oranye
  8:  { '12': 2,  '20': 7,   '30': 20   }, // Permata Merah
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
  const [betAmount, setBetAmount] = useState(100000);
  const [myCoins, setMyCoins] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [autoSpins, setAutoSpins] = useState(0);
  const [spinSpeed, setSpinSpeed] = useState(1);
  const [anteMode, setAnteMode] = useState(false); // Taruhan Ganda
  const [showRules, setShowRules] = useState(false);
  const [rulesPage, setRulesPage] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [explodingCells, setExplodingCells] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('GOOD LUCK');
  const [winningCells, setWinningCells] = useState<string[]>([]);
  const [scatterCount, setScatterCount] = useState(0);
  const [headerText] = useState('Simbol di mana saja di layar akan terbayar');

  const spinPressTimer = useRef<any>(null);
  const username = localStorage.getItem('domino_username') || '';
  const autoSpinsRef = useRef(autoSpins);
  const freeSpinsLeftRef = useRef(freeSpinsLeft);
  const spinSpeedRef = useRef(spinSpeed);
  const doSpinRef = useRef<any>(null);

  useEffect(() => { autoSpinsRef.current = autoSpins; }, [autoSpins]);
  useEffect(() => { freeSpinsLeftRef.current = freeSpinsLeft; }, [freeSpinsLeft]);
  useEffect(() => { spinSpeedRef.current = spinSpeed; }, [spinSpeed]);

  useEffect(() => {
    const coinsStr = localStorage.getItem('domino_coins');
    if (coinsStr) setMyCoins(parseInt(coinsStr));
    // Init a nice-looking starting grid
    const initGrid = Array(ROWS).fill(null).map(() =>
      Array(COLS).fill(null).map(() => Math.floor(Math.random() * 9))
    );
    setGrid(initGrid);
  }, []);

  // Rapid reel shuffle
  useEffect(() => {
    let interval: any = null;
    if (isSpinning) {
      interval = setInterval(() => {
        setGrid(prev => prev.map((row, r) =>
          row.map((cell, c) => spinningCols[c] ? Math.floor(Math.random() * 9) : cell)
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

    /* ── MULTIPLIER ORB ─────────────────────────────────── */
    if (symId === 10) {
      const multColors: Record<number,string[]> = {
        2:  ['#a5f3a0','#1b5e20'], 3:  ['#a5f3a0','#1b5e20'],
        5:  ['#81d4fa','#01579b'], 8:  ['#81d4fa','#01579b'],
        10: ['#81d4fa','#01579b'], 15: ['#ce93d8','#4a148c'],
        25: ['#ce93d8','#4a148c'], 50: ['#ef9a9a','#b71c1c'],
        100:['#ef9a9a','#b71c1c'],500:['#fff59d','#f57f17'],
      };
      const [c1, c2] = multColors[multVal] ?? ['#81d4fa','#01579b'];
      return (
        <div className={`gato-tile ${winCls} ${expCls}`} style={{background:'none',border:'none',boxShadow:'none'}}>
          <div className="gato-mult-orb" style={{background:`radial-gradient(circle at 32% 28%, #fff 0%, ${c1} 35%, ${c2} 80%)`}}>
            <div className="gato-mult-lightning"/>
            <span className="gato-mult-val">{multVal > 0 ? `${multVal}x` : '?x'}</span>
          </div>
        </div>
      );
    }

    /* ── SCATTER (Gatokaca Face) ─────────────────────────── */
    if (symId === 9) {
      return (
        <div className={`gato-tile gato-sym-scatter ${winCls} ${expCls}`}>
          <div className="gato-scatter-bg">
            <div className="gato-sc-gold-frame"/>
            <div className="gato-sc-face">
              <div className="gato-sc-crown"/>
              <div className="gato-sc-eyes"><div className="gato-sc-eye"/><div className="gato-sc-eye"/></div>
              <div className="gato-sc-nose"/>
              <div className="gato-sc-beard"/>
            </div>
            <div className="gato-scatter-label">SCATTER</div>
          </div>
        </div>
      );
    }

    /* ── HIGH VALUE: GOLDEN LAMP (0) ─────────────────────── */
    if (symId === 0) {
      return (
        <div className={`gato-tile gato-sym-hv ${winCls} ${expCls}`}>
          <div className="gato-hv-frame">
            <div className="gato-lamp">
              <div className="gato-lamp-spout"/>
              <div className="gato-lamp-body"/>
              <div className="gato-lamp-handle"/>
              <div className="gato-lamp-flame"/>
            </div>
          </div>
        </div>
      );
    }

    /* ── HIGH VALUE: GOLDEN LION (1) ─────────────────────── */
    if (symId === 1) {
      return (
        <div className={`gato-tile gato-sym-hv ${winCls} ${expCls}`}>
          <div className="gato-hv-frame">
            <div className="gato-lion">
              <div className="gato-lion-mane"/>
              <div className="gato-lion-head"/>
              <div className="gato-lion-body2"/>
              <div className="gato-lion-paw"/>
            </div>
          </div>
        </div>
      );
    }

    /* ── HIGH VALUE: BLUE CRYSTAL (2) ────────────────────── */
    if (symId === 2) {
      return (
        <div className={`gato-tile gato-sym-hv ${winCls} ${expCls}`}>
          <div className="gato-hv-frame">
            <div className="gato-crystal">
              <div className="gato-crystal-top"/>
              <div className="gato-crystal-body"/>
              <div className="gato-crystal-shine"/>
            </div>
          </div>
        </div>
      );
    }

    /* ── GEM SYMBOLS 3-8: 8-point star frame + orb ───────── */
    const GEM_CFG: Record<number,{inner:string;mid:string;outer:string}> = {
      3: { inner:'#e0ffff', mid:'#26c6da', outer:'#004d60' }, // teal
      4: { inner:'#f1fff0', mid:'#66bb6a', outer:'#1b5e20' }, // green
      5: { inner:'#e3f2fd', mid:'#42a5f5', outer:'#0d47a1' }, // blue
      6: { inner:'#f8e8ff', mid:'#ce93d8', outer:'#6a1b9a' }, // purple
      7: { inner:'#fff8e1', mid:'#ffa726', outer:'#e65100' }, // orange
      8: { inner:'#ffebee', mid:'#ef5350', outer:'#b71c1c' }, // red
    };
    const gc = GEM_CFG[symId] ?? GEM_CFG[4];
    return (
      <div className={`gato-tile gato-sym-gem ${winCls} ${expCls}`}>
        {/* 8-pointed star frame via two rotated squares */}
        <div className="gato-star-wrap">
          <div className="gato-star-sq gato-star-sq0"/>
          <div className="gato-star-sq gato-star-sq45"/>
          {/* Circular gem centered on star */}
          <div className="gato-gem-circle"
               style={{background:`radial-gradient(circle at 30% 25%, ${gc.inner} 0%, ${gc.mid} 50%, ${gc.outer} 100%)`}}>
            <div className="gato-gem-hi"/>
            <div className="gato-gem-lo" style={{background:`radial-gradient(circle at 70% 75%, ${gc.outer}99 0%, transparent 60%)`}}/>
          </div>
        </div>
      </div>
    );
  };

  const effectiveBet = anteMode ? betAmount * 1.25 : betAmount;

  return (
    <div className="gato-screen">
      {/* TEMPLE BACKGROUND */}
      <div className="gato-bg">
        <div className="gato-bg-sky" />
        <div className="gato-bg-columns-left" />
        <div className="gato-bg-columns-right" />
        <div className="gato-bg-floor" />
      </div>

      {/* TOP LEFT: Avatar + coins */}
      <div className="gato-topleft">
        <div className="gato-avatar-wrap">
          <img className="gato-avatar-img" src="https://i.pravatar.cc/100?img=11" alt="avatar" />
          <div className="gato-vip-badge">VIP 1</div>
        </div>
        <div className="gato-coins-row">
          <span className="gato-coin-ico">🪙</span>
          <span className="gato-coins-num">{myCoins.toLocaleString('id-ID')}</span>
          <button className="gato-plus-btn" onClick={() => alert('Top Up')}>+</button>
        </div>
      </div>

      {/* TOP CENTER: Info text */}
      <div className="gato-top-info">{headerText}</div>

      {/* TOP RIGHT */}
      <div className="gato-topright" style={{ position: 'relative' }}>
        <button className="gato-tr-btn" onClick={() => alert('Trophy')}>🏆</button>
        <button className="gato-tr-btn gato-tr-room" onClick={onBack}>
          <span className="gato-tr-icon">🔄</span>
          <span className="gato-tr-label">Ganti<br/>room</span>
        </button>
        <button className="gato-tr-btn" onClick={() => setShowMenu(v => !v)}>≡</button>

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
          <div className="gato-buy-spin" onClick={() => alert('Beli Free Spin: ' + (betAmount * 100).toLocaleString('id-ID'))}>
            <div className="gato-bs-title">BELI<br/>SPIN<br/>GRATIS</div>
            <div className="gato-bs-amount">10M</div>
          </div>

          {/* Ransel */}
          <div className="gato-ransel" onClick={() => alert('Ransel')}>
            <div className="gato-ransel-img">🦁</div>
            <div className="gato-ransel-label">RANSEL</div>
          </div>

          {/* Taruhan panel */}
          <div className="gato-taruhan-panel">
            <div className="gato-tp-title">TARUHAN</div>
            <div className="gato-tp-amount">{Math.floor(effectiveBet / 1000)}K</div>
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

          {/* Lion statue decoration */}
          <div className="gato-lion-statue">🦁</div>
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
                    <div key={cellKey} className={`gato-cell ${spinningCols[c] ? 'gato-cell-spin' : ''}`}>
                      {renderSymbol(symId === 10 && multVal === 0 ? 10 : symId, multVal, isWin, isExp)}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Gatokaca character */}
        <div className="gato-right-panel">
          <div className="gato-hero-char">
            <div className="gato-hero-crown">👑</div>
            <div className="gato-hero-body">
              <div className="gato-hero-face">😤</div>
              <div className="gato-hero-armor">⚔️</div>
            </div>
          </div>
        </div>
      </div>

      {/* PRAGMATIC / HIGGS GOLDEN BOTTOM BAR */}
      <div className="gato-bottom-bar notranslate" translate="no">
        <div className="gato-bot-left">
          <button className="gato-bot-btn gato-btn-chat" onClick={() => alert('Fitur chat segera hadir!')}>
            <svg viewBox="0 0 24 24" width="60%" height="60%" fill="#4a2503">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h2v2H6V9zm5 2H9V9h2v2zm4 0h-2V9h2v2z"/>
            </svg>
          </button>
          <button className="gato-bot-btn gato-btn-info" onClick={() => { setShowRules(true); setRulesPage(0); }}>
            i
          </button>
          <button className="gato-bot-btn gato-minus" onClick={() => setBetAmount(b => Math.max(25000, b - 25000))}>
            −
          </button>
          <div className="gato-bet-box">
            <div className="gato-bet-label">BET</div>
            <div className="gato-bet-val">{betAmount.toLocaleString('en-US')}</div>
          </div>
          <button className="gato-bot-btn gato-plus-bet" onClick={() => setBetAmount(b => Math.min(10000000, b + 25000))}>
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
              onMouseDown={() => {
                if (isSpinning || autoSpins > 0) { setAutoSpins(0); return; }
                spinPressTimer.current = setTimeout(() => setShowAutoMenu(true), 400);
              }}
              onMouseUp={() => {
                clearTimeout(spinPressTimer.current);
                if (!isSpinning && autoSpins === 0 && !showAutoMenu) doSpin();
              }}
              onMouseLeave={() => clearTimeout(spinPressTimer.current)}
              onTouchStart={() => {
                if (isSpinning || autoSpins > 0) { setAutoSpins(0); return; }
                spinPressTimer.current = setTimeout(() => setShowAutoMenu(true), 400);
              }}
              onTouchEnd={() => {
                clearTimeout(spinPressTimer.current);
                if (!isSpinning && autoSpins === 0 && !showAutoMenu) doSpin();
              }}
              onContextMenu={e => { e.preventDefault(); setShowAutoMenu(v => !v); }}
            >
              <div className="gato-spin-title">
                {isSpinning ? 'STOP' : (autoSpins > 0 ? (autoSpins > 90000 ? 'AUTO ∞' : `AUTO ${autoSpins}`) : 'SPIN')}
              </div>
              <div className="gato-spin-sub">
                {isSpinning ? 'BERHENTI' : 'HOLD FOR AUTO'}
              </div>
            </button>
          </div>
        </div>
      </div>

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
