import React, { useState, useEffect } from 'react';
import './transfer-history.css';

import { API_URL } from './config';

export interface TransferItem {
  _id: string;
  transactionId: string;
  fromUsername: string;
  toUsername: string;
  amount: number;
  senderVip?: number;
  status: string;
  note?: string;
  createdAt: string;
}

interface Props {
  onClose: () => void;
  onOpenSendCoins?: () => void;
}

export default function RiwayatTransferModal({ onClose, onOpenSendCoins }: Props) {
  const myUsername = localStorage.getItem('domino_username') || '';
  const [history, setHistory] = useState<TransferItem[]>([]);
  const [stats, setStats] = useState({ totalSent: 0, totalReceived: 0, totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'sent' | 'received'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrx, setSelectedTrx] = useState<TransferItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!myUsername) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/transfers/${myUsername}?type=${filterType}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Gagal mengambil riwayat transfer:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filterType, myUsername]);

  const formatCoins = (n: number) => {
    if (isNaN(n)) return '0';
    return n.toLocaleString('id-ID');
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  const handleCopyTrx = (trxId: string) => {
    navigator.clipboard.writeText(trxId);
    setCopiedId(trxId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = history.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const otherUser = item.fromUsername === myUsername ? item.toUsername : item.fromUsername;
    return otherUser.toLowerCase().includes(q) || item.transactionId.toLowerCase().includes(q);
  });

  return (
    <div className="trx-hist-overlay" onClick={onClose}>
      <div className="trx-hist-box" onClick={e => e.stopPropagation()}>
        {/* HEADER */}
        <div className="trx-hist-header">
          <div className="trx-hist-title-group">
            <span className="trx-hist-icon">📜</span>
            <div>
              <h2 className="trx-hist-title">RIWAYAT TRANSFER KOIN</h2>
              <div className="trx-hist-sub">Catatan kirim & terima koin akun @{myUsername}</div>
            </div>
          </div>
          <button className="trx-hist-close-btn" onClick={onClose} title="Tutup">✕</button>
        </div>

        {/* STATS OVERVIEW */}
        <div className="trx-hist-stats-row">
          <div className="trx-stat-card sent">
            <span className="trx-stat-label">Total Terkirim</span>
            <span className="trx-stat-val">-{formatCoins(stats.totalSent)} 🪙</span>
          </div>
          <div className="trx-stat-card received">
            <span className="trx-stat-label">Total Diterima</span>
            <span className="trx-stat-val">+{formatCoins(stats.totalReceived)} 🪙</span>
          </div>
          <div className="trx-stat-card total">
            <span className="trx-stat-label">Total Transaksi</span>
            <span className="trx-stat-val">{stats.totalCount} Catatan</span>
          </div>
        </div>

        {/* CONTROLS (TABS & SEARCH) */}
        <div className="trx-hist-controls">
          <div className="trx-tabs-wrap">
            <button 
              className={`trx-tab-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              Semua
            </button>
            <button 
              className={`trx-tab-btn ${filterType === 'sent' ? 'active' : ''}`}
              onClick={() => setFilterType('sent')}
            >
              📤 Terkirim
            </button>
            <button 
              className={`trx-tab-btn ${filterType === 'received' ? 'active' : ''}`}
              onClick={() => setFilterType('received')}
            >
              📥 Diterima
            </button>
          </div>

          <div className="trx-search-box">
            <input 
              type="text" 
              className="trx-search-input" 
              placeholder="🔍 Cari nama / TRX ID..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* TRANSACTION LIST */}
        <div className="trx-hist-list">
          {loading ? (
            <div className="trx-empty-state">
              <span className="trx-empty-icon">⏳</span>
              <div className="trx-empty-title">Memuat Riwayat...</div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="trx-empty-state">
              <span className="trx-empty-icon">📭</span>
              <div className="trx-empty-title">Belum Ada Riwayat Transfer</div>
              <div className="trx-empty-sub">
                {searchQuery 
                  ? 'Tidak ada transaksi yang cocok dengan kata kunci pencarian Anda.' 
                  : 'Kirim koin ke teman atau minta teman mengirimkan koin hadiah ke akun Anda!'}
              </div>
              {onOpenSendCoins && !searchQuery && (
                <button 
                  className="trx-tab-btn active" 
                  style={{ marginTop: '10px', padding: '8px 20px' }}
                  onClick={() => { onClose(); onOpenSendCoins(); }}
                >
                  🎁 Kirim Koin Sekarang
                </button>
              )}
            </div>
          ) : (
            filteredItems.map(item => {
              const isSender = item.fromUsername === myUsername;
              const otherUser = isSender ? item.toUsername : item.fromUsername;

              return (
                <div 
                  key={item._id} 
                  className="trx-item-card"
                  onClick={() => setSelectedTrx(item)}
                  title="Klik untuk melihat bukti / struk transfer"
                >
                  <div className="trx-item-left">
                    <div className={`trx-direction-icon ${isSender ? 'sent' : 'received'}`}>
                      {isSender ? '📤' : '📥'}
                    </div>
                    <div className="trx-item-info">
                      <div className="trx-item-target">
                        {isSender ? 'Kirim ke ' : 'Terima dari '}
                        <span className="trx-target-username">@{otherUser}</span>
                      </div>
                      <div className="trx-item-meta">
                        <span>{formatDate(item.createdAt)}</span>
                        <span>•</span>
                        <span className="trx-meta-id">{item.transactionId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="trx-item-right">
                    <div className={`trx-amount-badge ${isSender ? 'sent' : 'received'}`}>
                      {isSender ? `-${formatCoins(item.amount)}` : `+${formatCoins(item.amount)}`} 🪙
                    </div>
                    <span className="trx-status-pill">✓ BERHASIL</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DIGITAL RECEIPT / BUKTI POPUP */}
      {selectedTrx && (
        <div className="trx-receipt-overlay" onClick={() => setSelectedTrx(null)}>
          <div className="trx-receipt-card" onClick={e => e.stopPropagation()}>
            <div className="trx-receipt-success-badge">✓</div>
            <h3 className="trx-receipt-title">BUKTI TRANSFER KOIN</h3>
            <div style={{ fontSize: '12px', color: '#bbb' }}>Status: Berhasil Terkirim</div>

            <div className="trx-receipt-amount">
              {selectedTrx.fromUsername === myUsername ? '-' : '+'}
              {formatCoins(selectedTrx.amount)} KOIN
            </div>

            <div className="trx-receipt-rows">
              <div className="trx-receipt-row">
                <span className="trx-receipt-row-label">Pengirim</span>
                <span className="trx-receipt-row-val">@{selectedTrx.fromUsername}</span>
              </div>
              <div className="trx-receipt-row">
                <span className="trx-receipt-row-label">Penerima</span>
                <span className="trx-receipt-row-val">@{selectedTrx.toUsername}</span>
              </div>
              <div className="trx-receipt-row">
                <span className="trx-receipt-row-label">Waktu Transaksi</span>
                <span className="trx-receipt-row-val">{formatDate(selectedTrx.createdAt)}</span>
              </div>
              <div className="trx-receipt-row">
                <span className="trx-receipt-row-label">No. Referensi (ID)</span>
                <span className="trx-receipt-row-val" style={{ fontFamily: 'monospace', color: '#ffd700' }}>
                  {selectedTrx.transactionId}
                </span>
              </div>
              <div className="trx-receipt-row">
                <span className="trx-receipt-row-label">Keterangan</span>
                <span className="trx-receipt-row-val">{selectedTrx.note || 'Transfer Koin VIP'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="trx-receipt-btn" 
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                onClick={() => handleCopyTrx(selectedTrx.transactionId)}
              >
                {copiedId === selectedTrx.transactionId ? '✅ Disalin!' : '📋 Salin ID'}
              </button>
              <button 
                className="trx-receipt-btn"
                onClick={() => setSelectedTrx(null)}
              >
                Tutup Struk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
