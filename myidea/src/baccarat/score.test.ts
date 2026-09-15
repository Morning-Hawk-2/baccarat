import { describe, expect, it } from 'vitest'
import { calculateScore } from './score'

describe('calculateScore', () => {
  it('数字カードの合計をそのまま返す(1桁に収まる場合)', () => {
    expect(calculateScore([{ rank: '2' }, { rank: '3' }])).toBe(5)
  })

  it('絵札は0として数える', () => {
    expect(calculateScore([{ rank: 'K' }, { rank: 'Q' }])).toBe(0)
  })

  it('Aは1として数える', () => {
    expect(calculateScore([{ rank: 'A' }, { rank: '9' }])).toBe(0)
  })

  it('合計が10以上のときは下1桁になる', () => {
    expect(calculateScore([{ rank: '9' }, { rank: '9' }])).toBe(8)
  })

  it('3枚のカードでも合計の下1桁になる', () => {
    expect(calculateScore([{ rank: '7' }, { rank: '8' }, { rank: '9' }])).toBe(4)
  })
})
