import React, { useState, useEffect } from 'react';
import type { SlotProfileData } from './useSlotProfile';
import AvatarSelectionModal from './AvatarSelectionModal';
import ChangeNameModal from './ChangeNameModal';

interface Props {
  profile: SlotProfileData;
  coins: number;
  onClose: () => void;
}

export function renderSlotAvatar(
  avatar: string | undefined | null,
  className?: string,
  fallback: string = '🐸'
) {
  const isImg =
    avatar &&
    (avatar.startsWith('http://') ||
      avatar.startsWith('https://') ||
      avatar.startsWith('data:') ||
      (avatar.startsWith('/') && !avatar.endsWith('undefined')));

  if (isImg) {
    return (
      <img
        src={avatar}
        alt="Avatar"
        className={className || 'slot-avatar-img'}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          target.style.display = 'none';
          if (target.parentElement && !target.parentElement.querySelector('.slot-avatar-fallback')) {
            const span = document.createElement('span');
            span.className = 'slot-avatar-fallback';
            span.textContent = fallback;
            target.parentElement.appendChild(span);
          }
        }}
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
      />
    );
  }

  return (
    <span
      className={className || 'slot-avatar-emoji'}
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      {avatar || fallback}
    </span>
  );
}

export default function SlotProfileModal({ profile, coins, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showChangeNameModal, setShowChangeNameModal] = useState(false);
  const [currentUsername, setCurrentUsername] = useState(profile.username);
  const [currentFrame, setCurrentFrame] = useState(() => localStorage.getItem('domino_custom_frame') || 'crown');

  useEffect(() => {
    setCurrentUsername(profile.username);
  }, [profile.username]);

  useEffect(() => {
    const handleAvatarUpdate = (e: any) => {
      if (e?.detail?.frame) {
        setCurrentFrame(e.detail.frame);
      }
    };
    window.addEventListener('domino_avatar_updated', handleAvatarUpdate);
    return () => window.removeEventListener('domino_avatar_updated', handleAvatarUpdate);
  }, []);

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(profile.userId);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="spm-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        animation: 'spmFadeIn 0.22s ease-out',
      }}
    >
      <div
        className="spm-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(420px, 92vw)',
          maxHeight: '90vh',
          background: 'linear-gradient(165deg, #1b0f33 0%, #120924 55%, #080314 100%)',
          borderRadius: '16px',
          border: '1.5px solid rgba(255, 215, 0, 0.65)',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.85), 0 0 20px rgba(255, 215, 0, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
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
            <span style={{ fontSize: '1.1rem' }}>👑</span>
            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: 800,
                color: '#ffd700',
                letterSpacing: '0.5px',
                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
              }}
            >
              PROFIL VIP PEMAIN
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
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          {/* Avatar and Main Info Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Avatar Wrap */}
            <div
              className="g-btn-press"
              onClick={() => setShowAvatarModal(true)}
              title="Klik untuk Ganti Avatar & Bingkai"
              style={{
                position: 'relative',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #4e2f96, #21124e 70%, #0c0524 100%)',
                border: currentFrame === 'fire' ? '3px solid #ff4500' : currentFrame === 'diamond' ? '3px solid #00f2fe' : currentFrame === 'lightning' ? '3px solid #ffe600' : currentFrame === 'dragon' ? '3px solid #f39c12' : '3px solid #ffd700',
                boxShadow: currentFrame === 'fire' ? '0 0 14px rgba(255, 69, 0, 0.7)' : currentFrame === 'diamond' ? '0 0 14px rgba(0, 242, 254, 0.7)' : currentFrame === 'lightning' ? '0 0 14px rgba(255, 230, 0, 0.7)' : '0 4px 12px rgba(0,0,0,0.6), 0 0 10px rgba(255, 215, 0, 0.45)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                cursor: 'pointer',
              }}
            >
              {currentFrame === 'crown' && (
                <span style={{ position: 'absolute', top: '-13px', fontSize: '1.2rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>👑</span>
              )}
              {currentFrame === 'fire' && (
                <span style={{ position: 'absolute', top: '-11px', fontSize: '1.1rem', filter: 'drop-shadow(0 0 8px #ff4500)' }}>🔥</span>
              )}
              {currentFrame === 'lightning' && (
                <span style={{ position: 'absolute', top: '-11px', fontSize: '1.1rem', filter: 'drop-shadow(0 0 8px #ffe600)' }}>⚡</span>
              )}
              {currentFrame === 'dragon' && (
                <span style={{ position: 'absolute', top: '-11px', fontSize: '1.1rem', filter: 'drop-shadow(0 0 8px #f39c12)' }}>🐉</span>
              )}

              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {renderSlotAvatar(profile.avatar, 'spm-avatar-pic', '🐸')}
              </div>

              {/* Edit Icon Overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  border: '1.5px solid #ffffff',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                }}
              >
                ✏️
              </div>

              {/* Level Badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  background: 'linear-gradient(135deg, #ff7a00, #ff3d00)',
                  border: '1.5px solid #ffffff',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                }}
              >
                Lv.{profile.level}
              </div>
            </div>

            {/* User Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {currentUsername}
                </span>
                <span style={{ color: '#00e676', fontSize: '1rem' }} title="Akun Terverifikasi">
                  ✓
                </span>
                <button
                  className="g-btn-press"
                  onClick={() => setShowChangeNameModal(true)}
                  title="Ubah Nama Pemain (Free 1x untuk Akun Baru)"
                  style={{
                    background: 'rgba(255, 215, 0, 0.15)',
                    border: '1px solid rgba(255, 215, 0, 0.4)',
                    color: '#ffd700',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  ✏️ Ubah
                </button>
              </div>

              {/* ID Row with copy */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#b3a2d6' }}>
                <span>ID: {profile.userId}</span>
                <button
                  onClick={handleCopyId}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: copied ? '#00e676' : '#ffd700',
                    borderRadius: '6px',
                    padding: '1px 7px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {copied ? 'Tersalin! ✓' : 'Salin 📋'}
                </button>
              </div>

              {/* Change Avatar Button */}
              <button
                className="g-btn-press"
                onClick={() => setShowAvatarModal(true)}
                style={{
                  marginTop: '4px',
                  padding: '3px 10px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(109, 40, 217, 0.5))',
                  border: '1px solid #a855f7',
                  borderRadius: '6px',
                  color: '#e9d5ff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  width: 'fit-content',
                }}
              >
                <span>🎨</span> Ganti Avatar / Bingkai
              </button>

              {/* VIP Level Pill */}
              <div style={{ marginTop: '2px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'linear-gradient(90deg, #d49a00, #ffea78, #b87b00)',
                    color: '#3d2000',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    borderRadius: '10px',
                    padding: '2px 8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                  }}
                >
                  👑 VIP {profile.vipLevel} MEMBER
                </span>
              </div>
            </div>
          </div>

          {/* Asset / Balance Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {/* Coins Box */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(255, 215, 0, 0.35)',
                borderRadius: '10px',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>🪙</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.62rem', color: '#b3a2d6', fontWeight: 600 }}>SALDO KOIN</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffd700' }}>
                  {coins.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* RP Box */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(138, 43, 226, 0.35)',
                borderRadius: '10px',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>🎟️</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.62rem', color: '#b3a2d6', fontWeight: 600 }}>KUPON RP</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#e0aaff' }}>
                  {profile.rp.toLocaleString('id-ID')} RP
                </span>
              </div>
            </div>
          </div>

          {/* VIP Perks */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '0.72rem',
              color: '#d4c7f0',
            }}
          >
            <div style={{ color: '#ffd700', fontWeight: 700, fontSize: '0.75rem', marginBottom: '1px' }}>
              KEUNTUNGAN VIP AKTIF:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#00e676' }}>✓</span>
              <span>Akses Penuh Seluruh Ruangan Slot & Meja</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#00e676' }}>✓</span>
              <span>Prioritas Bonus Harian & Keberuntungan Putaran</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#00e676' }}>✓</span>
              <span>Kirim Koin Tanpa Batas Antar Pemain</span>
            </div>
          </div>

          {/* Close / Return Button */}
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '10px',
              background: 'linear-gradient(180deg, #ffc700 0%, #e69100 100%)',
              color: '#3d1b00',
              fontWeight: 800,
              fontSize: '0.85rem',
              letterSpacing: '0.5px',
              border: '1px solid #ffe885',
              boxShadow: '0 3px 10px rgba(230, 145, 0, 0.45)',
              cursor: 'pointer',
              marginTop: '2px',
            }}
          >
            KEMBALI KE PERMAINAN
          </button>
        </div>
      </div>

      {/* Standalone Avatar Selection Modal */}
      {showAvatarModal && (
        <AvatarSelectionModal
          currentAvatar={profile.avatar}
          onSelect={(newAv, newFrame) => {
            if (newAv) profile.avatar = newAv;
            if (newFrame) setCurrentFrame(newFrame);
            setShowAvatarModal(false);
          }}
          onClose={() => setShowAvatarModal(false)}
        />
      )}

      {/* Ubah Nama Modal */}
      {showChangeNameModal && (
        <ChangeNameModal
          currentUsername={currentUsername}
          userCoins={coins}
          userId={profile.userId}
          onSuccess={(newU) => {
            setCurrentUsername(newU);
            profile.username = newU;
          }}
          onClose={() => setShowChangeNameModal(false)}
        />
      )}
    </div>
  );
}
