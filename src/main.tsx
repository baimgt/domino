import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CLIENT_VERSION } from './version'
import { Capacitor } from '@capacitor/core'

// Global Fetch Interceptor to always provide client version & platform
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const customHeaders = new Headers(init?.headers || {});
  if (!customHeaders.has('x-client-version')) {
    customHeaders.set('x-client-version', CLIENT_VERSION);
  }
  if (!customHeaders.has('x-client-platform')) {
    customHeaders.set('x-client-platform', Capacitor.isNativePlatform() ? 'android' : 'web');
  }
  return originalFetch(input, { ...init, headers: customHeaders });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
