function generateDistractorPool(correctAmount: number): number[] {
  const candidates = [
    correctAmount + 10,
    correctAmount + 25,
    correctAmount + 50,
    correctAmount - 10,
    correctAmount - 25,
    correctAmount * 2,
    Math.round(correctAmount * 1.5),
    Math.round(correctAmount * 0.5),
  ]
  return Array.from(new Set(candidates)).filter((value) => value >= 0 && value !== correctAmount)
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function generateAnswerChoices(correctAmount: number): number[] {
  const distractors = shuffle(generateDistractorPool(correctAmount)).slice(0, 3)
  return shuffle([correctAmount, ...distractors])
}
