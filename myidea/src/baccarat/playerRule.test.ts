import { describe, expect, it } from 'vitest'
import { getPlayerAction } from './playerRule'

describe('getPlayerAction', () => {
  it.each([0, 1, 2, 3, 4, 5])('合計%iはdraw', (score) => {
    expect(getPlayerAction(score)).toBe('draw')
  })

  it.each([6, 7])('合計%iはstand', (score) => {
    expect(getPlayerAction(score)).toBe('stand')
  })

  it.each([8, 9])('合計%iはnatural', (score) => {
    expect(getPlayerAction(score)).toBe('natural')
  })
})
