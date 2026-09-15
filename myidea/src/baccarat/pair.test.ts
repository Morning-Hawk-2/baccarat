import { describe, expect, it } from 'vitest'
import { isPair } from './pair'

describe('isPair', () => {
  it('同ランクの数字カード2枚はPair成立', () => {
    expect(isPair([{ rank: '7' }, { rank: '7' }])).toBe(true)
  })

  it('同ランクの絵札2枚はPair成立(K同士)', () => {
    expect(isPair([{ rank: 'K' }, { rank: 'K' }])).toBe(true)
  })

  it('ランクが異なればPair不成立', () => {
    expect(isPair([{ rank: '7' }, { rank: '8' }])).toBe(false)
  })

  it('絵札同士でもランクが異なればPair不成立(10とQ)', () => {
    expect(isPair([{ rank: '10' }, { rank: 'Q' }])).toBe(false)
  })
})
