import React, { useState, useRef } from 'react';
import { API_URL } from './config';

export interface AvatarItem {
  id: string;
  name: string;
  type: 'image' | 'emoji';
  value: string;
  category: 'game' | 'classic';
  badge?: string;
  desc?: string;
}

export const PRESET_AVATARS: AvatarItem[] = [
  // Game & Slot Characters
  {
    id: 'sultan_royal',
    name: 'Sultan Kasino VIP',
    type: 'image',
    value: '/assets/avatars/sultan_royal.jpg',
    category: 'game',
    badge: '👑 SULTAN',
    desc: 'Raja Kasino Agung Penguasa Meja VIP',
  },
  {
    id: 'cyber_samurai',
    name: 'Cyber Samurai',
    type: 'image',
    value: '/assets/avatars/cyber_samurai.jpg',
    category: 'game',
    badge: '⚡ CYBER',
    desc: 'Pendekar Pedang Neon Futuristik',
  },
  {
    id: 'zeus_god',
    name: 'Dewa Zeus Olympus',
    type: 'image',
    value: '/assets/avatars/zeus_god.jpg',
    category: 'game',
    badge: '⚡ DEWA',
    desc: 'Penguasa Petir Gates of Olympus',
  },

  {
    id: 'garuda_gold',
    name: 'Garuda Emas',
    type: 'image',
    value: '/assets/gatokaca/sym_garuda.jpg',
    category: 'game',
    badge: '🦅 MYTHIC',
    desc: 'Burung Keramat Penjaga Harta Karun',
  },
  {
    id: 'sheriff_west',
    name: 'Sheriff Wild West',
    type: 'image',
    value: '/assets/wildwest/sheriff.png',
    category: 'game',
    badge: '🤠 SHERIFF',
    desc: 'Penegak Keadilan dan Pemburu Bounty',
  },
  {
    id: 'cowgirl_wild',
    name: 'Cowgirl Bounty',
    type: 'image',
    value: '/assets/wildwest/cowgirl.png',
    category: 'game',
    badge: '💃 BOUNTY',
    desc: 'Penembak Jitu Meja Wild West',
  },
  {
    id: 'five_lions_wild',
    name: 'Singa Emas Kemakmuran',
    type: 'image',
    value: '/assets/fivelions/sym_wild.png',
    category: 'game',
    badge: '🦁 WILD',
    desc: 'Singa Sakral Pembawa Mega Jackpot',
  },
  {
    id: 'five_lions_dragon',
    name: 'Naga Emas Oriental',
    type: 'image',
    value: '/assets/fivelions/sym_dragon.png',
    category: 'game',
    badge: '🐉 DRAGON',
    desc: 'Penguasa Keberuntungan Dinasti',
  },
  {
    id: 'zeus_crown',
    name: 'Mahkota Emas Olympus',
    type: 'image',
    value: '/assets/zeus/sym_crown.png',
    category: 'game',
    badge: '💎 MAHKOTA',
    desc: 'Simbol Kemenangan Terbesar Zeus',
  },

  // Classic Emojis & Mascots
  { id: 'frog_hoki', name: 'Katak Hoki', type: 'emoji', value: '🐸', category: 'classic', badge: 'HOKI', desc: 'Maskot Utama Higgs Domino' },
  { id: 'doge_sultan', name: 'Doge Sultan', type: 'emoji', value: '🐶', category: 'classic', badge: 'SULTAN', desc: 'Anjing Keberuntungan Kasino' },
  { id: 'fox_master', name: 'Rubah Cerdik', type: 'emoji', value: '🦊', category: 'classic', badge: 'CERDIK', desc: 'Ahli Taktik Kartu Domino' },
  { id: 'bear_boss', name: 'Beruang Boss', type: 'emoji', value: '🐻', category: 'classic', badge: 'BOSS', desc: 'Kekuatan Tak Terkalahkan di Meja' },
  { id: 'panda_sensei', name: 'Master Panda', type: 'emoji', value: '🐼', category: 'classic', badge: 'MASTER', desc: 'Guru Ketenangan Kasino' },
  { id: 'tiger_ace', name: 'Harimau Belang', type: 'emoji', value: '🐯', category: 'classic', badge: 'ACE', desc: 'Taring Pemangsa Kemenangan' },
  { id: 'lion_king', name: 'Raja Singa', type: 'emoji', value: '🦁', category: 'classic', badge: 'KING', desc: 'Penguasa Tertinggi Belantara' },
  { id: 'monkey_king', name: 'Kera Sakti', type: 'emoji', value: '🐵', category: 'classic', badge: 'SAKTI', desc: 'Lincah Membaca Kartu Lawan' },
  { id: 'owl_wise', name: 'Burung Hantu', type: 'emoji', value: '🦉', category: 'classic', badge: 'WISE', desc: 'Mata Tajam Pengintai Lawan' },
  { id: 'alien_cyber', name: 'Cyber Alien', type: 'emoji', value: '👽', category: 'classic', badge: 'CYBER', desc: 'Pemain Luar Angkasa Futuristik' },
  { id: 'ghost_casino', name: 'Hantu Kasino', type: 'emoji', value: '👻', category: 'classic', badge: 'MISTIS', desc: 'Tak Terlihat Datang Meraih Chip' },
  { id: 'robot_x', name: 'Robot Android', type: 'emoji', value: '🤖', category: 'classic', badge: 'MECHA', desc: 'Perhitungan Algoritma Menang 100%' },
  { id: 'ninja_shadow', name: 'Shadow Ninja', type: 'emoji', value: '🥷', category: 'classic', badge: 'NINJA', desc: 'Pendekar Rahasia Bertopeng Hitam' },
  { id: 'unicorn_luck', name: 'Unicorn Hoki', type: 'emoji', value: '🦄', category: 'classic', badge: 'LUCK', desc: 'Pesona Berkah Tak Terduga' },
  { id: 'dino_king', name: 'T-Rex Perkasa', type: 'emoji', value: '🦖', category: 'classic', badge: 'PERKASA', desc: 'Kekuatan Raksasa Kasino' },
  { id: 'octopus_sea', name: 'Gurita Samudera', type: 'emoji', value: '🐙', category: 'classic', badge: 'KRAKEN', desc: 'Menjangkau Semua Meja Kasino' },
  { id: 'cat_luck', name: 'Kucing Maneki', type: 'emoji', value: '🐱', category: 'classic', badge: 'REZEKI', desc: 'Penarik Uang dan Koin Emas' },
  { id: 'wolf_alpha', name: 'Serigala Alpha', type: 'emoji', value: '🐺', category: 'classic', badge: 'ALPHA', desc: 'Pemimpin Kawanan Domino' },
  { id: 'crown_gold', name: 'Mahkota Kaisar', type: 'emoji', value: '👑', category: 'classic', badge: 'ROYAL', desc: 'Mahkota Emas Murni 24K' },
  { id: 'diamond_gem', name: 'Berlian Abadi', type: 'emoji', value: '💎', category: 'classic', badge: 'VIP', desc: 'Batu Permata Nilai Tertinggi' },
  { id: 'joker_card', name: 'Kartu Joker', type: 'emoji', value: '🃏', category: 'classic', badge: 'WILD', desc: 'Kartu Serba Bisa Penentu Menang' },
];

export const AVATAR_FRAMES = [
  { id: 'crown', name: 'Mahkota Emas VIP', icon: '👑', color: '#ffd700', border: 'linear-gradient(135deg, #ffd700, #ff8c00)' },
  { id: 'fire', name: 'Api Neraka Inferno', icon: '🔥', color: '#ff3b30', border: 'linear-gradient(135deg, #ff3b30, #ff9500)' },
  { id: 'diamond', name: 'Kristal Neon Cyber', icon: '💎', color: '#00f2fe', border: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
  { id: 'lightning', name: 'Petir Quantum Zeus', icon: '⚡', color: '#ffea00', border: 'linear-gradient(135deg, #ffd600, #00e5ff)' },
  { id: 'dragon', name: 'Aura Naga Emas', icon: '🐉', color: '#f39c12', border: 'linear-gradient(135deg, #f1c40f, #e67e22)' },
  { id: 'none', name: 'Klasik Minimalis', icon: '🔘', color: '#ffffff', border: 'linear-gradient(135deg, #ffffff, #888888)' },
];

interface Props {
  currentAvatar: string;
  onSelect: (avatar: string, frame?: string) => void;
  onClose: () => void;
}

export default function AvatarSelectionModal({ currentAvatar, onSelect, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'game' | 'classic' | 'upload' | 'frame'>('game');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || '🐸');
  const [selectedFrame, setSelectedFrame] = useState<string>(() => localStorage.getItem('domino_custom_frame') || 'crown');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [urlError, setUrlError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image upload from file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the user can select the same file or another file again
    e.target.value = '';

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const srcResult = loadEvent.target?.result as string;
      if (!srcResult) {
        setIsUploading(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          // Create offscreen canvas for square cropping & high-quality lightweight compression
          const canvas = document.createElement('canvas');
          const size = 180; // Optimal 180x180: crisp on mobile & slots, ultralight (~12-18KB)
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            // Calculate center square crop
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;

            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
            // Compress to lightweight JPEG (quality 0.82 produces ~12-18KB data URL)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            setSelectedAvatar(dataUrl);
          } else {
            setSelectedAvatar(srcResult);
          }
        } catch (err) {
          console.warn('Canvas processing error, falling back to original:', err);
          setSelectedAvatar(srcResult);
        } finally {
          setIsUploading(false);
        }
      };
      img.onerror = () => {
        setIsUploading(false);
        alert('Gagal memproses gambar. Format file tidak didukung.');
      };
      img.src = srcResult;
    };
    reader.onerror = () => {
      setIsUploading(false);
      alert('Gagal membaca file gambar.');
    };
    reader.readAsDataURL(file);
  };

  // Handle custom URL apply
  const handleApplyUrl = () => {
    if (!customUrlInput.trim()) return;
    const testImg = new Image();
    testImg.onload = () => {
      setSelectedAvatar(customUrlInput.trim());
      setUrlError(false);
    };
    testImg.onerror = () => {
      setUrlError(true);
    };
    testImg.src = customUrlInput.trim();
  };

  const [isSaving, setIsSaving] = useState(false);

  // Helper get human-readable name of selected avatar
  const getSelectedAvatarName = () => {
    const foundPreset = PRESET_AVATARS.find((a) => a.value === selectedAvatar);
    if (foundPreset) return foundPreset.name;
    if (selectedAvatar?.startsWith('data:') || selectedAvatar?.startsWith('blob:') || selectedAvatar?.startsWith('http')) {
      return 'Foto Kustom';
    }
    return `Avatar ${selectedAvatar || ''}`;
  };

  // Save selected avatar
  const handleConfirm = async () => {
    if (isSaving) return;
    setIsSaving(true);

    // 1. Cache immediately in localStorage with try-catch safety
    try {
      localStorage.setItem('domino_avatar', selectedAvatar);
      localStorage.setItem('domino_custom_frame', selectedFrame);
    } catch (e) {
      console.warn('LocalStorage error while saving avatar:', e);
    }

    const username = localStorage.getItem('domino_username') || '';
    const userId = localStorage.getItem('domino_user_id') || '';

    // 2. Persist to MongoDB backend
    if (username || userId) {
      try {
        const res = await fetch(`${API_URL}/users/avatar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            userId,
            avatar: selectedAvatar,
            frame: selectedFrame,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.avatar) localStorage.setItem('domino_avatar', data.avatar);
          if (data?.customFrame) localStorage.setItem('domino_custom_frame', data.customFrame);
        }
      } catch (err) {
        console.warn('Network issue saving avatar to server:', err);
      }
    }

    // 3. Dispatch global event for instant reactivity across all slot games & lobby
    window.dispatchEvent(
      new CustomEvent('domino_avatar_updated', {
        detail: { avatar: selectedAvatar, frame: selectedFrame },
      })
    );

    setIsSaving(false);
    setSuccessToast(true);
    setTimeout(() => {
      onSelect(selectedAvatar, selectedFrame);
      onClose();
    }, 600);
  };

  // Helper to render preview of selected avatar
  const renderPreviewAvatar = (av: string) => {
    const isImg =
      av &&
      (av.startsWith('http://') ||
        av.startsWith('https://') ||
        av.startsWith('data:') ||
        (av.startsWith('/') && !av.endsWith('undefined')));

    if (isImg) {
      return (
        <img
          src={av}
          alt="Preview Avatar"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      );
    }
    return (
      <span
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3.5rem',
          userSelect: 'none',
        }}
      >
        {av || '🐸'}
      </span>
    );
  };

  const getFrameStyle = (frameId: string) => {
    switch (frameId) {
      case 'crown':
        return {
          boxShadow: '0 0 25px rgba(255, 215, 0, 0.6), inset 0 0 15px rgba(255, 215, 0, 0.4)',
          border: '4px solid #ffd700',
        };
      case 'fire':
        return {
          boxShadow: '0 0 28px rgba(255, 60, 0, 0.8), inset 0 0 15px rgba(255, 120, 0, 0.5)',
          border: '4px solid #ff4500',
        };
      case 'diamond':
        return {
          boxShadow: '0 0 28px rgba(0, 242, 254, 0.8), inset 0 0 15px rgba(79, 172, 254, 0.5)',
          border: '4px solid #00f2fe',
        };
      case 'lightning':
        return {
          boxShadow: '0 0 30px rgba(255, 234, 0, 0.8), 0 0 15px rgba(0, 229, 255, 0.6)',
          border: '4px solid #ffe600',
        };
      case 'dragon':
        return {
          boxShadow: '0 0 25px rgba(243, 156, 18, 0.7), inset 0 0 15px rgba(241, 196, 15, 0.5)',
          border: '4px solid #f39c12',
        };
      default:
        return {
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.6)',
          border: '3px solid rgba(255, 255, 255, 0.5)',
        };
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 10000,
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 2, 12, 0.9)',
        backdropFilter: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'spmFadeIn 0.25s ease-out',
      }}
    >
      <div
        className="avatar-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(780px, 95vw)',
          height: 'min(680px, 92vh)',
          background: 'linear-gradient(170deg, #18092e 0%, #100520 40%, #080211 100%)',
          borderRadius: '24px',
          border: '2px solid rgba(255, 215, 0, 0.75)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(255, 215, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          color: '#ffffff',
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            background: 'linear-gradient(90deg, #4a154b 0%, #6b21a8 50%, #4a154b 100%)',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid rgba(255, 215, 0, 0.5)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>🎨</span>
            <div>
              <div
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 900,
                  color: '#ffd700',
                  letterSpacing: '1px',
                  textShadow: '0 2px 6px rgba(0,0,0,0.8), 0 0 12px rgba(255,215,0,0.4)',
                }}
              >
                GANTI AVATAR & BINGKAI VIP
              </div>
              <div style={{ fontSize: '0.78rem', color: '#e9d5ff', opacity: 0.85 }}>
                Pilih karakter keren, emoji kasino, bingkai berefek, atau upload foto dari galeri
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="g-btn-press"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              border: '1.5px solid rgba(255, 215, 0, 0.6)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            }}
          >
            ✕
          </button>
        </div>

        <style>{`
          @media (max-width: 680px), (max-height: 520px) {
            .asm-preview-col {
              display: none !important;
            }
          }
          @keyframes asmPulseSave {
            0%, 100% { transform: scale(1); box-shadow: 0 4px 15px rgba(16, 185, 129, 0.5); }
            50% { transform: scale(1.02); box-shadow: 0 6px 22px rgba(16, 185, 129, 0.85); }
          }
        `}</style>

        {/* Modal Main Area (Split into Left Preview & Right Selector) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* LEFT: Live Interactive Preview Bar */}
          <div
            className="asm-preview-col"
            style={{
              width: '260px',
              background: 'linear-gradient(180deg, rgba(24, 9, 46, 0.7) 0%, rgba(13, 3, 26, 0.95) 100%)',
              borderRight: '1.5px solid rgba(255, 215, 0, 0.25)',
              padding: '20px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  fontWeight: 800,
                  letterSpacing: '1.5px',
                  color: '#ffd700',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>✨</span> PRATINJAU PROFIL
              </div>

              {/* Big Avatar Frame Wrap */}
              <div
                style={{
                  position: 'relative',
                  width: '130px',
                  height: '130px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #4c1d95, #1e093e 70%, #0a0118 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  ...getFrameStyle(selectedFrame),
                }}
              >
                {/* Crown topper if crown frame selected */}
                {selectedFrame === 'crown' && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-24px',
                      fontSize: '2.2rem',
                      filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.8))',
                      animation: 'spmBounce 2.5s infinite ease-in-out',
                    }}
                  >
                    👑
                  </span>
                )}
                {/* Flame aura if fire frame */}
                {selectedFrame === 'fire' && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-18px',
                      fontSize: '1.8rem',
                      filter: 'drop-shadow(0 0 10px #ff4500)',
                    }}
                  >
                    🔥
                  </span>
                )}
                {/* Lightning arcs if lightning frame */}
                {selectedFrame === 'lightning' && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-18px',
                      fontSize: '1.8rem',
                      filter: 'drop-shadow(0 0 12px #ffe600)',
                    }}
                  >
                    ⚡
                  </span>
                )}
                {/* Dragon aura if dragon frame */}
                {selectedFrame === 'dragon' && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-18px',
                      fontSize: '1.8rem',
                      filter: 'drop-shadow(0 0 10px #f39c12)',
                    }}
                  >
                    🐉
                  </span>
                )}

                <div
                  style={{
                    width: '118px',
                    height: '118px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0e041d',
                  }}
                >
                  {renderPreviewAvatar(selectedAvatar)}
                </div>

                {/* VIP Pill */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-10px',
                    background: 'linear-gradient(90deg, #eab308, #ca8a04)',
                    color: '#000000',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    padding: '3px 12px',
                    borderRadius: '12px',
                    border: '1.5px solid #ffffff',
                    boxShadow: '0 3px 8px rgba(0,0,0,0.6)',
                    letterSpacing: '0.5px',
                  }}
                >
                  VIP {localStorage.getItem('domino_vip') || '3'}
                </div>
              </div>

              {/* Player Name & ID Card */}
              <div
                style={{
                  marginTop: '22px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                  width: '100%',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f3e8ff' }}>
                  {localStorage.getItem('domino_username') || 'Pemain'}
                </div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#ffd700',
                    fontWeight: 700,
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <span>🆔</span> ID: {localStorage.getItem('domino_user_id') || '...'}
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '0.72rem',
                    color: '#a855f7',
                    background: 'rgba(168, 85, 247, 0.15)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  Bingkai: {AVATAR_FRAMES.find((f) => f.id === selectedFrame)?.name}
                </div>
              </div>
            </div>

            {/* Left Column Helper Tip */}
            <div
              style={{
                width: '100%',
                background: 'rgba(255, 215, 0, 0.08)',
                border: '1px dashed rgba(255, 215, 0, 0.35)',
                borderRadius: '12px',
                padding: '10px 12px',
                textAlign: 'center',
                fontSize: '0.74rem',
                color: '#fef08a',
                lineHeight: '1.4',
                marginTop: '12px',
              }}
            >
              💡 Pilih avatar & bingkai yang Anda sukai, lalu tekan tombol <b>SIMPAN AVATAR</b> di bawah.
            </div>
          </div>

          {/* RIGHT: Tabs & Selection Grid */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Category Navigation Bar */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(10, 3, 20, 0.8)',
                padding: '8px 16px',
                gap: '8px',
                borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
                overflowX: 'auto',
              }}
            >
              {[
                { id: 'game', label: '⚔️ Karakter Kasino & Dewa', desc: 'Pragmatic & Slot Heroes' },
                { id: 'classic', label: '🎭 Emoji & Maskot', desc: 'Koleksi Maskot Hoki' },
                { id: 'upload', label: '📸 Upload Foto', desc: 'Galeri / Kamera / URL' },
                { id: 'frame', label: '🖼️ Bingkai Efek', desc: 'Aura & Mahkota VIP' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="g-btn-press"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background:
                      activeTab === tab.id
                        ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border:
                      activeTab === tab.id
                        ? '1.5px solid #c084fc'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    color: activeTab === tab.id ? '#ffffff' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: activeTab === tab.id ? 800 : 600,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: activeTab === tab.id ? '0 4px 12px rgba(139, 92, 246, 0.4)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Items Container */}
            <div style={{ flex: 1, padding: '18px 20px', overflowY: 'auto' }}>
              {/* TAB 1: Karakter Game / Slot Presets */}
              {activeTab === 'game' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#e9d5ff', opacity: 0.9 }}>
                    Pilih avatar karakter dewa slot dan pahlawan kasino dengan grafis Ultra HD:
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                      gap: '14px',
                    }}
                  >
                    {PRESET_AVATARS.filter((a) => a.category === 'game').map((item) => {
                      const isSelected = selectedAvatar === item.value;
                      return (
                        <div
                          key={item.id}
                          className="g-btn-press"
                          onClick={() => setSelectedAvatar(item.value)}
                          style={{
                            background: isSelected
                              ? 'linear-gradient(145deg, #4c1d95, #2e1065)'
                              : 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                            border: isSelected ? '2px solid #ffd700' : '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '16px',
                            padding: '12px 8px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                            boxShadow: isSelected
                              ? '0 0 16px rgba(255, 215, 0, 0.4)'
                              : '0 4px 10px rgba(0,0,0,0.4)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {isSelected && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                background: '#10b981',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                color: '#ffffff',
                                fontWeight: 900,
                              }}
                            >
                              ✓
                            </div>
                          )}

                          <div
                            style={{
                              width: '68px',
                              height: '68px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              border: isSelected ? '2px solid #ffd700' : '2px solid rgba(255,255,255,0.2)',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                              background: '#0d041c',
                            }}
                          >
                            <img
                              src={item.value}
                              alt={item.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>

                          <div
                            style={{
                              marginTop: '8px',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              color: isSelected ? '#ffd700' : '#f1f5f9',
                              textAlign: 'center',
                            }}
                          >
                            {item.name}
                          </div>

                          {item.badge && (
                            <span
                              style={{
                                marginTop: '4px',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                background: 'rgba(255, 215, 0, 0.15)',
                                color: '#ffd700',
                                padding: '2px 8px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 215, 0, 0.3)',
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: Classic Emojis */}
              {activeTab === 'classic' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#e9d5ff', opacity: 0.9 }}>
                    Pilih emoji maskot hoki klasik Higgs Domino Kasino:
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    {PRESET_AVATARS.filter((a) => a.category === 'classic').map((item) => {
                      const isSelected = selectedAvatar === item.value;
                      return (
                        <div
                          key={item.id}
                          className="g-btn-press"
                          onClick={() => setSelectedAvatar(item.value)}
                          style={{
                            background: isSelected
                              ? 'linear-gradient(145deg, #4c1d95, #2e1065)'
                              : 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                            border: isSelected ? '2px solid #ffd700' : '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '16px',
                            padding: '14px 6px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                            boxShadow: isSelected
                              ? '0 0 16px rgba(255, 215, 0, 0.4)'
                              : '0 4px 10px rgba(0,0,0,0.4)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {isSelected && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: '#10b981',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.65rem',
                                color: '#ffffff',
                                fontWeight: 900,
                              }}
                            >
                              ✓
                            </div>
                          )}

                          <span
                            style={{
                              fontSize: '2.5rem',
                              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))',
                              userSelect: 'none',
                            }}
                          >
                            {item.value}
                          </span>

                          <div
                            style={{
                              marginTop: '6px',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              color: isSelected ? '#ffd700' : '#e2e8f0',
                              textAlign: 'center',
                            }}
                          >
                            {item.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: Upload Foto Sendiri */}
              {activeTab === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Option A: Upload from Gallery/Device */}
                  <div
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                      border: '1.5px dashed rgba(255, 215, 0, 0.4)',
                      borderRadius: '18px',
                      padding: '24px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '12px',
                    }}
                  >
                    <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
                      📁
                    </span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#ffd700' }}>
                        Pilih Foto dari Galeri / Kamera
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                        Mendukung format JPG, PNG, WEBP. Foto otomatis di-crop presisi menjadi bulat & tajam.
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />

                    <button
                      className="g-btn-press"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        border: '1.5px solid #fbbf24',
                        color: '#000000',
                        fontWeight: 900,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span>📂</span> {isUploading ? 'Memproses...' : 'Buka Galeri Foto'}
                    </button>
                  </div>

                  {/* Option B: Input URL Gambar */}
                  <div
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '18px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#c084fc' }}>
                      🔗 Atau Masukkan URL Gambar / Foto Online
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="https://contoh.com/foto-profil.jpg"
                        value={customUrlInput}
                        onChange={(e) => {
                          setCustomUrlInput(e.target.value);
                          setUrlError(false);
                        }}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: urlError ? '1.5px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                      <button
                        className="g-btn-press"
                        onClick={handleApplyUrl}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                          border: '1px solid #a855f7',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        Terapkan
                      </button>
                    </div>
                    {urlError && (
                      <div style={{ color: '#ef4444', fontSize: '0.78rem' }}>
                        ❌ Gagal memuat gambar dari URL tersebut. Pastikan link langsung menuju file gambar.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Bingkai Efek Avatar */}
              {activeTab === 'frame' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#e9d5ff', opacity: 0.9 }}>
                    Pilih bingkai prestige dengan efek animasi dan aura kilau untuk avatar Anda:
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: '14px',
                    }}
                  >
                    {AVATAR_FRAMES.map((f) => {
                      const isSelected = selectedFrame === f.id;
                      return (
                        <div
                          key={f.id}
                          className="g-btn-press"
                          onClick={() => setSelectedFrame(f.id)}
                          style={{
                            background: isSelected
                              ? 'linear-gradient(145deg, #4c1d95, #2e1065)'
                              : 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                            border: isSelected ? '2px solid #ffd700' : '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '16px',
                            padding: '16px 10px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                            boxShadow: isSelected
                              ? '0 0 16px rgba(255, 215, 0, 0.4)'
                              : '0 4px 10px rgba(0,0,0,0.4)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {isSelected && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                background: '#10b981',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                color: '#ffffff',
                                fontWeight: 900,
                              }}
                            >
                              ✓
                            </div>
                          )}

                          <span style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{f.icon}</span>

                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              color: isSelected ? '#ffd700' : '#f1f5f9',
                              textAlign: 'center',
                            }}
                          >
                            {f.name}
                          </div>

                          <div
                            style={{
                              marginTop: '8px',
                              width: '40px',
                              height: '4px',
                              borderRadius: '2px',
                              background: f.border,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===================================================== */}
        {/* STICKY BOTTOM ACTION FOOTER (ALWAYS VISIBLE ON ALL HP & PC) */}
        {/* ===================================================== */}
        <div
          style={{
            flexShrink: 0,
            background: 'linear-gradient(180deg, rgba(22, 9, 44, 0.98) 0%, rgba(10, 3, 20, 1) 100%)',
            borderTop: '2px solid rgba(255, 215, 0, 0.45)',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.7)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            zIndex: 10,
          }}
        >
          {/* Left: Active selection preview pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                background: '#0d0319',
                border: '2px solid #ffd700',
                boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
              }}
            >
              {renderPreviewAvatar(selectedAvatar)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: '#ffd700',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '180px',
                }}
              >
                {getSelectedAvatarName()}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#c084fc', whiteSpace: 'nowrap' }}>
                Bingkai: {AVATAR_FRAMES.find((f) => f.id === selectedFrame)?.name || 'Mahkota VIP'}
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              className="g-btn-press"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '9px 18px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#cbd5e1',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              className="g-btn-press"
              onClick={handleConfirm}
              disabled={isSaving}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: '2px solid #34d399',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.95rem',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.6)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: 'asmPulseSave 2.5s infinite ease-in-out',
              }}
            >
              <span>💾</span> {isSaving ? 'Menyimpan...' : 'SIMPAN AVATAR'}
            </button>
          </div>
        </div>

        {/* Celebratory Success Toast */}
        {successToast && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              animation: 'spmFadeIn 0.2s ease-out',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #10b981, #047857)',
                padding: '24px 36px',
                borderRadius: '20px',
                border: '2px solid #6ee7b7',
                boxShadow: '0 0 35px rgba(16, 185, 129, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '3rem' }}>🎉</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', textAlign: 'center' }}>
                AVATAR BERHASIL DIPASANG!
              </div>
              <div style={{ fontSize: '0.85rem', color: '#d1fae5', textAlign: 'center' }}>
                Profil dan seluruh tampilan game kini menggunakan avatar baru Anda.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
