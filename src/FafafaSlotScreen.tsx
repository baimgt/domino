import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import './fafafa.css';
import GameMenuDropdown from './GameMenuDropdown';
import SlotMultiplierBar from './SlotMultiplierBar';
import SlotCelebrationModal, { SlotCelebrationData } from './SlotCelebrationModal';
import SlotProfileModal, { renderSlotAvatar } from './SlotProfileModal';
import { useSlotProfile } from './useSlotProfile';
import { MIN_SLOT_BET, MAX_SLOT_BET, stepSlotBet } from './slotConfig';

interface Props {
  onBack: () => void;
  socket: Socket | null;
}

const FAFAFA_SYMBOLS: Record<number, { name: string; label: string; img: string }> = {
  0: { name: 'wild-red', label: 'Wild Merah', img: '/assets/fafafa2/sym_wild_red.png' },
  1: { name: 'wild-blue', label: 'Wild Biru', img: '/assets/fafafa2/sym_wild_blue.png' },
  2: { name: 'scatter', label: 'Scatter', img: '/assets/fafafa2/sym_scatter.png' },
  3: { name: 'kakek-merah', label: 'Kakek Merah', img: '/assets/fafafa2/sym_kakek_merah.png' },
  4: { name: 'kakek-biru', label: 'Kakek Biru', img: '/assets/fafafa2/sym_kakek_biru.png' },
  5: { name: 'bocil-hijau', label: 'Bocil Hijau', img: '/assets/fafafa2/sym_bocil_hijau.png' },
  6: { name: 'bocil-ungu', label: 'Bocil Ungu', img: '/assets/fafafa2/sym_bocil_ungu.png' },
  7: { name: 'drum', label: 'Bedug Pink', img: '/assets/fafafa2/sym_drum.png' },
  8: { name: 'jade', label: 'Giok Hijau', img: '/assets/fafafa2/sym_jade.png' },
  9: { name: 'firecracker', label: 'Petasan Fa', img: '/assets/fafafa2/sym_firecracker.png' },
  10: { name: 'coin', label: 'Koin Kuno', img: '/assets/fafafa2/sym_coin.png' },
};

const PAYLINE_NUMBERS = [4, 2, 6, 8, 1, 9, 7, 3, 5];

const PAYLINE_COLORS: Record<number, string> = {
  1: '#00e5ff', // Teal/Cyan
  2: '#ff9100', // Orange
  3: '#2979ff', // Blue
  4: '#ff1744', // Red
  5: '#d500f9', // Purple
  6: '#ffd600', // Yellow
  7: '#00b0ff', // Light Blue
  8: '#00e676', // Bright Green
  9: '#76ff03', // Lime Green
};

export default function FafafaSlotScreen({ onBack, socket }: Props) {
  const userProfile = useSlotProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [grid, setGrid] = useState<number[][]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningCols, setSpinningCols] = useState<boolean[]>([false, false, false, false, false]);
  const [betAmount, setBetAmount] = useState(MIN_SLOT_BET);
  const [myCoins, setMyCoins] = useState<number>(() => {
    const saved = localStorage.getItem('domino_coins');
    const savedBonus = localStorage.getItem('domino_bonus_coins');
    const c = saved ? parseInt(saved, 10) : 0;
    const b = savedBonus ? parseInt(savedBonus, 10) : 0;
    return (c + b) > 0 ? (c + b) : 100000;
  });
  const [winLines, setWinLines] = useState<any[]>([]);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [multInfo, setMultInfo] = useState<any>(null); // dari server: tangga & pengali free spin
  const [totalWin, setTotalWin] = useState(0);
  const [autoSpins, setAutoSpins] = useState(0);
  const [isFullBoard, setIsFullBoard] = useState(false);
  const [showBonusOverlay, setShowBonusOverlay] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [rulesPage, setRulesPage] = useState(1);
  const [spinSpeed, setSpinSpeed] = useState(1);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [winningPaylineNums, setWinningPaylineNums] = useState<number[]>([]);
  const [celebration, setCelebration] = useState<SlotCelebrationData | null>(null);
  const spinPressTimer = useRef<any>(null);

  const username = localStorage.getItem('domino_username') || '';

  // Refs to avoid stale closures in timeouts
  const autoSpinsRef = useRef(autoSpins);
  const freeSpinsLeftRef = useRef(freeSpinsLeft);
  const spinSpeedRef = useRef(spinSpeed);
  const doSpinRef = useRef<any>(null);
  const spinningColsRef = useRef<boolean[]>([false, false, false, false, false]);
  const spinTimer = useRef<any>(null);

  useEffect(() => { autoSpinsRef.current = autoSpins; }, [autoSpins]);
  useEffect(() => { freeSpinsLeftRef.current = freeSpinsLeft; }, [freeSpinsLeft]);
  useEffect(() => { spinSpeedRef.current = spinSpeed; }, [spinSpeed]);

  // Initialize 5x3 grid with representative symbols
  useEffect(() => {
    // Initial display matching the reference screenshot:
    // Row 0: Coin(10), Kakek Merah(3), Bocil Ungu(6), Drum(7), Kakek Merah(3)
    // Row 1: Coin(10), Drum(7), Firecracker(9), Kakek Biru(4), Kakek Merah(3)
    // Row 2: Bocil Hijau(5), Bocil Hijau(5), Bocil Ungu(6), Bocil Ungu(6), Bocil Hijau(5)
    const initGrid = [
      [10, 3, 6, 7, 3],
      [10, 7, 9, 4, 3],
      [5, 5, 6, 6, 5],
    ];
    setGrid(initGrid);
    const coinsStr = localStorage.getItem('domino_coins');
    const bonusStr = localStorage.getItem('domino_bonus_coins');
    const cVal = coinsStr ? parseInt(coinsStr, 10) : 0;
    const bVal = bonusStr ? parseInt(bonusStr, 10) : 0;
    if (cVal + bVal > 0) setMyCoins(cVal + bVal);
  }, []);

  // Rapid symbol shuffle on active spinning reels (DFDC / FaFaFa style)
  useEffect(() => {
    let interval: any = null;
    if (isSpinning) {
      interval = setInterval(() => {
        if (!spinningColsRef.current.some(Boolean)) return;
        setGrid(prev => {
          const next = prev.map(row => [...row]);
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 5; c++) {
              if (spinningColsRef.current[c]) {
                next[r][c] = Math.floor(Math.random() * 11);
              }
            }
          }
          return next;
        });
      }, Math.max(30, Math.floor(65 / spinSpeedRef.current)));
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isSpinning]);

  useEffect(() => {
    if (!socket) return;
    
    const handleResult = (data: any) => {
      if (spinTimer.current) clearTimeout(spinTimer.current);
      setMultInfo(data.multiplier || null);
      const spd = spinSpeedRef.current;
      const minSpinBase = spd === 3 ? 240 : spd === 2 ? 400 : 750;
      const delayPerCol = spd === 3 ? 65 : spd === 2 ? 100 : 180;
      const bounceDuration = spd === 3 ? 160 : spd === 2 ? 240 : 380;
      let stopTime = minSpinBase;

      // Staggered stop: Reel 1 -> Reel 2 -> Reel 3 -> Reel 4 -> Reel 5
      for (let c = 0; c < 5; c++) {
        const col = c;
        setTimeout(() => {
          // Matikan flag reel ini secara sinkron di ref TERLEBIH DAHULU agar interval shuffle tidak menimpa
          spinningColsRef.current[col] = false;
          setSpinningCols(prev => {
            const next = [...prev];
            next[col] = false;
            return next;
          });
          setGrid(prev => {
            const next = prev.map(row => [...row]);
            for (let r = 0; r < 3; r++) {
              next[r][col] = data.grid[r][col];
            }
            return next;
          });
        }, stopTime);
        stopTime += delayPerCol;
      }

      // Finish spinning sequence after all reels settled cleanly
      const allReelsSettled = stopTime + bounceDuration + 60;
      setTimeout(() => {
        setIsSpinning(false);
        spinningColsRef.current = [false, false, false, false, false];
        setSpinningCols([false, false, false, false, false]);
        setMyCoins(data.newBalance);
        if (data.coins !== undefined) {
          localStorage.setItem('domino_coins', data.coins.toString());
        } else {
          localStorage.setItem('domino_coins', data.newBalance.toString());
        }
        if (data.bonusCoins !== undefined) {
          localStorage.setItem('domino_bonus_coins', data.bonusCoins.toString());
        }
        
        if (data.winningLines && data.winningLines.length > 0) {
          const winTotal = data.totalWinAmount;
          setWinLines(data.winningLines);
          setTotalWin(winTotal);
          const paylineNums = data.winningLines.map((wl: any) => wl.lineIdx + 1);
          setWinningPaylineNums(paylineNums);
        } else {
          setWinLines([]);
          setTotalWin(0);
          setWinningPaylineNums([]);
        }

        if (data.isFullBoard) {
          setIsFullBoard(true);
          setShowBonusOverlay(true);
          setTimeout(() => setShowBonusOverlay(false), 3500 / spd);
        } else {
          setIsFullBoard(false);
        }

        let totalFree = freeSpinsLeftRef.current;
        if (data.triggerFreeSpins) {
          totalFree += data.freeSpinsAwarded;
          setFreeSpinsLeft(totalFree);
          setCelebration({
            type: 'scatter',
            freeSpinsCount: data.freeSpinsAwarded || 10,
            title: '🏮 SCATTER FAFAFA! 🏮',
            subtext: `SELAMAT! KAMU MEMICU ${data.freeSpinsAwarded || 10} PUTARAN GRATIS!`
          });
        } else if (data.winningLines && data.winningLines.length > 0) {
          const ratio = (data.totalWinAmount || 0) / Math.max(1, betAmount);
          if (data.isFullBoard || ratio >= 30) {
            setCelebration({ type: 'super_win', amount: data.totalWinAmount });
          } else if (ratio >= 12) {
            setCelebration({ type: 'mega_win', amount: data.totalWinAmount });
          } else if (ratio >= 3) {
            setCelebration({ type: 'big_win', amount: data.totalWinAmount });
          }
        }

        // Handle auto spin & free spin continuations
        const fafaRatio = (data.totalWinAmount || 0) / Math.max(1, betAmount);
        const hasCelebration = data.triggerFreeSpins || (data.winningLines && data.winningLines.length > 0 && (data.isFullBoard || fafaRatio >= 3));
        const nextDelay = hasCelebration ? 3900 : Math.max(700, 850 / spd);

        if (autoSpinsRef.current > 1 || totalFree > 0) {
           if (autoSpinsRef.current > 1) setAutoSpins(a => a - 1);
           if (totalFree > 0) setFreeSpinsLeft(f => f - 1);
           setTimeout(() => {
             if (doSpinRef.current) doSpinRef.current();
           }, nextDelay);
        } else if (autoSpinsRef.current === 1) {
           setAutoSpins(0);
        }
      }, allReelsSettled);
    };

    const handleError = (data: any) => {
      if (spinTimer.current) clearTimeout(spinTimer.current);
      alert(data.message || 'Terjadi kesalahan');
      setIsSpinning(false);
      spinningColsRef.current = [false, false, false, false, false];
      setSpinningCols([false, false, false, false, false]);
      setAutoSpins(0);
    };

    socket.on('fafafa_result', handleResult);
    socket.on('fafafa_error', handleError);

    return () => {
      socket.off('fafafa_result', handleResult);
      socket.off('fafafa_error', handleError);
    };
  }, [socket]);

  const doSpin = () => {
    if (isSpinning || !socket) return;
    if (freeSpinsLeftRef.current === 0 && myCoins < betAmount) {
      alert(`Koin tidak cukup! Taruhan: ${betAmount.toLocaleString('id-ID')} koin.`);
      setAutoSpins(0);
      return;
    }

    setIsSpinning(true);
    spinningColsRef.current = [true, true, true, true, true];
    setSpinningCols([true, true, true, true, true]);
    setWinLines([]);
    setWinningPaylineNums([]);
    setTotalWin(0);
    setIsFullBoard(false);

    if (spinTimer.current) clearTimeout(spinTimer.current);
    spinTimer.current = setTimeout(() => {
      setIsSpinning(false);
      spinningColsRef.current = [false, false, false, false, false];
      setSpinningCols([false, false, false, false, false]);
      setAutoSpins(0);
      alert('Koneksi timeout, coba lagi.');
    }, 8000);
    
    socket.emit('spin_fafafa', {
      username,
      betAmount,
      isFreeSpins: freeSpinsLeftRef.current > 0,
      clientBalance: myCoins
    });
  };

  doSpinRef.current = doSpin;

  const renderSymbolImage = (symId: number) => {
    const sym = FAFAFA_SYMBOLS[symId] || FAFAFA_SYMBOLS[10];
    return (
      <div className={`fafafa-sym-img-wrap sym-${sym.name}`}>
        <img 
          src={sym.img} 
          alt={sym.label} 
          className="fafafa-sym-img" 
          draggable={false}
        />
      </div>
    );
  };

  const lineBet = Math.max(1, Math.floor(betAmount / 9));

  return (
    <div className="fafafa-screen">
      {/* AUTHENTIC TEMPLE COURTYARD BACKGROUND */}
      <div className="fafafa-bg-pillars"></div>


      {/* TOP LEFT (Profile, VIP, Coins, Plus) */}
      <div className="fafafa-top-left">
        <div className="fafafa-avatar g-btn-press" onClick={() => setShowProfileModal(true)} title="Lihat Profil VIP" style={{ cursor: 'pointer', position: 'relative' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {renderSlotAvatar(userProfile.avatar, 'fafafa-avatar-img', '🐸')}
          </div>
          <div style={{ position: 'absolute', bottom: '-0.7vh', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #ffd700, #ff8c00)', color: '#3e2723', fontSize: '1.2vh', fontWeight: 900, lineHeight: 1, borderRadius: '0.8vh', padding: '0.25vh 0.8vh', border: '0.15vh solid #fff', whiteSpace: 'nowrap', boxShadow: '0 0.3vh 0.5vh rgba(0,0,0,0.6)', letterSpacing: '0.02em' }}>
            VIP {userProfile.vipLevel}
          </div>
        </div>
        <div className="fafafa-signal-icon">
          <div className="fafafa-signal-bar b1"></div>
          <div className="fafafa-signal-bar b2"></div>
          <div className="fafafa-signal-bar b3"></div>
        </div>
        <div className="fafafa-coins-display">
          {myCoins.toLocaleString('id-ID')}
        </div>
        <div className="fafafa-plus-btn" onClick={() => alert('Menu Top Up')}>+</div>
      </div>

      {/* TOP CENTER: ORNATE GOLDEN PLAQUE "財神 發發發" */}
      <div className="fafafa-header-plaque-container">
        <img 
          src="/assets/fafafa2/title_plaque_clean.png" 
          alt="財神 發發發" 
          className="fafafa-header-plaque-img" 
        />
      </div>


      {/* TOP RIGHT CORNER: Trophy, Ganti room, Menu */}
      <div className="fafafa-top-right">
        <button className="fafafa-tr-btn trophy-btn" onClick={() => alert('Papan Peringkat')} title="Piala">
          <span className="trophy-icon">🏆</span>
        </button>
       
        <button className="fafafa-tr-btn menu-btn" onClick={() => setShowMenu(v => !v)} title="Menu">
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
            { id: 'suara', icon: '🔊', label: 'Suara', badge: soundOn ? 'ON' : 'OFF', onClick: () => setSoundOn(v => !v) },
            { id: 'musik', icon: '🎵', label: 'Musik', badge: musicOn ? 'ON' : 'OFF', onClick: () => setMusicOn(v => !v) },
            { id: 'bantuan', icon: '❓', label: 'Bantuan', onClick: () => { setShowMenu(false); setShowRules(true); } }
          ]}
          style={{ top: '6.5vh', right: 0 }}
        />
      </div>

      {/* LEFT FLOATING BADGES: BELI SPIN GRATIS & RANSEL */}
      <div className="fafafa-side-left">
        <div className="fafafa-side-badge buy-spin-badge" onClick={() => alert('Fitur Beli Spin Segera Hadir!')}>
          <img src="/assets/fafafa2/badge_beli_spin.png" alt="Beli Spin Gratis" className="side-badge-img" />
        </div>
        <div className="fafafa-side-badge ransel-badge" onClick={() => alert('Ransel Item Anda')}>
          <img src="/assets/fafafa2/badge_ransel.png" alt="Ransel" className="side-badge-img" />
        </div>
      </div>

      {/* RIGHT SIDE EXPAND TAB */}
      <div className="fafafa-side-right-tab">
        <button onClick={() => alert('Fitur Tambahan')}>◀</button>
      </div>

      {/* SLOT MACHINE AREA */}
      <div className="fafafa-machine-container">
        {/* TOTAL PENGALI (SIDE MULTIPLIER WIDGET) */}
        <div style={{ position: 'absolute', left: '-15vw', top: '10vh', zIndex: 12, width: '13vw' }}>
          {(() => {
            const displayMult = freeSpinsLeft > 0
              ? Math.max(1, multInfo?.freeMult || 1)
              : Math.max(1, [1, 2, 3, 5][multInfo?.idx ?? 0] || 1);
            return (
              <div className={`gato-side-multiplier ${freeSpinsLeft > 0 ? 'is-free-spin' : ''} ${displayMult > 1 ? 'is-active' : ''}`} style={{ width: '100%', boxSizing: 'border-box' }}>
                <div className="gsm-wing-top">🏮 🏮 🏮</div>
                <div className="gsm-title">{freeSpinsLeft > 0 ? 'TOTAL PENGALI' : 'PENGALI'}</div>
                <div className="gsm-orb-wrap">
                  <div className="gsm-orb-glow" />
                  <div className="gsm-orb">
                    <span className="gsm-val">{displayMult}x</span>
                  </div>
                </div>
                <div className="gsm-sub">
                  {freeSpinsLeft > 0 ? '★ TERSIMPAN ★' : (displayMult > 1 ? 'AKTIF' : 'BASE x1')}
                </div>
              </div>
            );
          })()}
        </div>
        {/* MULTIPLIER BAR - PLACED DIRECTLY ABOVE REELS */}
        <SlotMultiplierBar inline={true} idx={multInfo?.idx ?? 0} isFree={freeSpinsLeft > 0} freeMult={multInfo?.freeMult || 1} />
        {showBonusOverlay && (
          <div className="fafafa-bonus-overlay">
            <div className="bonus-gold-box">
              <h1 className="bonus-title">BONUS SATU PAPAN!</h1>
              <h2 className="bonus-amount">+{totalWin.toLocaleString('id-ID')}</h2>
            </div>
          </div>
        )}

        {freeSpinsLeft > 0 && (
          <div className="fafafa-freespin-banner">
            <span className="fs-badge-text">FREE GAME: {freeSpinsLeft} PUTARAN</span>
          </div>
        )}

        {/* 5x3 REELS WITH GOLD ORNATE BORDER */}
        <div className={`fafafa-machine-frame ${isSpinning ? 'spinning' : ''}`}>
          
          {/* Left Payline Numbers: 4, 2, 6, 8, 1, 9, 7, 3, 5 */}
          <div className="fafafa-payline-col left">
            {PAYLINE_NUMBERS.map(n => {
              const isWin = winningPaylineNums.includes(n);
              return (
                <div 
                  key={`L${n}`} 
                  className={`fafafa-payline-num p-${n} ${isWin ? 'active-win' : ''}`}
                  style={{ '--pline-color': PAYLINE_COLORS[n] } as React.CSSProperties}
                  title={`Payline ${n}`}
                >
                  <span className="pline-text">{n}</span>
                </div>
              );
            })}
          </div>

          {/* Center 5x3 Grid */}
          <div className="fafafa-grid">
            {/* Draw win lines */}
            <svg className="fafafa-svg-lines" viewBox="0 0 500 300">
              {winLines.map((wl, i) => {
                const color = PAYLINE_COLORS[wl.lineIdx + 1] || '#ffd700';
                const points = wl.path.map((r: number, c: number) => `${c * 100 + 50},${r * 100 + 50}`).join(' L ');
                return (
                  <path 
                    key={i} 
                    d={`M ${points}`} 
                    stroke={color} 
                    strokeWidth="7" 
                    fill="none" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="fafafa-laser-line"
                  />
                );
              })}
            </svg>

            {/* 5 Columns with staggered stops */}
            {[0, 1, 2, 3, 4].map(cIdx => (
              <div 
                key={`col-${cIdx}`} 
                className={`fafafa-col ${spinningCols[cIdx] ? 'is-spinning' : ''}`}
              >
                {[0, 1, 2].map((rIdx) => {
                  const symId = grid[rIdx] ? grid[rIdx][cIdx] : 10;
                  const isWinCell = winLines.some((wl: any) => 
                    wl.path && wl.path.some((p: any) => {
                      if (Array.isArray(p)) return p[0] === rIdx && p[1] === cIdx;
                      return p.row === rIdx && p.col === cIdx;
                    })
                  );
                  return (
                    <div key={`cell-${rIdx}-${cIdx}`} className={`fafafa-cell ${isWinCell ? 'is-winning-symbol' : ''}`}>
                      <div className="fafafa-cell-inner">
                        {renderSymbolImage(symId)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Right Payline Numbers: 4, 2, 6, 8, 1, 9, 7, 3, 5 */}
          <div className="fafafa-payline-col right">
            {PAYLINE_NUMBERS.map(n => {
              const isWin = winningPaylineNums.includes(n);
              return (
                <div 
                  key={`R${n}`} 
                  className={`fafafa-payline-num p-${n} ${isWin ? 'active-win' : ''}`}
                  style={{ '--pline-color': PAYLINE_COLORS[n] } as React.CSSProperties}
                  title={`Payline ${n}`}
                >
                  <span className="pline-text">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROL BAR */}
      <div className="fafafa-bottombar-wrapper">
        <div className="fafafa-bottombar">
          {/* Left: Chat, Info, Minus, BET Box, Plus */}
          <div className="fbot-left">
            <button className="fbot-icon-btn fbot-chat-btn" onClick={() => alert('Obrolan Segera Hadir')} title="Obrolan">
              💬
            </button>
            <button className="fbot-icon-btn fbot-info-btn" onClick={() => setShowRules(true)} title="Aturan & Tabel Bayaran">
              i
            </button>
            <button 
              className="fbot-bet-step-btn" 
              onClick={() => setBetAmount(b => stepSlotBet(b, -1))}
              title="Kurangi Taruhan"
            >
              -
            </button>
            <div className="fbot-bet-display">
              <div className="fbot-bet-label">BET</div>
              <div className="fbot-bet-val">{betAmount.toLocaleString('id-ID')}</div>
            </div>
            <button 
              className="fbot-bet-step-btn" 
              onClick={() => setBetAmount(b => stepSlotBet(b, 1))}
              title="Tambah Taruhan"
            >
              +
            </button>
          </div>

          {/* Center: Purple Pill Message */}
          <div className="fbot-center">
            <div className="fbot-purple-pill">
              {totalWin > 0 ? (
                <span className="fbot-win-glow">MENANG: {totalWin.toLocaleString('id-ID')}</span>
              ) : isSpinning ? (
                <span>Memutar...</span>
              ) : (
                <span>Tekan lama [SPIN] otomatis</span>
              )}
            </div>
          </div>

          {/* Right: MAX BET, Speed, SPIN / TUTUP */}
          <div className="fbot-right">
            <button 
              className="fbot-pill-btn fbot-maxbet-btn" 
              onClick={() => setBetAmount(MAX_SLOT_BET)}
              title="Taruhan Maksimal"
            >
              MAX<br/>BET
            </button>
            <button 
              className="fbot-pill-btn fbot-speed-btn" 
              onClick={() => setSpinSpeed(s => s === 1 ? 2 : s === 2 ? 3 : 1)}
              title="Kecepatan Putaran"
            >
              X{spinSpeed}
            </button>
            
            <div style={{ position: 'relative' }}>
              {showAutoMenu && (
                <div className="fafafa-auto-menu">
                  <div className="fafafa-auto-header">PUTARAN OTOMATIS</div>
                  <div className="fafafa-auto-grid">
                    <button onClick={() => { setAutoSpins(10); setShowAutoMenu(false); doSpin(); }}>10</button>
                    <button onClick={() => { setAutoSpins(50); setShowAutoMenu(false); doSpin(); }}>50</button>
                    <button onClick={() => { setAutoSpins(100); setShowAutoMenu(false); doSpin(); }}>100</button>
                    <button onClick={() => { setAutoSpins(99999); setShowAutoMenu(false); doSpin(); }}>∞</button>
                  </div>
                </div>
              )}

              {showRules ? (
                <button
                  className="fbot-tutup-btn"
                  onClick={() => setShowRules(false)}
                >
                  TUTUP
                </button>
              ) : (
                <button 
                  className={`fbot-spin-btn ${isSpinning ? 'spinning' : ''}`} 
                  onMouseDown={() => {
                    if (isSpinning || autoSpins > 0) {
                      setAutoSpins(0);
                      return;
                    }
                    spinPressTimer.current = setTimeout(() => setShowAutoMenu(true), 400);
                  }}
                  onMouseUp={() => {
                    if (spinPressTimer.current) clearTimeout(spinPressTimer.current);
                    if (!isSpinning && autoSpins === 0 && !showAutoMenu) doSpin();
                  }}
                  onMouseLeave={() => {
                    if (spinPressTimer.current) clearTimeout(spinPressTimer.current);
                  }}
                  onTouchStart={() => {
                    if (isSpinning || autoSpins > 0) {
                      setAutoSpins(0);
                      return;
                    }
                    spinPressTimer.current = setTimeout(() => setShowAutoMenu(true), 400);
                  }}
                  onTouchEnd={() => {
                    if (spinPressTimer.current) clearTimeout(spinPressTimer.current);
                    if (!isSpinning && autoSpins === 0 && !showAutoMenu) doSpin();
                  }}
                  onContextMenu={(e) => { e.preventDefault(); setShowAutoMenu(!showAutoMenu); }}
                >
                  <div className="fbot-spin-title">
                    {isSpinning ? 'STOP' : 'SPIN'}
                  </div>
                  <div className="fbot-spin-sub">
                    {autoSpins > 0 
                      ? (autoSpins > 90000 ? 'AUTO ∞' : `AUTO: ${autoSpins}`) 
                      : (isSpinning ? 'BERHENTI' : 'HOLD FOR AUTO')}
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          FULLSCREEN ATURAN MODAL (4 PAGES FAITHFUL TO REFERENCE)
          ===================================================== */}
      {/* =====================================================
          FULLSCREEN ATURAN MODAL (5 PAGES FAITHFUL TO REFERENCE)
          ===================================================== */}
      {showRules && (
        <div className="fafafa-rules-modal" onClick={() => setShowRules(false)}>
          {/* Top Banner Ribbon */}
          <div className="fafafa-aturan-header" onClick={(e) => e.stopPropagation()}>
            <div className="fafafa-aturan-plaque">
              {rulesPage === 1 && <span>發 發 發</span>}
              {rulesPage === 2 && <span className="rules-title-green">FREE GAME</span>}
              {rulesPage === 3 && <span>GARIS KEMENANGAN</span>}
              {rulesPage === 4 && <span className="rules-title-gold">MAX WIN</span>}
              {rulesPage === 5 && <span className="rules-title-gold">BONUS SATU PAPAN</span>}
            </div>
            <button className="fafafa-aturan-close" onClick={() => setShowRules(false)}>✖</button>
          </div>

          <div className="fafafa-aturan-body" onClick={(e) => e.stopPropagation()}>
            {/* PAGE 1: PAYTABLE & SYMBOL MULTIPLIERS */}
            {rulesPage === 1 && (
              <div className="fafafa-aturan-p1">
                {/* Bet Indicator Banner */}
                <div className="aturan-bet-badge">
                  BET={betAmount >= 9000 ? (betAmount / 1000).toLocaleString('id-ID') : betAmount.toLocaleString('id-ID')}
                </div>

                {/* Top 3 Special Feature Cards */}
                <div className="aturan-top-boxes">
                  {/* Card 1: Wild Red */}
                  <div className="aturan-feature-card">
                    <img src="/assets/fafafa2/sym_wild_red.png" alt="Wild Merah" className="af-sym" />
                    <div className="af-info">
                      <div className="af-desc">
                        Dapat mengganti simbol apa pun kecuali <span className="hl-sc">Scatter</span>.<br/>
                        Ketika muncul 2 atau lebih akan menjadi satu baris.
                      </div>
                      <div className="af-payout"><span className="hl-c5">5</span> <span className="hl-val">{betAmount >= 9000 ? '5M' : (5000 * lineBet).toLocaleString('id-ID')}</span></div>
                    </div>
                  </div>

                  {/* Card 2: Wild Blue */}
                  <div className="aturan-feature-card">
                    <img src="/assets/fafafa2/sym_wild_blue.png" alt="Wild Biru" className="af-sym" />
                    <div className="af-info">
                      <div className="af-desc">
                        Dapat mengganti simbol apa pun kecuali <span className="hl-sc">Wild Merah</span> dan <span className="hl-sc">Scatter</span>.
                      </div>
                      <div className="af-payout"><span className="hl-c5">5</span> <span className="hl-val">{betAmount >= 9000 ? '5M' : (5000 * lineBet).toLocaleString('id-ID')}</span></div>
                    </div>
                  </div>

                  {/* Card 3: Free Game Scatter */}
                  <div className="aturan-feature-card fg-card">
                    <img src="/assets/fafafa2/sym_scatter.png" alt="Scatter" className="af-sym" />
                    <div className="af-info">
                      <div className="af-title">FREE GAME</div>
                      <div className="af-fg-row"><span className="num">5</span> <span className="val">50kail</span></div>
                      <div className="af-fg-row"><span className="num">4</span> <span className="val">20kail</span></div>
                      <div className="af-fg-row"><span className="num">3</span> <span className="val">10kail</span></div>
                    </div>
                  </div>
                </div>

                {/* Middle 8 Regular Symbols Grid */}
                <div className="aturan-syms-table">
                  {/* Row 1: Kakek Merah, Kakek Biru, Bocil Hijau, Bocil Ungu */}
                  <div className="aturan-st-card">
                    <img src="/assets/fafafa2/sym_kakek_merah.png" alt="Kakek Merah" className="ast-img" />
                    <div className="ast-pays">
                      <div><span>5</span> <b>{betAmount >= 9000 ? '1M' : (1000 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>4</span> <b>{betAmount >= 9000 ? '200K' : (200 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>3</span> <b>{betAmount >= 9000 ? '50K' : (50 * lineBet).toLocaleString('id-ID')}</b></div>
                    </div>
                  </div>

                  <div className="aturan-st-card">
                    <img src="/assets/fafafa2/sym_kakek_biru.png" alt="Kakek Biru" className="ast-img" />
                    <div className="ast-pays">
                      <div><span>5</span> <b>{betAmount >= 9000 ? '400K' : (400 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>4</span> <b>{betAmount >= 9000 ? '80K' : (80 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>3</span> <b>{betAmount >= 9000 ? '20K' : (20 * lineBet).toLocaleString('id-ID')}</b></div>
                    </div>
                  </div>

                  <div className="aturan-st-card">
                    <img src="/assets/fafafa2/sym_bocil_hijau.png" alt="Bocil Hijau" className="ast-img" />
                    <div className="ast-pays">
                      <div><span>5</span> <b>{betAmount >= 9000 ? '200K' : (200 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>4</span> <b>{betAmount >= 9000 ? '40K' : (40 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>3</span> <b>{betAmount >= 9000 ? '15K' : (15 * lineBet).toLocaleString('id-ID')}</b></div>
                    </div>
                  </div>

                  <div className="aturan-st-card">
                    <img src="/assets/fafafa2/sym_bocil_ungu.png" alt="Bocil Ungu" className="ast-img" />
                    <div className="ast-pays">
                      <div><span>5</span> <b>{betAmount >= 9000 ? '160K' : (160 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>4</span> <b>{betAmount >= 9000 ? '30K' : (30 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>3</span> <b>{betAmount >= 9000 ? '10K' : (10 * lineBet).toLocaleString('id-ID')}</b></div>
                    </div>
                  </div>

                  {/* Row 2: Bedug, Jade, Firecracker, Coin */}
                  <div className="aturan-st-card">
                    <img src="/assets/fafafa2/sym_drum.png" alt="Bedug" className="ast-img" />
                    <div className="ast-pays">
                      <div><span>5</span> <b>{betAmount >= 9000 ? '100K' : (100 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>4</span> <b>{betAmount >= 9000 ? '20K' : (20 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>3</span> <b>{betAmount >= 9000 ? '7,000' : (7 * lineBet).toLocaleString('id-ID')}</b></div>
                    </div>
                  </div>

                  <div className="aturan-st-card">
                    <img src="/assets/fafafa2/sym_jade.png" alt="Giok" className="ast-img" />
                    <div className="ast-pays">
                      <div><span>5</span> <b>{betAmount >= 9000 ? '60K' : (60 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>4</span> <b>{betAmount >= 9000 ? '15K' : (15 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>3</span> <b>{betAmount >= 9000 ? '5,000' : (5 * lineBet).toLocaleString('id-ID')}</b></div>
                    </div>
                  </div>

                  <div className="aturan-st-card">
                    <img src="/assets/fafafa2/sym_firecracker.png" alt="Petasan" className="ast-img" />
                    <div className="ast-pays">
                      <div><span>5</span> <b>{betAmount >= 9000 ? '40K' : (40 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>4</span> <b>{betAmount >= 9000 ? '10K' : (10 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>3</span> <b>{betAmount >= 9000 ? '3,000' : (3 * lineBet).toLocaleString('id-ID')}</b></div>
                    </div>
                  </div>

                  <div className="aturan-st-card">
                    <img src="/assets/fafafa2/sym_coin.png" alt="Koin" className="ast-img" />
                    <div className="ast-pays">
                      <div><span>5</span> <b>{betAmount >= 9000 ? '20K' : (20 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>4</span> <b>{betAmount >= 9000 ? '5,000' : (5 * lineBet).toLocaleString('id-ID')}</b></div>
                      <div><span>3</span> <b>{betAmount >= 9000 ? '2,000' : (2 * lineBet).toLocaleString('id-ID')}</b></div>
                    </div>
                  </div>
                </div>

                {/* Bottom Paylines Explanation */}
                <div className="aturan-payline-caption">
                  Simbol harus berada pada garis yang ditentukan, apabila simbol muncul 3 kali atau lebih secara beruntun, maka pemain mendapatkan hadiah sesuai tabel diatas.
                </div>
              </div>
            )}

            {/* PAGE 2: FREE GAME */}
            {rulesPage === 2 && (
              <div className="fafafa-aturan-p3">
                <div className="afg-showcase-container">
                  <div className="afg-preview-card">
                    <div className="afg-mini-reel-frame">
                      <div className="afg-mini-grid">
                        <img src="/assets/fafafa2/sym_jade.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_jade.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_wild_red.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_kakek_biru.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_kakek_merah.png" className="mini-sym" />

                        <img src="/assets/fafafa2/sym_coin.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_wild_blue.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_scatter.png" className="mini-sym sc-glow" />
                        <img src="/assets/fafafa2/sym_drum.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_scatter.png" className="mini-sym sc-glow" />

                        <img src="/assets/fafafa2/sym_scatter.png" className="mini-sym sc-glow" />
                        <img src="/assets/fafafa2/sym_scatter.png" className="mini-sym sc-glow" />
                        <img src="/assets/fafafa2/sym_firecracker.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_bocil_hijau.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_scatter.png" className="mini-sym sc-glow" />
                      </div>
                    </div>
                  </div>

                  <div className="afg-preview-card">
                    <div className="afg-mini-reel-frame full-fa-frame">
                      <div className="afg-mini-grid">
                        <img src="/assets/fafafa2/sym_wild_red.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_bocil_ungu.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_wild_red.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_kakek_biru.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_kakek_merah.png" className="mini-sym" />

                        <img src="/assets/fafafa2/sym_wild_red.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_wild_blue.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_wild_red.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_drum.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_scatter.png" className="mini-sym" />

                        <img src="/assets/fafafa2/sym_wild_red.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_firecracker.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_wild_red.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_coin.png" className="mini-sym" />
                        <img src="/assets/fafafa2/sym_bocil_hijau.png" className="mini-sym" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="afg-table-box">
                  <div className="afg-row">
                    <div className="afg-sc-icons">
                      <img src="/assets/fafafa2/sym_scatter.png" className="afg-row-sc" />
                      <img src="/assets/fafafa2/sym_scatter.png" className="afg-row-sc" />
                      <img src="/assets/fafafa2/sym_scatter.png" className="afg-row-sc" />
                    </div>
                    <span className="afg-reward">Mendapatkan <b>10x</b> FREE GAME</span>
                  </div>

                  <div className="afg-row">
                    <div className="afg-sc-icons">
                      <img src="/assets/fafafa2/sym_scatter.png" className="afg-row-sc" />
                      <img src="/assets/fafafa2/sym_scatter.png" className="afg-row-sc" />
                      <img src="/assets/fafafa2/sym_scatter.png" className="afg-row-sc" />
                      <img src="/assets/fafafa2/sym_scatter.png" className="afg-row-sc" />
                    </div>
                    <span className="afg-reward">Mendapatkan <b>20x</b> FREE GAME</span>
                  </div>

                  <div className="afg-row">
                    <div className="afg-sc-icons">
                      <img src="/assets/fafafa2/sym_scatter.png" className="afg-row-sc" />
                      <img src="/assets/fafafa2/sym_scatter.png" className="afg-row-sc" />
                      <img src="/assets/fafafa2/sym_scatter.png" className="afg-row-sc" />
                      <img src="/assets/fafafa2/sym_scatter.png" className="afg-row-sc" />
                      <img src="/assets/fafafa2/sym_scatter.png" className="afg-row-sc" />
                    </div>
                    <span className="afg-reward">Mendapatkan <b>50x</b> FREE GAME</span>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 3: GARIS KEMENANGAN (PAYLINES) */}
            {rulesPage === 3 && (
              <div className="fafafa-aturan-p1">
                <div className="aturan-payline-section" style={{ borderTop: 'none', paddingTop: 0 }}>
                  <div className="aturan-payline-caption">
                    Simbol harus berada pada garis yang ditentukan, apabila simbol muncul 3 kali atau lebih secara beruntun, maka pemain mendapatkan hadiah sesuai tabel diatas.
                  </div>
                  <div className="aturan-payline-diagrams">
                    {/* Diagram 1: Lines 1, 2, 3 */}
                    <div className="diagram-box">
                      <div className="diagram-header-lines">
                        <span className="l-num l2">2</span>
                        <span className="l-num l1">1</span>
                        <span className="l-num l3">3</span>
                      </div>
                      <div className="diagram-mini-grid">
                        <div className="dmg-line l2"></div>
                        <div className="dmg-line l1"></div>
                        <div className="dmg-line l3"></div>
                      </div>
                      <div className="diagram-header-lines bot">
                        <span className="l-num l2">2</span>
                        <span className="l-num l1">1</span>
                        <span className="l-num l3">3</span>
                      </div>
                    </div>
                    {/* Diagram 2: Lines 4, 5 */}
                    <div className="diagram-box">
                      <div className="diagram-header-lines">
                        <span className="l-num l4">4</span>
                        <span className="l-num l5">5</span>
                      </div>
                      <div className="diagram-mini-grid">
                        <svg className="dmg-svg" viewBox="0 0 100 60">
                          <polyline points="5,5 50,55 95,5" stroke="#f44336" strokeWidth="5" fill="none" />
                          <polyline points="5,55 50,5 95,55" stroke="#9c27b0" strokeWidth="5" fill="none" />
                        </svg>
                      </div>
                      <div className="diagram-header-lines bot">
                        <span className="l-num l4">4</span>
                        <span className="l-num l5">5</span>
                      </div>
                    </div>
                    {/* Diagram 3: Lines 6, 7 */}
                    <div className="diagram-box">
                      <div className="diagram-header-lines">
                        <span className="l-num l6">6</span>
                        <span className="l-num l7">7</span>
                      </div>
                      <div className="diagram-mini-grid">
                        <svg className="dmg-svg" viewBox="0 0 100 60">
                          <polyline points="5,5 25,5 50,30 75,55 95,55" stroke="#ffd600" strokeWidth="5" fill="none" />
                          <polyline points="5,55 25,55 50,30 75,5 95,5" stroke="#2196f3" strokeWidth="5" fill="none" />
                        </svg>
                      </div>
                      <div className="diagram-header-lines bot">
                        <span className="l-num l6">6</span>
                        <span className="l-num l7">7</span>
                      </div>
                    </div>
                    {/* Diagram 4: Lines 8, 9 */}
                    <div className="diagram-box">
                      <div className="diagram-header-lines">
                        <span className="l-num l8">8</span>
                        <span className="l-num l9">9</span>
                      </div>
                      <div className="diagram-mini-grid">
                        <svg className="dmg-svg" viewBox="0 0 100 60">
                          <polyline points="5,30 25,55 50,55 75,55 95,30" stroke="#00e676" strokeWidth="5" fill="none" />
                          <polyline points="5,30 25,5 50,5 75,5 95,30" stroke="#00e5ff" strokeWidth="5" fill="none" />
                        </svg>
                      </div>
                      <div className="diagram-header-lines bot">
                        <span className="l-num l8">8</span>
                        <span className="l-num l9">9</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 4: MAX WIN */}
            {rulesPage === 4 && (
              <div className="fafafa-aturan-p4">
                <div className="aturan-maxwin-box">
                  <div className="maxwin-center-graphic">
                    <div className="maxwin-crown-icon">👑</div>
                    <div className="maxwin-banner-title">
                      <span className="maxwin-text-gold">MAX WIN</span>
                    </div>
                    <div className="maxwin-badge-mult">
                      <span>20000×</span>
                    </div>
                    <div className="maxwin-example-val">
                      {(20000 * betAmount).toLocaleString('id-ID')}
                    </div>
                  </div>

                  <div className="maxwin-desc">
                    Kemenangan maksimal adalah 20000X,<br/>
                    Jika total menang di Free Spin mencapai 20000X,<br/>
                    ronde langsung selesai, hadiah diberikan, dan sisa Free Spin hangus.
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 5: BONUS SATU PAPAN */}
            {rulesPage === 5 && (
              <div className="fafafa-aturan-p2">
                <div className="aturan-fb-grid">
                  <div className="afb-card">
                    <div className="afb-syms-pair">
                      <img src="/assets/fafafa2/sym_wild_blue.png" alt="Wild Biru" className="afb-img" />
                      <img src="/assets/fafafa2/sym_wild_red.png" alt="Wild Merah" className="afb-img" />
                    </div>
                    <div className="afb-mult">x5000</div>
                  </div>

                  <div className="afb-card">
                    <img src="/assets/fafafa2/sym_kakek_merah.png" alt="Kakek Merah" className="afb-img" />
                    <div className="afb-mult">x2500</div>
                  </div>

                  <div className="afb-card">
                    <img src="/assets/fafafa2/sym_kakek_biru.png" alt="Kakek Biru" className="afb-img" />
                    <div className="afb-mult">x1000</div>
                  </div>

                  <div className="afb-card">
                    <img src="/assets/fafafa2/sym_bocil_hijau.png" alt="Bocil Hijau" className="afb-img" />
                    <div className="afb-mult">x500</div>
                  </div>

                  <div className="afb-card">
                    <img src="/assets/fafafa2/sym_bocil_ungu.png" alt="Bocil Ungu" className="afb-img" />
                    <div className="afb-mult">x400</div>
                  </div>

                  <div className="afb-card">
                    <img src="/assets/fafafa2/sym_drum.png" alt="Bedug" className="afb-img" />
                    <div className="afb-mult">x250</div>
                  </div>

                  <div className="afb-card">
                    <img src="/assets/fafafa2/sym_jade.png" alt="Giok" className="afb-img" />
                    <div className="afb-mult">x150</div>
                  </div>

                  <div className="afb-card">
                    <img src="/assets/fafafa2/sym_firecracker.png" alt="Petasan" className="afb-img" />
                    <div className="afb-mult">x100</div>
                  </div>

                  <div className="afb-card">
                    <img src="/assets/fafafa2/sym_coin.png" alt="Koin" className="afb-img" />
                    <div className="afb-mult">x50</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Rules Navigation (< KEMBALI KE GAME >) */}
          <div className="fafafa-aturan-nav" onClick={(e) => e.stopPropagation()}>
            <button 
              className="aturan-nav-arrow" 
              onClick={() => setRulesPage(p => Math.max(1, p - 1))}
              disabled={rulesPage === 1}
            >
              ◀
            </button>
            <button 
              className="aturan-kembali-btn" 
              onClick={() => setShowRules(false)}
            >
              KEMBALI KE GAME
            </button>
            <button 
              className="aturan-nav-arrow" 
              onClick={() => setRulesPage(p => Math.min(5, p + 1))}
              disabled={rulesPage === 5}
            >
              ▶
            </button>
            
            {/* 5 Pagination Dots */}
            <div className="aturan-dots">
              {[1, 2, 3, 4, 5].map(p => (
                <span 
                  key={p} 
                  className={`aturan-dot ${rulesPage === p ? 'active' : ''}`}
                  onClick={() => setRulesPage(p)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Universal Slot Celebration Modal */}
      <SlotCelebrationModal data={celebration} onClose={() => setCelebration(null)} />

      {/* Synchronized Profile Modal */}
      {showProfileModal && (
        <SlotProfileModal
          profile={userProfile}
          coins={myCoins}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
}
