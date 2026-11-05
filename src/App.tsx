import { useState, useEffect, useRef } from 'react';
import './App.css';
import './slot-modal.css';
import { io, Socket } from 'socket.io-client';
import { PixiSlotGame } from './PixiSlotGame';
import SlotMultiplierBar from './SlotMultiplierBar';
import FafafaSlotScreen from './FafafaSlotScreen';
import JinJiBaoXiSlotScreen from './JinJiBaoXiSlotScreen';
import MahjongWays2SlotScreen from './MahjongWays2SlotScreen';
import GatesOfGatokacaSlotScreen from './GatesOfGatokacaSlotScreen';
import SlotErrorBoundary from './SlotErrorBoundary';
import ZeusSlotScreen from './ZeusSlotScreen';
import CandyRushSlotScreen from './CandyRushSlotScreen';
import WildWestSlotScreen from './WildWestSlotScreen';
import FiveLionsSlotScreen from './FiveLionsSlotScreen';
import SlotSpeedButton from './SlotSpeedButton';
import BilliardScreen from './BilliardScreen';
import GameMenuDropdown from './GameMenuDropdown';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import OlympusCinematicBackground from './OlympusCinematicBackground';
import RoyalLoadingBackground from './RoyalLoadingBackground';
import LeaderboardModal from './LeaderboardModal';
import ChatModal from './ChatModal';
import ByOneScreen from './ByOneScreen';
import ByOneRoomModal from './ByOneRoomModal';
import './byone.css';
import SlotLoadingScreen from './SlotLoadingScreen';
import RiwayatTransferModal from './RiwayatTransferModal';
import SlotCelebrationModal, { SlotCelebrationData } from './SlotCelebrationModal';
import SlotProfileModal, { renderSlotAvatar } from './SlotProfileModal';
import { useSlotProfile } from './useSlotProfile';
import lobbyAudio, { type BgmTrackType } from './LobbyAudio';
import { preloadHomeAssets } from './slotAssetPreloader';
import AvatarSelectionModal from './AvatarSelectionModal';
import ChangeNameModal from './ChangeNameModal';
import { MIN_SLOT_BET, MAX_SLOT_BET, stepSlotBet } from './slotConfig';
import BeritaModal from './BeritaModal';

import { API_URL, getBackendBase, DEFAULT_LAN_SERVER } from './config';

// =====================================================
// HELPER LOGOUT AMAN (MENCEGAH NATIVE CRASH DI ANDROID)
// =====================================================
const safeGoogleSignOut = async () => {
  try {
    const isGoogleUser = (localStorage.getItem('domino_username') || '').startsWith('Google_') ||
                         localStorage.getItem('domino_login_provider') === 'google';
    if (!isGoogleUser) {
      // User Tamu / Guest TIDAK boleh memanggil native GoogleAuth.signOut() karena googleSignInClient null di Android!
      return;
    }
    if (Capacitor.isPluginAvailable('GoogleAuth')) {
      await GoogleAuth.initialize({
        clientId: '933896189377-hphu2lam3pj4okj9ravdvd3od1oqr6s1.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: false
      });
      await GoogleAuth.signOut();
    }
  } catch (err) {
    console.warn('safeGoogleSignOut non-fatal warning (ignored):', err);
  }
};

export const performFullLogout = async (onDone?: () => void) => {
  try {
    await safeGoogleSignOut();
  } catch (e) {
    console.warn('Logout sign-out warning:', e);
  }

  // Bersihkan data sesi login pemain
  const sessionKeys = [
    'domino_username',
    'domino_avatar',
    'domino_user_id',
    'domino_vip',
    'domino_is_vip',
    'domino_coins',
    'domino_rp',
    'domino_custom_frame',
    'domino_login_provider'
  ];
  sessionKeys.forEach(k => localStorage.removeItem(k));

  if (onDone) onDone();
};

// =====================================================
// LAYAR 1: LOADING SCREEN (HOME & LOBBY ASSET PRELOADER)
// =====================================================
function LoadingScreen({ onFinish }: { onFinish: (target: 'login' | 'home') => void }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('🎱 MENGHUBUNGKAN KE SERVER KINGS BILLIARD...');
  const animEnabled = localStorage.getItem('set_anim') !== 'off';
  const realPreloadDoneRef = useRef(false);
  const targetPercentRef = useRef(15);
  const hasFinishedRef = useRef(false);

  // Real-time Home & Lobby Asset Preloader & GPU Texture Decoder
  useEffect(() => {
    let isMounted = true;
    preloadHomeAssets((info) => {
      if (!isMounted) return;
      targetPercentRef.current = Math.max(targetPercentRef.current, info.percent);
      setStatusText(info.statusText);
    }).then(() => {
      if (!isMounted) return;
      realPreloadDoneRef.current = true;
      targetPercentRef.current = 100;
      setStatusText('👑 SEMUA ASET HOME TERMUAT LENGKAP! ✨');
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Smooth synchronized progress animation
  useEffect(() => {
    const totalDuration = animEnabled ? 2400 : 1200;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const timeRatio = Math.min(1, elapsed / totalDuration);

      const timeP = Math.floor(timeRatio * 92);
      const assetP = targetPercentRef.current;
      let nextP = Math.max(timeP, Math.min(assetP, 92));

      // Once all assets are 100% preloaded & decoded and minimum cinematic time has elapsed:
      if (realPreloadDoneRef.current && elapsed >= Math.min(1500, totalDuration * 0.7)) {
        nextP = Math.min(100, Math.max(nextP + 5, 96));
        if (elapsed >= totalDuration || nextP >= 100) {
          nextP = 100;
        }
      }

      setProgress((prev) => Math.min(100, Math.max(prev, nextP)));

      if (nextP >= 100 && realPreloadDoneRef.current && !hasFinishedRef.current) {
        hasFinishedRef.current = true;
        clearInterval(interval);
        const target: 'login' | 'home' = localStorage.getItem('domino_username') ? 'home' : 'login';
        setTimeout(() => onFinish(target), 350);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [onFinish, animEnabled]);

  return (
    <RoyalLoadingBackground>
      <div className="royal-progress-panel">
        <div className="royal-brand-badge">
          <img src="/assets/kings_billiards_logo.png" alt="Kings Billiards" className="royal-brand-img" />
          <span className="royal-brand-name">KINGS BILLIARDS</span>
        </div>

        <div className="royal-progress-info">
          <span className="royal-status-text">
            {progress >= 100 ? '👑 SEMUA ASET HOME TERMUAT LENGKAP! ✨' : statusText}
          </span>
          <span className="royal-percent-val">{progress}%</span>
        </div>

        <div className="royal-progress-track">
          <div className="royal-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="royal-footer-note">
          Koneksi Aman • Royal Gaming Platform
        </div>
      </div>
    </RoyalLoadingBackground>
  );
}

// =====================================================
// LAYAR 2: LOGIN SCREEN
// =====================================================
function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [savedUser, setSavedUser] = useState<string | null>(null);

  useEffect(() => {
    const user = localStorage.getItem('domino_username');
    if (user) setSavedUser(user);

    // Initialize Google Auth early on web so the GSI script is loaded before clicking
    if (Capacitor.isPluginAvailable('GoogleAuth')) {
      GoogleAuth.initialize({
        clientId: '933896189377-hphu2lam3pj4okj9ravdvd3od1oqr6s1.apps.googleusercontent.com',
        scopes: ['profile', 'email']
      }).catch(e => {
        console.warn('Failed to initialize Google Auth', e);
      });
    }
  }, []);

  const handleGuestLogin = async () => {
    setIsLoggingIn(true);
    const existingGuest = localStorage.getItem('domino_device_guest_username');

    if (existingGuest) {
      try {
        const checkRes = await fetch(`${API_URL}/profile/${existingGuest}`);
        if (checkRes.ok) {
          const profileData = await checkRes.json();
          if (profileData && profileData.username) {
            localStorage.setItem('domino_username', existingGuest);
            if (profileData.userId || profileData.id) {
              localStorage.setItem('domino_user_id', String(profileData.userId || profileData.id));
            }
            onLoginSuccess();
            return;
          }
        }
      } catch (err) {
        console.error("Checking existing guest account failed, generating new...", err);
      }
    }

    try {
      const randomID = Math.floor(Math.random() * 99999);
      const guestName = `Guest_${randomID}`;
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: guestName, coins: 10000, rp: 0, score: 50 })
      });
      if (res.ok) {
        const uData = await res.json().catch(() => ({}));
        if (uData.userId) localStorage.setItem('domino_user_id', uData.userId);
        localStorage.setItem('domino_username', guestName);
        localStorage.setItem('domino_device_guest_username', guestName);
        localStorage.setItem('domino_login_provider', 'guest');
        localStorage.setItem('domino_coins', '10000');
        onLoginSuccess();
      } else {
        alert('Gagal mendaftar. Pastikan server dan MongoDB menyala.');
        setIsLoggingIn(false);
      }
    } catch {
      const currentHost = getBackendBase();
      const promptIp = prompt(
        `Gagal terhubung ke server (${currentHost})!\n\n` +
        `Pastikan HP dan Laptop terhubung ke WiFi yang sama dan server backend menyala.\n` +
        `Jika alamat IP laptop Anda berbeda, silakan masukkan URL server di bawah:`,
        currentHost
      );
      if (promptIp && promptIp.trim() !== currentHost) {
        localStorage.setItem('domino_server_ip', promptIp.trim());
        window.location.reload();
      }
      setIsLoggingIn(false);
    }
  };

  const handleSocialLogin = async (platform: string = 'Google') => {
    setIsLoggingIn(true);
    let username = '';
    let googleAvatar = '';

    try {
      // Ensure GoogleAuth is initialized before signing in
      await GoogleAuth.initialize({
        clientId: '933896189377-hphu2lam3pj4okj9ravdvd3od1oqr6s1.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: false
      });
      // Always sign out any previous session first so Android opens the account selection popup
      try {
        await GoogleAuth.signOut();
      } catch (soErr) {
        // Ignored if no session was active
      }
      // Attempt Native Google Login
      const user: any = await GoogleAuth.signIn();
      username = `Google_${user.name || user.givenName || Math.floor(Math.random() * 9999)}`;
      googleAvatar = user.imageUrl || user.picture || user.photoUrl || (user.authentication as any)?.picture || '';
    } catch (error: any) {
      console.warn('Google Native Login error:', error);
      const errStr = String(error?.message || error?.error || error || '');
      // If user canceled the account picker dialog, simply abort without prompting
      if (errStr.includes('canceled') || errStr.includes('cancelled') || errStr.includes('12501')) {
        setIsLoggingIn(false);
        return;
      }
      const defaultName = `Google_${Math.floor(Math.random() * 9999)}`;
      let infoMsg = '';
      if (errStr.includes('10')) {
        infoMsg = 'Info: Error Code 10 (Fingerprint SHA-1 belum terdaftar di Google Cloud Console).\n';
      } else if (errStr) {
        infoMsg = `Info: ${errStr}\n`;
      }
      const promptUsername = prompt(
        `[Google Sign-In]\n${infoMsg}\nMasukkan nama profil Google Anda untuk melanjutkan:`,
        defaultName
      );
      if (!promptUsername) {
        setIsLoggingIn(false);
        return;
      }
      username = promptUsername;
    }

    try {
      // Sanitize username (remove spaces and special chars to prevent API issues)
      const sanitizedUsername = username.replace(/[^a-zA-Z0-9_]/g, '') || `Google_${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Check if user already exists
      const checkRes = await fetch(`${API_URL}/profile/${encodeURIComponent(sanitizedUsername)}`);
      const checkContentType = checkRes.headers.get('content-type') || '';

      // If server returned HTML (e.g. index.html from Vite or Capacitor web view) instead of JSON
      if (checkContentType.includes('text/html') || !checkContentType.includes('application/json')) {
        if (localStorage.getItem('domino_server_ip')) {
          localStorage.removeItem('domino_server_ip');
        }
        throw new Error(`Server mengembalikan halaman web (HTML/<!DOCTYPE>), bukan API backend port 8080. Pastikan aplikasi terhubung ke ${DEFAULT_LAN_SERVER}. Pengaturan server di-reset.`);
      }

      if (checkRes.ok) {
        const existingData = await checkRes.json().catch(() => null);
        if (existingData) {
          localStorage.setItem('domino_username', sanitizedUsername);
          if (existingData.userId || existingData.id) {
            localStorage.setItem('domino_user_id', String(existingData.userId || existingData.id));
          }
          // If user already has an avatar in DB, preserve it instead of resetting to Google photo!
          const hasCustomAvatar = existingData.avatar && existingData.avatar !== '/bg.png';
          if (hasCustomAvatar) {
            localStorage.setItem('domino_avatar', existingData.avatar);
            if (existingData.customFrame) localStorage.setItem('domino_custom_frame', existingData.customFrame);
          } else if (googleAvatar) {
            localStorage.setItem('domino_avatar', googleAvatar);
            fetch(`${API_URL}/users/avatar`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: sanitizedUsername, avatar: googleAvatar })
            }).catch(() => {});
          }
          onLoginSuccess();
          return;
        }
      }

      // 2. If not exists, create new user
      const initialAvatar = googleAvatar || '🐸';
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: sanitizedUsername,
          coins: 100000,
          rp: 0,
          score: 50,
          avatar: initialAvatar
        })
      });

      const resContentType = res.headers.get('content-type') || '';
      if (resContentType.includes('text/html') || !resContentType.includes('application/json')) {
        throw new Error(`Server backend tidak mengembalikan JSON yang valid. Pastikan terhubung ke port 8080.`);
      }

      if (res.ok) {
        const uData = await res.json().catch(() => ({}));
        if (uData.userId) localStorage.setItem('domino_user_id', uData.userId);
        localStorage.setItem('domino_username', sanitizedUsername);
        localStorage.setItem('domino_avatar', initialAvatar);
        localStorage.setItem('domino_coins', '100000');
        onLoginSuccess();
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Respon server tidak valid' }));
        alert(`Gagal mendaftarkan akun ${platform}: ${errorData.error || 'Server error'}`);
        setIsLoggingIn(false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const currentHost = getBackendBase();
      const errStr = String(err?.message || err || '');
      const isDoctypeErr = errStr.includes('DOCTYPE') || errStr.includes('Unexpected token') || errStr.includes('halaman web');
      const isNetworkErr = errStr.toLowerCase().includes('fetch') || errStr.toLowerCase().includes('network') || errStr.toLowerCase().includes('failed');
      
      if (isDoctypeErr) {
        localStorage.removeItem('domino_server_ip');
        alert(
          `Terjadi kesalahan komunikasi:\n${errStr}\n\n` +
          `Aplikasi terhubung ke server web/HTML bukan ke API backend Node.js (port 8080).\n` +
          `Alamat server telah di-reset ke default (${DEFAULT_LAN_SERVER}). Silakan coba klik tombol Login kembali!`
        );
        window.location.reload();
        return;
      }

      if (isNetworkErr) {
        const promptIp = prompt(
          `Gagal terhubung ke server (${currentHost})!\n\n` +
          `Pastikan HP dan Laptop terhubung ke WiFi yang sama dan server backend menyala.\n` +
          `Jika alamat IP laptop Anda berbeda, silakan masukkan URL server di bawah:`,
          currentHost
        );
        if (promptIp && promptIp.trim() !== currentHost) {
          localStorage.setItem('domino_server_ip', promptIp.trim());
          window.location.reload();
        }
      } else {
        alert(`Gagal login ${platform}: ${errStr}`);
      }
      setIsLoggingIn(false);
    }
  };

  return (
    <RoyalLoadingBackground>
      <div
        className="screen-wrapper login-olympus"
        onClick={savedUser ? onLoginSuccess : undefined}
        style={{ cursor: savedUser ? 'pointer' : 'default', zIndex: 10, justifyContent: 'flex-end', paddingBottom: '7vh' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5vh' }}>
          <img
            src="/assets/kings_billiards_logo.png"
            alt="Kings Billiards"
            className="royal-main-emblem-logo"
          />
          <p className="royal-status-text" style={{ fontSize: '13px', margin: '2px 0 0', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
            {savedUser ? `Selamat Datang Kembali, ${savedUser}!` : '✨ VIP CLUB KINGS BILLIARDS ✨'}
          </p>
        </div>

        {savedUser ? (
          <div className="tap-to-enter-anim login-olympus-tap">
            <span className="tap-text" style={{ fontSize: '2.2vh', color: '#ffd700', textShadow: '0 0 16px rgba(255,215,0,0.85)' }}>
              👑 Ketuk Layar untuk Masuk 👑
            </span>
          </div>
        ) : (
          <div className="login-box login-olympus-box" onClick={e => e.stopPropagation()}>
            <p className="login-title" style={{ color: '#ffe694', textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>
              Pilih Cara Masuk
            </p>
            <button className="btn-login-main" onClick={handleGuestLogin} disabled={isLoggingIn}>
              <span className="btn-login-icon">👤</span>
              <div className="btn-login-text">
                <span className="btn-login-name">{isLoggingIn ? 'Mendaftar...' : 'Masuk sebagai Tamu'}</span>
                <span className="btn-login-desc">Langsung main tanpa akun</span>
              </div>
            </button>
            <button className="btn-login-alt google" onClick={() => handleSocialLogin('Google')}>
              <span className="btn-login-icon">G</span>
              <div className="btn-login-text">
                <span className="btn-login-name">Masuk dengan Google</span>
                <span className="btn-login-desc">Gunakan akun Gmail Anda</span>
              </div>
            </button>
            <button className="btn-login-alt phone" onClick={() => alert('Login HP segera hadir!')}>
              <span className="btn-login-icon">📱</span>
              <div className="btn-login-text">
                <span className="btn-login-name">Masuk dengan Nomor HP</span>
                <span className="btn-login-desc">Verifikasi via SMS OTP</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </RoyalLoadingBackground>
  );
}

// =====================================================
// MODAL PENGATURAN
// =====================================================
function PengaturanModal({ onClose, onLogout, onOpenBerita }: { onClose: () => void; onLogout: () => void; onOpenBerita?: () => void }) {
  const [bgm, setBgm] = useState(() => localStorage.getItem('set_bgm') !== 'off');
  const [sfx, setSfx] = useState(() => localStorage.getItem('set_sfx') !== 'off');
  const [anim, setAnim] = useState(() => localStorage.getItem('set_anim') !== 'off');
  const [showDel, setShowDel] = useState<'cache' | 'data' | 'akun' | null>(null);
  const [bgmTrack, setBgmTrack] = useState<BgmTrackType>(() => lobbyAudio.getTrack());
  const [customSongName, setCustomSongName] = useState<string | null>(() => lobbyAudio.getCustomAudioName());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onTrackChange = (e: any) => {
      if (e.detail?.track) setBgmTrack(e.detail.track);
    };
    const onCustomLoaded = (e: any) => {
      setCustomSongName(e.detail?.name || null);
    };
    const onCustomRemoved = () => {
      setCustomSongName(null);
    };
    window.addEventListener('bgm_track_changed', onTrackChange);
    window.addEventListener('bgm_custom_file_loaded', onCustomLoaded);
    window.addEventListener('bgm_custom_file_removed', onCustomRemoved);
    return () => {
      window.removeEventListener('bgm_track_changed', onTrackChange);
      window.removeEventListener('bgm_custom_file_loaded', onCustomLoaded);
      window.removeEventListener('bgm_custom_file_removed', onCustomRemoved);
    };
  }, []);

  const handleSelectTrack = (track: BgmTrackType) => {
    setBgmTrack(track);
    lobbyAudio.setTrack(track);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const name = await lobbyAudio.setCustomAudioFile(file);
      setCustomSongName(name);
      handleSelectTrack('royal_x');
    }
  };

  const handleRemoveCustomSong = async () => {
    await lobbyAudio.removeCustomAudioFile();
    setCustomSongName(null);
  };

  const toggle = (key: string, val: boolean, setter: (v: boolean) => void) => {
    setter(!val);
    const stateStr = !val ? 'on' : 'off';
    localStorage.setItem(key, stateStr);
    if (key === 'set_bgm') {
      lobbyAudio.setMuted(val);
      window.dispatchEvent(new CustomEvent('bgm_setting_changed', { detail: { enabled: !val } }));
    }
    if (key === 'set_anim') {
      localStorage.setItem('domino_login_animation', stateStr);
    }
  };

  const doHapusCache = () => {
    ['domino_friends', 'domino_avatar', 'set_bgm', 'set_sfx', 'set_anim'].forEach(k => localStorage.removeItem(k));
    setShowDel(null);
  };
  const doHapusData = async () => {
    await performFullLogout();
    localStorage.clear();
    setShowDel(null);
    onLogout();
  };
  const doHapusAkun = async () => {
    const u = localStorage.getItem('domino_username');
    if (u) fetch(`${API_URL}/users/${u}`, { method: 'DELETE' }).catch(() => { });
    await performFullLogout();
    localStorage.clear();
    setShowDel(null);
    onLogout();
  };

  return (
    <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="peng-box tm-box-bounce" onClick={e => e.stopPropagation()}>
        <div className="peng-header">
          <span>🌴</span><span className="peng-header-title">Pengaturan</span><span>🌴</span>
        </div>
        <button className="peng-close g-btn-press" onClick={onClose}>✖</button>

        <div className="peng-toggle-row">
          {([
            { label: 'BGM', icon: '🎵', val: bgm, key: 'set_bgm', set: setBgm },
            { label: 'Efek Suara', icon: '🔊', val: sfx, key: 'set_sfx', set: setSfx },
            { label: 'Animasi Login', icon: '▶', val: anim, key: 'set_anim', set: setAnim },
          ] as const).map((item: any) => (
            <div className="peng-toggle-col" key={item.key}>
              <button className={`peng-toggle-btn g-btn-press ${item.val ? 'on' : 'off'}`}
                onClick={() => toggle(item.key, item.val, item.set)}>
                <span className="peng-toggle-state">{item.val ? 'ON' : 'OFF'}</span>
                <span className="peng-toggle-icon">{item.icon}</span>
              </button>
              <span className="peng-toggle-label">{item.label}</span>
            </div>
          ))}
        </div>

        {/* PILIHAN MUSIK LOBI (LAGU ITU VS LAGU KITA) */}
        <div className="peng-bgm-panel">
          <div className="peng-bgm-panel-hdr">
            <span>🎵</span>
            <span>Pilihan Musik Lobi</span>
          </div>

          <div className="peng-track-cards">
            {/* OPSI 1: LAGU ITU (TROPIS ISLAND) */}
            <div
              className={`peng-track-card g-btn-press ${bgmTrack === 'tropical' ? 'selected' : ''}`}
              onClick={() => handleSelectTrack('tropical')}
            >
              <div className="peng-track-card-badge">🎵 OPSI 1</div>
              <div className="peng-track-card-name">Lagu</div>
              <div className="peng-track-card-desc">Marimba Island / Lagu Santai Pantai</div>
              <div className="peng-track-card-indicator">
                {bgmTrack === 'tropical' ? '✓ Aktif' : 'Pilih'}
              </div>
            </div>

            {/* OPSI 2: LAGU KITA (ROYAL X THEME / CUSTOM) */}
            <div
              className={`peng-track-card g-btn-press ${bgmTrack === 'royal_x' ? 'selected' : ''}`}
              onClick={() => handleSelectTrack('royal_x')}
            >
              <div className="peng-track-card-badge gold">👑 OPSI 2</div>
              <div className="peng-track-card-name">Lagu Kita</div>
              <div className="peng-track-card-desc">
                {customSongName ? `File: ${customSongName}` : 'Tema Khas Kings Billiard (VIP Anthem)'}
              </div>
              <div className="peng-track-card-indicator">
                {bgmTrack === 'royal_x' ? '✓ Aktif' : 'Pilih'}
              </div>
            </div>
          </div>

          {/* OPSI UNGGAH FILE MUSIK KUSTOM */}
          {bgmTrack === 'royal_x' && (
            <div className="peng-custom-audio-box">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={handleFileSelected}
              />
              <div className="peng-custom-actions">
                <button
                  type="button"
                  className="peng-custom-upload-btn g-btn-press"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 {customSongName ? 'Ganti File Lagu Sendiri' : 'Unggah File Lagu Sendiri (MP3 / WAV)'}
                </button>
                {customSongName && (
                  <button
                    type="button"
                    className="peng-custom-reset-btn g-btn-press"
                    onClick={handleRemoveCustomSong}
                    title="Kembali ke lagu tema bawaan Kings Billiard"
                  >
                    ↺ Reset ke Tema Asli
                  </button>
                )}
              </div>
              <div className="peng-custom-hint">
                💡 File Anda tersimpan otomatis.
              </div>
            </div>
          )}
        </div>

        {/* TOMBOL BERITA & PENGUMUMAN RESMI */}
        <div
          className="peng-berita-btn-row g-btn-press"
          onClick={() => {
            onClose();
            onOpenBerita?.();
          }}
          style={{
            background: 'linear-gradient(180deg, #d97706, #b45309)',
            border: '2px solid #f1c40f',
            borderRadius: '12px',
            padding: '1.1vh 1.5vh',
            display: 'flex',
            alignItems: 'center',
            gap: '1.2vh',
            cursor: 'pointer',
            margin: '1.2vh 0 0.8vh',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            color: '#fff'
          }}
        >
          <span style={{ fontSize: '2.4vh' }}>📰</span>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 900, fontSize: '1.6vh', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              Berita & Pengumuman Resmi
            </div>
            <div style={{ fontSize: '1.25vh', color: '#fef3c7' }}>
              Update Fitur & Deklarasi Game Bebas Judi
            </div>
          </div>
          <span style={{ fontWeight: 900, color: '#f1c40f', fontSize: '2vh' }}>➔</span>
        </div>

        <div className="peng-update-row">
          <span>⬇️ <b>Update</b></span>
          <span className="peng-version">V2.79</span>
        </div>

        <div className="peng-action-row">
          <button className="peng-action-btn g-btn-press" onClick={() => setShowDel('cache')}>🗑️ Hapus Cache <span className="peng-help">❓</span></button>
          <button className="peng-action-btn g-btn-press" onClick={() => setShowDel('data')}>📁 Hapus Data <span className="peng-help">❓</span></button>
        </div>

        <button className="peng-keluar-btn g-btn-press" onClick={async () => {
          await performFullLogout();
          onLogout();
        }}>Keluar</button>
        <span className="peng-hapus-akun" onClick={() => setShowDel('akun')}>Hapus Akun</span>

        <div className="peng-footer">
          <span className="peng-link" onClick={() => alert('Data Anda dilindungi dan tidak dijual ke pihak ketiga.')}>Kebijakan Privasi</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}> dan </span>
          <span className="peng-link" onClick={() => alert('Gunakan game ini secara bertanggung jawab untuk hiburan.')}>Ketentuan Layanan</span>
        </div>

        {showDel && (
          <div className="peng-confirm-overlay" onClick={() => setShowDel(null)}>
            <div className="peng-confirm-box" onClick={e => e.stopPropagation()}>
              <div className="peng-confirm-title">
                {showDel === 'cache' ? '🗑️ Hapus Cache?' : showDel === 'data' ? '📁 Hapus Data?' : '⚠️ Hapus Akun?'}
              </div>
              <div className="peng-confirm-msg">
                {showDel === 'cache' && 'Cache akan dihapus. Data login tetap tersimpan.'}
                {showDel === 'data' && 'Semua data lokal akan dihapus. Anda akan logout.'}
                {showDel === 'akun' && 'Akun Anda akan dihapus PERMANEN dan tidak dapat dipulihkan!'}
              </div>
              <div style={{ display: 'flex', gap: '2vw', justifyContent: 'center' }}>
                <button className="peng-conf-cancel g-btn-press" onClick={() => setShowDel(null)}>Batal</button>
                <button className="peng-conf-ok g-btn-press"
                  onClick={showDel === 'cache' ? doHapusCache : showDel === 'data' ? doHapusData : doHapusAkun}>
                  Ya, Lanjutkan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// MODAL RULES
// =====================================================
const RULES_DATA: Record<string, string> = {
  Fokus: `【Pernyataan Resmi】:\n【Game ini hanya untuk santai dan hiburan, bukan perjudian】\n【Koin dan properti game hanya untuk dikonsumsi atau digunakan di dalam game】\n\nUser yang melakukan perilaku berikut akan diblokir akun nya:\n1. Memposting informasi buruk atau menghina orang lain di dalam game.\n2. Menggunakan aplikasi tambahan seperti akselerator di dalam game.\nTerima kasih atas dukungan Anda dan selamat bermain!`,
  'Kamar Biasa': `Kamar Biasa adalah mode permainan santai untuk pemula.\nTaruhan dimulai dari 1.000 koin.\nMenang berdasarkan kombinasi kartu domino tertinggi.`,
  'Kamar Bet': `Kamar Bet adalah mode dengan taruhan lebih besar.\nMinimum 10.000 koin per ronde.\nHanya untuk pemain berpengalaman.`,
  'Qiu Qiu': `Qiu Qiu (9-9) adalah varian domino populer.\nNilai kartu dihitung dari angka satuan.\nNilai tertinggi adalah 9-9 (Qiu Qiu).`,
  'Remi': `Remi dimainkan dengan 52 kartu remi standar.\nTujuannya menyusun kombinasi kartu terbaik dalam satu meja.`,
  'RemiPro': `RemiPro adalah mode Remi tingkat lanjut dengan aturan lebih ketat dan hadiah lebih besar.\nDiperlukan minimal Level 5.`,
  'Capsa Susun': `Capsa Susun menggunakan 52 kartu, dibagi 13 ke masing-masing pemain.\nSusun menjadi 3 kombinasi (3+5+5 kartu).\nKombinasi tertinggi menang.`,
};


// =====================================================
// MODAL CUSTOMER SERVICE
// =====================================================
function CSModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="peng-box tm-box-bounce" style={{ maxWidth: '55vw' }} onClick={e => e.stopPropagation()}>
        <div className="peng-header">
          <span>💬</span><span className="peng-header-title">Customer Service</span><span>💬</span>
        </div>
        <button className="peng-close g-btn-press" onClick={onClose}>✖</button>
        <div style={{ padding: '2vh 2vw', display: 'flex', flexDirection: 'column', gap: '1.5vh' }}>
          {[
            { icon: '💬', label: 'WhatsApp CS', val: 'Hubungi →', color: '#2ecc71', action: () => alert('WhatsApp CS: +62-800-DOMINO') },
            { icon: '✈️', label: 'Telegram', val: 'Hubungi →', color: '#3498db', action: () => alert('Telegram: @DominoHGI_CS') },
            { icon: '📧', label: 'Email Support', val: 'Kirim Email →', color: '#f1c40f', action: () => alert('Email: support@dominohgi.com') },
            { icon: '🕐', label: 'Jam Operasional', val: '08.00 – 22.00', color: 'rgba(255,255,255,0.6)', action: () => { } },
          ].map((item, i) => (
            <div key={i} className="peng-update-row" style={{ cursor: 'pointer' }} onClick={item.action}>
              <span>{item.icon} <b>{item.label}</b></span>
              <span className="peng-version" style={{ color: item.color }}>{item.val}</span>
            </div>
          ))}
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '1.5vh', marginTop: '1vh' }}>
            Kami siap membantu Anda 7 hari seminggu
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// HELPER RENDER AVATAR (Mendukung URL Foto Google & Emoji)
// =====================================================
export function renderPlayerAvatar(avatar: string | undefined | null, fallback: string = '🐸', className?: string) {
  const isImg = avatar && (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:') || (avatar.startsWith('/') && !avatar.endsWith('undefined')));
  if (isImg) {
    return (
      <img
        src={avatar}
        alt="avatar"
        className={className || "avatar-photo-img"}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          target.style.display = 'none';
          if (target.parentElement && !target.parentElement.querySelector('.avatar-fallback-text')) {
            const span = document.createElement('span');
            span.className = 'avatar-fallback-text';
            span.textContent = fallback;
            target.parentElement.appendChild(span);
          }
        }}
      />
    );
  }
  return <span>{avatar || fallback}</span>;
}

// =====================================================
// MODAL LIHAT PROFIL ORANG LAIN (OTHER PROFILE MODAL)
// =====================================================
function OtherProfileModal({ username, onClose, onAddFriend, onSendCoins, onChallengeByOne }: { username: string; onClose: () => void; onAddFriend?: (uname: string) => void; onSendCoins?: (uname: string) => void; onChallengeByOne?: (uname: string) => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const myUsername = localStorage.getItem('domino_username') || '';

  const formatCoins = (n: number) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/profile/${username}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1500 }}>
        <div className="op-box tm-box-bounce" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontSize: '2.5vh' }}>Memuat Profil...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1500 }} onClick={onClose}>
        <div className="op-box tm-box-bounce" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontSize: '2.5vh' }}>Pemain tidak ditemukan</div>
          <button className="tm-alert-close-btn g-btn-press" style={{ marginTop: '2vh' }} onClick={onClose}>Tutup</button>
        </div>
      </div>
    );
  }

  const baseScore = profile.score || 50;
  const stats = {
    ronde: baseScore * 5 + 12,
    menang: baseScore * 2 + 3,
    winStreak: (baseScore % 7) + 1,
    radar: { domino: 0.85, poker: 0.4, santai: 0.9, slot: 0.6, ludo: 0.75 }
  };
  const winRate = ((stats.menang / stats.ronde) * 100).toFixed(2);

  // SVG Radar Pentagon
  const renderRadar = () => {
    const size = 100, center = size / 2, radius = size / 2.5;
    const angles = [0, 72, 144, 216, 288].map(deg => (deg * Math.PI) / 180);
    const vals = [stats.radar.domino, stats.radar.poker, stats.radar.santai, stats.radar.slot, stats.radar.ludo];
    const bgPts = angles.map(a => `${center + radius * Math.sin(a)},${center - radius * Math.cos(a)}`).join(' ');
    const valPts = angles.map((a, i) => `${center + vals[i] * radius * Math.sin(a)},${center - vals[i] * radius * Math.cos(a)}`).join(' ');

    return (
      <div className="pm-radar-wrapper" style={{ width: '20vh', height: '20vh' }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <polygon points={bgPts} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          {angles.map((a, i) => (
            <line key={i} x1={center} y1={center} x2={center + radius * Math.sin(a)} y2={center - radius * Math.cos(a)} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          ))}
          <polygon points={valPts} fill="rgba(241,196,15,0.6)" stroke="#f1c40f" strokeWidth="1.5" />
        </svg>
        <span className="rl rl-top">Domino</span>
        <span className="rl rl-tr">Poker</span>
        <span className="rl rl-br">Santai</span>
        <span className="rl rl-bl">Slot</span>
        <span className="rl rl-tl">Ludo</span>
      </div>
    );
  };

  const isFriend = profile.friends?.includes(myUsername) || false;
  const isSelf = profile.username === myUsername;

  return (
    <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1500 }} onClick={onClose}>
      <div className="op-box tm-box-bounce" onClick={e => e.stopPropagation()}>
        <button className="tm-close-btn g-btn-press" style={{ top: '-1vh', right: '-1vw' }} onClick={onClose}>✖</button>
        <div className="op-header">KARTU PEMAIN</div>

        <div className="op-body">
          {/* Kiri: Avatar & Basic Info */}
          <div className="op-left-card">
            <div className="op-avatar-glow" style={{ overflow: 'hidden' }}>
              <span className="op-avatar-emoji" style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                {renderPlayerAvatar(profile.avatar, '🐸', 'op-avatar-pic')}
              </span>
            </div>
            <div className="op-name">{profile.username}</div>
            <div className="op-coins">🪙 {formatCoins(profile.coins)}</div>
            <div className="op-level-tag">LEVEL 1</div>
          </div>

          {/* Tengah: Stats List */}
          <div className="op-stats-card">
            <div className="op-stat-row">
              <span className="op-stat-lbl">Total Main</span>
              <span className="op-stat-val">{stats.ronde}x</span>
            </div>
            <div className="op-stat-row">
              <span className="op-stat-lbl">Menang</span>
              <span className="op-stat-val">{stats.menang}x</span>
            </div>
            <div className="op-stat-row">
              <span className="op-stat-lbl">Win Rate</span>
              <span className="op-stat-val" style={{ color: '#2ecc71' }}>{winRate}%</span>
            </div>
            <div className="op-stat-row">
              <span className="op-stat-lbl">Win Streak</span>
              <span className="op-stat-val" style={{ color: '#f1c40f' }}>{stats.winStreak}</span>
            </div>
          </div>

          {/* Kanan: Radar Ability */}
          <div className="op-radar-card">
            <div className="op-stat-lbl" style={{ marginBottom: '1vh', textAlign: 'center' }}>Grafik Kemampuan</div>
            {renderRadar()}
          </div>
        </div>

        {/* Action Button di bawah */}
        <div className="op-actions">
          {isSelf ? (
            <div style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', fontSize: '2vh' }}>Ini adalah profil Anda</div>
          ) : (
            <div style={{ display: 'flex', gap: '1vw', width: '100%' }}>
              {isFriend ? (
                <button className="op-action-btn send g-btn-press" onClick={() => { onClose(); onSendCoins?.(profile.username); }}>
                  💸 Kirim Koin
                </button>
              ) : (
                <button className="op-action-btn add g-btn-press" onClick={() => { onClose(); onAddFriend?.(profile.username); }}>
                  ➕ Tambah Teman
                </button>
              )}
              <button
                className="op-action-btn send g-btn-press"
                style={{ background: 'linear-gradient(90deg, #e74c3c, #c0392b)', borderColor: '#ff7675' }}
                onClick={() => { onClose(); onChallengeByOne?.(profile.username); }}
              >
                ⚔️ Tantang By One
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MODAL POPUP
// =====================================================
function Modal({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-message">{message}</div>
        <button className="modal-close-btn" onClick={onClose}>Tutup</button>
      </div>
    </div>
  );
}

// =====================================================
// MODAL TEMAN (FRIENDS)
// =====================================================
function TemanModal({ defaultTab = 'Teman', onViewProfile, onClose }: { defaultTab?: string; onViewProfile: (username: string) => void; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const myUsername = localStorage.getItem('domino_username') || '';

  type PlayerProfile = { username: string; userId?: string; avatar: string; coins: number; vipLevel?: number };
  const [myCoins, setMyCoins] = useState(0);
  const [friends, setFriends] = useState<PlayerProfile[]>([]);
  const [recommendations, setRecommendations] = useState<PlayerProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchId, setSearchId] = useState('');
  const [transferTarget, setTransferTarget] = useState<{ username: string } | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showAlert = (msg: string) => {
    setAlertModal({ title: 'INFO', message: msg });
  };

  const formatCoins = (n: number) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const fetchData = async () => {
    if (!myUsername) return;
    try {
      setLoading(true);
      // 1. Fetch current user profile to get friends list, requests, and coins
      const profileRes = await fetch(`${API_URL}/profile/${myUsername}`);
      if (!profileRes.ok) throw new Error('Gagal mengambil profil');
      const profileData = await profileRes.json();
      setMyCoins(profileData.coins);
      const myFriendsList = profileData.friends || [];
      const myRequestsList = profileData.friendRequests || [];

      // 2. Fetch all users
      const usersRes = await fetch(`${API_URL}/users?exclude=${myUsername}`);
      if (!usersRes.ok) throw new Error('Gagal mengambil daftar pemain');
      const allUsers = await usersRes.json();

      // Separate friends, incoming requests, and recommendations
      const friendProfiles = allUsers.filter((u: any) => myFriendsList.includes(u.username));
      const requestProfiles = allUsers.filter((u: any) => myRequestsList.includes(u.username));

      // Recommendation: not a friend, hasn't sent a request to us, and we haven't sent a request to them
      const recProfiles = allUsers.filter((u: any) =>
        !myFriendsList.includes(u.username) &&
        !myRequestsList.includes(u.username) &&
        !u.friendRequests?.includes(myUsername)
      );

      setFriends(friendProfiles);
      setIncomingRequests(requestProfiles);
      setRecommendations(recProfiles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [myUsername]);

  const handleAddFriend = async (friendUsername: string) => {
    try {
      const res = await fetch(`${API_URL}/friends/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, friendUsername })
      });
      if (res.ok) {
        showAlert(`Permintaan pertemanan dikirim ke ${friendUsername}!`);
        fetchData();
      } else {
        const err = await res.json();
        showAlert(err.error || 'Gagal mengirim permintaan pertemanan');
      }
    } catch {
      showAlert('Koneksi server gagal');
    }
  };

  const handleAcceptRequest = async (requesterUsername: string) => {
    try {
      const res = await fetch(`${API_URL}/friends/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, requesterUsername })
      });
      if (res.ok) {
        showAlert(`Anda sekarang berteman dengan ${requesterUsername}!`);
        fetchData();
      } else {
        showAlert('Gagal menerima pertemanan');
      }
    } catch {
      showAlert('Koneksi server gagal');
    }
  };

  const handleDeclineRequest = async (requesterUsername: string) => {
    try {
      const res = await fetch(`${API_URL}/friends/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, requesterUsername })
      });
      if (res.ok) {
        showAlert('Permintaan pertemanan ditolak');
        fetchData();
      } else {
        showAlert('Gagal menolak permintaan');
      }
    } catch {
      showAlert('Koneksi server gagal');
    }
  };

  const handleDeleteFriend = async (friendUsername: string) => {
    setConfirmModal({
      message: `Apakah Anda yakin ingin menghapus ${friendUsername} dari daftar teman?`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`${API_URL}/friends/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: myUsername, friendUsername })
          });
          if (res.ok) {
            showAlert('Pertemanan dihapus');
            fetchData();
          } else {
            showAlert('Gagal menghapus teman');
          }
        } catch {
          showAlert('Koneksi server gagal');
        }
      }
    });
  };

  const handleSearchAndAdd = async () => {
    const target = searchId.trim();
    if (!target) return;
    try {
      const res = await fetch(`${API_URL}/friends/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, friendId: target, friendUsername: target })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        showAlert(data.message || `Permintaan pertemanan dikirim ke ID ${target}!`);
        setSearchId('');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showAlert(err.error || `Pemain dengan ID "${target}" tidak ditemukan atau sudah berteman`);
      }
    } catch {
      showAlert('Koneksi server gagal');
    }
  };

  const handleExecuteTransfer = async () => {
    if (!transferTarget) return;
    const amountVal = parseInt(transferAmount, 10);
    if (isNaN(amountVal) || amountVal <= 0) {
      showAlert('Jumlah koin tidak valid');
      return;
    }
    if (amountVal > myCoins) {
      showAlert('Koin Anda tidak mencukupi');
      return;
    }

    setConfirmModal({
      message: `Kirim ${formatCoins(amountVal)} koin ke ${transferTarget.username}?`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`${API_URL}/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromUsername: myUsername,
              toUsername: transferTarget.username,
              amount: amountVal
            })
          });
          if (res.ok) {
            const data = await res.json();
            showAlert(data.message);
            setMyCoins(data.senderCoins);
            setTransferTarget(null);
            setTransferAmount('');
            fetchData();
          } else {
            const err = await res.json();
            showAlert(err.error || 'Transfer gagal');
          }
        } catch {
          showAlert('Koneksi server gagal');
        }
      }
    });
  };

  const tabs = [
    { id: 'Teman', icon: '🎮', label: 'Teman' },
    { id: 'Rekomendasi', icon: '👤', label: 'Rekomendasi' },
    { id: 'Permintaan', icon: '📄', label: 'Permintaan' },
    { id: 'Hadiah', icon: '🎁', label: 'Hadiah' },
    { id: 'History', icon: '📄', label: 'History' },
    { id: 'Bantuan', icon: '❓', label: 'Bantuan' }
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <div className="tm-empty-state">
          <div className="tm-empty-text">Memuat data...</div>
        </div>
      );
    }

    if (activeTab === 'Teman') {
      if (friends.length === 0) {
        return (
          <div className="tm-empty-state tm-fade-in">
            <div className="tm-empty-icon"><span style={{ fontSize: '8vh' }}>😢</span></div>
            <div className="tm-empty-text">Anda belum memiliki teman.</div>
            <button className="tm-add-btn g-btn-press" onClick={() => setActiveTab('Rekomendasi')}>Cari Teman</button>
          </div>
        );
      }
      return (
        <div className="tm-list-container tm-fade-in">
          {friends.map(f => (
            <div className="tm-list-item" key={f.username}>
              <div className="tm-li-left">
                <span className="tm-li-avatar g-btn-press" style={{ cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => onViewProfile(f.username)}>
                  {renderPlayerAvatar(f.avatar, '🐸', 'tm-avatar-pic')}
                </span>
                <div>
                  <div className="tm-li-name">{f.username}</div>
                  <div className="tm-li-id">{f.userId ? `ID: ${f.userId} • ` : ''}Koin: {formatCoins(f.coins)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1vw' }}>
                <button className="tm-action-btn g-btn-press" style={{ background: 'linear-gradient(180deg, #e67e22, #d35400)' }} onClick={() => setTransferTarget({ username: f.username })}>Kirim Uang</button>
                <button className="tm-action-btn delete g-btn-press" onClick={() => handleDeleteFriend(f.username)}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'Rekomendasi') {
      const q = searchId.trim().toLowerCase();
      const filteredRecs = recommendations.filter(r => {
        if (!q) return true;
        const matchId = r.userId && String(r.userId).toLowerCase().includes(q);
        const matchUser = r.username && r.username.toLowerCase().includes(q);
        return matchId || matchUser;
      });

      return (
        <div className="tm-list-container tm-fade-in">
          <div className="tm-search-row">
            <input
              type="text"
              placeholder="Cari ID Teman (8 digit) atau Username..."
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              className="tm-input"
            />
            <button className="tm-search-add-btn g-btn-press" onClick={handleSearchAndAdd}>Cari & Tambah</button>
          </div>
          {filteredRecs.length > 0 ? (
            filteredRecs.map(r => (
              <div className="tm-list-item" key={r.username}>
                <div className="tm-li-left">
                  <span className="tm-li-avatar g-btn-press" style={{ cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => onViewProfile(r.username)}>
                    {renderPlayerAvatar(r.avatar, '🐸', 'tm-avatar-pic')}
                  </span>
                  <div>
                    <div className="tm-li-name">{r.username}</div>
                    <div className="tm-li-id">
                      {r.userId && <span style={{ color: '#ffd54f', fontWeight: 'bold', marginRight: '6px' }}>ID: {r.userId} • </span>}
                      Koin: {formatCoins(r.coins)}
                    </div>
                  </div>
                </div>
                <button className="tm-action-btn g-btn-press" onClick={() => handleAddFriend(r.username)}>+ Tambah</button>
              </div>
            ))
          ) : (
            <div className="tm-empty-state">
              <div className="tm-empty-text">
                {searchId ? `Tidak ditemukan pemain dengan ID/Username "${searchId}"` : 'Tidak ada rekomendasi saat ini.'}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'Permintaan') {
      if (incomingRequests.length === 0) {
        return (
          <div className="tm-empty-state tm-fade-in">
            <div className="tm-empty-icon">
              <span style={{ fontSize: '8vh' }}>🐸</span>
              <div className="tm-zzz">Zzz...</div>
            </div>
            <div className="tm-empty-text">Tidak ada permintaan teman baru.</div>
          </div>
        );
      }

      return (
        <div className="tm-list-container tm-fade-in">
          {incomingRequests.map(r => (
            <div className="tm-list-item" key={r.username}>
              <div className="tm-li-left">
                <span className="tm-li-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {renderPlayerAvatar(r.avatar, '🐸', 'tm-avatar-pic')}
                </span>
                <div>
                  <div className="tm-li-name">{r.username}</div>
                  <div className="tm-li-id">Koin: {formatCoins(r.coins)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1vw' }}>
                <button className="tm-action-btn g-btn-press" style={{ background: 'linear-gradient(180deg, #2ecc71, #27ae60)' }} onClick={() => handleAcceptRequest(r.username)}>Terima</button>
                <button className="tm-action-btn delete g-btn-press" onClick={() => handleDeclineRequest(r.username)}>Tolak</button>
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (activeTab === 'History') {
      return (
        <div className="tm-empty-state tm-fade-in">
          <div className="tm-empty-icon"><span style={{ fontSize: '8vh' }}>📜</span></div>
          <div className="tm-empty-text">Belum ada riwayat pertandingan.</div>
        </div>
      );
    }
    // Default empty state for other tabs
    return (
      <div className="tm-empty-state tm-fade-in">
        <div className="tm-empty-icon"><span style={{ fontSize: '8vh' }}>🏝️</span></div>
        <div className="tm-empty-text">Belum ada data untuk {activeTab}.</div>
      </div>
    );
  };
  return (
    <div className="modal-overlay tm-overlay-fade" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="tm-box" onClick={e => e.stopPropagation()}>
        {/* Header Tab (Title) */}
        <div className="tm-header-tab">
          <span className="tm-header-icon">🌴</span> Teman
        </div>

        {/* Close Button */}
        <button className="tm-close-btn g-btn-press" onClick={onClose}>✖</button>

        <div className="tm-body">
          {/* Sidebar */}
          <div className="tm-sidebar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tm-sidebar-btn g-btn-press ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tm-sb-icon">{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="tm-content-area">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Transfer Coins Popup */}
      {transferTarget && (
        <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1200 }} onClick={() => setTransferTarget(null)}>
          <div className="tm-transfer-popup tm-box-bounce" onClick={e => e.stopPropagation()}>
            <button className="tm-close-btn g-btn-press" style={{ top: '-1vh', right: '-1vw' }} onClick={() => setTransferTarget(null)}>✖</button>
            <div className="modal-title">KIRIM UANG (KOIN)</div>

            <div className="tm-transfer-body">
              {/* Animated Floating Coins */}
              <div className="tm-transfer-coin-flow">
                <span className="tm-floating-coin c1">🪙</span>
                <span className="tm-floating-coin c2">🪙</span>
                <span className="tm-floating-coin c3">🪙</span>
              </div>

              <div className="tm-transfer-info-card">
                <div style={{ fontSize: '2.5vh', color: '#fff', fontWeight: 'bold' }}>
                  Kirim ke: <span style={{ color: '#f1c40f' }}>{transferTarget.username}</span>
                </div>
                <div style={{ fontSize: '1.8vh', color: 'rgba(255,255,255,0.7)', marginTop: '0.5vh' }}>
                  Koin Anda: <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>{formatCoins(myCoins)}</span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="tm-input-group">
                <input
                  type="number"
                  placeholder="0"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  className="tm-transfer-input"
                  autoFocus
                />
                <span className="tm-input-coin-label">🪙</span>
              </div>

              {/* Quick Select Buttons */}
              <div className="tm-quick-amount-grid">
                {[100000, 500000, 1000000, 5000000, 10000000].map(val => (
                  <button
                    key={val}
                    className="tm-quick-btn g-btn-press"
                    onClick={() => {
                      const current = parseInt(transferAmount, 10) || 0;
                      setTransferAmount((current + val).toString());
                    }}
                  >
                    +{formatCoins(val)}
                  </button>
                ))}
                <button
                  className="tm-quick-btn clear g-btn-press"
                  onClick={() => setTransferAmount('')}
                >
                  Reset
                </button>
              </div>

              {/* Transfer Actions */}
              <div className="tm-transfer-actions">
                <button
                  className="tm-transfer-cancel-btn g-btn-press"
                  onClick={() => { setTransferTarget(null); setTransferAmount(''); }}
                >
                  Batal
                </button>
                <button
                  className="tm-transfer-submit-btn g-btn-press tm-pulse-btn"
                  onClick={handleExecuteTransfer}
                >
                  🚀 Kirim Sekarang
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Premium Notification Popup */}
      {alertModal && (
        <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1300 }} onClick={() => setAlertModal(null)}>
          <div className="tm-alert-box tm-box-bounce" onClick={e => e.stopPropagation()}>
            <div className="tm-alert-header">
              <span className="tm-alert-crown">👑</span> {alertModal.title}
            </div>
            <div className="tm-alert-message">{alertModal.message}</div>
            <button className="tm-alert-close-btn g-btn-press" onClick={() => setAlertModal(null)}>OKE</button>
          </div>
        </div>
      )}

      {/* Premium Confirmation Popup */}
      {confirmModal && (
        <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1400 }} onClick={() => setConfirmModal(null)}>
          <div className="tm-alert-box tm-box-bounce" onClick={e => e.stopPropagation()}>
            <div className="tm-alert-header">
              <span className="tm-alert-crown">⚠️</span> KONFIRMASI
            </div>
            <div className="tm-alert-message">{confirmModal.message}</div>
            <div style={{ display: 'flex', gap: '2vw', marginTop: '1vh' }}>
              <button className="tm-transfer-cancel-btn g-btn-press" style={{ padding: '1vh 3vw', width: 'auto' }} onClick={() => setConfirmModal(null)}>Batal</button>
              <button className="tm-alert-close-btn g-btn-press" style={{ padding: '1vh 4vw', background: 'linear-gradient(180deg, #2ecc71, #27ae60)', width: 'auto' }} onClick={confirmModal.onConfirm}>Ya</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// INBOX MODAL
// =====================================================
interface InboxMsg {
  _id: string;
  fromUsername: string;
  type: 'system' | 'friend_request' | 'gift' | 'achievement' | 'transfer';
  title: string;
  body: string;
  icon: string;
  isRead: boolean;
  data?: any;
  createdAt: string;
}

function InboxModal({ onClose, onViewProfile }: { onClose: () => void; onViewProfile?: (u: string) => void }) {
  const myUsername = localStorage.getItem('domino_username') || '';
  const [messages, setMessages] = useState<InboxMsg[]>([]);
  const [friendRequests, setFriendRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pesan' | 'teman'>('pesan');
  const [alert, setAlert] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Seed welcome jika pertama kali
      await fetch(`${API_URL}/inbox/seed-welcome/${myUsername}`, { method: 'POST' }).catch(() => { });
      // Ambil inbox
      const res = await fetch(`${API_URL}/inbox/${myUsername}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
      // Ambil friend requests
      const profRes = await fetch(`${API_URL}/profile/${myUsername}`);
      if (profRes.ok) {
        const prof = await profRes.json();
        setFriendRequests(prof.friendRequests || []);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const markRead = async (id: string) => {
    await fetch(`${API_URL}/inbox/read/${id}`, { method: 'POST' }).catch(() => { });
    setMessages(prev => prev.map(m => m._id === id ? { ...m, isRead: true } : m));
  };

  const markAllRead = async () => {
    await fetch(`${API_URL}/inbox/read-all`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: myUsername })
    }).catch(() => { });
    setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
  };

  const deleteMsg = async (id: string) => {
    await fetch(`${API_URL}/inbox/${id}`, { method: 'DELETE' }).catch(() => { });
    setMessages(prev => prev.filter(m => m._id !== id));
  };

  const clearAll = async () => {
    await fetch(`${API_URL}/inbox/clear/${myUsername}`, { method: 'DELETE' }).catch(() => { });
    setMessages([]);
  };

  const handleAccept = async (requester: string) => {
    setProcessingId(requester);
    try {
      const res = await fetch(`${API_URL}/friends/accept`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, requesterUsername: requester })
      });
      if (res.ok) {
        setFriendRequests(prev => prev.filter(r => r !== requester));
        setAlert(`✅ ${requester} sekarang menjadi teman Anda!`);
        // Kirim notif ke inbox
        await fetch(`${API_URL}/inbox/send`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toUsername: myUsername, fromUsername: 'SISTEM', type: 'system',
            title: '👥 Pertemanan Baru!',
            body: `Anda dan ${requester} sekarang berteman. Selamat bermain bersama!`,
            icon: '👥'
          })
        }).catch(() => { });
        // Refresh inbox
        const inboxRes = await fetch(`${API_URL}/inbox/${myUsername}`);
        if (inboxRes.ok) { const d = await inboxRes.json(); setMessages(d.messages || []); }
      } else {
        const err = await res.json(); setAlert(err.error || 'Gagal');
      }
    } catch { setAlert('Koneksi gagal'); }
    setProcessingId(null);
  };

  const handleDecline = async (requester: string) => {
    setProcessingId(requester);
    try {
      await fetch(`${API_URL}/friends/decline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, requesterUsername: requester })
      });
      setFriendRequests(prev => prev.filter(r => r !== requester));
      setAlert(`❌ Permintaan dari ${requester} ditolak.`);
    } catch { setAlert('Koneksi gagal'); }
    setProcessingId(null);
  };

  const unreadCount = messages.filter(m => !m.isRead).length;

  const typeColor: Record<string, string> = {
    system: '#60a5fa',
    gift: '#f59e0b',
    achievement: '#a78bfa',
    transfer: '#34d399',
    friend_request: '#fb923c',
  };

  const timeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
  };

  return (
    <div className="modal-overlay inbox-overlay" onClick={onClose}>
      <div className="inbox-box" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="inbox-header">
          <div className="inbox-header-left">
            <span className="inbox-icon-title">✉️</span>
            <span className="inbox-title">Kotak Masuk</span>
            {unreadCount > 0 && <span className="inbox-unread-badge">{unreadCount}</span>}
          </div>
          <div className="inbox-header-actions">
            {activeTab === 'pesan' && messages.length > 0 && (
              <>
                <button className="inbox-action-btn" onClick={markAllRead} title="Tandai semua dibaca">✓ Baca Semua</button>
                <button className="inbox-action-btn danger" onClick={clearAll} title="Hapus semua">🗑️</button>
              </>
            )}
            <button className="inbox-close-btn" onClick={onClose}>✖</button>
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <div className="inbox-alert" onClick={() => setAlert(null)}>{alert}</div>
        )}

        {/* Tabs */}
        <div className="inbox-tabs">
          <button
            className={`inbox-tab ${activeTab === 'pesan' ? 'active' : ''}`}
            onClick={() => setActiveTab('pesan')}
          >
            📬 Pesan
            {unreadCount > 0 && <span className="tab-badge">{unreadCount}</span>}
          </button>
          <button
            className={`inbox-tab ${activeTab === 'teman' ? 'active' : ''}`}
            onClick={() => setActiveTab('teman')}
          >
            👥 Permintaan Teman
            {friendRequests.length > 0 && <span className="tab-badge">{friendRequests.length}</span>}
          </button>
        </div>

        {/* Content */}
        <div className="inbox-content">
          {loading ? (
            <div className="inbox-loading">
              <div className="inbox-spinner" />
              <span>Memuat pesan...</span>
            </div>
          ) : activeTab === 'pesan' ? (
            messages.length === 0 ? (
              <div className="inbox-empty">
                <div className="inbox-empty-icon">📭</div>
                <p>Kotak masuk kosong</p>
              </div>
            ) : (
              <div className="inbox-list">
                {messages.map(msg => (
                  <div
                    key={msg._id}
                    className={`inbox-item ${msg.isRead ? 'read' : 'unread'}`}
                    onClick={() => markRead(msg._id)}
                  >
                    {!msg.isRead && <div className="inbox-unread-dot" />}
                    <div className="inbox-item-icon" style={{ background: `${typeColor[msg.type] ?? '#888'}22`, border: `1px solid ${typeColor[msg.type] ?? '#888'}44` }}>
                      {msg.icon}
                    </div>
                    <div className="inbox-item-body">
                      <div className="inbox-item-title">{msg.title}</div>
                      <div className="inbox-item-text">{msg.body}</div>
                      <div className="inbox-item-meta">
                        <span className="inbox-item-from">{msg.fromUsername}</span>
                        <span className="inbox-item-time">{timeAgo(msg.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      className="inbox-delete-btn"
                      onClick={e => { e.stopPropagation(); deleteMsg(msg._id); }}
                      title="Hapus"
                    >✖</button>
                  </div>
                ))}
              </div>
            )
          ) : (
            friendRequests.length === 0 ? (
              <div className="inbox-empty">
                <div className="inbox-empty-icon">👥</div>
                <p>Tidak ada permintaan teman</p>
              </div>
            ) : (
              <div className="inbox-list">
                {friendRequests.map(req => (
                  <div key={req} className="inbox-item unread friend-req-item">
                    <div className="inbox-item-icon" style={{ background: '#fb923c22', border: '1px solid #fb923c44' }}>👤</div>
                    <div className="inbox-item-body">
                      <div className="inbox-item-title">
                        <button
                          className="inbox-username-link"
                          onClick={() => { onViewProfile?.(req); onClose(); }}
                        >{req}</button>
                        <span style={{ fontSize: '1.1vh', color: 'rgba(255,255,255,0.5)' }}> mengajak berteman</span>
                      </div>
                      <div className="inbox-friend-actions">
                        <button
                          className="inbox-btn accept"
                          onClick={() => handleAccept(req)}
                          disabled={processingId === req}
                        >
                          {processingId === req ? '...' : '✓ Terima'}
                        </button>
                        <button
                          className="inbox-btn decline"
                          onClick={() => handleDecline(req)}
                          disabled={processingId === req}
                        >
                          ✗ Tolak
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// KIRIM KOIN MODAL (FITUR VIP)
// =====================================================
function KirimKoinModal({ onClose, onCoinsTransferred, onOpenShop, onOpenHistory }: { onClose: () => void; onCoinsTransferred?: () => void; onOpenShop?: () => void; onOpenHistory?: () => void }) {
  const myUsername = localStorage.getItem('domino_username') || '';
  const [recipient, setRecipient] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userList, setUserList] = useState<any[]>([]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/profile/${myUsername}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch { /* ignore */ }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users/list?exclude=${myUsername}`);
      if (res.ok) {
        const data = await res.json();
        setUserList(data || []);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchProfile();
    fetchUsers();
  }, []);

  const handleSend = async () => {
    const amount = parseInt(amountInput, 10);
    if (!recipient.trim()) { setAlert('Masukkan ID atau username penerima!'); return; }
    if (isNaN(amount) || amount <= 0) { setAlert('Masukkan jumlah koin yang valid!'); return; }

    const usableForTransfer = Math.max(0, (profile?.coins || 0) - (profile?.bonusCoins || 0));
    if (amount > usableForTransfer) {
      if ((profile?.bonusCoins || 0) > 0 && amount <= (profile?.coins || 0)) {
        setAlert(`⚠️ Koin dari klaim bonus harian (${(profile?.bonusCoins || 0).toLocaleString('id-ID')} koin) hanya dapat dimainkan di SLOT dan tidak dapat ditransfer!`);
      } else {
        setAlert('⚠️ Saldo koin Anda tidak mencukupi untuk transfer!');
      }
      return;
    }

    setLoading(true);
    setAlert(null);
    try {
      const res = await fetch(`${API_URL}/users/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUsername: myUsername, toUsername: recipient.trim(), amount })
      });

      const data = await res.json();
      if (res.ok) {
        setAlert(`🎉 ${data.message}`);
        setAmountInput('');
        fetchProfile();
        onCoinsTransferred?.();
      } else {
        setAlert(`❌ ${data.error || 'Gagal mengirim koin'}`);
      }
    } catch {
      setAlert('Koneksi gagal, silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const totalCoins = profile?.coins || 0;
  const bonusCoins = profile?.bonusCoins || 0;
  const transferrableCoins = Math.max(0, totalCoins - bonusCoins);

  return (
    <div className="modal-overlay kirim-koin-overlay" onClick={onClose}>
      <div className="kirim-koin-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="kirim-koin-header">
          <div className="kirim-koin-header-title">
            <span className="kirim-koin-icon">🎁</span>
            <div>
              <div className="kirim-title">FITUR KIRIM KOIN</div>
              <div className="kirim-sub">Transfer koin ke teman atau sesama pemain</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onOpenHistory && (
              <button
                type="button"
                className="g-btn-press"
                style={{
                  background: 'linear-gradient(90deg, #f39c12, #e67e22)',
                  border: 'none',
                  borderRadius: '16px',
                  color: '#fff',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(243, 156, 18, 0.4)'
                }}
                onClick={onOpenHistory}
                title="Lihat Riwayat Transfer"
              >
                📜 Riwayat
              </button>
            )}
            <button className="kirim-koin-close-btn" onClick={onClose}>✖</button>
          </div>
        </div>

        {alert && (
          <div className={`kirim-koin-alert ${alert.includes('🎉') ? 'success' : 'error'}`} onClick={() => setAlert(null)}>
            {alert}
          </div>
        )}

        {/* Akses Terbuka Tanpa VIP Banner */}
        <div className="kirim-vip-banner vip-2">
          <div className="kirim-vip-badge-row">
            <span className="kirim-vip-badge-tag">
              🎉 AKSES TERBUKA UNTUK SEMUA PEMAIN
            </span>
            <span className="kirim-vip-status">Bebas Transfer Tanpa Syarat VIP</span>
          </div>
          <div className="kirim-vip-desc">
            🚀 Selama masa pra-rilis (sebelum rilis Play Store), fitur kirim koin dapat digunakan oleh semua pemain secara langsung!
            <br />
            💰 <b>Saldo yang Dapat Dikirim:</b> {transferrableCoins.toLocaleString('id-ID')} koin {bonusCoins > 0 ? `(${bonusCoins.toLocaleString('id-ID')} koin bonus harian khusus untuk bermain Slot)` : ''}
          </div>
        </div>

        {/* Input Form */}
        <div className="kirim-koin-form">
          <div className="kirim-field">
            <label>ID / Username Penerima:</label>
            <input
              type="text"
              placeholder="Masukkan ID (8 digit) atau Username penerima..."
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Quick select receiver */}
          {userList.length > 0 && (
            <div className="kirim-quick-list">
              <span className="quick-label">Pilihan pemain:</span>
              <div className="quick-chips">
                {userList.slice(0, 6).map(u => (
                  <button key={u.username} className={`quick-chip ${recipient === (u.userId || u.username) ? 'selected' : ''}`} onClick={() => setRecipient(u.userId || u.username)}>
                    {u.avatar || '👤'} {u.username} {u.userId ? `(ID: ${u.userId})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="kirim-field">
            <label>Jumlah Koin:</label>
            <input
              type="number"
              placeholder="Contoh: 50000"
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Preset buttons */}
          <div className="kirim-presets">
            {[10000, 25000, 50000, 100000, 500000].map(val => (
              <button
                key={val}
                className="kirim-preset-btn"
                onClick={() => setAmountInput(val.toString())}
                disabled={loading}
              >
                +{(val >= 1000 ? `${val / 1000}K` : val)}
              </button>
            ))}
          </div>

          {/* Submit button */}
          <button className="kirim-submit-btn" onClick={handleSend} disabled={loading}>
            {loading ? 'Mengirim...' : '🎁 KIRIM KOIN SEKARANG'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// TEMAN ONLINE MODAL
// =====================================================
type FriendEntry = {
  username: string;
  avatar?: string;
  coins?: number;
  vipLevel?: number;
  isOnline?: boolean;
};

function FriendModal({ onClose, onOpenKirimKoin, socket }: {
  onClose: () => void;
  onOpenKirimKoin?: (to?: string) => void;
  socket?: any;
}) {
  const myUsername = localStorage.getItem('domino_username') || '';
  const [tab, setTab] = useState<'teman' | 'request' | 'cari'>('teman');
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<FriendEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendEntry[]>([]);
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const showMsg = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 2500);
  };

  const loadProfile = async () => {
    if (!myUsername) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/profile/${myUsername}`);
      if (res.ok) {
        const data = await res.json();
        const friendUsernames: string[] = data.friends || [];
        const reqUsernames: string[] = data.friendRequests || [];

        // Load full profile of friends
        const fDetails = await Promise.all(
          friendUsernames.map(u =>
            fetch(`${API_URL}/profile/${u}`).then(r => r.ok ? r.json() : { username: u }).catch(() => ({ username: u }))
          )
        );
        setFriends(fDetails);

        // Load profiles of requesters
        const rDetails = await Promise.all(
          reqUsernames.map(u =>
            fetch(`${API_URL}/profile/${u}`).then(r => r.ok ? r.json() : { username: u }).catch(() => ({ username: u }))
          )
        );
        setRequests(rDetails);

        // Ask socket for online status
        if (socket) {
          socket.emit('get-online-friends', { friendUsernames });
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onOnlineFriends = ({ onlineFriends }: { onlineFriends: string[] }) => {
      setOnlineSet(new Set(onlineFriends));
    };
    const onOnlineUpdate = ({ onlineUsers }: { onlineUsers: string[] }) => {
      // Update online status for our friends
      setOnlineSet(() => {
        const newSet = new Set<string>();
        const currentFriendNames = friends.map(f => f.username);
        onlineUsers.forEach(u => { if (currentFriendNames.includes(u)) newSet.add(u); });
        return newSet;
      });
    };
    socket.on('online-friends-result', onOnlineFriends);
    socket.on('online-users-update', onOnlineUpdate);
    return () => {
      socket.off('online-friends-result', onOnlineFriends);
      socket.off('online-users-update', onOnlineUpdate);
    };
  }, [socket, friends]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${API_URL}/users?exclude=${myUsername}`);
      if (res.ok) {
        const all: FriendEntry[] = await res.json();
        const q = searchQuery.toLowerCase();
        const filtered = all.filter(u => u.username.toLowerCase().includes(q));
        setSearchResults(filtered);
      }
    } catch { /* ignore */ }
    finally { setSearching(false); }
  };

  const handleAddFriend = async (target: string) => {
    try {
      const res = await fetch(`${API_URL}/friends/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, friendUsername: target })
      });
      const data = await res.json();
      showMsg(data.message || data.error || 'Permintaan terkirim!');
    } catch { showMsg('Gagal mengirim permintaan.'); }
  };

  const handleAccept = async (requester: string) => {
    try {
      const res = await fetch(`${API_URL}/friends/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, requesterUsername: requester })
      });
      const data = await res.json();
      showMsg(data.message || 'Pertemanan diterima!');
      loadProfile();
    } catch { showMsg('Gagal menerima pertemanan.'); }
  };

  const handleDecline = async (requester: string) => {
    try {
      await fetch(`${API_URL}/friends/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, requesterUsername: requester })
      });
      showMsg('Permintaan ditolak.');
      loadProfile();
    } catch { showMsg('Gagal menolak.'); }
  };

  const handleRemoveFriend = async (target: string) => {
    if (!confirm(`Hapus ${target} dari daftar teman?`)) return;
    try {
      await fetch(`${API_URL}/friends/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, friendUsername: target })
      });
      showMsg(`${target} dihapus dari daftar teman.`);
      loadProfile();
    } catch { showMsg('Gagal menghapus teman.'); }
  };

  const onlineFriends = friends.filter(f => onlineSet.has(f.username));
  const offlineFriends = friends.filter(f => !onlineSet.has(f.username));

  const fmtCoins = (n?: number) => {
    if (!n) return '0';
    if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'B';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const FriendCard = ({ f, showRemove = false }: { f: FriendEntry; showRemove?: boolean }) => (
    <div className="fm-friend-card" style={{ background: onlineSet.has(f.username) ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)' }}>
      <div className="fm-friend-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '28px', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {renderPlayerAvatar(f.avatar, '🐸', 'fm-avatar-pic')}
        </span>
        <div className={`fm-online-dot ${onlineSet.has(f.username) ? 'online' : 'offline'}`} />
      </div>
      <div className="fm-friend-info">
        <div className="fm-friend-name">{f.username}</div>
        <div className="fm-friend-meta">
          🪙 {fmtCoins(f.coins)} · {f.vipLevel ? `VIP ${f.vipLevel}` : 'Non-VIP'}
          {onlineSet.has(f.username) && <span className="fm-online-badge">● Online</span>}
        </div>
      </div>
      <div className="fm-friend-actions">
        {onOpenKirimKoin && (
          <button className="fm-btn fm-btn-gift" title="Kirim Koin" onClick={() => { onClose(); onOpenKirimKoin?.(f.username); }}>🎁</button>
        )}
        {showRemove && (
          <button className="fm-btn fm-btn-remove" title="Hapus Teman" onClick={() => handleRemoveFriend(f.username)}>✕</button>
        )}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" style={{ zIndex: 9000 }}>
      <div className="fm-modal">
        {/* Header */}
        <div className="fm-header">
          <div className="fm-header-left">
            <span className="fm-header-icon">👥</span>
            <div>
              <div className="fm-header-title">TEMAN ONLINE</div>
              <div className="fm-header-sub">{onlineFriends.length} online · {friends.length} teman total</div>
            </div>
          </div>
          <button className="fm-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Toast */}
        {actionMsg && (
          <div className="fm-toast">{actionMsg}</div>
        )}

        {/* Tabs */}
        <div className="fm-tabs">
          <button className={`fm-tab ${tab === 'teman' ? 'active' : ''}`} onClick={() => setTab('teman')}>
            👫 Teman {friends.length > 0 && <span className="fm-tab-badge">{friends.length}</span>}
          </button>
          <button className={`fm-tab ${tab === 'request' ? 'active' : ''}`} onClick={() => setTab('request')}>
            🔔 Permintaan {requests.length > 0 && <span className="fm-tab-badge fm-badge-red">{requests.length}</span>}
          </button>
          <button className={`fm-tab ${tab === 'cari' ? 'active' : ''}`} onClick={() => setTab('cari')}>
            🔍 Cari Pemain
          </button>
        </div>

        {/* Content */}
        <div className="fm-content">
          {loading ? (
            <div className="fm-loading">
              <div className="fm-spinner" />
              <div>Memuat data teman...</div>
            </div>
          ) : (
            <>
              {/* ---- TAB TEMAN ---- */}
              {tab === 'teman' && (
                <div>
                  {friends.length === 0 ? (
                    <div className="fm-empty">
                      <div style={{ fontSize: '50px' }}>👤</div>
                      <div>Belum ada teman. Cari pemain di tab "Cari Pemain"!</div>
                    </div>
                  ) : (
                    <>
                      {onlineFriends.length > 0 && (
                        <>
                          <div className="fm-section-label">🟢 Online Sekarang ({onlineFriends.length})</div>
                          {onlineFriends.map(f => <FriendCard key={f.username} f={f} showRemove />)}
                        </>
                      )}
                      {offlineFriends.length > 0 && (
                        <>
                          <div className="fm-section-label" style={{ color: '#888' }}>⚫ Offline ({offlineFriends.length})</div>
                          {offlineFriends.map(f => <FriendCard key={f.username} f={f} showRemove />)}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ---- TAB REQUEST ---- */}
              {tab === 'request' && (
                <div>
                  {requests.length === 0 ? (
                    <div className="fm-empty">
                      <div style={{ fontSize: '50px' }}>🔔</div>
                      <div>Tidak ada permintaan pertemanan baru.</div>
                    </div>
                  ) : (
                    requests.map(r => (
                      <div key={r.username} className="fm-friend-card">
                        <div className="fm-friend-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '28px', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {renderPlayerAvatar(r.avatar, '🐸', 'fm-avatar-pic')}
                          </span>
                          <div className="fm-online-dot offline" />
                        </div>
                        <div className="fm-friend-info">
                          <div className="fm-friend-name">{r.username}</div>
                          <div className="fm-friend-meta">🪙 {fmtCoins(r.coins)}</div>
                        </div>
                        <div className="fm-friend-actions">
                          <button className="fm-btn fm-btn-accept" onClick={() => handleAccept(r.username)}>✓ Terima</button>
                          <button className="fm-btn fm-btn-remove" onClick={() => handleDecline(r.username)}>✕</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ---- TAB CARI ---- */}
              {tab === 'cari' && (
                <div>
                  <div className="fm-search-bar">
                    <input
                      type="text"
                      className="fm-search-input"
                      placeholder="Cari username pemain..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="fm-btn fm-btn-search" onClick={handleSearch} disabled={searching}>
                      {searching ? '...' : '🔍 Cari'}
                    </button>
                  </div>
                  {searchResults.length === 0 && searchQuery && !searching && (
                    <div className="fm-empty">
                      <div>Tidak ada pemain dengan username "{searchQuery}" ditemukan.</div>
                    </div>
                  )}
                  {searchResults.map(r => {
                    const isFriend = friends.some(f => f.username === r.username);
                    return (
                      <div key={r.username} className="fm-friend-card">
                        <div className="fm-friend-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '28px', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {renderPlayerAvatar(r.avatar, '🐸', 'fm-avatar-pic')}
                          </span>
                          <div className={`fm-online-dot ${onlineSet.has(r.username) ? 'online' : 'offline'}`} />
                        </div>
                        <div className="fm-friend-info">
                          <div className="fm-friend-name">{r.username}</div>
                          <div className="fm-friend-meta">
                            🪙 {fmtCoins(r.coins)} · {r.vipLevel ? `VIP ${r.vipLevel}` : 'Non-VIP'}
                            {onlineSet.has(r.username) && <span className="fm-online-badge">● Online</span>}
                          </div>
                        </div>
                        <div className="fm-friend-actions">
                          {isFriend ? (
                            <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: 'bold' }}>✓ Teman</span>
                          ) : (
                            <button className="fm-btn fm-btn-add" onClick={() => handleAddFriend(r.username)}>+ Tambah</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// =====================================================

function DailyBonusModal({ onClose, onBonusClaimed }: { onClose: () => void; onBonusClaimed?: (newCoins: number) => void }) {
  const myUsername = localStorage.getItem('domino_username') || '';
  const [loading, setLoading] = useState(true);
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [lastClaim, setLastClaim] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/bonus/status/${myUsername}`);
      if (res.ok) {
        const data = await res.json();
        setCanClaim(data.canClaim);
        setLastClaim(data.lastDailyBonus || null);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleClaim = async () => {
    if (!canClaim || claiming) return;
    setClaiming(true);
    try {
      const res = await fetch(`${API_URL}/bonus/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername })
      });
      if (res.ok) {
        const data = await res.json();
        setCanClaim(false);
        setClaimed(true);
        setAlert('🎉 Berhasil! +5.000 Bonus Koin Slot diklaim!');
        if (data.bonusCoins !== undefined) {
          localStorage.setItem('domino_bonus_coins', data.bonusCoins.toString());
        }
        if (data.coins !== undefined) {
          localStorage.setItem('domino_coins', data.coins.toString());
        }
        window.dispatchEvent(new Event('domino_coins_updated'));
        if (onBonusClaimed && data.coins !== undefined) onBonusClaimed(data.coins);
      } else {
        const err = await res.json();
        setAlert(err.error || 'Gagal mengklaim bonus harian');
      }
    } catch { setAlert('Koneksi gagal, silakan coba lagi.'); }
    finally { setClaiming(false); }
  };

  // Hitung sisa waktu sampai besok
  const getNextClaimCountdown = () => {
    if (!lastClaim) return null;
    const last = new Date(lastClaim);
    const tomorrow = new Date(last);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const now = new Date();
    const diffMs = tomorrow.getTime() - now.getTime();
    if (diffMs <= 0) return null;
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    return `${h}j ${m}m`;
  };

  const countdown = getNextClaimCountdown();

  return (
    <div className="modal-overlay daily-bonus-overlay" onClick={onClose}>
      <div className="daily-bonus-box daily-bonus-simple" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="daily-bonus-header">
          <div className="daily-bonus-header-left">
            <span className="daily-bonus-icon">🎁</span>
            <div>
              <div className="daily-bonus-title">BONUS HARIAN (SLOT)</div>
              <div className="daily-bonus-sub">Klaim saldo gratis khusus game Slot!</div>
            </div>
          </div>
          <button className="daily-bonus-close-btn" onClick={onClose}>✖</button>
        </div>

        {alert && (
          <div className={`daily-bonus-alert ${claimed ? 'success' : ''}`} onClick={() => setAlert(null)}>
            {alert}
          </div>
        )}

        {loading ? (
          <div className="daily-bonus-loading">
            <div className="inbox-spinner" />
            <span>Memuat...</span>
          </div>
        ) : (
          <div className="db-simple-body">
            {/* Reward card */}
            <div className={`db-reward-card ${claimed ? 'claimed' : canClaim ? 'available' : 'used'}`}>
              <div className="db-reward-icon">{claimed ? '✅' : canClaim ? '🎰' : '⏰'}</div>
              <div className="db-reward-amount">+5.000 Koin Slot</div>
              <div className="db-reward-label">
                {claimed ? 'Sudah Diklaim Hari Ini!' : canClaim ? 'Tersedia Sekarang!' : 'Sudah Diklaim'}
              </div>
              {!canClaim && !claimed && countdown && (
                <div className="db-countdown">Tersedia lagi dalam <b>{countdown}</b></div>
              )}
            </div>

            {/* Claim Button */}
            <button
              className={`daily-bonus-claim-btn ${!canClaim ? 'disabled' : ''}`}
              onClick={handleClaim}
              disabled={!canClaim || claiming}
            >
              {claiming ? 'Mengklaim...' : canClaim ? '🎰 KLAIM 5.000 KOIN SLOT' : '✓ SUDAH DIKLAIM — KEMBALI BESOK'}
            </button>

            <div className="db-note" style={{ color: '#ffd700', fontWeight: 600, fontSize: '1.4vh', lineHeight: 1.4 }}>
              🎰 <b>KHUSUS GAME SLOT</b>: Bonus koin harian hanya dapat digunakan untuk memutar di semua game Slot (tidak bisa dikirim/transfer ke pemain lain dan tidak bisa dipakai di Domino, QQ, atau Billiard).<br/>
              ✨ <b>Kemenangan dari Slot</b> otomatis menjadi Koin Emas Universal yang bisa dipakai di SEMUA game dan bisa dikirim ke pemain lain!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// TOKO (SHOP) MODAL
// =====================================================
interface CoinPkg { id: string; name: string; coins: number; priceRp: string; tag: string; icon: string; }
interface AvatarItem { id: string; emoji: string; name: string; priceCoins: number; priceRp: number; tag: string; }
interface VipPkg { id: string; level: number; name: string; priceRp: string; coinsBonus: number; desc: string; }

function TokoModal({ onClose, onProfileUpdated, onOpenKirimKoin }: { onClose: () => void; onProfileUpdated?: () => void; onOpenKirimKoin?: () => void }) {
  const myUsername = localStorage.getItem('domino_username') || '';
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'koin' | 'vip' | 'avatar' | 'tukar'>('koin');
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<{ coinPackages: CoinPkg[]; avatarItems: AvatarItem[]; vipPackages: VipPkg[] } | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [rpInput, setRpInput] = useState('10');

  const fetchShopData = async () => {
    setLoading(true);
    try {
      const [catRes, profRes] = await Promise.all([
        fetch(`${API_URL}/shop/catalog`),
        fetch(`${API_URL}/profile/${myUsername}`)
      ]);
      if (catRes.ok) {
        const catData = await catRes.json();
        setCatalog(catData);
      }
      if (profRes.ok) {
        const profData = await profRes.json();
        setProfile(profData);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShopData(); }, []);

  const handleBuyCoins = async (pkg: CoinPkg) => {
    setBuyingId(pkg.id);

    // Cek jika berjalan di web browser (bukan Android native APK)
    if (!Capacitor.isNativePlatform()) {
      setAlert('⚠️ Pembelian koin via Google Play Store hanya dapat diproses melalui aplikasi Android (APK) di HP.');
      setBuyingId(null);
      return;
    }

    setAlert('🔄 Menghubungkan ke Google Play Store...');

    try {
      // 1. Munculkan sheet pembayaran resmi Google Play Store di Android
      const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: pkg.id,
        productType: PURCHASE_TYPE.INAPP,
        isConsumable: true
      });

      // Validasi bahwa transaksi mengembalikan token atau ID
      const orderId = transaction.orderId || transaction.transactionId;
      const purchaseToken = transaction.purchaseToken;

      if (!orderId && !purchaseToken) {
        throw new Error('Data transaksi dari Google Play tidak lengkap.');
      }

      setAlert('🔄 Memverifikasi bukti pembayaran Google Play...');

      // 2. Kirim bukti pembelian ke server untuk diverifikasi dan ditambahkan koinnya
      const res = await fetch(`${API_URL}/shop/verify-playstore-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: myUsername,
          packageId: pkg.id,
          itemType: 'coin',
          paymentMethod: 'Google Play Store',
          orderId: orderId || `GPA.${Date.now()}`,
          purchaseToken
        })
      });

      if (res.ok) {
        // 3. Konsumsi item di Google Play agar koin bisa dibeli lagi di kemudian hari
        if (purchaseToken) {
          try {
            await NativePurchases.consumePurchase({ purchaseToken });
          } catch (cErr) {
            console.warn('Google Play consume warning:', cErr);
          }
        }

        const data = await res.json();
        setProfile((prev: any) => prev ? { ...prev, coins: data.coins } : prev);
        setAlert(`🎉 Pembayaran Google Play Berhasil! (+${pkg.coins.toLocaleString('id-ID')} Koin)`);

        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
            osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
            osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.56);
          }
        } catch {}

        onProfileUpdated?.();
      } else {
        const err = await res.json();
        setAlert(err.error || 'Gagal memverifikasi pembayaran dengan server');
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        msg.toLowerCase().includes('cancel') ||
        msg.toLowerCase().includes('batal') ||
        msg.toLowerCase().includes('user_canceled') ||
        err?.code === '1'
      ) {
        setAlert('❌ Pembelian dibatalkan oleh pengguna.');
      } else {
        setAlert(`❌ Google Play: ${msg || 'Pembayaran dibatalkan atau gagal'}`);
      }
    } finally {
      setBuyingId(null);
    }
  };

  const handleBuyAvatar = async (item: AvatarItem) => {
    setBuyingId(item.id);
    try {
      const res = await fetch(`${API_URL}/shop/buy-avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, avatarId: item.id })
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev: any) => prev ? { ...prev, coins: data.coins, avatar: data.avatar, unlockedAvatars: data.unlockedAvatars } : prev);
        localStorage.setItem('domino_avatar', data.avatar);
        setAlert(`🎨 ${data.message}`);
        onProfileUpdated?.();
      } else {
        const err = await res.json(); setAlert(err.error || 'Gagal membeli avatar');
      }
    } catch { setAlert('Koneksi gagal'); }
    setBuyingId(null);
  };

  const handleBuyVip = async (vip: VipPkg) => {
    setBuyingId(vip.id);

    // Cek jika berjalan di web browser (bukan Android native APK)
    if (!Capacitor.isNativePlatform()) {
      setAlert('⚠️ Upgrade VIP via Google Play Store hanya dapat diproses melalui aplikasi Android (APK) di HP.');
      setBuyingId(null);
      return;
    }

    setAlert('🔄 Menghubungkan ke Google Play Store...');

    try {
      // 1. Panggil billing sheet Google Play
      const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: vip.id,
        productType: PURCHASE_TYPE.INAPP,
        isConsumable: true
      });

      const orderId = transaction.orderId || transaction.transactionId;
      const purchaseToken = transaction.purchaseToken;

      if (!orderId && !purchaseToken) {
        throw new Error('Data transaksi dari Google Play tidak lengkap.');
      }

      setAlert('🔄 Memverifikasi upgrade VIP dengan Google Play...');

      // 2. Verifikasi di server
      const res = await fetch(`${API_URL}/shop/verify-playstore-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: myUsername,
          packageId: vip.id,
          itemType: 'vip',
          paymentMethod: 'Google Play Store',
          orderId: orderId || `GPA.${Date.now()}`,
          purchaseToken
        })
      });

      if (res.ok) {
        if (purchaseToken) {
          try {
            await NativePurchases.consumePurchase({ purchaseToken });
          } catch {}
        }

        const data = await res.json();
        setProfile((prev: any) => prev ? { ...prev, coins: data.coins, vipLevel: data.vipLevel } : prev);
        setAlert(`👑 Selamat! Anda berhasil upgrade ke ${vip.name}!`);
        onProfileUpdated?.();
      } else {
        const err = await res.json();
        setAlert(err.error || 'Gagal memproses upgrade VIP');
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        msg.toLowerCase().includes('cancel') ||
        msg.toLowerCase().includes('batal') ||
        msg.toLowerCase().includes('user_canceled') ||
        err?.code === '1'
      ) {
        setAlert('❌ Upgrade VIP dibatalkan oleh pengguna.');
      } else {
        setAlert(`❌ Google Play: ${msg || 'Gagal memproses upgrade VIP'}`);
      }
    } finally {
      setBuyingId(null);
    }
  };

  const handleConvertRp = async () => {
    const val = parseInt(rpInput, 10);
    if (isNaN(val) || val < 10) { setAlert('Minimal penukaran 10 RP'); return; }
    setBuyingId('convert');
    try {
      const res = await fetch(`${API_URL}/shop/convert-rp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, rpAmount: val })
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev: any) => prev ? { ...prev, coins: data.coins, rp: data.rp } : prev);
        setAlert(`🔄 ${data.message}`);
        onProfileUpdated?.();
      } else {
        const err = await res.json(); setAlert(err.error || 'Gagal menukar RP');
      }
    } catch { setAlert('Koneksi gagal'); }
    setBuyingId(null);
  };

  const fmt = (n: number) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(0) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toString();
  };

  return (
    <div className="modal-overlay toko-overlay" onClick={onClose}>
      <div className="toko-box" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="toko-header">
          <div className="toko-header-left">
            <span className="toko-header-icon">🛒</span>
            <div>
              <div className="toko-header-title">TOKO</div>
              <div className="toko-header-sub">Beli koin emas, avatar sultan, & keuntungan VIP!</div>
            </div>
          </div>
          <div className="toko-header-right">
            <div className="toko-balance-pill coins">
              <span>🪙</span>
              <b>{fmt(profile?.coins || 0)}</b>
            </div>
            <div className="toko-balance-pill rp">
              <span>Rp</span>
              <b>{profile?.rp || 0}</b>
            </div>
            <button className="toko-close-btn" onClick={onClose}>✖</button>
          </div>
        </div>

        {alert && (
          <div className="toko-alert" onClick={() => setAlert(null)}>
            {alert}
          </div>
        )}

        {/* Tabs */}
        <div className="toko-tabs">
          <button className={`toko-tab ${activeTab === 'koin' ? 'active' : ''}`} onClick={() => setActiveTab('koin')}>
            🪙 Beli Koin
          </button>
          <button className={`toko-tab ${activeTab === 'vip' ? 'active' : ''}`} onClick={() => setActiveTab('vip')}>
            👑 Hak VIP
          </button>
          <button className={`toko-tab ${activeTab === 'avatar' ? 'active' : ''}`} onClick={() => setActiveTab('avatar')}>
            🎨 Avatar & Frame
          </button>
          <button className={`toko-tab ${activeTab === 'tukar' ? 'active' : ''}`} onClick={() => setActiveTab('tukar')}>
            🔄 Tukar RP
          </button>
        </div>

        {/* Content */}
        <div className="toko-body">
          {loading ? (
            <div className="toko-loading">
              <div className="inbox-spinner" />
              <span>Memuat katalog toko...</span>
            </div>
          ) : activeTab === 'koin' ? (
            <div className="toko-grid">
              {catalog?.coinPackages.map(pkg => (
                <div key={pkg.id} className="toko-card coin-card">
                  {pkg.tag && <div className="toko-card-tag">{pkg.tag}</div>}
                  <div className="toko-card-icon">{pkg.icon}</div>
                  <div className="toko-card-name">{pkg.name}</div>
                  <div className="toko-card-price">{pkg.priceRp}</div>
                  <button
                    className="toko-buy-btn"
                    onClick={() => handleBuyCoins(pkg)}
                    disabled={buyingId === pkg.id}
                  >
                    {buyingId === pkg.id ? 'Memproses...' : 'BELI'}
                  </button>
                </div>
              ))}
            </div>
          ) : activeTab === 'vip' ? (
            <div className="toko-vip-container">
              {/* VIP Perks Summary Banner */}
              <div className="toko-vip-banner-card">
                <div className="vip-banner-header">
                  <span className="vip-crown-icon">👑</span>
                  <div>
                    <div className="vip-banner-title">KEUNTUNGAN KIRIM KOIN VIP</div>
                    <div className="vip-banner-sub">Status Akun Anda: <b>VIP {profile?.vipLevel || 0}</b></div>
                  </div>
                </div>
                <div className="vip-perks-row">
                  <div className={`vip-perk-box ${(profile?.vipLevel || 0) === 0 ? 'active' : ''}`}>
                    <div className="vpb-title">VIP 0 (Non-VIP)</div>
                    <div className="vpb-limit red">❌ Kirim Koin Dikunci</div>
                    <div className="vpb-desc">Beli paket VIP di bawah untuk membuka fitur kirim koin.</div>
                  </div>
                  <div className={`vip-perk-box ${(profile?.vipLevel || 0) === 1 ? 'active' : ''}`}>
                    <div className="vpb-title">⭐️ VIP 1 (Bronze)</div>
                    <div className="vpb-limit gold">🎁 Kirim s/d 100K/Hari</div>
                    <div className="vpb-desc">Bisa kirim hingga 100.000 koin per hari.</div>
                  </div>
                  <div className={`vip-perk-box ${(profile?.vipLevel || 0) >= 2 ? 'active' : ''}`}>
                    <div className="vpb-title">🚀 VIP 2+ (Sultan)</div>
                    <div className="vpb-limit green">🔥 TANPA BATASAN</div>
                    <div className="vpb-desc">Kirim koin UNLIMITED setiap hari!</div>
                  </div>
                </div>
                {(profile?.vipLevel || 0) > 0 && (
                  <button className="toko-kirim-action-btn" onClick={() => { onClose(); onOpenKirimKoin?.(); }}>
                    🎁 BUKA FITUR KIRIM KOIN SEKARANG
                  </button>
                )}
              </div>

              <div className="toko-vip-list">
                {catalog?.vipPackages.map(vip => {
                  const isOwned = (profile?.vipLevel || 0) >= vip.level;
                  return (
                    <div key={vip.id} className={`toko-vip-card ${isOwned ? 'owned' : ''}`}>
                      <div className="vip-card-badge">{vip.name}</div>
                      <div className="vip-card-coins">+{fmt(vip.coinsBonus)} Koin Bonus</div>
                      <div className="vip-card-desc">{vip.desc}</div>
                      <div className="vip-card-footer">
                        <div className="vip-card-price">{vip.priceRp}</div>
                        <button
                          className="toko-buy-btn vip-btn"
                          onClick={() => handleBuyVip(vip)}
                          disabled={buyingId === vip.id || isOwned}
                        >
                          {isOwned ? '✓ AKTIF' : buyingId === vip.id ? 'Memproses...' : 'BELI'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'avatar' ? (
            <div className="toko-grid">
              {catalog?.avatarItems.map(item => {
                const isUnlocked = profile?.unlockedAvatars?.includes(item.emoji);
                const isEquipped = profile?.avatar === item.emoji;

                return (
                  <div key={item.id} className={`toko-card avatar-card ${isEquipped ? 'equipped' : ''}`}>
                    {item.tag && <div className="toko-card-tag">{item.tag}</div>}
                    <div className="toko-avatar-preview">{item.emoji}</div>
                    <div className="toko-card-name">{item.name}</div>
                    <div className="toko-card-price">
                      {isUnlocked ? 'Sudah Dimiliki' : `🪙 ${item.priceCoins.toLocaleString('id-ID')}`}
                    </div>
                    <button
                      className={`toko-buy-btn ${isEquipped ? 'equipped-btn' : isUnlocked ? 'equip-btn' : ''}`}
                      onClick={() => handleBuyAvatar(item)}
                      disabled={buyingId === item.id || isEquipped}
                    >
                      {isEquipped ? '✓ TERPASANG' : isUnlocked ? '🎨 PASANG' : buyingId === item.id ? '...' : '🪙 BELI AVATAR'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TAB TUKAR RP */
            <div className="toko-rp-converter">
              <div className="rp-conv-icon">🔄</div>
              <div className="rp-conv-title">PENUKARAN RP KE KOIN</div>
              <div className="rp-conv-sub">Setiap <b>10 RP</b> bisa ditukarkan menjadi <b>50.000 Koin</b>!</div>

              <div className="rp-conv-balance">RP Anda: <b>{profile?.rp || 0} RP</b></div>

              <div className="rp-conv-presets">
                {[10, 50, 100, 500].map(v => (
                  <button
                    key={v}
                    className={`rp-preset-btn ${rpInput === String(v) ? 'sel' : ''}`}
                    onClick={() => setRpInput(String(v))}
                  >
                    {v} RP
                  </button>
                ))}
              </div>

              <div className="rp-conv-preview">
                Dapat: 🪙 <b>{fmt((parseInt(rpInput, 10) || 0) * 5000)} Koin</b>
              </div>

              <button
                className="toko-buy-btn convert-btn"
                onClick={handleConvertRp}
                disabled={buyingId === 'convert' || (profile?.rp || 0) < 10}
              >
                {buyingId === 'convert' ? 'Menukarkan...' : '🔄 TUKARKAN RP SEKARANG'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// =====================================================
// GARDU SCREEN
// =====================================================
function GarduScreen({ onBack, onViewProfile }: { onBack: () => void; onViewProfile: (username: string) => void }) {
  const [temanModalState, setTemanModalState] = useState<{ isOpen: boolean, tab: string }>({ isOpen: false, tab: 'Teman' });

  return (
    <div className="screen-wrapper gardu-bg">
      {/* Top Header */}
      <div className="g-header">
        <div className="g-header-left">
          <button className="g-back-btn g-btn-anim" onClick={onBack}>
            <span className="g-back-icon">«</span>
          </button>
          <span className="g-title">Gardu</span>
        </div>

        <div className="g-center-hgi">
          <div className="g-hgi-badge">HGI</div>
        </div>
      </div>

      {/* Main Cards Area */}
      <div className="g-cards-container">
        {/* Card 1: Gardu */}
        <button className="g-card g-card-side g-anim-slideup" style={{ animationDelay: '0.1s' }}>
          <div className="g-card-inner">
            <div className="g-card-bg" style={{ background: 'linear-gradient(135deg, #d2b4de, #8e44ad)' }}>
              <span className="g-card-emoji" style={{ transform: 'scale(1.2) translateY(1vh)' }}>🐸</span>
            </div>
            <div className="g-card-title">Gardu</div>
          </div>
        </button>

        {/* Card 2: Buat Kamar (Center, slightly larger) */}
        <button className="g-card g-card-center g-anim-slideup" style={{ animationDelay: '0.2s' }}>
          <div className="g-card-inner">
            <div className="g-card-bg" style={{ background: 'linear-gradient(135deg, #f5b7b1, #e74c3c)' }}>
              <span className="g-card-emoji" style={{ transform: 'scale(1.4) translateY(2vh)' }}>🧍‍♀️</span>
            </div>
            <div className="g-card-title">Buat Kamar</div>
          </div>
        </button>

        {/* Card 3: Join Kamar */}
        <button className="g-card g-card-side g-anim-slideup" style={{ animationDelay: '0.3s' }}>
          <div className="g-card-inner">
            <div className="g-card-bg" style={{ background: 'linear-gradient(135deg, #a9cce3, #2980b9)' }}>
              <span className="g-card-emoji" style={{ transform: 'scale(1.2) translateY(1vh)' }}>🧍‍♂️</span>
              <div className="g-join-tag">JOIN</div>
            </div>
            <div className="g-card-title">Join Kamar</div>
          </div>
        </button>
      </div>

      {/* Bottom Buttons */}
      <div className="g-bottom-bar">
        <button className="g-btn-small g-btn-press g-anim-slideup" style={{ animationDelay: '0.4s' }} onClick={() => setTemanModalState({ isOpen: true, tab: 'History' })}>
          <span className="g-btn-icon" style={{ color: '#f1c40f' }}>📋</span> History
        </button>
        <button className="g-btn-small g-btn-press g-anim-slideup" style={{ animationDelay: '0.5s' }} onClick={() => setTemanModalState({ isOpen: true, tab: 'Teman' })}>
          <span className="g-btn-icon" style={{ color: '#f39c12' }}>👥</span> Teman
        </button>
      </div>

      {/* Modals */}
      {temanModalState.isOpen && (
        <TemanModal
          defaultTab={temanModalState.tab}
          onViewProfile={onViewProfile}
          onClose={() => setTemanModalState({ isOpen: false, tab: 'Teman' })}
        />
      )}
    </div>
  );
}

// =====================================================
// OVERLAY ANIMASI LOGIN VIP KEREN (VIP Login Animation)
// =====================================================
function VIPLoginAnimationOverlay({ username, onComplete }: { username: string; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="login-anim-overlay" onClick={onComplete}>
      <div className="login-anim-rays" />

      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="login-anim-coin"
          style={{
            animationDelay: `${(i * 0.12).toFixed(2)}s`,
            left: `${15 + ((i * 7) % 70)}vw`,
            top: `${20 + ((i * 11) % 50)}vh`
          }}
        >
          🪙
        </div>
      ))}

      <div className="login-anim-card">
        <div className="login-anim-crown">👑</div>
        <div className="login-anim-vip-pill">✨ VIP PLAYER ENTRY ✨</div>
        <div className="login-anim-welcome">SELAMAT DATANG VIP MEMBER</div>
        <div className="login-anim-username">{username.toUpperCase()}</div>
        <div className="login-anim-sub">SELAMAT BERMAIN & SEMOGA BERUNTUNG! 🌟</div>
        <div className="login-anim-shimmer-bar" />
      </div>
    </div>
  );
}

// =====================================================
// KOMPONEN PROFILE MODAL (VIP EXECUTIVE CASINO THEME)
// =====================================================
function ProfileModal({ profile, avatarEmoji, onOpenAvatarSelection, onOpenChangeName, onClose }: { profile: any; avatarEmoji: string; onOpenAvatarSelection: () => void; onOpenChangeName?: () => void; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('informasi');
  const [isProfileOpen, setIsProfileOpen] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  const [selectedFrame, setSelectedFrame] = useState(() => localStorage.getItem('domino_custom_frame') || 'crown');
  const [selectedTable, setSelectedTable] = useState(() => localStorage.getItem('domino_custom_table') || 'green');
  const [equippedBadge, setEquippedBadge] = useState(() => localStorage.getItem('domino_equipped_badge') || 'domi_master');

  useEffect(() => {
    const handleAvatarUpdate = (e: any) => {
      if (e?.detail?.frame) {
        setSelectedFrame(e.detail.frame);
      }
    };
    window.addEventListener('domino_avatar_updated', handleAvatarUpdate);
    return () => window.removeEventListener('domino_avatar_updated', handleAvatarUpdate);
  }, []);

  const handleEquipFrame = (id: string) => {
    setSelectedFrame(id);
    localStorage.setItem('domino_custom_frame', id);
    window.dispatchEvent(new CustomEvent('domino_avatar_updated', { detail: { frame: id } }));
  };

  const handleEquipTable = (id: string) => {
    setSelectedTable(id);
    localStorage.setItem('domino_custom_table', id);
  };

  const handleEquipBadge = (id: string) => {
    setEquippedBadge(id);
    localStorage.setItem('domino_equipped_badge', id);
  };

  const handleCopyUserId = () => {
    const uid = profile?.userId || profile?.id || localStorage.getItem('domino_user_id') || '';
    if (uid && navigator.clipboard) {
      navigator.clipboard.writeText(uid);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const frames = [
    { id: 'crown', name: 'Mahkota VIP', icon: '👑', color: '#ffd700' },
    { id: 'fire', name: 'Api Inferno', icon: '🔥', color: '#ff4500' },
    { id: 'diamond', name: 'Kristal Neon', icon: '💎', color: '#00f2fe' },
    { id: 'lightning', name: 'Petir Quantum', icon: '⚡', color: '#ffe600' },
    { id: 'dragon', name: 'Aura Naga Emas', icon: '🐉', color: '#f39c12' },
  ];

  const tables = [
    { id: 'green', name: 'Kasino Hijau', icon: '🟢' },
    { id: 'red', name: 'Velvet Merah', icon: '🔴' },
    { id: 'blue', name: 'Cyber Biru', icon: '🔵' },
    { id: 'purple', name: 'Galaxy VIP', icon: '🟣' },
  ];

  const badgesList = [
    { id: 'domi_master', name: '🥇 Domi Master', desc: 'Menangkan 100 ronde Domino Kasino', unlocked: true },
    { id: 'win_streak', name: '🔥 Win Streak King', desc: 'Capai 5x Win Streak berturut-turut', unlocked: true },
    { id: 'millionaire', name: '💰 Jutawan Koin', desc: 'Miliki saldo koin di atas 10.000.000', unlocked: true },
    { id: 'wild_legend', name: '🃏 Wild Legend', desc: 'Menangkan pertarungan di Kamar Wild', unlocked: true },
    { id: 'partner_hero', name: '🤝 Partner Sejati', desc: 'Menangkan 20x match Domino Partner (14/20)', unlocked: false },
    { id: 'slot_hunter', name: '🎰 Jackpot Hunter', desc: 'Dapatkan Mega Jackpot Slot (1/3)', unlocked: false },
  ];

  const formatCoins = (n: number) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const [claimedPrestasi, setClaimedPrestasi] = useState<{ [key: string]: boolean }>(() => {
    const obj: any = {};
    ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].forEach(id => {
      obj[id] = localStorage.getItem(`prestasi_claimed_${id}`) === 'true';
    });
    return obj;
  });

  const [claimToast, setClaimToast] = useState<{ title: string; amount: number } | null>(null);

  const handleClaimPrestasi = (id: string, rewardCoins: number, titleStr: string) => {
    if (claimedPrestasi[id]) return;
    localStorage.setItem(`prestasi_claimed_${id}`, 'true');
    setClaimedPrestasi(prev => ({ ...prev, [id]: true }));

    const username = localStorage.getItem('domino_username');
    if (username) {
      fetch(`${API_URL}/bonus/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, amount: rewardCoins })
      }).catch(() => { });
    }

    setClaimToast({ title: titleStr, amount: rewardCoins });
    setTimeout(() => {
      setClaimToast(null);
    }, 3200);
  };

  const baseScore = profile?.score || 50;
  const stats = {
    ronde: baseScore * 5 + 12,
    menang: baseScore * 2 + 3,
    winStreak: (baseScore % 7) + 1,
    radar: { domino: 0.85, poker: 0.4, santai: 0.9, slot: 0.6, ludo: 0.75 }
  };
  const winRate = ((stats.menang / stats.ronde) * 100).toFixed(2);

  const prestasiList = [
    {
      id: 'p1',
      title: '🏆 Penguasa Meja',
      desc: 'Menangkan 25 Pertandingan Kasino',
      icon: '👑',
      progress: Math.min(stats.menang, 25),
      target: 25,
      reward: 200000,
      rewardText: '+200.000 Koin'
    },
    {
      id: 'p2',
      title: '🔥 Raja Streak',
      desc: 'Capai 3x Win Streak berturut-turut',
      icon: '🔥',
      progress: Math.min(stats.winStreak, 3),
      target: 3,
      reward: 150000,
      rewardText: '+150.000 Koin'
    },
    {
      id: 'p3',
      title: '💰 Sultan Kasino',
      desc: 'Miliki 5.000.000 Koin di Saldo Akun',
      icon: '💰',
      progress: Math.min(profile?.coins || 0, 5000000),
      target: 5000000,
      reward: 500000,
      rewardText: '+500.000 Koin'
    },
    {
      id: 'p4',
      title: '⚔️ Pejuang Domino',
      desc: 'Mainkan Total 50 Ronde Pertandingan',
      icon: '🀱',
      progress: Math.min(stats.ronde, 50),
      target: 50,
      reward: 300000,
      rewardText: '+300.000 Koin'
    },
    {
      id: 'p5',
      title: '🃏 Master Balak',
      desc: 'Keluarkan 10 Kartu Balak di Meja',
      icon: '💎',
      progress: Math.min(stats.menang, 10),
      target: 10,
      reward: 100000,
      rewardText: '+100.000 Koin'
    },
    {
      id: 'p6',
      title: '🎁 Dermawan Kasino',
      desc: 'Kirim Koin Hadiah ke Teman Kasino',
      icon: '🎁',
      progress: 1,
      target: 1,
      reward: 50000,
      rewardText: '+50.000 Koin'
    }
  ];

  // Fungsi membuat grafik Radar SVG
  const renderRadar = () => {
    const size = 100, center = size / 2, radius = size / 2.5;
    const angles = [0, 72, 144, 216, 288].map(deg => (deg * Math.PI) / 180);
    const vals = [stats.radar.domino, stats.radar.poker, stats.radar.santai, stats.radar.slot, stats.radar.ludo];

    const bgPts = angles.map(a => `${center + radius * Math.sin(a)},${center - radius * Math.cos(a)}`).join(' ');
    const valPts = angles.map((a, i) => `${center + vals[i] * radius * Math.sin(a)},${center - vals[i] * radius * Math.cos(a)}`).join(' ');

    return (
      <div className="pm-radar-wrapper">
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <polygon points={bgPts} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          {angles.map((a, i) => (
            <line key={i} x1={center} y1={center} x2={center + radius * Math.sin(a)} y2={center - radius * Math.cos(a)} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          ))}
          <polygon points={valPts} fill="rgba(255,215,0,0.6)" stroke="#ffd700" strokeWidth="1.5" />
        </svg>
        <span className="rl rl-top">Domino</span>
        <span className="rl rl-tr">Poker</span>
        <span className="rl rl-br">Santai</span>
        <span className="rl rl-bl">Slot</span>
        <span className="rl rl-tl">Ludo</span>
      </div>
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'prestasi') {
      return (
        <div className="pm-tab-pane pm-prestasi-pane">
          {prestasiList.map(p => {
            const isCompleted = p.progress >= p.target;
            const isClaimed = claimedPrestasi[p.id];
            const pct = Math.min(100, Math.floor((p.progress / p.target) * 100));

            return (
              <div key={p.id} className={`pm-prestasi-card ${isCompleted ? 'completed' : ''}`}>
                <div className="pm-prestasi-icon-box">
                  {p.icon}
                </div>
                <div className="pm-prestasi-details">
                  <div className="pm-prestasi-header-row">
                    <span className="pm-prestasi-title">{p.title}</span>
                    <span className="pm-prestasi-reward-tag">{p.rewardText}</span>
                  </div>
                  <div className="pm-prestasi-desc">{p.desc}</div>

                  <div className="pm-prestasi-progress-bar-bg">
                    <div className="pm-prestasi-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="pm-prestasi-progress-text">
                    {p.progress.toLocaleString()} / {p.target.toLocaleString()} ({pct}%)
                  </div>
                </div>

                {isCompleted ? (
                  <button
                    className={`pm-prestasi-claim-btn g-btn-press ${isClaimed ? 'claimed' : ''}`}
                    onClick={() => handleClaimPrestasi(p.id, p.reward, p.title)}
                  >
                    {isClaimed ? 'KLAIMED ✅' : 'KLAIM HADIAH 🎁'}
                  </button>
                ) : (
                  <button className="pm-prestasi-claim-btn claimed" style={{ opacity: 0.6 }}>
                    PROGRES...
                  </button>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (activeTab === 'custom') {
      return (
        <div className="pm-tab-pane pm-custom-pane">
          {/* Section 1: Bingkai Avatar */}
          <div className="pm-custom-section">
            <div className="pm-custom-title">
              <span>🖼️</span> <span>Bingkai Avatar Keren & Efek Aura</span>
            </div>
            <div className="pm-custom-grid">
              {frames.map(f => (
                <div
                  key={f.id}
                  className={`pm-custom-card g-btn-press ${selectedFrame === f.id ? 'active' : ''}`}
                  onClick={() => handleEquipFrame(f.id)}
                >
                  {selectedFrame === f.id && <span className="pm-equipped-badge-pill">DIPAKAI</span>}
                  <div className="pm-card-icon">{f.icon}</div>
                  <div className="pm-card-label">{f.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Skin Meja Kasino */}
          <div className="pm-custom-section">
            <div className="pm-custom-title">
              <span>🎴</span> <span>Tema & Color Skin Meja</span>
            </div>
            <div className="pm-custom-grid">
              {tables.map(t => (
                <div
                  key={t.id}
                  className={`pm-custom-card g-btn-press ${selectedTable === t.id ? 'active' : ''}`}
                  onClick={() => handleEquipTable(t.id)}
                >
                  {selectedTable === t.id && <span className="pm-equipped-badge-pill">DIPAKAI</span>}
                  <div className="pm-card-icon">{t.icon}</div>
                  <div className="pm-card-label">{t.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'lencana') {
      return (
        <div className="pm-tab-pane pm-lencana-pane">
          {badgesList.map(b => (
            <div key={b.id} className={`pm-badge-item ${b.unlocked ? 'unlocked' : 'locked'}`}>
              <div className="pm-badge-icon-box">
                {b.name.split(' ')[0]}
              </div>
              <div className="pm-badge-info">
                <div className="pm-badge-name">{b.name}</div>
                <div className="pm-badge-desc">{b.desc}</div>
              </div>
              {b.unlocked ? (
                <button
                  className={`pm-badge-btn g-btn-press ${equippedBadge === b.id ? 'equipped' : ''}`}
                  onClick={() => handleEquipBadge(b.id)}
                >
                  {equippedBadge === b.id ? 'Dipakai ✅' : 'Pakai Lencana'}
                </button>
              ) : (
                <span style={{ fontSize: '1.2vh', color: '#e74c3c', fontWeight: 800 }}>🔒 TERKUNCI</span>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'statistik') {
      return (
        <div className="pm-tab-pane pm-stats-view">
          <div className="pm-stats-col">
            <div className="pm-stat-item"><div className="pm-stat-label">Total Main</div><div className="pm-stat-val">{stats.ronde}x</div></div>
            <div className="pm-stat-item"><div className="pm-stat-label">Menang</div><div className="pm-stat-val">{stats.menang}x</div></div>
            <div className="pm-stat-item"><div className="pm-stat-label">Win Rate</div><div className="pm-stat-val">{winRate}%</div></div>
            <div className="pm-stat-item"><div className="pm-stat-label">Win Streak</div><div className="pm-stat-val">{stats.winStreak}</div></div>
          </div>
          <div className="pm-stats-col pm-radar-col">
            <div className="pm-stat-label" style={{ marginBottom: '1vh', fontSize: '1.6vh' }}>Kemampuan Master</div>
            {renderRadar()}
          </div>
        </div>
      );
    }

    // Default 'informasi' view
    return (
      <div className="pm-tab-pane pm-flex-row" style={{ height: '100%', alignItems: 'stretch' }}>
        {/* MIDDLE COLUMN */}
        <div className="pm-center" style={{ flex: 1, justifyContent: 'space-between', display: 'flex', flexDirection: 'column' }}>
          {/* Level Box */}
          <div className="pm-level-box pm-anim-bump" style={{ flex: 1 }}>
            <div className="pm-level-star"><span className="pm-star-num">{profile?.level || localStorage.getItem('domino_level') || '1'}</span></div>
            <div className="pm-level-info">
              <div className="pm-level-text">
                <span>Level {profile?.level || localStorage.getItem('domino_level') || '1'} (Master Kasino)</span>
                <span style={{ color: '#ffd700' }}>35% XP</span>
              </div>
              <div className="pm-level-bar-bg"><div className="pm-level-bar-fill" style={{ width: '35%' }}></div></div>
            </div>
          </div>

          {/* VIP & Prestasi */}
          <div className="pm-vip-prestasi-box pm-anim-bump" style={{ animationDelay: '0.1s', flex: 1 }}>
            <div className="pm-vp-item" style={{ flex: 1, justifyContent: 'center' }}>
              <div className="pm-vp-icon vip-icon">V</div>
              <div className="pm-vp-text">VIP TIER<br /><span>VIP {profile?.vipLevel || localStorage.getItem('domino_vip') || '3'}</span></div>
            </div>
            <div className="pm-vp-item" style={{ flex: 1, justifyContent: 'center' }}>
              <div className="pm-vp-icon prestasi-icon">💎</div>
              <div className="pm-vp-text">Prestasi<br /><span>{Object.values(claimedPrestasi).filter(Boolean).length}/6</span></div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="pm-stats-row pm-anim-bump" style={{ animationDelay: '0.2s', flex: 2 }}>
            <div className="pm-stats-col" style={{ flex: 1, justifyContent: 'center' }}>
              <div className="pm-stat-item">
                <div className="pm-stat-label">Jumlah Ronde</div>
                <div className="pm-stat-val">{stats.ronde}</div>
              </div>
              <div className="pm-stat-item">
                <div className="pm-stat-label">Rasio Menang</div>
                <div className="pm-stat-val">{winRate}%</div>
              </div>
              <div className="pm-stat-item">
                <div className="pm-stat-label">Win Streak</div>
                <div className="pm-stat-val">{stats.winStreak}</div>
              </div>
            </div>
            <div className="pm-stats-col pm-radar-col" style={{ flex: 1.5, justifyContent: 'center' }}>
              <div className="pm-stat-label">Master Kasino</div>
              {renderRadar()}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="pm-right pm-anim-bump" style={{ animationDelay: '0.3s', flex: '0 0 27%', height: '100%', justifyContent: 'center' }}>
          <div className="pm-avatar-area">
            {/* Dynamic Avatar Frame Wrap */}
            <div
              className={`pm-avatar-circle pm-hover-glow avatar-frame-${selectedFrame}`}
              onClick={onOpenAvatarSelection}
              title="Klik untuk Ganti Avatar & Bingkai"
              style={{
                position: 'relative',
                overflow: 'visible',
              }}
            >
              {selectedFrame === 'crown' && (
                <span style={{ position: 'absolute', top: '-2.8vh', fontSize: '3.6vh', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.8))' }}>👑</span>
              )}
              {selectedFrame === 'fire' && (
                <span style={{ position: 'absolute', top: '-2.2vh', fontSize: '3vh', filter: 'drop-shadow(0 0 10px #ff4500)' }}>🔥</span>
              )}
              {selectedFrame === 'lightning' && (
                <span style={{ position: 'absolute', top: '-2.2vh', fontSize: '3vh', filter: 'drop-shadow(0 0 10px #ffe600)' }}>⚡</span>
              )}
              {selectedFrame === 'dragon' && (
                <span style={{ position: 'absolute', top: '-2.2vh', fontSize: '3vh', filter: 'drop-shadow(0 0 10px #f39c12)' }}>🐉</span>
              )}

              {/* Clean, 100% Unobstructed Photo Avatar Container */}
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="pm-avatar-emoji" style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  {renderPlayerAvatar(avatarEmoji, '🐸', 'pm-avatar-pic')}
                </span>
              </div>

              {/* Edit Icon on Avatar Corner */}
              <div className="pm-avatar-refresh pm-btn-anim" onClick={(e) => { e.stopPropagation(); onOpenAvatarSelection(); }} title="Ganti Avatar">
                ✏️
              </div>
            </div>

            {/* Subrow: VIP Tag (Placed neatly below photo, NEVER blocking the face!) & Ganti Avatar button */}
            <div className="pm-avatar-subrow">
              <div className="pm-avatar-vip-pill">
                <span className="pm-vip-crown-icon">👑</span> VIP {profile?.vipLevel || localStorage.getItem('domino_vip') || '3'}
              </div>
              <button
                className="pm-change-avatar-btn g-btn-press"
                onClick={onOpenAvatarSelection}
                title="Ganti Avatar & Bingkai Keren"
              >
                <span>🎨</span> Ganti Avatar
              </button>
            </div>

            {/* User ID Row: Spacious, un-cramped with beautiful copy button */}
            <div className="pm-userid">
              <div className="pm-userid-left">
                <span className="pm-userid-prefix">ID:</span>
                <span className="pm-userid-number">{profile?.userId || profile?.id || localStorage.getItem('domino_user_id') || '...'}</span>
              </div>
              <button
                className="pm-copy-btn pm-btn-anim g-btn-press"
                onClick={handleCopyUserId}
                title="Salin ID Akun"
              >
                {copiedId ? '✓ Tersalin!' : '📋 Salin'}
              </button>
            </div>
          </div>

          <div className="pm-info-list">
            <div className="pm-info-row pm-hover-glow" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                <span className="pm-info-icon" style={{ color: '#60a5fa' }}>👤</span>
                <span className="pm-info-text" style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.username || 'Guest'}
                </span>
                <span style={{ color: '#00e676', fontSize: '1.4vh' }} title="Akun Terverifikasi">✓</span>
              </div>
              {onOpenChangeName && (
                <button
                  className="g-btn-press"
                  onClick={onOpenChangeName}
                  title={(profile?.nameChangeCount || 0) === 0 ? "Ubah Nama (Gratis 1x untuk Pengguna Baru)" : "Ubah Nama (Biaya: 50.000 Koin)"}
                  style={{
                    background: (profile?.nameChangeCount || 0) === 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 215, 0, 0.25)',
                    border: (profile?.nameChangeCount || 0) === 0 ? '1px solid #10b981' : '1px solid rgba(255, 215, 0, 0.6)',
                    color: (profile?.nameChangeCount || 0) === 0 ? '#34d399' : '#ffd700',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '1.1vh',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    marginLeft: 'auto'
                  }}
                >
                  ✏️ {(profile?.nameChangeCount || 0) === 0 ? 'Gratis 1x' : '50K'}
                </button>
              )}
            </div>
            <div className="pm-info-row pm-hover-glow">
              <span className="pm-info-icon" style={{ color: '#ffd700' }}>🪙</span>
              <span className="pm-info-text">{formatCoins(profile?.coins || 0)}</span>
              <span style={{ fontSize: '1.2vh', color: '#ffd700', marginLeft: 'auto', fontWeight: 800 }}>Koin</span>
            </div>
            <div className="pm-info-row pm-hover-glow">
              <span className="pm-info-icon rp-tag">Rp</span>
              <span className="pm-info-text">{formatCoins(profile?.rp || 0)}</span>
              <span style={{ fontSize: '1.2vh', color: '#ffedd5', marginLeft: 'auto', fontWeight: 800 }}>Kupon</span>
            </div>
            <div className="pm-info-row pm-hover-glow">
              <span className="pm-info-icon" style={{ color: '#c084fc' }}>💎</span>
              <span className="pm-info-text">100</span>
              <span style={{ fontSize: '1.2vh', color: '#c084fc', marginLeft: 'auto', fontWeight: 800 }}>Berlian</span>
            </div>
          </div>

          <div className="pm-login-days">
            <span>🔥 Login Streak: 1 Hari</span> • <span style={{ color: '#00e676' }}>Online 🟢</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Floating Claim Toast Notification */}
      {claimToast && (
        <div className="claim-toast-overlay">
          <div className="claim-toast-box">
            <div className="claim-toast-icon">🎁</div>
            <div className="claim-toast-content">
              <div className="claim-toast-title">PRESTASI DIKLAIM!</div>
              <div className="claim-toast-sub">
                {claimToast.title}: <span>+{claimToast.amount.toLocaleString()} Koin</span>
              </div>
            </div>
            <div className="claim-toast-shimmer" />
          </div>
        </div>
      )}

      <div className="profile-modal-box" onClick={e => e.stopPropagation()}>
        {/* Header Label */}
        <div className="pm-header-label">
          <span className="pm-header-icon">👑</span> PROFIL VIP EKSEKUTIF
        </div>
        {/* Close Button */}
        <button className="pm-close-btn" onClick={onClose}>✖</button>

        <div className="pm-content">
          {/* LEFT SIDEBAR */}
          <div className="pm-sidebar">
            <button className="pm-sidebar-item static pm-btn-anim" onClick={() => setIsProfileOpen(!isProfileOpen)}>
              <div className="pm-sb-left-group">
                <span className="pm-sb-icon">👤</span>
                <span className="pm-sb-title">Profil</span>
              </div>
              <span className="pm-sb-arrow">{isProfileOpen ? '▼' : '▶'}</span>
            </button>
            <div className={`pm-accordion-content ${isProfileOpen ? 'open' : 'closed'}`}>
              <button className={`pm-sidebar-item sub-item pm-btn-anim ${activeTab === 'informasi' ? 'active-sub' : ''}`} onClick={() => setActiveTab('informasi')}>
                <span className="pm-sub-dot">•</span> Informasi
              </button>
              <button className={`pm-sidebar-item sub-item pm-btn-anim ${activeTab === 'statistik' ? 'active-sub' : ''}`} onClick={() => setActiveTab('statistik')}>
                <span className="pm-sub-dot">•</span> Statistik
              </button>
              <button className={`pm-sidebar-item sub-item pm-btn-anim ${activeTab === 'custom' ? 'active-sub' : ''}`} onClick={() => setActiveTab('custom')}>
                <span className="pm-sub-dot">•</span> Custom
              </button>
              <button className={`pm-sidebar-item sub-item pm-btn-anim ${activeTab === 'lencana' ? 'active-sub' : ''}`} onClick={() => setActiveTab('lencana')}>
                <span className="pm-sub-dot">•</span> Lencana
              </button>
            </div>

            <button
              className="pm-sidebar-item pm-btn-anim"
              onClick={onOpenAvatarSelection}
              style={{ marginTop: '0.8vh', background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.25), rgba(109, 40, 217, 0.1))', color: '#e9d5ff', borderLeft: '3px solid #c084fc' }}
            >
              <div className="pm-sb-left-group">
                <span className="pm-sb-icon">🎨</span>
                <span className="pm-sb-title">Ganti Avatar</span>
              </div>
              <span className="pm-sb-arrow">⚡</span>
            </button>

            <button className={`pm-sidebar-item pm-btn-anim ${activeTab === 'prestasi' ? 'active' : ''}`} onClick={() => setActiveTab('prestasi')} style={{ marginTop: '0.8vh' }}>
              <div className="pm-sb-left-group">
                <span className="pm-sb-icon">🏆</span>
                <span className="pm-sb-title">Prestasi</span>
              </div>
              <span className="pm-sb-arrow">▶</span>
            </button>
          </div>

          {/* DYNAMIC CONTENT AREA */}
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// RULES MODAL (Casino Leather & Parchment Theme)
// =====================================================
function RulesModal({ onClose, initialCategory }: { onClose: () => void; initialCategory?: string }) {
  const resolveCategory = (cat?: string) => {
    if (!cat) return 'Kamar Biasa';
    if (cat === 'Partner' || cat.includes('Partner')) return 'Domino Partner';
    if (cat === 'Wild' || cat.includes('Wild')) return 'Wild';
    if (cat.includes('5 Kartu') || cat.includes('card5') || cat.includes('5kartu')) return '5 Kartu';
    if (cat === 'Bet' || cat.includes('Bet')) return 'Kamar Bet';
    if (cat === 'Biasa' || cat.includes('Biasa')) return 'Kamar Biasa';
    if (cat.includes('Qiu')) return 'Qiu Qiu';
    if (cat.includes('RemiPro')) return 'RemiPro';
    if (cat.includes('Remi')) return 'Remi';
    if (cat.includes('Capsa')) return 'Capsa Susun';
    return 'Kamar Biasa';
  };

  const [activeSideCategory, setActiveSideCategory] = useState(() => resolveCategory(initialCategory));
  const [activeTab, setActiveTab] = useState<'peraturan' | 'pemenang' | 'hasil'>('peraturan');

  const sideCategories = [
    'Kamar Biasa',
    '5 Kartu',
    'Kamar Bet',
    'Wild',
    'Domino Partner',
    'Qiu Qiu',
    'Remi',
    'RemiPro',
    'Capsa Susun'
  ];

  return (
    <div className="modal-overlay tm-overlay-fade" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="rm-modal-box tm-box-bounce" onClick={e => e.stopPropagation()}>
        {/* 3D Glossy Red Close Button on Top Right */}
        <button className="rm-close-3d-btn" onClick={onClose} aria-label="Tutup">
          ✕
        </button>

        {/* Arched Crown Header with Golden Title and Sparkle Beads */}
        <div className="rm-header">
          <div className="rm-header-content">
            <div className="rm-title-wrap">
              <span className="rm-main-title">Rules</span>
              <span className="rm-sparkle">✨</span>
            </div>
            <div className="rm-beads-row">
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
              <span className="rm-bead"></span>
            </div>
          </div>
        </div>

        {/* Inner Body Box: Wine Sidebar + Solid Ivory/White Paper Content */}
        <div className="rm-inner-body">
          {/* Left Sidebar */}
          <div className="rm-sidebar-royal">
            {sideCategories.map((cat) => (
              <button
                key={cat}
                className={`rm-side-btn-royal ${activeSideCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveSideCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Right Content Panel */}
          <div className="rm-content-royal">
            {/* Clean Subtab Bar */}
            <div className="rm-rules-subtabs">
              <button
                className={`rm-rules-subtab-btn ${activeTab === 'peraturan' ? 'active' : ''}`}
                onClick={() => setActiveTab('peraturan')}
              >
                Peraturan
              </button>
              <button
                className={`rm-rules-subtab-btn ${activeTab === 'pemenang' ? 'active' : ''}`}
                onClick={() => setActiveTab('pemenang')}
              >
                Pemenang
              </button>
              <button
                className={`rm-rules-subtab-btn ${activeTab === 'hasil' ? 'active' : ''}`}
                onClick={() => setActiveTab('hasil')}
              >
                Hasil
              </button>
            </div>

            {/* Authentic Dual Domino Tiles Watermark */}
            <div className="rm-paper-watermark" aria-hidden="true">
              <svg width="115" height="115" viewBox="0 0 100 100" fill="none">
                <g transform="rotate(-18 45 45)">
                  <rect x="20" y="10" width="34" height="64" rx="5" stroke="#701a40" strokeWidth="2.5" fill="none" />
                  <line x1="20" y1="42" x2="54" y2="42" stroke="#701a40" strokeWidth="2" />
                  <circle cx="37" cy="26" r="3" fill="#701a40" />
                  <circle cx="28" cy="50" r="2.8" fill="#701a40" />
                  <circle cx="46" cy="50" r="2.8" fill="#701a40" />
                  <circle cx="37" cy="58" r="2.8" fill="#701a40" />
                  <circle cx="28" cy="66" r="2.8" fill="#701a40" />
                  <circle cx="46" cy="66" r="2.8" fill="#701a40" />
                </g>
                <g transform="rotate(14 65 55)">
                  <rect x="45" y="20" width="34" height="64" rx="5" stroke="#701a40" strokeWidth="2.5" fill="none" />
                  <line x1="45" y1="52" x2="79" y2="52" stroke="#701a40" strokeWidth="2" />
                  <circle cx="53" cy="29" r="2.8" fill="#701a40" />
                  <circle cx="71" cy="43" r="2.8" fill="#701a40" />
                  <circle cx="62" cy="36" r="2.8" fill="#701a40" />
                  <circle cx="53" cy="61" r="2.8" fill="#701a40" />
                  <circle cx="71" cy="75" r="2.8" fill="#701a40" />
                  <circle cx="62" cy="68" r="2.8" fill="#701a40" />
                </g>
              </svg>
            </div>

            {/* Scrollable White Paper Body with watermark & animation */}
            <div className="rm-paper-body rm-anim-fade-in" key={`${activeSideCategory}-${activeTab}`}>
              {/* 5 KARTU MODE TABS */}
              {activeTab === 'peraturan' && (activeSideCategory === '5 Kartu' || activeSideCategory === 'Fokus') && (
                <div className="rm-text-group">
                  <div className="rm-section-head">【Pengenalan】</div>
                  <div className="rm-text-line">Jumlah kartu: 28</div>
                  <div className="rm-text-line">Jumlah pemain: 3-4 orang</div>
                  <div className="rm-text-line">Pada awal permainan setiap orang akan mendapatkan 5 kartu.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Main】</div>
                  <div className="rm-text-line">Klik 2 kali atau geser untuk memainkan kartu.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Peraturan】</div>
                  <div className="rm-text-line">1. Sistem akan menentukan secara acak pemain yang akan mengeluarkan kartu terlebih dahulu, setelah itu pemain mengeluarkan kartu sesuai arah jarum jam.</div>
                  <div className="rm-text-line">2. Untuk mengeluarkan kartu, nilai salah satu ujung kartu harus sama dengan ekor/kepala kartu yang ada di meja. Pemain wajib mengeluarkan kartu bila ada kartu yang bisa dikeluarkan.</div>
                  <div className="rm-text-line">3. Jika pemain tidak memiliki kartu yang bisa dikeluarkan dan masih ada tumpukan kartu di meja, pemain harus mengambil kartu sampai mendapat kartu yang bisa dikeluarkan. Jika pemain tidak dapat mengeluarkan kartu, maka harus membayar pemain yang mengeluarkan kartu sebelumnya. Kemudian giliran pemain selanjutnya untuk mengeluarkan kartu.</div>
                  <div className="rm-text-line" style={{ marginTop: '1vh' }}>4. Permainan berakhir jika kartu seorang pemain sudah habis, atau jika semua pemain tidak bisa mengeluarkan kartu lagi (Dead-End).</div>
                </div>
              )}

              {activeTab === 'pemenang' && (activeSideCategory === '5 Kartu' || activeSideCategory === 'Fokus') && (
                <div className="rm-text-group">
                  <div className="rm-section-head">【Pemenang】</div>
                  <div className="rm-text-line">1. Pemain yang kartunya habis terlebih dahulu adalah pemenang.</div>
                  <div className="rm-text-line">2. Pada Dead-End, pemain dengan total nilai kartu terkecil adalah pemenangnya.</div>
                  <div className="rm-text-line">3. Jika 2 orang memiliki total nilai yang sama, maka pemain dengan jumlah kartu terkecil yang menang.</div>
                  <div className="rm-text-line">4. Jika 2 orang memiliki total nilai dan jumlah kartu yang sama, maka pemain dengan nilai bagian atas kartu terkecil yang menang.</div>
                </div>
              )}

              {activeTab === 'hasil' && (activeSideCategory === '5 Kartu' || activeSideCategory === 'Fokus') && (
                <div className="rm-text-group">
                  <div className="rm-section-head">【Kartu Pemenang】</div>
                  <div className="rm-text-line">Kartu pemenang (kartu yang terakhir dikeluarkan oleh pemenang) terbagi menjadi dua jenis: Kartu kembar (nilai atas dan bawahnya sama) dan kartu biasa (nilai atas dan bawahnya berbeda).</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Lewat】</div>
                  <div className="rm-text-line">Sewaktu tidak ada kartu yang bisa dikeluarkan, Anda harus membayar kepada pemain sebelumnya sebesar 1x nilai bet.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Single】</div>
                  <div className="rm-text-line">Pada kondisi Dead-End, maka pemenang mendapat bet*1.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Double】</div>
                  <div className="rm-text-line">Apabila kartu terakhir pemenang adalah kartu biasa dan hanya dapat tersambung di bagian atas atau bawah, maka pemenang mendapat bet*2.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Triple】</div>
                  <div className="rm-text-line">Apabila kartu terakhir pemenang adalah kartu kembar dan hanya dapat tersambung di bagian atas atau bawah, maka pemenang mendapat bet*3.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Quartet】</div>
                  <div className="rm-text-line">Apabila kartu pemenang adalah kartu biasa dan dapat tersambung di bagian atas dan bawah, maka pemenang mendapat bet*4.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Quintet】</div>
                  <div className="rm-text-line">Apabila kartu pemenang adalah kartu kembar dan dapat tersambung di bagian atas dan bawah, nilai maka pemenang mendapat bet*5.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Skor Kalah】</div>
                  <div className="rm-text-line">Bet * nilai jenis kemenangan * nilai total kartu ditangan.</div>
                </div>
              )}

              {/* PARTNER MODE TABS */}
              {activeTab === 'peraturan' && activeSideCategory === 'Domino Partner' && (
                <div className="rm-text-group">
                  <div className="rm-section-head">【Pengenalan】</div>
                  <div className="rm-text-line">Jumlah kartu: 28</div>
                  <div className="rm-text-line">Jumlah pemain: 4 orang, dibagi menjadi 2 tim</div>
                  <div className="rm-text-line">Pada awal permainan setiap orang akan mendapatkan 7 kartu.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Pencocokan Tim】</div>
                  <div className="rm-text-line">1. Pemain yang membentuk tim akan dicocokkan dengan pemain lain yang juga membentuk tim.</div>
                  <div className="rm-text-line">2. Pemain yang bermain single akan dicocokkan dengan pemain single lainnya.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Cara Bermain】</div>
                  <div className="rm-text-line">1. Klik 2 kali atau geser untuk memainkan kartu.</div>
                  <div className="rm-text-line">2. Pemain bermain secara bergiliran berlawanan arah jarum jam.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Peraturan】</div>
                  <div className="rm-text-line">1. Pemain yang memiliki kartu balak 6 harus memulai permainan dan wajib memainkan kartu tersebut terlebih dahulu.</div>
                  <div className="rm-text-line">2. Pemain yang lewat akan membayar Bet*0.1.</div>
                  <div className="rm-text-line" style={{ marginTop: '1vh' }}>3. Pemain yang kartunya habis terlebih dahulu disebut Domi.</div>
                </div>
              )}

              {activeTab === 'pemenang' && activeSideCategory === 'Domino Partner' && (
                <div className="rm-text-group">
                  <div className="rm-section-head">【Pemenang】</div>
                  <div className="rm-text-line">1. Permainan berakhir ketika kartu salah satu pemain habis, atau tidak ada kartu yang bisa dimainkan lagi.</div>
                  <div className="rm-text-line">2. Tim pemain yang kartunya habis terlebih dahulu akan menang.</div>
                  <div className="rm-text-line">3. Ketika kedua sisi kartu terkunci, pemain dengan jumlah titik kartu yang paling kecil akan menang.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Domi Kandang】</div>
                  <div className="rm-text-line">Terjadi ketika kedua sisi kartu terkunci dan permainan tidak dapat dilanjutkan lagi.</div>
                  <div className="rm-text-line">• Pengunci akan menang ketika jumlah titik kartu pengunci lebih kecil dari lawan.</div>
                  <div className="rm-text-line">• Lawan pengunci akan menang ketika jumlah titik kartu pengunci sama atau seri dengan lawan.</div>
                  <div className="rm-text-line">• Lawan pengunci menang ketika jumlah titik kartu pengunci kartu lebih besar dari salah satu atau semua lawan.</div>
                </div>
              )}

              {activeTab === 'hasil' && activeSideCategory === 'Domino Partner' && (
                <div className="rm-text-group">
                  <div className="rm-section-head">【Domi Biasa】</div>
                  <div className="rm-text-line">Bet*1: Terjadi ketika domi satu sisi menggunakan kartu biasa.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Domi Balak】</div>
                  <div className="rm-text-line">Bet*2: Terjadi ketika domi satu sisi menggunakan kartu balak.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Domi Kandang】</div>
                  <div className="rm-text-line">Terjadi ketika kedua sisi kartu terkunci dan permainan tidak dapat dilanjutkan lagi.</div>
                  <div className="rm-text-line">• Bet*2 untuk pengunci: Terjadi ketika jumlah titik kartu pengunci lebih kecil dari lawan.</div>
                  <div className="rm-text-line">• Bet*1 untuk lawan pengunci: Terjadi ketika jumlah titik kartu pengunci sama atau seri dengan lawan.</div>
                  <div className="rm-text-line">• Bet*3 untuk lawan pengunci: Terjadi ketika jumlah titik kartu pengunci kartu lebih besar dari salah satu atau semua lawan.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Domi Ceki】</div>
                  <div className="rm-text-line">Terjadi ketika kartu terakhir pemain yang domi sama dengan kedua sisi ujung kartu di meja.</div>
                  <div className="rm-text-line">• Ceki Biasa (Bet*2): Kedua sisi kartu belum habis di tangan lawan atau kawan.</div>
                  <div className="rm-text-line">• Ceki Habis (Bet*3): Kedua sisi kartu habis baik di tangan lawan dan di tangan kawan.</div>
                  <div className="rm-text-line">• Ceki Balak (Bet*3): Domi menggunakan kartu balak dan kedua sisi kartu belum habis.</div>
                  <div className="rm-text-line">• Ceki Palang (Bet*4): Domi menggunakan kartu balak dan kedua sisi kartu habis.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Hadiah & Kekalahan】</div>
                  <div className="rm-text-line">Tim yang menang akan membagi rata koin yang dimenangkan.</div>
                  <div className="rm-text-line">Kekalahan = Bet × Jenis Kemenangan</div>
                </div>
              )}

              {/* WILD MODE TABS */}
              {activeTab === 'peraturan' && activeSideCategory === 'Wild' && (
                <div className="rm-text-group">
                  <div className="rm-section-head">【Pengenalan】</div>
                  <div className="rm-text-line">Jumlah kartu: 28</div>
                  <div className="rm-text-line">Jumlah pemain: 2-4 orang</div>
                  <div className="rm-text-line">Pada awal permainan setiap orang akan mendapatkan 7 kartu.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Main】</div>
                  <div className="rm-text-line">Klik 2 kali atau geser untuk memainkan kartu.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Peraturan】</div>
                  <div className="rm-text-line">1. Kartu Wild akan ditampilkan di awal.</div>
                  <div className="rm-text-line">2. Sistem akan menentukan secara acak pemain yang akan mengeluarkan kartu terlebih dahulu, pemain selanjutnya didasarkan pada arah jarum jam.</div>
                  <div className="rm-text-line">3. Nilai atas atau bawah kartu harus sama dengan ekor/kepala kartu dengan yang ada dimeja. Kartu wajib dikeluarkan jika dapat dikeluarkan. Jika tidak dapat mengeluarkan, maka membayar pemain yang mengeluarkan kartu sebelumnya, kemudian pemain selanjutnya dapat mengeluarkan kartu.</div>
                  <div className="rm-text-line">4. Jika pemain memegang kartu wild di tangannya, ia harus memainkan kartu wild ketika tidak ada kartu normal lainnya untuk dimainkan.</div>
                  <div className="rm-text-line" style={{ marginTop: '1vh' }}>5. Sewaktu kartu seorang pemain sudah habis, atau sewaktu setiap pemain sudah tidak dapat mengeluarkan kartu (Dead-end), permainan berakhir.</div>
                </div>
              )}

              {activeTab === 'pemenang' && activeSideCategory === 'Wild' && (
                <div className="rm-text-group">
                  <div className="rm-section-head">【Pemenang】</div>
                  <div className="rm-text-line">1. Pemain yang kartunya pertama kali habis adalah pemenang.</div>
                  <div className="rm-text-line">2. Pada Dead-End, pemain dengan total nilai terkecil adalah pemenangnya.</div>
                  <div className="rm-text-line">3. Jika 2 orang memiliki total nilai yang sama, maka pemain dengan total kartu paling sedikit yang menang.</div>
                  <div className="rm-text-line">4. Jika 2 orang memiliki jumlah kartu yang sama, maka pemain dengan poin terkecil yang menang.</div>
                  <div className="rm-text-line">5. Jika 2 orang memiliki nilai terkecil, maka nilai sebelah atas terkecil adalah pemenangnya.</div>
                </div>
              )}

              {activeTab === 'hasil' && activeSideCategory === 'Wild' && (
                <div className="rm-text-group">
                  <div className="rm-section-head">【Kartu Pemenang】</div>
                  <div className="rm-text-line">Kartu pemenang (kartu yang terakhir dikeluarkan oleh pemenang) terbagi menjadi dua jenis: Kartu kembar - nilai atas dan bawahnya sama; Kartu biasa - nilai atas dan bawahnya berbeda.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Lewat】</div>
                  <div className="rm-text-line">Sewaktu tidak ada kartu yang cocok, anda harus membayar kepada pemain sebelumnya sebesar 1x nilai Bet.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Single】</div>
                  <div className="rm-text-line">Pada kondisi Dead-End, nilai multiplier adalah 1.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Double】</div>
                  <div className="rm-text-line">Kalau kartu pemenang memiliki nilai atas dan bawah yang berbeda dan hanya dapat tersambung dibagian atas atau bawah, nilai multipliernya 2.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Triple】</div>
                  <div className="rm-text-line">Kalau kartu pemenang adalah kartu kembar, hanya tersambung dibagian atas atau bawah, nilai multipliernya 3.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Quartet】</div>
                  <div className="rm-text-line">Kalau kartu pemenang adalah kartu biasa, bagian atas dan bawah tersambung, nilai multipliernya 4.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Quintet】</div>
                  <div className="rm-text-line">Kalau kartu pemenang adalah kartu kembar, bagian atas dan bawahnya tersambung, nilai multipliernya 5.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Skor Kekalahan】</div>
                  <div className="rm-text-line">Bet*multiplier</div>
                </div>
              )}

              {/* DEFAULT BIASA MODE TABS */}
              {activeTab === 'peraturan' && activeSideCategory !== 'Wild' && activeSideCategory !== 'Domino Partner' && activeSideCategory !== '5 Kartu' && activeSideCategory !== 'Fokus' && (
                <div className="rm-text-group">
                  <div className="rm-section-head">【Pengenalan】</div>
                  <div className="rm-text-line">Jumlah kartu: 28</div>
                  <div className="rm-text-line">Jumlah pemain: 2-4 orang</div>
                  <div className="rm-text-line">Pada awal permainan setiap orang akan mendapatkan 7 kartu.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Main】</div>
                  <div className="rm-text-line">Klik 2 kali atau geser untuk memainkan kartu.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Peraturan】</div>
                  <div className="rm-text-line">1. Sistem akan menentukan secara acak pemain yang akan mengeluarkan kartu terlebih dahulu, setelah itu pemain mengeluarkan kartu sesuai arah jarum jam.</div>
                  <div className="rm-text-line">2. Untuk mengeluarkan kartu, nilai salah satu ujung kartu harus sama dengan ekor/kepala kartu yang ada di meja. Pemain wajib mengeluarkan kartu bila ada kartu yang bisa dikeluarkan. Jika pemain tidak dapat mengeluarkan kartu, maka harus membayar pemain yang mengeluarkan kartu sebelumnya. Kemudian giliran pemain selanjutnya untuk mengeluarkan kartu.</div>
                  <div className="rm-text-line" style={{ marginTop: '1vh' }}>Permainan berakhir jika kartu seorang pemain sudah habis, atau jika semua pemain tidak bisa mengeluarkan kartu lagi (Dead-End).</div>
                </div>
              )}

              {activeTab === 'pemenang' && activeSideCategory !== 'Wild' && activeSideCategory !== 'Domino Partner' && activeSideCategory !== '5 Kartu' && activeSideCategory !== 'Fokus' && (
                <div className="rm-text-group">
                  <div className="rm-section-head">【Pemenang】</div>
                  <div className="rm-text-line">1. Pemain yang kartunya habis terlebih dahulu adalah pemenang.</div>
                  <div className="rm-text-line">2. Pada Dead-End, pemain dengan total nilai kartu terkecil adalah pemenangnya.</div>
                  <div className="rm-text-line">3. Jika 2 orang memiliki total nilai yang sama, maka pemain dengan jumlah kartu terkecil yang menang.</div>
                  <div className="rm-text-line">4. Jika 2 orang memiliki total nilai dan jumlah kartu yang sama, maka pemain dengan nilai bagian atas kartu terkecil yang menang.</div>
                </div>
              )}

              {activeTab === 'hasil' && activeSideCategory !== 'Wild' && activeSideCategory !== 'Domino Partner' && activeSideCategory !== '5 Kartu' && activeSideCategory !== 'Fokus' && (
                <div className="rm-text-group">
                  <div className="rm-section-head">【Kartu Pemenang】</div>
                  <div className="rm-text-line">Kartu pemenang (kartu yang terakhir dikeluarkan oleh pemenang) terbagi menjadi dua jenis:</div>
                  <div className="rm-text-line">Kartu kembar (nilai atas dan bawahnya sama) dan kartu biasa (nilai atas dan bawahnya berbeda).</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Lewat】</div>
                  <div className="rm-text-line">Sewaktu tidak ada kartu yang bisa dikeluarkan, Anda harus membayar kepada pemain sebelumnya sebesar 1x nilai bet.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Single】</div>
                  <div className="rm-text-line">Pada kondisi Dead-End, maka pemenang mendapat bet*1.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Double】</div>
                  <div className="rm-text-line">Apabila kartu terakhir pemenang adalah kartu biasa dan hanya dapat tersambung di bagian atas atau bawah, maka pemenang mendapat bet*2.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Triple】</div>
                  <div className="rm-text-line">Apabila kartu terakhir pemenang adalah kartu kembar dan hanya dapat tersambung di bagian atas atau bawah, maka pemenang mendapat bet*3.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Quartet】</div>
                  <div className="rm-text-line">Apabila kartu pemenang adalah kartu biasa dan dapat tersambung di bagian atas dan bawah, maka pemenang mendapat bet*4.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Quintet】</div>
                  <div className="rm-text-line">Apabila kartu pemenang adalah kartu kembar dan dapat tersambung di bagian atas dan bawah, nilai maka pemenang mendapat bet*5.</div>

                  <div className="rm-section-head" style={{ marginTop: '1.5vh' }}>【Skor Kalah】</div>
                  <div className="rm-text-line">Bet*nilai jenis kemenangan.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// SLOT GAMES DEFINITION & POPUP
// =====================================================
interface SlotGameDef {
  id: string;
  name: string;
  img: string;
  jackpot: string;
  players: number;
  bg: string;
  locked: boolean;
  lockText?: string;
}

const SLOT_GAMES: SlotGameDef[] = [
  // ===== 8 ACTIVE GAMES (Semua di depan / berdampingan) =====
  { id: 'zeus', name: 'Gates of Olympus', img: '/assets/zeus/bg_olympus_hd.jpg', jackpot: '5,000,000,000', players: 320450, bg: 'linear-gradient(160deg,#1a1a6e,#4a0e8f)', locked: false },
  { id: 'gatotkaca', name: 'Gates of Gatotkaca 1000', img: '/assets/gatokaca/loading_art.jpg', jackpot: '100,000,000,000', players: 39464, bg: 'linear-gradient(160deg,#f39c12,#8a4b0e)', locked: false },
  { id: 'mahjong2', name: 'Mahjong Ways 2', img: '/assets/mahjong2/loading.jpg', jackpot: '100,000,000,000', players: 161974, bg: 'linear-gradient(160deg,#27ae60,#145a32)', locked: false },
  { id: '5lions', name: '5 Lions Megaways', img: '/assets/fivelions/loading.jpg', jackpot: '200,000,000,000', players: 156431, bg: 'linear-gradient(160deg,#172c72,#050b24)', locked: false },
  { id: 'fafafa2', name: 'Fafafa 2 Deluxe', img: '/assets/fafafa2/loading.jpg', jackpot: '10,000,000,000', players: 104598, bg: 'linear-gradient(160deg,#8b0000,#ff0000)', locked: false },

  // ===== COMING SOON GAMES =====
  { id: 'duofugrand', name: 'DuoFu DuoCai Grand', img: '/assets/duofuduocai/loading_art.jpg', jackpot: '99,899,264,448', players: 22728, bg: 'linear-gradient(160deg,#800010,#311b92)', locked: true, lockText: 'COMING SOON' },
  { id: 'superace', name: 'Super Ace', img: '/assets/slot_loading_bg.jpg', jackpot: '200,000,000,000', players: 150598, bg: 'linear-gradient(160deg,#8e44ad,#3a0e5c)', locked: true, lockText: 'COMING SOON' },
  { id: 'speedwinner', name: 'Speed Winner', img: '/assets/slot_loading_bg.jpg', jackpot: '100,000,000,000', players: 59273, bg: 'linear-gradient(160deg,#2c3e50,#0f1c2e)', locked: true, lockText: 'COMING SOON' },
  { id: 'yingcaishen', name: 'Ying Cai Shen', img: '/assets/fafafa2/bg_temple_clean.jpg', jackpot: '176,000,000,000', players: 12181, bg: 'linear-gradient(160deg,#b91d47,#5c0e22)', locked: true, lockText: 'COMING SOON' },
  { id: 'richmine', name: 'Rich Mine Blast', img: '/assets/slot_loading_bg.jpg', jackpot: '19,978,165,368', players: 29740, bg: 'linear-gradient(160deg,#8a5a2c,#4a2c0e)', locked: true, lockText: 'COMING SOON' },
  { id: 'wildwest', name: 'Wild West Gold', img: '/assets/wildwest/loading.jpg', jackpot: '100,000,000,000', players: 48291, bg: 'linear-gradient(160deg,#e65100,#4e342e)', locked: true, lockText: 'COMING SOON' },
  { id: 'jinjibaoxi', name: 'Jin Ji Bao Xi', img: '/assets/jinji/loading.jpg', jackpot: '2,835,374,165', players: 184598, bg: 'linear-gradient(160deg,#800010,#311b92)', locked: true, lockText: 'COMING SOON' },
  { id: 'candyrush', name: 'Candy Rush Bonanza', img: '/assets/candyrush/loading.jpg', jackpot: '100,000,000,000', players: 13680, bg: 'linear-gradient(160deg,#ff80ab,#c2185b)', locked: true, lockText: 'COMING SOON' },
];

function AjakTemanModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const refCode = "DMN-992X8A";

  const handleCopy = () => {
    navigator.clipboard.writeText(refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 400, textAlign: 'center', position: 'relative', animation: 'tmBoxBounce 0.35s ease' }}>
        <button className="modal-close-btn" style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, padding: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }} onClick={onClose}>×</button>
        <div style={{ fontSize: 56, marginBottom: 10, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>🎁</div>
        <div className="modal-title" style={{ color: '#f1c40f', fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>AJAK TEMAN</div>
        <div className="modal-message" style={{ marginBottom: 20, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
          Undang temanmu bermain dan dapatkan <b>1.000.000 Koin</b> secara instan untuk setiap teman yang mendaftar!
        </div>

        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: 12, marginBottom: 20, border: '1px solid rgba(241,196,15,0.2)' }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Kode Referral Kamu:</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#f1c40f', letterSpacing: 4 }}>{refCode}</div>
        </div>

        <button
          onClick={handleCopy}
          style={{ width: '100%', padding: '14px', borderRadius: 12, background: copied ? '#2ecc71' : 'linear-gradient(90deg, #f1c40f, #f39c12)', color: copied ? '#fff' : '#000', border: 'none', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 12px rgba(241,196,15,0.3)' }}
        >
          {copied ? '✅ Berhasil Disalin!' : '📋 Salin Kode'}
        </button>
      </div>
    </div>
  );
}

function SlotGamesModal({ onClose, onPlaySlot }: { onClose: () => void, onPlaySlot: (gameId: string) => void }) {
  const handleCardClick = (game: SlotGameDef) => {
    if (game.locked) {
      alert(`${game.name} sedang dalam pengembangan (Coming Soon)!`);
      return;
    }
    if (game.id === 'duofugrand') {
      onPlaySlot('duofuduocai');
      return;
    }
    onPlaySlot(game.id);
  };

  const activeGames = SLOT_GAMES.filter(g => !g.locked);
  const comingSoonGames = SLOT_GAMES.filter(g => g.locked);

  const renderCard = (game: SlotGameDef) => (
    <div
      key={game.id}
      className={`sl-card ${game.locked ? 'sl-card-locked' : 'sl-card-active'} g-btn-press`}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.35) 0%, transparent 45%, rgba(0, 0, 0, 0.9) 100%), url('${game.img}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onClick={() => handleCardClick(game)}
    >
      {game.locked && (
        <div className="sl-card-lock-overlay">
          <span style={{ fontSize: '14px' }}>🔒</span>
          <span>{game.lockText || 'COMING SOON'}</span>
        </div>
      )}
      <div className="sl-card-jackpot">{game.jackpot}</div>
      <div className="sl-card-bottom-wrap">
        <div className="sl-card-name">{game.name}</div>
        <div className="sl-card-players">👤 {game.players.toLocaleString()}</div>
      </div>
    </div>
  );

  return (
    <div className="slot-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="slot-modal-container">
        <button className="slot-modal-close" onClick={onClose}>×</button>

        <div className="slot-modal-header">
          <h2>🎰 PILIH MESIN SLOT</h2>
          <p>Pilih game favoritmu</p>
        </div>

        <div className="slot-modal-scroll-area">
          {/* Hero / Featured card - Gates of Olympus (Active) */}
          <div className="slot-section-label" style={{ color: '#ffd700', fontWeight: 900 }}>⭐ GAME UTAMA PILIHAN</div>
          <div
            className="slot-modal-hero g-btn-press"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(15, 2, 6, 0.85) 0%, rgba(15, 2, 6, 0.4) 45%, rgba(15, 2, 6, 0.88) 100%), url('/assets/zeus/bg_olympus_hd.jpg')`,
              borderColor: '#ffd700'
            }}
            onClick={() => onPlaySlot('zeus')}
          >
            <div className="sl-hero-jackpot-box">
              <div className="sl-hero-badge">⭐ FEATURED • AKTIF</div>
              <span className="sl-jackpot-label">Jackpot Olympus</span>
              <span className="sl-jackpot-val">5,000,000,000</span>
              <div className="sl-hero-players">👤 320,450 main sekarang</div>
            </div>
            <div className="sl-hero-title">GATES OF<br />OLYMPUS</div>
          </div>

          {/* All active games lined up horizontally (ke samping semua) */}
          <div className="slot-section-label" style={{ color: '#4ef0a8', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🔥</span>
            <span>GAME AKTIF (BERJAJAR KE SAMPING)</span>
          </div>
          <div className="slot-modal-active-row">
            {activeGames.map(renderCard)}
          </div>

          {/* Coming Soon games lined up horizontally below */}
          <div className="slot-section-label" style={{ marginTop: 22, color: '#f39c12', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🔒</span>
            <span>SEGERA HADIR (COMING SOON)</span>
          </div>
          <div className="slot-modal-coming-row">
            {comingSoonGames.map(renderCard)}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// DATA & INTERFACE UNTUK PILIHAN KAMAR QIUQIU (99)
// =====================================================
export interface QiuQiuRoomConfig {
  id: string;
  name: string;
  blind: number;
  ante: number;
  buyIn: number;
  entryLabel: string;
  coinsRange: string;
  playersCount: number;
  img: string;
  badge?: string;
}

export const QIUQIU_ROOMS: QiuQiuRoomConfig[] = [
  {
    id: 'qq_5k',
    name: 'Kamar QiuQiu 5K',
    blind: 5000,
    ante: 5000,
    buyIn: 100000,
    entryLabel: '5K',
    coinsRange: '100K - 1M',
    playersCount: 14210,
    img: '/assets/loby/room_5k.jpg',
    badge: '🔥 PEMULA'
  },
  {
    id: 'qq_10k',
    name: 'Kamar QiuQiu 10K',
    blind: 10000,
    ante: 10000,
    buyIn: 200000,
    entryLabel: '10K',
    coinsRange: '200K - 5M',
    playersCount: 9840,
    img: '/assets/loby/room_10k.jpg',
    badge: '⭐ POPULER'
  },
  {
    id: 'qq_20k',
    name: 'Kamar QiuQiu 20K',
    blind: 20000,
    ante: 20000,
    buyIn: 400000,
    entryLabel: '20K',
    coinsRange: '400K - 10M',
    playersCount: 18230,
    img: '/assets/loby/room_10k.jpg',
    badge: '👑 HOT'
  },
  {
    id: 'qq_50k',
    name: 'Kamar QiuQiu 50K',
    blind: 50000,
    ante: 50000,
    buyIn: 1000000,
    entryLabel: '50K',
    coinsRange: '1M - 50M',
    playersCount: 5120,
    img: '/assets/loby/room_50k.jpg',
    badge: '💎 VIP'
  },
  {
    id: 'qq_200k',
    name: 'Kamar QiuQiu 200K',
    blind: 200000,
    ante: 200000,
    buyIn: 4000000,
    entryLabel: '200K',
    coinsRange: '4M+',
    playersCount: 3840,
    img: '/assets/loby/room_50k.jpg',
    badge: '🏆 SULTAN'
  }
];

function QiuQiuRoomModal({ onClose, onSelectRoom, userCoins }: {
  onClose: () => void;
  onSelectRoom: (room: QiuQiuRoomConfig) => void;
  userCoins: number;
}) {
  return (
    <div className="qq-room-modal-overlay tm-overlay-fade" onClick={onClose}>
      <div className="qq-room-modal-box tm-box-bounce" onClick={e => e.stopPropagation()}>
        <div className="qq-room-modal-header">
          <div className="qq-room-title-wrap">
            <div className="qq-room-modal-title">
              <span>🃏</span> PILIH KAMAR QIUQIU (99)
            </div>
            <div className="qq-room-modal-sub">
              Pilih ruangan sesuai modal koin Anda untuk bertanding!
            </div>
          </div>

          <div className="qq-room-header-right">
            <div className="qq-room-user-balance">
              <span>🪙</span>
              <span>{userCoins.toLocaleString('id-ID')}</span>
            </div>
            <button className="qq-room-close-btn g-btn-press" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="qq-room-cards-grid">
          {QIUQIU_ROOMS.map(r => {
            const canAfford = userCoins >= r.buyIn;
            return (
              <div
                key={r.id}
                className="qq-room-card g-btn-press"
                onClick={() => {
                  if (!canAfford) {
                    alert(`Koin Anda (${userCoins.toLocaleString('id-ID')}) tidak mencukupi untuk Buy-In ${r.name} (${r.buyIn.toLocaleString('id-ID')})!`);
                    return;
                  }
                  onSelectRoom(r);
                }}
              >
                <div className="qq-room-img-wrap">
                  <img src={r.img} alt={r.name} className="qq-room-img" />
                  {r.badge && <div className="qq-room-badge">{r.badge}</div>}
                  <div className="qq-room-blind-pill">Blind {r.entryLabel}</div>
                </div>

                <div className="qq-room-content">
                  <div className="qq-room-name">{r.name}</div>
                  <div className="qq-room-info-row">
                    <span>Buy-In Meja:</span>
                    <span className="qq-room-info-val">🪙 {r.buyIn.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="qq-room-info-row">
                    <span>Range Koin:</span>
                    <span>{r.coinsRange}</span>
                  </div>
                  <div className="qq-room-info-row">
                    <span>Pemain Online:</span>
                    <span className="qq-room-players">👥 {r.playersCount.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="qq-room-play-btn" style={{ opacity: canAfford ? 1 : 0.6 }}>
                    {canAfford ? 'MASUK MEJA ▶' : 'KOIN KURANG 🔒'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// HOME / LOBBY SCREEN — mirip referensi gambar
// =====================================================
function HomeScreen({
  onLogout,
  onNavigate,
  socket,
  initialShowSlotPopup = false,
  onClearSlotPopup
}: {
  onLogout: () => void;
  onNavigate: (screen: any, category?: any, extra?: any) => void;
  socket?: any;
  initialShowSlotPopup?: boolean;
  onClearSlotPopup?: () => void;
}) {
  const [profile, setProfile] = useState<any>(null);
  const [modal, setModal] = useState<{ title: string; message: string } | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [showPengaturan, setShowPengaturan] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showBerita, setShowBerita] = useState(false);
  const [showCS, setShowCS] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAvatarSelect, setShowAvatarSelect] = useState(false);
  const [avatarEmoji, setAvatarEmoji] = useState(() => localStorage.getItem('domino_avatar') || '🐸');
  const [showInbox, setShowInbox] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [viewingProfileFromHome, setViewingProfileFromHome] = useState<string | null>(null);
  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [canClaimBonus, setCanClaimBonus] = useState(false);
  const [showToko, setShowToko] = useState(false);
  const [showKirimKoin, setShowKirimKoin] = useState(false);
  const [showSlotPopup, setShowSlotPopup] = useState(initialShowSlotPopup);

  useEffect(() => {
    if (initialShowSlotPopup) {
      setShowSlotPopup(true);
      onClearSlotPopup?.();
    }
  }, [initialShowSlotPopup]);
  const [showAjakTeman, setShowAjakTeman] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showByOneRoomModal, setShowByOneRoomModal] = useState(false);
  const [showRiwayatTransfer, setShowRiwayatTransfer] = useState(false);
  const [showQiuQiuRoomModal, setShowQiuQiuRoomModal] = useState(false);
  const [showChangeNameModal, setShowChangeNameModal] = useState(false);
  const [bgmActive, setBgmActive] = useState(() => localStorage.getItem('set_bgm') !== 'off');
  const [bgmTrack, setBgmTrack] = useState<BgmTrackType>(() => lobbyAudio.getTrack());

  // Listen for username updates globally
  useEffect(() => {
    const onUsernameChange = (e: any) => {
      if (e.detail?.newUsername) {
        setProfile((prev: any) => prev ? {
          ...prev,
          username: e.detail.newUsername,
          coins: e.detail.coins !== undefined ? e.detail.coins : prev.coins,
          nameChangeCount: e.detail.nameChangeCount !== undefined ? e.detail.nameChangeCount : ((prev.nameChangeCount || 0) + 1)
        } : prev);
      }
    };
    window.addEventListener('domino_username_updated', onUsernameChange);
    return () => window.removeEventListener('domino_username_updated', onUsernameChange);
  }, []);

  useEffect(() => {
    const onBgmChange = (e: any) => {
      if (e.detail?.enabled !== undefined) {
        setBgmActive(e.detail.enabled);
      }
    };
    const onTrackChange = (e: any) => {
      if (e.detail?.track) {
        setBgmTrack(e.detail.track);
      }
    };
    window.addEventListener('bgm_setting_changed', onBgmChange);
    window.addEventListener('bgm_track_changed', onTrackChange);
    return () => {
      window.removeEventListener('bgm_setting_changed', onBgmChange);
      window.removeEventListener('bgm_track_changed', onTrackChange);
    };
  }, []);

  const toggleBgm = () => {
    const nextState = lobbyAudio.toggleMute();
    setBgmActive(nextState);
    window.dispatchEvent(new CustomEvent('bgm_setting_changed', { detail: { enabled: nextState } }));
  };

  const toggleBgmTrack = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextTrack: BgmTrackType = bgmTrack === 'tropical' ? 'royal_x' : 'tropical';
    setBgmTrack(nextTrack);
    lobbyAudio.setTrack(nextTrack);
  };

  useEffect(() => {
    const refreshCoins = () => {
      const savedUser = localStorage.getItem('domino_username');
      if (!savedUser) return;
      fetch(`${API_URL}/profile/${savedUser}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setProfile(d); })
        .catch(() => { });
    };
    window.addEventListener('domino_coins_updated', refreshCoins);
    return () => window.removeEventListener('domino_coins_updated', refreshCoins);
  }, []);

  useEffect(() => {
    const u = localStorage.getItem('domino_username');
    if (socket && u) socket.emit('register-user', { username: u });
  }, [socket]);

  useEffect(() => {
    const savedUser = localStorage.getItem('domino_username');
    if (!savedUser) return;
    fetch(`${API_URL}/profile/${savedUser}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setProfile(d);
          if (d.userId || d.id) localStorage.setItem('domino_user_id', String(d.userId || d.id));
          if (d.vipLevel !== undefined) localStorage.setItem('domino_vip', String(d.vipLevel));
          if (d.coins !== undefined) localStorage.setItem('domino_coins', String(d.coins));
          if (d.rp !== undefined) localStorage.setItem('domino_rp', String(d.rp));
          if (d.customFrame) localStorage.setItem('domino_custom_frame', d.customFrame);
          if (d.avatar && d.avatar !== '/bg.png') {
            setAvatarEmoji(d.avatar);
            localStorage.setItem('domino_avatar', d.avatar);
          }
        }
      })
      .catch(() => { });
    // Check inbox unread count
    fetch(`${API_URL}/inbox/${savedUser}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setInboxUnread(d.unreadCount ?? 0); })
      .catch(() => { });
    // Check daily bonus status
    fetch(`${API_URL}/bonus/status/${savedUser}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCanClaimBonus(!!d.canClaim); })
      .catch(() => { });
  }, []);

  const fmtCoins = (n: number) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const pop = (title: string, message: string) => setModal({ title, message });

  const confirmLogout = async () => {
    setShowLogout(false);
    await performFullLogout();
    onLogout();
  };

  const handleSaveAvatar = (newAvatar: string, newFrame?: string) => {
    setAvatarEmoji(newAvatar);
    localStorage.setItem('domino_avatar', newAvatar);
    if (newFrame) localStorage.setItem('domino_custom_frame', newFrame);
    setProfile((prev: any) => prev ? { ...prev, avatar: newAvatar, customFrame: newFrame || prev.customFrame } : prev);
    const u = localStorage.getItem('domino_username');
    const uid = localStorage.getItem('domino_user_id');
    if (u || uid) {
      fetch(`${API_URL}/users/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, userId: uid, avatar: newAvatar, frame: newFrame })
      }).catch(() => {});
    }
    setShowAvatarSelect(false);
  };

  // Ikon kanan atas
  const topRightIcons = [
    { label: 'Tukar', emoji: '🔄', msg: 'Tukar koin Anda dengan hadiah menarik!' },
    { label: 'Bagikan', emoji: '📤', msg: 'Bagikan game ini ke teman-teman Anda!' },
    { label: 'Bonus', emoji: '🎁', msg: 'Klaim bonus harian Anda!', hasNotif: canClaimBonus },
    { label: 'VIP', emoji: '👑', msg: 'Upgrade ke VIP untuk keuntungan eksklusif!' },
    { label: 'Masuk', emoji: '🎯', msg: 'Event login berhadiah!', hasNotif: true },
    { label: 'Event', emoji: '🎪', msg: 'Ikuti event spesial dan menangkan hadiah besar!' },
  ];

  // Mode game di grid kanan
  const games = [
    { name: 'Kamar Biasa', emoji: '🐸', bg: 'linear-gradient(135deg,#4fc3f7,#0288d1)', tag: '' },
    { name: 'Domino QQ', emoji: '🀱', bg: 'linear-gradient(135deg,#f9a825,#e65100)', tag: '' },
    { name: 'Lainnya', emoji: '🎮', bg: 'linear-gradient(135deg,#ab47bc,#6a1b9a)', tag: '' },
    { name: 'Poker & Remi', emoji: '♠️', bg: 'linear-gradient(135deg,#ef5350,#b71c1c)', tag: 'Event' },
    { name: 'Billiard', emoji: '🎱', bg: 'linear-gradient(135deg,#1b5e20,#004d40)', tag: 'New!' },
    { name: 'Slot', emoji: '🎰', bg: 'linear-gradient(135deg,#ffa726,#e65100)', tag: '' },
  ];

  // Ikon bawah
  const botIcons = [
    { label: 'VIP', emoji: '👑', msg: 'Keuntungan eksklusif anggota VIP!', hasNotif: false },
    { label: 'Brankas', emoji: '🏦', msg: 'Top up Rp 10.000 untuk membuka Brankas!', hasNotif: false },
    { label: 'Item', emoji: '🎒', msg: 'Koleksi item dan skin Anda.', hasNotif: false },
    { label: 'Peringkat', emoji: '⭐', msg: 'Lihat peringkat pemain terbaik!', hasNotif: false },
    { label: 'Hadiah', emoji: '🎀', msg: 'Ada hadiah menunggu Anda!', hasNotif: canClaimBonus, rpBadge: true },
    { label: 'Berita', emoji: '📰', msg: 'Baca berita dan update terbaru.', hasNotif: false },
    { label: 'Gardu', emoji: '⚡', msg: 'Pusat layanan dan dukungan.', hasNotif: false },
    { label: 'Inbox', emoji: '✉️', msg: 'Kotak pesan Anda.', hasNotif: inboxUnread > 0 },
  ];

  return (
    <div className="screen-wrapper home-bg">
      {/* ===== IMAGE BACKGROUND ===== */}
      <img className="lobby-video-bg" src="/assets/loby/lobby_bg.jpg" alt="" />

      {modal && <Modal title={modal.title} message={modal.message} onClose={() => setModal(null)} />}

      {/* Pengaturan Modal */}
      {showPengaturan && <PengaturanModal onClose={() => setShowPengaturan(false)} onLogout={() => { setShowPengaturan(false); onLogout(); }} onOpenBerita={() => setShowBerita(true)} />}

      {/* Rules Modal */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {/* Berita & Pengumuman Modal */}
      {showBerita && <BeritaModal onClose={() => setShowBerita(false)} />}

      {/* Customer Service Modal */}
      {showCS && <CSModal onClose={() => setShowCS(false)} />}

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal
          profile={profile}
          avatarEmoji={avatarEmoji}
          onOpenAvatarSelection={() => setShowAvatarSelect(true)}
          onOpenChangeName={() => setShowChangeNameModal(true)}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Change Name Modal (1x Free for New Users, 50K Coins thereafter) */}
      {showChangeNameModal && (
        <ChangeNameModal
          currentUsername={profile?.username || localStorage.getItem('domino_username') || ''}
          userCoins={profile?.coins || 0}
          userId={profile?.userId || profile?.id || localStorage.getItem('domino_user_id') || ''}
          onSuccess={(newName, updatedCoins) => {
            setProfile((prev: any) => ({
              ...prev,
              username: newName,
              coins: updatedCoins !== undefined ? updatedCoins : prev?.coins,
              nameChangeCount: (prev?.nameChangeCount || 0) + 1,
            }));
            setShowChangeNameModal(false);
          }}
          onClose={() => setShowChangeNameModal(false)}
        />
      )}

      {/* Avatar Selection Modal */}
      {showAvatarSelect && (
        <AvatarSelectionModal
          currentAvatar={avatarEmoji}
          onSelect={handleSaveAvatar}
          onClose={() => setShowAvatarSelect(false)}
        />
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <LeaderboardModal
          onClose={() => setShowLeaderboard(false)}
          onViewProfile={u => { setShowLeaderboard(false); setViewingProfileFromHome(u); }}
        />
      )}

      {/* Chat Modal */}
      {showChatModal && (
        <ChatModal
          socket={socket}
          onClose={() => setShowChatModal(false)}
          onViewProfile={u => { setShowChatModal(false); setViewingProfileFromHome(u); }}
        />
      )}

      {/* Inbox Modal */}
      {showInbox && (
        <InboxModal
          onClose={() => { setShowInbox(false); setInboxUnread(0); }}
          onViewProfile={u => setViewingProfileFromHome(u)}
        />
      )}

      {/* Daily Bonus Modal */}
      {showDailyBonus && (
        <DailyBonusModal
          onClose={() => setShowDailyBonus(false)}
          onBonusClaimed={(newCoins) => {
            setCanClaimBonus(false);
            setProfile((prev: any) => prev ? { ...prev, coins: newCoins } : prev);
          }}
        />
      )}

      {/* Teman Online Modal */}
      {showFriendModal && (
        <FriendModal
          socket={socket}
          onClose={() => setShowFriendModal(false)}
          onOpenKirimKoin={() => setShowKirimKoin(true)}
        />
      )}

      {/* Ajak Teman Modal */}
      {showAjakTeman && <AjakTemanModal onClose={() => setShowAjakTeman(false)} />}

      {/* Toko (Shop) Modal */}
      {showToko && (
        <TokoModal
          onClose={() => setShowToko(false)}
          onOpenKirimKoin={() => setShowKirimKoin(true)}
          onProfileUpdated={() => {
            const savedUser = localStorage.getItem('domino_username');
            if (savedUser) {
              fetch(`${API_URL}/profile/${savedUser}`)
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (d) { setProfile(d); if (d.avatar) setAvatarEmoji(d.avatar); } })
                .catch(() => { });
            }
          }}
        />
      )}

      {/* Kirim Koin Modal (VIP Feature) */}
      {showKirimKoin && (
        <KirimKoinModal
          onClose={() => setShowKirimKoin(false)}
          onOpenShop={() => setShowToko(true)}
          onOpenHistory={() => {
            setShowKirimKoin(false);
            setShowRiwayatTransfer(true);
          }}
          onCoinsTransferred={() => {
            const savedUser = localStorage.getItem('domino_username');
            if (savedUser) {
              fetch(`${API_URL}/profile/${savedUser}`)
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (d) setProfile(d); })
                .catch(() => { });
            }
          }}
        />
      )}

      {/* Riwayat Transfer Koin Modal */}
      {showRiwayatTransfer && (
        <RiwayatTransferModal
          onClose={() => setShowRiwayatTransfer(false)}
          onOpenSendCoins={() => {
            setShowRiwayatTransfer(false);
            setShowKirimKoin(true);
          }}
        />
      )}

      {/* Other Profile from Inbox */}
      {viewingProfileFromHome && (
        <OtherProfileModal
          username={viewingProfileFromHome}
          onClose={() => setViewingProfileFromHome(null)}
        />
      )}

      {/* Logout confirm */}
      {showLogout && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-title">Konfirmasi Logout</div>
            <div className="modal-message">Keluar dari akun <b>{profile?.username}</b>?</div>
            <div style={{ display: 'flex', gap: '2vw', justifyContent: 'center' }}>
              <button className="modal-close-btn cancel" onClick={() => setShowLogout(false)}>Batal</button>
              <button className="modal-close-btn danger" onClick={confirmLogout}>Ya, Keluar</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TOP BAR (V3) ===== */}
      <div className="home-topbar-v3">
        {/* Kiri: Avatar + User Info + VIP 3 */}
        <div className="ht-user-block">
          <div className="ht-avatar" onClick={() => setShowProfile(true)}>
            <span className="ht-avatar-img">
              {renderPlayerAvatar(avatarEmoji, '🐸', 'ht-avatar-pic')}
            </span>
            <div className="ht-avatar-ring" />
          </div>
          <div className="ht-user-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="ht-username">{profile?.username ?? 'Pemain'}</div>
              <button
                className="g-btn-press"
                onClick={() => setShowChangeNameModal(true)}
                title={(profile?.nameChangeCount || 0) === 0 ? "Ubah Nama (Gratis 1x untuk Pengguna Baru)" : "Ubah Nama (Biaya 50.000 Koin)"}
                style={{
                  background: (profile?.nameChangeCount || 0) === 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 215, 0, 0.25)',
                  border: (profile?.nameChangeCount || 0) === 0 ? '1px solid #10b981' : '1px solid rgba(255, 215, 0, 0.6)',
                  color: (profile?.nameChangeCount || 0) === 0 ? '#34d399' : '#ffd700',
                  borderRadius: '6px',
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  lineHeight: '1.2'
                }}
              >
                ✏️ {(profile?.nameChangeCount || 0) === 0 ? 'Gratis 1x' : '50K'}
              </button>
            </div>
            <div className="ht-userid" onClick={() => {
              const uid = profile?.userId || profile?.id || localStorage.getItem('domino_user_id') || '';
              if (uid) {
                navigator.clipboard.writeText(uid);
                alert(`ID ${uid} berhasil disalin!`);
              }
            }} style={{ cursor: 'pointer' }} title="Klik untuk salin ID">
              ID: {profile?.userId || profile?.id || localStorage.getItem('domino_user_id') || '...'} 📋
            </div>
          </div>
          <div className="ht-vip-pill" onClick={() => setShowKirimKoin(true)}>
            <span>VIP {profile?.vipLevel ?? 0}</span>
          </div>
        </div>

        {/* Tengah: Koin Display */}
        <div className="ht-coins-block">
          <span className="ht-coin-ico">🪙</span>
          <span className="ht-coin-val">{(profile?.coins ?? 1234567890).toLocaleString('id-ID')}</span>
          <button className="ht-coin-plus" onClick={() => setShowToko(true)}>+</button>
        </div>

        {/* Kanan: Quick Actions (Event, Inbox, Ranking, Setting, TOP UP) */}
        <div className="ht-actions-block">
          <button className="ht-act-btn" onClick={() => pop('Event', 'Ikuti event spesial berhadiah!')}>
            {/* Gift/Event icon */}
            <svg className="ht-act-ico-svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 6h-2.18c.07-.26.18-.5.18-.75C18 3.89 16.96 3 15.75 3c-.89 0-1.6.42-2.05 1.07L12 6.03l-1.7-1.96C9.85 3.42 9.14 3 8.25 3 7.04 3 6 3.89 6 5.25c0 .25.11.49.18.75H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-1.5c.41 0 .75.34.75.75S15.41 6 15 6c-.41 0-.75-.34-.75-.75s.34-.75.75-.75zM9 5.25c0-.41.34-.75.75-.75s.75.34.75.75S10.16 6 9.75 6c-.41 0-.75-.34-.75-.75zm3 7.75l-4-4h8l-4 4z" />
            </svg>
            <span className="ht-act-lbl">Event</span>
          </button>
          <button className="ht-act-btn" onClick={() => setShowInbox(true)}>
            {inboxUnread > 0 && <div className="ht-notif-dot" />}
            {/* Inbox/Mail icon */}
            <svg className="ht-act-ico-svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
            <span className="ht-act-lbl">Inbox</span>
          </button>
          <button className="ht-act-btn" onClick={() => setShowLeaderboard(true)}>
            {/* Crown/Ranking icon */}
            <svg className="ht-act-ico-svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
            </svg>
            <span className="ht-act-lbl">Ranking</span>
          </button>

          {/* Lobby BGM Quick Toggle Button & Track Switcher */}
          <div className="ht-bgm-group">
            <button
              className={`ht-act-btn ht-bgm-btn ${bgmActive ? 'on' : 'off'}`}
              onClick={toggleBgm}
              title={bgmActive ? "Musik Lobi Aktif (Klik untuk Matikan)" : "Musik Lobi Mati (Klik untuk Nyalakan)"}
            >
              <span className={`ht-act-ico ${bgmActive ? 'ht-bgm-icon-anim' : ''}`} style={{ fontSize: '2.1vh' }}>
                {bgmActive ? '🎵' : '🔇'}
              </span>
              <span className="ht-act-lbl">
                {bgmActive ? 'BGM ON' : 'BGM OFF'}
              </span>
            </button>
            <button
              className={`ht-bgm-track-pill g-btn-press ${bgmTrack === 'royal_x' ? 'gold' : ''}`}
              onClick={toggleBgmTrack}
              title="Klik untuk ganti lagu: Tropis vs Lagu Kita"
            >
              <span className="ht-bgm-pill-ico">{bgmTrack === 'tropical' ? '🎵' : '👑'}</span>
              <span className="ht-bgm-pill-txt">{bgmTrack === 'tropical' ? 'Tropis' : 'Lagu Kita'}</span>
            </button>
          </div>

          <button className="ht-act-btn" onClick={() => setShowPengaturan(true)}>
            {/* Settings/Gear icon */}
            <svg className="ht-act-ico-svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
            </svg>
            <span className="ht-act-lbl">Setting</span>
          </button>

          {/* Berita & Pengumuman Button */}
          <button className="ht-act-btn ht-berita-btn" onClick={() => setShowBerita(true)} title="Berita & Pengumuman Game">
            {/* Newspaper / Document icon */}
            <svg className="ht-act-ico-svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H5c-.55 0-1-.45-1-1s.45-1 1-1h14c.55 0 1 .45 1 1s-.45 1-1 1zm0-4H5c-.55 0-1-.45-1-1s.45-1 1-1h14c.55 0 1 .45 1 1s-.45 1-1 1zm0-4H5c-.55 0-1-.45-1-1s.45-1 1-1h14c.55 0 1 .45 1 1s-.45 1-1 1z" />
            </svg>
            <span className="ht-act-lbl">Berita</span>
          </button>

          {/* Glowing TOP UP Button — gold/coin style */}
          <button className="ht-topup-btn" onClick={() => setShowToko(true)}>
            {/* Coin stack SVG icon */}
            <svg className="ht-topup-ico-svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
            </svg>
            <span className="ht-topup-txt">TOP UP</span>
          </button>

          <button
            className={`ht-menu-burger ${showRightSidebar ? 'active' : ''}`}
            onClick={() => setShowRightSidebar(v => !v)}
            title="Menu"
            aria-label="Menu"
          >
            <span className="ht-burger-bar"></span>
            <span className="ht-burger-bar"></span>
            <span className="ht-burger-bar"></span>
          </button>
        </div>

        {/* Right Sidebar Dropdown */}
        <div className={`hb-right-sidebar ${showRightSidebar ? 'open' : ''}`}>
          <div className="hb-rs-item" onClick={() => { setShowRightSidebar(false); setShowKirimKoin(true); }}>
            <span className="hb-rs-icon">🎁</span>
            <span className="hb-rs-label">Kirim Koin</span>
          </div>
          <div className="hb-rs-item" onClick={() => { setShowRightSidebar(false); setShowRiwayatTransfer(true); }}>
            <span className="hb-rs-icon">📜</span>
            <span className="hb-rs-label">Riwayat Koin</span>
          </div>
          <div className="hb-rs-item" onClick={() => { setShowRightSidebar(false); setShowCS(true); }}>
            <span className="hb-rs-icon">💬</span>
            <span className="hb-rs-label">CS</span>
          </div>
          <div className="hb-rs-item" onClick={() => { setShowRightSidebar(false); setShowRules(true); }}>
            <span className="hb-rs-icon">📖</span>
            <span className="hb-rs-label">Rules</span>
          </div>
          <div className="hb-rs-item" onClick={() => { setShowRightSidebar(false); setShowBerita(true); }}>
            <span className="hb-rs-icon">📰</span>
            <span className="hb-rs-label">Berita & Info</span>
          </div>
          <div className="hb-rs-item logout" onClick={() => { setShowRightSidebar(false); setShowLogout(true); }}>
            <span className="hb-rs-icon">🚪</span>
            <span className="hb-rs-label">Keluar</span>
          </div>
        </div>
        {showRightSidebar && <div className="hb-rs-backdrop" onClick={() => setShowRightSidebar(false)} />}
      </div>

      {/* ===== MAIN BODY V3 ===== */}
      <div className="home-body-v3">

        {/* SIDEBAR KIRI (Beranda, Turnamen, Misi, Hadiah, VIP) */}
        {/* SIDEBAR KIRI (Beranda, Turnamen, Misi, Hadiah, VIP) */}
        <div className="home-sidebar-v3">
          <button className="hs-nav-btn active">
            <span className="hs-nav-ico">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            </span>
            <span className="hs-nav-lbl">Beranda</span>
          </button>
          <button className="hs-nav-btn" onClick={() => pop('Turnamen', 'Ikuti turnamen resmi berhadiah!')}>
            <span className="hs-nav-ico">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM7 10.82C5.84 10.4 5 9.3 5 8V7h2v3.82zM19 8c0 1.3-.84 2.4-2 2.82V7h2v1z" /></svg>
            </span>
            <span className="hs-nav-lbl">Turnamen</span>
          </button>
          <button className="hs-nav-btn" onClick={() => pop('Misi', 'Selesaikan misi harian!')}>
            <span className="hs-nav-ico">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" /></svg>
            </span>
            <span className="hs-nav-lbl">Misi</span>
          </button>
          <button className="hs-nav-btn" onClick={() => setShowDailyBonus(true)}>
            {canClaimBonus && <div className="hs-notif-dot" />}
            <span className="hs-nav-ico">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" /></svg>
            </span>
            <span className="hs-nav-lbl">Hadiah</span>
          </button>
          <button className="hs-nav-btn" onClick={() => setShowKirimKoin(true)}>
            <span className="hs-nav-ico">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l-3.09 8H2l6.18 4.77L5.82 22 12 17.27 18.18 22l-2.36-7.23L22 10h-6.91L12 2z" /></svg>
            </span>
            <span className="hs-nav-lbl">VIP</span>
          </button>
        </div>

        {/* CENTER CONTENT AREA */}
        <div className="home-center-v3">

          {/* GOLD RIBBON BANNER HEADER */}
          <div className="home-ribbon-banner">
            <div className="hrb-title">PLAY MORE 👑 WIN BIGGER</div>
            <div className="hrb-sub">SATU APLIKASI • EMPAT PERMAINAN SERU</div>
          </div>

          {/* 4 FEATURED GAME CARDS ROW — ULTRA LIGHTWEIGHT & FAST */}
          <div className="home-cards-row-v3">

            {/* CARD 1: SLOT */}
            <div className="home-game-card-v3 card-slot" onClick={() => setShowSlotPopup(true)}>
              <div className="hgc-img-wrapper">
                <img className="hgc-bg-img" src="/assets/home/card_slot_hero.jpg" alt="Slot" loading="eager" decoding="async" />
                <div className="hgc-video-overlay slot-overlay" />
              </div>
              <div className="hgc-shine" />
              <div className="hgc-info">
                <div className="hgc-badge badge-slot">🔥 HOT</div>
                <div className="hgc-title title-slot">SLOT</div>
                <div className="hgc-sub">SPIN • JACKPOT • BIG WIN</div>
              </div>
            </div>

            {/* CARD 2: BILLAR */}
            <div className="home-game-card-v3 card-billar" onClick={() => {
              const usable = Math.max(0, (profile?.coins || 0) - (profile?.bonusCoins || 0));
              if (usable < 50000 && (profile?.bonusCoins || 0) > 0 && (profile?.coins || 0) >= 50000) {
                setModal({
                  title: 'Koin Bonus Khusus Slot',
                  message: `⚠️ Koin dari klaim bonus harian (${(profile?.bonusCoins || 0).toLocaleString('id-ID')} koin) hanya dapat dimainkan di SLOT!\n\nKoin biliar Anda: ${usable.toLocaleString('id-ID')} koin (Butuh minimal 50.000 koin untuk masuk meja biliar).`
                });
                return;
              }
              onNavigate('billiard-game');
            }}>
              <div className="hgc-img-wrapper">
                <img className="hgc-bg-img" src="/assets/home/card_billiard_hero.jpg" alt="Billiard" loading="eager" decoding="async" />
                <div className="hgc-video-overlay billar-overlay" />
              </div>
              <div className="hgc-shine" />
              <div className="hgc-info">
                <div className="hgc-badge badge-billar">⭐ POPULER</div>
                <div className="hgc-title title-billar">BILLIARD</div>
                <div className="hgc-sub">8-BALL POOL • VIP TOURNAMENT</div>
              </div>
            </div>

            {/* CARD 3: QIUQIU */}
            <div className="home-game-card-v3 card-qiuqiu" onClick={() => setShowQiuQiuRoomModal(true)}>
              <div className="hgc-img-wrapper">
                <img className="hgc-bg-img" src="/assets/home/card_qiuqiu_hero.jpg" alt="QiuQiu" loading="eager" decoding="async" />
                <div className="hgc-video-overlay qiuqiu-overlay" />
              </div>
              <div className="hgc-shine" />
              <div className="hgc-info">
                <div className="hgc-badge badge-qiuqiu">💰 JACKPOT</div>
                <div className="hgc-title title-qiuqiu">QIUQIU</div>
                <div className="hgc-sub">STRATEGI • FOKUS • MENANG</div>
              </div>
            </div>

            {/* CARD 4: DOMINO */}
            <div className="home-game-card-v3 card-domino" onClick={() => {
              const usable = Math.max(0, (profile?.coins || 0) - (profile?.bonusCoins || 0));
              if (usable < 10000 && (profile?.bonusCoins || 0) > 0 && (profile?.coins || 0) >= 10000) {
                setModal({
                  title: 'Koin Bonus Khusus Slot',
                  message: `⚠️ Koin dari klaim bonus harian (${(profile?.bonusCoins || 0).toLocaleString('id-ID')} koin) hanya dapat dimainkan di SLOT!\n\nKoin umum Domino Anda: ${usable.toLocaleString('id-ID')} koin (Butuh minimal 10.000 koin untuk modal kamar Domino).`
                });
                return;
              }
              onNavigate('kamar-lobby', 'Biasa');
            }}>
              <div className="hgc-img-wrapper">
                <img className="hgc-bg-img" src="/assets/home/card_domino_hero.jpg" alt="Domino" loading="eager" decoding="async" />
                <div className="hgc-video-overlay domino-overlay" />
              </div>
              <div className="hgc-shine" />
              <div className="hgc-info">
                <div className="hgc-badge badge-domino">🐉 EPIC</div>
                <div className="hgc-title title-domino">DOMINO</div>
                <div className="hgc-sub">SANTAI • SERU • PENUH STRATEGI</div>
              </div>
            </div>

          </div>

          {/* BOTTOM 3 FEATURE BANNERS — ENHANCED */}
          <div className="home-feature-banners-v3">

            {/* Left: DAILY BONUS */}
            <div className="hfb-card hfb-bonus" onClick={() => setShowDailyBonus(true)}>
              <div className="hfb-img-wrap">
                <img src="/assets/loby/chest_bonus.jpg" alt="Daily Bonus" className="hfb-img" />
              </div>
              <div className="hfb-text">
                <div className="hfb-title hfb-gold-bright">DAILY BONUS</div>
                <div className="hfb-sub">Login Setiap Hari</div>
                <div className="hfb-sub">Dapatkan Hadiah Menarik</div>
              </div>
            </div>

            {/* Center: TURNAMEN */}
            <div className="hfb-card hfb-turnamen" onClick={() => pop('Turnamen', 'Ikuti turnamen dan dapatkan hadiah hingga 100M koin!')}>
              <div className="hfb-img-wrap">
                <img src="/assets/loby/golden_trophy.jpg" alt="Turnamen" className="hfb-img" />
              </div>
              <div className="hfb-text">
                <div className="hfb-title hfb-gold-bright">TURNAMEN</div>
                <div className="hfb-sub">Ikuti Turnamen</div>
                <div className="hfb-sub">Menangkan Hadiah Fantastis</div>
                <button className="hfb-btn red-btn">IKUTI SEKARANG</button>
              </div>
            </div>

            {/* Right: AJAK TEMAN */}
            <div className="hfb-card hfb-ajak" onClick={() => setShowAjakTeman(true)}>
              <div className="hfb-img-wrap">
                <img src="/assets/loby/gift_boxes.jpg" alt="Ajak Teman" className="hfb-img" />
              </div>
              <div className="hfb-text">
                <div className="hfb-title hfb-gold-bright">AJAK TEMAN</div>
                <div className="hfb-sub">Dapatkan Bonus Koin</div>
                <div className="hfb-sub">Tanpa Batas</div>
                <button className="hfb-btn green-btn">AJAK SEKARANG</button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ===== BOTTOM BAR V3 ===== */}
      <div className="home-bottombar-v3">
        {/* Background Shapes for Slanted effect */}
        <div className="hb3-border" />
        <div className="hb3-bg" />

        <div className="hb3-nav-left">
          <button className="hb3-nav-btn active">
            <span className="hb3-ico">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            </span>
            <span className="hb3-lbl">Beranda</span>
          </button>
          <button className="hb3-nav-btn" onClick={() => setShowByOneRoomModal(true)}>
            <span className="hb3-ico">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.92 5h-.01L4 7.91l2.92 2.92-1.42 1.42L2.59 9.33a1.996 1.996 0 0 1 0-2.83l3.5-3.5c.78-.78 2.05-.78 2.83 0l2.92 2.92-1.42 1.42L7.5 4.41l-.58.59zm12.67 4.33l-1.42-1.42 2.92-2.92-.58-.59-2.92 2.92-1.42-1.42 2.92-2.92a1.996 1.996 0 0 1 2.83 0l3.5 3.5c.78.78.78 2.05 0 2.83l-2.91 2.92-2.92-2.92zm-7.66 1.34l-1.41-1.41 7.07-7.07 1.41 1.41-7.07 7.07zm-4.95 4.95l1.41 1.41-5.66 5.66-1.41-1.41 5.66-5.66zM20 20.59l-1.41 1.41-5.66-5.66 1.41-1.41 5.66 5.66zm-7.07-7.07l1.41 1.41-7.07 7.07-1.41-1.41 7.07-7.07z" />
              </svg>
            </span>
            <span className="hb3-lbl" style={{ color: '#ff7675', fontWeight: 'bold' }}>By One ⚔️</span>
          </button>
          <button className="hb3-nav-btn" onClick={() => setShowFriendModal(true)}>
            <span className="hb3-ico">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
            </span>
            <span className="hb3-lbl">Teman</span>
          </button>
          <button className="hb3-nav-btn" onClick={() => setShowChatModal(true)}>
            <span className="hb3-ico">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 9H6V9h12v2zm0-3H6V6h12v2z" /></svg>
            </span>
            <span className="hb3-lbl">Chat</span>
          </button>
          <button className="hb3-nav-btn" onClick={() => setShowLeaderboard(true)}>
            <span className="hb3-ico">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v2c0 2.21 1.79 4 4 4 .19 0 .37-.02.55-.05C8.36 12.59 10 14 12 14s3.64-1.41 4.45-3.05c.18.03.36.05.55.05 2.21 0 4-1.79 4-4V5c0-1.1-.9-2-2-2zm-2 4H7V5h10v2zm-5 5c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2zm7-5h-2v2c0 1.1-.9 2-2 2-.19 0-.37-.02-.55-.05C15.64 8.59 14 7 12 7s-3.64 1.41-4.45 3.05c-.18.03-.36.05-.55.05-1.1 0-2-.9-2-2V7H5V5h14v2zm-5 13v-3h-4v3H8v2h8v-2h-2z" /></svg>
            </span>
            <span className="hb3-lbl">Leaderboard</span>
          </button>
          <button className="hb3-nav-btn" onClick={() => setShowToko(true)}>
            <span className="hb3-ico">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" /></svg>
            </span>
            <span className="hb3-lbl">Toko</span>
          </button>
        </div>
        <div className="hb3-nav-right">
          <div className="hb3-slogan-slash"></div>
          <div className="hb3-slogan">
            <div>GOOD GAME</div>
            <div>GOOD FRIENDS</div>
          </div>
        </div>
      </div>
      {/* SLOT GAMES POPUP MODAL */}
      {showSlotPopup && (
        <SlotGamesModal
          onClose={() => {
            setShowSlotPopup(false);
            onClearSlotPopup?.();
          }}
          onPlaySlot={(gameId) => {
            const COMING_SOON = ['duofugrand', 'duofuduocai', 'superace', 'speedwinner', 'yingcaishen', 'richmine'];
            if (COMING_SOON.includes(gameId)) {
              alert('Game slot ini sedang dalam pengembangan (Coming Soon)!');
              return;
            }
            setShowSlotPopup(false);
            onClearSlotPopup?.();
            if (gameId === 'zeus') onNavigate('zeus-game');
            else if (gameId === 'fafafa2') onNavigate('fafafa-game');
            else if (gameId === 'mahjong2') onNavigate('mahjong2-game');
            else if (gameId === 'gatotkaca') onNavigate('gatokaca-game');
            else if (gameId === '5lions') onNavigate('fivelions-game');
            else if (gameId === 'jinjibaoxi') onNavigate('jinji-game');
            else if (gameId === 'wildwest') onNavigate('wildwest-game');
            else if (gameId === 'candyrush') onNavigate('candy-game');
          }}
        />
      )}

      {/* BY ONE ROOM MODAL (ADU TARUHAN) */}
      {showByOneRoomModal && (
        <ByOneRoomModal
          onClose={() => setShowByOneRoomModal(false)}
          socket={socket}
          onLaunchGame={(mode, bet, players, code) => {
            setShowByOneRoomModal(false);
            const myU = localStorage.getItem('domino_username') || 'Player';
            const otherPlayers = (players || []).filter((p: any) => p.username !== myU);
            const oppName = otherPlayers.length > 0 ? otherPlayers[0].username : null;

            const extra = {
              byone: true,
              bet,
              players,
              code,
              opponent: oppName,
            };

            if (mode === 'billiard') {
              onNavigate('billiard-game', null, extra);
            } else if (mode === 'qiuqiu') {
              onNavigate('qiuqiu-game', null, extra);
            } else {
              onNavigate('byone-game', oppName, extra);
            }
          }}
        />
      )}

      {/* QIUQIU ROOM SELECTION MODAL */}
      {showQiuQiuRoomModal && (
        <QiuQiuRoomModal
          onClose={() => setShowQiuQiuRoomModal(false)}
          userCoins={Math.max(0, (profile?.coins || 0) - (profile?.bonusCoins || 0))}
          onSelectRoom={async (room) => {
            const usable = Math.max(0, (profile?.coins || 0) - (profile?.bonusCoins || 0));
            if (usable < room.buyIn) {
              setModal({
                title: 'Koin Bonus Khusus Slot',
                message: `⚠️ Koin dari klaim bonus harian (${(profile?.bonusCoins || 0).toLocaleString('id-ID')} koin) hanya dapat dimainkan di SLOT!\n\nKoin umum QiuQiu Anda: ${usable.toLocaleString('id-ID')} koin (Butuh: ${room.buyIn.toLocaleString('id-ID')} koin).`
              });
              return;
            }
            setShowQiuQiuRoomModal(false);
            const savedUser = localStorage.getItem('domino_username');
            if (savedUser) {
              try {
                await fetch(`${API_URL}/users/update-coins`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username: savedUser, amount: -room.buyIn, gameType: 'qiuqiu' }),
                });
                setProfile((prev: any) => prev ? { ...prev, coins: Math.max(0, prev.coins - room.buyIn) } : prev);
              } catch (e) {
                console.error('Failed to deduct buy-in:', e);
              }
            }
            onNavigate('qiuqiu-game', room);
          }}
        />
      )}

    </div>
  );
}

// =====================================================
// DATA & INTERFACE UNTUK KAMAR LOBBY
// =====================================================
export interface Room {
  id: string;
  name: string;
  entryFee: number;
  entryLabel: string;
  coinsRange: string;
  playersCount: number;
  img?: string;
  tierName?: string;
  badge?: string;
}

export const LOBBY_ROOMS: Record<string, Room[]> = {
  Biasa: [
    { id: 'biasa_1', name: 'Kamar Biasa 5K', entryFee: 5000, entryLabel: '5K', coinsRange: '100K-1M', playersCount: 12852, img: '/assets/loby/room_pemula_decor.jpg', tierName: 'PEMULA', badge: '🔥 POPULER' },
    { id: 'biasa_2', name: 'Kamar Biasa 20K', entryFee: 20000, entryLabel: '20K', coinsRange: '500K-5M', playersCount: 8103, img: '/assets/loby/room_menengah_decor.jpg', tierName: 'MENENGAH', badge: '⭐ SERU' },
    { id: 'biasa_3', name: 'Kamar Biasa 50K', entryFee: 50000, entryLabel: '50K', coinsRange: '1M-10M', playersCount: 15482, img: '/assets/loby/room_master_decor.jpg', tierName: 'MASTER', badge: '👑 HOT' },
    { id: 'biasa_4', name: 'Kamar Biasa 200K', entryFee: 200000, entryLabel: '200K', coinsRange: '4M-50M', playersCount: 4923, img: '/assets/loby/room_sultan_decor.jpg', tierName: 'SULTAN', badge: '💎 VIP' },
  ],
  Bet: [
    { id: 'bet_1', name: 'Kamar Bet 20K', entryFee: 20000, entryLabel: '20K', coinsRange: '500K-5M', playersCount: 27886, img: '/assets/loby/room_pemula_decor.jpg', tierName: 'BRONZE', badge: 'RAMAI' },
    { id: 'bet_2', name: 'Kamar Bet 50K', entryFee: 50000, entryLabel: '50K', coinsRange: '1M-10M', playersCount: 8560, img: '/assets/loby/room_menengah_decor.jpg', tierName: 'SILVER', badge: 'POPULER' },
    { id: 'bet_3', name: 'Kamar Bet 100K', entryFee: 100000, entryLabel: '100K', coinsRange: '5M-20M', playersCount: 6647, img: '/assets/loby/room_master_decor.jpg', tierName: 'GOLD', badge: 'HOT' },
    { id: 'bet_4', name: 'Kamar Bet 200K', entryFee: 200000, entryLabel: '200K', coinsRange: '10M+', playersCount: 8176, img: '/assets/loby/room_sultan_decor.jpg', tierName: 'PLATINUM', badge: 'VIP' },
  ],
  Wild: [
    { id: 'wild_1', name: 'Kamar Wild 150K', entryFee: 150000, entryLabel: '150K', coinsRange: '1M-8M', playersCount: 65883, img: '/assets/loby/room_pemula_decor.jpg', tierName: 'WILD 1', badge: 'HOT' },
    { id: 'wild_2', name: 'Kamar Wild 500K', entryFee: 500000, entryLabel: '500K', coinsRange: '5M-30M', playersCount: 18405, img: '/assets/loby/room_menengah_decor.jpg', tierName: 'WILD 2', badge: 'SERU' },
    { id: 'wild_3', name: 'Kamar Wild 2M', entryFee: 2000000, entryLabel: '2M', coinsRange: '20M+', playersCount: 14370, img: '/assets/loby/room_master_decor.jpg', tierName: 'WILD 3', badge: 'SULTAN' },
    { id: 'wild_4', name: 'Kamar Wild VIP', entryFee: 2000000, entryLabel: '2M', coinsRange: '20M+', playersCount: 14402, img: '/assets/loby/room_sultan_decor.jpg', tierName: 'WILD VIP', badge: 'JACKPOT' },
  ],
  '5 Kartu': [
    { id: 'card5_1', name: '5 Kartu 10K', entryFee: 10000, entryLabel: '10K', coinsRange: '1M-10M', playersCount: 1769, img: '/assets/loby/room_pemula_decor.jpg', tierName: 'PEMULA', badge: 'POPULER' },
    { id: 'card5_2', name: '5 Kartu 60K', entryFee: 60000, entryLabel: '60K', coinsRange: '8M+', playersCount: 1109, img: '/assets/loby/room_menengah_decor.jpg', tierName: 'PRO', badge: 'SERU' },
    { id: 'card5_3', name: '5 Kartu 60K Pro', entryFee: 60000, entryLabel: '60K', coinsRange: '8M+', playersCount: 1169, img: '/assets/loby/room_master_decor.jpg', tierName: 'MASTER', badge: 'HOT' },
    { id: 'card5_4', name: '5 Kartu 60K Elite', entryFee: 60000, entryLabel: '60K', coinsRange: '8M+', playersCount: 1100, img: '/assets/loby/room_sultan_decor.jpg', tierName: 'ELITE', badge: 'VIP' },
  ],
  Tantangan: [
    { id: 'tantang_1', name: 'Tantangan 20M', entryFee: 20000000, entryLabel: '20M', coinsRange: 'Turnamen Tantangan', playersCount: 23086, img: '/assets/loby/room_master_decor.jpg', tierName: 'TURNAMEN', badge: 'TROFI' },
    { id: 'tantang_2', name: 'Tantangan 50M', entryFee: 50000000, entryLabel: '50M', coinsRange: 'Turnamen Tantangan', playersCount: 5567, img: '/assets/loby/room_master_decor.jpg', tierName: 'CHAMPION', badge: 'SERU' },
    { id: 'tantang_3', name: 'Tantangan 100M', entryFee: 100000000, entryLabel: '100M', coinsRange: 'Turnamen Tantangan', playersCount: 9592, img: '/assets/loby/room_sultan_decor.jpg', tierName: 'GRAND', badge: 'SULTAN' },
    { id: 'tantang_4', name: 'Tantangan 100M Final', entryFee: 100000000, entryLabel: '100M', coinsRange: 'Turnamen Tantangan', playersCount: 9518, img: '/assets/loby/room_sultan_decor.jpg', tierName: 'FINAL', badge: 'ROYAL' },
  ],
};

// =====================================================
// KOMPONEN VISUAL KARTU DOMINO 3D (GAPLE)
// =====================================================
function DominoTile({ left, right, onClick, isPlayable, isSelected, isBack = false, isRotated = false, isSmall = false, isFlipping3D = false }: {
  left: number;
  right: number;
  onClick?: () => void;
  isPlayable?: boolean;
  isSelected?: boolean;
  isBack?: boolean;
  isRotated?: boolean;
  isSmall?: boolean;
  isFlipping3D?: boolean;
}) {
  const renderHalf = (val: number) => {
    const dotMap: Record<number, number[]> = {
      0: [],
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8]
    };
    const activeDots = dotMap[val] || [];
    return (
      <div className="domino-half">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx} className={`domino-pip-cell ${activeDots.includes(idx) ? 'active' : ''}`} />
        ))}
      </div>
    );
  };

  if (isBack) {
    return (
      <div className={`domino-3d-wrapper ${isSmall ? 'small' : ''} ${isFlipping3D ? 'flip-3d' : ''}`}>
        <div className="domino-tile back">
          <div className="domino-back-pattern" />
        </div>
      </div>
    );
  }

  return (
    <div className={`domino-3d-wrapper ${isRotated ? 'rotated' : ''} ${isSmall ? 'small' : ''} ${isFlipping3D ? 'flip-3d' : ''}`}>
      <div
        className={`domino-tile ${isPlayable ? 'playable' : ''} ${isSelected ? 'selected' : ''} g-btn-press`}
        onClick={onClick}
      >
        <div className="domino-gloss" />
        <div className={`domino-face ${isRotated ? 'horizontal' : 'vertical'}`}>
          {renderHalf(left)}
          <div className="domino-divider-line" />
          {renderHalf(right)}
        </div>
      </div>
    </div>
  );
}



// =====================================================
// MODAL UNDANG TEMAN SETIM (Domino Partner)
// =====================================================
function InviteTeammateModal({ onClose, onSendInvite, myUsername }: { onClose: () => void; onSendInvite: (targetUser: string) => void; myUsername: string }) {
  const [inputName, setInputName] = useState('');
  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/users`)
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        if (Array.isArray(list)) {
          setUsersList(list.filter((u: any) => u.username !== myUsername));
        }
      })
      .catch(() => { });
  }, [myUsername]);

  return (
    <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1300 }} onClick={onClose}>
      <div className="peng-box tm-box-bounce" style={{ maxWidth: '52vw' }} onClick={e => e.stopPropagation()}>
        <div className="peng-header">
          <span>👥</span><span className="peng-header-title">Undang Teman Setim (Partner 2v2)</span><span>👥</span>
        </div>
        <button className="peng-close g-btn-press" onClick={onClose}>✖</button>

        <div style={{ padding: '2vh 2vw', display: 'flex', flexDirection: 'column', gap: '1.5vh' }}>
          <div style={{ display: 'flex', gap: '1vw' }}>
            <input
              type="text"
              placeholder="Ketik username teman..."
              value={inputName}
              onChange={e => setInputName(e.target.value)}
              style={{
                flex: 1,
                padding: '1vh 1.2vw',
                borderRadius: '10px',
                border: '1.5px solid #f1c40f',
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                fontSize: '1.6vh'
              }}
            />
            <button
              className="victory-action-btn g-btn-press restart"
              onClick={() => {
                if (inputName.trim()) {
                  onSendInvite(inputName.trim());
                  setInputName('');
                }
              }}
            >
              Kirim
            </button>
          </div>

          <div style={{ fontSize: '1.5vh', color: '#f1c40f', fontWeight: 'bold', marginTop: '1vh' }}>
            Pilih Dari Daftar Pemain / Teman Online:
          </div>

          <div style={{ maxHeight: '30vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1vh' }}>
            {usersList.length === 0 ? (
              <div style={{ color: '#aaa', textAlign: 'center', padding: '2vh' }}>Belum ada pemain lain registered.</div>
            ) : (
              usersList.map((u: any) => (
                <div key={u.username} className="peng-update-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1vw' }}>
                    <span style={{ fontSize: '2.5vh' }}>🐸</span>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{u.username}</div>
                      <div style={{ fontSize: '1.2vh', color: '#aaa' }}>Koin: {u.coins ? u.coins.toLocaleString() : 0}</div>
                    </div>
                  </div>
                  <button
                    className="victory-action-btn g-btn-press restart"
                    style={{ padding: '0.5vh 1.5vw', fontSize: '1.3vh' }}
                    onClick={() => onSendInvite(u.username)}
                  >
                    Undang +
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// NOTIFIKASI MELAYANG KEREN (Floating Toast Notification)
// =====================================================
function FloatingToastNotification({
  message,
  onClose
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  const getIcon = () => {
    if (message.includes('tidak online') || message.includes('⚠️') || message.includes('gagal') || message.includes('tidak cukup')) return '⚠️';
    if (message.includes('🎉') || message.includes('berhasil') || message.includes('terbentuk')) return '🎉';
    if (message.includes('🔑') || message.includes('Kode')) return '🔑';
    if (message.includes('ℹ️') || message.includes('menolak')) return 'ℹ️';
    return '💬';
  };

  return (
    <div className="floating-toast-container g-btn-press" onClick={onClose}>
      <div className="toast-icon-circle">
        {getIcon()}
      </div>
      <div className="toast-message-text">
        {message}
      </div>
      <span className="toast-close-x">✕</span>
    </div>
  );
}

// =====================================================
// MODAL MASUKKAN KODE TIM (Join by Code - VIP PIN Slots)
// =====================================================
function JoinTeamCodeModal({ onClose, onJoinCode }: { onClose: () => void; onJoinCode: (code: string) => void }) {
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const digits = code.padEnd(6, '').split('');

  return (
    <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1350 }} onClick={onClose}>
      <div className="peng-box tm-box-bounce" style={{ maxWidth: '46vw', textAlign: 'center', border: '2px solid #f1c40f' }} onClick={e => e.stopPropagation()}>
        <div className="peng-header" style={{ background: 'linear-gradient(180deg, #d35400, #a04000)' }}>
          <span>🔑</span><span className="peng-header-title">MASUK DENGAN KODE TIM (6 DIGIT)</span><span>🔑</span>
        </div>
        <button className="peng-close g-btn-press" onClick={onClose}>✖</button>

        <div style={{ padding: '2.5vh 2vw', display: 'flex', flexDirection: 'column', gap: '2vh', alignItems: 'center' }}>
          <div style={{ color: '#ddd', fontSize: '1.6vh', fontWeight: 600 }}>
            Masukkan 6 digit Kode Lobby Tim milik teman Anda:
          </div>

          {/* Interactive 6-Digit PIN Slot Display */}
          <div className="pin-input-container g-btn-press" onClick={() => inputRef.current?.focus()}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              className="pin-input-hidden"
              autoFocus
            />
            {Array.from({ length: 6 }).map((_, idx) => {
              const char = digits[idx] || '';
              const isFilled = Boolean(char);
              const isActive = code.length === idx;
              return (
                <div key={idx} className={`pin-digit-box ${isFilled ? 'filled' : ''} ${isActive ? 'active' : ''}`}>
                  {char || '•'}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '1.5vw', marginTop: '1vh' }}>
            <button
              className="victory-action-btn g-btn-press restart"
              style={{ padding: '1.2vh 3.5vw', fontSize: '1.8vh', background: 'linear-gradient(180deg, #f39c12, #d35400)', border: '1.5px solid #f1c40f' }}
              onClick={() => {
                if (code.length === 6) {
                  onJoinCode(code);
                } else {
                  alert('Kode Tim harus 6 digit angka.');
                }
              }}
            >
              🚀 Masuk Tim Sekarang
            </button>
            <button
              className="victory-action-btn g-btn-press close"
              style={{ padding: '1.2vh 2.5vw', fontSize: '1.8vh' }}
              onClick={onClose}
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MODAL MENUNGGU KONFIRMASI UNDANGAN (Pending Pop-up)
// =====================================================
function InvitePendingModal({ targetUser, onCancel }: { targetUser: string; onCancel: () => void }) {
  return (
    <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1350 }}>
      <div className="peng-box tm-box-bounce" style={{ maxWidth: '45vw', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div className="peng-header">
          <span>✉️</span><span className="peng-header-title">Mengundang Pemain...</span><span>✉️</span>
        </div>
        <div style={{ padding: '2.5vh 2vw', display: 'flex', flexDirection: 'column', gap: '2vh', alignItems: 'center' }}>
          <div style={{ fontSize: '3.5vh', animation: 'spin 2s linear infinite' }}>⌛</div>
          <div style={{ fontSize: '1.8vh', color: '#fff' }}>
            Undangan telah dikirim ke <b style={{ color: '#f1c40f' }}>{targetUser}</b>.
            <br />
            <span style={{ fontSize: '1.4vh', color: '#aaa' }}>Menunggu respon konfirmasi teman...</span>
          </div>
          <button className="victory-action-btn g-btn-press close" style={{ padding: '0.8vh 2.5vw', fontSize: '1.5vh' }} onClick={onCancel}>
            Batal Undangan ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MODAL KONFIRMASI KELUAR LOBBY (VIP Exit Confirm Modal)
// =====================================================
function ExitConfirmModal({
  onConfirm,
  onCancel,
  hasPartner
}: {
  onConfirm: () => void;
  onCancel: () => void;
  hasPartner: boolean;
}) {
  return (
    <div className="exit-modal-overlay" onClick={onCancel}>
      <div className="exit-modal-box" onClick={e => e.stopPropagation()}>
        <div className="exit-modal-header">
          <span>🚪</span><span>KONFIRMASI KELUAR LOBBY</span><span>🚪</span>
        </div>
        <button className="peng-close g-btn-press" onClick={onCancel}>✖</button>

        <div className="exit-modal-body">
          <div className="exit-modal-icon-badge">
            🚪
          </div>

          <div className="exit-modal-text">
            Apakah Anda yakin ingin keluar dari Kamar Lobby ke Menu Utama?
            {hasPartner && (
              <div className="exit-modal-warning-box">
                <span>⚠️</span>
                <div>Anda sedang berada dalam Tim Setim! Jika Anda keluar, Tim Setim akan otomatis dibubarkan.</div>
              </div>
            )}
          </div>

          <div className="exit-modal-actions">
            <button className="exit-btn-confirm g-btn-press" onClick={onConfirm}>
              Ya, Keluar 🚪
            </button>
            <button className="exit-btn-cancel g-btn-press" onClick={onCancel}>
              Batal ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// KOMPONEN KAMAR LOBBY (Soccer/Stadium Theme)
// =====================================================
function KamarLobbyScreen({
  onBack,
  onPlayRoom,
  category: initialCategory,
  setCategory: setGlobalCategory,
  socket
}: {
  onBack: () => void;
  onPlayRoom: (room: Room) => void;
  category: 'Biasa' | 'Bet' | 'Wild' | 'Domino Partner' | '5 Kartu' | 'Tantangan';
  setCategory: (cat: any) => void;
  socket: Socket | null;
}) {
  const [profile, setProfile] = useState<any>(null);
  const [category, setCategory] = useState<string>(initialCategory || 'Biasa');
  const [showRules, setShowRules] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [pendingInviteUser, setPendingInviteUser] = useState<string | null>(null);
  const [partnerTeammate, setPartnerTeammate] = useState<string | null>(() => localStorage.getItem('domino_partner_teammate'));
  const [incomingInvite, setIncomingInvite] = useState<{ fromUsername: string } | null>(null);
  const [coolAlert, setCoolAlert] = useState<{ message: string; title?: string } | null>(null);

  const showAlert = (msg: string, title?: string) => setCoolAlert({ message: msg, title });

  const handleConfirmExit = () => {
    if (partnerTeammate) {
      handleLeaveTeam();
    }
    setShowExitConfirmModal(false);
    onBack();
  };

  const handleBackPress = () => {
    if (category === 'Domino Partner' && partnerTeammate) {
      setShowExitConfirmModal(true);
    } else {
      onBack();
    }
  };

  const myUsername = localStorage.getItem('domino_username') || '';

  useEffect(() => {
    if (!myUsername) return;
    fetch(`${API_URL}/profile/${myUsername}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProfile(d); })
      .catch(() => { });
  }, [myUsername]);

  // Real-time Socket listeners for team invite & team code
  useEffect(() => {
    if (!socket || !myUsername) return;

    socket.emit('register-user', { username: myUsername });
    socket.emit('get-team-status', { username: myUsername });

    const handleTeamStatusUpdate = ({ partnerUsername }: { partnerUsername: string | null }) => {
      if (partnerUsername) {
        setPartnerTeammate(partnerUsername);
        localStorage.setItem('domino_partner_teammate', partnerUsername);
      } else {
        setPartnerTeammate(null);
        localStorage.removeItem('domino_partner_teammate');
      }
    };

    const handleInviteReceived = ({ fromUsername }: { fromUsername: string }) => {
      setIncomingInvite({ fromUsername });
    };

    const handleInviteAccepted = ({ partnerUsername, teamCode: code }: { partnerUsername: string; teamCode?: string }) => {
      setPartnerTeammate(partnerUsername);
      if (code) setTeamCode(code);
      localStorage.setItem('domino_partner_teammate', partnerUsername);
      setShowInviteModal(false);
      setShowJoinCodeModal(false);
      setPendingInviteUser(null);
      setIncomingInvite(null);
      showAlert(`🎉 ${partnerUsername} bergabung ke tim Anda! Tim terbentuk.`, 'Tim Terbentuk');
    };

    const handleInviteDeclined = ({ partnerUsername }: { partnerUsername: string }) => {
      setPendingInviteUser(null);
      showAlert(`ℹ️ ${partnerUsername} menolak undangan tim.`, 'Undangan Ditolak');
    };

    const handleTeamLeft = ({ username }: { username: string }) => {
      setPartnerTeammate(null);
      setTeamCode(null);
      localStorage.removeItem('domino_partner_teammate');
      showAlert(`⚠️ ${username} telah keluar dari tim Anda.`, 'Tim Dibubarkan');
    };

    const handleInviteError = ({ message }: { message: string }) => {
      setPendingInviteUser(null);
      showAlert(message, 'Status Pemain');
    };

    const handleTeamCodeCreated = ({ code }: { code: string }) => {
      setTeamCode(code);
      showAlert(`🔑 Kode Tim terbentuk: ${code}\n\nBagikan 6-digit kode ini ke teman Anda agar mereka bisa langsung masuk tim!`, 'Kode Tim Unik');
    };

    const handleTeamInviteSent = ({ toUsername }: { toUsername: string }) => {
      setPendingInviteUser(toUsername);
    };

    const handleTeamCodeError = ({ message }: { message: string }) => {
      showAlert(message, 'Pemeriksaan Kode Tim');
    };

    const handleAutoEnterRoom = ({ room }: { room: Room }) => {
      onPlayRoom(room);
    };

    const handleTeamJoinError = ({ message }: { message: string }) => {
      showAlert(message, 'Koin Tidak Cukup');
    };

    const handleTeamJoinSuccess = ({ roomConfig }: { roomConfig: Room }) => {
      onPlayRoom(roomConfig);
    };

    socket.on('team-status-update', handleTeamStatusUpdate);
    socket.on('team-invite-received', handleInviteReceived);
    socket.on('team-invite-accepted', handleInviteAccepted);
    socket.on('team-invite-declined', handleInviteDeclined);
    socket.on('team-left', handleTeamLeft);
    socket.on('team-invite-error', handleInviteError);
    socket.on('team-code-created', handleTeamCodeCreated);
    socket.on('team-invite-sent', handleTeamInviteSent);
    socket.on('team-code-error', handleTeamCodeError);
    socket.on('auto-enter-room', handleAutoEnterRoom);
    socket.on('team-join-error', handleTeamJoinError);
    socket.on('team-join-success', handleTeamJoinSuccess);

    return () => {
      socket.off('team-status-update', handleTeamStatusUpdate);
      socket.off('team-invite-received', handleInviteReceived);
      socket.off('team-invite-accepted', handleInviteAccepted);
      socket.off('team-invite-declined', handleInviteDeclined);
      socket.off('team-left', handleTeamLeft);
      socket.off('team-invite-error', handleInviteError);
      socket.off('team-code-created', handleTeamCodeCreated);
      socket.off('team-invite-sent', handleTeamInviteSent);
      socket.off('team-code-error', handleTeamCodeError);
      socket.off('auto-enter-room', handleAutoEnterRoom);
      socket.off('team-join-error', handleTeamJoinError);
      socket.off('team-join-success', handleTeamJoinSuccess);
    };
  }, [socket, myUsername]);

  const handleSendInvite = (targetUser: string) => {
    if (!socket) return;
    if (targetUser === myUsername) {
      showAlert('Tidak bisa mengundang diri sendiri.', 'Peringatan');
      return;
    }
    socket.emit('invite-team-partner', { fromUsername: myUsername, toUsername: targetUser });
  };

  const handleAcceptInvite = () => {
    if (!socket || !incomingInvite) return;
    socket.emit('accept-team-partner', { fromUsername: incomingInvite.fromUsername, toUsername: myUsername });
    setPartnerTeammate(incomingInvite.fromUsername);
    localStorage.setItem('domino_partner_teammate', incomingInvite.fromUsername);
    setIncomingInvite(null);
  };

  const handleDeclineInvite = () => {
    if (!socket || !incomingInvite) return;
    socket.emit('decline-team-partner', { fromUsername: incomingInvite.fromUsername, toUsername: myUsername });
    setIncomingInvite(null);
  };

  const handleLeaveTeam = () => {
    if (!socket || !partnerTeammate) return;
    socket.emit('leave-team-partner', { fromUsername: myUsername, partnerUsername: partnerTeammate });
    setPartnerTeammate(null);
    setTeamCode(null);
    localStorage.removeItem('domino_partner_teammate');
  };

  const handleCreateTeamCode = () => {
    if (!socket) return;
    socket.emit('create-team-code', { username: myUsername });
  };

  const handleJoinTeamCode = (code: string) => {
    if (!socket) return;
    socket.emit('join-team-code', { username: myUsername, code });
    setShowJoinCodeModal(false);
  };

  const formatCoins = (n: number) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const menuItems = [
    { id: 'Biasa', label: 'Biasa' },
    { id: 'Bet', label: 'Bet' },
    { id: 'Wild', label: 'Wild' },
    { id: 'Domino Partner', label: 'Domino Partner', isNew: true },
    { id: '5 Kartu', label: '5 Kartu' },
    { id: 'Tantangan', label: 'Tantangan' },
  ];

  const handleSelectRoom = (room: Room) => {
    if (!profile) return;
    const requiredBuyIn = (room as any).buyIn || (room.entryFee * 10);
    const usableCoins = Math.max(0, (profile.coins || 0) - (profile.bonusCoins || 0));
    if (usableCoins < requiredBuyIn) {
      if ((profile.bonusCoins || 0) > 0 && profile.coins >= requiredBuyIn) {
        showAlert(`⚠️ KOIN KLAIM BONUS HARIAN HANYA UNTUK SLOT!\n\nKoin dari bonus harian (${(profile.bonusCoins || 0).toLocaleString('id-ID')} koin) tidak dapat dipakai di Domino.\n\nKoin umum Domino Anda: ${usableCoins.toLocaleString('id-ID')} koin (Butuh minimal: ${requiredBuyIn.toLocaleString('id-ID')} koin).`, 'Koin Bonus Khusus Slot');
      } else {
        showAlert(`⚠️ KOIN TIDAK CUKUP!\n\nUntuk masuk kamar ${room.name}, Anda harus memiliki minimal modal taruhan (Buy-In) sebesar ${requiredBuyIn.toLocaleString('id-ID')} koin.\n\nSaldo koin Anda saat ini: ${profile.coins.toLocaleString('id-ID')} koin.`, 'Koin Tidak Cukup');
      }
      return;
    }

    if (partnerTeammate && socket) {
      socket.emit('team-join-room', {
        roomConfig: room,
        hostUsername: myUsername,
        partnerUsername: partnerTeammate
      });
    } else {
      onPlayRoom(room);
    }
  };

  return (
    <div className="screen-wrapper lob-premium-bg">
      {/* Floating Toast Notification */}
      {coolAlert && (
        <FloatingToastNotification
          message={coolAlert.message}
          onClose={() => setCoolAlert(null)}
        />
      )}
      {/* Rules Modal */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} initialCategory={category} />}

      {/* Invite Teammate Modal */}
      {showInviteModal && (
        <InviteTeammateModal
          onClose={() => setShowInviteModal(false)}
          onSendInvite={handleSendInvite}
          myUsername={myUsername}
        />
      )}

      {/* Join Team Code Modal */}
      {showJoinCodeModal && (
        <JoinTeamCodeModal
          onClose={() => setShowJoinCodeModal(false)}
          onJoinCode={handleJoinTeamCode}
        />
      )}

      {/* Invite Pending Modal (Sender Waiting) */}
      {pendingInviteUser && (
        <InvitePendingModal
          targetUser={pendingInviteUser}
          onCancel={() => setPendingInviteUser(null)}
        />
      )}

      {/* Incoming Team Invitation Pop-up Banner */}
      {incomingInvite && (
        <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1400 }}>
          <div className="peng-box tm-box-bounce" style={{ maxWidth: '45vw', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="peng-header">
              <span>📩</span><span className="peng-header-title">Undangan Tim Partner</span><span>📩</span>
            </div>
            <div style={{ padding: '2.5vh 2vw', fontSize: '1.8vh', color: '#fff' }}>
              Pemain <b style={{ color: '#f1c40f' }}>{incomingInvite.fromUsername}</b> mengundang Anda untuk menjadi teman setim di Mode Domino Partner (2 v 2)!
            </div>
            <div style={{ display: 'flex', gap: '2vw', justifyContent: 'center', marginBottom: '2vh' }}>
              <button className="victory-action-btn g-btn-press restart" style={{ padding: '1vh 3vw', fontSize: '1.6vh' }} onClick={handleAcceptInvite}>
                Terima ✅
              </button>
              <button className="victory-action-btn g-btn-press close" style={{ padding: '1vh 3vw', fontSize: '1.6vh' }} onClick={handleDeclineInvite}>
                Tolak ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirmModal && (
        <ExitConfirmModal
          hasPartner={Boolean(partnerTeammate)}
          onConfirm={handleConfirmExit}
          onCancel={() => setShowExitConfirmModal(false)}
        />
      )}

      {/* Top Navigation Bar */}
      <div className="lob-topbar-rich">
        <button className="lob-back-btn-rich g-btn-press" onClick={handleBackPress}>«</button>

        {/* Coins display */}
        <div className="lob-pill-card coins">
          <span className="lob-pill-icon">🪙</span>
          <span className="lob-pill-val">{profile ? formatCoins(profile.coins) : '...'}</span>
          <button className="lob-pill-plus g-btn-press">+</button>
        </div>

        {/* RP Currency */}
        <div className="lob-pill-card rp">
          <span className="lob-pill-icon rp-icon">Rp</span>
          <span className="lob-pill-val">{profile ? formatCoins(profile.rp || 0) : '0'}</span>
        </div>

        {/* Banner Title */}
        <div className="lob-banner-rich">
          <span>KAMAR {category.toUpperCase()}</span>
        </div>

        {/* Help button */}
        <button className="lob-help-btn-rich g-btn-press" onClick={() => setShowRules(true)}>?</button>
      </div>

      {/* Main Content Area */}
      <div className="lob-body-rich">
        {/* Left Sidebar Menu */}
        <div className="lob-sidebar">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`lob-side-btn g-btn-press ${category === item.id ? 'active' : ''}`}
              onClick={() => setCategory(item.id)}
            >
              {item.isNew && <span className="lob-new-tag">NEW</span>}
              {item.label}
            </button>
          ))}
        </div>

        {/* Center Cards Grid / Partner View */}
        <div className="lob-cards-container-rich">
          {category === 'Domino Partner' ? (
            <div className="lob-partner-layout-rich">
              {/* Partner left cards */}
              <div className="lob-partner-left-rich">
                <div className="lob-rich-card partner-small g-btn-press c-gold" onClick={() => handleSelectRoom({ id: 'partner_250k', name: 'Partner 250K', entryFee: 250000, entryLabel: '250K', coinsRange: '1M+', playersCount: 437004 })}>
                  <div className="lob-card-shine" />
                  <div className="lob-card-content">
                    <div className="lob-card-fee">250K</div>
                    <div className="lob-card-wave-box">
                      <div className="lob-card-range">1M+</div>
                      <div className="lob-card-players">👤 437,004</div>
                    </div>
                  </div>
                </div>
                <div className="lob-rich-card partner-small g-btn-press c-purple" onClick={() => handleSelectRoom({ id: 'partner_3m', name: 'Partner 3M', entryFee: 3000000, entryLabel: '3M', coinsRange: '20M+', playersCount: 6299 })}>
                  <div className="lob-card-shine" />
                  <div className="lob-card-content">
                    <div className="lob-card-fee">3M</div>
                    <div className="lob-card-time">Waktu buka 18:00 -24:00 WIB</div>
                    <div className="lob-card-wave-box">
                      <div className="lob-card-range">20M+</div>
                      <div className="lob-card-players">👤 6,299</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tim Saya Panel */}
              <div className="lob-partner-right-rich">
                <div className="lob-team-box-rich">
                  <div className="lob-team-header-rich">Tim Saya</div>
                  <div className="lob-team-body-rich">
                    {/* Slot 1: You */}
                    <div className="lob-team-member-rich">
                      <div className="lob-team-avatar-rich">🐸</div>
                      <div className="lob-team-name-rich">{myUsername.substring(0, 8)}..</div>
                      <div className="lob-team-sub-rich">Jumlah Set: {profile?.totalGames || 0}</div>
                      <div className="lob-team-sub-rich">Rasio Menang: {profile?.totalGames ? Math.round(((profile.wins || 0) / profile.totalGames) * 100) : 0}%</div>
                    </div>

                    {/* Slot 2: Teammate or Invite */}
                    {partnerTeammate ? (
                      <div className="lob-team-member-rich" style={{ position: 'relative', border: '1.5px solid #2ecc71', background: 'rgba(46, 204, 113, 0.15)', borderRadius: '12px', padding: '0.8vh' }}>
                        <button
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: '#e74c3c',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Keluar dari Tim"
                          onClick={handleLeaveTeam}
                        >
                          ✕
                        </button>
                        <div className="lob-team-avatar-rich">🐢</div>
                        <div className="lob-team-name-rich" style={{ color: '#2ecc71' }}>{partnerTeammate.substring(0, 8)}..</div>
                        <div className="lob-team-sub-rich" style={{ color: '#2ecc71', fontWeight: 'bold' }}>✅ Siap Bermain</div>
                        <div className="lob-team-sub-rich">Teman Setim</div>
                      </div>
                    ) : (
                      <div className="lob-team-invite-rich g-btn-press" onClick={() => setShowInviteModal(true)}>
                        <div className="lob-invite-circle">+</div>
                        <span>Undang</span>
                      </div>
                    )}
                  </div>

                  {/* VIP Kode Tim 6-Digit Display Card */}
                  <div className="vip-team-code-card">
                    <div className="vip-code-header">
                      <div className="vip-code-label-badge">
                        <span>🔑</span> KODE LOBBY TIM VIP
                      </div>
                      <div style={{ display: 'flex', gap: '0.5vw' }}>
                        {teamCode ? (
                          <button className="vip-code-action-btn g-btn-press" onClick={() => { navigator.clipboard.writeText(teamCode); showAlert(`📋 Kode Tim ${teamCode} berhasil tersalin!`); }}>
                            📋 Salin
                          </button>
                        ) : (
                          <button className="vip-code-action-btn g-btn-press" onClick={handleCreateTeamCode}>
                            ✨ Buat Kode Baru
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Golden Digital PIN Slots Display */}
                    <div className="vip-pin-slots-row">
                      {teamCode ? (
                        teamCode.split('').map((digit, i) => (
                          <div key={i} className="vip-pin-box">
                            {digit}
                          </div>
                        ))
                      ) : (
                        Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="vip-pin-box empty">
                            •
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="lob-team-actions-rich" style={{ marginTop: '1.2vh' }}>
                    <button className="lob-team-btn join g-btn-press" onClick={() => handleSelectRoom({ id: 'partner_250k', name: 'Partner 250K', entryFee: 250000, entryLabel: '250K', coinsRange: '1M+', playersCount: 437004 })}>
                      {partnerTeammate ? 'Main Tim (2v2)' : 'Cari Tim'}
                    </button>
                    <button className="lob-team-btn single g-btn-press" style={{ background: 'linear-gradient(180deg, #8e44ad, #5e2750)' }} onClick={() => setShowJoinCodeModal(true)}>
                      Kode Tim 🔑
                    </button>
                  </div>
                  <div className="lob-team-footer-desc">
                    {partnerTeammate ? `Tim Terbentuk: ${myUsername} & ${partnerTeammate}` : 'Single vs Single. Tim vs Tim. Bertanding adil.'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="lob-grid-rich">
              {(LOBBY_ROOMS[category] || []).map((room, idx) => {
                const colorClasses = ['c-gold', 'c-orange', 'c-pink', 'c-purple'];
                const cardColor = colorClasses[idx % colorClasses.length];
                const cardImg = room.img || (idx === 0 ? '/assets/loby/room_pemula_decor.jpg' : idx === 1 ? '/assets/loby/room_menengah_decor.jpg' : idx === 2 ? '/assets/loby/room_master_decor.jpg' : '/assets/loby/room_sultan_decor.jpg');
                return (
                  <div
                    key={room.id}
                    className={`lob-rich-card g-btn-press ${cardColor} ${idx === 0 ? 'selected-glow' : ''}`}
                    onClick={() => handleSelectRoom(room)}
                  >
                    <div className="lob-card-shine" />

                    {/* Top Tier & Status Badges */}
                    <div className="lob-card-top-badges">
                      <span className="lob-badge-tier">{room.tierName || (idx === 0 ? 'PEMULA' : idx === 1 ? 'MENENGAH' : idx === 2 ? 'MASTER' : 'SULTAN')}</span>
                      {room.badge && <span className="lob-badge-status">{room.badge}</span>}
                    </div>

                    {/* Card Content (Classic Hierarchical Layout: Big Fee Top, Mascot Emblem Center, White Wave Bottom) */}
                    <div className="lob-card-content">
                      <div className="lob-card-header-group">
                        <div className="lob-card-fee">{room.entryLabel}</div>
                        <div className="lob-card-title">{room.name}</div>
                      </div>

                      {/* Center 3D Mascot Graphic (Supaya tengahnya gak polos!) */}
                      <div className="lob-card-center-emblem">
                        <div className="lob-emblem-frame">
                          <img src={cardImg} alt={room.name} className="lob-emblem-img" />
                        </div>
                        <div className="lob-emblem-glow" />
                      </div>

                      <div className="lob-card-wave-box">
                        <div className="lob-card-range">🪙 {room.coinsRange}</div>
                        <div className="lob-card-players">
                          <span className="lob-online-dot">🟢</span> {room.playersCount.toLocaleString()} Pemain
                        </div>
                        <div className="lob-card-action-btn">
                          <span>MAIN</span>
                          <span className="lob-btn-arrow">❯</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Decorative Football Elements */}
      <div className="lob-goal-post">
        <span className="lob-soccer-ball">⚽</span>
      </div>
      <div className="lob-trophy-model" />

      {/* Bottom Mulai Button */}
      <button
        className="lob-mulai-btn-glowing g-btn-press"
        onClick={() => {
          const defaultRooms = LOBBY_ROOMS[category === 'Domino Partner' ? '5 Kartu' : category];
          if (defaultRooms && defaultRooms[0]) {
            handleSelectRoom(defaultRooms[0]);
          }
        }}
      >
        <span className="lob-mulai-text">MULAI</span>
        <span className="lob-mulai-sub-ball">⚽</span>
      </button>
    </div>
  );
}

// =====================================================
// KOMPONEN WAITING ROOM (Matchmaking 20s)
// =====================================================
function WaitingRoomScreen({
  room,
  socket,
  onGameStart,
  onBack
}: {
  room: Room;
  socket: Socket | null;
  onGameStart: (gameId: string) => void;
  onBack: () => void;
}) {
  const [countdown, setCountdown] = useState(20);
  const [players, setPlayers] = useState<{ username: string; isBot: boolean }[]>([]);
  const [dots, setDots] = useState('');
  const myUsername = localStorage.getItem('domino_username') || '';

  // Dot animation
  useEffect(() => {
    const t = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(t);
  }, []);

  // Connect to waiting room
  useEffect(() => {
    if (!socket) return;
    let isMounted = true;

    socket.emit('join-room', {
      roomConfig: {
        id: room.id,
        name: room.name,
        entryFee: room.entryFee,
        entryLabel: room.entryLabel,
        coinsRange: room.coinsRange
      },
      username: myUsername
    });

    const handleWaiting = (data: any) => {
      if (!isMounted) return;
      setCountdown(data.countdown);
      // Deduplicate player usernames for UI safety
      const uniquePlayers = (data.players || []).filter((p: any, index: number, self: any[]) =>
        index === self.findIndex((t) => t.username === p.username)
      );
      setPlayers(uniquePlayers);
    };

    const handleGameStarting = (data: any) => {
      if (!isMounted) return;
      onGameStart(data.gameId);
    };

    socket.on('waiting-update', handleWaiting);
    socket.on('game-starting', handleGameStarting);

    return () => {
      isMounted = false;
      socket.off('waiting-update', handleWaiting);
      socket.off('game-starting', handleGameStarting);
    };
  }, [socket, room.id, myUsername]);

  const handleLeave = () => {
    if (socket) {
      socket.emit('leave-room', { roomKey: room.id });
    }
    onBack();
  };

  const seatPositions = [
    { label: 'Anda', pos: 'bottom' },
    { label: 'Pemain 2', pos: 'left' },
    { label: 'Pemain 3', pos: 'top' },
    { label: 'Pemain 4', pos: 'right' },
  ];

  return (
    <div className="screen-wrapper waiting-room-bg">
      {/* Animated background particles */}
      <div className="wr-particles">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="wr-particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`
          }} />
        ))}
      </div>

      {/* Header */}
      <div className="wr-header">
        <button className="wr-back-btn g-btn-press" onClick={handleLeave}>« Keluar</button>
        <div className="wr-room-info">
          <span className="wr-room-name">{room.name}</span>
          <span className="wr-room-fee">🪙 {room.entryLabel}</span>
        </div>
      </div>

      {/* Center Matchmaking Display */}
      <div className="wr-center">
        {/* Spinning domino animation */}
        <div className="wr-domino-spin">
          <div className="wr-domino-card">🀱</div>
        </div>

        <div className="wr-status-text">Mencari Lawan{dots}</div>

        {/* Countdown Ring */}
        <div className="wr-countdown-ring">
          <svg viewBox="0 0 100 100" className="wr-ring-svg">
            <circle className="wr-ring-bg" cx="50" cy="50" r="42" />
            <circle
              className="wr-ring-fill"
              cx="50" cy="50" r="42"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - countdown / 20)}`}
            />
          </svg>
          <div className="wr-countdown-num">{countdown}</div>
        </div>

        <div className="wr-info-sub">
          {players.length < 4
            ? `Menunggu ${4 - players.length} pemain lagi...`
            : 'Semua pemain siap!'
          }
        </div>
      </div>

      {/* Seat indicators */}
      <div className="wr-seats">
        {seatPositions.map((seat, idx) => {
          const player = players[idx];
          const isFilled = !!player;
          return (
            <div key={idx} className={`wr-seat ${seat.pos} ${isFilled ? 'filled' : 'empty'}`}>
              <div className="wr-seat-avatar">
                {isFilled ? '🐸' : '❓'}
              </div>
              <div className="wr-seat-name">
                {isFilled ? (player.username === myUsername ? 'Anda' : player.username) : seat.label}
              </div>
              {isFilled && <div className="wr-seat-ready">✓ Siap</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// KOMPONEN PLAY BOARD DOMINO (ONLINE via WebSocket)
// =====================================================
type Tile = [number, number];

function DominoPlayScreen({
  room,
  gameId,
  socket,
  onBack,
  onUpdateCoins
}: {
  room: Room;
  gameId: string;
  socket: Socket | null;
  onBack: () => void;
  onUpdateCoins: (msg: string) => void;
}) {
  const myUsername = localStorage.getItem('domino_username') || 'Pemain';
  const [profile, setProfile] = useState<any>(null);
  const [showRules, setShowRules] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [effectOn, setEffectOn] = useState(true);

  // Game state from server
  const [gameState, setGameState] = useState<any>(null);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [heldCardIdx, setHeldCardIdx] = useState<number | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [turnTimer, setTurnTimer] = useState(30);
  const [payNotification, setPayNotification] = useState<string | null>(null);
  const payNotifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flying Coins animation state
  interface FlyCoin {
    id: number;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    delay: number;
  }
  interface PopText {
    id: number;
    x: number;
    y: number;
    text: string;
    type: 'win' | 'lose';
  }

  const [flyingCoins, setFlyingCoins] = useState<FlyCoin[]>([]);
  const [popTexts, setPopTexts] = useState<PopText[]>([]);

  const getSeatCoords = (seatIdx: number, mySeatIdx: number, numP: number) => {
    const relPos = (seatIdx - mySeatIdx + numP) % numP;
    if (relPos === 0) return { x: 50, y: 82 }; // Bottom (Me)
    if (relPos === 1) return { x: 14, y: 45 }; // Left
    if (relPos === 2) return { x: 50, y: 15 }; // Top
    return { x: 86, y: 45 }; // Right
  };

  const spawnFlyingCoins = (fromSeatIdx: number, toSeatIdx: number, amount: number, currentMySeat: number, totalP: number) => {
    const from = getSeatCoords(fromSeatIdx, currentMySeat, totalP);
    const to = getSeatCoords(toSeatIdx, currentMySeat, totalP);

    // 10 flying coins sliding across screen
    const newCoins: FlyCoin[] = Array.from({ length: 10 }).map((_, i) => ({
      id: Date.now() + i + Math.random(),
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      delay: i * 50
    }));

    setFlyingCoins(prev => [...prev, ...newCoins]);

    const losePop: PopText = {
      id: Date.now() + Math.random(),
      x: from.x,
      y: from.y,
      text: `-${amount.toLocaleString()} 🪙`,
      type: 'lose'
    };

    const winPop: PopText = {
      id: Date.now() + Math.random() + 1,
      x: to.x,
      y: to.y,
      text: `+${amount.toLocaleString()} 🪙`,
      type: 'win'
    };

    setPopTexts(prev => [...prev, losePop, winPop]);

    setTimeout(() => {
      setFlyingCoins(prev => prev.filter(c => !newCoins.includes(c)));
      setPopTexts(prev => prev.filter(pt => pt.id !== losePop.id && pt.id !== winPop.id));
    }, 1600);
  };

  // Fetch initial profile
  useEffect(() => {
    fetch(`${API_URL}/profile/${myUsername}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProfile(d); })
      .catch(() => { });
  }, [myUsername]);

  // Listen for game state updates
  useEffect(() => {
    if (!socket) return;
    const handleGameState = (state: any) => {
      setGameState((prev: any) => {
        const currentMySeat = state.mySeatIndex ?? 0;
        const totalP = state.players?.length || 4;

        // Detect payment events from tableStack changes (100% reliable delta matching)
        if (prev && prev.players && state.players) {
          state.players.forEach((p: any) => {
            const prevP = prev.players.find((oldP: any) => oldP.username === p.username);
            if (prevP && p.tableStack < prevP.tableStack) {
              const diff = prevP.tableStack - p.tableStack;
              const receiver = state.players.find((other: any) => {
                const prevOther = prev.players.find((oldP: any) => oldP.username === other.username);
                return prevOther && (other.tableStack - prevOther.tableStack === diff);
              });
              if (receiver) {
                spawnFlyingCoins(p.seatIndex, receiver.seatIndex, diff, currentMySeat, totalP);
              }
            }
          });
        }

        // Also check new logs for notification banner
        if (prev && state.logs) {
          const newLogs: string[] = state.logs.filter((l: string) => !(prev.logs || []).includes(l));
          const payLog = newLogs.find((l: string) => l.includes('bayar') && l.includes(myUsername));
          if (payLog) {
            setPayNotification(payLog);
            if (payNotifTimerRef.current) clearTimeout(payNotifTimerRef.current);
            payNotifTimerRef.current = setTimeout(() => setPayNotification(null), 3000);
          }
        }
        return state;
      });

      if (state.status === 'ended' && state.winner !== null) {
        const mySeat = state.mySeatIndex;
        const isWin = state.winner === mySeat;
        const myCoinChange = state.coinChanges?.[myUsername] || 0;
        fetch(`${API_URL}/profile/${myUsername}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) setProfile(d); })
          .catch(() => { });
        onUpdateCoins(isWin
          ? `🏆 Selamat! Anda menang +${myCoinChange.toLocaleString()} koin!`
          : `😢 Anda kalah ${Math.abs(myCoinChange).toLocaleString()} koin.`
        );
      }
    };
    socket.on('game-state', handleGameState);
    return () => { socket.off('game-state', handleGameState); };
  }, [socket, myUsername, room, onUpdateCoins]);

  // Extract game state
  const foundSeat = gameState?.players?.findIndex((p: any) => p.username === myUsername);
  const mySeat = gameState?.mySeatIndex ?? (foundSeat !== undefined && foundSeat !== -1 ? foundSeat : 0);
  const myHand: Tile[] = gameState?.players?.[mySeat]?.hand || [];
  const board = gameState?.board || [];
  const leftEnd = gameState?.leftEnd ?? null;
  const rightEnd = gameState?.rightEnd ?? null;
  const turnIndex = gameState?.turnIndex ?? 0;
  const status = gameState?.status ?? 'dealing';
  const winner = gameState?.winner ?? null;
  const winType = gameState?.winType ?? 'normal';
  const logs: string[] = gameState?.logs || [];
  const coinChanges = gameState?.coinChanges || {};
  const numPlayers = gameState?.players?.length || 4;

  const isMyTurn = turnIndex === mySeat && status === 'playing';
  const isBoardEmpty = leftEnd === null && rightEnd === null;

  // Turn timer (30s per turn, auto-pass)
  useEffect(() => {
    if (status !== 'playing') return;
    setTurnTimer(30);
    const interval = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) {
          if (isMyTurn) {
            // Auto-pass if can't play, or play first available card
            const canPlayAny = isBoardEmpty || myHand.some(t => {
              const [a, b] = t;
              return a === leftEnd || b === leftEnd || a === rightEnd || b === rightEnd;
            });
            if (!canPlayAny) {
              socket?.emit('pass-turn', { gameId });
            }
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [turnIndex, status]);

  const getSeatInfo = (relativePos: number) => {
    const actualSeat = (mySeat + relativePos) % numPlayers;
    const p = gameState?.players?.[actualSeat];
    return {
      username: p?.username || `Pemain ${actualSeat + 1}`,
      isBot: p?.isBot || false,
      cardCount: p?.cardCount ?? 0,
      pipSum: p?.pipSum ?? 0,
      tableStack: p?.tableStack ?? 0,
      isBankrupt: !!p?.isBankrupt,
      isTurn: turnIndex === actualSeat,
      seatIndex: actualSeat
    };
  };

  const [isPassing, setIsPassing] = useState(false);

  // Reset isPassing guard on turn change
  useEffect(() => {
    setIsPassing(false);
  }, [turnIndex]);

  const isPlayableOnBoard = (tile: Tile) => {
    if (!tile || tile.length < 2) return false;
    if (isBoardEmpty || board.length === 0) return true; // First move on empty board: any tile is playable!

    // Effective left & right ends with board fallback
    const effLeft = leftEnd ?? (board.length > 0 ? board[0].left : null);
    const effRight = rightEnd ?? (board.length > 0 ? board[board.length - 1].right : null);

    if (effLeft === null || effRight === null) return true;

    const [a, b] = tile;
    return a === effLeft || b === effLeft || a === effRight || b === effRight;
  };

  // Player must play if they can. They can only pass (pay) if they have NO playable card.
  const canPass = isMyTurn && status === 'playing' && myHand.length > 0 && !myHand.some(t => isPlayableOnBoard(t));

  // Calculate payment amount for UI display
  const myPipSum = myHand.reduce((s, t) => s + (t[0] || 0) + (t[1] || 0), 0);
  const fee = room.entryFee || 1000;
  const payAmount = Math.max(fee, Math.floor(myPipSum * fee / 10));

  // AUTO-PAY EFFECT: When player cannot play, automatically execute payment & pass turn!
  useEffect(() => {
    if (isMyTurn && canPass && status === 'playing' && !isPassing) {
      setIsPassing(true);
      setPayNotification(`💸 Tidak ada kartu yang cocok! Otomatis membayar ${payAmount.toLocaleString()} koin...`);

      const timer = setTimeout(() => {
        if (socket && socket.connected) {
          socket.emit('pass-turn', { gameId });
        }
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [isMyTurn, canPass, status, gameId, socket, payAmount, isPassing]);

  // Early return ONLY after all hooks have been declared to strictly obey React Rules of Hooks
  if (!gameState) {
    return (
      <div className="screen-wrapper table-bg">
        <div className="wr-center">
          <div className="wr-domino-spin"><div className="wr-domino-card">🀱</div></div>
          <div className="wr-status-text">Memuat permainan...</div>
        </div>
      </div>
    );
  }

  // Card stats tracking
  const totalCardsInHands = gameState?.players?.reduce((sum: number, p: any) => sum + (p.cardCount || 0), 0) || 0;
  const cardsInDrawPile = Math.max(0, 28 - board.length - totalCardsInHands);

  const handleUserSelectCard = (idx: number) => {
    if (!isMyTurn) return;
    const tile = myHand[idx];
    if (!isPlayableOnBoard(tile)) return;

    setSelectedCardIdx(idx);

    const [a, b] = tile;

    // First move or single-match: play immediately
    if (isBoardEmpty) {
      socket?.emit('play-card', { gameId, tile, side: 'right' });
      setSelectedCardIdx(null);
      return;
    }

    const matchLeft = (leftEnd !== null && (a === leftEnd || b === leftEnd));
    const matchRight = (rightEnd !== null && (a === rightEnd || b === rightEnd));

    if (matchLeft && !matchRight) {
      socket?.emit('play-card', { gameId, tile, side: 'left' });
      setSelectedCardIdx(null);
    } else if (matchRight && !matchLeft) {
      socket?.emit('play-card', { gameId, tile, side: 'right' });
      setSelectedCardIdx(null);
    }
    // If matches both, we keep selectedCardIdx and show side chooser buttons
  };

  const handleChooseSide = (side: 'left' | 'right') => {
    if (selectedCardIdx === null) return;
    const tile = myHand[selectedCardIdx];
    socket?.emit('play-card', { gameId, tile, side });
    setSelectedCardIdx(null);
  };

  const handleUserPay = () => {
    if (!isMyTurn || !canPass || isPassing) return;
    setIsPassing(true);
    socket?.emit('pass-turn', { gameId });
  };

  const handlePlayAgain = () => {
    socket?.emit('leave-room', { gameId });
    onBack();
  };

  const selectedTileMatchesBoth = () => {
    if (selectedCardIdx === null) return false;
    if (isBoardEmpty) return false;
    const tile = myHand[selectedCardIdx];
    const [a, b] = tile;
    const matchLeft = (leftEnd !== null && (a === leftEnd || b === leftEnd));
    const matchRight = (rightEnd !== null && (a === rightEnd || b === rightEnd));
    return matchLeft && matchRight;
  };

  const topPlayer = getSeatInfo(2);
  const leftPlayer = getSeatInfo(1);
  const rightPlayer = numPlayers > 3 ? getSeatInfo(3) : null;

  // Render player seat with timer ring
  const renderSeat = (player: ReturnType<typeof getSeatInfo>, position: 'top' | 'left' | 'right') => {
    const avatars = { top: '🐢', left: '🐸', right: '🦎' };
    const timerFraction = player.isTurn ? turnTimer / 30 : 0;
    const playerCoinChange = coinChanges[player.username] || 0;
    return (
      <div className={`gs-seat ${position} ${player.isTurn ? 'active' : ''}`}>
        <div className="gs-avatar-ring">
          {player.isTurn && (
            <svg className="gs-timer-ring" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="20" className="gs-timer-track" />
              <circle cx="22" cy="22" r="20" className="gs-timer-fill"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - timerFraction)}`}
              />
            </svg>
          )}
          <div className="gs-avatar-img">{player.isBot ? '🤖' : avatars[position]}</div>
          <div className={`gs-card-badge ${player.isTurn ? 'pulse' : ''}`}>{player.cardCount}</div>
        </div>
        <div className="gs-seat-name">{player.username.substring(0, 10)}</div>
        {player.isBankrupt ? (
          <div className="gs-seat-coins" style={{ color: '#e74c3c', fontWeight: 'bold' }}>💥 BANGKRUT</div>
        ) : (
          <div className="gs-seat-coins">🪙 Meja: {player.tableStack.toLocaleString()}</div>
        )}
        <div className="gs-seat-pip">⚫ {player.pipSum} Titik</div>
        {gameState?.isPartnerMode && (
          <div className={`gs-team-badge ${player.seatIndex % 2 === 0 ? 'team-a' : 'team-b'}`}>
            {player.seatIndex % 2 === 0 ? '🔵 TIM A' : '🔴 TIM B'}
          </div>
        )}
        {playerCoinChange !== 0 && (
          <div className={`gs-seat-change ${playerCoinChange > 0 ? 'win' : 'lose'}`}>
            {playerCoinChange > 0 ? '+' : ''}{playerCoinChange.toLocaleString()}
          </div>
        )}
        {/* Card backs */}
        <div className={`gs-card-backs ${position}`}>
          {Array.from({ length: Math.min(player.cardCount, 4) }).map((_, i) => (
            <div key={i} className="gs-mini-back" style={{
              transform: `rotate(${(i - 1.5) * 8}deg) translateY(${-i * 1}px)`
            }} />
          ))}
        </div>
      </div>
    );
  };

  const mySeatPlayer = gameState?.players?.[mySeat];

  return (
    <div className="screen-wrapper table-bg">
      {/* Flying Coins Animation Overlay */}
      {flyingCoins.map(coin => (
        <div
          key={coin.id}
          className="fly-coin-particle"
          style={{
            left: `${(coin as any).x ?? coin.fromX}vw`,
            top: `${(coin as any).y ?? coin.fromY}vh`,
            animationDelay: `${coin.delay}s`
          }}
        >
          🪙
        </div>
      ))}

      {/* Floating Pop Numbers Overlay */}
      {popTexts.map(pop => (
        <div
          key={pop.id}
          className={`floating-pop-text ${pop.type === 'win' ? 'win' : 'lose'}`}
          style={{
            left: `${pop.x}vw`,
            top: `${pop.y}vh`
          }}
        >
          {pop.text}
        </div>
      ))}

      {/* Payment notification */}
      {payNotification && (
        <div className="gs-pay-notification">
          💸 {payNotification}
        </div>
      )}

      {/* Rules Modal */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} initialCategory={room?.name || 'Kamar Biasa'} />}

      {/* Game Header */}
      <div className="table-header">
        <button className="lob-back-btn g-btn-press" onClick={() => { socket?.emit('leave-room', { gameId }); onBack(); }}>«</button>
        <div className="table-room-title">
          {room.name} — <span style={{ color: '#f1c40f' }}>{room.entryLabel}</span>
        </div>

        {/* Card Tracker Widget */}
        <div className="table-card-tracker">
          <div className="tracker-pill" title="Kartu yang sudah dimainkan di meja">
            <span className="tracker-icon">🀱</span>
            <span>Meja: <b style={{ color: '#f1c40f' }}>{board.length}/28</b></span>
          </div>
          {cardsInDrawPile > 0 && (
            <div className="tracker-pill" title="Sisa kartu di tumpukan / bumbung">
              <span className="tracker-icon">📦</span>
              <span>Bumbung: <b style={{ color: '#2ecc71' }}>{cardsInDrawPile}</b></span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1vh', alignItems: 'center', position: 'relative' }}>
          <div className="table-coins-display">
            🪙 Meja: {mySeatPlayer?.tableStack ? mySeatPlayer.tableStack.toLocaleString() : '...'}
          </div>
          <button className="gs-rules-btn g-btn-press" onClick={() => setShowMenu(v => !v)}>≡</button>

          <GameMenuDropdown
            isOpen={showMenu}
            onClose={() => setShowMenu(false)}
            items={[
              { id: 'lobi', icon: '🚪', label: 'Lobi', onClick: () => { setShowMenu(false); socket?.emit('leave-room', { gameId }); onBack(); } },
              { id: 'ganti', icon: '🔄', label: 'Ganti meja', onClick: () => { setShowMenu(false); socket?.emit('leave-room', { gameId }); onBack(); } },
              { id: 'berdiri', icon: '👤', label: 'Berdiri', onClick: () => { setShowMenu(false); handleUserPay(); } },
              { id: 'suara', icon: '🔊', label: 'Suara', badge: soundOn ? 'ON' : 'OFF', onClick: () => setSoundOn(v => !v) },
              { id: 'efek', icon: '✨', label: 'Efek', badge: effectOn ? 'ON' : 'OFF', onClick: () => setEffectOn(v => !v) },
              { id: 'bantuan', icon: '❓', label: 'Bantuan', onClick: () => { setShowMenu(false); setShowRules(true); } }
            ]}
          />
        </div>
      </div>

      {/* Main Board Area */}
      <div className="table-board-area">
        {/* Player Seats */}
        {renderSeat(topPlayer, 'top')}
        {renderSeat(leftPlayer, 'left')}
        {rightPlayer && renderSeat(rightPlayer, 'right')}

        {/* Central Played Tiles Chain */}
        <div className="table-center-chain">
          {gameState?.isPartnerMode && (
            <div style={{ textAlign: 'center', marginBottom: '0.8vh' }}>
              <div className="gs-wild-badge-pill" style={{ background: 'linear-gradient(180deg, #2980b9, #8e44ad)' }}>
                👥 DOMINO PARTNER (2 vs 2) — 🔄 Berlawanan Arah Jarum Jam
              </div>
            </div>
          )}
          {gameState?.isWildMode && gameState?.wildTile && (
            <div style={{ textAlign: 'center', marginBottom: '0.8vh' }}>
              <div className="gs-wild-badge-pill">
                🃏 KARTU WILD: <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>[{gameState.wildTile[0]}, {gameState.wildTile[1]}]</span>
              </div>
            </div>
          )}
          {board.length === 0 ? (
            <div className="table-empty-status">
              {isMyTurn ? '▶️ Giliran Anda — mainkan kartu pertama!' : 'Menunggu kartu pertama...'}
            </div>
          ) : (
            <div className="table-chain-scroller">
              {selectedTileMatchesBoth() && (
                <button className="play-end-indicator left g-btn-press" onClick={() => handleChooseSide('left')}>
                  ◄ Kiri
                </button>
              )}
              {board.map((item: any, idx: number) => {
                const isDouble = item.left === item.right;
                return (
                  <DominoTile
                    key={`${item.left}-${item.right}-${idx}`}
                    left={item.left}
                    right={item.right}
                    isRotated={!isDouble}
                    isSmall={true}
                  />
                );
              })}
              {selectedTileMatchesBoth() && (
                <button className="play-end-indicator right g-btn-press" onClick={() => handleChooseSide('right')}>
                  Kanan ►
                </button>
              )}
            </div>
          )}
          {/* Ante Watermark on Felt Table */}
          <div className="gs-ante-label">
            ANTE: {room.entryLabel}
          </div>
        </div>

        {/* Victory / Defeat Panel */}
        {status === 'ended' && winner !== null && (
          <div className="victory-overlay">
            <div className="victory-box tm-box-bounce">
              <div className={`victory-title ${(gameState?.isPartnerMode ? (winner % 2 === mySeat % 2) : (winner === mySeat)) ? 'win' : 'lose'}`}>
                {gameState?.isPartnerMode
                  ? ((winner % 2 === mySeat % 2) ? '🏆 TIM ANDA MENANG!' : '😢 TIM ANDA KALAH!')
                  : (winner === mySeat ? '🏆 MENANG!' : '😢 KALAH!')}
              </div>
              <div className="victory-message">
                <div className="victory-winner-text">
                  Pemenang: <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>{gameState.players[winner]?.username}</span>
                </div>
                <div className="victory-sub-desc">
                  {winType === 'bankruptcy' ? '💥 Semua lawan BANGKRUT!' : winType === 'block' ? '🔴 Dead-End — jumlah titik terkecil menang.' : '✅ Kartu habis!'}
                </div>
                {gameState.winCategory && (
                  <div className="victory-badge-pill">
                    🔥 KEMENANGAN {gameState.winCategory.toUpperCase()} ({gameState.winMultiplier || 1}x Bet)
                  </div>
                )}
                {/* Show each player's coin change in neat grid table */}
                <div className="gs-result-table">
                  {gameState.players.map((p: any) => {
                    const change = coinChanges[p.username] || 0;
                    return (
                      <div key={p.username} className="gs-result-row">
                        <div className="gs-result-user">
                          <span>👤</span>
                          <span>{p.username.substring(0, 10)} {p.isBankrupt ? '(BANGKRUT)' : ''}</span>
                        </div>
                        <span className={change >= 0 ? 'gs-result-win' : 'gs-result-lose'}>
                          {change >= 0 ? '+' : ''}{change.toLocaleString()} 🪙
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="victory-actions-bar">
                <button className="victory-action-btn g-btn-press restart" onClick={handlePlayAgain}>Main Lagi 🔄</button>
                <button className="victory-action-btn g-btn-press close" onClick={() => { socket?.emit('leave-room', { gameId }); onBack(); }}>Lobby 🚪</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM Player Area */}
      <div className={`gs-bottom-tray ${isMyTurn ? 'my-turn' : ''}`}>
        {/* Player info — bottom left */}
        <div className="gs-me-info">
          <div className="gs-me-avatar-ring">
            {isMyTurn && (
              <svg className="gs-timer-ring me" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="20" className="gs-timer-track" />
                <circle cx="22" cy="22" r="20" className="gs-timer-fill"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - turnTimer / 30)}`}
                />
              </svg>
            )}
            <div className="gs-me-avatar">🐸</div>
          </div>
          <div className="gs-me-text">
            <div className="gs-me-name">{myUsername.substring(0, 10)}..</div>
            {mySeatPlayer?.isBankrupt ? (
              <div className="gs-me-coins" style={{ color: '#e74c3c', fontWeight: 'bold' }}>💥 BANGKRUT</div>
            ) : (
              <div className="gs-me-coins">🪙 Meja: {(mySeatPlayer?.tableStack ?? 0).toLocaleString()}</div>
            )}
            <div className="gs-me-pip">⚫ Titik: {myPipSum}</div>
          </div>
          {/* My coin change during game */}
          {coinChanges[myUsername] !== undefined && coinChanges[myUsername] !== 0 && (
            <div className={`gs-me-change ${coinChanges[myUsername] > 0 ? 'win' : 'lose'}`}>
              {coinChanges[myUsername] > 0 ? '+' : ''}{coinChanges[myUsername].toLocaleString()}
            </div>
          )}
        </div>

        {/* Center area — cards + pips stacked */}
        <div className="gs-center-column">
          {/* Turn indicator */}
          {isMyTurn && !canPass && (
            <div className="gs-turn-indicator">
              {isBoardEmpty ? '▶️ Mainkan kartu pertama!' : '▶️ Giliran Anda! Pilih kartu'}
            </div>
          )}

          {/* Cards row — side by side, no overlap */}
          <div className={`gs-hand-row ${isMyTurn ? 'lifted' : ''}`}>
            {myHand.map((tile: Tile, idx: number) => {
              const playable = isPlayableOnBoard(tile) && isMyTurn;
              return (
                <div
                  key={`${tile[0]}-${tile[1]}`}
                  className={`gs-card-slot ${playable ? 'can-play' : (isMyTurn ? 'unplayable' : '')} ${selectedCardIdx === idx ? 'picked' : ''} ${heldCardIdx === idx ? 'held' : ''}`}
                  onClick={() => handleUserSelectCard(idx)}
                  onMouseDown={() => {
                    holdTimerRef.current = setTimeout(() => setHeldCardIdx(idx), 400);
                  }}
                  onMouseUp={() => {
                    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                    holdTimerRef.current = null;
                    setHeldCardIdx(null);
                  }}
                  onMouseLeave={() => {
                    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                    holdTimerRef.current = null;
                    setHeldCardIdx(null);
                  }}
                  onTouchStart={() => {
                    holdTimerRef.current = setTimeout(() => setHeldCardIdx(idx), 400);
                  }}
                  onTouchEnd={() => {
                    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                    holdTimerRef.current = null;
                    setHeldCardIdx(null);
                  }}
                >
                  <DominoTile
                    left={tile[0]}
                    right={tile[1]}
                    isPlayable={playable}
                    isSelected={selectedCardIdx === idx}
                  />
                </div>
              );
            })}
          </div>

          {/* Card hold preview popup */}
          {heldCardIdx !== null && myHand[heldCardIdx] && (
            <div className="gs-card-preview-overlay">
              <div className="gs-card-preview-box">
                <DominoTile
                  left={myHand[heldCardIdx][0]}
                  right={myHand[heldCardIdx][1]}
                />
                <div className="gs-card-preview-label">
                  {myHand[heldCardIdx][0]}–{myHand[heldCardIdx][1]}
                </div>
              </div>
            </div>
          )}

          {/* Logs feed */}
          <div className="gs-logs-feed">
            {logs.slice(-3).reverse().map((log, i) => (
              <div key={i} className={`gs-log-line ${i === 0 ? 'latest' : ''}`}>{log}</div>
            ))}
          </div>
        </div>

        {/* Stats panel — bottom right */}
        <div className="gs-stats-tray">
          <div className="gs-stats-header">Titik Sisa</div>
          {gameState.players.map((p: any) => (
            <div key={p.username} className="gs-stats-row">
              <span style={{ fontSize: '1.2vh' }}>{p.username.substring(0, 7)}</span>
              <span className="gs-stats-val">⚫{p.pipSum}</span>
            </div>
          ))}
          <div className="gs-stats-row gs-stats-dim" style={{ marginTop: '0.5vh' }}>
            <span>Timer</span>
            <span className={`gs-stats-val ${turnTimer <= 10 ? 'urgent' : ''}`}>{turnTimer}s</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// KOMPONEN SLOT GAME (DuoFuDuoCai)
// =====================================================
function SlotGameScreen({ onBack, socket }: { onBack: () => void; socket: Socket | null }) {
  const [profile, setProfile] = useState<any>(null);
  const myUsername = localStorage.getItem('domino_username') || '';
  const userProfile = useSlotProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const numRows = 3;
  const numCols = 5;
  const [grid, setGrid] = useState<number[][]>(
    Array(numRows).fill(0).map(() => Array(numCols).fill(0).map(() => Math.floor(Math.random() * 11)))
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningCols, setSpinningCols] = useState([false, false, false, false, false]);
  const [betAmount, setBetAmount] = useState(MIN_SLOT_BET);
  const [winAmount, setWinAmount] = useState(0);
  const [winType, setWinType] = useState('normal');
  const [winningSymbols, setWinningSymbols] = useState<number[]>([]);
  const [showWinAlert, setShowWinAlert] = useState(false);
  const [celebration, setCelebration] = useState<SlotCelebrationData | null>(null);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [freeSpinTotalWin, setFreeSpinTotalWin] = useState(0);
  const freeSpinsLeftRef = useRef(0);
  const freeSpinTotalWinRef = useRef(0);
  const isCurrentSpinFreeRef = useRef(false);
  const [multInfo, setMultInfo] = useState<any>(null); // dari server: tangga pengali
  const [autoSpinCount, setAutoSpinCount] = useState(0);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [spinSpeed, setSpinSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const spinTimerRef = useRef<any>(null);
  const spinPressTimer = useRef<any>(null);

  const spinningColsRef = useRef<boolean[]>([false, false, false, false, false]);
  const spinSpeedRef = useRef(spinSpeed);
  useEffect(() => { spinSpeedRef.current = spinSpeed; }, [spinSpeed]);

  // Symbol rendering helper
  const renderSymbol = (symVal: number) => {
    // 0-5: green text symbols (9, 10, J, Q, K, A)
    // 6: Chinese coin, 7: Gold ingots, 8: Ship, 9: Fu symbol, 10: Wild/Dragon
    const greenSyms: Record<number, string> = { 0: '9', 1: '10', 2: 'J', 3: 'Q', 4: 'K', 5: 'A' };

    if (symVal <= 5) {
      return <span className="dfdc-sym-green">{greenSyms[symVal]}</span>;
    }
    if (symVal === 6) {
      // Chinese coin
      return (
        <div className="dfdc-sym-coin-chinese">
          <span>招財</span>
        </div>
      );
    }
    if (symVal === 7) {
      // Gold ingots/pot
      return <span className="dfdc-sym-gold">🏺</span>;
    }
    if (symVal === 8) {
      // Golden ship
      return <span className="dfdc-sym-gold">⛵</span>;
    }
    if (symVal === 9) {
      // Fu symbol
      return (
        <div className="dfdc-sym-fu">
          <span>福</span>
        </div>
      );
    }
    if (symVal === 10) {
      // Wild Dragon
      return <span className="dfdc-sym-gold">🐉</span>;
    }
    return <span className="dfdc-sym-green">9</span>;
  };

  useEffect(() => {
    if (!myUsername) return;
    fetch(`${API_URL}/profile/${myUsername}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setProfile(d);
          if (d.bonusCoins !== undefined) localStorage.setItem('domino_bonus_coins', d.bonusCoins.toString());
          if (d.coins !== undefined) localStorage.setItem('domino_coins', d.coins.toString());
        }
      })
      .catch(() => { });
  }, [myUsername]);

  // Spin animation effect - checking synchronous spinningColsRef to prevent symbol flicker
  useEffect(() => {
    let interval: any = null;
    if (isSpinning) {
      interval = setInterval(() => {
        if (!spinningColsRef.current.some(Boolean)) return;
        setGrid(prev => {
          const next = prev.map(row => [...row]);
          for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
              if (spinningColsRef.current[c]) {
                next[r][c] = Math.floor(Math.random() * 11);
              }
            }
          }
          return next;
        });
      }, Math.max(20, Math.floor(70 / spinSpeedRef.current)));
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isSpinning]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleSpinResult = (data: any) => {
      const spd = spinSpeedRef.current;
      const minSpinBase = spd >= 10 ? 80 : spd >= 5 ? 140 : spd === 3 ? 240 : spd === 2 ? 400 : 750;
      const delayPerCol = spd >= 10 ? 20 : spd >= 5 ? 35 : spd === 3 ? 65 : spd === 2 ? 100 : 180;
      const bounceDuration = spd >= 10 ? 45 : spd >= 5 ? 80 : spd === 3 ? 160 : spd === 2 ? 240 : 380;
      let stopTime = minSpinBase;

      for (let c = 0; c < numCols; c++) {
        const col = c;
        setTimeout(() => {
          // 1. Matikan flag reel ini secara sinkron di ref TERLEBIH DAHULU agar interval shuffle tidak menimpa
          spinningColsRef.current[col] = false;
          setSpinningCols(prev => {
            const next = [...prev];
            next[col] = false;
            return next;
          });
          setGrid(prev => {
            const next = prev.map(row => [...row]);
            for (let r = 0; r < numRows; r++) {
              next[r][col] = data.grid[r][col];
            }
            return next;
          });
        }, stopTime);
        stopTime += delayPerCol;
      }

      const allReelsSettled = stopTime + bounceDuration + 60;
      setTimeout(() => {
        setIsSpinning(false);
        spinningColsRef.current = [false, false, false, false, false];
        setSpinningCols([false, false, false, false, false]);
        setWinAmount(data.winAmount);
        setWinType(data.winType);
        setMultInfo(data.multiplier || null);
        setWinningSymbols(data.winningSymbols || []);
        setProfile((prev: any) => prev ? {
          ...prev,
          coins: data.coins !== undefined ? data.coins : data.newBalance,
          bonusCoins: data.bonusCoins !== undefined ? data.bonusCoins : (prev.bonusCoins || 0)
        } : prev);
        if (data.bonusCoins !== undefined) localStorage.setItem('domino_bonus_coins', data.bonusCoins.toString());
        if (data.coins !== undefined) localStorage.setItem('domino_coins', data.coins.toString());
        else if (data.newBalance !== undefined) localStorage.setItem('domino_coins', data.newBalance.toString());
        window.dispatchEvent(new Event('domino_coins_updated'));

        const isFreeRound = isCurrentSpinFreeRef.current;
        const winAmt = data.winAmount || 0;
        if (winAmt > 0 && isFreeRound) {
          const newFsTotal = freeSpinTotalWinRef.current + winAmt;
          freeSpinTotalWinRef.current = newFsTotal;
          setFreeSpinTotalWin(newFsTotal);
        }

        const isRetrigger = isFreeRound;
        if (data.triggerFreeSpins) {
          const awarded = data.freeSpinsAwarded || 10;
          const totalFree = freeSpinsLeftRef.current + awarded;
          freeSpinsLeftRef.current = totalFree;
          setFreeSpinsLeft(totalFree);
          if (!isRetrigger) {
            setFreeSpinTotalWin(0);
            freeSpinTotalWinRef.current = 0;
          }
          setCelebration({
            type: 'scatter',
            freeSpinsCount: awarded,
            title: isRetrigger ? '🧧 RETRIGGER DUOFU! 🧧' : '🧧 SCATTER DUOFU! 🧧',
            subtext: isRetrigger
              ? `LUAR BIASA! +${awarded} PUTARAN GRATIS DITAMBAHKAN! (SISA: ${totalFree} SPIN)`
              : `SELAMAT! KAMU MEMICU ${awarded} PUTARAN GRATIS!`
          });
        } else if (!isFreeRound && winAmt > 0) {
          setShowWinAlert(true);
          setTimeout(() => setShowWinAlert(false), Math.max(1500, 3000 / spd));
          const ratio = winAmt / Math.max(1, betAmount);
          if (ratio >= 30) {
            setCelebration({ type: 'super_win', amount: winAmt });
          } else if (ratio >= 12) {
            setCelebration({ type: 'mega_win', amount: winAmt });
          } else if (ratio >= 3) {
            setCelebration({ type: 'big_win', amount: winAmt });
          }
        }

        const totalRemainingFree = freeSpinsLeftRef.current;
        const isEndingFS = (totalRemainingFree === 0 && isFreeRound && !data.triggerFreeSpins);
        if (isEndingFS) {
          isCurrentSpinFreeRef.current = false;
          const finalFsWin = freeSpinTotalWinRef.current;
          setCelebration({
            type: 'free_spins_total',
            amount: finalFsWin,
            title: 'TOTAL KEMENANGAN',
            subtext: finalFsWin > 0
              ? 'SELAMAT! TOTAL KEMENANGAN PUTARAN GRATIS DUOFU!'
              : 'PUTARAN GRATIS SELESAI!'
          });
        }
      }, allReelsSettled);
    };

    const handleSpinError = (data: any) => {
      alert(data.message);
      setIsSpinning(false);
      spinningColsRef.current = [false, false, false, false, false];
      setSpinningCols([false, false, false, false, false]);
      setAutoSpinCount(0);
    };

    socket.on('spin_result', handleSpinResult);
    socket.on('spin_error', handleSpinError);
    return () => {
      socket.off('spin_result', handleSpinResult);
      socket.off('spin_error', handleSpinError);
    };
  }, [socket, betAmount]);

  // Auto-spin & Free Spins Auto Progression
  useEffect(() => {
    let timer: any;
    const hasFree = freeSpinsLeftRef.current > 0;
    const hasAuto = autoSpinCount > 0;
    if ((hasFree || hasAuto) && !isSpinning && !showWinAlert && !celebration) {
      timer = setTimeout(() => {
        if (!hasFree && hasAuto) {
          setAutoSpinCount(prev => prev > 0 ? prev - 1 : 0);
        }
        handleSpin();
      }, Math.max(250, 1000 / spinSpeedRef.current));
    }
    return () => clearTimeout(timer);
  }, [autoSpinCount, isSpinning, showWinAlert, spinSpeed, celebration, freeSpinsLeft]);

  const handleSpin = () => {
    if (isSpinning || !socket) return;
    const isFree = freeSpinsLeftRef.current > 0;
    isCurrentSpinFreeRef.current = isFree;

    if (!isFree) {
      const available = (profile?.coins || 0) + (profile?.bonusCoins || 0);
      if (available < betAmount) {
        alert('Koin tidak cukup! Saldo Koin & Bonus tidak mencukupi taruhan.');
        setAutoSpinCount(0);
        return;
      }
    }

    setWinAmount(0);
    setShowWinAlert(false);
    setWinningSymbols([]);
    setIsSpinning(true);
    spinningColsRef.current = [true, true, true, true, true];
    setSpinningCols([true, true, true, true, true]);

    if (isFree) {
      const nextFree = Math.max(0, freeSpinsLeftRef.current - 1);
      freeSpinsLeftRef.current = nextFree;
      setFreeSpinsLeft(nextFree);
    } else {
      setProfile((prev: any) => {
        if (!prev) return prev;
        let remBonus = prev.bonusCoins || 0;
        let remCoins = prev.coins || 0;
        if (remBonus >= betAmount) {
          remBonus -= betAmount;
        } else {
          const diff = betAmount - remBonus;
          remBonus = 0;
          remCoins = Math.max(0, remCoins - diff);
        }
        localStorage.setItem('domino_bonus_coins', remBonus.toString());
        localStorage.setItem('domino_coins', remCoins.toString());
        window.dispatchEvent(new Event('domino_coins_updated'));
        return { ...prev, coins: remCoins, bonusCoins: remBonus };
      });
    }
    socket.emit('spin_slot', { username: myUsername, betAmount });
  };

  const changeBet = (dir: number) => {
    setBetAmount(prev => stepSlotBet(prev, dir));
  };

  return (
    <div className="dfdc-bg">

      {/* MULTIPLIER BAR */}
      <SlotMultiplierBar idx={multInfo?.idx ?? 0} />

      {/* ===== COIN BALANCE BAR (top) ===== */}
      <div className="dfdc-coin-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2vw', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2vw' }}>
          <button className="g-btn-press" style={{ width: 'max(38px, 8.5vh)', height: 'max(38px, 8.5vh)', minWidth: '38px', minHeight: '38px', borderRadius: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.65) 100%)', border: '2.5px solid #f1c40f', color: '#fff', fontSize: 'max(22px, 4.5vh)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0.4vh 1vh rgba(0,0,0,0.5)', flexShrink: 0 }} onClick={onBack}>‹</button>
          <div
            className="g-btn-press"
            onClick={() => setShowProfileModal(true)}
            title="Lihat Profil VIP"
            style={{ display: 'flex', alignItems: 'center', gap: '1.2vw', background: 'linear-gradient(135deg, rgba(0,0,0,0.8), rgba(40,20,0,0.9))', border: '2.5px solid #f1c40f', borderRadius: '40px', padding: '0.6vh 1.8vw 0.6vh 0.6vh', cursor: 'pointer', boxShadow: '0 0.5vh 1.4vh rgba(0,0,0,0.65)' }}
          >
            <div style={{ width: 'max(42px, 9.5vh)', height: 'max(42px, 9.5vh)', minWidth: '42px', minHeight: '42px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #ffd700', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', boxShadow: '0 0 1.2vh rgba(255,215,0,0.6)', flexShrink: 0 }}>
              {renderSlotAvatar(userProfile.avatar, '', '🐸')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#fff', fontSize: 'max(14px, 2.2vh)', fontWeight: 900, lineHeight: 1.15 }}>{userProfile.username || 'Pemain'}</span>
              <span style={{ color: '#3e2723', background: 'linear-gradient(135deg, #ffd700, #ff8c00)', fontSize: 'max(11px, 1.5vh)', fontWeight: 900, padding: '0.3vh 1vh', borderRadius: '0.6vh', border: '0.15vh solid #fff', marginTop: '0.3vh', alignSelf: 'flex-start' }}>VIP {userProfile.vipLevel}</span>
            </div>
          </div>
        </div>
        <div className="dfdc-coin-display">
          <span className="dfdc-coin-icon">🪙</span>
          <span className="dfdc-coin-amount">{profile ? ((profile.coins || 0) + (profile.bonusCoins || 0)).toLocaleString() : '0'}</span>
          <button className="dfdc-coin-plus g-btn-press">+</button>
        </div>
        <div style={{ position: 'relative' }}>
          <button className="g-btn-press" style={{ width: 'max(40px, 9vh)', height: 'max(40px, 9vh)', minWidth: '40px', minHeight: '40px', borderRadius: '50%', background: 'linear-gradient(180deg, rgba(255,215,0,0.3) 0%, rgba(0,0,0,0.7) 100%)', border: '3px solid #f1c40f', color: '#ffd700', fontSize: 'max(22px, 4.8vh)', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0.5vh 1.4vh rgba(0,0,0,0.65)', flexShrink: 0 }} onClick={() => setShowMenu(v => !v)}>≡</button>
          <GameMenuDropdown
            isOpen={showMenu}
            onClose={() => setShowMenu(false)}
            items={[
              { id: 'lobi', icon: '🚪', label: 'Lobi', onClick: () => { setShowMenu(false); onBack(); } },
              { id: 'tabel', icon: '📜', label: 'Tabel Bayaran', onClick: () => { setShowMenu(false); alert('Duo Fu Duo Cai: 243 Cara Menang!'); } },
              { id: 'speed', icon: '⚡', label: 'Putaran Cepat', badge: spinSpeed > 1 ? 'ON' : 'OFF', onClick: () => setSpinSpeed(s => s === 1 ? 2 : 1) },
              { id: 'suara', icon: '🔊', label: 'Suara', badge: soundOn ? 'ON' : 'OFF', onClick: () => setSoundOn(v => !v) },
              { id: 'musik', icon: '🎵', label: 'Musik', badge: musicOn ? 'ON' : 'OFF', onClick: () => setMusicOn(v => !v) },
              { id: 'bantuan', icon: '❓', label: 'Bantuan', onClick: () => { setShowMenu(false); alert('Kumpulkan simbol identik di reels bertetangga dari kiri ke kanan!'); } }
            ]}
          />
        </div>
      </div>

      {/* ===== JACKPOT + BOWL SECTION ===== */}
      <div className="dfdc-jackpot-section">
        {/* Left column */}
        <div className="dfdc-jp-col">
          <div className="dfdc-jp-box dfdc-jp-grand">
            <span className="dfdc-jp-label">GRAND</span>
            <span className="dfdc-jp-val">{(betAmount * 200).toLocaleString()}</span>
          </div>
          <div className="dfdc-jp-box dfdc-jp-minor">
            <span className="dfdc-jp-label">MINOR</span>
            <span className="dfdc-jp-val">{(betAmount * 25).toLocaleString()}</span>
          </div>
        </div>

        {/* Golden Bowl */}
        <div className="dfdc-bowl-wrap">
          <div className="dfdc-bowl-icon">🏺</div>
          <div className="dfdc-bowl-coins">✨</div>
        </div>

        {/* Right column */}
        <div className="dfdc-jp-col">
          <div className="dfdc-jp-box dfdc-jp-major">
            <span className="dfdc-jp-label">MAJOR</span>
            <span className="dfdc-jp-val">{(betAmount * 50).toLocaleString()}</span>
          </div>
          <div className="dfdc-jp-box dfdc-jp-mini">
            <span className="dfdc-jp-label">MINI</span>
            <span className="dfdc-jp-val">{(betAmount * 10).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ===== MAIN GAME FRAME ===== */}
      <div className="dfdc-game-frame">
        <div className="dfdc-outer-frame">

          {/* Left Dragon Pillar */}
          <div className="dfdc-dragon-pillar left">
            <span className="dfdc-dragon-emoji">🐉</span>
            <span className="dfdc-pillar-label">GOLD PAYS</span>
            <span className="dfdc-pillar-ways">243</span>
          </div>

          {/* Reel Board */}
          <div className="dfdc-board-frame">
            {/* Reel line indicators */}
            <div className="dfdc-reel-lines">
              <div className="dfdc-reel-line" />
              <div className="dfdc-reel-line" />
            </div>

            {/* PIXIJS WebGL Canvas for Reels */}
            <PixiSlotGame
              grid={grid}
              isSpinning={isSpinning}
              spinningCols={spinningCols}
              winAmount={winAmount}
              winningSymbols={winningSymbols}
              winType={winType}
              speedMultiplier={spinSpeed}
            />

            {/* Win Alert Overlay */}
            {showWinAlert && (
              <div className="dfdc-win-overlay">
                <div className={`dfdc-win-box ${winType === 'mega_win' ? 'dfdc-win-mega' : ''}`}>
                  <span className="dfdc-win-title">
                    {winType === 'mega_win' ? '🎆 MEGA WIN!' : winType === 'big_win' ? '🎉 BIG WIN!' : '✨ MENANG!'}
                  </span>
                  <span className="dfdc-win-amount">+{winAmount.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Dragon Pillar */}
          <div className="dfdc-dragon-pillar right">
            <span className="dfdc-dragon-emoji">🐉</span>
            <span className="dfdc-pillar-label">GOLD PAYS</span>
            <span className="dfdc-pillar-ways">243</span>
          </div>
        </div>
      </div>

      {/* ===== FLOATING SPEEDER WIDGET ===== */}
      <div className="dfdc-speeder-widget">
        <button
          className="dfdc-speeder-btn g-btn-press"
          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
        >
          {spinSpeed > 1 ? `⚡ ${spinSpeed}x` : 'SPEED'}
        </button>
        {showSpeedMenu && (
          <div className="dfdc-speeder-menu">
            {[1, 2, 3, 5, 10].map(spd => (
              <button
                key={spd}
                className={spinSpeed === spd ? 'active' : ''}
                onClick={() => { setSpinSpeed(spd); setShowSpeedMenu(false); }}
              >
                {spd}x
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ===== BOTTOM BAR ===== */}
      <div className="dfdc-bottom-bar">
        {/* Pause */}
        <button className="dfdc-pause-btn g-btn-press" onClick={onBack}>⏸</button>

        {/* Bet Section */}
        <div className="dfdc-bet-section">
          <button className="dfdc-info-btn g-btn-press">i</button>
          <button className="dfdc-bet-minus g-btn-press" onClick={() => changeBet(-1)}>−</button>
          <div className="dfdc-bet-val-wrap">
            <span className="dfdc-bet-label">TOTAL BET</span>
            <span className="dfdc-bet-val">{betAmount.toLocaleString()}</span>
          </div>
          <button className="dfdc-bet-plus g-btn-press" onClick={() => changeBet(1)}>+</button>
        </div>


        <div className="dfdc-center-text">
          <span className="dfdc-scroll-text">Rejeki melimpah &nbsp;✨&nbsp; Duo Fu Duo Cai &nbsp;🐉&nbsp; Keberuntungan menanti Anda!</span>
        </div>


        <button className="dfdc-max-btn g-btn-press" onClick={() => setBetAmount(MAX_SLOT_BET)}>
          MAX
          <span className="dfdc-max-sub">BET</span>
        </button>

        <SlotSpeedButton
          speed={spinSpeed}
          onSpeedChange={setSpinSpeed}
          className="dfdc-speed-btn g-btn-press"
          buttonText={`X${spinSpeed}`}
          theme="gold"
        />


        <div style={{ position: 'relative', display: 'flex' }}>
          {showAutoMenu && (
            <div className="dfdc-auto-menu">
              <button onClick={() => { setAutoSpinCount(10); setShowAutoMenu(false); handleSpin(); }}>10</button>
              <button onClick={() => { setAutoSpinCount(20); setShowAutoMenu(false); handleSpin(); }}>20</button>
              <button onClick={() => { setAutoSpinCount(50); setShowAutoMenu(false); handleSpin(); }}>50</button>
              <button onClick={() => { setAutoSpinCount(100); setShowAutoMenu(false); handleSpin(); }}>100</button>
              <button onClick={() => { setAutoSpinCount(99999); setShowAutoMenu(false); handleSpin(); }}>~</button>
            </div>
          )}
          <button
            className={`dfdc-spin-btn g-btn-press ${isSpinning ? 'spinning' : ''}`}
            onMouseDown={() => {
              if (isSpinning || autoSpinCount > 0) return;
              spinPressTimer.current = setTimeout(() => setShowAutoMenu(true), 400);
            }}
            onMouseUp={() => {
              if (spinPressTimer.current) clearTimeout(spinPressTimer.current);
            }}
            onMouseLeave={() => {
              if (spinPressTimer.current) clearTimeout(spinPressTimer.current);
            }}
            onTouchStart={() => {
              if (isSpinning || autoSpinCount > 0) return;
              spinPressTimer.current = setTimeout(() => setShowAutoMenu(true), 400);
            }}
            onTouchEnd={() => {
              if (spinPressTimer.current) clearTimeout(spinPressTimer.current);
            }}
            onClick={() => {
              if (isSpinning) {

                setAutoSpinCount(0);
              } else if (autoSpinCount > 0) {
                setAutoSpinCount(0);
              } else if (!showAutoMenu) {
                handleSpin();
              }
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
              <span style={{ fontSize: '3.2vh', fontWeight: 900 }}>{isSpinning ? 'STOP' : freeSpinsLeft > 0 ? 'FREE' : 'SPIN'}</span>
              {freeSpinsLeft > 0 ? (
                <span style={{ fontSize: '1.2vh', fontWeight: 900, color: '#00e676', textShadow: '0 1px 3px rgba(0,0,0,0.9)', marginTop: '0.2vh' }}>
                  SISA: {freeSpinsLeft}
                </span>
              ) : autoSpinCount > 0 ? (
                <span style={{ fontSize: '1.2vh', fontWeight: 900, color: '#ffe082', textShadow: '0 1px 3px rgba(0,0,0,0.9)', marginTop: '0.2vh' }}>
                  {autoSpinCount === 99999 ? 'AUTO ∞' : `AUTO: ${autoSpinCount}`}
                </span>
              ) : null}
            </div>
          </button>
        </div>
      </div>

      {/* Universal Slot Celebration Modal */}
      <SlotCelebrationModal data={celebration} onClose={() => setCelebration(null)} />

      {/* User VIP Profile Modal */}
      {showProfileModal && (
        <SlotProfileModal
          profile={userProfile}
          coins={profile ? profile.coins : 0}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
}

// =====================================================
// KOMPONEN SLOT LOBBY (Redesigned — matches reference UI)
// =====================================================
// =====================================================
// KOMPONEN SLOT LOBBY (Pixel-close to reference)
// =====================================================




function SlotLobbyScreen({ onBack, onPlaySlot }: { onBack: () => void; onPlaySlot: (gameId: string) => void }) {
  const [profile, setProfile] = useState<any>(null);
  const myUsername = localStorage.getItem('domino_username') || '';
  const userProfile = useSlotProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsMouseDown(true);
    setIsDragging(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseLeave = () => { setIsMouseDown(false); setIsDragging(false); };
  const handleMouseUp = () => { setIsMouseDown(false); setTimeout(() => setIsDragging(false), 50); };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 10) setIsDragging(true);
    if (isDragging) {
      e.preventDefault();
      scrollRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  useEffect(() => {
    if (!myUsername) return;
    fetch(`${API_URL}/profile/${myUsername}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProfile(d); })
      .catch(() => { });
  }, [myUsername]);

  const [promoTime, setPromoTime] = useState(34 * 3600 + 26 * 60 + 38);
  useEffect(() => {
    const t = setInterval(() => setPromoTime(p => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);
  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  const formatCoins = (n: number) => {
    if (!n) return '0';
    return n.toLocaleString('id-ID');
  };

  const handleCardClick = (game: SlotGameDef) => {
    if (!game.locked) {
      if (game.id === 'duofugrand') {
        onPlaySlot('duofuduocai');
        return;
      }
      onPlaySlot(game.id);
    } else {
      alert(`${game.name} sedang dalam pengembangan (Coming Soon)!`);
    }
  };

  return (
    <div className="screen-wrapper sl-bg">
      {/* ===== TOP BAR ===== */}
      <div className="sl-topbar">
        {/* Kiri */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1vh', flex: 1 }}>
          <div
            className="sl-topbar-avatar g-btn-press"
            onClick={() => setShowProfileModal(true)}
            title="Lihat Profil VIP"
            style={{ cursor: 'pointer', overflow: 'hidden' }}
          >
            {renderSlotAvatar(userProfile.avatar, '', '🐸')}
          </div>
          <div className="sl-topbar-coins">
            <span className="sl-coin-icon">🪙</span>
            <span className="sl-coin-val">{profile ? formatCoins(profile.coins) : '6.270.000'}</span>
          </div>
        </div>

        {/* Tengah (Centered) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2vh', justifyContent: 'center', flex: 2 }}>
          <button className="sl-toko-pill g-btn-press" onClick={onBack}>TOKO</button>
          <button className="sl-promo-pill g-btn-press" onClick={() => alert('Promo aktif! Cek Toko untuk penawaran spesial.')}>
            <span className="sl-promo-icon">🎁</span>
            <span className="sl-promo-text">
              <span className="sl-promo-label">PROMO</span>
              <span className="sl-promo-timer">{fmtTime(promoTime)}</span>
            </span>
          </button>
          <div className="sl-star-badge">
            <span className="sl-star-num">1</span>
            <span className="sl-star-drop">💧</span>
            <span className="sl-star-pct">7%</span>
          </div>
        </div>

        {/* Kanan */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
          <button className="sl-exit-btn g-btn-press" onClick={onBack}>⏎</button>
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div className="sl-body">
        {/* Left icon rail */}
        <div className="sl-rail">
          <button className="sl-rail-btn g-btn-press active" onClick={() => { }}>🔥</button>
          <button className="sl-rail-btn g-btn-press" onClick={onBack}>🏠</button>
          <button className="sl-rail-btn g-btn-press" onClick={() => alert('Event kalender segera hadir!')}>📅</button>
          <button className="sl-rail-btn g-btn-press" onClick={() => alert('Favorit Anda tersimpan di sini.')}>❤️</button>
        </div>

        {/* Big Jackpot hero card - Gates of Olympus (Active) */}
        <div
          className="sl-hero-card g-btn-press"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0.05) 45%, rgba(0, 0, 0, 0.92) 100%), url('/assets/zeus/bg_olympus_hd.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          onClick={() => onPlaySlot('zeus')}
        >
          <div className="sl-hero-topicons">⚡</div>
          <div className="sl-hero-jackpot-label">Jackpot Olympus</div>
          <div className="sl-hero-jackpot-val">5,000,000,000</div>
          <div className="sl-hero-title">GATES OF<br />OLYMPUS</div>
          <div className="sl-hero-bottom">
            <span className="sl-card-lock-icon">🔓</span>
            <span className="sl-hero-players">👤 320,450 main</span>
          </div>
        </div>

        {/* Grid */}
        <div
          className={`sl-grid-wrap ${isDragging ? 'sl-dragging' : ''}`}
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <div className="sl-grid" style={{ pointerEvents: isDragging ? 'none' : 'auto' }}>
            {SLOT_GAMES.map(game => (
              <div
                key={game.id}
                className={`sl-card-v2 ${game.locked ? 'sl-card-locked is-coming-soon' : 'is-active-game'} g-btn-press`}
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.05) 45%, rgba(0, 0, 0, 0.92) 100%), url('${game.img}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                onClick={() => handleCardClick(game)}
              >
                <div className="sl-card-jackpot-pill">
                  {game.jackpot}
                  <span className="sl-card-jackpot-cardicon">🎴</span>
                </div>
                {game.lockText && (
                  <div className="sl-card-locktext">
                    <span style={{ display: 'block', fontSize: '1.6vh', marginBottom: '0.2vh' }}>🔒</span>
                    {game.lockText.split('\n').map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                )}
                <div className="sl-card-bottom-area">
                  <div className="sl-card-name-v2">{game.name}</div>
                  <div className="sl-card-bottom-info">
                    <span className="sl-card-lock-icon">{game.locked ? '🔒' : '🔓'}</span>
                    <span className="sl-card-players-v2">👤 {game.players.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== BOTTOM BAR ===== */}
      <div className="sl-bottombar">
        <button className="sl-bot-btn g-btn-press" onClick={() => alert('Koleksi Kartu Anda.')}>
          <span className="sl-bot-icon">🗂️</span>
          <span className="sl-bot-label">KARTU</span>
        </button>
        <button className="sl-bot-btn g-btn-press" onClick={() => alert('Misi slot baru tersedia!')}>
          <span className="sl-bot-icon">🎁</span>
          <span className="sl-bot-label">MISI<br />SLOT BARU</span>
        </button>
        <button className="sl-bot-btn g-btn-press" onClick={() => alert('Paket legenda spesial!')}>
          <span className="sl-bot-icon">🏅</span>
          <span className="sl-bot-label">PAKET<br />LEGENDA</span>
        </button>
        <button className="sl-bot-btn g-btn-press" onClick={() => alert('Toko kejutan hari ini!')}>
          <span className="sl-bot-icon">🧰</span>
          <span className="sl-bot-label">TOKO<br />KEJUTAN</span>
        </button>
        <button className="sl-bot-btn g-btn-press" onClick={() => alert('Bergabung dengan komunitas!')}>
          <span className="sl-bot-icon">👥</span>
          <span className="sl-bot-label">KOMUNITAS</span>
        </button>
        <button className="sl-bot-btn g-btn-press" onClick={() => alert('Lihat peringkat pemain.')}>
          <span className="sl-bot-icon">🥇</span>
          <span className="sl-bot-label">PERINGKAT</span>
        </button>
        <button className="sl-mulai-btn g-btn-press" onClick={() => onPlaySlot('zeus')}>
          <span className="sl-mulai-label">MULAI</span>
          <span className="sl-mulai-sub">Gates of Olympus</span>
        </button>
      </div>

      {showProfileModal && (
        <SlotProfileModal
          profile={userProfile}
          coins={profile ? profile.coins : 6270000}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
}

// QiuQiu Tile Helper Functions
type QiuTile = [number, number];

const FULL_DOMINO_DECK: QiuTile[] = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
  [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6],
  [2, 2], [2, 3], [2, 4], [2, 5], [2, 6],
  [3, 3], [3, 4], [3, 5], [3, 6],
  [4, 4], [4, 5], [4, 6],
  [5, 5], [5, 6],
  [6, 6]
];

const getQiuPips = (t: QiuTile) => t[0] + t[1];
const getQiuPairScore = (t1: QiuTile, t2: QiuTile) => (getQiuPips(t1) + getQiuPips(t2)) % 10;

interface QiuEvaluation {
  rank: number; // 6: Six Devil, 5: Twin, 4: Small, 3: Big, 2: QiuQiu, 1: Normal
  title: string;
  leftScore: number;
  rightScore: number;
  bestPairs: [QiuTile, QiuTile, QiuTile, QiuTile];
}

const evaluateQiuHand = (hand: QiuTile[]): QiuEvaluation => {
  if (!hand || hand.length < 4) {
    const s = hand && hand.length >= 2 ? getQiuPairScore(hand[0], hand[1]) : 0;
    return { rank: 1, title: `${s} : ?`, leftScore: s, rightScore: 0, bestPairs: [hand[0] || [0, 0], hand[1] || [0, 0], hand[2] || [0, 0], [0, 0]] };
  }

  const [t1, t2, t3, t4] = hand;
  const totalPips = getQiuPips(t1) + getQiuPips(t2) + getQiuPips(t3) + getQiuPips(t4);

  // 1. Six Devil: All 4 tiles each have exactly 6 pips
  if (getQiuPips(t1) === 6 && getQiuPips(t2) === 6 && getQiuPips(t3) === 6 && getQiuPips(t4) === 6) {
    return { rank: 6, title: 'Six Devil 😈', leftScore: 9, rightScore: 9, bestPairs: [t1, t2, t3, t4] };
  }

  // 2. Twin Cards: All 4 tiles are double balak
  if (t1[0] === t1[1] && t2[0] === t2[1] && t3[0] === t3[1] && t4[0] === t4[1]) {
    return { rank: 5, title: 'Twin Cards 💎', leftScore: 9, rightScore: 9, bestPairs: [t1, t2, t3, t4] };
  }

  // 3. Small Cards: Total sum <= 9
  if (totalPips <= 9) {
    return { rank: 4, title: 'Murni Kecil 🌟', leftScore: 9, rightScore: 9, bestPairs: [t1, t2, t3, t4] };
  }

  // 4. Big Cards: Total sum >= 39
  if (totalPips >= 39) {
    return { rank: 3, title: 'Murni Besar ⚡', leftScore: 9, rightScore: 9, bestPairs: [t1, t2, t3, t4] };
  }

  // Test all 3 possible pair combinations to find best (Left >= Right)
  const combinations = [
    { p1: [t1, t2], p2: [t3, t4] },
    { p1: [t1, t3], p2: [t2, t4] },
    { p1: [t1, t4], p2: [t2, t3] },
  ];

  let bestCombo: any = null;
  let bestScoreVal = -1;

  for (const c of combinations) {
    let s1 = getQiuPairScore(c.p1[0] as QiuTile, c.p1[1] as QiuTile);
    let s2 = getQiuPairScore(c.p2[0] as QiuTile, c.p2[1] as QiuTile);
    let left = Math.max(s1, s2);
    let right = Math.min(s1, s2);
    let leftPair = s1 >= s2 ? c.p1 : c.p2;
    let rightPair = s1 >= s2 ? c.p2 : c.p1;

    let totalRankVal = left * 10 + right;
    if (totalRankVal > bestScoreVal) {
      bestScoreVal = totalRankVal;
      bestCombo = {
        left,
        right,
        bestPairs: [leftPair[0], leftPair[1], rightPair[0], rightPair[1]] as [QiuTile, QiuTile, QiuTile, QiuTile]
      };
    }
  }

  const isQiuQiu = bestCombo.left === 9 && bestCombo.right === 9;
  const isQiuX = bestCombo.left === 9;

  return {
    rank: isQiuQiu ? 2 : 1,
    title: isQiuQiu ? 'QiuQiu 9-9 🔥' : isQiuX ? `Qiu ${bestCombo.right}` : `${bestCombo.left} : ${bestCombo.right}`,
    leftScore: bestCombo.left,
    rightScore: bestCombo.right,
    bestPairs: bestCombo.bestPairs
  };
};

interface FlyChipItem {
  id: number;
  fromX: string;
  fromY: string;
  toX: string;
  toY: string;
  delay: number;
}

const SEAT_COORDS: Record<number, { x: string; y: string }> = {
  0: { x: '50vw', y: '85vh' },
  1: { x: '88vw', y: '35vh' },
  2: { x: '75vw', y: '10vh' },
  3: { x: '25vw', y: '10vh' },
  4: { x: '12vw', y: '70vh' },
  5: { x: '88vw', y: '70vh' },
};

const CENTER_POT_COORDS = { x: '50vw', y: '46vh' };

// =====================================================
// KOMPONEN GAME DOMINO QIUQIU (99) AUTHENTIC CASINO TABLE
// =====================================================
function QiuQiuGameScreen({
  onBack,
  socket,
  room,
  customPlayers,
  customBet,
}: {
  onBack: () => void;
  socket: Socket | null;
  room?: QiuQiuRoomConfig;
  customPlayers?: any[] | null;
  customBet?: number | null;
}) {
  const activeRoom = room || QIUQIU_ROOMS[0];
  const myUsername = localStorage.getItem('domino_username') || 'V2043';
  const avatarEmoji = localStorage.getItem('domino_avatar') || '🐸';

  const [phase, setPhase] = useState<'round1_bet' | 'mix' | 'tentukan' | 'round2_bet' | 'showdown'>('round1_bet');
  const [potAmount, setPotAmount] = useState((customBet ? Math.round(customBet * 0.1) : activeRoom.ante) * (customPlayers?.length || 6));
  const [tentukanCount, setTentukanCount] = useState(10);
  const [activeTurnIdx, setActiveTurnIdx] = useState(0);
  const [winnerNotice, setWinnerNotice] = useState<{ winnerName: string; amount: number; title: string } | null>(null);
  const [flyingChips, setFlyingChips] = useState<FlyChipItem[]>([]);
  const [userComboIdx, setUserComboIdx] = useState(0);

  // Deck & Deal State
  const [deck, setDeck] = useState<QiuTile[]>([]);

  const [currentBetTarget, setCurrentBetTarget] = useState(customBet ? Math.round(customBet * 0.1) : activeRoom.blind);

  const [showMenu, setShowMenu] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [effectOn, setEffectOn] = useState(true);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Exit Confirmation Modal & Safe Cashout
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const [tableCode, setTableCode] = useState(() => 'Q' + Math.floor(100 + Math.random() * 900));
  const [tableToast, setTableToast] = useState<string | null>(null);
  const [isStanding, setIsStanding] = useState(false);

  const showToast = (msg: string) => {
    setTableToast(msg);
    setTimeout(() => {
      setTableToast(null);
    }, 2800);
  };

  // 6 Players seating state initialized with active room buyIn or By One custom players
  const [seats, setSeats] = useState<any[]>(() => {
    const buyIn = customBet || activeRoom.buyIn;
    const blind = customBet ? Math.round(customBet * 0.1) : activeRoom.blind;

    if (customPlayers && customPlayers.length > 0) {
      const myPlayer = customPlayers.find((p: any) => p.username === myUsername) || { username: myUsername, avatar: avatarEmoji, coins: buyIn };
      const otherPlayers = customPlayers.filter((p: any) => p.username !== myUsername);

      const realSeats = [
        { id: 0, name: myPlayer.username, coins: myPlayer.coins || buyIn, avatar: myPlayer.avatar || avatarEmoji, isDealer: false, badge: 'Cek', currentBet: blind, turn: true, score: '9 : 7', hand: [[6, 3], [0, 0], [5, 4], [0, 0]], folded: false, isEmpty: false }
      ];

      otherPlayers.forEach((p: any, idx: number) => {
        realSeats.push({
          id: idx + 1,
          name: p.username,
          coins: p.coins || buyIn,
          avatar: p.avatar || '🐯',
          isDealer: idx === 0,
          badge: 'Cek',
          currentBet: blind,
          turn: false,
          score: '9 : 5',
          hand: [[6, 6], [1, 6], [5, 2], [0, 4]],
          folded: false,
          isEmpty: false,
        });
      });

      // Fill remaining seats as EMPTY (not bots!)
      for (let i = realSeats.length; i < 6; i++) {
        realSeats.push({
          id: i,
          name: 'Kursi Kosong',
          coins: 0,
          avatar: '🪑',
          isDealer: false,
          badge: '',
          currentBet: 0,
          turn: false,
          score: '',
          hand: [],
          folded: true,
          isEmpty: true,
        });
      }

      return realSeats;
    }

    return [
      { id: 0, name: myUsername, coins: buyIn, avatar: avatarEmoji, isDealer: false, badge: 'Cek', currentBet: blind, turn: true, score: '9 : 7', hand: [[6, 3], [0, 0], [5, 4], [0, 0]], folded: false, isEmpty: false },
      { id: 1, name: 'CPH2773', coins: Math.round(buyIn * 1.2), avatar: '🐯', isDealer: true, badge: 'Cek', currentBet: blind, turn: false, score: '9 : 1', hand: [[6, 6], [1, 6], [5, 2], [0, 4]], folded: false, isEmpty: false },
      { id: 2, name: 'Infinix X669', coins: Math.round(buyIn * 0.9), avatar: '👩', isDealer: false, badge: 'Cek', currentBet: blind, turn: false, score: '8 : 2', hand: [[5, 3], [0, 0], [4, 4], [0, 4]], folded: false, isEmpty: false },
      { id: 3, name: 'Sultan_QQ', coins: Math.round(buyIn * 3.5), avatar: '🧔‍♂️', isDealer: false, badge: 'Balik', currentBet: 0, turn: false, score: '9 : 5', hand: [[6, 5], [4, 4], [3, 2], [0, 0]], folded: true, isEmpty: false },
      { id: 4, name: 'Dewi_QQ', coins: Math.round(buyIn * 1.5), avatar: '👩‍🦰', isDealer: false, badge: 'Cek', currentBet: blind, turn: false, score: '7 : 6', hand: [[4, 3], [0, 0], [3, 3], [0, 0]], folded: false, isEmpty: false },
      { id: 5, name: 'V2043', coins: Math.round(buyIn * 0.8), avatar: '👨‍🦱', isDealer: false, badge: 'Cek', currentBet: blind, turn: false, score: '7 : 3', hand: [[5, 2], [0, 0], [2, 1], [0, 0]], folded: false, isEmpty: false },
    ];
  });

  const seatsRef = useRef(seats);
  useEffect(() => {
    seatsRef.current = seats;
  }, [seats]);

  const hasCashedOutRef = useRef(false);

  // Refund / Cashout player's table chips back to main wallet on exit
  const handleExecuteCashoutAndExit = async () => {
    if (isExiting || hasCashedOutRef.current) return;
    setIsExiting(true);
    hasCashedOutRef.current = true;
    const remainingChips = seatsRef.current[0]?.coins || 0;
    const savedUser = localStorage.getItem('domino_username');

    if (savedUser && remainingChips > 0) {
      try {
        await fetch(`${API_URL}/users/update-coins`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: savedUser, amount: remainingChips }),
        });
      } catch (err) {
        console.error('Failed to refund table coins on exit:', err);
      }
    }

    window.dispatchEvent(new Event('domino_coins_updated'));
    setShowExitConfirm(false);
    onBack();
  };

  // Safe beforeunload handler to prevent losing coins if browser closed
  useEffect(() => {
    const handleUnload = () => {
      if (hasCashedOutRef.current) return;
      hasCashedOutRef.current = true;
      const remainingChips = seatsRef.current[0]?.coins || 0;
      const savedUser = localStorage.getItem('domino_username');
      if (savedUser && remainingChips > 0) {
        navigator.sendBeacon(
          `${API_URL}/users/update-coins`,
          new Blob([JSON.stringify({ username: savedUser, amount: remainingChips })], { type: 'application/json' })
        );
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  const handleGantiMeja = () => {
    const newCode = 'Q' + Math.floor(100 + Math.random() * 900);
    setTableCode(newCode);
    setIsStanding(false);
    showToast(`🔄 Berpindah ke Meja Baru [Meja #${newCode}]...`);

    const buyIn = activeRoom.buyIn;
    const BOT_POOLS = [
      { name: 'CPH' + Math.floor(1000 + Math.random() * 9000), avatar: '🐯', coins: Math.round(buyIn * 1.2) },
      { name: 'Infinix_' + Math.floor(100 + Math.random() * 900), avatar: '👩', coins: Math.round(buyIn * 0.9) },
      { name: 'Sultan_' + Math.floor(10 + Math.random() * 90), avatar: '🧔‍♂️', coins: Math.round(buyIn * 3.5) },
      { name: 'Dewi_QQ', avatar: '👩‍🦰', coins: Math.round(buyIn * 1.5) },
      { name: 'Rizky_' + Math.floor(10 + Math.random() * 90), avatar: '👨‍🦱', coins: Math.round(buyIn * 1.1) },
      { name: 'Baim99', avatar: '🦊', coins: Math.round(buyIn * 2.0) },
      { name: 'Alfi_Win', avatar: '🐼', coins: Math.round(buyIn * 1.3) },
      { name: 'KingDomino', avatar: '👑', coins: Math.round(buyIn * 2.5) }
    ].sort(() => Math.random() - 0.5);

    const playerCurrentCoins = seats[0]?.coins || buyIn;
    const shuffled = [...FULL_DOMINO_DECK].sort(() => Math.random() - 0.5);
    const newSeats = [
      { id: 0, name: myUsername, coins: playerCurrentCoins, avatar: avatarEmoji, isDealer: false, badge: 'Cek', currentBet: activeRoom.blind, turn: true, score: '9 : 7', hand: [shuffled.pop() || [0, 0], shuffled.pop() || [0, 0], shuffled.pop() || [0, 0], shuffled.pop() || [0, 0]], folded: false },
      { id: 1, name: BOT_POOLS[0].name, coins: BOT_POOLS[0].coins, avatar: BOT_POOLS[0].avatar, isDealer: true, badge: 'Cek', currentBet: activeRoom.blind, turn: false, score: '9 : 1', hand: [shuffled.pop() || [0, 0], shuffled.pop() || [0, 0], shuffled.pop() || [0, 0], shuffled.pop() || [0, 0]], folded: false },
      { id: 2, name: BOT_POOLS[1].name, coins: BOT_POOLS[1].coins, avatar: BOT_POOLS[1].avatar, isDealer: false, badge: 'Cek', currentBet: activeRoom.blind, turn: false, score: '8 : 2', hand: [shuffled.pop() || [0, 0], shuffled.pop() || [0, 0], shuffled.pop() || [0, 0], shuffled.pop() || [0, 0]], folded: false },
      { id: 3, name: BOT_POOLS[2].name, coins: BOT_POOLS[2].coins, avatar: BOT_POOLS[2].avatar, isDealer: false, badge: 'Balik', currentBet: 0, turn: false, score: '9 : 5', hand: [shuffled.pop() || [0, 0], shuffled.pop() || [0, 0], shuffled.pop() || [0, 0], shuffled.pop() || [0, 0]], folded: true },
      { id: 4, name: BOT_POOLS[3].name, coins: BOT_POOLS[3].coins, avatar: BOT_POOLS[3].avatar, isDealer: false, badge: 'Cek', currentBet: activeRoom.blind, turn: false, score: '7 : 6', hand: [shuffled.pop() || [0, 0], shuffled.pop() || [0, 0], shuffled.pop() || [0, 0], shuffled.pop() || [0, 0]], folded: false },
      { id: 5, name: BOT_POOLS[4].name, coins: BOT_POOLS[4].coins, avatar: BOT_POOLS[4].avatar, isDealer: false, badge: 'Cek', currentBet: activeRoom.blind, turn: false, score: '7 : 3', hand: [shuffled.pop() || [0, 0], shuffled.pop() || [0, 0], shuffled.pop() || [0, 0], shuffled.pop() || [0, 0]], folded: false },
    ];

    setSeats(newSeats);
    setDeck(shuffled);
    setPhase('round1_bet');
    setActiveTurnIdx(0);
    setUserComboIdx(0);
    setCurrentBetTarget(activeRoom.blind);
    setPotAmount(activeRoom.ante * 6);
    setWinnerNotice(null);
    setPotChips([
      { id: 1, label: activeRoom.entryLabel, color: 'red', marginTop: 0, zIndex: 1 },
      { id: 2, label: activeRoom.entryLabel, color: 'red', marginTop: -8, zIndex: 2 },
      { id: 3, label: activeRoom.entryLabel, color: 'red', marginTop: 4, zIndex: 3 },
      { id: 4, label: activeRoom.entryLabel, color: 'red', marginTop: -12, zIndex: 4 },
      { id: 5, label: activeRoom.entryLabel, color: 'red', marginTop: 8, zIndex: 5 },
      { id: 6, label: activeRoom.entryLabel, color: 'red', marginTop: -4, zIndex: 6 },
    ]);

    setIsFlipping3D(true);
    setTimeout(() => {
      setIsFlipping3D(false);
    }, 800);
  };

  const handleBerdiri = () => {
    setIsStanding(true);
    setSeats(prev => prev.map((s, idx) => idx === 0 ? { ...s, folded: true, badge: 'Berdiri' } : s));
    showToast('🧍 Anda berdiri dari kursi. Mode Menonton aktif.');
    if (activeTurnIdx === 0) {
      setActiveTurnIdx(1);
    }
  };

  const handleDudukKembali = () => {
    setIsStanding(false);
    showToast('🪑 Anda duduk kembali. Bersiap untuk ronde berikutnya!');
  };

  const [marqueeIdx, setMarqueeIdx] = useState(0);

  const REALTIME_NOTIFS = [
    '📢 Selamat "Alfi" Di[Bonus QiuQiu 2M] Mendapatkan 2,000,000,000 Koin! 🏆 Event QiuQiu Sultan Berhadiah Puluhan Juta!',
    '📢 Selamat "Baim99" Di[Jackpot Six Devil 😈] Mendapatkan 8,500,000,000 Koin!',
    '📢 Selamat "Rizky_Domino" Di[Bonus QiuQiu 9-9 🔥] Mendapatkan 3,200,000,000 Koin!',
    '📢 Selamat "CPH2773" Di[Murni Besar ⚡] Mendapatkan 1,800,000,000 Koin!',
    '📢 Selamat "Sultan_QQ" Di[Super Twin 💎] Mendapatkan 12,000,000,000 Koin!',
  ];

  // Rotate real-time marquee notifications every 5 seconds
  useEffect(() => {
    const marqueeTimer = setInterval(() => {
      setMarqueeIdx(prev => (prev + 1) % REALTIME_NOTIFS.length);
    }, 5000);
    return () => clearInterval(marqueeTimer);
  }, []);

  // Helper to format currency labels
  const formatBetLabel = (n: number) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toString();
  };

  // Helper to calculate all 3 possible pair combinations for player 0
  const getPlayerCombinations = (hand: QiuTile[]) => {
    if (!hand || hand.length < 4) return [];
    const [t1, t2, t3, t4] = hand;
    const combos = [
      { p1: [t1, t2], p2: [t3, t4] },
      { p1: [t1, t3], p2: [t2, t4] },
      { p1: [t1, t4], p2: [t2, t3] },
    ];

    return combos.map(c => {
      let s1 = getQiuPairScore(c.p1[0] as QiuTile, c.p1[1] as QiuTile);
      let s2 = getQiuPairScore(c.p2[0] as QiuTile, c.p2[1] as QiuTile);
      let left = Math.max(s1, s2);
      let right = Math.min(s1, s2);
      let leftPair = s1 >= s2 ? c.p1 : c.p2;
      let rightPair = s1 >= s2 ? c.p2 : c.p1;
      return {
        left,
        right,
        label: `${left} : ${right}`,
        pairs: [leftPair[0], leftPair[1], rightPair[0], rightPair[1]] as [QiuTile, QiuTile, QiuTile, QiuTile]
      };
    });
  };

  const [potChips, setPotChips] = useState<Array<{ id: number; label: string; color: 'red' | 'blue' | 'purple' | 'gold'; marginTop: number; zIndex: number }>>([
    { id: 1, label: activeRoom.entryLabel, color: 'red', marginTop: 0, zIndex: 1 },
    { id: 2, label: activeRoom.entryLabel, color: 'red', marginTop: -8, zIndex: 2 },
    { id: 3, label: activeRoom.entryLabel, color: 'red', marginTop: 4, zIndex: 3 },
    { id: 4, label: activeRoom.entryLabel, color: 'red', marginTop: -12, zIndex: 4 },
    { id: 5, label: activeRoom.entryLabel, color: 'red', marginTop: 8, zIndex: 5 },
    { id: 6, label: activeRoom.entryLabel, color: 'red', marginTop: -4, zIndex: 6 },
  ]);

  const addBetToPotChips = (amount: number) => {
    const newItems: any[] = [];
    const baseId = Date.now() + Math.random();
    newItems.push({ id: baseId + 1, label: formatBetLabel(amount), color: amount >= activeRoom.blind * 5 ? 'gold' : amount >= activeRoom.blind * 2 ? 'blue' : 'red', marginTop: Math.floor(Math.random() * 16 - 8), zIndex: potChips.length + 1 });
    setPotChips(prev => [...prev, ...newItems]);
  };

  const userCombos = getPlayerCombinations(seats[0]?.hand || []);

  const handleSelectCombo = (idx: number) => {
    setUserComboIdx(idx);
    if (userCombos[idx]) {
      const newHand = userCombos[idx].pairs;
      setSeats(prev => prev.map((s, i) => i === 0 ? { ...s, hand: newHand } : s));
    }
  };

  const handleSwapNext = () => {
    const nextIdx = (userComboIdx + 1) % (userCombos.length || 1);
    handleSelectCombo(nextIdx);
  };

  // Helper to spawn flying chips
  const spawnFlyingChips = (fromPos: { x: string; y: string }, toPos: { x: string; y: string }) => {
    const newChips: FlyChipItem[] = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i + Math.random(),
      fromX: fromPos.x,
      fromY: fromPos.y,
      toX: toPos.x,
      toY: toPos.y,
      delay: i * 60
    }));

    setFlyingChips(prev => [...prev, ...newChips]);
    setTimeout(() => {
      setFlyingChips(prev => prev.filter(c => !newChips.includes(c)));
    }, 1200);
  };

  const [isFlipping3D, setIsFlipping3D] = useState(false);

  // Start new QiuQiu game round with Ante chips collection & 3D deal flip
  const startNewRound = () => {
    // 1. Ante Chips collection from active seats to center pot!
    [0, 1, 2, 3, 4, 5].forEach((sIdx, i) => {
      if (sIdx === 0 && isStanding) return;
      setTimeout(() => {
        spawnFlyingChips(SEAT_COORDS[sIdx] || SEAT_COORDS[0], CENTER_POT_COORDS);
      }, i * 80);
    });

    const shuffled = [...FULL_DOMINO_DECK].sort(() => Math.random() - 0.5);
    const newSeats = seats.map((seat, i) => {
      const tile1 = shuffled.pop() || [0, 0];
      const tile2 = shuffled.pop() || [0, 0];
      const tile3 = shuffled.pop() || [0, 0];
      const tile4 = shuffled.pop() || [0, 0];
      const isMeStanding = (i === 0 && isStanding);
      return {
        ...seat,
        hand: [tile1, tile2, tile3, tile4],
        badge: isMeStanding ? 'Berdiri' : 'Cek',
        currentBet: isMeStanding ? 0 : activeRoom.blind,
        coins: isMeStanding ? seat.coins : Math.max(0, seat.coins - activeRoom.ante), // Real-time Ante deduction!
        folded: isMeStanding
      };
    });

    setSeats(newSeats);
    setDeck(shuffled);
    setPhase('round1_bet');
    setActiveTurnIdx(isStanding ? 1 : 0);
    setUserComboIdx(0);
    setCurrentBetTarget(activeRoom.blind);
    setPotAmount(isStanding ? (activeRoom.ante * 5) : (activeRoom.ante * 6));
    setWinnerNotice(null);
    setPotChips([
      { id: 1, label: activeRoom.entryLabel, color: 'red', marginTop: 0, zIndex: 1 },
      { id: 2, label: activeRoom.entryLabel, color: 'red', marginTop: -8, zIndex: 2 },
      { id: 3, label: activeRoom.entryLabel, color: 'red', marginTop: 4, zIndex: 3 },
      { id: 4, label: activeRoom.entryLabel, color: 'red', marginTop: -12, zIndex: 4 },
      { id: 5, label: activeRoom.entryLabel, color: 'red', marginTop: 8, zIndex: 5 },
      { id: 6, label: activeRoom.entryLabel, color: 'red', marginTop: -4, zIndex: 6 },
    ]);

    // 2. Trigger 3D Card Flip animation
    setIsFlipping3D(true);
    setTimeout(() => {
      setIsFlipping3D(false);
    }, 800);
  };

  useEffect(() => {
    startNewRound();
  }, []);

  const [playerTurnTimer, setPlayerTurnTimer] = useState(10);

  // Per-Player 10-Second Turn Countdown Timer for Player 0 (Me)
  useEffect(() => {
    let timer: any;
    if ((phase === 'round1_bet' || phase === 'round2_bet') && activeTurnIdx === 0 && !seats[0]?.folded) {
      setPlayerTurnTimer(10);
      timer = setInterval(() => {
        setPlayerTurnTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Auto Cek or Balik when 10s turn timer expires
            handleActionClick(currentBetTarget > activeRoom.blind ? 'balik' : 'cek');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeTurnIdx, phase, seats, currentBetTarget, activeRoom.blind]);

  // Bot Turn Automation Loop (Clockwise sequential turn-by-turn with 1.5s thinking time!)
  useEffect(() => {
    if (phase === 'round1_bet' || phase === 'round2_bet') {
      if (activeTurnIdx === 0 && seats[0]?.folded) {
        const passTimer = setTimeout(() => {
          setActiveTurnIdx(1);
        }, 1000);
        return () => clearTimeout(passTimer);
      }

      if (activeTurnIdx > 0 && activeTurnIdx < 6) {
        if (seats[activeTurnIdx]?.isEmpty) {
          if (activeTurnIdx === 5 || seats.slice(activeTurnIdx + 1).every(s => s.isEmpty)) {
            setActiveTurnIdx(0);
            if (phase === 'round1_bet') {
              setPhase('round2_bet');
            } else {
              setPhase('tentukan');
              setTentukanCount(10);
            }
          } else {
            setActiveTurnIdx(prev => prev + 1);
          }
          return;
        }

        const botTimer = setTimeout(() => {
          const fromPos = SEAT_COORDS[activeTurnIdx] || SEAT_COORDS[1];
          spawnFlyingChips(fromPos, CENTER_POT_COORDS);

          const isRaise = Math.random() > 0.75;
          let actionBadge = `Ikut ${formatBetLabel(currentBetTarget)}`;
          let addBet = currentBetTarget;

          if (isRaise) {
            const newTarget = currentBetTarget + activeRoom.blind;
            setCurrentBetTarget(newTarget);
            actionBadge = `Raise ${formatBetLabel(newTarget)}`;
            addBet = newTarget;
          }

          addBetToPotChips(addBet);
          setSeats(prev => prev.map((s, idx) => idx === activeTurnIdx ? { ...s, badge: actionBadge, currentBet: addBet, coins: Math.max(0, s.coins - addBet) } : s));
          setPotAmount(prev => prev + addBet);

          const isLastPlayer = activeTurnIdx === 5 || seats.slice(activeTurnIdx + 1).every(s => s.isEmpty);
          if (isLastPlayer) {
            // Last player turn completed
            setActiveTurnIdx(0);
            if (phase === 'round1_bet') {
              // Stage 1 completed -> Move to Stage 2 (4th card bet round!)
              setPhase('round2_bet');
            } else {
              // Stage 2 completed -> Move to Tentukan Phase!
              setPhase('tentukan');
              setTentukanCount(10);
            }
          } else {
            setActiveTurnIdx(prev => prev + 1);
          }
        }, 1500);

        return () => clearTimeout(botTimer);
      }
    }
  }, [activeTurnIdx, phase, currentBetTarget, seats]);

  // Handle Mix 4th Card
  const handleMixFourthCard = () => {
    if (phase === 'round1_bet' || phase === 'mix') {
      setPhase('tentukan');
      setTentukanCount(10);
    }
  };

  // Tentukan Countdown Timer
  useEffect(() => {
    let timer: any;
    if (phase === 'tentukan' && tentukanCount > 0) {
      timer = setInterval(() => {
        setTentukanCount(prev => prev - 1);
      }, 1000);
    } else if (phase === 'tentukan' && tentukanCount === 0) {
      handleTentukanDone();
    }
    return () => clearInterval(timer);
  }, [phase, tentukanCount]);

  const handleTentukanDone = () => {
    setPhase('showdown');
    evaluateWinnerAndShowdown();
  };

  // Showdown Winner Calculation & Flying Chips Payout
  const evaluateWinnerAndShowdown = () => {
    const activeSeats = seats.filter(s => !s.folded);
    let bestSeat = activeSeats[0];
    let bestEval = evaluateQiuHand(bestSeat.hand);

    for (let i = 1; i < activeSeats.length; i++) {
      const ev = evaluateQiuHand(activeSeats[i].hand);
      if (ev.rank > bestEval.rank) {
        bestEval = ev;
        bestSeat = activeSeats[i];
      } else if (ev.rank === bestEval.rank) {
        if (ev.leftScore > bestEval.leftScore) {
          bestEval = ev;
          bestSeat = activeSeats[i];
        } else if (ev.leftScore === bestEval.leftScore && ev.rightScore > bestEval.rightScore) {
          bestEval = ev;
          bestSeat = activeSeats[i];
        }
      }
    }

    // Spawn flying chips from pot to winner seat
    const winnerPos = SEAT_COORDS[bestSeat.id] || SEAT_COORDS[0];
    spawnFlyingChips(CENTER_POT_COORDS, winnerPos);

    // Live Payout: Add winning pot amount directly to winner's seat coins!
    setSeats(prev => prev.map(s => s.id === bestSeat.id ? { ...s, coins: s.coins + potAmount } : s));

    setWinnerNotice({
      winnerName: bestSeat.name,
      amount: potAmount,
      title: bestEval.title
    });
  };

  // Handle Action Buttons for Player 0 (Me)
  const handleActionClick = (actionType: 'balik' | 'cek' | 'ikut' | 'allin') => {
    // Only allow click if it's Player 0's turn (or in tentukan/showdown)
    if ((phase === 'round1_bet' || phase === 'round2_bet') && activeTurnIdx !== 0) return;

    const fromPos = SEAT_COORDS[0];
    spawnFlyingChips(fromPos, CENTER_POT_COORDS);

    if (phase === 'round1_bet' || phase === 'round2_bet') {
      let addBet = currentBetTarget;
      let badgeText = `Ikut ${formatBetLabel(currentBetTarget)}`;

      if (actionType === 'balik') {
        setSeats(prev => prev.map((s, idx) => idx === 0 ? { ...s, folded: true, badge: 'Balik' } : s));
      } else if (actionType === 'cek') {
        setSeats(prev => prev.map((s, idx) => idx === 0 ? { ...s, badge: 'Cek' } : s));
      } else if (actionType === 'ikut') {
        addBetToPotChips(addBet);
        setPotAmount(prev => prev + addBet);
        setSeats(prev => prev.map((s, idx) => idx === 0 ? { ...s, badge: badgeText, currentBet: addBet, coins: Math.max(0, s.coins - addBet) } : s));
      } else if (actionType === 'allin') {
        addBet = seats[0]?.coins || activeRoom.buyIn;
        setCurrentBetTarget(Math.max(currentBetTarget, addBet));
        addBetToPotChips(addBet);
        setPotAmount(prev => prev + addBet);
        setSeats(prev => prev.map((s, idx) => idx === 0 ? { ...s, badge: 'ALL IN', currentBet: addBet, coins: 0 } : s));
      }

      // Move turn to Bot 1 (Seat 1)
      setActiveTurnIdx(1);
    } else if (phase === 'tentukan') {
      handleTentukanDone();
    } else if (phase === 'showdown') {
      startNewRound();
    }
  };

  // Current Player evaluation
  const myEval = evaluateQiuHand(seats[0]?.hand || []);

  return (
    <div className="qq-screen-wrapper">
      {/* Top Left Back Button to Lobby with Exit Confirmation */}
      <button
        className="qq-back-btn g-btn-press"
        onClick={() => setShowExitConfirm(true)}
        title="Kembali ke Lobi"
      >
        <span>«</span>
        <span>Lobi</span>
      </button>

      {/* Flying Chips Animation Overlay */}
      {flyingChips.map(c => (
        <div
          key={c.id}
          className="qq-fly-chip"
          style={{
            '--from-x': c.fromX,
            '--from-y': c.fromY,
            '--to-x': c.toX,
            '--to-y': c.toY,
            animationDelay: `${c.delay}ms`
          } as any}
        >
          🪙
        </div>
      ))}

      {/* Top Announcement Marquee (Real-time Live Rotation) */}
      <div className="qq-top-marquee">
        <div className="qq-marquee-text">
          {REALTIME_NOTIFS[marqueeIdx]}
        </div>
      </div>

      {/* Jackpot Neon Panel (Top Left) */}
      <div className="qq-jackpot-panel">
        <div className="qq-jackpot-header">
          <span className="qq-jp-title">🌴 JACKPOT</span>
          <div className="qq-jp-counter">
            {['0', '0', '1', '3', '0', '1'].map((d, i) => (
              <span key={i} className="qq-jp-digit">{d}</span>
            ))}
          </div>
        </div>
        <div className="qq-jackpot-box">
          <div className="qq-jp-row">
            <span>Twin/Small/Big 🎟️</span>
            <span className="val">100</span>
          </div>
          <div className="qq-jp-row">
            <span>QiuQiu 🎟️</span>
            <span className="val">50</span>
          </div>
        </div>
      </div>

      {/* Floating Table Toast Notification */}
      {tableToast && (
        <div className="qq-table-toast">
          {tableToast}
        </div>
      )}

      {/* Top Right Controls */}
      <div className="qq-top-right-controls">
        <div className="qq-rp-badge">
          <span>Ante</span>
          <span>{activeRoom.entryLabel}</span>
        </div>

        <div className="qq-menu-wrap">
          <button
            className="qq-menu-btn g-btn-press"
            onClick={() => setShowMenu(v => !v)}
            title="Menu Pilihan"
            aria-label="Menu"
          >
            <div className="qq-burger-bars">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>

          <GameMenuDropdown
            isOpen={showMenu}
            onClose={() => setShowMenu(false)}
            items={[
              { id: 'lobi', icon: '🚪', label: 'Lobi', onClick: () => { setShowMenu(false); setShowExitConfirm(true); } },
              { id: 'ganti', icon: '🔄', label: 'Ganti meja', onClick: () => { setShowMenu(false); handleGantiMeja(); } },
              { id: 'berdiri', icon: '👤', label: isStanding ? 'Duduk Kembali' : 'Berdiri', onClick: () => { setShowMenu(false); if (isStanding) handleDudukKembali(); else handleBerdiri(); } },
              { id: 'suara', icon: '🔊', label: 'Suara', badge: soundOn ? 'ON' : 'OFF', onClick: () => setSoundOn(v => !v) },
              { id: 'efek', icon: '✨', label: 'Efek', badge: effectOn ? 'ON' : 'OFF', onClick: () => setEffectOn(v => !v) },
              { id: 'bantuan', icon: '❓', label: 'Bantuan', onClick: () => { setShowMenu(false); setShowRulesModal(true); } }
            ]}
            style={{ top: '5.4vh', right: 0 }}
          />
        </div>
      </div>

      {showRulesModal && <RulesModal onClose={() => setShowRulesModal(false)} initialCategory="Qiu Qiu" />}

      {/* Dealer Girl at Top Center */}
      <div className="qq-dealer-container">
        <div className="qq-dealer-avatar">
          💃
        </div>
      </div>

      {/* Oval Green Table Felt */}
      <div className="qq-table-felt">
        <div className="qq-table-watermark">QiuQiu</div>
        <div className="qq-blind-tag">Meja #{tableCode} | Blind:{activeRoom.entryLabel}</div>

        {/* Central Digital Pot Scoreboard */}
        <div className="qq-pot-scoreboard">
          <div className="qq-pot-amount">{potAmount.toLocaleString('id-ID').padStart(16, '0')}</div>
        </div>

        {/* Authentic Dynamic 3D Clustered Chips in Pot (Matching User Image) */}
        <div className="qq-pot-chips-cluster">
          {potChips.map(chip => (
            <div
              key={chip.id}
              className={`qq-poker-chip-3d pop-in ${chip.color}`}
              style={{ marginTop: `${chip.marginTop}px`, zIndex: chip.zIndex }}
            >
              {chip.label}
            </div>
          ))}
        </div>
      </div>

      {/* Seats around Table */}
      {/* Seat 1: Bottom Right */}
      {!seats[5]?.isEmpty && (
        <div className={`qq-seat pos-bottom-right ${activeTurnIdx === 5 ? 'turn' : ''}`}>
          <div className="qq-avatar-wrapper">
            {seats[5]?.badge && <div className={`qq-action-badge ${seats[5]?.badge === 'ALL IN' ? 'allin' : ''}`}>{seats[5].badge}</div>}
            <div className="qq-avatar-circle">{renderPlayerAvatar(seats[5]?.avatar, '🐸', 'qq-avatar-img')}</div>
            {seats[5]?.currentBet > 0 && (
              <div className="qq-player-bet-chips">
                <div className="qq-mini-chip blue">1M</div>
                <span>{formatBetLabel(seats[5].currentBet)}</span>
              </div>
            )}
          </div>
          <div className="qq-player-info">
            <span className="qq-player-name">{seats[5]?.name}</span>
            <span className="qq-player-coins">🪙 {seats[5]?.coins?.toLocaleString()}</span>
          </div>
          {/* Showdown Revealed Cards for Opponent */}
          {phase === 'showdown' && !seats[5]?.folded && (
            <div className="qq-opponent-showdown-hand">
              <div className="qq-score-pill-header" style={{ fontSize: '1.2vh', padding: '0.1vh 0.8vw' }}>
                {evaluateQiuHand(seats[5].hand).title}
              </div>
              <div className="qq-opponent-tiles-mini">
                <DominoTile left={evaluateQiuHand(seats[5].hand).bestPairs[0][0]} right={evaluateQiuHand(seats[5].hand).bestPairs[0][1]} isSmall />
                <DominoTile left={evaluateQiuHand(seats[5].hand).bestPairs[1][0]} right={evaluateQiuHand(seats[5].hand).bestPairs[1][1]} isSmall />
                <DominoTile left={evaluateQiuHand(seats[5].hand).bestPairs[2][0]} right={evaluateQiuHand(seats[5].hand).bestPairs[2][1]} isSmall />
                <DominoTile left={evaluateQiuHand(seats[5].hand).bestPairs[3][0]} right={evaluateQiuHand(seats[5].hand).bestPairs[3][1]} isSmall />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Seat 2: Right */}
      {!seats[1]?.isEmpty && (
        <div className={`qq-seat pos-right ${activeTurnIdx === 1 ? 'turn' : ''}`}>
          <div className="qq-avatar-wrapper">
            {seats[1]?.isDealer && <div className="qq-dealer-btn">D</div>}
            {seats[1]?.badge && <div className="qq-action-badge">{seats[1].badge}</div>}
            <div className="qq-avatar-circle">{renderPlayerAvatar(seats[1]?.avatar, '🐸', 'qq-avatar-img')}</div>
            {seats[1]?.currentBet > 0 && (
              <div className="qq-player-bet-chips">
                <div className="qq-mini-chip">200K</div>
                <span>{formatBetLabel(seats[1].currentBet)}</span>
              </div>
            )}
          </div>
          <div className="qq-player-info">
            <span className="qq-player-name">{seats[1]?.name}</span>
            <span className="qq-player-coins">🪙 {formatBetLabel(seats[1]?.coins)}</span>
          </div>
          {/* Showdown Revealed Cards for Opponent */}
          {phase === 'showdown' && !seats[1]?.folded && (
            <div className="qq-opponent-showdown-hand">
              <div className="qq-score-pill-header" style={{ fontSize: '1.2vh', padding: '0.1vh 0.8vw' }}>
                {evaluateQiuHand(seats[1].hand).title}
              </div>
              <div className="qq-opponent-tiles-mini">
                <DominoTile left={evaluateQiuHand(seats[1].hand).bestPairs[0][0]} right={evaluateQiuHand(seats[1].hand).bestPairs[0][1]} isSmall />
                <DominoTile left={evaluateQiuHand(seats[1].hand).bestPairs[1][0]} right={evaluateQiuHand(seats[1].hand).bestPairs[1][1]} isSmall />
                <DominoTile left={evaluateQiuHand(seats[1].hand).bestPairs[2][0]} right={evaluateQiuHand(seats[1].hand).bestPairs[2][1]} isSmall />
                <DominoTile left={evaluateQiuHand(seats[1].hand).bestPairs[3][0]} right={evaluateQiuHand(seats[1].hand).bestPairs[3][1]} isSmall />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Seat 3: Top Right */}
      {!seats[2]?.isEmpty && (
        <div className={`qq-seat pos-top-right ${activeTurnIdx === 2 ? 'turn' : ''}`}>
          <div className="qq-avatar-wrapper">
            {seats[2]?.badge && <div className="qq-action-badge">{seats[2].badge}</div>}
            <div className="qq-avatar-circle">{renderPlayerAvatar(seats[2]?.avatar, '🐸', 'qq-avatar-img')}</div>
            {seats[2]?.currentBet > 0 && (
              <div className="qq-player-bet-chips">
                <div className="qq-mini-chip blue">1M</div>
                <span>{formatBetLabel(seats[2].currentBet)}</span>
              </div>
            )}
          </div>
          <div className="qq-player-info">
            <span className="qq-player-name">{seats[2]?.name}</span>
            <span className="qq-player-coins">🪙 {formatBetLabel(seats[2]?.coins)}</span>
          </div>
          {/* Showdown Revealed Cards for Opponent */}
          {phase === 'showdown' && !seats[2]?.folded && (
            <div className="qq-opponent-showdown-hand">
              <div className="qq-score-pill-header" style={{ fontSize: '1.2vh', padding: '0.1vh 0.8vw' }}>
                {evaluateQiuHand(seats[2].hand).title}
              </div>
              <div className="qq-opponent-tiles-mini">
                <DominoTile left={evaluateQiuHand(seats[2].hand).bestPairs[0][0]} right={evaluateQiuHand(seats[2].hand).bestPairs[0][1]} isSmall />
                <DominoTile left={evaluateQiuHand(seats[2].hand).bestPairs[1][0]} right={evaluateQiuHand(seats[2].hand).bestPairs[1][1]} isSmall />
                <DominoTile left={evaluateQiuHand(seats[2].hand).bestPairs[2][0]} right={evaluateQiuHand(seats[2].hand).bestPairs[2][1]} isSmall />
                <DominoTile left={evaluateQiuHand(seats[2].hand).bestPairs[3][0]} right={evaluateQiuHand(seats[2].hand).bestPairs[3][1]} isSmall />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Seat 4: Top Left */}
      {!seats[3]?.isEmpty && (
        <div className={`qq-seat pos-top-left ${activeTurnIdx === 3 ? 'turn' : ''}`}>
          <div className="qq-avatar-wrapper">
            {seats[3]?.badge && <div className="qq-action-badge">{seats[3].badge}</div>}
            <div className="qq-avatar-circle">{renderPlayerAvatar(seats[3]?.avatar, '🐸', 'qq-avatar-img')}</div>
            {seats[3]?.currentBet > 0 && (
              <div className="qq-player-bet-chips">
                <div className="qq-mini-chip purple">10M</div>
                <span>{formatBetLabel(seats[3].currentBet)}</span>
              </div>
            )}
          </div>
          <div className="qq-player-info">
            <span className="qq-player-name">{seats[3]?.name}</span>
            <span className="qq-player-coins">🪙 {formatBetLabel(seats[3]?.coins)}</span>
          </div>
          {/* Showdown Revealed Cards for Opponent */}
          {phase === 'showdown' && !seats[3]?.folded && (
            <div className="qq-opponent-showdown-hand">
              <div className="qq-score-pill-header" style={{ fontSize: '1.2vh', padding: '0.1vh 0.8vw' }}>
                {evaluateQiuHand(seats[3].hand).title}
              </div>
              <div className="qq-opponent-tiles-mini">
                <DominoTile left={evaluateQiuHand(seats[3].hand).bestPairs[0][0]} right={evaluateQiuHand(seats[3].hand).bestPairs[0][1]} isSmall />
                <DominoTile left={evaluateQiuHand(seats[3].hand).bestPairs[1][0]} right={evaluateQiuHand(seats[3].hand).bestPairs[1][1]} isSmall />
                <DominoTile left={evaluateQiuHand(seats[3].hand).bestPairs[2][0]} right={evaluateQiuHand(seats[3].hand).bestPairs[2][1]} isSmall />
                <DominoTile left={evaluateQiuHand(seats[3].hand).bestPairs[3][0]} right={evaluateQiuHand(seats[3].hand).bestPairs[3][1]} isSmall />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Seat 5: Bottom Left */}
      {!seats[4]?.isEmpty && (
        <div className={`qq-seat pos-bottom-left ${activeTurnIdx === 4 ? 'turn' : ''}`}>
          <div className="qq-avatar-wrapper">
            {seats[4]?.badge && <div className="qq-action-badge">{seats[4].badge}</div>}
            <div className="qq-avatar-circle">{renderPlayerAvatar(seats[4]?.avatar, '🐸', 'qq-avatar-img')}</div>
            {seats[4]?.currentBet > 0 && (
              <div className="qq-player-bet-chips">
                <div className="qq-mini-chip blue">1M</div>
                <span>{formatBetLabel(seats[4].currentBet)}</span>
              </div>
            )}
          </div>
          <div className="qq-player-info">
            <span className="qq-player-name">{seats[4]?.name}</span>
            <span className="qq-player-coins">🪙 {formatBetLabel(seats[4]?.coins)}</span>
          </div>
          {/* Showdown Revealed Cards for Opponent */}
          {phase === 'showdown' && !seats[4]?.folded && (
            <div className="qq-opponent-showdown-hand">
              <div className="qq-score-pill-header" style={{ fontSize: '1.2vh', padding: '0.1vh 0.8vw' }}>
                {evaluateQiuHand(seats[4].hand).title}
              </div>
              <div className="qq-opponent-tiles-mini">
                <DominoTile left={evaluateQiuHand(seats[4].hand).bestPairs[0][0]} right={evaluateQiuHand(seats[4].hand).bestPairs[0][1]} isSmall />
                <DominoTile left={evaluateQiuHand(seats[4].hand).bestPairs[1][0]} right={evaluateQiuHand(seats[4].hand).bestPairs[1][1]} isSmall />
                <DominoTile left={evaluateQiuHand(seats[4].hand).bestPairs[2][0]} right={evaluateQiuHand(seats[4].hand).bestPairs[2][1]} isSmall />
                <DominoTile left={evaluateQiuHand(seats[4].hand).bestPairs[3][0]} right={evaluateQiuHand(seats[4].hand).bestPairs[3][1]} isSmall />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Seat 0: Me (Bottom Center) */}
      <div className={`qq-seat pos-bottom ${activeTurnIdx === 0 ? 'turn' : ''}`} style={isStanding ? { opacity: 0.6 } : {}}>
        <div className="qq-avatar-wrapper">
          <div className={`qq-action-badge ${seats[0]?.badge === 'ALL IN' ? 'allin' : ''}`}>{isStanding ? 'Menonton' : seats[0]?.badge}</div>
          <div className="qq-avatar-circle">{isStanding ? '🧍' : renderPlayerAvatar(avatarEmoji, '🐸', 'qq-avatar-img')}</div>
          {!isStanding && seats[0]?.currentBet > 0 && (
            <div className="qq-player-bet-chips">
              <div className="qq-mini-chip blue">1M</div>
              <span>{formatBetLabel(seats[0].currentBet)}</span>
            </div>
          )}
        </div>
        <div className="qq-player-info">
          <span className="qq-player-name">{myUsername}</span>
          <span className="qq-player-coins">🪙 {formatBetLabel(seats[0]?.coins)}</span>
        </div>
      </div>

      {/* Center Tentukan Banner */}
      {phase === 'tentukan' && (
        <div className="qq-tentukan-banner">
          Tentukan Susunan Kartu <span className="count">{tentukanCount}</span>
        </div>
      )}

      {/* Showdown Winner Announcement Banner */}
      {winnerNotice && (
        <div className="claim-toast-overlay">
          <div className="claim-toast-box">
            <div className="claim-toast-icon">🏆</div>
            <div className="claim-toast-content">
              <div className="claim-toast-title">PEMENANG: {winnerNotice.winnerName}!</div>
              <div className="claim-toast-sub">
                {winnerNotice.title}: <span>+{winnerNotice.amount.toLocaleString('id-ID')} Koin</span>
              </div>
            </div>
            <div className="claim-toast-shimmer" />
          </div>
        </div>
      )}

      {/* Player's Own Cards & Score Pills (Bottom Center) */}
      {!isStanding && (() => {
        const h0 = seats[0]?.hand?.[0] || [0, 0];
        const h1 = seats[0]?.hand?.[1] || [0, 0];
        const h2 = seats[0]?.hand?.[2] || [0, 0];
        const h3 = seats[0]?.hand?.[3] || [0, 0];

        const leftVal = (getQiuPips(h0) + getQiuPips(h1)) % 10;
        const rightVal = (getQiuPips(h2) + getQiuPips(h3)) % 10;

        return (
          <div className="qq-hand-container">
            {/* Score Pill Header */}
            <div className="qq-score-pill-header g-btn-press" onClick={handleSwapNext} style={{ cursor: 'pointer' }}>
              <span>{leftVal}</span> : <span>{phase === 'round1_bet' ? '?' : rightVal}</span>
            </div>

            {/* Tiles Row (Click any tile to swap pair combinations "tukar ke sebelah") */}
            <div className="qq-tiles-row g-btn-press" onClick={handleSwapNext} style={{ cursor: 'pointer' }}>
              <DominoTile left={h0[0]} right={h0[1]} isFlipping3D={isFlipping3D} />
              <DominoTile left={h1[0]} right={h1[1]} isFlipping3D={isFlipping3D} />
              <DominoTile left={h2[0]} right={h2[1]} isFlipping3D={isFlipping3D} />

              {/* 4th Card Slot */}
              {phase === 'round1_bet' ? (
                <div className="qq-mix-card-slot" onClick={e => { e.stopPropagation(); handleMixFourthCard(); }}>
                  <DominoTile left={0} right={0} isBack isFlipping3D={isFlipping3D} />
                  <div className="qq-hand-cursor-popup">
                    👆 Klik untuk Mix
                  </div>
                </div>
              ) : (
                <DominoTile left={h3[0]} right={h3[1]} isFlipping3D={isFlipping3D} />
              )}
            </div>

            {/* Interactive Hint Pills Row (Click to select & swap pair) - Concealed in 3-Card Phase */}
            <div className="qq-hint-pills-row">
              {phase === 'round1_bet' ? (
                <span className="qq-hint-pill">{leftVal} : ?</span>
              ) : userCombos.length > 0 ? userCombos.map((combo, cIdx) => (
                <span
                  key={cIdx}
                  className={`qq-hint-pill g-btn-press ${userComboIdx === cIdx ? 'active' : ''}`}
                  style={{
                    cursor: 'pointer',
                    borderColor: userComboIdx === cIdx ? '#f1c40f' : 'rgba(241,196,15,0.4)',
                    background: userComboIdx === cIdx ? 'linear-gradient(180deg, #d35400, #a04000)' : 'rgba(0,0,0,0.6)'
                  }}
                  onClick={() => handleSelectCombo(cIdx)}
                >
                  {combo.label}
                </span>
              )) : (
                <>
                  <span className="qq-hint-pill">{leftVal} : {rightVal}</span>
                </>
              )}
            </div>

            {/* Green Tentukan Button */}
            {phase === 'tentukan' && (
              <button className="qq-tentukan-btn g-btn-press" onClick={handleTentukanDone}>
                Tentukan
              </button>
            )}
          </div>
        );
      })()}

      {/* Turn Timer Countdown Banner with Expiry Alert */}
      {!isStanding && (phase === 'round1_bet' || phase === 'round2_bet') && activeTurnIdx === 0 && (
        <div className={`qq-turn-timer-banner ${playerTurnTimer <= 3 ? 'urgent' : ''}`} style={{
          textAlign: 'center',
          color: playerTurnTimer <= 3 ? '#ff2222' : '#f1c40f',
          fontSize: '1.4vh',
          fontWeight: 900,
          textShadow: playerTurnTimer <= 3 ? '0 0 15px #ff0000' : '0 0 10px rgba(0,0,0,0.9)',
          margin: '0.5vh 0'
        }}>
          {playerTurnTimer <= 3 ? (
            <span>⚠️ WAKTU HAMPIR HABIS! <span style={{ fontSize: '2vh', color: '#ffea00' }}>{playerTurnTimer}s</span></span>
          ) : (
            <span>⏳ Giliran Anda: <span style={{ fontSize: '1.8vh', color: '#e74c3c' }}>{playerTurnTimer}s</span></span>
          )}
        </div>
      )}

      {/* Bottom Controls / Spectator Standing Bar */}
      {isStanding ? (
        <div className="qq-standing-bar">
          <div className="qq-standing-hint">👀 Anda sedang dalam Mode Menonton (Berdiri)</div>
          <button className="qq-sit-btn g-btn-press" onClick={handleDudukKembali}>
            🪑 Duduk Kembali (Main Ronde Berikutnya)
          </button>
        </div>
      ) : (
        <div className="qq-bottom-controls" style={{
          opacity: (phase === 'round1_bet' || phase === 'round2_bet') && activeTurnIdx !== 0 ? 0.4 : 1,
          pointerEvents: (phase === 'round1_bet' || phase === 'round2_bet') && activeTurnIdx !== 0 ? 'none' : 'auto'
        }}>
          <button className="qq-action-btn orange g-btn-press" onClick={() => handleActionClick('balik')}>
            <span>Balik</span>
          </button>
          <button className="qq-action-btn g-btn-press" onClick={() => handleActionClick('cek')}>
            <span>Cek</span>
          </button>
          <button className="qq-action-btn g-btn-press" onClick={() => handleActionClick('ikut')}>
            <span>Ikut</span>
            <span className="qq-action-btn-sub">{formatBetLabel(currentBetTarget)}</span>
          </button>
          <button className="qq-action-btn gold g-btn-press" onClick={() => handleActionClick('allin')}>
            <span>ALL IN</span>
          </button>
        </div>
      )}

      {/* Exit Confirmation & Cashout Modal */}
      {showExitConfirm && (
        <div className="qq-room-modal-overlay tm-overlay-fade" onClick={() => setShowExitConfirm(false)}>
          <div className="qq-exit-modal-box tm-box-bounce" onClick={e => e.stopPropagation()}>
            <div className="qq-exit-modal-header">
              <span>🚪</span> KONFIRMASI KELUAR MEJA
            </div>
            <div className="qq-exit-modal-body">
              <div className="qq-exit-avatar-bubble">
                {renderPlayerAvatar(avatarEmoji, '🐸', 'qq-avatar-img')}
              </div>
              <div className="qq-exit-title">
                Apakah Anda yakin ingin keluar dari Meja QiuQiu?
              </div>
              <div className="qq-exit-info-box">
                <div className="qq-exit-info-label">Sisa Koin Meja Anda</div>
                <div className="qq-exit-info-amount">
                  <span>🪙</span>
                  <span>{(seats[0]?.coins || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="qq-exit-info-sub">
                  Semua sisa koin meja ini akan otomatis dikembalikan ke dompet utama Anda secara utuh.
                </div>
              </div>
              <div className="qq-exit-modal-actions">
                <button
                  className="qq-exit-btn-cancel g-btn-press"
                  onClick={() => setShowExitConfirm(false)}
                  disabled={isExiting}
                >
                  Batal
                </button>
                <button
                  className="qq-exit-btn-confirm g-btn-press"
                  onClick={handleExecuteCashoutAndExit}
                  disabled={isExiting}
                >
                  {isExiting ? 'Mengembalikan Koin...' : 'Keluar & Ambil Koin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// KOMPONEN UTAMA
// =====================================================

function MobileLandscapeLockOverlay() {
  const [isPortraitMobile, setIsPortraitMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isTouchOrMobile =
      w <= 900 ||
      window.matchMedia?.('(pointer: coarse)').matches ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
    return h > w && isTouchOrMobile;
  });

  useEffect(() => {
    const checkOrientation = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const visibleH = window.visualViewport?.height || h;
      const visibleW = window.visualViewport?.width || w;
      document.documentElement.style.setProperty('--app-height', `${visibleH}px`);
      document.documentElement.style.setProperty('--app-width', `${visibleW}px`);

      const isTouchOrMobile =
        w <= 900 ||
        window.matchMedia?.('(pointer: coarse)').matches ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
      setIsPortraitMobile(h > w && isTouchOrMobile);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    window.visualViewport?.addEventListener('resize', checkOrientation);
    window.visualViewport?.addEventListener('scroll', checkOrientation);
    const scrOrient = (window.screen as any)?.orientation;
    if (scrOrient && typeof scrOrient.addEventListener === 'function') {
      scrOrient.addEventListener('change', checkOrientation);
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      window.visualViewport?.removeEventListener('resize', checkOrientation);
      window.visualViewport?.removeEventListener('scroll', checkOrientation);
      if (scrOrient && typeof scrOrient.removeEventListener === 'function') {
        scrOrient.removeEventListener('change', checkOrientation);
      }
    };
  }, []);

  const handleForceLandscape = async () => {
    try {
      const docEl = document.documentElement as any;
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      }
      const scrOrient = (window.screen as any)?.orientation;
      if (scrOrient && typeof scrOrient.lock === 'function') {
        await scrOrient.lock('landscape');
      }
    } catch {
      // Browser requires physical device rotation (e.g. iOS Safari)
    }
  };

  if (!isPortraitMobile) return null;

  return (
    <div
      className="mobile-landscape-lock-overlay"
      onContextMenu={e => e.preventDefault()}
    >
      <div className="mllo-glow-orb" />
      <div className="mllo-card">
        <div className="mllo-badge">🎱 KINGS BILLIARDS & DOMINO</div>

        {/* Animated Phone Rotating 90deg Illustration */}
        <div className="mllo-phone-stage">
          <div className="mllo-rotate-ring" />
          <div className="mllo-phone-device">
            <div className="mllo-phone-notch" />
            <div className="mllo-phone-screen">
              <span>🎱</span>
            </div>
            <div className="mllo-phone-bar" />
          </div>
          <div className="mllo-arrow-arc">↻</div>
        </div>

        <h2 className="mllo-title">PUTAR LAYAR HP ANDA</h2>
        <p className="mllo-desc">
          Game ini hanya dapat dimainkan dalam mode <b>Landscape (Mendatar)</b>.
          Silakan miringkan HP Anda ke samping untuk mulai bermain!
        </p>

        <div className="mllo-steps">
          <div className="mllo-step-item">
            <span className="mllo-step-icon">🔓</span>
            <span>Aktifkan <b>Putar Otomatis (Auto-Rotate)</b> di pengaturan HP Anda</span>
          </div>
          <div className="mllo-step-item">
            <span className="mllo-step-icon">📱</span>
            <span>Miringkan HP secara horizontal (Landscape)</span>
          </div>
        </div>

        <button className="mllo-rotate-btn g-btn-press" onClick={handleForceLandscape}>
          <span>🔄</span> Masuk Mode Landscape Otomatis
        </button>
      </div>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState<string>('loading');
  const [returnToSlotPopup, setReturnToSlotPopup] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<{ username: string } | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [appAlert, setAppAlert] = useState<string | null>(null);
  const [activeSlotLoading, setActiveSlotLoading] = useState<string | null>(null);

  // By One 1v1 state
  const [byoneOpponent, setByoneOpponent] = useState<string | null>(null);
  const [byoneBet, setByoneBet] = useState<number | null>(null);
  const [byonePlayers, setByonePlayers] = useState<any[] | null>(null);
  const [byoneRoomCode, setByoneRoomCode] = useState<string | null>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<{ fromUsername: string; betAmount: number; tierName: string; mode: string } | null>(null);

  // Lobby states
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedQiuRoom, setSelectedQiuRoom] = useState<QiuQiuRoomConfig | null>(null);
  const [lobbyCategory, setLobbyCategory] = useState<'Biasa' | 'Bet' | 'Wild' | 'Domino Partner' | '5 Kartu' | 'Tantangan'>('5 Kartu');

  // Online multiplayer states
  const [gameId, setGameId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection once
  useEffect(() => {
    const sock = io(getBackendBase(), {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });
    socketRef.current = sock;

    sock.on('connect', () => {
      console.log('Socket.IO connected:', sock.id);
      const u = localStorage.getItem('domino_username');
      if (u) sock.emit('register-user', { username: u });
    });

    sock.on('byone_challenge_received', (data: any) => {
      setIncomingChallenge(data);
    });

    sock.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    return () => {
      sock.disconnect();
    };
  }, []);

  // Manage Lobby BGM based on active screen
  useEffect(() => {
    const isLobby = screen === 'home' || screen === 'slot-lobby' || screen === 'kamar-lobby';
    if (isLobby) {
      lobbyAudio.start();
    } else {
      lobbyAudio.stop();
    }
  }, [screen]);

  const formatCoins = (n: number) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const handleOpenTransferFromProfile = (username: string) => {
    setTransferTarget({ username });
  };

  const SCREEN_TO_SLOT: Record<string, string> = {
    'slot-game': 'duofuduocai',
    'zeus-game': 'zeus',
    'fafafa-game': 'fafafa2',
    'jinji-game': 'jinjibaoxi',
    'mahjong2-game': 'mahjong2',
    'gatokaca-game': 'gatotkaca',
    'candy-game': 'candyrush',
    'wildwest-game': 'wildwest',
    'fivelions-game': '5lions',
  };

  const handleNavigate = (targetScreen: any, categoryOverride?: any, extraData?: any) => {
    const COMING_SOON_SCREENS = ['slot-game'];
    if (COMING_SOON_SCREENS.includes(targetScreen)) {
      setAppAlert('Game slot ini sedang dalam pengembangan (Coming Soon)!');
      return;
    }
    if (extraData && extraData.byone) {
      setByoneBet(extraData.bet);
      setByonePlayers(extraData.players);
      setByoneRoomCode(extraData.code);
      setByoneOpponent(extraData.opponent);
    }
    if (categoryOverride) {
      if (targetScreen === 'byone-game') {
        setByoneOpponent(categoryOverride);
      } else if (targetScreen === 'qiuqiu-game') {
        setSelectedQiuRoom(categoryOverride);
      } else {
        setLobbyCategory(categoryOverride);
      }
    }
    const slotId = SCREEN_TO_SLOT[targetScreen];
    if (slotId) {
      setActiveSlotLoading(slotId);
    }
    setScreen(targetScreen);
  };

  const handleExecuteTransferFromApp = async () => {
    if (!transferTarget) return;
    const myUsername = localStorage.getItem('domino_username') || '';
    const amountVal = parseInt(transferAmount, 10);
    if (isNaN(amountVal) || amountVal <= 0) {
      setAppAlert('Jumlah koin tidak valid');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUsername: myUsername, toUsername: transferTarget.username, amount: amountVal })
      });
      if (res.ok) {
        const data = await res.json();
        setAppAlert(data.message);
        setTransferTarget(null);
        setTransferAmount('');
      } else {
        const err = await res.json();
        setAppAlert(err.error || 'Transfer gagal');
      }
    } catch {
      setAppAlert('Koneksi server gagal');
    }
  };

  const handleSendRequestFromProfile = async (friendUsername: string) => {
    const myUsername = localStorage.getItem('domino_username') || '';
    try {
      const res = await fetch(`${API_URL}/friends/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myUsername, friendUsername })
      });
      if (res.ok) {
        setAppAlert(`Permintaan pertemanan dikirim ke ${friendUsername}!`);
      } else {
        const err = await res.json();
        setAppAlert(err.error || 'Gagal mengirim permintaan pertemanan');
      }
    } catch {
      setAppAlert('Koneksi server gagal');
    }
  };

  const [showLoginAnim, setShowLoginAnim] = useState(false);

  const handleLoginSuccess = async () => {
    setScreen('home');
    const u = localStorage.getItem('domino_username');
    if (!u) return;

    try {
      const res = await fetch(`${API_URL}/profile/${u}`);
      if (res.ok) {
        const data = await res.json();
        // Strict VIP Check: Only show VIP Login Animation Overlay if user is explicitly a VIP!
        const isVipUser = !!(data?.isVip || (data?.vipLevel && data.vipLevel > 0) || localStorage.getItem('domino_is_vip') === 'true');
        const animEnabled = localStorage.getItem('set_anim') !== 'off' && localStorage.getItem('domino_login_animation') !== 'off';

        if (isVipUser && animEnabled) {
          setShowLoginAnim(true);
        }
      }
    } catch {
      const isVipUser = localStorage.getItem('domino_is_vip') === 'true';
      if (isVipUser) setShowLoginAnim(true);
    }
  };

  if (screen === 'loading') return <><MobileLandscapeLockOverlay /><LoadingScreen onFinish={t => setScreen(t)} /></>;
  if (screen === 'login') return <><MobileLandscapeLockOverlay /><LoginScreen onLoginSuccess={handleLoginSuccess} /></>;

  return (
    <>
      <MobileLandscapeLockOverlay />
      {showLoginAnim && (
        <VIPLoginAnimationOverlay
          username={localStorage.getItem('domino_username') || 'PLAYER'}
          onComplete={() => setShowLoginAnim(false)}
        />
      )}

      {screen === 'gardu' && (
        <GarduScreen onBack={() => setScreen('home')} onViewProfile={setViewingProfile} />
      )}
      {screen === 'kamar-lobby' && (
        <KamarLobbyScreen
          onBack={() => setScreen('home')}
          onPlayRoom={(room) => {
            setSelectedRoom(room);
            setGameId(null);
            setScreen('waiting-room');
          }}
          category={lobbyCategory}
          setCategory={setLobbyCategory}
          socket={socketRef.current}
        />
      )}
      {screen === 'waiting-room' && selectedRoom && (
        <WaitingRoomScreen
          room={selectedRoom}
          socket={socketRef.current}
          onGameStart={(gid) => {
            setGameId(gid);
            setScreen('domino-play');
          }}
          onBack={() => setScreen('kamar-lobby')}
        />
      )}
      {screen === 'domino-play' && selectedRoom && gameId && (
        <DominoPlayScreen
          room={selectedRoom}
          gameId={gameId}
          socket={socketRef.current}
          onBack={() => setScreen('kamar-lobby')}
          onUpdateCoins={setAppAlert}
        />
      )}
      {screen === 'home' && (
        <HomeScreen
          onLogout={() => {
            if (socketRef.current) {
              socketRef.current.emit('user-logout');
            }
            setScreen('login');
          }}
          onNavigate={handleNavigate}
          socket={socketRef.current}
          initialShowSlotPopup={returnToSlotPopup}
          onClearSlotPopup={() => setReturnToSlotPopup(false)}
        />
      )}

      {screen === 'slot-lobby' && (
        <SlotLobbyScreen
          onBack={() => {
            setReturnToSlotPopup(true);
            setScreen('home');
          }}
          onPlaySlot={(gameId) => {
            const COMING_SOON = ['duofugrand', 'duofuduocai', 'superace', 'speedwinner', 'yingcaishen', 'richmine'];
            if (COMING_SOON.includes(gameId)) {
              setAppAlert('Game slot ini sedang dalam pengembangan (Coming Soon)!');
              return;
            }
            const map: Record<string, string> = {
              zeus: 'zeus-game',
              fafafa2: 'fafafa-game',
              mahjong2: 'mahjong2-game',
              gatotkaca: 'gatokaca-game',
              '5lions': 'fivelions-game',
              jinjibaoxi: 'jinji-game',
              wildwest: 'wildwest-game',
              candyrush: 'candy-game',
            };
            const target = map[gameId];
            if (target) {
              handleNavigate(target);
            }
          }}
        />
      )}

      {screen === 'slot-game' && (
        <SlotGameScreen
          onBack={() => {
            setReturnToSlotPopup(true);
            setScreen('home');
          }}
          socket={socketRef.current}
        />
      )}

      {screen === 'zeus-game' && (
        <ZeusSlotScreen
          onBack={() => {
            setReturnToSlotPopup(true);
            setScreen('home');
          }}
          socket={socketRef.current}
        />
      )}

      {screen === 'fafafa-game' && (
        <FafafaSlotScreen
          onBack={() => {
            setReturnToSlotPopup(true);
            setScreen('home');
          }}
          socket={socketRef.current}
        />
      )}

      {screen === 'jinji-game' && (
        <JinJiBaoXiSlotScreen
          onBack={() => {
            setReturnToSlotPopup(true);
            setScreen('home');
          }}
          socket={socketRef.current}
        />
      )}

      {screen === 'mahjong2-game' && (
        <MahjongWays2SlotScreen
          onBack={() => {
            setReturnToSlotPopup(true);
            setScreen('home');
          }}
          socket={socketRef.current}
        />
      )}

      {screen === 'gatokaca-game' && (
        <SlotErrorBoundary gameName="Gates of Gatotkaca" onBack={() => { setReturnToSlotPopup(true); setScreen('home'); }}>
          <GatesOfGatokacaSlotScreen
            onBack={() => {
              setReturnToSlotPopup(true);
              setScreen('home');
            }}
            socket={socketRef.current}
          />
        </SlotErrorBoundary>
      )}

      {screen === 'candy-game' && (
        <CandyRushSlotScreen
          onBack={() => {
            setReturnToSlotPopup(true);
            setScreen('home');
          }}
          socket={socketRef.current}
        />
      )}

      {screen === 'wildwest-game' && (
        <WildWestSlotScreen
          onBack={() => {
            setReturnToSlotPopup(true);
            setScreen('home');
          }}
          socket={socketRef.current}
        />
      )}

      {screen === 'fivelions-game' && (
        <FiveLionsSlotScreen
          onBack={() => {
            setReturnToSlotPopup(true);
            setScreen('home');
          }}
          socket={socketRef.current}
        />
      )}

      {screen === 'qiuqiu-game' && (
        <QiuQiuGameScreen
          onBack={() => {
            setByonePlayers(null);
            setByoneRoomCode(null);
            setByoneOpponent(null);
            setByoneBet(null);
            setScreen('home');
          }}
          socket={socketRef.current}
          room={selectedQiuRoom || QIUQIU_ROOMS[0]}
          customPlayers={byonePlayers}
          customBet={byoneBet}
        />
      )}

      {screen === 'billiard-game' && (
        <BilliardScreen
          onBack={() => {
            setByonePlayers(null);
            setByoneRoomCode(null);
            setByoneOpponent(null);
            setByoneBet(null);
            setScreen('home');
          }}
          socket={socketRef.current}
          roomCode={byoneRoomCode}
          players={byonePlayers}
          opponent={byoneOpponent}
          betAmount={byoneBet}
        />
      )}

      {screen === 'byone-game' && (
        <ByOneScreen
          onBack={() => {
            setByoneOpponent(null);
            setByoneBet(null);
            setByonePlayers(null);
            setByoneRoomCode(null);
            setScreen('home');
          }}
          socket={socketRef.current}
          initialOpponent={byoneOpponent}
          initialBet={byoneBet}
          customPlayers={byonePlayers}
          customCode={byoneRoomCode}
        />
      )}

      {/* SLOT LOADING SCREEN OVERLAY */}
      {activeSlotLoading && (
        <SlotLoadingScreen
          gameId={activeSlotLoading}
          onFinish={() => setActiveSlotLoading(null)}
        />
      )}

      {/* Other Profile Modal */}
      {viewingProfile && (
        <OtherProfileModal
          username={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onAddFriend={handleSendRequestFromProfile}
          onSendCoins={handleOpenTransferFromProfile}
          onChallengeByOne={(targetUser) => {
            setViewingProfile(null);
            setByoneOpponent(targetUser);
            setScreen('byone-game');
          }}
        />
      )}

      {/* Standalone Transfer Popup from Profile Card */}
      {transferTarget && (
        <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 1600 }} onClick={() => { setTransferTarget(null); setTransferAmount(''); }}>
          <div className="tm-transfer-popup tm-box-bounce" onClick={e => e.stopPropagation()}>
            <button className="tm-close-btn g-btn-press" style={{ top: '-1vh', right: '-1vw' }} onClick={() => { setTransferTarget(null); setTransferAmount(''); }}>✖</button>
            <div className="modal-title">KIRIM UANG (KOIN)</div>
            <div className="tm-transfer-body">
              <div className="tm-transfer-coin-flow">
                <span className="tm-floating-coin c1">🪙</span>
                <span className="tm-floating-coin c2">🪙</span>
                <span className="tm-floating-coin c3">🪙</span>
              </div>
              <div className="tm-transfer-info-card">
                <div style={{ fontSize: '2.5vh', color: '#fff', fontWeight: 'bold' }}>
                  Kirim ke: <span style={{ color: '#f1c40f' }}>{transferTarget.username}</span>
                </div>
              </div>
              <div className="tm-input-group">
                <input
                  type="number"
                  placeholder="0"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  className="tm-transfer-input"
                  autoFocus
                />
                <span className="tm-input-coin-label">🪙</span>
              </div>
              <div className="tm-quick-amount-grid">
                {[100000, 500000, 1000000, 5000000, 10000000].map(val => (
                  <button
                    key={val}
                    className="tm-quick-btn g-btn-press"
                    onClick={() => {
                      const current = parseInt(transferAmount, 10) || 0;
                      setTransferAmount((current + val).toString());
                    }}
                  >
                    +{formatCoins(val)}
                  </button>
                ))}
                <button className="tm-quick-btn clear g-btn-press" onClick={() => setTransferAmount('')}>Reset</button>
              </div>
              <div className="tm-transfer-actions">
                <button className="tm-transfer-cancel-btn g-btn-press" onClick={() => { setTransferTarget(null); setTransferAmount(''); }}>Batal</button>
                <button className="tm-transfer-submit-btn g-btn-press tm-pulse-btn" onClick={handleExecuteTransferFromApp}>🚀 Kirim Sekarang</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incoming By One Challenge Modal */}
      {incomingChallenge && (
        <div className="modal-overlay tm-overlay-fade" style={{ zIndex: 2000 }}>
          <div className="byone-prompt-modal" style={{ position: 'relative', top: 'auto', left: 'auto', transform: 'none' }}>
            <div className="byone-prompt-title">⚔️ TANTANGAN BY ONE MASUK!</div>
            <div className="byone-prompt-body">
              <b>{incomingChallenge.fromUsername}</b> menantang Anda duel By One di <b>{incomingChallenge.tierName}</b>!<br />
              Taruhan: <b style={{ color: '#f1c40f' }}>{formatCoins(incomingChallenge.betAmount)} 🪙</b>
            </div>
            <div className="byone-prompt-actions">
              <button
                className="byone-action-primary"
                onClick={() => {
                  socketRef.current?.emit('byone_respond_challenge', {
                    ...incomingChallenge,
                    toUsername: incomingChallenge.fromUsername,
                    accepted: true
                  });
                  setByoneOpponent(incomingChallenge.fromUsername);
                  setByoneBet(incomingChallenge.betAmount);
                  setIncomingChallenge(null);
                  setScreen('byone-game');
                }}
              >
                ⚔️ TERIMA DUEL!
              </button>
              <button
                className="byone-action-secondary"
                onClick={() => {
                  socketRef.current?.emit('byone_respond_challenge', {
                    ...incomingChallenge,
                    toUsername: incomingChallenge.fromUsername,
                    accepted: false
                  });
                  setIncomingChallenge(null);
                }}
              >
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App-level Floating Toast Notification */}
      {appAlert && (
        <FloatingToastNotification
          message={appAlert}
          onClose={() => setAppAlert(null)}
        />
      )}
    </>
  );
}

export default App;
