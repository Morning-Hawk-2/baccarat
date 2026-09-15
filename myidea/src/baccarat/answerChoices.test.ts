import { describe, expect, it } from 'vitest'
import { generateAnswerChoices } from './answerChoices'

describe('generateAnswerChoices', () => {
  it.each([100, 95, 400, 220, 9.5, 0])(
    '正解額%iに対して4択を生成し、正解が1つだけ・残り3つは正解と異なる',
    (correctAmount) => {
      const choices = generateAnswerChoices(correctAmount)

      expect(choices).toHaveLength(4)
      expect(choices.filter((choice) => choice === correctAmount)).toHaveLength(1)

      const wrongChoices = choices.filter((choice) => choice !== correctAmount)
      expect(wrongChoices).toHaveLength(3)
      for (const wrong of wrongChoices) {
        expect(wrong).not.toBe(correctAmount)
      }
    },
  )

  it('4つの選択肢はすべて重複しない', () => {
    const choices = generateAnswerChoices(220)
    expect(new Set(choices).size).toBe(4)
  })
})
