import type { Card, Rank, Suit } from './score'

const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export interface InitialDeal {
  player: [Card, Card]
  banker: [Card, Card]
  remainingDeck: Card[]
}

export function dealInitialHands(deck: Card[]): InitialDeal {
  const [p1, b1, p2, b2, ...rest] = deck
  return {
    player: [p1, p2],
    banker: [b1, b2],
    remainingDeck: rest,
  }
}
