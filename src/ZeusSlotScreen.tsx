import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import SlotMultiplierBar from './SlotMultiplierBar';
import GameMenuDropdown from './GameMenuDropdown';
import SlotCelebrationModal, { SlotCelebrationData } from './SlotCelebrationModal';
import SlotProfileModal, { renderSlotAvatar } from './SlotProfileModal';
import { useSlotProfile } from './useSlotProfile';
import { MIN_SLOT_BET, MAX_SLOT_BET, stepSlotBet, getSlotCoins, spendSlotCoinsLocal, applySlotResultBalance, syncSlotBetToBackend } from './slotConfig';
import SlotSpeedButton from './SlotSpeedButton';
import './gatokaca.css';
import './App.css'; // Make sure we use the old CSS

interface Props {
  onBack: () => void;
  socket: Socket | null;
}

import { API_URL } from './config';

const ZEUS_SYMS  = ['♦️','🔺','🟡','🟩','🔷','👑','⏳','💍','🏆','👴'];
const ZEUS_COLORS = ['#ff2a2a','#d822ee','#ffea00','#00e676','#00b0ff','#ffd700','#cccccc','#ffd700','#ffd700','#ffffff'];
const ROWS = 5;
const COLS = 6;
const initGrid = () => Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => Math.floor(Math.random() * 9)));

const ZEUS_ICONS: Record<number, { img: string; name: string; label: string }> = {
  0: { img: '/icon zeus/1000118696.png', name: 'crown',     label: 'Mahkota Emas' },
  1: { img: '/icon zeus/1000118697.png', name: 'hourglass', label: 'Jam Pasir' },
  2: { img: '/icon zeus/1000118698.png', name: 'ring',      label: 'Cincin Ruby' },
  3: { img: '/icon zeus/1000118699.png', name: 'goblet',    label: 'Cawan Emas' },
  4: { img: '/icon zeus/1000118700.png', name: 'red',       label: 'Permata Merah' },
  5: { img: '/icon zeus/1000118701.png', name: 'purple',    label: 'Permata Ungu' },
  6: { img: '/icon zeus/1000118702.png', name: 'yellow',    label: 'Permata Kuning' },
  7: { img: '/icon zeus/1000118703.png', name: 'green',     label: 'Permata Hijau' },
  8: { img: '/icon zeus/1000118704.png', name: 'blue',      label: 'Permata Biru' },
  9: { img: '/icon zeus/1000118705.png', name: 'scatter',   label: 'SCATTER' },
};

const ZEUS_GEMS: { shape: string; color: string }[] = [
  { shape: 'diamond',  color: 'blue'   }, // 0
  { shape: 'tri',      color: 'green'  }, // 1
  { shape: 'hex',      color: 'gold'   }, // 2
  { shape: 'pentagon', color: 'red'    }, // 3
  { shape: 'circle',   color: 'purple' }, // 4  ring
  { shape: 'hex',      color: 'gold'   }, // 5  cup/goblet
  { shape: 'pentagon', color: 'gold'   }, // 6  crown
  { shape: 'circle',   color: 'gold'   }, // 7  hourglass
  { shape: 'diamond',  color: 'purple' }, // 8  extra
];
 
export default function ZeusSlotScreen({ onBack, socket }: Props) {
  const userProfile = useSlotProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const myUsername = localStorage.getItem('domino_username') || '';
  const [myCoins,  setMyCoins]  = useState<number>(() => {
    const slotCoins = getSlotCoins();
    return slotCoins.total > 0 ? slotCoins.total : 100000;
  });
  const [betAmount, setBetAmount] = useState(MIN_SLOT_BET);
  const [anteBet, setAnteBet] = useState(false);
  const [grid, setGrid] = useState<number[][]>(initGrid());
  const [prevGrid, setPrevGrid] = useState<number[][]>(initGrid());
  const [isSpinning, setIsSpinning] = useState(false);
  // Set of column indices (0-5) currently spinning
  const [spinningCols, setSpinningCols] = useState<Set<number>>(new Set());
  // Set of column indices (0-5) currently playing landing bounce
  const [bouncingCols, setBouncingCols] = useState<Set<number>>(new Set());
  // Winning positions that are currently exploding/vanishing
  const [explodingPos, setExplodingPos] = useState<Set<string>>(new Set());
  // Per-cell drop distance for tumble gravity cascade
  const [droppingCells, setDroppingCells] = useState<Record<string, number>>({});
  const [winPos,    setWinPos]    = useState<Set<string>>(new Set());
  const [totalWin,  setTotalWin]  = useState(0);
  const [showWin,   setShowWin]   = useState(false);
  const [winType,   setWinType]   = useState('normal');
  const [showRules, setShowRules] = useState(false);
  const [rulesPage, setRulesPage] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const spinStartTime = useRef(0);
  const [freeSpins, setFreeSpins] = useState(0);
  const [inFreeMode, setInFreeMode] = useState(false);
  const [freeMult,  setFreeMult]  = useState(1);
  const [multIdx, setMultIdx] = useState(0); // tangga x1>x2>x3>x5 (per tumble)
  const [showFSModal, setShowFSModal] = useState(false);
  const [clusterWins, setClusterWins] = useState<{ sym: number; count: number; winAmount: number; tumble?: number }[]>([]);
  const [multGrid, setMultGrid] = useState<number[][]>(() => Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0)));
  const [droppedMultNotif, setDroppedMultNotif] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<SlotCelebrationData | null>(null);
  const [autoCount, setAutoCount] = useState(0);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const betAmountRef = useRef(betAmount);
  useEffect(() => { betAmountRef.current = betAmount; }, [betAmount]);

  const autoCountRef = useRef(autoCount);
  useEffect(() => { autoCountRef.current = autoCount; }, [autoCount]);

  const freeSpinsRef = useRef(freeSpins);
  useEffect(() => { freeSpinsRef.current = freeSpins; }, [freeSpins]);

  const inFreeModeRef = useRef(inFreeMode);
  useEffect(() => { inFreeModeRef.current = inFreeMode; }, [inFreeMode]);

  const isStoppingRef = useRef(false);
  const isLongPressRef = useRef(false);
  const isInfiniteAutoRef = useRef(false);
  const isQuickStopRequested = useRef(false);
  const doSpinRef = useRef<(() => void) | null>(null);

  const spinTimer = useRef<any>(null);
  const spinDelay = useRef<any>(null);
  const autoTimerRef = useRef<any>(null);
  const activeTimersRef = useRef<any[]>([]);
  const skipSpinRef = useRef<(() => void) | null>(null);
  const pressTimer = useRef<any>(null);

  // Ref mirror of spinningCols for synchronous reads inside setInterval
  const spinningColsRef = useRef<Set<number>>(new Set());

  const safeTimeout = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      activeTimersRef.current = activeTimersRef.current.filter(id => id !== t);
      fn();
    }, ms);
    activeTimersRef.current.push(t);
    return t;
  };

  const clearAllSlotTimers = () => {
    activeTimersRef.current.forEach(t => clearTimeout(t));
    activeTimersRef.current = [];
    if (spinTimer.current) clearTimeout(spinTimer.current);
    if (spinDelay.current) clearTimeout(spinDelay.current);
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
  };

  const forceStopReels = (fallbackGrid?: number[][], errorMsg?: string) => {
    clearAllSlotTimers();
    setIsSpinning(false);
    spinningColsRef.current = new Set();
    setSpinningCols(new Set());
    setBouncingCols(new Set());
    setExplodingPos(new Set());
    setDroppingCells({});
    setWinPos(new Set());
    if (fallbackGrid) {
      setGrid(fallbackGrid);
    }
    if (errorMsg) {
      setErrMsg(errorMsg);
      setTimeout(() => setErrMsg(''), 3000);
    }
  };

  useEffect(() => {
    if (!myUsername) return;
    fetch(`${API_URL}/profile/${myUsername}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.coins !== undefined) {
          const total = (d.coins || 0) + (d.bonusCoins || 0);
          setMyCoins(total);
          localStorage.setItem('domino_coins', (d.coins || 0).toString());
          localStorage.setItem('domino_bonus_coins', (d.bonusCoins || 0).toString());
        }
      })
      .catch(() => {});
  }, [myUsername]);

  // Keep ref in sync with state
  useEffect(() => {
    spinningColsRef.current = spinningCols;
  }, [spinningCols]);

  // Per-column symbol cycling during spin
  useEffect(() => {
    if (!isSpinning) return;
    const interval = setInterval(() => {
      setGrid(prev => {
        const cols = spinningColsRef.current;
        if (cols.size === 0) return prev; // nothing to update
        const next = prev.map(row => [...row]);
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (cols.has(c)) {
              next[r][c] = Math.floor(Math.random() * 9);
            }
          }
        }
        return next;
      });
    }, Math.max(40, 80 / speed));
    return () => clearInterval(interval);
  }, [isSpinning, speed]);
 
  // Mechanical reel stop sound (Web Audio API)
  const playReelStopSound = () => {
    try {
      if (!soundOn) return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = (window as any)._slotAudioCtx || new AudioCtx();
      (window as any)._slotAudioCtx = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch (e) {}
  };

  // Glass pop / shatter sound when winning symbols explode
  const playExplodeSound = () => {
    try {
      if (!soundOn) return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = (window as any)._slotAudioCtx || new AudioCtx();
      (window as any)._slotAudioCtx = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.32, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.17);
    } catch (e) {}
  };

  // Gravity drop thud sound when symbols fall into place
  const playDropThudSound = () => {
    try {
      if (!soundOn) return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = (window as any)._slotAudioCtx || new AudioCtx();
      (window as any)._slotAudioCtx = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(135, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.11);
      gain.gain.setValueAtTime(0.24, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  };

  useEffect(() => {
    if (!socket) return;
 
    const onResult = (data: any) => {
      if (spinTimer.current) clearTimeout(spinTimer.current);

      try {
        const finalGrid = (data.gridHistory && data.gridHistory.length > 0)
          ? data.gridHistory[0]
          : (data.grid || grid);

        if (data.multGrid) {
          setMultGrid(data.multGrid);
        } else if (data.randomMult) {
          const mg = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0));
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              if (finalGrid[r]?.[c] === 10) mg[r][c] = data.randomMult;
            }
          }
          setMultGrid(mg);
        }

        // If the user already requested STOP while waiting for server response:
        if (isStoppingRef.current || isQuickStopRequested.current) {
          isQuickStopRequested.current = false;
          finishSpin(data);
          return;
        }

        const spd = speedRef.current;
        const elapsed = Date.now() - spinStartTime.current;
        const minSpinMs = spd >= 10 ? 80 : spd >= 5 ? 130 : spd === 3 ? 200 : spd === 2 ? 350 : 650;
        const delay = Math.max(0, minSpinMs - elapsed);

        const stopDelay = spd >= 10 ? 20 : spd >= 5 ? 35 : spd === 3 ? 55 : spd === 2 ? 90 : 160;
        const bounceDuration = spd >= 10 ? 45 : spd >= 5 ? 80 : spd === 3 ? 140 : spd === 2 ? 220 : 340;

        let isSkipped = false;

        const execute = () => {
          if (isSkipped) return;

          // Wire skipSpinRef so pressing STOP during staggered stopping halts immediately
          skipSpinRef.current = () => {
            isSkipped = true;
            clearAllSlotTimers();
            spinningColsRef.current = new Set();
            setSpinningCols(new Set());
            setBouncingCols(new Set());
            if (data.finalGrid) setGrid(data.finalGrid);
            else if (data.gridHistory?.length > 0) setGrid(data.gridHistory[data.gridHistory.length - 1]);
            else setGrid(finalGrid);
            finishSpin(data);
            skipSpinRef.current = null;
          };

          // Staggered stop for cols 0..5
          [0, 1, 2, 3, 4, 5].forEach(col => {
            safeTimeout(() => {
              if (isSkipped) return;
              spinningColsRef.current.delete(col);

              setGrid(prev => {
                const next = prev.map(row => [...row]);
                for (let r = 0; r < ROWS; r++) {
                  if (finalGrid[r]?.[col] !== undefined) {
                    next[r][col] = finalGrid[r][col];
                  }
                }
                return next;
              });

              setSpinningCols(prev => {
                const next = new Set(prev);
                next.delete(col);
                return next;
              });

              setBouncingCols(prev => new Set(prev).add(col));
              playReelStopSound();
              safeTimeout(() => {
                setBouncingCols(prev => {
                  const next = new Set(prev);
                  next.delete(col);
                  return next;
                });
              }, bounceDuration);

              // Last column settled -> run tumble cascade
              if (col === 5) {
                safeTimeout(() => {
                  if (isSkipped) return;
                  runTumbleSequence().catch((e) => {
                    console.error('Error in runTumbleSequence:', e);
                    finishSpin(data);
                  });
                }, bounceDuration);
              }
            }, col * stopDelay);
          });
        };

        spinDelay.current = safeTimeout(execute, delay);

        skipSpinRef.current = () => {
          isSkipped = true;
          clearAllSlotTimers();
          if (data.finalGrid) setGrid(data.finalGrid);
          else if (data.gridHistory?.length > 0) setGrid(data.gridHistory[data.gridHistory.length - 1]);
          else setGrid(finalGrid);
          finishSpin(data);
          skipSpinRef.current = null;
        };

        const sleep = (ms: number) => new Promise(res => {
          const t = setTimeout(res, ms);
          activeTimersRef.current.push(t);
        });

        const runTumbleSequence = async () => {
          try {
            const history = data.gridHistory;
            if (!history || !Array.isArray(history) || history.length <= 1) {
              finishSpin(data);
              skipSpinRef.current = null;
              return;
            }

            let isCancelled = false;
            skipSpinRef.current = () => {
              isCancelled = true;
              clearAllSlotTimers();
              if (data.finalGrid) setGrid(data.finalGrid);
              else if (history.length > 0) setGrid(history[history.length - 1]);
              setWinPos(new Set());
              setExplodingPos(new Set());
              setDroppingCells({});
              finishSpin(data);
              skipSpinRef.current = null;
            };

            const totalTumbles = Math.floor((history.length - 1) / 2);

            for (let t = 0; t < totalTumbles; t++) {
              if (isCancelled || isSkipped) return;

              const preGrid = history[2 * t];
              const emptyGrid = history[2 * t + 1];
              const postGrid = history[2 * t + 2];

              if (!preGrid || !emptyGrid || !postGrid) continue;

              const roundWins = new Set<string>();
              for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                  if (preGrid[r]?.[c] !== null && preGrid[r]?.[c] !== undefined && emptyGrid[r]?.[c] === null) {
                    roundWins.add(`${r},${c}`);
                  }
                }
              }

              if (roundWins.size === 0) continue;

              setMultIdx(Math.min(t, 3));
              // PHASE 1: Highlight winning symbols
              setWinPos(roundWins);
              await sleep(Math.max(220, 400 / spd));
              if (isCancelled || isSkipped) return;

              // PHASE 2: Explode
              setExplodingPos(roundWins);
              playExplodeSound();
              await sleep(Math.max(180, 280 / spd));
              if (isCancelled || isSkipped) return;

              // PHASE 3: Empty spaces
              setGrid(emptyGrid);
              setWinPos(new Set());
              setExplodingPos(new Set());
              await sleep(Math.max(60, 100 / spd));
              if (isCancelled || isSkipped) return;

              // PHASE 4: Drop distance
              const dropsMap: Record<string, number> = {};
              for (let c = 0; c < COLS; c++) {
                const expRowsInCol: number[] = [];
                for (let r = 0; r < ROWS; r++) {
                  if (emptyGrid[r]?.[c] === null) expRowsInCol.push(r);
                }
                if (expRowsInCol.length === 0) continue;
                const maxExpRow = Math.max(...expRowsInCol);
                const expCount = expRowsInCol.length;
                for (let r = 0; r <= maxExpRow; r++) {
                  dropsMap[`${r},${c}`] = expCount;
                }
              }

              // PHASE 5: Cascade fall
              setDroppingCells(dropsMap);
              if (Array.isArray(postGrid)) setGrid(postGrid);
              playDropThudSound();
              await sleep(Math.max(260, 360 / spd));
              if (isCancelled || isSkipped) return;

              setDroppingCells({});
              await sleep(Math.max(50, 100 / spd));
            }

            if (!isCancelled && !isSkipped) {
              finishSpin(data);
              skipSpinRef.current = null;
            }
          } catch (err) {
            console.error('Tumble sequence caught error:', err);
            finishSpin(data);
            skipSpinRef.current = null;
          }
        };

      } catch (err) {
        console.error('onResult caught top-level error:', err);
        finishSpin(data);
      }
    };

    const finishSpin = (data: any) => {
      try {
        setIsSpinning(false);
        spinningColsRef.current = new Set();
        setSpinningCols(new Set());
        setBouncingCols(new Set());
        setExplodingPos(new Set());
        setDroppingCells({});
        setWinPos(new Set());
        skipSpinRef.current = null;

        if (data.finalGrid) {
          setGrid(data.finalGrid);
        } else if (data.gridHistory && data.gridHistory.length > 0) {
          setGrid(data.gridHistory[data.gridHistory.length - 1]);
        }

        if (data.newBalance != null || data.coins !== undefined) {
          const applied = applySlotResultBalance(data);
          setMyCoins(data.newBalance != null ? data.newBalance : applied.total);
        }

        setClusterWins(data.clusterWins || []);
        setMultIdx(Math.min(3, Math.max(0, ...((data.clusterWins || []).map((w: any) => w.tumble || 0)))));

        if (data.totalWinAmount > 0) {
          setTotalWin(data.totalWinAmount);
          setWinType(data.winType || 'win');
          setShowWin(true);
          safeTimeout(() => { setShowWin(false); }, 1800);
          const currentBet = betAmountRef.current || 10000;
          const ratio = data.totalWinAmount / Math.max(1, currentBet);
          if (ratio >= 30) {
            setCelebration({ type: 'super_win', amount: data.totalWinAmount });
          } else if (ratio >= 12) {
            setCelebration({ type: 'mega_win', amount: data.totalWinAmount });
          } else if (ratio >= 5) {
            setCelebration({ type: 'big_win', amount: data.totalWinAmount });
          }
        }

        if (data.randomMult) {
          setFreeMult(data.freeMult || 1);
          setDroppedMultNotif(`⚡ PETIR ZEUS PENGALI ${data.randomMult}x TURUN! ⚡`);
          safeTimeout(() => setDroppedMultNotif(null), 2800);
        }

        // Handle Free Spins Award
        if (data.triggerFreeSpins && data.freeSpinsAwarded > 0) {
          const awarded = data.freeSpinsAwarded;
          const totalF = (inFreeModeRef.current ? freeSpinsRef.current : 0) + awarded;
          freeSpinsRef.current = totalF;
          setFreeSpins(totalF);
          setInFreeMode(true);
          inFreeModeRef.current = true;
          setFreeMult(1);
          setCelebration({
            type: 'scatter',
            freeSpinsCount: awarded,
            title: '⚡ SCATTER ZEUS! ⚡',
            subtext: `SELAMAT! KAMU MEMICU ${awarded} PUTARAN GRATIS!`
          });
        }

        // Automatic Next Spin Sequencing (Auto Spins / Free Spins)
        const totalFree = inFreeModeRef.current ? freeSpinsRef.current : 0;
        const remainingAuto = isInfiniteAutoRef.current ? 999 : autoCountRef.current;
        const shouldContinue = !isStoppingRef.current && (totalFree > 0 || remainingAuto > 0);

        if (totalFree === 0 && inFreeModeRef.current) {
          setInFreeMode(false);
          inFreeModeRef.current = false;
          setFreeMult(1);
        }

        if (shouldContinue) {
          const hasCelebration = Boolean(
            data.triggerFreeSpins ||
            (data.totalWinAmount > 0 && (data.totalWinAmount / Math.max(1, betAmountRef.current || 10000)) >= 5)
          );
          const nextDelay = hasCelebration ? 3800 : Math.max(250, 1000 / (speedRef.current || 1));
          autoTimerRef.current = setTimeout(() => {
            if (!isStoppingRef.current) {
              doSpinRef.current?.();
            }
          }, nextDelay);
        } else {
          setAutoCount(0);
          autoCountRef.current = 0;
          isInfiniteAutoRef.current = false;
        }

      } catch (err) {
        console.error('Error in finishSpin:', err);
      } finally {
        setIsSpinning(false);
      }
    };

    const onError = (data: any) => {
      forceStopReels(undefined, data.message || 'Terjadi kesalahan');
      setAutoCount(0);
      autoCountRef.current = 0;
      isInfiniteAutoRef.current = false;
      isStoppingRef.current = true;
    };

    socket.on('zeus_result', onResult);
    socket.on('zeus_error',  onError);
    return () => {
      socket.off('zeus_result', onResult);
      socket.off('zeus_error',  onError);
    };
  }, [socket]);

  const doSpin = () => {
    if (isSpinning) return;
    if (!socket) {
      setErrMsg('Tidak terhubung ke server!');
      setAutoCount(0);
      autoCountRef.current = 0;
      isInfiniteAutoRef.current = false;
      setTimeout(() => setErrMsg(''), 2500);
      return;
    }

    const actualBet = anteBet ? Math.floor(betAmount * 1.25) : betAmount;
    const isFree = inFreeModeRef.current && freeSpinsRef.current > 0;

    if (!isFree && myCoins < actualBet) {
      setErrMsg(`Koin tidak cukup! Taruhan: ${actualBet.toLocaleString('id-ID')} koin.`);
      setAutoCount(0);
      autoCountRef.current = 0;
      isInfiniteAutoRef.current = false;
      setTimeout(() => setErrMsg(''), 2500);
      return;
    }

    if (!isFree) {
      const res = spendSlotCoinsLocal(actualBet);
      setMyCoins(res.total);
    }

    // Decrement counters AT SPIN LAUNCH so that UI updates immediately!
    if (isFree) {
      const nextFree = Math.max(0, freeSpinsRef.current - 1);
      freeSpinsRef.current = nextFree;
      setFreeSpins(nextFree);
    } else if (autoCountRef.current > 0 && !isInfiniteAutoRef.current) {
      const nextAuto = Math.max(0, autoCountRef.current - 1);
      autoCountRef.current = nextAuto;
      setAutoCount(nextAuto);
    }

    isStoppingRef.current = false;
    isQuickStopRequested.current = false;
    setWinPos(new Set());
    setShowWin(false);
    setTotalWin(0);
    setClusterWins([]);
    setMultIdx(0);
    setMultGrid(Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0)));
    setPrevGrid(grid);
    setIsSpinning(true);

    // All 6 columns start spinning
    spinningColsRef.current = new Set([0, 1, 2, 3, 4, 5]);
    setSpinningCols(new Set([0, 1, 2, 3, 4, 5]));
    setBouncingCols(new Set());
    setExplodingPos(new Set());
    setDroppingCells({});
    spinStartTime.current = Date.now();

    // Default skip while waiting for server response: mark quick-stop requested
    skipSpinRef.current = () => {
      isQuickStopRequested.current = true;
      isStoppingRef.current = true;
    };

    socket.emit('spin_zeus', {
      username: myUsername,
      betAmount,
      actualBet,
      anteBet,
      isFreeSpins: isFree,
      freeSpinMult: freeMult,
      clientBalance: myCoins
    });

    if (spinTimer.current) clearTimeout(spinTimer.current);
    spinTimer.current = setTimeout(() => {
      forceStopReels(undefined, 'Server timeout, koneksi terputus.');
      setAutoCount(0);
      autoCountRef.current = 0;
      isInfiniteAutoRef.current = false;
    }, 8000);
  };
  doSpinRef.current = doSpin;
 
  const fmt = (n: number) => {
    if (n >= 1e9) {
      const v = n / 1e9;
      return (Number.isInteger(v) ? v.toString() : v.toFixed(2).replace(/\.00$/, '')) + 'B';
    }
    if (n >= 1e6) {
      const v = n / 1e6;
      return (Number.isInteger(v) ? v.toString() : v.toFixed(2).replace(/\.00$/, '')) + 'M';
    }
    if (n >= 1e3) {
      const v = n / 1e3;
      return (Number.isInteger(v) ? v.toString() : v.toFixed(1).replace(/\.0$/, '')) + 'K';
    }
    return String(Math.floor(n));
  };
 
  const renderGem = (sym: number, multVal?: number) => {
    if (sym === 10) {
      const v = (multVal && multVal > 0) ? multVal : 2;
      const orbImg = v >= 50
        ? '/assets/orbs/orb_red.png'
        : v >= 15
        ? '/assets/orbs/orb_purple.png'
        : v >= 6
        ? '/assets/orbs/orb_blue.png'
        : '/assets/orbs/orb_green.png';

      return (
        <div className="gato-orb-real-wrap">
          <img src={orbImg} alt={`Multiplier ${v}x`} className="gato-orb-real-img" />
          <span className="gato-orb-real-val">{v}x</span>
        </div>
      );
    }
    const icon = ZEUS_ICONS[sym] || ZEUS_ICONS[sym % 10] || ZEUS_ICONS[0];
    if (sym === 9) {
      return (
        <div className="zeus-scatter-card">
          <img src={icon.img} alt="Zeus Scatter" className="zeus-sym-img zeus-scatter-real-img" />
        </div>
      );
    }
    return (
      <div className="zeus-gem-wrap">
        <img src={icon.img} alt={icon.name} className="zeus-sym-img" />
      </div>
    );
  };
 
  return (
    <div className="zeus-screen">
 
      <div className="zeus-bg-lightning zeus-bg-l1" />
      <div className="zeus-bg-lightning zeus-bg-l2" />
      <div className="zeus-bg-lightning zeus-bg-l3" />
 
      <div className="zeus-topbar-v2">
        <div className="zeus-tb-left">
          <button className="zeus-tb-back-corner g-btn-press" onClick={onBack} title="Kembali ke Lobi">‹</button>
          <div
            className="zeus-tb-avatar g-btn-press"
            onClick={() => setShowProfileModal(true)}
            title="Lihat Profil VIP"
            style={{ cursor: 'pointer' }}
          >
            <span className="zeus-tb-level-badge">{userProfile.level}</span>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {renderSlotAvatar(userProfile.avatar, 'zeus-avatar-img', '🐸')}
            </div>
            <span className="zeus-tb-vip-badge">VIP {userProfile.vipLevel}</span>
          </div>
          <div className="zeus-tb-coin-pill">
            <span className="zeus-tb-coin-icon">🪙</span>
            <span className="zeus-tb-coin-val">{fmt(myCoins)}</span>
            <button className="zeus-tb-plus-btn g-btn-press" onClick={() => { setErrMsg('Fitur top up segera hadir!'); setTimeout(() => setErrMsg(''), 2000); }}>+</button>
          </div>
        </div>
 
        {totalWin > 0 ? (
          <div className={`zeus-tumble-win-banner ${showWin ? 'is-winning' : ''}`}>
            <span className="ztw-tb-title">TUMBLE-WIN</span>
            <span className="ztw-tb-amount">
              <span className="ztw-tb-coin">🪙</span>
              <span>{Math.floor(totalWin).toLocaleString('en-US')}</span>
            </span>
          </div>
        ) : (
          <div className="zeus-tb-banner">
            <span className="zeus-tb-banner-icon">👑</span>
            <span className="zeus-tb-banner-mult">4x</span>
            <span className="zeus-tb-banner-scatter">SCATTER</span>
            <span className="zeus-tb-banner-text">Menangkan Spin Gratis</span>
          </div>
        )}
 
        <div className="zeus-tb-right" style={{ position: 'relative' }}>
          <button className="zeus-tb-icon-btn g-btn-press" onClick={() => { setErrMsg('Peringkat segera hadir!'); setTimeout(() => setErrMsg(''), 2000); }}>🏆</button>
          <button className="zeus-tb-icon-btn g-btn-press" onClick={() => setShowMenu(v => !v)}>☰</button>

          <GameMenuDropdown
            isOpen={showMenu}
            onClose={() => setShowMenu(false)}
            items={[
              { id: 'lobi', icon: '🚪', label: 'Lobi', onClick: () => { setShowMenu(false); onBack(); } },
              { id: 'tabel', icon: '📜', label: 'Tabel Bayaran', onClick: () => { setShowMenu(false); setShowRules(true); setRulesPage(0); } },
              { id: 'speed', icon: '⚡', label: 'Putaran Cepat', badge: speed > 1 ? 'ON' : 'OFF', onClick: () => setSpeed(s => s === 1 ? 2 : 1) },
              { id: 'suara', icon: '🔊', label: 'Suara', badge: soundOn ? 'ON' : 'OFF', onClick: () => setSoundOn(v => !v) },
              { id: 'musik', icon: '🎵', label: 'Musik', badge: musicOn ? 'ON' : 'OFF', onClick: () => setMusicOn(v => !v) },
              { id: 'bantuan', icon: '❓', label: 'Bantuan', onClick: () => { setShowMenu(false); setShowRules(true); setRulesPage(0); } }
            ]}
          />
        </div>
      </div>
 
      {inFreeMode && (
        <div className="zeus-freespin-badge">
          ⚡ FREE SPINS: {freeSpins} &nbsp;|&nbsp; MULT: {freeMult}x
        </div>
      )}
 
      {errMsg && <div className="zeus-error-toast">{errMsg}</div>}
 
      <div className="zeus-main-content">
 
        <div className="zeus-left-panel">
          <div 
            className={`zeus-buy-box ${anteBet ? 'disabled' : ''}`} 
            onClick={() => {
              if (anteBet) {
                setErrMsg('Nonaktifkan Taruhan Ganda untuk membeli Spin Gratis!');
                setTimeout(() => setErrMsg(''), 3000);
                return;
              }
              const cost = betAmount * 100;
              if (myCoins >= cost) {
                 const res = spendSlotCoinsLocal(cost);
                 setMyCoins(res.total);
                 syncSlotBetToBackend(API_URL, myUsername, cost);
                 setInFreeMode(true);
                 inFreeModeRef.current = true;
                 setFreeSpins(15);
                 freeSpinsRef.current = 15;
                 setShowFSModal(true);
              } else {
                 setErrMsg(`Koin tidak cukup! Butuh ${cost.toLocaleString('id-ID')} koin.`);
                 setTimeout(() => setErrMsg(''), 2500);
              }
            }}
            title={anteBet ? 'Nonaktif saat Taruhan Ganda aktif' : 'Beli Spin Gratis'}
          >
            <div className="zeus-buy-inner">
              <div className="zbb-title notranslate" translate="no">BELI</div>
              <div className="zbb-sub notranslate" translate="no">SPIN GRATIS</div>
              <div className="zbb-cost notranslate" translate="no">{fmt(betAmount * 100)}</div>
            </div>
          </div>

          <div className={`zeus-ante-scroll-box ${anteBet ? 'active' : ''}`} onClick={() => setAnteBet(!anteBet)}>
            <div className="zas-content">
              <div className="zas-title notranslate" translate="no">TARUHAN</div>
              <div className="zas-amount notranslate" translate="no">{fmt(betAmount * 1.25)}</div>
              <div className="zas-feature notranslate" translate="no">FITUR</div>
              <div className="zas-double notranslate" translate="no">GANDA</div>
              <div className="zas-chance notranslate" translate="no">PELUANG MENANG</div>
              <div className="zas-toggle-row">
                <span className="zas-arrow">▶</span>
                <div className={`zas-toggle-pill ${anteBet ? 'on' : 'off'}`}>
                  <div className="zas-toggle-knob"></div>
                  <span className="zas-toggle-txt notranslate" translate="no">{anteBet ? 'ON' : 'OFF'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* TOTAL PENGALI (SIDE MULTIPLIER) - AUTHENTIC PRAGMATIC GATES OF OLYMPUS */}
          {(() => {
            const isFree = inFreeMode;
            const displayMult = isFree
              ? Math.max(1, freeMult)
              : Math.max(1, [1, 2, 3, 5][multIdx] || 1);
            return (
              <div className={`gato-side-multiplier ${isFree ? 'is-free-spin' : ''} ${displayMult > 1 ? 'is-active' : ''}`} style={{ width: '100%', marginBottom: '1vh', boxSizing: 'border-box' }}>
                <div className="gsm-wing-top">⚡ ⚡ ⚡</div>
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

          <div className="zeus-tumble-box">
            <div className="ztb-inner">
              {clusterWins && clusterWins.length > 0 ? (
                <div className="ztb-list">
                  {clusterWins.map((w, idx) => (
                    <div key={idx} className="ztb-row">
                      <span className="ztb-count notranslate" translate="no">{w.count}</span>
                      <div className="ztb-sym-icon">
                        <img 
                          src={ZEUS_ICONS[w.sym]?.img || '/assets/zeus/sym_yellow.png'} 
                          alt="sym" 
                          className="ztb-img" 
                        />
                      </div>
                      <span className="ztb-win notranslate" translate="no">{fmt(w.winAmount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ztb-empty">
                  <div className="ztb-empty-icon">⚡</div>
                  <div className="ztb-empty-text notranslate" translate="no">GATES OF OLYMPUS</div>
                </div>
              )}
              {totalWin > 0 && showWin && (
                <div className="ztb-total-win">
                  <span className="ztb-tw-label notranslate" translate="no">TOTAL</span>
                  <span className="ztb-tw-val notranslate" translate="no">{fmt(totalWin)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
 
        <div className="zeus-grid-container">
          {droppedMultNotif && (
            <div className="gato-mult-drop-banner">{droppedMultNotif}</div>
          )}
          {/* MULTIPLIER BAR DIRECTLY ABOVE REELS */}
          <SlotMultiplierBar inline={true} idx={multIdx} isFree={inFreeMode} freeMult={freeMult} />
          <div className="zeus-reel-wrapper">
            <div className="zeus-reel-frame">
              <div className="zeus-reel-grid">
                {[0, 1, 2, 3, 4, 5].map(c => {
                  const isColSpinning = spinningCols.has(c);
                  const isColBouncing = bouncingCols.has(c);

                  return (
                    <div
                      key={c}
                      data-col={c}
                      className={[
                        'zeus-reel-col',
                        isColSpinning ? 'is-spinning' : '',
                        isColBouncing ? 'is-bouncing' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <div className="zeus-reel-track">
                        {[0, 1, 2, 3, 4].map(r => {
                          const sym = grid[r]?.[c];
                          const winning = winPos.has(`${r},${c}`);
                          const exploding = explodingPos.has(`${r},${c}`);
                          const dropDist = droppingCells[`${r},${c}`] || 0;
                          const dropping = dropDist > 0;
                          const isEmpty = sym === null || sym === undefined;

                          return (
                            <div
                              key={`${r}-${c}`}
                              data-col={c}
                              data-row={r}
                              style={{ ['--drop-dist' as any]: dropDist }}
                              className={[
                                'zeus-reel-cell',
                                isColSpinning ? 'spinning' : '',
                                winning ? 'zeus-cell-win' : '',
                                exploding ? 'zeus-cell-exploding' : '',
                                dropping ? 'dropping' : '',
                                isEmpty ? 'zeus-cell-empty' : '',
                              ].filter(Boolean).join(' ')}
                            >
                              {isEmpty
                                ? null
                                : renderGem(sym, multGrid[r]?.[c] || (sym === 10 ? 2 : undefined))
                              }
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

 
        <div className="zeus-right-panel">
          
        </div>
      </div>


      {showRules && (
        <div className="zeus-rules-modal">
          {rulesPage === 0 && (
            <div className="zrm-page">
              <div className="zrm-title">ATURAN</div>
              <div className="zrm-desc">
                Simbol dibayar dimana saja dilayar, Total jumlah simbol di akhir spin menentukan<br />
                nilai kemenangan.
              </div>

              <div className="zrm-paytable-container">
                <div className="zrm-paytable-row high-row">
                  <div className="zrm-pt-card">
                    <img src="/icon zeus/1000118696.png" alt="Crown" className="zrm-sym-icon" />
                    <div className="zrm-pt-vals">
                      <div>12-30 25M</div>
                      <div>10-11 12.5M</div>
                      <div>8-9 5M</div>
                    </div>
                  </div>
                  <div className="zrm-pt-card">
                    <img src="/icon zeus/1000118697.png" alt="Hourglass" className="zrm-sym-icon" />
                    <div className="zrm-pt-vals">
                      <div>12-30 12.5M</div>
                      <div>10-11 5M</div>
                      <div>8-9 1.25M</div>
                    </div>
                  </div>
                  <div className="zrm-pt-card">
                    <img src="/icon zeus/1000118698.png" alt="Ring" className="zrm-sym-icon" />
                    <div className="zrm-pt-vals">
                      <div>12-30 7.5M</div>
                      <div>10-11 2.5M</div>
                      <div>8-9 1M</div>
                    </div>
                  </div>
                  <div className="zrm-pt-card">
                    <img src="/icon zeus/1000118699.png" alt="Goblet" className="zrm-sym-icon" />
                    <div className="zrm-pt-vals">
                      <div>12-30 6M</div>
                      <div>10-11 1M</div>
                      <div>8-9 750K</div>
                    </div>
                  </div>
                </div>

                <div className="zrm-paytable-row low-row">
                  <div className="zrm-pt-card">
                    <img src="/icon zeus/1000118700.png" alt="Red Gem" className="zrm-sym-icon" />
                    <div className="zrm-pt-vals">
                      <div>12-30 5M</div>
                      <div>10-11 750K</div>
                      <div>8-9 500K</div>
                    </div>
                  </div>
                  <div className="zrm-pt-card">
                    <img src="/icon zeus/1000118701.png" alt="Purple Gem" className="zrm-sym-icon" />
                    <div className="zrm-pt-vals">
                      <div>12-30 4M</div>
                      <div>10-11 600K</div>
                      <div>8-9 400K</div>
                    </div>
                  </div>
                  <div className="zrm-pt-card">
                    <img src="/icon zeus/1000118702.png" alt="Yellow Gem" className="zrm-sym-icon" />
                    <div className="zrm-pt-vals">
                      <div>12-30 2.5M</div>
                      <div>10-11 500K</div>
                      <div>8-9 250K</div>
                    </div>
                  </div>
                  <div className="zrm-pt-card">
                    <img src="/icon zeus/1000118703.png" alt="Green Gem" className="zrm-sym-icon" />
                    <div className="zrm-pt-vals">
                      <div>12-30 2M</div>
                      <div>10-11 450K</div>
                      <div>8-9 200K</div>
                    </div>
                  </div>
                  <div className="zrm-pt-card">
                    <img src="/icon zeus/1000118704.png" alt="Blue Gem" className="zrm-sym-icon" />
                    <div className="zrm-pt-vals">
                      <div>12-30 1M</div>
                      <div>10-11 375K</div>
                      <div>8-9 125K</div>
                    </div>
                  </div>
                </div>

                <div className="zrm-scatter-box">
                  <div className="zrm-pt-vals scatter-vals">
                    <div>6 50M</div>
                    <div>5 2.5M</div>
                    <div>4 1.5M</div>
                  </div>
                  <img src="/icon zeus/1000118705.png" alt="Scatter" className="zrm-scatter-icon-real" />
                  <div className="zrm-scatter-desc">
                    Simbol SCATTER keluar di semua reel<br />
                    SCATTER di bayar disemua posisi
                  </div>
                </div>
              </div>
            </div>
          )}

          {rulesPage === 1 && (
            <div className="zrm-page">
              <div className="zrm-title">PERKALIAN SIMBOL</div>
              <div className="zrm-mult-orbs" style={{ display: 'flex', gap: '3vw', alignItems: 'center', justifyContent: 'center', margin: '4vh 0' }}>
                <img src="/assets/orbs/orb_green.png" alt="2x-5x" style={{ width: '12vh', height: '9vh', objectFit: 'contain' }} />
                <img src="/assets/orbs/orb_blue.png" alt="6x-12x" style={{ width: '12vh', height: '9vh', objectFit: 'contain' }} />
                <img src="/assets/orbs/orb_purple.png" alt="15x-25x" style={{ width: '12vh', height: '9vh', objectFit: 'contain' }} />
                <img src="/assets/orbs/orb_red.png" alt="50x-500x" style={{ width: '12vh', height: '9vh', objectFit: 'contain' }} />
              </div>
              <div className="zrm-desc">
                Setiap kali simbol MULTIPLIER muncul memiliki nilai perkalian yang acak.<br/><br/>
                Saat akhir spin nilai semua simbol MULTIPLIER di layar ditambahkan bersama dan totalnya<br/>dikalikan dengan nilai kemenangan
              </div>
            </div>
          )}

          {rulesPage === 2 && (
            <div className="zrm-page">
              <div className="zrm-title">ATURAN SPIN GRATIS</div>
              <div className="zrm-desc">
                Ketika mendapatkan 4 atau lebih simbol SCATTER, akan mendapatkan 15x spin gratis Selama game gratis, setiap kali<br/>simbol MULTIPLIER muncul dan dapatkan perhitungan, nilai MULTIPLIER akan ditambahkan ke total kelipatan.<br/><br/>
                Memperoleh 3 simbol scatter atau lebih selama RONDE SPIN GRATIS. akan menerima 5 spin tambahan.<br/><br/>
                Jumlah kemenangan maksimal dibatasi hingga 5000X taruhan. Jika total bonus putaran gratis mencapai 5000X, putaran<br/>segera berakhir dan bonus dibayarkan, dan semua free spin yang tersisa hangus.
              </div>
              <div className="zrm-title" style={{marginTop: '4vh'}}>Taruhan Ante</div>
              <div className="zrm-desc">
                Pemain memiliki opsi untuk memilih pengali taruhan, Tergantung taruhan yang di pilih, game akan berperilaku berbeda.<br/>nilai yang mungkin adalah:
              </div>
            </div>
          )}

          <div className="zrm-bottom-controls">
            <div className="zrm-dots">
              {[0,1,2].map(p => <div key={p} className={`zrm-dot ${rulesPage === p ? 'active' : ''}`} />)}
            </div>
            <div className="zrm-nav">
              <button className="zrm-nav-arr" onClick={() => setRulesPage(p => Math.max(0, p - 1))}>◀</button>
              <button className="zrm-back-btn" onClick={() => setShowRules(false)}>KEMBALI KE GAME</button>
              <button className="zrm-nav-arr" onClick={() => setRulesPage(p => Math.min(2, p + 1))}>▶</button>
            </div>
          </div>
        </div>
      )}

      <div className="zeus-higgs-bottom-bar notranslate" translate="no">
        <div className="zhb-left">
          <button className="zhb-icon-btn zhb-btn-chat g-btn-press" onClick={() => { setErrMsg('Obrolan segera hadir!'); setTimeout(() => setErrMsg(''), 2000); }}>
            <svg viewBox="0 0 24 24" width="60%" height="60%" fill="#4a2503">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h2v2H6V9zm5 2H9V9h2v2zm4 0h-2V9h2v2z"/>
            </svg>
          </button>
          <button className="zhb-icon-btn zhb-btn-info g-btn-press" onClick={() => { setShowRules(true); setRulesPage(0); }}>
            i
          </button>
          <button className="zhb-bet-btn zhb-btn-minus g-btn-press" onClick={() => setBetAmount(b => stepSlotBet(b, -1))}>
            −
          </button>
          <div className="zhb-bet-display">
            <div className="zhb-bet-label">BET</div>
            <div className="zhb-bet-val">{betAmount.toLocaleString('en-US')}</div>
          </div>
          <button className="zhb-bet-btn zhb-btn-plus g-btn-press" onClick={() => setBetAmount(b => stepSlotBet(b, 1))}>
            +
          </button>
        </div>
 
        <div className="zhb-center">
          <div className="zhb-win-banner">
            <div className="zhb-win-label">WIN</div>
            <div className="zhb-win-val">
              {totalWin > 0 ? Math.floor(totalWin).toLocaleString('en-US') : (isSpinning ? '...' : '0')}
            </div>
          </div>
        </div>
 
        <div className="zhb-right">
          {showRules ? (
            <button className="zhb-rules-tutup-btn g-btn-press" onClick={() => setShowRules(false)}>TUTUP</button>
          ) : (
            <>
              <button className="zhb-maxbet-btn g-btn-press" onClick={() => setBetAmount(MAX_SLOT_BET)}>
                <span>MAX</span>
                <span>BET</span>
              </button>
              <SlotSpeedButton
                speed={speed}
                onSpeedChange={setSpeed}
                className="zhb-speed-btn g-btn-press"
                theme="gold"
              />
              <div className="zhb-spin-wrapper">
                <button
                  className={`zhb-spin-btn ${isSpinning ? 'spinning' : ''}`}
                  onPointerDown={(e) => {
                    if (e.button !== 0 && e.pointerType === 'mouse') return;
                    isLongPressRef.current = false;
                    if (pressTimer.current) clearTimeout(pressTimer.current);
                    if (isSpinning || autoCountRef.current > 0 || inFreeModeRef.current) {
                      return;
                    }
                    pressTimer.current = setTimeout(() => {
                      isLongPressRef.current = true;
                      setShowAutoMenu(true);
                    }, 450);
                  }}
                  onPointerUp={() => {
                    if (pressTimer.current) clearTimeout(pressTimer.current);
                  }}
                  onPointerCancel={() => {
                    if (pressTimer.current) clearTimeout(pressTimer.current);
                  }}
                  onClick={() => {
                    if (isLongPressRef.current) {
                      isLongPressRef.current = false;
                      return;
                    }

                    // STOP BUTTON PRESSED
                    if (isSpinning || autoCountRef.current > 0 || inFreeModeRef.current) {
                      setAutoCount(0);
                      autoCountRef.current = 0;
                      isInfiniteAutoRef.current = false;
                      isStoppingRef.current = true;
                      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);

                      if (isSpinning) {
                        if (skipSpinRef.current) {
                          skipSpinRef.current();
                        } else {
                          forceStopReels();
                        }
                      }
                      return;
                    }

                    // NORMAL SPIN BUTTON PRESSED
                    isStoppingRef.current = false;
                    doSpin();
                  }}
                >
                  <div className="zhb-spin-title">{isSpinning ? 'STOP' : 'SPIN'}</div>
                  <div className="zhb-spin-sub">
                    {autoCount > 0 ? (
                      <span className="zhb-auto-sub-badge">
                        {isInfiniteAutoRef.current || autoCount >= 999 ? 'AUTO ∞' : `AUTO: ${autoCount}`}
                      </span>
                    ) : inFreeMode ? (
                      <span className="zhb-auto-sub-badge">FREE: {freeSpins}</span>
                    ) : (
                      isSpinning ? 'BERHENTI' : 'HOLD FOR AUTO'
                    )}
                  </div>
                </button>
    
                {showAutoMenu && (
                  <>
                    <div
                      className="zeus-menu-backdrop"
                      onClick={() => setShowAutoMenu(false)}
                      onTouchStart={() => setShowAutoMenu(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                    />
                    <div className="zeus-auto-menu" style={{ zIndex: 200 }}>
                      <div className="zam-header">AUTO SPIN</div>
                      <div className="zam-grid">
                        {[10,20,50,100,999].map(n => (
                          <button key={n} className="zeus-auto-opt g-btn-press" onClick={() => {
                            setShowAutoMenu(false);
                            if (n === 999) {
                              isInfiniteAutoRef.current = true;
                              setAutoCount(999);
                              autoCountRef.current = 999;
                            } else {
                              isInfiniteAutoRef.current = false;
                              setAutoCount(n);
                              autoCountRef.current = n;
                            }
                            isStoppingRef.current = false;
                            if (!isSpinning) {
                              doSpin();
                            }
                          }}>
                            {n === 999 ? '∞' : n} SPIN
                          </button>
                        ))}
                      </div>
                      <button className="zeus-auto-close g-btn-press" onClick={() => setShowAutoMenu(false)}>TUTUP</button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div> 
      {showWin && totalWin > 0 && (
        <div className={`zeus-win-alert zeus-win-${winType}`}>
          <div>{winType === 'mega_win' ? '⚡ MEGA WIN! ⚡' : winType === 'big_win' ? '🌩 BIG WIN!' : '✨ WIN!'}</div>
          <div className="zeus-win-amount">+{fmt(totalWin)}</div>
        </div>
      )}
 
      {showFSModal && (
        <div className="zeus-freespin-modal-overlay">
          <div className="zeus-freespin-modal">
            <div className="zeus-fs-icon">⚡</div>
            <div className="zeus-fs-title">FREE SPINS!</div>
            <div className="zeus-fs-count">{freeSpins}</div>
            <div className="zeus-fs-sub">Putaran Gratis Dimulai!</div>
            <button className="zeus-fs-btn g-btn-press" onClick={() => {
              setShowFSModal(false);
              if (!isSpinning) doSpin();
            }}>
              MULAI ⚡
            </button>
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
