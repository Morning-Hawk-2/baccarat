import { describe, expect, it } from 'vitest'
import { dealHand } from './dealHand'
import type { InitialDeal } from './deck'

describe('dealHand', () => {
  it('Playerがナチュラルのときは誰も第三カードを引かない', () => {
    const initial: InitialDeal = {
      player: [{ rank: '9' }, { rank: 'K' }],
      banker: [{ rank: '2' }, { rank: '3' }],
      remainingDeck: [{ rank: '5' }, { rank: '6' }],
    }

    const result = dealHand(initial)

    expect(result.player).toHaveLength(2)
    expect(result.banker).toHaveLength(2)
    expect(result.remainingDeck).toHaveLength(2)
  })

  it('Player合計6-7・Banker合計6-7で両者ともStand(第三カード不要)', () => {
    const initial: InitialDeal = {
      player: [{ rank: '7' }, { rank: 'K' }],
      banker: [{ rank: '7' }, { rank: 'K' }],
      remainingDeck: [{ rank: '5' }, { rank: '6' }],
    }

    const result = dealHand(initial)

    expect(result.player).toHaveLength(2)
    expect(result.banker).toHaveLength(2)
    expect(result.remainingDeck).toHaveLength(2)
  })

  it('Playerが引きBankerも引く(第三カードが必要な手)', () => {
    const initial: InitialDeal = {
      player: [{ rank: '2' }, { rank: '2' }],
      banker: [{ rank: '2' }, { rank: 'A' }],
      remainingDeck: [{ rank: '5' }, { rank: 'K' }],
    }

    const result = dealHand(initial)

    expect(result.player).toHaveLength(3)
    expect(result.banker).toHaveLength(3)
    expect(result.remainingDeck).toHaveLength(0)
  })

  it('Playerが引きBankerはStand(Playerの第三カード値による判定表でstand)', () => {
    const initial: InitialDeal = {
      player: [{ rank: '2' }, { rank: '2' }],
      banker: [{ rank: '3' }, { rank: '3' }],
      remainingDeck: [{ rank: '3' }, { rank: 'K' }],
    }

    const result = dealHand(initial)

    expect(result.player).toHaveLength(3)
    expect(result.banker).toHaveLength(2)
    expect(result.remainingDeck).toHaveLength(1)
  })
})
