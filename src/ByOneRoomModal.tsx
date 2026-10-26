import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { API_URL } from './config';
import { renderSlotAvatar } from './SlotProfileModal';
import './byone.css';

interface ByOneRoomModalProps {
  onClose: () => void;
  onLaunchGame: (mode: 'billiard' | 'domino' | 'qiuqiu', bet: number, players: any[], code: string) => void;
  socket: Socket | null;
}

const AVAILABLE_MODES = [
  {
    id: 'billiard' as const,
    name: 'KINGS BILLIARDS 8-BALL',
    icon: '🎱',
    tag: '2 PEMAIN (1v1)',
    desc: 'Adu Sodok Bola 1v1, Masukkan Bola 8 & Ambil Pot!',
    maxPlayers: 2,
    badgeColor: '#2ecc71',
  },
  {
    id: 'domino' as const,
    name: 'DOMINO GAPLE',
    icon: '🀄',
    tag: 'MAKS 4 PEMAIN',
    desc: 'Duel Balak, Banting Kartu & Dobel Taruhan 2X!',
    maxPlayers: 4,
    badgeColor: '#e74c3c',
  },
  {
    id: 'qiuqiu' as const,
    name: 'QIUQIU (QQ)',
    icon: '🃏',
    tag: 'MAKS 6 PEMAIN',
    desc: 'Adu Kombinasi Kartu Qiu 9-9 & Balak Kembar!',
    maxPlayers: 6,
    badgeColor: '#f39c12',
  },
];

const QUICK_BETS = [
  { val: 5000, label: '5K' },
  { val: 10000, label: '10K' },
  { val: 20000, label: '20K' },
  { val: 50000, label: '50K' },
  { val: 100000, label: '100K' },
  { val: 200000, label: '200K' },
];

export default function ByOneRoomModal({ onClose, onLaunchGame, socket }: ByOneRoomModalProps) {
  const myUsername = localStorage.getItem('domino_username') || 'Player';
  const [myCoins, setMyCoins] = useState<number>(0);
  const [myBonusCoins, setMyBonusCoins] = useState<number>(0);
  const [tab, setTab] = useState<'create' | 'join'>('create');

  // Creation State
  const [selectedMode, setSelectedMode] = useState<'billiard' | 'domino' | 'qiuqiu'>('billiard');
  const [selectedBet, setSelectedBet] = useState<number>(20000);
  const [customBetInput, setCustomBetInput] = useState<string>('');

  // Waiting Room State
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<any>(null);
  const [joinToast, setJoinToast] = useState<string | null>(null);

  // Join State
  const [inputCode, setInputCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch coins
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/profile/${myUsername}`);
        if (res.ok) {
          const data = await res.json();
          setMyCoins(data.coins || 0);
          setMyBonusCoins(data.bonusCoins || 0);
        }
      } catch {
        const c = localStorage.getItem('domino_coins');
        if (c) setMyCoins(parseInt(c, 10));
      }
    };
    fetchProfile();
  }, [myUsername]);

  // Socket listener for room events
  useEffect(() => {
    if (!socket) return;

    socket.on('byone_custom_room_created', ({ code, room }: any) => {
      setActiveRoomCode(code);
      setRoomData(room);
    });

    socket.on('byone_room_player_joined', ({ room, newPlayer }: any) => {
      setRoomData(room);
      setJoinToast(`🎉 ${newPlayer.username} telah bergabung ke kamar!`);
      setTimeout(() => setJoinToast(null), 3500);
    });

    socket.on('byone_room_updated', ({ room }: any) => {
      setRoomData(room);
    });

    socket.on('byone_room_duel_start', (data: any) => {
      onClose();
      onLaunchGame(data.mode, data.betAmount, data.players || [data.player1, data.player2], data.code);
    });

    socket.on('byone_room_closed', ({ message }: any) => {
      setErrorMsg(message || 'Kamar telah ditutup.');
      setActiveRoomCode(null);
      setRoomData(null);
      setTimeout(() => setErrorMsg(null), 4000);
    });

    socket.on('byone_room_error', ({ message }: any) => {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(null), 4000);
    });

    return () => {
      socket.off('byone_custom_room_created');
      socket.off('byone_room_player_joined');
      socket.off('byone_room_updated');
      socket.off('byone_room_duel_start');
      socket.off('byone_room_closed');
      socket.off('byone_room_error');
    };
  }, [socket, myUsername, onClose, onLaunchGame]);

  const formatCoins = (n: number) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString('id-ID');
  };

  const getEffectiveBet = () => {
    if (customBetInput && parseInt(customBetInput, 10) > 0) {
      return parseInt(customBetInput, 10);
    }
    return selectedBet;
  };

  // Create Room
  const handleCreateRoom = () => {
    const bet = getEffectiveBet();
    if (bet < 5000 || bet > 200000) {
      setErrorMsg('Taruhan harus antara 5.000 (5K) sampai 200.000 (200K) koin!');
      return;
    }
    const usableCoins = Math.max(0, myCoins - myBonusCoins);
    if (usableCoins < bet) {
      if (myBonusCoins > 0 && myCoins >= bet) {
        setErrorMsg(`⚠️ Koin bonus harian (${formatCoins(myBonusCoins)}) hanya untuk game SLOT! Koin By One Anda: ${formatCoins(usableCoins)} 🪙`);
      } else {
        setErrorMsg(`⚠️ Koin tidak cukup! Saldo Anda ${formatCoins(myCoins)}, butuh ${formatCoins(bet)} 🪙`);
      }
      return;
    }

    if (socket && socket.connected) {
      socket.emit('byone_create_custom_room', {
        username: myUsername,
        mode: selectedMode,
        betAmount: bet,
      });
    } else {
      setErrorMsg('Koneksi server belum terhubung. Coba sesaat lagi.');
    }
  };

  // Host starts the game
  const handleStartGame = () => {
    if (!activeRoomCode || !socket || !socket.connected) return;
    if (!roomData || (roomData.players && roomData.players.length < 2)) {
      setErrorMsg('Minimal butuh 2 pemain untuk memulai permainan!');
      return;
    }
    socket.emit('byone_start_custom_room', {
      code: activeRoomCode,
      username: myUsername,
    });
  };

  // Cancel Room (Host)
  const handleCancelRoom = () => {
    if (activeRoomCode && socket && socket.connected) {
      socket.emit('byone_cancel_custom_room', { code: activeRoomCode });
    }
    setActiveRoomCode(null);
    setRoomData(null);
  };

  // Leave Room (Guest)
  const handleLeaveRoom = () => {
    if (activeRoomCode && socket && socket.connected) {
      socket.emit('byone_leave_custom_room', { code: activeRoomCode, username: myUsername });
    }
    setActiveRoomCode(null);
    setRoomData(null);
  };

  // Join Room via Code
  const handleJoinRoom = () => {
    if (!inputCode.trim() || inputCode.trim().length !== 6) {
      setErrorMsg('Masukkan 6-digit kode kamar!');
      return;
    }

    if (socket && socket.connected) {
      socket.emit('byone_join_custom_room', {
        username: myUsername,
        code: inputCode.trim(),
      });
    } else {
      setErrorMsg('Koneksi server terputus. Silakan coba lagi.');
    }
  };

  const currentModeConfig = AVAILABLE_MODES.find(m => m.id === (roomData?.mode || selectedMode)) || AVAILABLE_MODES[0];
  const isHost = roomData?.hostUsername === myUsername;
  const playersList: any[] = roomData?.players || [];
  const maxCapacity = roomData?.maxPlayers || currentModeConfig.maxPlayers;

  return (
    <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1700 }} onClick={onClose}>
      <div
        className="byone-modal-card tm-box-bounce"
        onClick={e => e.stopPropagation()}
        style={{
          width: '94vw',
          maxWidth: '720px',
          maxHeight: '92vh',
          background: 'linear-gradient(165deg, #1b0a2a 0%, #0c0415 100%)',
          border: '2px solid rgba(255, 215, 0, 0.4)',
          borderRadius: '24px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.95), 0 0 35px rgba(231,76,60,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#fff',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.8vh 2.5vw',
            background: 'linear-gradient(90deg, rgba(231,76,60,0.25) 0%, rgba(241,196,15,0.2) 100%)',
            borderBottom: '1px solid rgba(255,215,0,0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1vw' }}>
            <span style={{ fontSize: '3.2vh' }}>⚔️</span>
            <div>
              <div style={{ fontSize: '2.4vh', fontWeight: 900, color: '#f1c40f', letterSpacing: '1px' }}>
                LOBBY BY ONE PRIVAT
              </div>
              <div style={{ fontSize: '1.3vh', color: 'rgba(255,255,255,0.7)' }}>
                Billiard (2P) • Domino (Max 4P) • QiuQiu (Max 6P)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5vw' }}>
            <div
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid #f1c40f',
                padding: '0.4vh 1.2vw',
                borderRadius: '20px',
                fontSize: '1.5vh',
                fontWeight: 'bold',
                color: '#f1c40f',
              }}
            >
              🪙 {formatCoins(myCoins)}
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                fontSize: '2vh',
                borderRadius: '50%',
                width: '4vh',
                height: '4vh',
                cursor: 'pointer',
              }}
            >
              ✖
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div
            style={{
              background: '#e74c3c',
              color: '#fff',
              padding: '0.8vh 2vw',
              textAlign: 'center',
              fontSize: '1.4vh',
              fontWeight: 'bold',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Join Toast Alert */}
        {joinToast && (
          <div
            style={{
              background: 'linear-gradient(90deg, #27ae60, #2ecc71)',
              color: '#fff',
              padding: '0.8vh 2vw',
              textAlign: 'center',
              fontSize: '1.4vh',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(46,204,113,0.4)',
            }}
          >
            {joinToast}
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: '2vh 2.5vw', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2vh' }}>

          {/* =====================================================
              WAITING ROOM SCREEN (REAL-TIME LIVE PLAYER SLOTS)
          ===================================================== */}
          {activeRoomCode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2vh' }}>

              {/* Top Banner: Room Code & Summary */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0,0,0,0.5)',
                  border: '2px dashed #f1c40f',
                  borderRadius: '16px',
                  padding: '1.5vh 2vw',
                  boxShadow: '0 0 20px rgba(241,196,15,0.2)',
                  flexWrap: 'wrap',
                  gap: '1.5vh',
                }}
              >
                <div>
                  <div style={{ fontSize: '1.3vh', color: 'rgba(255,255,255,0.6)', letterSpacing: '1px' }}>
                    KODE KAMAR PRIVAT (BAGIKAN KE TEMAN):
                  </div>
                  <div style={{ fontSize: '4vh', fontWeight: 1000, letterSpacing: '4px', color: '#f1c40f' }}>
                    #{activeRoomCode}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1vw', alignItems: 'center' }}>
                  <button
                    style={{
                      background: 'linear-gradient(90deg, #f39c12, #e67e22)',
                      border: 'none',
                      color: '#fff',
                      padding: '0.8vh 1.6vw',
                      borderRadius: '12px',
                      fontSize: '1.4vh',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(243,156,18,0.3)',
                    }}
                    onClick={() => {
                      navigator.clipboard?.writeText(activeRoomCode);
                      alert(`Kode Kamar #${activeRoomCode} berhasil disalin! Bagikan ke teman.`);
                    }}
                  >
                    📋 Salin Kode
                  </button>
                </div>
              </div>

              {/* Game Mode & Pot Info Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '14px',
                  padding: '1.2vh 1.5vw',
                  fontSize: '1.4vh',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2vh' }}>GAME MODE</div>
                  <div style={{ fontWeight: 900, color: '#fff', marginTop: '0.3vh' }}>
                    {currentModeConfig.icon} {currentModeConfig.name}
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.5vw' }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2vh' }}>TARUHAN / ORANG</div>
                  <div style={{ fontWeight: 900, color: '#f1c40f', marginTop: '0.3vh' }}>
                    {formatCoins(roomData?.betAmount || getEffectiveBet())} 🪙
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.5vw' }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2vh' }}>TOTAL POT HADIAH</div>
                  <div style={{ fontWeight: 1000, color: '#2ecc71', marginTop: '0.3vh' }}>
                    {formatCoins((roomData?.betAmount || getEffectiveBet()) * Math.max(1, playersList.length))} 🪙
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.5vw' }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2vh' }}>KAPASITAS KAMAR</div>
                  <div style={{ fontWeight: 900, color: '#3498db', marginTop: '0.3vh' }}>
                    {playersList.length} / {maxCapacity} Pemain
                  </div>
                </div>
              </div>

              {/* Section Title */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5vh' }}>
                <div style={{ fontSize: '1.5vh', fontWeight: 900, color: 'rgba(255,255,255,0.9)' }}>
                  👥 DAFTAR PEMAIN DI KAMAR:
                </div>
                <div style={{ fontSize: '1.3vh', color: '#f39c12', fontWeight: 800 }}>
                  {playersList.length < 2 ? '⏳ Menunggu teman masuk...' : '✨ Siap dimulai!'}
                </div>
              </div>

              {/* LIVE PLAYER SLOTS GRID */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: maxCapacity <= 2 ? 'repeat(2, 1fr)' : maxCapacity <= 4 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
                  gap: '1.2vw',
                }}
              >
                {Array.from({ length: maxCapacity }).map((_, idx) => {
                  const player = playersList[idx];
                  const isMe = player?.username === myUsername;

                  if (player) {
                    return (
                      <div
                        key={idx}
                        style={{
                          background: isMe
                            ? 'linear-gradient(145deg, rgba(241,196,15,0.2), rgba(231,76,60,0.25))'
                            : 'rgba(255,255,255,0.07)',
                          border: isMe ? '2px solid #f1c40f' : '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '16px',
                          padding: '1.8vh 1vw',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          gap: '0.8vh',
                          boxShadow: isMe ? '0 0 15px rgba(241,196,15,0.3)' : 'none',
                          position: 'relative',
                        }}
                      >
                        {/* Status Pin */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            fontSize: '1vh',
                            fontWeight: 900,
                            padding: '0.2vh 0.6vw',
                            borderRadius: '10px',
                            background: player.isHost ? '#f1c40f' : '#2ecc71',
                            color: player.isHost ? '#000' : '#fff',
                          }}
                        >
                          {player.isHost ? '👑 HOST' : '✅ SIAP'}
                        </div>

                        {/* Avatar */}
                        <div
                          style={{
                            width: '6.5vh',
                            height: '6.5vh',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '2px solid #ffd700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#1a102a',
                          }}
                        >
                          {renderSlotAvatar(player.avatar, 'byone-slot-avatar', '🐸')}
                        </div>

                        {/* Username & VIP */}
                        <div>
                          <div style={{ fontSize: '1.6vh', fontWeight: 900, color: isMe ? '#f1c40f' : '#fff' }}>
                            {player.username} {isMe && '(Anda)'}
                          </div>
                          <div
                            style={{
                              fontSize: '1.1vh',
                              color: '#ffd700',
                              fontWeight: 800,
                              background: 'rgba(0,0,0,0.4)',
                              padding: '0.2vh 0.6vw',
                              borderRadius: '8px',
                              marginTop: '0.3vh',
                              display: 'inline-block',
                            }}
                          >
                            VIP {player.vipLevel || 0}
                          </div>
                        </div>

                        {/* Balance */}
                        <div style={{ fontSize: '1.2vh', color: 'rgba(255,255,255,0.7)' }}>
                          🪙 {formatCoins(player.coins || 0)}
                        </div>
                      </div>
                    );
                  }

                  // Empty Slot
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(0,0,0,0.25)',
                        border: '2px dashed rgba(255,255,255,0.18)',
                        borderRadius: '16px',
                        padding: '2vh 1vw',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        gap: '0.8vh',
                        minHeight: '13vh',
                      }}
                    >
                      <div
                        style={{
                          width: '5.5vh',
                          height: '5.5vh',
                          borderRadius: '50%',
                          border: '1px dashed rgba(255,255,255,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2.5vh',
                          color: 'rgba(255,255,255,0.3)',
                        }}
                      >
                        👤
                      </div>
                      <div style={{ fontSize: '1.3vh', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
                        Slot {idx + 1}
                      </div>
                      <div style={{ fontSize: '1.1vh', color: '#3498db' }}>
                        Menunggu pemain...
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons for Waiting Room */}
              <div style={{ marginTop: '1vh', display: 'flex', gap: '1.5vw', width: '100%' }}>
                {isHost ? (
                  <>
                    <button
                      style={{
                        flex: 1.5,
                        padding: '1.5vh 0',
                        borderRadius: '14px',
                        background: playersList.length >= 2
                          ? 'linear-gradient(90deg, #27ae60, #2ecc71)'
                          : 'rgba(255,255,255,0.1)',
                        border: playersList.length >= 2 ? 'none' : '1px solid rgba(255,255,255,0.2)',
                        color: playersList.length >= 2 ? '#fff' : 'rgba(255,255,255,0.4)',
                        fontSize: '1.7vh',
                        fontWeight: 900,
                        cursor: playersList.length >= 2 ? 'pointer' : 'not-allowed',
                        boxShadow: playersList.length >= 2 ? '0 4px 20px rgba(46,204,113,0.5)' : 'none',
                        letterSpacing: '1px',
                        transition: 'all 0.2s ease',
                      }}
                      disabled={playersList.length < 2}
                      onClick={handleStartGame}
                    >
                      {playersList.length >= 2
                        ? `🚀 MULAI PERMAINAN (${playersList.length}/${maxCapacity} PEMAIN)`
                        : `⏳ MENUNGGU TEMAN MASUK (${playersList.length}/${maxCapacity})`}
                    </button>
                    <button
                      style={{
                        flex: 1,
                        padding: '1.5vh 0',
                        borderRadius: '14px',
                        background: 'rgba(231,76,60,0.2)',
                        border: '1px solid #e74c3c',
                        color: '#ff7675',
                        fontSize: '1.6vh',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                      onClick={handleCancelRoom}
                    >
                      Batal Room
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        flex: 1.5,
                        padding: '1.5vh 0',
                        borderRadius: '14px',
                        background: 'rgba(52,152,219,0.2)',
                        border: '1px solid #3498db',
                        color: '#5dade2',
                        fontSize: '1.5vh',
                        fontWeight: 800,
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.8vw',
                      }}
                    >
                      <span>⏳</span>
                      <span>Menunggu Host ({roomData?.hostUsername}) Memulai Permainan...</span>
                    </div>
                    <button
                      style={{
                        flex: 1,
                        padding: '1.5vh 0',
                        borderRadius: '14px',
                        background: 'rgba(231,76,60,0.2)',
                        border: '1px solid #e74c3c',
                        color: '#ff7675',
                        fontSize: '1.6vh',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                      onClick={handleLeaveRoom}
                    >
                      Keluar Kamar
                    </button>
                  </>
                )}
              </div>

            </div>
          ) : (
            <>
              {/* =====================================================
                  TABS: CREATE ROOM vs JOIN ROOM
              ===================================================== */}
              <div style={{ display: 'flex', gap: '1vw' }}>
                <button
                  style={{
                    flex: 1,
                    padding: '1.2vh 0',
                    borderRadius: '12px',
                    background: tab === 'create' ? 'linear-gradient(90deg, #e74c3c, #c0392b)' : 'rgba(255,255,255,0.06)',
                    border: tab === 'create' ? '1px solid #ff7675' : '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontSize: '1.6vh',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                  onClick={() => setTab('create')}
                >
                  ⚔️ BIKIN ROOM BY ONE
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: '1.2vh 0',
                    borderRadius: '12px',
                    background: tab === 'join' ? 'linear-gradient(90deg, #2980b9, #3498db)' : 'rgba(255,255,255,0.06)',
                    border: tab === 'join' ? '1px solid #5dade2' : '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontSize: '1.6vh',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                  onClick={() => setTab('join')}
                >
                  🔑 GABUNG ROOM (KODE)
                </button>
              </div>

              {/* TAB 1: CREATE ROOM */}
              {tab === 'create' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2vh' }}>

                  {/* Step 1: Mode Selection with capacity tags */}
                  <div>
                    <div style={{ fontSize: '1.5vh', fontWeight: 800, color: 'rgba(255,255,255,0.8)', marginBottom: '1vh' }}>
                      1. PILIH GAME & JUMLAH PEMAIN:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1vw' }}>
                      {AVAILABLE_MODES.map(m => {
                        const isSelected = selectedMode === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => setSelectedMode(m.id)}
                            style={{
                              background: isSelected ? 'linear-gradient(145deg, rgba(241,196,15,0.2), rgba(231,76,60,0.25))' : 'rgba(255,255,255,0.05)',
                              border: isSelected ? '2px solid #f1c40f' : '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '16px',
                              padding: '1.6vh 1vw',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 0 20px rgba(241,196,15,0.3)' : 'none',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <span style={{ fontSize: '3.6vh', marginBottom: '0.5vh' }}>{m.icon}</span>
                            <span style={{ fontSize: '1.6vh', fontWeight: 900, color: isSelected ? '#f1c40f' : '#fff' }}>
                              {m.name}
                            </span>
                            <span
                              style={{
                                fontSize: '1.2vh',
                                background: m.badgeColor,
                                color: '#fff',
                                padding: '0.2vh 0.8vw',
                                borderRadius: '8px',
                                fontWeight: 800,
                                marginTop: '0.6vh',
                              }}
                            >
                              {m.tag}
                            </span>
                            <span style={{ fontSize: '1.2vh', color: 'rgba(255,255,255,0.6)', marginTop: '0.6vh', lineHeight: '1.3' }}>
                              {m.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Bet Selection */}
                  <div>
                    <div style={{ fontSize: '1.5vh', fontWeight: 800, color: 'rgba(255,255,255,0.8)', marginBottom: '1vh' }}>
                      2. PILIH NOMINAL TARUHAN PER PEMAIN:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.8vw', marginBottom: '1vh' }}>
                      {QUICK_BETS.map(b => (
                        <button
                          key={b.val}
                          style={{
                            padding: '1vh 0',
                            borderRadius: '10px',
                            background: selectedBet === b.val && !customBetInput ? 'linear-gradient(135deg, #f1c40f, #e67e22)' : 'rgba(255,255,255,0.08)',
                            border: selectedBet === b.val && !customBetInput ? '1.5px solid #f1c40f' : '1px solid rgba(255,255,255,0.15)',
                            color: selectedBet === b.val && !customBetInput ? '#000' : '#fff',
                            fontWeight: 900,
                            fontSize: '1.5vh',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            setSelectedBet(b.val);
                            setCustomBetInput('');
                          }}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1vw' }}>
                      <span style={{ fontSize: '1.4vh', color: 'rgba(255,255,255,0.7)' }}>Atau Kustom Koin:</span>
                      <input
                        type="number"
                        placeholder="Min 5.000 - Max 200.000"
                        value={customBetInput}
                        onChange={e => setCustomBetInput(e.target.value)}
                        style={{
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,215,0,0.3)',
                          borderRadius: '8px',
                          padding: '0.8vh 1vw',
                          color: '#fff',
                          fontSize: '1.5vh',
                          flex: 1,
                        }}
                      />
                    </div>
                  </div>

                  {/* Step 3: Pot Calculation Summary */}
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,215,0,0.2)',
                      borderRadius: '14px',
                      padding: '1.4vh 2vw',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '1.3vh', color: 'rgba(255,255,255,0.6)' }}>TARUHAN ANDA:</div>
                      <div style={{ fontSize: '1.9vh', fontWeight: 900, color: '#fff' }}>
                        {formatCoins(getEffectiveBet())} 🪙
                      </div>
                    </div>
                    <div style={{ fontSize: '2.5vh', color: '#e74c3c' }}>⚔️</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.3vh', color: 'rgba(255,255,255,0.6)' }}>POT MINIMAL (2 PEMAIN):</div>
                      <div style={{ fontSize: '2.2vh', fontWeight: 1000, color: '#f1c40f' }}>
                        {formatCoins(getEffectiveBet() * 2)} 🪙
                      </div>
                    </div>
                  </div>

                  {/* Create Room Button */}
                  <button
                    style={{
                      width: '100%',
                      padding: '1.6vh 0',
                      borderRadius: '14px',
                      background: 'linear-gradient(90deg, #e74c3c, #f39c12)',
                      border: 'none',
                      color: '#fff',
                      fontSize: '1.8vh',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 4px 20px rgba(231,76,60,0.4)',
                      letterSpacing: '1px',
                    }}
                    onClick={handleCreateRoom}
                  >
                    ✨ BIKIN ROOM BY ONE (KODE 6-DIGIT)
                  </button>
                </div>
              )}

              {/* TAB 2: JOIN ROOM */}
              {tab === 'join' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5vh', padding: '2vh 1vw' }}>
                  <div style={{ textAlign: 'center', fontSize: '1.6vh', color: 'rgba(255,255,255,0.8)' }}>
                    Punya Kode Kamar dari Teman? Masukkan 6 Digit Kode di bawah untuk melihat siapa yang ada di kamar dan langsung bergabung!
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="849201"
                      value={inputCode}
                      onChange={e => setInputCode(e.target.value)}
                      style={{
                        background: 'rgba(0,0,0,0.5)',
                        border: '2px solid #f1c40f',
                        borderRadius: '16px',
                        padding: '1.5vh 2vw',
                        color: '#f1c40f',
                        fontSize: '4vh',
                        fontWeight: 900,
                        letterSpacing: '6px',
                        textAlign: 'center',
                        width: '260px',
                        boxShadow: '0 0 20px rgba(241,196,15,0.2)',
                      }}
                    />
                  </div>

                  <button
                    style={{
                      width: '100%',
                      padding: '1.6vh 0',
                      borderRadius: '14px',
                      background: 'linear-gradient(90deg, #2980b9, #3498db)',
                      border: 'none',
                      color: '#fff',
                      fontSize: '1.8vh',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 4px 20px rgba(52,152,219,0.4)',
                    }}
                    onClick={handleJoinRoom}
                  >
                    🚪 GABUNG KE KAMAR
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
