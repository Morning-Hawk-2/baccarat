import type { PlayerAction } from './playerRule'

export function getBankerActionWhenPlayerStands(score: number): PlayerAction {
  if (score >= 8) return 'natural'
  if (score >= 6) return 'stand'
  return 'draw'
}
