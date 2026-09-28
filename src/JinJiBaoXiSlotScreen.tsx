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
  const [rulesPage, setRulesPage] = useState(1);
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

  // Initialize grid with random symbols (like the reference)
  useEffect(() => {
    const initGrid = Array(3).fill(null).map(() =>
      Array(5).fill(null).map(() => Math.floor(Math.random() * 8))
    );
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
  const formatCoinPay = (mult: number) => {
    const val = lineBetUnit * mult;
    if (val >= 10000 && val % 1000 === 0) return `${val / 1000}K`;
    return val.toLocaleString('id-ID');
  };

  const renderScatterIcon = (size = 24) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ verticalAlign: 'middle', display: 'inline-block' }}>
      <circle cx="50" cy="50" r="46" fill="#c62828" stroke="#ffeb3b" strokeWidth="6" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#ffe082" strokeWidth="3" />
      <circle cx="50" cy="50" r="26" fill="#b71c1c" stroke="#ffeb3b" strokeWidth="3" />
      <rect x="39" y="39" width="22" height="22" fill="none" stroke="#fff" strokeWidth="4" />
      <line x1="50" y1="4" x2="50" y2="39" stroke="#ffe082" strokeWidth="3" />
      <line x1="50" y1="61" x2="50" y2="96" stroke="#ffe082" strokeWidth="3" />
      <line x1="4" y1="50" x2="39" y2="50" stroke="#ffe082" strokeWidth="3" />
      <line x1="61" y1="50" x2="96" y2="50" stroke="#ffe082" strokeWidth="3" />
    </svg>
  );

  const renderFeatureWildIcon = (size = 54) => (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 35%, #2e7d32 0%, #1b5e20 80%, #0d3813 100%)',
      border: '0.22vh solid #ffd700',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0.3vh 0.8vh rgba(0,0,0,0.6), inset 0 0.2vh 0.5vh rgba(255,255,255,0.4)',
      color: '#ffe082', fontWeight: 900, fontSize: size * 0.55, fontFamily: "'Noto Serif SC', serif"
    }}>
      福
    </div>
  );

  const renderWildIcon = (size = 54) => (
    <div style={{
      width: size * 1.3, height: size,
      background: 'radial-gradient(ellipse at 50% 30%, #ffecb3 0%, #ffb300 40%, #c67100 80%, #6d3d00 100%)',
      border: '0.22vh solid #fff8e1', borderRadius: '1.2vh',
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0.4vh 1vh rgba(0,0,0,0.6), inset 0 0.2vh 0.4vh rgba(255,255,255,0.6)',
      position: 'relative', verticalAlign: 'middle'
    }}>
      <span style={{ color: '#fff', fontWeight: 900, fontSize: size * 0.34, textShadow: '0 0.15vh 0.3vh #000' }}>WILD</span>
      <span style={{ fontSize: size * 0.32, marginTop: -2 }}>🍑</span>
    </div>
  );

  const renderPlusOneIcon = (size = 50) => (
    <div style={{
      width: size, height: size,
      background: 'linear-gradient(180deg, #d32f2f 0%, #850000 100%)',
      border: '0.22vh solid #ffe082', borderRadius: '0.8vh',
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0.3vh 0.8vh rgba(0,0,0,0.6)',
      color: '#ffeb3b', fontWeight: 900, lineHeight: 1.1, verticalAlign: 'middle'
    }}>
      <span style={{ fontSize: size * 0.45, textShadow: '0 0.15vh 0.3vh #000' }}>+1</span>
      <span style={{ fontSize: size * 0.24, color: '#fff', textShadow: '0 0.15vh 0.3vh #000' }}>SPIN</span>
    </div>
  );

  const renderGreenFuCoin = (size = 20) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ verticalAlign: 'middle', display: 'inline-block', margin: '0 0.2vw' }}>
      <defs>
        <radialGradient id="greenFuGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#4caf50" />
          <stop offset="70%" stopColor="#1b5e20" />
          <stop offset="100%" stopColor="#0d3813" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#greenFuGrad)" stroke="#ffeb3b" strokeWidth="6" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#a5d6a7" strokeWidth="2.5" opacity="0.7" />
      <text x="50" y="66" textAnchor="middle" fill="#ffe082" fontSize="54" fontWeight="900" fontFamily="'Noto Serif SC', 'PingFang SC', sans-serif">福</text>
    </svg>
  );

  const renderYellowFuCoin = (size = 20) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ verticalAlign: 'middle', display: 'inline-block', margin: '0 0.2vw' }}>
      <defs>
        <radialGradient id="yellowFuGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff176" />
          <stop offset="70%" stopColor="#fbc02d" />
          <stop offset="100%" stopColor="#f57f17" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#yellowFuGrad)" stroke="#fff8e1" strokeWidth="6" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#fff9c4" strokeWidth="2.5" opacity="0.8" />
      <text x="50" y="66" textAnchor="middle" fill="#4e342e" fontSize="54" fontWeight="900" fontFamily="'Noto Serif SC', 'PingFang SC', sans-serif">福</text>
    </svg>
  );

  const renderGrandIcon = (size = 24) => (
    <img 
      src="/assets/jinji/jinji_fu_pot.png" 
      alt="Grand" 
      style={{ 
        width: size * 1.35, 
        height: size, 
        objectFit: 'contain', 
        verticalAlign: 'middle', 
        display: 'inline-block',
        filter: 'drop-shadow(0 0.2vh 0.4vh rgba(0,0,0,0.6))',
        margin: '0 0.2vw'
      }} 
    />
  );

  const renderWildInlineIcon = (size = 22) => (
    <svg width={size * 1.3} height={size} viewBox="0 0 70 50" style={{ verticalAlign: 'middle', display: 'inline-block', margin: '0 0.2vw' }}>
      <defs>
        <linearGradient id="goldBatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff176" />
          <stop offset="40%" stopColor="#fbc02d" />
          <stop offset="100%" stopColor="#c67100" />
        </linearGradient>
      </defs>
      <path d="M 5,20 Q 20,5 35,18 Q 50,5 65,20 Q 55,40 35,48 Q 15,40 5,20 Z" fill="url(#goldBatGrad)" stroke="#fff8e1" strokeWidth="2" />
      <ellipse cx="35" cy="26" rx="11" ry="13" fill="#ff5252" />
      <path d="M 35,13 Q 32,25 35,39" stroke="#b71c1c" strokeWidth="1.5" fill="none" />
      <path d="M 35,13 Q 40,8 43,10 Q 40,15 35,13" fill="#4caf50" />
    </svg>
  );

  return (
    <div className="jinji-screen">
      {/* BACKGROUND SCENERY */}
      <div className="jinji-bg-sky">
        {/* SVG Decorative Scene: Pagodas, lanterns, bridge, lotus */}
        <svg className="jinji-bg-svg" viewBox="0 0 1920 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          {/* Stars / sparkles in sky */}
          {[...Array(30)].map((_, i) => (
            <circle key={i} cx={50 + (i * 67 % 1800)} cy={20 + (i * 43 % 280)} r={i % 3 === 0 ? 1.5 : 1} fill="rgba(255,255,255,0.5)" opacity={0.4 + (i % 5) * 0.1} />
          ))}
          
          {/* LEFT PAGODA silhouette */}
          {/* Base platform */}
          <rect x="30" y="560" width="200" height="18" rx="2" fill="rgba(10,25,60,0.85)" />
          {/* Roof tiers left pagoda */}
          <polygon points="80,480 180,480 195,510 65,510" fill="rgba(140,30,15,0.82)" />
          <polygon points="90,510 170,510 182,532 78,532" fill="rgba(120,25,10,0.82)" />
          <polygon points="100,532 160,532 170,550 90,550" fill="rgba(110,22,8,0.82)" />
          <polygon points="108,550 152,550 160,565 100,565" fill="rgba(100,18,5,0.82)" />
          <rect x="120" y="560" width="20" height="18" fill="rgba(80,15,5,0.82)" />
          {/* Upturned eaves tips */}
          <path d="M65,510 Q50,505 45,495" stroke="rgba(140,30,15,0.8)" strokeWidth="3" fill="none"/>
          <path d="M195,510 Q210,505 215,495" stroke="rgba(140,30,15,0.8)" strokeWidth="3" fill="none"/>
          <path d="M78,532 Q65,527 60,518" stroke="rgba(120,25,10,0.8)" strokeWidth="2.5" fill="none"/>
          <path d="M182,532 Q195,527 200,518" stroke="rgba(120,25,10,0.8)" strokeWidth="2.5" fill="none"/>
          {/* Windows - glowing */}
          <rect x="115" y="488" width="30" height="16" rx="2" fill="rgba(255,200,80,0.35)" />
          <rect x="122" y="518" width="16" height="10" rx="1" fill="rgba(255,200,80,0.3)" />
          
          {/* RIGHT PAGODA silhouette */}
          <rect x="1690" y="560" width="200" height="18" rx="2" fill="rgba(10,25,60,0.85)" />
          <polygon points="1740,480 1840,480 1855,510 1725,510" fill="rgba(140,30,15,0.82)" />
          <polygon points="1750,510 1830,510 1842,532 1738,532" fill="rgba(120,25,10,0.82)" />
          <polygon points="1760,532 1820,532 1830,550 1750,550" fill="rgba(110,22,8,0.82)" />
          <polygon points="1768,550 1812,550 1820,565 1760,565" fill="rgba(100,18,5,0.82)" />
          <rect x="1780" y="560" width="20" height="18" fill="rgba(80,15,5,0.82)" />
          <path d="M1725,510 Q1710,505 1705,495" stroke="rgba(140,30,15,0.8)" strokeWidth="3" fill="none"/>
          <path d="M1855,510 Q1870,505 1875,495" stroke="rgba(140,30,15,0.8)" strokeWidth="3" fill="none"/>
          <rect x="1775" y="488" width="30" height="16" rx="2" fill="rgba(255,200,80,0.35)" />
          <rect x="1782" y="518" width="16" height="10" rx="1" fill="rgba(255,200,80,0.3)" />
          
          {/* BRIDGE/WALKWAY at bottom center */}
          <path d="M680,740 Q960,680 1240,740" stroke="rgba(30,60,120,0.7)" strokeWidth="18" fill="none" />
          <path d="M700,738 Q960,682 1220,738" stroke="rgba(50,100,180,0.3)" strokeWidth="6" fill="none" />
          {/* Bridge railings */}
          {[720,800,880,960,1040,1120,1200].map((x, i) => (
            <g key={i}>
              <line x1={x} y1="725" x2={x} y2="745" stroke="rgba(80,140,220,0.55)" strokeWidth="3"/>
              <line x1={x-20} y1="730" x2={x+20} y2="730" stroke="rgba(80,140,220,0.45)" strokeWidth="2"/>
            </g>
          ))}
          
          {/* LANTERNS - Left side */}
          <ellipse cx="150" cy="580" rx="14" ry="20" fill="rgba(220,60,10,0.85)" />
          <rect x="146" y="560" width="8" height="10" fill="rgba(255,180,50,0.7)" rx="1" />
          <line x1="150" y1="560" x2="150" y2="545" stroke="rgba(180,140,40,0.7)" strokeWidth="2" />
          <ellipse cx="150" cy="580" rx="14" ry="20" fill="none" stroke="rgba(255,200,60,0.4)" strokeWidth="1.5"/>
          {/* Lantern glow */}
          <ellipse cx="150" cy="580" rx="25" ry="35" fill="rgba(255,100,20,0.12)" />
          
          <ellipse cx="240" cy="595" rx="12" ry="18" fill="rgba(220,60,10,0.8)" />
          <rect x="236" y="577" width="8" height="9" fill="rgba(255,180,50,0.7)" rx="1" />
          <line x1="240" y1="577" x2="240" y2="563" stroke="rgba(180,140,40,0.7)" strokeWidth="2" />
          <ellipse cx="240" cy="595" rx="22" ry="30" fill="rgba(255,100,20,0.1)" />
          
          {/* LANTERNS - Right side */}
          <ellipse cx="1770" cy="580" rx="14" ry="20" fill="rgba(220,60,10,0.85)" />
          <rect x="1766" y="560" width="8" height="10" fill="rgba(255,180,50,0.7)" rx="1" />
          <line x1="1770" y1="560" x2="1770" y2="545" stroke="rgba(180,140,40,0.7)" strokeWidth="2" />
          <ellipse cx="1770" cy="580" rx="25" ry="35" fill="rgba(255,100,20,0.12)" />
          
          <ellipse cx="1680" cy="595" rx="12" ry="18" fill="rgba(220,60,10,0.8)" />
          <rect x="1676" y="577" width="8" height="9" fill="rgba(255,180,50,0.7)" rx="1" />
          <line x1="1680" y1="577" x2="1680" y2="563" stroke="rgba(180,140,40,0.7)" strokeWidth="2" />
          <ellipse cx="1680" cy="595" rx="22" ry="30" fill="rgba(255,100,20,0.1)" />
          
          {/* LOTUS FLOWERS in pond */}
          {[820, 960, 1100].map((x, i) => (
            <g key={i}>
              <ellipse cx={x} cy={778} rx="18" ry="6" fill="rgba(255,100,150,0.4)" />
              <ellipse cx={x} cy={774} rx="12" ry="5" fill="rgba(255,140,170,0.5)" />
              <ellipse cx={x} cy={770} rx="8" ry="4" fill="rgba(255,200,210,0.6)" />
              {/* Lotus leaf */}
              <ellipse cx={x+25} cy={782} rx="16" ry="5" fill="rgba(40,120,60,0.45)" />
              <ellipse cx={x-22} cy={784} rx="14" ry="4.5" fill="rgba(40,120,60,0.4)" />
            </g>
          ))}
          
          {/* Distant mountains silhouette */}
          <path d="M0,620 L200,500 L320,560 L450,480 L580,560 L680,620 L0,620 Z" fill="rgba(15,40,90,0.5)" />
          <path d="M1240,620 L1340,560 L1470,480 L1600,560 L1720,500 L1920,620 L1240,620 Z" fill="rgba(15,40,90,0.5)" />
          
          {/* Water/pond shimmer at very bottom */}
          <rect x="600" y="750" width="720" height="50" fill="rgba(30,80,180,0.22)" rx="4" />
          <path d="M640,760 Q700,755 760,760 Q820,765 880,760 Q940,755 1000,760 Q1060,765 1120,760 Q1180,755 1240,760 Q1280,758 1300,760" stroke="rgba(100,180,255,0.25)" strokeWidth="1.5" fill="none" />
          <path d="M650,770 Q720,766 790,770 Q860,774 930,770 Q1000,766 1070,770 Q1140,774 1200,770" stroke="rgba(100,180,255,0.2)" strokeWidth="1" fill="none" />
        </svg>
      </div>

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
      <div className="jinji-top-right">
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
          style={{ top: '6.5vh', right: 0 }}
        />
      </div>

      {/* TOP JACKPOT BANNER & FU POT */}
      <div className="jinji-jackpot-header">
        {/* OUTER DECORATIVE BANNER */}
        <div className="jp-banner-outer">
          {/* Left column: GRAND + MINOR stacked */}
          <div className="jp-col">
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
          <div className="jinji-fu-pot-container">
            <div className="jinji-fu-pot">
              <img src="/assets/jinji/jinji_fu_pot.png" alt="Fu Pot" className="jinji-fu-pot-img" />
            </div>
          </div>

          {/* Right column: MAJOR + MINI stacked */}
          <div className="jp-col">
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
            <button className="jbot-btn jbot-chat-btn" onClick={() => alert('Chat')} title="Chat">
              <svg viewBox="0 0 36 32" className="jbot-svg-chat">
                <path 
                  d="M18 4C9.5 4 3 9 3 15.5c0 3.2 1.6 6.1 4.2 8.1-.4 2.2-1.5 4.3-2.2 5.1-.3.3-.1.8.3.8.3 0 2.2-.2 4.9-1.9 2.4.9 5.1 1.4 7.8 1.4 8.5 0 15-5 15-11.5S26.5 4 18 4z" 
                  fill="#4a1800"
                />
                <circle cx="11.5" cy="15.5" r="1.7" fill="#ffe082"/>
                <circle cx="18" cy="15.5" r="1.7" fill="#ffe082"/>
                <circle cx="24.5" cy="15.5" r="1.7" fill="#ffe082"/>
              </svg>
            </button>
            <button className="jbot-btn jbot-info-btn" onClick={() => setShowRules(true)} title="Info">
              <span className="jbot-serif-i">i</span>
            </button>
            <button className="jbot-btn jbot-minus-btn" onClick={() => setBetAmount(b => Math.max(lineBetMultiplier * 50, b - lineBetMultiplier * 50))} title="Kurang Taruhan">
              <span className="jbot-sym-minus">−</span>
            </button>
            <div className="jbot-bet-wrap">
              <div className="jbot-bet-box">
                <div className="jbot-bet-label">BET</div>
                <div className="jbot-bet-val">{betAmount.toLocaleString('en-US')}</div>
              </div>
              <div className="jbot-line-bet">LINE BET: {lineBetUnit.toLocaleString('en-US')}X{lineBetMultiplier}</div>
            </div>
            <button className="jbot-btn jbot-plus-btn" onClick={() => setBetAmount(b => Math.min(lineBetMultiplier * 10000, b + lineBetMultiplier * 50))} title="Tambah Taruhan">
              <span className="jbot-sym-plus">+</span>
            </button>
          </div>

          <div className="jbot-center">
            <div className="jbot-info-frame">
              <div className="jbot-info-outer">
                <div className="jbot-info-inner-frame">
                  <div className="jbot-info-inner">
                    {winAmount > 0 ? `MENANG: ${winAmount.toLocaleString('en-US')}` : 'Teka [SPIN] untuk memulai'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="jbot-right">
            <button className="jbot-btn jbot-maxbet-btn" onClick={() => setBetAmount(lineBetMultiplier * 3000)}>
              <span className="jbot-btn-line">MAX</span>
              <span className="jbot-btn-line">BET</span>
            </button>
            <button className="jbot-btn jbot-speed-btn" onClick={() => setSpinSpeed(s => s === 1 ? 2 : s === 2 ? 3 : 1)}>
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
              {showRules ? (
                <button
                  className="jbot-tutup-btn"
                  onClick={() => setShowRules(false)}
                >
                  TUTUP
                </button>
              ) : (
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
                  <div className="jbot-spin-sub-pill">
                    <span className="jbot-spin-sub">{autoSpins > 0 ? 'STOP' : 'HOLD FOR AUTO'}</span>
                  </div>
                </button>
              )}
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

      {/* RULES MODAL (AUTHENTIC 5-PAGE ATURAN SCREEN FROM REFERENCE) */}
      {showRules && (
        <div className="jinji-rules-modal" onClick={() => setShowRules(false)}>
          {/* Top Banner Ribbon */}
          <div className="aturan-banner-header" onClick={(e) => e.stopPropagation()}>
            <div className="aturan-banner-title">ATURAN</div>
          </div>

          <div className="aturan-body" onClick={(e) => e.stopPropagation()}>
            {/* PAGE 1: Multipliers (Rasio Taruhan) */}
            {rulesPage === 1 && (
              <div className="aturan-grid">
                {/* Box 1: Dragon */}
                <div className="aturan-card">
                  <div className="aturan-pair">
                    <div className="aturan-col">
                      <img src="/assets/jinji/sym_dragon_gold.png" alt="Gold Dragon" className="aturan-sym-img" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">250</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">60</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">20</span></div>
                      </div>
                    </div>
                    <div className="aturan-col">
                      <img src="/assets/jinji/sym_dragon_normal.png" alt="Normal Dragon" className="aturan-sym-img" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">20</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">10</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">5</span></div>
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
                        <div className="pay-row"><span className="num">5</span> <span className="val">200</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">50</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">15</span></div>
                      </div>
                    </div>
                    <div className="aturan-col">
                      <img src="/assets/jinji/sym_phoenix_normal.png" alt="Normal Phoenix" className="aturan-sym-img" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">20</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">10</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">5</span></div>
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
                        <div className="pay-row"><span className="num">5</span> <span className="val">150</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">25</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">15</span></div>
                      </div>
                    </div>
                    <div className="aturan-col">
                      <img src="/assets/jinji/sym_tiger_normal.png" alt="Normal Tiger" className="aturan-sym-img round" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">20</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">10</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">5</span></div>
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
                        <div className="pay-row"><span className="num">5</span> <span className="val">100</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">20</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">10</span></div>
                      </div>
                    </div>
                    <div className="aturan-col">
                      <img src="/assets/jinji/sym_turtle_normal.png" alt="Normal Turtle" className="aturan-sym-img round" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">20</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">10</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">5</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Box 5: Carp */}
                <div className="aturan-card">
                  <div className="aturan-col" style={{ width: '100%' }}>
                    <img src="/assets/jinji/sym_carp.png" alt="Carp" className="aturan-sym-img" />
                    <div className="aturan-pays">
                      <div className="pay-row"><span className="num">5</span> <span className="val">50</span></div>
                      <div className="pay-row"><span className="num">4</span> <span className="val">15</span></div>
                      <div className="pay-row"><span className="num">3</span> <span className="val">10</span></div>
                    </div>
                  </div>
                </div>

                {/* Box 6: Royals A, Q, K */}
                <div className="aturan-card cards-box">
                  <div className="aturan-cards-row">
                    <div className="aturan-card-item">
                      <img src="/assets/jinji/sym_card_a.png" alt="A" className="aturan-sym-card" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">10</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">8</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">5</span></div>
                      </div>
                    </div>
                    <div className="aturan-card-item">
                      <img src="/assets/jinji/sym_card_q.png" alt="Q" className="aturan-sym-card" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">10</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">8</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">5</span></div>
                      </div>
                    </div>
                    <div className="aturan-card-item">
                      <img src="/assets/jinji/sym_card_k.png" alt="K" className="aturan-sym-card" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">10</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">8</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">5</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 2: Coin Values calculated from Bet */}
            {rulesPage === 2 && (
              <div className="aturan-grid">
                {/* Box 1: Dragon */}
                <div className="aturan-card">
                  <div className="aturan-pair">
                    <div className="aturan-col">
                      <img src="/assets/jinji/sym_dragon_gold.png" alt="Gold Dragon" className="aturan-sym-img" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">{formatCoinPay(250)}</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">{formatCoinPay(60)}</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">{formatCoinPay(20)}</span></div>
                      </div>
                    </div>
                    <div className="aturan-col">
                      <img src="/assets/jinji/sym_dragon_normal.png" alt="Normal Dragon" className="aturan-sym-img" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">{formatCoinPay(20)}</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">{formatCoinPay(10)}</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">{formatCoinPay(5)}</span></div>
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
                        <div className="pay-row"><span className="num">5</span> <span className="val">{formatCoinPay(200)}</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">{formatCoinPay(50)}</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">{formatCoinPay(15)}</span></div>
                      </div>
                    </div>
                    <div className="aturan-col">
                      <img src="/assets/jinji/sym_phoenix_normal.png" alt="Normal Phoenix" className="aturan-sym-img" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">{formatCoinPay(20)}</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">{formatCoinPay(10)}</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">{formatCoinPay(5)}</span></div>
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
                        <div className="pay-row"><span className="num">5</span> <span className="val">{formatCoinPay(150)}</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">{formatCoinPay(25)}</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">{formatCoinPay(15)}</span></div>
                      </div>
                    </div>
                    <div className="aturan-col">
                      <img src="/assets/jinji/sym_tiger_normal.png" alt="Normal Tiger" className="aturan-sym-img round" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">{formatCoinPay(20)}</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">{formatCoinPay(10)}</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">{formatCoinPay(5)}</span></div>
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
                        <div className="pay-row"><span className="num">5</span> <span className="val">{formatCoinPay(100)}</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">{formatCoinPay(20)}</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">{formatCoinPay(10)}</span></div>
                      </div>
                    </div>
                    <div className="aturan-col">
                      <img src="/assets/jinji/sym_turtle_normal.png" alt="Normal Turtle" className="aturan-sym-img round" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">{formatCoinPay(20)}</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">{formatCoinPay(10)}</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">{formatCoinPay(5)}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Box 5: Carp */}
                <div className="aturan-card">
                  <div className="aturan-col" style={{ width: '100%' }}>
                    <img src="/assets/jinji/sym_carp.png" alt="Carp" className="aturan-sym-img" />
                    <div className="aturan-pays">
                      <div className="pay-row"><span className="num">5</span> <span className="val">{formatCoinPay(50)}</span></div>
                      <div className="pay-row"><span className="num">4</span> <span className="val">{formatCoinPay(15)}</span></div>
                      <div className="pay-row"><span className="num">3</span> <span className="val">{formatCoinPay(10)}</span></div>
                    </div>
                  </div>
                </div>

                {/* Box 6: Royals A, Q, K */}
                <div className="aturan-card cards-box">
                  <div className="aturan-cards-row">
                    <div className="aturan-card-item">
                      <img src="/assets/jinji/sym_card_a.png" alt="A" className="aturan-sym-card" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">{formatCoinPay(10)}</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">{formatCoinPay(8)}</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">{formatCoinPay(5)}</span></div>
                      </div>
                    </div>
                    <div className="aturan-card-item">
                      <img src="/assets/jinji/sym_card_q.png" alt="Q" className="aturan-sym-card" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">{formatCoinPay(10)}</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">{formatCoinPay(8)}</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">{formatCoinPay(5)}</span></div>
                      </div>
                    </div>
                    <div className="aturan-card-item">
                      <img src="/assets/jinji/sym_card_k.png" alt="K" className="aturan-sym-card" />
                      <div className="aturan-pays">
                        <div className="pay-row"><span className="num">5</span> <span className="val">{formatCoinPay(10)}</span></div>
                        <div className="pay-row"><span className="num">4</span> <span className="val">{formatCoinPay(8)}</span></div>
                        <div className="pay-row"><span className="num">3</span> <span className="val">{formatCoinPay(5)}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 3: Simbol Khusus */}
            {rulesPage === 3 && (
              <div className="aturan-special-panel">
                {/* 1. WILD */}
                <div className="aturan-spec-row">
                  <div className="aturan-spec-icon-wrap">
                    {renderWildIcon(75)}
                  </div>
                  <div className="aturan-spec-info">
                    <div className="aturan-spec-title">WILD</div>
                    <div className="aturan-spec-desc">
                      Muncul pada game utama di kolom 2-4.<br/>
                      Dapat mengganti simbol apa pun kecuali <span className="inline-scatter-ico">{renderScatterIcon(22)}</span>.
                    </div>
                  </div>
                </div>

                {/* 2. FEATURE WILD */}
                <div className="aturan-spec-row">
                  <div className="aturan-spec-icon-wrap">
                    {renderFeatureWildIcon(68)}
                  </div>
                  <div className="aturan-spec-info">
                    <div className="aturan-spec-title">FEATURE WILD</div>
                    <div className="aturan-spec-desc">
                      Muncul pada SPIN GRATIS di kolom 2-4.<br/>
                      Dapat mengganti simbol apa pun kecuali <span className="inline-scatter-ico">{renderScatterIcon(22)}</span>.
                    </div>
                  </div>
                </div>

                {/* 3. SCATTER */}
                <div className="aturan-spec-row">
                  <div className="aturan-spec-icon-wrap">
                    {renderScatterIcon(65)}
                  </div>
                  <div className="aturan-spec-info">
                    <div className="aturan-spec-title">SCATTER</div>
                    <div className="aturan-spec-desc">
                      Dapatkan 6 atau lebih <span className="inline-scatter-ico">{renderScatterIcon(22)}</span> untuk masuk ke FREE GAME.<br/>
                      Semakin tinggi Bet semakin banyak Bonus.
                    </div>
                  </div>
                </div>

                {/* 4. +1 */}
                <div className="aturan-spec-row">
                  <div className="aturan-spec-icon-wrap">
                    {renderPlusOneIcon(60)}
                  </div>
                  <div className="aturan-spec-info">
                    <div className="aturan-spec-title">+1</div>
                    <div className="aturan-spec-desc">
                      Hanya muncul di SPIN GRATIS.<br/>
                      Dapatkan tambahan putaran 1x dengan simbol ini.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 4: SIMBOL EMAS */}
            {rulesPage === 4 && (
              <div className="aturan-gold-panel">
                <div className="aturan-info-box">
                  <div className="aturan-info-title">SIMBOL EMAS</div>
                  <div className="aturan-info-bullet">• Semua kombinasi kemenangan dari kiri ke kanan akan menambah total hadiah.</div>
                  <div className="aturan-info-bullet">• Bet yang lebih tinggi akan mengaktifkan lebih banyak simbol emas.</div>
                  <div className="aturan-info-bullet">• Hadiah simbol emas jauh lebih tinggi daripada simbol normal.</div>
                </div>

                <div className="aturan-gold-bottom">
                  {/* Left Table */}
                  <div className="aturan-gold-table">
                    <div className="aturan-gt-row">
                      <span className="gt-label">SIMBOL AKTIF</span>
                      <span className="gt-bet">JUMLAH BET<br/>9,680</span>
                      <div className="gt-icons">
                        <img src="/assets/jinji/sym_turtle_gold.png" alt="" />
                        <img src="/assets/jinji/sym_tiger_normal.png" alt="" />
                        <img src="/assets/jinji/sym_phoenix_normal.png" alt="" />
                        <img src="/assets/jinji/sym_dragon_normal.png" alt="" />
                        <img src="/assets/jinji/sym_carp.png" alt="" />
                      </div>
                    </div>
                    <div className="aturan-gt-row">
                      <span className="gt-label">SIMBOL AKTIF</span>
                      <span className="gt-bet">JUMLAH BET<br/>17,600</span>
                      <div className="gt-icons">
                        <img src="/assets/jinji/sym_turtle_gold.png" alt="" />
                        <img src="/assets/jinji/sym_tiger_gold.png" alt="" />
                        <img src="/assets/jinji/sym_phoenix_normal.png" alt="" />
                        <img src="/assets/jinji/sym_dragon_normal.png" alt="" />
                        <img src="/assets/jinji/sym_carp.png" alt="" />
                      </div>
                    </div>
                    <div className="aturan-gt-row">
                      <span className="gt-label">SIMBOL AKTIF</span>
                      <span className="gt-bet">JUMLAH BET<br/>88,000</span>
                      <div className="gt-icons">
                        <img src="/assets/jinji/sym_turtle_gold.png" alt="" />
                        <img src="/assets/jinji/sym_tiger_gold.png" alt="" />
                        <img src="/assets/jinji/sym_phoenix_gold.png" alt="" />
                        <img src="/assets/jinji/sym_dragon_normal.png" alt="" />
                        <img src="/assets/jinji/sym_carp.png" alt="" />
                      </div>
                    </div>
                    <div className="aturan-gt-row">
                      <span className="gt-label">SIMBOL AKTIF</span>
                      <span className="gt-bet">JUMLAH BET<br/>96,800</span>
                      <div className="gt-icons">
                        <img src="/assets/jinji/sym_turtle_gold.png" alt="" />
                        <img src="/assets/jinji/sym_tiger_gold.png" alt="" />
                        <img src="/assets/jinji/sym_phoenix_gold.png" alt="" />
                        <img src="/assets/jinji/sym_dragon_gold.png" alt="" />
                        <img src="/assets/jinji/sym_carp.png" alt="" />
                      </div>
                    </div>
                    <div className="aturan-gt-row">
                      <span className="gt-label">SIMBOL AKTIF</span>
                      <span className="gt-bet">JUMLAH BET<br/>264,000</span>
                      <div className="gt-icons">
                        <img src="/assets/jinji/sym_turtle_gold.png" alt="" />
                        <img src="/assets/jinji/sym_tiger_gold.png" alt="" />
                        <img src="/assets/jinji/sym_phoenix_gold.png" alt="" />
                        <img src="/assets/jinji/sym_dragon_gold.png" alt="" />
                        <img src="/assets/jinji/sym_carp.png" alt="" />
                      </div>
                    </div>
                  </div>

                  {/* Plus Sign */}
                  <div className="aturan-gold-plus">+</div>

                  {/* Right Icons */}
                  <div className="aturan-gold-right">
                    <div className="agr-row">
                      {renderWildIcon(65)}
                      {renderScatterIcon(65)}
                    </div>
                    <div className="agr-row">
                      <img src="/assets/jinji/sym_card_a.png" alt="A" />
                      <img src="/assets/jinji/sym_card_q.png" alt="Q" />
                      <img src="/assets/jinji/sym_card_k.png" alt="K" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 5: NILAI */}
            {rulesPage === 5 && (
              <div className="aturan-nilai-panel">
                <div className="aturan-info-box">
                  <div className="aturan-info-title">
                    <span className="inline-scatter-ico">{renderScatterIcon(28)}</span>
                    NILAI
                  </div>
                  <div className="aturan-info-bullet">• Dalam game utama, masing-masing <span className="inline-scatter-ico">{renderScatterIcon(22)}</span> berpeluang untuk mendapatkan bonus secara acak.</div>
                  <div className="aturan-info-bullet">• Nilai bonus <span className="inline-scatter-ico">{renderScatterIcon(22)}</span> ditentukan oleh jumlah simbol emas yang diaktifkan, silakan lihat dibawah ini.</div>
                </div>

                <div className="aturan-nilai-table-wrap">
                  <table className="aturan-nilai-table">
                    <thead>
                      <tr>
                        <th>JUMLAH BET</th>
                        <th>264,000 ⬆</th>
                        <th>96,800</th>
                        <th>88,000</th>
                        <th>17,600</th>
                        <th>9,680</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td rowSpan={5} className="col-left">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6vw', marginBottom: '0.4vh' }}>
                            {renderScatterIcon(34)}
                          </div>
                          <div>Kemungkinan nilai bonus yang muncul</div>
                        </td>
                        <td className="val-cell">8</td>
                        <td className="val-cell">8</td>
                        <td className="val-cell">8</td>
                        <td className="val-cell">8</td>
                        <td className="val-cell">8</td>
                      </tr>
                      <tr>
                        <td className="val-cell">18</td>
                        <td className="val-cell">18</td>
                        <td className="val-cell">18</td>
                        <td className="val-cell">18</td>
                        <td className="val-cell">-</td>
                      </tr>
                      <tr>
                        <td className="val-cell">38</td>
                        <td className="val-cell">38</td>
                        <td className="val-cell">38</td>
                        <td className="val-cell">-</td>
                        <td className="val-cell">-</td>
                      </tr>
                      <tr>
                        <td className="val-cell">68</td>
                        <td className="val-cell">68</td>
                        <td className="val-cell">-</td>
                        <td className="val-cell">-</td>
                        <td className="val-cell">-</td>
                      </tr>
                      <tr>
                        <td className="val-cell">88</td>
                        <td className="val-cell">-</td>
                        <td className="val-cell">-</td>
                        <td className="val-cell">-</td>
                        <td className="val-cell">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="aturan-nilai-foot">
                  Aktifkan semua simbol emas dan ada kemungkinan nilai bonus 888 akan muncul <span className="inline-scatter-ico">{renderScatterIcon(24)}</span>
                </div>
              </div>
            )}

            {/* PAGE 6: PILIH FREE GAME */}
            {rulesPage === 6 && (
              <div className="aturan-text-panel">
                <div className="aturan-page-title">PILIH FREE GAME</div>
                <div className="aturan-bullet-list">
                  <div className="aturan-bullet-item">
                    <span className="bullet-dot">•</span>
                    Di game utama saat muncul 6-14 {renderScatterIcon(28)} , Layar pemilihan FREE GAME akan diaktifkan (seperti yang ditunjukkan di bawah).
                  </div>
                  <div className="aturan-bullet-item">
                    <span className="bullet-dot">•</span>
                    Ketika muncul 15 {renderScatterIcon(28)} , akan langsung masuk ke 8 spin gratis.
                  </div>
                </div>

                <div style={{ color: '#fff8e1', fontSize: '2.1vh', fontWeight: 700, lineHeight: 1.5, margin: '0.8vh 0' }}>
                  Jumlah hadiah yang ditunjukkan {renderScatterIcon(28)} {renderGreenFuCoin(28)} {renderYellowFuCoin(28)} akan dikalikan dan dihitung setelah Spin Gratis berakhir.
                </div>

                {/* Lanterns preview mockup */}
                <div className="aturan-preview-box">
                  <div className="aturan-preview-title">Pilih 1 Free Game</div>
                  <div className="aturan-pfg-lanterns">
                    <div className="aturan-lantern">
                      <div className="alt-title">STEP<br/>BY<br/>STEP</div>
                    </div>
                    <div className="aturan-lantern">
                      <div className="alt-title">8<br/>FREE<br/>SPINS</div>
                    </div>
                  </div>
                  <div className="aturan-lantern-footer">
                    Bonus {renderScatterIcon(20)} {renderGreenFuCoin(20)} {renderYellowFuCoin(20)} akan dihitung setelah Free Game berakhir
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 7: 8 SPIN GRATIS */}
            {rulesPage === 7 && (
              <div className="aturan-text-panel">
                <div className="aturan-page-title">8 SPIN GRATIS</div>
                <div className="aturan-bullet-list">
                  <div className="aturan-bullet-item">
                    <span className="bullet-dot">•</span>
                    {renderScatterIcon(28)} , {renderWildInlineIcon(28)} , A , Q , K tidak akan muncul di Spin Gratis.
                  </div>
                  <div className="aturan-bullet-item">
                    <span className="bullet-dot">•</span>
                    Saat Anda memasuki Spin Gratis, jumlah semua hadiah {renderScatterIcon(28)} dari permainan utama akan menjadi hadiah {renderGreenFuCoin(28)} .
                  </div>
                  <div className="aturan-bullet-item">
                    <span className="bullet-dot">•</span>
                    Hadiah {renderGreenFuCoin(28)} apa pun yang muncul akan disimpan di FU XING VALUE.
                  </div>
                </div>

                {/* Mini Slot Reels Mockup representing Free Spins */}
                <div className="aturan-reels-mockup">
                  <div className="arm-header">
                    <span className="arm-jp-badge">GRAND 8,100,000,000</span>
                    <span className="arm-val-badge">FU XING VALUE 8,100,000,000</span>
                  </div>
                  <div className="arm-grid">
                    <div className="arm-cell"><img src="/assets/jinji/sym_dragon_gold.png" alt="" /></div>
                    <div className="arm-cell"><img src="/assets/jinji/sym_phoenix_gold.png" alt="" /></div>
                    <div className="arm-cell"><img src="/assets/jinji/sym_tiger_gold.png" alt="" /></div>
                    <div className="arm-cell"><img src="/assets/jinji/sym_turtle_gold.png" alt="" /></div>
                    <div className="arm-cell"><img src="/assets/jinji/sym_carp.png" alt="" /></div>

                    <div className="arm-cell"><img src="/assets/jinji/sym_phoenix_gold.png" alt="" /></div>
                    <div className="arm-cell">{renderFeatureWildIcon(32)}</div>
                    <div className="arm-cell"><img src="/assets/jinji/sym_dragon_gold.png" alt="" /></div>
                    <div className="arm-cell">{renderFeatureWildIcon(32)}</div>
                    <div className="arm-cell"><img src="/assets/jinji/sym_tiger_gold.png" alt="" /></div>

                    <div className="arm-cell"><img src="/assets/jinji/sym_turtle_gold.png" alt="" /></div>
                    <div className="arm-cell"><img src="/assets/jinji/sym_dragon_gold.png" alt="" /></div>
                    <div className="arm-cell"><img src="/assets/jinji/sym_phoenix_gold.png" alt="" /></div>
                    <div className="arm-cell"><img src="/assets/jinji/sym_carp.png" alt="" /></div>
                    <div className="arm-cell"><img src="/assets/jinji/sym_turtle_gold.png" alt="" /></div>
                  </div>
                  <div className="arm-footer">
                    <span>FREE SPIN 8/8</span>
                    <span style={{ color: '#4fc3f7' }}>WIN 319,999,829,873</span>
                    <span style={{ background: '#d32f2f', padding: '0.2vh 0.6vw', borderRadius: '0.4vh', color: '#fff' }}>STOP</span>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 8: STEP BY STEP */}
            {rulesPage === 8 && (
              <div className="aturan-text-panel">
                <div className="aturan-page-title">STEP BY STEP</div>
                <div className="aturan-bullet-list">
                  <div className="aturan-bullet-item">
                    <span className="bullet-dot">•</span>
                    Masuk ke dalam game dan dapatkan 6x Spin Gratis.
                  </div>
                  <div className="aturan-bullet-item">
                    <span className="bullet-dot">•</span>
                    Saat bermain Spin Gratis, Semua {renderScatterIcon(28)} akan disimpan di Spin Gratis.
                  </div>
                  <div className="aturan-bullet-item">
                    <span className="bullet-dot">•</span>
                    Apabila muncul {renderGreenFuCoin(28)} atau {renderYellowFuCoin(28)} selama spin gratis, maka simbol akan tetap muncul di layar, kecuali (1+ SPIN).
                  </div>
                  <div className="aturan-bullet-item">
                    <span className="bullet-dot">•</span>
                    Jumlah hadiah {renderGreenFuCoin(28)} akan ditambahkan ke jumlah total {renderScatterIcon(28)}.
                  </div>
                  <div className="aturan-bullet-item">
                    <span className="bullet-dot">•</span>
                    Jumlah hadiah {renderScatterIcon(28)} akan ditambahkan ke jumlah total {renderScatterIcon(28)} {renderGreenFuCoin(28)} {renderYellowFuCoin(28)}.
                  </div>
                  <div className="aturan-bullet-item">
                    <span className="bullet-dot">•</span>
                    Ketika semua simbol emas diaktifkan dan 15 {renderScatterIcon(28)} {renderGreenFuCoin(28)} {renderYellowFuCoin(28)} muncul, Anda akan menerima Grand Jackpot.
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 9: JACKPOT */}
            {rulesPage === 9 && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.2vh' }}>
                <div className="aturan-jp-table">
                  <div className="aturan-jp-col">
                    <span className="jp-name grand">GRAND</span>
                    <span className="jp-val">2,112,000,000</span>
                  </div>
                  <div className="aturan-jp-col">
                    <span className="jp-name major">MAJOR</span>
                    <span className="jp-val">660,000,000</span>
                  </div>
                  <div className="aturan-jp-col">
                    <span className="jp-name minor">MINOR</span>
                    <span className="jp-val">132,000,000</span>
                  </div>
                  <div className="aturan-jp-col">
                    <span className="jp-name mini">MINI</span>
                    <span className="jp-val">92,400,000</span>
                  </div>
                </div>

                <div className="aturan-text-panel compact">
                  <div className="aturan-page-title">JACKPOT</div>
                  <div className="aturan-bullet-list">
                    <div className="aturan-bullet-item">
                      <span className="bullet-dot">•</span>
                      Dapatkan {renderWildInlineIcon(28)} berpeluang masuk ke JACKPOT GAME.
                    </div>
                    <div className="aturan-bullet-item">
                      <span className="bullet-dot">•</span>
                      Ketika tiga simbol yang sama muncul dalam permainan JACKPOT GAME, hadiah Jackpot yang sesuai akan dimenangkan dan JACKPOT GAME akan berakhir.
                    </div>
                    <div className="aturan-bullet-item">
                      <span className="bullet-dot">•</span>
                      Hadiah yang didapatkan ditentukan oleh jumlah Jackpot.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 10: GRAND JACKPOT */}
            {rulesPage === 10 && (
              <div className="aturan-text-panel">
                <div className="aturan-page-title">GRAND JACKPOT</div>
                <div className="aturan-page-subtitle">
                  Aktifkan semua simbol emas dan Grand Jackpot dimenangkan dalam situasi berikut:
                </div>
                <div className="aturan-bullet-list">
                  <div className="aturan-bullet-item">
                    <span className="bullet-dot">•</span>
                    Ketika mendapatkan 15 {renderScatterIcon(28)} di game utama.
                  </div>
                  <div className="aturan-bullet-item">
                    <span className="bullet-dot">•</span>
                    Ketika mendapatkan 15 {renderScatterIcon(28)} {renderGreenFuCoin(28)} dan {renderYellowFuCoin(28)} di game STEP BY STEP.
                  </div>
                  <div className="aturan-bullet-item">
                    <span className="bullet-dot">•</span>
                    Ketika mendapatkan 3 {renderGrandIcon(32)} di JACKPOT GAME.
                  </div>
                  <div className="aturan-bullet-item">
                    <span className="bullet-dot">•</span>
                    Dalam 8 SPIN GRATIS berpeluang untuk memenangkan Grand Jackpot ketika mendapatkan {renderGreenFuCoin(28)}.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Nav: Dots & Arrows & Kembali Ke Game */}
          <div className="aturan-bottom-nav" onClick={(e) => e.stopPropagation()}>
            <div className="aturan-dots">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
                <span
                  key={p}
                  className={`dot ${rulesPage === p ? 'active' : ''}`}
                  onClick={() => setRulesPage(p)}
                />
              ))}
            </div>

            <div className="aturan-btn-row">
              <button
                className="aturan-arrow-btn"
                onClick={() => setRulesPage((p) => (p > 1 ? p - 1 : 10))}
                title="Halaman Sebelumnya"
              >
                ◀
              </button>
              <button
                className="aturan-back-btn"
                onClick={() => setShowRules(false)}
              >
                KEMBALI KE GAME
              </button>
              <button
                className="aturan-arrow-btn"
                onClick={() => setRulesPage((p) => (p < 10 ? p + 1 : 1))}
                title="Halaman Berikutnya"
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
