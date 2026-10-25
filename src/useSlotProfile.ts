import { useState, useEffect } from 'react';
import { API_URL } from './config';

export interface SlotProfileData {
  username: string;
  avatar: string;
  level: string | number;
  vipLevel: string | number;
  userId: string;
  rp: number;
}

export function useSlotProfile(): SlotProfileData {
  const [profile, setProfile] = useState<SlotProfileData>(() => {
    return {
      username: localStorage.getItem('domino_username') || 'Pemain',
      avatar: localStorage.getItem('domino_avatar') || '🐸',
      level: localStorage.getItem('domino_level') || '45',
      vipLevel: localStorage.getItem('domino_vip') || '3',
      userId: localStorage.getItem('domino_user_id') || '',
      rp: parseInt(localStorage.getItem('domino_rp') || '0', 10),
    };
  });

  useEffect(() => {
    const username = localStorage.getItem('domino_username');
    if (!username) return;

    fetch(`${API_URL}/profile/${username}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return;
        const uid = d.userId || d.id || localStorage.getItem('domino_user_id') || '';
        const newProf: SlotProfileData = {
          username: d.username || username,
          avatar: d.avatar || localStorage.getItem('domino_avatar') || '🐸',
          level: d.level || localStorage.getItem('domino_level') || '1',
          vipLevel: d.vipLevel !== undefined ? d.vipLevel : (localStorage.getItem('domino_vip') || '0'),
          userId: uid || 'ID...',
          rp: d.rp !== undefined ? d.rp : 0,
        };
        setProfile(newProf);

        if (d.avatar) localStorage.setItem('domino_avatar', d.avatar);
        if (d.vipLevel !== undefined) localStorage.setItem('domino_vip', d.vipLevel.toString());
        if (d.level !== undefined) localStorage.setItem('domino_level', d.level.toString());
        if (uid) localStorage.setItem('domino_user_id', uid.toString());
        if (d.rp !== undefined) localStorage.setItem('domino_rp', d.rp.toString());
      })
      .catch(() => {});

    // Listen for real-time avatar updates
    const handleAvatarUpdate = (e: any) => {
      const newAv = e?.detail?.avatar || localStorage.getItem('domino_avatar');
      if (newAv) {
        setProfile(prev => ({ ...prev, avatar: newAv }));
      }
    };
    // Listen for real-time username updates
    const handleUsernameUpdate = (e: any) => {
      const newU = e?.detail?.newUsername || localStorage.getItem('domino_username');
      if (newU) {
        setProfile(prev => ({ ...prev, username: newU }));
      }
    };
    window.addEventListener('domino_avatar_updated', handleAvatarUpdate);
    window.addEventListener('domino_username_updated', handleUsernameUpdate);
    return () => {
      window.removeEventListener('domino_avatar_updated', handleAvatarUpdate);
      window.removeEventListener('domino_username_updated', handleUsernameUpdate);
    };
  }, []);

  return profile;
}
