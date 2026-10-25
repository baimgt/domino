import { useEffect, useState } from 'react';
import './leaderboard.css';
import { API_URL } from './config';
import { renderSlotAvatar } from './SlotProfileModal';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  userId?: string;
  avatar: string;
  coins: number;
  vipLevel: number;
}

interface Props {
  onClose: () => void;
  onViewProfile?: (username: string) => void;
}

const fmt = (n: number) => {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  return n.toLocaleString('id-ID');
};

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardModal({ onClose, onViewProfile }: Props) {
  const [list, setList] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const myUsername = localStorage.getItem('domino_username') || '';

  const copyId = (id: string, name: string) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopyToast(`ID ${name} (${id}) disalin!`);
    setTimeout(() => setCopyToast(null), 2200);
  };

  const load = () => {
    setLoading(true);
    setError('');
    fetch(`${API_URL}/leaderboard?limit=50&username=${encodeURIComponent(myUsername)}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        setList(d.leaderboard || []);
        setMe(d.me || null);
      })
      .catch(() => setError('Gagal memuat peringkat. Pastikan server berjalan.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const top3 = list.slice(0, 3);
  const rest = list.slice(3);
  // Urutan podium standar: Juara 2 (Kiri), Juara 1 (Tengah/Tinggi), Juara 3 (Kanan)
  const podium = [top3[1], top3[0], top3[2]];

  return (
    <div className="lb-overlay" onClick={onClose}>
      <div className="lb-modal" onClick={e => e.stopPropagation()} id="leaderboard-modal">
        {/* Header */}
        <div className="lb-header">
          <div className="lb-title-wrap">
            <span className="lb-header-trophy">🏆</span>
            <div>
              <div className="lb-title">PAPAN PERINGKAT</div>
              <div className="lb-sub">Pemain terkaya berdasarkan total koin</div>
            </div>
          </div>
          <button className="lb-close" onClick={onClose} id="leaderboard-close" title="Tutup">✕</button>
        </div>

        {/* Copy Notification Toast */}
        {copyToast && (
          <div className="lb-toast">
            <span>📋</span> {copyToast}
          </div>
        )}

        {/* States */}
        {loading && (
          <div className="lb-state">
            <div className="lb-spinner" />
            <span>Memuat peringkat pemain...</span>
          </div>
        )}

        {!loading && error && (
          <div className="lb-state">
            <div>{error}</div>
            <button className="lb-retry" onClick={load}>Coba Lagi</button>
          </div>
        )}

        {!loading && !error && list.length === 0 && (
          <div className="lb-state">Belum ada pemain terdaftar.</div>
        )}

        {/* Content Body (Responsive Flex Container for Mobile HP) */}
        {!loading && !error && list.length > 0 && (
          <div className="lb-body-container">
            {/* Podium Section (Top 3) */}
            <div className="lb-podium-section">
              <div className="lb-podium">
                {podium.map((p, idx) => {
                  if (!p) return <div key={idx} className="lb-pod-slot lb-empty" />;
                  const place = p.rank;
                  const isMe = p.username === myUsername;

                  return (
                    <div
                      key={p.username}
                      className={`lb-pod-slot lb-place-${place} ${isMe ? 'lb-mine' : ''}`}
                      onClick={() => onViewProfile?.(p.username)}
                      title={`Klik untuk melihat profil ${p.username}`}
                    >
                      <div className="lb-pod-medal">{MEDALS[place - 1]}</div>

                      <div className="lb-pod-avatar-wrap">
                        <div className="lb-pod-avatar">
                          {renderSlotAvatar(p.avatar, 'lb-avatar-img', '👑')}
                        </div>
                        {p.vipLevel > 0 && (
                          <div className="lb-pod-vip">VIP {p.vipLevel}</div>
                        )}
                      </div>

                      <div className="lb-pod-info">
                        <div className="lb-pod-name" title={p.username}>{p.username}</div>
                        {p.userId && (
                          <div
                            className="lb-id-chip"
                            onClick={(e) => { e.stopPropagation(); copyId(p.userId!, p.username); }}
                            title="Klik untuk salin ID"
                          >
                            ID: {p.userId} 📋
                          </div>
                        )}
                        <div className="lb-pod-coins">🪙 {fmt(p.coins)}</div>
                      </div>

                      <div className="lb-pod-base">
                        <span className="lb-pod-rank-num">#{place}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* List & Sticky My Rank Section */}
            <div className="lb-list-section">
              <div className="lb-list">
                {rest.map(p => {
                  const isMe = p.username === myUsername;
                  return (
                    <div
                      key={p.username}
                      className={`lb-row ${isMe ? 'lb-mine' : ''}`}
                      onClick={() => onViewProfile?.(p.username)}
                    >
                      <div className={`lb-rank ${p.rank <= 10 ? 'lb-rank-top10' : ''}`}>
                        #{p.rank}
                      </div>

                      <div className="lb-row-avatar">
                        {renderSlotAvatar(p.avatar, 'lb-avatar-img', '🐸')}
                      </div>

                      <div className="lb-row-info">
                        <div className="lb-row-name-line">
                          <span className="lb-row-name">{p.username}</span>
                          {p.vipLevel > 0 && <span className="lb-vip">VIP {p.vipLevel}</span>}
                        </div>
                        {p.userId && (
                          <div
                            className="lb-row-id"
                            onClick={(e) => { e.stopPropagation(); copyId(p.userId!, p.username); }}
                            title="Klik untuk salin ID"
                          >
                            ID: {p.userId} 📋
                          </div>
                        )}
                      </div>

                      <div className="lb-row-coins">🪙 {fmt(p.coins)}</div>
                    </div>
                  );
                })}
              </div>

              {/* Sticky Me Bar (Peringkat Kamu) */}
              {me && me.rank > 0 && (
                <div
                  className="lb-me-bar"
                  onClick={() => onViewProfile?.(me.username)}
                  title="Klik untuk melihat profil Anda"
                >
                  <div className="lb-me-badge">KAMU</div>
                  <div className="lb-rank lb-me-rank">#{me.rank}</div>
                  <div className="lb-row-avatar">
                    {renderSlotAvatar(me.avatar, 'lb-avatar-img', '🐸')}
                  </div>
                  <div className="lb-row-info">
                    <div className="lb-row-name-line">
                      <span className="lb-row-name">{me.username}</span>
                      {me.vipLevel > 0 && <span className="lb-vip">VIP {me.vipLevel}</span>}
                    </div>
                    {me.userId && (
                      <div
                        className="lb-row-id"
                        onClick={(e) => { e.stopPropagation(); copyId(me.userId!, me.username); }}
                      >
                        ID: {me.userId} 📋
                      </div>
                    )}
                  </div>
                  <div className="lb-row-coins">🪙 {fmt(me.coins)}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
