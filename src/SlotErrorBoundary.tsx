import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onBack: () => void;
  gameName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class SlotErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Slot Game Crash caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at center, #1b0c36, #070311)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          zIndex: 99999,
          fontFamily: 'sans-serif',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '24px', color: '#ffb300', marginBottom: '8px' }}>
            {this.props.gameName || 'Permainan'} Mengalami Kendala
          </h2>
          <p style={{ color: '#ccc', maxWidth: '420px', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
            Terjadi kesalahan teknis saat memuat permainan. Silakan klik tombol di bawah untuk kembali ke Lobi.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onBack();
            }}
            style={{
              background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
              color: '#000',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '24px',
              padding: '12px 32px',
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(255, 140, 0, 0.4)',
            }}
          >
            Kembali ke Lobi
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
