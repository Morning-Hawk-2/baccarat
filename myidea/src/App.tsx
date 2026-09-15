import { useState } from 'react'
import type { Bet } from './baccarat/bet'
import { generateRandomBet } from './baccarat/bet'
import type { DealtHand } from './baccarat/dealHand'
import { judgeOutcome } from './baccarat/outcome'
import { dealRandomHand } from './baccarat/randomHand'
import type { Card, Suit } from './baccarat/score'

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

const OUTCOME_LABEL = {
  player: 'Player win',
  banker: 'Banker win',
  tie: 'Tie',
} as const

const BET_TYPE_LABEL: Record<Bet['type'], string> = {
  player: 'Player',
  banker: 'Banker',
  tie: 'Tie',
  playerPair: 'Player Pair',
  bankerPair: 'Banker Pair',
}

function formatCard(card: Card): string {
  return card.suit ? `${card.rank}${SUIT_SYMBOLS[card.suit]}` : card.rank
}

function App() {
  const [hand, setHand] = useState<DealtHand>(() => dealRandomHand())
  const [bet, setBet] = useState<Bet>(() => generateRandomBet())
  const outcome = judgeOutcome(hand.player, hand.banker)

  const handleNextHand = () => {
    setHand(dealRandomHand())
    setBet(generateRandomBet())
  }

  return (
    <div>
      <h1>baccarat</h1>
      <button type="button" onClick={handleNextHand}>
        次のハンドへ
      </button>
      <p>
        今回のベット: {BET_TYPE_LABEL[bet.type]} ${bet.amount}
      </p>
      <section>
        <h2>Player</h2>
        <p>{hand.player.map(formatCard).join(' ')}</p>
      </section>
      <section>
        <h2>Banker</h2>
        <p>{hand.banker.map(formatCard).join(' ')}</p>
      </section>
      <p>{OUTCOME_LABEL[outcome]}</p>
    </div>
  )
}

export default App
