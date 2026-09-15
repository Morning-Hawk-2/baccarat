import { useState } from 'react'
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

function formatCard(card: Card): string {
  return card.suit ? `${card.rank}${SUIT_SYMBOLS[card.suit]}` : card.rank
}

function App() {
  const [hand, setHand] = useState<DealtHand>(() => dealRandomHand())
  const outcome = judgeOutcome(hand.player, hand.banker)

  return (
    <div>
      <h1>baccarat</h1>
      <button type="button" onClick={() => setHand(dealRandomHand())}>
        次のハンドへ
      </button>
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
