import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import './gatokaca.css';
import GameMenuDropdown from './GameMenuDropdown';
import LeaderboardModal from './LeaderboardModal';
import SlotCelebrationModal, { SlotCelebrationData } from './SlotCelebrationModal';
import SlotProfileModal, { renderSlotAvatar } from './SlotProfileModal';
import { useSlotProfile } from './useSlotProfile';
import { stepSlotBet, MIN_SLOT_BET, MAX_SLOT_BET, getSlotCoins, spendSlotCoinsLocal, applySlotResultBalance, syncSlotBetToBackend } from './slotConfig';
import { API_URL } from './config';
import SlotSpeedButton from './SlotSpeedButton';

interface Props {
  onBack: () => void;
  socket: Socket | null;
}

// Symbol definitions - Gates of Gatotkaca 1000 theme
export const GATO_SYMBOLS: Record<number, {
  name: string; label: string; tier: 'high' | 'mid' | 'low' | 'special';
  color: string; bgColor: string; img?: string;
}> = {
  // ── 4 HIGH-PAYING ITEMS (Pragmatic Play Gatotkaca) ─────────────────────────
  0: { name: 'ruby-ring',  label: 'Cincin Ruby',     tier: 'high',    color: '#ef5350', bgColor: '#7f0000', img: '/assets/gatokaca/sym_ruby_ring.png' },
  1: { name: 'lion',       label: 'Singa Emas',      tier: 'high',    color: '#ffd700', bgColor: '#4a2800', img: '/assets/gatokaca/sym_lion.png' },
  2: { name: 'potion',     label: 'Ramuan Hijau',    tier: 'high',    color: '#26a69a', bgColor: '#004d40', img: '/assets/gatokaca/sym_potion.png' },
  3: { name: 'blu-medal',  label: 'Liontin Biru',    tier: 'high',    color: '#29b6f6', bgColor: '#01579b', img: '/assets/gatokaca/sym_blue_medal.png' },
  // ── 5 GEMSTONES (RED, PURPLE, YELLOW, GREEN, BLUE) ───────────────────────
  4: { name: 'red-gem',    label: 'Permata Merah',   tier: 'mid',     color: '#ef5350', bgColor: '#7f0000', img: '/assets/gatokaca/sym_red_gem.png' },
  5: { name: 'pur-gem',    label: 'Permata Ungu',    tier: 'mid',     color: '#ce93d8', bgColor: '#4a148c', img: '/assets/gatokaca/sym_purple_gem.png' },
  6: { name: 'yel-gem',    label: 'Permata Kuning',  tier: 'mid',     color: '#ffa726', bgColor: '#e65100', img: '/assets/gatokaca/sym_yellow_gem.png' },
  7: { name: 'grn-gem',    label: 'Permata Hijau',   tier: 'low',     color: '#66bb6a', bgColor: '#1b5e20', img: '/assets/gatokaca/sym_green_gem.png' },
  8: { name: 'blu-gem',    label: 'Permata Biru',    tier: 'low',     color: '#29b6f6', bgColor: '#01579b', img: '/assets/gatokaca/sym_blue_gem.png' },
  // ── SPECIAL ───────────────────────────────────────────────────────────────
  9: { name: 'scatter',    label: 'SCATTER',         tier: 'special', color: '#ffd700', bgColor: '#1a237e', img: '/assets/gatokaca/sym_scatter.png' },
  10:{ name: 'multi',      label: 'MULTIPLIER',      tier: 'special', color: '#ffffff', bgColor: '#880e4f' },
};

// Paytable: count -> payout multiplier (per bet unit)
const PAYTABLE: Record<number, Record<string, number>> = {
  0:  { '12': 50, '20': 250, '30': 500  }, // Cincin Ruby (500x)
  1:  { '12': 25, '20': 100, '30': 250  }, // Singa Emas (250x)
  2:  { '12': 15, '20': 60,  '30': 150  }, // Ramuan Hijau (150x)
  3:  { '12': 12, '20': 40,  '30': 120  }, // Liontin Biru (120x)
  4:  { '12': 10, '20': 30,  '30': 100  }, // Permata Merah (100x)
  5:  { '12': 8,  '20': 25,  '30': 80   }, // Permata Ungu (80x)
  6:  { '12': 5,  '20': 20,  '30': 50   }, // Permata Kuning (50x)
  7:  { '12': 4,  '20': 18,  '30': 40   }, // Permata Hijau (40x)
  8:  { '12': 2,  '20': 14,  '30': 20   }, // Permata Biru (20x)
};

const SCATTER_PAY: Record<number, number> = { 4: 3, 5: 5, 6: 100 };
const ROWS = 5, COLS = 6;

export default function GatesOfGatokacaSlotScreen({ onBack, socket }: Props) {
  const [grid, setGrid] = useState<number[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(4))
  );
  const [multGrid, setMultGrid] = useState<number[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(0))
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningCols, setSpinningCols] = useState<boolean[]>(Array(COLS).fill(false));
  const [bouncingCols, setBouncingCols] = useState<boolean[]>(Array(COLS).fill(false));
  const [myCoins, setMyCoins] = useState<number>(() => {
    const slotCoins = getSlotCoins();
    return slotCoins.total > 0 ? slotCoins.total : 100000;
  });
  const [betAmount, setBetAmount] = useState<number>(MIN_SLOT_BET);
  const betAmountRef = useRef(betAmount);
  const [totalWin, setTotalWin] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [freeMultVal, setFreeMultVal] = useState(0); // pengali menumpuk saat free spin
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [autoSpins, setAutoSpins] = useState(0);
  const [spinSpeed, setSpinSpeed] = useState(1);
  const [anteMode, setAnteMode] = useState(false); // Taruhan Ganda
  const [showRules, setShowRules] = useState(false);
  const [rulesPage, setRulesPage] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [explodingCells, setExplodingCells] = useState<string[]>([]);
  const [droppingCells, setDroppingCells] = useState<Record<string, number>>({});
  const [statusText, setStatusText] = useState('GOOD LUCK');
  const [winningCells, setWinningCells] = useState<string[]>([]);
  const [scatterCount, setScatterCount] = useState(0);
  const [droppedMultNotif, setDroppedMultNotif] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<SlotCelebrationData | null>(null);
  const userProfile = useSlotProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    betAmountRef.current = betAmount;
  }, [betAmount]);

  const spinPressTimer = useRef<any>(null);
  const username = localStorage.getItem('domino_username') || '';
  const autoSpinsRef = useRef(autoSpins);
  const freeSpinsLeftRef = useRef(freeSpinsLeft);
  const spinSpeedRef = useRef(spinSpeed);
  const doSpinRef = useRef<any>(null);
  const isStoppingRef = useRef(false);
  const spinningColsRef = useRef<boolean[]>(Array(COLS).fill(false));
  const spinTimer = useRef<any>(null);

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
    // Initial grid matching screenshot layout
    const initGrid = [
      [4, 6, 7, 3, 3, 5],
      [4, 6, 7, 3, 3, 5],
      [2, 2, 1, 7, 1, 2],
      [2, 2, 1, 7, 1, 2],
      [2, 2, 0, 6, 8, 3],
    ];
    setGrid(initGrid);
  }, []);

  // Rapid reel shuffle - displays regular symbols during spin blur, checking synchronous spinningColsRef to prevent symbol flicker
  useEffect(() => {
    let interval: any = null;
    if (isSpinning) {
      interval = setInterval(() => {
        if (!spinningColsRef.current.some(Boolean)) return;
        setGrid(prev => prev.map((row, _r) =>
          row.map((cell, c) => spinningColsRef.current[c] ? Math.floor(Math.random() * 10) : cell)
        ));
        setMultGrid(prev => prev.map((row, _r) =>
          row.map((val, c) => spinningColsRef.current[c] ? 0 : val)
        ));
      }, Math.max(20, Math.floor(65 / spinSpeedRef.current)));
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isSpinning]);

  useEffect(() => {
    if (!socket) return;

    const handleResult = async (data: any) => {
      if (spinTimer.current) clearTimeout(spinTimer.current);
      const spd = spinSpeedRef.current;
      // Sinkronisasi durasi putar & stagger reel berdasarkan kecepatan (x1, x2, x3, x5, x10)
      const minSpinBase = spd >= 10 ? 80 : spd >= 5 ? 140 : spd === 3 ? 240 : spd === 2 ? 400 : 750;
      const delayPerCol = spd >= 10 ? 20 : spd >= 5 ? 35 : spd === 3 ? 65 : spd === 2 ? 100 : 180;
      const bounceDuration = spd >= 10 ? 45 : spd >= 5 ? 80 : spd === 3 ? 160 : spd === 2 ? 240 : 380;
      let stopTime = minSpinBase;

      // Staggered reel stop dengan proteksi sinkronisasi ref
      for (let c = 0; c < COLS; c++) {
        const col = c;
        setTimeout(() => {
          // 1. Matikan flag reel ini secara sinkron di ref TERLEBIH DAHULU agar interval shuffle tidak menimpa
          spinningColsRef.current[col] = false;
          setSpinningCols(prev => { const n = [...prev]; n[col] = false; return n; });
          
          // 2. Efek mendarat & pantulan
          setBouncingCols(prev => { const n = [...prev]; n[col] = true; return n; });
          setTimeout(() => setBouncingCols(prev => { const n = [...prev]; n[col] = false; return n; }), bounceDuration);
          
          // 3. Pasang simbol asli hasil server
          setGrid(prev => prev.map((row, r) =>
            row.map((cell, ci) => ci === col ? data.initialGrid[r][col] : cell)
          ));
          setMultGrid(prev => prev.map((row, r) =>
            row.map((cell, ci) => ci === col ? (data.initialMultGrid?.[r]?.[col] ?? 0) : cell)
          ));
        }, stopTime);
        stopTime += delayPerCol;
      }

      // Seluruh rol selesai berhenti & mendarat rapi -> jalankan tumble
      const allReelsSettledTime = stopTime + bounceDuration + 60;
      setTimeout(async () => {
        // Tumble animation timing yang pas dan proporsional terhadap speed (sampai 10x)
        const winDelay = spd >= 10 ? 120 : spd >= 5 ? 180 : spd === 3 ? 280 : spd === 2 ? 360 : 480;
        const explodeDelay = spd >= 10 ? 90 : spd >= 5 ? 130 : spd === 3 ? 200 : spd === 2 ? 260 : 360;
        const dropDelay = spd >= 10 ? 100 : spd >= 5 ? 140 : spd === 3 ? 220 : spd === 2 ? 300 : 420;
        const settleDelay = spd >= 10 ? 30 : spd >= 5 ? 45 : spd === 3 ? 70 : spd === 2 ? 100 : 130;

        // Process tumble steps
        if (data.tumbleSteps && data.tumbleSteps.length > 0) {
          for (const step of data.tumbleSteps) {
            const wins = step.winPositions || [];
            if (wins.length > 0) {
              // 1. Highlight winning cells with glowing effect
              setWinningCells(wins);
              await new Promise(r => setTimeout(r, winDelay));

              // 2. Explode winning symbols (vanish/shatter)
              setExplodingCells(wins);
              await new Promise(r => setTimeout(r, explodeDelay));

              // 3. Briefly reveal empty spaces where exploded symbols disappeared
              setGrid(prev => prev.map((row, r) =>
                row.map((cell, c) => wins.includes(`${r}-${c}`) ? null as any : cell)
              ));
              setWinningCells([]);
              setExplodingCells([]);
              await new Promise(r => setTimeout(r, Math.max(70, 110 / spd)));
            }

            // 4. Calculate drop distance ONLY for cells that are above the exploded slots
            // Symbols strictly below the exploded slots remain completely motionless!
            const dropsMap: Record<string, number> = {};
            for (let c = 0; c < COLS; c++) {
              const expRowsInCol: number[] = [];
              for (let r = 0; r < ROWS; r++) {
                if (wins.includes(`${r}-${c}`)) {
                  expRowsInCol.push(r);
                }
              }
              if (expRowsInCol.length === 0) continue; // No cells exploded in this column

              const maxExpRow = Math.max(...expRowsInCol);
              const expCount = expRowsInCol.length;

              // Only rows 0 through maxExpRow tumble down
              for (let r = 0; r <= maxExpRow; r++) {
                dropsMap[`${r}-${c}`] = expCount;
              }
            }

            // 5. Cascade drop: top symbols slide down and new symbols land from above
            setDroppingCells(dropsMap);
            setGrid(step.newGrid);
            setMultGrid(step.newMultGrid || Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
            await new Promise(r => setTimeout(r, dropDelay));
            setDroppingCells({});
            await new Promise(r => setTimeout(r, settleDelay));
          }
        }

        // Tumble selesai -> Aktifkan pengali petir Gatotkaca jika ada kemenangan
        setIsSpinning(false);
        spinningColsRef.current = Array(COLS).fill(false);
        setSpinningCols(Array(COLS).fill(false));
        const applied = applySlotResultBalance(data);
        setMyCoins(data.newBalance != null ? data.newBalance : applied.total);
        setTotalWin(data.totalWinAmount || 0);
        setScatterCount(data.scatterCount || 0);

        const appliedMult = data.appliedMultiplier || 1;
        const orbsSum = data.roundOrbsSum || 0;
        const isFreeRound = freeSpinsLeftRef.current > 0;

        if (isFreeRound) {
          setFreeMultVal(data.freeMult || 1);
        }

        if (data.totalWinAmount > 0) {
          if (appliedMult > 1 || orbsSum > 0) {
            setCurrentMultiplier(appliedMult);
            const isLegendary = appliedMult >= 500;
            setDroppedMultNotif(
              isLegendary
                ? `⚡🔥 SULTAN GATOTKACA 1000! TOTAL PENGALI ${appliedMult}x! 🔥⚡`
                : `⚡ PETIR GATOTKACA! TOTAL PENGALI ${appliedMult}x! ⚡`
            );
            setTimeout(() => setDroppedMultNotif(null), 3000);
            setStatusText(`TOTAL MENANG: ${Math.floor(data.totalWinAmount).toLocaleString('id-ID')} (${appliedMult}x)`);
          } else {
            setCurrentMultiplier(1);
            setStatusText(`TOTAL MENANG: ${Math.floor(data.totalWinAmount).toLocaleString('id-ID')}`);
          }
        } else {
          if (!isFreeRound) setCurrentMultiplier(1);
          setStatusText('GOOD LUCK');
        }

        let totalFree = freeSpinsLeftRef.current;
        const currentBet = betAmountRef.current || MIN_SLOT_BET;
        if (data.triggerFreeSpins) {
          totalFree += data.freeSpinsAwarded;
          setFreeSpinsLeft(totalFree);
          setCelebration({
            type: 'scatter',
            freeSpinsCount: data.freeSpinsAwarded || (isFreeRound ? 5 : 15),
            title: isFreeRound ? '⚡ +5 FREE SPINS! ⚡' : '⚡ SCATTER GATOTKACA! ⚡',
            subtext: isFreeRound
              ? `LUAR BIASA! 3+ SCATTER MEMBERIKAN +${data.freeSpinsAwarded || 5} PUTARAN GRATIS TAMBAHAN!`
              : `SELAMAT! KAMU MEMICU ${data.freeSpinsAwarded || 15} PUTARAN GRATIS!`
          });
        } else if (data.totalWinAmount > 0) {
          const ratio = data.totalWinAmount / Math.max(1, currentBet);
          if (ratio >= 30) {
            setCelebration({ type: 'super_win', amount: data.totalWinAmount });
          } else if (ratio >= 12) {
            setCelebration({ type: 'mega_win', amount: data.totalWinAmount });
          } else if (ratio >= 5) {
            setCelebration({ type: 'big_win', amount: data.totalWinAmount });
          }
        }

        const hasCelebration = data.triggerFreeSpins || (data.totalWinAmount > 0 && (data.totalWinAmount / Math.max(1, currentBet)) >= 5);
        const nextDelay = hasCelebration ? 3900 : Math.max(250, 1000 / spd);

        if (autoSpinsRef.current > 1 || totalFree > 0) {
          if (autoSpinsRef.current > 1) setAutoSpins(a => a - 1);
          if (totalFree > 0) setFreeSpinsLeft(f => f - 1);
          setTimeout(() => doSpinRef.current?.(), nextDelay);
        } else if (autoSpinsRef.current === 1) {
          setAutoSpins(0);
        }
      }, allReelsSettledTime);
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

    socket.on('gatokaca_result', handleResult);
    socket.on('gatokaca_error', handleError);
    return () => {
      socket.off('gatokaca_result', handleResult);
      socket.off('gatokaca_error', handleError);
    };
  }, [socket]);

  const handleBuyFreeSpin = () => {
    if (anteMode) {
      alert('Nonaktifkan Taruhan Ganda untuk Membeli Spin Gratis!');
      return;
    }
    if (isSpinning) return;
    const cost = betAmount * 100;
    if (myCoins < cost) {
      alert(`Koin tidak cukup untuk beli Spin Gratis! Butuh ${cost.toLocaleString('id-ID')} koin.`);
      return;
    }
    const res = spendSlotCoinsLocal(cost);
    setMyCoins(res.total);
    syncSlotBetToBackend(API_URL, username, cost);
    setFreeSpinsLeft(15);
    freeSpinsLeftRef.current = 15;
    setFreeMultVal(1);
    setCurrentMultiplier(1);
    setStatusText('15 FREE SPINS DIMULAI!');
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
    if (freeSpinsLeftRef.current === 0 && myCoins < actualBet) {
      alert(`Koin tidak cukup! Taruhan: ${actualBet.toLocaleString('id-ID')} koin.`);
      setAutoSpins(0);
      return;
    }

    if (freeSpinsLeftRef.current === 0) {
      const res = spendSlotCoinsLocal(actualBet);
      setMyCoins(res.total);
    }

    setIsSpinning(true);
    spinningColsRef.current = Array(COLS).fill(true);
    setSpinningCols(Array(COLS).fill(true));
    setTotalWin(0);
    if (freeSpinsLeftRef.current === 0) {
      setCurrentMultiplier(1);
      setFreeMultVal(1);
    }
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

    socket.emit('spin_gatokaca', {
      username,
      betAmount, // base bet for payouts
      actualBet, // deduction
      isFreeSpins: freeSpinsLeftRef.current > 0,
      anteMode,
      clientBalance: myCoins
    });
  };
  doSpinRef.current = doSpin;

  const renderSymbol = (symId: number | null | undefined, multVal: number, isWin: boolean, isExplode: boolean, isDrop: boolean = false, dropDist: number = 1) => {
    if (symId === null || symId === undefined) {
      return <div className="gato-tile gato-tile-empty" style={{ opacity: 0, pointerEvents: 'none' }} />;
    }

    const winCls = isWin    ? 'gato-tile-win'    : '';
    const expCls = isExplode? 'gato-tile-explode' : '';
    const dropCls = isDrop  ? 'gato-tile-dropping' : '';
    const sym = GATO_SYMBOLS[symId] || GATO_SYMBOLS[4];

    /* ── MULTIPLIER ORB (AUTHENTIC WINGED ORB FROM PRAGMATIC PLAY) ──────── */
    if (symId === 10) {
      const v = multVal > 0 ? multVal : 2;
      const orbImg = v >= 50
        ? '/assets/orbs/orb_red.png'
        : v >= 15
        ? '/assets/orbs/orb_purple.png'
        : v >= 6
        ? '/assets/orbs/orb_blue.png'
        : '/assets/orbs/orb_green.png';

      const is1000 = v >= 1000;
      const is500 = v >= 500;

      return (
        <div className={`gato-tile ${winCls} ${expCls} ${dropCls}`} style={{ background: 'none', border: 'none', boxShadow: 'none', ['--drop-dist' as any]: dropDist }}>
          <div className="gato-orb-real-wrap">
            <img
              src={orbImg}
              alt={`Multiplier ${v}x`}
              className={`gato-orb-real-img ${is1000 ? 'gato-orb-1000-img' : is500 ? 'gato-orb-500-img' : ''}`}
            />
            <span className={`gato-orb-real-val ${is1000 ? 'gato-orb-val-1000' : ''}`}>{v}x</span>
          </div>
        </div>
      );
    }

    /* ── SCATTER (Gatokaca Face Image) ──────────────────── */
    if (symId === 9) {
      return (
        <div className={`gato-tile gato-sym-img-wrap ${winCls} ${expCls} ${dropCls}`} style={{ ['--drop-dist' as any]: dropDist }}>
          <img
            src="/assets/gatokaca/sym_scatter.png"
            alt="SCATTER"
            className="gato-sym-img"
            draggable={false}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/gatokaca/test_defringed.png';
            }}
          />
        </div>
      );
    }

    /* ── REGULAR SYMBOLS (0-8) ───────────────────────────── */
    if (sym.img) {
      return (
        <div className={`gato-tile gato-sym-img-wrap ${winCls} ${expCls} ${dropCls}`} style={{ ['--drop-dist' as any]: dropDist }}>
          <img
            src={sym.img}
            alt={sym.label}
            className="gato-sym-img"
            draggable={false}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/gatokaca/sym_ruby_ring.png';
            }}
          />
        </div>
      );
    }

    return (
      <div className={`gato-tile ${winCls} ${expCls} ${dropCls}`} style={{ ['--drop-dist' as any]: dropDist }}>
        <span>💎</span>
      </div>
    );
  };

  return (
    <div className="gato-screen">
      {/* TEMPLE BACKGROUND */}
      <div className="gato-bg">
        <div className="gato-bg-sky" />
        <div className="gato-bg-columns-left">
          <div className="gato-pillar gato-pillar-l1" />
          <div className="gato-pillar gato-pillar-l2" />
        </div>
        <div className="gato-bg-columns-right">
          <div className="gato-pillar gato-pillar-r1" />
          <div className="gato-pillar gato-pillar-r2" />
        </div>
        <div className="gato-bg-floor" />
      </div>

      {/* TOP LEFT: Avatar + coins */}
      <div className="gato-topleft">
        <div className="gato-avatar-wrap g-btn-press" onClick={() => setShowProfileModal(true)} title="Lihat Profil VIP" style={{ cursor: 'pointer' }}>
          <div style={{ width: 'max(42px, 9.5vh)', height: 'max(42px, 9.5vh)', minWidth: '42px', minHeight: '42px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.38vh solid #ffd700', boxShadow: '0 0 1.4vh rgba(0,0,0,0.7)', background: 'radial-gradient(circle, #4e2f96, #120924)', flexShrink: 0 }}>
            {renderSlotAvatar(userProfile.avatar, 'gato-avatar-img', '🐸')}
          </div>
          <div className="gato-level-badge">Lv.{userProfile.level}</div>
          <div className="gato-vip-badge">VIP {userProfile.vipLevel}</div>
        </div>
        <div className="gato-coins-row">
          <span className="gato-coin-ico">🪙</span>
          <span className="gato-coins-num">{(myCoins || 0).toLocaleString('id-ID')}</span>
          <button className="gato-plus-btn" onClick={() => alert('Top Up Koin')}>+</button>
        </div>
      </div>

      {/* TOP CENTER: Sleek Pragmatic info badge - unblocks middle of the screen */}
      <div className="gato-top-info">
        <div className="gato-top-info-text">{statusText || 'SIMBOL MEMBAYAR DI MANA SAJA'}</div>
      </div>

      {/* TOP RIGHT */}
      <div className="gato-topright">
        <button className="gato-tr-btn" onClick={() => setShowLeaderboard(true)}>🏆</button>
        
        <button className="gato-tr-btn gato-tr-menu-btn" style={{ position: 'relative' }} onClick={() => setShowMenu(v => !v)} title="Menu">≡</button>

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
      <div className="gato-main-area">

        {/* LEFT PANEL */}
        <div className="gato-left-panel">
          {/* Buy Spin */}
          <div 
            className={`gato-buy-spin ${anteMode ? 'disabled' : ''}`} 
            onClick={handleBuyFreeSpin}
            title={anteMode ? 'Nonaktif saat Taruhan Ganda aktif' : 'Beli Spin Gratis'}
          >
            <div className="gato-bs-circle">
              <div className="gato-bs-title">BELI<br/>SPIN<br/>GRATIS</div>
              <div className="gato-bs-amount">
                {(() => {
                  const cost = (betAmount || MIN_SLOT_BET) * 100;
                  if (cost >= 1e9) return (cost / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
                  if (cost >= 1e6) return (cost / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
                  if (cost >= 1e3) return (cost / 1e3).toFixed(0) + 'K';
                  return cost.toLocaleString('id-ID');
                })()}
              </div>
            </div>
          </div>

          {/* TOTAL PENGALI (SIDE MULTIPLIER) - AUTHENTIC PRAGMATIC PLAY WIDGET */}
          {(() => {
            const isFree = freeSpinsLeft > 0;
            const displayMult = isFree
              ? Math.max(1, freeMultVal, currentMultiplier)
              : Math.max(1, currentMultiplier);
            return (
              <div className={`gato-side-multiplier ${isFree ? 'is-free-spin' : ''} ${displayMult > 1 ? 'is-active' : ''}`}>
                <div className="gsm-wing-top">✦ ✦ ✦</div>
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

          {/* Ransel */}
          <div className="gato-ransel" onClick={() => alert('Ransel')}>
            <div className="gato-ransel-img">🎒</div>
            <div className="gato-ransel-label">RANSEL</div>
          </div>

          {/* Taruhan panel */}
          <div className="gato-taruhan-panel">
            <div className="gato-tp-title">TARUHAN</div>
            <div className="gato-tp-amount">
              {(() => {
                const anteAmt = Math.floor((betAmount || MIN_SLOT_BET) * 1.25);
                if (anteAmt >= 1e9) return (anteAmt / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
                if (anteAmt >= 1e6) return (anteAmt / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
                if (anteAmt >= 1e3) return (anteAmt / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
                return anteAmt.toLocaleString('id-ID');
              })()}
            </div>
            <div className="gato-tp-sub">FITUR</div>
            <div className="gato-tp-sub2">GANDA</div>
            <div className="gato-tp-sub3">PELUANG MENANG 2X</div>
            <div
              className={`gato-toggle ${anteMode ? 'on' : 'off'}`}
              onClick={() => setAnteMode(v => !v)}
            >
              <div className="gato-toggle-knob" />
              <span>{anteMode ? 'ON' : 'OFF'}</span>
            </div>
          </div>
        </div>

        {/* GRID */}
        <div className="gato-grid-wrap">
          {/* Floating Drop Notification Banner */}
          {droppedMultNotif && (
            <div className="gato-mult-drop-banner">{droppedMultNotif}</div>
          )}

          {/* Free Spins Banner */}
          {freeSpinsLeft > 0 && (
            <div className="gato-fs-banner">🌟 FREE SPIN: {freeSpinsLeft} 🌟</div>
          )}

          <div className="gato-grid-frame">
            <div className="gato-grid-inner">
              {Array.from({length: ROWS}, (_, r) =>
                Array.from({length: COLS}, (_, c) => {
                  const symId = grid[r]?.[c];
                  const multVal = multGrid[r]?.[c] ?? 0;
                  const cellKey = `${r}-${c}`;
                  const isWin = winningCells.includes(cellKey);
                  const isExp = explodingCells.includes(cellKey);
                  const dropDist = droppingCells[cellKey] || 0;
                  const isDropping = dropDist > 0;
                  return (
                    <div key={cellKey} style={{ ['--r' as any]: r }} className={`gato-cell ${spinningCols[c] ? 'gato-cell-spin' : ''} ${bouncingCols[c] ? 'gato-cell-bounce' : ''}`}>
                      {renderSymbol(symId === 10 && multVal === 0 ? 10 : symId, multVal, isWin, isExp, isDropping, dropDist)}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Gatotkaca Hero Character */}
        <div className="gato-right-panel">
         
        </div>
      </div>

      {/* PRAGMATIC / HIGGS GOLDEN BOTTOM BAR */}
      <div className="gato-bottom-bar notranslate" translate="no">
        <div className="gato-bot-left">
          <button className="gato-bot-btn" onClick={() => setShowMenu(v => !v)}>
            ≡
          </button>
          <button className="gato-bot-btn" onClick={() => setSoundOn(v => !v)}>
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button className="gato-bot-btn gato-btn-info" onClick={() => { setShowRules(true); setRulesPage(0); }}>
            i
          </button>
          <button className="gato-bot-btn gato-minus" onClick={() => setBetAmount(b => stepSlotBet(b, -1))}>
            −
          </button>
          <div className="gato-bet-box">
            <div className="gato-bet-label">BET</div>
            <div className="gato-bet-val">{(betAmount || MIN_SLOT_BET).toLocaleString('en-US')}</div>
          </div>
          <button className="gato-bot-btn gato-plus-bet" onClick={() => setBetAmount(b => stepSlotBet(b, 1))}>
            +
          </button>
        </div>

        <div className="gato-bot-center">
          <div className="gato-win-banner">
            <div className="gato-win-label">WIN</div>
            <div className="gato-win-val">
              {totalWin > 0 
                ? Math.floor(totalWin).toLocaleString('en-US') 
                : (isSpinning ? '...' : (betAmount || MIN_SLOT_BET).toLocaleString('en-US'))}
            </div>
          </div>
        </div>

        <div className="gato-bot-right">
          <button className="gato-maxbet-btn" onClick={() => setBetAmount(MAX_SLOT_BET)}>
            <span>MAX</span>
            <span>BET</span>
          </button>
          <SlotSpeedButton
            speed={spinSpeed}
            onSpeedChange={setSpinSpeed}
            className="gato-speed-btn"
            theme="gold"
          />
          <div style={{ position: 'relative' }}>
            {showAutoMenu && (
              <div className="gato-auto-menu">
                {[10, 50, 100].map(n => (
                  <button key={n} onClick={() => { setAutoSpins(n); setShowAutoMenu(false); doSpin(); }}>{n} SPIN</button>
                ))}
                <button onClick={() => { setAutoSpins(99999); setShowAutoMenu(false); doSpin(); }}>∞</button>
              </div>
            )}
            <button
              className={`gato-spin-btn ${isSpinning ? 'gato-spin-anim' : ''}`}
              onMouseDown={(e) => {
                if (e.button !== 0) return; // Only left click
                if (isSpinning || autoSpins > 0) { 
                  setAutoSpins(0); 
                  isStoppingRef.current = true;
                  return; 
                }
                isStoppingRef.current = false;
                spinPressTimer.current = setTimeout(() => setShowAutoMenu(true), 400);
              }}
              onMouseUp={() => {
                clearTimeout(spinPressTimer.current);
                if (isStoppingRef.current) {
                  isStoppingRef.current = false;
                  return;
                }
                if (!isSpinning && autoSpins === 0 && !showAutoMenu) doSpin();
              }}
              onMouseLeave={() => {
                clearTimeout(spinPressTimer.current);
                isStoppingRef.current = false;
              }}
              onTouchStart={() => {
                if (isSpinning || autoSpins > 0) { 
                  setAutoSpins(0); 
                  isStoppingRef.current = true;
                  return; 
                }
                isStoppingRef.current = false;
                spinPressTimer.current = setTimeout(() => setShowAutoMenu(true), 400);
              }}
              onTouchEnd={(e) => {
                e.preventDefault(); // Prevent ghost clicks
                clearTimeout(spinPressTimer.current);
                if (isStoppingRef.current) {
                  isStoppingRef.current = false;
                  return;
                }
                if (!isSpinning && autoSpins === 0 && !showAutoMenu) doSpin();
              }}
              onContextMenu={e => { e.preventDefault(); setShowAutoMenu(v => !v); }}
            >
              <div className="gato-spin-title">
                {isSpinning ? 'STOP' : 'SPIN'}
              </div>
              <div className="gato-spin-sub">
                {autoSpins > 0 ? (
                  <span className="gato-auto-sub-badge">{autoSpins > 90000 ? 'AUTO ∞' : `AUTO: ${autoSpins}`}</span>
                ) : (
                  isSpinning ? 'BERHENTI' : 'HOLD FOR AUTO'
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}

      {/* RULES MODAL */}
      {showRules && (
        <div className="gato-modal-overlay" onClick={() => setShowRules(false)}>
          <div className="gato-modal" onClick={e => e.stopPropagation()}>
            {rulesPage === 0 && (
              <div className="gato-rules-page">
                <h2>ATURAN PERMAINAN GATOT KACA 1000</h2>
                <p className="gato-rules-desc">
                  SISTEM SCATTER PAYS (GRID 6 × 5): Delapan (8) atau lebih simbol sejenis di mana saja pada layar membentuk kombinasi kemenangan.
                  Tabel di bawah otomatis menampilkan nilai pembayaran berdasarkan taruhan saat ini ({betAmount.toLocaleString('id-ID')} koin):
                </p>
                <div className="gato-paytable">
                  {[0,1,2,3,4,5,6,7,8].map(sid => {
                    const sym = GATO_SYMBOLS[sid];
                    const PT_PAYS: Record<number, { p12: number; p10: number; p8: number }> = {
                      0: { p12: 50,  p10: 25,   p8: 10   },
                      1: { p12: 25,  p10: 10,   p8: 2.5  },
                      2: { p12: 15,  p10: 5,    p8: 2    },
                      3: { p12: 12,  p10: 2,    p8: 1.5  },
                      4: { p12: 10,  p10: 1.5,  p8: 1    },
                      5: { p12: 8,   p10: 1.2,  p8: 0.8  },
                      6: { p12: 5,   p10: 1,    p8: 0.5  },
                      7: { p12: 4,   p10: 0.9,  p8: 0.4  },
                      8: { p12: 2,   p10: 0.75, p8: 0.25 },
                    };
                    const p = PT_PAYS[sid] || { p12: 2, p10: 1, p8: 0.5 };
                    const f = (m: number) => {
                      const v = Math.floor(betAmount * m);
                      if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace(/\.0$/, '')}B (${m}x)`;
                      if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M (${m}x)`;
                      if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K (${m}x)`;
                      return `${v.toLocaleString('id-ID')} (${m}x)`;
                    };

                    return (
                      <div key={sid} className="gato-pt-row">
                        <span className="gato-pt-emoji">
                          {sym?.img ? (
                            <img src={sym.img} alt={sym.label} style={{ width: '4.5vh', height: '4.5vh', objectFit: 'contain' }} />
                          ) : (
                            sym?.label || '💎'
                          )}
                        </span>
                        <div className="gato-pt-pays">
                          <div>12-30: {f(p.p12)}</div>
                          <div>10-11: {f(p.p10)}</div>
                          <div>8-9: {f(p.p8)}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="gato-pt-row gato-pt-scatter">
                    <span className="gato-pt-emoji">
                      <img src="/assets/gatokaca/sym_scatter.png" alt="SCATTER" style={{ width: '4.5vh', height: '4.5vh', objectFit: 'contain' }} />
                    </span>
                    <div className="gato-pt-pays gato-scatter-pays">
                      <div>6+: {Math.floor(betAmount * 100).toLocaleString('id-ID')} (100x)</div>
                      <div>5: {Math.floor(betAmount * 5).toLocaleString('id-ID')} (5x)</div>
                      <div>4: {Math.floor(betAmount * 3).toLocaleString('id-ID')} (3x)</div>
                    </div>
                    <div className="gato-pt-scatter-desc">
                      <div>Simbol SCATTER Gatot Kaca muncul di semua rol.</div>
                      <div>Membayar di posisi apa pun tanpa harus segaris.</div>
                      <div>4 atau lebih Scatter memicu 15 PUTARAN GRATIS!</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {rulesPage === 1 && (
              <div className="gato-rules-page">
                <h2>FITUR TUMBLE & PENGALI 2x - 1.000x</h2>
                <p>FITUR TUMBLE: Setelah setiap spin, kombinasi simbol yang menang dibayar dan meledak menghilang. Simbol di atasnya jatuh mengisi ruang kosong dan simbol baru turun dari atas. Runtuhan berlanjut tanpa batas hingga tidak ada lagi kombinasi kemenangan baru.</p>
                <div className="gato-math-formula-card">
                  <div className="gato-math-formula-title">PERHITUNGAN PENGALI (MATEMATIKA RESMI PRAGMATIC PLAY)</div>
                  <div className="gato-math-formula-eq">M_total = M₁ + M₂ + ... + Mₙ</div>
                  <div className="gato-math-formula-sub">
                    Contoh: <strong>20x + 10x + 5x = 35x</strong> Total Pengali!<br />
                    Jumlah seluruh bola pengali yang muncul dalam satu rangkaian jatuhan dijumlahkan, lalu diterapkan pada total kemenangan runtuhan.
                  </div>
                </div>
                <div className="gato-mult-orbs" style={{ display: 'flex', gap: '2vw', alignItems: 'center', justifyContent: 'center', margin: '2vh 0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <img src="/assets/orbs/orb_green.png" alt="2x-5x" style={{ width: '9vh', height: '7vh', objectFit: 'contain' }} />
                    <div style={{ color: '#81c784', fontSize: '1.4vh', fontWeight: 'bold' }}>2x - 5x</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <img src="/assets/orbs/orb_blue.png" alt="6x-12x" style={{ width: '9vh', height: '7vh', objectFit: 'contain' }} />
                    <div style={{ color: '#64b5f6', fontSize: '1.4vh', fontWeight: 'bold' }}>6x - 12x</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <img src="/assets/orbs/orb_purple.png" alt="15x-25x" style={{ width: '9vh', height: '7vh', objectFit: 'contain' }} />
                    <div style={{ color: '#ba68c8', fontSize: '1.4vh', fontWeight: 'bold' }}>15x - 25x</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <img src="/assets/orbs/orb_red.png" alt="50x-250x" style={{ width: '9vh', height: '7vh', objectFit: 'contain' }} />
                    <div style={{ color: '#e57373', fontSize: '1.4vh', fontWeight: 'bold' }}>50x - 250x</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <img src="/assets/orbs/orb_red.png" alt="500x-1000x" className="gato-orb-1000-img" style={{ width: '9vh', height: '7vh', objectFit: 'contain' }} />
                    <div style={{ color: '#ffd700', fontSize: '1.4vh', fontWeight: 'bold' }}>500x - 1.000x!</div>
                  </div>
                </div>
                <p>Simbol MULTIPLIER muncul acak di semua rol pada permainan dasar maupun ronde Putaran Gratis. Setiap simbol membawa nilai pengali dari <strong>2x sampai 1.000x</strong>!</p>
              </div>
            )}
            {rulesPage === 2 && (
              <div className="gato-rules-page">
                <h2>FITUR PUTARAN GRATIS (FREE SPINS)</h2>
                <p>Fitur Putaran Gratis diberikan ketika 4 atau lebih simbol SCATTER muncul di mana saja di layar (diawali dengan <strong>15 Putaran Gratis</strong>).</p>
                <div className="gato-math-formula-card" style={{ borderColor: '#64b5f6' }}>
                  <div className="gato-math-formula-title" style={{ color: '#90caf9' }}>AKUMULASI TOTAL PENGALI (BANK MULTIPLIER)</div>
                  <div className="gato-math-formula-sub" style={{ fontSize: '1.7vh' }}>
                    Selama ronde Putaran Gratis, setiap kali simbol Pengali muncul dan menghasilkan kemenangan, nilai pengali tersebut <strong>diakumulasikan ke Total Pengali</strong> yang tersimpan.<br />
                    Total pengali ini terus aktif dan melipatgandakan seluruh kemenangan berikutnya selama ronde bonus!
                  </div>
                </div>
                <div className="gato-math-formula-card" style={{ borderColor: '#ffd700', marginTop: '1vh' }}>
                  <div className="gato-math-formula-title" style={{ color: '#ffd700' }}>⚡ RE-TRIGGER PUTARAN GRATIS: +5 EXTRA SPINS! ⚡</div>
                  <div className="gato-math-formula-sub" style={{ fontSize: '1.7vh' }}>
                    Mendapatkan <strong>3 atau lebih simbol SCATTER</strong> selama ronde Putaran Gratis akan secara otomatis memberikan <strong>+5 Putaran Gratis tambahan</strong>!
                  </div>
                </div>
                <p style={{ marginTop: '1.5vh' }}>
                  <strong>BATAS KEMENANGAN MAKSIMAL (MAX WIN):</strong> Kemenangan maksimal dibatasi hingga <strong>15.000X taruhan</strong> (Gates of Gatot Kaca 1000). Jika total kemenangan mencapai 15.000x, ronde bonus segera selesai dan sisa putaran gratis hangus.
                </p>
              </div>
            )}
            {rulesPage === 3 && (
              <div className="gato-rules-page">
                <h2>RTP, VOLATILITAS & FITUR TARUHAN</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5vh', margin: '1.5vh 0' }}>
                  <div className="gato-math-formula-card" style={{ margin: 0, textAlign: 'left' }}>
                    <div className="gato-math-formula-title" style={{ color: '#81c784' }}>📊 RTP & VOLATILITAS</div>
                    <div className="gato-math-formula-sub" style={{ fontSize: '1.5vh' }}>
                      • <strong>RTP (Return to Player):</strong> Perkiraan teoretis statistik jangka panjang.<br />
                      • <strong>Volatilitas Sangat Tinggi:</strong> Hasil berfluktuasi tinggi. Kemenangan besar dapat terjadi dalam waktu singkat.
                    </div>
                  </div>
                  <div className="gato-math-formula-card" style={{ margin: 0, textAlign: 'left' }}>
                    <div className="gato-math-formula-title" style={{ color: '#ffb74d' }}>⚡ PENGALI MAKSIMUM 1.000X</div>
                    <div className="gato-math-formula-sub" style={{ fontSize: '1.5vh' }}>
                      Batas pengali yang dapat turun mencapai 1.000x dalam satu simbol. Hasil setiap putaran ditentukan secara acak dan independen.
                    </div>
                  </div>
                </div>
                <h3 style={{ color: '#ffd700', marginTop: '1.5vh' }}>TARUHAN ANTE (PENGALI TARUHAN 25X)</h3>
                <p>Pemain memiliki opsi mengaktifkan Taruhan Ante (+25% biaya taruhan). Peluang memicu Putaran Gratis secara alami <strong>meningkat 2x lipat</strong> dengan kemunculan Scatter yang lebih sering. Fitur Beli Spin dinonaktifkan saat fitur ini aktif.</p>
                <h3 style={{ color: '#ffd700', marginTop: '1.5vh' }}>BELI PUTARAN GRATIS (BUY FREE SPINS)</h3>
                <p>Fitur Putaran Gratis dapat langsung dibeli dari permainan dasar seharga <strong>100x total taruhan</strong> untuk memulai 15 Putaran Gratis secara instan.</p>
              </div>
            )}

            {/* Pagination */}
            <div className="gato-rules-nav">
              <button className="gato-nav-arrow" onClick={() => setRulesPage(p => Math.max(0, p - 1))}>❮</button>
              <button className="gato-nav-back" onClick={() => setShowRules(false)}>KEMBALI KE GAME</button>
              <button className="gato-nav-arrow" onClick={() => setRulesPage(p => Math.min(3, p + 1))}>❯</button>
            </div>
            <div className="gato-rules-dots">
              {[0,1,2,3].map(i => (
                <div key={i} className={`gato-dot ${i === rulesPage ? 'active' : ''}`} onClick={() => setRulesPage(i)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Win & Scatter Celebration Modal */}
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
