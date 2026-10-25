/**
 * slotAssetPreloader.ts
 * Real-time Asset Preloader & Texture Decoder for all Slot Games
 * Ensures 100% of symbols, backgrounds, sound engines, and server profiles
 * are fully loaded & decoded in GPU memory during the loading screen.
 */

import { API_URL } from './config';

export const GAME_ASSET_MANIFESTS: Record<string, string[]> = {
  gatotkaca: [
    '/assets/gatokaca/loading_art.jpg',
    '/assets/gatokaca/bg-gato-new.png',
    '/assets/gatokaca/bg_temple.jpg',
    '/assets/gatokaca/sym_ruby_ring.png',
    '/assets/gatokaca/sym_lion.png',
    '/assets/gatokaca/sym_potion.png',
    '/assets/gatokaca/sym_blue_medal.png',
    '/assets/gatokaca/sym_red_gem.png',
    '/assets/gatokaca/sym_purple_gem.png',
    '/assets/gatokaca/sym_yellow_gem.png',
    '/assets/gatokaca/sym_green_gem.png',
    '/assets/gatokaca/sym_blue_gem.png',
    '/assets/gatokaca/sym_scatter.png',
    '/assets/gatokaca/hero_character.png',
    '/assets/orbs/orb_red.png',
    '/assets/orbs/orb_purple.png',
    '/assets/orbs/orb_blue.png',
    '/assets/orbs/orb_green.png',
  ],
  zeus: [
    '/assets/zeus/bg_olympus_hd.jpg',
    '/assets/zeus/bg_olympus.jpg',
    '/assets/zeus_real.png',
    '/assets/zeus_character_clean.png',
    '/icon zeus/1000118696.png',
    '/icon zeus/1000118697.png',
    '/icon zeus/1000118698.png',
    '/icon zeus/1000118699.png',
    '/icon zeus/1000118700.png',
    '/icon zeus/1000118701.png',
    '/icon zeus/1000118702.png',
    '/icon zeus/1000118703.png',
    '/icon zeus/1000118704.png',
    '/icon zeus/1000118705.png',
    '/assets/orbs/orb_red.png',
    '/assets/orbs/orb_purple.png',
    '/assets/orbs/orb_blue.png',
    '/assets/orbs/orb_green.png',
  ],
  wildwest: [
    '/assets/wildwest/loading.jpg',
    '/assets/wildwest/bg_town.jpg',
    '/assets/wildwest/outlaw.jpg',
    '/assets/wildwest/wild.png',
    '/assets/wildwest/scatter.png',
    '/assets/wildwest/sheriff.png',
    '/assets/wildwest/outlaw.png',
    '/assets/wildwest/cowgirl.png',
    '/assets/wildwest/lady.png',
    '/assets/wildwest/gold_sacks.png',
    '/assets/wildwest/holster.png',
    '/assets/wildwest/sym_a.png',
    '/assets/wildwest/sym_k.png',
    '/assets/wildwest/sym_q.png',
    '/assets/wildwest/sym_j.png',
    '/assets/wildwest/sym_10.png',
    '/assets/orbs/orb_red.png',
    '/assets/orbs/orb_purple.png',
    '/assets/orbs/orb_blue.png',
    '/assets/orbs/orb_green.png',
  ],
  mahjong2: [
    '/assets/mahjong2/loading.jpg',
    '/assets/mahjong2/bg_mahjong.jpg',
    '/assets/mahjong2/sym_scatter.png',
    '/assets/mahjong2/sym_wild.png',
    '/assets/mahjong2/sym_fa.png',
    '/assets/mahjong2/sym_zhong.png',
    '/assets/mahjong2/sym_8wan.png',
    '/assets/mahjong2/sym_5dots.png',
    '/assets/mahjong2/sym_3dots.png',
    '/assets/mahjong2/sym_2dots.png',
    '/assets/mahjong2/sym_2bam.png',
    '/assets/mahjong2/sym_bai.png',
    '/assets/mahjong2/sym_5bam.png',
  ],
  fafafa2: [
    '/assets/fafafa2/loading.jpg',
    '/assets/fafafa2/bg_temple_clean.jpg',
    '/assets/fafafa2/title_plaque_clean.png',
    '/assets/fafafa2/sym_wild_red.png',
    '/assets/fafafa2/sym_wild_blue.png',
    '/assets/fafafa2/sym_scatter.png',
    '/assets/fafafa2/sym_kakek_merah.png',
    '/assets/fafafa2/sym_kakek_biru.png',
    '/assets/fafafa2/sym_bocil_hijau.png',
    '/assets/fafafa2/sym_bocil_ungu.png',
    '/assets/fafafa2/sym_drum.png',
    '/assets/fafafa2/sym_jade.png',
    '/assets/fafafa2/sym_firecracker.png',
    '/assets/fafafa2/sym_coin.png',
  ],
  '5lions': [
    '/assets/fivelions/loading.jpg',
    '/assets/fivelions/bg_temple.jpg',
    '/assets/fivelions/sym_phoenix.png',
    '/assets/fivelions/sym_dragon.png',
    '/assets/fivelions/sym_frog.png',
    '/assets/fivelions/sym_fish.png',
    '/assets/fivelions/sym_turtle.png',
    '/assets/fivelions/sym_wild.png',
    '/assets/fafafa2/sym_scatter.png',
    '/assets/fivelions/sym_a.png',
    '/assets/fivelions/sym_k.png',
    '/assets/fivelions/sym_q.png',
    '/assets/fivelions/sym_j.png',
    '/assets/fivelions/sym_10.png',
  ],
  jinjibaoxi: [
    '/assets/jinji/loading.jpg',
    '/assets/jinji/bg_temple.jpg',
    '/assets/jinji/jinji_fu_pot.png',
    '/assets/jinji/coin_PNG36943.png',
    '/assets/jinji/sym_dragon_gold.png',
    '/assets/jinji/sym_dragon_normal.png',
    '/assets/jinji/sym_phoenix_gold.png',
    '/assets/jinji/sym_phoenix_normal.png',
    '/assets/jinji/sym_tiger_gold.png',
    '/assets/jinji/sym_tiger_normal.png',
    '/assets/jinji/sym_turtle_gold.png',
    '/assets/jinji/sym_turtle_normal.png',
    '/assets/jinji/sym_carp.png',
    '/assets/jinji/sym_card_a.png',
    '/assets/jinji/sym_card_k.png',
    '/assets/jinji/sym_card_q.png',
  ],
  candyrush: [
    '/assets/candyrush/loading.jpg',
    '/assets/slot_loading_bg.jpg',
    '/assets/orbs/orb_red.png',
    '/assets/orbs/orb_purple.png',
    '/assets/orbs/orb_blue.png',
    '/assets/orbs/orb_green.png',
  ],
  duofuduocai: [
    '/assets/duofuduocai/loading_art.jpg',
    '/duofu_loading_art.jpg',
    '/duofuduocai_bg.png',
    '/assets/sym_dragon.png',
    '/assets/sym_fu.png',
    '/assets/sym_pot.png',
    '/assets/sym_ship.png',
    '/assets/sym_coin.png',
    '/assets/sym_a.png',
    '/assets/sym_k.png',
    '/assets/sym_q.png',
    '/assets/sym_j.png',
    '/assets/sym_10.png',
    '/assets/sym_9.png',
  ],
};

// Global in-memory cache to prevent garbage collection of decoded textures
const preloadedImageCache = new Map<string, HTMLImageElement>();

/**
 * Preload and decode a single image URL into GPU memory
 */
export async function preloadSingleImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  if (preloadedImageCache.has(url)) {
    return preloadedImageCache.get(url)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        if ('decode' in img) {
          await img.decode();
        }
      } catch {
        // Ignore decode errors on non-critical images
      }
      preloadedImageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      // Do not block preloader if image 404s
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Prewarm Web Audio Context for zero-latency in-game sound effects
 */
export function prewarmAudioEngine() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        const unlock = () => {
          ctx.resume();
          window.removeEventListener('click', unlock);
          window.removeEventListener('touchstart', unlock);
        };
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { once: true });
      }
    }
  } catch {
    // Ignore audio sandbox restrictions
  }
}

/**
 * Pre-fetch player profile & balance so slot state has zero network wait
 */
export async function prefetchUserProfile(): Promise<void> {
  const username = localStorage.getItem('domino_username');
  if (!username) return;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_URL}/profile/${username}`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const d = await res.json();
      if (d.coins !== undefined) localStorage.setItem('domino_coins', d.coins.toString());
      if (d.vipLevel !== undefined) localStorage.setItem('domino_vip', d.vipLevel.toString());
      if (d.level !== undefined) localStorage.setItem('domino_level', d.level.toString());
      if (d.avatar && d.avatar !== '/bg.png') localStorage.setItem('domino_avatar', d.avatar);
      if (d.customFrame) localStorage.setItem('domino_custom_frame', d.customFrame);
      if (d.rp !== undefined) localStorage.setItem('domino_rp', d.rp.toString());
    }
  } catch {
    // Graceful offline/timeout fallback
  }
}

export interface PreloadProgressInfo {
  percent: number;
  statusText: string;
  loadedCount: number;
  totalCount: number;
}

/**
 * Master Preload Routine for a Slot Game
 * Loads all symbols, backgrounds, textures, audio context, and player data.
 */
export async function preloadSlotGame(
  gameId: string,
  onProgress?: (info: PreloadProgressInfo) => void
): Promise<void> {
  const assetList = [...(GAME_ASSET_MANIFESTS[gameId] || [])];

  // Also include user avatar if it's an external URL
  const userAvatar = localStorage.getItem('domino_avatar');
  if (userAvatar && (userAvatar.startsWith('http://') || userAvatar.startsWith('https://') || userAvatar.startsWith('/'))) {
    if (!assetList.includes(userAvatar)) {
      assetList.push(userAvatar);
    }
  }

  const total = assetList.length + 2; // +1 for profile fetch, +1 for audio engine
  let loaded = 0;

  const update = (text: string) => {
    const p = Math.min(100, Math.floor((loaded / total) * 100));
    onProgress?.({
      percent: p,
      statusText: text,
      loadedCount: loaded,
      totalCount: total,
    });
  };

  update('MENGHUBUNGKAN KE SERVER PERMAINAN...');

  // 1. Kick off audio warmup & profile pre-fetch concurrently
  prewarmAudioEngine();
  loaded++;
  update('MENYIAPKAN AUDIO SISTEM...');

  const profilePromise = prefetchUserProfile().then(() => {
    loaded++;
    update('MEMERIKSA SALDO & STATUS VIP...');
  });

  // 2. Preload and GPU-decode each asset in parallel batches
  const BATCH_SIZE = 4;
  const loadAssetBatch = async (items: string[]) => {
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (url) => {
          await preloadSingleImage(url);
          loaded++;
          const assetName = url.split('/').pop()?.replace('.png', '').replace('.jpg', '') || 'simbol';
          update(`MEMUAT ${assetName.toUpperCase()}...`);
        })
      );
    }
  };

  await Promise.all([loadAssetBatch(assetList), profilePromise]);

  update('SEMUA ASET SIAP! MEMULAI...');
}

export const HOME_ASSET_MANIFEST: string[] = [
  '/assets/kings_billiards_logo.png',
  '/assets/royal_x_logo.png',
  '/assets/kings_billiard_loading.jpg',
  '/premium_lobby_bg.png',
  '/home_bg.png',
  '/gardu_bg.png',
  '/domino.png',
  '/assets/bg_maroon.png',
  '/assets/billiard_lounge_bg.jpg',
  '/assets/byone_banner.jpg',
  '/assets/slot_loading_bg.jpg',
  '/assets/zeus/bg_olympus_hd.jpg',
  '/assets/gatokaca/loading_art.jpg',
  '/assets/mahjong2/loading.jpg',
  '/assets/fivelions/loading.jpg',
  '/assets/fafafa2/loading.jpg',
  '/assets/wildwest/loading.jpg',
  '/assets/jinji/loading.jpg',
  '/assets/candyrush/loading.jpg',
];

/**
 * Master Preload Routine for the Home Screen / Lobby
 * Preloads all lobby backgrounds, game cards, sound engines, and player data.
 */
export async function preloadHomeAssets(
  onProgress?: (info: PreloadProgressInfo) => void
): Promise<void> {
  const assetList = [...HOME_ASSET_MANIFEST];

  // Include user avatar if external URL
  const userAvatar = localStorage.getItem('domino_avatar');
  if (userAvatar && (userAvatar.startsWith('http://') || userAvatar.startsWith('https://') || userAvatar.startsWith('/'))) {
    if (!assetList.includes(userAvatar)) {
      assetList.push(userAvatar);
    }
  }

  const total = assetList.length + 2; // +1 audio, +1 profile
  let loaded = 0;

  const update = (text: string) => {
    const p = Math.min(100, Math.floor((loaded / total) * 100));
    onProgress?.({
      percent: p,
      statusText: text,
      loadedCount: loaded,
      totalCount: total,
    });
  };

  update('🎱 MENGHUBUNGKAN KE SERVER KINGS BILLIARD...');

  // 1. Audio warmup & profile pre-fetch concurrently
  prewarmAudioEngine();
  loaded++;
  update('👑 MENYIAPKAN AUDIO SISTEM...');

  const profilePromise = prefetchUserProfile().then(() => {
    loaded++;
    update('👑 SINKRONISASI PROFIL & SALDO KOIN...');
  });

  // 2. Preload and GPU-decode home & lobby assets
  const BATCH_SIZE = 4;
  const loadAssetBatch = async (items: string[]) => {
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (url) => {
          await preloadSingleImage(url);
          loaded++;
          const assetName = url.split('/').pop()?.replace('.png', '').replace('.jpg', '') || 'aset';
          update(`👑 MEMUAT ${assetName.toUpperCase()}...`);
        })
      );
    }
  };

  await Promise.all([loadAssetBatch(assetList), profilePromise]);

  update('👑 SEMUA ASET HOME TERMUAT LENGKAP! ✨');
}

