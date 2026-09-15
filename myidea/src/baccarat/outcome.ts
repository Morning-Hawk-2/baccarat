import type { Card } from './score'
import { calculateScore } from './score'

export type Outcome = 'player' | 'banker' | 'tie'

export function judgeOutcome(player: Card[], banker: Card[]): Outcome {
  const playerScore = calculateScore(player)
  const bankerScore = calculateScore(banker)

  if (playerScore === bankerScore) return 'tie'
  return playerScore > bankerScore ? 'player' : 'banker'
}
