import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import './jinjibaoxi.css';
import GameMenuDropdown from './GameMenuDropdown';

interface Props {
  onBack: () => void;
  socket: Socket | null;
}

export const JINJI_SYMBOLS: Record<number, { char: string; name: string; label: string }> = {
  0: { char: '🐉', name: 'dragon', label: 'Naga Emas' },
  1: { char: '🦅', name: 'phoenix', label: 'Burung Hong' },
  2: { char: '🐅', name: 'tiger', label: 'Macan Emas' },
  3: { char: '🐢', name: 'turtle', label: 'Penyu Emas' },
  4: { char: '🐟', name: 'carp', label: 'Ikan Emas' },
  5: { char: 'A', name: 'sym-a', label: 'A' },
  6: { char: 'K', name: 'sym-k', label: 'K' },
  7: { char: 'Q', name: 'sym-q', label: 'Q' },
  8: { char: 'J', name: 'sym-j', label: 'J' },
  9: { char: '🏺', name: 'wild', label: 'WILD' },
  10: { char: '🪙', name: 'jinji-coin', label: 'COIN' },
};

export default function JinJiBaoXiSlotScreen({ onBack, socket }: Props) {
  const [grid, setGrid] = useState<number[][]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningCols, setSpinningCols] = useState<boolean[]>([false, false, false, false, false]);
  const [betAmount, setBetAmount] = useState(96800);
  const [myCoins, setMyCoins] = useState(0);
  const [winAmount, setWinAmount] = useState(0);
  const [winType, setWinType] = useState<string>('normal');
  const [winningSymbols, setWinningSymbols] = useState<number[]>([]);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [autoSpins, setAutoSpins] = useState(0);
  const [spinSpeed, setSpinSpeed] = useState(1);
  const [showRules, setShowRules] = useState(false);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);

  // Jackpot States
  const [jackpotGrand, setJackpotGrand] = useState(2835374165);
  const [jackpotMajor, setJackpotMajor] = useState(871200000);
  const [jackpotMinor, setJackpotMinor] = useState(290400000);
  const [jackpotMini, setJackpotMini] = useState(145200000);
  const [showJackpotPick, setShowJackpotPick] = useState(false);
  const [jackpotCards, setJackpotCards] = useState<string[]>([]);
  const [pickedCards, setPickedCards] = useState<string[]>([]);
  const [jackpotWinner, setJackpotWinner] = useState<string | null>(null);

  // Animated Jackpot Win Celebration Modal State
  const [showJackpotWinModal, setShowJackpotWinModal] = useState(false);
  const [jackpotWinType, setJackpotWinType] = useState<string>('MINI');
  const [jackpotWinPrize, setJackpotWinPrize] = useState<number>(0);

  const spinPressTimer = useRef<any>(null);
  const username = localStorage.getItem('domino_username') || '';

  const autoSpinsRef = useRef(autoSpins);
  const freeSpinsLeftRef = useRef(freeSpinsLeft);
  const spinSpeedRef = useRef(spinSpeed);
  const doSpinRef = useRef<any>(null);

  useEffect(() => { autoSpinsRef.current = autoSpins; }, [autoSpins]);
  useEffect(() => { freeSpinsLeftRef.current = freeSpinsLeft; }, [freeSpinsLeft]);
  useEffect(() => { spinSpeedRef.current = spinSpeed; }, [spinSpeed]);

  // Dynamic Jackpot Tick Increment
  useEffect(() => {
    const timer = setInterval(() => {
      setJackpotGrand(g => g + Math.floor(Math.random() * 500) + 100);
      setJackpotMajor(m => m + Math.floor(Math.random() * 200) + 50);
      setJackpotMinor(n => n + Math.floor(Math.random() * 100) + 20);
      setJackpotMini(x => x + Math.floor(Math.random() * 50) + 10);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Initialize empty grid
  useEffect(() => {
    const initGrid = Array(3).fill(null).map(() => Array(5).fill(5));
    setGrid(initGrid);
    const coinsStr = localStorage.getItem('domino_coins');
    if (coinsStr) setMyCoins(parseInt(coinsStr));
  }, []);

  // Rapid Reel Symbol Shuffle (DFDC Style)
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

  // Socket Response Handling
  useEffect(() => {
    if (!socket) return;

    const handleResult = (data: any) => {
      const spd = spinSpeedRef.current;
      let stopTime = 200 / spd;
      const delayPerCol = 250 / spd;

      // Staggered Reel Stopping (Reel 1 -> 5)
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

      // Finish spin sequence
      setTimeout(() => {
        setIsSpinning(false);
        setMyCoins(data.newBalance);
        localStorage.setItem('domino_coins', data.newBalance.toString());
        setWinAmount(data.winAmount);
        setWinType(data.winType);
        setWinningSymbols(data.winningSymbols || []);

        // Trigger Jackpot Pick Feature if won
        if (data.triggerJackpot) {
          initJackpotPickGame(data.jackpotType, data.jackpotWinAmount);
        }

        if (data.triggerFreeSpins) {
          setFreeSpinsLeft(prev => prev + data.freeSpinsAwarded);
        }

        // Handle auto spin / free spin continuation
        if (autoSpinsRef.current > 1 || (freeSpinsLeftRef.current > 0 && !data.triggerFreeSpins)) {
          if (autoSpinsRef.current > 1) setAutoSpins(a => a - 1);
          if (freeSpinsLeftRef.current > 0) setFreeSpinsLeft(f => f - 1);
          setTimeout(() => {
            if (doSpinRef.current) doSpinRef.current();
          }, 1000 / spd);
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

    socket.on('jinji_result', handleResult);
    socket.on('jinji_error', handleError);

    return () => {
      socket.off('jinji_result', handleResult);
      socket.off('jinji_error', handleError);
    };
  }, [socket]);

  // Jackpot Pick Mini-Game Initialization
  const initJackpotPickGame = (targetJackpot: string, prizeAmount: number) => {
    const types = ['GRAND', 'MAJOR', 'MINOR', 'MINI'];
    const cards = [targetJackpot, targetJackpot, targetJackpot];
    while (cards.length < 12) {
      const rand = types[Math.floor(Math.random() * types.length)];
      cards.push(rand);
    }
    // Shuffle cards
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    setJackpotCards(cards);
    setPickedCards([]);
    setJackpotWinner(null);
    setShowJackpotPick(true);
  };

  const handlePickCard = (index: number) => {
    if (pickedCards.includes(index.toString()) || jackpotWinner) return;
    const nextPicked = [...pickedCards, index.toString()];
    setPickedCards(nextPicked);

    // Count reveals per type
    const counts: Record<string, number> = {};
    nextPicked.forEach(idxStr => {
      const cardType = jackpotCards[parseInt(idxStr)];
      counts[cardType] = (counts[cardType] || 0) + 1;
      if (counts[cardType] >= 3) {
        setJackpotWinner(cardType);
        const prize = cardType === 'GRAND' ? jackpotGrand : cardType === 'MAJOR' ? jackpotMajor : cardType === 'MINOR' ? jackpotMinor : jackpotMini;
        setJackpotWinType(cardType);
        setJackpotWinPrize(prize);
        setTimeout(() => {
          setShowJackpotPick(false);
          setShowJackpotWinModal(true);
        }, 1200);
      }
    });
  };

  const doSpin = () => {
    if (isSpinning || !socket) return;
    setIsSpinning(true);
    setSpinningCols([true, true, true, true, true]);
    setWinAmount(0);
    setWinningSymbols([]);

    socket.emit('spin_jinji', {
      username,
      betAmount,
      isFreeSpins: freeSpinsLeftRef.current > 0,
      clientBalance: myCoins
    });
  };

  doSpinRef.current = doSpin;

  const renderSymbolComponent = (symId: number) => {
    switch (symId) {
      case 0: // Dragon
        return (
          <div className="jinji-sym-wrapper sym-dragon">
            <span className="jinji-icon">🐉</span>
          </div>
        );
      case 1: // Phoenix
        return (
          <div className="jinji-sym-wrapper sym-phoenix">
            <div className="gold-disc-bg">
              <span>🦅</span>
            </div>
          </div>
        );
      case 2: // Tiger
        return (
          <div className="jinji-sym-wrapper sym-tiger">
            <div className="gold-disc-bg blue-disc">
              <span>🐅</span>
            </div>
          </div>
        );
      case 3: // Turtle
        return (
          <div className="jinji-sym-wrapper sym-turtle">
            <div className="gold-disc-bg green-disc">
              <span>🐢</span>
            </div>
          </div>
        );
      case 4: // Carp
        return (
          <div className="jinji-sym-wrapper sym-carp">
            <span>🐟</span>
          </div>
        );
      case 5: // A
        return <div className="jinji-sym-wrapper card-sym sym-card-a">A</div>;
      case 6: // K
        return <div className="jinji-sym-wrapper card-sym sym-card-k">K</div>;
      case 7: // Q
        return <div className="jinji-sym-wrapper card-sym sym-card-q">Q</div>;
      case 8: // J
        return <div className="jinji-sym-wrapper card-sym sym-card-j">J</div>;
      case 9: // Wild
        return (
          <div className="jinji-sym-wrapper sym-wild">
            <div className="wild-pot-badge">
              <span>🏺</span>
              <small>WILD</small>
            </div>
          </div>
        );
      case 10: // Coin
        return (
          <div className="jinji-sym-wrapper sym-jinji-coin">
            <div className="yellow-gem-coin">
              <span>🪙</span>
            </div>
          </div>
        );
      default:
        return <div className="jinji-sym-wrapper card-sym">A</div>;
    }
  };

  return (
    <div className="jinji-screen">
      {/* BACKGROUND SCENERY */}
      <div className="jinji-bg-sky"></div>

      {/* TOP LEFT (Profile & Coins) */}
      <div className="jinji-top-left">
        <div className="jinji-avatar" onClick={() => alert('Profil VIP')}>
          <img src="https://i.pravatar.cc/100?img=11" alt="Avatar" />
          <span className="jinji-vip-badge">VIP 9</span>
        </div>
        <div className="jinji-signal-icon">
          <div className="jinji-sig-bar b1"></div>
          <div className="jinji-sig-bar b2"></div>
          <div className="jinji-sig-bar b3"></div>
        </div>
        <div className="jinji-coins-display">
          {myCoins.toLocaleString('id-ID')}
        </div>
        <div className="jinji-plus-btn" onClick={() => alert('Top Up')}>+</div>
      </div>

      {/* TOP RIGHT (Header Icons) */}
      <div className="jinji-top-right" style={{ position: 'relative' }}>
        <button className="jinji-tr-btn trophy-btn" onClick={() => alert('Papan Peringkat')}>🏆</button>
        <button className="jinji-tr-btn room-btn" onClick={onBack}>
          <span>🔄</span>
          <small>Ganti<br/>room</small>
        </button>
        <button className="jinji-tr-btn menu-btn" onClick={() => setShowMenu(v => !v)}>≡</button>

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

      {/* TOP JACKPOT BANNER & FU POT */}
      <div className="jinji-jackpot-header">
        <div className="jackpot-box grand">
          <span className="jp-label">GRAND</span>
          <span className="jp-val">{jackpotGrand.toLocaleString('id-ID')}</span>
        </div>
        <div className="jackpot-box minor">
          <span className="jp-label">MINOR</span>
          <span className="jp-val">{jackpotMinor.toLocaleString('id-ID')}</span>
        </div>

        {/* Center Fu Pot */}
        <div className="jinji-fu-pot-container">
          <div className="jinji-fu-pot">
            <span className="pot-lid">🏺</span>
            <span className="pot-coins-overflow">✨🪙✨</span>
          </div>
        </div>

        <div className="jackpot-box major">
          <span className="jp-label">MAJOR</span>
          <span className="jp-val">{jackpotMajor.toLocaleString('id-ID')}</span>
        </div>
        <div className="jackpot-box mini">
          <span className="jp-label">MINI</span>
          <span className="jp-val">{jackpotMini.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* SIDE BUTTONS */}
      <div className="jinji-side-left">
        <div className="jinji-side-card" onClick={() => alert('Step By Step')}>
          <span className="side-title">STEP<br/>BY STEP</span>
          <span className="side-val">4.84M</span>
        </div>
        <div className="jinji-side-card free-spin" onClick={() => alert('Beli Free Spin')}>
          <span className="side-title">8 SPIN<br/>GRATIS</span>
          <span className="side-val">4.84M</span>
        </div>
        <div className="jinji-side-card ransel" onClick={() => alert('Ransel Item')}>
          <span className="side-icon">🎒</span>
          <span className="side-sub">RANSEL</span>
        </div>
      </div>

      <div className="jinji-side-right-arrow">
        <button onClick={() => alert('Side Panel')}>◀</button>
      </div>

      {/* MAIN SLOT REEL BOARD */}
      <div className="jinji-machine-container">
        {freeSpinsLeft > 0 && (
          <div className="jinji-freespin-banner">FREE GAME: {freeSpinsLeft}</div>
        )}

        <div className={`jinji-machine ${isSpinning ? 'spinning' : ''}`}>
          
          {/* Left Pillar (243 REEL WAYS) */}
          <div className="jinji-pillar left-pillar">
            <span className="pillar-num">243</span>
            <span className="pillar-text">REEL WAYS</span>
          </div>

          {/* Grid */}
          <div className="jinji-grid">
            {[0, 1, 2, 3, 4].map(cIdx => (
              <div 
                key={`col-${cIdx}`} 
                className={`jinji-col ${spinningCols[cIdx] ? 'is-spinning' : ''}`}
              >
                {[0, 1, 2].map((rIdx) => {
                  const symId = grid[rIdx] ? grid[rIdx][cIdx] : 5;
                  const isWinning = winningSymbols.includes(symId);
                  return (
                    <div key={`cell-${rIdx}-${cIdx}`} className={`jinji-cell ${isWinning ? 'win-highlight' : ''}`}>
                      {renderSymbolComponent(symId)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Right Pillar (GOLD PAYS TIER) */}
          <div className="jinji-pillar right-pillar">
            <span className="pillar-title">GOLD PAYS</span>
            <div className="gold-pays-icons">
              <span>🐉</span>
              <span>🦅</span>
              <span>🐅</span>
              <span>🐢</span>
              <span>🐟</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROL BAR */}
      <div className="jinji-bottombar-wrapper">
        <div className="jinji-bottombar-bg"></div>
        <div className="jinji-bottombar">
          <div className="jbot-left">
            <button className="jbot-icon-btn" onClick={() => alert('Chat')}>💬</button>
            <button className="jbot-icon-btn" onClick={() => setShowRules(true)}>i</button>
            <button className="jbot-bet-btn" onClick={() => setBetAmount(b => Math.max(9680, b - 9680))}>-</button>
            <div className="jbot-bet-display">
              <div className="jbot-bet-label">BET</div>
              <div className="jbot-bet-val">{betAmount.toLocaleString('id-ID')}</div>
              <div className="jbot-line-bet">LINE BET: 1,100x88</div>
            </div>
            <button className="jbot-bet-btn" onClick={() => setBetAmount(b => Math.min(9680000, b + 9680))}>+</button>
          </div>

          <div className="jbot-center">
            <div className="jbot-info">
              {winAmount > 0 ? `MENANG: ${winAmount.toLocaleString('id-ID')}` : 'Tekan [SPIN] untuk memulai'}
            </div>
          </div>

          <div className="jbot-right">
            <button className="jbot-maxbet-btn" onClick={() => setBetAmount(9680000)}>
              MAX<br/>BET
            </button>
            <button className="jbot-speed-btn" onClick={() => setSpinSpeed(s => s === 1 ? 2 : s === 2 ? 3 : 1)}>
              X{spinSpeed}
            </button>
            
            <div style={{ position: 'relative' }}>
              {showAutoMenu && (
                <div className="jinji-auto-menu">
                  <button onClick={() => { setAutoSpins(10); setShowAutoMenu(false); doSpin(); }}>10</button>
                  <button onClick={() => { setAutoSpins(50); setShowAutoMenu(false); doSpin(); }}>50</button>
                  <button onClick={() => { setAutoSpins(100); setShowAutoMenu(false); doSpin(); }}>100</button>
                  <button onClick={() => { setAutoSpins(99999); setShowAutoMenu(false); doSpin(); }}>∞</button>
                </div>
              )}
              <button 
                className={`jbot-spin-btn ${isSpinning ? 'spinning' : ''}`}
                onMouseDown={() => {
                  if (isSpinning || autoSpins > 0) { setAutoSpins(0); return; }
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
                  if (isSpinning || autoSpins > 0) { setAutoSpins(0); return; }
                  spinPressTimer.current = setTimeout(() => setShowAutoMenu(true), 400);
                }}
                onTouchEnd={() => {
                  if (spinPressTimer.current) clearTimeout(spinPressTimer.current);
                  if (!isSpinning && autoSpins === 0 && !showAutoMenu) doSpin();
                }}
                onContextMenu={(e) => { e.preventDefault(); setShowAutoMenu(!showAutoMenu); }}
              >
                <div className="jbot-spin-title">{autoSpins > 0 ? `AUTO ${autoSpins > 90000 ? '∞' : autoSpins}` : 'SPIN'}</div>
                <div className="jbot-spin-sub">{autoSpins > 0 ? 'STOP' : 'HOLD FOR AUTO'}</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* JACKPOT PICK MINI-GAME OVERLAY */}
      {showJackpotPick && (
        <div className="jinji-jackpot-pick-overlay">
          <div className="jackpot-pick-modal">
            <h2>🎉 FU POT BONUS! PILIH 3 KOIN KEMBAR 🎉</h2>
            <p>Buka 3 koin berhadiah Jackpot yang sama untuk memenangkan hadiah utama!</p>
            <div className="jackpot-coins-grid">
              {jackpotCards.map((cardType, idx) => {
                const isRevealed = pickedCards.includes(idx.toString());
                return (
                  <div 
                    key={idx} 
                    className={`pick-coin-card ${isRevealed ? 'revealed ' + cardType.toLowerCase() : ''}`}
                    onClick={() => handlePickCard(idx)}
                  >
                    {isRevealed ? (
                      <span className="card-type-text">{cardType}</span>
                    ) : (
                      <span className="coin-front">🪙</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ANIMATED JACKPOT WIN CELEBRATION MODAL */}
      {showJackpotWinModal && (
        <div className="jinji-jackpot-win-overlay">
          <div className="jackpot-win-rays"></div>
          <div className="jackpot-win-content bounce-in">
            <div className="jp-win-crown">👑</div>
            <h1 className="jp-win-title">SELAMAT!</h1>
            <div className="jp-win-subtext">ANDA MEMENANGKAN JACKPOT</div>
            <div className={`jp-type-pill ${jackpotWinType.toLowerCase()}`}>
              {jackpotWinType}
            </div>
            <div className="jp-win-amount-box">
              + Rp {jackpotWinPrize.toLocaleString('id-ID')}
            </div>
            <button className="jp-claim-btn" onClick={() => setShowJackpotWinModal(false)}>
              ✨ KLAIM HADIAH ✨
            </button>
          </div>
        </div>
      )}

      {/* RULES MODAL */}
      {showRules && (
        <div className="jinji-rules-modal">
          <div className="jinji-rules-content">
            <button className="jinji-rules-close" onClick={() => setShowRules(false)}>✖</button>
            <h2>ATURAN & PEMBAYARAN - JIN JI BAO XI</h2>
            <div className="jinji-paytable">
              <div className="pt-item">🐉 <strong>Naga Emas</strong>: 5 = 1000x, 4 = 200x, 3 = 50x</div>
              <div className="pt-item">🦅 <strong>Burung Hong</strong>: 5 = 600x, 4 = 150x, 3 = 40x</div>
              <div className="pt-item">🐅 <strong>Macan Emas</strong>: 5 = 400x, 4 = 100x, 3 = 30x</div>
              <div className="pt-item">🐢 <strong>Penyu Emas</strong>: 5 = 200x, 4 = 50x, 3 = 20x</div>
              <div className="pt-item">🐟 <strong>Ikan Emas</strong>: 5 = 100x, 4 = 30x, 3 = 10x</div>
              <div className="pt-item">🏺 <strong>WILD (Pot)</strong>: Menggantikan semua simbol & memicu Fu Pot Jackpot.</div>
              <div className="pt-item">🪙 <strong>Koin Jin Ji</strong>: 6+ Koin memicu Free Games / Top Up Bonus.</div>
            </div>
            <h3>243 REEL WAYS</h3>
            <p>Simbol identik pada kolom bersebelahan dari kiri ke kanan dihitung sebagai kemenangan mutlak!</p>
          </div>
        </div>
      )}
    </div>
  );
}
