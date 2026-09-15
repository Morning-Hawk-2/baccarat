import type { Bet } from './bet'
import type { Outcome } from './outcome'

const PAYOUT_MULTIPLIERS: Partial<Record<Bet['type'], number>> = {
  player: 1,
  banker: 0.95,
  tie: 8,
}

export function calculatePayout(bet: Bet, outcome: Outcome): number {
  if (bet.type !== outcome) return 0

  const multiplier = PAYOUT_MULTIPLIERS[bet.type]
  if (multiplier === undefined) return 0

  return bet.amount * multiplier
}
