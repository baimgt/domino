import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import './candyrush.css';
import './gatokaca.css';
import GameMenuDropdown from './GameMenuDropdown';
import SlotMultiplierBar from './SlotMultiplierBar';
import SlotCelebrationModal, { SlotCelebrationData } from './SlotCelebrationModal';
import SlotProfileModal, { renderSlotAvatar } from './SlotProfileModal';
import { useSlotProfile } from './useSlotProfile';
import { MIN_SLOT_BET, MAX_SLOT_BET, stepSlotBet, getSlotCoins, spendSlotCoinsLocal, applySlotResultBalance, syncSlotBetToBackend } from './slotConfig';
import { API_URL } from './config';
import SlotSpeedButton from './SlotSpeedButton';

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
  const userProfile = useSlotProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [betAmount, setBetAmount] = useState(MIN_SLOT_BET);
  const [myCoins, setMyCoins] = useState<number>(() => {
    const slotCoins = getSlotCoins();
    return slotCoins.total > 0 ? slotCoins.total : 100000;
  });
  const [totalWin, setTotalWin] = useState(0);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [freeSpinTotalWin, setFreeSpinTotalWin] = useState(0);
  const freeSpinTotalWinRef = useRef(0);
  useEffect(() => { freeSpinTotalWinRef.current = freeSpinTotalWin; }, [freeSpinTotalWin]);
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
  const [droppingCells, setDroppingCells] = useState<Record<string, number>>({});
  const [winningCells, setWinningCells] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('GOOD LUCK');
  const [rainbowActive, setRainbowActive] = useState(false);
  const [multIdx, setMultIdx] = useState(0);        // tangga x1>x2>x3>x5
  const [freeMultVal, setFreeMultVal] = useState(0); // pengali menumpuk saat free spin
  const [droppedMultNotif, setDroppedMultNotif] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<SlotCelebrationData | null>(null);

  const spinPressTimer = useRef<any>(null);
  const username = localStorage.getItem('domino_username') || '';
  const autoSpinsRef = useRef(autoSpins);
  const freeSpinsLeftRef = useRef(freeSpinsLeft);
  const spinSpeedRef = useRef(spinSpeed);
  const doSpinRef = useRef<any>(null);
  const spinningColsRef = useRef<boolean[]>(Array(COLS).fill(false));
  const spinTimer = useRef<any>(null);
  const isCurrentSpinFreeRef = useRef(false);

  useEffect(() => { autoSpinsRef.current = autoSpins; }, [autoSpins]);
  useEffect(() => { freeSpinsLeftRef.current = freeSpinsLeft; }, [freeSpinsLeft]);
  useEffect(() => { spinSpeedRef.current = spinSpeed; }, [spinSpeed]);

  useEffect(() => {
    const slotCoins = getSlotCoins();
    setMyCoins(slotCoins.total > 0 ? slotCoins.total : 100000);
    const u = localStorage.getItem('domino_username');
    if (u) {
      fetch(`${API_URL}/profile/${u}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.coins !== undefined) {
            const tot = (d.coins || 0) + (d.bonusCoins || 0);
            setMyCoins(tot);
            localStorage.setItem('domino_coins', (d.coins || 0).toString());
            localStorage.setItem('domino_bonus_coins', (d.bonusCoins || 0).toString());
          }
        })
        .catch(() => {});
    }
  }, []);

  // Rapid reel shuffle - displays regular symbols during spin blur, checking synchronous spinningColsRef to prevent symbol flicker
  useEffect(() => {
    let interval: any = null;
    if (isSpinning) {
      interval = setInterval(() => {
        if (!spinningColsRef.current.some(Boolean)) return;
        setGrid(prev => prev.map((row, r) =>
          row.map((cell, c) => spinningColsRef.current[c] ? Math.floor(Math.random() * 11) : cell)
        ));
      }, Math.max(65, Math.floor(130 / spinSpeedRef.current)));
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isSpinning]);

  useEffect(() => {
    if (!socket) return;
    const handleResult = async (data: any) => {
      if (spinTimer.current) clearTimeout(spinTimer.current);
      const spd = spinSpeedRef.current;
      const minSpinBase = spd >= 10 ? 80 : spd >= 5 ? 140 : spd === 3 ? 240 : spd === 2 ? 400 : 750;
      const delayPerCol = spd >= 10 ? 20 : spd >= 5 ? 35 : spd === 3 ? 65 : spd === 2 ? 100 : 180;
      const bounceDuration = spd >= 10 ? 45 : spd >= 5 ? 80 : spd === 3 ? 160 : spd === 2 ? 240 : 380;
      let stopTime = minSpinBase;

      for (let c = 0; c < COLS; c++) {
        const col = c;
        setTimeout(() => {
          // Matikan flag reel ini secara sinkron di ref TERLEBIH DAHULU agar interval shuffle tidak menimpa
          spinningColsRef.current[col] = false;
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

      // Detect landed multiplier orbs and show drop notification after reels settle
      let initialOrbsSum = 0;
      let initialOrbsCount = 0;
      if (data.initialMultGrid) {
        data.initialMultGrid.forEach((row: number[]) => {
          row.forEach((v: number) => {
            if (v > 0) {
              initialOrbsSum += v;
              initialOrbsCount++;
            }
          });
        });
      }

      const allReelsSettled = stopTime + bounceDuration + 60;
      setTimeout(async () => {
        if (initialOrbsCount > 0) {
          setFreeMultVal(prev => (prev || 0) + initialOrbsSum);
          setDroppedMultNotif(`🍬 BOLA PENGALI ${initialOrbsSum}x TURUN! 🍬`);
          setTimeout(() => setDroppedMultNotif(null), 2800);
        }
        const winDelay = spd >= 10 ? 120 : spd >= 5 ? 180 : spd === 3 ? 280 : spd === 2 ? 360 : 480;
        const explodeDelay = spd >= 10 ? 90 : spd >= 5 ? 130 : spd === 3 ? 200 : spd === 2 ? 260 : 360;
        const dropDelay = spd >= 10 ? 100 : spd >= 5 ? 140 : spd === 3 ? 220 : spd === 2 ? 300 : 420;
        const settleDelay = spd >= 10 ? 30 : spd >= 5 ? 45 : spd === 3 ? 70 : spd === 2 ? 100 : 130;

        if (data.tumbleSteps?.length > 0) {
          for (const step of data.tumbleSteps) {
            const wins = step.winPositions || [];
            if (wins.length > 0) {
              // 1. Highlight winning cells
              setWinningCells(wins);
              setMultIdx(step.ladderIdx ?? 0);
              setRainbowActive(true);
              await new Promise(r => setTimeout(r, winDelay));

              // 2. Explode winning candies
              setExplodingCells(wins);
              await new Promise(r => setTimeout(r, explodeDelay));

              // 3. Briefly reveal empty holes where candies exploded
              setGrid(prev => prev.map((row, r) =>
                row.map((cell, c) => wins.includes(`${r}-${c}`) ? null as any : cell)
              ));
              setWinningCells([]);
              setExplodingCells([]);
              setRainbowActive(false);
              await new Promise(r => setTimeout(r, Math.max(70, 110 / spd)));
            }

            // 4. Calculate drop distance ONLY for cells strictly above the exploded slots
            // Candies below exploded slots stay completely stationary!
            const dropsMap: Record<string, number> = {};
            for (let c = 0; c < COLS; c++) {
              const expRowsInCol: number[] = [];
              for (let r = 0; r < ROWS; r++) {
                if (wins.includes(`${r}-${c}`)) {
                  expRowsInCol.push(r);
                }
              }
              if (expRowsInCol.length === 0) continue;

              const maxExpRow = Math.max(...expRowsInCol);
              const expCount = expRowsInCol.length;
              for (let r = 0; r <= maxExpRow; r++) {
                dropsMap[`${r}-${c}`] = expCount;
              }
            }

            // 5. Cascade drop: top candies slide down and new candies land from above
            setDroppingCells(dropsMap);
            setGrid(step.newGrid);
            setMultGrid(step.newMultGrid || Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
            await new Promise(r => setTimeout(r, dropDelay));
            setDroppingCells({});
            await new Promise(r => setTimeout(r, settleDelay));
          }
        }
        setIsSpinning(false);
        spinningColsRef.current = Array(COLS).fill(false);
        setSpinningCols(Array(COLS).fill(false));
        const applied = applySlotResultBalance(data);
        setMyCoins(data.newBalance != null ? data.newBalance : applied.total);
        setFreeMultVal(data.freeMult || 0);
        setTotalWin(data.totalWinAmount || 0);
        const isFreeRound = isCurrentSpinFreeRef.current;
        if (data.totalWinAmount > 0 && isFreeRound) {
          const newFsTotal = freeSpinTotalWinRef.current + data.totalWinAmount;
          freeSpinTotalWinRef.current = newFsTotal;
          setFreeSpinTotalWin(newFsTotal);
        }
        const isRetrigger = isFreeRound;
        if (data.triggerFreeSpins) {
          const awarded = data.freeSpinsAwarded || (isRetrigger ? 5 : 10);
          const totalFree = freeSpinsLeftRef.current + awarded;
          freeSpinsLeftRef.current = totalFree;
          setFreeSpinsLeft(totalFree);
          if (!isRetrigger) {
            setFreeSpinTotalWin(0);
            freeSpinTotalWinRef.current = 0;
          }
          setCelebration({
            type: 'scatter',
            freeSpinsCount: awarded,
            title: isRetrigger ? '🍬 RETRIGGER CANDY RUSH! 🍬' : '🍬 SCATTER CANDY RUSH! 🍬',
            subtext: isRetrigger
              ? `LUAR BIASA! +${awarded} PUTARAN GRATIS DITAMBAHKAN KE SISA SPIN! (TOTAL SISA: ${totalFree} SPIN)`
              : `SELAMAT! KAMU MEMICU ${awarded} PUTARAN GRATIS!`
          });
        } else if (data.totalWinAmount > 0 && !isFreeRound) {
          const ratio = data.totalWinAmount / Math.max(1, betAmount);
          if (ratio >= 30) {
            setCelebration({ type: 'super_win', amount: data.totalWinAmount });
          } else if (ratio >= 12) {
            setCelebration({ type: 'mega_win', amount: data.totalWinAmount });
          } else if (ratio >= 3) {
            setCelebration({ type: 'big_win', amount: data.totalWinAmount });
          }
        }

        const totalRemainingFree = freeSpinsLeftRef.current;
        const isEndingFS = (totalRemainingFree === 0 && isFreeRound && !data.triggerFreeSpins);
        if (isEndingFS) {
          isCurrentSpinFreeRef.current = false;
          const finalFsWin = freeSpinTotalWinRef.current;
          setCelebration({
            type: 'free_spins_total',
            amount: finalFsWin,
            title: 'TOTAL KEMENANGAN',
            subtext: finalFsWin > 0
              ? 'SELAMAT! TOTAL KEMENANGAN PUTARAN GRATIS CANDY RUSH!'
              : 'PUTARAN GRATIS SELESAI!'
          });
        }

        const hasCelebration = Boolean(
          data.triggerFreeSpins ||
          isEndingFS ||
          (!isFreeRound && data.totalWinAmount > 0 && (data.totalWinAmount / Math.max(1, betAmount)) >= 3)
        );
        const nextDelay = (hasCelebration || isEndingFS) ? 4600 : Math.max(250, 1000 / spd);
        const shouldContinue = totalRemainingFree > 0 || autoSpinsRef.current > 0;
        if (shouldContinue) {
          if (autoSpinsRef.current > 0 && totalRemainingFree === 0) {
            setAutoSpins(a => Math.max(0, a - 1));
            autoSpinsRef.current = Math.max(0, autoSpinsRef.current - 1);
          }
          setTimeout(() => doSpinRef.current?.(), nextDelay);
        } else {
          setAutoSpins(0);
          autoSpinsRef.current = 0;
        }
      }, allReelsSettled);
    };

    const handleError = (data: any) => {
      if (spinTimer.current) clearTimeout(spinTimer.current);
      setIsSpinning(false);
      spinningColsRef.current = Array(COLS).fill(false);
      setSpinningCols(Array(COLS).fill(false));
      setAutoSpins(0);
      setStatusText(data?.message || 'GOOD LUCK');
      if (data?.message) {
        alert(data.message);
      }
    };

    socket.on('candy_result', handleResult);
    socket.on('candy_error', handleError);
    return () => { socket.off('candy_result', handleResult); socket.off('candy_error', handleError); };
  }, [socket]);

  const handleBuyFreeSpin = () => {
    if (anteMode) {
      alert('Nonaktifkan Taruhan Ganda untuk Membeli Spin Gratis!');
      return;
    }
    if (isSpinning) return;
    const cost = betAmount * 100;
    if (myCoins < cost) {
      alert(`Koin tidak cukup! Butuh ${cost.toLocaleString('id-ID')} koin.`);
      return;
    }
    const res = spendSlotCoinsLocal(cost);
    setMyCoins(res.total);
    const newTotal = (freeSpinsLeftRef.current > 0 ? freeSpinsLeftRef.current : 0) + 10;
    setFreeSpinsLeft(newTotal);
    freeSpinsLeftRef.current = newTotal;
    setFreeSpinTotalWin(0);
    freeSpinTotalWinRef.current = 0;
    setFreeMultVal(1);
    setStatusText(`${newTotal} FREE SPINS AKTIF!`);
    setTimeout(() => {
      doSpinRef.current?.();
    }, 400);
  };

  const doSpin = () => {
    if (isSpinning) return;
    if (!socket) {
      setStatusText('Tidak terhubung ke server!');
      return;
    }
    const actualBet = anteMode ? Math.floor(betAmount * 1.25) : betAmount;
    const isFree = freeSpinsLeftRef.current > 0;
    isCurrentSpinFreeRef.current = isFree;
    if (freeSpinsLeftRef.current === 0 && myCoins < actualBet) {
      alert(`Koin tidak cukup! Taruhan: ${actualBet.toLocaleString('id-ID')} koin.`);
      setAutoSpins(0);
      return;
    }

    setIsSpinning(true);
    spinningColsRef.current = Array(COLS).fill(true);
    setSpinningCols(Array(COLS).fill(true));
    if (!isFree) {
      const res = spendSlotCoinsLocal(actualBet);
      setMyCoins(res.total);
      setMultIdx(0);
      setFreeMultVal(1);
    } else {
      const nextFree = Math.max(0, freeSpinsLeftRef.current - 1);
      freeSpinsLeftRef.current = nextFree;
      setFreeSpinsLeft(nextFree);
    }
    setTotalWin(0);
    setExplodingCells([]);
    setWinningCells([]);
    setStatusText('...');

    if (spinTimer.current) clearTimeout(spinTimer.current);
    spinTimer.current = setTimeout(() => {
      setIsSpinning(false);
      spinningColsRef.current = Array(COLS).fill(false);
      setSpinningCols(Array(COLS).fill(false));
      setAutoSpins(0);
      setStatusText('Koneksi timeout, coba lagi.');
    }, 8000);

    socket.emit('spin_candy', { 
      username, 
      betAmount, // base bet for payouts
      actualBet, // deduction
      isFreeSpins: isFree, 
      anteMode, 
      clientBalance: myCoins 
    });
  };
  doSpinRef.current = doSpin;

  // CSS-art candy tile renderer
  const renderCandy = (symId: number | null | undefined, multVal: number, isWin: boolean, isExp: boolean, isDrop: boolean = false, dropDist: number = 1) => {
    if (symId === null || symId === undefined) {
      return <div className="cr-tile cr-tile-empty" style={{ opacity: 0, pointerEvents: 'none' }} />;
    }

    const winCls = isWin ? 'cr-tile-win' : '';
    const expCls = isExp ? 'cr-tile-explode' : '';
    const dropCls = isDrop ? 'cr-tile-dropping' : '';
    const dropStyle = { ['--drop-dist' as any]: dropDist };

    // MULTIPLIER ORB (AUTHENTIC WINGED ORB FROM PRAGMATIC PLAY)
    if (symId === 10) {
      const v = multVal > 0 ? multVal : 2;
      const orbImg = v >= 50
        ? '/assets/orbs/orb_red.png'
        : v >= 15
        ? '/assets/orbs/orb_purple.png'
        : v >= 6
        ? '/assets/orbs/orb_blue.png'
        : '/assets/orbs/orb_green.png';

      return (
        <div className={`cr-tile ${winCls} ${expCls} ${dropCls}`} style={{ background: 'none', border: 'none', boxShadow: 'none', ...dropStyle }}>
          <div className="gato-orb-real-wrap">
            <img src={orbImg} alt={`Multiplier ${v}x`} className="gato-orb-real-img" />
            <span className="gato-orb-real-val">{v}x</span>
          </div>
        </div>
      );
    }

    // SCATTER - candy bag / gift
    if (symId === 9) {
      return (
        <div className={`cr-tile cr-sym-scatter ${winCls} ${expCls} ${dropCls}`} style={dropStyle}>
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
        <div className={`cr-tile cr-sym-lollipop ${winCls} ${expCls} ${dropCls}`} style={dropStyle}>
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
        <div className={`cr-tile cr-sym-cane ${winCls} ${expCls} ${dropCls}`} style={dropStyle}>
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
        <div className={`cr-tile cr-sym-gummy ${winCls} ${expCls} ${dropCls}`} style={dropStyle}>
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
      <div className={`cr-tile cr-sym-candy ${winCls} ${expCls} ${dropCls}`} style={dropStyle}>
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
        <div className="cr-avatar-wrap g-btn-press" onClick={() => setShowProfileModal(true)} title="Lihat Profil VIP" style={{ cursor: 'pointer' }}>
          <div style={{ width: 'max(42px, 9.5vh)', height: 'max(42px, 9.5vh)', minWidth: '42px', minHeight: '42px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.38vh solid #ff69b4', boxShadow: '0 0 1.5vh rgba(255,105,180,0.7)', background: 'radial-gradient(circle, #ff69b4, #800080)', flexShrink: 0 }}>
            {renderSlotAvatar(userProfile.avatar, 'cr-avatar-img', '🐸')}
          </div>
          <div className="cr-vip-badge">VIP {userProfile.vipLevel}</div>
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
          <div 
            className={`cr-buy-spin ${anteMode ? 'disabled' : ''}`} 
            onClick={handleBuyFreeSpin}
            title={anteMode ? 'Nonaktif saat Taruhan Ganda aktif' : 'Beli Spin Gratis'}
          >
            <div className="cr-bs-icon">🍭</div>
            <div className="cr-bs-title">BELI<br/>SPIN<br/>GRATIS</div>
            <div className="cr-bs-amount">
              {(() => {
                const buyCost = betAmount * 100;
                if (buyCost >= 1e9) return (buyCost / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
                if (buyCost >= 1e6) return (buyCost / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
                if (buyCost >= 1e3) return (buyCost / 1e3).toFixed(0) + 'K';
                return buyCost.toLocaleString('id-ID');
              })()}
            </div>
          </div>

          {/* TOTAL PENGALI (SIDE MULTIPLIER) - SWEET BONANZA STYLE */}
          {(() => {
            const isFree = freeSpinsLeft > 0;
            const displayMult = isFree
              ? Math.max(1, freeMultVal, [1, 2, 3, 5][multIdx] || 1)
              : Math.max(1, [1, 2, 3, 5][multIdx] || 1);
            return (
              <div className={`gato-side-multiplier ${isFree ? 'is-free-spin' : ''} ${displayMult > 1 ? 'is-active' : ''}`} style={{ width: '100%', boxSizing: 'border-box' }}>
                <div className="gsm-wing-top">🍭 🍬 🍭</div>
                <div className="gsm-title">{isFree ? 'TOTAL PENGALI' : 'PENGALI'}</div>
                <div className="gsm-orb-wrap">
                  <div className="gsm-orb-glow" />
                  <div className="gsm-orb">
                    <span className="gsm-val">{displayMult}x</span>
                  </div>
                </div>
                <div className="gsm-sub">
                  {isFree ? '★ TERSIMPAN ★' : (displayMult > 1 ? 'AKTIF' : 'BASE x1')}
                </div>
              </div>
            );
          })()}

          <div className="cr-ransel" onClick={() => alert('Ransel')}>
            <span>🎒</span>
            <span className="cr-ransel-lbl">RANSEL</span>
          </div>

          <div className="cr-ante-panel">
            <div className="cr-ante-title">TARUHAN</div>
            <div className="cr-ante-amt">
              {(() => {
                const anteAmt = Math.round(betAmount * 1.25);
                if (anteAmt >= 1e9) return (anteAmt / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
                if (anteAmt >= 1e6) return (anteAmt / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
                if (anteAmt >= 1e3) return (anteAmt / 1e3).toFixed(0) + 'K';
                return anteAmt.toLocaleString('id-ID');
              })()}
            </div>
            <div className="cr-ante-sub">FITUR GANDA</div>
            <div className="cr-ante-sub2">PELUANG MENANG 2X</div>
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
          {droppedMultNotif && (
            <div className="gato-mult-drop-banner">{droppedMultNotif}</div>
          )}
          {/* MULTIPLIER BAR DIRECTLY ABOVE REELS */}
          <SlotMultiplierBar inline={true} idx={multIdx} isFree={freeSpinsLeft > 0} freeMult={freeMultVal || 1} />
          {freeSpinsLeft > 0 && (
            <div className="cr-fs-banner">🍬 FREE SPIN: {freeSpinsLeft} 🍬</div>
          )}
          <div className="cr-grid-frame">
            <div className="cr-grid-inner">
              {Array.from({length: ROWS}, (_, r) =>
                Array.from({length: COLS}, (_, c) => {
                  const symId = grid[r]?.[c];
                  const multVal = multGrid[r]?.[c] ?? 0;
                  const cellKey = `${r}-${c}`;
                  const dropDist = droppingCells[cellKey] || 0;
                  const isDropping = dropDist > 0;
                  return (
                    <div key={cellKey} className={`cr-cell ${spinningCols[c] ? 'cr-cell-spin' : ''}`}>
                      {renderCandy(symId, multVal, winningCells.includes(cellKey), explodingCells.includes(cellKey), isDropping, dropDist)}
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
          <button className="cr-bot-btn cr-minus" onClick={() => setBetAmount(b => stepSlotBet(b, -1))}>−</button>
          <div className="cr-bet-box">
            <div className="cr-bet-label">BET</div>
            <div className="cr-bet-val">{betAmount.toLocaleString('id-ID')}</div>
          </div>
          <button className="cr-bot-btn cr-plus-bet" onClick={() => setBetAmount(b => stepSlotBet(b, 1))}>+</button>
        </div>

        <div className="cr-bot-center">
          <div className="cr-status-pill">
            {freeSpinsLeft > 0
              ? `TOTAL MENANG: ${Math.floor(freeSpinTotalWin).toLocaleString('id-ID')}`
              : (totalWin > 0 ? Math.floor(totalWin).toLocaleString('id-ID') : statusText)}
          </div>
        </div>

        <div className="cr-bot-right">
          <button className="cr-maxbet-btn" onClick={() => setBetAmount(MAX_SLOT_BET)}>MAX<br/>BET</button>
          <SlotSpeedButton
            speed={spinSpeed}
            onSpeedChange={setSpinSpeed}
            className="cr-speed-btn"
            theme="candy"
          />
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                <span className="cr-spin-text">{isSpinning ? 'STOP' : 'SPIN'}</span>
                {autoSpins > 0 && (
                  <span style={{ fontSize: '1.2vh', fontWeight: 900, color: '#fff9c4', textShadow: '0 1px 3px rgba(0,0,0,0.8)', marginTop: '0.2vh' }}>
                    {autoSpins > 90000 ? 'AUTO ∞' : `AUTO: ${autoSpins}`}
                  </span>
                )}
              </div>
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
