import { describe, expect, it } from 'vitest'
import { dealRandomHand, needsThirdCard } from './randomHand'

describe('dealRandomHand', () => {
  it('多数ハンドをシミュレートすると第三カード発生率が70〜80%に収まる', () => {
    const totalHands = 5000
    let thirdCardHands = 0

    for (let i = 0; i < totalHands; i++) {
      if (needsThirdCard(dealRandomHand())) {
        thirdCardHands++
      }
    }

    const rate = thirdCardHands / totalHands
    expect(rate).toBeGreaterThanOrEqual(0.7)
    expect(rate).toBeLessThanOrEqual(0.8)
  })
})
