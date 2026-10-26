/**
 * Standard Slot Betting Configuration & Slot Coins Helper
 * Min Bet: 500
 * Max Bet: 100,000 (100k)
 */

export const MIN_SLOT_BET = 500;
export const MAX_SLOT_BET = 100000;

export const SLOT_BET_STEPS = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

export function stepSlotBet(current: number, dir: number): number {
  if (dir > 0) {
    const next = SLOT_BET_STEPS.find(s => s > current);
    return next !== undefined ? next : MAX_SLOT_BET;
  } else {
    const prev = [...SLOT_BET_STEPS].reverse().find(s => s < current);
    return prev !== undefined ? prev : MIN_SLOT_BET;
  }
}

/**
 * Returns current coins and bonusCoins from localStorage.
 */
export function getSlotCoins(): { coins: number; bonusCoins: number; total: number } {
  const coins = parseInt(localStorage.getItem('domino_coins') || '0', 10) || 0;
  const bonusCoins = parseInt(localStorage.getItem('domino_bonus_coins') || '0', 10) || 0;
  return { coins, bonusCoins, total: coins + bonusCoins };
}

/**
 * Deducts slot bet or free-spin buy cost from local storage.
 * CRITICAL RULE: Consumes bonusCoins FIRST. If bonusCoins is exhausted or insufficient,
 * deducts the remainder from regular universal coins. Universal coins remain untouched
 * as long as bonusCoins >= betAmount!
 */
export function spendSlotCoinsLocal(betAmount: number): {
  success: boolean;
  coins: number;
  bonusCoins: number;
  total: number;
  spentFromBonus: number;
  spentFromCoins: number;
} {
  const { coins, bonusCoins, total } = getSlotCoins();
  if (total < betAmount) {
    return {
      success: false,
      coins,
      bonusCoins,
      total,
      spentFromBonus: 0,
      spentFromCoins: 0
    };
  }

  let newBonus = bonusCoins;
  let newCoins = coins;
  let spentFromBonus = 0;
  let spentFromCoins = 0;

  if (newBonus >= betAmount) {
    spentFromBonus = betAmount;
    newBonus -= betAmount;
  } else {
    spentFromBonus = newBonus;
    const remainder = betAmount - newBonus;
    newBonus = 0;
    spentFromCoins = remainder;
    newCoins = Math.max(0, newCoins - remainder);
  }

  localStorage.setItem('domino_bonus_coins', newBonus.toString());
  localStorage.setItem('domino_coins', newCoins.toString());
  window.dispatchEvent(new Event('domino_coins_updated'));

  return {
    success: true,
    coins: newCoins,
    bonusCoins: newBonus,
    total: newCoins + newBonus,
    spentFromBonus,
    spentFromCoins
  };
}

/**
 * Adds slot winnings to universal coins in local storage (bonusCoins remains unchanged).
 */
export function addSlotWinLocal(winAmount: number): {
  coins: number;
  bonusCoins: number;
  total: number;
} {
  const { coins, bonusCoins } = getSlotCoins();
  const newCoins = coins + Math.max(0, Math.floor(winAmount));
  localStorage.setItem('domino_coins', newCoins.toString());
  window.dispatchEvent(new Event('domino_coins_updated'));
  return {
    coins: newCoins,
    bonusCoins,
    total: newCoins + bonusCoins
  };
}

/**
 * Applies balance returned from backend (e.g. from spin result or update-coins).
 * Accurately saves domino_coins and domino_bonus_coins.
 */
export function applySlotResultBalance(data: { coins?: number; bonusCoins?: number; newBalance?: number }): {
  coins: number;
  bonusCoins: number;
  total: number;
} {
  let { coins, bonusCoins } = getSlotCoins();

  if (data.coins !== undefined) {
    coins = Math.floor(data.coins);
    localStorage.setItem('domino_coins', coins.toString());
  } else if (data.newBalance !== undefined && data.bonusCoins === undefined) {
    coins = Math.floor(data.newBalance);
    localStorage.setItem('domino_coins', coins.toString());
  }

  if (data.bonusCoins !== undefined) {
    bonusCoins = Math.floor(data.bonusCoins);
    localStorage.setItem('domino_bonus_coins', bonusCoins.toString());
  }

  window.dispatchEvent(new Event('domino_coins_updated'));
  return {
    coins,
    bonusCoins,
    total: coins + bonusCoins
  };
}

/**
 * Synchronizes slot bet or free spin purchase to backend /api/users/update-coins
 * with gameType: 'slot' ensuring bonusCoins is consumed first on MongoDB!
 */
export async function syncSlotBetToBackend(apiUrl: string, username: string, betAmount: number): Promise<{ coins: number; bonusCoins: number; total: number } | null> {
  if (!username || betAmount <= 0) return null;
  try {
    const res = await fetch(`${apiUrl}/users/update-coins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, amount: -betAmount, gameType: 'slot', isSlot: true })
    });
    if (res.ok) {
      const data = await res.json();
      return applySlotResultBalance(data);
    }
  } catch (err) {
    console.error('Error syncing slot bet to backend:', err);
  }
  return null;
}

/**
 * Synchronizes slot winnings to backend /api/users/update-coins with gameType: 'slot'.
 */
export async function syncSlotWinToBackend(apiUrl: string, username: string, winAmount: number): Promise<{ coins: number; bonusCoins: number; total: number } | null> {
  if (!username || winAmount <= 0) return null;
  try {
    const res = await fetch(`${apiUrl}/users/update-coins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, amount: winAmount, gameType: 'slot', isSlot: true })
    });
    if (res.ok) {
      const data = await res.json();
      return applySlotResultBalance(data);
    }
  } catch (err) {
    console.error('Error syncing slot win to backend:', err);
  }
  return null;
}
