import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { API_URL } from './config';
import './byone.css';

interface ByOneRoomModalProps {
  onClose: () => void;
  onLaunchGame: (mode: 'billiard' | 'domino' | 'qiuqiu', bet: number, opponent?: string) => void;
  socket: Socket | null;
}

const AVAILABLE_MODES = [
  {
    id: 'domino' as const,
    name: 'DOMINO GAPLE',
    icon: '🀄',
    tag: '🔥 POPULER',
    desc: 'Duel 7 Balak 1v1, Banting Balak & Dobel Taruhan 2X!',
    badgeColor: '#e74c3c',
  },
  {
    id: 'billiard' as const,
    name: 'BILLIARD 8-BALL',
    icon: '🎱',
    tag: '⭐ SKILL',
    desc: 'Adu Sodok Bola 1v1, Masukkan Bola 8 & Ambil Pot!',
    badgeColor: '#2ecc71',
  },
  {
    id: 'qiuqiu' as const,
    name: 'QIUQIU (QQ)',
    icon: '🃏',
    tag: '💰 CEPAT',
    desc: 'Adu Kombinasi Kartu Qiu 9-9 & Balak Kembar 1v1!',
    badgeColor: '#f39c12',
  },
];

const QUICK_BETS = [
  { val: 50000, label: '50K' },
  { val: 250000, label: '250K' },
  { val: 1000000, label: '1M' },
  { val: 5000000, label: '5M' },
  { val: 10000000, label: '10M' },
  { val: 25000000, label: '25M' },
];

const BOT_RIVALS = [
  'Sultan_Fajar', 'RatuGaple_Ayu', 'Budi_Master', 'DewaBanting_99', 'Sniper_Kartu'
];

export default function ByOneRoomModal({ onClose, onLaunchGame, socket }: ByOneRoomModalProps) {
  const myUsername = localStorage.getItem('domino_username') || 'Player';
  const [myCoins, setMyCoins] = useState<number>(0);
  const [tab, setTab] = useState<'create' | 'join' | 'quick'>('create');

  // Creation State
  const [selectedMode, setSelectedMode] = useState<'billiard' | 'domino' | 'qiuqiu'>('domino');
  const [selectedBet, setSelectedBet] = useState<number>(1000000);
  const [customBetInput, setCustomBetInput] = useState<string>('');

  // Waiting Room State
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<any>(null);

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

    socket.on('byone_room_duel_start', (data: any) => {
      // Both players start duel!
      const opp = data.player1.username === myUsername ? data.player2.username : data.player1.username;
      onClose();
      onLaunchGame(data.mode, data.betAmount, opp);
    });

    socket.on('byone_room_error', ({ message }: any) => {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(null), 4000);
    });

    return () => {
      socket.off('byone_custom_room_created');
      socket.off('byone_room_duel_start');
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
    if (myCoins < bet) {
      setErrorMsg(`⚠️ Koin tidak cukup! Saldo Anda ${formatCoins(myCoins)}, butuh ${formatCoins(bet)} 🪙`);
      return;
    }

    if (socket && socket.connected) {
      socket.emit('byone_create_custom_room', {
        username: myUsername,
        mode: selectedMode,
        betAmount: bet,
      });
    } else {
      // Fallback local code
      const localCode = Math.floor(100000 + Math.random() * 900000).toString();
      setActiveRoomCode(localCode);
      setRoomData({
        code: localCode,
        mode: selectedMode,
        betAmount: bet,
        pot: bet * 2,
      });
    }
  };

  // Cancel Room
  const handleCancelRoom = () => {
    if (activeRoomCode && socket && socket.connected) {
      socket.emit('byone_cancel_custom_room', { code: activeRoomCode });
    }
    setActiveRoomCode(null);
    setRoomData(null);
  };

  // Join Room
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

  // Quick Play against AI Rival
  const handlePlayWithBot = () => {
    const bet = getEffectiveBet();
    if (myCoins < bet) {
      setErrorMsg(`⚠️ Koin tidak cukup! Butuh ${formatCoins(bet)} 🪙`);
      return;
    }
    const randomBot = BOT_RIVALS[Math.floor(Math.random() * BOT_RIVALS.length)];
    onClose();
    onLaunchGame(selectedMode, bet, randomBot);
  };

  return (
    <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1700 }} onClick={onClose}>
      <div
        className="byone-modal-card tm-box-bounce"
        onClick={e => e.stopPropagation()}
        style={{
          width: '92vw',
          maxWidth: '680px',
          maxHeight: '90vh',
          background: 'linear-gradient(165deg, #1b0a2a 0%, #0c0415 100%)',
          border: '2px solid rgba(255, 215, 0, 0.4)',
          borderRadius: '24px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.9), 0 0 30px rgba(231,76,60,0.3)',
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
            background: 'linear-gradient(90deg, rgba(231,76,60,0.2) 0%, rgba(241,196,15,0.15) 100%)',
            borderBottom: '1px solid rgba(255,215,0,0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1vw' }}>
            <span style={{ fontSize: '3vh' }}>⚔️</span>
            <div>
              <div style={{ fontSize: '2.4vh', fontWeight: 900, color: '#f1c40f', letterSpacing: '1px' }}>
                ROOM BY ONE (1 VS 1)
              </div>
              <div style={{ fontSize: '1.3vh', color: 'rgba(255,255,255,0.7)' }}>
                Adu Taruhan • Pilih Game • Pemenang Ambil Semua!
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

        {/* Content Body */}
        <div style={{ padding: '2vh 2.5vw', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2vh' }}>
          
          {/* WAITING ROOM SCREEN IF ROOM IS ACTIVE */}
          {activeRoomCode ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2vh', textAlign: 'center', padding: '2vh 0' }}>
              <div style={{ fontSize: '1.8vh', color: 'rgba(255,255,255,0.8)' }}>
                Kamar By One Berhasil Dibuat!
              </div>

              {/* Big Room Code Box */}
              <div
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  border: '2px dashed #f1c40f',
                  borderRadius: '18px',
                  padding: '2vh 4vw',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.8vh',
                  boxShadow: '0 0 25px rgba(241,196,15,0.2)',
                }}
              >
                <div style={{ fontSize: '1.4vh', color: 'rgba(255,255,255,0.6)', letterSpacing: '1px' }}>
                  KODE KAMAR 1V1 (BAGIKAN KE TEMAN)
                </div>
                <div style={{ fontSize: '5vh', fontWeight: 1000, letterSpacing: '6px', color: '#f1c40f' }}>
                  {activeRoomCode}
                </div>
                <button
                  style={{
                    background: 'rgba(241,196,15,0.2)',
                    border: '1px solid #f1c40f',
                    color: '#f1c40f',
                    padding: '0.6vh 1.8vw',
                    borderRadius: '12px',
                    fontSize: '1.4vh',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    navigator.clipboard?.writeText(activeRoomCode);
                    alert(`Kode Kamar #${activeRoomCode} berhasil disalin!`);
                  }}
                >
                  📋 Salin Kode Kamar
                </button>
              </div>

              {/* Room Info Details */}
              <div
                style={{
                  display: 'flex',
                  gap: '2vw',
                  background: 'rgba(255,255,255,0.06)',
                  padding: '1.2vh 2vw',
                  borderRadius: '14px',
                  fontSize: '1.5vh',
                }}
              >
                <div>🎮 Game: <b>{AVAILABLE_MODES.find(m => m.id === (roomData?.mode || selectedMode))?.name}</b></div>
                <div>💰 Taruhan: <b style={{ color: '#f1c40f' }}>{formatCoins(roomData?.betAmount || getEffectiveBet())} 🪙</b></div>
                <div>🏆 Pot Hadiah: <b style={{ color: '#2ecc71' }}>{formatCoins((roomData?.betAmount || getEffectiveBet()) * 2)} 🪙</b></div>
              </div>

              {/* Radar pulse */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8vw', color: '#3498db', fontSize: '1.5vh', fontWeight: 'bold' }}>
                <span className="byone-pot-coin-icon">🔍</span>
                <span>Menunggu lawan bergabung menggunakan kode kamar...</span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1.5vw', width: '100%', marginTop: '1vh' }}>
                <button
                  style={{
                    flex: 1.2,
                    padding: '1.4vh 0',
                    borderRadius: '12px',
                    background: 'linear-gradient(90deg, #e67e22, #f39c12)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '1.6vh',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(243,156,18,0.4)',
                  }}
                  onClick={handlePlayWithBot}
                >
                  ⚡ Duel Lawan AI Rival Sekarang
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: '1.4vh 0',
                    borderRadius: '12px',
                    background: 'rgba(231,76,60,0.2)',
                    border: '1px solid #e74c3c',
                    color: '#ff7675',
                    fontSize: '1.6vh',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                  onClick={handleCancelRoom}
                >
                  Batal Room
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '1vw' }}>
                <button
                  style={{
                    flex: 1,
                    padding: '1vh 0',
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
                    padding: '1vh 0',
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
                  
                  {/* Step 1: Mode Selection */}
                  <div>
                    <div style={{ fontSize: '1.5vh', fontWeight: 800, color: 'rgba(255,255,255,0.8)', marginBottom: '1vh' }}>
                      1. PILIH GAME YANG MAU DIMAINKAN:
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
                              padding: '1.5vh 1vw',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 0 20px rgba(241,196,15,0.3)' : 'none',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <span style={{ fontSize: '3.5vh', marginBottom: '0.5vh' }}>{m.icon}</span>
                            <span style={{ fontSize: '1.6vh', fontWeight: 900, color: isSelected ? '#f1c40f' : '#fff' }}>
                              {m.name}
                            </span>
                            <span
                              style={{
                                fontSize: '1.1vh',
                                background: m.badgeColor,
                                color: '#fff',
                                padding: '0.1vh 0.6vw',
                                borderRadius: '8px',
                                fontWeight: 800,
                                marginTop: '0.5vh',
                              }}
                            >
                              {m.tag}
                            </span>
                            <span style={{ fontSize: '1.2vh', color: 'rgba(255,255,255,0.6)', marginTop: '0.5vh' }}>
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
                      2. PILIH NOMINAL TARUHAN (ADU TARUHAN):
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
                      <span style={{ fontSize: '1.4vh', color: 'rgba(255,255,255,0.7)' }}>Atau Nominal Kustom:</span>
                      <input
                        type="number"
                        placeholder="Contoh: 2000000"
                        value={customBetInput}
                        onChange={e => setCustomBetInput(e.target.value)}
                        style={{
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,215,0,0.3)',
                          borderRadius: '8px',
                          padding: '0.6vh 1vw',
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
                      padding: '1.2vh 2vw',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '1.3vh', color: 'rgba(255,255,255,0.6)' }}>TARUHAN ANDA:</div>
                      <div style={{ fontSize: '1.8vh', fontWeight: 900, color: '#fff' }}>
                        {formatCoins(getEffectiveBet())} 🪙
                      </div>
                    </div>
                    <div style={{ fontSize: '2.5vh', color: '#e74c3c' }}>⚔️</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.3vh', color: 'rgba(255,255,255,0.6)' }}>TOTAL POT HADIAH PEMENANG:</div>
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
                    Punya Kode Kamar dari Teman? Masukkan 6 Digit Kode di bawah untuk langsung beradu taruhan!
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
                    ⚔️ GABUNG & MULAI DUEL
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
