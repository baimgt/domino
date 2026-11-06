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
    name: 'KINGS BILLIARD 8-BALL',
    shortName: 'Billiard 8-Ball',
    icon: '🎱',
    tag: '1 VS 1 DUEL',
    desc: 'Adu sodok bola 1 lawan 1, masukkan bola 8 & rebut seluruh pot!',
    maxPlayers: 2,
    accent: '#10b981',
    bgGrad: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 78, 59, 0.45) 100%)',
  },
  {
    id: 'domino' as const,
    name: 'DOMINO GAPLE ARENA',
    shortName: 'Domino Gaple',
    icon: '🀄',
    tag: '2 - 4 PEMAIN',
    desc: 'Duel balak & strategi kartu di meja privat bersama teman!',
    maxPlayers: 4,
    accent: '#ef4444',
    bgGrad: 'linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(127, 29, 29, 0.45) 100%)',
  },
  {
    id: 'qiuqiu' as const,
    name: 'QIUQIU (QQ) ROYAL',
    shortName: 'QiuQiu (QQ)',
    icon: '🃏',
    tag: '2 - 6 PEMAIN',
    desc: 'Adu kombinasi kartu Qiu 9-9, Murni & Six Devil bareng kawan!',
    maxPlayers: 6,
    accent: '#f59e0b',
    bgGrad: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(120, 53, 15, 0.45) 100%)',
  },
];

const QUICK_BETS = [
  { val: 20000, label: '20K' },
  { val: 50000, label: '50K' },
  { val: 100000, label: '100K' },
  { val: 200000, label: '200K' },
  { val: 300000, label: '300K' },
  { val: 500000, label: '500K' },
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
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

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
      setActiveRoomCode(code || room?.code);
      setRoomData(room);
      setErrorMsg(null);
    });

    socket.on('byone_room_player_joined', ({ code, room, newPlayer }: any) => {
      if (code || room?.code) setActiveRoomCode(code || room.code);
      setRoomData(room);
      setErrorMsg(null);
      if (newPlayer?.username) {
        setJoinToast(`🎉 ${newPlayer.username} telah bergabung ke kamar duel!`);
        setTimeout(() => setJoinToast(null), 3500);
      }
    });

    socket.on('byone_room_updated', ({ code, room }: any) => {
      if (code || room?.code) setActiveRoomCode(code || room.code);
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
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
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
    if (bet < 5000 || bet > 500000) {
      setErrorMsg('Taruhan harus antara 5.000 (5K) sampai 500.000 (500K) koin!');
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
      setErrorMsg('Minimal butuh 2 pemain untuk memulai pertandingan!');
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
    const cleanCode = inputCode.replace(/[^0-9]/g, '').trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMsg('Masukkan 6-digit angka kode kamar!');
      return;
    }

    if (socket && socket.connected) {
      socket.emit('byone_join_custom_room', {
        username: myUsername,
        code: cleanCode,
      });
    } else {
      setErrorMsg('Koneksi server terputus. Silakan coba lagi.');
    }
  };

  const handleCopyRoomCode = () => {
    if (!activeRoomCode) return;
    navigator.clipboard?.writeText(activeRoomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const handlePasteCode = async () => {
    try {
      const txt = await navigator.clipboard.readText();
      const digits = txt.replace(/[^0-9]/g, '').slice(0, 6);
      if (digits) setInputCode(digits);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleNumpadPress = (digit: string) => {
    if (digit === 'CLR') {
      setInputCode('');
      return;
    }
    if (digit === 'DEL') {
      setInputCode(prev => prev.slice(0, -1));
      return;
    }
    setInputCode(prev => (prev.length < 6 ? prev + digit : prev));
  };

  const currentModeConfig = AVAILABLE_MODES.find(m => m.id === (roomData?.mode || selectedMode)) || AVAILABLE_MODES[0];
  const isHost = roomData?.hostUsername === myUsername;
  const playersList: any[] = roomData?.players || [];
  const maxCapacity = roomData?.maxPlayers || currentModeConfig.maxPlayers;

  return (
    <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1700 }} onClick={onClose}>
      <div className="bo2-modal-box tm-box-bounce" onClick={e => e.stopPropagation()}>
        {/* TOP HEADER BAR */}
        <div className="bo2-header">
          <div className="bo2-brand">
            <div className="bo2-brand-emblem">⚔️</div>
            <div>
              <div className="bo2-brand-title">ARENA BY ONE PRIVAT</div>
              <div className="bo2-brand-sub">Duel Langsung Bareng Teman • Auto-Win Anti Kabur</div>
            </div>
          </div>

          {!activeRoomCode && (
            <div className="bo2-nav-tabs">
              <button
                className={`bo2-nav-tab g-btn-press ${tab === 'create' ? 'active-create' : ''}`}
                onClick={() => setTab('create')}
              >
                <span>⚔️</span> Buat Kamar Duel
              </button>
              <button
                className={`bo2-nav-tab g-btn-press ${tab === 'join' ? 'active-join' : ''}`}
                onClick={() => setTab('join')}
              >
                <span>🔑</span> Gabung Pakai Kode
              </button>
            </div>
          )}

          <div className="bo2-header-right">
            <div className="bo2-wallet-pill">
              <span>🪙</span>
              <span>{formatCoins(myCoins)}</span>
            </div>
            <button className="bo2-close-btn g-btn-press" onClick={onClose} aria-label="Tutup">
              ✕
            </button>
          </div>
        </div>

        {/* FLOATING BANNERS (ERROR / TOAST) */}
        {errorMsg && <div className="bo2-banner error">{errorMsg}</div>}
        {joinToast && <div className="bo2-banner success">{joinToast}</div>}

        {/* MAIN BODY */}
        <div className="bo2-body">
          {activeRoomCode ? (
            /* =====================================================
               WAITING ROOM (LIVE PLAYER SLOTS & VS ARENA)
               ===================================================== */
            <div className="bo2-waiting-stage">
              {/* Top Ticket & Info Bar */}
              <div className="bo2-waiting-topbar">
                <div className="bo2-code-ticket">
                  <div className="bo2-code-meta">
                    <span className="bo2-code-kicker">KODE KAMAR PRIVAT</span>
                    <span className="bo2-code-digits">#{activeRoomCode}</span>
                  </div>
                  <button className="bo2-copy-code-btn g-btn-press" onClick={handleCopyRoomCode}>
                    {copiedCode ? '✓ Tersalin!' : '📋 Salin Kode'}
                  </button>
                </div>

                <div className="bo2-room-stats-group">
                  <div className="bo2-room-stat-pill">
                    <span className="bo2-rs-lbl">CABANG DUEL</span>
                    <span className="bo2-rs-val">{currentModeConfig.icon} {currentModeConfig.shortName}</span>
                  </div>
                  <div className="bo2-room-stat-pill">
                    <span className="bo2-rs-lbl">TARUHAN / ORANG</span>
                    <span className="bo2-rs-val gold">🪙 {formatCoins(roomData?.betAmount || getEffectiveBet())}</span>
                  </div>
                  <div className="bo2-room-stat-pill">
                    <span className="bo2-rs-lbl">TOTAL POT JUARA</span>
                    <span className="bo2-rs-val green">
                      🏆 {formatCoins((roomData?.betAmount || getEffectiveBet()) * Math.max(2, playersList.length))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Center Live Player Slots */}
              <div className="bo2-slots-section">
                <div className="bo2-slots-header">
                  <span className="bo2-slots-title">
                    👥 PEMAIN DI DALAM KAMAR ({playersList.length}/{maxCapacity})
                  </span>
                  <span className={`bo2-slots-status ${playersList.length >= 2 ? 'ready' : ''}`}>
                    {playersList.length < 2
                      ? '⏳ Bagikan kode kamar ke teman Anda untuk memulai...'
                      : '✨ Lawan sudah siap! Pertandingan siap dimulai!'}
                  </span>
                </div>

                {maxCapacity === 2 ? (
                  /* 1v1 ESPORTS VERSUS CARD LAYOUT FOR BILLIARD */
                  <div className="bo2-vs-duel-row">
                    {[0, 1].map(idx => {
                      const player = playersList[idx];
                      const isMe = player?.username === myUsername;

                      return (
                        <div key={idx} className="bo2-vs-slot-wrap">
                          {idx === 1 && (
                            <div className="bo2-vs-center-badge">
                              <span>VS</span>
                            </div>
                          )}
                          {player ? (
                            <div className={`bo2-player-card duel-size ${isMe ? 'is-me' : ''}`}>
                              <span className={`bo2-role-tag ${player.isHost ? 'host' : 'ready'}`}>
                                {player.isHost ? '👑 HOST' : '✅ SIAP TANDING'}
                              </span>
                              <div className="bo2-player-avatar-ring">
                                {renderSlotAvatar(player.avatar, 'byone-slot-avatar', '🐸')}
                              </div>
                              <div className="bo2-player-name">
                                {player.username} {isMe && <span className="bo2-you-tag">(Anda)</span>}
                              </div>
                              <div className="bo2-player-coins">🪙 {formatCoins(player.coins || 0)} Koin</div>
                            </div>
                          ) : (
                            <div className="bo2-player-card duel-size empty">
                              <div className="bo2-empty-avatar-pulse">👤</div>
                              <div className="bo2-empty-title">Menunggu Lawan...</div>
                              <div className="bo2-empty-sub">Kirim Kode #{activeRoomCode} ke Teman</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* MULTI-PLAYER GRID FOR DOMINO (4P) & QIUQIU (6P) */
                  <div className={`bo2-multi-slots-grid cols-${maxCapacity <= 4 ? '4' : '6'}`}>
                    {Array.from({ length: maxCapacity }).map((_, idx) => {
                      const player = playersList[idx];
                      const isMe = player?.username === myUsername;

                      if (player) {
                        return (
                          <div key={idx} className={`bo2-player-card ${isMe ? 'is-me' : ''}`}>
                            <span className={`bo2-role-tag ${player.isHost ? 'host' : 'ready'}`}>
                              {player.isHost ? '👑 HOST' : '✅ SIAP'}
                            </span>
                            <div className="bo2-player-avatar-ring">
                              {renderSlotAvatar(player.avatar, 'byone-slot-avatar', '🐸')}
                            </div>
                            <div className="bo2-player-name">
                              {player.username} {isMe && <span className="bo2-you-tag">(Anda)</span>}
                            </div>
                            <div className="bo2-player-coins">🪙 {formatCoins(player.coins || 0)}</div>
                          </div>
                        );
                      }

                      return (
                        <div key={idx} className="bo2-player-card empty">
                          <div className="bo2-empty-avatar-pulse">👤</div>
                          <div className="bo2-empty-title">Slot {idx + 1} Kosong</div>
                          <div className="bo2-empty-sub">Menunggu teman...</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="bo2-waiting-footer">
                {isHost ? (
                  <>
                    <button
                      className={`bo2-start-btn g-btn-press ${playersList.length >= 2 ? 'ready' : 'disabled'}`}
                      disabled={playersList.length < 2}
                      onClick={handleStartGame}
                    >
                      {playersList.length >= 2
                        ? `🚀 MULAI PERTANDINGAN SEKARANG (${playersList.length}/${maxCapacity} PEMAIN)`
                        : `⏳ MENUNGGU TEMAN BERGABUNG (${playersList.length}/${maxCapacity})`}
                    </button>
                    <button className="bo2-cancel-btn g-btn-press" onClick={handleCancelRoom}>
                      ✖ Bubarkan Kamar
                    </button>
                  </>
                ) : (
                  <>
                    <div className="bo2-guest-wait-banner">
                      <span className="bo2-wait-spinner">⏳</span>
                      <span>Menunggu Host (<strong>{roomData?.hostUsername}</strong>) memulai pertandingan...</span>
                    </div>
                    <button className="bo2-cancel-btn g-btn-press" onClick={handleLeaveRoom}>
                      🚪 Keluar Kamar
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : tab === 'create' ? (
            /* =====================================================
               TAB 1: CREATE ROOM (2-COLUMN ARENA BUILDER)
               ===================================================== */
            <div className="bo2-create-layout">
              {/* LEFT COLUMN: CHOOSE GAME MODE */}
              <div className="bo2-col-modes">
                <div className="bo2-section-heading">
                  <span className="bo2-step-num">1</span>
                  <span>PILIH CABANG PERMAINAN</span>
                </div>

                <div className="bo2-modes-list">
                  {AVAILABLE_MODES.map(m => {
                    const isSelected = selectedMode === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`bo2-mode-card g-btn-press ${isSelected ? 'selected' : ''}`}
                        style={{
                          '--mode-accent': m.accent,
                          '--mode-bg': m.bgGrad,
                        } as React.CSSProperties}
                        onClick={() => setSelectedMode(m.id)}
                      >
                        <div className="bo2-mode-icon-box">{m.icon}</div>
                        <div className="bo2-mode-info">
                          <div className="bo2-mode-top-row">
                            <span className="bo2-mode-name">{m.name}</span>
                            <span className="bo2-mode-tag" style={{ background: m.accent }}>
                              {m.tag}
                            </span>
                          </div>
                          <div className="bo2-mode-desc">{m.desc}</div>
                        </div>
                        <div className={`bo2-mode-radio ${isSelected ? 'checked' : ''}`}>
                          {isSelected ? '✓' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT COLUMN: CHOOSE STAKE & CREATE */}
              <div className="bo2-col-stakes">
                <div className="bo2-section-heading">
                  <span className="bo2-step-num">2</span>
                  <span>ATUR TARUHAN PER PEMAIN</span>
                </div>

                <div className="bo2-stakes-box">
                  <div className="bo2-quick-bets-grid">
                    {QUICK_BETS.map(b => {
                      const active = selectedBet === b.val && !customBetInput;
                      return (
                        <button
                          key={b.val}
                          className={`bo2-bet-chip g-btn-press ${active ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedBet(b.val);
                            setCustomBetInput('');
                          }}
                        >
                          <span className="bo2-chip-coin">🪙</span>
                          <span>{b.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="bo2-custom-bet-row">
                    <span className="bo2-custom-bet-lbl">Nominal Kustom:</span>
                    <input
                      type="number"
                      className="bo2-custom-bet-input"
                      placeholder="Ketik 5.000 - 500.000"
                      value={customBetInput}
                      onChange={e => setCustomBetInput(e.target.value)}
                    />
                  </div>
                </div>

                {/* Live Pot Preview Card */}
                <div className="bo2-pot-preview-card">
                  <div className="bo2-pot-side">
                    <span className="bo2-pot-lbl">TARUHAN ANDA</span>
                    <span className="bo2-pot-val">🪙 {formatCoins(getEffectiveBet())}</span>
                  </div>
                  <div className="bo2-pot-vs-divider">⚔️</div>
                  <div className="bo2-pot-side right">
                    <span className="bo2-pot-lbl">ESTIMASI TOTAL POT</span>
                    <span className="bo2-pot-val highlight">
                      🏆 {formatCoins(getEffectiveBet() * 2)}
                      {currentModeConfig.maxPlayers > 2 ? ` - ${formatCoins(getEffectiveBet() * currentModeConfig.maxPlayers)}` : ''}
                    </span>
                  </div>
                </div>

                {/* Create CTA Button */}
                <button className="bo2-submit-create-btn g-btn-press" onClick={handleCreateRoom}>
                  <span>✨</span>
                  <span>BUAT KAMAR & DAPATKAN KODE 6-DIGIT</span>
                </button>
              </div>
            </div>
          ) : (
            /* =====================================================
               TAB 2: JOIN ROOM (6-DIGIT PIN DISPLAY + TOUCH NUMPAD)
               ===================================================== */
            <div className="bo2-join-layout">
              {/* Left Side: 6-Digit Visual Code Input & Submit */}
              <div className="bo2-join-left">
                <div className="bo2-join-header-text">
                  <div className="bo2-join-title">🔑 MASUKKAN 6-DIGIT KODE KAMAR</div>
                  <div className="bo2-join-sub">
                    Mintalah kode 6 angka dari teman yang membuat kamar untuk langsung masuk ke meja duel!
                  </div>
                </div>

                {/* 6 Individual Digit Boxes + Hidden/Direct Input */}
                <div className="bo2-pin-boxes-wrap" onClick={() => document.getElementById('bo2-hidden-code-input')?.focus()}>
                  {Array.from({ length: 6 }).map((_, i) => {
                    const char = inputCode[i] || '';
                    const isFocused = inputCode.length === i || (inputCode.length === 6 && i === 5);
                    return (
                      <div key={i} className={`bo2-pin-slot ${char ? 'filled' : ''} ${isFocused ? 'active' : ''}`}>
                        {char || '•'}
                      </div>
                    );
                  })}
                  <input
                    id="bo2-hidden-code-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    className="bo2-hidden-input"
                    autoFocus
                  />
                </div>

                <div className="bo2-join-quick-tools">
                  <button className="bo2-tool-btn g-btn-press" onClick={handlePasteCode}>
                    📋 Tempel Kode
                  </button>
                  <button className="bo2-tool-btn clear g-btn-press" onClick={() => setInputCode('')}>
                    🗑️ Bersihkan
                  </button>
                </div>

                <button
                  className={`bo2-submit-join-btn g-btn-press ${inputCode.length === 6 ? 'ready' : ''}`}
                  onClick={handleJoinRoom}
                >
                  🚪 GABUNG KE KAMAR SEKARANG
                </button>
              </div>

              {/* Right Side: Interactive Touch Keypad */}
              <div className="bo2-join-numpad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'].map(key => (
                  <button
                    key={key}
                    className={`bo2-numpad-key g-btn-press ${key === 'CLR' ? 'key-clr' : key === 'DEL' ? 'key-del' : ''}`}
                    onClick={() => handleNumpadPress(key)}
                  >
                    {key === 'DEL' ? '⌫' : key}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
