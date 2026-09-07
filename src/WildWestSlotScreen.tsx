import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import './wildwest.css';
import GameMenuDropdown from './GameMenuDropdown';

interface Props {
  onBack: () => void;
  socket: Socket | null;
}

const ROWS = 4, COLS = 5;

const PAYLINES_DIAGRAMS = [
  [1,1,1,1,1], [2,2,2,2,2], [0,0,0,0,0], [3,3,3,3,3],
  [0,1,2,1,0], [3,2,1,2,3], [1,0,0,0,1], [2,3,3,3,2],
  [1,2,3,2,1], [2,1,0,1,2], [0,0,1,2,3], [3,3,2,1,0],
  [1,1,0,1,1], [2,2,3,2,2], [0,1,1,1,0], [3,2,2,2,3],
  [1,0,1,0,1], [2,3,2,3,2], [0,2,0,2,0], [3,1,3,1,3],
  [2,1,2,1,2], [1,2,1,2,1], [1,0,2,0,1], [2,3,1,3,2],
  [0,1,0,1,0], [3,2,3,2,3], [2,0,2,0,2], [1,3,1,3,1],
  [0,3,0,3,0], [3,0,3,0,3], [1,3,2,0,1], [2,0,1,3,2],
  [0,2,3,2,0], [3,1,0,1,3], [0,3,3,3,0], [3,0,0,0,3],
  [1,0,3,0,1], [2,3,0,3,2], [2,0,0,0,2], [1,3,3,3,1]
];

function formatPayout(mult: number, bet: number) {
  const betUnit = Math.max(1, Math.floor(bet / 40));
  const val = mult * betUnit;
  if (val >= 1000000) {
    const m = val / 1000000;
    return (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + 'M';
  }
  if (val >= 1000) {
    const k = val / 1000;
    return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + 'K';
  }
  return val.toString();
}

export default function WildWestSlotScreen({ onBack, socket }: Props) {
  const [grid, setGrid] = useState<number[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null).map(() => Math.floor(Math.random() * 11)))
  );
  const [wildMultGrid, setWildMultGrid] = useState<number[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(0))
  );
  const [stickyWilds, setStickyWilds] = useState<{ r: number; c: number; mult: number }[]>([]);

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningCols, setSpinningCols] = useState<boolean[]>(Array(COLS).fill(false));
  const [betAmount, setBetAmount] = useState(10000);
  const [myCoins, setMyCoins] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [autoSpins, setAutoSpins] = useState(0);
  const [spinSpeed, setSpinSpeed] = useState(1);
  const [showRules, setShowRules] = useState(false);
  const [rulesPage, setRulesPage] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [winningCells, setWinningCells] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('GOOD LUCK');
  const [winCelebration, setWinCelebration] = useState<{ amount: number; type: 'WIN' | 'BIG_WIN' | 'MEGA_WIN' } | null>(null);

  const spinPressTimer = useRef<any>(null);
  const isLongPressSpin = useRef(false);
  const username = localStorage.getItem('domino_username') || '';
  const autoSpinsRef = useRef(autoSpins);
  const freeSpinsLeftRef = useRef(freeSpinsLeft);
  const spinSpeedRef = useRef(spinSpeed);
  const doSpinRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => { autoSpinsRef.current = autoSpins; }, [autoSpins]);
  useEffect(() => { freeSpinsLeftRef.current = freeSpinsLeft; }, [freeSpinsLeft]);
  useEffect(() => { spinSpeedRef.current = spinSpeed; }, [spinSpeed]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('.ww-spin-btn-container') || target?.closest('.ww-speed-btn-container')) {
        return;
      }
      setShowAutoMenu(false);
      setShowSpeedMenu(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    const coinsStr = localStorage.getItem('domino_coins');
    if (coinsStr) setMyCoins(parseInt(coinsStr));
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (isSpinning) {
      interval = setInterval(() => {
        setGrid(prev => prev.map((row, r) =>
          row.map((cell, c) => {
            // Keep sticky wild positions during free spins
            if (freeSpinsLeftRef.current > 0 && stickyWilds.some(w => w.r === r && w.c === c)) return 12;
            return spinningCols[c] ? Math.floor(Math.random() * 11) : cell;
          })
        ));
      }, 70 / spinSpeedRef.current);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isSpinning, spinningCols, stickyWilds]);

  useEffect(() => {
    if (!socket) return;
    const handleResult = async (data: any) => {
      const spd = spinSpeedRef.current;
      let stopTime = 150 / spd;
      const delayPerCol = 200 / spd;

      for (let c = 0; c < COLS; c++) {
        const col = c;
        setTimeout(() => {
          setSpinningCols(prev => { const n = [...prev]; n[col] = false; return n; });
          setGrid(prev => prev.map((row, r) =>
            row.map((cell, ci) => ci === col ? data.initialGrid[r][col] : cell)
          ));
          setWildMultGrid(prev => prev.map((row, r) =>
            row.map((cell, ci) => ci === col ? (data.initialWildMultGrid?.[r]?.[col] ?? 0) : cell)
          ));
        }, stopTime);
        stopTime += delayPerCol;
      }

      setTimeout(async () => {
        setIsSpinning(false);
        setSpinningCols(Array(COLS).fill(false));
        setMyCoins(data.newBalance);
        localStorage.setItem('domino_coins', data.newBalance.toString());
        setTotalWin(data.totalWinAmount || 0);
        setWinningCells(data.winningCells || []);
        setStatusText(data.totalWinAmount > 0 ? `MENANG: ${Math.floor(data.totalWinAmount).toLocaleString('id-ID')}` : 'GOOD LUCK');

        const winAmt = data.totalWinAmount || 0;
        if (winAmt > 0) {
          const winType = winAmt >= betAmount * 20 ? 'MEGA_WIN' : winAmt >= betAmount * 5 ? 'BIG_WIN' : 'WIN';
          setWinCelebration({ amount: winAmt, type: winType });
          const autoCloseTime = autoSpinsRef.current > 0 || freeSpinsLeftRef.current > 0 ? 2000 : 3800;
          setTimeout(() => {
            setWinCelebration(null);
          }, autoCloseTime);
        }

        if (data.newStickyWilds) {
          setStickyWilds(data.newStickyWilds);
        }

        if (data.triggerFreeSpins) {
          setFreeSpinsLeft(p => p + data.freeSpinsAwarded);
        }

        if (autoSpinsRef.current > 1 || freeSpinsLeftRef.current > 0) {
          if (autoSpinsRef.current > 1) setAutoSpins(a => a - 1);
          if (freeSpinsLeftRef.current > 0) setFreeSpinsLeft(f => f - 1);
          setTimeout(() => doSpinRef.current?.(), 1000 / spd);
        } else if (autoSpinsRef.current === 1) {
          setAutoSpins(0);
        }
      }, stopTime + 150);
    };

    const handleError = () => {
      setIsSpinning(false);
      setSpinningCols(Array(COLS).fill(false));
      setAutoSpins(0);
      setStatusText('GOOD LUCK');
    };

    socket.on('wildwest_result', handleResult);
    socket.on('wildwest_error', handleError);
    return () => { socket.off('wildwest_result', handleResult); socket.off('wildwest_error', handleError); };
  }, [socket]);

  const doSpin = () => {
    if (isSpinning || !socket) return;
    setWinCelebration(null);
    setIsSpinning(true);
    setSpinningCols(Array(COLS).fill(true));
    setTotalWin(0);
    setWinningCells([]);
    setStatusText('...');
    socket.emit('spin_wildwest', {
      username,
      betAmount,
      isFreeSpins: freeSpinsLeftRef.current > 0,
      stickyWilds,
      clientBalance: myCoins
    });
  };
  doSpinRef.current = doSpin;

  // High Fidelity Wild West Gold Symbol Renderer Matching Paytable
  const renderSymbol = (symId: number, wildMult: number, isWin: boolean) => {
    const winCls = isWin ? 'ww-tile-win' : '';

    /* ── WILD (12): Golden Plaque with 3D Multiplier Overlay ─────────── */
    if (symId === 12) {
      const multCls = wildMult === 2 ? 'mult-x2' : wildMult === 3 ? 'mult-x3' : wildMult === 5 ? 'mult-x5' : 'mult-x2';
      return (
        <div className={`ww-tile ww-sym-wild ${winCls}`}>
          <div className="ww-img-symbol-wrap">
            <img src="/assets/wildwest/wild.png" alt="Wild" className="ww-sym-png-img" />
            {wildMult > 1 && (
              <div className={`ww-wild-3d-mult ${multCls}`}>
                <span className="ww-mult-txt">x{wildMult}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    /* ── SCATTER (11): Sunset Western Saloon Doors ───────────────────── */
    if (symId === 11) {
      return (
        <div className={`ww-tile ww-sym-scatter ${winCls}`}>
          <div className="ww-img-symbol-wrap">
            <img src="/assets/wildwest/scatter.png" alt="Scatter" className="ww-sym-png-img" />
          </div>
        </div>
      );
    }

    /* ── 0: SHERIFF (Gold Frame, Cowboy Hat, Rifle, Cigarette) ───────── */
    if (symId === 0) {
      return (
        <div className={`ww-tile ww-sym-sheriff ${winCls}`}>
          <div className="ww-img-symbol-wrap">
            <img src="/assets/wildwest/sheriff.png" alt="Sheriff" className="ww-sym-png-img" />
          </div>
        </div>
      );
    }

    /* ── 1: OUTLAW (Green Frame, Black Hat, Revolver Up) ─────────────── */
    if (symId === 1) {
      return (
        <div className={`ww-tile ww-sym-outlaw ${winCls}`}>
          <div className="ww-img-symbol-wrap">
            <img src="/assets/wildwest/outlaw.png" alt="Outlaw" className="ww-sym-png-img" />
          </div>
        </div>
      );
    }

    /* ── 2: COWGIRL (Blue Frame, White Hat, Red Hair, Pistol) ────────── */
    if (symId === 2) {
      return (
        <div className={`ww-tile ww-sym-cowgirl ${winCls}`}>
          <div className="ww-img-symbol-wrap">
            <img src="/assets/wildwest/cowgirl.png" alt="Cowgirl" className="ww-sym-png-img" />
          </div>
        </div>
      );
    }

    /* ── 3: SALOON LADY (Purple Frame, Pink Scarf, Bun Hair) ─────────── */
    if (symId === 3) {
      return (
        <div className={`ww-tile ww-sym-lady ${winCls}`}>
          <div className="ww-img-symbol-wrap">
            <img src="/assets/wildwest/lady.png" alt="Saloon Lady" className="ww-sym-png-img" />
          </div>
        </div>
      );
    }

    /* ── 4: GOLD SACKS (Two Burlap Sacks Overflowing with Gold Coins) ── */
    if (symId === 4) {
      return (
        <div className={`ww-tile ww-sym-gold ${winCls}`}>
          <div className="ww-img-symbol-wrap">
            <img src="/assets/wildwest/gold_sacks.png" alt="Gold Sacks" className="ww-sym-png-img" />
          </div>
        </div>
      );
    }

    /* ── 5: GUN HOLSTER (Leather Holster Belt with Revolver & Bullets) ─ */
    if (symId === 5) {
      return (
        <div className={`ww-tile ww-sym-gun ${winCls}`}>
          <div className="ww-img-symbol-wrap">
            <img src="/assets/wildwest/holster.png" alt="Gun Holster" className="ww-sym-png-img" />
          </div>
        </div>
      );
    }

    /* ── 6: A (Cyan-Blue Wood Letter with Metallic Silver Rivets) ────── */
    if (symId === 6) {
      return (
        <div className={`ww-tile ww-sym-card ${winCls}`}>
          <div className="ww-img-symbol-wrap">
            <img src="/assets/wildwest/sym_a.png" alt="A" className="ww-sym-png-img" />
          </div>
        </div>
      );
    }

    /* ── 7: K (Gold/Yellow Wood Letter with Golden Crown Emblem) ─────── */
    if (symId === 7) {
      return (
        <div className={`ww-tile ww-sym-card ${winCls}`}>
          <div className="ww-img-symbol-wrap">
            <img src="/assets/wildwest/sym_k.png" alt="K" className="ww-sym-png-img" />
          </div>
        </div>
      );
    }

    /* ── 8: Q (Pink/Magenta Wood Letter with Golden Crown Emblem) ────── */
    if (symId === 8) {
      return (
        <div className={`ww-tile ww-sym-card ${winCls}`}>
          <div className="ww-img-symbol-wrap">
            <img src="/assets/wildwest/sym_q.png" alt="Q" className="ww-sym-png-img" />
          </div>
        </div>
      );
    }

    /* ── 9: J (Forest Green Wood Letter with Emerald Heart Gem) ──────── */
    if (symId === 9) {
      return (
        <div className={`ww-tile ww-sym-card ${winCls}`}>
          <div className="ww-img-symbol-wrap">
            <img src="/assets/wildwest/sym_j.png" alt="J" className="ww-sym-png-img" />
          </div>
        </div>
      );
    }

    /* ── 10: 10 (Crimson Red Wood Numbers with Silver Rivets) ────────── */
    return (
      <div className={`ww-tile ww-sym-card ${winCls}`}>
        <div className="ww-img-symbol-wrap">
          <img src="/assets/wildwest/sym_10.png" alt="10" className="ww-sym-png-img" />
        </div>
      </div>
    );
  };

  return (
    <div className="ww-screen notranslate" translate="no">
      {/* DESERT SALOON BACKGROUND */}
      <div className="ww-bg">
        <div className="ww-bg-sky" />
        <div className="ww-bg-mountains" />
        <div className="ww-bg-saloon" />
      </div>

      {/* TOP BAR - ONLY IN GAMEPLAY MODE */}
      {!showRules && (
        <div className="ww-top-bar">
          {/* TOP LEFT PROFILE & COINS */}
          <div className="ww-profile-capsule">
            <div className="ww-avatar-wrap">
              <img className="ww-avatar-img" src="https://api.dicebear.com/7.x/bottts/svg?seed=King" alt="avatar" />
              <div className="ww-vip-badge">VIP</div>
            </div>
            <div className="ww-signal-bars">
              <span className="bar bar1" /><span className="bar bar2" /><span className="bar bar3" /><span className="bar bar4" />
            </div>
            <div className="ww-coins-pill">
              <span className="ww-coin-ico">🪙</span>
              <span className="ww-coins-num">{myCoins.toLocaleString('id-ID')}</span>
              <button className="ww-plus-circle-btn" onClick={() => alert('Top Up')}>+</button>
            </div>
          </div>

          {/* TOP RIGHT BUTTONS */}
          <div className="ww-topright">
            <button className="ww-tr-circle-btn" onClick={onBack} title="Ganti Room">
              <div className="ww-tr-icon">🚪</div>
              <span className="ww-tr-text">Ganti<br />room</span>
            </button>
            <button className="ww-tr-circle-btn menu" onClick={() => setShowMenu(v => !v)} title="Menu">
              <div className="ww-tr-hamburger">
                <span /><span /><span />
              </div>
            </button>

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
        </div>
      )}

      {/* MAIN GAMEPLAY STAGE OR FULL-SCREEN RULES STAGE */}
      {!showRules ? (
        <div className="ww-main-area">
          {/* LEFT PANEL */}
          <div className="ww-left-panel">
            <div className="ww-buy-spin-card g-btn-press" onClick={() => alert('Beli Free Spin: ' + (betAmount * 100).toLocaleString('id-ID'))}>
              <div className="ww-bs-title">BELI</div>
              <div className="ww-bs-sub">SPIN GRATIS</div>
              <div className="ww-bs-cost">{Math.floor(betAmount * 100 / 1000000) > 0 ? Math.floor(betAmount * 100 / 1000000) + ' M' : (betAmount * 100 / 1000).toFixed(0) + ' K'}</div>
            </div>

            <div className="ww-ransel-mascot" onClick={() => alert('Ransel')}>
              <div className="ww-ransel-badge">
                <div className="ww-mascot-emoji">🤠</div>
                <div className="ww-ransel-tag">RANSEL</div>
              </div>
            </div>
          </div>

          {/* GRID WITH WOOD ARCH HEADER, STEER SKULLS & REELS */}
          <div className="ww-grid-wrap">
            {freeSpinsLeft > 0 && (
              <div className="ww-fs-banner">⭐ STICKY WILD FREE SPIN: {freeSpinsLeft} ⭐</div>
            )}

            {/* UNIFIED TOP WOODEN ARCH HEADER WITH WILD WEST GOLD LOGO */}
            <div className="ww-cabinet-top-arch">
              {/* Left Steer Skull & Lantern */}
              <div className="ww-arch-skull left">
                <span className="ww-skull-ico">🐂</span>
                <span className="ww-lantern-ico">🏮</span>
              </div>

              {/* Center Logo Area */}
              <div className="ww-arch-logo-center">
                <div className="ww-logo-guns-wrap">
                  <span className="ww-arch-gun left">🔫</span>
                  <h1 className="ww-arch-wild-west">WILD WEST<span className="ww-arch-tm">™</span></h1>
                  <span className="ww-arch-gun right">🔫</span>
                </div>
                <div className="ww-arch-gold-badge">
                  <span className="ww-badge-star-mini">★</span>
                  <span className="ww-arch-gold-txt">GOLD</span>
                  <span className="ww-badge-star-mini">★</span>
                </div>
              </div>

              {/* Right Steer Skull & Lantern */}
              <div className="ww-arch-skull right">
                <span className="ww-skull-ico">🐂</span>
                <span className="ww-lantern-ico">🏮</span>
              </div>
            </div>

            <div className="ww-grid-frame">
              <div className="ww-grid-inner">
                {Array.from({ length: ROWS }, (_, r) =>
                  Array.from({ length: COLS }, (_, c) => {
                    const symId = grid[r]?.[c] ?? 0;
                    const wildMult = wildMultGrid[r]?.[c] ?? 0;
                    const cellKey = `${r}-${c}`;
                    const isWinner = winningCells.includes(cellKey);
                    const isLoser = winningCells.length > 0 && !isWinner;
                    return (
                      <div
                        key={cellKey}
                        className={`ww-cell ${spinningCols[c] ? 'ww-cell-spin' : ''} ${isWinner ? 'is-winner' : ''} ${isLoser ? 'is-loser' : ''}`}
                      >
                        {renderSymbol(symId, wildMult, isWinner)}
                        {isWinner && <div className="ww-win-sparkle">✨</div>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Machine Ledge with Coins and Hat */}
            <div className="ww-machine-ledge">
              <div className="ww-ledge-left-coins">
                <span>🪙</span><span>💰</span><span>🪙</span>
              </div>
              <div className="ww-ledge-right-props">
                <span>🤠</span><span>🔫</span>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL DRAWER TAB */}
          <div className="ww-right-panel">
            <div className="ww-right-drawer-tab">◀</div>
          </div>
        </div>
      ) : (
        /* FULL-SCREEN AUTHENTIC RULES VIEW (PAGES 0, 1, 2, 3) */
        <div className="ww-rules-full-stage">
          {/* Header */}
          <div className="ww-rules-stage-header">
            <h1 className="ww-rules-stage-title">
              {rulesPage === 3 ? 'Aturan free spin' : 'Aturan game'}
            </h1>
            {rulesPage === 0 && (
              <p className="ww-rules-stage-subtitle">
                Semua simbol dibayar dari kiri ke kanan di rol sebelahnya mulai dari rol paling kiri
              </p>
            )}
            {rulesPage === 2 && (
              <div className="ww-rules-stage-subtitle-group">
                <p>Hadiah dibayarkan secara berurutan dari kiri ke kanan.</p>
                <p>Freespin akan ditambahkan ke garis kemenangan. Semua kemenangan akan dikalikan sesuai garis kemenangan. Jika ada kemenangan lebih dari satu garis kemenangan, semua kemenangan ditambahkan ke total kemenangan.</p>
              </div>
            )}
            {rulesPage === 3 && (
              <p className="ww-rules-stage-subtitle">Mode akan dimulai dengan 8 spin</p>
            )}
          </div>

          {/* Body Content */}
          <div className="ww-rules-stage-body">
            {/* PAGE 0: 11 SYMBOLS PAYTABLE */}
            {rulesPage === 0 && (
              <div className="ww-rules-p0-container">
                {/* Top Row: 6 High-Value Symbols */}
                <div className="ww-rules-p0-top-row">
                  {/* Sheriff */}
                  <div className="ww-p0-sym-card">
                    <div className="ww-p0-sym-icon">{renderSymbol(0, 0, false)}</div>
                    <div className="ww-p0-sym-pays">
                      <div><b>5</b> - {formatPayout(800, betAmount)}</div>
                      <div><b>4</b> - {formatPayout(200, betAmount)}</div>
                      <div><b>3</b> - {formatPayout(60, betAmount)}</div>
                    </div>
                  </div>
                  {/* Outlaw */}
                  <div className="ww-p0-sym-card">
                    <div className="ww-p0-sym-icon">{renderSymbol(1, 0, false)}</div>
                    <div className="ww-p0-sym-pays">
                      <div><b>5</b> - {formatPayout(500, betAmount)}</div>
                      <div><b>4</b> - {formatPayout(150, betAmount)}</div>
                      <div><b>3</b> - {formatPayout(50, betAmount)}</div>
                    </div>
                  </div>
                  {/* Cowgirl */}
                  <div className="ww-p0-sym-card">
                    <div className="ww-p0-sym-icon">{renderSymbol(2, 0, false)}</div>
                    <div className="ww-p0-sym-pays">
                      <div><b>5</b> - {formatPayout(300, betAmount)}</div>
                      <div><b>4</b> - {formatPayout(80, betAmount)}</div>
                      <div><b>3</b> - {formatPayout(30, betAmount)}</div>
                    </div>
                  </div>
                  {/* Saloon Lady */}
                  <div className="ww-p0-sym-card">
                    <div className="ww-p0-sym-icon">{renderSymbol(3, 0, false)}</div>
                    <div className="ww-p0-sym-pays">
                      <div><b>5</b> - {formatPayout(200, betAmount)}</div>
                      <div><b>4</b> - {formatPayout(50, betAmount)}</div>
                      <div><b>3</b> - {formatPayout(20, betAmount)}</div>
                    </div>
                  </div>
                  {/* Gold Sacks */}
                  <div className="ww-p0-sym-card">
                    <div className="ww-p0-sym-icon">{renderSymbol(4, 0, false)}</div>
                    <div className="ww-p0-sym-pays">
                      <div><b>5</b> - {formatPayout(150, betAmount)}</div>
                      <div><b>4</b> - {formatPayout(30, betAmount)}</div>
                      <div><b>3</b> - {formatPayout(14, betAmount)}</div>
                    </div>
                  </div>
                  {/* Gun Holster */}
                  <div className="ww-p0-sym-card">
                    <div className="ww-p0-sym-icon">{renderSymbol(5, 0, false)}</div>
                    <div className="ww-p0-sym-pays">
                      <div><b>5</b> - {formatPayout(100, betAmount)}</div>
                      <div><b>4</b> - {formatPayout(20, betAmount)}</div>
                      <div><b>3</b> - {formatPayout(10, betAmount)}</div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: 5 Card Symbols (A, K, Q, J, 10) */}
                <div className="ww-rules-p0-bottom-row">
                  {/* A */}
                  <div className="ww-p0-sym-card">
                    <div className="ww-p0-sym-icon">{renderSymbol(6, 0, false)}</div>
                    <div className="ww-p0-sym-pays">
                      <div><b>5</b> - {formatPayout(60, betAmount)}</div>
                      <div><b>4</b> - {formatPayout(12, betAmount)}</div>
                      <div><b>3</b> - {formatPayout(6, betAmount)}</div>
                    </div>
                  </div>
                  {/* K */}
                  <div className="ww-p0-sym-card">
                    <div className="ww-p0-sym-icon">{renderSymbol(7, 0, false)}</div>
                    <div className="ww-p0-sym-pays">
                      <div><b>5</b> - {formatPayout(60, betAmount)}</div>
                      <div><b>4</b> - {formatPayout(12, betAmount)}</div>
                      <div><b>3</b> - {formatPayout(6, betAmount)}</div>
                    </div>
                  </div>
                  {/* Q */}
                  <div className="ww-p0-sym-card">
                    <div className="ww-p0-sym-icon">{renderSymbol(8, 0, false)}</div>
                    <div className="ww-p0-sym-pays">
                      <div><b>5</b> - {formatPayout(40, betAmount)}</div>
                      <div><b>4</b> - {formatPayout(10, betAmount)}</div>
                      <div><b>3</b> - {formatPayout(4, betAmount)}</div>
                    </div>
                  </div>
                  {/* J */}
                  <div className="ww-p0-sym-card">
                    <div className="ww-p0-sym-icon">{renderSymbol(9, 0, false)}</div>
                    <div className="ww-p0-sym-pays">
                      <div><b>5</b> - {formatPayout(40, betAmount)}</div>
                      <div><b>4</b> - {formatPayout(10, betAmount)}</div>
                      <div><b>3</b> - {formatPayout(4, betAmount)}</div>
                    </div>
                  </div>
                  {/* 10 */}
                  <div className="ww-p0-sym-card">
                    <div className="ww-p0-sym-icon">{renderSymbol(10, 0, false)}</div>
                    <div className="ww-p0-sym-pays">
                      <div><b>5</b> - {formatPayout(40, betAmount)}</div>
                      <div><b>4</b> - {formatPayout(10, betAmount)}</div>
                      <div><b>3</b> - {formatPayout(4, betAmount)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 1: WILD & SCATTER RULES */}
            {rulesPage === 1 && (
              <div className="ww-rules-p1-container">
                {/* Left Column: WILD */}
                <div className="ww-rules-p1-col">
                  <div className="ww-rules-p1-img-box">
                    <img src="/assets/wildwest/wild.png" alt="WILD" className="ww-rules-p1-img" />
                  </div>
                  <p className="ww-rules-p1-txt">
                    Simbol ini adalah WILD dan dapat menggantikan semua simbol kecuali{' '}
                    <img src="/assets/wildwest/scatter.png" alt="SCATTER" className="ww-inline-scatter-badge" />
                  </p>
                  <p className="ww-rules-p1-txt">
                    Simbol WILD hanya muncul di rol 2,3 dan 4<br />
                    Setiap kali WILD muncul akan mendapatkan pengalian x2,x3 ataupun x5
                  </p>
                  <p className="ww-rules-p1-txt">
                    Pengali WILD diterapkan pada setiap garis kemenangan yang menjadi bagiannya
                  </p>
                  <p className="ww-rules-p1-txt">
                    Jika beberapa simbol WILD membentuk garis pembayaran, pengganda dari semua simbol WILD pada garis tersebut akan ditambahkan satu sama lain.
                  </p>
                </div>

                {/* Right Column: SCATTER */}
                <div className="ww-rules-p1-col">
                  <div className="ww-rules-p1-img-box">
                    <img src="/assets/wildwest/scatter.png" alt="SCATTER" className="ww-rules-p1-img" />
                  </div>
                  <p className="ww-rules-p1-txt">
                    Ini adalah simbol SCATTER. hanya muncul pada rol 1, 3 dan 5.
                  </p>
                  <p className="ww-rules-p1-txt">
                    Raih 3 simbol SCATTER di rol 1,3 dan 5 untuk memicu mode free spin
                  </p>
                </div>
              </div>
            )}

            {/* PAGE 2: 40 PAYLINES GRID DIAGRAM */}
            {rulesPage === 2 && (
              <div className="ww-rules-p2-container">
                <div className="ww-paylines-grid-panel">
                  {PAYLINES_DIAGRAMS.map((pattern, idx) => (
                    <div key={idx} className="ww-mini-payline-item">
                      <span className="ww-mini-payline-num">{idx + 1}</span>
                      <div className="ww-mini-grid">
                        {Array.from({ length: 4 }, (_, r) => (
                          <div key={r} className="ww-mini-row">
                            {Array.from({ length: 5 }, (_, c) => (
                              <div
                                key={c}
                                className={`ww-mini-cell ${pattern[c] === r ? 'active' : ''}`}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="ww-paylines-bottom-notes">
                  <p>Bonus freespin diberikan kepada pemain di akhir putaran.</p>
                  <p>Total bonus freespin dalam histori telah akumulasi seluruh proses bonus.</p>
                </div>
              </div>
            )}

            {/* PAGE 3: ATURAN FREE SPIN & EXTRA SPINS TABLE */}
            {rulesPage === 3 && (
              <div className="ww-rules-p3-container">
                <p className="ww-p3-main-desc">
                  Semua simbol WILD yang muncul di rol 2, 3 atau 4 selama mode Free Spins akan tetap ada di layar selama durasi putaran Free Spins. Simbol WILD dengan pengali acak yang terungkap saat WILD muncul dan bertahan hingga akhir putaran.
                </p>

                <div className="ww-p3-scatter-box">
                  <div className="ww-p3-star-desc">
                    <span className="ww-p3-star-badge">⭐</span>
                    <span>Ini adalah simbol tumble SCATTER. Muncul secara acak di atas simbol apa pun selama putaran Free Spins, termasuk simbol WILD.</span>
                  </div>
                  <div className="ww-p3-extraspins-table">
                    <div className="ww-p3-table-col">
                      <div className="ww-p3-table-row">
                        <span className="ww-p3-mult">5x</span>
                        <span className="ww-p3-star-ico">⭐</span>
                        <span className="ww-p3-lbl">SCATTER Extra 20 FREESPIN</span>
                      </div>
                      <div className="ww-p3-table-row">
                        <span className="ww-p3-mult">4x</span>
                        <span className="ww-p3-star-ico">⭐</span>
                        <span className="ww-p3-lbl">SCATTER Extra 12 FREESPIN</span>
                      </div>
                    </div>
                    <div className="ww-p3-table-col">
                      <div className="ww-p3-table-row">
                        <span className="ww-p3-mult">3x</span>
                        <span className="ww-p3-star-ico">⭐</span>
                        <span className="ww-p3-lbl">SCATTER Extra 8 FREESPIN</span>
                      </div>
                      <div className="ww-p3-table-row">
                        <span className="ww-p3-mult">2x</span>
                        <span className="ww-p3-star-ico">⭐</span>
                        <span className="ww-p3-lbl">SCATTER Extra 4 FREESPIN</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ww-p3-footer-notes">
                  <p>Jika total kemenangan kurang dari 10x dari taruhan di akhir freespin, bonus 10x dari taruhan diberikan.</p>
                  <p>Jumlah bonus maksimal dibatasi hingga 5,000x taruhan. Jika total kemenangan freespin mencapai 5,000x, putaran segera berakhir dan bonus dibayarkan, dan sisa seluruh freespin hangus.</p>
                  <p>Rol khusus akan dimainkan pada mode freespin.</p>
                  <p>Pembelian 100x total taruhan Anda saat ini di game dasar akan langsung memicu mode freespin dengan 8 putaran</p>
                </div>
              </div>
            )}
          </div>

          {/* Floating Navigation above Bottom HUD Bar */}
          <div className="ww-rules-floating-nav">
            {/* 4 Pagination Dots */}
            <div className="ww-rules-dots-row">
              {[0, 1, 2, 3].map(p => (
                <div
                  key={p}
                  className={`ww-rules-dot ${rulesPage === p ? 'active' : ''}`}
                  onClick={() => setRulesPage(p)}
                />
              ))}
            </div>

            {/* Navigation Buttons: ◀ [ KEMBALI KE GAME ] ▶ */}
            <div className="ww-rules-nav-row">
              <button className="ww-rules-arrow-btn" onClick={() => setRulesPage(p => (p + 3) % 4)}>
                ◀
              </button>
              <button className="ww-rules-back-gold-btn g-btn-press" onClick={() => setShowRules(false)}>
                KEMBALI KE GAME
              </button>
              <button className="ww-rules-arrow-btn" onClick={() => setRulesPage(p => (p + 1) % 4)}>
                ▶
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM BAR (AUTHENTIC WESTERN HUD MATCHING SCREENSHOT) */}
      <div className="ww-bottom-bar">
        {/* Left & Right Corner Filigrees & Bullet Holes */}
        <div className="ww-bar-filigree left">⚜️</div>
        <div className="ww-bullet-hole hole-1" />
        <div className="ww-bullet-hole hole-2" />
        <div className="ww-bar-filigree right">⚜️</div>

        <div className="ww-bot-left">
          <button className="ww-hud-btn" onClick={() => alert('Chat')} title="Chat">
            <span className="ww-hud-ico-chat">💬</span>
          </button>
          <button
            className={`ww-hud-btn ${showRules ? 'active' : ''}`}
            onClick={() => {
              if (showRules) setShowRules(false);
              else { setShowRules(true); setRulesPage(0); }
            }}
            title="Aturan"
          >
            <span className="ww-hud-txt-i">i</span>
          </button>
          <button className="ww-hud-btn ww-minus" onClick={() => setBetAmount(b => Math.max(2000, b - 2000))} title="Kurangi Bet">
            <span className="ww-hud-minus-sym">−</span>
          </button>
          <div className="ww-hud-bet-display">
            <span className="ww-hud-bet-title">BET</span>
            <span className="ww-hud-bet-amount">{betAmount.toLocaleString('id-ID')}</span>
          </div>
          <button className="ww-hud-btn ww-plus" onClick={() => setBetAmount(b => b + 2000)} title="Tambah Bet">
            <span className="ww-hud-plus-sym">+</span>
          </button>
        </div>

        <div className="ww-bot-center">
          <div className="ww-center-status-card">
            <div className="ww-status-crest">⚜️</div>
            <div className="ww-status-message">
              {totalWin > 0 ? `MENANG ${Math.floor(totalWin).toLocaleString('id-ID')}` : statusText}
            </div>
            <div className="ww-bullet-hole hole-center" />
          </div>
        </div>

        <div className="ww-bot-right">
          <button className="ww-hud-btn ww-maxbet-btn" onClick={() => setBetAmount(10000000)} title="Max Bet">
            <span className="ww-max-txt">MAX<br />BET</span>
          </button>

          {/* SPEED BUTTON WITH UPWARDS POPUP */}
          <div className="ww-speed-btn-container" style={{ position: 'relative' }}>
            {showSpeedMenu && (
              <div className="ww-popup-upwards ww-speed-popup" onClick={e => e.stopPropagation()}>
                <div className="ww-popup-header">
                  <span className="ww-popup-title">KECEPATAN</span>
                  <button className="ww-popup-close-x" onClick={() => setShowSpeedMenu(false)}>✕</button>
                </div>
                <div className="ww-speed-choices-list">
                  <button
                    className={`ww-speed-choice-btn ${spinSpeed === 1 ? 'active' : ''} g-btn-press`}
                    onClick={() => { setSpinSpeed(1); setShowSpeedMenu(false); }}
                  >
                    <span className="ww-speed-val">×1</span>
                    <span className="ww-speed-lbl">Normal</span>
                  </button>
                  <button
                    className={`ww-speed-choice-btn ${spinSpeed === 2 ? 'active' : ''} g-btn-press`}
                    onClick={() => { setSpinSpeed(2); setShowSpeedMenu(false); }}
                  >
                    <span className="ww-speed-val">×2</span>
                    <span className="ww-speed-lbl">Cepat (Fast)</span>
                  </button>
                  <button
                    className={`ww-speed-choice-btn ${spinSpeed === 3 ? 'active' : ''} g-btn-press`}
                    onClick={() => { setSpinSpeed(3); setShowSpeedMenu(false); }}
                  >
                    <span className="ww-speed-val">×3</span>
                    <span className="ww-speed-lbl">Turbo ⚡</span>
                  </button>
                </div>
                <div className="ww-popup-arrow-down" />
              </div>
            )}
            <button
              className="ww-hud-btn ww-speed-toggle"
              onClick={e => {
                e.stopPropagation();
                setShowSpeedMenu(v => !v);
                setShowAutoMenu(false);
              }}
              title="Pilih Kecepatan Putaran"
            >
              <span className="ww-speed-txt">×{spinSpeed}</span>
            </button>
          </div>

          {/* SPIN OR TUTUP BUTTON */}
          {showRules ? (
            <button
              className="ww-tutup-rectangle-btn g-btn-press"
              onClick={() => setShowRules(false)}
              title="Tutup Aturan Game"
            >
              <span className="ww-tutup-3d-text">TUTUP</span>
            </button>
          ) : (
            <div className="ww-spin-btn-container" style={{ position: 'relative' }}>
              {showAutoMenu && (
                <div className="ww-popup-upwards ww-auto-spin-popup" onClick={e => e.stopPropagation()}>
                  <div className="ww-popup-header">
                    <span className="ww-popup-title">PUTARAN OTOMATIS</span>
                    <button className="ww-popup-close-x" onClick={() => setShowAutoMenu(false)}>✕</button>
                  </div>
                  <div className="ww-autospin-grid">
                    {[10, 20, 50, 100, 200, 500].map(n => (
                      <button
                        key={n}
                        className="ww-autospin-choice-btn g-btn-press"
                        onClick={() => {
                          setAutoSpins(n);
                          setShowAutoMenu(false);
                          doSpin();
                        }}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      className="ww-autospin-choice-btn infinity g-btn-press"
                      onClick={() => {
                        setAutoSpins(99999);
                        setShowAutoMenu(false);
                        doSpin();
                      }}
                    >
                      ∞
                    </button>
                  </div>
                  <div className="ww-popup-hint">Tekan tombol Spin untuk berhenti</div>
                  <div className="ww-popup-arrow-down" />
                </div>
              )}
              <button
                className={`ww-spin-rectangle-btn g-btn-press ${isSpinning ? 'spinning' : ''}`}
                onMouseDown={e => {
                  e.stopPropagation();
                  if (isSpinning || autoSpins > 0) {
                    setAutoSpins(0);
                    return;
                  }
                  isLongPressSpin.current = false;
                  spinPressTimer.current = setTimeout(() => {
                    isLongPressSpin.current = true;
                    setShowAutoMenu(true);
                    setShowSpeedMenu(false);
                  }, 240);
                }}
                onMouseUp={e => {
                  e.stopPropagation();
                  clearTimeout(spinPressTimer.current);
                  if (isLongPressSpin.current) {
                    // Keep popup open
                    return;
                  }
                  if (autoSpins > 0) {
                    setAutoSpins(0);
                  } else if (!isSpinning && !showAutoMenu) {
                    doSpin();
                  }
                }}
                onMouseLeave={() => clearTimeout(spinPressTimer.current)}
                onTouchStart={e => {
                  e.stopPropagation();
                  if (isSpinning || autoSpins > 0) {
                    setAutoSpins(0);
                    return;
                  }
                  isLongPressSpin.current = false;
                  spinPressTimer.current = setTimeout(() => {
                    isLongPressSpin.current = true;
                    setShowAutoMenu(true);
                    setShowSpeedMenu(false);
                  }, 240);
                }}
                onTouchEnd={e => {
                  e.stopPropagation();
                  clearTimeout(spinPressTimer.current);
                  if (isLongPressSpin.current) {
                    // Keep popup open
                    return;
                  }
                  if (autoSpins > 0) {
                    setAutoSpins(0);
                  } else if (!isSpinning && !showAutoMenu) {
                    doSpin();
                  }
                }}
                onClick={e => {
                  e.stopPropagation();
                }}
                onContextMenu={e => {
                  e.preventDefault();
                  setShowAutoMenu(v => !v);
                  setShowSpeedMenu(false);
                }}
              >
                <span className="ww-spin-3d-text">
                  {autoSpins > 0 ? (autoSpins > 90000 ? 'AUTO ∞' : `AUTO ${autoSpins}`) : 'SPIN'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* WIN CELEBRATION MODAL & ANIMATION OVERLAY */}
      {winCelebration && (
        <div className="ww-win-celebration-overlay" onClick={() => setWinCelebration(null)}>
          <div className="ww-win-banner-card" onClick={e => e.stopPropagation()}>
            {/* Exploding Coins & Stars Background Particles */}
            <div className="ww-coins-rain">
              {Array.from({ length: 16 }, (_, i) => (
                <span key={i} className={`ww-rain-coin coin-${(i % 6) + 1}`}>
                  {i % 3 === 0 ? '🪙' : i % 3 === 1 ? '⭐' : '💰'}
                </span>
              ))}
            </div>

            <div className={`ww-win-title-badge ${winCelebration.type.toLowerCase()}`}>
              <span className="ww-win-stars left">★★★</span>
              <h2 className="ww-win-title-text">
                {winCelebration.type === 'MEGA_WIN' ? 'MEGA WIN' : winCelebration.type === 'BIG_WIN' ? 'BIG WIN' : 'MENANG!'}
              </h2>
              <span className="ww-win-stars right">★★★</span>
            </div>

            <div className="ww-win-amount-box">
              <div className="ww-win-currency">Rp</div>
              <div className="ww-win-counter-number">
                {Math.floor(winCelebration.amount).toLocaleString('id-ID')}
              </div>
            </div>

            <button className="ww-win-collect-btn g-btn-press" onClick={() => setWinCelebration(null)}>
              KLAIM HADIAH 🪙
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
