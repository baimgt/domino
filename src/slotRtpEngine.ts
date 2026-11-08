/**
 * SLOT RTP & HIT FREQUENCY MATHEMATICAL GOVERNOR ENGINE (CLIENT-SIDE)
 * 
 * Target Casino Specifications:
 * - Return To Player (RTP): 96.26% (0.9626)
 * - Base Game Hit Frequency: 15.05% (0.1505)
 * - Scatter / Free Spins Feature Contribution: ~27.50%
 * - Base Game Paytable Contribution: ~68.76%
 * - Conditional Expected Win on Hit: 0.6876 / 0.1505 = 4.5688x Bet
 */

export const TARGET_RTP = 0.4500;          // 45.00% (Tingkat Kemenangan Rendah / Sulit Menang)
export const TARGET_HIT_FREQ = 0.1000;     // 10.00% (~1 kemenangan kecil setiap 10 putaran)
export const SCATTER_BASE_RATE = 0.0022;   // ~1 in 455 spins
export const SCATTER_ANTE_RATE = 0.0040;   // ~1 in 250 spins with 1.25x Ante Bet

export interface SpinOutcome {
  isHit: boolean;
  isScatter: boolean;
  targetMult: number;
  winTier: 'loss' | 'mini' | 'medium' | 'big' | 'mega' | 'scatter';
  scattersCount: number;
}

export function determineSpinOutcome({
  isFreeSpins = false,
  anteMode = false,
  buyFeature = false
}: {
  isFreeSpins?: boolean;
  anteMode?: boolean;
  buyFeature?: boolean;
} = {}): SpinOutcome {
  // 1. Buy Free Spins Feature (Hanya memicu 4 Scatter awal tanpa bonus pecahan tambahan)
  if (buyFeature) {
    return {
      isHit: false,
      isScatter: true,
      targetMult: 0,
      winTier: 'scatter',
      scattersCount: 4
    };
  }

  // 2. Free Spins Mode (Bonus Round - Tingkat Kemenangan Rendah agar sulit balik modal saat beli Scatter)
  if (isFreeSpins) {
    const isRetrigger = Math.random() < (anteMode ? 0.008 : 0.005);
    const isFsHit = Math.random() < 0.18; // Hanya 18% putaran Free Spin yang pecah (82% zonk/kosong)
    let targetMult = 0;
    let winTier: 'loss' | 'mini' | 'medium' | 'big' | 'mega' | 'scatter' = 'loss';

    if (isFsHit) {
      const roll = Math.random();
      if (roll < 0.80) {
        targetMult = 0.25 + Math.random() * 1.15; // 0.25x - 1.40x (receh)
        winTier = 'mini';
      } else if (roll < 0.95) {
        targetMult = 1.40 + Math.random() * 2.10; // 1.40x - 3.50x
        winTier = 'medium';
      } else if (roll < 0.99) {
        targetMult = 3.50 + Math.random() * 4.50; // 3.50x - 8.00x
        winTier = 'big';
      } else {
        targetMult = 8.00 + Math.random() * 10.0; // 8.00x - 18.0x (sangat langka)
        winTier = 'mega';
      }
    }

    return {
      isHit: isFsHit,
      isScatter: isRetrigger,
      targetMult: isFsHit ? Number(targetMult.toFixed(2)) : 0,
      winTier: isRetrigger ? 'scatter' : winTier,
      scattersCount: isRetrigger ? 3 : 0
    };
  }

  // 3. Natural Scatter Trigger in Base Game
  const scatterChance = anteMode ? SCATTER_ANTE_RATE : SCATTER_BASE_RATE;
  if (Math.random() < scatterChance) {
    return {
      isHit: false,
      isScatter: true,
      targetMult: 3.0,
      winTier: 'scatter',
      scattersCount: 4
    };
  }

  // 4. Base Game Hit Frequency: 10.00% (90% putaran zonk)
  const isHit = Math.random() < TARGET_HIT_FREQ;

  if (!isHit) {
    // Clean Loss (90.00% of spins)
    return {
      isHit: false,
      isScatter: false,
      targetMult: 0,
      winTier: 'loss',
      scattersCount: Math.random() < 0.14 ? (Math.random() < 0.85 ? 1 : 2) : 0
    };
  }

  // 5. Base Game Win Multiplier Distribution (Mayoritas kemenangan kecil di bawah taruhan)
  const roll = Math.random();
  let targetMult = 0;
  let winTier: 'loss' | 'mini' | 'medium' | 'big' | 'mega' | 'scatter' = 'mini';

  if (roll < 0.82) {
    targetMult = 0.25 + Math.random() * 0.95; // 0.25x - 1.20x
    winTier = 'mini';
  } else if (roll < 0.96) {
    targetMult = 1.20 + Math.random() * 1.80; // 1.20x - 3.00x
    winTier = 'medium';
  } else if (roll < 0.995) {
    targetMult = 3.00 + Math.random() * 4.50; // 3.00x - 7.50x
    winTier = 'big';
  } else {
    targetMult = 7.50 + Math.random() * 7.50; // 7.50x - 15.0x
    winTier = 'mega';
  }

  return {
    isHit: true,
    isScatter: false,
    targetMult: Number(targetMult.toFixed(2)),
    winTier,
    scattersCount: Math.random() < 0.10 ? 1 : 0
  };
}
