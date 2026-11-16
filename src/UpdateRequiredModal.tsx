import React from 'react';
import { Capacitor } from '@capacitor/core';
import { CLIENT_VERSION } from './version';

export interface SystemVersionConfig {
  webVersion: string;
  minWebVersion: string;
  appVersion: string;
  minAppVersion: string;
  appVersionCode?: number;
  forceUpdateWeb?: boolean;
  forceUpdateApp?: boolean;
  downloadUrl?: string;
  updateTitle?: string;
  updateMessage?: string;
}

interface Props {
  config: SystemVersionConfig | null;
}

export const UpdateRequiredModal: React.FC<Props> = ({ config }) => {
  const isNative = Capacitor.isNativePlatform();
  const currentVersion = CLIENT_VERSION;
  const targetVersion = isNative 
    ? (config?.minAppVersion || config?.appVersion || '2.80')
    : (config?.minWebVersion || config?.webVersion || '2.80');

  const handleAction = () => {
    if (!isNative) {
      // In Web: Force reload with cache busting timestamp
      try {
        const cleanUrl = window.location.origin + window.location.pathname + '?v=' + Date.now();
        window.location.replace(cleanUrl);
      } catch {
        window.location.reload();
      }
    } else {
      // In Native Android App: Open download landing page or APK link
      const rawUrl = config?.downloadUrl || '/download';
      let fullUrl = rawUrl;
      if (rawUrl.startsWith('/')) {
        const host = window.location.origin || 'http://localhost:8080';
        fullUrl = host + rawUrl;
      }
      try {
        window.open(fullUrl, '_system');
      } catch {
        window.location.href = fullUrl;
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(5, 7, 15, 0.94)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        userSelect: 'none',
        fontFamily: "'Segoe UI', Roboto, sans-serif"
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'linear-gradient(145deg, #161b26 0%, #0c1017 100%)',
          border: '2px solid rgba(255, 215, 0, 0.65)',
          borderRadius: '20px',
          padding: '28px 24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(255, 215, 0, 0.25)',
          textAlign: 'center',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '200px',
            height: '100px',
            background: 'radial-gradient(ellipse, rgba(255, 215, 0, 0.3) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        {/* Icon */}
        <div style={{ fontSize: '52px', marginBottom: '12px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}>
          {isNative ? '🚀' : '🔄'}
        </div>

        {/* Title */}
        <h2
          style={{
            margin: '0 0 10px 0',
            fontSize: '22px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #fff2a3 0%, #ffd700 50%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.5px'
          }}
        >
          {isNative ? 'PEMBARUAN WAJIB APLIKASI' : 'PEMBARUAN VERSI TERSEDIA'}
        </h2>

        {/* Version Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: '16px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            fontSize: '12.5px',
            fontWeight: 700,
            marginBottom: '16px'
          }}
        >
          <span>Versi Saat Ini: <b>V{currentVersion}</b></span>
          <span>➔</span>
          <span style={{ color: '#34d399' }}>Wajib: <b>V{targetVersion}</b></span>
        </div>

        {/* Message */}
        <p
          style={{
            margin: '0 0 24px 0',
            fontSize: '14px',
            lineHeight: 1.6,
            color: '#cbd5e1'
          }}
        >
          {isNative
            ? (config?.updateMessage || `Versi aplikasi Anda sudah usang (V${currentVersion}). Demi keamanan saldo dan kelancaran bermain, Anda wajib mengunduh update aplikasi terbaru (V${targetVersion}) sebelum bermain.`)
            : 'Sistem permainan telah diperbarui ke versi terbaru. Demi keamanan saldo dan kelancaran bermain, Anda WAJIB memuat ulang (refresh) halaman ini untuk melanjutkan.'}
        </p>

        {/* Warning lock notice */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#fbbf24',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>🔒</span>
          <span>Permainan dikunci sementara sampai update dilakukan.</span>
        </div>

        {/* Action Button */}
        <button
          onClick={handleAction}
          style={{
            width: '100%',
            padding: '15px 20px',
            fontSize: '16px',
            fontWeight: 800,
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #ffd700 0%, #ff9800 100%)',
            color: '#0f172a',
            cursor: 'pointer',
            boxShadow: '0 8px 25px rgba(255, 180, 0, 0.45)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span>{isNative ? '⬇️' : '🔄'}</span>
          <span>{isNative ? `Unduh Update APK (V${targetVersion})` : 'Muat Ulang Sekarang (Refresh Halaman)'}</span>
        </button>
      </div>
    </div>
  );
};

export default UpdateRequiredModal;
