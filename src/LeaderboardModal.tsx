import { useEffect, useState } from 'react';
import './leaderboard.css';

const API_URL = 'http://localhost:8080/api';

interface Entry {
  rank: number;
  username: string;
  avatar: string;
  coins: number;
  vipLevel: number;
}

interface Props {
  onClose: () => void;
  onViewProfile?: (username: string) => void;
}

const fmt = (n: number) => n.toLocaleString('id-ID');

const MEDAL = ['🥇', '🥈', '🥉'];

function Avatar({ src, name }: { src: string; name: string }) {
  const isImg = src && (src.startsWith('/') || src.startsWith('http') || src.startsWith('data:'));
  if (isImg) {
    return <img className="lb-avatar-img" src={src} alt={name} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
  }
  return <span className="lb-avatar-emoji">{src || name.charAt(0).toUpperCase()}</span>;
}

export default function LeaderboardModal({ onClose, onViewProfile }: Props) {
  const [list, setList] = useState<Entry[]>([]);
  const [me, setMe] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const myUsername = localStorage.getItem('domino_username') || '';

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
  // Urutan podium: juara 2, juara 1, juara 3
  const podium = [top3[1], top3[0], top3[2]];

  return (
    <div className="lb-overlay" onClick={onClose}>
      <div className="lb-modal" onClick={e => e.stopPropagation()} id="leaderboard-modal">
        <div className="lb-header">
          <div className="lb-title">🏆 PAPAN PERINGKAT</div>
          <button className="lb-close" onClick={onClose} id="leaderboard-close">✕</button>
        </div>
        <div className="lb-sub">Pemain terkaya berdasarkan total koin</div>

        {loading && <div className="lb-state"><div className="lb-spinner" />Memuat...</div>}
        {!loading && error && (
          <div className="lb-state">
            {error}
            <button className="lb-retry" onClick={load}>Coba lagi</button>
          </div>
        )}
        {!loading && !error && list.length === 0 && (
          <div className="lb-state">Belum ada pemain.</div>
        )}

        {!loading && !error && list.length > 0 && (
          <>
            <div className="lb-podium">
              {podium.map((p, i) => {
                if (!p) return <div key={i} className="lb-pod-slot" />;
                const place = p.rank;
                return (
                  <div
                    key={p.username}
                    className={`lb-pod-slot lb-place-${place} ${p.username === myUsername ? 'lb-mine' : ''}`}
                    onClick={() => onViewProfile?.(p.username)}
                  >
                    <div className="lb-pod-medal">{MEDAL[place - 1]}</div>
                    <div className="lb-pod-avatar"><Avatar src={p.avatar} name={p.username} /></div>
                    <div className="lb-pod-name">{p.username}</div>
                    <div className="lb-pod-coins">🪙 {fmt(p.coins)}</div>
                    <div className="lb-pod-base">{place}</div>
                  </div>
                );
              })}
            </div>

            <div className="lb-list">
              {rest.map(p => (
                <div
                  key={p.username}
                  className={`lb-row ${p.username === myUsername ? 'lb-mine' : ''}`}
                  onClick={() => onViewProfile?.(p.username)}
                >
                  <div className="lb-rank">{p.rank}</div>
                  <div className="lb-row-avatar"><Avatar src={p.avatar} name={p.username} /></div>
                  <div className="lb-row-name">
                    {p.username}
                    {p.vipLevel > 0 && <span className="lb-vip">VIP {p.vipLevel}</span>}
                  </div>
                  <div className="lb-row-coins">🪙 {fmt(p.coins)}</div>
                </div>
              ))}
            </div>

            {me && me.rank > 0 && (
              <div className="lb-me-bar">
                <div className="lb-rank">{me.rank}</div>
                <div className="lb-row-avatar"><Avatar src={me.avatar} name={me.username} /></div>
                <div className="lb-row-name">Kamu ({me.username})</div>
                <div className="lb-row-coins">🪙 {fmt(me.coins)}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
