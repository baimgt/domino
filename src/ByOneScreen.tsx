import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { API_URL } from './config';
import './byone.css';

// =====================================================
// TYPES & CONSTANTS
// =====================================================
export type Tile = [number, number];

export interface BoardTile {
  left: number;
  right: number;
  playedBy: string;
}

export interface PlayerInfo {
  username: string;
  avatar: string;
  coins: number;
  vipLevel: number;
  winRate?: string;
}

export const BYONE_TIERS = [
  { id: 'pemula',   name: 'Meja Warkop',      bet: 5000,   pot: 10000,  icon: '☕', tierClass: 'tier-pemula',   desc: 'Taruhan Santai 5K' },
  { id: 'menengah', name: 'Meja Club Malam',  bet: 20000,  pot: 40000,  icon: '🍸', tierClass: 'tier-menengah', desc: 'Adu Gengsi 20K' },
  { id: 'pro',      name: 'VIP Macau Arena',  bet: 50000,  pot: 100000, icon: '🎰', tierClass: 'tier-pro',      desc: 'Pertarungan Pro 50K' },
  { id: 'master',   name: 'Master Arena',     bet: 100000, pot: 200000, icon: '⚡', tierClass: 'tier-master',   desc: 'Duel Master 100K' },
  { id: 'sultan',   name: 'Sultan Colosseum', bet: 200000, pot: 400000, icon: '👑', tierClass: 'tier-sultan',   desc: 'Adu Koin Max 200K' },
];

const BOT_RIVALS: PlayerInfo[] = [
  { username: 'Sultan_Fajar',    avatar: 'https://i.pravatar.cc/100?img=68', coins: 150000000, vipLevel: 5, winRate: '82%' },
  { username: 'RatuHoki_Ayu',   avatar: 'https://i.pravatar.cc/100?img=47', coins: 85000000,  vipLevel: 4, winRate: '79%' },
  { username: 'Budi_Master',     avatar: 'https://i.pravatar.cc/100?img=12', coins: 45000000,  vipLevel: 3, winRate: '71%' },
  { username: 'DewaBanting_99',  avatar: 'https://i.pravatar.cc/100?img=33', coins: 280000000, vipLevel: 6, winRate: '88%' },
  { username: 'Sniper_Kartu',    avatar: 'https://i.pravatar.cc/100?img=53', coins: 62000000,  vipLevel: 2, winRate: '75%' },
  { username: 'RajaBalak_Medan', avatar: 'https://i.pravatar.cc/100?img=60', coins: 120000000, vipLevel: 5, winRate: '84%' },
  { username: 'PutriHoki_Sby',   avatar: 'https://i.pravatar.cc/100?img=44', coins: 95000000,  vipLevel: 4, winRate: '80%' },
  { username: 'Bang_Jago99',     avatar: 'https://i.pravatar.cc/100?img=15', coins: 175000000, vipLevel: 6, winRate: '86%' },
  { username: 'BosMuda_JKT',     avatar: 'https://i.pravatar.cc/100?img=51', coins: 310000000, vipLevel: 7, winRate: '91%' },
  { username: 'KuncianMaut',     avatar: 'https://i.pravatar.cc/100?img=70', coins: 140000000, vipLevel: 5, winRate: '83%' },
  { username: 'Cak_Kumis',       avatar: 'https://i.pravatar.cc/100?img=14', coins: 55000000,  vipLevel: 3, winRate: '73%' },
  { username: 'Kang_Asep_Pro',   avatar: 'https://i.pravatar.cc/100?img=7',  coins: 88000000,  vipLevel: 4, winRate: '78%' },
  { username: 'Om_Brewok99',     avatar: 'https://i.pravatar.cc/100?img=3',  coins: 165000000, vipLevel: 5, winRate: '85%' },
  { username: 'Neng_Geulis_BDG', avatar: 'https://i.pravatar.cc/100?img=26', coins: 72000000,  vipLevel: 3, winRate: '76%' },
  { username: 'TutupJalan_ID',   avatar: 'https://i.pravatar.cc/100?img=58', coins: 115000000, vipLevel: 4, winRate: '81%' },
  { username: 'SapuBersih99',    avatar: 'https://i.pravatar.cc/100?img=65', coins: 195000000, vipLevel: 6, winRate: '87%' },
  { username: 'Daeng_Umar',      avatar: 'https://i.pravatar.cc/100?img=18', coins: 82000000,  vipLevel: 4, winRate: '77%' },
  { username: 'Bli_Wayan_Bali',  avatar: 'https://i.pravatar.cc/100?img=17', coins: 68000000,  vipLevel: 3, winRate: '74%' },
  { username: 'Opung_Batak99',   avatar: 'https://i.pravatar.cc/100?img=50', coins: 210000000, vipLevel: 6, winRate: '89%' },
  { username: 'Pak_Haji_Gaul',   avatar: 'https://i.pravatar.cc/100?img=52', coins: 240000000, vipLevel: 7, winRate: '90%' },
  { username: 'Aldo_Palembang',  avatar: 'https://i.pravatar.cc/100?img=59', coins: 90000000,  vipLevel: 4, winRate: '79%' },
  { username: 'Fikri_Makassar',  avatar: 'https://i.pravatar.cc/100?img=64', coins: 130000000, vipLevel: 5, winRate: '82%' },
  { username: 'Dimas_Semarang',  avatar: 'https://i.pravatar.cc/100?img=56', coins: 64000000,  vipLevel: 3, winRate: '72%' },
  { username: 'Bagas_Jogja',     avatar: 'https://i.pravatar.cc/100?img=55', coins: 78000000,  vipLevel: 4, winRate: '76%' },
  { username: 'Rendy_Malang',    avatar: 'https://i.pravatar.cc/100?img=57', coins: 105000000, vipLevel: 4, winRate: '80%' },
  { username: 'HokiSelalu_88',   avatar: 'https://i.pravatar.cc/100?img=20', coins: 92000000,  vipLevel: 4, winRate: '78%' },
  { username: 'SiPalingHoki',    avatar: 'https://i.pravatar.cc/100?img=48', coins: 155000000, vipLevel: 5, winRate: '83%' },
  { username: 'AutoWin_VIP',     avatar: 'https://i.pravatar.cc/100?img=62', coins: 350000000, vipLevel: 8, winRate: '92%' },
  { username: 'PangeranQiu',   avatar: 'https://i.pravatar.cc/100?img=61', coins: 180000000, vipLevel: 6, winRate: '86%' },
  { username: 'KudaHitam_99',    avatar: 'https://i.pravatar.cc/100?img=36', coins: 145000000, vipLevel: 5, winRate: '84%' },
  { username: 'PendekarKartu',   avatar: 'https://i.pravatar.cc/100?img=37', coins: 160000000, vipLevel: 5, winRate: '85%' },
  { username: 'BegalChip_ID',    avatar: 'https://i.pravatar.cc/100?img=38', coins: 125000000, vipLevel: 5, winRate: '82%' },
  { username: 'SultanAndara',    avatar: 'https://i.pravatar.cc/100?img=39', coins: 400000000, vipLevel: 8, winRate: '93%' },
  { username: 'RajaBluffing',    avatar: 'https://i.pravatar.cc/100?img=40', coins: 220000000, vipLevel: 7, winRate: '89%' },
  { username: 'Mpok_Siti_Hoki',  avatar: 'https://i.pravatar.cc/100?img=21', coins: 80000000,  vipLevel: 4, winRate: '77%' },
  { username: 'Teh_Lilis_Priangan', avatar: 'https://i.pravatar.cc/100?img=24', coins: 98000000, vipLevel: 4, winRate: '80%' },
  { username: 'Maya_QueenQQ',avatar: 'https://i.pravatar.cc/100?img=23', coins: 170000000, vipLevel: 6, winRate: '85%' },
  { username: 'GarudaSakty_88',  avatar: 'https://i.pravatar.cc/100?img=4',  coins: 205000000, vipLevel: 6, winRate: '88%' },
  { username: 'DewaKoplok',      avatar: 'https://i.pravatar.cc/100?img=8',  coins: 135000000, vipLevel: 5, winRate: '83%' },
  { username: 'BimaSakti_88', avatar: 'https://i.pravatar.cc/100?img=30', coins: 190000000, vipLevel: 6, winRate: '87%' }
];

const TAUNT_LIST = [
  { emote: '😂', text: 'Haha noob!' },
  { emote: '🥶', text: 'Ampun bang!' },
  { emote: '💀', text: 'Kelar idup lo!' },
  { emote: '🔥', text: 'Ayo All-In!' },
  { emote: '💰', text: 'Koinmu punyaku!' },
  { emote: '🤫', text: 'Diem & main!' },
];

// Helper: Format Coins
const formatCoins = (n: number) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString('id-ID');
};

// Generate full 28 domino tiles
function createDominoDeck(): Tile[] {
  const deck: Tile[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      deck.push([i, j]);
    }
  }
  return shuffle(deck);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// =====================================================
// COMPONENT: DOMINO TILE VIEW (3D)
// =====================================================
function DominoTileView({
  tile,
  isRotated = false,
  isSmall = false,
  isPlayable = false,
  onClick,
  isBack = false,
}: {
  tile?: Tile;
  isRotated?: boolean;
  isSmall?: boolean;
  isPlayable?: boolean;
  onClick?: () => void;
  isBack?: boolean;
}) {
  const renderDots = (count: number) => {
    const dotMap: Record<number, number[]> = {
      0: [],
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };
    const activeDots = dotMap[count] || [];
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        width: isSmall ? '20px' : '30px',
        height: isSmall ? '20px' : '30px',
        padding: '2px',
        boxSizing: 'border-box',
      }}>
        {Array.from({ length: 9 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              width: isSmall ? '4px' : '6px',
              height: isSmall ? '4px' : '6px',
              borderRadius: '50%',
              margin: 'auto',
              background: activeDots.includes(idx) ? '#d63031' : 'transparent',
              boxShadow: activeDots.includes(idx) ? 'inset 0 1px 2px rgba(0,0,0,0.4)' : 'none',
            }}
          />
        ))}
      </div>
    );
  };

  if (isBack) {
    return (
      <div
        style={{
          width: isSmall ? '26px' : '42px',
          height: isSmall ? '48px' : '76px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, #2c3e50, #1a252f)',
          border: '1.5px solid #34495e',
          boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f1c40f',
          fontSize: isSmall ? '12px' : '18px',
        }}
      >
        🀱
      </div>
    );
  }

  const [left, right] = tile || [0, 0];

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        flexDirection: isRotated ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3px',
        borderRadius: '7px',
        background: 'linear-gradient(180deg, #ffffff 0%, #f1f2f6 100%)',
        border: isPlayable ? '2px solid #2ecc71' : '1.5px solid #bdc3c7',
        boxShadow: isPlayable
          ? '0 0 12px rgba(46, 204, 113, 0.8), 0 4px 10px rgba(0,0,0,0.4)'
          : '0 4px 8px rgba(0,0,0,0.3)',
        cursor: isPlayable ? 'pointer' : 'default',
        transform: isPlayable ? 'translateY(-4px)' : 'none',
        transition: 'all 0.15s ease',
      }}
    >
      {renderDots(left)}
      <div
        style={{
          width: isRotated ? '2px' : '85%',
          height: isRotated ? '85%' : '2px',
          background: '#dcdde1',
          margin: '1px',
        }}
      />
      {renderDots(right)}
    </div>
  );
}

// =====================================================
// MAIN BY ONE SCREEN COMPONENT
// =====================================================
export default function ByOneScreen({
  onBack,
  socket,
  initialOpponent,
  initialBet,
  customPlayers,
  customCode,
}: {
  onBack: () => void;
  socket: Socket | null;
  initialOpponent?: string | null;
  initialBet?: number | null;
  customPlayers?: any[] | null;
  customCode?: string | null;
}) {
  const myUsername = localStorage.getItem('domino_username') || 'Player';
  const [myCoins, setMyCoins] = useState<number>(0);
  const [myBonusCoins, setMyBonusCoins] = useState<number>(0);
  const [myVip, setMyVip] = useState<number>(0);
  const [myAvatar, setMyAvatar] = useState<string>('/bg.png');

  // Screen View: 'lobby' | 'matching' | 'versus' | 'playing' | 'result'
  const [viewMode, setViewMode] = useState<'lobby' | 'matching' | 'versus' | 'playing' | 'result'>('lobby');
  const [lobbyTab, setLobbyTab] = useState<'quick' | 'custom' | 'rules'>('quick');
  const [gameMode, setGameMode] = useState<'qiuqiu'>('qiuqiu');

  // Selected Betting Tier
  const [selectedTier, setSelectedTier] = useState(BYONE_TIERS[1]); // default: 20k
  const [customBetInput, setCustomBetInput] = useState<number>(50000);
  const [customRoomCode, setCustomRoomCode] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');

  // Match & Duel State
  const [matchId, setMatchId] = useState<string>('');
  const [currentPot, setCurrentPot] = useState<number>(0);
  const [opponent, setOpponent] = useState<PlayerInfo | null>(null);
  const [isOpponentBot, setIsOpponentBot] = useState<boolean>(true);
  const [vsCountdown, setVsCountdown] = useState<number>(3);

  // Gameplay State
  const [myHand, setMyHand] = useState<Tile[]>([]);
  const [oppCardCount, setOppCardCount] = useState<number>(7);
  const [boneyard, setBoneyard] = useState<Tile[]>([]);
  const [boardChain, setBoardChain] = useState<BoardTile[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string>('');
  const [turnTimer, setTurnTimer] = useState<number>(15);
  const [actionLog, setActionLog] = useState<string>('');
  const [showTauntPicker, setShowTauntPicker] = useState<boolean>(false);
  const [myTaunt, setMyTaunt] = useState<string | null>(null);
  const [oppTaunt, setOppTaunt] = useState<string | null>(null);

  // Double Bet Prompt
  const [doublePrompt, setDoublePrompt] = useState<{ show: boolean; fromUser: string; newPot: number } | null>(null);

  // Result State
  const [winnerUsername, setWinnerUsername] = useState<string | null>(null);
  const [isMeWinner, setIsMeWinner] = useState<boolean>(false);
  const [winPayout, setWinPayout] = useState<number>(0);
  const [winByOpponentLeft, setWinByOpponentLeft] = useState<boolean>(false);

  // Refs for safe unmount forfeit tracking
  const viewModeRef = useRef(viewMode);
  const isOpponentBotRef = useRef(isOpponentBot);
  const matchIdRef = useRef(matchId);
  const hasForfeitedRef = useRef(false);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);
  useEffect(() => { isOpponentBotRef.current = isOpponentBot; }, [isOpponentBot]);
  useEffect(() => { matchIdRef.current = matchId; }, [matchId]);

  useEffect(() => {
    return () => {
      if (
        !hasForfeitedRef.current &&
        !isOpponentBotRef.current &&
        (viewModeRef.current === 'playing' || viewModeRef.current === 'versus') &&
        socket &&
        socket.connected
      ) {
        hasForfeitedRef.current = true;
        socket.emit('byone_forfeit', {
          matchId: matchIdRef.current,
          roomCode: customCode || undefined,
          username: myUsername,
        });
      }
    };
  }, [socket, customCode, myUsername]);

  // Matchmaking timer ref
  const matchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch local user profile
  const fetchMyProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/profile/${myUsername}`);
      if (res.ok) {
        const data = await res.json();
        setMyCoins(data.coins || 0);
        setMyBonusCoins(data.bonusCoins || 0);
        setMyVip(data.vipLevel || 0);
        setMyAvatar(data.avatar || '/bg.png');
      }
    } catch {
      const savedCoins = localStorage.getItem('domino_coins');
      if (savedCoins) setMyCoins(parseInt(savedCoins, 10));
    }
  }, [myUsername]);

  useEffect(() => {
    fetchMyProfile();
  }, [fetchMyProfile]);

  // Handle direct challenge launch (Friend duel)
  useEffect(() => {
    if (initialOpponent || (customPlayers && customPlayers.length >= 2)) {
      const bet = initialBet || 1000000;
      const matchedTier = BYONE_TIERS.find(t => t.bet === bet) || {
        id: 'custom',
        name: 'Meja Tantangan 1v1',
        bet,
        pot: bet * 2,
        icon: '⚔️',
        tierClass: 'tier-pro',
        desc: 'Tantangan Langsung'
      };
      setSelectedTier(matchedTier);

      // If playing with a friend / custom players: NEVER SPAWN A BOT!
      if (customPlayers && customPlayers.length >= 2) {
        const realOpp = customPlayers.find(p => p.username !== myUsername) || {
          username: initialOpponent || 'Lawan',
          avatar: '👑',
          vipLevel: 1,
          coins: bet * 5,
        };

        if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
        setMatchId(customCode ? `byone_${customCode}` : `byone_${Date.now()}`);
        setCurrentPot(bet * customPlayers.length);
        setOpponent(realOpp);
        setIsOpponentBot(false); // NO BOT!
        startVersusIntro(realOpp, bet * customPlayers.length);
        return;
      }

      if (initialOpponent && initialBet) {
        startMatchmaking(matchedTier);
      }
    }
  }, [initialOpponent, initialBet, customPlayers, customCode, myUsername]);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('byone_matched', (data: any) => {
      if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
      setMatchId(data.matchId);
      setCurrentPot(data.pot);
      setOpponent(data.opponent);
      setIsOpponentBot(false);
      startVersusIntro(data.opponent, data.pot);
    });

    socket.on('byone_opponent_moved', ({ moveData, nextTurn, newBoard }: any) => {
      setBoardChain(newBoard);
      setOppCardCount(prev => Math.max(0, prev - 1));
      setCurrentTurn(nextTurn);
      setTurnTimer(15);
      setActionLog(`${opponent?.username || 'Lawan'} memasang [${moveData.left}|${moveData.right}]!`);
    });

    socket.on('byone_double_bet_offered', ({ fromUsername, proposedPot }: any) => {
      setDoublePrompt({ show: true, fromUser: fromUsername, newPot: proposedPot });
    });

    socket.on('byone_pot_updated', ({ pot, myCoins: newC }: any) => {
      setCurrentPot(pot);
      if (newC !== undefined) setMyCoins(newC);
      setActionLog(`🔥 Taruhan dinaikkan! Pot sekarang: ${formatCoins(pot)} koin!`);
    });

    socket.on('byone_taunt_received', ({ emote, text }: any) => {
      setOppTaunt(`${emote} ${text}`);
      setTimeout(() => setOppTaunt(null), 3500);
    });

    socket.on('byone_match_ended', ({ winner, pot, isMeWinner: meWon, newCoins, byOpponentLeft, byDisconnect, byFold }: any) => {
      hasForfeitedRef.current = true;
      setWinnerUsername(winner);
      setIsMeWinner(Boolean(meWon || winner === myUsername));
      setWinPayout(pot);
      setWinByOpponentLeft(Boolean(byOpponentLeft || byDisconnect || byFold));
      if (newCoins !== undefined) {
        setMyCoins(newCoins);
        localStorage.setItem('domino_coins', String(newCoins));
      }
      setViewMode('result');
    });

    socket.on('byone_error', ({ message }: any) => {
      alert(message || 'Terjadi kesalahan pada arena by one.');
      setViewMode('lobby');
    });

    return () => {
      socket.off('byone_matched');
      socket.off('byone_opponent_moved');
      socket.off('byone_double_bet_offered');
      socket.off('byone_pot_updated');
      socket.off('byone_taunt_received');
      socket.off('byone_match_ended');
      socket.off('byone_error');
    };
  }, [socket, opponent]);

  // Deduct/Add coins via backend API
  const syncCoins = async (amount: number) => {
    try {
      const res = await fetch(`${API_URL}/users/update-coins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, amount }),
      });
      if (res.ok) {
        const data = await res.json();
        setMyCoins(data.coins);
      }
    } catch (e) {
      console.error('Failed to sync coins:', e);
      setMyCoins(prev => Math.max(0, prev + amount));
    }
  };

  // =====================================================
  // MATCHMAKING LOGIC
  // =====================================================
  const startMatchmaking = (tier = selectedTier, code = '') => {
    const usableCoins = Math.max(0, myCoins - myBonusCoins);
    if (usableCoins < tier.bet) {
      if (myBonusCoins > 0 && myCoins >= tier.bet) {
        alert(`⚠️ Koin bonus harian (${formatCoins(myBonusCoins)}) hanya untuk game SLOT!\n\nKoin duel By One Anda: ${formatCoins(usableCoins)} (Butuh: ${formatCoins(tier.bet)} koin).`);
      } else {
        alert(`⚠️ Koin tidak cukup! Anda memerlukan minimal ${formatCoins(tier.bet)} koin.`);
      }
      return;
    }

    setViewMode('matching');

    if (socket && socket.connected) {
      socket.emit('join_byone_queue', {
        username: myUsername,
        tierId: tier.id,
        betAmount: tier.bet,
        mode: gameMode,
        customCode: code,
      });
    }

    // Matchmaking timeout -> pair with AI rival ONLY for public quick matchmaking (never for private friend code!)
    if (!code) {
      matchTimerRef.current = setTimeout(() => {
        const randomBot = BOT_RIVALS[Math.floor(Math.random() * BOT_RIVALS.length)];
        setOpponent(randomBot);
        setIsOpponentBot(true);
        const initialPot = tier.bet * 2;
        setCurrentPot(initialPot);
        setMatchId(`byone_bot_${Date.now()}`);

        // Deduct bet from player
        syncCoins(-tier.bet);

        startVersusIntro(randomBot, initialPot);
      }, 3500);
    }
  };

  const cancelMatchmaking = () => {
    if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
    if (socket && socket.connected) {
      socket.emit('cancel_byone_queue', { username: myUsername });
    }
    setViewMode('lobby');
  };

  // VERSUS INTRO ANIMATION
  const startVersusIntro = (opp: PlayerInfo, pot: number) => {
    setViewMode('versus');
    setVsCountdown(3);

    const countInterval = setInterval(() => {
      setVsCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countInterval);
          startGameplay(opp, pot);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // START GAMEPLAY
  const startGameplay = (opp: PlayerInfo, pot: number) => {
    const deck = createDominoDeck();
    const pHand = deck.slice(0, 7);
    const oHand = deck.slice(7, 14);
    const pile = deck.slice(14);

    setMyHand(pHand);
    setOppCardCount(7);
    setBoneyard(pile);
    setBoardChain([]);
    setCurrentPot(pot);

    // Turn selection: deterministic host-first when playing in a friend room so both clients stay in sync
    const firstTurn = (customPlayers && customPlayers.length > 0 && customPlayers[0]?.username)
      ? customPlayers[0].username
      : (Math.random() > 0.5 ? myUsername : opp.username);
    setCurrentTurn(firstTurn);
    setTurnTimer(15);
    setActionLog(`Duel dimulai! ${firstTurn === myUsername ? 'Giliran Anda!' : `Giliran ${opp.username}!`}`);
    setViewMode('playing');
  };

  // Turn timer interval
  useEffect(() => {
    if (viewMode !== 'playing') return;

    const timer = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) {
          handleTurnTimeout();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [viewMode, currentTurn, myHand, boardChain, boneyard]);

  // Turn Timeout (Auto-draw or pass)
  const handleTurnTimeout = () => {
    if (currentTurn === myUsername) {
      const playable = myHand.filter(t => canPlayTile(t));
      if (playable.length > 0) {
        handlePlayTile(playable[0]);
      } else if (boneyard.length > 0) {
        handleDrawTile();
      } else {
        handlePassTurn();
      }
    }
  };

  // Bot AI Turn execution
  useEffect(() => {
    if (viewMode !== 'playing' || !isOpponentBot || currentTurn !== opponent?.username) return;

    const botDelay = setTimeout(() => {
      executeBotTurn();
    }, 1800);

    return () => clearTimeout(botDelay);
  }, [viewMode, isOpponentBot, currentTurn, boardChain]);

  // Domino Board Rules
  const getBoardEnds = (): { left: number; right: number } | null => {
    if (boardChain.length === 0) return null;
    return {
      left: boardChain[0].left,
      right: boardChain[boardChain.length - 1].right,
    };
  };

  const canPlayTile = (tile: Tile): boolean => {
    const ends = getBoardEnds();
    if (!ends) return true; // empty board can take any tile
    const [a, b] = tile;
    return a === ends.left || b === ends.left || a === ends.right || b === ends.right;
  };

  // Handle Player playing a tile
  const handlePlayTile = (tile: Tile) => {
    if (currentTurn !== myUsername) return;
    if (!canPlayTile(tile)) return;

    const ends = getBoardEnds();
    let newLeft = tile[0];
    let newRight = tile[1];
    let newBoard = [...boardChain];

    if (!ends) {
      newBoard.push({ left: newLeft, right: newRight, playedBy: myUsername });
    } else {
      // Connect to left or right
      if (tile[0] === ends.right) {
        newBoard.push({ left: tile[0], right: tile[1], playedBy: myUsername });
      } else if (tile[1] === ends.right) {
        newBoard.push({ left: tile[1], right: tile[0], playedBy: myUsername });
      } else if (tile[1] === ends.left) {
        newBoard.unshift({ left: tile[0], right: tile[1], playedBy: myUsername });
      } else if (tile[0] === ends.left) {
        newBoard.unshift({ left: tile[1], right: tile[0], playedBy: myUsername });
      }
    }

    const updatedHand = myHand.filter(t => !(t[0] === tile[0] && t[1] === tile[1]));
    setMyHand(updatedHand);
    setBoardChain(newBoard);
    setActionLog(`Kamu membanting balak [${tile[0]}|${tile[1]}]! 💥`);

    // Check Victory
    if (updatedHand.length === 0) {
      handleMatchFinish(myUsername);
      return;
    }

    const nextTurn = opponent?.username || 'Opponent';
    setCurrentTurn(nextTurn);
    setTurnTimer(15);

    if (socket && socket.connected && !isOpponentBot) {
      socket.emit('byone_move', {
        matchId,
        moveData: { left: tile[0], right: tile[1] },
        nextTurn,
        newBoard,
      });
    }
  };

  // Handle Draw Tile from Boneyard
  const handleDrawTile = () => {
    if (currentTurn !== myUsername || boneyard.length === 0) return;
    const drawn = boneyard[0];
    setBoneyard(prev => prev.slice(1));
    setMyHand(prev => [...prev, drawn]);
    setActionLog('Kamu mengambil balak dari bumbung! 📦');
  };

  // Handle Pass Turn
  const handlePassTurn = () => {
    if (currentTurn !== myUsername) return;
    const nextTurn = opponent?.username || 'Opponent';
    setCurrentTurn(nextTurn);
    setTurnTimer(15);
    setActionLog('Kamu lewat! Giliran lawan.');
  };

  // Bot Logic
  const executeBotTurn = () => {
    const ends = getBoardEnds();
    let newBoard = [...boardChain];

    // Simulate bot choosing a valid move
    // Pick tile that matches ends
    const possibleTiles: Tile[] = [];
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        possibleTiles.push([i, j]);
      }
    }
    const shuffled = shuffle(possibleTiles);
    const matching = shuffled.find(t => {
      if (!ends) return true;
      return t[0] === ends.left || t[1] === ends.left || t[0] === ends.right || t[1] === ends.right;
    });

    if (matching && oppCardCount > 0) {
      if (!ends) {
        newBoard.push({ left: matching[0], right: matching[1], playedBy: opponent!.username });
      } else if (matching[0] === ends.right) {
        newBoard.push({ left: matching[0], right: matching[1], playedBy: opponent!.username });
      } else if (matching[1] === ends.right) {
        newBoard.push({ left: matching[1], right: matching[0], playedBy: opponent!.username });
      } else if (matching[1] === ends.left) {
        newBoard.unshift({ left: matching[0], right: matching[1], playedBy: opponent!.username });
      } else {
        newBoard.unshift({ left: matching[1], right: matching[0], playedBy: opponent!.username });
      }

      setBoardChain(newBoard);
      const newCount = oppCardCount - 1;
      setOppCardCount(newCount);
      setActionLog(`${opponent!.username} membanting balak [${matching[0]}|${matching[1]}]!`);

      if (newCount <= 0) {
        handleMatchFinish(opponent!.username);
        return;
      }
    } else {
      // Bot passes
      setActionLog(`${opponent!.username} tidak bisa jalan & lewat!`);
    }

    setCurrentTurn(myUsername);
    setTurnTimer(15);
  };

  // Propose Double Bet (Adu Dobel Taruhan)
  const handleDoubleBet = () => {
    if (myCoins < selectedTier.bet) {
      alert('Koin Anda tidak cukup untuk menggandakan taruhan!');
      return;
    }

    const proposedPot = currentPot * 2;

    if (isOpponentBot) {
      // Bot decides
      const botAccepts = Math.random() > 0.35;
      if (botAccepts) {
        syncCoins(-selectedTier.bet);
        setCurrentPot(proposedPot);
        setActionLog(`🔥 ${opponent?.username} MENERIMA DOBEL TARUHAN! Pot kini: ${formatCoins(proposedPot)}!`);
        setOppTaunt('🔥 Siapa takut!');
        setTimeout(() => setOppTaunt(null), 3000);
      } else {
        setActionLog(`🏳️ ${opponent?.username} takut dan MENYERAH!`);
        handleMatchFinish(myUsername);
      }
    } else if (socket && socket.connected) {
      socket.emit('byone_propose_double', {
        matchId,
        fromUsername: myUsername,
        proposedPot,
      });
      setActionLog('Mengajukan dobel taruhan ke lawan...');
    }
  };

  // Respond to opponent's double bet prompt
  const respondDoubleBet = (accepted: boolean) => {
    if (!doublePrompt) return;
    if (accepted && myCoins < selectedTier.bet) {
      alert('Koin Anda tidak cukup untuk menerima dobel taruhan!');
      respondDoubleBet(false);
      return;
    }

    if (socket && socket.connected) {
      socket.emit('byone_respond_double', {
        matchId,
        fromUsername: myUsername,
        accepted,
        proposedPot: doublePrompt.newPot,
      });
    }

    setDoublePrompt(null);
  };

  // Match Finish
  const handleMatchFinish = (winner: string) => {
    const meWon = winner === myUsername;
    setWinnerUsername(winner);
    setIsMeWinner(meWon);
    setWinPayout(currentPot);

    if (meWon && isOpponentBot) {
      syncCoins(currentPot);
    }

    if (socket && socket.connected && !isOpponentBot) {
      socket.emit('byone_match_finish', {
        matchId,
        winnerUsername: winner,
        potAmount: currentPot,
      });
    }

    setViewMode('result');
  };

  // Send Taunt
  const sendTaunt = (item: { emote: string; text: string }) => {
    setMyTaunt(`${item.emote} ${item.text}`);
    setShowTauntPicker(false);
    setTimeout(() => setMyTaunt(null), 3000);

    if (socket && socket.connected && opponent) {
      socket.emit('byone_taunt', {
        matchId,
        toUsername: opponent.username,
        emote: item.emote,
        text: item.text,
      });
    }
  };

  // Generate 6 digit room code for private duel
  const handleCreatePrivateCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setCustomRoomCode(code);
    const customTier = {
      id: 'custom',
      name: `Kamar #${code}`,
      bet: customBetInput,
      pot: customBetInput * 2,
      icon: '🔑',
      tierClass: 'tier-sultan',
      desc: 'Room Privat 1v1',
    };
    setSelectedTier(customTier);
    startMatchmaking(customTier, code);
  };

  // Join private room with code
  const handleJoinPrivateCode = () => {
    if (!joinCodeInput.trim()) {
      alert('Masukkan 6-digit kode kamar!');
      return;
    }
    const customTier = {
      id: 'custom',
      name: `Kamar #${joinCodeInput}`,
      bet: customBetInput,
      pot: customBetInput * 2,
      icon: '🔑',
      tierClass: 'tier-sultan',
      desc: 'Room Privat 1v1',
    };
    setSelectedTier(customTier);
    startMatchmaking(customTier, joinCodeInput.trim());
  };

  // =====================================================
  // RENDER: LOBBY VIEW
  // =====================================================
  const renderLobby = () => (
    <div className="byone-lobby-body">
      {/* Top Tabs */}
      <div className="byone-tabs">
        <button
          className={`byone-tab-btn ${lobbyTab === 'quick' ? 'active' : ''}`}
          onClick={() => setLobbyTab('quick')}
        >
          <span>⚡</span>
          <span>QUICK DUEL (MEJA TARUHAN)</span>
        </button>
        <button
          className={`byone-tab-btn ${lobbyTab === 'custom' ? 'active' : ''}`}
          onClick={() => setLobbyTab('custom')}
        >
          <span>🔑</span>
          <span>ROOM PRIVAT / KODE</span>
        </button>
        <button
          className={`byone-tab-btn ${lobbyTab === 'rules' ? 'active' : ''}`}
          onClick={() => setLobbyTab('rules')}
        >
          <span>📜</span>
          <span>CARA MAIN & TRIK</span>
        </button>
      </div>

      {/* Game Mode Switcher (Gaple vs QiuQiu) */}
      <div className="byone-gametype-bar">
        <div className="byone-gt-label">
          <span>🎮</span>
          <span>FORMAT DUEL 1V1:</span>
        </div>
        <div className="byone-gt-switch">
          <button
            className={`byone-gt-option ${gameMode === 'qiuqiu' ? 'active' : ''}`}
            onClick={() => setGameMode('qiuqiu')}
          >
            🃏 ADU QIUQIU SULTAN
          </button>
        </div>
      </div>

      {/* TAB 1: QUICK TIERS */}
      {lobbyTab === 'quick' && (
        <div className="byone-tiers-grid">
          {BYONE_TIERS.map(tier => (
            <div
              key={tier.id}
              className={`byone-tier-card ${tier.tierClass}`}
              onClick={() => {
                setSelectedTier(tier);
                startMatchmaking(tier);
              }}
            >
              <div>
                <div className="byone-tier-badge">
                  <span>{tier.icon}</span>
                  <span>{tier.desc}</span>
                </div>
                <div className="byone-tier-name">{tier.name}</div>
              </div>

              <div className="byone-tier-details">
                <div className="byone-tier-row">
                  <span className="lbl">Taruhan (Ante):</span>
                  <span className="val">{formatCoins(tier.bet)} 🪙</span>
                </div>
                <div className="byone-tier-row">
                  <span className="lbl">Hadiah Pot:</span>
                  <span className="val pot">{formatCoins(tier.pot)} 🪙</span>
                </div>
              </div>

              <button className="byone-tier-btn">
                <span>⚔️</span>
                <span>ADU SEKARANG</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: CUSTOM ROOM */}
      {lobbyTab === 'custom' && (
        <div className="byone-custom-panel">
          <div className="byone-custom-title">⚔️ BUAT / GABUNG KAMAR BY ONE PRIVAT</div>

          <div className="byone-custom-row">
            <label>Pilih Nominal Taruhan Adu Koin:</label>
            <div className="byone-chip-selector">
              {[5000, 10000, 20000, 50000, 100000, 200000].map(val => (
                <button
                  key={val}
                  className={`byone-chip-btn ${customBetInput === val ? 'active' : ''}`}
                  onClick={() => setCustomBetInput(val)}
                >
                  {formatCoins(val)} 🪙
                </button>
              ))}
            </div>
          </div>

          <div className="byone-custom-actions">
            <button className="byone-action-primary" onClick={handleCreatePrivateCode}>
              ✨ Buat Kamar & Dapatkan Kode
            </button>
          </div>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '1vh 0' }} />

          <div className="byone-custom-row">
            <label>Punya Kode Kamar dari Teman? Masukkan di sini:</label>
            <div style={{ display: 'flex', gap: '1vw' }}>
              <input
                type="text"
                placeholder="Contoh: 849201"
                maxLength={6}
                value={joinCodeInput}
                onChange={e => setJoinCodeInput(e.target.value)}
                className="byone-custom-input"
                style={{ flex: 1, letterSpacing: '2px', textAlign: 'center' }}
              />
              <button className="byone-action-secondary" onClick={handleJoinPrivateCode}>
                ⚔️ Gabung Duel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RULES */}
      {lobbyTab === 'rules' && (
        <div className="byone-custom-panel" style={{ maxWidth: '750px', fontSize: '1.6vh', lineHeight: '1.6' }}>
          <div className="byone-custom-title">📜 ATURAN DUEL BY ONE (1V1)</div>
          <div>
            <b>1. Format 1 Lawan 1:</b> Hanya 2 pemain di satu meja. Tidak ada pemain lain, murni adu skill dan strategi!
          </div>
          <div>
            <b>2. Taruhan & Pot:</b> Setiap pemain menyetorkan nominal taruhan yang sama saat masuk. Seluruh koin terkumpul di <b>Pot Taruhan</b> dan pemenang membawa pulang seluruhnya!
          </div>
          <div>
            <b>3. Fitur Dobel Taruhan (2X POT):</b> Di tengah permainan, Anda bisa menantang lawan untuk melipatgandakan pot! Jika lawan takut dan menyerah (Fold), Anda langsung dinyatakan sebagai pemenang!
          </div>
          <div>
            <b>4. Penentuan Kemenangan:</b> Pemain yang menghabiskan balak terlebih dahulu menang telak. Jika jalan buntu (Balak Mati), pemain dengan jumlah pips (titik) terendah yang menang.
          </div>
        </div>
      )}
    </div>
  );

  // =====================================================
  // RENDER: MATCHMAKING VIEW
  // =====================================================
  const renderMatching = () => (
    <div className="byone-match-wrapper">
      <div className="byone-radar-box">
        <div className="byone-radar-ring r1" />
        <div className="byone-radar-ring r2" />
        <div className="byone-radar-ring r3" />
        <div className="byone-radar-sweep" />
        <div className="byone-radar-center">⚔️</div>
      </div>

      <div className="byone-match-text">
        <div className="byone-match-title">MENCARI PENANTANG BY ONE...</div>
        <div className="byone-match-sub">
          {selectedTier.name} • Taruhan: <b style={{ color: '#f1c40f' }}>{formatCoins(selectedTier.bet)} 🪙</b>
        </div>
        {customRoomCode && (
          <div style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '2vh', marginTop: '0.5vh' }}>
            Kode Kamar Anda: {customRoomCode} (Bagikan ke teman!)
          </div>
        )}
      </div>

      <button className="byone-cancel-btn" onClick={cancelMatchmaking}>
        Batal Mencari Lawan
      </button>
    </div>
  );

  // =====================================================
  // RENDER: VERSUS SCREEN
  // =====================================================
  const renderVersus = () => (
    <div className="byone-versus-screen">
      {/* Left: Player */}
      <div className="byone-vs-side left">
        <div className="byone-vs-card">
          <div className="byone-vs-avatar-wrapper">
            <img src={myAvatar} alt={myUsername} className="byone-vs-avatar-img" />
          </div>
          <div className="byone-vs-name">{myUsername}</div>
          <div className="byone-vs-role">PENANTANG 1 • VIP {myVip}</div>
        </div>
      </div>

      {/* Center VS Elements */}
      <div className="byone-vs-center">
        <div className="byone-vs-badge">VS</div>
        <div className="byone-vs-pot-badge">
          🔥 POT TARUHAN: {formatCoins(currentPot)} KOIN 🔥
        </div>
        <div className="byone-vs-countdown">{vsCountdown}</div>
      </div>

      {/* Right: Opponent */}
      <div className="byone-vs-side right">
        <div className="byone-vs-card">
          <div className="byone-vs-avatar-wrapper">
            <img src={opponent?.avatar || '/bg.png'} alt="Opponent" className="byone-vs-avatar-img" />
          </div>
          <div className="byone-vs-name">{opponent?.username || 'Lawan'}</div>
          <div className="byone-vs-role">PENANTANG 2 • VIP {opponent?.vipLevel || 1}</div>
        </div>
      </div>
    </div>
  );

  // =====================================================
  // RENDER: PLAYING ARENA
  // =====================================================
  const renderPlaying = () => {
    const isMyTurn = currentTurn === myUsername;

    return (
      <div className="byone-table-wrapper">
        {/* Top: Opponent HUD */}
        <div className="byone-opp-bar">
          <div className="byone-player-hud">
            <div className={`byone-hud-avatar ${!isMyTurn ? 'turn-active' : ''}`}>
              <img src={opponent?.avatar || '/bg.png'} alt="Opponent" />
            </div>
            <div className="byone-hud-info">
              <div className="byone-hud-name">
                {opponent?.username}
                <span className="byone-vip-tag">VIP {opponent?.vipLevel || 1}</span>
              </div>
              <div className="byone-hud-coins">🪙 {formatCoins(opponent?.coins || 50000000)}</div>
              <div className="byone-hud-cards">Balak di tangan: {oppCardCount}</div>
            </div>

            {/* Opponent Speech Bubble */}
            {oppTaunt && <div className="byone-speech-bubble">{oppTaunt}</div>}
          </div>

          {/* Turn Timer */}
          <div className={`byone-timer-ring ${turnTimer < 5 ? 'urgent' : turnTimer < 8 ? 'warning' : ''}`}>
            {turnTimer}
          </div>
        </div>

        {/* Center Duel Arena Table */}
        <div className="byone-center-arena">
          {/* Pot Showcase */}
          <div className="byone-pot-showcase">
            <span className="byone-pot-coin-icon">🪙</span>
            <div className="byone-pot-text">
              <span className="byone-pot-label">POT TARUHAN DUEL</span>
              <span className="byone-pot-amount">{formatCoins(currentPot)} KOIN</span>
            </div>
          </div>

          {/* Domino Board Chain */}
          <div className="byone-domino-chain">
            {boardChain.length === 0 ? (
              <div className="byone-chain-empty">
                {isMyTurn ? '▶️ Giliran Anda — banting kartu pertama ke meja!' : 'Menunggu lawan memasang balak pertama...'}
              </div>
            ) : (
              boardChain.map((item, idx) => (
                <div key={idx} className="tile-slam">
                  <DominoTileView
                    tile={[item.left, item.right]}
                    isRotated={item.left !== item.right}
                    isSmall={true}
                  />
                </div>
              ))
            )}
          </div>

          {/* Action Log */}
          {actionLog && <div className="byone-action-log">{actionLog}</div>}
        </div>

        {/* Bottom: Player Area */}
        <div className="byone-player-bottom">
          <div className="byone-bottom-header">
            <div className="byone-player-hud">
              <div className={`byone-hud-avatar ${isMyTurn ? 'turn-active' : ''}`}>
                <img src={myAvatar} alt={myUsername} />
              </div>
              <div className="byone-hud-info">
                <div className="byone-hud-name">
                  {myUsername} (Anda)
                  <span className="byone-vip-tag">VIP {myVip}</span>
                </div>
                <div className="byone-hud-coins">🪙 {formatCoins(myCoins)}</div>
              </div>

              {myTaunt && <div className="byone-speech-bubble">{myTaunt}</div>}
            </div>

            <div style={{ color: isMyTurn ? '#2ecc71' : 'rgba(255,255,255,0.5)', fontWeight: 'bold', fontSize: '1.6vh' }}>
              {isMyTurn ? '⚡ GILIRAN ANDA!' : '⏳ MENUNGGU LAWAN...'}
            </div>
          </div>

          {/* Player Hand Tiles */}
          <div className="byone-tiles-hand">
            {myHand.map((tile, idx) => {
              const playable = isMyTurn && canPlayTile(tile);
              return (
                <div
                  key={`${tile[0]}-${tile[1]}-${idx}`}
                  className={`byone-tile-wrapper ${playable ? 'playable' : 'disabled'}`}
                  onClick={() => playable && handlePlayTile(tile)}
                >
                  <DominoTileView tile={tile} isPlayable={playable} />
                </div>
              );
            })}
          </div>

          {/* Action Toolbar */}
          <div className="byone-action-toolbar">
            <div style={{ display: 'flex', gap: '1vw' }}>
              {boneyard.length > 0 && isMyTurn && !myHand.some(t => canPlayTile(t)) && (
                <button className="byone-action-btn byone-btn-draw" onClick={handleDrawTile}>
                  📦 Ambil Balak ({boneyard.length})
                </button>
              )}

              {isMyTurn && !myHand.some(t => canPlayTile(t)) && boneyard.length === 0 && (
                <button className="byone-action-btn byone-btn-draw" onClick={handlePassTurn}>
                  ⏭️ Lewat Giliran
                </button>
              )}

              <button className="byone-action-btn byone-btn-double" onClick={handleDoubleBet}>
                🔥 DOBEL TARUHAN (2X)
              </button>

              <button className="byone-action-btn byone-btn-taunt" onClick={() => setShowTauntPicker(v => !v)}>
                💬 Ejekan & Emote
              </button>
            </div>

            <button
              className="byone-action-btn byone-btn-fold"
              onClick={() => {
                if (confirm('Menyerah dari duel? Pot akan diberikan ke lawan!')) {
                  handleMatchFinish(opponent?.username || 'Lawan');
                }
              }}
            >
              🏳️ Menyerah
            </button>
          </div>
        </div>

        {/* Emote Taunt Picker Popup */}
        {showTauntPicker && (
          <div className="byone-taunt-picker">
            {TAUNT_LIST.map((item, idx) => (
              <button
                key={idx}
                className="byone-taunt-item"
                onClick={() => sendTaunt(item)}
                title={item.text}
              >
                {item.emote}
              </button>
            ))}
          </div>
        )}

        {/* Double Bet Confirmation Prompt */}
        {doublePrompt && (
          <div className="byone-prompt-modal">
            <div className="byone-prompt-title">🔥 TANTANGAN DOBEL TARUHAN!</div>
            <div className="byone-prompt-body">
              <b>{doublePrompt.fromUser}</b> menantang Anda untuk melipatgandakan pot menjadi{' '}
              <b style={{ color: '#f1c40f' }}>{formatCoins(doublePrompt.newPot)} koin</b>!<br />
              Apakah Anda siap menerima tantangan?
            </div>
            <div className="byone-prompt-actions">
              <button className="byone-action-primary" onClick={() => respondDoubleBet(true)}>
                ⚔️ IKUT (Call)
              </button>
              <button className="byone-action-secondary" onClick={() => respondDoubleBet(false)}>
                🏳️ MENYERAH (Fold)
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // =====================================================
  // RENDER: RESULT MODAL
  // =====================================================
  const renderResult = () => (
    <div className="byone-result-overlay">
      <div className={`byone-result-box ${isMeWinner ? 'victory' : 'defeat'}`}>
        <div className="byone-result-trophy">{isMeWinner ? '🏆' : '💀'}</div>
        <div className="byone-result-headline">
          {isMeWinner ? (winByOpponentLeft ? 'AUTO WIN! LAWAN KELUAR' : 'VICTORY! JUARA DUEL BY ONE') : 'DEFEAT! KALAH DUEL'}
        </div>
        <div className="byone-result-msg">
          {isMeWinner
            ? winByOpponentLeft
              ? `🏳️ ${opponent?.username || 'Lawan'} keluar dari pertandingan! Anda OTOMATIS MENANG dan berhak atas seluruh Pot!`
              : `Selamat! Anda berhasil menumbangkan ${opponent?.username || 'lawan'}!`
            : `${winnerUsername} berhasil memenangkan duel taruhan kali ini.`}
        </div>

        <div className="byone-result-payout">
          <span className="p-lbl">{isMeWinner ? 'TOTAL KOIN DIMENANGKAN' : 'TOTAL KOIN TARUHAN'}</span>
          <span className="p-amt">
            {isMeWinner ? `+${formatCoins(winPayout)} 🪙` : `-${formatCoins(winPayout / 2)} 🪙`}
          </span>
        </div>

        <div className="byone-result-btns">
          <button
            className="byone-btn-rematch"
            onClick={() => {
              startMatchmaking(selectedTier);
            }}
          >
            ⚔️ TANTANG LAGI (REMATCH)
          </button>
          <button className="byone-btn-exit" onClick={() => setViewMode('lobby')}>
            🚪 KE LOBBY
          </button>
        </div>
      </div>
    </div>
  );

  // =====================================================
  // MAIN RETURN
  // =====================================================
  return (
    <div className="byone-container">
      <div className="byone-bg-art" />
      <div className="byone-bg-overlay" />

      {/* Header */}
      <div className="byone-header">
        <div className="byone-header-left">
          <button
            className="byone-back-btn"
            onClick={() => {
              if ((viewMode === 'playing' || viewMode === 'versus') && !isOpponentBot) {
                if (!confirm('Keluar dari duel? Anda akan dianggap menyerah dan lawan otomatis menang!')) {
                  return;
                }
                if (socket && socket.connected && !hasForfeitedRef.current) {
                  hasForfeitedRef.current = true;
                  socket.emit('byone_forfeit', {
                    matchId,
                    roomCode: customCode || undefined,
                    username: myUsername,
                  });
                }
              }
              onBack();
            }}
            title="Kembali ke Beranda"
          >
            «
          </button>
          <div className="byone-header-title">
            <div className="byone-title-main">
              <span>ARENA BY ONE</span>
              <span className="byone-title-badge">1 VS 1</span>
            </div>
            <div className="byone-title-sub">Adu Taruhan • Duel Sengit • Pemenang Ambil Semua</div>
          </div>
        </div>

        <div className="byone-header-right">
          <div className="byone-user-pill">
            <div className="byone-avatar">
              <img src={myAvatar} alt={myUsername} onError={e => { (e.target as HTMLElement).style.display = 'none'; }} />
            </div>
            <div className="byone-user-info">
              <span className="byone-username">{myUsername}</span>
              <span className="byone-coins">🪙 {formatCoins(myCoins)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body depending on viewMode */}
      {viewMode === 'lobby' && renderLobby()}
      {viewMode === 'matching' && renderMatching()}
      {viewMode === 'versus' && renderVersus()}
      {viewMode === 'playing' && renderPlaying()}
      {viewMode === 'result' && renderResult()}
    </div>
  );
}
