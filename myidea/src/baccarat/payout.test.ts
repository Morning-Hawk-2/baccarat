import { describe, expect, it } from 'vitest'
import { calculatePayout } from './payout'

describe('calculatePayout', () => {
  it('Playerにベットしてplayer winなら1倍の配当', () => {
    expect(calculatePayout({ type: 'player', amount: 100 }, 'player')).toBe(100)
  })

  it('Playerにベットしてplayer win以外ならハズレ(0)', () => {
    expect(calculatePayout({ type: 'player', amount: 100 }, 'banker')).toBe(0)
  })

  it('Bankerにベットしてbanker winなら0.95倍の配当', () => {
    expect(calculatePayout({ type: 'banker', amount: 100 }, 'banker')).toBe(95)
  })

  it('Bankerにベットしてbanker win以外ならハズレ(0)', () => {
    expect(calculatePayout({ type: 'banker', amount: 100 }, 'player')).toBe(0)
  })

  it('Tieにベットしてtieなら8倍の配当', () => {
    expect(calculatePayout({ type: 'tie', amount: 50 }, 'tie')).toBe(400)
  })

  it('Tieにベットしてtie以外ならハズレ(0)', () => {
    expect(calculatePayout({ type: 'tie', amount: 50 }, 'player')).toBe(0)
  })
})
