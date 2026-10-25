import { useState, useEffect } from 'react';
import { API_URL } from './config';

interface ChangeNameModalProps {
  currentUsername: string;
  userCoins?: number;
  userId?: string;
  onSuccess: (newUsername: string, updatedCoins?: number) => void;
  onClose: () => void;
}

export default function ChangeNameModal({
  currentUsername,
  userCoins = 0,
  userId,
  onSuccess,
  onClose,
}: ChangeNameModalProps) {
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nameChangeCount, setNameChangeCount] = useState<number>(0);
  const [currentBalance, setCurrentBalance] = useState<number>(userCoins);

  const COST = 50000;

  // Fetch freshest profile to get accurate nameChangeCount and coins
  useEffect(() => {
    const fetchProfileStatus = async () => {
      try {
        const u = currentUsername || localStorage.getItem('domino_username');
        if (!u) {
          setFetchingInfo(false);
          return;
        }
        const res = await fetch(`${API_URL}/profile/${u}`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setNameChangeCount(data.nameChangeCount || 0);
            if (data.coins !== undefined) setCurrentBalance(data.coins);
          }
        }
      } catch (err) {
        console.error('Failed to load profile status for name change', err);
      } finally {
        setFetchingInfo(false);
      }
    };

    fetchProfileStatus();
  }, [currentUsername]);

  const isFree = nameChangeCount === 0;
  const hasEnoughCoins = isFree || currentBalance >= COST;
  const trimmed = newUsername.trim();
  const isValidLength = trimmed.length >= 3 && trimmed.length <= 16;
  const isDifferent = trimmed.toLowerCase() !== currentUsername.toLowerCase();
  const isValidChars = /^[a-zA-Z0-9_ ]+$/.test(trimmed);

  const handleSave = async () => {
    setErrorMsg(null);

    if (!trimmed) {
      setErrorMsg('Nama pengguna baru wajib diisi!');
      return;
    }
    if (trimmed.length < 3) {
      setErrorMsg('Nama minimal harus 3 karakter!');
      return;
    }
    if (trimmed.length > 16) {
      setErrorMsg('Nama maksimal 16 karakter!');
      return;
    }
    if (!isValidChars) {
      setErrorMsg('Hanya boleh menggunakan huruf, angka, garis bawah (_), dan spasi!');
      return;
    }
    if (!isDifferent) {
      setErrorMsg('Nama baru tidak boleh sama dengan nama saat ini!');
      return;
    }
    if (!isFree && currentBalance < COST) {
      setErrorMsg(`Koin Anda tidak cukup! Dibutuhkan ${COST.toLocaleString('id-ID')} koin. Saldo Anda: ${currentBalance.toLocaleString('id-ID')} koin.`);
      return;
    }

    setLoading(true);
    try {
      const activeUserId = userId || localStorage.getItem('domino_user_id') || '';
      const res = await fetch(`${API_URL}/users/change-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUsername,
          newUsername: trimmed,
          userId: activeUserId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengubah nama pemain');
      }

      // Update LocalStorage
      localStorage.setItem('domino_username', trimmed);
      const guestKey = localStorage.getItem('domino_device_guest_username');
      if (guestKey && guestKey === currentUsername) {
        localStorage.setItem('domino_device_guest_username', trimmed);
      }
      if (data.coins !== undefined) {
        localStorage.setItem('domino_coins', String(data.coins));
      }

      // Dispatch global events for instant app-wide synchronization
      window.dispatchEvent(
        new CustomEvent('domino_username_updated', {
          detail: {
            oldUsername: currentUsername,
            newUsername: trimmed,
            coins: data.coins,
            nameChangeCount: data.nameChangeCount,
          },
        })
      );
      window.dispatchEvent(new CustomEvent('domino_coins_updated'));

      onSuccess(trimmed, data.coins);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan nama');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        padding: '8px',
        animation: 'cnmFadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(420px, 94vw)',
          maxHeight: '92vh',
          background: 'linear-gradient(165deg, #1f1238 0%, #130a24 55%, #0a0416 100%)',
          borderRadius: '16px',
          border: '1.5px solid rgba(255, 215, 0, 0.65)',
          boxShadow: '0 12px 35px rgba(0,0,0,0.85), 0 0 20px rgba(255, 215, 0, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: '#ffffff',
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            background: 'linear-gradient(90deg, #592496 0%, #8736d9 50%, #592496 100%)',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1.5px solid rgba(255, 215, 0, 0.5)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.1rem' }}>✏️</span>
            <span
              style={{
                fontSize: '0.88rem',
                fontWeight: 800,
                color: '#ffd700',
                letterSpacing: '0.5px',
                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
              }}
            >
              UBAH NAMA PEMAIN
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
          {/* Status Badge (Free 1x vs Paid) */}
          <div
            style={{
              padding: '6px 10px',
              borderRadius: '10px',
              background: isFree
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.35))'
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.35))',
              border: isFree ? '1.2px solid #10b981' : '1.2px solid #f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: isFree
                ? '0 0 8px rgba(16, 185, 129, 0.25)'
                : '0 0 8px rgba(245, 158, 11, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>{isFree ? '🎁' : '🪙'}</span>
              <div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: isFree ? '#34d399' : '#fcd34d',
                  }}
                >
                  {isFree ? 'GRATIS 1X PENGGUNA BARU' : 'BIAYA GANTI NAMA'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>
                  {isFree
                    ? 'Perubahan nama pertama bebas biaya'
                    : `Biaya: ${COST.toLocaleString('id-ID')} Koin`}
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '3px 8px',
                borderRadius: '6px',
                background: isFree ? '#10b981' : '#f59e0b',
                color: '#ffffff',
                letterSpacing: '0.5px',
              }}
            >
              {isFree ? 'FREE 1X' : `${COST / 1000}K KOIN`}
            </div>
          </div>

          {/* Current Username Info */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 10px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              fontSize: '0.75rem',
              color: '#cbd5e1',
            }}
          >
            <span>Nama Saat Ini:</span>
            <span style={{ fontWeight: 800, color: '#ffd700' }}>{currentUsername}</span>
          </div>

          {/* Input Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>
              Nama Baru (3 - 16 Karakter):
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                maxLength={16}
                placeholder="Contoh: Sultan_Domino..."
                disabled={loading || fetchingInfo}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border:
                    trimmed.length > 0 && isValidLength && isValidChars && isDifferent
                      ? '1.5px solid #10b981'
                      : '1.5px solid rgba(255, 215, 0, 0.4)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: trimmed.length > 16 || (trimmed.length > 0 && trimmed.length < 3) ? '#ef4444' : '#94a3b8',
                }}
              >
                {trimmed.length}/16
              </span>
            </div>
          </div>

          {/* User Balance Check if Paid */}
          {!isFree && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                borderRadius: '6px',
                background: hasEnoughCoins ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.15)',
                border: hasEnoughCoins ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.4)',
                fontSize: '0.7rem',
              }}
            >
              <span style={{ color: '#cbd5e1' }}>Saldo Koin:</span>
              <span
                style={{
                  fontWeight: 800,
                  color: hasEnoughCoins ? '#34d399' : '#f87171',
                }}
              >
                🪙 {currentBalance.toLocaleString('id-ID')} ({hasEnoughCoins ? 'Cukup ✓' : 'Kurang ✕'})
              </span>
            </div>
          )}

          {/* Error Message Box */}
          {errorMsg && (
            <div
              style={{
                padding: '6px 10px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                borderRadius: '6px',
                color: '#fca5a5',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Rules Summary */}
          <div
            style={{
              padding: '6px 8px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '6px',
              fontSize: '0.65rem',
              color: '#94a3b8',
              lineHeight: 1.35,
            }}
          >
            <div>• Pengguna baru: <strong>1x Ubah Nama GRATIS</strong>.</div>
            <div>• Ke-2x dst: <strong>50.000 Koin</strong> • Karakter: Huruf, Angka, _, Spasi.</div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={loading || fetchingInfo || !isValidLength || !isDifferent || !isValidChars || (!isFree && !hasEnoughCoins)}
              style={{
                flex: 1.5,
                padding: '8px',
                background:
                  !isValidLength || !isDifferent || !isValidChars || (!isFree && !hasEnoughCoins)
                    ? 'rgba(100, 116, 139, 0.4)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border:
                  !isValidLength || !isDifferent || !isValidChars || (!isFree && !hasEnoughCoins)
                    ? '1px solid rgba(100, 116, 139, 0.4)'
                    : '1.2px solid #34d399',
                borderRadius: '8px',
                color:
                  !isValidLength || !isDifferent || !isValidChars || (!isFree && !hasEnoughCoins)
                    ? '#94a3b8'
                    : '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 900,
                cursor:
                  !isValidLength || !isDifferent || !isValidChars || (!isFree && !hasEnoughCoins)
                    ? 'not-allowed'
                    : 'pointer',
                boxShadow:
                  !isValidLength || !isDifferent || !isValidChars || (!isFree && !hasEnoughCoins)
                    ? 'none'
                    : '0 3px 10px rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              {loading ? (
                <span>Menyimpan...</span>
              ) : isFree ? (
                <>
                  <span>✨</span> Simpan Gratis
                </>
              ) : (
                <>
                  <span>🪙</span> Bayar 50K
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes cnmFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
