import { describe, expect, it } from 'vitest'
import { getBankerActionWhenPlayerStands } from './bankerRule'

describe('getBankerActionWhenPlayerStands', () => {
  it.each([0, 1, 2, 3, 4, 5])('合計%iはdraw', (score) => {
    expect(getBankerActionWhenPlayerStands(score)).toBe('draw')
  })

  it.each([6, 7])('合計%iはstand', (score) => {
    expect(getBankerActionWhenPlayerStands(score)).toBe('stand')
  })

  it.each([8, 9])('合計%iはnatural', (score) => {
    expect(getBankerActionWhenPlayerStands(score)).toBe('natural')
  })
})
