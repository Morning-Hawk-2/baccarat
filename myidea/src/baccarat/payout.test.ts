import { describe, expect, it } from 'vitest'
import { calculatePayout } from './payout'
import type { HandResult } from './payout'

const result = (overrides: Partial<HandResult> = {}): HandResult => ({
  outcome: 'player',
  playerPair: false,
  bankerPair: false,
  ...overrides,
})

describe('calculatePayout', () => {
  it('Playerにベットしてplayer winなら1倍の配当', () => {
    expect(calculatePayout({ type: 'player', amount: 100 }, result({ outcome: 'player' }))).toBe(
      100,
    )
  })

  it('Playerにベットしてplayer win以外ならハズレ(0)', () => {
    expect(calculatePayout({ type: 'player', amount: 100 }, result({ outcome: 'banker' }))).toBe(
      0,
    )
  })

  it('Bankerにベットしてbanker winなら0.95倍の配当', () => {
    expect(calculatePayout({ type: 'banker', amount: 100 }, result({ outcome: 'banker' }))).toBe(
      95,
    )
  })

  it('Bankerにベットしてbanker win以外ならハズレ(0)', () => {
    expect(calculatePayout({ type: 'banker', amount: 100 }, result({ outcome: 'player' }))).toBe(
      0,
    )
  })

  it('Tieにベットしてtieなら8倍の配当', () => {
    expect(calculatePayout({ type: 'tie', amount: 50 }, result({ outcome: 'tie' }))).toBe(400)
  })

  it('Tieにベットしてtie以外ならハズレ(0)', () => {
    expect(calculatePayout({ type: 'tie', amount: 50 }, result({ outcome: 'player' }))).toBe(0)
  })

  it('Player Pairにベットしてplayer pair成立なら11倍の配当', () => {
    expect(
      calculatePayout({ type: 'playerPair', amount: 20 }, result({ playerPair: true })),
    ).toBe(220)
  })

  it('Player Pairにベットしてplayer pair不成立ならハズレ(0)', () => {
    expect(
      calculatePayout({ type: 'playerPair', amount: 20 }, result({ playerPair: false })),
    ).toBe(0)
  })

  it('Banker Pairにベットしてbanker pair成立なら11倍の配当', () => {
    expect(
      calculatePayout({ type: 'bankerPair', amount: 20 }, result({ bankerPair: true })),
    ).toBe(220)
  })

  it('Banker Pairにベットしてbanker pair不成立ならハズレ(0)', () => {
    expect(
      calculatePayout({ type: 'bankerPair', amount: 20 }, result({ bankerPair: false })),
    ).toBe(0)
  })
})
