import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.domino.app',
  appName: 'Kings Billiards',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '933896189377-hphu2lam3pj4okj9ravdvd3od1oqr6s1.apps.googleusercontent.com',
      clientId: '933896189377-hphu2lam3pj4okj9ravdvd3od1oqr6s1.apps.googleusercontent.com',
      forceCodeForRefreshToken: false
    }
  }
};

export default config;
