import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.domino.app',
  appName: 'DominoApp',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '933896189377-s9gkhtjnjkpn0dvsio8orl7cdc9k13mc.apps.googleusercontent.com',
      forceCodeForRefreshToken: false
    }
  }
};

export default config;
