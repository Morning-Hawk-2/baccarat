import { createDeck, dealInitialHands, shuffleDeck } from './deck'
import { dealHand } from './dealHand'
import type { DealtHand } from './dealHand'

const THIRD_CARD_REDRAW_PROBABILITY = 0.5
const MAX_REDRAW_ATTEMPTS = 5

export function needsThirdCard(hand: DealtHand): boolean {
  return hand.player.length > 2 || hand.banker.length > 2
}

function dealFreshHand(): DealtHand {
  return dealHand(dealInitialHands(shuffleDeck(createDeck())))
}

export function dealRandomHand(): DealtHand {
  let hand = dealFreshHand()
  let attempts = 0

  while (
    !needsThirdCard(hand) &&
    Math.random() < THIRD_CARD_REDRAW_PROBABILITY &&
    attempts < MAX_REDRAW_ATTEMPTS
  ) {
    hand = dealFreshHand()
    attempts++
  }

  return hand
}
