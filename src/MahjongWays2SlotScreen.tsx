import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import './mahjong2.css';
import GameMenuDropdown from './GameMenuDropdown';

interface Props {
  onBack: () => void;
  socket: Socket | null;
}

// Mahjong tile symbols matching real Mahjong Ways 2 appearance
// Using text chars for authentic look
const MAHJONG_TILES = [
  { id: 0, char: '胡',   sub: '',     bgColor: '#fff',   charColor: '#e53935', border: '#c8a96e', name: 'hu' },
  { id: 1, char: '發',   sub: '',     bgColor: '#fff',   charColor: '#2e7d32', border: '#c8a96e', name: 'fa' },
  { id: 2, char: '八萬', sub: '',     bgColor: '#fff',   charColor: '#1565c0', border: '#c8a96e', name: 'ba-wan' },
  { id: 3, char: '●●●', sub: '●●●', bgColor: '#fff',   charColor: '#4caf50', border: '#c8a96e', name: 'dot-green' },
  { id: 4, char: '●●●', sub: '●●',  bgColor: '#fff',   charColor: '#1976d2', border: '#c8a96e', name: 'dot-blue' },
  { id: 5, char: '||',   sub: '||||', bgColor: '#fff',   charColor: '#388e3c', border: '#c8a96e', name: 'bam' },
  { id: 6, char: '中',   sub: '',     bgColor: '#fff',   charColor: '#c62828', border: '#c8a96e', name: 'zhong' },
  { id: 7, char: '白',   sub: '',     bgColor: '#fff',   charColor: '#546e7a', border: '#c8a96e', name: 'bai' },
  { id: 8, char: '🟡',  sub: 'WILD', bgColor: '#fff8e1', charColor: '#f57f17', border: '#fbc02d', name: 'wild' },
  { id: 9, char: '⭐',  sub: 'SC',   bgColor: '#fff3e0', charColor: '#e65100', border: '#ff7043', name: 'scatter' },
];

// Authentic mahjong tile rendering using CSS art
const TILE_CONTENT: Record<number, { top: string; mid: string; bot: string; color: string; goldable: boolean }> = {
  0: { top: '胡', mid: '',   bot: '',    color: '#e53935', goldable: true  }, // HU - red (highest)
  1: { top: '發', mid: '',   bot: '',    color: '#2e7d32', goldable: true  }, // FA - green
  2: { top: '八', mid: '萬', bot: '',    color: '#1565c0', goldable: true  }, // 8 Wan
  3: { top: '⊕⊕⊕', mid: '⊕⊕⊕', bot: '⊕', color: '#43a047', goldable: false }, // Dots green
  4: { top: '⊕⊕', mid: '⊕⊕', bot: '⊕', color: '#1976d2', goldable: false }, // Dots blue
  5: { top: '≡', mid: '≡',  bot: '≡',  color: '#388e3c', goldable: false }, // Bamboo
  6: { top: '中', mid: '',   bot: '',    color: '#c62828', goldable: true  }, // Zhong
  7: { top: '白', mid: '',   bot: '',    color: '#607d8b', goldable: true  }, // Bai
  8: { top: '💰', mid: 'WILD', bot: '', color: '#f57f17', goldable: false }, // Wild Ingot
  9: { top: '✦',  mid: 'SC', bot: '',   color: '#e65100', goldable: false }, // Scatter
};

export default function MahjongWays2SlotScreen({ onBack, socket }: Props) {
  const [grid, setGrid] = useState<number[][]>(() => Array(4).fill(null).map(() => [1, 2, 0, 3, 1]));
  const [goldGrid, setGoldGrid] = useState<boolean[][]>(() => [
    [false, false, true, true, false],
    [false, false, false, false, false],
    [false, false, false, false, false],
    [false, false, false, false, false],
  ]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningCols, setSpinningCols] = useState<boolean[]>([false, false, false, false, false]);
  const [betAmount, setBetAmount] = useState(100000);
  const [myCoins, setMyCoins] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [multiplierIdx, setMultiplierIdx] = useState(0);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [autoSpins, setAutoSpins] = useState(0);
  const [spinSpeed, setSpinSpeed] = useState(1);
  const [showRules, setShowRules] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [explodingCells, setExplodingCells] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('GOOD LUCK');

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
  }, []);

  // Rapid reel shuffle
  useEffect(() => {
    let interval: any = null;
    if (isSpinning) {
      interval = setInterval(() => {
        setGrid(prev => prev.map(row =>
          row.map((cell, c) => spinningCols[c] ? Math.floor(Math.random() * 8) : cell)
        ));
      }, 70 / spinSpeedRef.current);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isSpinning, spinningCols]);

  useEffect(() => {
    if (!socket) return;
    const handleResult = async (data: any) => {
      const spd = spinSpeedRef.current;
      let stopTime = 200 / spd;
      const delayPerCol = 250 / spd;
      for (let c = 0; c < 5; c++) {
        const col = c;
        setTimeout(() => {
          setSpinningCols(prev => { const n = [...prev]; n[col] = false; return n; });
          setGrid(prev => prev.map((row, r) => row.map((cell, ci) => ci === col ? data.initialGrid[r][col] : cell)));
          setGoldGrid(prev => prev.map((row, r) => row.map((cell, ci) => ci === col ? (data.initialGoldGrid?.[r]?.[col] ?? false) : cell)));
        }, stopTime);
        stopTime += delayPerCol;
      }
      setTimeout(async () => {
        if (data.gridHistory?.length > 1) {
          for (let i = 1; i < data.gridHistory.length; i++) {
            const step = data.gridHistory[i];
            setMultiplierIdx(Math.min(i, 3));
            if (step.winPositions) {
              setExplodingCells(step.winPositions);
              await new Promise(r => setTimeout(r, 400 / spd));
            }
            setGrid(step.grid);
            if (step.goldGrid) setGoldGrid(step.goldGrid);
            setExplodingCells([]);
            await new Promise(r => setTimeout(r, 600 / spd));
          }
        }
        setIsSpinning(false);
        setMyCoins(data.newBalance);
        localStorage.setItem('domino_coins', data.newBalance.toString());
        setTotalWin(data.totalWinAmount);
        setStatusText(data.totalWinAmount > 0 ? `MENANG: ${data.totalWinAmount.toLocaleString('id-ID')}` : 'GOOD LUCK');
        if (data.triggerFreeSpins) setFreeSpinsLeft(p => p + data.freeSpinsAwarded);
        if (autoSpinsRef.current > 1 || freeSpinsLeftRef.current > 0) {
          if (autoSpinsRef.current > 1) setAutoSpins(a => a - 1);
          if (freeSpinsLeftRef.current > 0) setFreeSpinsLeft(f => f - 1);
          setTimeout(() => doSpinRef.current?.(), 1000 / spd);
        } else if (autoSpinsRef.current === 1) setAutoSpins(0);
      }, stopTime + 100);
    };
    const handleError = (data: any) => {
      setIsSpinning(false);
      setSpinningCols([false, false, false, false, false]);
      setAutoSpins(0);
    };
    socket.on('mahjong_result', handleResult);
    socket.on('mahjong_error', handleError);
    return () => { socket.off('mahjong_result', handleResult); socket.off('mahjong_error', handleError); };
  }, [socket]);

  const doSpin = () => {
    if (isSpinning || !socket) return;
    setIsSpinning(true);
    setSpinningCols([true, true, true, true, true]);
    setTotalWin(0);
    setMultiplierIdx(0);
    setExplodingCells([]);
    setStatusText('...');
    socket.emit('spin_mahjong', { username, betAmount, isFreeSpins: freeSpinsLeftRef.current > 0, clientBalance: myCoins });
  };
  doSpinRef.current = doSpin;

  const multipliers = freeSpinsLeft > 0 ? ['x2', 'x4', 'x6', 'x10'] : ['x1', 'x2', 'x3', 'x5'];

  const renderTile = (symId: number, isGold: boolean, isExploding: boolean) => {
    const tc = TILE_CONTENT[symId] ?? TILE_CONTENT[1];
    return (
      <div className={`mj-tile ${isGold ? 'mj-tile-gold' : ''} ${isExploding ? 'mj-tile-explode' : ''}`}>
        <div className="mj-tile-inner">
          {symId === 8 ? (
            // Wild ingot special render
            <div className="mj-tile-wild">
              <div className="mj-wild-top">WILD</div>
              <div className="mj-wild-ingot">💰</div>
            </div>
          ) : symId === 9 ? (
            // Scatter
            <div className="mj-tile-scatter">
              <div className="mj-scatter-star">✦✦✦</div>
              <div className="mj-scatter-text">SCATTER</div>
            </div>
          ) : symId === 3 || symId === 4 ? (
            // Dot tiles - authentic dot pattern
            <div className="mj-tile-dots" style={{ color: tc.color }}>
              <div className="mj-dots-row">{symId === 3 ? '● ● ●' : '● ●'}</div>
              <div className="mj-dots-row">{symId === 3 ? '● ● ●' : '● ●'}</div>
              <div className="mj-dots-row">{symId === 3 ? '●' : '●'}</div>
            </div>
          ) : symId === 5 ? (
            // Bamboo tile
            <div className="mj-tile-bam" style={{ color: tc.color }}>
              <div className="mj-bam-row">≡ ≡</div>
              <div className="mj-bam-row">≡ ≡</div>
              <div className="mj-bam-row">≡ ≡</div>
            </div>
          ) : symId === 2 ? (
            // 八萬 - stacked chars
            <div className="mj-tile-char2" style={{ color: tc.color }}>
              <div className="mj-char-top">八</div>
              <div className="mj-char-bot">萬</div>
            </div>
          ) : (
            // Single kanji char
            <div className="mj-tile-char1" style={{ color: tc.color }}>{tc.top}</div>
          )}
        </div>
        {isGold && <div className="mj-gold-shine" />}
      </div>
    );
  };

  return (
    <div className="mj-screen">
      {/* BACKGROUND - Teal with scale pattern & clouds */}
      <div className="mj-bg">
        <div className="mj-bg-left-dragon" />
        <div className="mj-bg-right-dragon" />
        <div className="mj-bg-glow" />
        <div className="mj-cloud mj-cloud-1" />
        <div className="mj-cloud mj-cloud-2" />
        <div className="mj-cloud mj-cloud-3" />
      </div>

      {/* TOP-LEFT: Avatar + Coins */}
      <div className="mj-topleft">
        <div className="mj-avatar-wrap">
          <img className="mj-avatar-img" src="https://i.pravatar.cc/100?img=11" alt="avatar" />
          <div className="mj-vip-badge">VIP 9</div>
          <div className="mj-bar-icon">📊</div>
        </div>
        <div className="mj-coins-wrap">
          <span className="mj-coin-icon">🪙</span>
          <span className="mj-coins-num">{myCoins.toLocaleString('id-ID')}</span>
          <button className="mj-plus-btn" onClick={() => alert('Top Up')}>+</button>
        </div>
      </div>

      {/* TOP-RIGHT: Ganti Room + Menu */}
      <div className="mj-topright" style={{ position: 'relative' }}>
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
            { id: 'tabel', icon: '📜', label: 'Tabel Bayaran', onClick: () => { setShowMenu(false); alert('Mahjong Ways 2: 2000 Cara Menang!'); } },
            { id: 'speed', icon: '⚡', label: 'Putaran Cepat', badge: spinSpeed > 1 ? 'ON' : 'OFF', onClick: () => setSpinSpeed(s => s === 1 ? 2 : 1) },
            { id: 'suara', icon: '🔊', label: 'Suara', badge: soundOn ? 'ON' : 'OFF', onClick: () => setSoundOn(v => !v) },
            { id: 'musik', icon: '🎵', label: 'Musik', badge: musicOn ? 'ON' : 'OFF', onClick: () => setMusicOn(v => !v) },
            { id: 'bantuan', icon: '❓', label: 'Bantuan', onClick: () => { setShowMenu(false); alert('Kombinasi simbol mahjong emas bertransformasi jadi Wild beruntun!'); } }
          ]}
        />
      </div>

      {/* MULTIPLIER BAR - top center */}
      <div className="mj-mult-bar">
        {multipliers.map((m, idx) => (
          <div key={m} className={`mj-mult-step ${idx === multiplierIdx ? 'mj-mult-active' : ''}`}>
            {m}
          </div>
        ))}
      </div>

      {/* SIDE LEFT: Bell Spin & Ransel */}
      <div className="mj-side-left">
        <div className="mj-side-bell" onClick={() => alert('Bell Spin Gratis')}>
          <div className="mj-bell-char">胡</div>
          <div className="mj-bell-label">BELL SPIN<br/>GRATIS</div>
        </div>
        <div className="mj-side-ransel" onClick={() => alert('Ransel')}>
          <div className="mj-ransel-img">🛍️</div>
          <div className="mj-ransel-label">RANSEL</div>
        </div>
      </div>

      {/* SIDE RIGHT: arrow & 2000 CARA label */}
      <div className="mj-side-right">
        <button className="mj-arrow-right" onClick={() => alert('Menu kanan')}>❯</button>
      </div>

      {/* MAIN REEL AREA */}
      <div className="mj-main">
        {/* Free Spins Banner */}
        {freeSpinsLeft > 0 && (
          <div className="mj-freespin-banner">ALAM PUTARAN GRATIS!</div>
        )}

        <div className="mj-machine-wrap">
          {/* Left pillar: 2000 CARA */}
          <div className="mj-pillar mj-pillar-left">
            <div className="mj-pillar-text">2000 CARA</div>
          </div>

          {/* Reel grid */}
          <div className="mj-reel-frame">
            <div className="mj-reel-inner">
              {[0,1,2,3,4].map(c => (
                <div key={c} className={`mj-col ${spinningCols[c] ? 'mj-col-spin' : ''}`}>
                  {[0,1,2,3].map(r => {
                    const symId = grid[r]?.[c] ?? 1;
                    const isGold = goldGrid[r]?.[c] ?? false;
                    const cellKey = `${r}-${c}`;
                    const isExp = explodingCells.includes(cellKey);
                    return (
                      <div key={cellKey} className="mj-cell">
                        {renderTile(symId, isGold, isExp)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Right pillar: 2000 CARA */}
          <div className="mj-pillar mj-pillar-right">
            <div className="mj-pillar-text">2000 CARA</div>
          </div>
        </div>

        {/* Bottom of reel: banner */}
        {freeSpinsLeft === 0 && (
          <div className="mj-reel-bottom-bar">ALAM PUTARAN GRATIS!</div>
        )}
      </div>

      {/* BOTTOM BAR */}
      <div className="mj-bottom-bar">
        {/* Left: Chat, Info, Bet- Bet Display Bet+ */}
        <div className="mj-bot-left">
          <button className="mj-bot-sq-btn" onClick={() => alert('Chat')}>💬</button>
          <button className="mj-bot-sq-btn" onClick={() => setShowRules(true)}>i</button>
          <button className="mj-bot-sq-btn mj-minus" onClick={() => setBetAmount(b => Math.max(10000, b - 10000))}>−</button>
          <div className="mj-bet-display">
            <div className="mj-bet-label">BET</div>
            <div className="mj-bet-val">{betAmount.toLocaleString('id-ID')}</div>
          </div>
          <button className="mj-bot-sq-btn mj-plus" onClick={() => setBetAmount(b => Math.min(10000000, b + 50000))}>+</button>
        </div>

        {/* Center: Status pill */}
        <div className="mj-bot-center">
          <div className="mj-status-pill">
            {totalWin > 0
              ? totalWin.toLocaleString('id-ID')
              : statusText === '...' ? statusText : 'GOOD LUCK'}
          </div>
        </div>

        {/* Right: Max Bet, Speed, Spin */}
        <div className="mj-bot-right">
          <button className="mj-maxbet-btn" onClick={() => setBetAmount(10000000)}>MAX<br/>BET</button>
          <button className="mj-speed-btn" onClick={() => setSpinSpeed(s => s === 1 ? 2 : s === 2 ? 3 : 1)}>
            x{spinSpeed}
          </button>
          <div style={{ position: 'relative' }}>
            {showAutoMenu && (
              <div className="mj-auto-menu">
                {[10, 50, 100].map(n => (
                  <button key={n} onClick={() => { setAutoSpins(n); setShowAutoMenu(false); doSpin(); }}>{n}</button>
                ))}
                <button onClick={() => { setAutoSpins(99999); setShowAutoMenu(false); doSpin(); }}>∞</button>
              </div>
            )}
            <button
              className={`mj-spin-btn ${isSpinning ? 'mj-spin-anim' : ''}`}
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
              <span className="mj-spin-text">
                {autoSpins > 0 ? (autoSpins > 90000 ? 'AUTO ∞' : `AUTO ${autoSpins}`) : 'SPIN'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* RULES MODAL */}
      {showRules && (
        <div className="mj-modal-overlay" onClick={() => setShowRules(false)}>
          <div className="mj-modal" onClick={e => e.stopPropagation()}>
            <button className="mj-modal-close" onClick={() => setShowRules(false)}>✖</button>
            <h2>ATURAN - MAHJONG WAYS 2</h2>
            <div className="mj-paytable">
              <div className="mj-pt-row"><span>胡 Hu (Merah)</span><span>5=500x 4=100x 3=30x</span></div>
              <div className="mj-pt-row"><span>發 Fa (Hijau)</span><span>5=300x 4=80x 3=25x</span></div>
              <div className="mj-pt-row"><span>八萬 8-Wan</span><span>5=200x 4=60x 3=20x</span></div>
              <div className="mj-pt-row"><span>中 Zhong</span><span>5=100x 4=30x 3=10x</span></div>
              <div className="mj-pt-row"><span>Dot / Bam</span><span>5=80x 4=25x 3=8x</span></div>
              <div className="mj-pt-row"><span>💰 WILD Ingot</span><span>Gantikan semua simbol</span></div>
              <div className="mj-pt-row"><span>✦ SCATTER</span><span>3+ = 10 Free Spins!</span></div>
            </div>
            <p style={{color:'#ffe082', fontSize:'1.6vh', marginTop:'1vh'}}>Ubin emas yang menang berubah menjadi WILD pada tumble berikutnya. Pengali naik x1→x2→x3→x5 setiap tumble!</p>
          </div>
        </div>
      )}
    </div>
  );
}
