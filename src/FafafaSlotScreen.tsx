import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import './fafafa.css';
import GameMenuDropdown from './GameMenuDropdown';

interface Props {
  onBack: () => void;
  socket: Socket | null;
}

const FAFAFA_SYMBOLS: Record<number, { char: string; name: string }> = {
  0: { char: '🀄', name: 'wild-red' },    // Red Fa (Wild)
  1: { char: '🀄', name: 'wild-blue' },   // Blue Fa (Wild)
  2: { char: '🦁', name: 'scatter' },     // Barongsai (Scatter)
  3: { char: '👴', name: 'grandpa-red' }, // Kakek Merah
  4: { char: '👴', name: 'grandpa-blue' },// Kakek Biru
  5: { char: '👲', name: 'boy' },         // Bocah Laki
  6: { char: '👧', name: 'girl' },        // Bocah Perempuan
  7: { char: '🥁', name: 'drum' },        // Bedug
  8: { char: '🟢', name: 'jade' },        // Giok
  9: { char: '🧨', name: 'firecracker' }, // Petasan
  10: { char: '🪙', name: 'coin' },       // Koin
};

export default function FafafaSlotScreen({ onBack, socket }: Props) {
  const [grid, setGrid] = useState<number[][]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningCols, setSpinningCols] = useState<boolean[]>([false, false, false, false, false]);
  const [betAmount, setBetAmount] = useState(90000);
  const [myCoins, setMyCoins] = useState(0);
  const [winLines, setWinLines] = useState<any[]>([]);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [autoSpins, setAutoSpins] = useState(0);
  const [isFullBoard, setIsFullBoard] = useState(false);
  const [showBonusOverlay, setShowBonusOverlay] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [spinSpeed, setSpinSpeed] = useState(1);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const spinPressTimer = useRef<any>(null);

  const username = localStorage.getItem('domino_username') || '';

  // Refs to avoid stale closures in timeouts
  const autoSpinsRef = useRef(autoSpins);
  const freeSpinsLeftRef = useRef(freeSpinsLeft);
  const spinSpeedRef = useRef(spinSpeed);
  const doSpinRef = useRef<any>(null);

  useEffect(() => { autoSpinsRef.current = autoSpins; }, [autoSpins]);
  useEffect(() => { freeSpinsLeftRef.current = freeSpinsLeft; }, [freeSpinsLeft]);
  useEffect(() => { spinSpeedRef.current = spinSpeed; }, [spinSpeed]);

  // Initialize empty 5x3 grid
  useEffect(() => {
    const initGrid = Array(3).fill(null).map(() => Array(5).fill(10));
    setGrid(initGrid);
    const coinsStr = localStorage.getItem('domino_coins');
    if (coinsStr) setMyCoins(parseInt(coinsStr));
  }, []);

  // Rapid symbol shuffle on active spinning reels (DFDC style)
  useEffect(() => {
    let interval: any = null;
    if (isSpinning) {
      interval = setInterval(() => {
        setGrid(prev => {
          const next = prev.map(row => [...row]);
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 5; c++) {
              if (spinningCols[c]) {
                next[r][c] = Math.floor(Math.random() * 11);
              }
            }
          }
          return next;
        });
      }, 70 / spinSpeedRef.current);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isSpinning, spinningCols]);

  useEffect(() => {
    if (!socket) return;
    
    const handleResult = (data: any) => {
      const spd = spinSpeedRef.current;
      let stopTime = 200 / spd;
      const delayPerCol = 250 / spd;

      // Staggered stop: Reel 1 -> Reel 2 -> Reel 3 -> Reel 4 -> Reel 5
      for (let c = 0; c < 5; c++) {
        const col = c;
        setTimeout(() => {
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

      // Finish spinning sequence
      setTimeout(() => {
        setIsSpinning(false);
        setMyCoins(data.newBalance);
        localStorage.setItem('domino_coins', data.newBalance.toString());
        
        if (data.winningLines && data.winningLines.length > 0) {
          setWinLines(data.winningLines);
          setTotalWin(data.totalWinAmount);
        } else {
          setWinLines([]);
          setTotalWin(0);
        }

        if (data.isFullBoard) {
          setIsFullBoard(true);
          setShowBonusOverlay(true);
          setTimeout(() => setShowBonusOverlay(false), 3000 / spd);
        } else {
          setIsFullBoard(false);
        }

        if (data.triggerFreeSpins) {
          setFreeSpinsLeft(prev => prev + data.freeSpinsAwarded);
        }

        // Handle auto spin & free spin continuations
        if (autoSpinsRef.current > 1 || (freeSpinsLeftRef.current > 0 && !data.triggerFreeSpins)) {
           if (autoSpinsRef.current > 1) setAutoSpins(a => a - 1);
           if (freeSpinsLeftRef.current > 0) setFreeSpinsLeft(f => f - 1);
           setTimeout(() => {
             if (doSpinRef.current) doSpinRef.current();
           }, 800 / spd);
        } else if (autoSpinsRef.current === 1) {
           setAutoSpins(0);
        }
      }, stopTime + 50);
    };

    const handleError = (data: any) => {
      alert(data.message);
      setIsSpinning(false);
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
    setIsSpinning(true);
    setSpinningCols([true, true, true, true, true]);
    setWinLines([]);
    setTotalWin(0);
    setIsFullBoard(false);
    
    socket.emit('spin_fafafa', {
      username,
      betAmount,
      isFreeSpins: freeSpinsLeftRef.current > 0,
      clientBalance: myCoins
    });
  };

  doSpinRef.current = doSpin;

  const renderSymbolComponent = (symId: number) => {
    switch (symId) {
      case 0: // Red Wild
        return (
          <div className="sym-box">
            <div className="wild-tile red-tile">
              <span className="fa-char">發</span>
            </div>
          </div>
        );
      case 1: // Blue Wild
        return (
          <div className="sym-box">
            <div className="wild-tile blue-tile">
              <span className="fa-char">發</span>
            </div>
          </div>
        );
      case 2: // Scatter (Barongsai)
        return (
          <div className="sym-box">
            <span style={{ fontSize: '7.5vh', filter: 'drop-shadow(0 0 1vh #ffeb3b)' }}>🦁</span>
          </div>
        );
      case 3: // Grandpa Red
        return (
          <div className="sym-box">
            <div className="grandpa-circle red-c">
              <span className="grandpa-avatar">🧙‍♂️</span>
            </div>
          </div>
        );
      case 4: // Grandpa Blue
        return (
          <div className="sym-box">
            <div className="grandpa-circle blue-c">
              <span className="grandpa-avatar">🧙‍♂️</span>
            </div>
          </div>
        );
      case 5: // Boy
        return (
          <div className="sym-box">
            <span style={{ fontSize: '6.5vh' }}>👲</span>
          </div>
        );
      case 6: // Girl
        return (
          <div className="sym-box">
            <span style={{ fontSize: '6.5vh' }}>👧</span>
          </div>
        );
      case 7: // Drum
        return (
          <div className="sym-box">
            <span style={{ fontSize: '6.5vh', filter: 'drop-shadow(0 0.4vh 0.6vh rgba(0,0,0,0.4))' }}>🥁</span>
          </div>
        );
      case 8: // Jade
        return (
          <div className="sym-box">
            <span style={{ fontSize: '6.5vh', filter: 'drop-shadow(0 0.4vh 0.6vh rgba(0,0,0,0.4))' }}>🟢</span>
          </div>
        );
      case 9: // Firecracker
        return (
          <div className="sym-box">
            <span style={{ fontSize: '6.5vh', filter: 'drop-shadow(0 0.4vh 0.6vh rgba(0,0,0,0.4))' }}>🧨</span>
          </div>
        );
      case 10: // Coin
        return (
          <div className="sym-box">
            <div className="ancient-coin">
              <div className="coin-hole"></div>
            </div>
          </div>
        );
      default:
        return <div className="sym-box">🪙</div>;
    }
  };

  return (
    <div className="fafafa-screen">
      {/* BACKGROUND DECOR */}
      <div className="fafafa-bg-pillars"></div>

      {/* TOP LEFT CORNER (Profile & Coins) */}
      <div className="fafafa-top-left">
        <div className="fafafa-avatar" onClick={() => alert('Profil VIP diklik')}>
          <img src="https://i.pravatar.cc/100?img=11" alt="Avatar" />
          <span className="fafafa-vip-badge">VIP 9</span>
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

      {/* TOP RIGHT CORNER (Icons) */}
      <div className="fafafa-top-right" style={{ position: 'relative' }}>
        <button className="fafafa-tr-btn trophy-btn" onClick={() => alert('Papan Peringkat')}>🏆</button>
        <button className="fafafa-tr-btn room-btn" onClick={onBack}>
          <span>🔄</span>
          <small>Ganti<br/>room</small>
        </button>
        <button className="fafafa-tr-btn menu-btn" onClick={() => setShowMenu(v => !v)}>≡</button>

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
        />
      </div>

      {/* SIDE BUTTONS */}
      <div className="fafafa-side-left">
        <div className="fafafa-side-btn buy-spin" onClick={() => alert('Beli Fitur Segera Hadir!')}>
          <div className="fafafa-side-icon">發</div>
          <small>BELI SPIN<br/>GRATIS</small>
        </div>
        <div className="fafafa-side-btn ransel" onClick={() => alert('Ransel Item Anda')}>
          <div className="fafafa-side-icon">🎒</div>
          <small>RANSEL</small>
        </div>
      </div>
      <div className="fafafa-side-right-arrow">
        <button onClick={() => alert('Fitur Tambahan')}>◀</button>
      </div>

      {/* HEADER LOGO */}
      <div className="fafafa-header-logo"></div>

      {/* SLOT MACHINE */}
      <div className="fafafa-machine-container">
        {showBonusOverlay && (
          <div className="fafafa-bonus-overlay">
            <h1>BONUS SATU PAPAN!</h1>
            <h2>Menang: {totalWin.toLocaleString('id-ID')}</h2>
          </div>
        )}
        {freeSpinsLeft > 0 && (
          <div className="fafafa-freespin-banner">FREE GAME: {freeSpinsLeft}</div>
        )}
        <div className={`fafafa-machine ${isSpinning ? 'spinning' : ''}`}>
          
          {/* Left Payline Numbers */}
          <div className="fafafa-payline-col left">
            {[4,2,6,8,1,9,7,3,5].map(n => (
              <div key={`L${n}`} className={`fafafa-payline-num p-${n}`}>{n}</div>
            ))}
          </div>

          <div className="fafafa-grid">
            {/* Draw win lines */}
            <svg className="fafafa-svg-lines" viewBox="0 0 500 300">
              {winLines.map((wl, i) => {
                const color = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080', '#008000'][wl.lineIdx % 9];
                let points = wl.path.map((r: number, c: number) => `${c * 100 + 50},${r * 100 + 50}`).join(' L ');
                return <path key={i} d={`M ${points}`} stroke={color} strokeWidth="8" fill="none" opacity="0.7" />;
              })}
            </svg>

            {/* Render Columns (DFDC Staggered Reel Spinning) */}
            {[0, 1, 2, 3, 4].map(cIdx => (
              <div 
                key={`col-${cIdx}`} 
                className={`fafafa-col ${spinningCols[cIdx] ? 'is-spinning' : ''}`}
              >
                {[0, 1, 2].map((rIdx) => {
                  const symId = grid[rIdx] ? grid[rIdx][cIdx] : 10;
                  return (
                    <div key={`cell-${rIdx}-${cIdx}`} className="fafafa-cell">
                      <div className={`fafafa-sym fafafa-sym-${FAFAFA_SYMBOLS[symId]?.name || 'coin'}`}>
                        {renderSymbolComponent(symId)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Right Payline Numbers */}
          <div className="fafafa-payline-col right">
            {[4,2,6,8,1,9,7,3,5].map(n => (
              <div key={`R${n}`} className={`fafafa-payline-num p-${n}`}>{n}</div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="fafafa-bottombar-wrapper">
        <div className="fafafa-bottombar-bg"></div>
        <div className="fafafa-bottombar">
          <div className="fbot-left">
            <button className="fbot-icon-btn" onClick={() => alert('Chat Segera Hadir')}>💬</button>
            <button className="fbot-icon-btn" onClick={() => setShowRules(true)}>i</button>
            <button className="fbot-bet-btn" onClick={() => setBetAmount(b => Math.max(9000, b - 9000))}>-</button>
            <div className="fbot-bet-display">
              <div className="fbot-bet-label">BET</div>
              <div className="fbot-bet-val">{betAmount.toLocaleString('id-ID')}</div>
            </div>
            <button className="fbot-bet-btn" onClick={() => setBetAmount(b => Math.min(9000000, b + 9000))}>+</button>
          </div>

          <div className="fbot-center">
            <div className="fbot-info">
              {totalWin > 0 ? `MENANG: ${totalWin.toLocaleString('id-ID')}` : 'Tekan [SPIN] untuk memulai'}
            </div>
          </div>

          <div className="fbot-right">
            <button className="fbot-maxbet-btn" onClick={() => setBetAmount(9000000)}>
              MAX<br/>BET
            </button>
            <button className="fbot-speed-btn" onClick={() => setSpinSpeed(s => s === 1 ? 2 : s === 2 ? 3 : 1)}>
              X{spinSpeed}
            </button>
            <div style={{position: 'relative'}}>
              {showAutoMenu && (
                <div className="fafafa-auto-menu">
                  <button onClick={() => { setAutoSpins(10); setShowAutoMenu(false); doSpin(); }}>10</button>
                  <button onClick={() => { setAutoSpins(50); setShowAutoMenu(false); doSpin(); }}>50</button>
                  <button onClick={() => { setAutoSpins(100); setShowAutoMenu(false); doSpin(); }}>100</button>
                  <button onClick={() => { setAutoSpins(99999); setShowAutoMenu(false); doSpin(); }}>∞</button>
                </div>
              )}
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
                <div className="fbot-spin-title">{autoSpins > 0 ? `AUTO ${autoSpins > 90000 ? '∞' : autoSpins}` : 'SPIN'}</div>
                <div className="fbot-spin-sub">{autoSpins > 0 ? 'STOP' : 'Tahan untuk Auto'}</div>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* RULES MODAL (Paytable) */}
      {showRules && (
        <div className="fafafa-rules-modal">
          <div className="fafafa-rules-content">
            <button className="fafafa-rules-close" onClick={() => setShowRules(false)}>✖</button>
            <h2>ATURAN & PEMBAYARAN</h2>
            <div className="fafafa-paytable">
              <div className="pt-item"><span className="fafafa-sym-wild-red">發</span> <strong>WILD</strong>: Menggantikan semua simbol kecuali Scatter. (5 = 5000x)</div>
              <div className="pt-item"><span className="fafafa-sym-scatter">🦁</span> <strong>SCATTER</strong>: 5=50x Free Spins, 4=20x, 3=10x.</div>
              <div className="pt-item">👴 <strong>Kakek Merah</strong>: 5 = 1000, 4 = 200, 3 = 50</div>
              <div className="pt-item">👴 <strong>Kakek Biru</strong>: 5 = 400, 4 = 80, 3 = 20</div>
              <div className="pt-item">👲 <strong>Bocah Laki</strong>: 5 = 200, 4 = 40, 3 = 15</div>
              <div className="pt-item">👧 <strong>Bocah Perempuan</strong>: 5 = 160, 4 = 30, 3 = 10</div>
              <div className="pt-item">🥁 <strong>Bedug</strong>: 5 = 100, 4 = 20, 3 = 7</div>
              <div className="pt-item">🟢 <strong>Giok</strong>: 5 = 60, 4 = 15, 3 = 5</div>
              <div className="pt-item">🧨 <strong>Petasan</strong>: 5 = 40, 4 = 10, 3 = 3</div>
              <div className="pt-item">🪙 <strong>Koin</strong>: 5 = 20, 4 = 5, 3 = 2</div>
            </div>
            <h3>BONUS SATU PAPAN (Full Board)</h3>
            <p>Jika seluruh papan tertutup simbol yang sama (dibantu Wild), menang mutlak hingga 5000x Taruhan!</p>
          </div>
        </div>
      )}
    </div>
  );
}
