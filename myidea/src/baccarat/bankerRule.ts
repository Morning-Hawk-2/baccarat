import type { PlayerAction } from './playerRule'

export function getBankerActionWhenPlayerStands(score: number): PlayerAction {
  if (score >= 8) return 'natural'
  if (score >= 6) return 'stand'
  return 'draw'
}

export function getBankerActionWhenPlayerDrew(
  bankerScore: number,
  playerThirdCardValue: number,
): PlayerAction {
  if (bankerScore >= 8) return 'natural'
  if (bankerScore <= 2) return 'draw'
  if (bankerScore === 7) return 'stand'
  if (bankerScore === 6) return [6, 7].includes(playerThirdCardValue) ? 'draw' : 'stand'
  if (bankerScore === 5) return [4, 5, 6, 7].includes(playerThirdCardValue) ? 'draw' : 'stand'
  if (bankerScore === 4) {
    return [2, 3, 4, 5, 6, 7].includes(playerThirdCardValue) ? 'draw' : 'stand'
  }
  return playerThirdCardValue === 8 ? 'stand' : 'draw'
}
