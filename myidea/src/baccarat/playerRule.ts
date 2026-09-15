export type PlayerAction = 'draw' | 'stand' | 'natural'

export function getPlayerAction(score: number): PlayerAction {
  if (score >= 8) return 'natural'
  if (score >= 6) return 'stand'
  return 'draw'
}
