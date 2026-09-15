export type BetType = 'player' | 'banker' | 'tie' | 'playerPair' | 'bankerPair'

export interface Bet {
  type: BetType
  amount: number
}

const BET_TYPES: BetType[] = ['player', 'banker', 'tie', 'playerPair', 'bankerPair']
const BET_AMOUNTS = [10, 25, 50, 100, 200]

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function generateRandomBet(): Bet {
  return {
    type: pickRandom(BET_TYPES),
    amount: pickRandom(BET_AMOUNTS),
  }
}
