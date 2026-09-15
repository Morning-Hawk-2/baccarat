import { describe, expect, it } from 'vitest'
import { judgeOutcome } from './outcome'

describe('judgeOutcome', () => {
  it('Playerの合計が大きければplayer win', () => {
    const player = [{ rank: '9' as const }, { rank: 'K' as const }]
    const banker = [{ rank: '5' as const }, { rank: '2' as const }]
    expect(judgeOutcome(player, banker)).toBe('player')
  })

  it('Bankerの合計が大きければbanker win', () => {
    const player = [{ rank: '3' as const }, { rank: '2' as const }]
    const banker = [{ rank: '9' as const }, { rank: 'K' as const }]
    expect(judgeOutcome(player, banker)).toBe('banker')
  })

  it('合計が同じならtie', () => {
    const player = [{ rank: '4' as const }, { rank: '3' as const }]
    const banker = [{ rank: '5' as const }, { rank: '2' as const }]
    expect(judgeOutcome(player, banker)).toBe('tie')
  })

  it('3枚ずつの手でも合計を比較して判定する', () => {
    const player = [{ rank: '2' as const }, { rank: '2' as const }, { rank: '5' as const }]
    const banker = [{ rank: '3' as const }, { rank: '3' as const }, { rank: 'A' as const }]
    expect(judgeOutcome(player, banker)).toBe('player')
  })
})
