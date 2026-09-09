import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import './jinjibaoxi.css';
import GameMenuDropdown from './GameMenuDropdown';

interface Props {
  onBack: () => void;
  socket: Socket | null;
}

export const JINJI_SYMBOLS: Record<number, { name: string; label: string; goldImg: string; normImg?: string }> = {
  0: { name: 'dragon', label: 'Naga Emas', goldImg: '/assets/jinji/sym_dragon_gold.png', normImg: '/assets/jinji/sym_dragon_normal.png' },
  1: { name: 'phoenix', label: 'Burung Hong', goldImg: '/assets/jinji/sym_phoenix_gold.png', normImg: '/assets/jinji/sym_phoenix_normal.png' },
  2: { name: 'tiger', label: 'Macan Emas', goldImg: '/assets/jinji/sym_tiger_gold.png', normImg: '/assets/jinji/sym_tiger_normal.png' },
  3: { name: 'turtle', label: 'Penyu Emas', goldImg: '/assets/jinji/sym_turtle_gold.png', normImg: '/assets/jinji/sym_turtle_normal.png' },
  4: { name: 'carp', label: 'Ikan Emas', goldImg: '/assets/jinji/sym_carp.png' },
  5: { name: 'sym-a', label: 'A', goldImg: '/assets/jinji/sym_card_a.png' },
  6: { name: 'sym-k', label: 'K', goldImg: '/assets/jinji/sym_card_k.png' },
  7: { name: 'sym-q', label: 'Q', goldImg: '/assets/jinji/sym_card_q.png' },
};

export default function JinJiBaoXiSlotScreen({ onBack, socket }: Props) {
  const [grid, setGrid] = useState<number[][]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningCols, setSpinningCols] = useState<boolean[]>([false, false, false, false, false]);
  const [betAmount, setBetAmount] = useState(26400);
  const [goldTier, setGoldTier] = useState<number>(5);
  const [myCoins, setMyCoins] = useState(0);
  const [winAmount, setWinAmount] = useState(0);
  const [, setWinType] = useState<string>('normal');
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
                next[r][c] = Math.floor(Math.random() * 8);
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
    if (prizeAmount) setJackpotWinPrize(prizeAmount);
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

  const lineBetMultiplier = goldTier === 5 ? 88 : goldTier === 4 ? 78 : goldTier === 3 ? 68 : goldTier === 2 ? 38 : 18;
  const lineBetUnit = Math.max(1, Math.round(betAmount / lineBetMultiplier));

  const renderSymbolComponent = (symId: number) => {
    let src = '/assets/jinji/sym_card_a.png';
    let alt = 'Symbol';
    let isGold = false;

    switch (symId) {
      case 0: // Dragon
        isGold = goldTier >= 5;
        src = isGold ? '/assets/jinji/sym_dragon_gold.png' : '/assets/jinji/sym_dragon_normal.png';
        alt = isGold ? 'Naga Emas' : 'Naga';
        break;
      case 1: // Phoenix
        isGold = goldTier >= 4;
        src = isGold ? '/assets/jinji/sym_phoenix_gold.png' : '/assets/jinji/sym_phoenix_normal.png';
        alt = isGold ? 'Burung Hong Emas' : 'Burung Hong';
        break;
      case 2: // Tiger
        isGold = goldTier >= 3;
        src = isGold ? '/assets/jinji/sym_tiger_gold.png' : '/assets/jinji/sym_tiger_normal.png';
        alt = isGold ? 'Macan Emas' : 'Macan';
        break;
      case 3: // Turtle
        isGold = goldTier >= 2;
        src = isGold ? '/assets/jinji/sym_turtle_gold.png' : '/assets/jinji/sym_turtle_normal.png';
        alt = isGold ? 'Penyu Emas' : 'Penyu';
        break;
      case 4: // Carp
        isGold = true;
        src = '/assets/jinji/sym_carp.png';
        alt = 'Ikan Emas';
        break;
      case 5: // A
        src = '/assets/jinji/sym_card_a.png';
        alt = 'A';
        break;
      case 6: // K
        src = '/assets/jinji/sym_card_k.png';
        alt = 'K';
        break;
      case 7: // Q
        src = '/assets/jinji/sym_card_q.png';
        alt = 'Q';
        break;
      default:
        src = '/assets/jinji/sym_card_a.png';
        alt = 'A';
        break;
    }

    return (
      <div className={`jinji-sym-wrapper sym-${symId} ${isGold ? 'is-gold-sym' : ''}`}>
        <img src={src} alt={alt} className="jinji-sym-img" draggable={false} />
      </div>
    );
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
        {/* Left column: GRAND + MINOR stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4vh', flex: 2 }}>
          <div className="jackpot-box grand">
            <span className="jp-label">GRAND</span>
            <span className="jp-val">{jackpotGrand.toLocaleString('id-ID')}</span>
          </div>
          <div className="jackpot-box minor">
            <span className="jp-label">MINOR</span>
            <span className="jp-val">{jackpotMinor.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Center Fu Pot */}
        <div className="jinji-fu-pot-container" style={{ flex: 1 }}>
          <div className="jinji-fu-pot">
            <img src="/assets/jinji/jinji_fu_pot.png" alt="Fu Pot" className="jinji-fu-pot-img" />
          </div>
        </div>

        {/* Right column: MAJOR + MINI stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4vh', flex: 2 }}>
          <div className="jackpot-box major">
            <span className="jp-label">MAJOR</span>
            <span className="jp-val">{jackpotMajor.toLocaleString('id-ID')}</span>
          </div>
          <div className="jackpot-box mini">
            <span className="jp-label">MINI</span>
            <span className="jp-val">{jackpotMini.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      {/* SIDE BUTTONS */}
      <div className="jinji-side-left">
        <div className="jinji-side-card" onClick={() => alert('Step By Step')}>
          <span style={{ fontSize: '1vh', fontWeight: 900, color: '#ffe082', textAlign: 'center', lineHeight: 1.1 }}>STEP<br/>BY STEP</span>
          <span style={{ fontSize: '1.6vh', fontWeight: 900, color: '#ffffff', marginTop: '0.3vh' }}>1.32M</span>
        </div>
        <div className="jinji-side-card free-spin" onClick={() => alert('Beli Free Spin')}>
          <span style={{ fontSize: '1.1vh', fontWeight: 900, color: '#ffd700', textAlign: 'center', lineHeight: 1.1 }}>8 SPIN<br/>GRATIS</span>
          <span style={{ fontSize: '1.6vh', fontWeight: 900, color: '#ffffff', marginTop: '0.3vh' }}>1.32M</span>
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
              <button 
                className={`gold-tier-btn ${goldTier >= 5 ? 'active' : ''}`}
                onClick={() => setGoldTier(goldTier === 5 ? 4 : 5)}
                title="Gold Dragon (5 Gold)"
              >
                <img src="/assets/jinji/sym_dragon_gold.png" alt="Dragon" />
              </button>
              <button 
                className={`gold-tier-btn ${goldTier >= 4 ? 'active' : ''}`}
                onClick={() => setGoldTier(goldTier === 4 ? 3 : 4)}
                title="Gold Phoenix (4 Gold)"
              >
                <img src="/assets/jinji/sym_phoenix_gold.png" alt="Phoenix" />
              </button>
              <button 
                className={`gold-tier-btn ${goldTier >= 3 ? 'active' : ''}`}
                onClick={() => setGoldTier(goldTier === 3 ? 2 : 3)}
                title="Gold Tiger (3 Gold)"
              >
                <img src="/assets/jinji/sym_tiger_gold.png" alt="Tiger" />
              </button>
              <button 
                className={`gold-tier-btn ${goldTier >= 2 ? 'active' : ''}`}
                onClick={() => setGoldTier(goldTier === 2 ? 1 : 2)}
                title="Gold Turtle (2 Gold)"
              >
                <img src="/assets/jinji/sym_turtle_gold.png" alt="Turtle" />
              </button>
              <button 
                className={`gold-tier-btn ${goldTier >= 1 ? 'active' : ''}`}
                onClick={() => setGoldTier(1)}
                title="Gold Carp (1 Gold)"
              >
                <img src="/assets/jinji/sym_carp.png" alt="Carp" />
              </button>
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
            <button className="jbot-bet-btn" onClick={() => setBetAmount(b => Math.max(lineBetMultiplier * 50, b - lineBetMultiplier * 50))}>-</button>
            <div className="jbot-bet-display">
              <div className="jbot-bet-label">BET</div>
              <div className="jbot-bet-val">{betAmount.toLocaleString('id-ID')}</div>
              <div className="jbot-line-bet">LINE BET: {lineBetUnit.toLocaleString('id-ID')}x{lineBetMultiplier}</div>
            </div>
            <button className="jbot-bet-btn" onClick={() => setBetAmount(b => Math.min(lineBetMultiplier * 10000, b + lineBetMultiplier * 50))}>+</button>
          </div>

          <div className="jbot-center">
            <div className="jbot-info">
              {winAmount > 0 ? `MENANG: ${winAmount.toLocaleString('id-ID')}` : 'Tekan [SPIN] untuk memulai'}
            </div>
          </div>

          <div className="jbot-right">
            <button className="jbot-maxbet-btn" onClick={() => setBetAmount(lineBetMultiplier * 3000)}>
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
                      <img src="/assets/jinji/sym_coin.png" alt="Coin" className="pick-coin-img" draggable={false} />
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

      {/* RULES MODAL (AUTHENTIC ATURAN SCREEN FROM REFERENCE) */}
      {showRules && (
        <div className="jinji-rules-modal" onClick={() => setShowRules(false)}>
          <div className="jinji-aturan-screen" onClick={(e) => e.stopPropagation()}>
            <button className="jinji-rules-close" onClick={() => setShowRules(false)}>✖</button>
            
            {/* Top Ornate Banner Ribbon */}
            <div className="aturan-banner-header">
              <div className="aturan-banner-title">ATURAN</div>
            </div>

            {/* 6 Paytable Cards */}
            <div className="aturan-grid">
              {/* Box 1: Dragon */}
              <div className="aturan-card">
                <div className="aturan-pair">
                  <div className="aturan-col">
                    <img src="/assets/jinji/sym_dragon_gold.png" alt="Gold Dragon" className="aturan-sym-img" />
                    <div className="aturan-pays">
                      <div className="pay-row"><span className="num">5</span> <span className="val">{(lineBetUnit * 250).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">4</span> <span className="val">{(lineBetUnit * 60).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">3</span> <span className="val">{(lineBetUnit * 20).toLocaleString('id-ID')}</span></div>
                    </div>
                  </div>
                  <div className="aturan-col">
                    <img src="/assets/jinji/sym_dragon_normal.png" alt="Normal Dragon" className="aturan-sym-img" />
                    <div className="aturan-pays">
                      <div className="pay-row"><span className="num">5</span> <span className="val">{(lineBetUnit * 20).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">4</span> <span className="val">{(lineBetUnit * 10).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">3</span> <span className="val">{(lineBetUnit * 5).toLocaleString('id-ID')}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: Phoenix */}
              <div className="aturan-card">
                <div className="aturan-pair">
                  <div className="aturan-col">
                    <img src="/assets/jinji/sym_phoenix_gold.png" alt="Gold Phoenix" className="aturan-sym-img" />
                    <div className="aturan-pays">
                      <div className="pay-row"><span className="num">5</span> <span className="val">{(lineBetUnit * 200).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">4</span> <span className="val">{(lineBetUnit * 50).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">3</span> <span className="val">{(lineBetUnit * 15).toLocaleString('id-ID')}</span></div>
                    </div>
                  </div>
                  <div className="aturan-col">
                    <img src="/assets/jinji/sym_phoenix_normal.png" alt="Normal Phoenix" className="aturan-sym-img" />
                    <div className="aturan-pays">
                      <div className="pay-row"><span className="num">5</span> <span className="val">{(lineBetUnit * 20).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">4</span> <span className="val">{(lineBetUnit * 10).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">3</span> <span className="val">{(lineBetUnit * 5).toLocaleString('id-ID')}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 3: Tiger */}
              <div className="aturan-card">
                <div className="aturan-pair">
                  <div className="aturan-col">
                    <img src="/assets/jinji/sym_tiger_gold.png" alt="Gold Tiger" className="aturan-sym-img round" />
                    <div className="aturan-pays">
                      <div className="pay-row"><span className="num">5</span> <span className="val">{(lineBetUnit * 150).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">4</span> <span className="val">{(lineBetUnit * 25).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">3</span> <span className="val">{(lineBetUnit * 15).toLocaleString('id-ID')}</span></div>
                    </div>
                  </div>
                  <div className="aturan-col">
                    <img src="/assets/jinji/sym_tiger_normal.png" alt="Normal Tiger" className="aturan-sym-img" />
                    <div className="aturan-pays">
                      <div className="pay-row"><span className="num">5</span> <span className="val">{(lineBetUnit * 20).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">4</span> <span className="val">{(lineBetUnit * 10).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">3</span> <span className="val">{(lineBetUnit * 5).toLocaleString('id-ID')}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 4: Turtle */}
              <div className="aturan-card">
                <div className="aturan-pair">
                  <div className="aturan-col">
                    <img src="/assets/jinji/sym_turtle_gold.png" alt="Gold Turtle" className="aturan-sym-img round" />
                    <div className="aturan-pays">
                      <div className="pay-row"><span className="num">5</span> <span className="val">{(lineBetUnit * 100).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">4</span> <span className="val">{(lineBetUnit * 20).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">3</span> <span className="val">{(lineBetUnit * 10).toLocaleString('id-ID')}</span></div>
                    </div>
                  </div>
                  <div className="aturan-col">
                    <img src="/assets/jinji/sym_turtle_normal.png" alt="Normal Turtle" className="aturan-sym-img" />
                    <div className="aturan-pays">
                      <div className="pay-row"><span className="num">5</span> <span className="val">{(lineBetUnit * 20).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">4</span> <span className="val">{(lineBetUnit * 10).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">3</span> <span className="val">{(lineBetUnit * 5).toLocaleString('id-ID')}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 5: Carp */}
              <div className="aturan-card single">
                <div className="aturan-col" style={{ width: '100%' }}>
                  <img src="/assets/jinji/sym_carp.png" alt="Carp" className="aturan-sym-img" />
                  <div className="aturan-pays">
                    <div className="pay-row"><span className="num">5</span> <span className="val">{(lineBetUnit * 50).toLocaleString('id-ID')}</span></div>
                    <div className="pay-row"><span className="num">4</span> <span className="val">{(lineBetUnit * 15).toLocaleString('id-ID')}</span></div>
                    <div className="pay-row"><span className="num">3</span> <span className="val">{(lineBetUnit * 10).toLocaleString('id-ID')}</span></div>
                  </div>
                </div>
              </div>

              {/* Box 6: Cards A, Q, K */}
              <div className="aturan-card cards-box">
                <div className="aturan-cards-row">
                  <div className="aturan-card-item">
                    <img src="/assets/jinji/sym_card_a.png" alt="A" className="aturan-sym-card" />
                    <div className="aturan-pays">
                      <div className="pay-row"><span className="num">5</span> <span className="val">{(lineBetUnit * 10).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">4</span> <span className="val">{(lineBetUnit * 8).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">3</span> <span className="val">{(lineBetUnit * 5).toLocaleString('id-ID')}</span></div>
                    </div>
                  </div>
                  <div className="aturan-card-item">
                    <img src="/assets/jinji/sym_card_q.png" alt="Q" className="aturan-sym-card" />
                    <div className="aturan-pays">
                      <div className="pay-row"><span className="num">5</span> <span className="val">{(lineBetUnit * 10).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">4</span> <span className="val">{(lineBetUnit * 8).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">3</span> <span className="val">{(lineBetUnit * 5).toLocaleString('id-ID')}</span></div>
                    </div>
                  </div>
                  <div className="aturan-card-item">
                    <img src="/assets/jinji/sym_card_k.png" alt="K" className="aturan-sym-card" />
                    <div className="aturan-pays">
                      <div className="pay-row"><span className="num">5</span> <span className="val">{(lineBetUnit * 10).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">4</span> <span className="val">{(lineBetUnit * 8).toLocaleString('id-ID')}</span></div>
                      <div className="pay-row"><span className="num">3</span> <span className="val">{(lineBetUnit * 5).toLocaleString('id-ID')}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Nav: Dots & Kembali Ke Game */}
            <div className="aturan-bottom-nav">
              <div className="aturan-dots">
                <span className="dot active"></span>
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
              <button className="aturan-back-btn" onClick={() => setShowRules(false)}>
                ◀ KEMBALI KE GAME ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
