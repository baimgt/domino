/**
 * Standard Slot Betting Configuration & Stepping Helper
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
