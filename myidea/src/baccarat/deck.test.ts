import { describe, expect, it } from 'vitest'
import { createDeck, dealInitialHands, shuffleDeck } from './deck'
import type { Card } from './score'

const cardId = (card: Card) => `${card.rank}-${card.suit}`

describe('createDeck', () => {
  it('52枚あり、rankとsuitの組み合わせに重複がない', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
    expect(new Set(deck.map(cardId)).size).toBe(52)
  })
})

describe('shuffleDeck', () => {
  it('シャッフル後も52枚のカードの中身は変わらない', () => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck)
    expect(shuffled).toHaveLength(52)
    expect(shuffled.map(cardId).sort()).toEqual(deck.map(cardId).sort())
  })
})

describe('dealInitialHands', () => {
  it('Player2枚・Banker2枚が重複なく配られ、残りが48枚になる', () => {
    const deck = shuffleDeck(createDeck())
    const { player, banker, remainingDeck } = dealInitialHands(deck)

    expect(player).toHaveLength(2)
    expect(banker).toHaveLength(2)
    expect(remainingDeck).toHaveLength(48)

    const dealtIds = [...player, ...banker].map(cardId)
    expect(new Set(dealtIds).size).toBe(4)
  })

  it('毎回異なる52枚から配られるため、連続で同じ配布にはならない', () => {
    const first = dealInitialHands(shuffleDeck(createDeck()))
    const second = dealInitialHands(shuffleDeck(createDeck()))

    const firstIds = [...first.player, ...first.banker].map(cardId)
    const secondIds = [...second.player, ...second.banker].map(cardId)
    expect(firstIds).not.toEqual(secondIds)
  })
})
