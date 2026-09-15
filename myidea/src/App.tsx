import { useState } from 'react'
import type { Bet } from './baccarat/bet'
import { generateRandomBet } from './baccarat/bet'
import type { DealtHand } from './baccarat/dealHand'
import { getPlayerAction } from './baccarat/playerRule'
import { dealRandomHand } from './baccarat/randomHand'
import type { Card, Suit } from './baccarat/score'
import { calculateScore } from './baccarat/score'

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

const BET_TYPE_LABEL: Record<Bet['type'], string> = {
  player: 'Player',
  banker: 'Banker',
  tie: 'Tie',
  playerPair: 'Player Pair',
  bankerPair: 'Banker Pair',
}

type DrawStandAnswer = 'draw' | 'stand'

function formatCard(card: Card): string {
  return card.suit ? `${card.rank}${SUIT_SYMBOLS[card.suit]}` : card.rank
}

function getPlayerCorrectAnswer(initialTwoCards: Card[]): DrawStandAnswer {
  const action = getPlayerAction(calculateScore(initialTwoCards))
  return action === 'draw' ? 'draw' : 'stand'
}

function App() {
  const [hand, setHand] = useState<DealtHand>(() => dealRandomHand())
  const [bet, setBet] = useState<Bet>(() => generateRandomBet())
  const [playerAnswer, setPlayerAnswer] = useState<DrawStandAnswer | null>(null)

  const playerInitialCards = hand.player.slice(0, 2)
  const bankerInitialCards = hand.banker.slice(0, 2)
  const correctPlayerAnswer = getPlayerCorrectAnswer(playerInitialCards)

  const handleNextHand = () => {
    setHand(dealRandomHand())
    setBet(generateRandomBet())
    setPlayerAnswer(null)
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
        <p>{playerInitialCards.map(formatCard).join(' ')}</p>
      </section>
      <section>
        <h2>Banker</h2>
        <p>{bankerInitialCards.map(formatCard).join(' ')}</p>
      </section>
      <div>
        <button type="button" onClick={() => setPlayerAnswer('draw')}>
          Draw
        </button>
        <button type="button" onClick={() => setPlayerAnswer('stand')}>
          Stand
        </button>
      </div>
      {playerAnswer !== null && (
        <p>{playerAnswer === correctPlayerAnswer ? '正解' : '不正解'}</p>
      )}
    </div>
  )
}

export default App
