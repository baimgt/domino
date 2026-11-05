import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { API_URL } from './config';
import './mahjong2.css';
import GameMenuDropdown from './GameMenuDropdown';
import SlotCelebrationModal, { SlotCelebrationData } from './SlotCelebrationModal';
import SlotProfileModal, { renderSlotAvatar } from './SlotProfileModal';
import { useSlotProfile } from './useSlotProfile';
import { stepSlotBet, MIN_SLOT_BET, MAX_SLOT_BET, getSlotCoins, spendSlotCoinsLocal, addSlotWinLocal, syncSlotBetToBackend, syncSlotWinToBackend } from './slotConfig';
import SlotSpeedButton from './SlotSpeedButton';
import { determineSpinOutcome } from './slotRtpEngine';

interface Props {
  onBack: () => void;
  socket: Socket | null;
}

interface TileItem {
  symId: number | null;
  isGold?: boolean;
}

// MAHJONG WAYS 2 SYMBOLS
const MAHJONG_SYMBOLS: Record<number, { name: string; label: string; img: string }> = {
  0: { name: 'scatter', label: 'Scatter (BELI SPIN GRATIS)', img: '/assets/mahjong2/sym_scatter.png' },
  1: { name: 'wild', label: 'WILD Ingot', img: '/assets/mahjong2/sym_wild.png' },
  2: { name: 'fa', label: 'Fa (發)', img: '/assets/mahjong2/sym_fa.png' },
  3: { name: 'zhong', label: 'Zhong (中)', img: '/assets/mahjong2/sym_zhong.png' },
  4: { name: 'ba-wan', label: '8 Wan (八萬)', img: '/assets/mahjong2/sym_8wan.png' },
  5: { name: 'dot-5', label: '5 Dots', img: '/assets/mahjong2/sym_5dots.png' },
  6: { name: 'dot-3', label: '3 Dots', img: '/assets/mahjong2/sym_3dots.png' },
  7: { name: 'dot-2', label: '2 Dots', img: '/assets/mahjong2/sym_2dots.png' },
  8: { name: 'bam-2', label: '2 Bamboo', img: '/assets/mahjong2/sym_2bam.png' },
  9: { name: 'bai', label: 'White Board (白)', img: '/assets/mahjong2/sym_bai.png' },
  10: { name: 'bam-5', label: '5 Bamboo', img: '/assets/mahjong2/sym_5bam.png' },
};

// Initial grid layout for Mahjong Ways 2 (5 reels: 4, 5, 5, 5, 4 rows)
const INITIAL_MAHJONG_GRID: TileItem[][] = [
  // Reel 1 (4 rows)
  [{ symId: 4 }, { symId: 7 }, { symId: 5 }, { symId: 3 }],
  // Reel 2 (5 rows, row 0 is gold top)
  [{ symId: 5, isGold: true }, { symId: 5 }, { symId: 2 }, { symId: 5 }, { symId: 3 }],
  // Reel 3 (5 rows, row 0 is gold top)
  [{ symId: 2, isGold: true }, { symId: 4 }, { symId: 5 }, { symId: 3 }, { symId: 6 }],
  // Reel 4 (5 rows, row 0 is gold top)
  [{ symId: 7, isGold: true }, { symId: 9 }, { symId: 2 }, { symId: 3 }, { symId: 4 }],
  // Reel 5 (4 rows)
  [{ symId: 2 }, { symId: 5 }, { symId: 2 }, { symId: 4 }],
];

// Constant buffer tiles for continuous seamless downward scrolling during spin (cols 0 & 4: 4 tiles, cols 1,2,3: 5 tiles)
const MJ_SPIN_BUFFER: TileItem[][] = [
  [{ symId: 4 }, { symId: 7 }, { symId: 2 }, { symId: 8 }],
  [{ symId: 5, isGold: true }, { symId: 3 }, { symId: 9 }, { symId: 6 }, { symId: 4 }],
  [{ symId: 2, isGold: true }, { symId: 8 }, { symId: 5 }, { symId: 7 }, { symId: 3 }],
  [{ symId: 7, isGold: true }, { symId: 4 }, { symId: 10 }, { symId: 2 }, { symId: 9 }],
  [{ symId: 3 }, { symId: 6 }, { symId: 8 }, { symId: 5 }],
];

export default function MahjongWays2SlotScreen({ onBack, socket }: Props) {
  const [gridCols, setGridCols] = useState<TileItem[][]>(INITIAL_MAHJONG_GRID);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningCols, setSpinningCols] = useState<boolean[]>([false, false, false, false, false]);
  const [betAmount, setBetAmount] = useState(500);
  const [myCoins, setMyCoins] = useState<number>(() => {
    const slotCoins = getSlotCoins();
    return slotCoins.total > 0 ? slotCoins.total : 100000;
  });
  const [totalWin, setTotalWin] = useState(0);
  const [multiplierIdx, setMultiplierIdx] = useState(0);
  const mjIdxRef = useRef(0);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const freeSpinsLeftRef = useRef(freeSpinsLeft);
  useEffect(() => { freeSpinsLeftRef.current = freeSpinsLeft; }, [freeSpinsLeft]);
  const [freeSpinTotalWin, setFreeSpinTotalWin] = useState(0);
  const freeSpinTotalWinRef = useRef(0);
  useEffect(() => { freeSpinTotalWinRef.current = freeSpinTotalWin; }, [freeSpinTotalWin]);
  const [autoSpins, setAutoSpins] = useState(0);
  const autoSpinsRef = useRef<number>(0);
  const isSpinningRef = useRef(false);
  const doSpinRef = useRef<any>(null);
  const spinTimer = useRef<any>(null);
  const [spinSpeed, setSpinSpeed] = useState(1);
  const [winningCells, setWinningCells] = useState<{ col: number; row: number }[]>([]);
  const [explodingCells, setExplodingCells] = useState<{ col: number; row: number }[]>([]);
  const [droppingCells, setDroppingCells] = useState<Record<string, number>>({});
  const [activeWinBanner, setActiveWinBanner] = useState<string | null>(null);

  // Overlays & Modals
  const [showRules, setShowRules] = useState(false);
  const [rulesPage, setRulesPage] = useState(1);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [celebration, setCelebration] = useState<SlotCelebrationData | null>(null);
  const userProfile = useSlotProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Long press refs
  const spinPressTimer = useRef<any>(null);
  const spinDownTime = useRef<number>(0);
  const isSpinLongPress = useRef<boolean>(false);

  const speedPressTimer = useRef<any>(null);
  const speedDownTime = useRef<number>(0);
  const isSpeedLongPress = useRef<boolean>(false);

  const username = localStorage.getItem('domino_username') || '';

  useEffect(() => {
    autoSpinsRef.current = autoSpins;
  }, [autoSpins]);

  // Auto-Spin Reactive Machine (proven identical to Zeus & DuoFu)
  useEffect(() => {
    let timer: any;
    if (autoSpins > 0 && !isSpinning && !celebration) {
      timer = setTimeout(() => {
        setAutoSpins(prev => Math.max(0, prev - 1));
        doSpin();
      }, Math.max(400, 800 / spinSpeed));
    }
    return () => clearTimeout(timer);
  }, [autoSpins, isSpinning, celebration, spinSpeed]);

  // Free-Spins Reactive Machine
  useEffect(() => {
    let timer: any;
    if (freeSpinsLeft > 0 && !isSpinning && !celebration) {
      timer = setTimeout(() => {
        doSpin();
      }, Math.max(500, 900 / spinSpeed));
    }
    return () => clearTimeout(timer);
  }, [freeSpinsLeft, isSpinning, celebration, spinSpeed]);

  const spinSpeedRef = useRef(spinSpeed);
  useEffect(() => { spinSpeedRef.current = spinSpeed; }, [spinSpeed]);

  useEffect(() => {
    const slotCoins = getSlotCoins();
    setMyCoins(slotCoins.total > 0 ? slotCoins.total : 100000);
    const savedUser = localStorage.getItem('domino_username');
    if (savedUser) {
      fetch(`${API_URL}/profile/${savedUser}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.coins != null) {
            const tot = (d.coins || 0) + (d.bonusCoins || 0);
            setMyCoins(tot);
            localStorage.setItem('domino_coins', d.coins.toString());
            if (d.bonusCoins !== undefined) localStorage.setItem('domino_bonus_coins', d.bonusCoins.toString());
          }
        })
        .catch(() => {});
    }
  }, []);

  // Helper to generate a random column for reel cIdx (Reels 0 & 4 have 4 rows, Reels 1, 2, 3 have 5 rows)
  const generateCol = (colIdx: number): TileItem[] => {
    const rowCount = (colIdx === 0 || colIdx === 4) ? 4 : 5;
    const regularIds = [2, 3, 4, 5, 6, 7, 8, 9, 10];
    const items: TileItem[] = [];

    for (let r = 0; r < rowCount; r++) {
      const roll = Math.random();
      let symId = regularIds[Math.floor(Math.random() * regularIds.length)];
      // Peluang Scatter ~1.6% per ubin -> 3+ Scatter di 23 ubin = ~0.6% (1 dalam ~165 putaran - PG Soft authentic)
      const scatterProb = freeSpinsLeft > 0 ? 0.008 : 0.016;
      if (roll < scatterProb) {
        symId = 0; // Scatter
      } else if (roll < (scatterProb + 0.07) && colIdx >= 1 && colIdx <= 3) {
        symId = 1; // Wild
      }
      
      // Top cell on middle reels or ~25% of middle reel tiles can be Golden framed!
      const isGold = (colIdx >= 1 && colIdx <= 3 && symId >= 2) ? (r === 0 || Math.random() < 0.25) : false;
      items.push({ symId, isGold });
    }
    return items;
  };

  const doSpin = (overrideAutoCount?: number) => {
    if (isSpinningRef.current) return;
    try {
      const currentAuto = overrideAutoCount ?? autoSpinsRef.current;

      const cost = betAmount;
    const isFreeRound = freeSpinsLeftRef.current > 0;
    if (myCoins < cost && !isFreeRound) {
      alert('Koin Anda tidak mencukupi!');
      autoSpinsRef.current = 0;
      setAutoSpins(0);
      return;
    }

    // Deduct coins or decrement free spin
    if (!isFreeRound) {
      const res = spendSlotCoinsLocal(cost);
      setMyCoins(res.total);
      if (username) {
        syncSlotBetToBackend(API_URL, username, cost);
      }
    } else {
      const nextFree = Math.max(0, freeSpinsLeftRef.current - 1);
      freeSpinsLeftRef.current = nextFree;
      setFreeSpinsLeft(nextFree);
    }

    // RTP 96.26% & Hit Frequency 15.05% Mathematical Model
    const rtpOutcome = determineSpinOutcome({ isFreeSpins: isFreeRound });
    const winOccurred = rtpOutcome.isHit;
    let winAmt = 0;
    const ladder = isFreeRound ? [2, 4, 6, 10] : [1, 2, 3, 5];
    const cascades = 1 + (Math.random() < 0.5 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0) + (Math.random() < 0.15 ? 1 : 0);
    const lastIdx = Math.min(cascades - 1, 3);
    const winCells: { col: number; row: number }[] = [];

    // Pre-generate target grid
    const targetGrid: TileItem[][] = [0, 1, 2, 3, 4].map(cIdx => generateCol(cIdx));

    if (winOccurred) {
      const targetPayout = rtpOutcome.targetMult > 0 ? rtpOutcome.targetMult : (1.5 + Math.random() * 3);
      winAmt = Math.max(1, Math.floor(cost * targetPayout));

      // Tanam simbol pemenang LANGSUNG ke targetGrid SEBELUM spin dimulai
      const nonScatter = [2, 3, 4, 5, 6, 7, 8];
      const matchSym = nonScatter[Math.floor(Math.random() * nonScatter.length)];
      [0, 1, 2].forEach(c => {
        const r = Math.floor(Math.random() * (targetGrid[c]?.length || 4));
        if (targetGrid[c] && targetGrid[c][r]) {
          targetGrid[c][r] = { symId: matchSym, isGold: false };
          winCells.push({ col: c, row: r });
        }
      });
      if (Math.random() < 0.6 && targetGrid[3]) {
        const r = Math.floor(Math.random() * targetGrid[3].length);
        targetGrid[3][r] = { symId: matchSym, isGold: false };
        winCells.push({ col: 3, row: r });
      }
    } else {
      // Clean loss: break any matching tiles on cols 0, 1, 2
      [0, 1, 2].forEach(c => {
        if (targetGrid[c] && targetGrid[c][0]) {
          targetGrid[c][0] = { symId: 2 + c * 2, isGold: false };
        }
      });
    }

    if (rtpOutcome.isScatter) {
      [0, 2, 4].forEach(c => {
        if (targetGrid[c] && targetGrid[c][0]) {
          targetGrid[c][0] = { symId: 0, isGold: false };
        }
      });
    } else {
      // Ensure scatter count < 3
      let scatters = 0;
      targetGrid.forEach(col => {
        col.forEach(tile => {
          if (tile.symId === 0) {
            scatters++;
            if (scatters >= 3) {
              tile.symId = 5;
            }
          }
        });
      });
    }

    setGridCols(targetGrid);

    isSpinningRef.current = true;
    setIsSpinning(true);
    setSpinningCols([true, true, true, true, true]);
    setWinningCells([]);
    setActiveWinBanner(null);
    setTotalWin(0);

    if (spinTimer.current) clearTimeout(spinTimer.current);
    spinTimer.current = setTimeout(() => {
      isSpinningRef.current = false;
      setIsSpinning(false);
      setSpinningCols([false, false, false, false, false]);
    }, 12000);
    // Base game: reset ke x1. Free spin: reset ke x2 per ronde baru
    setMultiplierIdx(0);
    mjIdxRef.current = 0;

    const spd = spinSpeedRef.current;
    const minSpinBase = spd >= 10 ? 80 : spd >= 5 ? 140 : spd === 3 ? 240 : spd === 2 ? 400 : 750;
    const delayPerCol = spd >= 10 ? 20 : spd >= 5 ? 35 : spd === 3 ? 65 : spd === 2 ? 100 : 180;
    const bounceDuration = spd >= 10 ? 45 : spd >= 5 ? 80 : spd === 3 ? 160 : spd === 2 ? 220 : 320;
    let stopTime = minSpinBase;

    // Staggered reel stop (Reels 1..5)
    for (let c = 0; c < 5; c++) {
      const col = c;
      setTimeout(() => {
        setSpinningCols(prev => {
          const next = [...prev];
          next[col] = false;
          return next;
        });
      }, stopTime);
      stopTime += delayPerCol;
    }

    // Processing win & tumble sequence after reels settle cleanly
    const allReelsSettled = stopTime + bounceDuration + 60;
    setTimeout(async () => {
      let scatterCount = 0;
      try {
        if (winOccurred && winAmt > 0) {
          let currentGrid = targetGrid.map(col => [...col]);
          let currentWins = [...winCells];

          for (let k = 0; k < cascades; k++) {
            if (currentWins.length === 0) break;

            // 1. Highlight winning tiles
            setWinningCells(currentWins);
            setMultiplierIdx(Math.min(k, 3));
            await new Promise(res => setTimeout(res, Math.max(260, 420 / spd)));

            // 2. Explode winning tiles (pecah & lenyap)
            setExplodingCells(currentWins);
            await new Promise(res => setTimeout(res, Math.max(200, 320 / spd)));

            // 3. Briefly reveal empty holes where tiles vanished
            const emptyGrid = currentGrid.map((col, c) =>
              col.map((cell, r) => currentWins.some(w => w.col === c && w.row === r) ? { symId: null } : cell)
            );
            setGridCols(emptyGrid);
            setWinningCells([]);
            setExplodingCells([]);
            await new Promise(res => setTimeout(res, Math.max(70, 110 / spd)));

            // 4. Calculate gravity drop ONLY for tiles strictly above the empty holes!
            const dropsMap: Record<string, number> = {};
            const settledGrid = emptyGrid.map((col, c) => {
              const expRowsInCol = currentWins.filter(w => w.col === c).map(w => w.row);
              if (expRowsInCol.length === 0) return [...col];

              const maxExpRow = Math.max(...expRowsInCol);
              const expCount = expRowsInCol.length;
              for (let r = 0; r <= maxExpRow; r++) {
                dropsMap[`${c}-${r}`] = expCount;
              }

              // Gravity: drop non-null tiles down
              const existing = col.filter(cell => cell.symId !== null && cell.symId !== undefined);
              const needed = col.length - existing.length;
              const newTiles: TileItem[] = [];
              for (let i = 0; i < needed; i++) {
                const regularIds = [2, 3, 4, 5, 6, 7, 8, 9, 10];
                const symId = regularIds[Math.floor(Math.random() * regularIds.length)];
                const isGold = (c >= 1 && c <= 3 && Math.random() < 0.2);
                newTiles.push({ symId, isGold });
              }
              return [...newTiles, ...existing];
            });

            // 5. Cascade drop: top tiles tumble down
            setDroppingCells(dropsMap);
            setGridCols(settledGrid);
            currentGrid = settledGrid;
            await new Promise(res => setTimeout(res, Math.max(280, 380 / spd)));
            setDroppingCells({});
            await new Promise(res => setTimeout(res, Math.max(60, 120 / spd)));

            // If there are more cascades, set up next match
            if (k + 1 < cascades) {
              const nextMatchSym = [2, 3, 4, 5, 6, 7, 8][Math.floor(Math.random() * 7)];
              const nextWins: { col: number; row: number }[] = [];
              [0, 1, 2].forEach(c => {
                const r = Math.floor(Math.random() * currentGrid[c].length);
                currentGrid[c][r] = { symId: nextMatchSym, isGold: false };
                nextWins.push({ col: c, row: r });
              });
              currentWins = nextWins;
              setGridCols(currentGrid.map(col => [...col]));
            } else {
              currentWins = [];
            }
          }

          setTotalWin(winAmt);
          if (isFreeRound) {
            const newFsTotal = freeSpinTotalWinRef.current + winAmt;
            freeSpinTotalWinRef.current = newFsTotal;
            setFreeSpinTotalWin(newFsTotal);
          }
          const winRes = addSlotWinLocal(winAmt);
          setMyCoins(winRes.total);
          if (username) {
            syncSlotWinToBackend(API_URL, username, winAmt);
          }
          setMultiplierIdx(lastIdx);
          setActiveWinBanner(`⚡ KEMENANGAN ${ladder[lastIdx]}x! (+Rp ${winAmt.toLocaleString('id-ID')}) ⚡`);
          if (!isFreeRound) {
            const ratio = winAmt / Math.max(1, cost);
            if (ratio >= 30) {
              setCelebration({ type: 'super_win', amount: winAmt });
            } else if (ratio >= 12) {
              setCelebration({ type: 'mega_win', amount: winAmt });
            } else if (ratio >= 5) {
              setCelebration({ type: 'big_win', amount: winAmt });
            }
          }
        }

        // Scatter trigger check: 3+ Scatter memicu 10 Putaran Gratis (PG Soft authentic)
        scatterCount = targetGrid.flat().filter(t => t.symId === 0).length;
        if (scatterCount >= 3) {
          const isRetrigger = isFreeRound;
          const awarded = 10;
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
            title: isRetrigger ? '🀄 RETRIGGER MAHJONG WAYS! 🀄' : '🀄 SCATTER MAHJONG WAYS! 🀄',
            subtext: isRetrigger
              ? `LUAR BIASA! +${awarded} PUTARAN GRATIS DITAMBAHKAN KE SISA SPIN! (TOTAL SISA: ${totalFree} SPIN)`
              : `SELAMAT! 3+ SCATTER MEMICU ${awarded} PUTARAN GRATIS PERKALIAN X2-X10!`
          });
        }
      } catch (err) {
        console.error('Error during tumble sequence:', err);
      } finally {
        if (spinTimer.current) clearTimeout(spinTimer.current);
        isSpinningRef.current = false;
        setIsSpinning(false);
        setSpinningCols([false, false, false, false, false]);
        if (isFreeRound && freeSpinsLeftRef.current === 0 && scatterCount < 3) {
          const finalFsWin = freeSpinTotalWinRef.current;
          setCelebration({
            type: 'free_spins_total',
            amount: finalFsWin,
            title: 'TOTAL KEMENANGAN',
            subtext: finalFsWin > 0
              ? 'SELAMAT! TOTAL KEMENANGAN PUTARAN GRATIS MAHJONG WAYS!'
              : 'PUTARAN GRATIS SELESAI!'
          });
        }
      }
    }, allReelsSettled);
  } catch (err) {
    console.error('Error in doSpin:', err);
    isSpinningRef.current = false;
    setIsSpinning(false);
    setSpinningCols([false, false, false, false, false]);
  }
};
  doSpinRef.current = doSpin;

  const handleBuyFreeSpin = () => {
    const cost = betAmount * 100;
    if (myCoins < cost) {
      alert('Koin Anda tidak mencukupi untuk membeli Spin Gratis!');
      return;
    }
    const res = spendSlotCoinsLocal(cost);
    setMyCoins(res.total);
    if (username) {
      syncSlotBetToBackend(API_URL, username, cost);
    }
    const newTotal = (freeSpinsLeftRef.current > 0 ? freeSpinsLeftRef.current : 0) + 10;
    freeSpinsLeftRef.current = newTotal;
    setFreeSpinsLeft(newTotal);
    setFreeSpinTotalWin(0);
    freeSpinTotalWinRef.current = 0;
    setMultiplierIdx(0);
    mjIdxRef.current = 0;
    alert(`Selamat! Anda membeli 10 Putaran Gratis! Total Spin Gratis: ${newTotal}`);
  };

  return (
    <div className="mj-screen">
      {/* JADE GREEN DRAGON PATTERN BACKGROUND */}
      <div className="mj-bg">
        <div className="mj-bg-left-dragon"></div>
        <div className="mj-bg-right-dragon"></div>
        <div className="mj-bg-glow"></div>
        <div className="mj-cloud mj-cloud-1"></div>
        <div className="mj-cloud mj-cloud-2"></div>
        <div className="mj-cloud mj-cloud-3"></div>
      </div>

      {/* TOP LEFT (Profile Avatar, VIP Badge, Coins) */}
      <div className="mj-topleft">
        <div className="mj-avatar-wrap g-btn-press" onClick={() => setShowProfileModal(true)} title="Lihat Profil VIP" style={{ cursor: 'pointer' }}>
          <div style={{ width: 'max(42px, 9.5vh)', height: 'max(42px, 9.5vh)', minWidth: '42px', minHeight: '42px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.38vh solid #ffd700', boxShadow: '0 0 1.4vh rgba(0,0,0,0.7)', background: 'radial-gradient(circle, #b8860b, #4a2800)', flexShrink: 0 }}>
            {renderSlotAvatar(userProfile.avatar, 'mj-avatar-img', '🐸')}
          </div>
          <div className="mj-vip-badge">VIP {userProfile.vipLevel}</div>
          <div className="mj-bar-icon">Lv.{userProfile.level}</div>
        </div>
        <div className="mj-coins-wrap">
          <span className="mj-coin-icon">🪙</span>
          <span className="mj-coins-num">{myCoins.toLocaleString('id-ID')}</span>
          <button className="mj-plus-btn" onClick={() => alert('Top Up Koin')}>+</button>
        </div>
      </div>

      {/* TOP RIGHT (Ganti Room & Menu Dropdown) */}
      <div className="mj-topright">
       
        <button className="mj-tr-btn mj-tr-menu" onClick={() => setShowMenu(v => !v)}>≡</button>

        <GameMenuDropdown
          isOpen={showMenu}
          onClose={() => setShowMenu(false)}
          items={[
            { id: 'lobi', icon: '🚪', label: 'Lobi', onClick: () => { setShowMenu(false); onBack(); } },
            { id: 'tabel', icon: '📜', label: 'Tabel Bayaran', onClick: () => { setShowMenu(false); setShowRules(true); } },
            { id: 'speed', icon: '⚡', label: 'Putaran Cepat', badge: spinSpeed > 1 ? 'ON' : 'OFF', onClick: () => setSpinSpeed(s => s === 1 ? 2 : 1) },
            { id: 'bantuan', icon: '❓', label: 'Bantuan', onClick: () => { setShowMenu(false); setShowRules(true); } }
          ]}
        />
      </div>



      {/* LEFT SIDE BADGES (BELI SPIN GRATIS, SIDE MULTIPLIER & RANSEL) */}
      <div className="mj-side-left">
        <div className="mj-side-scatter-badge" onClick={handleBuyFreeSpin}>
          <div className="mj-scatter-icon-wrap">
            <img src="/assets/mahjong2/sym_scatter.png" alt="Scatter Hu" className="mj-scatter-badge-img" />
          </div>
          <div className="mj-scatter-label">BELI SPIN<br/>GRATIS</div>
        </div>

        <div className="mj-side-ransel" onClick={() => alert('Ransel Item')}>
          <div className="mj-ransel-icon">🎒</div>
          <div className="mj-ransel-label">RANSEL</div>
        </div>
      </div>

      {/* RIGHT SIDE ARROW BUTTON */}
      <div className="mj-side-right">
        <button className="mj-arrow-right-btn" onClick={() => alert('Menu Fitur Kanan')}>❯</button>
      </div>

      {/* MAIN MAHJONG SLOT MACHINE AREA (5 REELS: 4-5-5-5-4) */}
      <div className="mj-main-container">
        {/* TOP CASCADE MULTIPLIER RIBBON (SEPERTI GAME ASLINYA x1 x2 x3 x5) */}
        {(() => {
          const multipliers = freeSpinsLeft > 0 ? ['x2', 'x4', 'x6', 'x10'] : ['x1', 'x2', 'x3', 'x5'];
          return (
            <div className="mj-mult-bar-wrapper">
              {activeWinBanner && (
                <div className="mj-mult-win-pop">{activeWinBanner}</div>
              )}
              <div className={`mj-mult-ribbon ${freeSpinsLeft > 0 ? 'is-free-spin' : ''}`}>
                <div className="mj-mult-title">{freeSpinsLeft > 0 ? 'FREE SPINS' : 'PENGALI'}</div>
                {multipliers.map((m, idx) => (
                  <div
                    key={m}
                    className={`mj-mult-step ${idx === multiplierIdx ? 'mj-mult-active' : ''}`}
                  >
                    {m}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
        {freeSpinsLeft > 0 && (
          <div className="mj-freespin-banner">
            PUTARAN GRATIS BERLANGSUNG: {freeSpinsLeft} SPIN TERSISA!
          </div>
        )}

        <div className="mj-machine-frame">
          {/* Left Pillar with vertical 2000 CARA */}
          <div className="mj-pillar mj-pillar-left">
            <div className="mj-pillar-badge">
              <span className="mj-pillar-text">2000 CARA</span>
            </div>
          </div>

          {/* 5 REELS GRID */}
          <div className="mj-grid-frame">
            <div className="mj-grid">
              {[0, 1, 2, 3, 4].map(cIdx => {
                const isColSpinning = spinningCols[cIdx];
                const items = gridCols[cIdx] || [];

                const stripItems = isColSpinning ? [...(MJ_SPIN_BUFFER[cIdx] || []), ...items] : items;
                const spinDurationSec = Math.max(0.08, 0.30 / spinSpeedRef.current);

                return (
                  <div
                    key={`col-${cIdx}`}
                    className={`mj-col col-${cIdx} ${isColSpinning ? 'is-spinning' : 'is-stopped'}`}
                    style={{ '--spin-duration': `${spinDurationSec}s` } as React.CSSProperties}
                  >
                    <div className="mj-reel-track">
                      {stripItems.map((item, rIdx) => {
                        const sym = item.symId !== null ? (MAHJONG_SYMBOLS[item.symId] || MAHJONG_SYMBOLS[4]) : null;
                        const isWin = !isColSpinning && winningCells.some(w => w.col === cIdx && w.row === rIdx);
                        const isExp = !isColSpinning && explodingCells.some(w => w.col === cIdx && w.row === rIdx);
                        const dropDist = !isColSpinning ? (droppingCells[`${cIdx}-${rIdx}`] || 0) : 0;
                        const isDropping = dropDist > 0;
                        const isEmpty = item.symId === null || item.symId === undefined;
                        const isTopGoldRow = (cIdx >= 1 && cIdx <= 3 && rIdx === 0);

                        return (
                          <div
                            key={`cell-${cIdx}-${rIdx}`}
                            style={{ ['--drop-dist' as any]: dropDist }}
                            className={`mj-cell ${isTopGoldRow ? 'is-top-gold' : ''} ${item.isGold ? 'is-golden-tile' : ''} ${isWin ? 'is-winning' : ''} ${isExp ? 'is-exploding' : ''} ${isEmpty ? 'is-empty' : ''} ${isDropping ? 'is-dropping' : ''}`}
                          >
                            <div className="mj-tile-container">
                              {isEmpty ? null : (
                                <>
                                  <img
                                    src={sym?.img || '/assets/mahjong2/sym_fa.png'}
                                    alt={sym?.label || 'Tile'}
                                    className={`mj-tile-img sym-${sym?.name || 'fa'}`}
                                    draggable={false}
                                  />
                                  {item.isGold && <div className="mj-tile-gold-overlay" />}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Pillar with vertical 2000 CARA */}
          <div className="mj-pillar mj-pillar-right">
            <div className="mj-pillar-badge">
              <span className="mj-pillar-text">2000 CARA</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROL BAR (HIGGS DOMINO 3D SCROLL BAR) */}
      <div className="mj-bottombar-wrapper">
        <div className="mj-scroll-handle left">
          <svg viewBox="0 0 40 100" className="scroll-svg">
            <path d="M 35 5 C 10 5, 5 30, 5 50 C 5 70, 10 95, 35 95 C 15 95, 12 70, 12 50 C 12 30, 15 5, 35 5 Z" fill="url(#scrollGoldGrad)" />
            <defs>
              <linearGradient id="scrollGoldGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fff3b0" />
                <stop offset="40%" stopColor="#ffc107" />
                <stop offset="80%" stopColor="#b76e00" />
                <stop offset="100%" stopColor="#5e3000" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="mj-bottombar">
          {/* Left: Chat, Info, Minus, BET Box, Plus */}
          <div className="mjbot-left">
            <button className="mjbot-gold-btn mjbot-chat-btn" onClick={() => alert('Obrolan Segera Hadir')} title="Obrolan">
              <svg viewBox="0 0 24 24" className="mjbot-chat-icon">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" fill="#4a1c00"/>
              </svg>
            </button>
            <button className="mjbot-gold-btn mjbot-info-btn" onClick={() => setShowRules(true)} title="Aturan & Tabel Bayaran">
              i
            </button>
            <button className="mjbot-gold-btn mjbot-step-btn" onClick={() => setBetAmount(b => stepSlotBet(b, -1))}>-</button>
            <div className="mjbot-bet-display">
              <div className="mjbot-bet-label">BET 🔒</div>
              <div className="mjbot-bet-val">{betAmount.toLocaleString('id-ID')}</div>
            </div>
            <button className="mjbot-gold-btn mjbot-step-btn" onClick={() => setBetAmount(b => stepSlotBet(b, 1))}>+</button>
          </div>

          {/* Center: Purple Pill Message */}
          <div className="mjbot-center">
           
            <div className="mjbot-purple-pill">
              <span className="mjbot-purple-text">
                {freeSpinsLeft > 0 ? (
                  <span className="mjbot-win-glow">TOTAL MENANG: {freeSpinTotalWin.toLocaleString('id-ID')}</span>
                ) : totalWin > 0 ? (
                  <span className="mjbot-win-glow">MENANG: {totalWin.toLocaleString('id-ID')}</span>
                ) : isSpinning ? (
                  <span>Memutar...</span>
                ) : (
                  <span>GOOD LUCK</span>
                )}
              </span>
            </div>
          </div>

          {/* Right: MAX BET, Speed, SPIN / TUTUP */}
          <div className="mjbot-right">
            <button className="mjbot-gold-btn mjbot-maxbet-btn" onClick={() => setBetAmount(MAX_SLOT_BET)}>
              <span>MAX</span>
              <span>BET</span>
            </button>

            {/* SPEED BUTTON */}
            <SlotSpeedButton
              speed={spinSpeed}
              onSpeedChange={setSpinSpeed}
              className="mjbot-gold-btn mjbot-speed-btn"
              theme="gold"
            />

            {/* SPIN / TUTUP BUTTON WITH LONG-PRESS AUTO MENU */}
            <div style={{ position: 'relative' }}>
              {showAutoMenu && (
                <>
                  <div
                    className="mj-backdrop-dismiss"
                    onClick={() => setShowAutoMenu(false)}
                    onTouchStart={() => setShowAutoMenu(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                  />
                  <div className="mj-auto-menu" style={{ zIndex: 200 }}>
                    <div className="mj-menu-header">AUTOSPIN</div>
                    <div className="mj-auto-grid">
                      {[10, 50, 100, 500].map(n => (
                        <button key={n} onClick={() => {
                          setShowAutoMenu(false);
                          setAutoSpins(n);
                        }}>
                          {n}X
                        </button>
                      ))}
                      <button className="inf-btn" onClick={() => {
                        setShowAutoMenu(false);
                        setAutoSpins(999999);
                      }}>
                        ∞ <small>Tak Terbatas</small>
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                className={`mjbot-spin-btn ${autoSpins > 0 ? 'is-autospin' : ''}`}
                onPointerDown={(e) => {
                  if (e.button !== 0 && e.pointerType === 'mouse') return;
                  isSpinLongPress.current = false;
                  if (spinPressTimer.current) clearTimeout(spinPressTimer.current);
                  if (!isSpinning && autoSpins === 0) {
                    spinPressTimer.current = setTimeout(() => {
                      isSpinLongPress.current = true;
                      setShowAutoMenu(true);
                    }, 450);
                  }
                }}
                onPointerUp={() => {
                  if (spinPressTimer.current) clearTimeout(spinPressTimer.current);
                }}
                onPointerCancel={() => {
                  if (spinPressTimer.current) clearTimeout(spinPressTimer.current);
                }}
                onClick={() => {
                  if (spinPressTimer.current) clearTimeout(spinPressTimer.current);
                  if (isSpinLongPress.current) {
                    isSpinLongPress.current = false;
                    return;
                  }
                  if (showAutoMenu) {
                    setShowAutoMenu(false);
                    return;
                  }
                  if (autoSpins > 0) {
                    setAutoSpins(0);
                    return;
                  }
                  if (!isSpinning) {
                    doSpin();
                  }
                }}
                onContextMenu={e => { e.preventDefault(); setShowAutoMenu(true); }}
              >
                <div className="spin-btn-inner">
                  <span className="spin-txt-main">{isSpinning ? 'STOP' : 'SPIN'}</span>
                  <span className="spin-txt-sub">
                    {autoSpins > 0 ? (autoSpins > 90000 ? 'AUTO ∞' : `AUTO: ${autoSpins}`) : (isSpinning ? 'BERHENTI' : 'PUTAR')}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="mj-scroll-handle right">
          <svg viewBox="0 0 40 100" className="scroll-svg">
            <path d="M 5 5 C 30 5, 35 30, 35 50 C 35 70, 30 95, 5 95 C 25 95, 28 70, 28 50 C 28 30, 25 5, 5 5 Z" fill="url(#scrollGoldGrad)" />
          </svg>
        </div>
      </div>

      {/* RULES MODAL (AUTHENTIC MAHJONG WAYS 2 5-PAGE RULES & PAYTABLE) */}
      {showRules && (
        <div className="mj-rules-overlay" onClick={() => setShowRules(false)}>
          <div className="mj-rules-modal" onClick={e => e.stopPropagation()}>
            <button className="mj-rules-close" onClick={() => setShowRules(false)}>✕</button>

            <div className="mj-rules-body">
              {/* PAGE 1: NILAI BAYARAN SIMBOL */}
              {rulesPage === 1 && (
                <div className="mj-rules-page mj-page-1">
                  <h2 className="mj-rules-title">NILAI BAYARAN SIMBOL</h2>

                  <div className="mj-p1-top-header">
                    <div className="mj-p1-header-item">
                      <img src="/assets/mahjong2/sym_scatter.png" alt="Scatter" className="mj-p1-hdr-img" />
                      <div className="mj-p1-hdr-txt">
                        <strong>Simbol Scatter</strong>
                      </div>
                    </div>
                    <div className="mj-p1-header-item">
                      <img src="/assets/mahjong2/sym_wild.png" alt="Wild" className="mj-p1-hdr-img" />
                      <div className="mj-p1-hdr-txt">
                        <strong>Simbol Wild</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mj-p1-grid">
                    {/* Row 1: Fa, Zhong, Bai, 8Wan, 5Dots */}
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_fa.png" alt="Fa" />
                      <div className="mj-p1-val"><span>5</span> 25K<br/><span>4</span> 12K<br/><span>3</span> 5K</div>
                    </div>
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_zhong.png" alt="Zhong" />
                      <div className="mj-p1-val"><span>5</span> 20K<br/><span>4</span> 10K<br/><span>3</span> 4K</div>
                    </div>
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_bai.png" alt="Bai" />
                      <div className="mj-p1-val"><span>5</span> 15K<br/><span>4</span> 7K<br/><span>3</span> 3K</div>
                    </div>
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_8wan.png" alt="8 Wan" />
                      <div className="mj-p1-val"><span>5</span> 7K<br/><span>4</span> 5K<br/><span>3</span> 2K</div>
                    </div>
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_5dots.png" alt="5 Dots" />
                      <div className="mj-p1-val"><span>5</span> 6K<br/><span>4</span> 2K<br/><span>3</span> 1K</div>
                    </div>

                    {/* Row 2: 5Bam, 3Dots, 2Bam, 2Dots */}
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_5bam.png" alt="5 Bamboo" />
                      <div className="mj-p1-val"><span>5</span> 6K<br/><span>4</span> 2K<br/><span>3</span> 1K</div>
                    </div>
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_3dots.png" alt="3 Dots" />
                      <div className="mj-p1-val"><span>5</span> 5K<br/><span>4</span> 2K<br/><span>3</span> 1K</div>
                    </div>
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_2bam.png" alt="2 Bamboo" />
                      <div className="mj-p1-val"><span>5</span> 3K<br/><span>4</span> 1K<br/><span>3</span> 500</div>
                    </div>
                    <div className="mj-p1-card">
                      <img src="/assets/mahjong2/sym_2dots.png" alt="2 Dots" />
                      <div className="mj-p1-val"><span>5</span> 3K<br/><span>4</span> 1K<br/><span>3</span> 500</div>
                    </div>
                  </div>

                  <div className="mj-p1-notes">
                    <p>Simbol Wild menggantikan semua simbol kecuali simbol Scatter.</p>
                    <p>Simbol berwarna emas hanya muncul di rol 2, 3 dan 4.</p>
                  </div>
                </div>
              )}

              {/* PAGE 2: SIMBOL BERWARNA EMAS */}
              {rulesPage === 2 && (
                <div className="mj-rules-page mj-page-2">
                  <h2 className="mj-rules-title">SIMBOL BERWARNA EMAS</h2>
                  <div className="mj-p2-split">
                    <div className="mj-p2-left-diag">
                      <div className="mj-p2-mini-grid">
                        <div className="mj-p2-grid-row">
                          <img src="/assets/mahjong2/sym_2bam.png" alt="" />
                          <img src="/assets/mahjong2/sym_zhong.png" alt="" />
                          <img src="/assets/mahjong2/sym_zhong.png" alt="" />
                          <img src="/assets/mahjong2/sym_5dots.png" alt="" />
                          <img src="/assets/mahjong2/sym_2bam.png" alt="" />
                        </div>
                        <div className="mj-p2-grid-row">
                          <img src="/assets/mahjong2/sym_3dots.png" alt="" />
                          <img src="/assets/mahjong2/sym_2bam.png" alt="" />
                          <img src="/assets/mahjong2/sym_2bam.png" alt="" />
                          <img src="/assets/mahjong2/sym_wild.png" alt="" />
                          <img src="/assets/mahjong2/sym_2bam.png" alt="" />
                        </div>
                        <div className="mj-p2-grid-row">
                          <img src="/assets/mahjong2/sym_3dots.png" alt="" />
                          <img src="/assets/mahjong2/sym_fa.png" alt="" />
                          <img src="/assets/mahjong2/sym_scatter.png" alt="" />
                          <img src="/assets/mahjong2/sym_fa.png" alt="" />
                          <img src="/assets/mahjong2/sym_fa.png" alt="" />
                        </div>
                        <div className="mj-p2-grid-row">
                          <img src="/assets/mahjong2/sym_3dots.png" alt="" />
                          <img src="/assets/mahjong2/sym_8wan.png" alt="" />
                          <img src="/assets/mahjong2/sym_3dots.png" alt="" />
                          <img src="/assets/mahjong2/sym_3dots.png" alt="" className="gold-highlight" />
                          <img src="/assets/mahjong2/sym_3dots.png" alt="" />
                        </div>
                        <div className="mj-p2-grid-row">
                          <img src="/assets/mahjong2/sym_5dots.png" alt="" />
                          <img src="/assets/mahjong2/sym_3dots.png" alt="" className="gold-highlight" />
                          <img src="/assets/mahjong2/sym_2bam.png" alt="" />
                          <img src="/assets/mahjong2/sym_bai.png" alt="" />
                          <img src="/assets/mahjong2/sym_bai.png" alt="" />
                        </div>
                      </div>
                    </div>
                    <div className="mj-p2-right-text">
                      <p>• Selama putaran apa pun, beberapa simbol (kecuali simbol Wild dan simbol Scatter) di rol 2, 3 dan atau 4 bisa saja berwarna emas.</p>
                      <p>• Di setiap babak baru setelah simbol baru berjatuhan, simbol apa pun yang berpelat emas yang terlibat dalam sebuah kemenangan di babak sebelumnya akan diubah menjadi simbol Wild.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 3: PENGALI */}
              {rulesPage === 3 && (
                <div className="mj-rules-page mj-page-3">
                  <h2 className="mj-rules-title">PENGALI</h2>
                  <div className="mj-p3-ribbon-wrap">
                    <div className="mj-p3-ribbon">
                      <span>x1</span>
                      <span className="active">x2</span>
                      <span>x3</span>
                      <span>x5</span>
                    </div>
                  </div>
                  <div className="mj-p3-bullets">
                    <p>• Selama putaran apa pun, semua kemenangan akan dikalikan dengan pengali yang ditunjukkan di atas rol, dimulai dengan x1 di babak pertama.</p>
                    <p>• Kemenangan apa pun di babak pertama akan meningkatkan pengali putaran kedua menjadi x2.</p>
                    <p>• Kemenangan apa pun di babak kedua akan meningkatkan pengali putaran ketiga menjadi x3.</p>
                    <p>• Kemenangan apa pun di babak ketiga akan meningkatkan pengali putaran keempat (dan seterusnya) menjadi x5.</p>
                  </div>
                </div>
              )}

              {/* PAGE 4: FITUR PUTARAN GRATIS */}
              {rulesPage === 4 && (
                <div className="mj-rules-page mj-page-4">
                  <h2 className="mj-rules-title">FITUR PUTARAN GRATIS</h2>
                  <div className="mj-p4-split">
                    <div className="mj-p4-left-col">
                      <div className="mj-p4-scatters">
                        <img src="/assets/mahjong2/sym_scatter.png" alt="Scatter" />
                        <img src="/assets/mahjong2/sym_scatter.png" alt="Scatter" />
                        <img src="/assets/mahjong2/sym_scatter.png" alt="Scatter" />
                      </div>
                      <p>• Fitur Putaran Gratis</p>
                      <p>• 3 simbol Scatter yang muncul di mana saja akan memicu Fitur Putaran Gratis dengan 10 putaran gratis. Setiap simbol Scatter tambahan akan memicu 2 putaran gratis lagi.</p>
                      <p>• Jumlah kemenangan maksimal dibatasi hingga 2000X taruhan. Jika total bonus putaran gratis mencapai 2000X, putaran segera berakhir dan bonus dibayarkan.</p>
                    </div>

                    <div className="mj-p4-right-col">
                      <div className="mj-p4-mini-grid">
                        <img src="/assets/mahjong2/ref_mahjong2.jpg" alt="Free Spins Reel" className="mj-p4-reel-img" />
                      </div>
                      <p>• Selama Fitur Putaran Gratis, semua simbol (kecuali simbol Wild dan simbol Scatter) di rol 3 akan berwarna emas.</p>
                      <p>• Pengali di atas rol masing-masing akan ditingkatkan menjadi x2, x4, x6 dan x10.</p>
                      <p>• Putaran gratis bisa dipicu ulang.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 5: 2,000 CARA (BAGIAN 1) */}
              {rulesPage === 5 && (
                <div className="mj-rules-page mj-page-5">
                  <h2 className="mj-rules-title">2,000 CARA</h2>
                  <div className="mj-p5-split">
                    <div className="mj-p5-left-col">
                      <p>• Garis taruhan dimenangkan jika simbol-simbol kemenangan berada pada posisi berurutan dari rol paling kiri ke rol paling kanan.</p>
                      <div className="mj-p5-diags">
                        <div className="mj-p5-diag-box">
                          <div className="mj-p5-grid-demo win">
                            <span className="c c1">?</span><span className="c c2">?</span><span className="c"></span><span className="c"></span><span className="c"></span>
                            <span className="c"></span><span className="c c3">?</span><span className="c c4">?</span><span className="c"></span><span className="c"></span>
                            <span className="c"></span><span className="c"></span><span className="c"></span><span className="c"></span><span className="c"></span>
                            <span className="c"></span><span className="c c5">?</span><span className="c c6">?</span><span className="c"></span><span className="c"></span>
                          </div>
                          <div className="mj-p5-check">✔</div>
                        </div>

                        <div className="mj-p5-diag-box">
                          <div className="mj-p5-grid-demo loss">
                            <span className="c c1">?</span><span className="c c2">?</span><span className="c"></span><span className="c"></span><span className="c"></span>
                            <span className="c"></span><span className="c c3">?</span><span className="c"></span><span className="c c4">?</span><span className="c"></span>
                            <span className="c"></span><span className="c"></span><span className="c"></span><span className="c"></span><span className="c"></span>
                            <span className="c"></span><span className="c c5">?</span><span className="c"></span><span className="c c6">?</span><span className="c"></span>
                          </div>
                          <div className="mj-p5-cross">✖</div>
                        </div>
                      </div>
                    </div>

                    <div className="mj-p5-right-col">
                      <p>• Jumlah total kemenangan taruhan untuk setiap simbol akan dihitung dengan mengalikan jumlah simbol pemenang yang berdekatan pada setiap simbol dari rol paling kiri ke kanan.</p>
                      
                      <div className="mj-p5-math-box">
                        <div className="mj-p5-math-sub">Dari Contoh di Atas:</div>
                        <div className="mj-p5-math-formula">1x3x2 = 6</div>
                      </div>

                      <p>• Pembayaran simbol pemenang dikalikan dengan jumlah kemenangan jalan taruhan.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 6: 2,000 CARA (BAGIAN 2) */}
              {rulesPage === 6 && (
                <div className="mj-rules-page mj-page-6">
                  <h2 className="mj-rules-title">2,000 CARA</h2>
                  <div className="mj-p6-top-calc">
                    <div className="mj-p6-tile-demo">
                      <div className="mj-p6-q-sphere">?</div>
                      <div className="mj-p6-tile-payout">
                        <div><span>5</span> 500</div>
                        <div><span>4</span> 100</div>
                        <div className="gold-row"><span className="gold-txt">3</span> <span className="gold-txt">10</span></div>
                      </div>
                    </div>
                    <div className="mj-p6-math-box">
                      <div className="mj-p6-math-sub">Total Kemenangan di Contoh ini:</div>
                      <div className="mj-p6-math-formula">10x6 = 60</div>
                    </div>
                  </div>

                  <div className="mj-p6-bullets">
                    <p>• Setelah bayaran setiap babak dibayarkan , maka semua simbol yang menang akan meledak dan simbol di atas akan berjatuhan dan memulai babak baru.</p>
                    <p>• Tambahan kombinasi yang menang akan dihitung di setiap babak hingga tidak ada lagi kombinasi yang menang untuk dihitung.</p>
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER PAGINATION & BACK BUTTON */}
            <div className="mj-rules-footer">
              {/* Indicator dots (6 pages) */}
              <div className="mj-rules-dots">
                {[1, 2, 3, 4, 5, 6].map(d => (
                  <span key={d} className={`dot ${d === rulesPage ? 'active' : ''}`} onClick={() => setRulesPage(d)} />
                ))}
              </div>

              {/* Navigation controls */}
              <div className="mj-rules-controls">
                <button className="mj-rules-nav-btn prev" onClick={() => setRulesPage(p => Math.max(1, p - 1))} disabled={rulesPage === 1}>
                  ◄
                </button>
                <button className="mj-rules-back-btn" onClick={() => setShowRules(false)}>
                  KEMBALI KE GAME
                </button>
                <button className="mj-rules-nav-btn next" onClick={() => setRulesPage(p => Math.min(6, p + 1))} disabled={rulesPage === 6}>
                  ►
                </button>
              </div>
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
