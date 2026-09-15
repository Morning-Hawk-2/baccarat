export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'

export interface Card {
  rank: Rank
  suit?: Suit
}

const RANK_VALUES: Record<Rank, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 0,
  J: 0,
  Q: 0,
  K: 0,
}

export function calculateScore(cards: Card[]): number {
  const total = cards.reduce((sum, card) => sum + RANK_VALUES[card.rank], 0)
  return total % 10
}
