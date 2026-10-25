import { Capacitor } from '@capacitor/core';

// URL Server Publik / VPS / Cloud untuk diakses oleh siapa pun di HP / Internet
// Ganti nilai ini saat backend sudah di-deploy ke server online (contoh: 'https://backend-anda.up.railway.app' atau 'http://IP_VPS:8080')
export const DEFAULT_LAN_SERVER = 'http://187.53.134.22:8080';

export const getBackendBase = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('domino_server_ip');
    if (custom) {
      let cleaned = custom.trim().replace(/\/+$/, '');
      if (cleaned) {
        if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
          // Jika mengandung domain umum seperti railway, render, heroku, atau domain berakhiran .com/.io/.app -> default ke https
          if (cleaned.includes('.') && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(cleaned)) {
            cleaned = `https://${cleaned}`;
          } else {
            cleaned = `http://${cleaned}`;
          }
        }
        try {
          const parsed = new URL(cleaned);
          // Hanya force port 8080 jika pengguna mengisi IP lokal / port dev 5173/3000
          if (parsed.port === '5173' || parsed.port === '3000') {
            parsed.port = '8080';
            cleaned = parsed.origin;
          } else if (!parsed.port && parsed.protocol === 'http:' && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(parsed.hostname)) {
            // Jika IP numerik lokal/VPS tanpa port di HTTP, default ke 8080
            parsed.port = '8080';
            cleaned = parsed.origin;
          }
        } catch {
          // Fallback jika bukan URL valid
          if (!cleaned.includes(':') && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(cleaned)) {
            cleaned = `${cleaned}:8080`;
          }
        }
        return cleaned;
      }
    }
  }

  // When running natively as an Android APK, connect to the configured public/LAN server
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    return DEFAULT_LAN_SERVER;
  }

  return 'http://localhost:8080';
};

export const API_URL = `${getBackendBase()}/api`;
export const SOCKET_URL = getBackendBase();
export default API_URL;

