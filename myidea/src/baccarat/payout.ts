import type { Bet } from './bet'
import type { Outcome } from './outcome'

export interface HandResult {
  outcome: Outcome
  playerPair: boolean
  bankerPair: boolean
}

export const WIN_MULTIPLIERS: Record<Outcome, number> = {
  player: 1,
  banker: 0.95,
  tie: 8,
}

export const PAIR_MULTIPLIER = 11

export function calculatePayout(bet: Bet, result: HandResult): number {
  switch (bet.type) {
    case 'player':
    case 'banker':
    case 'tie':
      return bet.type === result.outcome ? bet.amount * WIN_MULTIPLIERS[bet.type] : 0
    case 'playerPair':
      return result.playerPair ? bet.amount * PAIR_MULTIPLIER : 0
    case 'bankerPair':
      return result.bankerPair ? bet.amount * PAIR_MULTIPLIER : 0
  }
}
