import { describe, expect, it } from 'vitest'
import { getBankerActionWhenPlayerDrew, getBankerActionWhenPlayerStands } from './bankerRule'

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

describe('getBankerActionWhenPlayerDrew', () => {
  it.each([0, 1, 2])('Banker合計%iはPlayerの第三カードによらずdraw', (bankerScore) => {
    expect(getBankerActionWhenPlayerDrew(bankerScore, 8)).toBe('draw')
  })

  it('Banker合計3はPlayerの第三カードが8のときstand、それ以外はdraw', () => {
    expect(getBankerActionWhenPlayerDrew(3, 8)).toBe('stand')
    expect(getBankerActionWhenPlayerDrew(3, 7)).toBe('draw')
    expect(getBankerActionWhenPlayerDrew(3, 0)).toBe('draw')
  })

  it('Banker合計4はPlayerの第三カードが2-7でdraw、それ以外はstand', () => {
    expect(getBankerActionWhenPlayerDrew(4, 2)).toBe('draw')
    expect(getBankerActionWhenPlayerDrew(4, 7)).toBe('draw')
    expect(getBankerActionWhenPlayerDrew(4, 1)).toBe('stand')
    expect(getBankerActionWhenPlayerDrew(4, 8)).toBe('stand')
    expect(getBankerActionWhenPlayerDrew(4, 9)).toBe('stand')
    expect(getBankerActionWhenPlayerDrew(4, 0)).toBe('stand')
  })

  it('Banker合計5はPlayerの第三カードが4-7でdraw、それ以外はstand', () => {
    expect(getBankerActionWhenPlayerDrew(5, 4)).toBe('draw')
    expect(getBankerActionWhenPlayerDrew(5, 7)).toBe('draw')
    expect(getBankerActionWhenPlayerDrew(5, 3)).toBe('stand')
    expect(getBankerActionWhenPlayerDrew(5, 8)).toBe('stand')
  })

  it('Banker合計6はPlayerの第三カードが6-7でdraw、それ以外はstand', () => {
    expect(getBankerActionWhenPlayerDrew(6, 6)).toBe('draw')
    expect(getBankerActionWhenPlayerDrew(6, 7)).toBe('draw')
    expect(getBankerActionWhenPlayerDrew(6, 5)).toBe('stand')
    expect(getBankerActionWhenPlayerDrew(6, 8)).toBe('stand')
  })

  it('Banker合計7はPlayerの第三カードによらずstand', () => {
    expect(getBankerActionWhenPlayerDrew(7, 0)).toBe('stand')
    expect(getBankerActionWhenPlayerDrew(7, 9)).toBe('stand')
  })

  it.each([8, 9])('Banker合計%iはPlayerの第三カードによらずnatural', (bankerScore) => {
    expect(getBankerActionWhenPlayerDrew(bankerScore, 5)).toBe('natural')
  })
})
