import type { Card } from './score'

export function isPair(firstTwoCards: [Card, Card]): boolean {
  const [first, second] = firstTwoCards
  return first.rank === second.rank
}
