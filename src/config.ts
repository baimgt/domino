import { Capacitor } from '@capacitor/core';

export const DEFAULT_LAN_SERVER = 'http://10.110.8.66:8080';

export const getBackendBase = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('domino_server_ip');
    if (custom) return custom.replace(/\/+$/, '');
  }

  // When running natively as an Android APK, connect to the PC's Wi-Fi IP
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    return DEFAULT_LAN_SERVER;
  }

  return 'http://localhost:8080';
};

export const API_URL = `${getBackendBase()}/api`;
export const SOCKET_URL = getBackendBase();
export default API_URL;
