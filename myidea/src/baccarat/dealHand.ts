import { getBankerActionWhenPlayerDrew, getBankerActionWhenPlayerStands } from './bankerRule'
import { getPlayerAction } from './playerRule'
import type { Card } from './score'
import { calculateScore } from './score'
import type { InitialDeal } from './deck'

export interface DealtHand {
  player: Card[]
  banker: Card[]
  remainingDeck: Card[]
}

export function dealHand(initial: InitialDeal): DealtHand {
  const deck = [...initial.remainingDeck]
  const player: Card[] = [...initial.player]
  const banker: Card[] = [...initial.banker]

  const playerScore = calculateScore(player)
  const bankerScore = calculateScore(banker)

  if (playerScore >= 8 || bankerScore >= 8) {
    return { player, banker, remainingDeck: deck }
  }

  let playerThirdCard: Card | undefined
  if (getPlayerAction(playerScore) === 'draw') {
    playerThirdCard = deck.shift()
    if (playerThirdCard) player.push(playerThirdCard)
  }

  const bankerAction = playerThirdCard
    ? getBankerActionWhenPlayerDrew(bankerScore, calculateScore([playerThirdCard]))
    : getBankerActionWhenPlayerStands(bankerScore)

  if (bankerAction === 'draw') {
    const bankerThirdCard = deck.shift()
    if (bankerThirdCard) banker.push(bankerThirdCard)
  }

  return { player, banker, remainingDeck: deck }
}
