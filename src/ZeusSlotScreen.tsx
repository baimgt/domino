import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import GameMenuDropdown from './GameMenuDropdown';
import './App.css'; // Make sure we use the old CSS

interface Props {
  onBack: () => void;
  socket: Socket | null;
}

const API_URL = 'http://localhost:8080/api';

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
  const myUsername = localStorage.getItem('domino_username') || '';
  const [myCoins,  setMyCoins]  = useState(6000000);
  const [betAmount, setBetAmount] = useState(50000);
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
  // Columns and active state for tumble gravity drop
  const [isDropping, setIsDropping] = useState(false);
  const [droppingCols, setDroppingCols] = useState<Set<number>>(new Set());
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
  const [showFSModal, setShowFSModal] = useState(false);
  const [clusterWins, setClusterWins] = useState<{ sym: number; count: number; winAmount: number; tumble?: number }[]>([]);
  const [floatMults, setFloatMults] = useState<{id:number;val:number;r:number;c:number}[]>([]);
  const [autoCount, setAutoCount] = useState(0);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const spinAnim = useRef<any>(null);
  const spinTimer = useRef<any>(null);
  const spinDelay = useRef<any>(null);
  const skipSpinRef = useRef<(() => void) | null>(null);
  const pressTimer = useRef<any>(null);
  const multId = useRef(0);
  // Ref mirror of spinningCols for synchronous reads inside setInterval
  const spinningColsRef = useRef<Set<number>>(new Set());
 
  useEffect(() => {
    if (!myUsername) return;
    fetch(`${API_URL}/profile/${myUsername}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.coins) setMyCoins(d.coins); })
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

      const elapsed = Date.now() - spinStartTime.current;
      const minSpinMs = 1200 / speed;
      const delay = Math.max(0, minSpinMs - elapsed);

      // Stop columns one-by-one (Duo Fu Duo Cai staggered stop)
      const stopDelay = Math.max(120, 240 / speed); // ms between each column stop

      const doStaggeredStop = (finalGrid: number[][]) => {
        // Stop col 0 first, then 1, 2, 3, 4, 5
        [0, 1, 2, 3, 4, 5].forEach(col => {
          setTimeout(() => {
            // Freeze this column's symbols to the final result
            setGrid(prev => {
              const next = prev.map(row => [...row]);
              for (let r = 0; r < ROWS; r++) {
                next[r][col] = finalGrid[r][col];
              }
              return next;
            });
            // Remove this col from spinning set
            setSpinningCols(prev => {
              const next = new Set(prev);
              next.delete(col);
              return next;
            });
            // Trigger landing bounce & audio
            setBouncingCols(prev => new Set(prev).add(col));
            playReelStopSound();
            setTimeout(() => {
              setBouncingCols(prev => {
                const next = new Set(prev);
                next.delete(col);
                return next;
              });
            }, 380);

            // After last column stops and settles, run tumble cascade
            if (col === 5) {
              setTimeout(() => {
                setIsSpinning(false);
                runTumbleSequence();
              }, 380);
            }
          }, col * stopDelay);
        });
      };

      const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

      const runTumbleSequence = async () => {
        const history = data.gridHistory;
        if (!history || history.length <= 1) {
          finishSpin(data);
          skipSpinRef.current = null;
          return;
        }

        let isCancelled = false;
        skipSpinRef.current = () => {
          isCancelled = true;
          setGrid(history[history.length - 1]);
          setWinPos(new Set());
          setExplodingPos(new Set());
          setIsDropping(false);
          setDroppingCols(new Set());
          finishSpin(data);
          skipSpinRef.current = null;
        };

        const totalTumbles = Math.floor((history.length - 1) / 2);

        for (let t = 0; t < totalTumbles; t++) {
          if (isCancelled) return;

          const preGrid = history[2 * t];
          const emptyGrid = history[2 * t + 1];
          const postGrid = history[2 * t + 2];

          // 1. Identify winning positions for this tumble round
          const roundWins = new Set<string>();
          const colsWithWins = new Set<number>();
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              if (preGrid[r][c] !== null && preGrid[r][c] !== undefined && emptyGrid[r][c] === null) {
                roundWins.add(`${r},${c}`);
                colsWithWins.add(c);
              }
            }
          }

          if (roundWins.size === 0) continue;

          // PHASE 1: Highlight winning symbols (glow and pulse)
          setWinPos(roundWins);
          await sleep(Math.max(250, 550 / speed));
          if (isCancelled) return;

          // PHASE 2: Explode & vanish ("bikin supaya hilang gitu")
          setExplodingPos(roundWins);
          playExplodeSound();
          await sleep(Math.max(180, 350 / speed));
          if (isCancelled) return;

          // Clear explosion and show empty holes
          setGrid(emptyGrid);
          setExplodingPos(new Set());
          setWinPos(new Set());
          await sleep(Math.max(60, 120 / speed));
          if (isCancelled) return;

          // PHASE 3: Gravity drop ("yang di atas nya ngisi turun ke bawah")
          setDroppingCols(colsWithWins);
          setIsDropping(true);
          setGrid(postGrid);
          playDropThudSound();
          await sleep(Math.max(240, 420 / speed));
          if (isCancelled) return;

          setDroppingCols(new Set());
          setIsDropping(false);
          await sleep(Math.max(60, 120 / speed));
        }

        if (!isCancelled) {
          finishSpin(data);
          skipSpinRef.current = null;
        }
      };

      const execute = () => {
        // Use final grid (last history frame or data.grid)
        const finalGrid = data.gridHistory?.length > 0
          ? data.gridHistory[0]
          : data.grid;
        doStaggeredStop(finalGrid);
      };

      spinDelay.current = setTimeout(execute, delay);

      skipSpinRef.current = () => {
        if (spinDelay.current) clearTimeout(spinDelay.current);
        skipSpinRef.current = null;
        execute();
      };
    };
 
    const finishSpin = (data: any) => {
      setIsSpinning(false);
      setSpinningCols(new Set());
      setBouncingCols(new Set());
      setExplodingPos(new Set());
      setIsDropping(false);
      setDroppingCols(new Set());
      setMyCoins(data.newBalance);
      setClusterWins(data.clusterWins || []);
 
      if (data.totalWinAmount > 0) {
        const posSet = new Set<string>(
          (data.allWinPositions || []).map(([r, c]: [number, number]) => `${r},${c}`)
        );
        setWinPos(posSet);
        setTotalWin(data.totalWinAmount);
        setWinType(data.winType || 'win');
        setShowWin(true);
        setTimeout(() => { setShowWin(false); setWinPos(new Set()); }, Math.max(2000, 3500 / speed));
      }
 
      if (data.randomMult) {
        const id = ++multId.current;
        const r = Math.floor(Math.random() * 5);
        const c = Math.floor(Math.random() * 5);
        setFloatMults(prev => [...prev, { id, val: data.randomMult, r, c }]);
        setTimeout(() => setFloatMults(prev => prev.filter(m => m.id !== id)), 2500);
        setFreeMult(prev => prev * data.randomMult);
      }
 
      if (data.triggerFreeSpins && data.freeSpinsAwarded > 0) {
        setTimeout(() => {
          setFreeSpins(data.freeSpinsAwarded);
          setInFreeMode(true);
          setFreeMult(1);
          setShowFSModal(true);
        }, Math.max(800, 1500 / speed));
      }
    };
 
    const onError = (data: any) => {
      if (spinTimer.current) clearTimeout(spinTimer.current);
      setIsSpinning(false);
      setAutoCount(0);
      setErrMsg(data.message || 'Terjadi kesalahan');
      setTimeout(() => setErrMsg(''), 3000);
    };
 
    socket.on('zeus_result', onResult);
    socket.on('zeus_error',  onError);
    return () => {
      socket.off('zeus_result', onResult);
      socket.off('zeus_error',  onError);
    };
  }, [socket, speed]);
 
  useEffect(() => {
    if (autoCount > 0 && !isSpinning && !showWin && !showFSModal) {
      const t = setTimeout(() => {
        setAutoCount(prev => Math.max(0, prev - 1));
        doSpin();
      }, Math.max(500, 800 / speed));
      return () => clearTimeout(t);
    }
  }, [autoCount, isSpinning, showWin, showFSModal, speed]);
 
  useEffect(() => {
    if (inFreeMode && freeSpins > 0 && !isSpinning && !showWin && !showFSModal) {
      const t = setTimeout(() => doSpin(), Math.max(600, 1000 / speed));
      return () => clearTimeout(t);
    }
    if (inFreeMode && freeSpins === 0 && !isSpinning) {
      setInFreeMode(false);
      setFreeMult(1);
    }
  }, [inFreeMode, freeSpins, isSpinning, showWin, showFSModal, speed]);
 
  const doSpin = () => {
    if (isSpinning) return;
    if (!socket) { setErrMsg('Tidak terhubung ke server!'); return; }
    const actualBet = anteBet ? betAmount * 1.25 : betAmount;
    if (!inFreeMode && myCoins < actualBet) { setErrMsg('Koin tidak cukup!'); setTimeout(() => setErrMsg(''), 2500); return; }
    if (!inFreeMode) setMyCoins(prev => prev - actualBet);
    if (inFreeMode)  setFreeSpins(prev => Math.max(0, prev - 1));
    setWinPos(new Set());
    setShowWin(false);
    setTotalWin(0);
    setClusterWins([]);
    setPrevGrid(grid);
    setIsSpinning(true);
    // All 6 columns start spinning (Duo Fu Duo Cai style)
    setSpinningCols(new Set([0, 1, 2, 3, 4, 5]));
    setBouncingCols(new Set());
    setExplodingPos(new Set());
    setIsDropping(false);
    setDroppingCols(new Set());
    spinStartTime.current = Date.now();
    socket.emit('spin_zeus', { username: myUsername, betAmount, actualBet, anteBet, isFreeSpins: inFreeMode, freeSpinMult: freeMult, clientBalance: myCoins });
    spinTimer.current = setTimeout(() => {
      setIsSpinning(false);
      setErrMsg('Server timeout, coba lagi.');
      setTimeout(() => setErrMsg(''), 3000);
    }, 8000);
  };
 
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
 
  const renderGem = (sym: number) => {
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
        <button className="zeus-tb-back-corner g-btn-press" onClick={onBack}>‹</button>
 
        <div className="zeus-tb-left">
          <div className="zeus-tb-avatar">
            <span className="zeus-tb-level-badge">1</span>
            <span>👑</span>
            <span className="zeus-tb-vip-badge">VIP</span>
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
          <button className="zeus-tb-icon-btn g-btn-press" onClick={() => { setErrMsg('Riwayat segera hadir!'); setTimeout(() => setErrMsg(''), 2000); }}>
            🔄<span className="zeus-tb-icon-sub">G497</span>
          </button>
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
          <div className="zeus-buy-box" onClick={() => {
            if (myCoins >= betAmount * 100) {
               setMyCoins(prev => prev - (betAmount * 100));
               setInFreeMode(true);
               setFreeSpins(15);
               setShowFSModal(true);
            } else {
               setErrMsg('Koin tidak cukup untuk membeli Spin Gratis!');
               setTimeout(() => setErrMsg(''), 2000);
            }
          }}>
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
                          const dropping = isDropping && droppingCols.has(c);
                          const isEmpty = sym === null || sym === undefined;

                          return (
                            <div
                              key={`${r}-${c}`}
                              data-col={c}
                              data-row={r}
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
                                : <>
                                    {renderGem(sym)}
                                    {floatMults.filter(m => m.r === r && m.c === c).map(m => (
                                      <span key={m.id} className="zeus-float-mult">{m.val}x</span>
                                    ))}
                                  </>
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
          <div className="zeus-floating-character">
            <img src="/assets/zeus_character_clean.png" alt="Zeus" className="zeus-mascot-img" />
          </div>
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
              <div className="zrm-mult-orbs">
                <div className="zrm-orb green"></div>
                <div className="zrm-orb blue"></div>
                <div className="zrm-orb purple"></div>
                <div className="zrm-orb red"></div>
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
          <button className="zhb-bet-btn zhb-btn-minus g-btn-press" onClick={() => setBetAmount(b => Math.max(5000, b / 2))}>
            −
          </button>
          <div className="zhb-bet-display">
            <div className="zhb-bet-label">BET</div>
            <div className="zhb-bet-val">{betAmount.toLocaleString('en-US')}</div>
          </div>
          <button className="zhb-bet-btn zhb-btn-plus g-btn-press" onClick={() => setBetAmount(b => Math.min(1000000, b * 2))}>
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
              <button className="zhb-maxbet-btn g-btn-press" onClick={() => setBetAmount(1000000)}>
                <span>MAX</span>
                <span>BET</span>
              </button>
              <button className="zhb-speed-btn g-btn-press" onClick={() => setSpeed(s => s === 1 ? 2 : s === 2 ? 3 : 1)}>
                X{speed}
              </button>
              <div className="zhb-spin-wrapper">
                <button
                  className={`zhb-spin-btn ${isSpinning ? 'spinning' : ''}`}
                  onMouseDown={() => { if (!isSpinning) pressTimer.current = setTimeout(() => setShowAutoMenu(true), 450); }}
                  onMouseUp={() => { clearTimeout(pressTimer.current); }}
                  onMouseLeave={() => { clearTimeout(pressTimer.current); }}
                  onTouchStart={() => { if (!isSpinning) pressTimer.current = setTimeout(() => setShowAutoMenu(true), 450); }}
                  onTouchEnd={() => { clearTimeout(pressTimer.current); }}
                  onClick={() => {
                    if (autoCount > 0) {
                      setAutoCount(0);
                    }
                    if (isSpinning) {
                      skipSpinRef.current?.();
                    } else if (autoCount === 0) {
                      doSpin();
                    }
                  }}
                >
                  <div className="zhb-spin-title">{isSpinning ? 'STOP' : 'SPIN'}</div>
                  <div className="zhb-spin-sub">{isSpinning ? 'BERHENTI' : 'HOLD FOR AUTO'}</div>
                </button>
                {autoCount > 0 && <div className="zhb-auto-overlay">{autoCount === 999 ? '∞' : autoCount}</div>}
    
                {showAutoMenu && (
                  <div className="zeus-auto-menu">
                    <div className="zam-header">AUTO SPIN</div>
                    <div className="zam-grid">
                      {[10,20,50,100,999].map(n => (
                        <button key={n} className="zeus-auto-opt g-btn-press" onClick={() => {
                          setAutoCount(n);
                          setShowAutoMenu(false);
                          if (!isSpinning) doSpin();
                        }}>
                          {n === 999 ? '∞' : n} SPIN
                        </button>
                      ))}
                    </div>
                    <button className="zeus-auto-close g-btn-press" onClick={() => setShowAutoMenu(false)}>TUTUP</button>
                  </div>
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
            <button className="zeus-fs-btn g-btn-press" onClick={() => setShowFSModal(false)}>
              MULAI ⚡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
