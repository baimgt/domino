import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import './candyrush.css';
import GameMenuDropdown from './GameMenuDropdown';

interface Props {
  onBack: () => void;
  socket: Socket | null;
}

const ROWS = 5, COLS = 6;

export default function CandyRushSlotScreen({ onBack, socket }: Props) {
  const [grid, setGrid] = useState<number[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null).map(() => Math.floor(Math.random() * 9)))
  );
  const [multGrid, setMultGrid] = useState<number[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(0))
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningCols, setSpinningCols] = useState<boolean[]>(Array(COLS).fill(false));
  const [betAmount, setBetAmount] = useState(100000);
  const [myCoins, setMyCoins] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [autoSpins, setAutoSpins] = useState(0);
  const [spinSpeed, setSpinSpeed] = useState(1);
  const [anteMode, setAnteMode] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [rulesPage, setRulesPage] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [explodingCells, setExplodingCells] = useState<string[]>([]);
  const [winningCells, setWinningCells] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('GOOD LUCK');
  const [rainbowActive, setRainbowActive] = useState(false);

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
        if (data.tumbleSteps?.length > 0) {
          for (const step of data.tumbleSteps) {
            if (step.winPositions?.length > 0) {
              setWinningCells(step.winPositions);
              setRainbowActive(true);
              await new Promise(r => setTimeout(r, 500 / spd));
              setExplodingCells(step.winPositions);
              await new Promise(r => setTimeout(r, 400 / spd));
            }
            setGrid(step.newGrid);
            setMultGrid(step.newMultGrid || Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
            setWinningCells([]);
            setExplodingCells([]);
            setRainbowActive(false);
            await new Promise(r => setTimeout(r, 350 / spd));
          }
        }
        setIsSpinning(false);
        setSpinningCols(Array(COLS).fill(false));
        setMyCoins(data.newBalance);
        localStorage.setItem('domino_coins', data.newBalance.toString());
        setTotalWin(data.totalWinAmount || 0);
        setStatusText(data.totalWinAmount > 0 ? `MENANG: ${Math.floor(data.totalWinAmount).toLocaleString('id-ID')}` : 'GOOD LUCK');
        if (data.triggerFreeSpins) setFreeSpinsLeft(p => p + data.freeSpinsAwarded);
        if (autoSpinsRef.current > 1 || freeSpinsLeftRef.current > 0) {
          if (autoSpinsRef.current > 1) setAutoSpins(a => a - 1);
          if (freeSpinsLeftRef.current > 0) setFreeSpinsLeft(f => f - 1);
          setTimeout(() => doSpinRef.current?.(), 1000 / spd);
        } else if (autoSpinsRef.current === 1) setAutoSpins(0);
      }, stopTime + 150);
    };

    const handleError = () => {
      setIsSpinning(false);
      setSpinningCols(Array(COLS).fill(false));
      setAutoSpins(0);
      setStatusText('GOOD LUCK');
    };

    socket.on('candy_result', handleResult);
    socket.on('candy_error', handleError);
    return () => { socket.off('candy_result', handleResult); socket.off('candy_error', handleError); };
  }, [socket]);

  const doSpin = () => {
    if (isSpinning || !socket) return;
    setIsSpinning(true);
    setSpinningCols(Array(COLS).fill(true));
    setTotalWin(0);
    setExplodingCells([]);
    setWinningCells([]);
    setStatusText('...');
    socket.emit('spin_candy', { username, betAmount: anteMode ? Math.round(betAmount * 1.25) : betAmount, isFreeSpins: freeSpinsLeftRef.current > 0, anteMode, clientBalance: myCoins });
  };
  doSpinRef.current = doSpin;

  // CSS-art candy tile renderer
  const renderCandy = (symId: number, multVal: number, isWin: boolean, isExp: boolean) => {
    const winCls = isWin ? 'cr-tile-win' : '';
    const expCls = isExp ? 'cr-tile-explode' : '';

    // BOMB MULTIPLIER
    if (symId === 10) {
      const bombColors: Record<number, [string, string]> = {
        2: ['#ff80ab','#c2185b'], 3: ['#ff80ab','#c2185b'],
        5: ['#80d8ff','#0277bd'], 8: ['#80d8ff','#0277bd'],
        10:['#b9f6ca','#1b5e20'], 15:['#b9f6ca','#1b5e20'],
        25:['#ffe57f','#f57f17'], 50:['#ffe57f','#f57f17'],
        100:['#ea80fc','#6a1b9a'],500:['#ea80fc','#6a1b9a'],
      };
      const [c1, c2] = bombColors[multVal] ?? ['#ffe57f','#f57f17'];
      return (
        <div className={`cr-tile ${winCls} ${expCls}`} style={{background:'none',border:'none',boxShadow:'none'}}>
          <div className="cr-bomb" style={{background:`radial-gradient(circle at 30% 25%, #fff 0%, ${c1} 40%, ${c2} 85%)`}}>
            <div className="cr-bomb-shine"/>
            <div className="cr-bomb-fuse"/>
            <span className="cr-bomb-val">{multVal > 0 ? `${multVal}x` : '?x'}</span>
          </div>
        </div>
      );
    }

    // SCATTER - candy bag / gift
    if (symId === 9) {
      return (
        <div className={`cr-tile cr-sym-scatter ${winCls} ${expCls}`}>
          <div className="cr-scatter-body">
            <div className="cr-bag-top"/>
            <div className="cr-bag-ribbon"/>
            <div className="cr-bag-body">
              <div className="cr-bag-star">✦</div>
            </div>
            <div className="cr-scatter-lbl">SCATTER</div>
          </div>
        </div>
      );
    }

    // LOLLIPOP (0) - highest
    if (symId === 0) {
      return (
        <div className={`cr-tile cr-sym-lollipop ${winCls} ${expCls}`}>
          <div className="cr-lolly-stick"/>
          <div className="cr-lolly-head">
            <div className="cr-lolly-swirl cr-swirl-1"/>
            <div className="cr-lolly-swirl cr-swirl-2"/>
            <div className="cr-lolly-shine"/>
          </div>
        </div>
      );
    }

    // CANDY CANE (1)
    if (symId === 1) {
      return (
        <div className={`cr-tile cr-sym-cane ${winCls} ${expCls}`}>
          <div className="cr-cane-body">
            <div className="cr-cane-stripe cr-cs-1"/>
            <div className="cr-cane-stripe cr-cs-2"/>
            <div className="cr-cane-stripe cr-cs-3"/>
          </div>
        </div>
      );
    }

    // GUMMY BEAR (2)
    if (symId === 2) {
      return (
        <div className={`cr-tile cr-sym-gummy ${winCls} ${expCls}`}>
          <div className="cr-gummy-body">
            <div className="cr-gummy-ears">
              <div className="cr-gummy-ear"/>
              <div className="cr-gummy-ear"/>
            </div>
            <div className="cr-gummy-head">
              <div className="cr-gummy-eyes">
                <div className="cr-gummy-eye"/>
                <div className="cr-gummy-eye"/>
              </div>
              <div className="cr-gummy-nose"/>
              <div className="cr-gummy-mouth"/>
            </div>
            <div className="cr-gummy-shine"/>
          </div>
        </div>
      );
    }

    // ROUND CANDIES (3-8) - colored spheres with wrapper
    const CANDY_CFG: Record<number, { c1: string; c2: string; c3: string; wrap: string }> = {
      3: { c1:'#fff9c4', c2:'#ffca28', c3:'#f57f17', wrap:'#ff8f00' }, // gold
      4: { c1:'#fce4ec', c2:'#f48fb1', c3:'#c2185b', wrap:'#ad1457' }, // pink heart
      5: { c1:'#e8f5e9', c2:'#66bb6a', c3:'#1b5e20', wrap:'#2e7d32' }, // green
      6: { c1:'#e3f2fd', c2:'#42a5f5', c3:'#0d47a1', wrap:'#1565c0' }, // blue
      7: { c1:'#f3e5f5', c2:'#ba68c8', c3:'#4a148c', wrap:'#7b1fa2' }, // purple
      8: { c1:'#ffebee', c2:'#ef5350', c3:'#b71c1c', wrap:'#c62828' }, // red
    };
    const cc = CANDY_CFG[symId] ?? CANDY_CFG[8];

    return (
      <div className={`cr-tile cr-sym-candy ${winCls} ${expCls}`}>
        <div className="cr-candy-wrap" style={{borderColor: cc.wrap}}>
          <div className="cr-candy-sphere"
               style={{background:`radial-gradient(circle at 30% 28%, ${cc.c1} 0%, ${cc.c2} 50%, ${cc.c3} 100%)`}}>
            <div className="cr-candy-hi"/>
            <div className="cr-candy-lo" style={{background:`radial-gradient(circle at 70% 72%, ${cc.c3}88 0%, transparent 55%)`}}/>
            {/* Wrap lines */}
            <div className="cr-wrap-line cr-wl-1" style={{borderColor: cc.wrap+'66'}}/>
            <div className="cr-wrap-line cr-wl-2" style={{borderColor: cc.wrap+'66'}}/>
          </div>
        </div>
      </div>
    );
  };

  const effectiveBet = anteMode ? Math.round(betAmount * 1.25) : betAmount;

  return (
    <div className={`cr-screen ${rainbowActive ? 'cr-rainbow-active' : ''}`}>
      {/* CANDY LAND BACKGROUND */}
      <div className="cr-bg">
        <div className="cr-bg-sky"/>
        <div className="cr-bg-clouds"/>
        <div className="cr-bg-candyland"/>
        {/* Floating candy decorations */}
        <div className="cr-deco cr-deco-1">🍭</div>
        <div className="cr-deco cr-deco-2">🍬</div>
        <div className="cr-deco cr-deco-3">🍭</div>
        <div className="cr-deco cr-deco-4">🍬</div>
      </div>

      {/* TOP LEFT */}
      <div className="cr-topleft">
        <div className="cr-avatar-wrap">
          <img className="cr-avatar-img" src="https://i.pravatar.cc/100?img=11" alt="avatar"/>
          <div className="cr-vip-badge">VIP 1</div>
        </div>
        <div className="cr-coins-row">
          <span className="cr-coin-ico">🍬</span>
          <span className="cr-coins-num">{myCoins.toLocaleString('id-ID')}</span>
          <button className="cr-plus-btn" onClick={() => alert('Top Up')}>+</button>
        </div>
      </div>

      {/* TOP INFO */}
      <div className="cr-top-info">🍭 Simbol di mana saja di layar akan terbayar 🍭</div>

      {/* TOP RIGHT */}
      <div className="cr-topright" style={{ position: 'relative' }}>
        <button className="cr-tr-btn" onClick={() => alert('Trophy')}>🏆</button>
        <button className="cr-tr-btn cr-tr-room" onClick={onBack}>
          <span>🔄</span><span className="cr-tr-label">Ganti<br/>room</span>
        </button>
        <button className="cr-tr-btn" onClick={() => setShowMenu(v => !v)}>≡</button>

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
      <div className="cr-main-area">
        {/* LEFT PANEL */}
        <div className="cr-left-panel">
          <div className="cr-buy-spin" onClick={() => alert('Beli Free Spin: ' + (betAmount * 100).toLocaleString('id-ID'))}>
            <div className="cr-bs-icon">🍭</div>
            <div className="cr-bs-title">BELI<br/>SPIN<br/>GRATIS</div>
            <div className="cr-bs-amount">{Math.floor(betAmount * 100 / 1000000) > 0 ? Math.floor(betAmount * 100 / 1000000) + 'M' : (betAmount * 100 / 1000).toFixed(0) + 'K'}</div>
          </div>

          <div className="cr-ransel" onClick={() => alert('Ransel')}>
            <span>🎒</span>
            <span className="cr-ransel-lbl">RANSEL</span>
          </div>

          <div className="cr-ante-panel">
            <div className="cr-ante-title">TARUHAN</div>
            <div className="cr-ante-amt">{Math.floor(effectiveBet / 1000)}K</div>
            <div className="cr-ante-sub">FITUR GANDA</div>
            <div className="cr-ante-sub2">PELUANG MENANG</div>
            <div className={`cr-toggle ${anteMode ? 'on' : 'off'}`} onClick={() => setAnteMode(v => !v)}>
              <div className="cr-toggle-knob"/>
              <span>{anteMode ? 'ON' : 'OFF'}</span>
            </div>
          </div>

          {/* Candy decorations left */}
          <div className="cr-candy-deco-left">🍭</div>
        </div>

        {/* GRID */}
        <div className="cr-grid-wrap">
          {freeSpinsLeft > 0 && (
            <div className="cr-fs-banner">🍬 FREE SPIN: {freeSpinsLeft} 🍬</div>
          )}
          <div className="cr-grid-frame">
            <div className="cr-grid-inner">
              {Array.from({length: ROWS}, (_, r) =>
                Array.from({length: COLS}, (_, c) => {
                  const symId = grid[r]?.[c] ?? 4;
                  const multVal = multGrid[r]?.[c] ?? 0;
                  const cellKey = `${r}-${c}`;
                  return (
                    <div key={cellKey} className={`cr-cell ${spinningCols[c] ? 'cr-cell-spin' : ''}`}>
                      {renderCandy(symId, multVal, winningCells.includes(cellKey), explodingCells.includes(cellKey))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="cr-right-panel">
          {/* Big candy decoration */}
          <div className="cr-right-deco">
            <div className="cr-big-lolly">
              <div className="cr-bl-head"/>
              <div className="cr-bl-stick"/>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="cr-bottom-bar">
        <div className="cr-bot-left">
          <button className="cr-bot-btn" onClick={() => alert('Chat')}>💬</button>
          <button className="cr-bot-btn" onClick={() => { setShowRules(true); setRulesPage(0); }}>i</button>
          <button className="cr-bot-btn cr-minus" onClick={() => setBetAmount(b => Math.max(25000, b - 25000))}>−</button>
          <div className="cr-bet-box">
            <div className="cr-bet-label">BET</div>
            <div className="cr-bet-val">{betAmount.toLocaleString('id-ID')}</div>
          </div>
          <button className="cr-bot-btn cr-plus-bet" onClick={() => setBetAmount(b => Math.min(10000000, b + 25000))}>+</button>
        </div>

        <div className="cr-bot-center">
          <div className="cr-status-pill">
            {totalWin > 0 ? Math.floor(totalWin).toLocaleString('id-ID') : statusText}
          </div>
        </div>

        <div className="cr-bot-right">
          <button className="cr-maxbet-btn" onClick={() => setBetAmount(10000000)}>MAX<br/>BET</button>
          <button className="cr-speed-btn" onClick={() => setSpinSpeed(s => s === 1 ? 2 : s === 2 ? 3 : 1)}>
            X{spinSpeed}
          </button>
          <div style={{position:'relative'}}>
            {showAutoMenu && (
              <div className="cr-auto-menu">
                {[10, 50, 100].map(n => (
                  <button key={n} onClick={() => { setAutoSpins(n); setShowAutoMenu(false); doSpin(); }}>{n}</button>
                ))}
                <button onClick={() => { setAutoSpins(99999); setShowAutoMenu(false); doSpin(); }}>∞</button>
              </div>
            )}
            <button
              className={`cr-spin-btn ${isSpinning ? 'cr-spin-anim' : ''}`}
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
              <span className="cr-spin-text">
                {autoSpins > 0 ? (autoSpins > 90000 ? 'AUTO ∞' : `AUTO ${autoSpins}`) : 'SPIN'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* RULES MODAL */}
      {showRules && (
        <div className="cr-modal-overlay" onClick={() => setShowRules(false)}>
          <div className="cr-modal" onClick={e => e.stopPropagation()}>
            {rulesPage === 0 && (
              <div className="cr-rules-page">
                <h2>🍭 PAYTABLE - CANDY RUSH 🍭</h2>
                <p className="cr-rules-desc">Simbol di mana saja di layar akan terbayar. Total simbol yang sama menentukan kemenangan.</p>
                <div className="cr-paytable">
                  {[
                    {name:'🍭 Lollipop',   pays:'12+=5M | 8-11=1M | 5-7=100K'},
                    {name:'🍬 Candy Cane', pays:'12+=2.5M | 8-11=500K | 5-7=75K'},
                    {name:'🐻 Gummy Bear', pays:'12+=1.5M | 8-11=300K | 5-7=50K'},
                    {name:'⭐ Gold Candy', pays:'12+=1M | 8-11=200K | 5-7=30K'},
                    {name:'💗 Pink Candy', pays:'12+=800K | 8-11=150K | 5-7=25K'},
                    {name:'💚 Green Candy',pays:'12+=500K | 8-11=100K | 5-7=20K'},
                    {name:'💙 Blue Candy', pays:'12+=300K | 8-11=80K | 5-7=15K'},
                    {name:'💜 Purple Candy',pays:'12+=200K | 8-11=60K | 5-7=12K'},
                    {name:'❤️ Red Candy',  pays:'12+=100K | 8-11=40K | 5-7=8K'},
                    {name:'🎁 SCATTER',    pays:'4=300K | 5=500K | 6+=10M'},
                  ].map((row, i) => (
                    <div key={i} className="cr-pt-row">
                      <span className="cr-pt-name">{row.name}</span>
                      <span className="cr-pt-pays">{row.pays}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {rulesPage === 1 && (
              <div className="cr-rules-page">
                <h2>🍬 FITUR TUMBLE 🍬</h2>
                <p>Setelah setiap spin, kombinasi yang menang di bayar dan semua simbol yang menang menghilang. Simbol baru jatuh dari atas untuk mengisi posisi kosong. Tumble berlanjut hingga tidak ada kombinasi menang lagi.</p>
                <div className="cr-mult-demo">
                  {['#ff80ab','#80d8ff','#b9f6ca','#ea80fc'].map((c, i) => (
                    <div key={i} className="cr-mult-demo-orb" style={{background:`radial-gradient(circle at 30% 28%, #fff 0%, ${c} 50%, ${c}88 100%)`}}>
                      <span>{[2,5,10,25][i]}x</span>
                    </div>
                  ))}
                </div>
                <p>Simbol BOM adalah simbol multiplier. Muncul secara acak dan membawa nilai 2x hingga 500x. Semua nilai BOM dijumlahkan dan mengalikan total kemenangan putaran tersebut!</p>
              </div>
            )}
            {rulesPage === 2 && (
              <div className="cr-rules-page">
                <h2>🎁 ATURAN FREE SPIN 🎁</h2>
                <p>4 atau lebih simbol SCATTER (🎁) di mana saja = 15 Free Spin! Selama Free Spin, nilai BOM terakumulasi dan mengalikan semua kemenangan sepanjang ronde.</p>
                <p>Mendapat 3+ SCATTER tambahan saat Free Spin = +5 Free Spin lagi!</p>
                <p>Kemenangan maksimal 5000x taruhan per ronde Free Spin.</p>
              </div>
            )}
            {rulesPage === 3 && (
              <div className="cr-rules-page">
                <h2>🍭 TARUHAN ANTE 🍭</h2>
                <p>Aktifkan Fitur Ganda untuk meningkatkan peluang mendapat SCATTER secara alami. Taruhan naik 25% dengan lebih banyak simbol SCATTER di gulungan.</p>
                <h2 style={{marginTop:'2vh'}}>🛒 BUY FREE SPIN</h2>
                <p>Beli langsung 15 Free Spin dengan membayar 100x total taruhan saat ini. Tidak tersedia saat Fitur Ganda aktif.</p>
              </div>
            )}
            <div className="cr-rules-nav">
              <button className="cr-nav-arrow" onClick={() => setRulesPage(p => Math.max(0, p-1))}>❮</button>
              <button className="cr-nav-back" onClick={() => setShowRules(false)}>KEMBALI KE GAME</button>
              <button className="cr-nav-arrow" onClick={() => setRulesPage(p => Math.min(3, p+1))}>❯</button>
            </div>
            <div className="cr-rules-dots">
              {[0,1,2,3].map(i => (
                <div key={i} className={`cr-dot ${i === rulesPage ? 'active' : ''}`} onClick={() => setRulesPage(i)}/>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
